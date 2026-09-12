import {NextResponse} from 'next/server';
import {getCurrentUser} from '@/lib/auth';
import {db} from '@/lib/db';

export async function GET(){
  const user=await getCurrentUser();
  if(!user?.customer)return NextResponse.json({error:'Unauthorized'},{status:401});
  const plans=await db.plan.findMany({where:{active:true},orderBy:{priceKobo:'asc'},select:{id:true,name:true,priceKobo:true,billingInterval:true,cpuCores:true,ramMb:true,requests:true,concurrentUsers:true}});
  return NextResponse.json({plans:plans.map(p=>({...p,priceKobo:Number(p.priceKobo)}))});
}
