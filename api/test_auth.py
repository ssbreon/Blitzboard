import json
import os
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from unittest.mock import Mock, patch
from urllib.parse import urlparse, parse_qs

os.environ["AUTH_MODE"] = "development"
os.environ["DEV_AUTH_SECRET"] = "test-secret"
os.environ["DEV_USER_ID"] = "local-coach"
os.environ["BILLING_MODE"] = "mock"
os.environ["APP_ENVIRONMENT"] = "local"
os.environ.pop("COSMOS_ENDPOINT", None)
os.environ.pop("COSMOSDB_ENDPOINT", None)

import function_app
import authentication
import jwt
from cryptography.hazmat.primitives.asymmetric import rsa


class FakeRequest:
    def __init__(self, method, path, user_id=None, payload=None):
        self.method = method
        self.route_params = {"path": path}
        self.params = {}
        self.headers = {}
        self.payload = payload
        if user_id:
            self.headers = {
                "X-Dev-User": user_id,
                "X-Dev-Auth-Secret": "test-secret",
            }

    def get_json(self):
        return self.payload


def call_api(method, path, user_id=None, payload=None, workspace_id=None):
    request = FakeRequest(method, path, user_id, payload)
    if workspace_id:
        request.headers["X-Workspace-Id"] = workspace_id
    return function_app.api(request)


def response_json(response):
    return json.loads(response.get_body())


class CorsTests(unittest.TestCase):
    def test_unexpected_api_failure_returns_safe_diagnostic_id(self):
        request = FakeRequest("GET", "me")
        with patch.object(function_app, "authenticate_request", side_effect=RuntimeError("private failure detail")):
            with self.assertLogs("function_app", level="ERROR") as captured:
                result = function_app.api(request)

        payload = response_json(result)
        diagnostic_id = payload["error"]["diagnosticId"]
        self.assertEqual(result.status_code, 500)
        self.assertEqual(payload["error"]["code"], "INTERNAL_ERROR")
        self.assertNotIn("private failure detail", result.get_body().decode())
        self.assertTrue(any("Unhandled API exception" in message for message in captured.output))
        self.assertTrue(any(
            record.custom_dimensions["diagnosticId"] == diagnostic_id
            for record in captured.records
        ))

    def test_allowed_origin_is_reflected_for_api_responses(self):
        origin = "https://dev.blitzboardstudio.com"
        request = FakeRequest("GET", "health")
        request.headers["Origin"] = origin
        with patch.object(function_app, "AUTH_MODE", "entra"), patch.dict(
            os.environ, {"CORS_ALLOWED_ORIGINS": origin, "WEBSITE_SITE_NAME": "api-dev"}
        ):
            result = function_app.api(request)
        self.assertEqual(result.headers["Access-Control-Allow-Origin"], origin)
        self.assertEqual(result.headers["Vary"], "Origin")

    def test_unlisted_origin_is_not_allowed_on_preflight(self):
        request = FakeRequest("OPTIONS", "health")
        request.headers["Origin"] = "https://untrusted.example"
        with patch.object(function_app, "AUTH_MODE", "entra"), patch.dict(
            os.environ, {"CORS_ALLOWED_ORIGINS": "https://dev.blitzboardstudio.com", "WEBSITE_SITE_NAME": "api-dev"}
        ):
            result = function_app.api(request)
        self.assertEqual(result.status_code, 204)
        self.assertNotIn("Access-Control-Allow-Origin", result.headers)


class ConfiguredAlphaBootstrapTests(unittest.TestCase):
    def setUp(self):
        function_app.storage = function_app.Storage()
        self.owner = {
            "userId": "entra-owner", "name": "Alpha Owner", "email": "owner@example.com",
            "emailVerified": False, "externalIdentity": {
                "tenantId": "11111111-1111-4111-8111-111111111111",
                "objectId": "22222222-2222-4222-8222-222222222222",
            }, "roles": [],
        }
        self.settings = {
            "AUTH_MODE": "entra", "APP_ENVIRONMENT": "production", "DEPLOYMENT_ENVIRONMENT": "dev",
            "WEBSITE_SITE_NAME": "blitzboard-api-dev-eastus", "WEBSITE_INSTANCE_ID": "instance",
            "ENTRA_TENANT_ID": "11111111-1111-4111-8111-111111111111",
            "ALPHA_INITIAL_OWNER_OBJECT_ID": "22222222-2222-4222-8222-222222222222",
            "BILLING_MODE": "paddle",
        }

    def test_tenant_scoped_object_id_bootstraps_owner_without_email_claim_and_is_idempotent(self):
        with patch.object(function_app, "AUTH_MODE", "entra"), patch.object(
            function_app, "authenticate_request", return_value=(self.owner, None)
        ), patch.dict(os.environ, self.settings, clear=False):
            first = function_app.api(FakeRequest("GET", "me"))
            repeated = function_app.api(FakeRequest("GET", "me"))

        self.assertEqual(first.status_code, 200)
        self.assertEqual(repeated.status_code, 200)
        profile = response_json(first)
        self.assertEqual(profile["workspaces"][0]["role"], "owner")
        self.assertTrue(profile["workspaces"][0]["alphaEnabled"])
        self.assertEqual(len(function_app.storage.list("workspaces")), 1)
        self.assertEqual(len(function_app.storage.list("memberships")), 1)

    def test_bootstrap_setting_does_not_promote_unlisted_or_unverified_user(self):
        unlisted = {**self.owner, "userId": "entra-other", "externalIdentity": {
            **self.owner["externalIdentity"], "objectId": "33333333-3333-4333-8333-333333333333",
        }}
        wrong_tenant = {**self.owner, "userId": "entra-wrong-tenant", "externalIdentity": {
            **self.owner["externalIdentity"], "tenantId": "44444444-4444-4444-8444-444444444444",
        }}
        for identity in (unlisted, wrong_tenant):
            with self.subTest(identity=identity["userId"]), patch.object(
                function_app, "AUTH_MODE", "entra"
            ), patch.object(function_app, "authenticate_request", return_value=(identity, None)), patch.dict(
                os.environ, self.settings, clear=False
            ):
                result = function_app.api(FakeRequest("GET", "me"))
            self.assertEqual(result.status_code, 200)
        self.assertEqual(function_app.storage.list("workspaces"), [])

    def test_bootstrap_setting_missing_object_id_does_not_promote_anyone(self):
        settings = {key: value for key, value in self.settings.items() if key != "ALPHA_INITIAL_OWNER_OBJECT_ID"}
        with patch.object(function_app, "AUTH_MODE", "entra"), patch.object(
            function_app, "authenticate_request", return_value=(self.owner, None)
        ), patch.dict(os.environ, settings, clear=False):
            result = function_app.api(FakeRequest("GET", "me"))
        self.assertEqual(result.status_code, 200)
        self.assertEqual(function_app.storage.list("workspaces"), [])

    def test_bootstrap_setting_only_runs_in_deployed_dev_environment(self):
        settings = {**self.settings, "DEPLOYMENT_ENVIRONMENT": "production"}
        with patch.object(function_app, "AUTH_MODE", "entra"), patch.object(
            function_app, "authenticate_request", return_value=(self.owner, None)
        ), patch.dict(os.environ, settings, clear=False):
            result = function_app.api(FakeRequest("GET", "me"))
        self.assertEqual(result.status_code, 200)
        self.assertEqual(function_app.storage.list("workspaces"), [])


class EntraAuthenticationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    def setUp(self):
        self.settings = {
            "ENTRA_TENANT_ID": "11111111-1111-4111-8111-111111111111",
            "ENTRA_SPA_CLIENT_ID": "22222222-2222-4222-8222-222222222222",
            "ENTRA_API_AUDIENCE": "33333333-3333-4333-8333-333333333333",
            "ENTRA_API_SCOPE": "access_as_user",
            "ENTRA_AUTHORITY": "https://test.ciamlogin.com/11111111-1111-4111-8111-111111111111",
            "ENTRA_ISSUER": "https://test.ciamlogin.com/11111111-1111-4111-8111-111111111111/v2.0",
        }
        self.validator = authentication.EntraAuthenticator(self.settings)
        current = int(function_app.time())
        self.claims = {
            "iss": self.settings["ENTRA_ISSUER"], "aud": self.settings["ENTRA_API_AUDIENCE"],
            "tid": self.settings["ENTRA_TENANT_ID"], "azp": self.settings["ENTRA_SPA_CLIENT_ID"],
            "oid": "44444444-4444-4444-8444-444444444444", "sub": "subject",
            "ver": "2.0", "iat": current, "nbf": current, "exp": current + 3600,
            "scp": "access_as_user", "email": "coach@example.com", "name": "Coach",
        }

    def authenticate(self, claims=None, key=None, algorithm="RS256"):
        token = jwt.encode(self.claims if claims is None else claims, key or self.key,
                           algorithm=algorithm, headers={"kid": "test-key"})
        with patch.object(self.validator, "signing_key", return_value=self.key.public_key()):
            return self.validator.authenticate({"Authorization": "Bearer " + token})

    def test_valid_identity_is_stable_and_not_linked_by_email(self):
        identity = self.authenticate()
        self.assertTrue(identity["userId"].startswith("entra-"))
        self.assertEqual(identity["email"], "coach@example.com")
        self.assertFalse(identity["emailVerified"])
        self.assertEqual(self.authenticate({**self.claims, "email": None, "emails": ["coach@example.com"]})["email"], "coach@example.com")
        self.assertEqual(self.authenticate({**self.claims, "email": ["coach@example.com"]})["email"], "coach@example.com")
        self.assertTrue(self.authenticate({**self.claims, "xms_edov": True})["emailVerified"])
        self.assertFalse(self.authenticate({**self.claims, "xms_edov": False})["emailVerified"])
        changed = {**self.claims, "email": "new@example.com", "name": "New name"}
        self.assertEqual(self.authenticate(changed)["userId"], identity["userId"])
        other = {**self.claims, "oid": "55555555-5555-4555-8555-555555555555"}
        self.assertNotEqual(self.authenticate(other)["userId"], identity["userId"])
        self.assertTrue(self.authenticate({**self.claims, "email_verified": True})["emailVerified"])
        self.assertFalse(self.authenticate({**self.claims, "email_verified": "true"})["emailVerified"])

    def test_invalid_access_tokens_are_rejected(self):
        for claim, value in (("iss", "https://attacker.example"), ("aud", "wrong"),
                             ("tid", "55555555-5555-4555-8555-555555555555"),
                             ("azp", "55555555-5555-4555-8555-555555555555"), ("oid", "invalid"),
                             ("ver", "1.0"), ("exp", 1), ("nbf", int(function_app.time()) + 3600)):
            with self.subTest(claim=claim):
                with self.assertRaises(function_app.accounts.AccountError) as failure:
                    self.authenticate({**self.claims, claim: value})
                self.assertEqual(failure.exception.status, 401)
        wrong_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        with self.assertRaises(function_app.accounts.AccountError):
            self.authenticate(key=wrong_key)
        with self.assertRaises(function_app.accounts.AccountError):
            self.authenticate(key="wrong-secret-that-is-at-least-32-bytes", algorithm="HS256")

    def test_id_tokens_and_wrong_scopes_are_rejected(self):
        claims = dict(self.claims)
        claims.pop("scp")
        with self.assertRaises(function_app.accounts.AccountError) as failure:
            self.authenticate(claims)
        self.assertEqual(failure.exception.status, 401)
        with self.assertRaises(function_app.accounts.AccountError) as failure:
            self.authenticate({**self.claims, "scp": "other_scope"})
        self.assertEqual(failure.exception.status, 403)

    def test_missing_configuration_and_dev_headers_fail_closed(self):
        with self.assertRaises(function_app.accounts.AccountError) as failure:
            authentication.EntraAuthenticator({})
        self.assertEqual(failure.exception.status, 503)
        with self.assertRaises(function_app.accounts.AccountError) as failure:
            self.validator.authenticate({"X-Dev-User": "local-coach", "X-Dev-Auth-Secret": "test-secret"})
        self.assertEqual(failure.exception.status, 401)

    def test_missing_required_claims_are_rejected(self):
        for claim in ("exp", "nbf", "iat", "iss", "aud", "tid", "oid", "ver", "azp"):
            claims = dict(self.claims)
            claims.pop(claim)
            with self.subTest(claim=claim), self.assertRaises(function_app.accounts.AccountError) as failure:
                self.authenticate(claims)
            self.assertEqual(failure.exception.status, 401)

    def test_metadata_and_signing_client_are_cached(self):
        from io import StringIO
        metadata = {"issuer": self.settings["ENTRA_ISSUER"], "jwks_uri": self.settings["ENTRA_AUTHORITY"] + "/discovery/v2.0/keys"}
        key_client = Mock()
        key_client.get_signing_key_from_jwt.return_value.key = self.key.public_key()
        with patch.object(authentication, "urlopen", return_value=StringIO(json.dumps(metadata))) as fetch_metadata, patch.object(jwt, "PyJWKClient", return_value=key_client) as factory:
            self.assertEqual(self.validator.signing_key("token-one"), self.key.public_key())
            self.validator.signing_key("token-two")
            fetch_metadata.assert_called_once()
            factory.assert_called_once_with(metadata["jwks_uri"], lifespan=300, timeout=5)
            self.assertEqual(key_client.get_signing_key_from_jwt.call_count, 2)

    def test_bad_provider_metadata_and_outages_fail_closed(self):
        from io import StringIO
        for metadata in ({"issuer": "wrong", "jwks_uri": self.settings["ENTRA_AUTHORITY"] + "/keys"},
                         {"issuer": self.settings["ENTRA_ISSUER"], "jwks_uri": "https://attacker.example/keys"}):
            validator = authentication.EntraAuthenticator(self.settings)
            with patch.object(authentication, "urlopen", return_value=StringIO(json.dumps(metadata))), self.assertRaises(function_app.accounts.AccountError) as failure:
                validator.signing_key("token")
            self.assertEqual(failure.exception.status, 503)
        with patch.object(authentication, "urlopen", side_effect=OSError("Offline")) as fetch_metadata:
            for _ in range(2):
                with self.assertRaises(function_app.accounts.AccountError) as failure:
                    self.validator.signing_key("token")
                self.assertEqual(failure.exception.status, 503)
            fetch_metadata.assert_called_once()

    def test_entra_route_requires_bearer_and_provisions_profile_without_workspace(self):
        function_app.storage = function_app.Storage()
        token = jwt.encode(self.claims, self.key, algorithm="RS256", headers={"kid": "test-key"})
        request = FakeRequest("GET", "me")
        request.headers["Authorization"] = "Bearer " + token
        with patch.object(function_app, "AUTH_MODE", "entra"), patch.object(authentication, "_authenticator", self.validator), patch.object(self.validator, "signing_key", return_value=self.key.public_key()), patch.dict(os.environ, {"AUTH_MODE": "entra", "BILLING_MODE": "paddle"}):
            self.assertEqual(call_api("GET", "me", "local-coach").status_code, 401)
            first = response_json(function_app.api(request))
            second = response_json(function_app.api(request))
        self.assertTrue(first["userId"].startswith("entra-"))
        self.assertEqual(first["userId"], second["userId"])
        self.assertFalse(first["emailVerified"])
        self.assertEqual(len(function_app.storage.list("profiles")), 1)
        self.assertEqual(first["workspaces"], [])
        self.assertEqual(len(function_app.storage.list("workspaces")), 0)
        self.assertEqual(first["email"], "coach@example.com")

        verified_claims = {**self.claims, "xms_edov": True}
        verified_token = jwt.encode(verified_claims, self.key, algorithm="RS256", headers={"kid": "test-key"})
        request.headers["Authorization"] = "Bearer " + verified_token
        with patch.object(function_app, "AUTH_MODE", "entra"), patch.object(authentication, "_authenticator", self.validator), patch.object(self.validator, "signing_key", return_value=self.key.public_key()), patch.dict(os.environ, {"AUTH_MODE": "entra", "BILLING_MODE": "paddle"}):
            verified = response_json(function_app.api(request))
        self.assertTrue(verified["emailVerified"])

    def test_entra_registration_without_workspace_stays_signed_in_but_cannot_access_content(self):
        function_app.storage = function_app.Storage()
        token = jwt.encode(self.claims, self.key, algorithm="RS256", headers={"kid": "test-key"})
        request = FakeRequest("GET", "me")
        request.headers["Authorization"] = "Bearer " + token
        content_request = FakeRequest("GET", "playbooks")
        content_request.headers["Authorization"] = "Bearer " + token
        with patch.object(function_app, "AUTH_MODE", "entra"), patch.object(authentication, "_authenticator", self.validator), patch.object(self.validator, "signing_key", return_value=self.key.public_key()), patch.dict(os.environ, {"AUTH_MODE": "entra", "APP_ENVIRONMENT": "local", "BILLING_MODE": "paddle"}):
            profile = response_json(function_app.api(request))
            denied = function_app.api(content_request)
        self.assertEqual(profile["workspaces"], [])
        self.assertEqual(len(function_app.storage.list("profiles")), 1)
        self.assertEqual(len(function_app.storage.list("workspaces")), 0)
        self.assertEqual(denied.status_code, 403)
        self.assertEqual(response_json(denied)["error"]["code"], "ALPHA_ACCESS_REQUIRED")
        legacy_id = "legacy-unapproved-team"
        function_app.storage.save("workspaces", {
            "id": legacy_id, "name": "Unapproved", "kind": "team", "ownerId": profile["userId"],
            "defaults": {}, "subscription": function_app.accounts.new_subscription("team"),
        })
        function_app.storage.save("memberships", {
            "id": function_app.accounts.membership_id(profile["userId"], legacy_id),
            "userId": profile["userId"], "workspaceId": legacy_id, "role": "owner",
        })
        content_request.headers["X-Workspace-Id"] = legacy_id
        with patch.object(function_app, "AUTH_MODE", "entra"), patch.object(authentication, "_authenticator", self.validator), patch.object(self.validator, "signing_key", return_value=self.key.public_key()), patch.dict(os.environ, {"AUTH_MODE": "entra", "APP_ENVIRONMENT": "local", "BILLING_MODE": "paddle"}):
            legacy_denied = function_app.api(content_request)
        self.assertEqual(legacy_denied.status_code, 403)

    def test_entra_workspace_list_preserves_existing_free_personal_subscription(self):
        function_app.storage = function_app.Storage()
        policy = function_app.accounts
        user_id = "entra-coach-with-existing-free"
        profile = {"id": user_id, "name": "Coach Two", "email": "coach@example.com", "emailVerified": True,
                   "coachingTitle": "", "preferences": dict(policy.DEFAULT_PREFERENCES)}
        function_app.storage.save("profiles", profile)
        personal_id = policy.personal_id(user_id)
        function_app.storage.save("workspaces", {
            "id": personal_id, "name": "Individual", "kind": "individual", "ownerId": user_id,
            "defaults": {}, "subscription": policy.new_subscription("free"), "createdAt": policy.timestamp().isoformat(),
        })
        function_app.storage.save("memberships", {
            "id": policy.membership_id(user_id, personal_id), "userId": user_id,
            "workspaceId": personal_id, "role": "owner",
        })
        alpha_id = "alpha-team-existing"
        function_app.storage.save("workspaces", {
            "id": alpha_id, "name": "Blitzboard Alpha", "kind": "team", "ownerId": "alpha-owner",
            "defaults": {}, "subscription": {"status": "active", "source": "alpha", "periodEndsAt": None, "kind": "team"},
            "alphaEnabled": True, "createdAt": policy.timestamp().isoformat(),
        })
        function_app.storage.save("memberships", {
            "id": policy.membership_id(user_id, alpha_id), "userId": user_id,
            "workspaceId": alpha_id, "role": "coach",
        })
        identity = {"userId": user_id, "name": "Coach Two", "email": "coach@example.com", "emailVerified": True}
        with patch.dict(os.environ, {"AUTH_MODE": "entra", "APP_ENVIRONMENT": "local", "BILLING_MODE": "paddle"}):
            workspaces = policy.accessible(function_app.storage, user_id)
            fallback, fallback_role = policy.select_workspace(function_app.storage, identity)
            requested, requested_role = policy.select_workspace(function_app.storage, identity, alpha_id)
        self.assertEqual({workspace["id"] for workspace in workspaces}, {personal_id, alpha_id})
        self.assertEqual(fallback["id"], personal_id)
        self.assertEqual(fallback_role, "owner")
        self.assertEqual(requested["id"], alpha_id)
        self.assertEqual(requested_role, "coach")
        self.assertTrue(next(workspace for workspace in workspaces if workspace["id"] == personal_id)["capabilities"]["edit"])

    def test_bootstrapped_alpha_owner_invites_verified_coach_without_paid_subscription(self):
        function_app.storage = function_app.Storage()
        policy = function_app.accounts
        owner = {"userId": "entra-owner", "name": "Alpha Owner", "email": "owner@example.com", "emailVerified": True}
        coach = {"userId": "entra-coach", "name": "Alpha Coach", "email": "coach@example.com", "emailVerified": True}
        with patch.dict(os.environ, {"AUTH_MODE": "entra", "APP_ENVIRONMENT": "local", "BILLING_MODE": "paddle"}):
            policy.ensure_user(function_app.storage, owner)
            policy.ensure_user(function_app.storage, coach)
            workspace = policy.bootstrap_alpha_owner(function_app.storage, owner["userId"], "Blitzboard Alpha")
            repeated = policy.bootstrap_alpha_owner(function_app.storage, owner["userId"], "Blitzboard Alpha")
        self.assertTrue(workspace["alphaEnabled"])
        self.assertEqual(repeated["id"], workspace["id"])
        self.assertEqual(workspace["subscription"]["source"], "alpha")
        self.assertIsNone(workspace["subscription"]["periodEndsAt"])

        with patch.dict(os.environ, {"AUTH_MODE": "entra", "APP_ENVIRONMENT": "local", "DEV_AUTH_SECRET": "local-test-secret", "APP_PUBLIC_URL": "http://localhost:5173"}):
            invite = policy.queue_invitation(function_app.storage, owner, workspace, coach["email"], "coach")
            message = function_app.storage.list("outbox")[0]
            captured = json.loads(policy.outbox_cipher().decrypt(message["payload"].encode()))["acceptUrl"]
            token = parse_qs(urlparse(captured).fragment)["invite"][0]
            accepted, status = policy.accept_invitation(function_app.storage, coach, {"token": token})
        self.assertEqual(status, 200)
        self.assertEqual(accepted["role"], "coach")
        self.assertEqual([item["id"] for item in policy.accessible(function_app.storage, coach["userId"])], [workspace["id"]])
        self.assertEqual(function_app.storage.get("memberships", policy.membership_id(coach["userId"], workspace["id"]))["role"], "coach")
        self.assertNotIn("tokenHash", invite)

    def test_alpha_owner_bootstrap_is_restricted_to_local_entra_mode(self):
        policy = function_app.accounts
        storage = function_app.Storage()
        storage.save("profiles", {"id": "owner", "name": "Owner", "email": "owner@example.com"})
        for environment, deployed in (("production", False), ("local", True)):
            patch_values = {"AUTH_MODE": "entra", "APP_ENVIRONMENT": environment,
                            "WEBSITE_SITE_NAME": "alpha-app" if deployed else ""}
            with self.subTest(environment=environment, deployed=deployed), patch.dict(os.environ, patch_values, clear=False):
                with self.assertRaises(policy.AccountError) as failure:
                    policy.bootstrap_alpha_owner(storage, "owner")
                self.assertEqual(failure.exception.code, "ALPHA_BOOTSTRAP_LOCAL_ONLY")
        with patch.dict(os.environ, {"AUTH_MODE": "development", "APP_ENVIRONMENT": "local"}):
            with self.assertRaises(policy.AccountError) as failure:
                policy.bootstrap_alpha_owner(storage, "owner")
        self.assertEqual(failure.exception.code, "ALPHA_BOOTSTRAP_LOCAL_ONLY")

    def test_entra_invitation_acceptance_is_available_without_existing_workspace(self):
        function_app.storage = function_app.Storage()
        policy = function_app.accounts
        owner_claims = {**self.claims, "oid": "66666666-6666-4666-8666-666666666666", "email": "owner@example.com", "email_verified": True}
        coach_claims = {**self.claims, "email_verified": True, "xms_edov": True}
        owner = self.authenticate(owner_claims)
        coach = self.authenticate(coach_claims)
        def entra_request(method, path, claims, payload=None, workspace_id=None):
            request = FakeRequest(method, path, payload=payload)
            request.headers = {
                "Authorization": "Bearer " + jwt.encode(claims, self.key, algorithm="RS256", headers={"kid": "test-key"}),
            }
            if workspace_id:
                request.headers["X-Workspace-Id"] = workspace_id
            return function_app.api(request)

        with patch.dict(os.environ, {"AUTH_MODE": "entra", "APP_ENVIRONMENT": "local", "BILLING_MODE": "paddle"}):
            policy.ensure_user(function_app.storage, owner)
            policy.ensure_user(function_app.storage, coach)
            team = policy.bootstrap_alpha_owner(function_app.storage, owner["userId"], "Blitzboard Alpha")
        with patch.dict(os.environ, {"AUTH_MODE": "entra", "APP_ENVIRONMENT": "local", "BILLING_MODE": "paddle", "DEV_AUTH_SECRET": "local-test-secret", "APP_PUBLIC_URL": "http://localhost:5173"}), patch.object(function_app, "AUTH_MODE", "entra"), patch.object(authentication, "_authenticator", self.validator), patch.object(self.validator, "signing_key", return_value=self.key.public_key()):
            created = entra_request("POST", "workspace/invitations", owner_claims,
                                    {"email": coach["email"], "role": "coach"}, team["id"])
            invite = response_json(created)
            message = function_app.storage.list("outbox")[0]
            captured = json.loads(policy.outbox_cipher().decrypt(message["payload"].encode()))["acceptUrl"]
            token = parse_qs(urlparse(captured).fragment)["invite"][0]
            accepted = entra_request("POST", "invitations/accept", coach_claims, {"token": token})
            workspaces = entra_request("GET", "workspaces", coach_claims)
            content_responses = [
                entra_request("POST", "playbooks", coach_claims, {"name": "Coach Playbook", "year": 2026}, team["id"]),
                entra_request("POST", "schedule-events", coach_claims,
                              {"name": "Practice", "eventDate": "2026-01-15", "eventType": "Practice"}, team["id"]),
                entra_request("POST", "game-plans", coach_claims, {"name": "Coach Game Plan", "year": 2026}, team["id"]),
            ]
            invite_again = entra_request("POST", "workspace/invitations", coach_claims,
                                         {"email": "another-coach@example.com", "role": "coach"}, team["id"])
            remove_member = entra_request("DELETE", f"workspace/members/{coach['userId']}", coach_claims,
                                          workspace_id=team["id"])
            update_workspace = entra_request("PATCH", "workspace", coach_claims,
                                             {"name": "Coach Changed Team"}, team["id"])
        self.assertEqual(created.status_code, 201)
        self.assertEqual(accepted.status_code, 200)
        self.assertEqual(response_json(accepted)["role"], "coach")
        self.assertEqual([item["id"] for item in response_json(workspaces)["items"]], [team["id"]])
        self.assertEqual([response.status_code for response in content_responses], [201, 201, 201])
        self.assertEqual(invite_again.status_code, 403)
        self.assertEqual(remove_member.status_code, 403)
        self.assertEqual(update_workspace.status_code, 403)
        self.assertEqual(invite["role"], "coach")
        self.assertEqual(function_app.storage.get("memberships", policy.membership_id(coach["userId"], team["id"]))["role"], "coach")

    def test_unverified_or_wrong_email_cannot_join_alpha_team(self):
        function_app.storage = function_app.Storage()
        policy = function_app.accounts
        owner = {"userId": "entra-owner", "name": "Alpha Owner", "email": "owner@example.com", "emailVerified": True}
        with patch.dict(os.environ, {"AUTH_MODE": "entra", "APP_ENVIRONMENT": "local", "BILLING_MODE": "paddle", "DEV_AUTH_SECRET": "local-test-secret", "APP_PUBLIC_URL": "http://localhost:5173"}):
            policy.ensure_user(function_app.storage, owner)
            workspace = policy.bootstrap_alpha_owner(function_app.storage, owner["userId"], "Blitzboard Alpha")
            invite = policy.queue_invitation(function_app.storage, owner, workspace, "coach@example.com", "coach")
            message = function_app.storage.list("outbox")[0]
            captured = json.loads(policy.outbox_cipher().decrypt(message["payload"].encode()))["acceptUrl"]
            token = parse_qs(urlparse(captured).fragment)["invite"][0]
        for identity in (
            {"userId": "unverified", "name": "Unverified", "email": "coach@example.com", "emailVerified": False},
            {"userId": "wrong-email", "name": "Wrong", "email": "other@example.com", "emailVerified": True},
        ):
            with self.subTest(user_id=identity["userId"]), patch.dict(os.environ, {"AUTH_MODE": "entra", "APP_ENVIRONMENT": "local", "DEV_AUTH_SECRET": "local-test-secret", "APP_PUBLIC_URL": "http://localhost:5173"}), self.assertRaises(policy.AccountError) as failure:
                policy.accept_invitation(function_app.storage, identity, {"token": token})
            self.assertEqual(failure.exception.code, "INVITED_EMAIL_REQUIRED")

    def test_entra_email_claim_repairs_blank_profile_without_overwriting_existing_email(self):
        accounts = function_app.accounts
        storage = function_app.Storage()
        identity = {"userId": "entra-existing", "name": "Coach", "email": "coach@example.com"}
        storage.save("profiles", {"id": identity["userId"], "name": "Coach", "email": "", "coachingTitle": "Head Coach", "preferences": dict(accounts.DEFAULT_PREFERENCES)})
        accounts.ensure_user(storage, identity)
        profile = storage.get("profiles", identity["userId"])
        self.assertEqual(profile["email"], "coach@example.com")
        self.assertEqual(profile["coachingTitle"], "Head Coach")

        identity["email"] = "updated@example.com"
        accounts.ensure_user(storage, identity)
        self.assertEqual(storage.get("profiles", identity["userId"])["email"], "coach@example.com")


