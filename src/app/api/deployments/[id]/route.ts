import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {getCurrentUser} from '@/lib/auth';
import {getProvider} from '@/lib/providers';
import {checkApplicationHealth} from '@/lib/health';

function normalizeStatus(status:string){const s=status.toUpperCase();if(['SUCCESS','SUCCEEDED','LIVE','COMPLETED'].includes(s))return 'SUCCESS' as const;if(['BUILD_FAILED','BUILD_ERROR'].includes(s))return 'BUILD_FAILED' as const;if(['FAILED','ERROR','UPDATE_FAILED'].includes(s))return 'FAILED' as const;if(['DEPLOYING','DEPLOYED','UPDATE_IN_PROGRESS'].includes(s))return 'DEPLOYING' as const;if(['HEALTH_CHECK','HEALTHCHECK'].includes(s))return 'HEALTH_CHECK' as const;if(['BUILDING','BUILD','IN_PROGRESS','BUILD_IN_PROGRESS'].includes(s))return 'BUILDING' as const;if(['CANCELLED','CANCELED'].includes(s))return 'CANCELLED' as const;return 'QUEUED' as const;}
const label:Record<string,string>={QUEUED:'Waiting to deploy',BUILDING:'Building application',DEPLOYING:'Deploying application',HEALTH_CHECK:'Checking application health',SUCCESS:'Deployment successful',FAILED:'Deployment failed',BUILD_FAILED:'Build failed',CANCELLED:'Deployment cancelled',ROLLED_BACK:'Rolled back'};
function healthUrl(app:{internalDomain:string;healthCheckPath:string}){try{return new URL(app.healthCheckPath||'/',app.internalDomain).toString();}catch{return app.internalDomain;}}

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await getCurrentUser();
    if(!user?.customer)return NextResponse.json({error:'Unauthorized'},{status:401});
    const {id}=await params;
    const deployment=await db.deployment.findFirst({where:{id,application:{customerId:user.customer.id}}});
    if(!deployment)return NextResponse.json({error:'Deployment not found'},{status:404});
    if(!deployment.providerDeploymentId)return NextResponse.json({deployment,statusLabel:label[deployment.status]||deployment.status});
    const app=await db.application.findUnique({where:{id:deployment.applicationId}});
    if(!app?.providerResourceId)return NextResponse.json({error:'Application provider resource not found'},{status:409});
    const pd=await getProvider().getDeploymentStatus(app.providerResourceId,deployment.providerDeploymentId);
    let status=normalizeStatus(pd.status);const now=new Date();const data:any={status};
    if(pd.logs)data.logs=pd.logs;
    if(status==='BUILDING'&&!deployment.buildStartedAt)data.buildStartedAt=now;
    if(['DEPLOYING','HEALTH_CHECK'].includes(status)){if(!deployment.buildFinishedAt)data.buildFinishedAt=now;if(!deployment.deploymentStartedAt)data.deploymentStartedAt=now;}
    if(status==='SUCCESS'){
      await db.application.update({where:{id:app.id},data:{availabilityStatus:'CHECKING'}});
      const health=await checkApplicationHealth(healthUrl(app));
      await db.application.update({where:{id:app.id},data:{availabilityStatus:health.healthy?'ONLINE':'OFFLINE',healthCheckedAt:now,healthCheckStatus:health.status,healthCheckLatencyMs:health.latencyMs,healthCheckError:health.healthy?null:health.error||`HTTP ${health.status}`}});
      if(!health.healthy){status='HEALTH_CHECK';data.status=status;data.logs=`Deployment reached the provider, but Bridge could not confirm the application is healthy (${health.error||`HTTP ${health.status}`}).`;}
      else{data.logs=`Deployment successful. Health check passed on ${app.healthCheckPath||'/'} with HTTP ${health.status} in ${health.latencyMs}ms.`;data.deploymentFinishedAt=now;}
    }
    if(['FAILED','BUILD_FAILED'].includes(status))data.errorMessage=pd.logs||'Deployment failed. Check the deployment logs for details.';
    if(['FAILED','BUILD_FAILED','CANCELLED'].includes(status))data.deploymentFinishedAt=deployment.deploymentFinishedAt||now;
    const updated=await db.deployment.update({where:{id},data});
    const latest=await db.deployment.findFirst({where:{applicationId:app.id},orderBy:{createdAt:'desc'}});
    if(latest?.id===id){
      if(status==='SUCCESS')await db.application.update({where:{id:app.id},data:{status:'LIVE',deploymentStatus:'SUCCESS',availabilityStatus:'ONLINE'}});
      else if(['BUILDING','DEPLOYING','HEALTH_CHECK','QUEUED'].includes(status))await db.application.update({where:{id:app.id},data:{status:'DEPLOYING',deploymentStatus:status,availabilityStatus:'CHECKING'}});
      else if(['FAILED','BUILD_FAILED','CANCELLED'].includes(status)){const previousSuccess=await db.deployment.findFirst({where:{applicationId:app.id,status:'SUCCESS',id:{not:id}},orderBy:{createdAt:'desc'}});await db.application.update({where:{id:app.id},data:{status:previousSuccess?'LIVE':'FAILED',deploymentStatus:status,availabilityStatus:previousSuccess?'UNKNOWN':'OFFLINE'}});}
    }
    const applicationStatus=await db.application.findUnique({where:{id:app.id},select:{status:true,deploymentStatus:true,availabilityStatus:true,healthCheckPath:true,healthCheckedAt:true,healthCheckStatus:true,healthCheckLatencyMs:true,healthCheckError:true}});
    return NextResponse.json({deployment:updated,statusLabel:label[status]||status,applicationStatus});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not reconcile deployment'},{status:500});}
}
