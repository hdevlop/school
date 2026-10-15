# Demo and customer installations

One repository and one reusable image, deployed as two independent Dokploy
Compose projects. Customer promotion is manual in Dokploy; GitHub receives no
customer deployment credential or webhook.

| Installation | Public origin | Image selection | Deployment |
| --- | --- | --- | --- |
| Demo | `https://myscolai.com` | `ghcr.io/hdevlop/school:demo` | GitHub checks, publishes, moves `:demo`, calls demo webhook, verifies revision/readiness/login |
| Customer JHL | `https://jhlschool.com` | `ghcr.io/hdevlop/school@sha256:<accepted digest>` | Operator selects the accepted image and deploys in Dokploy |

Set the customer administrator email in Dokploy, using the address supplied by
the owner, and enter its password interactively on the VPS. A login address
does not configure outgoing email: the customer's mail provider and verified
sender still need configuring.
The customer public landing starts unpublished; publish only reviewed customer
content from the landing editor.

## Prepare the existing demo before publishing these changes

The following are operator steps. This document does not establish that a VPS
backup, deployment, restore test, or customer installation has happened.

1. Back up the demo with `pg_dump -Fc`, copy its uploaded files, and save its
   encrypted environment/configuration securely. Copy backups off-server and
   restore the database into an isolated database to verify them. Preserve
   ownership and permissions for uploaded files. Keep real secrets out of Git,
   logs, evidence files, and this document.
2. Record the **full** running image registry digest, OCI revision, served
   `/deployment-revision.txt`, actual project name, volumes, storage path and
   environment. The VPS report's shortened digests are insufficient to deploy.
   Its `SCHOOL_IMAGE` pointed at an unused August image: replace that stale
   value with the full **currently running** digest before Compose consumes it.
   Also inventory the old app/worker containers' relative `storage` directories:
   the old configuration used `basePath: 'storage'`, while Compose mounted
   `/srv/school/storage`. A zero-file bind mount does not prove no uploads exist
   elsewhere in the container. Back up any such files before replacing it, and
   copy them into the intended persistent directory with correct ownership
   during a write pause. Check for collisions before copying; do not overwrite
   one set with another. Verify existing uploads after the transition.
3. Preserve the existing Dokploy Compose project name. Removing `name: school`
   does not authorize renaming the demo project or creating empty replacement
   database volumes. The report identified `school-school-lghkg3`; verify the
   current name and resolved volume names rather than assuming it remains so.
4. Consolidate every required demo value into its own Dokploy environment.
   The updated Compose reads only `./.env`; it no longer reads
   `/opt/school/env/app.env` or `/opt/school/env/infrastructure.env`. Reconcile
   differing values against the effective running configuration first.
5. Set `SCHOOL_IMAGE` to the recorded current digest,
   `SCHOOL_SEED_LANDING=true`, and `SCHOOL_LOOPBACK_PORT=3400`. Preserve the
   **actual** existing storage mount, even if its name says production. The
   report found `/srv/school/storage-production`; do not replace it with the
   nonexistent `/srv/school/storage-demo` merely to make the names tidier.
6. Review memory/CPU ceilings against observed peak use. Defaults in Compose
   are starting limits, not measured capacity. The report had 2.6 GiB available
   and no swap; monitor migration peaks and both stacks before customer use.
   Configure host swap/capacity and off-server backup retention on the VPS.
7. Create the GitHub **demo** environment and place the demo webhook in its
   `DOKPLOY_DEMO_DEPLOY_WEBHOOK` secret. Set the **repository** variable
   `DEMO_DEPLOY_PAUSED=true` during the transition. The workflow no longer reads
   `DOKPLOY_SCHOOL_DEPLOY_WEBHOOK` from `production-vps`.
