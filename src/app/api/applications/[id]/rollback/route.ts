import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {getCurrentUser} from '@/lib/auth';
import {getProvider} from '@/lib/providers';

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await getCurrentUser();
    if(!user?.customer)return NextResponse.json({error:'Unauthorized'},{status:401});
    const {id}=await params;
    const app=await db.application.findFirst({where:{id,customerId:user.customer.id}});
    if(!app)return NextResponse.json({error:'Application not found'},{status:404});
    if(!app.providerResourceId)return NextResponse.json({error:'Application provider resource not found'},{status:409});
    const good=await db.deployment.findFirst({where:{applicationId:id,status:'SUCCESS',commitSha:{not:null}},orderBy:{createdAt:'desc'}});
    if(!good?.commitSha)return NextResponse.json({error:'No successful deployment is available for rollback'},{status:409});
    const d=await db.deployment.create({data:{applicationId:id,commitSha:good.commitSha,branch:good.branch,commitMessage:`Rollback to ${good.commitSha.slice(0,7)}`,status:'QUEUED'}});
    await db.application.update({where:{id},data:{status:'DEPLOYING',deploymentStatus:'QUEUED'}});
    try{
      const x=await getProvider().deploy(app.providerResourceId,good.commitSha);
      const updated=await db.deployment.update({where:{id:d.id},data:{providerDeploymentId:x.id,status:'QUEUED'}});
      return NextResponse.json({deployment:updated,rollbackTo:good.id});
    }catch(e){
      await db.deployment.update({where:{id:d.id},data:{status:'FAILED',errorMessage:e instanceof Error?e.message:'Rollback failed',deploymentFinishedAt:new Date()}});
      return NextResponse.json({error:e instanceof Error?e.message:'Rollback failed'},{status:502});
    }
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not rollback application'},{status:500});}
}
