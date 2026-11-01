# AltaCodeEditor_CodeCanvasDebugging

Область отображения кода во время отладки.

Превью: [Открыть демонстрацию](https://nastya-nikki.github.io/ALTA/Components/AltaCodeEditor_CodeCanvasDebugging/preview.html)  
Источник: [CodeCanvas_Debugging, node 1391:49174](https://www.figma.com/design/OowUywUctN6BQHA980XMJ4/?node-id=1391-49174).  
Статус: реализовано, ожидает проверки дизайнером.  
Дизайн, переменные и варианты прочитаны 01.11.2026.

## Файлы

- `index.html` — отдельный пример.
- `preview.html` — карточка компонента.
- `code-canvas-debugging.css` — оформление из актуальной Figma.
- `code-canvas-debugging.js` — подтверждённые конфигурации.
- `assets/figma-source.json` — исходные свойства и привязки.
- `assets/` — оригинальные графические ресурсы Figma.
- `../../tokens/alta-code-editor.css` — токены и цепочки алиасов.
- `../../tokens/figma-alta-code-editor-variables.json` — значения, режимы и использованные стили Figma.
- `../../assets/alta/code-editor.js` — общая логика локального примера.

Составной пример из Figma отображается как локальная область кода с прокруткой. Компиляция, запуск и подключение отладчика не выполняются. Вложенная подсветка сохранена в составе исходника без создания отдельных компонентов исключённого раздела Syntax.
