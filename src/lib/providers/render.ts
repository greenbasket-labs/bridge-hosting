import type { HostingProvider, ProviderAppConfig, ProviderDeployment } from './types';
const base='https://api.render.com/v1';
const key=()=>{if(!process.env.RENDER_API_KEY) throw new Error('RENDER_API_KEY is not configured');return process.env.RENDER_API_KEY};
async function api(path:string,init:RequestInit={}){const r=await fetch(`${base}${path}`,{...init,headers:{Authorization:`Bearer ${key()}`,'Content-Type':'application/json',...(init.headers||{})}});if(!r.ok) throw new Error(`Render API ${r.status}: ${await r.text()}`);return r.json()}
function latest(x:any){const series=Array.isArray(x)?x:(Array.isArray(x?.data)?x.data:[]);let point:any=null;for(const s of series){const values=Array.isArray(s?.values)?s.values:[];if(values.length){const p=values[values.length-1];if(!point||new Date(p.timestamp).getTime()>new Date(point.timestamp).getTime()) point=p;}}return Number(point?.value||0)}
async function metric(path:string,id:string){return api(`${path}?resource=${encodeURIComponent(id)}&resolutionSeconds=60&aggregationMethod=AVG`)}
export class RenderProvider implements HostingProvider {
 async createApplication(c:ProviderAppConfig){const body={type:'web_service',name:c.name,repo:c.repo,branch:c.branch,autoDeploy:'yes',buildCommand:c.buildCommand||'npm install && npm run build',startCommand:c.startCommand||'npm start',rootDir:c.rootDirectory||undefined,envVars:Object.entries(c.env||{}).map(([key,value])=>({key,value}))};const x=await api('/services',{method:'POST',body:JSON.stringify(body)});const s=x.service||x;return {resourceId:s.id,internalUrl:s.serviceDetails?.url||s.url||''};}
 async deploy(id:string,commitSha?:string){const x=await api(`/services/${id}/deploys`,{method:'POST',body:JSON.stringify(commitSha?{commitId:commitSha}:{})});return {id:x.deploy?.id||x.id,status:x.deploy?.status||x.status||'QUEUED',logs:''};}
 async stop(id:string){await api(`/services/${id}/suspend`,{method:'POST'});} async start(id:string){await api(`/services/${id}/resume`,{method:'POST'});} async restart(id:string){await api(`/services/${id}/restart`,{method:'POST'});} async delete(id:string){await api(`/services/${id}`,{method:'DELETE'});}
 async getStatus(id:string){const x=await api(`/services/${id}`);return x.service?.suspended?'SUSPENDED':x.service?.suspendedAt?'SUSPENDED':x.service?.state||'UNKNOWN';}
 async getLogs(id:string){const x=await api(`/services/${id}/logs?limit=200`);return JSON.stringify(x);}
 async getMetrics(id:string){
  const [cpu,cpuLimit,memory,memoryLimit,disk,diskCapacity,requests]=await Promise.all([
   metric('/metrics/cpu',id),metric('/metrics/cpu-limit',id),metric('/metrics/memory',id),metric('/metrics/memory-limit',id),metric('/metrics/disk-usage',id),metric('/metrics/disk-capacity',id),metric('/metrics/http-requests',id)
  ]);
  const cpuUsed=latest(cpu),cpuMax=latest(cpuLimit),ramUsed=latest(memory),ramMax=latest(memoryLimit),diskUsed=latest(disk),diskMax=latest(diskCapacity);
  return {cpuPercent:cpuMax>0?Math.min(100,(cpuUsed/cpuMax)*100):0,ramPercent:ramMax>0?Math.min(100,(ramUsed/ramMax)*100):0,storagePercent:diskMax>0?Math.min(100,(diskUsed/diskMax)*100):0,bandwidthPercent:0,requests:latest(requests),concurrentUsers:0};
 }
 async configureDomain(id:string,hostname:string){const x=await api(`/services/${id}/custom-domains`,{method:'POST',body:JSON.stringify({name:hostname})});const d=x.customDomain||x;return {target:d.domain?.name||d.name||'',verified:d.verificationStatus==='verified',sslActive:d.sslStatus==='active'};}
 async getDeploymentStatus(id:string,did:string):Promise<ProviderDeployment>{const x=await api(`/services/${id}/deploys/${did}`);const d=x.deploy||x;return {id:d.id,status:d.status||'UNKNOWN',logs:''};}
}
