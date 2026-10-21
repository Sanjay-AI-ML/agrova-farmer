let player=null,finish=null,generation=0;
export function stopVoice(){generation++;if(player){player.pause();player.currentTime=0;}finish?.();finish=null;player=null;document.dispatchEvent(new CustomEvent('farmer-voice',{detail:{playing:false}}));}
export async function playClips(language,keys,{onError=()=>{},onComplete=()=>{}}={}){
  stopVoice();const token=generation;document.dispatchEvent(new CustomEvent('farmer-voice',{detail:{playing:true}}));
  try{for(const key of keys){if(token!==generation)return false;await new Promise((resolve,reject)=>{player=new Audio(new URL(`./assets/voice/${language}/${key}.mp3`,import.meta.url));player.preload='auto';finish=resolve;player.onended=resolve;player.onerror=()=>reject(new Error('Audio unavailable'));player.play().catch(reject);});}
    if(token===generation){onComplete();return true;}return false;
  }catch(error){onError(error);return false;}
  finally{if(token===generation){player=null;finish=null;document.dispatchEvent(new CustomEvent('farmer-voice',{detail:{playing:false}}));}}
}