8. Disable independent repository push hooks/GitHub App triggers for demo, so
   only the workflow calls its token webhook. On Dokploy **0.29.13**, keep demo's
   **Auto Deploy enabled**: the [Compose webhook handler](https://github.com/Dokploy/dokploy/blob/v0.29.13/apps/dokploy/pages/api/deploy/compose/%5BrefreshToken%5D.ts)
   rejects that workflow webhook when the switch is off. A custom Git source
   without a separate repository push hook provides the required separation.
   Customer Auto Deploy stays **off** and promotion uses Dokploy's Deploy action.
   Recheck this behavior after a Dokploy upgrade and verify deployment serialization.
9. Publish the changes only after steps 1–8. With demo deployment paused, CI
   publishes the new `:sha-<full commit>` image and records its digest without
   changing `:demo` or calling Dokploy. Manually deploy this first new image by
   digest on demo, with matching reviewed Compose configuration. Verify it.
10. Once the new configuration passes, clear `DEMO_DEPLOY_PAUSED` and manually
    run the workflow. When its demo tag step has published the accepted image,
    set demo `SCHOOL_IMAGE=ghcr.io/hdevlop/school:demo` and deploy. Confirm the
    exact revision. Subsequent automatic runs follow `:demo`.

The shared `pull_policy: always` is intentional: a locally cached `:demo` must
be refreshed. A customer digest stays fixed even when pulled again. See
[Compose image references](https://docs.docker.com/reference/compose-file/services/#image).

## Customer environment and isolation

Create a **new** Dokploy Compose project with its own generated `.env`, network
names and PostgreSQL/Redis volumes. Never copy demo data or reuse its secrets.
All runtime and Compose variables are documented in
[`apps/dashboard/.env.local.example`](../../apps/dashboard/.env.local.example).
That is the repository's only tracked environment template; Dokploy's `.env`
is generated deployment state, not a second source-controlled env file.

Set these customer-specific values in Dokploy:

```dotenv
SCHOOL_IMAGE=ghcr.io/hdevlop/school@sha256:<full accepted digest>
SCHOOL_STORAGE_HOST_PATH=/srv/school/storage-jhl
SCHOOL_LOOPBACK_PORT=3401
SCHOOL_SEED_LANDING=false
FRONTEND_URL=https://jhlschool.com
POSTGRES_DB=school_jhl
POSTGRES_USER=school_jhl
ADMIN_EMAIL=<customer-admin-email>
NAJM_AUTH_INTERNAL_URL=http://127.0.0.1:3000/api/auth/session/recover
SCHOOL_TRUSTED_PROXY_HOPS=1
```

Generate independent `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, JWT secrets and
`NAJM_ENCRYPTION_KEY`; set `DB_URL` to this project's `postgres` service and
`REDIS_URL` to this project's `redis` service. URL-encode passwords in connection
URLs. Set the application storage configuration consistently with the container
mount `/srv/school/storage`: Compose sets `SCHOOL_STORAGE_PATH` to this path. Do
not override it to an unmounted directory. Create the host directory first, owned by uid 1000;
Compose refuses to invent a missing bind-mount directory. No default customer
storage path or loopback port is supplied, so omissions fail before deployment.

`FRONTEND_URL` is a runtime origin shared by auth links, the default CORS origin,
landing metadata, robots and sitemap. `CORS_ORIGIN` remains an explicit override.
`NEXT_PUBLIC_APP_URL` is no longer read. Docker builds use a neutral placeholder;
robots and sitemap are dynamic so they follow the installation at runtime.
See [Next runtime environment variables](https://nextjs.org/docs/app/guides/environment-variables#runtime-environment-variables).

Use `EMAIL_PROVIDER=console` only during isolated rehearsal. Production email
needs a reachable provider, verified sender and a successful delivery from both
the app and worker. The report's demo Mailpit host was unreachable from the
worker's networks: fix that route or use console for demo until fixed. The
worker's egress network allows external providers; it does not automatically
join another container's private network.

Route the customer's `app:3000` through Traefik with HTTPS for `jhlschool.com`;
configure `www.jhlschool.com` to redirect to the apex while preserving paths.
Do not expose PostgreSQL or Redis ports. Protect the Dokploy dashboard and close
its publicly reachable plain HTTP management port through the actual host or
provider firewall configuration.

## Rehearse an empty installation

Use a throwaway Compose project, distinct credentials/storage/port and a new
database. Do not run this rehearsal against either persistent installation.

1. Run migrations with `SCHOOL_SEED_LANDING=false`. The app and worker wait for
   the migration service to finish; the one-shot service has no healthcheck.
2. Bootstrap only auth/reference data, using the selected release image. In
   that project's checkout, with its own `.env` and exact `-p` project name:

   ```sh
   docker compose -p <customer-project> -f compose.production.yml run --rm migrate bun run seed:admin
   docker compose -p <customer-project> -f compose.production.yml run --rm migrate bun run seed:roles
   docker compose -p <customer-project> -f compose.production.yml run --rm migrate bun run seed:visit-request-permissions
   ```

   Run the first command in an interactive terminal **without `-T`**. Enter
   the customer's admin email and the hidden password; do not persist an
   `ADMIN_PASSWORD` in Dokploy. `seed:admin` also resets an existing matching
   account, so it is a bootstrap command, never an ordinary deployment step.
3. Sign in, then create real School settings with the existing administrator
   `POST /api/settings` REST route or `settings_create` MCP tool. Supply the real
   school name and first academic year explicitly. For this Moroccan school,
   configure `timeZone=Africa/Casablanca`, `currency=MAD`, the chosen language,
   `startMonth=september` and `endMonth=june`. Check the resulting initial year
   calendar before using it; settings creation marks its provenance assumed.
   Do not invent enrollment history or substitute `seed:school` for setup.
4. Optionally use `seed:academic --year <year>` for default classes, sections,
   subjects and fee types after reviewing whether the customer wants them.
   It creates **no people or settings**. For a fully customer-defined structure,
   create these through the normal administration flows instead.
5. Confirm no fictional people, fees, news, statistics or testimonials exist.
   `/welcome` should return 404 until the customer publishes content; login
   should work and sitemap should omit unpublished landing content. Confirm
   `/robots.txt` refers to the customer domain.
6. Verify settings/year creation, login, an essential school workflow,
   migration ordering, worker heartbeat, mail delivery and non-overlapping
   deployments. Record this evidence before provisioning the real customer.

Never run demo/reset/full/school/history/expense/top-up seeds on customer data.
`seed:landing` publishes fictional content and must remain disabled there.
The app's missing-row fallback is unpublished; existing saved publication state
and landing edits retain their values.

## Select and deploy a customer release

1. Pick a successful **demo deployment** run in GitHub Actions and download its
   `school-release-<full commit>` artifact. `release.json` records the full
   revision, immutable image reference and build-run URL. Publication alone is
   not demo acceptance: check the deploy job succeeded and test the workflows
   on that exact demo revision. Pause automatic demo releases during a longer
   test or presentation with repository variable `DEMO_DEPLOY_PAUSED=true`.
2. Record the accepted revision and digest. If demo has advanced, redeploy the
   selected digest there and retest it. Preserve published images for active
   customer versions and rollback candidates even after CI artifacts expire.
3. Back up customer PostgreSQL and uploads off-server, recording restore
   evidence. Review pending migrations and compatibility with the previous
   app/worker before deploying. Deployments run migrations automatically.
4. In the **customer** Dokploy project, set `SCHOOL_IMAGE` to the accepted
   `ghcr.io/hdevlop/school@sha256:...` reference. Keep auto-deploy off. Check the
   Compose/configuration ref is the selected release's ref or is explicitly
   reviewed as compatible; selecting an old image must not silently use
   incompatible current `main` configuration. Use the Dokploy source/ref controls
   available on this VPS or an operator-maintained release ref to pin it.
5. Preview the resolved configuration privately: all of `app`,
   `notifications-worker` and `migrate` must select the same image; persistent
   volume names/storage must still belong to the customer. Then click Deploy.
6. Verify `/deployment-revision.txt` equals the accepted full commit,
   `/api/health/status` and `/login` return 200, and `www` redirects correctly.
   Inspect the worker's image and heartbeat as well as the app: the public
   revision only proves the web service. Test essential school workflows and
   real mail delivery. Record the image/configuration ref, backup, operator,
   verification time and results in the release record.

Ordinary demo pushes never change customer `SCHOOL_IMAGE`. A selected digest
remains available for manual promotion even after demo moves ahead. GitHub
concurrency serializes demo workflows; Dokploy's own queue behavior and
overlapping manual deployments still need rehearsal on the actual VPS.

Changing back to a previous image restores code, not database schema. Use
backward-compatible migrations for code rollback. Restoring a database backup
loses writes after that backup; handle that as a separate recovery operation.

## Repository verification

```sh
bun test apps/dashboard/tests/features/Landing/landingOrigin.test.ts packages/server/tests/landing
bun scripts/check-production-compose.mjs
bun run lint
bun run typecheck
bun run build
```

The Compose check uses Docker Compose's actual parser with two temporary fake
environments. It checks image alignment, isolated volumes/storage/ports/secrets,
required inputs and internal database networks. It pulls nothing and needs no
Docker daemon. On a host with only a standalone Compose binary, set the tooling
variable `SCHOOL_COMPOSE_BINARY` to that executable's path. CI runs the check
and rejects installation domain strings in the built server/client output.

The runtime settings/empty-school rehearsal, image publication, real container
migration behavior, VPS deployment, backups/restore, worker mail and browser
acceptance are separate evidence boundaries; source checks do not prove them.
