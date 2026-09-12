import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {getCurrentUser} from '@/lib/auth';

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await getCurrentUser();
    if(!user?.customer)return NextResponse.json({error:'Unauthorized'},{status:401});
    const {id}=await params;
    const deployment=await db.deployment.findFirst({where:{id,application:{customerId:user.customer.id}}});
    if(!deployment)return NextResponse.json({error:'Deployment not found'},{status:404});
    if(!['QUEUED','BUILDING','DEPLOYING','HEALTH_CHECK'].includes(deployment.status))return NextResponse.json({error:'Deployment cannot be cancelled in its current state'},{status:409});
    const updated=await db.deployment.update({where:{id},data:{status:'CANCELLED',errorMessage:'Cancelled by customer',deploymentFinishedAt:new Date()}});
    const latest=await db.deployment.findFirst({where:{applicationId:deployment.applicationId},orderBy:{createdAt:'desc'}});
    if(latest?.id===id){
      const previousSuccess=await db.deployment.findFirst({where:{applicationId:deployment.applicationId,status:'SUCCESS'},orderBy:{createdAt:'desc'}});
      await db.application.update({where:{id:deployment.applicationId},data:{status:previousSuccess?'LIVE':'FAILED',deploymentStatus:'CANCELLED'}});
    }
    return NextResponse.json({deployment:updated});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not cancel deployment'},{status:500});}
}
