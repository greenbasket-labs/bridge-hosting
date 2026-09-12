import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {getProvider} from '@/lib/providers';

function authorized(req:Request){const secret=process.env.INTERNAL_CRON_SECRET;return Boolean(secret&&req.headers.get('x-bridge-cron-secret')===secret);}

export async function POST(req:Request){
  if(!authorized(req))return NextResponse.json({error:'Unauthorized'},{status:401});
  try{
    const apps=await db.application.findMany({where:{status:'LIVE',databaseResourceId:{not:null}},select:{id:true,customer:{select:{userId:true}},provider:true,databaseResourceId:true,subscription:{select:{plan:{select:{backupRetentionDays:true}}}}}});
    let created=0,skipped=0,unsupported=0,failed=0,expired=0;
    const since=new Date(Date.now()-24*60*60*1000);
    for(const app of apps){
      const retentionDays=app.subscription?.plan.backupRetentionDays??0;
      if(retentionDays<=0){skipped++;continue;}
      const cutoff=new Date(Date.now()-retentionDays*24*60*60*1000);
      const stale=await db.backup.findMany({where:{applicationId:app.id,createdAt:{lt:cutoff},status:{in:['COMPLETED','PENDING']}},select:{id:true,status:true}});
      if(stale.length){
        await db.backup.updateMany({where:{id:{in:stale.map(x=>x.id)}},data:{status:'EXPIRED'}});
        for(const backup of stale){await db.auditLog.create({data:{userId:app.customer.userId,action:'BACKUP_EXPIRED',entityType:'Backup',entityId:backup.id,metadata:{applicationId:app.id,provider:app.provider,previousStatus:backup.status,retentionDays}}});}
        expired+=stale.length;
      }
      const recent=await db.backup.findFirst({where:{applicationId:app.id,createdAt:{gte:since}},select:{id:true}});
      if(recent){skipped++;continue;}
      const provider=getProvider(app.provider);
      if(!provider.createBackup){unsupported++;continue;}
      const backup=await db.backup.create({data:{applicationId:app.id,status:'PENDING'}});
      try{
        const result=await provider.createBackup(app.databaseResourceId!);
        const completed=result.status==='COMPLETED';
        await db.backup.update({where:{id:backup.id},data:{status:completed?'COMPLETED':'PENDING',storageRef:result.id,sizeBytes:result.sizeBytes??null,completedAt:completed?new Date(result.createdAt??Date.now()):null}});
        await db.auditLog.create({data:{userId:app.customer.userId,action:'BACKUP_SCHEDULED',entityType:'Backup',entityId:backup.id,metadata:{applicationId:app.id,provider:app.provider,providerBackupId:result.id,status:completed?'COMPLETED':'PENDING'}}});
        created++;
      }catch(e){
        const message=e instanceof Error?e.message:'Scheduled backup failed';
        await db.backup.update({where:{id:backup.id},data:{status:'FAILED'}});
        await db.auditLog.create({data:{userId:app.customer.userId,action:'BACKUP_SCHEDULED_FAILED',entityType:'Backup',entityId:backup.id,metadata:{applicationId:app.id,provider:app.provider,error:message}}});
        failed++;
      }
    }
    return NextResponse.json({ok:true,created,skipped,unsupported,failed,expired});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Backup reconciliation failed'},{status:500});}
}
