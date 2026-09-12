export type HealthCheckResult={healthy:boolean,status:number|null,latencyMs:number,error?:string};

const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

export async function checkApplicationHealth(url:string):Promise<HealthCheckResult>{
  const retries=Math.max(1,Number(process.env.HEALTH_CHECK_RETRIES||2));
  const timeoutMs=Math.max(1000,Number(process.env.HEALTH_CHECK_TIMEOUT_MS||10000));
  const started=Date.now();
  let last:HealthCheckResult={healthy:false,status:null,latencyMs:0,error:'Health check failed'};
  for(let attempt=1;attempt<=retries;attempt++){
    const attemptStarted=Date.now();
    try{
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),timeoutMs);
      const response=await fetch(url,{method:'GET',redirect:'follow',signal:controller.signal,cache:'no-store'});
      clearTimeout(timeout);
      last={healthy:response.ok,status:response.status,latencyMs:Date.now()-attemptStarted,error:response.ok?undefined:`HTTP ${response.status}`};
      if(response.ok)return {healthy:true,status:response.status,latencyMs:Date.now()-started};
    }catch(e){
      last={healthy:false,status:null,latencyMs:Date.now()-attemptStarted,error:e instanceof Error?e.message:'Health check failed'};
    }
    if(attempt<retries)await sleep(Math.min(1000*attempt,3000));
  }
  return {...last,latencyMs:Date.now()-started};
}
