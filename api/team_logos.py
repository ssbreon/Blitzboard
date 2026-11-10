import io
import os

from azure.core.exceptions import ResourceExistsError, ResourceNotFoundError
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient, ContentSettings
from PIL import Image, ImageOps, UnidentifiedImageError


MAX_LOGO_BYTES = 2 * 1024 * 1024
MAX_LOGO_DIMENSION = 4096
MAX_STORED_DIMENSION = 2048
FORMATS = {
    "image/png": "PNG",
    "image/jpeg": "JPEG",
    "image/webp": "WEBP",
}
CONTENT_TYPES = {image_format: content_type for content_type, image_format in FORMATS.items()}


class StorageUnavailable(Exception):
    pass


def validate_logo(data, content_type):
    if not isinstance(data, bytes) or not data:
        raise ValueError("Choose a non-empty PNG, JPEG, or WebP image")
    if len(data) > MAX_LOGO_BYTES:
        raise ValueError("Team logos must be 2 MB or smaller")

    expected_format = FORMATS.get((content_type or "").split(";", 1)[0].strip().lower())
    if expected_format is None:
        raise ValueError("Choose a PNG, JPEG, or WebP image")

    try:
        with Image.open(io.BytesIO(data)) as source:
            if source.format != expected_format:
                raise ValueError("The image content does not match its file type")
            if getattr(source, "n_frames", 1) != 1:
                raise ValueError("Animated images are not supported")
            if source.width > MAX_LOGO_DIMENSION or source.height > MAX_LOGO_DIMENSION:
                raise ValueError("Team logos must be 4096 pixels or smaller in each dimension")
            source.verify()

        with Image.open(io.BytesIO(data)) as source:
            source.load()
            image = ImageOps.exif_transpose(source)
            image.thumbnail((MAX_STORED_DIMENSION, MAX_STORED_DIMENSION), Image.Resampling.LANCZOS)
            if expected_format == "JPEG":
                image = image.convert("RGB")
            elif expected_format == "WEBP" and image.mode not in {"RGB", "RGBA"}:
                image = image.convert("RGBA")
            elif expected_format == "PNG" and image.mode not in {"RGB", "RGBA", "L", "LA", "P"}:
                image = image.convert("RGBA")

            normalized = io.BytesIO()
            save_options = {"optimize": True} if expected_format == "PNG" else {"quality": 88}
            image.save(normalized, format=expected_format, **save_options)
    except ValueError:
        raise
    except (OSError, UnidentifiedImageError, Image.DecompressionBombError) as error:
        raise ValueError("The selected file is not a valid supported image") from error

    normalized_data = normalized.getvalue()
    if len(normalized_data) > MAX_LOGO_BYTES:
        raise ValueError("The optimized team logo is larger than 2 MB")
    return normalized_data, CONTENT_TYPES[expected_format]


def _service_client():
    connection_string = os.getenv("BLOB_STORAGE_CONNECTION_STRING")
    if connection_string:
        return BlobServiceClient.from_connection_string(connection_string)

    account_url = os.getenv("BLOB_STORAGE_ACCOUNT_URL")
    if account_url:
        return BlobServiceClient(account_url, credential=DefaultAzureCredential())

    if os.getenv("APP_ENVIRONMENT", "").lower() == "local":
        local_storage_connection = os.getenv("AzureWebJobsStorage", "")
        if "UseDevelopmentStorage=true" in local_storage_connection or "BlobEndpoint=http://127.0.0.1" in local_storage_connection or "BlobEndpoint=http://localhost" in local_storage_connection:
            return BlobServiceClient.from_connection_string(local_storage_connection)
        account_key = "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUz7gAD+v5M="
        endpoint = os.getenv("AZURITE_BLOB_ENDPOINT", "http://127.0.0.1:10000/devstoreaccount1")
        local_connection = (
            "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;"
            f"AccountKey={account_key};BlobEndpoint={endpoint};"
        )
        return BlobServiceClient.from_connection_string(local_connection)

    raise StorageUnavailable("Team logo storage is not configured")


def _container_client():
    container_name = os.getenv("BLOB_STORAGE_CONTAINER", "team-logos")
    return _service_client().get_container_client(container_name)


def _ensure_local_container(container):
    if os.getenv("APP_ENVIRONMENT", "").lower() == "local":
        try:
            container.create_container()
        except ResourceExistsError:
            pass


def upload_logo(workspace_id, data, content_type):
    container = _container_client()
    _ensure_local_container(container)
    blob = container.get_blob_client(f"{workspace_id}/logo")
    blob.upload_blob(
        data,
        overwrite=True,
        content_settings=ContentSettings(content_type=content_type, cache_control="private, max-age=300"),
    )


def read_logo(workspace_id):
    blob = _container_client().get_blob_client(f"{workspace_id}/logo")
    try:
        properties = blob.get_blob_properties()
        return blob.download_blob().readall(), properties.content_settings.content_type
    except ResourceNotFoundError:
        return None


def delete_logo(workspace_id):
    blob = _container_client().get_blob_client(f"{workspace_id}/logo")
    try:
        blob.delete_blob()
    except ResourceNotFoundError:
        pass