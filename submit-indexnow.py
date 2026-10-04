#!/usr/bin/env python3
"""
Отправка всех страниц сайта в IndexNow — общий эндпоинт для
Яндекса, Bing, Naver, Seznam, Yep и других поисковиков.

Использование (после деплоя на публичный домен):
    python3 submit-indexnow.py https://ваш-домен

Скрипт сам:
  1) находит файл ключа IndexNow (32 hex-символа .txt) в этой папке;
  2) читает sitemap.xml и подставляет ваш домен вместо плейсхолдера;
  3) отправляет все URL одним POST-запросом на api.indexnow.org.

Дополнительно: ключ можно передать вторым аргументом, если файла нет:
    python3 submit-indexnow.py https://ваш-домен <ключ>
"""
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

SITEMAP = "sitemap.xml"
ENDPOINT = "https://api.indexnow.org/IndexNow"
PLACEHOLDER = "https://ваш-домен"


def find_key(explicit: str | None) -> str:
    if explicit:
        return explicit.strip()
    for f in Path(__file__).parent.glob("*.txt"):
        if re.fullmatch(r"[0-9a-f]{32}", f.stem):
            return f.stem
    print("не найден файл ключа IndexNow (32 hex-символа .txt) — сгенерируйте: python3 -c \"import secrets; print(secrets.token_hex(16))\"")
    sys.exit(1)


def sitemap_urls(domain: str) -> list[str]:
    text = (Path(__file__).parent / SITEMAP).read_text(encoding="utf-8")
    text = text.replace(PLACEHOLDER, domain)
    return re.findall(r"<loc>\s*(.*?)\s*</loc>", text)


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    domain = sys.argv[1].rstrip("/")
    if not domain.startswith("http"):
        print("домен должен начинаться с https:// (или http://)")
        sys.exit(1)

    key = find_key(sys.argv[2] if len(sys.argv) > 2 else None)
    urls = sitemap_urls(domain)
    if not urls:
        print("sitmap.xml не содержит URL — проверьте плейсхолдер домена")
        sys.exit(1)

    payload = {
        "host": domain.split("//", 1)[1],
        "key": key,
        "keyLocation": f"{domain}/{key}.txt",
        "urlList": urls,
    }
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            print(f"IndexNow: HTTP {resp.status} — отправлено {len(urls)} URL")
            print("принимают: Яндекс, Bing, Naver, Seznam, Yep")
            if resp.status == 202:
                print("202 Accepted — ключ проверяется, URL в очереди на обход")
    except urllib.error.HTTPError as e:
        print(f"IndexNow: HTTP {e.code} — {e.reason}")
        if e.code == 403:
            print("403: ключ не прошёл проверку — убедитесь, что файл <ключ>.txt доступен по адресу keyLocation")
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"сеть недоступна: {e.reason}")
        sys.exit(1)


if __name__ == "__main__":
    main()
