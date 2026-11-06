# Deployment Runbook

## Scope

GitHub Actions provides CI and manual code deployment. It deploys to already-provisioned Azure resources; it does not create resources or change DNS. Provisioning remains a separate reviewed step. Do not use production until dev validation and the recovery drills in [recovery-runbook.md](recovery-runbook.md) pass.

## Workflows

- `CI` runs on pull requests, pushes to `main`, and manual dispatch. It lints/builds/tests the frontend and runs API tests.
- `Deploy` is manually dispatched from the Actions tab. Choose `dev` for the first deployment. Choose `production` only after dev acceptance and after configuring required reviewers on the GitHub `production` environment.
- Leave `artifact_run_id` blank to build, test, deploy, and retain a release artifact. For rollback, dispatch `Deploy` for the same environment and enter the run ID of a previous successful Deploy run. The workflow rejects artifacts built for the other environment. Artifacts are retained for 90 days.

## GitHub environment configuration

Create GitHub environments named `dev` and `production`. Configure each environment independently; do not reuse dev URLs, Entra registrations, or tokens in production.

Add these environment variables:

- `API_BASE_URL`: HTTPS origin of that environment's Function App, without `/api` or a trailing path.
- `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`: OIDC application identity and subscription for deployment.
- `AZURE_RESOURCE_GROUP`, `AZURE_FUNCTION_APP`: target Function App coordinates.
- `ENTRA_SPA_CLIENT_ID`, `ENTRA_TENANT_ID`, `ENTRA_AUTHORITY`, `ENTRA_API_SCOPE`: public SPA authentication configuration.

Add this environment secret:

- `SWA_DEPLOYMENT_TOKEN`: deployment token for that environment's Static Web App.

Configure a federated credential for each GitHub environment with subject `repo:<owner>/<repo>:environment:<environment-name>`. Grant the deployment identity only the required scoped roles: Website Contributor on the Function App and Storage Blob Data Contributor on its Flex deployment storage. Use the Static Web App's environment-specific deployment token for the frontend; do not create a long-lived Azure client secret.

On the `production` environment, require a reviewer before jobs can access its variables and secrets. Keep deployment concurrency enabled so two releases to the same environment cannot overlap.

## Azure app settings

Provision the Function App with the environment-specific settings before deploying code. At minimum:

- `AUTH_MODE=entra` and `APP_ENVIRONMENT=production`.
- The Entra API validation settings: tenant ID, SPA client ID, API audience, scope, authority, and issuer.
- `COSMOS_ENDPOINT`, `COSMOS_DATABASE=blitzboard-studio`, and `COSMOS_CONTAINER=playboard`; omit `COSMOS_KEY` and grant the Function App identity Cosmos DB data-plane access.
- `CORS_ALLOWED_ORIGINS` as a comma-separated exact list containing that environment's Static Web App origin and any configured custom frontend origin. Configure the Function App platform CORS list to the same origins.
- `APP_PUBLIC_URL` for invitation links and a unique `EMAIL_OUTBOX_KEY` per environment.
- Identity-based Functions host storage and Application Insights settings.

The API package excludes `local.settings.json`, virtual environments, and bytecode. The frontend build hardcodes Entra mode and adds only the configured API origin to its CSP. Never provide `VITE_DEV_AUTH_SECRET` or any private credential to the frontend build.

## First cloud alpha Owner bootstrap

Entra sign-in creates a Blitzboard profile, but the invite-only alpha intentionally does not create a workspace or grant Owner access. The first operator must bootstrap one alpha-enabled Team Owner before CRUD smoke tests or invitations can be used.

Do not run `api/bootstrap_alpha_owner.py` against Azure; it is restricted to local/test use. Do not add a public bootstrap endpoint or place a Cosmos key in the script. Use this one-time operator procedure instead:

