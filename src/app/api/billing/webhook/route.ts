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
    const providerTransactionId=payment?.id==null?'':String(payment.id);
    if(!reference||!providerTransactionId)return NextResponse.json({error:'Missing payment identity'},{status:400});

    const tx=await db.billingTransaction.findUnique({where:{reference},include:{plan:true,customer:{include:{user:true}}}});
    if(!tx)return NextResponse.json({ok:true,ignored:true});
    if(tx.status==='PAID')return NextResponse.json({ok:true,duplicate:true});

    const existing=await db.billingTransaction.findUnique({where:{providerTransactionId},select:{id:true,status:true}});
    if(existing&&existing.id!==tx.id)return NextResponse.json({ok:true,duplicate:true});

    const amount=Number(payment?.amount);
    if(payment?.status!=='success'||String(payment?.currency||'')!==tx.currency||amount!==Number(tx.amountKobo)){
      await db.billingTransaction.update({where:{id:tx.id},data:{status:'FAILED',providerTransactionId}});
      await db.auditLog.create({data:{userId:tx.customer.userId,action:'BILLING_WEBHOOK_REJECTED',entityType:'BillingTransaction',entityId:tx.id,metadata:{reference,providerTransactionId,reason:'amount_or_currency_mismatch'}}});
      return NextResponse.json({ok:true,rejected:true});
    }

    const end=new Date();
    if(tx.plan.billingInterval==='YEARLY')end.setFullYear(end.getFullYear()+1);else end.setMonth(end.getMonth()+1);
    try{
      await db.$transaction([
        db.billingTransaction.update({where:{id:tx.id},data:{status:'PAID',providerTransactionId,paidAt:new Date(payment?.paid_at||Date.now())}}),
        db.subscription.update({where:{applicationId:tx.applicationId},data:{planId:tx.planId,status:'ACTIVE',currentPeriodEnd:end}}),
        db.auditLog.create({data:{userId:tx.customer.userId,action:'BILLING_PAYMENT_CONFIRMED',entityType:'BillingTransaction',entityId:tx.id,metadata:{applicationId:tx.applicationId,planId:tx.planId,reference,providerTransactionId,source:'paystack_webhook'}}})
      ]);
    }catch(error){
      const message=error instanceof Error?error.message:'';
      if(message.includes('Unique constraint')&&message.includes('providerTransactionId'))return NextResponse.json({ok:true,duplicate:true});
      throw error;
    }
    return NextResponse.json({ok:true,processed:true});
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:'Webhook processing failed'},{status:500});
  }
}
