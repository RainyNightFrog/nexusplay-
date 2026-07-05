/** 注入至 iframe 內 HTML 的 NexusPlay 平台 SDK（統一身份 + 雲端存檔） */
export function buildNexusPlayEmbedSdkScript() {
  return `<script id="nexusplay-embed-sdk">
(function(){
  var AUTH_TYPE='nexusplay:auth';
  var READY_TYPE='nexusplay:ready';
  var match=location.pathname.match(/\\/api\\/games\\/(\\d+)\\/embed/);
  var gameId=match?parseInt(match[1],10):null;
  var user=undefined;
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

  window.NexusPlay={
    gameId:gameId,
    getUser:function(){
      if(!authSettled)return null;
      return user?Object.assign({},user):null;
    },
    waitForAuth:waitForAuth,
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
    }
  };

  try{
    window.parent.postMessage({type:READY_TYPE,gameId:gameId},location.origin);
  }catch(_e){}
})();
</script>`;
}

export type NexusPlayAuthUser = {
  id: string;
  displayName: string;
};

export const NEXUSPLAY_AUTH_MESSAGE = "nexusplay:auth";
export const NEXUSPLAY_READY_MESSAGE = "nexusplay:ready";
