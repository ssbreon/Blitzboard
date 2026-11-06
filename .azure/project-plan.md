# Blitzboard Studio

**Status**: Integrated
**Created**: 2026-09-24
**Mode**: Azure project planning

## 1. Product Summary

**Product**: Blitzboard Studio

**Goal**: Deliver a responsive defensive football playbook editor where coordinators can design, adjust, annotate, organize, search, and export plays and playbooks.

**Primary users**: Defensive coordinators and coaching staff managing owned playbooks with coordinator/owner, assistant/editor, and viewer access.

**Scope**: Ship the first usable editor with 11v11, 7v7, and 4v4 field presets; base plays; named formation-adjustment slides; player symbols; routes, blitzes, zones, man indicators, alignments, responsibilities, annotations; drag/select/delete/clear; undo/redo; play library foundations; and print-ready PDF export for a play or complete playbook.

**Deferred**: Scouting/video analysis and practice scheduling.

## 2. Services

### Blitzboard Studio web app

- **Type**: Frontend
- **Runtime**: Existing React 19 + Vite application
- **Hosting target**: Azure Static Web Apps
- **Language**: JavaScript/JSX
- **Rendering**: Responsive native SVG field editor with React pointer events
- **Responsibilities**: Editing canvas, play controls, library/search UI, annotation tools, authentication state, API integration, and export initiation/download experience.

### Playbook API

- **Type**: Backend
- **Runtime**: Existing Azure Functions Python v2 programming model
- **Hosting target**: Azure Functions
- **Language**: Python
- **Responsibilities**: Authentication boundary, ownership and role authorization, play/playbook CRUD, slide/version persistence, search and metadata endpoints, export job/data endpoints, and Cosmos DB persistence.

### Blitzboard data store

- **Type**: Database
- **Service**: Azure Cosmos DB for NoSQL
- **Local development**: Cosmos DB emulator
- **Responsibilities**: Persist content, accounts, workspaces, memberships, invitations, exports, and operational records.

## 3. Architecture

The frontend remains the existing Vite React app and communicates with an HTTP Azure Functions API. The API owns authorization and persistence; the browser never treats local identity or client-side ownership checks as sufficient. Azure Cosmos DB for NoSQL is the backend persistence target in local development and deployment; the local Cosmos emulator exercises the same document and partition-key model.

The API stores domain records in the `playboard` container, using `/partitionKey` as the hashed partition key and `entityType` to distinguish records. Workspace content, profiles, workspaces, memberships, invitations, encrypted outbox messages, exports, and search/operation records use this Cosmos container. Partition selection and conditional writes must preserve workspace isolation, user initialization, and ownership invariants. No Azure Table Storage or Blob Storage adapter is planned for the alpha. If large binary assets later exceed Cosmos document limits, evaluate object storage as a separate future design decision.

Authentication uses an external OIDC provider, with Microsoft Entra External ID and Google federation as the preferred deployment direction. Local development may use an explicit development identity behind a flag and local secret; production API routes must validate the external token and enforce ownership/role rules server-side. No plaintext passwords or Google credentials are stored.

For the invite-only, payment-free alpha, Entra sign-in alone does not grant application access or create a personal Free workspace. An operator bootstraps an `alphaEnabled` Team workspace and its first Owner; Owners invite verified-email Coaches. Alpha access is stored and enforced server-side, independent of Paddle subscription status. Production alpha invitations support manual delivery: an Owner can retrieve a single pending invitation link through an authenticated, permission-checked endpoint; list responses never include production links, and Coaches cannot retrieve them. This requires a trusted HTTPS app URL and an explicit encryption key; no email is sent automatically. The local-only bootstrap CLI is not a production provisioning mechanism.

### Cloud development baseline (proposed; no resources provisioned)

- **Web hostname**: Use `dev.blitzboardstudio.com` for cloud development. The proposed Azure Static Web Apps Free tier is for development only and has no production SLA.
- **Isolation**: Use a separate dev Function App, Cosmos DB account/database, app settings, and Entra app registration from production. Use synthetic/test data only; never copy production user data, invitation keys, Cosmos credentials, or other secrets into dev.
- **Resource groups**: Keep cloud development resources in `rg-blitzboard-dev-eastus2` and long-lived alpha/production resources in `rg-blitzboard-prod-eastus2`. The alpha is an invite-only access phase on the production stack, not a disposable cloud environment. The domain and DNS are managed at Porkbun, not in an Azure resource group.
- **Authentication and network policy**: Register `https://dev.blitzboardstudio.com/` as the dev SPA redirect/logout URI. Keep dev and production Entra audiences/client IDs, API CORS allowlists, CSP `connect-src`, Cosmos identities, and secrets separate.

### Production pilot baseline (proposed; no resources provisioned)

