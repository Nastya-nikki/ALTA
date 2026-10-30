/* Shared mechanics for original Figma layouts. No remote calls or application mutations. */
(function () {
  'use strict';
  const definitions = new Map(), states = new WeakMap(), pending = new Map();
  const rootFor = target => target && target.closest && target.closest('.alta-component');
  const stateName = state => state.def.variants[state.index].props.State || '';
  const isDisabled = state => /disabl/i.test(stateName(state));
  const isBusy = state => /loading/i.test(stateName(state));
  function register(def) {
    const base = document.currentScript && document.currentScript.src;
    if (base) def.variants.forEach(v => { v.html = v.html.replace(/src="\.\/assets\/([^"]+)"/g, (_, file) => 'src="' + new URL('assets/' + file, base).href + '"'); });
    definitions.set(def.name, def);
    document.querySelectorAll('[data-component="' + def.name + '"]').forEach(init);
    if (pending.has(def.name)) pending.get(def.name).resolve(def);
  }
  function emit(root, name, detail) { root.dispatchEvent(new CustomEvent('alta-' + name, { bubbles: true, detail })); }
  function choose(root, candidates) {
    const state = states.get(root), current = state.def.variants[state.index].props;
    for (const desired of candidates) {
      const found = state.def.variants.findIndex(v => v.props.State === desired && Object.keys(current).every(k => k === 'State' || v.props[k] === current[k]));
      if (found >= 0) { if (found !== state.index) paint(root, found); return true; }
    }
    return false;
  }
  function paint(root, index, resetValues = false) {
    const state = states.get(root), oldFocus = document.activeElement;
    const controlIndex = oldFocus && root.contains(oldFocus) ? Number(oldFocus.dataset.controlIndex) : NaN;
    const selection = oldFocus && typeof oldFocus.selectionStart === 'number' ? [oldFocus.selectionStart, oldFocus.selectionEnd] : null;
    state.painting = true; state.index = index; root.dataset.variant = String(index);
    if (resetValues) state.values = null;
    root.querySelector('.alta-view').innerHTML = state.def.variants[index].html;
    root.setAttribute('aria-disabled', String(isDisabled(state) || isBusy(state)));
    if (isBusy(state)) root.setAttribute('aria-busy', 'true'); else root.removeAttribute('aria-busy');
    setupView(root, state);
    if (!Number.isNaN(controlIndex)) {
      const input = root.querySelector('[data-control-index="' + controlIndex + '"]');
      if (input && !input.disabled) { input.focus({ preventScroll: true }); if (selection && input.type !== 'number') { try { input.setSelectionRange(...selection); } catch (_) {} } }
    }
    state.painting = false;
  }
  function slotControl(slot, state, i) {
    const multiline = state.def.kind === 'textarea' || state.def.kind === 'commentbar';
    const input = document.createElement(multiline ? 'textarea' : 'input');
    input.className = 'fn-edit'; input.dataset.controlIndex = String(i);
    input.setAttribute('aria-label', state.def.name.replace('AltaIDE_', '') + (i ? ' ' + (i + 1) : ''));
    if (!multiline) input.type = 'text';
    if (['number', 'double'].includes(state.def.kind)) {
      input.inputMode = 'decimal'; input.setAttribute('role', 'spinbutton');
      input.setAttribute('aria-valuenow', '0');
    }
    const source = slot.dataset.text || '', placeholder = /placeholder/i.test(stateName(state)) || (state.def.kind === 'input' && /label/i.test(stateName(state)));
    input.placeholder = placeholder ? source.replace(/\|$/, '') : '';
    input.value = state.values && state.values[i] !== undefined ? state.values[i] : placeholder || source === '|' ? '' : source.replace(/\|$/, '');
    input.disabled = isDisabled(state); input.setAttribute('aria-invalid', String(/invalid/i.test(stateName(state))));
    input.style.width = '100%'; input.style.height = '100%';
    slot.replaceChildren(input);
    if (state.def.kind === 'textarea') input.style.resize = 'vertical';
    input.addEventListener('input', () => {
      state.values = [...state.root.querySelectorAll('.fn-edit')].map(el => el.value);
      if (input.getAttribute('role') === 'spinbutton') input.setAttribute('aria-valuenow', String(Number(input.value) || 0));
      emit(state.root, 'change', { value: input.value, values: state.values.slice() });
    });
    input.addEventListener('focus', () => {
      if (isDisabled(state)) return;
      state.values = [...state.root.querySelectorAll('.fn-edit')].map(el => el.value);
      choose(state.root, /invalid/i.test(stateName(state)) ? ['Edit_Invalid', 'Focused_Invalid'] : ['Edit', 'Focused', 'FocusedBlue']);
    });
    input.addEventListener('blur', () => {
      if (state.painting) return;
      state.values = [...state.root.querySelectorAll('.fn-edit')].map(el => el.value);
      if (state.def.kind === 'commentbar') return;
      choose(state.root, /invalid/i.test(stateName(state)) ? ['Invalid'] : input.value ? ['Default_Filled', 'Default'] : ['Default_Placeholder', 'Default', 'None']);
    });
    if (['number', 'double'].includes(state.def.kind)) input.addEventListener('keydown', event => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); step(input, event.key === 'ArrowUp' ? 1 : -1); }
    });
    return input;
  }
  function step(input, delta) {
    if (input.disabled) return;
    input.value = String((Number(input.value) || 0) + delta);
    input.dispatchEvent(new Event('input', { bubbles: true })); input.focus();
  }
  function setupView(root, state) {
    const { kind } = state.def;
    root.querySelectorAll('[data-glyph]').forEach(glyph => {
      if (/eye/i.test(glyph.dataset.glyph)) {
        glyph.setAttribute('role', 'button'); glyph.setAttribute('aria-label', 'Показать или скрыть значение'); glyph.tabIndex = isDisabled(state) ? -1 : 0;
        const toggle = event => { event.stopPropagation(); const field = root.querySelector('input'); if (field && !field.disabled) { field.type = field.type === 'password' ? 'text' : 'password'; glyph.setAttribute('aria-pressed', String(field.type === 'password')); } };
        glyph.addEventListener('click', toggle); glyph.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(event); } });
      }
    });
    let slots = [...root.querySelectorAll('[data-edit-slot]')];
    if (kind === 'double') slots = slots.filter(el => el.dataset.text === '0');
    if (kind === 'commentbar') {
      const type = state.def.variants[state.index].props.Type || '';
      slots = type.startsWith('Active') ? [...root.querySelectorAll('[data-text]')].filter(el => el.dataset.text !== 'Комментарий') : [];
    }
    const inputs = slots.map((slot, i) => slotControl(slot, state, i));
    if (['number', 'double'].includes(kind)) inputs.forEach(input => {
      let box = input.parentElement.parentElement;
      while (box && box !== root && box.getBoundingClientRect().height > 32) box = box.parentElement;
      if (!box || box === root) box = input.parentElement.parentElement;
      for (const [direction, delta] of [['up', 1], ['down', -1]]) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'number-step'; button.dataset.direction = direction;
        button.setAttribute('aria-label', delta > 0 ? 'Увеличить' : 'Уменьшить'); button.disabled = input.disabled;
        button.addEventListener('pointerdown', event => event.preventDefault());
        button.addEventListener('click', event => { event.stopPropagation(); step(input, delta); }); box.append(button);
      }
    });
    if (['list', 'autocomplete'].includes(kind)) {
      root.setAttribute('role', 'listbox'); root.setAttribute('aria-label', kind === 'autocomplete' ? 'Подсказки автодополнения' : 'Варианты выбора');
      root.querySelectorAll('[data-option]').forEach((row, i) => {
        row.setAttribute('role', 'option'); row.setAttribute('aria-selected', 'false'); row.id = state.uid + '-option-' + i;
        row.addEventListener('pointerenter', () => activate(root, i));
        row.addEventListener('click', event => { event.stopPropagation(); select(root, i); });
      });
    }
    root.querySelectorAll('[data-nested-action]').forEach(button => {
      if (window.AltaButtonPrimary) AltaButtonPrimary.init(button);
      button.addEventListener('click', event => { event.stopPropagation(); emit(root, 'change', { value: 'Действие выполнено' }); });
    });
    if (kind === 'static' && state.def.name === 'AltaIDE_AutocompleteInfo') {
      const view = root.querySelector('.alta-view > .fn'); view.style.overflow = 'auto';
    }
  }
  function init(root) {
    if (states.has(root) || root.hasAttribute('data-static')) return;
    const def = definitions.get(root.dataset.component); if (!def) return;
    const index = Number(root.dataset.variant || def.defaultIndex);
    const state = { def, root, index, values: null, selected: -1, uid: 'alta-' + Math.random().toString(36).slice(2), painting: false, timer: null };
    states.set(root, state);
    if (def.kind !== 'static') root.tabIndex = /input|number|double|textarea/.test(def.kind) ? -1 : 0;
    if (def.kind === 'button') root.setAttribute('role', 'button');
    if (def.kind === 'option') { root.setAttribute('role', 'option'); root.setAttribute('aria-selected', 'false'); }
    if (def.kind === 'dropdown') { root.setAttribute('role', 'combobox'); root.setAttribute('aria-label', 'Выбор значения'); root.setAttribute('aria-haspopup', 'listbox'); root.setAttribute('aria-expanded', 'false'); }
    setupView(root, state);
    root.addEventListener('pointerenter', () => {
      if (isDisabled(state) || isBusy(state) || root.contains(document.activeElement)) return;
      choose(root, /invalid/i.test(stateName(state)) ? ['Hover_Invalid'] : /placeholder/i.test(stateName(state)) ? ['Hover_Placeholder', 'Hover'] : ['Hover', 'HoverFilled']);
    });
    root.addEventListener('pointerleave', () => {
      if (isDisabled(state) || isBusy(state) || root.contains(document.activeElement)) return;
      choose(root, /invalid/i.test(stateName(state)) ? ['Invalid'] : state.values && state.values.some(Boolean) ? ['Default_Filled', 'Default', 'Selected'] : ['Default_Placeholder', 'Default']);
    });
    root.addEventListener('pointerdown', event => { if (def.kind === 'button' && !isDisabled(state) && !isBusy(state)) { root.setPointerCapture(event.pointerId); choose(root, ['Pressed']); } });
    root.addEventListener('pointerup', event => {
      if (def.kind === 'button' && rootFor(event.target) === root && !isDisabled(state) && !isBusy(state)) {
        state.suppressClickUntil = performance.now() + 150; emit(root, 'activate', {});
      }
    });
    root.addEventListener('click', event => {
      if (def.kind === 'button' && performance.now() < (state.suppressClickUntil || 0)) return;
      if (isDisabled(state) || isBusy(state)) { event.preventDefault(); event.stopImmediatePropagation(); return; }
      if (def.kind === 'button') emit(root, 'activate', {});
      if (def.kind === 'dropdown') openPopup(root);
      if (def.kind === 'double' && !event.target.closest('.fn-edit, .number-step')) openPopup(root);
      if (def.kind === 'option') { root.setAttribute('aria-selected', 'true'); choose(root, ['Active', 'changing_focus']); emit(root, 'select', { value: root.textContent.trim() }); }
      if (def.kind === 'commentbar' && !event.target.closest('.fn-edit')) {
        const type = def.variants[state.index].props.Type || '';
        const next = type === 'Plus' ? 'Active' : type.endsWith('Open') ? type.replace('Open', '') : type + 'Open';
        const target = def.variants.findIndex(v => v.props.Type === next);
        if (target >= 0) { paint(root, target); const input = root.querySelector('.fn-edit'); if (input) input.focus(); emit(root, 'change', { value: next }); }
      }
    });
    root.addEventListener('keydown', event => {
      if (isDisabled(state) || isBusy(state)) { if (event.key === 'Enter' || event.key === ' ') event.preventDefault(); return; }
      if (event.target.closest('.fn-edit, button')) return;
      if (def.kind === 'button' && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); root.click(); }
      if (def.kind === 'option' && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); root.click(); }
      if (def.kind === 'commentbar' && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); root.click(); }
      if (def.kind === 'dropdown' && ['Enter', ' ', 'ArrowDown'].includes(event.key)) { event.preventDefault(); openPopup(root); }
      if (def.kind === 'list' || def.kind === 'autocomplete') {
        const rows = [...root.querySelectorAll('[data-option]')].filter(row => !row.hidden);
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); const current = rows.findIndex(row => row.dataset.active === 'true'); const next = (current + (event.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length; if (rows[next]) activate(root, [...root.querySelectorAll('[data-option]')].indexOf(rows[next])); }
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (state.selected >= 0) select(root, state.selected); }
      }
      if (event.key === 'Escape') closePopup(root);
    });
    root.addEventListener('focusout', event => { if (!root.contains(event.relatedTarget)) closePopup(root); });
  }
  function activate(root, index) {
    const state = states.get(root); if (!state) return; state.selected = index;
    root.querySelectorAll('[data-option]').forEach((row, i) => { row.dataset.active = String(i === index); row.classList.toggle('is-active', i === index); });
    const row = root.querySelectorAll('[data-option]')[index]; if (row) root.setAttribute('aria-activedescendant', row.id);
  }
  function select(root, index) {
    const row = root.querySelectorAll('[data-option]')[index]; if (!row) return;
    activate(root, index); row.setAttribute('aria-selected', 'true');
    emit(root, 'select', { value: row.textContent.trim(), index });
  }
  function closePopup(root) {
    const popup = root.querySelector(':scope > .alta-popup'); if (popup && !popup.dataset.closing) { popup.dataset.closing = 'true'; popup.remove(); }
    root.setAttribute('aria-expanded', 'false');
  }
  async function ensure(name, filebase) {
    if (definitions.has(name)) return definitions.get(name);
    if (!pending.has(name)) {
      let resolve; const promise = new Promise(r => { resolve = r; }); pending.set(name, { promise, resolve });
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '../' + name + '/' + filebase + '.css'; document.head.append(css);
      const script = document.createElement('script'); script.src = '../' + name + '/' + filebase + '.js'; script.onerror = () => resolve(null); document.body.append(script);
    }
    return pending.get(name).promise;
  }
  async function openPopup(root) {
    const state = states.get(root); if (!state || isDisabled(state) || isBusy(state)) return;
    if (root.querySelector(':scope > .alta-popup')) { closePopup(root); return; }
    const def = await ensure('AltaIDE_DropdownOpen', 'dropdown-open'); if (!def) return;
    const popup = document.createElement('div'); popup.className = 'alta-popup';
    const list = document.createElement('div'); list.className = 'alta-component'; list.dataset.component = def.name;
    const targetWidth = state.def.variants[state.index].props.Size === 'M' ? 'M' : 'L';
    const vi = def.variants.findIndex(v => v.props.Width === targetWidth && v.props.Scroll === 'No' && v.props.Button === 'No' && v.props.Type === 'WithDescription');
    list.dataset.variant = String(vi >= 0 ? vi : def.defaultIndex); list.innerHTML = '<div class="alta-view">' + def.variants[Number(list.dataset.variant)].html + '</div>';
    popup.append(list); root.append(popup); init(list); root.setAttribute('aria-expanded', 'true');
    list.addEventListener('alta-select', event => {
      event.stopPropagation(); const value = event.detail.value;
      state.values = [value]; choose(root, ['Selected', 'FocusedFilled']);
      const texts = [...root.querySelectorAll('[data-text]')].filter(el => el.dataset.text === 'Text');
      if (texts.length) texts[0].textContent = value.split('Read Coils')[0].trim();
      closePopup(root); root.focus(); emit(root, 'change', { value });
    }); list.focus();
  }
  function reset(root) {
    const state = states.get(root); if (!state) return;
    clearTimeout(state.timer); state.values = null; state.selected = -1; closePopup(root);
    paint(root, state.def.demoIndex, true);
    const search = document.querySelector('[data-demo-search]'); if (search) search.value = '';
  }
  function demo(root, output, resetButton) {
    if (!root) return; init(root); const state = states.get(root);
    resetButton.addEventListener('click', () => { reset(root); output.textContent = 'Попробуйте компонент'; });
    for (const type of ['change', 'select']) root.addEventListener('alta-' + type, event => { output.textContent = (type === 'select' ? 'Выбрано: ' : 'Значение: ') + String(event.detail.value ?? ''); });
    root.addEventListener('alta-activate', () => {
      if (state.timer) clearTimeout(state.timer);
      if (choose(root, ['Loading'])) {
        output.textContent = 'Выполняется…';
        state.timer = setTimeout(() => { choose(root, ['Default']); output.textContent = 'Действие выполнено'; state.timer = null; }, 1500);
      } else output.textContent = 'Действие выполнено';
    });
    const search = document.querySelector('[data-demo-search]');
    if (search) search.addEventListener('input', () => {
      let visible = 0;
      root.querySelectorAll('[data-option]').forEach(row => { row.hidden = !row.textContent.toLowerCase().includes(search.value.toLowerCase()); if (!row.hidden) visible++; });
      output.textContent = visible ? 'Найдено: ' + visible : 'Совпадений нет';
    });
    if (search) search.addEventListener('keydown', event => { if (event.key === 'ArrowDown') { event.preventDefault(); root.focus(); const rows = [...root.querySelectorAll('[data-option]')]; const i = rows.findIndex(row => !row.hidden); if (i >= 0) activate(root, i); } });
  }
  window.AltaUI = { register, init, demo, reset, setVariant(root, index) { paint(root, index); }, getDefinition(name) { return definitions.get(name); } };
  document.addEventListener('pointerdown', event => { document.querySelectorAll('.alta-component[aria-expanded="true"]').forEach(root => { if (!root.contains(event.target)) closePopup(root); }); });
})();
