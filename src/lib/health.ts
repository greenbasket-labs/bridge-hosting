export type HealthCheckResult={healthy:boolean,status:number|null,latencyMs:number,error?:string};

export async function checkApplicationHealth(url:string):Promise<HealthCheckResult>{
  const started=Date.now();
  try{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),Number(process.env.HEALTH_CHECK_TIMEOUT_MS||10000));
    const response=await fetch(url,{method:'GET',redirect:'follow',signal:controller.signal,cache:'no-store'});
    clearTimeout(timeout);
    return {healthy:response.ok,status:response.status,latencyMs:Date.now()-started};
  }catch(e){
    return {healthy:false,status:null,latencyMs:Date.now()-started,error:e instanceof Error?e.message:'Health check failed'};
  }
}
