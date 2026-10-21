import {isStale} from './domain.js';
export const ALERT_SCHEMA='agrova.alert.v1';
const TYPES=['moisture','weed','crop','battery','camera'];
export function initializeFarmer(state){
  state.farmer={language:'ta',onboarded:false,voiceAlerts:false,phoneNotifications:false,polling:false,inbox:[],activeKeys:[],...state.farmer};
  if(!state.farmer.seeded){syncInbox(state);state.farmer.seeded=true;}
  return state;
}
export function syncInbox(state){
  const f=state.farmer;
  const current=state.alerts.filter(a=>a.status==='open').map(a=>({key:`${state.source}:${a.type}:${a.zone}`,type:a.type,zone:a.zone,at:a.at,alertId:a.id,severity:a.severity}));
  if(state.rover.battery<=20)current.push({key:`${state.source}:battery`,type:'battery',zone:null,at:state.rover.updatedAt});
  if(state.rover.cameraQuality<75)current.push({key:`${state.source}:camera`,type:'camera',zone:null,at:state.rover.updatedAt});
  const fresh=current.filter(a=>!f.activeKeys.includes(a.key)).map(a=>({...a,id:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`,source:state.source,heard:false,reviewed:false}));
  f.activeKeys=current.map(a=>a.key);f.inbox=[...fresh.reverse(),...f.inbox].slice(0,100);return fresh;
}
export function validatePush(payload){
  if(!payload||payload.schema!==ALERT_SCHEMA)throw new Error('Unsupported notification schema.');
  if(typeof payload.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(payload.id))throw new Error('Invalid notification ID.');
  if(!TYPES.includes(payload.type))throw new Error('Invalid notification type.');
  if(payload.zone!=null&&!/^[A-Z][A-Z0-9-]{0,7}$/.test(payload.zone))throw new Error('Invalid zone.');
  if(typeof payload.at!=='string'||!Number.isFinite(Date.parse(payload.at))||Date.parse(payload.at)>Date.now()+300000)throw new Error('Invalid notification time.');
  return {id:`push-${payload.id}`,key:`push:${payload.id}`,type:payload.type,zone:payload.zone||null,at:payload.at,source:'live',heard:false,reviewed:false};
}
export function mergePushInbox(state,entries){const ids=new Set(state.farmer.inbox.map(e=>e.id));const fresh=entries.filter(e=>!ids.has(e.id));state.farmer.inbox=[...fresh.reverse(),...state.farmer.inbox].slice(0,100);return fresh;}
export function voiceKeys(entry,state){
  const keys=[entry.source==='demo'?'demo':entry.source==='imported'?'imported':'live'];
  const z=state.zones.find(z=>z.id===entry.zone);
  if(z)keys.push(`position-${z.y*2+z.x}`);
  if(z&&isStale(z)||Date.now()-Date.parse(entry.at)>21600000)keys.push('stale');
  keys.push(entry.type==='moisture'?'soil':entry.type);return keys;
}
export async function showPhoneMessage(entry,state){
  if(!state.farmer.phoneNotifications||globalThis.Notification?.permission!=='granted')return false;
  const {textFor,messageText}=await import('./farmer-language.js');const t=textFor(state.farmer.language),content=messageText(entry,state.farmer.language);
  const registration=await navigator.serviceWorker.ready;
  await registration.showNotification(`Agrova · ${t.newMessage}`,{body:`${t[entry.source]||t.live} · ${content.title}. ${t.tapToHear}`,tag:entry.id,icon:'./assets/icon-192.png',badge:'./assets/icon-192.png',lang:state.farmer.language,data:{messageId:entry.id},actions:[{action:'listen',title:t.listen}]});return true;
}
