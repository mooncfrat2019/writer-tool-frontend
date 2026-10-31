# TLS-сертификат для writer-tool.ru

`deploy-prod.yml` устанавливает платный сертификат из GitHub environment
`main` в namespace `writer-tool` и переключает балансировщик Timeweb на
`ssl-type: custom`.

## Что добавить в GitHub

В репозитории **writer-tool-frontend**, environment `main`:

| Тип | Имя | Значение |
|---|---|---|
| Secret | `TLS_CERT_B64` | base64 от полного PEM-цепочки: листовой сертификат + промежуточные |
| Secret | `TLS_KEY_B64` | base64 от нешифрованного приватного ключа PEM |
| Variable | `TLS_SECRET_NAME` | необязательно, по умолчанию `writer-tool-tls` |
| Variable | `TLS_FQDN` | необязательно, по умолчанию `writer-tool.ru` |

Секреты не коммитить. GitHub маскирует их в логах.

После добавления секретов нужен новый тег: `deploy-prod` checkout’ит тег, а
`values-prod.yaml` с `ssl-type: custom` должен быть в этом теге.

```bash
git tag v1.14.1
git push origin v1.14.1
gh workflow run deploy-prod.yml \
  -R mooncfrat2019/writer-tool-frontend \
  --ref v1.14.1 -f tag=v1.14.1
```

### Кодирование

Linux/macOS:

```bash
base64 -w0 cert.pem > cert.b64
base64 -w0 key.pem > key.b64

gh secret set TLS_CERT_B64 \
  -R mooncfrat2019/writer-tool-frontend --env main < cert.b64
gh secret set TLS_KEY_B64 \
  -R mooncfrat2019/writer-tool-frontend --env main < key.b64
```

Windows PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("cert.pem")) |
  Set-Content cert.b64 -NoNewline
[Convert]::ToBase64String([IO.File]::ReadAllBytes("key.pem")) |
  Set-Content key.b64 -NoNewline

gh secret set TLS_CERT_B64 -R mooncfrat2019/writer-tool-frontend `
  --env main --body (Get-Content cert.b64 -Raw)
gh secret set TLS_KEY_B64 -R mooncfrat2019/writer-tool-frontend `
  --env main --body (Get-Content key.b64 -Raw)
```

Переменные, если нужны не дефолтные значения:

```bash
gh variable set TLS_SECRET_NAME \
  -R mooncfrat2019/writer-tool-frontend --env main --body writer-tool-tls
gh variable set TLS_FQDN \
  -R mooncfrat2019/writer-tool-frontend --env main --body writer-tool.ru
```

## Что делает workflow

1. Декодирует сертификат и ключ во временный каталог с правами `700/600`;
   каталог удаляется по завершении шага.
2. Проверяет:
   - сертификат покрывает `TLS_FQDN` (`openssl x509 -checkhost`);
   - до истечения больше 30 дней (`-checkend 2592000`);
   - публичный ключ сертификата совпадает с ключом.
3. Создаёт или обновляет Secret `writer-tool-tls` типа
   `kubernetes.io/tls` в namespace `writer-tool`.
4. Helm применяет аннотации:
   - `attached-loadbalancer-ssl-type: custom`
   - `attached-loadbalancer-ssl-secret-name: writer-tool-tls`
   - `attached-loadbalancer-ssl-fqdn: writer-tool.ru`
5. Аннотация `k8s.timeweb.cloud/rotate-ts` заставляет Timeweb CCM
   перечитать сертификат на балансировщике.
6. Workflow проверяет, что по `https://writer-tool.ru` отдаётся сертификат
   с этим доменом (до 5 минут ожидания).

## Ротация

1. Заменить `TLS_CERT_B64` и `TLS_KEY_B64` в environment `main`.
2. Запустить `deploy-prod` с текущим тегом.
3. При истечении сертификата менее чем за 30 дней workflow упадёт до
   применения — сертификат нужно обновить заранее.

## Ручная проверка

```bash
kubectl -n writer-tool get secret writer-tool-tls
kubectl -n writer-tool get svc writer-frontend -o yaml | grep -A 5 annotations
kubectl -n writer-tool annotate svc writer-frontend \
  k8s.timeweb.cloud/rotate-ts="$(date +%s)" --overwrite

openssl s_client -connect writer-tool.ru:443 -servername writer-tool.ru \
  </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates
```

В `subject`/SAN должен быть `writer-tool.ru`, issuer — ваш CA, а не
`CN=empty` от Timeweb.

## Ограничения

- Timeweb принимает только сертификаты от доверенного CA; self-signed не
  подойдёт.
- В `TLS_CERT_B64` нужна полная цепочка, а не только листовой сертификат.
- Приватный ключ должен быть без пароля.
- Один балансировщик — один сертификат; для нескольких доменов нужен SAN
  или отдельный LB/Ingress.
