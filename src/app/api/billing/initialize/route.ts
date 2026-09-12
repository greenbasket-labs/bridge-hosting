import {NextResponse} from 'next/server';
import {getCurrentUser} from '@/lib/auth';
import {db} from '@/lib/db';

export async function POST(req:Request){
  const user=await getCurrentUser();
  if(!user?.customer)return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!process.env.PAYSTACK_SECRET_KEY)return NextResponse.json({error:'PAYSTACK_SECRET_KEY is not configured'},{status:503});
  let body:any;try{body=await req.json();}catch{return NextResponse.json({error:'Invalid JSON body'},{status:400});}
  const applicationId=typeof body?.applicationId==='string'?body.applicationId:'';
  const planId=typeof body?.planId==='string'?body.planId:'';
  if(!applicationId||!planId)return NextResponse.json({error:'applicationId and planId are required'},{status:400});
  const app=await db.application.findFirst({where:{id:applicationId,customerId:user.customer.id},include:{subscription:true}});
  if(!app)return NextResponse.json({error:'Application not found'},{status:404});
  const plan=await db.plan.findFirst({where:{id:planId,active:true}});
  if(!plan)return NextResponse.json({error:'Plan not found'},{status:404});
  if(app.subscription?.planId===plan.id)return NextResponse.json({error:'Application is already on this plan'},{status:409});
  if(plan.priceKobo<=0n)return NextResponse.json({error:'This plan does not require payment'},{status:409});
  const amount=plan.priceKobo;
  const reference=`bridge-${crypto.randomUUID()}`;
  const tx=await db.billingTransaction.create({data:{customerId:user.customer.id,applicationId:app.id,planId:plan.id,reference,amountKobo:amount}});
  try{
    const payload:any={email:user.email,amount:amount.toString(),currency:'NGN',reference,callback_url:`${process.env.APP_URL||'http://localhost:3000'}/billing/callback`,metadata:{billingTransactionId:tx.id,applicationId:app.id,planId:plan.id}};
    if(plan.paystackPlanCode)payload.plan=plan.paystackPlanCode;
    const r=await fetch('https://api.paystack.co/transaction/initialize',{method:'POST',headers:{Authorization:`Bearer ${process.env.PAYSTACK_SECRET_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const x=await r.json();
    if(!r.ok||!x?.status||!x?.data?.authorization_url)throw new Error(x?.message||'Paystack payment initialization failed');
    await db.auditLog.create({data:{userId:user.id,action:'BILLING_PAYMENT_INITIALIZED',entityType:'BillingTransaction',entityId:tx.id,metadata:{applicationId:app.id,planId:plan.id,reference,amountKobo:amount.toString(),recurring:Boolean(plan.paystackPlanCode)}}});
    return NextResponse.json({authorizationUrl:x.data.authorization_url,reference});
  }catch(e){
    const message=e instanceof Error?e.message:'Payment initialization failed';
    await db.billingTransaction.update({where:{id:tx.id},data:{status:'FAILED'}});
    return NextResponse.json({error:message},{status:502});
  }
}