class PermissionTests(unittest.TestCase):
    def test_content_routes_select_named_permissions(self):
        policy = function_app.accounts
        for root, prefix in (("playbooks", "PLAY"), ("schedule-events", "SCHEDULE"), ("game-plans", "GAMEPLAN")):
            for method, action in (("GET", "READ"), ("POST", "WRITE"), ("PATCH", "WRITE"), ("DELETE", "DELETE")):
                with self.subTest(root=root, method=method):
                    self.assertEqual(policy.content_permission([root, "parent", "child", "record"], method),
                                     policy.Permission[f"{prefix}_{action}"])
        self.assertEqual(policy.content_permission(["exports"], "POST"), policy.Permission.PLAY_READ)
        with self.assertRaises(policy.AccountError):
            policy.content_permission(["unknown"], "POST")
        with self.assertRaises(policy.AccountError):
            policy.content_permission(["playbooks"], "PUT")

    def test_permission_matrix_denies_unknown_roles_and_permissions(self):
        policy = function_app.accounts
        self.assertEqual(policy.ROLE_PERMISSIONS["owner"], frozenset(policy.Permission))
        self.assertEqual(len(policy.ROLE_PERMISSIONS["coach"]), 9)
        for permission in policy.Permission:
            for role in ("owner", "coach", "admin", "unknown", None, [], {}):
                with self.subTest(role=role, permission=permission):
                    expected = role == "owner" or (role == "coach" and permission in policy.CONTENT_PERMISSIONS)
                    self.assertEqual(policy.has_permission(role, permission), expected)
        self.assertFalse(policy.has_permission("owner", "play.write"))
        with self.assertRaises(TypeError):
            policy.ROLE_PERMISSIONS["admin"] = policy.CONTENT_PERMISSIONS

    def test_permission_grant_does_not_bypass_workspace_entitlement(self):
        policy = function_app.accounts
        workspace = {"subscription": {"kind": "team", "status": "trialing", "trialEndsAt": None}}
        for permission in policy.Permission:
            with self.subTest(permission=permission):
                if permission in policy.READ_PERMISSIONS:
                    policy.require_permission(workspace, "owner", permission)
                else:
                    with self.assertRaises(policy.AccountError) as failure:
                        policy.require_permission(workspace, "owner", permission)
                    self.assertEqual(failure.exception.code, "SUBSCRIPTION_READ_ONLY")
        with self.assertRaises(policy.AccountError) as failure:
            policy.require_permission(workspace, "coach", policy.Permission.MEMBER_INVITE)
        self.assertEqual(failure.exception.code, "FORBIDDEN")


