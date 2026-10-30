# AltaIDE_BitMaskPicker

Панель редактирования шестнадцатибитной маски.

Превью: [Открыть демонстрацию](https://nastya-nikki.github.io/ALTA/Components/AltaIDE_BitMaskPicker/preview.html)  
Источник: [AltaIDE/ Bit Mask Picker, node 200029:1467](https://www.figma.com/design/axdKFZbeqNIfskP18KDs32/?node-id=200029-1467).  
Статус: реализовано, ожидает проверки дизайнером.  
Дизайн, переменные и варианты прочитаны 30.10.2026.

## Файлы

- `index.html` — отдельный пример.
- `preview.html` — карточка и демонстрация.
- `bit-mask-picker.css` — исходная геометрия панели и привязки токенов.
- `bit-mask-picker.js` — переключение, сброс и демонстрационное сохранение.
- `assets/figma-source.json` — свойства и измерения Figma.
- `../AltaIDE_Bit/`, `../AltaIDE_BitsGroup/`, `../AltaIDE_Link/`, `../AltaIDE_ButtonPrimary/`, `../AltaIDE_ButtonSecondary/` — используемые реализации.
- `../../tokens/` и `../../assets/fonts/` — общие токены и шрифты.

В демонстрации маска читается слева направо как двоичное число. Сохранение возвращает значение в событии `alta-mask-change`; внешние данные не изменяются. Адрес справки в Figma не задан, поэтому ссылка выводит краткую подсказку.
