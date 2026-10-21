import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createDemo} from '../dist/domain.js';
import {initializeFarmer} from '../dist/farmer-notifications.js';
import {premiumHome,premiumHeader,premiumNav,premiumText,gauge} from '../dist/premium-ui.js';
const make=()=>initializeFarmer(createDemo());
test('Stitch-inspired dashboard renders real state values, not fabricated optimization/savings',()=>{const s=make();s.rover.battery=43;s.rover.solarW=7;s.rover.tankL=2.4;const html=premiumHome(s,'en',{activeMessages:s.farmer.inbox});assert.match(html,/Rover battery 43%/);assert.match(html,/7 W/);assert.match(html,/2.40/);assert.match(html,/Practice only/);assert.doesNotMatch(html,/88%|₹180|Cold storage|Water Now|Approve Schedule|Optimized|Live Soil Probe/);});
test('all three languages supply the premium dashboard, navigation and voice labels',()=>{for(const l of ['ta','hi','en']){const s=make();const h=premiumHome(s,l,{activeMessages:s.farmer.inbox});assert.ok(h.includes(premiumText(l).zones.replace(/&/g,'&amp;')));assert.ok(h.includes('data-farm="play-summary"'));assert.ok(premiumHeader(s,l).includes('data-farm="stop"'));assert.equal((premiumNav('home',l,s.farmer.inbox).match(/href="/g)||[]).length,5);}});
test('read-only source is explicit and adds no actuator commands',()=>{const s=make();s.source='live';const h=premiumHome(s,'en');assert.match(h,/From your farm hub/);assert.match(h,/Read-only observations/);assert.doesNotMatch(h,/Practice data\.|data-action="(start|water|spray|battery)"/);});
test('farm strings and field IDs are safely escaped in generated UI',()=>{const s=make();s.farm.name='<img src=x onerror=alert(1)>';s.zones[0].id='<bad>';const h=premiumHome(s,'en');assert.ok(h.includes('&lt;img'));assert.ok(h.includes('#farm?zone=%3Cbad%3E'));assert.ok(!h.includes('<img src=x'));});
test('priority card represents a stored observation and location with a listening action',()=>{const s=make();const e=s.farmer.inbox.find(x=>x.zone==='A1');const h=premiumHome(s,'en',{activeMessages:[e]});assert.match(h,/Check the dry soil/);assert.match(h,/North-west part/);assert.match(h,/#farm\?zone=A1/);assert.match(h,/before changing watering/);});
test('gauge clamps unexpected values to safe visual bounds',()=>{assert.match(gauge(140,'Battery'),/100%/);assert.match(gauge(-3,'Battery'),/0%/);assert.match(gauge('bad','Battery'),/0%/);});
test('premium assets are included in offline shell and no font CDN is required',()=>{const sw=readFileSync(new URL('../dist/sw.js',import.meta.url),'utf8');assert.match(sw,/agrova-shell-v5/);for(const file of ['premium.css','premium-ui.js','assets/farm-landscape.png','assets/fonts/Lexend.ttf']){assert.ok(sw.includes(file));assert.ok(existsSync(new URL('../dist/'+file,import.meta.url)));}const css=readFileSync(new URL('../dist/premium.css',import.meta.url),'utf8');assert.doesNotMatch(css,/https:\/\//);});

