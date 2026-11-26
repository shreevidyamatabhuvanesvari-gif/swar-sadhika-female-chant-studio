/* Swar-Sadhika Mobile WebGPU Capability Test — Part 2
 * Local-only diagnostic. Runs a tiny compute shader and releases its GPU
 * resources. It does not download models or contact any external service.
 */
const KEY='__swarSadhikaMobileGpuTestPart2';
const ROOT='ss-mobile-gpu-test';
const $=(s,r=document)=>r.querySelector(s);
const byteSize=n=>Number.isFinite(Number(n))&&Number(n)>0?(Number(n)>=1073741824?(Number(n)/1073741824).toFixed(1)+' GiB':(Number(n)/1048576).toFixed(0)+' MiB'):'उपलब्ध नहीं';

function panel(body){
  if($('#'+ROOT))return $('#'+ROOT);
  const root=document.createElement('section');
  root.id=ROOT;
  root.className='panel';
  root.style.cssText='margin:0 0 14px;border:1px solid #b8cde7';
  root.innerHTML=`
    <div class="panel-head"><h2>मोबाइल GPU क्षमता परीक्षण — WebGPU</h2>
      <p>स्थानीय GPU adapter, device और वास्तविक compute shader की जाँच। कोई मॉडल डाउनलोड या बाहरी सेवा उपयोग नहीं होगी।</p></div>
    <div class="panel-body">
      <div id="ss-gpu-test-status" class="status warn" role="status" aria-live="polite">परीक्षण अभी शुरू नहीं हुआ है। नीचे बटन दबाकर GPU की जाँच करें।</div>
      <div class="btn-row" style="margin-top:10px">
        <button id="ss-gpu-test-run" class="btn primary" type="button">स्थानीय GPU परीक्षण चलाएँ</button>
        <button id="ss-gpu-test-clear" class="btn secondary" type="button">परिणाम साफ करें</button>
      </div>
      <div id="ss-gpu-test-results" style="display:grid;gap:7px;margin-top:12px"></div>
      <div class="hint" style="margin-top:10px">ध्यान दें: छोटा compute परीक्षण सफल होना बड़े Talking-Avatar मॉडल के मोबाइल पर चलने का प्रमाण नहीं है। मॉडल की RAM/VRAM आवश्यकता और लगातार प्रदर्शन अलग से जाँचना होगा।</div>
    </div>`;
  body.prepend(root);
  return root;
}

function setRows(root,rows){
  const out=$('#ss-gpu-test-results',root);out.replaceChildren();
  for(const [label,value] of rows){
    const row=document.createElement('div');
    row.style.cssText='display:grid;grid-template-columns:minmax(115px,.8fr) minmax(0,1.2fr);gap:10px;padding:7px 0;border-bottom:1px solid #edf0f5;font-size:.83rem';
    const a=document.createElement('strong'),b=document.createElement('span');
    a.textContent=label;b.textContent=String(value);b.style.overflowWrap='anywhere';
    row.append(a,b);out.append(row);
  }
}

async function obtainAdapter(gpu){
  const attempts=[
    {label:'Core / Default WebGPU',options:undefined},
    {label:'Compatibility mode',options:{featureLevel:'compatibility'}}
  ];
  let lastError=null;
  for(const item of attempts){
    try{
      const adapter=await gpu.requestAdapter(item.options);
      if(adapter)return {adapter,mode:item.label};
    }catch(error){lastError=error;}
  }
  throw lastError||new Error('Chrome ने WebGPU adapter उपलब्ध नहीं कराया।');
}

async function computeProof(device){
  const U=globalThis.GPUBufferUsage||{MAP_READ:1,COPY_SRC:4,COPY_DST:8,STORAGE:128};
  const M=globalThis.GPUMapMode||{READ:1};
  const input=new Float32Array([1,2,3,4]),expected=[3,5,7,9];
  let storage=null,readback=null;
  const start=performance.now();
  try{
    storage=device.createBuffer({label:'Swar-Sadhika GPU test data',size:16,usage:U.STORAGE|U.COPY_DST|U.COPY_SRC});
    readback=device.createBuffer({label:'Swar-Sadhika GPU readback',size:16,usage:U.MAP_READ|U.COPY_DST});
    device.queue.writeBuffer(storage,0,input);
    const shader=device.createShaderModule({label:'Swar-Sadhika WGSL proof',code:`
      @group(0) @binding(0) var<storage, read_write> values: array<f32>;
      @compute @workgroup_size(4)
      fn main(@builtin(global_invocation_id) id: vec3<u32>) {
        let i = id.x;
        if (i < 4u) { values[i] = values[i] * 2.0 + 1.0; }
      }`});
    const descriptor={layout:'auto',compute:{module:shader,entryPoint:'main'}};
    const pipeline=typeof device.createComputePipelineAsync==='function'
      ?await device.createComputePipelineAsync(descriptor):device.createComputePipeline(descriptor);
    const group=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:storage}}]});
    const encoder=device.createCommandEncoder();
    const pass=encoder.beginComputePass();pass.setPipeline(pipeline);pass.setBindGroup(0,group);pass.dispatchWorkgroups(1);pass.end();
    encoder.copyBufferToBuffer(storage,0,readback,0,16);device.queue.submit([encoder.finish()]);
    await readback.mapAsync(M.READ);
    const actual=Array.from(new Float32Array(readback.getMappedRange().slice(0)));
    readback.unmap();
    if(actual.length!==4||!actual.every((v,i)=>Math.abs(v-expected[i])<.0001))
      throw new Error('GPU compute output अपेक्षित [3, 5, 7, 9] से मेल नहीं खाता: ['+actual.join(', ')+']');
    return {actual,elapsed:Math.round(performance.now()-start)};
  }finally{
    try{storage?.destroy();}catch(_){}
    try{readback?.destroy();}catch(_){}
  }
}