- **Region**: East US 2 is the selected region for the alpha, based on the user's approval of Eastern US. Place the Function App and Cosmos account in this region. Validate SKU availability and subscription quota before provisioning, and revisit only if a data-residency constraint emerges. Cosmos Serverless is single-region and cannot be expanded to multiple regions later; multi-region availability would require a new account and a data-migration plan.
- **Static Web Apps**: Use Standard for the production frontend and its bring-your-own API integration. Microsoft's [published US price](https://azure.microsoft.com/en-us/pricing/details/app-service/static/) is $9 per app per month; custom domains and managed TLS are included. Actual price varies by agreement and currency.
- **Functions**: Use Linux Flex Consumption at 2,048 MB per instance, on-demand, with zero always-ready instances initially. This [scales to zero](https://learn.microsoft.com/en-us/azure/azure-functions/flex-consumption-plan) and avoids an idle-compute baseline, at the cost of possible cold starts. Revisit always-ready capacity after measuring latency. Function execution, the required runtime/deployment Storage account, and Application Insights ingestion are separate usage-dependent costs; see Microsoft's [consumption cost guidance](https://learn.microsoft.com/en-us/azure/azure-functions/functions-consumption-costs?tabs=flex-consumption-plan).
- **Cosmos DB**: Use [Serverless](https://learn.microsoft.com/en-us/azure/cosmos-db/serverless) for the low-volume, unpredictable pilot. It has no minimum throughput charge and bills for request units and storage, but does not support adding regions to the account. Microsoft's [published US list rates](https://azure.microsoft.com/en-us/pricing/details/cosmos-db/serverless/) are $0.25 per million RU and $0.25 per GB-month of transactional storage. As a planning example, 10 million RU and 10 GB-month would be about $5/month before any regional or agreement differences. Set Cost Management alerts at $25 and $50/month; alerts do not cap spend. If measurements show sustained traffic or multi-region availability is required, compare provisioned throughput before migration.
- **Initial cost envelope**: The known baseline is $9/month for Static Web Apps Standard, plus Cosmos usage (about $5/month in the example above), Functions executions, Functions runtime storage, monitoring, and bandwidth. The domain was purchased separately through Porkbun; its dashboard showed an $11.81 first-year charge and estimated annual renewal. Treat approximately $14/month plus variable Azure items as a scenario, not a quote. Recalculate in the Azure Pricing Calculator for the chosen subscription and region.
- **Cosmos authentication**: Use the Function App's system-assigned managed identity with [Cosmos DB for NoSQL native data-plane RBAC](https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/how-to-connect-role-based-access-control), scoped to the production database/container and the built-in Data Contributor role. The API now declares `azure-identity` and uses `DefaultAzureCredential` with existing database/container clients when `COSMOS_ENDPOINT` is configured and `COSMOS_KEY` is absent. The key-based path, including create-if-not-exists behavior, remains for local emulator use; deployed settings must omit `COSMOS_KEY`. Unit tests cover both initialization paths, but Azure RBAC and live managed-identity access remain unverified. Provision the database/container through IaC before deployment, then grant the Function App identity the scoped data-plane role so it needs no account-wide provisioning permissions. Disable key-based authentication only after the managed-identity path is deployed and verified.
- **Custom domain**: `blitzboardstudio.com` was purchased through Porkbun. The domain details showed Porkbun nameservers, auto-renew and domain lock enabled, and privacy enabled; the quoted first-year price and estimated renewal were $11.81 USD. Porkbun hosts DNS (its DNS service is powered by Cloudflare), so no Azure DNS zone or Azure resource group is needed for the domain. Existing MX, SPF, and `_acme-challenge` TXT records must be preserved. The parking ALIAS/wildcard records were absent in the latest DNS view; confirm any URL-forwarding rule is also removed. Once the Static Web Apps exist, add the Azure-provided DNS verification and CNAME records for `dev.blitzboardstudio.com` and `app.blitzboardstudio.com` in Porkbun. Use `app.blitzboardstudio.com` as the stable hostname for the invite-only alpha and general availability; register its HTTPS URL as the production Entra redirect/logout URI and configure matching API CORS and CSP origins. The apex may remain unused or be redirected later. See Microsoft's [custom-domain setup](https://learn.microsoft.com/en-us/azure/static-web-apps/custom-domain). No Azure resources or DNS records have been changed by this plan.

## 4. Data Model & API

**Core entities**: User, Playbook, Membership, Play, Slide, Revision, Annotation, ExportJob, and Asset.

**Alpha authorization roles**: Owner can manage the workspace and membership; Coach can manage plays, schedules, and game plans within the workspace.

**Alpha admission invariant**: Only membership in an operator-approved, alpha-enabled Team grants content access. Unapproved signed-in users can read their own profile and accept a valid invitation, but cannot create or access workspaces or content. Invitation acceptance requires a verified email matching the invitation recipient. A Team is alpha-enabled without a paid subscription; the last-Owner invariant still applies.

**Workspace ownership invariant**: Every workspace must always have at least one active Owner. The API must reject removal or demotion of the last Owner. Ownership transfer must establish the successor as an Owner before demoting the current Owner, and membership changes must be serialized or conditional so concurrent requests cannot violate the invariant.

**API groups**:

- `GET/POST/PATCH/DELETE /api/playbooks` and nested play/slide routes for CRUD and revisions.
- `POST /api/workspace/ownership/transfer` lets the current Team Owner promote an existing member; the current Owner remains an Owner until choosing to demote themselves.
- `GET /api/search` for playbook and metadata search foundations.
- `POST /api/exports` and `GET /api/exports/{id}` for export requests and status/data retrieval.
- `GET /api/health` for local and deployed health checks.

**Storage rules**: Use the Cosmos DB for NoSQL SDK and emulator locally; deploy to Azure Cosmos DB for NoSQL with database, endpoint, container, and authentication configured through environment or managed settings. Keep the `/partitionKey` contract and versioned schema manifests explicit. Use parameterized Cosmos queries, workspace-scoped records, and conditional writes for concurrent ownership and quota invariants. Do not migrate data to Table or Blob Storage as part of this plan.

## 5. Implementation Phases

1. Replace the starter screen with the responsive editor shell, field presets, toolbars, play library foundation, and accessible interaction states.
2. Implement normalized play/slide data and SVG editing interactions for players, routes, zones, blitzes, man indicators, alignments, responsibilities, annotations, selection, deletion, clear, and undo/redo.
3. Add API service boundaries and Azure Functions routes for authentication-aware playbook CRUD, membership/role checks, revisions, search metadata, and export jobs.
4. Use the existing Cosmos DB for NoSQL adapter and versioned container schema with the local Cosmos emulator; configure a separate production database/container and authentication without touching local or development databases. Keep schema migrations explicit and do not seed production data.
5. Wire sign-in/session handling, protected UI states, error/loading/empty states, PDF export for one play and a whole playbook, and responsive print styling.
6. Validate frontend build/lint, API tests, authorization cases, storage behavior against the Cosmos DB emulator, export output, and desktop/mobile workflows.

## 6. Design System & UI

**Component Library**: Fluent UI v9

**Visual direction**: A focused coaching workbench with a deep green field surface, warm paper-white panels, charcoal text, and measured amber/orange action accents. The field is the primary workspace; controls stay dense, legible, and keyboard accessible.

**Layout**: Persistent play library/navigation rail on wide screens, compact top toolbar, central responsive field editor, and contextual inspector for selected objects. On small screens the library and inspector become slide-over panels while the field preserves a stable aspect ratio.

**Interaction principles**: Use familiar icon buttons with tooltips for editing tools, segmented controls for field size and editor modes, explicit toggles for display layers, search input for play library filtering, and clear focus/selection states. Use Fluent UI primitives for buttons, dialogs, menus, inputs, tabs, tooltips, and notifications.

**Key views**: Playbook library, play editor, slide/version strip, selected-object inspector, export dialog, sign-in/loading/error states, and print layout.

## 7. Security & Operations

- Validate external OIDC tokens in the Python API and authorize every playbook and export operation by membership and role.
- Enforce the workspace ownership invariant on the server for all membership changes; never allow a workspace to have zero active Owners.
- Keep development identity behind an explicit development-only flag and local secret; never ship it enabled in production.
- Store secrets and connection strings in environment configuration or managed settings, never source files.
- Apply least-privilege Cosmos DB data-plane access to the application database/container; keep credentials in managed settings and never expose account keys to the browser.
- Add structured request logging without recording tokens or sensitive credentials.
- Provide health checks, clear API error contracts, and deployment configuration for Azure Static Web Apps, Azure Functions, and Azure Cosmos DB for NoSQL.

## 8. Validation & Handoff

**Frontend checks**: `npm run lint` and `npm run build` from `frontend/`; verify field presets, pointer interactions, keyboard access, undo/redo, search, responsive layouts, and print output.

**Backend checks**: Python unit/API tests for validation, role enforcement, CRUD, revision persistence, export lifecycle, and Cosmos DB behavior against the local emulator; verify `GET /api/health` locally.

**Acceptance criteria**: A signed-in coordinator can create and edit a defensive play, save named slides and revisions, manage permitted collaborators, search the play library, export one play or an entire playbook, and recover cleanly from loading, validation, authorization, and storage errors on desktop and mobile layouts.

**Recovery gate**: Follow the [recovery and deployment rollback runbook](recovery-runbook.md). Do not store production user data until the non-production Cosmos restore and application rollback drills pass, the production account's backup mode is verified, and the recovery objectives and regional-outage limitation are accepted.

**Deployment path**: Follow the [deployment runbook](deployment-runbook.md). GitHub Actions provides CI and manually dispatched deployments to pre-provisioned dev or production resources; production must use a protected GitHub environment.

**Handoff**: After explicit plan approval, hand off to `azure-project-scaffold` to execute this approved plan in the existing workspace without replacing the React/Vite frontend or Python Azure Functions API.
