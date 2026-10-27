# Deployment

The frontend is built into an nginx image and deployed with Helm to the
`writer-tool` namespace. Releases are manual: push a tag on `main`, then run
the **deploy** workflow and pass that tag.

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

> The current value of `DEPLOYMENT_NAME` is `writer-fronted` (without the
> final `n`). It works, but the release and Service will carry that name.

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

## Host reverse proxy for `tool.melzix.net`

The host nginx already binds `:80`/`:443`; the frontend Service should not try
to use those ports. Add a server block that forwards the domain to
`192.168.0.77:8088`, including WebSocket upgrade headers. Obtain the
certificate with certbot (the current host certificate is for another domain).

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80;
    server_name tool.melzix.net;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tool.melzix.net;

    ssl_certificate     /etc/letsencrypt/live/tool.melzix.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tool.melzix.net/privkey.pem;

    location / {
        proxy_pass http://192.168.0.77:8088;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

The backend sets `COOKIE_SECURE=true` and `COOKIE_DOMAIN=.melzix.net`, so the
full UI/login flow should be tested through `https://tool.melzix.net`, not
directly over HTTP.

The backend origin allowlist already contains `https://tool.melzix.net`.
