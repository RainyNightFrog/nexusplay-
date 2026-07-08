/** 注入至 iframe 內 HTML 的 RainyNightFrog 平台 SDK（統一身份 + 雲端存檔） */
export function buildRainyNightFrogEmbedSdkScript() {
  return `<script id="rainynightfrog-embed-sdk">
(function(){
  var AUTH_TYPES=['rainynightfrog:auth','nexusplay:auth'];
  var READY_TYPE='rainynightfrog:ready';
  var LEGACY_READY_TYPE='nexusplay:ready';
  var match=location.pathname.match(/\\/api\\/games\\/(\\d+)\\/embed/);
  var gameId=match?parseInt(match[1],10):null;
  if(!gameId){
    var gidParam=new URLSearchParams(location.search).get('gid');
    if(gidParam&&!isNaN(parseInt(gidParam,10)))gameId=parseInt(gidParam,10);
  }
  var user=undefined;
  var ownerEditUrl=null;
  var authWaiters=[];
  var authSettled=false;

  function resolveAuth(){
    authSettled=true;
    var copy=user===undefined?null:user;
    authWaiters.splice(0).forEach(function(fn){fn(copy);});
  }

  window.addEventListener('message',function(e){
    if(e.origin!==location.origin)return;
    var d=e.data;
    if(!d||AUTH_TYPES.indexOf(d.type)===-1)return;
    user=d.user||null;
    if(d.editUrl){
      ownerEditUrl=d.editUrl;
    }else if(user&&user.editUrl){
      ownerEditUrl=user.editUrl;
    }else{
      ownerEditUrl=null;
    }
    resolveAuth();
  });

  function waitForAuth(ms){
    ms=ms||8000;
    return new Promise(function(resolve,reject){
      if(authSettled)return resolve(user===undefined?null:user);
      var timer=setTimeout(function(){
        reject(new Error('RainyNightFrog auth timeout'));
      },ms);
      authWaiters.push(function(u){
        clearTimeout(timer);
        resolve(u);
      });
    });
  }

  function mergeSaves(local,cloud){
    if(!local&&!cloud)return null;
    if(!local)return cloud?Object.assign({},cloud):null;
    if(!cloud)return Object.assign({},local);
    var result=Object.assign({},cloud);
    Object.keys(local).forEach(function(key){
      var lv=local[key],cv=result[key];
      if(typeof lv==='number'&&typeof cv==='number'){result[key]=Math.max(lv,cv);return;}
      if(lv&&cv&&typeof lv==='object'&&typeof cv==='object'&&!Array.isArray(lv)&&!Array.isArray(cv)){
        result[key]=mergeSaves(lv,cv)||cv;return;
      }
      if(cv===undefined)result[key]=lv;
    });
    return result;
  }

  function readLocalSave(localKey){
    if(typeof localKey==='function')return localKey();
    if(typeof localKey!=='string')return null;
    try{
      var raw=localStorage.getItem(localKey);
      if(!raw)return null;
      var parsed=JSON.parse(raw);
      if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return null;
      return parsed;
    }catch(_e){return null;}
  }

  var api={
    gameId:gameId,
    getUser:function(){
      if(!authSettled)return null;
      return user?Object.assign({},user):null;
    },
    getOwnerEditUrl:function(){
      return ownerEditUrl;
    },
    waitForAuth:waitForAuth,
    mergeSaves:mergeSaves,
    loadSave:async function(){
      if(!gameId)throw new Error('RainyNightFrog: missing gameId');
      var res=await fetch('/api/games/'+gameId+'/save',{credentials:'same-origin'});
      if(res.status===401)return null;
      if(!res.ok){
        var err=await res.json().catch(function(){return {};});
        throw new Error(err.error||('loadSave failed: '+res.status));
      }
      var data=await res.json();
      return data.save??null;
    },
    loadSaveMerged:async function(localKey){
      var local=readLocalSave(localKey);
      var cloud=null;
      try{cloud=await api.loadSave();}catch(_e){}
      var merged=mergeSaves(local,cloud);
      if(merged&&user){
        try{await api.saveSave(merged);}catch(_e){}
      }
      return merged;
    },
    saveSave:async function(payload){
      if(!gameId)throw new Error('RainyNightFrog: missing gameId');
      var res=await fetch('/api/games/'+gameId+'/save',{
        method:'PUT',
        credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({save:payload})
      });
      if(res.status===401)throw new Error('RainyNightFrog: login required');
      if(!res.ok){
        var err=await res.json().catch(function(){return {};});
        throw new Error(err.error||('saveSave failed: '+res.status));
      }
      var data=await res.json();
      return data.save??null;
    },
    importLegacySave:async function(code){
      if(!gameId)throw new Error('RainyNightFrog: missing gameId');
      var res=await fetch('/api/games/'+gameId+'/save/import-legacy',{
        method:'POST',
        credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({code:code})
      });
      var data=await res.json().catch(function(){return {};});
      if(!res.ok)throw new Error(data.error||('importLegacySave failed: '+res.status));
      return data.save??null;
    }
  };

  window.RainyNightFrog=api;
  window.NexusPlay=api;

  try{
    window.parent.postMessage({type:READY_TYPE,gameId:gameId},location.origin);
    window.parent.postMessage({type:LEGACY_READY_TYPE,gameId:gameId},location.origin);
  }catch(_e){}

  window.addEventListener('message',function(e){
    if(e.origin!==location.origin)return;
    var d=e.data;
    if(!d||d.type!=='rainynightfrog:resize'&&d.type!=='nexusplay:resize')return;
    document.documentElement.style.setProperty('--np-embed-width',(d.width||0)+'px');
    document.documentElement.style.setProperty('--np-embed-height',(d.height||0)+'px');
    document.documentElement.classList.toggle('np-embed-expanded',!!d.expanded);
    window.dispatchEvent(new Event('resize'));
  });
})();
</script>`;
}

