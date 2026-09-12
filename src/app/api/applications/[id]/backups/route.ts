import {NextResponse} from 'next/server';
import {getCurrentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import {getProvider} from '@/lib/providers';

function serializeBackup(backup:{id:string;applicationId:string;status:string;storageRef:string|null;sizeBytes:bigint|null;completedAt:Date|null;createdAt:Date}){
  return {...backup,sizeBytes:backup.sizeBytes===null?null:Number(backup.sizeBytes)};
}

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await getCurrentUser();
    if(!user?.customer)return NextResponse.json({error:'Unauthorized'},{status:401});
    const {id}=await params;
    const app=await db.application.findFirst({where:{id,customerId:user.customer.id},select:{id:true}});
    if(!app)return NextResponse.json({error:'Application not found'},{status:404});
    const backups=await db.backup.findMany({where:{applicationId:id},orderBy:{createdAt:'desc'},take:50});
    return NextResponse.json({backups:backups.map(serializeBackup)});
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:'Failed to load backups'},{status:500});
  }
}

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
  const user=await getCurrentUser();
  if(!user?.customer)return NextResponse.json({error:'Unauthorized'},{status:401});

  const {id}=await params;
  const app=await db.application.findFirst({where:{id,customerId:user.customer.id}});
  if(!app)return NextResponse.json({error:'Application not found'},{status:404});
  if(!app.databaseResourceId)return NextResponse.json({error:'Application has no database backup resource configured'},{status:409});

  const provider=getProvider(app.provider);
  if(!provider.createBackup)return NextResponse.json({error:`Provider ${app.provider} does not support backups`},{status:409});

  const backup=await db.backup.create({data:{applicationId:id,status:'PENDING'}});

  try{
    const providerBackup=await provider.createBackup(app.databaseResourceId);
    const completed=providerBackup.status==='COMPLETED';
    const updated=await db.backup.update({
      where:{id:backup.id},
      data:{
        status:completed?'COMPLETED':'PENDING',
        storageRef:providerBackup.id,
        completedAt:completed?new Date(providerBackup.createdAt??Date.now()):null,
        sizeBytes:providerBackup.sizeBytes??null,
      },
    });
    await db.auditLog.create({data:{userId:user.id,action:'BACKUP_CREATED',entityType:'Backup',entityId:updated.id,metadata:{applicationId:id,provider:app.provider,providerBackupId:providerBackup.id,status:updated.status}}});
    return NextResponse.json({backup:serializeBackup(updated)},{status:202});
  }catch(e){
    const message=e instanceof Error?e.message:'Backup creation failed';
    const failed=await db.backup.update({where:{id:backup.id},data:{status:'FAILED'}});
    await db.auditLog.create({data:{userId:user.id,action:'BACKUP_FAILED',entityType:'Backup',entityId:failed.id,metadata:{applicationId:id,provider:app.provider,error:message}}});
    return NextResponse.json({error:message,backup:serializeBackup(failed)},{status:502});
  }
}
