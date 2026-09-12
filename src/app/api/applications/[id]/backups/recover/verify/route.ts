import {NextResponse} from 'next/server';
import {getCurrentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import {getProvider} from '@/lib/providers';

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
  const user=await getCurrentUser();
  if(!user?.customer)return NextResponse.json({error:'Unauthorized'},{status:401});
  const {id}=await params;
  const app=await db.application.findFirst({where:{id,customerId:user.customer.id}});
  if(!app)return NextResponse.json({error:'Application not found'},{status:404});
  if(!app.databaseResourceId)return NextResponse.json({error:'Application has no database recovery resource configured'},{status:409});
  const provider=getProvider(app.provider);
  if(!provider.getRecoveryStatus)return NextResponse.json({error:`Provider ${app.provider} does not support recovery verification`},{status:409});
  const recoveryId=new URL(req.url).searchParams.get('recoveryId');
  if(!recoveryId)return NextResponse.json({error:'recoveryId is required'},{status:400});
  try{
    const recovery=await provider.getRecoveryStatus(app.databaseResourceId,recoveryId);
    const status=String(recovery.status||'').toUpperCase();
    const ready=['AVAILABLE','READY','LIVE','RUNNING','SUCCEEDED','SUCCESS','COMPLETED'].includes(status);
    const verified=Boolean(ready&&recovery.resourceId);
    await db.auditLog.create({data:{userId:user.id,action:verified?'BACKUP_RECOVERY_VERIFIED':'BACKUP_RECOVERY_NOT_READY',entityType:'Application',entityId:app.id,metadata:{applicationId:app.id,provider:app.provider,recoveryId,recoveryStatus:recovery.status,resourceId:recovery.resourceId||null}}});
    return NextResponse.json({verified,recovery,cutoverRequired:true});
  }catch(e){
    const message=e instanceof Error?e.message:'Recovery verification failed';
    await db.auditLog.create({data:{userId:user.id,action:'BACKUP_RECOVERY_VERIFICATION_FAILED',entityType:'Application',entityId:app.id,metadata:{applicationId:app.id,provider:app.provider,recoveryId,error:message}}});
    return NextResponse.json({error:message},{status:502});
  }
}
