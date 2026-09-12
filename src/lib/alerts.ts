import {db} from '@/lib/db';

type AlertInput={type:string;title:string;message:string;customerUserId?:string;includeAdmins?:boolean;dedupeKey:string};

export async function createOperationalAlert(input:AlertInput){
  const userIds=new Set<string>();
  if(input.customerUserId)userIds.add(input.customerUserId);
  if(input.includeAdmins){
    const admins=await db.user.findMany({where:{role:'ADMIN'},select:{id:true}});
    for(const admin of admins)userIds.add(admin.id);
  }
  let created=0;
  const since=new Date(Date.now()-24*60*60*1000);
  for(const userId of userIds){
    const recent=await db.notification.findFirst({where:{userId,type:input.type,createdAt:{gte:since},message:{contains:input.dedupeKey}}});
    if(recent)continue;
    await db.notification.create({data:{userId,type:input.type,title:input.title,message:input.message}});
    created++;
  }
  return created;
}
