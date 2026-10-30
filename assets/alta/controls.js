/* Figma-backed controls: only registered, existing combinations are selected. */
(() => {
  'use strict';
  const definitions=new Map(),live=new WeakMap();
  const nativeKinds=new Set(['Radio','RadioLabel','Toggle','ToggleLabel','Checkbox','CheckboxLabel']);
  const own=(root,selector)=>[...root.querySelectorAll(selector)].filter(el=>el.closest('.alta-control')===root);
  function state(root){return live.get(root);}
  function register(def){definitions.set(def.name,def);document.querySelectorAll('[data-control="'+def.name+'"]').forEach(init);}
  function config(root){const s=state(root);return s.def.variants[s.index].props;}
  function disabled(root){const p=config(root);return /^(Disabled|Disable)$/.test(p.State||'');}
  function selected(root){const p=config(root);return p.Selected==='On'||p.Checked==='True'||p.Type==='Checked'||p.Type==='Indeterminate';}
  function announce(root,detail={}){root.dispatchEvent(new CustomEvent('alta-control-change',{bubbles:true,detail:{component:root.dataset.control,props:{...config(root)},...detail}}));}
  function choose(root,changes={},phase='base'){
    const s=state(root),p={...config(root),...changes};const candidates=s.def.variants.map((v,i)=>({v,i})).filter(({v})=>Object.entries(p).every(([k,val])=>k==='State'||v.props[k]===val));
    const explicit=Object.prototype.hasOwnProperty.call(changes,'State');const priorities=explicit?[changes.State]:s.pinned?[s.pinned]:phase==='hover'?['Hovered','Hover']:phase==='focus'?['Focused']:phase==='press'?['Pressed']:['Default','Active','Filled'];
    let found;for(const st of priorities){found=candidates.find(({v})=>v.props.State===st);if(found)break;}
    if(!found&&phase!=='base'&&!explicit)return;
    found=found||candidates.find(({v})=>!v.props.State)||candidates.find(({v})=>!['Disabled','Disable','Invalid'].includes(v.props.State))||candidates[0];
    if(found)paint(root,found.i);
  }
  function properties(root){
    const s=state(root);for(const [key,value]of Object.entries(s.props)){
      const property=s.def.properties[key];if(!property)continue;
      if(property.type==='BOOLEAN')own(root,'[data-visible-prop]').filter(el=>el.dataset.visibleProp===key).forEach(el=>el.hidden=!value);
      if(property.type==='TEXT'){
        let slots=own(root,'[data-text-prop]').filter(el=>el.dataset.textProp===key);
        if(!slots.length)slots=own(root,'[data-source-text]').filter(el=>el.dataset.sourceText===property.defaultValue);
        slots.forEach(el=>{if(el.tagName==='TEXTAREA'){if(config(root).State==='Default')el.placeholder=value;else el.value=value;}else{el.textContent=value;if(el.dataset.textResize==='hug'){el.style.width='max-content';el.style.height='auto';}else if(el.dataset.textResize==='height')el.style.height='auto';}});
      }
    }
  }
  function sync(root){
    const s=state(root),p=config(root);root.dataset.variant=s.index;
    if(nativeKinds.has(s.def.kind)){
      root.disabled=disabled(root);const checked=p.Type==='Indeterminate'?'mixed':String(selected(root));root.setAttribute('aria-checked',checked);root.dataset.figmaFocus=String(p.State==='Focused');
    }
    properties(root);root.querySelectorAll('.alta-control').forEach(init);
    if(s.def.kind==='RadioSet')roving(root);
    if(s.def.kind==='ProgressBar')wireProgress(root);if(s.def.kind==='LineLoader'){root.setAttribute('role','progressbar');root.setAttribute('aria-label','Выполнение');if(p.Type==='Progress_Loader'){const track=root.firstElementChild,fill=track?.firstElementChild;if(track&&fill){root.setAttribute('aria-valuemin','0');root.setAttribute('aria-valuemax','100');root.setAttribute('aria-valuenow',String(Math.round(fill.getBoundingClientRect().width/track.getBoundingClientRect().width*100)));}}else root.removeAttribute('aria-valuenow');}
  }
  function morph(current,next){if(current.nodeType===3){if(current.textContent!==next.textContent)current.textContent=next.textContent;return;}for(const a of [...current.attributes])if(!next.hasAttribute(a.name))current.removeAttribute(a.name);for(const a of [...next.attributes])if(current.getAttribute(a.name)!==a.value)current.setAttribute(a.name,a.value);const old=[...current.childNodes],fresh=[...next.childNodes];for(let i=0;i<fresh.length;i++){if(!old[i])current.append(fresh[i].cloneNode(true));else if(old[i].nodeType!==fresh[i].nodeType||old[i].nodeName!==fresh[i].nodeName)old[i].replaceWith(fresh[i].cloneNode(true));else morph(old[i],fresh[i]);}for(let i=fresh.length;i<old.length;i++)old[i].remove();}
  function paint(root,index){
    const s=state(root);if(!s||!s.def.variants[index]||s.index===index)return;
    if(s.def.kind==='Textarea'){
      const current=root.querySelector('textarea');const tpl=document.createElement('template');tpl.innerHTML=s.def.variants[index].html;const next=tpl.content.querySelector('textarea');
      if(current&&next){const value=current.value;root.firstElementChild.className=tpl.content.firstElementChild.className;current.className=next.className;current.disabled=next.disabled;current.placeholder=next.placeholder;current.value=value;const handle=root.querySelector('[data-resize]');if(handle)handle.disabled=next.disabled;const img=root.querySelector('[data-resize] img'),newImg=tpl.content.querySelector('[data-resize] img');if(img&&newImg)img.src=newImg.getAttribute('src');s.index=index;root.dataset.variant=index;return;}
    }
    s.index=index;if(nativeKinds.has(s.def.kind)){const template=document.createElement('template');template.innerHTML=s.def.variants[index].html;morph(root.firstElementChild,template.content.firstElementChild);}else root.innerHTML=s.def.variants[index].html;sync(root);
  }
  function roving(root){const children=[...root.querySelectorAll('.alta-control[role="radio"]')].filter(el=>!el.closest('[hidden]')&&!el.disabled),current=children.find(el=>el.getAttribute('aria-checked')==='true')||children[0];children.forEach(el=>el.tabIndex=el===current?0:-1);}
  function activate(root){
    const s=state(root);if(disabled(root))return;
    if(s.def.kind.startsWith('Radio')){
      choose(root,{Selected:'On'},root.matches(':focus-visible')?'focus':'base');const group=root.parentElement.closest('.alta-control[role="radiogroup"]');
      if(group){group.querySelectorAll('.alta-control[role="radio"]').forEach(other=>{if(other!==root&&state(other))choose(other,{Selected:'Off'});});roving(group);}
    }else if(s.def.kind.startsWith('Toggle'))choose(root,{Checked:selected(root)?'False':'True'});
    else if(s.def.kind.startsWith('Checkbox'))choose(root,{Type:config(root).Type==='Indeterminate'?'Checked':selected(root)?'Unchecked':'Checked'});
    announce(root,{checked:root.getAttribute('aria-checked')});
  }
  function wireTextarea(root){
    const s=state(root);root.addEventListener('focusin',event=>{if(event.target.tagName==='TEXTAREA'&&!event.target.disabled)choose(root,{},'press');});
    root.addEventListener('focusout',event=>{if(event.target.tagName==='TEXTAREA'&&!event.target.disabled)choose(root,{State:event.target.value?'Filled':'Default'});});
    root.addEventListener('input',event=>{if(event.target.tagName==='TEXTAREA')announce(root,{value:event.target.value});});
    root.addEventListener('pointerdown',event=>{
      const handle=event.target.closest('[data-resize]');if(!handle||root.querySelector('textarea').disabled)return;event.preventDefault();const rect=root.getBoundingClientRect();s.resize={x:event.clientX,y:event.clientY,w:rect.width,h:rect.height};root.setPointerCapture(event.pointerId);
    });
    root.addEventListener('pointermove',event=>{if(!s.resize)return;const w=Math.max(40,s.resize.w+event.clientX-s.resize.x),h=Math.max(30,s.resize.h+event.clientY-s.resize.y);root.dataset.resized='';root.style.width=w+'px';root.style.height=h+'px';});
    root.addEventListener('pointerup',()=>{s.resize=null;});root.addEventListener('pointercancel',()=>{s.resize=null;});
    root.addEventListener('keydown',event=>{if(root.querySelector('textarea').disabled||!event.target.closest('[data-resize]')||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const r=root.getBoundingClientRect();root.dataset.resized='';root.style.width=Math.max(40,r.width+(event.key==='ArrowRight'?10:event.key==='ArrowLeft'?-10:0))+'px';root.style.height=Math.max(30,r.height+(event.key==='ArrowDown'?10:event.key==='ArrowUp'?-10:0))+'px';});
  }
  function setProgress(root,value){
    const s=state(root);if(!s)return;const bar=root.querySelector('[data-control="AltaIDE_LineLoader"]')||root;const track=bar.firstElementChild;const fill=track?.firstElementChild;if(!fill)return;const max=track.getBoundingClientRect().width;const n=Math.max(0,Math.min(1,Number(value)));fill.style.width=max*n+'px';fill.style.left='0px';fill.style.right='auto';bar.setAttribute('role','progressbar');bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');bar.setAttribute('aria-valuenow',String(Math.round(n*100)));bar.setAttribute('aria-label','Выполнение');s.progress=n;
  }
  function wireProgress(root){const s=state(root);if(!s||s.def.kind!=='ProgressBar')return;const line=root.querySelector('[data-control="AltaIDE_LineLoader"]');const track=line?.firstElementChild,fill=track?.firstElementChild;if(track&&fill&&s.progress===undefined)s.progress=fill.getBoundingClientRect().width/track.getBoundingClientRect().width;if(track&&fill)setProgress(root,s.progress);}
  function init(root){
    if(live.has(root)||root.hasAttribute('data-visual-only')||root.hasAttribute('data-static')||root.closest('[data-static]'))return;
    const def=definitions.get(root.dataset.control);if(!def)return;const index=Number(root.dataset.variant)||0,s={def,index,initial:index,html:root.innerHTML,props:{},initialProps:{}};live.set(root,s);
    const initial=def.variants[index]?.props||{};if(['Disabled','Disable','Invalid'].includes(initial.State))s.pinned=initial.State;
    sync(root);
    if(nativeKinds.has(def.kind)){
      root.addEventListener('pointerenter',()=>{if(!disabled(root))choose(root,{},'hover');});root.addEventListener('pointerleave',()=>{if(!disabled(root))choose(root,{},root.matches(':focus-visible')?'focus':'base');});
      root.addEventListener('pointerdown',()=>{if(!disabled(root))choose(root,{},'press');});root.addEventListener('pointerup',()=>{if(!disabled(root))choose(root,{},'hover');});
      root.addEventListener('focus',()=>{if(!disabled(root))choose(root,{},'focus');});root.addEventListener('blur',()=>{if(!disabled(root))choose(root);});root.addEventListener('click',()=>activate(root));
    }
    if(def.kind==='RadioSet')root.addEventListener('keydown',event=>{const keys=['ArrowLeft','ArrowUp','ArrowRight','ArrowDown','Home','End'];if(!keys.includes(event.key))return;const children=[...root.querySelectorAll('.alta-control[role="radio"]')].filter(el=>!el.closest('[hidden]')&&!el.disabled);const at=children.indexOf(event.target);if(at<0)return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?children.length-1:(at+(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1)+children.length)%children.length;children[next].click();children[next].focus();});
    if(def.kind==='Textarea')wireTextarea(root);
    if(def.kind==='ProgressBar')root.addEventListener('click',event=>{if(event.target.closest('[data-stop]')){clearInterval(s.timer);s.timer=null;announce(root,{stopped:true,value:Math.round(s.progress*100)});}});
  }
  function setProperties(root,values){
    init(root);const s=state(root);if(!s)return;const changes={};
    for(const [key,value]of Object.entries(values)){const property=s.def.properties[key];if(!property)throw new Error('Unknown Figma property '+key);if(property.type==='VARIANT'){if(!property.variantOptions.includes(value))throw new Error('Unknown Figma value '+key+'='+value);changes[key]=value;}else s.props[key]=value;}
    const match=s.def.variants.findIndex(v=>Object.entries({...config(root),...changes}).every(([key,value])=>v.props[key]===value));if(Object.keys(changes).length&&match<0)throw new Error('This combination does not exist in Figma');
    if('State'in changes)s.pinned=['Disabled','Disable','Invalid'].includes(changes.State)?changes.State:null;
    if(match>=0&&match!==s.index)paint(root,match);properties(root);announce(root);
  }
  function reset(root){const s=state(root);if(!s)return;clearInterval(s.timer);s.timer=null;s.index=s.initial;s.props={};s.progress=undefined;s.resize=null;s.pinned=['Disabled','Disable','Invalid'].includes(s.def.variants[s.initial].props.State)?s.def.variants[s.initial].props.State:null;delete root.dataset.resized;root.style.removeProperty('width');root.style.removeProperty('height');root.innerHTML=s.html;sync(root);if(s.def.kind==='Textarea'){const textarea=root.querySelector('textarea');if(textarea)textarea.disabled=config(root).State==='Disabled';}}
  function demo(root,output,button){
    init(root);const s=state(root);root.addEventListener('alta-control-change',event=>{const d=event.detail;output.textContent=d.stopped?'Остановлено: '+d.value+'%':typeof d.value==='string'?'Значение: '+d.value:d.checked==='mixed'?'Промежуточное значение':d.checked!==undefined?'Выбрано: '+(d.checked==='true'?'да':'нет'):'Значение изменено';});
    function start(){if(s.def.kind!=='ProgressBar')return;clearInterval(s.timer);s.timer=setInterval(()=>{const next=Math.min(1,(s.progress||0)+.01);setProgress(root,next);output.textContent='Прогресс: '+Math.round(next*100)+'%';if(next>=1){clearInterval(s.timer);s.timer=null;}},400);}
    start();button.addEventListener('click',()=>{reset(root);output.textContent='Попробуйте компонент';start();});
  }
  document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('.alta-control').forEach(init);document.querySelectorAll('.alta-control[data-static] button,.alta-control[data-static] a,.alta-control[data-static] textarea,.alta-control[data-static] [tabindex]').forEach(el=>el.tabIndex=-1);});
  window.AltaControls={register,init,demo,reset,setProperties,setProgress,getDefinition:name=>definitions.get(name)};
})();
