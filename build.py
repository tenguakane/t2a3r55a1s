#!/usr/bin/env python3
"""Собирает один index.html из src/ по manifest.json. Использование: python3 build.py [выходной_файл]  (по умолчанию dist/index.html)
Порядок и теги блоков хранятся в manifest.json; файлы в src/ можно править как обычный CSS/JS/JSON."""
import json, os, sys
root = os.path.dirname(os.path.abspath(__file__))
m = json.load(open(os.path.join(root, "manifest.json"), encoding="utf-8"))
out = []
for it in m["items"]:
    body = open(os.path.join(root, "src", it["file"]), encoding="utf-8", newline="").read()
    out.append(it.get("open", "") + body + it.get("close", ""))
dst = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, "dist", "index.html")
os.makedirs(os.path.dirname(os.path.abspath(dst)), exist_ok=True)
open(dst, "w", encoding="utf-8", newline="").write("".join(out))
print("собрано:", dst, os.path.getsize(dst), "байт")
