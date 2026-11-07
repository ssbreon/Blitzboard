# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Account Implementation: Local Milestone

### Startup And Sign-In

New browser tabs start on the subscription/sign-in page. The first-visit greeting
is remembered by `localStorage["blitzboard:welcome-seen"]` after Continue is selected.
Clearing that key restores the greeting. This preference is not an identity check.

With the Vite development server and `VITE_AUTH_MODE=development`, choose Free,
Individual, or Team to sign in as `local-demo-free`, `local-demo-individual`, or
`local-demo-team`. The API creates isolated, idempotent demo fixtures only with
development authentication and mock billing. Team opens its Team workspace.
Existing coach accounts and content are not modified. Sign Out returns to the
startup page; refresh preserves the active account in the current tab.

Production builds never send development authentication headers. With
`VITE_AUTH_MODE=entra`, MSAL processes the redirect before the app loads, keeps
its cache in session storage, and silently acquires API access tokens. The startup
page offers sign-in without subscription selection. API requests carry bearer
tokens; browser session flags never establish Entra identity. Sign Out invokes
provider logout after the existing unsaved-change guard. Interaction-required
errors do not automatically redirect and discard unsaved work.

The legacy `VITE_SIGN_IN_URL` redirect hook remains for non-Entra configurations;
it is not a standalone authentication implementation. No credentials are collected
by the app. Paddle onboarding remains unimplemented. The same OIDC identity has
a stable internal user ID derived from trusted issuer, tenant, and Object ID
claims. Email is only for display and recipient-bound invitation matching.

Startup checks: `node --test --test-force-exit src/components/StartupPage.test.js`.

### Local External ID Configuration

The customer tenant is Blitzboard Customers, not the original Workforce directory.
The Web registration has one SPA callback, `http://localhost:5173/`, uses PKCE
instead of implicit tokens, and requests the API's delegated `access_as_user`
scope plus the OpenID Connect `email` scope. Admin consent is granted on the Web
registration. The email one-time-passcode user flow is associated with the Web
app, not the API.

Frontend public settings in `.env.local`:

```dotenv
VITE_AUTH_MODE=entra
VITE_ENTRA_TENANT_ID=c6006e69-7941-4e27-9ec0-b7adfca05e67
VITE_ENTRA_CLIENT_ID=77e53ed3-acc0-49a1-acfa-3a3311002baa
VITE_ENTRA_AUTHORITY=https://blitzboardcustomers.ciamlogin.com/c6006e69-7941-4e27-9ec0-b7adfca05e67
VITE_ENTRA_API_SCOPE=api://b2ec116e-77f7-4ac0-b8aa-22bbd411a87c/access_as_user
VITE_ENTRA_REDIRECT_URI=http://localhost:5173/
```

API `local.settings.json` uses `AUTH_MODE=entra`, `APP_ENVIRONMENT=local`,
`BILLING_MODE=paddle`, and these public provider settings:

```dotenv
ENTRA_TENANT_ID=c6006e69-7941-4e27-9ec0-b7adfca05e67
ENTRA_SPA_CLIENT_ID=77e53ed3-acc0-49a1-acfa-3a3311002baa
ENTRA_API_AUDIENCE=b2ec116e-77f7-4ac0-b8aa-22bbd411a87c
ENTRA_API_SCOPE=access_as_user
ENTRA_AUTHORITY=https://blitzboardcustomers.ciamlogin.com/c6006e69-7941-4e27-9ec0-b7adfca05e67
ENTRA_ISSUER=https://c6006e69-7941-4e27-9ec0-b7adfca05e67.ciamlogin.com/c6006e69-7941-4e27-9ec0-b7adfca05e67/v2.0
```

The exact issuer above was checked against the tenant's OIDC discovery metadata.
The v2 API token audience is the API client ID, not its `api://` scope URI.
The validator uses RS256 and cached provider signing keys; it verifies issuer,
audience, tenant, SPA client, expiry, not-before, issued-at, v2 token format,
Object ID, and delegated scope. Missing tokens/dev headers are rejected in Entra
mode. Stable internal user IDs derive from trusted issuer/tenant/Object ID, not
email, and never automatically link to local development accounts.

Use the local Cosmos emulator with database `blitzboard-entra-local`, keeping
development content in `blitzboard-studio` unchanged. `BILLING_MODE=paddle` here
only disables mock billing/fixture access; checkout is not connected and no
payments are initiated.

### Invite-Only Local Alpha

