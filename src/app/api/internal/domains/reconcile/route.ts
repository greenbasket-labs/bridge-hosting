import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {getProvider} from '@/lib/providers';

function authorized(req:Request){const secret=process.env.INTERNAL_CRON_SECRET;return Boolean(secret&&req.headers.get('x-bridge-cron-secret')===secret);}

export async function POST(req:Request){
  if(!authorized(req))return NextResponse.json({error:'Unauthorized'},{status:401});
  try{
    const domains=await db.domain.findMany({where:{status:{in:['VERIFYING','SSL_PENDING']}},include:{application:true},take:50,orderBy:{updatedAt:'asc'}});
    const provider=getProvider();let checked=0,active=0,pending=0,errors=0;
    for(const domain of domains){
      if(!domain.application.providerResourceId)continue;
      try{
        const d=await provider.configureDomain(domain.application.providerResourceId,domain.hostname);
        const status=d.sslActive?'ACTIVE':d.verified?'SSL_PENDING':'VERIFYING';
        await db.domain.update({where:{id:domain.id},data:{status,target:d.target||domain.target,sslActive:d.sslActive}});
        checked++;if(status==='ACTIVE')active++;else pending++;
      }catch(e){
        errors++;await db.domain.update({where:{id:domain.id},data:{status:'ERROR'}});
      }
    }
    return NextResponse.json({ok:true,checked,active,pending,errors});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Domain reconciliation failed'},{status:500});}
}
