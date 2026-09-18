# TextFlow

Визуальный конструктор текстовых макетов на Vue 3 + Vite. Позволяет расставлять
на холсте текстовые блоки и таблицы, тянуть их мышью, выравнивать, подбирать
шрифт из Google Fonts и выгружать готовую вёрстку в HTML-файл.

## Возможности

- Холст произвольного размера с зумом, панорамированием и линейкой-направляющей
- Текстовые блоки: перетаскивание, resize, inline-редактирование, выравнивание
  по холсту (лево/центр/право, верх/середина/низ)
- Таблицы 3×3 с редактируемыми ячейками
- Панель Typography: поиск по шрифтам Google Fonts с поддержкой кириллицы,
  выбор начертания и кегля
- JSON5-панель слева: описываете элементы как `{ "id": "текст" }`, и они
  появляются на холсте (или обновляются, если уже есть)
- Экспорт макета в самодостаточный HTML (кнопка со значком сохранения)
- `Delete` удаляет выбранный элемент

## Требования

- Node.js 18+
- Ключ Google Fonts API (без него работает всё, кроме списка шрифтов)

## Установка и запуск

```sh
npm install
cp .env.example .env    # и вписать свой ключ в VITE_GOOGLE_FONTS_API_KEY
npm run dev
```

Сборка продакшен-версии и её локальный просмотр:

```sh
npm run build
npm run preview
```

## Переменные окружения

| Переменная                     | Назначение                                        |
| ------------------------------ | ------------------------------------------------- |
| `VITE_GOOGLE_FONTS_API_KEY`    | Ключ Google Fonts API для панели Typography        |

Файл `.env` в репозиторий не коммитится — шаблон лежит в `.env.example`.
Ключ получают в [Google Cloud Console](https://console.cloud.google.com/apis/library/webfonts.googleapis.com).

## Стек

Vue 3 (Composition API), Vite, interact.js (drag & resize), vue-zoomable,
vue3-virtual-scroller (виртуальный список шрифтов), opentype.js (превью
начертаний), Prism (подсветка JSON), JSON5.

## Рекомендуемая среда

[VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (Vetur отключить).