In Entra mode, a successful sign-in creates/updates only the caller's profile.
It does not create a Free workspace or grant content access. `/api/me` remains
available and reports no workspaces; content/API workspace routes return
`ALPHA_ACCESS_REQUIRED` until the user belongs to an alpha-enabled Team. Existing
non-alpha records are retained, not deleted, but aren't available in this mode.

After the intended Owner has signed in once locally and their Profile shows
**Verified**, bootstrap their Team from the repository root:

```powershell
.\.venv\Scripts\python.exe api/bootstrap_alpha_owner.py "ssbreon+test@hotmail.com" --workspace-name "Blitzboard Alpha"
```

Replace the sample address with the chosen Owner's exact verified email. The
operator-only script requires Entra/local settings and exactly one matching
verified profile in the local `blitzboard-entra-local` emulator database. It
creates one `alphaEnabled` Team workspace with that user as Owner and an `alpha`
access source; it has no HTTP endpoint and cannot run in Azure. Re-running for
the same Owner returns that existing alpha workspace. It does not expose a way
for users to elevate themselves.

Restart the local API after the bootstrap. The Owner signs in or reloads, opens
the Team view, and invites a Coach by the Coach's email. With local Entra capture
enabled, the invitation is encrypted in the local outbox and the Owner can copy
the generated link from the Invitations tab for manual delivery. The Coach signs
up/signs in with that same email and accepts the invite. Acceptance requires a
matching email plus `email_verified: true` or `xms_edov: true` from the signed API
token. The invitation is single-use, expires after seven days, and reserves one
of twenty seats. Do not copy captured invite links into chat.

This CLI is a local alpha bootstrap only; a restricted production Owner bootstrap
is still required before launch. Production alpha invitations use manual delivery:
configure a trusted HTTPS `APP_PUBLIC_URL` and a secret `EMAIL_OUTBOX_KEY`. The
Owner's Copy Invitation Link action fetches the URL for one pending invitation
through `GET /api/workspace/invitations/{id}/link`; the invitation list never
contains production URLs, and Coaches cannot retrieve them. Deliver copied links
only through a trusted channel. No email is sent automatically; an email provider
integration remains deferred. The API's Owner/Coach permission enum remains the
source of authorization: both roles manage Team content; only Owner manages
workspace and membership.

Pending invitation tokens are temporarily kept in tab storage for up to 30 minutes
and removed from the URL before redirect; acceptance/cancel/logout clears them.
Entra email claims are not automatically treated as verified. The API registration's
**Token configuration → Access → email and xms_edov** claims need the OIDC `email`
scope requested by the client. The API's Token configuration page may link to API
permissions when `email` is added; configure the OpenID Connect `email` permission
there as prompted. The Web client sends `email` alongside its API scope for both
interactive and silent token requests. Invitation acceptance requires a trusted
explicit `email_verified: true` or `xms_edov: true` token claim and an email match;
an email address by itself is insufficient. Verify the real External ID access
token before relying on invites.
A verified-recipient challenge is still needed if the tenant doesn't emit an
appropriate explicit verification claim. Local Entra invitation capture is
available only to an Owner in the local alpha setup described above.

Start the emulators, Functions at port 7071 using the workspace virtual environment,
and Vite at port 5173. Vite fails if that port is occupied instead of silently
changing the registered callback. Visit `http://localhost:5173/`, select Continue
to sign in, complete the email passcode on Microsoft's page, and check profile
loading, refresh, a saved playbook, and provider logout. Never paste tokens or
passcodes into chat. Use a second real account to check workspace isolation before
deployment. Live authenticated behavior still requires this browser smoke test.

For local demo mode, restore `AUTH_MODE=development`, `BILLING_MODE=mock`, and
`COSMOS_DATABASE=blitzboard-studio` in API settings, and `VITE_AUTH_MODE=development`
in the frontend. Retain the matching local development secret. Restart both
services; never deploy development auth or mock fixtures.

