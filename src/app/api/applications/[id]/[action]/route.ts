import {NextResponse} from 'next/server';
import {getCurrentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import {getProvider} from '@/lib/providers';

export async function POST(_:Request,{params}:{params:Promise<{id:string,action:string}>}){
  try{
    const user=await getCurrentUser();
    if(!user?.customer)return NextResponse.json({error:'Unauthorized'},{status:401});
    const {id,action}=await params;
    const app=await db.application.findFirst({where:{id,customerId:user.customer.id}});
    if(!app||!app.providerResourceId)return NextResponse.json({error:'Application not found'},{status:404});
    const p=getProvider();
    if(action==='suspend'){await db.application.update({where:{id},data:{status:'STOPPING'}});await p.stop(app.providerResourceId);return NextResponse.json({ok:true,status:'STOPPING'});}
    if(action==='resume'){await db.application.update({where:{id},data:{status:'STARTING'}});await p.start(app.providerResourceId);return NextResponse.json({ok:true,status:'STARTING'});}
    if(action==='restart'){await p.restart(app.providerResourceId);return NextResponse.json({ok:true});}
    if(action==='deploy'){
      const active=await db.deployment.findFirst({where:{applicationId:id,status:{in:['QUEUED','BUILDING','DEPLOYING','HEALTH_CHECK']}},orderBy:{createdAt:'desc'}});
      if(active)return NextResponse.json({error:'A deployment is already in progress',deploymentId:active.id},{status:409});
      const d=await db.deployment.create({data:{applicationId:id,status:'QUEUED',branch:app.branch}});
      await db.application.update({where:{id},data:{status:'DEPLOYING',deploymentStatus:'QUEUED'}});
      try{
        const x=await p.deploy(app.providerResourceId);
        await db.deployment.update({where:{id:d.id},data:{providerDeploymentId:x.id,status:'QUEUED'}});
      }catch(e){
        await db.deployment.update({where:{id:d.id},data:{status:'FAILED',errorMessage:e instanceof Error?e.message:'Deployment failed',deploymentFinishedAt:new Date()}});
        await db.application.update({where:{id},data:{status:'FAILED',deploymentStatus:'FAILED'}});
        return NextResponse.json({ok:false,deploymentId:d.id,status:'FAILED'},{status:202});
      }
      return NextResponse.json({ok:true,deploymentId:d.id,status:'QUEUED'},{status:202});
    }
    return NextResponse.json({error:'Unsupported action'},{status:400});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Action failed'},{status:500});}
}
