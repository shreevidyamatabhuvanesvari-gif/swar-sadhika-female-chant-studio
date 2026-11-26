/* Swar-Sadhika Natural Mouth Renderer — Part 2
 * Replaces the oversized cartoon-like SVG mouth with a subtle lip aperture,
 * natural upper/lower vermilion contours and eased movement. Original engines
 * remain intact; this wraps only the public SwarSadhikaLipSync renderer.
 * Motion is still amplitude-reactive, not phoneme-accurate face synthesis.
 */
const ID='__swarSadhikaNaturalMouthPart2',SVG='http://www.w3.org/2000/svg',CX=650,CY=398;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
const node=(tag,attrs={})=>{const e=document.createElementNS(SVG,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));return e;};
function paths(a){
 const w=14.5+a*7.2,h=.45+a*7.1,x=CX,y=CY;
 const p=(n)=>Number(n).toFixed(2);
 const opening=`M ${p(x-w)} ${p(y)} C ${p(x-w*.72)} ${p(y-h*.92)} ${p(x-w*.28)} ${p(y-h*.86)} ${p(x-1.5)} ${p(y-h*.42)} C ${p(x+w*.30)} ${p(y-h*.88)} ${p(x+w*.72)} ${p(y-h*.92)} ${p(x+w)} ${p(y-.12)} C ${p(x+w*.68)} ${p(y+h*.78)} ${p(x+w*.28)} ${p(y+h*1.03)} ${p(x)} ${p(y+h)} C ${p(x-w*.30)} ${p(y+h*1.02)} ${p(x-w*.70)} ${p(y+h*.78)} ${p(x-w)} ${p(y)} Z`;
 const upper=`M ${p(x-w-1)} ${p(y)} C ${p(x-w*.70)} ${p(y-h*.76)} ${p(x-w*.29)} ${p(y-h*1.10)} ${p(x-2)} ${p(y-h*.48)} C ${p(x-.7)} ${p(y-h*.64)} ${p(x+.7)} ${p(y-h*.64)} ${p(x+2)} ${p(y-h*.48)} C ${p(x+w*.29)} ${p(y-h*1.10)} ${p(x+w*.70)} ${p(y-h*.76)} ${p(x+w+1)} ${p(y-.10)}`;
 const lower=`M ${p(x-w*.86)} ${p(y+h*.22)} C ${p(x-w*.60)} ${p(y+h*1.12)} ${p(x+w*.60)} ${p(y+h*1.12)} ${p(x+w*.86)} ${p(y+h*.22)}`;
 const highlight=`M ${p(x-w*.42)} ${p(y+h*.66)} Q ${p(x)} ${p(y+h*1.05)} ${p(x+w*.42)} ${p(y+h*.66)}`;
 const teeth=`M ${p(x-w*.47)} ${p(y-h*.06)} Q ${p(x)} ${p(y-h*.29)} ${p(x+w*.47)} ${p(y-h*.06)} L ${p(x+w*.36)} ${p(y+h*.22)} Q ${p(x)} ${p(y+h*.38)} ${p(x-w*.36)} ${p(y+h*.22)} Z`;
 return {opening,upper,lower,highlight,teeth,w,h};
}
function makeOverlay(svg){
 const defs=node('defs');
 const skin=node('linearGradient',{id:'ss-natural-mouth-skin',x1:'0',y1:'0',x2:'0',y2:'1'});
 const skinStops=[node('stop',{offset:'0','stop-color':'#dfb39d'}),node('stop',{offset:'.52','stop-color':'#d2a08b'}),node('stop',{offset:'1','stop-color':'#bc8574'})];skin.append(...skinStops);
 const cavity=node('linearGradient',{id:'ss-natural-mouth-cavity',x1:'0',y1:'0',x2:'0',y2:'1'});
 cavity.append(node('stop',{offset:'0','stop-color':'#29161b'}),node('stop',{offset:'.48','stop-color':'#47212a'}),node('stop',{offset:'1','stop-color':'#241318'}));
 const lip=node('linearGradient',{id:'ss-natural-lip-shade',x1:'0',y1:'0',x2:'0',y2:'1'});
 lip.append(node('stop',{offset:'0','stop-color':'#8d4855','stop-opacity':'.55'}),node('stop',{offset:'.55','stop-color':'#a65b68','stop-opacity':'.62'}),node('stop',{offset:'1','stop-color':'#703442','stop-opacity':'.42'}));
 const soften=node('filter',{id:'ss-natural-mouth-soften',x:'-35%',y:'-80%',width:'170%',height:'260%'});soften.append(node('feGaussianBlur',{stdDeviation:'2.1'}));
 defs.append(skin,cavity,lip,soften);svg.append(defs);
 const hiddenIds=['avatar-mouth-patch','avatar-mouth','avatar-teeth','avatar-upper-lip','avatar-lower-lip'];
 const previous=hiddenIds.map(id=>{const el=document.getElementById(id);const display=el?.style.display||'';if(el)el.style.display='none';return {el,display};});
 const group=node('g',{id:'ss-natural-mouth-group','pointer-events':'none'});
 const patch=node('ellipse',{cx:CX,cy:CY,rx:25.5,ry:13.5,fill:'url(#ss-natural-mouth-skin)',filter:'url(#ss-natural-mouth-soften)'});
 const shadow=node('path',{fill:'#552631','fill-opacity':'.12'});
 const aperture=node('path',{fill:'url(#ss-natural-mouth-cavity)'});
 const rim=node('path',{fill:'none',stroke:'url(#ss-natural-lip-shade)','stroke-width':'1.25','stroke-linecap':'round','stroke-linejoin':'round'});
 const teeth=node('path',{fill:'#eee1d2','fill-opacity':'.45'});
 const lower=node('path',{fill:'none',stroke:'#b96e78','stroke-opacity':'.36','stroke-width':'.9','stroke-linecap':'round'});
 const shine=node('path',{fill:'none',stroke:'#f0b1ae','stroke-opacity':'.15','stroke-width':'.7','stroke-linecap':'round'});
 group.append(patch,shadow,aperture,teeth,rim,lower,shine);svg.append(group);
 return {defs,skinStops,group,patch,shadow,aperture,rim,teeth,lower,shine,previous};
}
function registerSwarSadhikaModule(api){
 if(typeof window!=='object'||typeof document!=='object')return {installed:false};
 if(window[ID])return window[ID].status;
 const base=window.SwarSadhikaLipSync,svg=document.getElementById('avatar-mouth-layer');
 if(!base||typeof base.setLevel!=='function'||typeof base.drawToCanvas!=='function'||!svg)throw new Error('मौजूदा lip renderer या SVG mouth layer उपलब्ध नहीं है।');
 const els=makeOverlay(svg),oldDescriptor=Object.getOwnPropertyDescriptor(window,'SwarSadhikaLipSync');
 let filtered=0,target=0,lastTime=0;
 function smooth(raw){
  const now=Number(window.performance?.now?.())||Date.now(),dt=lastTime?clamp(now-lastTime,8,64):16.7;lastTime=now;
  const v=clamp(raw),norm=clamp((v-.025)/.72),next=Math.pow(norm,.84)*.62;
  target=next;const tau=next>filtered?64:118,alpha=1-Math.exp(-dt/tau);
  filtered+=(next-filtered)*alpha;if(filtered<.012)filtered=0;return filtered;
 }
 function paint(value){
  const a=clamp(value),q=paths(a),visible=clamp((a-.018)/.30)*.82,mask=clamp((a-.045)/.24)*.84;
  const photo=document.getElementById('avatar-default'),active=Boolean(photo&&photo.classList.contains('active')&&!svg.hidden);
  svg.style.opacity=active?'1':'0';els.group.setAttribute('opacity',active?'1':'0');
  els.patch.setAttribute('opacity',String(mask));
  els.shadow.setAttribute('d',q.opening);els.shadow.setAttribute('opacity',String(visible*.12));
  els.aperture.setAttribute('d',q.opening);els.aperture.setAttribute('opacity',String(visible));
  els.rim.setAttribute('d',q.upper);els.rim.setAttribute('opacity',String(clamp((a-.04)*1.9,0,.7)));
  els.lower.setAttribute('d',q.lower);els.lower.setAttribute('opacity',String(visible*clamp(.12+a*.34,0,.45)));
  els.teeth.setAttribute('d',q.teeth);els.teeth.setAttribute('opacity',String(clamp((a-.43)*.52,0,.20)));
  els.shine.setAttribute('d',q.highlight);els.shine.setAttribute('opacity',String(clamp((a-.18)*.22,0,.14)));
  return a;
}
  function drawToCanvas(ctx,width,height){
  const amount=clamp(filtered);if(!ctx||!(width>0&&height>0)||amount<.035)return false;
  const q=paths(amount),sx=width/1000,sy=height/1777.7778,mask=clamp((amount-.045)/.24)*.84;
  ctx.save();ctx.scale(sx,sy);
  if(mask>.005){ctx.save();ctx.globalAlpha=mask;ctx.filter='blur(2.1px)';const skin=ctx.createLinearGradient(CX,CY-13.5,CX,CY+13.5);skin.addColorStop(0,'#dfb39d');skin.addColorStop(.52,'#d2a08b');skin.addColorStop(1,'#bc8574');ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(CX,CY,25.5,13.5,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  const opening=clamp((amount-.018)/.30)*.82;ctx.globalAlpha=opening;const gradient=ctx.createLinearGradient(CX,CY-q.h,CX,CY+q.h);gradient.addColorStop(0,'#29151a');gradient.addColorStop(.48,'#4b2028');gradient.addColorStop(1,'#261319');
  ctx.fillStyle=gradient;ctx.beginPath();ctx.moveTo(CX-q.w,CY);
  ctx.bezierCurveTo(CX-q.w*.72,CY-q.h*.92,CX-q.w*.28,CY-q.h*.86,CX-1.5,CY-q.h*.42);
  ctx.bezierCurveTo(CX+q.w*.30,CY-q.h*.88,CX+q.w*.72,CY-q.h*.92,CX+q.w,CY-.12);
  ctx.bezierCurveTo(CX+q.w*.68,CY+q.h*.78,CX+q.w*.28,CY+q.h*1.03,CX,CY+q.h);
  ctx.bezierCurveTo(CX-q.w*.30,CY+q.h*1.02,CX-q.w*.70,CY+q.h*.78,CX-q.w,CY);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(141,72,85,.55)';ctx.lineWidth=1.25;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(CX-q.w-1,CY);ctx.bezierCurveTo(CX-q.w*.70,CY-q.h*.76,CX-q.w*.29,CY-q.h*1.10,CX-2,CY-q.h*.48);ctx.bezierCurveTo(CX-.7,CY-q.h*.64,CX+.7,CY-q.h*.64,CX+2,CY-q.h*.48);ctx.bezierCurveTo(CX+q.w*.29,CY-q.h*1.10,CX+q.w*.70,CY-q.h*.76,CX+q.w+1,CY-.10);ctx.stroke();
  ctx.strokeStyle='rgba(185,110,120,.36)';ctx.lineWidth:.9;ctx.beginPath();ctx.moveTo(CX-q.w*.86,CY+q.h*.22);ctx.bezierCurveTo(CX-q.w*.60,CY+q.h*1.12,CX+q.w*.60,CY+q.h*1.12,CX+q.w*.86,CY+q.h*.22);ctx.stroke();
  if(amount>.43){ctx.globalAlpha=clamp((amount-.43)*.52,0,.20);ctx.fillStyle='#eee1d2';ctx.beginPath();ctx.ellipse(CX,CY-q.h*.23,q.w*.36,q.h*.12,0,Math.PI,Math.PI*2);ctx.fill();}
  ctx.restore();return true;
}
 
 const wrapped=Object.freeze({...base,setLevel(value){base.setLevel(value);return paint(smooth(value));},drawToCanvas,getLevel:()=>filtered,getTargetLevel:()=>target});
 Object.defineProperty(window,'SwarSadhikaLipSync',{value:wrapped,writable:true,configurable:true,enumerable:oldDescriptor?.enumerable??true});
 const status=Object.freeze({installed:true,version:'1.1.0',renderer:'photo-aligned-subtle-mouth-mask',source:'audio-amplitude',anchor:{x:CX,y:CY},phonemeAccurate:false});
 const cleanup=()=>{try{base.setLevel(0);}catch(_){}if(oldDescriptor)Object.defineProperty(window,'SwarSadhikaLipSync',oldDescriptor);else delete window.SwarSadhikaLipSync;els.group.remove();els.defs.remove();els.previous.forEach(({el,display})=>{if(el)el.style.display=display;});svg.style.opacity='0';['avatar-mouth-patch','avatar-mouth','avatar-teeth','avatar-upper-lip','avatar-lower-lip'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='';});delete window[ID];};
 Object.defineProperty(window,ID,{value:{status,cleanup},configurable:true});
 api?.registerCleanup?.(cleanup);
 api?.emitStatus?.('फोटो के होंठों के सही स्थान (650,398) पर छोटा skin mask और सीमित मुख-खुलाव सक्रिय है। गति अभी audio-amplitude आधारित है।','success');
 return status;
}
export const activateSwarSadhikaModule=registerSwarSadhikaModule;
export default registerSwarSadhikaModule;