Auth regression commands from the repository root:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s api -p test_auth.py
node --test --test-force-exit --test-concurrency=1 frontend/src/api/entra.test.js frontend/src/components/StartupPage.test.js
```

Production deployment still requires HTTPS callbacks, environment-specific settings,
and narrowly scoped CSP identity endpoints; do not deploy the local settings file.
Entra setup does not provision Azure application infrastructure or authorize deployment.

### Available Locally

- Profile name/coaching title and personal theme, field standard, and timezone preferences.
- Individual and Team switcher under the app-bar user icon, with per-tab selection.
- Workspace-bound requests, isolated libraries, scoped Owner/Coach permissions.
- Save/Discard/Cancel navigation, including base-play and adjustment drafts.
- Account-menu Sign Out uses the same unsaved-change guard, clears the selected
	workspace, and blocks authenticated frontend requests for this tab. The signed-out
	state survives reloads; the startup page selects the development demo identity.
	This is local session handling, not production provider logout or token revocation.
- Team name/defaults, roster roles/removal, seven-day invitations, resend/revoke,
	reserved seats, and recipient-bound single-use acceptance.
- Encrypted email capture only: no invitations are sent to real recipients.
- Annual local Owner fixtures, read-only lifecycle checks, usage/caps and billing summary.
- Legacy playbooks stay in Individual; they are not moved to the local Team.

Free limits are 5 playbooks, 15 games, 500 plays, and 500 scouting plays.
Individual limits are 100 playbooks, 100 games, 5,000 plays, and 5,000 scouting plays.
Team limits are 100 playbooks, 200 games, 10,000 plays, and 10,000 scouting plays.
The twenty Team seats include the Owner and pending unexpired invitations.

### Permission Policy

The API's `Permission` enum and immutable `ROLE_PERMISSIONS` mapping are defined
in `api/accounts.py`. Owner has all thirteen explicitly listed permissions; Coach
has the nine play, schedule, and game-plan read/write/delete permissions.
Play permissions include playbooks, plays, groupings, and adjustment slides;
game-plan permissions include nested scouting plays. Archive, restore, and reorder
use write permission. Exports require read permission for their source content.

Workspace summaries return effective `permissions` and compatible `capabilities`
derived from the same policy. Subscription expiry removes mutation permissions
without granting access to other workspaces. The API still verifies membership,
resource scope, and permissions inside workspace guards. The frontend uses returned
permissions for management controls, not role labels as authorization.

Only Owners can invite/remove Coaches, change workspace settings, or transfer
ownership. Owner self-demotion requires another Owner; concurrent demotions cannot
remove the last Owner. Invitations assign Coach only. Admin and unknown membership
roles fail closed, including older Admin invitations. Existing Admin records are
not automatically migrated: review them and explicitly assign Coach through an
authorized Owner before that membership can access content again.

These permission checks are also used with Entra authentication. Payment-free,
server-approved alpha access remains a separate implementation step.

### Record Status

Playbooks, Game Plans, Plays, and Scout Plays persist `recordStatus` as `Active`
or `Archived`; existing records without the field are treated as Active.
Each grid starts with Active selected. The toolbar menu's left pane is labeled View and contains
mutually exclusive Active/Archived choices; its right pane is labeled Actions
and contains grid commands. A Status column immediately before row actions displays the saved value.
An archive icon and Archived label beside the toolbar menu identify the Archived view.
Archive requires confirmation and hides the record from the default view.
Archived rows offer Restore, which sets the status back to Active.

Archive/Restore requires edit access. Archiving keeps all data, descendants,
page positions, and quota usage intact; child statuses are unchanged.
Delete remains permanent, including scoped descendants. Page reordering is
available only when every row is visible; mixed Active/Archived libraries cannot
be reordered while one status is hidden. The schema manifest is
`api/migrations/004-record-status-schema.json`.

### Global Search

The app-bar Search box searches partial, case-insensitive names across the selected
workspace's Playbooks, Plays, Games, Installs, Practice Scripts, Scouting Reports,
and Scout Plays, including archived records. Results appear in a dropdown DataGrid
anchored to the screen's right edge with record icons, Name, Type, and Year.
Records without a year display `--`. Double-click a row to open the normal
drillthrough view with its parent breadcrumbs. This also clears the search text
and results and closes the dropdown. Navigation uses the same Save/Discard/Cancel
guard as the rest of the app.

Search waits 250 ms after typing and ignores superseded responses. Escape or an
outside click dismisses the dropdown; reopening search refreshes its results.
The workspace-scoped `GET /api/search?q=...` endpoint returns lightweight record
metadata and parent identifiers, not play diagrams.

### Search Security

Global and DataGrid searches accept at most 256 characters, enforced by the API
as well as the inputs. Oversized terms return HTTP 400. SQL-like text, HTML-like
names, and apostrophes remain literal data: Cosmos filters use parameters and
React renders result text without interpreting HTML.

Authenticated searches share a fixed-window limit of 60 requests per minute per
user across workspaces and search routes. Exceeding it returns HTTP 429 with
`Retry-After`. Counters are stored as `searchRateLimits` records in the existing
Cosmos container and updated under the shared per-user guard, so the limit is not
reset by adding API workers. The in-memory test adapter uses the same policy.
Unfiltered list reads are not counted. This application-level limit supplements,
but does not replace, production gateway/WAF limits for unauthenticated traffic.

Global search returns at most 100 records, with `total`, `limit`, and `truncated`
metadata. When capped, the dropdown reports the total and asks for a narrower
search. Existing DataGrid list/paging behavior is unchanged.

Production response headers are defined in `public/staticwebapp.config.json`,
copied to the build output for Azure Static Web Apps, and also applied by Vite
preview. The CSP restricts scripts and API connections to the same origin and
blocks inline scripts, plugins, framing, and HTML base-URL overrides. Inline
styles remain allowed because diagrams and printing require them. Vite development
does not apply this policy so hot reload continues to work.

Other production hosts must apply these headers themselves. A separate API origin
must be explicitly added to CSP `connect-src`; future identity/payment providers
will need narrowly scoped policy updates when integrated. Do not loosen
`script-src` to allow inline scripts or eval.

Run the security regression checks from the workspace root:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s api -p test_auth.py -k search
npm --prefix frontend run test:security
```

