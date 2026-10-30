# AltaIDE_ScrollVertical

Вертикальная полоса прокрутки.

Превью: [Открыть демонстрацию](https://nastya-nikki.github.io/ALTA/Components/AltaIDE_ScrollVertical/preview.html)  
Источник: [AltaIDE/ScrollVertical, node 185649:32550](https://www.figma.com/design/axdKFZbeqNIfskP18KDs32/?node-id=185649-32550).  
Статус: реализовано, ожидает проверки дизайнером.  
Дизайн, переменные и варианты прочитаны 30.10.2026.

## Файлы

- `index.html` — отдельный пример.
- `preview.html` — карточка вариантов и демонстрация.
- `scroll-vertical.css` — геометрия и токены из Figma.
- `scroll-vertical.js` — подтверждённые конфигурации.
- `assets/figma-source.json` — свойства и измерения.
- `../../tokens/` — общие токены и режимы.
- `../../assets/fonts/` — исходные шрифты.
- `../../assets/alta/widgets.*` — общая техническая логика элементов выбора.

Изменение данных в интерактивном примере — демонстрационный сценарий. Исходные значения и варианты в таблицах сохранены.

`AltaScrollVertical.attach(bar, content)` связывает полосу с прокручиваемой областью. Высота ползунка сохраняется из Figma; пример без связанной области показывает изменение позиции в процентах.
