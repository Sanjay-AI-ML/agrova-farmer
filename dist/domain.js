// Pure application logic. All actuator actions here are simulation-only.
export const SCHEMA = 'agrova.telemetry.v1';
export const STALE_MS = 6 * 60 * 60 * 1000;
export const liveFresh = s => s.source !== 'live' || Date.now() - Date.parse(s.rover.updatedAt) < 120000;
export const clone = value => JSON.parse(JSON.stringify(value));
export function createDemo(now = Date.now()) {
  const stamp = new Date(now - 18 * 60000).toISOString();
  return {
    schema: SCHEMA, source: 'demo', language: 'en', selectedZone: 'A1', overlay: 'moisture',
    farm: { name: 'Marudham demo farm', areaHa: 1, crop: 'Maize', locality: 'Tamil Nadu · illustrative plot' },
    zones: [
      { id:'A1', name:'North-west', x:0, y:0, moisture:19, temperature:28.1, ec:1.12, weedCover:6, crop:'Watch', concern:'Dry soil', confidence:0.92, updatedAt:stamp },
      { id:'A2', name:'North-east', x:1, y:0, moisture:32, temperature:27.5, ec:1.06, weedCover:2, crop:'Healthy', concern:'No urgent issue', confidence:0.91, updatedAt:stamp },
      { id:'B1', name:'West centre', x:0, y:1, moisture:28, temperature:28.8, ec:1.21, weedCover:18, crop:'Watch', concern:'Weed patch', confidence:0.87, updatedAt:stamp },
      { id:'B2', name:'East centre', x:1, y:1, moisture:30, temperature:28.2, ec:1.18, weedCover:4, crop:'Review', concern:'Leaf symptoms', confidence:0.71, updatedAt:stamp },
      { id:'C1', name:'South-west', x:0, y:2, moisture:35, temperature:27.8, ec:1.08, weedCover:3, crop:'Healthy', concern:'No urgent issue', confidence:0.93, updatedAt:stamp },
      { id:'C2', name:'South-east', x:1, y:2, moisture:24, temperature:29.0, ec:1.15, weedCover:5, crop:'Healthy', concern:'Monitor moisture', confidence:0.89, updatedAt:stamp }
    ],
    alerts: [
      { id:'dry-a1', zone:'A1', type:'moisture', title:'Check irrigation in A1', detail:'Sampled moisture is below the demo threshold. Check soil at the crop root zone before changing irrigation.', severity:'high', status:'open', at:stamp },
      { id:'weed-b1', zone:'B1', type:'weed', title:'A weed patch needs a closer look', detail:'Illustrative image analysis estimates 18% weed cover in B1. Inspect the patch and choose a crop-safe intervention.', severity:'medium', status:'open', at:stamp },
      { id:'crop-b2', zone:'B2', type:'crop', title:'Review leaf symptoms in B2', detail:'A simulated visual flag, not a disease diagnosis. Check leaves in person; consult an agronomist before applying treatment.', severity:'medium', status:'open', at:stamp }
    ],
    rover: { name:'AG-02', status:'ready', battery:82, solarW:18, tankL:5, cameraQuality:96, cleaningMl:150, probe:'retracted', installedBattery:true, progress:0, zone:'Dock', x:0, y:100, waterMl:0, packets:0, obstacle:false, updatedAt:new Date(now).toISOString() },
    mission: { kind:'Row scouting', speed:1, step:0, samples:0, startedAt:null },
    events:[{ id:'ready', at:new Date(now).toISOString(), text:'Demo rover parked. All values are simulated.', kind:'info' }],
    conversation:[], gatewayUrl:'', lastSavedAt:null
  };
}
export function isStale(zone, now=Date.now()) { return now - Date.parse(zone.updatedAt) > STALE_MS; }
export function zoneAdvice(zone) {
  if(isStale(zone)) return 'These readings are old. Re-sample this zone before deciding.';
  if(zone.concern === 'Leaf symptoms') return 'Inspect leaves in person. This visual flag is not a diagnosis.';
  if(zone.moisture < 22) return 'Check root-zone moisture and your irrigation schedule. Verify before watering.';
  if(zone.weedCover >= 12) return 'Inspect the weed patch. Use a crop-safe, location-specific intervention.';
  return 'No urgent demo flag. Continue routine scouting and watch the trend.';
}
export function averageMoisture(s) { return Math.round(s.zones.reduce((a,z)=>a+z.moisture,0)/s.zones.length); }
export function movementReason(s) {
  if(s.source !== 'demo') return 'Imported and live telemetry are read-only. No hardware commands are sent.';
  if(!s.rover.installedBattery) return 'Install and lock the battery first.';
  if(s.rover.battery <= 20) return 'Battery reserve reached. Park the rover and replace the cartridge.';
  if(s.rover.status === 'estop') return 'Clear the simulated emergency stop before moving.';
  if(s.rover.probe !== 'retracted') return 'Retract the soil probe before movement.';
  if(s.rover.obstacle) return 'Clear the simulated obstacle before movement.';
  return '';
}
export function waterReason(s, zone) {
  if(s.source !== 'demo') return 'Water demo is unavailable for read-only telemetry.';
  if(s.rover.status === 'running') return 'Pause and park the rover first.';
  const movement = movementReason(s); if(movement) return movement;
  if(s.rover.cameraQuality < 75) return 'Clean the camera window before a targeted action.';
  if(s.rover.tankL < 0.025) return 'Not enough water for the 25 mL demo.';
  if(!zone || isStale(zone)) return 'Fresh zone evidence is required.';
  if(s.rover.zone !== zone.id) return 'Sample this zone in the demo first to position the rover there.';
  return '';
}
function addEvent(s,text,kind='info') { s.events.unshift({id:globalThis.crypto?.randomUUID?.() || String(Date.now())+Math.random(), at:new Date().toISOString(),text,kind}); s.events=s.events.slice(0,150); }
export function act(state, action, value) {
  const s=clone(state), r=s.rover;
  const demoOnly=['start','pause','estop','clearStop','probe','sample','clean','swap','water','obstacle','lowBattery','tick'];
  if(s.source !== 'demo' && demoOnly.includes(action)) return {state, error:'This source is read-only. Switch to the demo to try rover controls.'};
  let error='';
  switch(action) {
    case 'start': error=movementReason(s); if(!error) {r.status='running'; if(r.progress>=100){r.progress=0;s.mission.step=0;} s.mission.startedAt ||= new Date().toISOString();addEvent(s,'Demo scouting started. Route is illustrative; no hardware is moving.');} break;
    case 'pause': if(r.status==='running'){r.status='paused';addEvent(s,'Demo mission paused; motors and pump stopped.');} break;
    case 'estop': r.status='estop';addEvent(s,'SIMULATED emergency stop: motion and treatment stopped.','warning');break;
    case 'clearStop': if(r.status==='estop'){r.status='paused';addEvent(s,'Simulated stop cleared. Start is required to move again.');} break;
    case 'probe': if(r.status==='running') error='Pause before deploying the soil probe.'; else if(r.status==='estop') error='Clear the simulated stop first.';else{r.probe=r.probe==='retracted'?'extended':'retracted';addEvent(s,`Soil probe ${r.probe} (simulation).`);} break;
    case 'sample':
      if(r.status==='running') error='Pause before taking a soil sample.';
      else if(r.status==='estop'||!r.installedBattery||r.battery<=20) error=movementReason(s);
      else {const z=s.zones.find(z=>z.id===value); if(!z){error='Unknown field zone.';break;} r.probe='retracted';r.zone=z.id;r.x=z.x*50+25;r.y=z.y*33.3+16.65;z.updatedAt=new Date().toISOString();s.mission.samples++;r.packets++;r.battery=Math.max(0,r.battery-.2);addEvent(s,`Demo sample logged in ${z.id}. Probe cycle completed; stored readings unchanged.`);}break;
    case 'clean': if(r.status==='running') error='Park the rover before cleaning.';else if(r.status==='estop'||!r.installedBattery||r.battery<=20) error=movementReason(s);else if(r.cleaningMl<10) error='Refill the cleaning reservoir.';else{r.cleaningMl-=10;r.cameraQuality=98;r.battery=Math.max(0,r.battery-.1);addEvent(s,'Demo camera cleaning completed; 10 mL used. Image quality is simulated.');}break;
    case 'swap': if(r.status==='running') error='Pause and isolate the rover before replacing its battery.';else if(r.probe!=='retracted')error='Retract the probe first.';else {r.battery=100;r.status='ready';r.installedBattery=true;addEvent(s,'Demo battery replaced. Real cartridge replacement requires power isolation, guide engagement and latch verification.');}break;
    case 'water': {const z=s.zones.find(z=>z.id===value?.zone);error=waterReason(s,z);if(!error&&!value?.approved)error='Farmer approval is required.';if(!error){r.tankL=Number((r.tankL-.025).toFixed(3));r.waterMl+=25;r.battery=Math.max(0,r.battery-.1);addEvent(s,`Approved water-only DEMO: 25 mL in ${z.id}. No pesticide, no hardware actuation. Sample values do not change.`,'success');}break;}
    case 'obstacle': r.obstacle=!r.obstacle;if(r.obstacle&&r.status==='running')r.status='paused';addEvent(s,r.obstacle?'Demo obstacle detected; motion stopped.':'Demo obstacle cleared.','warning');break;
    case 'lowBattery': r.battery=18;if(r.status==='running')r.status='paused';addEvent(s,'Demo reserve threshold reached. Park and replace battery; autonomous docking is not implemented.','warning');break;
    case 'tick': if(r.status==='running') {
      error=movementReason(s); if(error){r.status='paused';addEvent(s,error,'warning');error='';break;}
      const previous=Math.floor(r.progress/16.67);r.progress=Math.min(100,r.progress+1*s.mission.speed);s.mission.step++;
      const index=Math.min(5,Math.floor(r.progress/16.67));const z=s.zones[index];r.zone=z.id;r.x=z.x*50+25;r.y=z.y*33.3+16.65;
      r.battery=Math.max(0,r.battery-.055*s.mission.speed);r.packets+=1;
      if(previous!==index) {s.mission.samples++;addEvent(s,`Demo route reached ${z.id}; observation packet stored.`);}
      if(r.progress>=100){r.status='complete';s.mission.samples++;addEvent(s,'Illustrative scouting route completed. This is not a validated one-hectare coverage test.','success');}
    } break;
    case 'ack': {const a=s.alerts.find(a=>a.id===value);if(a){a.status=a.status==='open'?'reviewed':'open';addEvent(s,`${a.zone} alert marked ${a.status}. Acknowledgement is not proof of treatment.`);}break;}
    case 'language': if(['en','ta'].includes(value))s.language=value;break;
    case 'zone': if(s.zones.some(z=>z.id===value))s.selectedZone=value;break;
    case 'overlay': if(['moisture','weeds','crop'].includes(value))s.overlay=value;break;
    case 'speed': s.mission.speed=[1,3,5].includes(Number(value))?Number(value):1;break;
    default: return {state,error:'Unknown action.'};
  }
  if(error) return {state,error};
  if(demoOnly.includes(action))r.updatedAt=new Date().toISOString();
  return {state:s,error:''};
}
const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const validTime=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&Date.parse(v)<=Date.now()+300000;
export function validateTelemetry(data) {
  if(!data||data.schema!==SCHEMA)throw new Error(`Expected schema ${SCHEMA}.`);
  if(!Array.isArray(data.zones)||!data.zones.length||data.zones.length>6)throw new Error('Provide 1–6 valid zones for this MVP grid.');
  const ids=new Set();
  const zones=data.zones.map(z=>{
    if(typeof z.id!=='string'||!/^[A-Z][A-Z0-9-]{0,7}$/.test(z.id)||ids.has(z.id))throw new Error('Zone IDs must be unique, short uppercase labels.');ids.add(z.id);
    if(!finite(z.x,0,1)||!Number.isInteger(z.x)||!finite(z.y,0,2)||!Number.isInteger(z.y))throw new Error('This MVP uses a 2 × 3 local field grid.');
    for(const [key,min,max]of [['moisture',0,100],['temperature',-20,70],['ec',0,30],['weedCover',0,100],['confidence',0,1]]) if(!finite(z[key],min,max))throw new Error(`Invalid ${key} for ${z.id}.`);
    if(!validTime(z.updatedAt))throw new Error(`Invalid sample time for ${z.id}.`);
    return {id:z.id,name:String(z.name||z.id).slice(0,60),x:z.x,y:z.y,moisture:z.moisture,temperature:z.temperature,ec:z.ec,weedCover:z.weedCover,confidence:z.confidence,crop:['Healthy','Watch','Review'].includes(z.crop)?z.crop:'Review',concern:String(z.concern||'Inspect zone').slice(0,140),updatedAt:z.updatedAt};
  });
  if(new Set(zones.map(z=>`${z.x}:${z.y}`)).size!==zones.length)throw new Error('Two zones cannot occupy the same map cell.');
  const r=data.rover;
  if(!r||!validTime(r.updatedAt))throw new Error('Provide a rover timestamp.');
  for(const [k,min,max]of [['battery',0,100],['tankL',0,5],['solarW',0,1000],['cameraQuality',0,100],['x',0,100],['y',0,100]]) if(!finite(r[k],min,max))throw new Error(`Invalid rover ${k}.`);
  if(!['ready','running','paused','complete','estop'].includes(r.status))throw new Error('Invalid rover status.');
  if(!['extended','retracted'].includes(r.probe))throw new Error('Invalid probe position.');
  if(!ids.has(r.zone)&&r.zone!=='Dock')throw new Error('Rover zone must match a zone ID or Dock.');
  const rover={...createDemo().rover,...Object.fromEntries(['battery','tankL','solarW','cameraQuality','x','y','updatedAt'].map(k=>[k,r[k]])),status:r.status,zone:r.zone,probe:r.probe};
  const alerts=zones.filter(z=>z.moisture<22||z.weedCover>=12||z.crop==='Review').map(z=>({id:`observation-${z.id}`,zone:z.id,type:z.moisture<22?'moisture':z.weedCover>=12?'weed':'crop',title:`Inspect ${z.id}: ${z.concern}`,detail:zoneAdvice(z),severity:z.moisture<22?'high':'medium',status:'open',at:z.updatedAt}));
  return {schema:SCHEMA,zones,rover,alerts};
}
export function importTelemetry(state,raw,source='imported') {
  const data=validateTelemetry(raw),s=clone(state);Object.assign(s,data);s.source=source;s.selectedZone=data.zones[0].id;s.mission={kind:'Read-only observation',speed:1,step:0,samples:0,startedAt:null};addEvent(s,`${source==='live'?'Live hub':'Imported'} telemetry received. Hardware controls remain disabled.`);return s;
}
export function exportTelemetry(s) { return {schema:SCHEMA,exportedAt:new Date().toISOString(),source:s.source,farm:s.farm,zones:s.zones,rover:s.rover}; }
export function assistantAnswer(question,s) {
  const q=question.toLowerCase(),ta=s.language==='ta',dry=s.zones.filter(z=>z.moisture<22).map(z=>z.id).join(', ')||'—';
  const source=ta?(s.source==='demo'?'இவை மாதிரி தரவுகள். ':s.source==='live'?'இவை மையத்திலிருந்து வந்த தரவுகள். ':'இவை இறக்குமதி செய்த தரவுகள். '):(s.source==='demo'?'Using simulated data. ':s.source==='live'?'Using hub telemetry. ':'Using imported readings. ');
  let text;
  if(/battery|charge|power|பேட்டரி|மின்சாரம்/.test(q)) text=ta?`பேட்டரி ${Math.round(s.rover.battery)}%. சூரிய உதவி ${s.rover.solarW} வாட். 20% இருப்பை எட்டினால் நிறுத்தி பேட்டரியை மாற்றவும்.`:`Battery is ${Math.round(s.rover.battery)}%. Solar assistance is ${s.rover.solarW} W. Keep a 20% demo reserve; park and isolate power before replacing the cartridge.`;
  else if(/weed|களை/.test(q)) {const ids=s.zones.filter(z=>z.weedCover>=12).map(z=>z.id).join(', ');text=ta?`${ids||'எதுவும் இல்லை'} பகுதியில் களை அறிகுறி. நேரில் உறுதி செய்து பயிருக்கு பாதுகாப்பான முறையைத் தேர்வு செய்யவும்.`:`Weed flags: ${ids||'none'}. Inspect those patches in person before choosing a crop-safe intervention. The app does not prescribe herbicides.`;}
  else if(/crop|disease|leaf|பயிர்|நோய்|இலை/.test(q)) {const ids=s.zones.filter(z=>z.crop==='Review').map(z=>z.id).join(', ');text=ta?`${ids||'எதுவும் இல்லை'} பகுதியில் இலை அறிகுறியை நேரில் சரிபார்க்கவும். படம் மட்டும் நோயைக் கண்டறிய போதாது; நிபுணரின் ஆலோசனையைப் பெறவும்.`:'Review any zones marked “Review” in the field map. A leaf-image flag is not a diagnosis. Confirm the condition with an agronomist before treatment.';}
  else if(/water|soil|moisture|irrigat|நீர்|மண்|ஈரப்பதம்/.test(q)) text=ta?`சராசரி மண் ஈரப்பதம் ${averageMoisture(s)}%. ${dry} பகுதியில் ஈரப்பதம் குறைவு. பாசனத்தை மாற்றும் முன் வேர் பகுதியில் மண் ஈரத்தை உறுதி செய்யவும்.`:`Average sampled moisture is ${averageMoisture(s)}%. Low-moisture flags: ${dry}. Check root-zone moisture, crop stage and the latest sample time before changing irrigation. No irrigation volume has been calculated.`;
  else if(/camera|clean|கேமரா/.test(q)) text=ta?`கேமரா தரம் ${Math.round(s.rover.cameraQuality)}%. மாதிரி சுத்தம் செய்யும் சுழற்சி 10 மில்லி நீரைப் பயன்படுத்துகிறது.`:`Camera quality is ${Math.round(s.rover.cameraQuality)}%. The simulated cleaning cycle uses 10 mL from a separate reservoir. This number is not a measured vision-quality score.`;
  else text=ta?'மண் ஈரப்பதம், களை, பயிர், பேட்டரி அல்லது கேமரா பற்றி கேளுங்கள். இது உள்ளூர் விதி-அடிப்படையிலான உதவி; பயிற்சி பெற்ற AI குரல் மாதிரி அல்ல.':'Ask about soil moisture, weeds, crop condition, battery or camera cleaning. This local guide uses rules and the current readings; it is not a trained AI chatbot.';
  const stale=s.zones.some(z=>isStale(z));return source+(stale?(ta?'சில அளவீடுகள் பழையவை; மீண்டும் அளவிடவும். ':'Some readings are stale; re-sample before decisions. '):'')+text;
}
