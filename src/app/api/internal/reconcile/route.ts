import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {getProvider} from '@/lib/providers';
import {checkApplicationHealth} from '@/lib/health';

function authorized(req:Request){
  const secret=process.env.INTERNAL_CRON_SECRET;
  return Boolean(secret&&req.headers.get('x-bridge-cron-secret')===secret);
}

function normalizeStatus(status:string){
  const s=status.toUpperCase();
  if(['SUCCESS','SUCCEEDED','LIVE','COMPLETED'].includes(s))return 'SUCCESS' as const;
  if(['BUILD_FAILED','BUILD_ERROR'].includes(s))return 'BUILD_FAILED' as const;
  if(['FAILED','ERROR','UPDATE_FAILED'].includes(s))return 'FAILED' as const;
  if(['DEPLOYING','DEPLOYED','UPDATE_IN_PROGRESS'].includes(s))return 'DEPLOYING' as const;
  if(['HEALTH_CHECK','HEALTHCHECK'].includes(s))return 'HEALTH_CHECK' as const;
  if(['BUILDING','BUILD','IN_PROGRESS','BUILD_IN_PROGRESS'].includes(s))return 'BUILDING' as const;
  if(['CANCELLED','CANCELED'].includes(s))return 'CANCELLED' as const;
  return 'QUEUED' as const;
}

export async function POST(req:Request){
  if(!authorized(req))return NextResponse.json({error:'Unauthorized'},{status:401});
  try{
    const pending=await db.deployment.findMany({where:{status:{in:['QUEUED','BUILDING','DEPLOYING','HEALTH_CHECK']},providerDeploymentId:{not:null}},include:{application:true},orderBy:{createdAt:'asc'},take:25});
    const provider=getProvider();
    let reconciled=0;
    for(const deployment of pending){
      if(!deployment.application.providerResourceId)continue;
      try{
        const pd=await provider.getDeploymentStatus(deployment.application.providerResourceId,deployment.providerDeploymentId!);
        let status=normalizeStatus(pd.status); const now=new Date();
        const data:any={status};
        if(pd.logs)data.logs=pd.logs;
        if(status==='BUILDING'&&!deployment.buildStartedAt)data.buildStartedAt=now;
        if(['DEPLOYING','HEALTH_CHECK'].includes(status)){
          if(!deployment.buildFinishedAt)data.buildFinishedAt=now;
          if(!deployment.deploymentStartedAt)data.deploymentStartedAt=now;
        }
        if(status==='SUCCESS'){
          const url=deployment.application.internalDomain;
          if(/^https?:\/\//i.test(url)){
            const health=await checkApplicationHealth(url);
            if(!health.healthy){
              status='HEALTH_CHECK';
              data.status='HEALTH_CHECK';
              data.logs=`Provider deployment succeeded, but application health check failed (${health.error||`HTTP ${health.status}`}).`;
              if(Date.now()-deployment.createdAt.getTime()>15*60*1000){
                status='FAILED';
                data.status='FAILED';
                data.errorMessage='Deployment timed out waiting for a healthy application.';
                data.deploymentFinishedAt=now;
              }
            }else{
              data.logs=`Health check passed: HTTP ${health.status} in ${health.latencyMs}ms.`;
              data.buildFinishedAt=data.buildFinishedAt||now;
              data.deploymentStartedAt=data.deploymentStartedAt||now;
              data.deploymentFinishedAt=now;
            }
          }else{
            data.buildFinishedAt=data.buildFinishedAt||now;
            data.deploymentStartedAt=data.deploymentStartedAt||now;
            data.deploymentFinishedAt=now;
          }
        }
        if(['FAILED','BUILD_FAILED','CANCELLED'].includes(status)){
          if(!data.buildFinishedAt)data.buildFinishedAt=now;
          if(!data.deploymentFinishedAt)data.deploymentFinishedAt=now;
        }
        if(['FAILED','BUILD_FAILED'].includes(status)&&!data.errorMessage)data.errorMessage=pd.logs||'Deployment failed';
        await db.deployment.update({where:{id:deployment.id},data});
        const latest=await db.deployment.findFirst({where:{applicationId:deployment.applicationId},orderBy:{createdAt:'desc'}});
        if(latest?.id===deployment.id){
          if(status==='SUCCESS')await db.application.update({where:{id:deployment.applicationId},data:{status:'LIVE',deploymentStatus:'SUCCESS'}});
          else if(['QUEUED','BUILDING','DEPLOYING','HEALTH_CHECK'].includes(status))await db.application.update({where:{id:deployment.applicationId},data:{status:'DEPLOYING',deploymentStatus:status}});
          else if(['FAILED','BUILD_FAILED','CANCELLED'].includes(status)){
            const previousSuccess=await db.deployment.findFirst({where:{applicationId:deployment.applicationId,status:'SUCCESS',id:{not:deployment.id}},orderBy:{createdAt:'desc'}});
            await db.application.update({where:{id:deployment.applicationId},data:{status:previousSuccess?'LIVE':'FAILED',deploymentStatus:status}});
          }
        }
        reconciled++;
      }catch(e){await db.deployment.update({where:{id:deployment.id},data:{errorMessage:e instanceof Error?e.message:'Reconciliation failed'}});}
    }
    return NextResponse.json({ok:true,checked:pending.length,reconciled});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Reconciliation failed'},{status:500});}
}
