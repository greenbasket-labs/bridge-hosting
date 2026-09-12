import {NextResponse} from 'next/server';
import {getCurrentUser} from '@/lib/auth';
import {db} from '@/lib/db';

export async function GET(req:Request){
  const user=await getCurrentUser();
  if(!user?.customer)return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!process.env.PAYSTACK_SECRET_KEY)return NextResponse.json({error:'PAYSTACK_SECRET_KEY is not configured'},{status:503});
  const reference=new URL(req.url).searchParams.get('reference')||'';
  if(!reference)return NextResponse.json({error:'reference is required'},{status:400});
  const tx=await db.billingTransaction.findFirst({where:{reference,customerId:user.customer.id},include:{application:true,plan:true}});
  if(!tx)return NextResponse.json({error:'Payment not found'},{status:404});
  if(tx.status==='PAID')return NextResponse.json({status:'PAID',applicationId:tx.applicationId});
  try{
    const r=await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,{headers:{Authorization:`Bearer ${process.env.PAYSTACK_SECRET_KEY}`}});
    const x=await r.json();
    if(!r.ok||!x?.status)throw new Error(x?.message||'Paystack verification failed');
    const payment=x.data;
    const providerTransactionId=payment?.id==null?'':String(payment.id);
    const paid=payment?.status==='success'&&String(payment?.reference)===reference&&providerTransactionId!==''&&String(payment?.currency||'NGN')==='NGN'&&Number(payment?.amount)===Number(tx.amountKobo);
    if(!paid){
      await db.billingTransaction.update({where:{id:tx.id},data:{status:payment?.status==='failed'?'FAILED':'PENDING'}});
      return NextResponse.json({status:payment?.status||'PENDING',verified:false});
    }
    const existing=await db.billingTransaction.findUnique({where:{providerTransactionId},select:{id:true,status:true}});
    if(existing&&existing.id!==tx.id)return NextResponse.json({status:'DUPLICATE',verified:false});
    const end=new Date();
    if(tx.plan.billingInterval==='YEARLY')end.setFullYear(end.getFullYear()+1);else end.setMonth(end.getMonth()+1);
    try{
      await db.$transaction([
        db.billingTransaction.update({where:{id:tx.id},data:{status:'PAID',providerTransactionId,paidAt:new Date(payment.paid_at||Date.now())}}),
        db.subscription.update({where:{applicationId:tx.applicationId},data:{planId:tx.planId,status:'ACTIVE',currentPeriodEnd:end}}),
        db.auditLog.create({data:{userId:user.id,action:'BILLING_PAYMENT_CONFIRMED',entityType:'BillingTransaction',entityId:tx.id,metadata:{applicationId:tx.applicationId,planId:tx.planId,reference,providerTransactionId,source:'paystack_verify'}}})
      ]);
    }catch(error){
      const message=error instanceof Error?error.message:'';
      if(message.includes('Unique constraint')&&message.includes('providerTransactionId'))return NextResponse.json({status:'DUPLICATE',verified:false});
      throw error;
    }
    return NextResponse.json({status:'PAID',verified:true,applicationId:tx.applicationId,currentPeriodEnd:end.toISOString()});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Payment verification failed'},{status:502});}
}
