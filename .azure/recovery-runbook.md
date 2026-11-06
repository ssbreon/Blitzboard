# Recovery and Deployment Rollback Runbook

## Decisions

- Treat Cosmos DB recovery and application rollback as separate operations. Never restore the database just to undo an application release.
- Require Cosmos DB continuous point-in-time restore with 30-day retention for production data. Before creating production resources, verify that this mode is available for the selected Serverless account type and East US 2 region. If not, stop and choose a supported account configuration; do not silently fall back to periodic backup.
- For a data recovery, restore to a new Cosmos account at a UTC point before the incident. Do not overwrite the source account. Keep the restored account isolated until integrity checks pass.
- Proposed alpha recovery objectives are RPO <= 5 minutes and RTO <= 4 hours. These are targets, not Azure guarantees, and must be measured in the non-production drill.
- Point-in-time restore is not regional disaster recovery. Continuous backups are not automatically geo-disaster resistant, and a Serverless account is single-region. Regional outage recovery is outside the alpha target unless a separate multi-region design is approved.
- Roll back application code by redeploying the last known-good frontend and Function App artifacts from the same release commit. Keep database changes backward compatible with the previous application release; use forward-only expand/contract schema changes.

## Cosmos restore drill

Run this only against synthetic data in the isolated development resource group. Record the source account, chosen UTC restore point, restored account name, elapsed restore time, checks performed, and result. Never point production settings at the restored account during the drill.

1. Confirm the development account is configured for continuous backup with 30-day retention. Record its region, backup mode, and latest restorable timestamp.
2. Through the API, create synthetic data covering a workspace, Owner and Coach memberships, a playbook, plays/slides, a game plan, an invitation, and an export. Record expected IDs and counts without using real user data or secrets.
3. Record time T1 in UTC. Update and delete selected canary records after T1, then record T2.
4. Restore the entire `blitzboard-studio` database to a new, uniquely named account at T1, with public network access disabled and TTL disabled for the restore. Use the supported Azure portal or Azure CLI restore flow. Do not delete or alter the source account.
5. Reapply network/private endpoint configuration and data-plane role assignments; these settings are not restored with the data. Grant only the development Function App identity access to the restored database/container.
6. Point a temporary development API configuration at the restored account. Verify health, expected record IDs/counts, workspace isolation, Owner/Coach authorization, invitation state, and that the post-T1 update/delete are absent. Verify restored data is readable and writable using only synthetic records.
7. Measure elapsed restore and record any data loss relative to T1. Pass only if the restore is usable within the proposed 4-hour RTO, data is consistent through T1, and observed data loss is no more than 5 minutes. Otherwise revise the account choice or recovery objectives before alpha.
8. Remove the temporary endpoint configuration and delete the restored development account only after results are recorded and the source account remains healthy.

The local Cosmos emulator can test application data and schema behavior, but it does not prove Azure-native point-in-time restore. An emulator-only run is not a pass for this drill.

## Application rollback drill

Use the manual `Deploy` workflow described in [deployment-runbook.md](deployment-runbook.md). Each successful run retains frontend and Function App artifacts for 90 days, tagged with environment and commit. Record deploy run IDs and do not rely on production slots being available.

1. Deploy release A to the isolated development environment and verify health plus a synthetic create/read/update flow.
2. Deploy release B, also using synthetic data, and verify health.
3. Redeploy the exact release A artifacts without changing the Cosmos endpoint or restoring the database.
4. Verify the frontend and API report release A, health checks pass, and the synthetic records written by B remain accessible unless B intentionally changed them through a compatible schema migration.
5. Confirm the rollback completes within the proposed 30-minute application rollback target. Record actual elapsed time and any manual steps.

Pass only if a previous release can be redeployed from retained artifacts, the database remains available and unchanged by the rollback, and the smoke tests pass. If a database schema change prevents release A from working, the release is not rollback-safe and must use an expand/contract migration or a corrective forward migration before production.

## Production release and recovery gates

- The non-production Cosmos restore and application rollback drills both pass and their results are recorded.
- Continuous backup mode and 30-day retention are verified on the exact production account configuration; costs are included in the budget estimate.
- Restore permissions are restricted to designated operators. The restored account is private/isolated until its network and RBAC are explicitly reapplied.
- Production rollback artifacts are retained and identified by commit SHA before each release.
- Regional-outage recovery limitations and the proposed RPO/RTO are explicitly accepted before real user data is stored.
