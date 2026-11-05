import argparse
import json
import os
from pathlib import Path


def load_local_settings():
    settings_path = Path(__file__).with_name("local.settings.json")
    settings = json.loads(settings_path.read_text(encoding="utf-8"))
    for key, value in settings.get("Values", {}).items():
        os.environ.setdefault(key, str(value))
    if os.getenv("AUTH_MODE", "").lower() != "entra" or os.getenv("APP_ENVIRONMENT") != "local":
        raise RuntimeError("Alpha owner bootstrap is restricted to local Entra testing")
    if os.getenv("WEBSITE_SITE_NAME") or os.getenv("WEBSITE_INSTANCE_ID"):
        raise RuntimeError("Do not run the local alpha bootstrap in Azure")


def main():
    parser = argparse.ArgumentParser(description="Bootstrap one verified Entra profile as a local alpha Team Owner.")
    parser.add_argument("email", help="Exact verified email of an account that has signed in locally")
    parser.add_argument("--workspace-name", default="Blitzboard Alpha")
    args = parser.parse_args()
    load_local_settings()

    import accounts
    import function_app

    matches = [profile for profile in function_app.storage.list("profiles")
               if profile.get("email", "").casefold() == args.email.strip().casefold()
               and profile.get("emailVerified") is True]
    if len(matches) != 1:
        raise RuntimeError("Expected exactly one locally signed-in profile with that verified email")
    workspace = accounts.bootstrap_alpha_owner(function_app.storage, matches[0]["id"], args.workspace_name)
    print(json.dumps({"workspaceId": workspace["id"], "workspaceName": workspace["name"], "role": "owner", "alphaEnabled": True}))


if __name__ == "__main__":
    main()