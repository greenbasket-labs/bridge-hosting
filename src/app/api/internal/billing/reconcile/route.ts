import {NextResponse} from 'next/server';
import {db} from '@/lib/db';

const secret=()=>process.env.INTERNAL_CRON_SECRET||'';

export async function POST(req:Request){
  if(!secret()||req.headers.get('x-bridge-cron-secret')!==secret())return NextResponse.json({error:'Unauthorized'},{status:401});
  const now=new Date();
  const subs=await db.subscription.findMany({where:{status:{in:['TRIALING','ACTIVE']},currentPeriodEnd:{not:null,lte:now}},select:{id:true,applicationId:true,customerId:true,status:true,currentPeriodEnd:true}});
  let expired=0;
  for(const sub of subs){
    await db.$transaction([
      db.subscription.update({where:{id:sub.id},data:{status:'PAST_DUE'}}),
      db.auditLog.create({data:{action:'BILLING_PERIOD_EXPIRED',entityType:'Subscription',entityId:sub.id,metadata:{applicationId:sub.applicationId,customerId:sub.customerId,previousStatus:sub.status,currentPeriodEnd:sub.currentPeriodEnd?.toISOString()}}}),
      db.notification.create({data:{userId:(await db.customer.findUnique({where:{id:sub.customerId},select:{userId:true}}))!.userId,type:'BILLING_PAST_DUE',title:'Payment required',message:'Your Bridge subscription period has ended. Please complete payment to keep your application active.'}})
    ]);
    expired++;
  }
  return NextResponse.json({ok:true,expired});
}
