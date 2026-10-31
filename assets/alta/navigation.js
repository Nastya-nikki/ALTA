/* Local interactions for Figma navigation and notification components. No external mutations. */
(() => {
  'use strict';
  const definitions=new Map(),live=new WeakMap();
  const own=(root,selector)=>[...root.querySelectorAll(selector)].filter(el=>el.closest('.alta-navigation')===root);
  function emit(root,detail){root.dispatchEvent(new CustomEvent('alta-navigation-change',{bubbles:true,detail:{component:root.dataset.navigation,...detail}}));}
  function register(def){definitions.set(def.name,def);document.querySelectorAll('[data-navigation="'+def.name+'"]').forEach(init);}
  function nested(root){
    const widgetNames=new Set([...root.querySelectorAll('.alta-widget')].map(el=>el.dataset.widget));
    widgetNames.forEach(name=>{const def=window.AltaWidgets?.getDefinition(name);if(def)AltaWidgets.register(def);});
    root.querySelectorAll('.alta-component').forEach(el=>{
      window.AltaUI?.init(el);
      const label=el.dataset.instanceLabel;if(label){const restore=()=>el.querySelectorAll('[data-text]').forEach(text=>{if(text.textContent!==label)text.textContent=label;});restore();new MutationObserver(restore).observe(el,{childList:true,subtree:true});}
    });
    root.querySelectorAll('.alta-control').forEach(el=>{
      window.AltaControls?.init(el);
      if(el.dataset.instanceProps)AltaControls.setProperties(el,JSON.parse(el.dataset.instanceProps));
    });
    window.AltaButtonPrimary?.init(root);
  }
  function tabs(root,preferred=null){
    const all=[...root.querySelectorAll('.alta-widget[data-widget=AltaIDE_Tab]')];
    const visible=all.filter(el=>!el.hidden&&!el.firstElementChild.hidden);
    let selected=preferred&&visible.includes(preferred)?preferred:visible.find(el=>el.firstElementChild.getAttribute('aria-selected')==='true')||visible[0];
    root.firstElementChild.setAttribute('role','tablist');root.firstElementChild.setAttribute('aria-label','Вкладки');
    all.forEach((el,i)=>{const tab=el.firstElementChild;tab.setAttribute('role','tab');tab.setAttribute('aria-selected',String(el===selected));tab.tabIndex=el===selected?0:-1;tab.setAttribute('aria-label',i===0?'Главная':'Вкладка '+i);const close=tab.querySelector('button');if(close)close.setAttribute('aria-label','Закрыть вкладку '+i);});
    return visible;
  }
  function applyProperties(root){
    const s=live.get(root);for(const [key,value]of Object.entries(s.props)){
      const p=s.def.properties[key];
      if(p.type==='BOOLEAN')own(root,'[data-visible-prop]').filter(el=>el.dataset.visibleProp===key).forEach(el=>{el.hidden=!value;if(el.parentElement.matches('.alta-widget'))el.parentElement.hidden=!value;});
      if(p.type==='TEXT'){
        let slots=own(root,'[data-text-prop]').filter(el=>el.dataset.textProp===key);
        if(!slots.length)slots=own(root,'[data-source-text]').filter(el=>el.dataset.sourceText===p.defaultValue);
        slots.forEach(el=>{el.textContent=value;if(el.dataset.textResize==='hug')el.style.width='max-content';else el.style.height='auto';});
      }
    }
    if(s.def.kind==='Tabs')tabs(root);
  }
  function paint(root,index){const s=live.get(root);s.index=index;root.dataset.variant=index;root.innerHTML=s.def.variants[index].html;applyProperties(root);nested(root);if(s.def.kind==='Tabs')tabs(root);}
  function setProperties(root,values){
    init(root);const s=live.get(root);if(!s)return;const changes={};
    for(const [key,value]of Object.entries(values)){
      const p=s.def.properties[key];if(!p)throw new Error('Unknown Figma property '+key);
      if(p.type==='VARIANT'){if(!p.variantOptions.includes(value))throw new Error('Unknown Figma value '+key+'='+value);changes[key]=value;}
      else{if(p.type==='BOOLEAN'&&typeof value!=='boolean')throw new TypeError(key+' must be boolean');if(p.type==='TEXT'&&typeof value!=='string')throw new TypeError(key+' must be text');s.props[key]=value;}
    }
    const config={...s.def.variants[s.index].props,...changes};const index=s.def.variants.findIndex(v=>Object.entries(config).every(([k,vv])=>v.props[k]===vv));
    if(index<0)throw new Error('This combination does not exist in Figma');
    if(index!==s.index)paint(root,index);else applyProperties(root);
  }
  function setResize(root,value){
    const s=live.get(root);s.value=Math.max(100,Math.min(1000,Number(value)||100));const handle=root.querySelector('[role=separator]');handle.setAttribute('aria-valuenow',s.value);
    if(s.target)s.target.style[handle.getAttribute('aria-orientation')==='vertical'?'width':'height']=s.value+'px';
    emit(root,{value:s.value,message:'Размер области: '+s.value+' px'});
  }
  function init(root){
    if(live.has(root)||root.hasAttribute('data-static'))return;
    const def=definitions.get(root.dataset.navigation);if(!def)return;
    const index=Number(root.dataset.variant)||0,s={def,index,initial:index,props:{},value:300};live.set(root,s);nested(root);
    if(def.kind==='Tabs')tabs(root);
    if(def.kind==='Notification')root.firstElementChild.setAttribute('role','group');
    if(def.kind==='TabsVertical'){root.firstElementChild.setAttribute('role','toolbar');root.firstElementChild.setAttribute('aria-label','Вертикальные вкладки');}
    root.addEventListener('click',event=>{
      const actionNode=event.target.closest('[data-navigation-action]');
      const action=actionNode?.classList.contains('alta-component')?null:actionNode?.dataset.navigationAction;
      if(action){
        if(action==='close'||action==='confirm'||action==='cancel'){root.firstElementChild.hidden=true;emit(root,{action,message:action==='close'?'Уведомление закрыто':action==='confirm'?'Действие подтверждено (демонстрация)':'Действие отменено'});}
        else emit(root,{action,message:'Нажато действие '+(action==='action-a'?'A':'B')});
      }
      if(def.kind==='TabsVertical'){
        const item=event.target.closest('[data-vertical-tab]');if(item)emit(root,{message:'Выбрано: '+item.getAttribute('aria-label')});
      }
      if(def.kind==='Breadcrumbs'){event.preventDefault();setProperties(root,{State:'Active'});emit(root,{message:'Переход по навигационной цепочке (демонстрация)'});}
      if(def.kind==='Resize'){
        const step=event.target.closest('[data-resize-step]');if(step)setResize(root,s.value+Number(step.dataset.resizeStep));
      }
    });
    root.addEventListener('alta-activate',event=>{
      if(event.target.closest('[data-navigation-action=cancel]')){root.firstElementChild.hidden=true;emit(root,{action:'cancel',message:'Действие отменено'});}
    });
    root.addEventListener('alta-widget-change',event=>{
      if(def.kind!=='Tabs')return;
      const item=event.target.closest('.alta-widget[data-widget=AltaIDE_Tab]');if(!item)return;
      const closed=item.firstElementChild.hidden;
      if(closed)item.hidden=true;
      const available=tabs(root,closed?null:item);
      if(closed&&item.contains(document.activeElement))available.find(el=>el.firstElementChild.tabIndex===0)?.firstElementChild.focus();
      emit(root,{message:closed?'Вкладка закрыта':item.firstElementChild.getAttribute('aria-label'),count:available.length});
    });
    root.addEventListener('alta-link-activate',()=>emit(root,{message:'Нажата вложенная ссылка (демонстрация)'}));
    root.addEventListener('alta-control-change',event=>{if(event.detail.checked!==undefined)emit(root,{message:'Больше не спрашивать: '+(event.detail.checked==='true'?'да':'нет')});});
    root.addEventListener('keydown',event=>{
      if(def.kind==='Tabs'){
        const item=event.target.closest('.alta-widget[data-widget=AltaIDE_Tab]');if(!item||event.target.tagName==='BUTTON')return;
        if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
          event.preventDefault();const items=tabs(root),i=items.indexOf(item),next=event.key==='Home'?0:event.key==='End'?items.length-1:(i+(event.key==='ArrowRight'?1:-1)+items.length)%items.length;tabs(root,items[next]);items[next]?.firstElementChild.focus();
        }
        if(event.key==='Delete'){event.preventDefault();item.hidden=true;const items=tabs(root);items.find(el=>el.firstElementChild.tabIndex===0)?.firstElementChild.focus();emit(root,{message:'Вкладка закрыта'});}
      }
      if(def.kind==='TabsVertical'&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
        event.preventDefault();const items=[...root.querySelectorAll('[data-vertical-tab]')].filter(el=>!el.hidden),i=items.indexOf(event.target);items[event.key==='Home'?0:event.key==='End'?items.length-1:(i+(event.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();
      }
      if(def.kind==='Resize'&&!event.target.closest('[data-resize-step]')&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)){
        event.preventDefault();setResize(root,event.key==='Home'?100:event.key==='End'?1000:s.value+(['ArrowRight','ArrowDown'].includes(event.key)?10:-10));
      }
    });
    if(def.kind==='Breadcrumbs'){
      root.addEventListener('pointerenter',()=>{s.beforeHover=s.def.variants[s.index].props.State;setProperties(root,{State:'Hover'});});
      root.addEventListener('pointerleave',()=>{if(s.def.variants[s.index].props.State==='Hover')setProperties(root,{State:s.beforeHover||'Default'});});
    }
    if(def.kind==='Resize'){
      root.addEventListener('pointerdown',event=>{if(event.target.closest('[data-resize-step]'))return;const handle=root.querySelector('[role=separator]');handle.focus();event.preventDefault();s.drag={x:event.clientX,y:event.clientY,value:s.value};root.setPointerCapture(event.pointerId);});
      root.addEventListener('pointermove',event=>{if(!s.drag)return;const vertical=root.querySelector('[role=separator]').getAttribute('aria-orientation')==='vertical';setResize(root,s.drag.value+Math.round(vertical?event.clientX-s.drag.x:event.clientY-s.drag.y));});
      root.addEventListener('pointerup',()=>s.drag=null);root.addEventListener('pointercancel',()=>s.drag=null);
    }
  }
  function reset(root){const s=live.get(root);if(!s)return;s.props={};s.value=300;s.drag=null;paint(root,s.initial);root.hidden=false;if(s.target)s.target.style[s.targetAxis]='300px';}
  function attachResize(root,target){init(root);const s=live.get(root);s.target=target;s.targetAxis=root.querySelector('[role=separator]').getAttribute('aria-orientation')==='vertical'?'width':'height';s.value=Math.round(target.getBoundingClientRect()[s.targetAxis]);root.querySelector('[role=separator]').setAttribute('aria-valuenow',s.value);}
  function demo(root,output,button){init(root);root.addEventListener('alta-navigation-change',event=>output.textContent=event.detail.message);button.addEventListener('click',()=>{reset(root);output.textContent='Попробуйте компонент';});}
  window.AltaNavigation={register,init,setProperties,reset,demo,attachResize,getDefinition:name=>definitions.get(name)};
  document.addEventListener('DOMContentLoaded',()=>document.querySelectorAll('.alta-navigation[data-static] button,.alta-navigation[data-static] a,.alta-navigation[data-static] [tabindex]').forEach(el=>el.tabIndex=-1));
})();
