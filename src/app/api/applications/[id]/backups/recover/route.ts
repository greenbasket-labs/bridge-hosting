import {NextResponse} from 'next/server';
import {getCurrentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import {getProvider} from '@/lib/providers';

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  const user=await getCurrentUser();
  if(!user?.customer)return NextResponse.json({error:'Unauthorized'},{status:401});
  const {id}=await params;
  const app=await db.application.findFirst({where:{id,customerId:user.customer.id}});
  if(!app)return NextResponse.json({error:'Application not found'},{status:404});
  if(!app.databaseResourceId)return NextResponse.json({error:'Application has no database recovery resource configured'},{status:409});
  const provider=getProvider(app.provider);
  if(!provider.createRecovery)return NextResponse.json({error:`Provider ${app.provider} does not support isolated database recovery`},{status:409});
  let body:any;
  try{body=await req.json();}catch{return NextResponse.json({error:'Invalid JSON body'},{status:400});}
  const restoreTime=typeof body?.restoreTime==='string'?body.restoreTime:'';
  const name=typeof body?.name==='string'?body.name.trim():'';
  if(!restoreTime||!name)return NextResponse.json({error:'restoreTime and name are required'},{status:400});
  const when=new Date(restoreTime);
  if(Number.isNaN(when.getTime()))return NextResponse.json({error:'restoreTime must be a valid ISO timestamp'},{status:400});
  if(when.getTime()>Date.now()-10*60*1000)return NextResponse.json({error:'restoreTime must be at least 10 minutes in the past'},{status:400});
  try{
    const recovery=await provider.createRecovery(app.databaseResourceId,when.toISOString(),name);
    await db.auditLog.create({data:{userId:user.id,action:'BACKUP_RECOVERY_STARTED',entityType:'Application',entityId:app.id,metadata:{applicationId:app.id,provider:app.provider,recoveryId:recovery.id,restoreTime:when.toISOString(),name,status:recovery.status}}});
    return NextResponse.json({recovery},{status:202});
  }catch(e){
    const message=e instanceof Error?e.message:'Recovery start failed';
    await db.auditLog.create({data:{userId:user.id,action:'BACKUP_RECOVERY_FAILED',entityType:'Application',entityId:app.id,metadata:{applicationId:app.id,provider:app.provider,restoreTime:when.toISOString(),name,error:message}}});
    return NextResponse.json({error:message},{status:502});
  }
}

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
  const user=await getCurrentUser();
  if(!user?.customer)return NextResponse.json({error:'Unauthorized'},{status:401});
  const {id}=await params;
  const app=await db.application.findFirst({where:{id,customerId:user.customer.id}});
  if(!app)return NextResponse.json({error:'Application not found'},{status:404});
  if(!app.databaseResourceId)return NextResponse.json({error:'Application has no database recovery resource configured'},{status:409});
  const provider=getProvider(app.provider);
  if(!provider.getRecoveryStatus)return NextResponse.json({error:`Provider ${app.provider} does not support recovery status lookup`},{status:409});
  const recoveryId=new URL(req.url).searchParams.get('recoveryId');
  if(!recoveryId)return NextResponse.json({error:'recoveryId is required'},{status:400});
  try{return NextResponse.json({recovery:await provider.getRecoveryStatus(app.databaseResourceId,recoveryId)});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Recovery status lookup failed'},{status:502});}
}