export function registerSwarSadhikaModule(api){
  if(typeof document!=='object'||typeof window!=='object')return {installed:false};
  if(window[KEY])return window[KEY].status;
  const body=$('#panel-ai .panel-body');
  if(!body)throw new Error('AI परीक्षण पैनल का .panel-body उपलब्ध नहीं है।');
  const root=panel(body),status=$('#ss-gpu-test-status',root);
  const runButton=$('#ss-gpu-test-run',root),clearButton=$('#ss-gpu-test-clear',root);
  let running=false,activeDevice=null;
  const setStatus=(message,type='warn')=>{status.className='status '+type;status.textContent=message;};

  async function run(){
    if(running)return;
    running=true;runButton.disabled=true;clearButton.disabled=true;
    let adapter=null,device=null;const rows=[];
    setRows(root,[['परीक्षण','चल रहा है…']]);
    setStatus('Secure context और WebGPU adapter जाँचे जा रहे हैं…');
    try{
      rows.push(['Secure context',window.isSecureContext?'हाँ':'नहीं']);
      if(!window.isSecureContext)throw new Error('WebGPU के लिए HTTPS secure context आवश्यक है।');
      if(!navigator.gpu||typeof navigator.gpu.requestAdapter!=='function')
        throw new Error('इस Chrome context में navigator.gpu उपलब्ध नहीं है। Chrome/Android WebGPU support की जाँच करें।');
      rows.push(['navigator.gpu','उपलब्ध']);
      setStatus('GPU adapter प्राप्त किया जा रहा है…');
      const selected=await obtainAdapter(navigator.gpu);adapter=selected.adapter;
      rows.push(['Adapter mode',selected.mode]);
      const info=adapter.info||{};
      const gpuInfo=[info.vendor,info.architecture,info.description].filter(Boolean).join(' · ');
      rows.push(['GPU विवरण',gpuInfo||'ब्राउज़र ने विवरण उपलब्ध नहीं कराया']);
      rows.push(['Max buffer size',byteSize(adapter.limits?.maxBufferSize)]);
      rows.push(['Max storage binding',byteSize(adapter.limits?.maxStorageBufferBindingSize)]);
      rows.push(['Compute workgroup X',adapter.limits?.maxComputeWorkgroupSizeX??'उपलब्ध नहीं']);
      rows.push(['Compute invocations/group',adapter.limits?.maxComputeInvocationsPerWorkgroup??'उपलब्ध नहीं']);
      rows.push(['GPU features',adapter.features?.size?Array.from(adapter.features).join(', '):'अतिरिक्त features सूचीबद्ध नहीं']);
      setRows(root,rows);setStatus('Adapter मिला। अब GPU device और compute shader जाँचे जा रहे हैं…');
      device=await adapter.requestDevice();activeDevice=device;
      rows.push(['GPU device','सफलतापूर्वक बना']);setRows(root,rows);
      const proof=await computeProof(device);
      rows.push(['Compute shader','PASS — परिणाम सही']);
      rows.push(['छोटे compute का समय',proof.elapsed+' ms']);
      rows.push(['सत्यापित output','['+proof.actual.join(', ')+']']);
      setRows(root,rows);
      setStatus('WebGPU compute परीक्षण सफल। मोबाइल Chrome ने GPU device बनाया और सही परिणाम लौटाया। यह बड़े Talking-Avatar मॉडल के चलने की पुष्टि नहीं है।','good');
      api?.emitStatus?.('Mobile WebGPU compute verification सफल; बड़े Talking-Avatar model का inference अभी प्रमाणित नहीं।','success');
    }catch(error){
      if(rows.length)setRows(root,rows);
      const message=error instanceof Error?error.message:String(error);
      setStatus('GPU परीक्षण पूरा नहीं हुआ: '+message,'bad');
      api?.emitStatus?.('Mobile WebGPU परीक्षण पूरा नहीं हुआ: '+message,'warning');
    }finally{
      if(activeDevice===device)activeDevice=null;
      try{device?.destroy();}catch(_){}
      running=false;runButton.disabled=false;clearButton.disabled=false;
    }
  }
  function clear(){
    if(running)return;
    setRows(root,[]);setStatus('परिणाम साफ हैं। अगली जाँच के लिए परीक्षण बटन दबाएँ।');
  }
  runButton.addEventListener('click',run);
  clearButton.addEventListener('click',clear);
  const moduleStatus=Object.freeze({installed:true,moduleId:'mobile-gpu-capability-test',version:'1.0.0',localOnly:true});
  const cleanup=()=>{
    if(running)return;
    runButton.removeEventListener('click',run);clearButton.removeEventListener('click',clear);
    try{activeDevice?.destroy();}catch(_){}
    root.remove();delete window[KEY];
  };
  Object.defineProperty(window,KEY,{value:{status:moduleStatus,cleanup},configurable:true});
  api?.registerCleanup?.(cleanup);
  api?.emitStatus?.('स्थानीय Mobile WebGPU परीक्षण AI परीक्षण पैनल में उपलब्ध है। कोई बाहरी सेवा या मॉडल डाउनलोड नहीं होगा।','info');
  return moduleStatus;
}
export const activateSwarSadhikaModule=registerSwarSadhikaModule;
export default registerSwarSadhikaModule;
