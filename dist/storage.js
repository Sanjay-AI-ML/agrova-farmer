const DB='agrova-farmer-v1';
let connection;
export async function openStore() {
  if(!('indexedDB' in globalThis))throw new Error('IndexedDB is unavailable. Changes will last only for this session.');
  connection=await new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('local');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(new Error('Local storage could not be opened.'));});
}
export async function readState() {if(!connection)return null;return new Promise((resolve,reject)=>{const r=connection.transaction('local').objectStore('local').get('state');r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);});}
export async function saveState(state) {if(!connection)throw new Error('Storage is not available.');return new Promise((resolve,reject)=>{const tx=connection.transaction('local','readwrite');tx.objectStore('local').put(state,'state');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
export async function readIncoming(){if(!connection)return [];return new Promise((resolve,reject)=>{const r=connection.transaction('local').objectStore('local').get('incoming');r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error);});}
export async function appendIncoming(entry){if(!connection)await openStore();return new Promise((resolve,reject)=>{const tx=connection.transaction('local','readwrite'),store=tx.objectStore('local'),r=store.get('incoming');r.onsuccess=()=>{const list=r.result||[];if(!list.some(e=>e.id===entry.id))store.put([entry,...list].slice(0,100),'incoming');};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
