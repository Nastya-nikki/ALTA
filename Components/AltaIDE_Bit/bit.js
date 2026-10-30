/* Binary values and Hover are the only visual states in Figma. */
(function(){
function init(root=document){root.querySelectorAll('.alta-bit:not([data-static])').forEach((button,index)=>{if(button.dataset.ready)return;button.dataset.ready='true';button.setAttribute('aria-label','Бит '+(index+1));button.setAttribute('aria-pressed',String(button.dataset.value==='1'));button.addEventListener('click',()=>{set(button,button.dataset.value==='1'?'0':'1');button.dispatchEvent(new CustomEvent('alta-bit-change',{bubbles:true,detail:{value:Number(button.dataset.value)}}));});});}
function set(button,value){button.dataset.value=String(value);button.querySelector('span').textContent=String(value);button.setAttribute('aria-pressed',String(value===1||value==='1'));}
window.AltaBit={init,set};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init());else init();})();