### Breadcrumb View Cache

Drillthrough keeps ancestor React views and their DOM mounted but hidden, preserving
grid filters, selection, collapsed groups, pagination, and scroll positions when
returning through breadcrumbs. Inactive ancestors do not register navigation guards
or render breadcrumb settings controls.

View-only list reads use an in-memory cache scoped to the workspace API client.
Successful mutations patch matching cached lists: additions append at the bottom,
edited rows retain their positions, and both display italic cell text. Deleted rows
are hidden but retain their paging slots and row count until a refresh. Reordering
is disabled while deleted slots remain. Ancestor play counts and cached adjustment
titles are updated too. Normal API reads used by copy/reorder operations remain live.

The grid's Refresh command clears cached lists and dirty indicators and reloads
server data. A browser reload or a new workspace client also starts a fresh cache;
changes from other sessions require an explicit refresh.

Run the focused regression checks from the workspace root:

```powershell
node --test frontend/src/utils/breadcrumbCache.test.js
```

### Team Schedule

Calendar View supports Week, Month, Quarter, and Year. Month is the initial
default; the last selection is saved in local storage as `teamScheduleView`.
Quarter stacks the previous, selected, and next months using the shared month
renderer and highlights the selected month's heading. Previous/Next shifts the
window by one month; Today and Jump to Date center it on the selected month.
Quarter rows grow to fit events and the calendar scrolls internally.

Year shows all twelve months with event-type indicators, using four columns on
desktop, three on tablet, and one on mobile. Selecting a month opens Month View.
Year navigation advances one year. The existing Grid View follows the selected
period and retains full event records. Event dialogs, adding events, drag handles,
and opening Game Plans use the existing interactions.

Both `GET /api/schedule-events` and `GET /api/game-plans` accept optional inclusive
`start` and `end` bounds in `YYYY-MM-DD` format. Invalid dates and reversed bounds
return HTTP 400. Existing unfiltered calls remain supported and workspace
isolation is unchanged. Month and Quarter calendar requests include their visible
spillover days. Year Calendar View requests `scheduleSummary=true` to omit notes,
expanded Game Plan fields, and child-count queries. This is separate from the
existing grid `summary` parameter; no schema changes are required.

Run the focused schedule checks from the workspace root:

```powershell
npm --prefix frontend run test:schedule
.\.venv\Scripts\python.exe -m unittest discover -s api -p test_auth.py -k schedule
```

### Local Configuration

Keep the existing development credentials in the ignored API local settings and
frontend environment files. The frontend template is `.env.example`. Never use
frontend environment variables for Paddle/Resend backend keys.

API values (in `api/local.settings.json` under `Values`):

| Setting | Local Value |
| --- | --- |
| `AUTH_MODE` | `development` |
| `BILLING_MODE` | `mock` |
| `APP_ENVIRONMENT` | `local` |
| `DEV_USER_ID` | `local-coach`, or your existing configured identity |
| `DEV_USER_EMAIL` | Optional controlled Gmail alias for acceptance tests |
| `APP_PUBLIC_URL` | `http://localhost:5173`, matching the running frontend |
| `DEV_AUTH_SECRET` | Existing local secret, matching the frontend |
| `CONTENT_LIMIT_PLAYBOOKS` | `100` |
| `CONTENT_LIMIT_GAME_PLANS` | `100` |
| `CONTENT_LIMIT_PLAYS` | `5000` |
| `CONTENT_LIMIT_SCOUT_PLAYS` | `5000` |

Content limits are read by the API at startup. Set the corresponding Function App
Settings in Azure to override them without rebuilding; omitted settings use the
defaults shown above. Values must be non-negative integers.

