import {NextResponse} from 'next/server';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {db} from '@/lib/db';

export const runtime='nodejs';

function validSignature(rawBody:string,signature:string,secret:string){
  const expected=createHmac('sha512',secret).update(rawBody).digest('hex');
  const a=Buffer.from(expected,'utf8');
  const b=Buffer.from(signature,'utf8');
  return a.length===b.length&&timingSafeEqual(a,b);
}

export async function POST(req:Request){
  const secret=process.env.PAYSTACK_SECRET_KEY;
  if(!secret)return NextResponse.json({error:'PAYSTACK_SECRET_KEY is not configured'},{status:503});
  const rawBody=await req.text();
  const signature=req.headers.get('x-paystack-signature')||'';
  if(!signature||!validSignature(rawBody,signature,secret))return NextResponse.json({error:'Invalid signature'},{status:401});

  try{
    const event=JSON.parse(rawBody);
    if(event?.event!=='charge.success')return NextResponse.json({ok:true,ignored:true});
    const payment=event?.data;
    const reference=String(payment?.reference||'');
    if(!reference)return NextResponse.json({error:'Missing payment reference'},{status:400});

    const tx=await db.billingTransaction.findUnique({where:{reference},include:{plan:true,customer:{include:{user:true}}}});
    if(!tx)return NextResponse.json({ok:true,ignored:true});
    if(tx.status==='PAID')return NextResponse.json({ok:true,duplicate:true});

    const amount=Number(payment?.amount);
    if(payment?.status!=='success'||String(payment?.currency||'')!==tx.currency||amount!==Number(tx.amountKobo)){
      await db.billingTransaction.update({where:{id:tx.id},data:{status:'FAILED'}});
      await db.auditLog.create({data:{userId:tx.customer.userId,action:'BILLING_WEBHOOK_REJECTED',entityType:'BillingTransaction',entityId:tx.id,metadata:{reference,reason:'amount_or_currency_mismatch'}}});
      return NextResponse.json({ok:true,rejected:true});
    }

    const end=new Date();
    if(tx.plan.billingInterval==='YEARLY')end.setFullYear(end.getFullYear()+1);else end.setMonth(end.getMonth()+1);
    await db.$transaction([
      db.billingTransaction.update({where:{id:tx.id},data:{status:'PAID',paidAt:new Date(payment?.paid_at||Date.now())}}),
      db.subscription.update({where:{applicationId:tx.applicationId},data:{planId:tx.planId,status:'ACTIVE',currentPeriodEnd:end}}),
      db.auditLog.create({data:{userId:tx.customer.userId,action:'BILLING_PAYMENT_CONFIRMED',entityType:'BillingTransaction',entityId:tx.id,metadata:{applicationId:tx.applicationId,planId:tx.planId,reference,source:'paystack_webhook'}}})
    ]);
    return NextResponse.json({ok:true,processed:true});
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:'Webhook processing failed'},{status:500});
  }
}
