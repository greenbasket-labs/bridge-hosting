export type ProviderAppConfig={name:string,buildCommand?:string|null,startCommand?:string|null,rootDirectory?:string|null,branch:string,repo:string,env?:Record<string,string>};
export type ProviderDeployment={id:string,status:string,logs:string};
export type ProviderDomain={target:string,verified:boolean,sslActive:boolean};
export interface HostingProvider {
  createApplication(config:ProviderAppConfig):Promise<{resourceId:string,internalUrl:string}>;
  deploy(resourceId:string,commitSha?:string):Promise<ProviderDeployment>;
  stop(resourceId:string):Promise<void>;
  start(resourceId:string):Promise<void>;
  restart(resourceId:string):Promise<void>;
  delete(resourceId:string):Promise<void>;
  getStatus(resourceId:string):Promise<string>;
  getLogs(resourceId:string):Promise<string>;
  getMetrics(resourceId:string):Promise<{cpuPercent:number,ramPercent:number,storagePercent:number,bandwidthPercent:number,requests:number,concurrentUsers:number}>;
  configureDomain(resourceId:string,hostname:string):Promise<ProviderDomain>;
  getDeploymentStatus(resourceId:string,deploymentId:string):Promise<ProviderDeployment>;
}
