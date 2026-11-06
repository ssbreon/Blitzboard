"""One-time bootstrap of the first cloud alpha Owner using operator Azure CLI auth."""

import argparse
import json
import os
import re
import subprocess
import sys
from uuid import UUID


DATABASE = "blitzboard-studio"
CONTAINER = "playboard"


def validate_cloud_bootstrap_target(cosmos_account, subscription_id, active_subscription_id, environ):
    if not isinstance(cosmos_account, str) or not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{1,42}[a-z0-9])", cosmos_account):
        raise ValueError("The confirmed Cosmos account name is invalid")
    try:
        expected_subscription = UUID(subscription_id)
        active_subscription = UUID(active_subscription_id)
    except (TypeError, ValueError, AttributeError):
        raise ValueError("A valid Azure subscription ID is required") from None
    if expected_subscription != active_subscription:
        raise ValueError("The active Azure CLI subscription does not match the confirmed subscription")
    if any(environ.get(key, "").strip() for key in ("COSMOS_KEY", "COSMOSDB_KEY")):
        raise ValueError("Remove Cosmos key settings; this command requires Entra authentication")
    if environ.get("WEBSITE_SITE_NAME") or environ.get("WEBSITE_INSTANCE_ID"):
        raise ValueError("Run this command from Cloud Shell or an operator workstation, not a Function App")
    if environ.get("AUTH_MODE", "").lower() == "development" or environ.get("APP_ENVIRONMENT", "").lower() in {"local", "test"}:
        raise ValueError("Local development settings are loaded; use a clean operator shell")
    configured_endpoint = environ.get("COSMOS_ENDPOINT") or environ.get("COSMOSDB_ENDPOINT")
    expected_host = f"{cosmos_account}.documents.azure.com"
    if configured_endpoint:
        from urllib.parse import urlparse

        if urlparse(configured_endpoint).hostname != expected_host:
            raise ValueError("The current Cosmos endpoint does not match the confirmed account")
    return f"https://{expected_host}:443/"


def active_subscription_id():
    result = subprocess.run(
        ["az", "account", "show", "--query", "id", "--output", "tsv"],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Create the first verified External ID profile's alpha Owner workspace in cloud Cosmos DB."
    )
    parser.add_argument("--owner-email", help="Verified email of the user who already signed in to the cloud app")
    parser.add_argument("--confirm-cosmos-account", required=True, help="Type the exact Cosmos account name to confirm the target")
    parser.add_argument("--subscription-id", required=True, help="Azure subscription ID expected to be active in Azure CLI")
    parser.add_argument("--workspace-name", default="Blitzboard Alpha")
    args = parser.parse_args(argv)

    owner_email = (args.owner_email or input("Verified owner email: ")).strip()
    if not owner_email:
        parser.error("A verified owner email is required")

    try:
        active_subscription = active_subscription_id()
        endpoint = validate_cloud_bootstrap_target(
            args.confirm_cosmos_account,
            args.subscription_id,
            active_subscription,
            os.environ,
        )
    except (OSError, subprocess.CalledProcessError, ValueError) as error:
        print(f"Bootstrap target validation failed: {error}", file=sys.stderr)
        return 1

    os.environ["AUTH_MODE"] = "entra"
    os.environ["APP_ENVIRONMENT"] = "production"
    os.environ["BILLING_MODE"] = "paddle"
    os.environ["COSMOS_ENDPOINT"] = endpoint
    os.environ["COSMOS_DATABASE"] = DATABASE
    os.environ["COSMOS_CONTAINER"] = CONTAINER
    os.environ.pop("COSMOSDB_ENDPOINT", None)
    os.environ.pop("COSMOS_KEY", None)
    os.environ.pop("COSMOSDB_KEY", None)
    os.environ["BLITZBOARD_SKIP_STORAGE_INITIALIZATION"] = "1"

    try:
        from azure.identity import AzureCliCredential
        import accounts
        import function_app

        os.environ.pop("BLITZBOARD_SKIP_STORAGE_INITIALIZATION", None)
        storage = function_app.Storage(credential=AzureCliCredential())
        profiles = [profile for profile in storage.list("profiles")
                    if profile.get("id", "").startswith("entra-")
                    and profile.get("emailVerified") is True
                    and isinstance(profile.get("email"), str)
                    and profile["email"].casefold() == owner_email.casefold()]
        if len(profiles) != 1:
            raise RuntimeError("Expected exactly one verified External ID profile for that email; sign in to the app first")
        workspace = accounts.bootstrap_alpha_owner_operator(
            storage,
            profiles[0]["id"],
            args.workspace_name,
        )
    except Exception as error:
        print(f"Bootstrap failed: {error}", file=sys.stderr)
        return 1

    print(json.dumps({
        "workspaceId": workspace["id"],
        "workspaceName": workspace["name"],
        "role": "owner",
        "alphaEnabled": workspace["alphaEnabled"],
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())