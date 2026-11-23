import {textFor,positionFor,messageText,LANGUAGES,powerLevel} from './farmer-language.js';
import {appIcon,premiumHeader,premiumNav,premiumHome} from './premium-ui.js';
import {initializeFarmer,syncInbox,mergePushInbox,voiceKeys,showPhoneMessage} from './farmer-notifications.js';
import {playClips,stopVoice} from './farmer-voice.js';
import {isStale} from './domain.js';
import {readIncoming} from './storage.js';
import {PLANT_CLASSES,ADVISORY_RULES,findAdvice,sprayRequirement,formatClassName,PRESET_SAMPLES,diagnoseSample,diagnoseClass,analyzeImage} from './crop-advisory.js';
export const FARMER_PAGES=['home','farm','messages','machine','advisor','help','phone','language'];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sound='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h4l5-5v16l-5-5H3Zm13-2a7 7 0 0 1 0 10m3-13a11 11 0 0 1 0 16"/></svg>';
const picture=type=>appIcon(({soil:'drop',weed:'leaf',crop:'leaf',help:'help',battery:'battery',camera:'camera',rover:'rover',messages:'messages'})[type]||'leaf');
const button=(text,action,value='',className='',label='')=>`<button class="farm-button ${className}" data-farm="${action}" data-value="${esc(value)}" aria-label="${esc(label||text.replace(/<[^>]*>/g,'').trim()||'Listen')}">${text}</button>`;
const link=(text,url,className='')=>`<a class="farm-button ${className}" href="#${url}">${text}</a>`;
export function createFarmerExperience(ctx){
 let currentPage='home',lastPlayed=null,announcing=false;
 const advisorState={sampleId:'sample_tomato_early_blight',customImageUri:PRESET_SAMPLES[0]?.imageUri||null,activeClass:'Tomato___Early_blight',diagnosed:null,isAnalyzing:false,calc:{dose:2.0,area:null,waterRate:400,tankVol:16,unit:'g'},sprayResult:null};
 const state=()=>ctx.getState(), prefs=()=>state().farmer, t=()=>textFor(prefs().language);
 const source=entry=>t()[entry?.source||state().source];
 const zone=entry=>state().zones.find(z=>z.id===entry.zone);
 const zoneName=entry=>zone(entry)?positionFor(zone(entry),prefs().language):entry.zone||'';
 const date=entry=>new Date(entry.at).toLocaleTimeString({ta:'ta-IN',hi:'hi-IN',en:'en-IN'}[prefs().language],{hour:'2-digit',minute:'2-digit'});
 const save=()=>ctx.save();
 async function play(keys,onComplete){return playClips(prefs().language,keys,{onError:error=>ctx.toast(error.name==='NotAllowedError'?t().tapToHear:t().missingAudio),onComplete});}
 function listen(entry){lastPlayed=entry.id;play(voiceKeys(entry,state()),()=>{const stored=prefs().inbox.find(e=>e.id===entry.id);if(stored){stored.heard=true;save();ctx.render();}});}
 function languages(){return `<div class="farm-language-options">${LANGUAGES.map(l=>`<button data-farm="choose-language" data-value="${l}" lang="${l}"><span>${textFor(l).language}</span>${sound}</button>`).join('')}</div>`;}
 function onboarding(){return `<div class="farmer-app premium-app onboarding"><div class="premium-onboarding-top"><a href="#home" class="farm-wordmark"><span class="premium-brand-mark">${appIcon('leaf')}</span><strong>Agrova</strong></a><h1>வணக்கம் · नमस्ते · Welcome</h1><p>Your field. Your language. Your decisions.</p></div><h2>தமிழ் / हिन्दी / English</h2>${languages()}<p class="farm-note">${textFor('ta').chooseHint}<br>${textFor('hi').chooseHint}<br>${textFor('en').chooseHint}</p></div>`;}
 function header(){return premiumHeader(state(),prefs().language);}
 function nav(){return premiumNav(currentPage,prefs().language,prefs().inbox);}
 function provenance(){return `<div class="farm-provenance ${state().source==='demo'?'practice':''}"><span>${state().source==='demo'?'◉':'●'} ${source()}</span><small>${navigator.onLine?t().online:t().offline}</small></div>`;}
 function messageCard(entry,compact=false){const content=messageText(entry,prefs().language);return `<article class="voice-message ${entry.heard?'heard':'unheard'} ${new URLSearchParams(location.hash.split('?')[1]).get('message')===entry.id?'highlight':''}" data-message-id="${esc(entry.id)}"><div class="message-picture">${picture(entry.type==='moisture'?'soil':entry.type)}</div><div class="voice-message-content"><span class="farm-kicker">${source(entry)} · ${entry.reviewed?t().reviewed:entry.heard?t().heard:t().new}</span><h2>${content.title}</h2>${entry.zone?`<p class="voice-location">${zoneName(entry)} <small>(${esc(entry.zone)})</small></p>`:''}${!compact?`<p>${content.body}</p>`:''}${isOld(entry)?`<span class="farm-old">${t().stale}</span>`:''}<div class="message-actions">${button(`${sound}${entry.heard?t().again:t().listen}`,'play-message',entry.id,'listen-button')}${!compact&&entry.type!=='test'?button(t().review,'review-message',entry.id,'review-button'):''}${entry.zone&&!compact?link(t().field,`farm?zone=${esc(entry.zone)}`,'outline-button'):''}</div>${!compact?`<small class="farm-note">${date(entry)} · ${t().heardHint}</small>`:''}</div></article>`;}
 function isOld(entry){return Date.now()-Date.parse(entry.at)>21600000;}
 function activeMessages(){const active=state().farmer.activeKeys;return prefs().inbox.filter(e=>!e.reviewed&&e.source===state().source&&e.type!=='test'&&(e.id.startsWith('push-')||active.includes(e.key))).filter((e,i,all)=>all.findIndex(other=>other.type===e.type&&other.zone===e.zone)===i).sort((a,b)=>(b.severity==='high')-(a.severity==='high'));}
 function home(){return premiumHome(state(),prefs().language,{activeMessages:activeMessages(),online:navigator.onLine});}
 function field(){const selectedId=new URLSearchParams(location.hash.split('?')[1]).get('zone')||state().selectedZone;const selected=state().zones.find(z=>z.id===selectedId)||state().zones[0];return `<div class="farmer-title"><h1>${t().field}</h1>${button(sound,'play-phrase','field','round-listen',t().listen)}</div>${provenance()}<p class="farm-note">${t().sampleMap}</p><div class="farm-simple-map" role="group" aria-label="${t().field}">${state().zones.map(z=>{const problem=state().alerts.some(a=>a.zone===z.id&&a.status==='open'),stale=isStale(z);return `<button class="farm-map-zone ${problem?'check-zone':''} ${selected.id===z.id?'selected-zone':''}" data-farm="zone" data-value="${esc(z.id)}" style="grid-column:${z.x+1};grid-row:${z.y+1}" aria-pressed="${selected.id===z.id}">${picture(problem?'crop':'soil')}<strong>${positionFor(z,prefs().language)}</strong><small>${esc(z.id)} ${problem?'· !':''}${stale?' · ◷':''}</small></button>`;}).join('')}</div><section class="farm-zone-detail"><h2>${positionFor(selected,prefs().language)}</h2><div class="farm-readings"><div>${picture('soil')}<span>${t().water}</span><strong>${selected.moisture}%</strong></div><div>${picture('weed')}<span>${t().weed}</span><strong>${selected.weedCover}%</strong></div></div><div style="display:flex;gap:10px;flex-wrap:wrap">${button(`${sound}${t().listen}`,'listen-zone',selected.id,'listen-button')}${link('🧪 '+t().advisor,'advisor','outline-button')}</div>${isStale(selected)?`<p class="farm-old">${t().stale}</p>`:''}<p class="farm-note">${t().clearSource}</p></section>`;}
 function messages(){return `<div class="farmer-title"><h1>${t().messages}</h1>${button(sound,'play-phrase','messages','round-listen',t().listen)}</div>${provenance()}<div class="farm-inline-tip">${sound}<p>${t().heardHint}</p></div>${prefs().inbox.length?prefs().inbox.map(e=>messageCard(e)).join(''):`<div class="farm-empty">${picture('messages')}<h2>${t().none}</h2>${button(`${sound}${t().listen}`,'play-phrase','clear','listen-button')}</div>`}`;}
 function machine(){const r=state().rover;return `<div class="farmer-title"><h1>${t().rover}</h1>${button(sound,'listen-rover','','round-listen',t().listen)}</div>${provenance()}<section class="farm-machine"><img src="./assets/rover.png" alt="Agrova"><div class="farm-battery ${r.battery<=20?'low-battery':''}">${picture('battery')}<div><h2>${powerLevel(r.battery,prefs().language)}</h2><strong>${Math.round(r.battery)}%</strong></div></div><div style="display:flex;gap:10px;flex-wrap:wrap">${button(`${sound}${t().listen}`,'listen-rover','','listen-button')}${link('🧪 '+t().dosageCalcTitle,'advisor','outline-button')}</div><p class="farm-note">${t().safety}</p>${state().source==='demo'?`<div class="farm-rover-actions">${button(t().start,'start-demo','','outline-button')}${button(t().pause,'pause-demo','','outline-button')}</div>`:''}</section>`;}
 function help(){return `<div class="farmer-title"><h1>${t().help}</h1>${button(sound,'play-phrase','help','round-listen',t().listen)}</div><section class="farm-help-hero">${picture('help')}<h2>${t().learn}</h2>${button(`${sound}${t().listen}`,'play-phrase','help','listen-button')}<p>${t().noTyping}</p></section><div class="farm-help-steps">${[[t().field,'soil','field'],[t().messages,'messages','messages'],[t().rover,'rover','rover']].map(([label,ic,clip],i)=>`<button data-farm="play-phrase" data-value="${clip}"><b>${i+1}</b>${picture(ic)}<strong>${label}</strong>${sound}</button>`).join('')}</div><p class="farm-note">${t().helperHint}</p>${link(t().more,'phone','outline-button')}`;}
 function phone(){return `<div class="farmer-title"><h1>${t().more}</h1></div><section class="farm-phone-card"><h2>${t().voiceFeature}</h2>${button(`${sound}${prefs().voiceAlerts?t().voiceDisable:t().voiceOff}`,'toggle-voice','','listen-button')}<p>${t().voiceHint}</p></section><section class="farm-phone-card"><h2>${t().notificationFeature}</h2>${button(`✉ ${prefs().phoneNotifications?t().notifyOff:t().phoneOff}`,'notification-permission','','outline-button')}<p>${t().phoneHint}</p><p class="farm-note">${t().needsHub}</p></section><section class="farm-phone-card">${button(`${sound}${t().test}`,'test-message','','listen-button')}${link(t().languageButton,'language','outline-button')}${link(t().expert,'settings','helper-link')}<p class="farm-note">${t().helperHint}</p></section>`;}
 function language(){return `<div class="farmer-title"><h1>${t().languageButton}</h1></div>${languages()}${link(t().back,'home','outline-button')}`;}
 function advisor(){
  if(!advisorState.diagnosed){
    advisorState.diagnosed=diagnoseSample(advisorState.sampleId,prefs().language);
    advisorState.activeClass=advisorState.diagnosed.predictedClass;
    advisorState.calc.dose=advisorState.diagnosed.recommendedDose||2.0;
    advisorState.calc.unit=advisorState.diagnosed.unit||'g';
  }
  if(advisorState.calc.area===null){
    advisorState.calc.area=Number(state().farm?.areaHa)||0.5;
  }
  advisorState.sprayResult=sprayRequirement(advisorState.calc.dose,advisorState.calc.area,advisorState.calc.waterRate,advisorState.calc.tankVol,advisorState.calc.unit);
  const diag=advisorState.diagnosed;
  const advice=findAdvice(advisorState.activeClass,prefs().language);
  const spray=advisorState.sprayResult;

  return `<div class="farmer-title"><div><h1>${t().advisor}</h1><p>${t().advisorDesc}</p></div>${button(sound,'play-phrase','crop','round-listen',t().listen)}</div>${provenance()}`+
  `<section class="advisor-panel"><div class="advisor-badge-row"><span class="advisor-badge">${t().model1Badge}</span><span class="advisor-badge ${diag.thresholdPassed?'':'warn'}">${diag.thresholdPassed?t().highConfidence:t().lowConfidence}</span></div>`+
  `<h2>${t().scanTestTitle}</h2><p class="farm-note">${t().scanTestDesc}</p>`+
  `<div class="advisor-samples-grid" role="group" aria-label="${t().sampleLeaves}">`+
  PRESET_SAMPLES.map(s=>`<button class="advisor-sample-btn ${s.id===advisorState.sampleId&&!advisorState.customImageUri?'selected':''}" data-farm="select-leaf-sample" data-value="${esc(s.id)}"><span class="advisor-sample-icon">${picture(s.targetClass.includes('healthy')?'soil':'crop')}</span><strong>${esc(s.crop)}</strong><small>${esc(s.diseaseName)}</small></button>`).join('')+
  `</div>`+
  `<div class="advisor-preview-box">${advisorState.customImageUri?`<img src="${advisorState.customImageUri}" alt="Leaf photo preview" class="advisor-preview-img">`:`<div class="advisor-preview-img">${picture('crop')}</div>`}<div class="advisor-preview-info"><h3>${esc(diag.formattedName)}</h3><p>${esc(diag.symptoms)}</p>${advisorState.isAnalyzing?`<div class="scanning-badge" style="padding:8px 12px;background:#e2f5e8;color:#185a28;border-radius:8px;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:6px;margin:8px 0"><span>⚡</span> Neural network analyzing leaf pixels (ShuffleNet V2)...</div>`:''}<div style="display:flex;gap:8px;flex-wrap:wrap"><input type="file" id="leaf-uploader" accept="image/*" style="display:none"><button class="farm-button outline-button" data-farm="trigger-leaf-upload" style="min-height:44px;font-size:14px;padding:8px 14px">${picture('camera')} ${t().uploadPhoto}</button><button class="farm-button listen-button" data-farm="run-model1-scan" style="min-height:44px;font-size:14px;padding:8px 14px">⚡ ${t().analyzeLeaf}</button></div></div></div>`+
  `<div class="diagnosis-result-card"><div class="diagnosis-header"><div><span class="farm-kicker">${t().diagnosedAs}</span><h3 class="diagnosis-title">${esc(diag.formattedName)}</h3><small style="color:#577457;display:block;margin-top:2px">Engine: ${esc(diag.engine||'ShuffleNet V2 x0.5 (PyTorch CPU)')}</small></div><span class="confidence-meter ${diag.thresholdPassed?'':'low'}">${(diag.confidence*100).toFixed(1)}% · ${diag.thresholdPassed?'High':'Review'}</span></div>`+
  `<div class="prob-rank-list"><span class="farm-kicker">${t().topRankings}</span>`+
  diag.top3.map(item=>`<div class="prob-rank-item"><div class="prob-rank-labels"><span>${esc(item.formattedName)}</span><span>${item.percent}</span></div><div class="prob-bar-track"><div class="prob-bar-fill" style="width:${Math.round(item.prob*100)}%"></div></div></div>`).join('')+
  `</div><p class="farm-note" style="margin-top:12px">${t().humanCheckDisclaimer}</p><button class="farm-button outline-button" data-farm="jump-to-calc" style="width:100%;margin-top:10px">${t().loadToCalc}</button></div></section>`+
  `<section class="advisor-panel" id="model2-section"><div class="advisor-badge-row"><span class="advisor-badge">${t().model2Badge}</span><span class="advisor-badge blue">${esc(advice.kind||'treatment')}</span></div>`+
  `<h2>${t().treatmentAdviceTitle}</h2><div style="margin:14px 0"><label class="farm-kicker" for="select-crop-class">${t().diagnosedAs} / Class:</label><select class="calc-field" id="select-crop-class" style="width:100%;padding:12px;border:1.5px solid #cad8be;border-radius:12px;font-size:15px;background:#fff;margin-top:4px">`+
  PLANT_CLASSES.map(cls=>`<option value="${esc(cls)}" ${cls===advisorState.activeClass?'selected':''}>${esc(formatClassName(cls))}</option>`).join('')+
  `</select></div><div class="farm-readings" style="margin:14px 0"><div style="flex:1"><span class="farm-kicker">${t().treatmentKind}</span><strong style="font-size:18px">${esc(advice.kind||'N/A')}</strong></div></div>`+
  `<div style="margin:14px 0"><span class="farm-kicker">${t().agronomicAction}</span><p style="font-size:16px;line-height:1.6;color:#1c4328;margin-top:4px"><strong>${esc(advice.action)}</strong></p></div>`+
  (advice.candidates&&advice.candidates.length?`<div style="margin:14px 0"><span class="farm-kicker">${t().activeIngredientsLabel}</span><div class="candidates-wrap">${advice.candidates.map(c=>`<span class="candidate-pill">${esc(c)}</span>`).join('')}</div></div>`:'')+
  `<div class="safety-box"><strong>⚠️ ${t().safetyTitle}</strong><p style="margin-top:6px">${esc(advice.safety)}</p></div>`+
  `<h3 style="font-size:19px;margin:24px 0 10px">${t().dosageCalcTitle}</h3><p class="farm-note">Calculate chemical product and water volume needed for Rover AG-02 tank refills.</p>`+
  `<div class="calc-grid"><div class="calc-field"><label for="input-dose">${t().labelDoseLabel}</label><input type="number" id="input-dose" step="0.1" min="0.1" max="100" value="${advisorState.calc.dose}" data-farm-input="dose"></div>`+
  `<div class="calc-field"><label for="input-area">${t().fieldAreaLabel}</label><input type="number" id="input-area" step="0.05" min="0.01" max="100" value="${advisorState.calc.area}" data-farm-input="area"></div>`+
  `<div class="calc-field"><label for="input-water-rate">${t().waterRateLabel}</label><input type="number" id="input-water-rate" step="10" min="50" max="2000" value="${advisorState.calc.waterRate}" data-farm-input="waterRate"></div>`+
  `<div class="calc-field"><label for="input-tank-vol">${t().tankVolumeLabel}</label><input type="number" id="input-tank-vol" step="1" min="1" max="500" value="${advisorState.calc.tankVol}" data-farm-input="tankVol"></div>`+
  `<div class="calc-field"><label for="select-unit">${t().unitLabel}</label><select id="select-unit" data-farm-input="unit"><option value="g" ${advisorState.calc.unit==='g'?'selected':''}>g (powder / wettable)</option><option value="mL" ${advisorState.calc.unit==='mL'?'selected':''}>mL (liquid concentrate)</option></select></div></div>`+
  `<div class="calc-results-box"><h3>${t().totalWaterLabel} & ${t().totalProductLabel}</h3><div class="calc-metrics-grid"><div class="calc-metric-item"><small>${t().totalWaterLabel}</small><strong>${esc(spray.waterTotal)}</strong></div><div class="calc-metric-item"><small>${t().totalProductLabel}</small><strong>${esc(spray.productTotal)}</strong></div><div class="calc-metric-item"><small>${t().dosePerTankLabel}</small><strong>${esc(spray.perTank)}</strong></div><div class="calc-metric-item"><small>${t().tanksNeededLabel}</small><strong>${esc(spray.tanksNeeded)} <small style="font-size:14px">tanks</small></strong></div></div></div>`+
  `<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="farm-button listen-button" data-farm="save-spray-plan" style="flex:1">🚜 ${t().applyPrescription}</button><a class="farm-button outline-button" href="#machine">${t().rover} →</a></div></section>`;
 }
 function render(page){currentPage=page;if(typeof document !== 'undefined')document.documentElement.lang=prefs().language;if(!prefs().onboarded&&page!=='language')return onboarding();return `<div class="farmer-app premium-app ${page==='home'?'premium-home':''}" lang="${prefs().language}">${page==='home'?'':header()}<main class="farmer-main" id="main">${({home,field,messages,machine,advisor,help,phone,language})[page==='farm'?'field':page]()}</main>${nav()}</div>`;}
 function confirm(title,body,callback,clip=''){const d=document.querySelector('#dialog');d.className='farmer-dialog';d.innerHTML=`<h2 id="dialog-title">${title}</h2><p>${body}</p>${clip?button(`${sound}${t().listen}`,'play-phrase',clip,'listen-button'):''}<div class="dialog-actions">${button(t().cancel,'cancel-dialog','','outline-button')}${button(t().allow,'approve-dialog','','listen-button')}</div>`;d.querySelector('[data-farm=approve-dialog]').onclick=()=>{d.close();stopVoice();callback();};d.showModal();if(clip)play([clip]);}
 async function announce(entries,alreadyNotified=false){if(!entries.length)return;if(!alreadyNotified)for(const entry of entries)showPhoneMessage(entry,state()).catch(()=>ctx.toast(t().unsupported));if(prefs().voiceAlerts&&document.visibilityState==='visible'&&!announcing){announcing=true;const first=entries[0];await play(voiceKeys(first,state()),()=>{const stored=prefs().inbox.find(e=>e.id===first.id);if(stored)stored.heard=true;save();ctx.render();});announcing=false;}}
 function onUpdate(){const entries=syncInbox(state());save();announce(entries);return entries;}
 async function incoming(){try{const entries=await readIncoming();const fresh=mergePushInbox(state(),entries);if(fresh.length){await save();ctx.render();if(prefs().voiceAlerts&&document.visibilityState==='visible')announce(fresh,true);}}catch{}}
 function advancedSettings(){return `<section class="card settings-card wide"><h2>Farmer voice & notification connection</h2><p>Big picture buttons and bundled Tamil, Hindi and English voice messages are available in the simple view. Android phone notifications require browser permission. Closed-app delivery requires your authenticated farm hub to register a Web Push subscription.</p><a class="btn primary" href="#home">Open simple farmer view</a><label class="label"><input id="poll-hub" type="checkbox" ${prefs().polling?'checked':''}> Refresh connected hub every 30 seconds while visible</label><form id="push-form"><label class="label" for="push-url">Hub subscription endpoint (HTTPS)</label><input id="push-url" class="input" type="url" placeholder="https://your-hub/api/v1/push/subscriptions" required><label class="label" for="vapid-key">Hub VAPID public key</label><input id="vapid-key" class="input" autocomplete="off" required><p class="helper">Use the telemetry session token above if needed. This sends a push subscription to your chosen hub, not a rover command. The endpoint must authenticate users and route alerts only to their farm.</p><div class="actions"><button class="btn primary" type="submit">Connect closed-app notifications</button><button class="btn" type="button" data-farm="disconnect-push">Disconnect push on this device</button></div><p class="helper" id="push-status">No push hub connected by this version. Background voice playback is not supported; notifications open the saved voice message.</p></form></section>`;}
 if(typeof document !== 'undefined'){
 document.addEventListener('click',async e=>{
   const el=e.target.closest('[data-farm]');if(!el)return;const action=el.dataset.farm,value=el.dataset.value;
   switch(action){
     case 'choose-language':if(LANGUAGES.includes(value)){stopVoice();prefs().language=value;prefs().onboarded=true;state().language=value==='hi'?'en':value;save();location.hash='home';ctx.render();play(['welcome']);}break;
     case 'stop':stopVoice();break;
     case 'play-phrase':play([value]);break;
     case 'play-message':{const entry=prefs().inbox.find(e=>e.id===value);if(entry)listen(entry);break;}
     case 'play-summary':{const entry=activeMessages()[0];if(entry)listen(entry);else play([state().source,'clear']);break;}
     case 'zone':state().selectedZone=value;save();history.replaceState(null,'',`#farm?zone=${encodeURIComponent(value)}`);ctx.render();break;
     case 'listen-zone':{const entry=activeMessages().find(e=>e.zone===value);if(entry)listen(entry);else{const z=state().zones.find(z=>z.id===value);play([state().source,`position-${z.y*2+z.x}`,...(isStale(z)?['stale']:[]),'clear']);}break;}
     case 'review-message':{const entry=prefs().inbox.find(e=>e.id===value);if(entry)confirm(t().review,t().reviewHint,()=>{const current=prefs().inbox.find(e=>e.id===value);if(current){current.reviewed=true;const alert=state().alerts.find(a=>a.id===current.alertId);if(alert)alert.status='reviewed';save();ctx.render();play(['done']);}});break;}
     case 'listen-rover':play([state().source,state().rover.battery<=20?'battery':'ready','rover']);break;
     case 'toggle-voice':prefs().voiceAlerts=!prefs().voiceAlerts;save();ctx.render();if(prefs().voiceAlerts)play(['test']);else{stopVoice();ctx.toast(t().quiet);}break;
     case 'notification-permission':if(prefs().phoneNotifications){prefs().phoneNotifications=false;save();ctx.render();const reg=await navigator.serviceWorker.ready;const subscription=await reg.pushManager?.getSubscription();if(subscription)await subscription.unsubscribe();}else confirm(t().allowTitle,t().allowHint,async()=>{if(!('Notification' in globalThis)||!('serviceWorker' in navigator)){ctx.toast(t().unsupported);return;}try{const permission=await Notification.requestPermission();prefs().phoneNotifications=permission==='granted'&&Notification.permission==='granted';save();ctx.render();if(!prefs().phoneNotifications)ctx.toast(t().permissionDenied);}catch{ctx.toast(t().unsupported);}},'permission');break;
     case 'test-message':{const entry={id:`test-${Date.now()}`,type:'test',source:'demo',zone:null,at:new Date().toISOString(),heard:false,reviewed:false};prefs().inbox.unshift(entry);save();location.hash='messages';ctx.render();listen(entry);showPhoneMessage(entry,state()).catch(()=>ctx.toast(t().unsupported));break;}
     case 'start-demo':ctx.action('start');onUpdate();break;
     case 'pause-demo':ctx.action('pause');break;
     case 'cancel-dialog':document.querySelector('#dialog').close();stopVoice();break;
     case 'approve-dialog':break;
     case 'disconnect-push':{const reg=await navigator.serviceWorker.ready;const subscription=await reg.pushManager?.getSubscription();if(subscription)await subscription.unsubscribe();prefs().phoneNotifications=false;save();ctx.render();ctx.toast(t().done);break;}
      case 'select-leaf-sample':{
        advisorState.sampleId=value;
        const foundSample=PRESET_SAMPLES.find(s=>s.id===value);
        advisorState.customImageUri=foundSample?.imageUri||null;
        advisorState.diagnosed=diagnoseSample(value,prefs().language);
        advisorState.activeClass=advisorState.diagnosed.predictedClass;
        advisorState.calc.dose=advisorState.diagnosed.recommendedDose||2.0;
        advisorState.calc.unit=advisorState.diagnosed.unit||'g';
        ctx.render();
        break;
      }
      case 'trigger-leaf-upload':{
        document.querySelector('#leaf-uploader')?.click();
        break;
      }
      case 'run-model1-scan':{
        advisorState.isAnalyzing=true;
        ctx.render();
        const imgToScan=advisorState.customImageUri||PRESET_SAMPLES.find(s=>s.id===advisorState.sampleId)?.imageUri;
        analyzeImage(imgToScan,prefs().language).then(res=>{
          advisorState.diagnosed=res;
          advisorState.activeClass=res.predictedClass;
          advisorState.calc.dose=res.recommendedDose||2.0;
          advisorState.calc.unit=res.unit||'g';
          advisorState.isAnalyzing=false;
          ctx.render();
          ctx.toast(`⚡ ShuffleNet V2: ${res.formattedName} (${(res.confidence*100).toFixed(1)}%)`);
        }).catch(err=>{
          advisorState.isAnalyzing=false;
          ctx.render();
          ctx.toast('Inference error: '+err.message);
        });
        break;
      }
      case 'jump-to-calc':{
        document.querySelector('#model2-section')?.scrollIntoView({behavior:'smooth'});
        break;
      }
      case 'save-spray-plan':{
        state().events.unshift({kind:'action',text:'Spray prescription calculated: '+advisorState.sprayResult.perTank+', '+advisorState.sprayResult.tanksNeeded+' tanks needed for '+advisorState.activeClass,at:new Date().toISOString()});
        save();
        ctx.toast(t().prescriptionSaved);
        break;
      }
   }
 });
 document.addEventListener('change',e=>{
   if(e.target.id==='leaf-uploader'){
     const file=e.target.files?.[0];
     if(file){
       const reader=new FileReader();
       reader.onload=async ()=>{
         advisorState.customImageUri=reader.result;
         advisorState.isAnalyzing=true;
         ctx.render();
         ctx.toast('⚡ Running ShuffleNet V2 PyTorch inference on uploaded leaf pixels...');
         try {
           const diagResult=await analyzeImage(reader.result,prefs().language);
           advisorState.diagnosed=diagResult;
           advisorState.activeClass=diagResult.predictedClass;
           advisorState.calc.dose=diagResult.recommendedDose||2.0;
           advisorState.calc.unit=diagResult.unit||'g';
           advisorState.isAnalyzing=false;
           ctx.render();
           ctx.toast(`⚡ ShuffleNet V2: ${diagResult.formattedName} (${(diagResult.confidence*100).toFixed(1)}%)`);
         } catch(err) {
           advisorState.isAnalyzing=false;
           ctx.render();
           ctx.toast('Inference error: '+err.message);
         }
       };
       reader.readAsDataURL(file);
     }
   }else if(e.target.id==='select-crop-class'){
     advisorState.activeClass=e.target.value;
     advisorState.diagnosed=diagnoseClass(e.target.value,prefs().language);
     advisorState.calc.dose=advisorState.diagnosed.recommendedDose||2.0;
     advisorState.calc.unit=advisorState.diagnosed.unit||'g';
     ctx.render();
   }
 });
 document.addEventListener('input',e=>{
   const inputType=e.target.dataset.farmInput;
   if(inputType){
     const val=e.target.value;
     if(inputType==='dose')advisorState.calc.dose=Math.max(0,Number(val)||0);
     else if(inputType==='area')advisorState.calc.area=Math.max(0,Number(val)||0);
     else if(inputType==='waterRate')advisorState.calc.waterRate=Math.max(0,Number(val)||0);
     else if(inputType==='tankVol')advisorState.calc.tankVol=Math.max(0.1,Number(val)||16);
     else if(inputType==='unit')advisorState.calc.unit=val;
     advisorState.sprayResult=sprayRequirement(advisorState.calc.dose,advisorState.calc.area,advisorState.calc.waterRate,advisorState.calc.tankVol,advisorState.calc.unit);
     const res=advisorState.sprayResult;
     const box=document.querySelector('.calc-results-box');
     if(box){
       const items=box.querySelectorAll('.calc-metric-item strong');
       if(items.length>=4){
         items[0].textContent=res.waterTotal;
         items[1].textContent=res.productTotal;
         items[2].textContent=res.perTank;
         items[3].innerHTML=res.tanksNeeded+' <small style="font-size:14px">tanks</small>';
       }
     }
   }
 });
 document.addEventListener('farmer-voice',event=>{document.querySelectorAll('.stop-voice').forEach(el=>{el.classList.toggle('speaking',event.detail.playing);});});
 navigator.serviceWorker?.addEventListener('message',event=>{if(event.data?.type==='FARM_ALERT')incoming();});
 }
 return {render,initialize:()=>initializeFarmer(state()),onUpdate,incoming,advancedSettings,announce,stop:stopVoice};
}
