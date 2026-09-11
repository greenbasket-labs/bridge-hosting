import type { HostingProvider, ProviderAppConfig, ProviderDeployment } from './types';
const base='https://api.render.com/v1';
const key=()=>{if(!process.env.RENDER_API_KEY) throw new Error('RENDER_API_KEY is not configured');return process.env.RENDER_API_KEY};
async function api(path:string,init:RequestInit={}){const r=await fetch(`${base}${path}`,{...init,headers:{Authorization:`Bearer ${key()}`,'Content-Type':'application/json',...(init.headers||{})}});if(!r.ok) throw new Error(`Render API ${r.status}: ${await r.text()}`);return r.json()}
export class RenderProvider implements HostingProvider {
 async createApplication(c:ProviderAppConfig){const body={type:'web_service',name:c.name,repo:c.repo,branch:c.branch,autoDeploy:'yes',buildCommand:c.buildCommand||'npm install && npm run build',startCommand:c.startCommand||'npm start',rootDir:c.rootDirectory||undefined,envVars:Object.entries(c.env||{}).map(([key,value])=>({key,value}))};const x=await api('/services',{method:'POST',body:JSON.stringify(body)});const s=x.service||x;return {resourceId:s.id,internalUrl:s.serviceDetails?.url||s.url||''};}
 async deploy(id:string,commitSha?:string){const x=await api(`/services/${id}/deploys`,{method:'POST',body:JSON.stringify(commitSha?{commitId:commitSha}:{})});return {id:x.deploy?.id||x.id,status:x.deploy?.status||x.status||'QUEUED',logs:''};}
 async stop(id:string){await api(`/services/${id}/suspend`,{method:'POST'});} async start(id:string){await api(`/services/${id}/resume`,{method:'POST'});} async restart(id:string){await api(`/services/${id}/restart`,{method:'POST'});} async delete(id:string){await api(`/services/${id}`,{method:'DELETE'});}
 async getStatus(id:string){const x=await api(`/services/${id}`);return x.service?.suspended?'SUSPENDED':x.service?.suspendedAt?'SUSPENDED':x.service?.state||'UNKNOWN';}
 async getLogs(id:string){const x=await api(`/services/${id}/logs?limit=200`);return JSON.stringify(x);}
 async getMetrics(){return {cpuPercent:0,ramPercent:0,storagePercent:0,bandwidthPercent:0,requests:0,concurrentUsers:0};}
 async configureDomain(id:string,hostname:string){const x=await api(`/services/${id}/custom-domains`,{method:'POST',body:JSON.stringify({name:hostname})});const d=x.customDomain||x;return {target:d.domain?.name||d.name||'',verified:d.verificationStatus==='verified',sslActive:d.sslStatus==='active'};}
 async getDeploymentStatus(id:string,did:string):Promise<ProviderDeployment>{const x=await api(`/services/${id}/deploys/${did}`);const d=x.deploy||x;return {id:d.id,status:d.status||'UNKNOWN',logs:''};}
}