class AuthenticationTests(unittest.TestCase):
    def setUp(self):
        function_app.storage = function_app.Storage()

    def test_schedule_range_filters_dates_inclusively_and_preserves_scope(self):
        for path, date_field, extra in (("schedule-events", "eventDate", {"eventType": "Practice"}), ("game-plans", "gameDate", {})):
            for date in ("2025-12-31", "2026-01-01", "2026-02-28", "2026-03-01"):
                self.assertEqual(call_api("POST", path, "local-coach", {"name": date, date_field: date, **extra}).status_code, 201)
            call_api("POST", path, "other-coach", {"name": "Private", date_field: "2026-01-15", **extra})
            request = FakeRequest("GET", path, "local-coach")
            request.params = {"start": "2026-01-01", "end": "2026-02-28"}
            result = function_app.api(request)
            self.assertEqual(result.status_code, 200)
            self.assertEqual(sorted(item[date_field] for item in response_json(result)["items"]), ["2026-01-01", "2026-02-28"])
            self.assertEqual(len(response_json(call_api("GET", path, "local-coach"))["items"]), 4)
            request.params = {"end": "2026-01-01"}
            self.assertEqual(len(response_json(function_app.api(request))["items"]), 2)

    def test_schedule_range_rejects_invalid_dates_and_reversed_bounds(self):
        for path in ("schedule-events", "game-plans"):
            for params in ({"start": "2026-02-30"}, {"end": "2026-1-1"}, {"start": ""}, {"start": "2026-03-01", "end": "2026-02-01"}, {"start": "' OR 1=1 --"}):
                request = FakeRequest("GET", path, "local-coach")
                request.params = params
                result = function_app.api(request)
                self.assertEqual(result.status_code, 400)
                self.assertEqual(response_json(result)["error"]["code"], "VALIDATION_ERROR")

    def test_schedule_summary_omits_expanded_data_and_child_queries(self):
        for path, date_field, extra in (("schedule-events", "eventDate", {"eventType": "Practice"}), ("game-plans", "gameDate", {"opponent": "Falcons"})):
            call_api("POST", path, "local-coach", {"name": "Summary", date_field: "2026-01-15", "startTime": "16:30", "location": "Main Stadium", "notes": "Large notes", "installPlaybookIds": ["book"], **extra})
            request = FakeRequest("GET", path, "local-coach")
            request.params = {"start": "2026-01-01", "end": "2026-12-31", "scheduleSummary": "true"}
            with patch.object(function_app, "with_child_count", side_effect=AssertionError("Year summary should not load child counts")):
                result = function_app.api(request)
            self.assertEqual(result.status_code, 200)
            record = response_json(result)["items"][0]
            self.assertEqual(record[date_field], "2026-01-15")
            self.assertEqual(record["startTime"], "16:30")
            if path == "game-plans":
                self.assertEqual(record["location"], "Main Stadium")
            self.assertNotIn("notes", record)
            self.assertNotIn("installPlaybookIds", record)
            self.assertIn("ownerId", record)

    def test_schedule_range_uses_parameterized_cosmos_query(self):
        adapter = function_app.Storage()
        adapter.container = Mock()
        adapter.container.query_items.return_value = []
        for entity, field in (("scheduleEvents", "eventDate"), ("gamePlans", "gameDate")):
            adapter.list(entity, owner_id="local-coach", start="2026-01-01", end="2026-03-31")
            query = adapter.container.query_items.call_args.args[0]
            parameters = adapter.container.query_items.call_args.kwargs["parameters"]
            self.assertIn(f"c.{field} >= @start", query)
            self.assertIn(f"c.{field} <= @end", query)
            self.assertNotIn("2026-01-01", query)
            self.assertIn({"name": "@start", "value": "2026-01-01"}, parameters)
            self.assertIn({"name": "@end", "value": "2026-03-31"}, parameters)

    def test_search_rejects_overlong_terms(self):
        for path, parameter in (("search", "q"), ("playbooks", "namePrefix"), ("game-plans", "namePrefix")):
            request = FakeRequest("GET", path, "local-coach")
            request.params = {parameter: "x" * 257}
            result = function_app.api(request)
            self.assertEqual(result.status_code, 400)
            self.assertEqual(response_json(result)["error"]["code"], "VALIDATION_ERROR")
            request.params = {parameter: "x" * 256}
            self.assertEqual(function_app.api(request).status_code, 200)

    def test_search_treats_sql_and_html_as_literal_text(self):
        for term in ("' OR 1=1 --", '<img src=x onerror="alert(1)">', "Coach O'Brien"):
            record = response_json(call_api("POST", "playbooks", "local-coach", {"name": term}))
            for path, parameter in (("search", "q"), ("playbooks", "namePrefix")):
                request = FakeRequest("GET", path, "local-coach")
                request.params = {parameter: term}
                result = function_app.api(request)
                self.assertEqual(result.status_code, 200)
                self.assertEqual([item["id"] for item in response_json(result)["items"]], [record["id"]])
                self.assertEqual(response_json(result)["items"][0]["name"], term)

    def test_search_rate_limit_is_shared_across_search_routes_and_resets(self):
        request = FakeRequest("GET", "search", "local-coach")
        request.params = {"q": "Book"}
        grid_request = FakeRequest("GET", "playbooks", "local-coach")
        grid_request.params = {"namePrefix": "Book"}
        with patch.object(function_app, "SEARCH_REQUEST_LIMIT", 2), patch.object(function_app, "time", return_value=120):
            self.assertEqual(function_app.api(request).status_code, 200)
            self.assertEqual(function_app.api(grid_request).status_code, 200)
            denied = function_app.api(request)
            self.assertEqual(denied.status_code, 429)
            self.assertEqual(response_json(denied)["error"]["code"], "SEARCH_RATE_LIMITED")
            self.assertGreater(int(denied.headers["Retry-After"]), 0)
            self.assertEqual(call_api("GET", "search", "other-coach").status_code, 200)
            self.assertEqual(call_api("GET", "playbooks", "local-coach").status_code, 200)
        with patch.object(function_app, "time", return_value=181):
            self.assertEqual(function_app.api(request).status_code, 200)

    def test_search_rate_limit_is_atomic_for_concurrent_requests(self):
        def search(_):
            return call_api("GET", "search", "local-coach").status_code
        with patch.object(function_app, "SEARCH_REQUEST_LIMIT", 2), patch.object(function_app, "time", return_value=120):
            with ThreadPoolExecutor(max_workers=4) as executor:
                statuses = list(executor.map(search, range(4)))
        self.assertEqual(sorted(statuses), [200, 200, 429, 429])

    def test_search_limits_results_and_reports_truncation(self):
        for name in ("Third", "First", "Second"):
            call_api("POST", "playbooks", "local-coach", {"name": name})
        with patch.object(function_app, "SEARCH_RESULT_LIMIT", 2):
            result = response_json(call_api("GET", "search", "local-coach"))
        self.assertEqual([item["name"] for item in result["items"]], ["First", "Second"])
        self.assertEqual(result["total"], 3)
        self.assertEqual(result["limit"], 2)
        self.assertTrue(result["truncated"])

    def test_search_uses_cosmos_parameters_for_untrusted_text(self):
        term = "' OR 1=1 --"
        adapter = function_app.Storage()
        adapter.container = Mock()
        adapter.container.query_items.return_value = []
        adapter.list("playbooks", name_prefix=term, owner_id="local-coach")
        query = adapter.container.query_items.call_args.args[0]
        parameters = adapter.container.query_items.call_args.kwargs["parameters"]
        self.assertNotIn(term, query)
        self.assertIn("STARTSWITH(c.name, @namePrefix, true)", query)
        self.assertIn({"name": "@namePrefix", "value": term}, parameters)

    def test_global_search_matches_partial_names_and_classifies_drillthrough_records(self):
        book = response_json(call_api("POST", "playbooks", "local-coach", {"name": "Falcons Book", "year": 2026}))
        game = response_json(call_api("POST", "game-plans", "local-coach", {"name": "Falcons Game", "year": 2027}))
        install = response_json(call_api("POST", "playbooks", "local-coach", {"name": "Falcons Install", "year": 2028, "gamePlanId": game["id"], "gameCardId": "offense-installs"}))
        script = response_json(call_api("POST", "playbooks", "local-coach", {"name": "Falcons Script", "year": 2029, "gamePlanId": game["id"], "gameCardId": "defense-scout"}))
        play = response_json(call_api("POST", f"playbooks/{book['id']}/plays", "local-coach", {"name": "Falcons Play", "markers": [{"id": "QB"}]}))
        scout = response_json(call_api("POST", f"playbooks/{script['id']}/plays", "local-coach", {"name": "Falcons Scout"}))
        report = response_json(call_api("POST", f"game-plans/{game['id']}/scout-plays", "local-coach", {"name": "Falcons Report", "unit": "Defense"}))
        call_api("POST", "playbooks", "local-coach", {"name": "Unrelated"})
        call_api("POST", "playbooks", "other-coach", {"name": "Falcons Private"})
        request = FakeRequest("GET", "search", "local-coach")
        request.params = {"q": "  LcOn  "}
        result = response_json(function_app.api(request))
        rows = {row["id"]: row for row in result["items"]}
        self.assertEqual(result["query"], "lcon")
        expected = [(book, "Playbook"), (game, "Game"), (install, "Install"), (script, "Practice Script"), (play, "Play"), (scout, "Scout Play"), (report, "Scouting Report")]
        self.assertEqual(set(rows), {record["id"] for record, _ in expected})
        for record, label in expected:
            self.assertEqual(rows[record["id"]]["type"], label)
            self.assertEqual(rows[record["id"]]["entityType"], record["entityType"])
            self.assertEqual(rows[record["id"]].get("year"), record.get("year"))
            self.assertNotIn("markers", rows[record["id"]])
        self.assertEqual(rows[play["id"]]["parentId"], book["id"])
        self.assertEqual(rows[scout["id"]]["parentId"], script["id"])
        self.assertEqual(rows[install["id"]]["gamePlanId"], game["id"])
        request.params = {"q": "no such record"}
        self.assertEqual(response_json(function_app.api(request))["items"], [])

    def test_global_search_is_scoped_to_the_selected_workspace(self):
        team = self.team_fixture()
        book = response_json(call_api("POST", "playbooks", "coach-b", {"name": "Team Needle"}, team["id"]))
        game = response_json(call_api("POST", "game-plans", "local-coach", {"name": "Team Needle Game"}, team["id"]))
        play = response_json(call_api("POST", f"playbooks/{book['id']}/plays", "coach-b", {"name": "Team Needle Play"}, team["id"]))
        report = response_json(call_api("POST", f"game-plans/{game['id']}/scout-plays", "local-coach", {"name": "Team Needle Report"}, team["id"]))
        personal = response_json(call_api("POST", "playbooks", "local-coach", {"name": "Personal Needle"}))
        request = FakeRequest("GET", "search", "local-coach")
        request.params = {"q": "needle"}
        self.assertEqual({row["id"] for row in response_json(function_app.api(request))["items"]}, {personal["id"]})
        request.headers["X-Workspace-Id"] = team["id"]
        self.assertEqual({row["id"] for row in response_json(function_app.api(request))["items"]}, {book["id"], game["id"], play["id"], report["id"]})

    def test_playbook_summary_rows_include_adjustment_titles_without_diagrams(self):
        book = response_json(call_api("POST", "playbooks", "local-coach", {"name": "Book"}))
        plays_path = f"playbooks/{book['id']}/plays"
        diagram = {"markers": [{"id": "QB", "x": 50}], "drawings": {"line": []}, "textAnnotations": [{"text": "Call"}], "zones": [{"id": "zone"}]}
        play = response_json(call_api("POST", plays_path, "local-coach", {"name": "Play", "theme": "blackboard", **diagram}))
        other = response_json(call_api("POST", plays_path, "local-coach", {"name": "Other"}))
        slide_path = f"{plays_path}/{play['id']}/slides"
        slide = response_json(call_api("POST", slide_path, "local-coach", {"title": "Check", **diagram}))
        call_api("POST", slide_path, "local-coach", diagram)
        other_book = response_json(call_api("POST", "playbooks", "local-coach", {"name": "Unrelated"}))
        other_play_path = f"playbooks/{other_book['id']}/plays"
        unrelated_play = response_json(call_api("POST", other_play_path, "local-coach", {"name": "Unrelated"}))
        call_api("POST", f"{other_play_path}/{unrelated_play['id']}/slides", "local-coach", {"title": "Unrelated"})
        call_api("POST", f"playbooks/{book['id']}/groupings", "local-coach", {"name": "Group"})
        request = FakeRequest("GET", f"playbooks/{book['id']}/rows", "local-coach")
        request.params = {"summary": "true"}
        with patch.object(function_app.storage, "list", wraps=function_app.storage.list) as list_records:
            rows = response_json(function_app.api(request))["items"]
        slide_queries = [call for call in list_records.call_args_list if call.args[0] == "slides"]
        self.assertEqual(len(slide_queries), 1)
        self.assertEqual(set(slide_queries[0].kwargs["parent_ids"]), {play["id"], other["id"]})
        self.assertEqual(set(slide_queries[0].kwargs["fields"]), {"id", "parentId", "title", "workspaceId", "ownerId"})
        self.assertEqual([row["name"] for row in rows], ["Play", "Other", "Group"])
        self.assertEqual(rows[0]["adjustments"], ["Check", "Adjustment"])
        self.assertEqual(rows[1]["adjustments"], [])
        self.assertEqual(rows[2]["rowType"], "grouping")
        for row in rows:
            self.assertTrue(set(diagram).isdisjoint(row))
            self.assertNotIn("createdAt", row)
            self.assertNotIn("theme", row)
        request.params["namePrefix"] = "Other"
        self.assertEqual([row["id"] for row in response_json(function_app.api(request))["items"]], [other["id"]])
        request.params["namePrefix"] = "Missing"
        self.assertEqual(response_json(function_app.api(request))["items"], [])
        full_rows = response_json(call_api("GET", f"playbooks/{book['id']}/rows", "local-coach"))["items"]
        full_play = response_json(call_api("GET", f"{plays_path}/{play['id']}", "local-coach"))
        full_slides = response_json(call_api("GET", slide_path, "local-coach"))["items"]
        for key, value in diagram.items():
            self.assertEqual(full_rows[0][key], value)
            self.assertEqual(full_play[key], value)
            self.assertEqual(full_slides[0][key], value)
        self.assertEqual(full_rows[0]["theme"], "blackboard")
        self.assertIn("createdAt", full_rows[0])
        self.assertEqual(full_play["theme"], "blackboard")
        self.assertEqual(full_slides[0]["id"], slide["id"])
        self.assertEqual(full_rows[1]["id"], other["id"])
        slide_request = FakeRequest("GET", slide_path, "local-coach")
        slide_request.params = {"summary": "true"}
        metadata = response_json(function_app.api(slide_request))["items"]
        self.assertEqual(metadata, [{"id": item["id"], "title": item.get("title") or "Adjustment"} for item in full_slides])
        self.assertTrue(all(set(item) == {"id", "title"} for item in metadata))

    def test_grid_summary_lists_omit_unused_fields_without_changing_full_gets(self):
        book = response_json(call_api("POST", "playbooks", "local-coach", {"name": "Book", "theme": "blackboard"}))
        plan = response_json(call_api("POST", "game-plans", "local-coach", {"name": "Plan", "theme": "blackboard"}))
        play = response_json(call_api("POST", f"playbooks/{book['id']}/plays", "local-coach", {"name": "Play", "theme": "blackboard"}))
        scout_play = response_json(call_api("POST", f"game-plans/{plan['id']}/scout-plays", "local-coach", {"name": "Scout", "theme": "blackboard"}))

        for collection_path, record in (("playbooks", book), ("game-plans", plan)):
            request = FakeRequest("GET", collection_path, "local-coach")
            request.params = {"summary": "true"}
            item = response_json(function_app.api(request))["items"][0]
            self.assertNotIn("createdAt", item)
            self.assertNotIn("theme", item)
            full_record = response_json(call_api("GET", f"{collection_path}/{record['id']}", "local-coach"))
            self.assertIn("createdAt", full_record)
            self.assertEqual(full_record["theme"], "blackboard")
            regular_list_item = response_json(call_api("GET", collection_path, "local-coach"))["items"][0]
            self.assertIn("createdAt", regular_list_item)
            self.assertEqual(regular_list_item["theme"], "blackboard")

        play_request = FakeRequest("GET", f"playbooks/{book['id']}/plays", "local-coach")
        play_request.params = {"summary": "true"}
        play_summary = response_json(function_app.api(play_request))["items"][0]
        self.assertNotIn("createdAt", play_summary)
        self.assertNotIn("theme", play_summary)
        play_request.params["preserveTheme"] = "true"
        play_preview = response_json(function_app.api(play_request))["items"][0]
        self.assertNotIn("createdAt", play_preview)
        self.assertEqual(play_preview["theme"], "blackboard")
        self.assertEqual(response_json(call_api("GET", f"playbooks/{book['id']}/plays/{play['id']}", "local-coach"))["theme"], "blackboard")

        scout_request = FakeRequest("GET", f"game-plans/{plan['id']}/scout-plays", "local-coach")
        scout_request.params = {"summary": "true"}
        scout_summary = response_json(function_app.api(scout_request))["items"][0]
        self.assertNotIn("createdAt", scout_summary)
        self.assertEqual(scout_summary["theme"], "blackboard")
        self.assertEqual(response_json(call_api("GET", f"game-plans/{plan['id']}/scout-plays/{scout_play['id']}", "local-coach"))["theme"], "blackboard")

    def test_schedule_events_are_validated_and_workspace_scoped(self):
        team = self.team_fixture()
        payload = {"name": "Tuesday Practice", "eventType": "Practice", "eventDate": "2026-10-13", "startTime": "16:00"}
        created = call_api("POST", "schedule-events", "local-coach", payload, team["id"])
        self.assertEqual(created.status_code, 201)
        event = response_json(created)
        self.assertEqual(event["workspaceId"], team["id"])
        self.assertEqual(response_json(call_api("GET", "schedule-events", "local-coach", workspace_id=team["id"]))["items"], [event])
        self.assertEqual(response_json(call_api("GET", "schedule-events", "local-coach"))["items"], [])
        self.assertEqual(call_api("PATCH", f"schedule-events/{event['id']}", "coach-b", {"name": "Team Practice"}, team["id"]).status_code, 200)
        self.assertEqual(call_api("PATCH", f"schedule-events/{event['id']}", "outsider", {"name": "No access"}, team["id"]).status_code, 403)
        self.assertEqual(call_api("POST", "schedule-events", "local-coach", {**payload, "eventDate": "not-a-date"}, team["id"]).status_code, 400)
        self.assertEqual(call_api("POST", "schedule-events", "local-coach", {**payload, "eventType": "Game"}, team["id"]).status_code, 400)
        self.assertEqual(call_api("DELETE", f"schedule-events/{event['id']}", "local-coach", workspace_id=team["id"]).status_code, 204)

    def test_content_limits_load_from_app_settings(self):
        defaults = {"playbooks": 100, "gamePlans": 100, "plays": 5000, "scoutPlays": 5000}
        self.assertEqual(function_app.accounts.load_limits({}), defaults)
        self.assertEqual(function_app.accounts.load_limits({
            "CONTENT_LIMIT_PLAYBOOKS": "12",
            "CONTENT_LIMIT_GAME_PLANS": "34",
            "CONTENT_LIMIT_PLAYS": "560",
            "CONTENT_LIMIT_SCOUT_PLAYS": "780",
        }), {"playbooks": 12, "gamePlans": 34, "plays": 560, "scoutPlays": 780})
        self.assertEqual(function_app.accounts.load_limits({"CONTENT_LIMIT_PLAYBOOKS": "0"})["playbooks"], 0)
        for invalid in ("many", "-1"):
            with self.subTest(value=invalid), self.assertRaisesRegex(ValueError, "CONTENT_LIMIT_PLAYBOOKS"):
                function_app.accounts.load_limits({"CONTENT_LIMIT_PLAYBOOKS": invalid})

    def test_archive_restore_preserves_content_and_delete_is_permanent(self):
        for collection_path, child_path in (("playbooks", "plays"), ("game-plans", "scout-plays")):
            collection = response_json(call_api("POST", collection_path, "local-coach", {"name": "Collection"}))
            children_path = f"{collection_path}/{collection['id']}/{child_path}"
            child = response_json(call_api("POST", children_path, "local-coach", {"name": "Play", "markers": [{"id": "marker", "x": 20}]}))
            for path, record in ((children_path, child), (collection_path, collection)):
                with self.subTest(path=path):
                    item_path = f"{path}/{record['id']}"
                    self.assertEqual(record["recordStatus"], "Active")
                    for status in ("Archived", "Active", "Archived"):
                        current = response_json(call_api("GET", item_path, "local-coach"))
                        updated = call_api("PATCH", item_path, "local-coach", {"recordStatus": status, "_etag": current.get("_etag")})
                        self.assertEqual(updated.status_code, 200)
                        stored = response_json(call_api("GET", item_path, "local-coach"))
                        self.assertEqual(stored["recordStatus"], status)
                        for key in ("name", "ownerId", "createdAt", "parentId", "markers"):
                            if key in record:
                                self.assertEqual(stored[key], record[key])
                        listed = response_json(call_api("GET", path, "local-coach"))["items"]
                        self.assertEqual(next(item for item in listed if item["id"] == record["id"])["recordStatus"], status)
                    self.assertEqual(call_api("DELETE", item_path, "local-coach").status_code, 204)
                    self.assertEqual(call_api("GET", item_path, "local-coach").status_code, 404)

    def test_record_status_defaults_legacy_records_and_rejects_invalid_values(self):
        for path in ("playbooks", "game-plans"):
            created = response_json(call_api("POST", path, "local-coach", {"name": "Legacy"}))
            entity_type = "playbooks" if path == "playbooks" else "gamePlans"
            function_app.storage.memory[entity_type][created["id"]].pop("recordStatus")
            item_path = f"{path}/{created['id']}"
            self.assertEqual(response_json(call_api("GET", item_path, "local-coach"))["recordStatus"], "Active")
            self.assertEqual(response_json(call_api("GET", path, "local-coach"))["items"][0]["recordStatus"], "Active")
            for invalid in (None, "Deleted", False, [], {}):
                self.assertEqual(call_api("PATCH", item_path, "local-coach", {"recordStatus": invalid}).status_code, 400)
                self.assertEqual(call_api("POST", path, "local-coach", {"name": "Invalid", "recordStatus": invalid}).status_code, 400)
            self.assertEqual(response_json(call_api("GET", item_path, "local-coach"))["recordStatus"], "Active")

    def test_archiving_collection_preserves_descendants_and_usage(self):
        book = response_json(call_api("POST", "playbooks", "local-coach", {"name": "Book"}))
        children_path = f"playbooks/{book['id']}/plays"
        play = response_json(call_api("POST", children_path, "local-coach", {"name": "Play"}))
        slides_path = f"{children_path}/{play['id']}/slides"
        slide = response_json(call_api("POST", slides_path, "local-coach", {"name": "Adjustment"}))
        usage = response_json(call_api("GET", "workspace", "local-coach"))["usage"]
        for path in (f"playbooks/{book['id']}", f"{children_path}/{play['id']}"):
            current = response_json(call_api("GET", path, "local-coach"))
            self.assertEqual(call_api("PATCH", path, "local-coach", {"recordStatus": "Archived", "_etag": current.get("_etag")}).status_code, 200)
        self.assertEqual(response_json(call_api("GET", "workspace", "local-coach"))["usage"], usage)
        self.assertEqual(call_api("GET", f"{slides_path}/{slide['id']}", "local-coach").status_code, 200)
        self.assertEqual(call_api("DELETE", f"playbooks/{book['id']}", "local-coach").status_code, 204)
        self.assertIsNone(function_app.storage.get("plays", play["id"]))
        self.assertIsNone(function_app.storage.get("slides", slide["id"]))

    def test_archive_restore_enforces_workspace_permissions(self):
        team = self.team_fixture()
        book = response_json(call_api("POST", "playbooks", "local-coach", {"name": "Team"}, team["id"]))
        path = f"playbooks/{book['id']}"
        self.assertEqual(call_api("PATCH", path, "coach-b", {"recordStatus": "Archived"}, team["id"]).status_code, 200)
        self.assertEqual(call_api("PATCH", path, "outsider", {"recordStatus": "Active"}, team["id"]).status_code, 403)
        workspace = function_app.storage.get("workspaces", team["id"])
        workspace["subscription"]["periodEndsAt"] = (function_app.accounts.timestamp() - timedelta(seconds=1)).isoformat()
        self.assertEqual(call_api("PATCH", path, "coach-b", {"recordStatus": "Active"}, team["id"]).status_code, 403)
        self.assertEqual(response_json(call_api("GET", path, "local-coach", workspace_id=team["id"]))["recordStatus"], "Archived")

    def test_local_owner_has_independent_annual_workspaces(self):
        user = response_json(call_api("GET", "me", "local-coach"))
        self.assertEqual(len(user["workspaces"]), 2)
        self.assertEqual({item["kind"] for item in user["workspaces"]}, {"individual", "team"})
        individual = next(item for item in user["workspaces"] if item["kind"] == "individual")
        team = next(item for item in user["workspaces"] if item["kind"] == "team")
        self.assertEqual(individual["role"], "owner")
        self.assertEqual(individual["subscription"]["kind"], "free")
        self.assertEqual(individual["limits"], {"playbooks": 5, "gamePlans": 15, "plays": 500, "scoutPlays": 500})
        self.assertEqual(team["role"], "owner")
        self.assertEqual(team["subscription"]["interval"], "year")
        self.assertEqual(team["subscription"]["source"], "development_fixture")

    def test_development_startup_accounts_have_isolated_plan_fixtures(self):
        for plan, expected_limits in (
            ("free", {"playbooks": 5, "gamePlans": 15, "plays": 500, "scoutPlays": 500}),
            ("individual", {"playbooks": 100, "gamePlans": 100, "plays": 5000, "scoutPlays": 5000}),
            ("team", {"playbooks": 100, "gamePlans": 200, "plays": 10000, "scoutPlays": 10000}),
        ):
            with self.subTest(plan=plan):
                user_id = f"local-demo-{plan}"
                identity = response_json(call_api("GET", "me", user_id))
                workspace = next(item for item in identity["workspaces"] if item["subscription"]["kind"] == plan)
                self.assertEqual(workspace["limits"], expected_limits)
                self.assertTrue(workspace["capabilities"]["edit"])
                self.assertEqual(workspace["seatLimit"], 20 if plan == "team" else 1)
                period_end = workspace["subscription"]["periodEndsAt"]
                repeated = response_json(call_api("GET", "me", user_id))
                self.assertEqual(next(item for item in repeated["workspaces"] if item["id"] == workspace["id"])["subscription"]["periodEndsAt"], period_end)

        function_app.storage = function_app.Storage()
        with patch.dict(os.environ, {"AUTH_MODE": "production", "BILLING_MODE": "paddle"}):
            function_app.accounts.ensure_user(function_app.storage, {"userId": "local-demo-individual", "name": "Coach"})
            workspace = function_app.storage.get("workspaces", function_app.accounts.personal_id("local-demo-individual"))
            self.assertEqual(workspace["subscription"]["kind"], "free")

    def test_free_workspace_is_writable_and_enforces_free_caps(self):
        user = response_json(call_api("GET", "me", "free-coach"))
        workspace = user["workspaces"][0]
        self.assertEqual(workspace["subscription"]["status"], "free")
        self.assertEqual(workspace["subscription"]["kind"], "free")
        self.assertTrue(workspace["capabilities"]["edit"])
        self.assertEqual(workspace["prices"], {"month": 0, "year": 0})
        billing = response_json(call_api("GET", "workspace/billing", "free-coach"))
        self.assertEqual(billing["plans"], {"individual": {"month": 999, "year": 9990}, "team": {"month": 2999, "year": 29990}})

        with patch.dict(function_app.accounts.FREE_LIMITS, {"playbooks": 1}):
            self.assertEqual(call_api("POST", "playbooks", "free-coach", {"name": "First"}).status_code, 201)
            self.assertEqual(call_api("POST", "playbooks", "free-coach", {"name": "Over limit"}).status_code, 409)

    def test_archived_records_count_toward_limits_and_permanent_deletion_frees_capacity(self):
        with patch.dict(function_app.accounts.FREE_LIMITS, {"playbooks": 5}):
            books = [
                response_json(call_api("POST", "playbooks", "free-coach", {"name": f"Book {index}"}))
                for index in range(5)
            ]
            for book in books[3:]:
                archived = call_api("PATCH", f"playbooks/{book['id']}", "free-coach", {"recordStatus": "Archived"})
                self.assertEqual(archived.status_code, 200)

            self.assertEqual(call_api("POST", "playbooks", "free-coach", {"name": "Still full"}).status_code, 409)

            for book in books[3:]:
                self.assertEqual(call_api("DELETE", f"playbooks/{book['id']}", "free-coach").status_code, 204)
            usage = response_json(call_api("GET", "workspace", "free-coach"))["usage"]
            self.assertEqual(usage["playbooks"], 3)

            self.assertEqual(call_api("POST", "playbooks", "free-coach", {"name": "Replacement 1"}).status_code, 201)
            self.assertEqual(call_api("POST", "playbooks", "free-coach", {"name": "Replacement 2"}).status_code, 201)
            self.assertEqual(call_api("POST", "playbooks", "free-coach", {"name": "Over limit again"}).status_code, 409)

    def test_affiliate_recommendations_are_free_only_and_clicks_store_minimal_data(self):
        with patch.dict(os.environ, {"AFFILIATE_URL_HUDL": "https://partners.example/hudl"}):
            free_user = response_json(call_api("GET", "me", "free-coach"))
            free_workspace = free_user["workspaces"][0]
            self.assertEqual(free_workspace["subscription"]["kind"], "free")
            team = self.team_fixture()
            recommendations = response_json(call_api("GET", "affiliate/recommendations", "free-coach"))
            self.assertEqual(recommendations["items"][0]["href"], "/api/go/hudl")
            self.assertEqual(call_api("GET", "affiliate/recommendations", "local-coach", workspace_id=team["id"]).status_code, 403)

            redirect = call_api("GET", "go/hudl")
            self.assertEqual(redirect.status_code, 302)
            self.assertEqual(redirect.headers["Location"], "https://partners.example/hudl")
            click = function_app.storage.list("affiliateClicks")[0]
            self.assertEqual(set(click), {"id", "partnerId", "clickedAt", "entityType", "partitionKey"})
            self.assertEqual(click["partnerId"], "hudl")
            self.assertNotIn("userId", click)

    def test_switching_workspace_preserves_private_content(self):
        user = response_json(call_api("GET", "me", "local-coach"))
        individual = next(item for item in user["workspaces"] if item["kind"] == "individual")
        team = next(item for item in user["workspaces"] if item["kind"] == "team")
        book = response_json(call_api("POST", "playbooks", "local-coach", {"name": "Private"}))
        self.assertEqual(call_api("GET", f"playbooks/{book['id']}", "local-coach", workspace_id=team["id"]).status_code, 403)
        self.assertEqual(response_json(call_api("GET", "playbooks", "local-coach", workspace_id=team["id"]))["items"], [])
        self.assertEqual(call_api("GET", f"playbooks/{book['id']}", "local-coach", workspace_id=individual["id"]).status_code, 200)

    def test_unrelated_dev_identity_cannot_select_owner_team(self):
        user = response_json(call_api("GET", "me", "local-coach"))
        team = next(item for item in user["workspaces"] if item["kind"] == "team")
        self.assertEqual(call_api("GET", "playbooks", "coach-b", workspace_id=team["id"]).status_code, 403)

    def team_fixture(self, role="coach"):
        user = response_json(call_api("GET", "me", "local-coach"))
        team = next(item for item in user["workspaces"] if item["kind"] == "team")
        call_api("GET", "me", "coach-b")
        function_app.storage.save("memberships", {
            "id": function_app.accounts.membership_id("coach-b", team["id"]),
            "userId": "coach-b", "workspaceId": team["id"], "role": role,
        })
        return team

    def test_staff_members_include_coaching_titles(self):
        team = self.team_fixture()
        updated = call_api("PATCH", "me", "coach-b", {"coachingTitle": "Defensive Coordinator"})
        self.assertEqual(updated.status_code, 200)
        response = call_api("GET", "workspace/members", "local-coach", workspace_id=team["id"])
        self.assertEqual(response.status_code, 200)
        members = {member["userId"]: member for member in response_json(response)["items"]}
        self.assertEqual(members["coach-b"]["coachingTitle"], "Defensive Coordinator")
        self.assertEqual(members["local-coach"]["coachingTitle"], "")
        profile = function_app.storage.get("profiles", "coach-b")
        profile.pop("coachingTitle")
        function_app.storage.save("profiles", profile)
        response = call_api("GET", "workspace/members", "local-coach", workspace_id=team["id"])
        members = {member["userId"]: member for member in response_json(response)["items"]}
        self.assertEqual(members["coach-b"]["coachingTitle"], "")

    def test_coach_edits_and_deletes_shared_content(self):
        team = self.team_fixture()
        created = response_json(call_api("POST", "playbooks", "local-coach", {"name": "Team"}, team["id"]))
        path = f"playbooks/{created['id']}"
        self.assertEqual(call_api("PATCH", path, "coach-b", {"name": "Edited"}, team["id"]).status_code, 200)
        self.assertEqual(call_api("DELETE", path, "coach-b", workspace_id=team["id"]).status_code, 204)
        self.assertEqual(len(response_json(call_api("GET", "playbooks", "coach-b", workspace_id=team["id"]))["items"]), 0)

    def test_coach_removal_preserves_contributions(self):
        team = self.team_fixture()
        created = response_json(call_api("POST", "playbooks", "coach-b", {"name": "Contribution"}, team["id"]))
        self.assertEqual(call_api("DELETE", "workspace/members/coach-b", "local-coach", workspace_id=team["id"]).status_code, 204)
        self.assertEqual(call_api("GET", f"playbooks/{created['id']}", "coach-b", workspace_id=team["id"]).status_code, 403)
        self.assertEqual(call_api("GET", f"playbooks/{created['id']}", "local-coach", workspace_id=team["id"]).status_code, 200)
        self.assertEqual(call_api("GET", "playbooks", "coach-b").status_code, 200)

    def test_coach_content_permissions_cover_categories_and_children(self):
        team = self.team_fixture()
        for root, extra in (("playbooks", {}), ("game-plans", {}), ("schedule-events", {"eventType": "Practice", "eventDate": "2026-11-05"})):
            with self.subTest(root=root):
                created = call_api("POST", root, "coach-b", {"name": "Team content", **extra}, team["id"])
                self.assertEqual(created.status_code, 201)
                record = response_json(created)
                path = f"{root}/{record['id']}"
                self.assertEqual(call_api("GET", path, "coach-b", workspace_id=team["id"]).status_code, 200)
                self.assertEqual(call_api("PATCH", path, "coach-b", {"name": "Updated"}, team["id"]).status_code, 200)
                if root != "schedule-events":
                    children = "plays" if root == "playbooks" else "scout-plays"
                    child_path = f"{path}/{children}"
                    child = response_json(call_api("POST", child_path, "coach-b", {"name": "Child"}, team["id"]))
                    item_path = f"{child_path}/{child['id']}"
                    self.assertEqual(call_api("PATCH", item_path, "coach-b", {"name": "Updated child", "_etag": child["_etag"]}, team["id"]).status_code, 200)
                    if root == "playbooks":
                        slide_path = f"{item_path}/slides"
                        slide = response_json(call_api("POST", slide_path, "coach-b", {"title": "Adjustment"}, team["id"]))
                        self.assertEqual(call_api("DELETE", f"{slide_path}/{slide['id']}", "coach-b", workspace_id=team["id"]).status_code, 204)
                    self.assertEqual(call_api("DELETE", item_path, "coach-b", workspace_id=team["id"]).status_code, 204)
                self.assertEqual(call_api("DELETE", path, "coach-b", workspace_id=team["id"]).status_code, 204)

    def test_coach_cannot_manage_workspace_or_members(self):
        team = self.team_fixture()
        for method, path, payload in (
            ("PATCH", "workspace", {"name": "Forbidden"}),
            ("GET", "workspace/invitations", None),
            ("POST", "workspace/invitations", {"email": "new@example.com"}),
            ("DELETE", "workspace/invitations/missing", None),
            ("POST", "workspace/invitations/missing/resend", {}),
            ("DELETE", "workspace/members/local-coach", None),
            ("PATCH", "workspace/members/coach-b", {"role": "owner"}),
            ("POST", "workspace/ownership/transfer", {"userId": "local-coach"}),
        ):
            with self.subTest(method=method, path=path):
                self.assertEqual(call_api(method, path, "coach-b", payload, team["id"]).status_code, 403)
        self.assertEqual(call_api("GET", "workspace/members", "coach-b", workspace_id=team["id"]).status_code, 200)

    def test_admin_membership_and_invitation_roles_fail_closed(self):
        team = self.team_fixture("admin")
        for root in ("playbooks", "game-plans", "schedule-events", "search", "exports", "workspace/members"):
            self.assertEqual(call_api("GET", root, "coach-b", workspace_id=team["id"]).status_code, 403)
        self.assertEqual(call_api("POST", "workspace/invitations", "local-coach", {"email": "new@example.com", "role": "admin"}, team["id"]).status_code, 400)
        self.assertEqual(call_api("PATCH", "workspace/members/coach-b", "local-coach", {"role": "admin"}, team["id"]).status_code, 400)

    def test_summary_permissions_and_capabilities_share_policy(self):
        team = self.team_fixture()
        for user, role in (("local-coach", "owner"), ("coach-b", "coach")):
            result = response_json(call_api("GET", "workspace", user, workspace_id=team["id"]))
            expected = sorted(permission.value for permission in function_app.accounts.ROLE_PERMISSIONS[role])
            self.assertEqual(result["permissions"], expected)
            self.assertTrue(result["capabilities"]["delete"])
            self.assertEqual(result["capabilities"]["manageTeam"], role == "owner")
        workspace = function_app.storage.get("workspaces", team["id"])
        workspace["subscription"]["periodEndsAt"] = (function_app.accounts.timestamp() - timedelta(seconds=1)).isoformat()
        function_app.storage.save("workspaces", workspace)
        result = response_json(call_api("GET", "workspace", "coach-b", workspace_id=team["id"]))
        self.assertEqual(set(result["permissions"]), {permission.value for permission in function_app.accounts.READ_PERMISSIONS})
        self.assertFalse(result["capabilities"]["delete"])

    def test_workspace_and_provenance_cannot_be_forged(self):
        team = self.team_fixture()
        created = response_json(call_api("POST", "playbooks", "coach-b", {"name": "Shared", "workspaceId": "forged", "ownerId": "forged"}, team["id"]))
        self.assertEqual(created["workspaceId"], team["id"])
        self.assertEqual(created["ownerId"], "coach-b")
        updated = response_json(call_api("PATCH", f"playbooks/{created['id']}", "coach-b", {"workspaceId": "forged", "createdBy": "forged", "ownerId": "forged"}, team["id"]))
        self.assertEqual(updated["workspaceId"], team["id"])
        self.assertEqual(updated["createdBy"], "coach-b")

    def test_read_only_workspace_blocks_content_changes_but_not_exports(self):
        team = self.team_fixture()
        created = response_json(call_api("POST", "playbooks", "local-coach", {"name": "Team"}, team["id"]))
        workspace = function_app.storage.get("workspaces", team["id"])
        workspace["subscription"]["periodEndsAt"] = (function_app.accounts.timestamp() - timedelta(seconds=1)).isoformat()
        function_app.storage.save("workspaces", workspace)
        for method in ("PATCH", "DELETE"):
            self.assertEqual(call_api(method, f"playbooks/{created['id']}", "local-coach", {"name": "Blocked"}, team["id"]).status_code, 403)
        self.assertEqual(call_api("POST", "playbooks", "local-coach", {"name": "Blocked"}, team["id"]).status_code, 403)
        self.assertEqual(call_api("GET", f"playbooks/{created['id']}", "coach-b", workspace_id=team["id"]).status_code, 200)
        self.assertEqual(call_api("POST", "exports", "coach-b", {"playbookId": created["id"]}, team["id"]).status_code, 202)
        self.assertEqual(response_json(call_api("GET", "workspace", "local-coach", workspace_id=team["id"]))["subscription"]["status"], "expired")

    def test_last_quota_slot_is_shared_and_concurrency_safe(self):
        team = self.team_fixture()
        for index in range(99):
            function_app.storage.save("playbooks", {"id": f"quota-{index}", "workspaceId": team["id"], "ownerId": "local-coach", "name": "Book"})
        def create_book(user):
            return call_api("POST", "playbooks", user, {"name": "Last slot"}, team["id"]).status_code
        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(create_book, ["local-coach", "coach-b"]))
        self.assertEqual(sorted(results), [201, 409])
        self.assertEqual(call_api("POST", "playbooks", "local-coach", {"name": "Private allowance"}).status_code, 201)

    def test_caps_apply_to_both_collection_and_play_types(self):
        call_api("GET", "me", "local-coach")
        with patch.dict(function_app.accounts.FREE_LIMITS, {"gamePlans": 1, "plays": 1, "scoutPlays": 1}):
            book = response_json(call_api("POST", "playbooks", "local-coach", {"name": "Book"}))
            plan = response_json(call_api("POST", "game-plans", "local-coach", {"name": "Plan"}))
            self.assertEqual(call_api("POST", "game-plans", "local-coach", {"name": "Overflow"}).status_code, 409)
            for path in (f"playbooks/{book['id']}/plays", f"game-plans/{plan['id']}/scout-plays"):
                self.assertEqual(call_api("POST", path, "local-coach", {"name": "First"}).status_code, 201)
                self.assertEqual(call_api("POST", path, "local-coach", {"name": "Overflow"}).status_code, 409)

    def test_team_quotas_are_higher_and_enforced(self):
        team = self.team_fixture()
        self.assertEqual(team["limits"], {"playbooks": 100, "gamePlans": 200, "plays": 10000, "scoutPlays": 10000})
        individual = next(workspace for workspace in response_json(call_api("GET", "me", "local-coach"))["workspaces"] if workspace["kind"] == "individual")
        self.assertEqual(individual["limits"], {"playbooks": 5, "gamePlans": 15, "plays": 500, "scoutPlays": 500})

        with patch.dict(function_app.accounts.TEAM_LIMITS, {"gamePlans": 1, "plays": 1, "scoutPlays": 1}):
            plan = response_json(call_api("POST", "game-plans", "local-coach", {"name": "Game"}, team["id"]))
            self.assertEqual(call_api("POST", "game-plans", "local-coach", {"name": "Overflow"}, team["id"]).status_code, 409)
            book = response_json(call_api("POST", "playbooks", "local-coach", {"name": "Book"}, team["id"]))
            for path in (f"playbooks/{book['id']}/plays", f"game-plans/{plan['id']}/scout-plays"):
                self.assertEqual(call_api("POST", path, "local-coach", {"name": "First"}, team["id"]).status_code, 201)
                self.assertEqual(call_api("POST", path, "local-coach", {"name": "Overflow"}, team["id"]).status_code, 409)

    def test_collection_deletion_removes_descendants_and_frees_quota(self):
        book = response_json(call_api("POST", "playbooks", "local-coach", {"name": "Book"}))
        play = response_json(call_api("POST", f"playbooks/{book['id']}/plays", "local-coach", {"name": "Play"}))
        slide = response_json(call_api("POST", f"playbooks/{book['id']}/plays/{play['id']}/slides", "local-coach", {}))
        self.assertEqual(call_api("DELETE", f"playbooks/{book['id']}", "local-coach").status_code, 204)
        self.assertIsNone(function_app.storage.get("plays", play["id"]))
        self.assertIsNone(function_app.storage.get("slides", slide["id"]))

    def test_trial_starts_once_on_entry_and_expires(self):
        user = response_json(call_api("GET", "me", "trial-coach"))
        workspace = function_app.storage.get("workspaces", function_app.accounts.personal_id("trial-coach"))
        workspace["subscription"] = function_app.accounts.new_subscription("individual")
        function_app.storage.save("workspaces", workspace)
        self.assertIsNone(user["workspaces"][0]["subscription"]["trialStartedAt"])
        first = response_json(call_api("GET", "workspace", "trial-coach"))
        second = response_json(call_api("GET", "workspace", "trial-coach"))
        self.assertEqual(first["subscription"]["trialEndsAt"], second["subscription"]["trialEndsAt"])
        workspace = function_app.storage.get("workspaces", first["id"])
        workspace["subscription"]["trialEndsAt"] = (function_app.accounts.timestamp() - timedelta(seconds=1)).isoformat()
        self.assertEqual(call_api("POST", "playbooks", "trial-coach", {"name": "Blocked"}).status_code, 403)

    def test_owner_cannot_be_demoted_or_removed(self):
        team = self.team_fixture()
        for method in ("PATCH", "DELETE"):
            response = call_api(method, "workspace/members/local-coach", "local-coach", {"role": "coach"}, team["id"])
            self.assertEqual(response.status_code, 409)
            self.assertEqual(response_json(response)["error"]["code"], "OWNER_TRANSFER_REQUIRED")
            self.assertEqual(function_app.storage.get("memberships", function_app.accounts.membership_id("local-coach", team["id"]))["role"], "owner")
            owners = [member for member in function_app.storage.list("memberships") if member["workspaceId"] == team["id"] and member["role"] == "owner"]
            self.assertGreaterEqual(len(owners), 1)

    def test_owner_can_transfer_then_demote_themselves(self):
        team = self.team_fixture()
        response = call_api("POST", "workspace/ownership/transfer", "local-coach", {"userId": "coach-b"}, team["id"])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response_json(response), {"userId": "coach-b", "role": "owner"})
        self.assertEqual(function_app.storage.get("memberships", function_app.accounts.membership_id("local-coach", team["id"]))["role"], "owner")
        self.assertEqual(function_app.storage.get("memberships", function_app.accounts.membership_id("coach-b", team["id"]))["role"], "owner")

        response = call_api("PATCH", "workspace/members/local-coach", "local-coach", {"role": "coach"}, team["id"])
        self.assertEqual(response.status_code, 200)
        memberships = [member for member in function_app.storage.list("memberships") if member["workspaceId"] == team["id"]]
        self.assertEqual({member["userId"]: member["role"] for member in memberships}, {"local-coach": "coach", "coach-b": "owner"})

        response = call_api("PATCH", "workspace/members/coach-b", "coach-b", {"role": "coach"}, team["id"])
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response_json(response)["error"]["code"], "OWNER_TRANSFER_REQUIRED")

    def test_only_owner_can_transfer_to_an_existing_team_member(self):
        team = self.team_fixture()
        response = call_api("POST", "workspace/ownership/transfer", "coach-b", {"userId": "coach-b"}, team["id"])
        self.assertEqual(response.status_code, 403)
        response = call_api("POST", "workspace/ownership/transfer", "local-coach", {"userId": "outsider"}, team["id"])
        self.assertEqual(response.status_code, 404)

    def test_concurrent_owner_demotions_preserve_one_owner(self):
        team = self.team_fixture()
        self.assertEqual(call_api("POST", "workspace/ownership/transfer", "local-coach", {"userId": "coach-b"}, team["id"]).status_code, 200)
        def demote(user_id):
            return call_api("PATCH", f"workspace/members/{user_id}", user_id, {"role": "coach"}, team["id"]).status_code
        with ThreadPoolExecutor(max_workers=2) as executor:
            statuses = list(executor.map(demote, ("local-coach", "coach-b")))
        self.assertEqual(sorted(statuses), [200, 409])
        owners = [member for member in function_app.storage.list("memberships") if member["workspaceId"] == team["id"] and member["role"] == "owner"]
        self.assertEqual(len(owners), 1)

    def test_legacy_admin_invitation_cannot_create_membership(self):
        team = self.team_fixture()
        invite, token = self.invite_token(team["id"], "new@example.com")
        stored = function_app.storage.get("invitations", invite["id"])
        stored["role"] = "admin"
        function_app.storage.save("invitations", stored)
        result = call_api("POST", "invitations/accept", "new@example.com", {"token": token})
        self.assertEqual(result.status_code, 400)
        self.assertIsNone(function_app.storage.get("memberships", function_app.accounts.membership_id("new@example.com", team["id"])))

    def test_local_fixture_is_not_reseeded_after_expiry(self):
        first = response_json(call_api("GET", "me", "local-coach"))
        workspace = function_app.storage.get("workspaces", first["workspaces"][0]["id"])
        workspace["subscription"]["periodEndsAt"] = "2020-01-01T00:00:00+00:00"
        call_api("GET", "me", "local-coach")
        self.assertEqual(workspace["subscription"]["periodEndsAt"], "2020-01-01T00:00:00+00:00")

    def test_mock_mode_rejects_remote_storage_and_production(self):
        with self.assertRaises(RuntimeError):
            function_app.accounts.validate_environment("https://example.documents.azure.com")
        with patch.dict(os.environ, {"APP_ENVIRONMENT": "production"}):
            with self.assertRaises(RuntimeError):
                function_app.accounts.validate_environment()

    def test_profile_cannot_change_email_role_or_subscription(self):
        call_api("GET", "me", "local-coach")
        result = response_json(call_api("PATCH", "me", "local-coach", {"name": "New name", "email": "forged@example.com", "role": "admin", "subscription": {"status": "active"}}))
        self.assertEqual(result["name"], "New name")
        self.assertNotEqual(result["email"], "forged@example.com")
        self.assertNotIn("role", result)
        self.assertNotIn("subscription", result)

    def invite_token(self, team_id, email):
        created = response_json(call_api("POST", "workspace/invitations", "local-coach", {"email": email}, team_id))
        invitation = response_json(call_api("GET", "workspace/invitations", "local-coach", workspace_id=team_id))["items"][-1]
        token = parse_qs(urlparse(invitation["capturedUrl"]).fragment)["invite"][0]
        return created, token

    def test_invitation_reserves_a_seat_and_acceptance_keeps_individual(self):
        team = self.team_fixture()
        identity = response_json(call_api("GET", "me", "coach+invite@example.com"))
        private_id = identity["workspaces"][0]["id"]
        invite, token = self.invite_token(team["id"], "coach+invite@example.com")
        self.assertEqual(response_json(call_api("GET", "workspace", "local-coach", workspace_id=team["id"]))["seatsUsed"], 3)
        self.assertEqual(call_api("POST", "invitations/accept", "wrong@example.com", {"token": token}).status_code, 403)
        self.assertEqual(call_api("POST", "invitations/accept", "coach+invite@example.com", {"token": token}).status_code, 200)
        workspaces = response_json(call_api("GET", "me", "coach+invite@example.com"))["workspaces"]
        self.assertEqual(len(workspaces), 2)
        self.assertIn(private_id, [item["id"] for item in workspaces])
        self.assertEqual(call_api("POST", "invitations/accept", "coach+invite@example.com", {"token": token}).status_code, 400)
        self.assertNotIn("tokenHash", invite)
        self.assertEqual(function_app.storage.list("outbox"), [])

    def test_revocation_and_expiry_release_reserved_seats(self):
        team = self.team_fixture()
        invite, token = self.invite_token(team["id"], "coach@example.com")
        self.assertEqual(call_api("DELETE", f"workspace/invitations/{invite['id']}", "local-coach", workspace_id=team["id"]).status_code, 204)
        self.assertEqual(call_api("POST", "invitations/accept", "coach@example.com", {"token": token}).status_code, 400)
        expired, token = self.invite_token(team["id"], "expired@example.com")
        stored = function_app.storage.get("invitations", expired["id"])
        stored["expiresAt"] = (function_app.accounts.timestamp() - timedelta(seconds=1)).isoformat()
        self.assertEqual(call_api("POST", "invitations/accept", "expired@example.com", {"token": token}).status_code, 409)
        self.assertEqual(response_json(call_api("GET", "workspace", "local-coach", workspace_id=team["id"]))["seatsUsed"], 2)

    def test_resend_invalidates_old_link_and_does_not_add_seat(self):
        team = self.team_fixture()
        invite, token = self.invite_token(team["id"], "coach@example.com")
        path = f"workspace/invitations/{invite['id']}/resend"
        self.assertEqual(call_api("POST", path, "local-coach", {}, team["id"]).status_code, 429)
        function_app.storage.get("invitations", invite["id"])["lastSentAt"] = (function_app.accounts.timestamp() - timedelta(minutes=2)).isoformat()
        self.assertEqual(call_api("POST", path, "local-coach", {}, team["id"]).status_code, 200)
        self.assertEqual(call_api("POST", "invitations/accept", "coach@example.com", {"token": token}).status_code, 400)
        self.assertEqual(len(function_app.storage.list("outbox")), 1)
        self.assertEqual(response_json(call_api("GET", "workspace", "local-coach", workspace_id=team["id"]))["seatsUsed"], 3)

    def test_last_invitation_seat_is_concurrency_safe(self):
        team = self.team_fixture()
        for index in range(17):
            self.invite_token(team["id"], f"coach{index}@example.com")
        def invite(email):
            return call_api("POST", "workspace/invitations", "local-coach", {"email": email}, team["id"]).status_code
        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(invite, ["last1@example.com", "last2@example.com"]))
        self.assertEqual(sorted(results), [201, 409])
        workspace = response_json(call_api("GET", "workspace", "local-coach", workspace_id=team["id"]))
        self.assertEqual(workspace["seatLimit"], 20)
        self.assertEqual(workspace["seatsUsed"], 20)

    def test_coaches_cannot_invite_or_view_captured_tokens(self):
        team = self.team_fixture()
        self.assertEqual(call_api("POST", "workspace/invitations", "coach-b", {"email": "coach@example.com"}, team["id"]).status_code, 403)
        self.assertEqual(call_api("GET", "workspace/invitations", "coach-b", workspace_id=team["id"]).status_code, 403)

    def test_owner_can_retrieve_pending_invite_link_in_manual_mode(self):
        from cryptography.fernet import Fernet

        team = self.team_fixture()
        workspace = function_app.storage.get("workspaces", team["id"])
        workspace["alphaEnabled"] = True
        workspace["subscription"]["source"] = "alpha"
        function_app.storage.save("workspaces", workspace)
        settings = {
            "AUTH_MODE": "entra", "APP_ENVIRONMENT": "production", "BILLING_MODE": "paddle",
            "APP_PUBLIC_URL": "https://blitzboard.example", "EMAIL_OUTBOX_KEY": Fernet.generate_key().decode(),
        }
        with patch.dict(os.environ, settings):
            created_response = call_api("POST", "workspace/invitations", "local-coach",
                                        {"email": "manual-coach@example.com"}, team["id"])
            self.assertEqual(created_response.status_code, 201, response_json(created_response))
            created = response_json(created_response)
            created_token_hash = function_app.storage.get("invitations", created["id"])["tokenHash"]
            listed = response_json(call_api("GET", "workspace/invitations", "local-coach", workspace_id=team["id"]))
            link = call_api("GET", f"workspace/invitations/{created['id']}/link", "local-coach", workspace_id=team["id"])
            denied = call_api("GET", f"workspace/invitations/{created['id']}/link", "coach-b", workspace_id=team["id"])
            stored = function_app.storage.get("invitations", created["id"])
            stored["expiresAt"] = (function_app.accounts.timestamp() - timedelta(seconds=1)).isoformat()
            function_app.storage.save("invitations", stored)
            expired = call_api("GET", f"workspace/invitations/{created['id']}/link", "local-coach", workspace_id=team["id"])
            revoked = call_api("DELETE", f"workspace/invitations/{created['id']}", "local-coach", workspace_id=team["id"])
            revoked_link = call_api("GET", f"workspace/invitations/{created['id']}/link", "local-coach", workspace_id=team["id"])

        self.assertEqual(listed["deliveryMode"], "manual")
        self.assertNotIn("capturedUrl", listed["items"][0])
        self.assertEqual(link.status_code, 200)
        url = response_json(link)["url"]
        token = parse_qs(urlparse(url).fragment)["invite"][0]
        self.assertTrue(url.startswith("https://blitzboard.example/#invite="))
        self.assertEqual(function_app.accounts.hashlib.sha256(token.encode()).hexdigest(),
                         created_token_hash)
        self.assertEqual(denied.status_code, 403)
        self.assertEqual(expired.status_code, 409)
        self.assertEqual(revoked.status_code, 204)
        self.assertEqual(revoked_link.status_code, 409)

    def test_outbox_does_not_store_plaintext_token(self):
        team = self.team_fixture()
        invite, token = self.invite_token(team["id"], "coach@example.com")
        self.assertNotIn(token, json.dumps(function_app.storage.memory))
        self.assertEqual(function_app.storage.get("invitations", invite["id"])["tokenHash"], function_app.accounts.hashlib.sha256(token.encode()).hexdigest())

    def test_retention_blocks_content_after_eighteen_months(self):
        user = response_json(call_api("GET", "me", "local-coach"))
        workspace = function_app.storage.get("workspaces", user["workspaces"][0]["id"])
        workspace["subscription"].update({"kind": "individual", "status": "active", "periodEndsAt": "2020-01-31T00:00:00+00:00"})
        function_app.storage.save("workspaces", workspace)
        self.assertEqual(call_api("GET", "playbooks", "local-coach").status_code, 410)
        self.assertEqual(call_api("GET", "workspace", "local-coach").status_code, 200)
        self.assertEqual(response_json(call_api("GET", "workspace", "local-coach"))["deletionDueAt"], "2021-07-31T00:00:00+00:00")

    def test_expired_retention_does_not_block_other_workspace(self):
        user = response_json(call_api("GET", "me", "local-coach"))
        individual = next(item for item in user["workspaces"] if item["kind"] == "individual")
        team = next(item for item in user["workspaces"] if item["kind"] == "team")
        workspace = function_app.storage.get("workspaces", individual["id"])
        workspace["subscription"].update({"kind": "individual", "status": "active", "periodEndsAt": "2020-01-01T00:00:00+00:00"})
        function_app.storage.save("workspaces", workspace)
        self.assertEqual(call_api("GET", "playbooks", "local-coach", workspace_id=team["id"]).status_code, 200)

    def test_invalid_json_shapes_are_rejected(self):
        self.assertEqual(call_api("POST", "playbooks", "local-coach", ["not", "an", "object"]).status_code, 400)

    def test_preferences_use_supported_field_standards(self):
        result = call_api("PATCH", "me/preferences", "local-coach", {"theme": "printerFriendly", "fieldOrientation": "NCAA", "timezone": "America/New_York"})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(response_json(result)["fieldOrientation"], "NCAA")
        self.assertEqual(call_api("PATCH", "me/preferences", "local-coach", {"fieldOrientation": "vertical"}).status_code, 400)

    def test_only_owner_can_start_billing_actions(self):
        team = self.team_fixture()
        self.assertEqual(call_api("POST", "workspace/billing/checkout", "coach-b", {}, team["id"]).status_code, 403)
        self.assertEqual(call_api("POST", "workspace/billing/checkout", "local-coach", {}, team["id"]).status_code, 503)

    def test_storage_updates_use_etags_and_report_conflicts(self):
        store = function_app.Storage()
        store.container = Mock()
        changed = function_app.HttpResponseError("Changed")
        changed.status_code = 412
        store.container.replace_item.side_effect = changed
        with self.assertRaises(function_app.accounts.AccountError) as error:
            store.save("profiles", {"id": "coach", "_etag": "previous-version"})
        self.assertEqual(error.exception.status, 409)
        self.assertEqual(store.container.replace_item.call_args.kwargs["etag"], "previous-version")
        self.assertEqual(store.container.replace_item.call_args.kwargs["match_condition"], function_app.MatchConditions.IfNotModified)
        store.container.replace_item.assert_called_once()
        store.container.create_item.assert_not_called()

    def test_storage_uses_managed_identity_without_provisioning_database_or_container(self):
        endpoint = "https://example.documents.azure.com:443/"
        with patch.object(function_app, "COSMOS_ENDPOINT", endpoint), \
                patch.object(function_app, "COSMOS_KEY", None), \
                patch.object(function_app, "DefaultAzureCredential") as credential_factory, \
                patch.object(function_app, "CosmosClient") as cosmos_client:
            store = function_app.Storage()

        cosmos_client.assert_called_once_with(
            endpoint,
            credential=credential_factory.return_value,
            enable_endpoint_discovery=False,
        )
        client = cosmos_client.return_value
        client.get_database_client.assert_called_once_with(function_app.COSMOS_DATABASE)
        database = client.get_database_client.return_value
        database.get_container_client.assert_called_once_with(function_app.COSMOS_CONTAINER)
        client.create_database_if_not_exists.assert_not_called()
        database.create_container_if_not_exists.assert_not_called()
        self.assertIs(store.container, database.get_container_client.return_value)

    def test_storage_keeps_key_based_emulator_provisioning(self):
        endpoint = "https://localhost:8081/"
        key = "emulator-key"
        with patch.object(function_app, "COSMOS_ENDPOINT", endpoint), \
                patch.object(function_app, "COSMOS_KEY", key), \
                patch.object(function_app, "CosmosClient") as cosmos_client:
            store = function_app.Storage()

        cosmos_client.assert_called_once_with(
            endpoint,
            key,
            connection_verify=False,
            enable_endpoint_discovery=False,
        )
        cosmos_client.return_value.create_database_if_not_exists.assert_called_once_with(
            id=function_app.COSMOS_DATABASE,
        )
        database = cosmos_client.return_value.create_database_if_not_exists.return_value
        database.create_container_if_not_exists.assert_called_once_with(
            id=function_app.COSMOS_CONTAINER,
            partition_key={"paths": ["/partitionKey"], "kind": "Hash"},
        )
        self.assertIs(store.container, database.create_container_if_not_exists.return_value)

    def test_client_cannot_supply_storage_etags_on_creation(self):
        result = response_json(call_api("POST", "playbooks", "local-coach", {"name": "Book", "_etag": "forged"}))
        self.assertNotIn("_etag", result)

    def test_play_updates_require_the_loaded_etag(self):
        for collection, children in (("playbooks", "plays"), ("game-plans", "scout-plays")):
            parent = response_json(call_api("POST", collection, "local-coach", {"name": "Collection"}))
            path = f"{collection}/{parent['id']}/{children}"
            original = response_json(call_api("POST", path, "local-coach", {"name": "Original"}))
            item_path = f"{path}/{original['id']}"
            self.assertTrue(original.get("_etag"))
            for invalid in (None, "", "*", 123, {}):
                missing = call_api("PATCH", item_path, "local-coach", {"name": "Missing token", "_etag": invalid})
                self.assertEqual(missing.status_code, 428)
            updated = call_api("PATCH", item_path, "local-coach", {"name": "First save", "_etag": original["_etag"]})
            self.assertEqual(updated.status_code, 200)
            latest = response_json(updated)
            self.assertNotEqual(latest["_etag"], original["_etag"])
            stale = call_api("PATCH", item_path, "local-coach", {"name": "Stale save", "_etag": original["_etag"]})
            self.assertEqual(stale.status_code, 412)
            self.assertEqual(response_json(stale)["error"]["code"], "RECORD_CHANGED")
            self.assertEqual(response_json(call_api("GET", item_path, "local-coach"))["name"], "First save")
            self.assertEqual(call_api("PATCH", item_path, "local-coach", {"name": "Second save", "_etag": latest["_etag"]}).status_code, 200)

    def test_play_cosmos_write_checks_the_original_etag_atomically(self):
        for entity in ("plays", "scoutPlays"):
            store = function_app.Storage()
            store.container = Mock()
            store.container.read_item.return_value = {"id": "play", "_etag": '"loaded-version"', "name": "Original"}
            changed = function_app.HttpResponseError("Changed after read")
            changed.status_code = 412
            store.container.replace_item.side_effect = changed
            with patch.object(function_app, "storage", store):
                with self.assertRaises(function_app.accounts.AccountError) as error:
                    function_app.update_record(entity, "play", {"name": "My edit", "_etag": '"loaded-version"'})
            self.assertEqual(error.exception.status, 412)
            self.assertEqual(error.exception.code, "RECORD_CHANGED")
            self.assertEqual(store.container.replace_item.call_args.kwargs["etag"], '"loaded-version"')
            self.assertEqual(store.container.replace_item.call_args.kwargs["match_condition"], function_app.MatchConditions.IfNotModified)

    def test_concurrent_play_saves_accept_only_one_loaded_version(self):
        for collection, children in (("playbooks", "plays"), ("game-plans", "scout-plays")):
            parent = response_json(call_api("POST", collection, "local-coach", {"name": "Collection"}))
            path = f"{collection}/{parent['id']}/{children}"
            original = response_json(call_api("POST", path, "local-coach", {"name": "Original"}))
            item_path = f"{path}/{original['id']}"
            with ThreadPoolExecutor(max_workers=2) as pool:
                results = list(pool.map(lambda name: call_api("PATCH", item_path, "local-coach", {"name": name, "_etag": original["_etag"]}), ("First editor", "Second editor")))
            self.assertEqual(sorted(result.status_code for result in results), [200, 412])

    def test_storage_refreshes_etag_after_writes(self):
        store = function_app.Storage()
        store.container = Mock()
        store.container.create_item.return_value = {"id": "coach", "_etag": "new-version"}
        record = {"id": "coach", "name": "Coach"}
        store.save("profiles", record)
        self.assertEqual(record["_etag"], "new-version")

    def test_failed_profile_validation_does_not_change_stored_data(self):
        before = response_json(call_api("GET", "me", "local-coach"))
        result = call_api("PATCH", "me", "local-coach", {"name": "Should not persist", "coachingTitle": []})
        self.assertEqual(result.status_code, 400)
        after = response_json(call_api("GET", "me", "local-coach"))
        self.assertEqual(before["name"], after["name"])

    def test_permissions_are_rechecked_after_acquiring_workspace_lock(self):
        team = self.team_fixture()
        book = response_json(call_api("POST", "playbooks", "local-coach", {"name": "Shared"}, team["id"]))
        workspace = function_app.storage.get("workspaces", team["id"])
        with patch.object(function_app.accounts, "select_workspace", side_effect=[(workspace, "owner"), (workspace, "coach")]):
            self.assertEqual(call_api("PATCH", "workspace", "coach-b", {"name": "Forbidden"}, team["id"]).status_code, 403)
        self.assertIsNotNone(function_app.storage.get("playbooks", book["id"]))

    def test_health_is_public(self):
        response = call_api("GET", "health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response_json(response)["service"], "blitzboard-studio-api")

    def test_protected_route_requires_authentication(self):
        response = call_api("GET", "playbooks")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response_json(response)["error"]["code"], "UNAUTHORIZED")

    def test_records_are_owned_and_isolated(self):
        create_response = call_api(
            "POST",
            "playbooks",
            "coach-a",
            {"name": "Defense", "ownerId": "coach-b"},
        )
        created = response_json(create_response)

        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(created["ownerId"], "coach-a")
        self.assertEqual(response_json(call_api("GET", "playbooks", "coach-a"))["items"][0]["ownerName"], "coach-a")
        self.assertEqual(response_json(call_api("GET", "playbooks", "coach-b"))["items"], [])
        self.assertEqual(call_api("GET", f"playbooks/{created['id']}", "coach-b").status_code, 403)

    def test_play_and_scout_play_lists_include_owner_name(self):
        call_api("GET", "me", "local-coach")
        playbook = response_json(call_api("POST", "playbooks", "local-coach", {"name": "Book"}))
        game_plan = response_json(call_api("POST", "game-plans", "local-coach", {"name": "Plan"}))
        play_path = f"playbooks/{playbook['id']}/plays"
        scout_play_path = f"game-plans/{game_plan['id']}/scout-plays"
        call_api("POST", play_path, "local-coach", {"name": "Play"})
        call_api("POST", scout_play_path, "local-coach", {"name": "Scout play"})

        self.assertEqual(response_json(call_api("GET", play_path, "local-coach"))["items"][0]["ownerName"], "Local Coach")
        self.assertEqual(response_json(call_api("GET", scout_play_path, "local-coach"))["items"][0]["ownerName"], "Local Coach")

    def test_plays_and_scout_plays_are_paged_and_reorderable(self):
        playbook = response_json(call_api("POST", "playbooks", "coach-a", {"name": "Book"}))
        game_plan = response_json(call_api("POST", "game-plans", "coach-a", {"name": "Plan"}))
        for path in (f"playbooks/{playbook['id']}/plays", f"game-plans/{game_plan['id']}/scout-plays"):
            ids = [response_json(call_api("POST", path, "coach-a", {"name": name, "page": 99}))["id"] for name in ("A", "B", "C")]
            pages = lambda: [(item["name"], item["page"]) for item in response_json(call_api("GET", path, "coach-a"))["items"]]
            self.assertEqual(pages(), [("A", 1), ("B", 2), ("C", 3)])

            self.assertEqual(call_api("POST", f"{path}/reorder", "coach-a", {"ids": ids[:2]}).status_code, 400)
            self.assertEqual(call_api("POST", f"{path}/reorder", "coach-a", {"ids": [ids[2], ids[0], ids[1]]}).status_code, 200)
            self.assertEqual(pages(), [("C", 1), ("A", 2), ("B", 3)])

            current = response_json(call_api("GET", f"{path}/{ids[1]}", "coach-a"))
            self.assertEqual(call_api("PATCH", f"{path}/{ids[1]}", "coach-a", {"page": 1, "_etag": current["_etag"]}).status_code, 200)
            call_api("DELETE", f"{path}/{ids[2]}", "coach-a")
            self.assertEqual(pages(), [("A", 1), ("B", 2)])

    def test_playbook_groupings_share_play_order_without_becoming_plays(self):
        playbook = response_json(call_api("POST", "playbooks", "coach-a", {"name": "Book"}))
        base_path = f"playbooks/{playbook['id']}"
        first_play = response_json(call_api("POST", f"{base_path}/plays", "coach-a", {"name": "First"}))
        grouping_response = call_api("POST", f"{base_path}/groupings", "coach-a", {"name": "Openers", "description": "Start with these plays"})
        grouping = response_json(grouping_response)
        second_play = response_json(call_api("POST", f"{base_path}/plays", "coach-a", {"name": "Second"}))

        self.assertEqual(grouping_response.status_code, 201)
        rows = response_json(call_api("GET", f"{base_path}/rows", "coach-a"))["items"]
        self.assertEqual([(row["name"], row["page"]) for row in rows], [("First", 1), ("Openers", 2), ("Second", 3)])
        self.assertEqual(rows[1]["rowType"], "grouping")
        self.assertEqual(rows[1]["description"], "Start with these plays")
        self.assertEqual([row["name"] for row in response_json(call_api("GET", f"{base_path}/plays", "coach-a"))["items"]], ["First", "Second"])

        reorder = call_api("POST", f"{base_path}/plays/reorder", "coach-a", {"ids": [second_play["id"], grouping["id"], first_play["id"]]})
        self.assertEqual(reorder.status_code, 200)
        renamed = response_json(call_api("PATCH", f"{base_path}/groupings/{grouping['id']}", "coach-a", {"name": "Finishers", "description": "Close out the game"}))
        self.assertEqual(renamed["name"], "Finishers")
        self.assertEqual(renamed["description"], "Close out the game")
        self.assertEqual([(row["name"], row["page"]) for row in response_json(call_api("GET", f"{base_path}/rows", "coach-a"))["items"]], [("Second", 1), ("Finishers", 2), ("First", 3)])

        self.assertEqual(call_api("DELETE", f"{base_path}/groupings/{grouping['id']}", "coach-a").status_code, 204)
        self.assertEqual([(row["name"], row["page"]) for row in response_json(call_api("GET", f"{base_path}/rows", "coach-a"))["items"]], [("Second", 1), ("First", 2)])

    def test_slides_are_scoped_to_their_play(self):
        playbook = response_json(call_api("POST", "playbooks", "coach-a", {"name": "Defense"}))
        first_play = response_json(
            call_api("POST", f"playbooks/{playbook['id']}/plays", "coach-a", {"name": "Cover 2"})
        )
        second_play = response_json(
            call_api("POST", f"playbooks/{playbook['id']}/plays", "coach-a", {"name": "Cover 3"})
        )

        create_response = call_api(
            "POST",
            f"playbooks/{playbook['id']}/plays/{first_play['id']}/slides",
            "coach-a",
            {"title": "Strong adjustment"},
        )
        slide = response_json(create_response)

        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(slide["parentId"], first_play["id"])
        self.assertEqual(
            response_json(call_api("GET", f"playbooks/{playbook['id']}/plays/{first_play['id']}/slides", "coach-a"))["items"],
            [slide],
        )
        self.assertEqual(
            response_json(call_api("GET", f"playbooks/{playbook['id']}/plays/{second_play['id']}/slides", "coach-a"))["items"],
            [],
        )
        self.assertEqual(
            call_api(
                "GET",
                f"playbooks/{playbook['id']}/plays/{second_play['id']}/slides/{slide['id']}",
                "coach-a",
            ).status_code,
            404,
        )
        self.assertEqual(call_api("GET", f"playbooks/{playbook['id']}/slides", "coach-a").status_code, 404)

    def test_play_cannot_have_more_than_three_adjustment_slides(self):
        playbook = response_json(call_api("POST", "playbooks", "coach-a", {"name": "Defense"}))
        play = response_json(
            call_api("POST", f"playbooks/{playbook['id']}/plays", "coach-a", {"name": "Cover 2"})
        )
        slides_path = f"playbooks/{playbook['id']}/plays/{play['id']}/slides"

        for index in range(3):
            response = call_api("POST", slides_path, "coach-a", {"title": f"Adjustment {index + 1}"})
            self.assertEqual(response.status_code, 201)

        limited_response = call_api("POST", slides_path, "coach-a", {"title": "Adjustment 4"})

        self.assertEqual(limited_response.status_code, 409)
        self.assertEqual(response_json(limited_response)["error"]["code"], "SLIDE_LIMIT_REACHED")
        self.assertEqual(len(response_json(call_api("GET", slides_path, "coach-a"))["items"]), 3)


if __name__ == "__main__":
    unittest.main()