import hashlib
import json
import os
from threading import Lock
from time import monotonic
from urllib.parse import urlparse
from urllib.request import urlopen
from uuid import UUID

import jwt

from accounts import AccountError


def guid(value):
    try:
        return str(UUID(value)) if isinstance(value, str) else None
    except ValueError:
        return None


class EntraAuthenticator:
    def __init__(self, environ=None):
        settings = os.environ if environ is None else environ
        self.tenant_id = guid(settings.get("ENTRA_TENANT_ID"))
        self.audience = settings.get("ENTRA_API_AUDIENCE", "").strip()
        self.client_id = guid(settings.get("ENTRA_SPA_CLIENT_ID"))
        self.scope = settings.get("ENTRA_API_SCOPE", "").strip()
        self.authority = settings.get("ENTRA_AUTHORITY", "").rstrip("/")
        self.issuer = settings.get("ENTRA_ISSUER", "").rstrip("/")
        parsed = urlparse(self.authority)
        if (not self.tenant_id or not self.audience or not self.client_id or not self.scope
                or len(self.scope.split()) != 1 or not self.issuer
                or parsed.scheme != "https" or not parsed.hostname
                or not parsed.hostname.endswith(".ciamlogin.com")
                or parsed.username or parsed.password or parsed.port not in {None, 443}
                or parsed.query or parsed.fragment or parsed.path.strip("/") != self.tenant_id):
            raise AccountError("AUTH_NOT_CONFIGURED", "Entra authentication settings are missing or invalid", 503)
        self.key_client = None
        self.metadata_expires = 0
        self.retry_after = 0
        self.lock = Lock()

    def signing_key(self, token):
        with self.lock:
            current = monotonic()
            if current < self.retry_after:
                raise AccountError("AUTH_PROVIDER_UNAVAILABLE", "Authentication provider is temporarily unavailable", 503)
            try:
                if self.key_client is None or current >= self.metadata_expires:
                    with urlopen(self.authority + "/v2.0/.well-known/openid-configuration", timeout=5) as result:
                        metadata = json.load(result)
                    key_url = metadata.get("jwks_uri", "")
                    parsed = urlparse(key_url)
                    authority_host = urlparse(self.authority).hostname
                    if (metadata.get("issuer") != self.issuer or parsed.scheme != "https"
                            or parsed.hostname != authority_host or parsed.username or parsed.password
                            or parsed.port not in {None, 443} or parsed.fragment):
                        raise ValueError("Unexpected provider metadata")
                    self.key_client = jwt.PyJWKClient(key_url, lifespan=300, timeout=5)
                    self.metadata_expires = current + 3600
                return self.key_client.get_signing_key_from_jwt(token).key
            except jwt.PyJWKClientConnectionError:
                self.retry_after = monotonic() + 10
                raise AccountError("AUTH_PROVIDER_UNAVAILABLE", "Authentication provider is temporarily unavailable", 503) from None
            except jwt.PyJWKClientError:
                raise AccountError("UNAUTHORIZED", "The access token signing key is not recognized", 401) from None
            except (OSError, ValueError, TypeError):
                self.retry_after = monotonic() + 10
                raise AccountError("AUTH_PROVIDER_UNAVAILABLE", "Authentication provider is temporarily unavailable", 503) from None

    def authenticate(self, headers):
        authorization = headers.get("Authorization", "")
        parts = authorization.split()
        if len(parts) != 2 or parts[0].lower() != "bearer" or len(parts[1]) > 16384:
            raise AccountError("UNAUTHORIZED", "An API access token is required", 401)
        token = parts[1]
        try:
            header = jwt.get_unverified_header(token)
            if header.get("alg") != "RS256" or not isinstance(header.get("kid"), str) or not header["kid"]:
                raise jwt.InvalidTokenError()
            claims = jwt.decode(token, self.signing_key(token), algorithms=["RS256"],
                                audience=self.audience, issuer=self.issuer, leeway=30,
                                options={"require": ["exp", "nbf", "iat", "iss", "aud", "tid", "oid", "ver", "azp"]})
            object_id = guid(claims["oid"])
            if (guid(claims["tid"]) != self.tenant_id or not object_id or claims["ver"] != "2.0"
                    or guid(claims["azp"]) != self.client_id):
                raise jwt.InvalidTokenError()
        except jwt.InvalidTokenError:
            raise AccountError("UNAUTHORIZED", "The API access token is invalid or expired", 401) from None
        scopes = claims.get("scp")
        if not isinstance(scopes, str):
            raise AccountError("UNAUTHORIZED", "A delegated API access token is required", 401)
        if self.scope not in scopes.split():
            raise AccountError("FORBIDDEN", "The access token lacks the required API scope", 403)
        external_identity = {"issuer": self.issuer, "tenantId": self.tenant_id, "objectId": object_id}
        identity_key = json.dumps(external_identity, sort_keys=True, separators=(",", ":"))
        email = claims.get("email")
        name = claims.get("name")
        return {
            "userId": "entra-" + hashlib.sha256(identity_key.encode()).hexdigest(),
            "name": name if isinstance(name, str) and name.strip() else "Coach",
            "email": email if isinstance(email, str) else "",
            "emailVerified": isinstance(email, str) and bool(email) and claims.get("email_verified") is True,
            "externalIdentity": external_identity,
            "roles": [],
        }


_authenticator = None
_configuration_lock = Lock()


def authenticate_entra(headers):
    global _authenticator
    with _configuration_lock:
        if _authenticator is None:
            _authenticator = EntraAuthenticator()
    return _authenticator.authenticate(headers)