An explicitly development-authenticated, non-Azure local runtime defaults to mock
billing if `BILLING_MODE` is omitted. Set it explicitly for clarity. The configured
default identity automatically receives Individual and local Team annual fixtures.
Other development identities get their own Individual trial and no automatic Team
access. Seed operations are idempotent and do not reset deliberately expired fixtures.

Mock mode refuses deployed Azure runtimes, production environment settings, and
non-loopback Cosmos endpoints. It never becomes a fallback for provider failures.
Do not expose the development frontend/API or development secret publicly.

The encrypted local invitation outbox derives its capture key from the backend
development secret. Rotating that secret makes old captured payloads unreadable;
revoke/reissue pending test invitations. Production requires an explicit
`EMAIL_OUTBOX_KEY`; the encrypted outbox supports Owner-only manual link retrieval,
while automatic email delivery remains deferred. Local captured links are
available only to authenticated Team Owners and disappear after acceptance or
revocation. To simulate the invited identity locally, use its
email as `VITE_DEV_USER_ID` in a separate development configuration with the matching
local secret. This is a dev fixture, not proof of real email verification.

### Run and Verify

Use the workspace tasks for the API, frontend, and Docker emulators. Vite is normally
at `http://localhost:5173` and proxies `/api` to `http://127.0.0.1:7071`.
Tasks currently install requirements into their terminal's Python environment;
tests below explicitly use the workspace virtual environment.

From the workspace root:

```powershell
.\.venv\Scripts\python.exe -m pip install -r api/requirements.txt
.\.venv\Scripts\python.exe -m unittest discover -s api -p test_auth.py
npm --prefix frontend run build
npm --prefix frontend run lint
```

If Dropbox/Windows locks the existing build output, use a temporary output directory:

```powershell
npm --prefix frontend run build -- --outDir "$env:TEMP/blitzboard-account-build"
```

The API tests cover isolation, forged ownership, roles, expiry, retained read access,
quota/seat concurrency, token expiry/rotation/revocation, encrypted capture, and
legacy preservation. Browser checks also exercised mobile layout, dirty navigation,
workspace-specific designer saves, and Cosmos create/delete quota accounting.

### Storage and Failure Recovery

The schema manifest is `api/migrations/003-workspace-accounts-schema.json`.
Existing content keeps its entity-type partition and immutable `ownerId`; new
content adds `workspaceId` and `createdBy`. Legacy owner-only records resolve only
inside their owner's Individual workspace. No blanket content transfer is performed.

Cosmos uses a workspace control partition for an ETag-protected usage ledger and
mutation lock. The memory test adapter uses a reentrant lock. Capacity is reserved
before writing content; a crash or uncertain write can leave conservative extra
reservations rather than allowing quota overflow. Actual deletions release capacity.
Collection deletion removes its scoped descendants.

Locks deliberately have no automatic expiry/takeover: that would allow overlapping
writers. A process crash can leave a workspace busy. Recovery must first stop all
writers, establish that no operation is active, reconcile actual scoped records with
the usage ledger, and only then remove the abandoned lock. Do not clear live locks or
blindly reset counters. Automated crash recovery and resumable multi-record cleanup
are production follow-ups, not guaranteed by the local tests.

### Remaining Provider and Production Work

The chosen providers and product rules remain the implementation contract:

- **Entra External ID:** email/password hosted signup/signin, MSAL, token/scope and
	verified-email validation. Non-development API authentication still fails closed
	with `AUTH_NOT_CONFIGURED`; no tenant integration is present yet.
- **Paddle Billing:** sandbox products/prices, verified checkout/webhooks, customer
	portal and credit isolation, immediate prorated interval previews/changes and
	confirmed refunds. Billing actions currently return `BILLING_NOT_CONNECTED`; mock
	Annual status is not a Paddle subscription, receipt, or payment.
- **Resend:** verified domain, sending keys, quota-aware dispatcher, signed delivery
	webhooks, suppression/retry/dead-letter handling. The current outbox captures
	encrypted messages only; it does not implement network delivery or scheduled reminders.
- **Lifecycle operations:** production ownership-transfer/account-deletion flows,
	persisted provider failure/refund transitions, retention warning jobs and verified
	deletion/backup/legal retention. The current API enforces computed read-only and
	eighteen-month read access boundaries, but does not automatically erase content.

Provider setup can run in parallel with local development. Do not deploy this
milestone as a fully integrated production account system. Use separate sandbox
data instead of granting fixture entitlements to real payment tests.
