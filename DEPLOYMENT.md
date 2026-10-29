# Deployment

The frontend is built into an nginx image and deployed with Helm to the
`writer-tool` namespace. Releases are manual: push a tag on `main`, then run
the **deploy** workflow and pass that tag.

On-call procedures for both services, including rollback and incident
playbooks, are in the backend repository:
[`docs/RUNBOOK.md`](https://github.com/mooncfrat2019/writer-tool-backend/blob/main/docs/RUNBOOK.md).

## GitHub environment `main`

Secrets:

| Name | Purpose |
|---|---|
| `REGISTRY_URL` | Container registry host |
| `REGISTRY_LOGIN` | Registry user |
| `REGISTRY_TOKEN` | Registry password/token |

Variables:

| Name | Example | Purpose |
|---|---|---|
| `IMAGE_NAME` | `writer-frontend` | Image path inside the registry |
| `DEPLOYMENT_NAME` | `writer-frontend` | Helm release, Deployment and Service name |
| `SERVICE_PORT` | `8088` | Optional; defaults to `8088` |

The environment `main` currently has `DEPLOYMENT_NAME=writer-frontend` and
`IMAGE_NAME=writer-frontend`; the first release uses both.

## What the image does

- `pnpm build` runs with `VITE_API_MODE=real` and
  `VITE_COLLAB_ENABLED=true`.
- nginx serves the SPA and proxies:
  - `/api/` → `http://writer-backend:8087`;
  - `/collab/` → `http://writer-backend:8087` with WebSocket upgrade headers;
  - unknown paths → `/index.html`.
- The container listens on `8080`, runs as UID/GID `101` (the unprivileged
  nginx user) and exposes `/healthz`.

The Helm chart is in `deploy/helm/writer-frontend`. It creates a
LoadBalancer Service with `externalIPs: [192.168.0.77]` and port `8088`
(the cluster has no cloud load-balancer controller).

## Release

```bash
git tag v1.0.0
git push origin v1.0.0
```

Actions → **deploy** → **Run workflow** → `v1.0.0`, or:

```bash
gh workflow run deploy.yml --ref main -f tag=v1.0.0
```

Check:

```bash
kubectl -n writer-tool get pods,svc
kubectl -n writer-tool rollout status deployment/writer-frontend
curl http://192.168.0.77:8088/healthz
curl -I http://192.168.0.77:8088/
```

## Live deployment (2026-10-28)

- Frontend release `v1.3.0`, Deployment/Service `writer-frontend`.
- `v1.4.0` (plans page) is tagged and pending deployment.
- `v1.2.0` (TOTP setup/QR and login method selection) is the previous release.
- Pod `writer-frontend` is `1/1 Running`.
- Service: `LoadBalancer`, `externalIPs: [192.168.0.77]`, port `8088`.
- Public URL: **https://tool.melzix.net**.

`v1.2.0` includes TOTP setup with a QR code and the email/TOTP choice on
login. `v1.3.0` adds the two-factor step after email confirmation. `v1.4.0`
adds the plans page with limits and current usage. Current
checks: `pnpm test` 69/69, `pnpm e2e` 47/47, `pnpm lint` 0 errors
(9 non-blocking warnings), `pnpm build` passes.

## Host reverse proxy for `tool.melzix.net`

The host nginx already binds `:80`/`:443`, so the frontend Service uses
`8088`. On `zix-nexus` the following was installed:

- `/etc/nginx/sites-available/tool.melzix.net`
- symlink `/etc/nginx/sites-enabled/tool.melzix.net`

`certbot --nginx` issued the certificate and added the HTTPS listener and
HTTP redirect. The effective proxy configuration is:

```nginx
server {
    server_name tool.melzix.net;

    location / {
        proxy_pass http://192.168.0.77:8088;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        client_max_body_size 110m;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/tool.melzix.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tool.melzix.net/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = tool.melzix.net) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name tool.melzix.net;
    return 404;
}
```

Certificate:

- `CN=tool.melzix.net`, issuer Let's Encrypt, valid until `2027-01-25`;
- HTTP redirects to HTTPS;
- `snap.certbot.renew.timer` is active;
- `certbot renew --dry-run` completed successfully.

Issued with:

```bash
sudo certbot --nginx -d tool.melzix.net \
  --redirect --non-interactive --agree-tos --no-eff-email
```

Existing host sites were not modified.

Verification results:

| Check | Result |
|---|---|
| `https://tool.melzix.net/healthz` | `200` |
| `https://tool.melzix.net/` | `200`, SPA |
| static JS asset | `200` |
| `https://tool.melzix.net/api/v1/auth/me` | `401` (API proxy chain works) |
| `https://tool.melzix.net/collab/<uuid>` without token | `401` |
| `http://tool.melzix.net/` | `301` → HTTPS |

The backend sets `COOKIE_SECURE=true` and `COOKIE_DOMAIN=.melzix.net`, so use
the HTTPS URL for the full UI/login flow. The backend origin allowlist contains
`https://tool.melzix.net`.
