import {NextResponse} from 'next/server';
import {getCurrentUser} from '@/lib/auth';
import {db} from '@/lib/db';

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  const user=await getCurrentUser();
  if(!user?.customer)return NextResponse.json({error:'Unauthorized'},{status:401});
  const {id}=await params;
  const app=await db.application.findFirst({where:{id,customerId:user.customer.id},include:{subscription:{include:{plan:true}},billingTransactions:{orderBy:{createdAt:'desc'},take:5}}});
  if(!app)return NextResponse.json({error:'Application not found'},{status:404});
  const s=app.subscription,p=s?.plan;
  return NextResponse.json({applicationId:app.id,plan:p?{id:p.id,name:p.name,priceKobo:Number(p.priceKobo),billingInterval:p.billingInterval}:null,status:s?.status||null,currentPeriodEnd:s?.currentPeriodEnd?.toISOString()||null,recentTransactions:app.billingTransactions.map(t=>({reference:t.reference,status:t.status,amountKobo:Number(t.amountKobo),currency:t.currency,createdAt:t.createdAt.toISOString(),paidAt:t.paidAt?.toISOString()||null}))});
}