1. Sign in to the dev app once with the intended first Owner's External ID account. The API must successfully validate the token so it creates the verified profile.
2. In Azure Cloud Shell, ensure the signed-in operator is in the subscription's Default Directory, then select the dev subscription:

	```bash
	az account set --subscription <dev-subscription-id>
	```

3. Temporarily grant the operator's Default Directory identity **Cosmos DB Built-in Data Contributor** on only the dev `playboard` container. The operator needs Azure permission to create Cosmos native role assignments. The following command records the role-assignment ID for later removal:

	```bash
	operator_principal_id=$(az ad signed-in-user show --query id --output tsv)
	operator_role_assignment_id=$(az cosmosdb sql role assignment create \
	  --resource-group rg-blitzboard-dev-eastus2 \
	  --account-name blitzboard-dev-eastus2-cosmos \
	  --scope "/dbs/blitzboard-studio/colls/playboard" \
	  --principal-id "$operator_principal_id" \
	  --role-definition-id 00000000-0000-0000-0000-000000000002 \
	  --query name --output tsv)
	```

4. Clone the `dev` branch into Cloud Shell and install the API requirements in a temporary virtual environment:

	```bash
	git clone --branch dev --single-branch https://github.com/ssbreon/Blitzboard.git
	cd Blitzboard/api
	python -m venv .venv
	source .venv/bin/activate
	python -m pip install -r requirements.txt
	```

5. Run the operator command, confirming the Cosmos account and subscription. Omit `--owner-email` to enter the verified owner's email interactively instead of putting it in shell history:

	```bash
	python bootstrap_alpha_owner_cloud.py \
	  --confirm-cosmos-account blitzboard-dev-eastus2-cosmos \
	  --subscription-id <dev-subscription-id>
	```

	The command requires the active Azure CLI subscription to match, refuses Cosmos key settings and Function App runtimes, verifies there is exactly one matching verified External ID profile, and refuses to create a second alpha workspace. It uses Azure CLI authentication through `AzureCliCredential`; no Cosmos key or public API endpoint is involved.
6. Sign out and back in to the dev app. Confirm the user sees the `Blitzboard Alpha` Team with the Owner role, then run synthetic CRUD/export smoke tests.
7. Remove the operator's temporary Cosmos data-plane role assignment:

	```bash
	az cosmosdb sql role assignment delete \
	  --resource-group rg-blitzboard-dev-eastus2 \
	  --account-name blitzboard-dev-eastus2-cosmos \
	  --role-assignment-id "$operator_role_assignment_id"
	```

	Keep the Function App's own Cosmos role assignment in place. Record the bootstrap result and operator in the deployment notes.

## First dev deployment

1. Provision and verify the dev Static Web App, Linux Flex Consumption Function App, Cosmos database/container, Function runtime/deployment storage, Application Insights, Entra configuration, and managed-identity role assignments.
2. Confirm continuous backup support and retention for the exact Cosmos account configuration. The API's Cosmos restore and application rollback drills must pass before production data is stored.
3. Run `CI` on the intended commit and resolve any failures.
4. Dispatch `Deploy` with target `dev` and a blank `artifact_run_id`.
5. Confirm the deployment artifact identifies the expected commit and environment, `GET <API_BASE_URL>/api/health` succeeds, Entra sign-in works, and synthetic CRUD/export smoke tests pass.
6. Record the successful Deploy run ID. Keep the corresponding artifact for rollback and complete the rollback drill before production.

## Rollback

Dispatch `Deploy` with the same environment and the previous successful Deploy run ID. This restores the exact frontend and API packages from that run, not the current source tree. Confirm the API health check and smoke tests. Do not restore Cosmos data for an application-code regression; use the separate Cosmos restore runbook only for data corruption or deletion.

The Function App must support the Flex Consumption blob-package deployment channel used by the workflow. Do not replace it with Kudu/SCM zip deployment. This workflow does not modify Cosmos schema, app settings, identity, network rules, or DNS; those changes require a separate reviewed infrastructure change.
