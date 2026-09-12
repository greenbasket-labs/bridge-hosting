import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {getCurrentUser} from '@/lib/auth';
import {getProvider} from '@/lib/providers';

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await getCurrentUser();
    if(!user?.customer)return NextResponse.json({error:'Unauthorized'},{status:401});
    const {id}=await params;
    const domain=await db.domain.findFirst({where:{id,application:{customerId:user.customer.id}},include:{application:true}});
    if(!domain)return NextResponse.json({error:'Domain not found'},{status:404});
    if(!domain.application.providerResourceId)return NextResponse.json({error:'Application provider resource not found'},{status:409});

    let providerDomain;
    try{providerDomain=await getProvider().configureDomain(domain.application.providerResourceId,domain.hostname);}catch(e){
      const updated=await db.domain.update({where:{id},data:{status:'ERROR'}});
      return NextResponse.json({domain:updated,error:e instanceof Error?e.message:'Provider domain check failed'},{status:502});
    }

    const verified=Boolean(providerDomain.verified);
    const sslActive=Boolean(providerDomain.sslActive);
    const status=sslActive?'ACTIVE':verified?'SSL_PENDING':'VERIFYING';
    const updated=await db.domain.update({where:{id},data:{status,target:providerDomain.target||domain.target,sslActive}});
    return NextResponse.json({domain:updated,provider:{target:providerDomain.target,verified,sslActive},message:status==='ACTIVE'?'Domain is active over HTTPS.':status==='SSL_PENDING'?'DNS is verified; SSL is still being provisioned.':'Domain is configured but provider verification is still pending.'});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Domain reconciliation failed'},{status:500});}
}
