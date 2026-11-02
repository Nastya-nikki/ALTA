/* Local screen behavior. Component implementations and styles come from ../../Components/. */
(() => {
  const rows=[...document.querySelectorAll('[data-shell="AltaIDE_TreeLevels"]')];
  const state=row=>AltaShell.definitions.get(row.dataset.shell).variants[Number(row.dataset.variant)].props;
  const original=new Map(rows.map(row=>[row,row.firstElementChild.style.background]));
  const select=row=>rows.forEach(other=>{const selected=other===row;other.setAttribute('aria-selected',String(selected));other.firstElementChild.style.background=selected?'var(--shell-treelevels-background-active)':'var(--shell-treelevels-background-default)';});
  const fold=(row,closed)=>{const at=rows.indexOf(row),level=Number(state(row).Level);row.setAttribute('aria-expanded',String(!closed));for(let i=at+1;i<rows.length&&Number(state(rows[i]).Level)>level;i++)rows[i].hidden=closed;};
  rows.forEach((row,i)=>{row.tabIndex=i===0?0:-1;row.setAttribute('role','treeitem');row.setAttribute('aria-label',row.querySelector('[data-source-text]')?.textContent||'');row.setAttribute('aria-level',state(row).Level);row.setAttribute('aria-selected',String(state(row).State==='Active'));if(state(row).Type==='With Arrow')row.setAttribute('aria-expanded','true');row.addEventListener('click',e=>{select(row);if(e.target.closest('[data-shell="AltaIDE_IconArrowStroke"],[data-name="AltaIDE/Icons/Arrow/Stroke"]'))fold(row,row.getAttribute('aria-expanded')!=='false');});row.addEventListener('keydown',e=>{if(!['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Enter',' '].includes(e.key))return;e.preventDefault();if(['Enter',' '].includes(e.key))select(row);else if(['ArrowLeft','ArrowRight'].includes(e.key))fold(row,e.key==='ArrowLeft');else{const visible=rows.filter(x=>!x.hidden);visible[Math.max(0,Math.min(visible.length-1,visible.indexOf(row)+(e.key==='ArrowDown'?1:-1)))].focus();}});});
  document.querySelectorAll('[data-shell="AltaIDE_MenuLink"],[data-shell="AltaIDE_IconToolbarsTBTop"]').forEach(el=>{el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',el.textContent.trim()||AltaShell.definitions.get(el.dataset.shell).variants[Number(el.dataset.variant)].props.Type);el.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();el.click();}});});
  const sidebar=document.querySelector('[data-name="AltaIDE/Sidebar"]'),separator=document.querySelector('[data-node-id="21247:489928"]');
  if(sidebar&&separator){separator.tabIndex=0;separator.setAttribute('role','separator');separator.setAttribute('aria-orientation','vertical');separator.setAttribute('aria-label','Ширина дерева проекта');const resize=value=>{value=Math.max(180,Math.min(innerWidth-280,value));document.documentElement.style.setProperty('--sidebar-width',value+'px');separator.setAttribute('aria-valuenow',value);};separator.addEventListener('pointerdown',e=>{separator.setPointerCapture(e.pointerId);separator.dataset.drag='true';});separator.addEventListener('pointermove',e=>{if(separator.dataset.drag)resize(e.clientX);});separator.addEventListener('pointerup',()=>delete separator.dataset.drag);separator.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();resize(sidebar.getBoundingClientRect().width+(e.key==='ArrowRight'?10:-10));}});}
})();

/* Контекстное меню дерева проекта: правый клик, Shift+F10 или клавиша меню на строке. #context-menu открывает меню на PRG_1 в положении из макета. */
(() => {
  const menu=document.querySelector('[data-name="AltaIDE/ContextMenu"]');
  if(!menu)return;
  const rows=[...document.querySelectorAll('[data-shell="AltaIDE_TreeLevels"]')];
  const items=[...menu.querySelectorAll('[data-shell="AltaIDE_ContextMenuItem"]')];
  let owner=null;
  /* При смене состояния (Hover) пункт перерисовывается из варианта компонента, и вложенный Shortcut получает текст по умолчанию — возвращаем текст экземпляра. */
  items.forEach(item=>{const key=item.querySelector('[data-text-prop="Code Text#185707:0"]')?.textContent;if(!key)return;const keep=()=>{const slot=item.querySelector('[data-text-prop="Code Text#185707:0"]');if(slot&&slot.textContent!==key){const control=slot.closest('.alta-control');if(window.AltaControls?.setProperties)AltaControls.setProperties(control,{'Code Text#185707:0':key});if(slot.isConnected&&slot.textContent!==key)slot.textContent=key;}};new MutationObserver(keep).observe(item,{childList:true,subtree:true,characterData:true});});
  const close=(restore=true)=>{if(menu.hidden)return;menu.hidden=true;owner?.removeAttribute('data-context-open');if(restore)owner?.focus();owner=null;};
  const open=(row,x,y)=>{close(false);owner=row;row.setAttribute('data-context-open','');menu.hidden=false;const w=menu.offsetWidth,h=menu.offsetHeight;menu.style.left=Math.max(0,Math.min(x,innerWidth-w))+'px';menu.style.top=Math.max(0,Math.min(y,innerHeight-h))+'px';};
  const focusItem=i=>{const n=items.length;items[((i%n)+n)%n].focus();};
  rows.forEach(row=>{
    row.addEventListener('contextmenu',e=>{e.preventDefault();open(row,e.clientX+24,row.getBoundingClientRect().top-4);});
    row.addEventListener('keydown',e=>{if(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')){e.preventDefault();const r=row.getBoundingClientRect();open(row,r.left+r.width/2,r.bottom);focusItem(0);}});
  });
  items.forEach((item,i)=>{
    item.addEventListener('click',()=>close());
    item.addEventListener('keydown',e=>{const k=e.key;if(k==='ArrowDown'||k==='ArrowUp'){e.preventDefault();focusItem(i+(k==='ArrowDown'?1:-1));}else if(k==='Home'||k==='End'){e.preventDefault();focusItem(k==='Home'?0:items.length-1);}else if(k==='Enter'||k===' '){e.preventDefault();close();}else if(k==='Escape'||k==='Tab'){e.preventDefault();close();}});
  });
  document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target))close(false);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  addEventListener('resize',()=>close(false));
  if(location.hash==='#context-menu'){const row=rows.find(r=>r.querySelector('[data-source-text]')?.textContent==='PRG_1');if(row)open(row,219,212);}
})();
