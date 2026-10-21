const CACHE='agrova-shell-v5';
// Remain a classic worker so v1 installations can upgrade without reinstallation.
const VOICE_KEYS=['welcome','help','field','messages','rover','soil','weed','crop','battery','camera','test','clear','permission','done','stale','ready','quiet','demo','live','imported',...Array.from({length:6},(_,i)=>`position-${i}`)];
const FILES=['./','./index.html','./styles.css','./farmer.css','./premium.css','./premium-ui.js','./app.js','./domain.js','./storage.js','./farmer.js','./farmer-language.js','./farmer-notifications.js','./farmer-voice.js','./farmer-pictures.js','./manifest.webmanifest','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png','./assets/rover.png','./assets/farm-landscape.png','./assets/fonts/Lexend.ttf','./assets/fonts/NotoSansTamil.ttf','./assets/fonts/NotoSansDevanagari.ttf',...['ta','hi','en'].flatMap(l=>VOICE_KEYS.map(k=>`./assets/voice/${l}/${k}.mp3`))];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('agrova-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  // Do not cache credentials, hub telemetry, external requests or mutation requests.
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  const root=new URL('./',self.location.href);
  const allowed=FILES.map(f=>new URL(f,root).pathname);
  if(!allowed.includes(url.pathname))return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();const messageId=event.notification.data?.messageId||'';
 const target=new URL(`./#messages?message=${encodeURIComponent(messageId)}`,self.location.href).href;
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{const current=windows.find(w=>w.url.startsWith(new URL('./',self.location.href).href));if(current){await current.navigate(target);return current.focus();}return self.clients.openWindow(target);}));
});
self.addEventListener('push',event=>event.waitUntil((async()=>{
 try{
   const raw=event.data?.json();
   if(!raw||raw.schema!=='agrova.alert.v1'||typeof raw.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(raw.id)||!['moisture','weed','crop','battery','camera'].includes(raw.type)||raw.zone!=null&&!/^[A-Z][A-Z0-9-]{0,7}$/.test(raw.zone)||typeof raw.at!=='string'||!Number.isFinite(Date.parse(raw.at))||Date.parse(raw.at)>Date.now()+300000)return;
   const entry={id:`push-${raw.id}`,key:`push:${raw.id}`,type:raw.type,zone:raw.zone||null,at:raw.at,source:'live',heard:false,reviewed:false};
   const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('agrova-farmer-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('local');r.onsuccess=()=>resolve(r.result);r.onerror=reject;});
   const read=key=>new Promise(resolve=>{const r=db.transaction('local').objectStore('local').get(key);r.onsuccess=()=>resolve(r.result);});
   const previous=await read('incoming')||[];if(previous.some(e=>e.id===entry.id)){db.close();return;}
   await new Promise(resolve=>{const tx=db.transaction('local','readwrite');tx.objectStore('local').put([entry,...previous].slice(0,100),'incoming');tx.oncomplete=resolve;});
   const state=await read('state');db.close();const language=['ta','hi','en'].includes(state?.farmer?.language)?state.farmer.language:'ta';
   const words={ta:{title:'புதிய பண்ணைச் செய்தி',body:'பண்ணை மையத்திலிருந்து. செயலியைத் திறந்து கேளுங்கள் என்பதைத் தொடுங்கள்.',listen:'கேளுங்கள்'},hi:{title:'खेत का नया संदेश',body:'खेत के हब से। ऐप खोलें और सुनें दबाएँ।',listen:'सुनें'},en:{title:'New farm message',body:'From your farm hub. Open the app and tap Listen.',listen:'Listen'}}[language];
   const clients=await self.clients.matchAll({type:'window'});clients.forEach(client=>client.postMessage({type:'FARM_ALERT'}));
   await self.registration.showNotification(`Agrova · ${words.title}`,{body:words.body,icon:'./assets/icon-192.png',badge:'./assets/icon-192.png',tag:entry.id,lang:language,data:{messageId:entry.id},actions:[{action:'listen',title:words.listen}]});
 }catch{/* Reject malformed/untrusted content; never execute commands or load supplied audio URLs. */}
})()));
