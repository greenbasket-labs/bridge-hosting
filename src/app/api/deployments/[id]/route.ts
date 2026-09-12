import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {getCurrentUser} from '@/lib/auth';
import {getProvider} from '@/lib/providers';

function normalizeStatus(status:string){
  const s=status.toUpperCase();
  if(['SUCCESS','SUCCEEDED','LIVE','COMPLETED'].includes(s))return 'SUCCESS' as const;
  if(['BUILD_FAILED','BUILD_ERROR'].includes(s))return 'BUILD_FAILED' as const;
  if(['FAILED','ERROR'].includes(s))return 'FAILED' as const;
  if(['DEPLOYING','DEPLOYED'].includes(s))return 'DEPLOYING' as const;
  if(['HEALTH_CHECK','HEALTHCHECK'].includes(s))return 'HEALTH_CHECK' as const;
  if(['BUILDING','BUILD','IN_PROGRESS'].includes(s))return 'BUILDING' as const;
  if(['CANCELLED','CANCELED'].includes(s))return 'CANCELLED' as const;
  return 'QUEUED' as const;
}

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await getCurrentUser();
    if(!user?.customer)return NextResponse.json({error:'Unauthorized'},{status:401});
    const {id}=await params;
    const deployment=await db.deployment.findFirst({where:{id,application:{customerId:user.customer.id}}});
    if(!deployment)return NextResponse.json({error:'Deployment not found'},{status:404});
    if(!deployment.providerDeploymentId)return NextResponse.json({deployment});

    const app=await db.application.findUnique({where:{id:deployment.applicationId}});
    if(!app?.providerResourceId)return NextResponse.json({error:'Application provider resource not found'},{status:409});
    const provider=getProvider();
    const providerDeployment=await provider.getDeploymentStatus(app.providerResourceId,deployment.providerDeploymentId);
    const status=normalizeStatus(providerDeployment.status);
    const now=new Date();
    const data:{status:typeof status;logs?:string;errorMessage?:string|null;buildFinishedAt?:Date;deploymentStartedAt?:Date;deploymentFinishedAt?:Date}={status};
    if(providerDeployment.logs)data.logs=providerDeployment.logs;
    if(status==='BUILDING'&&!deployment.buildStartedAt)data.buildFinishedAt=undefined;
    if(status==='DEPLOYING'&&!deployment.deploymentStartedAt)data.deploymentStartedAt=now;
    if(['SUCCESS','FAILED','BUILD_FAILED','CANCELLED'].includes(status))data.deploymentFinishedAt=deployment.deploymentFinishedAt||now;
    if(['FAILED','BUILD_FAILED'].includes(status))data.errorMessage=providerDeployment.logs||'Deployment failed';
    const updated=await db.deployment.update({where:{id},data});

    const latest=await db.deployment.findFirst({where:{applicationId:app.id},orderBy:{createdAt:'desc'}});
    if(latest?.id===id){
      if(status==='SUCCESS')await db.application.update({where:{id:app.id},data:{status:'LIVE',deploymentStatus:'SUCCESS'}});
      else if(['BUILDING','DEPLOYING','HEALTH_CHECK','QUEUED'].includes(status))await db.application.update({where:{id:app.id},data:{status:'DEPLOYING',deploymentStatus:status}});
      else if(['FAILED','BUILD_FAILED','CANCELLED'].includes(status)){
        const previousSuccess=await db.deployment.findFirst({where:{applicationId:app.id,status:'SUCCESS',id:{not:id}},orderBy:{createdAt:'desc'}});
        await db.application.update({where:{id:app.id},data:{status:previousSuccess?'LIVE':'FAILED',deploymentStatus:status}});
      }
    }
    return NextResponse.json({deployment:updated,applicationStatus:(await db.application.findUnique({where:{id:app.id},select:{status:true,deploymentStatus:true}}))});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not reconcile deployment'},{status:500});}
}
