import {NextResponse} from 'next/server';
import {getCurrentUser} from '@/lib/auth';
import {db} from '@/lib/db';

export async function POST(req:Request){
  const user=await getCurrentUser();
  if(!user?.customer)return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!process.env.PAYSTACK_SECRET_KEY)return NextResponse.json({error:'PAYSTACK_SECRET_KEY is not configured'},{status:503});
  let body:any;try{body=await req.json();}catch{return NextResponse.json({error:'Invalid JSON body'},{status:400});}
  const applicationId=typeof body?.applicationId==='string'?body.applicationId:'';
  if(!applicationId)return NextResponse.json({error:'applicationId is required'},{status:400});
  const app=await db.application.findFirst({where:{id:applicationId,customerId:user.customer.id},include:{subscription:{include:{plan:true}}}});
  if(!app)return NextResponse.json({error:'Application not found'},{status:404});
  const plan=app.subscription?.plan;
  if(!plan||!plan.active)return NextResponse.json({error:'Application has no active billing plan'},{status:409});
  const amount=plan.priceKobo;
  if(amount<=0n)return NextResponse.json({error:'This plan does not require payment'},{status:409});
  const reference=`bridge-${crypto.randomUUID()}`;
  const tx=await db.billingTransaction.create({data:{customerId:user.customer.id,applicationId:app.id,planId:plan.id,reference,amountKobo:amount}});
  try{
    const r=await fetch('https://api.paystack.co/transaction/initialize',{method:'POST',headers:{Authorization:`Bearer ${process.env.PAYSTACK_SECRET_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({email:user.email,amount:amount.toString(),currency:'NGN',reference,callback_url:`${process.env.APP_URL||'http://localhost:3000'}/billing/callback`,metadata:{billingTransactionId:tx.id,applicationId:app.id,planId:plan.id}})});
    const x=await r.json();
    if(!r.ok||!x?.status||!x?.data?.authorization_url)throw new Error(x?.message||'Paystack payment initialization failed');
    await db.auditLog.create({data:{userId:user.id,action:'BILLING_PAYMENT_INITIALIZED',entityType:'BillingTransaction',entityId:tx.id,metadata:{applicationId:app.id,planId:plan.id,reference,amountKobo:amount.toString()}}});
    return NextResponse.json({authorizationUrl:x.data.authorization_url,reference});
  }catch(e){
    const message=e instanceof Error?e.message:'Payment initialization failed';
    await db.billingTransaction.update({where:{id:tx.id},data:{status:'FAILED'}});
    return NextResponse.json({error:message},{status:502});
  }
}
