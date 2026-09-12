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
    const name=String(event?.event||'');
    const data=event?.data||{};

    if(name==='charge.success'){
      const reference=String(data?.reference||'');
      const providerTransactionId=data?.id==null?'':String(data.id);
      if(!reference||!providerTransactionId)return NextResponse.json({error:'Missing payment identity'},{status:400});
      const tx=await db.billingTransaction.findUnique({where:{reference},include:{plan:true,customer:{include:{user:true}}}});
      if(!tx)return NextResponse.json({ok:true,ignored:true});
      if(tx.status==='PAID')return NextResponse.json({ok:true,duplicate:true});
      const existing=await db.billingTransaction.findUnique({where:{providerTransactionId},select:{id:true,status:true}});
      if(existing&&existing.id!==tx.id)return NextResponse.json({ok:true,duplicate:true});
      const amount=Number(data?.amount);
      if(data?.status!=='success'||String(data?.currency||'')!==tx.currency||amount!==Number(tx.amountKobo)){
        await db.billingTransaction.update({where:{id:tx.id},data:{status:'FAILED',providerTransactionId}});
        await db.auditLog.create({data:{userId:tx.customer.userId,action:'BILLING_WEBHOOK_REJECTED',entityType:'BillingTransaction',entityId:tx.id,metadata:{reference,providerTransactionId,reason:'amount_or_currency_mismatch'}}});
        return NextResponse.json({ok:true,rejected:true});
      }
      const end=new Date();
      if(tx.plan.billingInterval==='YEARLY')end.setFullYear(end.getFullYear()+1);else end.setMonth(end.getMonth()+1);
      try{
        await db.$transaction([
          db.billingTransaction.update({where:{id:tx.id},data:{status:'PAID',providerTransactionId,paidAt:new Date(data?.paid_at||Date.now())}}),
          db.subscription.update({where:{applicationId:tx.applicationId},data:{planId:tx.planId,status:'ACTIVE',currentPeriodEnd:end}}),
          db.auditLog.create({data:{userId:tx.customer.userId,action:'BILLING_PAYMENT_CONFIRMED',entityType:'BillingTransaction',entityId:tx.id,metadata:{applicationId:tx.applicationId,planId:tx.planId,reference,providerTransactionId,source:'paystack_webhook'}}})
        ]);
      }catch(error){
        const message=error instanceof Error?error.message:'';
        if(message.includes('Unique constraint')&&message.includes('providerTransactionId'))return NextResponse.json({ok:true,duplicate:true});
        throw error;
      }
      return NextResponse.json({ok:true,processed:true});
    }

    if(name==='subscription.create'){
      const code=String(data?.subscription_code||data?.subscription?.subscription_code||'');
      const email=String(data?.customer?.email||'').toLowerCase();
      const planCode=String(data?.plan?.plan_code||data?.plan?.code||'');
      if(!code||!email||!planCode)return NextResponse.json({ok:true,ignored:true});
      const sub=await db.subscription.findFirst({
        where:{paystackSubscriptionCode:null,plan:{paystackPlanCode:planCode},customer:{user:{email}}},
        orderBy:{createdAt:'desc'},
        include:{customer:{include:{user:true}}}
      });
      if(!sub)return NextResponse.json({ok:true,ignored:true});
      await db.subscription.update({where:{id:sub.id},data:{paystackSubscriptionCode:code,status:'ACTIVE'}});
      await db.auditLog.create({data:{userId:sub.customer.userId,action:'BILLING_SUBSCRIPTION_CREATED',entityType:'Subscription',entityId:sub.id,metadata:{paystackSubscriptionCode:code}}});
      return NextResponse.json({ok:true,processed:true});
    }

    const code=String(data?.subscription?.subscription_code||data?.subscription_code||'');
    if(name==='invoice.payment_failed'){
      if(!code)return NextResponse.json({ok:true,ignored:true});
      const sub=await db.subscription.findUnique({where:{paystackSubscriptionCode:code},include:{customer:{include:{user:true}}}});
      if(!sub)return NextResponse.json({ok:true,ignored:true});
      await db.subscription.update({where:{id:sub.id},data:{status:'PAST_DUE'}});
      await db.auditLog.create({data:{userId:sub.customer.userId,action:'BILLING_RECURRING_PAYMENT_FAILED',entityType:'Subscription',entityId:sub.id,metadata:{paystackSubscriptionCode:code}}});
      return NextResponse.json({ok:true,processed:true});
    }

    if(name==='invoice.update'){
      if(!code)return NextResponse.json({ok:true,ignored:true});
      const sub=await db.subscription.findUnique({where:{paystackSubscriptionCode:code},include:{customer:{include:{user:true}}}});
      if(!sub)return NextResponse.json({ok:true,ignored:true});
      if(data?.status==='success'&&data?.paid===true){
        const periodEnd=data?.period_end?new Date(data.period_end):null;
        await db.subscription.update({where:{id:sub.id},data:{status:'ACTIVE',...(periodEnd&&!Number.isNaN(periodEnd.getTime())?{currentPeriodEnd:periodEnd}:{})}});
        await db.auditLog.create({data:{userId:sub.customer.userId,action:'BILLING_RECURRING_PAYMENT_CONFIRMED',entityType:'Subscription',entityId:sub.id,metadata:{paystackSubscriptionCode:code,invoiceCode:data?.invoice_code||null}}});
      }
      return NextResponse.json({ok:true,processed:true});
    }

    if(name==='subscription.not_renew'){
      if(!code)return NextResponse.json({ok:true,ignored:true});
      const sub=await db.subscription.findUnique({where:{paystackSubscriptionCode:code},include:{customer:{include:{user:true}}}});
      if(!sub)return NextResponse.json({ok:true,ignored:true});
      await db.auditLog.create({data:{userId:sub.customer.userId,action:'BILLING_SUBSCRIPTION_NOT_RENEWING',entityType:'Subscription',entityId:sub.id,metadata:{paystackSubscriptionCode:code}}});
      return NextResponse.json({ok:true,processed:true});
    }

    if(name==='subscription.disable'){
      if(!code)return NextResponse.json({ok:true,ignored:true});
      const sub=await db.subscription.findUnique({where:{paystackSubscriptionCode:code},include:{customer:{include:{user:true}}}});
      if(!sub)return NextResponse.json({ok:true,ignored:true});
      await db.subscription.update({where:{id:sub.id},data:{status:'CANCELLED'}});
      await db.auditLog.create({data:{userId:sub.customer.userId,action:'BILLING_SUBSCRIPTION_DISABLED',entityType:'Subscription',entityId:sub.id,metadata:{paystackSubscriptionCode:code}}});
      return NextResponse.json({ok:true,processed:true});
    }

    return NextResponse.json({ok:true,ignored:true});
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:'Webhook processing failed'},{status:500});
  }
}
