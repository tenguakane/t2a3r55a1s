# Colony Stats: исходники

- `src/` — части страницы по порядку: `*.css`, `*.js`, `*.json` (данные) и `*-page.html` (разметка между блоками). Номер в имени задаёт порядок.
- `manifest.json` — порядок частей и теги `<style>`/`<script>` с их атрибутами.
- `build.py` — собирает один `index.html`: `python3 build.py dist/index.html`.
- `tests/` — автотесты: `node tests/run.js dist/index.html`.

Правка: меняешь нужный файл в `src/`, запускаешь `build.py`, затем тесты. Сборка побайтово совпадает с исходным `index.html`.
