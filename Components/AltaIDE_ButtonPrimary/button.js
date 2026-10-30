/* Reusable behavior. No requests, timers, or demo actions in this file. */
(function () {
  'use strict';
  const initialized = new WeakSet();
  function sync(button) {
    const state = button.disabled ? 'Disabled' : button.dataset.state || 'Default';
    const busy = state === 'Loading';
    if (busy) { button.setAttribute('aria-busy', 'true'); button.setAttribute('aria-disabled', 'true'); }
    else { button.removeAttribute('aria-busy'); button.removeAttribute('aria-disabled'); }
    const size = (button.dataset.size || 'Large').toLowerCase();
    const assetState = state === 'Loading' ? 'Default' : state;
    button.querySelectorAll('[data-asset-state]').forEach(img => img.classList.toggle('is-current', img.dataset.assetState === assetState));
    return busy;
  }
  function blocked(button) { return button.disabled || button.dataset.state === 'Loading' || button.hasAttribute('data-static'); }
  function init(root = document) {
    const buttons = [...root.querySelectorAll('.alta-button')];
    if (root.matches && root.matches('.alta-button')) buttons.unshift(root);
    buttons.forEach(button => {
      if (initialized.has(button)) return;
      initialized.add(button); sync(button);
      button.addEventListener('click', e => { if (blocked(button)) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
      button.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && blocked(button)) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
      ['pointerenter', 'pointerleave', 'pointerdown', 'pointerup', 'pointercancel', 'blur'].forEach(event => button.addEventListener(event, () => {
        if (blocked(button)) return;
        const state = event === 'pointerdown' ? 'Pressed' : event === 'pointerenter' || event === 'pointerup' ? 'Hover' : 'Default';
        button.querySelectorAll('[data-asset-state]').forEach(img => img.classList.toggle('is-current', img.dataset.assetState === state));
      }));
      new MutationObserver(() => sync(button)).observe(button, { attributes: true, attributeFilter: ['data-state', 'disabled'] });
    });
  }
  function setLoading(button, loading) { if (!button || button.disabled) return; button.dataset.state = loading ? 'Loading' : 'Default'; sync(button); }
  window.AltaButtonPrimary = { init, setLoading };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init()); else init();
})();
