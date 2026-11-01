/* Figma variant selection and local demonstration behavior. No network or external data changes. */
(() => {
  'use strict';
  const defs=new Map(),live=new WeakMap();
  const own=(root,selector)=>[...root.querySelectorAll(selector)].filter(el=>el.closest('.cfc-component')===root);
  function properties(root){const s=live.get(root);return {...s.def.variants[s.index].props};}
  function stateKey(s){return s.def.name==='AltaCFC_Node_Comments'?'Property 1':'State';}
  function emit(root,detail={}){root.dispatchEvent(new CustomEvent('alta-cfc-change',{bubbles:true,detail:{component:root.dataset.cfc,props:properties(root),...detail}}));}
  function register(def){
    const base=document.currentScript?.src;
    if(base)def.variants.forEach(v=>v.html=v.html.replace(/src="([^"]+)"/g,(_,src)=>'src="'+new URL(src,base).href+'"'));
    defs.set(def.name,def);document.querySelectorAll('[data-cfc="'+def.name+'"]').forEach(init);
  }
  function find(s,changes){const p={...s.def.variants[s.index].props,...changes};return s.def.variants.findIndex(v=>Object.entries(p).every(([k,val])=>v.props[k]===val));}
  function choose(root,names,extra={}){const s=live.get(root);for(const name of names){const i=find(s,{...extra,[stateKey(s)]:name});if(i>=0){paint(root,i);return true;}}return false;}
  function editor(root){
    const s=live.get(root),kind=s.def.kind;
    let slot;
    if(kind==='Comments')slot=own(root,'[data-source-text]').find(el=>el.dataset.sourceText!=='|')||own(root,'[data-source-text]')[0];
    else if(s.def.name.endsWith('Compact'))slot=own(root,'[data-source-text]').find(el=>/^\d/.test(el.dataset.sourceText));
    if(!slot)return;
    own(root,'[data-source-text]').filter(el=>el!==slot&&el.dataset.sourceText==='|').forEach(el=>el.remove());
    const field=document.createElement(kind==='Comments'?'textarea':'input');field.className=slot.className+' cfc-field';field.dataset.cfcEditor='';field.setAttribute('aria-label',kind==='Comments'?'Комментарий':'Значение узла');field.spellcheck=false;
    const source=slot.dataset.sourceText;
    if(kind==='Comments'){field.placeholder='Введите комментарий';field.value=s.value!==undefined?s.value:/^(Введите комментарий|\|)$/.test(source)?'':source;}
    else{field.type='text';field.inputMode='decimal';field.value=s.value!==undefined?s.value:source;field.style.width=Math.max(8,slot.getBoundingClientRect().width)+'px';field.size=1;}
    slot.replaceWith(field);
  }
  function setup(root){
    const s=live.get(root),p=properties(root),st=p[stateKey(s)]||'';
    root.dataset.sourceFocus=String(/Focused/.test(st));
    root.querySelectorAll('.cfc-component').forEach(init);
    if(root.dataset.instanceCaption)own(root,'[data-source-text]').forEach(el=>el.textContent=root.dataset.instanceCaption);
    if(s.def.kind==='Ports')root.setAttribute('aria-pressed',String(['Connected','Integers'].includes(s.semantic?.State||p.State)));
    if(s.def.kind==='Variable')root.setAttribute('aria-pressed',String(/^Selected/.test(st)));
    editor(root);
  }
  function paint(root,index,resetValue=false){
    const s=live.get(root);if(!s||index===s.index)return;
    const input=own(root,'[data-cfc-editor]')[0],focused=input===document.activeElement;
    const selection=focused?[input.selectionStart,input.selectionEnd]:null;
    if(input&&!resetValue)s.value=input.value;
    s.painting=true;s.index=index;root.dataset.variant=index;root.innerHTML=s.def.variants[index].html;setup(root);
    let next=own(root,'[data-cfc-editor]')[0];
    if(input&&next&&!resetValue){input.className=next.className;input.style.cssText=next.style.cssText;input.placeholder=next.placeholder;next.replaceWith(input);next=input;}
    if(focused&&next){next.focus({preventScroll:true});try{next.setSelectionRange(...selection);}catch{}}
    s.painting=false;
  }
  function portView(root,state){
    const s=live.get(root),semantic=s.semantic;
    const direct=s.def.variants.findIndex(v=>Object.entries({...semantic,State:state}).every(([k,val])=>v.props[k]===val));
    const common=s.def.variants.findIndex(v=>v.props.State===state&&v.props.Type==='All'&&v.props.Inversia===semantic.Inversia&&v.props.Error===semantic.Error);
    const i=direct>=0?direct:common;if(i>=0)paint(root,i);
  }
  function focusEditor(root,names){
    const s=live.get(root),field=own(root,'[data-cfc-editor]')[0];if(!field)return false;
    const index=names.map(name=>find(s,{[stateKey(s)]:name})).find(i=>i>=0);if(index===undefined)return false;
    const template=document.createElement('template');template.innerHTML=s.def.variants[index].html;
    const source=template.content.firstElementChild,current=root.firstElementChild;
    current.className=source.className;
    if(s.def.kind!=='Comments'&&current.firstElementChild&&source.firstElementChild)current.firstElementChild.className=source.firstElementChild.className;
    const strokes=[...current.querySelectorAll('.cfc-stroke')],sourceStrokes=[...source.querySelectorAll('.cfc-stroke')];
    strokes.forEach((stroke,i)=>{if(sourceStrokes[i])stroke.className=sourceStrokes[i].className;});
    const label=[...template.content.querySelectorAll('[data-source-text]')].find(el=>el.dataset.sourceText!=='|');
    if(label)field.className=label.className+' cfc-field';
    s.index=index;root.dataset.variant=index;root.dataset.sourceFocus='true';return true;
  }
  function init(root){
    if(live.has(root)||root.hasAttribute('data-static')||root.closest('[data-static]'))return;
    const def=defs.get(root.dataset.cfc);if(!def)return;
    const index=Number(root.dataset.variant)||0,s={def,index,initial:index,semantic:{...def.variants[index].props},value:undefined};live.set(root,s);setup(root);
    if(['Grid','NewPort','PortsInout','IconToolbar'].includes(def.kind))return;
    root.addEventListener('pointerenter',()=>{
      if(properties(root)[stateKey(s)]==='Error')return;
      if((def.kind==='Read'||def.kind==='Write')&&properties(root).State==='Add Variable')return;
      if(def.kind==='Ports'){portView(root,'Hover');return;}
      const st=properties(root)[stateKey(s)];if(def.kind==='Variable')choose(root,[/^Selected/.test(st)?'SelectedHover':'Hover']);
      else if(!/Focused/.test(st))choose(root,[st==='Selected'?'Selected Hover':'Hover']);
    });
    root.addEventListener('pointerleave',()=>{
      if(def.kind==='Ports'){const i=s.def.variants.findIndex(v=>Object.entries(s.semantic).every(([k,val])=>v.props[k]===val));if(i>=0)paint(root,i);return;}
      const st=properties(root)[stateKey(s)];if(/Focused|Error/.test(st)||root.contains(document.activeElement))return;
      choose(root,[/Selected/.test(st)?'Selected':st==='HoverInput'?'Default':'Default','Empty']);
    });
    root.addEventListener('focusin',event=>{
      if(s.painting||event.target.closest('.cfc-component')!==root||properties(root)[stateKey(s)]==='Error')return;
      if(event.target!==root&&event.target.closest('button'))return;
      if(def.kind==='Ports')portView(root,'Focused');
      else if(def.kind==='Comments')focusEditor(root,[s.value?'Selected Focused':'Focused']);
      else if(def.name.endsWith('Compact')&&event.target.matches('[data-cfc-editor]'))focusEditor(root,['Focused']);
      else if(def.kind!=='Variable')choose(root,['Focused']);
    });
    root.addEventListener('focusout',event=>{
      if(s.painting||root.contains(event.relatedTarget))return;
      if(def.kind==='Comments'){choose(root,[s.value?'Selected':'Default']);return;}
      if(def.kind==='Ports'){const i=s.def.variants.findIndex(v=>Object.entries(s.semantic).every(([k,val])=>v.props[k]===val));if(i>=0)paint(root,i);}
    });
    root.addEventListener('input',event=>{if(event.target.closest('.cfc-component')!==root||!event.target.matches('[data-cfc-editor]'))return;s.value=event.target.value;emit(root,{value:s.value,message:'Значение: '+s.value});});
    root.addEventListener('click',event=>{
      const action=event.target.closest('[data-toolbar-action]');if(def.kind==='Toolbar'&&action){emit(root,{action:action.dataset.toolbarAction,message:'Выбрано: '+action.dataset.toolbarAction});return;}
      if(event.target.closest('.cfc-component')!==root)return;
      const add=event.target.closest('[data-add-variable]');if(add){event.stopPropagation();const i=find(s,{Amount:'2',State:'Selected'});if(i>=0){paint(root,i);emit(root,{message:'Переменная добавлена (демонстрация)'});}return;}
      if(def.kind==='Ports'){
        const connected=['Connected','Integers'].includes(s.semantic.State),states=connected?['Unconnected']:['Connected','Integers'];
        for(const State of states){const p={...s.semantic,State},i=def.variants.findIndex(v=>Object.entries(p).every(([k,val])=>v.props[k]===val));if(i>=0){s.semantic={...p};paint(root,i);root.setAttribute('aria-pressed',String(!connected));emit(root,{connected:!connected,message:!connected?'Порт подключён (демонстрация)':'Порт отключён (демонстрация)'});break;}}return;
      }
      if(def.kind==='Variable'){choose(root,['Selected']);emit(root,{value:root.dataset.instanceCaption||root.textContent.trim(),message:'Переменная выбрана (демонстрация)'});return;}
      if(def.kind==='Read'||def.kind==='Write'){choose(root,['Selected','Focused']);emit(root,{message:'Переменная выбрана (демонстрация)'});return;}
      if(!event.target.matches('[data-cfc-editor]')){choose(root,['Focused']);root.focus({preventScroll:true});emit(root,{message:'Узел выбран'});}
    });
    root.addEventListener('alta-cfc-change',event=>{
      if((def.kind==='Read'||def.kind==='Write')&&event.target!==root&&event.target.dataset.cfc==='AltaCFC_Node_Variable'){
        choose(root,['Selected']);emit(root,{message:'Переменная выбрана (демонстрация)'});
      }
    });
    root.addEventListener('pointerover',event=>{
      if(event.target.closest('.cfc-component')!==root||properties(root)[stateKey(s)]==='Error'||root.contains(document.activeElement))return;
      if(def.name.endsWith('Compact')&&event.target.matches('[data-cfc-editor]'))choose(root,['HoverInput']);
      else if(event.target.matches('[data-source-text]')&&getComputedStyle(event.target).fontFamily.includes('JetBrains'))choose(root,['HoverVariable']);
    });
    root.addEventListener('keydown',event=>{
      if(event.target.closest('.cfc-component')!==root||event.target.matches('[data-cfc-editor]'))return;
      if((event.key==='Enter'||event.key===' ')&&root.tagName!=='BUTTON'&&!event.target.closest('button')){event.preventDefault();root.click();}
      if(event.key==='Escape'){event.preventDefault();reset(root);emit(root,{message:'Сброшено'});}
    });
    if(def.kind==='Read'||def.kind==='Write')root.addEventListener('pointermove',event=>{
      if(properties(root).Amount!=='1'||root.contains(document.activeElement))return;
      const rect=root.getBoundingClientRect(),near=event.clientY>rect.bottom-10;
      if(near)choose(root,['Add Variable']);else if(properties(root).State==='Add Variable')choose(root,['Selected']);
    });
  }
  function setProperties(root,changes){
    init(root);const s=live.get(root);if(!s)return;
    for(const[k,v]of Object.entries(changes)){const p=s.def.properties[k];if(!p||!p.variantOptions.includes(v))throw new Error('Unknown Figma property or value '+k+'='+v);}
    const i=find(s,changes);if(i<0)throw new Error('This combination does not exist in Figma');
    if(s.def.kind==='Ports')s.semantic={...s.def.variants[i].props};paint(root,i);
  }
  function reset(root){const s=live.get(root);if(!s)return;s.value=undefined;s.semantic={...s.def.variants[s.initial].props};s.index=-1;paint(root,s.initial,true);}
  function demo(root,output,button){init(root);root.addEventListener('alta-cfc-change',event=>{output.textContent=event.detail.message||'Значение изменено';});button.addEventListener('click',()=>{reset(root);output.textContent='Попробуйте компонент';});}
  window.AltaCFC={register,init,setProperties,reset,demo,getProperties:properties,getDefinition:name=>defs.get(name)};
  document.addEventListener('DOMContentLoaded',()=>document.querySelectorAll('.cfc-component[data-static] button,.cfc-component[data-static] [tabindex]').forEach(el=>el.tabIndex=-1));
})();
