/* Swar-Sadhika Queue Entry UI — Part 2
 * Adds a direct text editor to the 9:16 Studio and forwards input to the
 * existing, canonical queue controller. No duplicate queue or TTS engine.
 */
const STYLE_ID='ss-queue-entry-part2-style';
const ROOT_ID='ss-queue-entry-part2';
const INSTALLED='__swarSadhikaQueueEntryPart2';

export function registerSwarSadhikaModule(api){
  if(typeof document!=='object') return {installed:false,reason:'document-unavailable'};
  if(window[INSTALLED]) return window[INSTALLED].status;
  const controls=document.querySelector('#panel-studio .stage-controls');
  const source=document.getElementById('text-input');
  const add=document.getElementById('queue-add');
  if(!controls||!source||!add) throw new Error('9:16 Studio या मौजूदा पाठ-कतार के आवश्यक controls उपलब्ध नहीं हैं।');
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent='#'+ROOT_ID+'{display:grid;gap:8px;margin:4px 0 10px;padding:12px;border:1px solid #c8d8ed;border-radius:11px;background:#f7faff}#'+ROOT_ID+' label{font-weight:800;font-size:.9rem}#'+ROOT_ID+' textarea{display:block;width:100%;min-height:118px;box-sizing:border-box;padding:11px;border:1px solid #9fb5d2;border-radius:9px;background:#fff;color:#17243a;font:inherit;line-height:1.8;resize:vertical}#'+ROOT_ID+' .ss-queue-hint{font-size:.78rem;color:#53647b}#'+ROOT_ID+' button{min-height:44px;padding:10px 14px;border:1px solid #174d91;border-radius:9px;background:#174d91;color:#fff;font-weight:800}#'+ROOT_ID+' button:disabled{opacity:.55}';
  document.head.append(style);
  const box=document.createElement('div');
  box.id=ROOT_ID;
  box.innerHTML='<label for="ss-queue-entry-text">यहाँ अपना संस्कृत / हिंदी पाठ लिखें</label><textarea id="ss-queue-entry-text" lang="sa-Deva" spellcheck="false" placeholder="यहाँ मंत्र, श्लोक या स्तोत्र लिखें…&#10;हर पंक्ति अलग लिख सकते हैं।"></textarea><div class="ss-queue-hint">लिखा हुआ पाठ नीचे दी गई मौजूदा वाचन-कतार में जोड़ा जाएगा।</div><button id="ss-queue-entry-add" type="button">＋ पाठ को कतार में जोड़ें</button>';
  const status=controls.querySelector('#play-status');
  controls.insertBefore(box,status||null);
  const editor=box.querySelector('#ss-queue-entry-text');
  const button=box.querySelector('#ss-queue-entry-add');
  const syncDisabled=()=>{button.disabled=add.disabled;};
  const syncInput=()=>{
    source.value=editor.value;
    source.dispatchEvent(new Event('input',{bubbles:true}));
  };
  const onInput=()=>syncInput();
  const onAdd=()=>{
    if(add.disabled)return;
    const text=editor.value;
    if(!text.trim()){
      editor.focus();
      editor.setCustomValidity('कृपया पहले इस बॉक्स में पाठ लिखें।');
      editor.reportValidity();
      editor.setCustomValidity('');
      return;
    }
    syncInput();
    add.click();
    if(source.value==='') editor.value='';
  };
  editor.addEventListener('input',onInput);
  button.addEventListener('click',onAdd);
  add.addEventListener('click',syncDisabled);
  const observer=new MutationObserver(syncDisabled);
  observer.observe(add,{attributes:true,attributeFilter:['disabled']});
  syncDisabled();
  const statusInfo=Object.freeze({installed:true,editorId:editor.id,queueTarget:'text-input'});
  Object.defineProperty(window,INSTALLED,{value:{status:statusInfo,cleanup:()=>{editor.removeEventListener('input',onInput);button.removeEventListener('click',onAdd);add.removeEventListener('click',syncDisabled);observer.disconnect();box.remove();style.remove();delete window[INSTALLED];}},configurable:true});
  api?.registerCleanup?.(()=>window[INSTALLED]?.cleanup?.());
  api?.emitStatus?.('9:16 Studio में सीधे पाठ लिखने और मौजूदा वाचन-कतार में जोड़ने की सुविधा सक्रिय है।','info');
  return statusInfo;
}
export const activateSwarSadhikaModule=registerSwarSadhikaModule;
export default registerSwarSadhikaModule;
