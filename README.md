# Zapret Discord — лендинг

Одностраничный сайт обхода блокировки Discord на WebSocket-транспорте: тот же дизайн, что у
tg-ws-proxy лендинга, чёрный минимализм, тёмная/светлая темы, RU + EN, интерактивное демо, SEO, PWA.

Домен: https://zapretdiscord.shop

## Структура

| Файл | Что это |
|---|---|
| `index.html` | русская версия лендинга |
| `en/index.html` | английская версия |
| `styles.css` | все стили и анимации (цвета — через CSS-переменные, две темы) |
| `app.js` | интерактивное демо, тема, canvas-фон, скроллспай, service worker |
| `sw.js` | service worker (офлайн-кэш; при обновлении поднимайте версию `dcws-vN`) |
| `manifest.webmanifest` | PWA-манифест |
| `blog/` | 3 статьи про блокировку Discord, ws-транспорт и пинг |
| `support.html` / `terms.html` / `404.html` | служебные страницы |
| `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` | иконки |
| `og-image.png` | карточка для соцсетей (1200×630) |
| `robots.txt`, `sitemap.xml` | для поисковиков |
| `3f95….txt` | ключ IndexNow |

## Локальный запуск

```bash
python3 -m http.server 8743
# открыть http://127.0.0.1:8743
```

## Деплой и индексация

1. Пуш в репозиторий `zapretdiscord` → Pages из ветки main.
2. Домен `zapretdiscord.shop` привязан к Pages + DNS в Cloudflare (4 A-записи DNS only).
3. Коды верификации Яндекса/Google/Bing уже в `<head>` — добавьте сайты в кабинеты.
4. После деплоя: `python3 submit-indexnow.py https://zapretdiscord.shop`