/** @deprecated Use buildRainyNightFrogEmbedSdkScript */
export const buildNexusPlayEmbedSdkScript = buildRainyNightFrogEmbedSdkScript;

export type RainyNightFrogAuthUser = {
  id: string;
  displayName: string;
  isOwner?: boolean;
  editUrl?: string | null;
};

/** @deprecated Use RainyNightFrogAuthUser */
export type NexusPlayAuthUser = RainyNightFrogAuthUser;

export const RAINYNIGHTFROG_AUTH_MESSAGE = "rainynightfrog:auth";
export const RAINYNIGHTFROG_READY_MESSAGE = "rainynightfrog:ready";
export const RAINYNIGHTFROG_RESIZE_MESSAGE = "rainynightfrog:resize";
export const RAINYNIGHTFROG_LEAVE_MESSAGE = "rainynightfrog:leave";
export const RAINYNIGHTFROG_LEAVE_CONFIRM_REQUEST =
  "rainynightfrog:leave-confirm-request";
export const RAINYNIGHTFROG_LEAVE_CONFIRM_RESPONSE =
  "rainynightfrog:leave-confirm-response";

/** @deprecated Use RAINYNIGHTFROG_AUTH_MESSAGE */
export const NEXUSPLAY_AUTH_MESSAGE = RAINYNIGHTFROG_AUTH_MESSAGE;
/** @deprecated Use RAINYNIGHTFROG_READY_MESSAGE */
export const NEXUSPLAY_READY_MESSAGE = RAINYNIGHTFROG_READY_MESSAGE;
/** @deprecated Use RAINYNIGHTFROG_RESIZE_MESSAGE */
export const NEXUSPLAY_RESIZE_MESSAGE = RAINYNIGHTFROG_RESIZE_MESSAGE;
/** @deprecated Use RAINYNIGHTFROG_LEAVE_MESSAGE */
export const NEXUSPLAY_LEAVE_MESSAGE = RAINYNIGHTFROG_LEAVE_MESSAGE;
/** @deprecated Use RAINYNIGHTFROG_LEAVE_CONFIRM_REQUEST */
export const NEXUSPLAY_LEAVE_CONFIRM_REQUEST = RAINYNIGHTFROG_LEAVE_CONFIRM_REQUEST;
/** @deprecated Use RAINYNIGHTFROG_LEAVE_CONFIRM_RESPONSE */
export const NEXUSPLAY_LEAVE_CONFIRM_RESPONSE =
  RAINYNIGHTFROG_LEAVE_CONFIRM_RESPONSE;

export const LEGACY_NEXUSPLAY_AUTH_MESSAGE = "nexusplay:auth";
export const LEGACY_NEXUSPLAY_READY_MESSAGE = "nexusplay:ready";
export const LEGACY_NEXUSPLAY_RESIZE_MESSAGE = "nexusplay:resize";
export const LEGACY_NEXUSPLAY_LEAVE_MESSAGE = "nexusplay:leave";
export const LEGACY_NEXUSPLAY_LEAVE_CONFIRM_REQUEST =
  "nexusplay:leave-confirm-request";
export const LEGACY_NEXUSPLAY_LEAVE_CONFIRM_RESPONSE =
  "nexusplay:leave-confirm-response";

export type RainyNightFrogLeaveConfirmRequest = {
  type: typeof RAINYNIGHTFROG_LEAVE_CONFIRM_REQUEST;
  requestId: string;
  message?: string;
};

export type RainyNightFrogLeaveConfirmResponse = {
  type: typeof RAINYNIGHTFROG_LEAVE_CONFIRM_RESPONSE;
  requestId: string;
  confirmed: boolean;
};

/** @deprecated Use RainyNightFrogLeaveConfirmRequest */
export type NexusPlayLeaveConfirmRequest = RainyNightFrogLeaveConfirmRequest;

/** @deprecated Use RainyNightFrogLeaveConfirmResponse */
export type NexusPlayLeaveConfirmResponse = RainyNightFrogLeaveConfirmResponse;
