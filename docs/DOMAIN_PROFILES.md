# Доменные профили сайта

Один frontend-образ обслуживает оба домена и подставляет значения по `Host`.

## Профили

| Host | `siteUrl` | Email поддержки |
|---|---|---|
| `tool.melzix.net` и остальные | `https://tool.melzix.net` | `support@tool.melzix.net` |
| `writer-tool.ru` | `https://writer-tool.ru` | `support@writer-tool.ru` |
| `www.writer-tool.ru` | `https://writer-tool.ru` | `support@writer-tool.ru` |

Профили заданы в `src/shared/legal.ts` (`legalProfileForHost`).

## Что подставляется

- Футер, лендинг, тарифы, страницы оплаты и авторизации используют
  `LEGAL.contacts.email`.
- Тексты оферты, пользовательского соглашения и cookie-политики содержат
  исходный домен как placeholder; `LegalPage` заменяет его на профиль
  текущего хоста (`localizeLegalText`).
- `index.html` (canonical, OG), `robots.txt` и `sitemap.xml` переписываются
  nginx через `map $host $writer_site_url` и `sub_filter`.
- Версия документов (`LEGAL_VERSIONS`) пока общая для обоих доменов; текст
  отличается только доменом и email. Если нужны разные версии для согласий,
  можно добавить суффикс домена в `LEGAL_VERSIONS`.

## Как добавить новый домен

1. Добавить профиль в `LEGAL_PROFILES`.
2. Добавить host в `map` в `nginx/default.conf.template`.
3. Настроить DNS и TLS для домена.
4. Настроить backend-переменные ниже.

## Backend пока общий

Frontend меняет только отображаемые значения. Для `deploy-prod` в backend-
workflow добавлены переопределения `*_PROD`; задайте их как **variables**
в GitHub environment `main` репозитория writer-tool-backend:

| Variable | Значение для writer-tool.ru |
|---|---|
| `APP_PUBLIC_URL_PROD` | `https://writer-tool.ru` |
| `COOKIE_DOMAIN_PROD` | `.writer-tool.ru` |
| `FRONTEND_ORIGIN_PROD` | `https://writer-tool.ru` |
| `YANDEX_REDIRECT_URI_PROD` | `https://writer-tool.ru/auth` |
| `VK_REDIRECT_URI_PROD` | `https://writer-tool.ru/auth` |
| `SMTP_FROM_PROD` | `Writer Tool <no-reply@writer-tool.ru>` |
| `SMTP_USERNAME_PROD` | `no-reply@writer-tool.ru` |
| `SMTP_PASSWORD_PROD` | пароль ящика `no-reply@writer-tool.ru` — **secret**, не variable |
| `SMTP_ADDR_PROD` | только если SMTP-сервер другой; иначе общий `smtp.timeweb.ru:465` |
| `COLLAB_ALLOWED_ORIGINS_PROD` | `https://writer-tool.ru,https://www.writer-tool.ru`, если в общем секрете не `*` |

`TRUSTED_PROXY_CIDRS` менять не нужно: текущее значение
`10.10.0.0/16,192.168.0.77/32,10.244.0.0/16` уже покрывает pod CIDR облака.
`TRUSTED_PROXY_CIDRS_PROD` можно не задавать.

Дополнительно вручную:

- добавить redirect URI в консоли Яндекс ID и VK ID;
- обновить Result/Success/Fail URL в ЛК Robokassa (или завести отдельный
  магазин для нового домена);
- убедиться, что ящики `support@writer-tool.ru` (контакт на сайте) и
  `no-reply@writer-tool.ru` (отправитель писем) созданы, а для домена
  настроены SPF/DKIM;
- проверить `COLLAB_ALLOWED_ORIGINS`, если там не `*`.

Без смены `COOKIE_DOMAIN` refresh- и file-cookie, выставленные для
`.melzix.net`, браузер на `writer-tool.ru` отклонит. Без смены OAuth redirect
URI вход на новом домене уйдёт на `tool.melzix.net`.
