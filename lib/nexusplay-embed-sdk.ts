/** 注入至 iframe 內 HTML 的 NexusPlay 平台 SDK（統一身份 + 雲端存檔） */
export function buildNexusPlayEmbedSdkScript() {
  return `<script id="nexusplay-embed-sdk">
(function(){
  var AUTH_TYPE='nexusplay:auth';
  var READY_TYPE='nexusplay:ready';
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
    if(!d||d.type!==AUTH_TYPE)return;
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
        reject(new Error('NexusPlay auth timeout'));
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

  window.NexusPlay={
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
      if(!gameId)throw new Error('NexusPlay: missing gameId');
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
      try{cloud=await window.NexusPlay.loadSave();}catch(_e){}
      var merged=mergeSaves(local,cloud);
      if(merged&&user){
        try{await window.NexusPlay.saveSave(merged);}catch(_e){}
      }
      return merged;
    },
    saveSave:async function(payload){
      if(!gameId)throw new Error('NexusPlay: missing gameId');
      var res=await fetch('/api/games/'+gameId+'/save',{
        method:'PUT',
        credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({save:payload})
      });
      if(res.status===401)throw new Error('NexusPlay: login required');
      if(!res.ok){
        var err=await res.json().catch(function(){return {};});
        throw new Error(err.error||('saveSave failed: '+res.status));
      }
      var data=await res.json();
      return data.save??null;
    },
    importLegacySave:async function(code){
      if(!gameId)throw new Error('NexusPlay: missing gameId');
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

  try{
    window.parent.postMessage({type:READY_TYPE,gameId:gameId},location.origin);
  }catch(_e){}

  window.addEventListener('message',function(e){
    if(e.origin!==location.origin)return;
    var d=e.data;
    if(!d||d.type!=='nexusplay:resize')return;
    document.documentElement.style.setProperty('--np-embed-width',(d.width||0)+'px');
    document.documentElement.style.setProperty('--np-embed-height',(d.height||0)+'px');
    document.documentElement.classList.toggle('np-embed-expanded',!!d.expanded);
    window.dispatchEvent(new Event('resize'));
  });
})();
</script>`;
}

export type NexusPlayAuthUser = {
  id: string;
  displayName: string;
  isOwner?: boolean;
  editUrl?: string | null;
};

export const NEXUSPLAY_AUTH_MESSAGE = "nexusplay:auth";
export const NEXUSPLAY_READY_MESSAGE = "nexusplay:ready";
export const NEXUSPLAY_RESIZE_MESSAGE = "nexusplay:resize";
export const NEXUSPLAY_LEAVE_MESSAGE = "nexusplay:leave";
export const NEXUSPLAY_LEAVE_CONFIRM_REQUEST =
  "nexusplay:leave-confirm-request";
export const NEXUSPLAY_LEAVE_CONFIRM_RESPONSE =
  "nexusplay:leave-confirm-response";

export type NexusPlayLeaveConfirmRequest = {
  type: typeof NEXUSPLAY_LEAVE_CONFIRM_REQUEST;
  requestId: string;
  message?: string;
};

export type NexusPlayLeaveConfirmResponse = {
  type: typeof NEXUSPLAY_LEAVE_CONFIRM_RESPONSE;
  requestId: string;
  confirmed: boolean;
};
