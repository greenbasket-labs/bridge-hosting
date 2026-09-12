import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {getProvider} from '@/lib/providers';

function authorized(req:Request){const secret=process.env.INTERNAL_CRON_SECRET;return Boolean(secret&&req.headers.get('x-bridge-cron-secret')===secret);}

export async function POST(req:Request){
  if(!authorized(req))return NextResponse.json({error:'Unauthorized'},{status:401});
  try{
    const apps=await db.application.findMany({where:{status:{in:['LIVE','DEPLOYING']}},select:{id:true,providerResourceId:true}});
    const provider=getProvider();let checked=0,failed=0;
    for(const app of apps){
      if(!app.providerResourceId)continue;
      try{
        const m=await provider.getMetrics(app.providerResourceId);
        await db.usageRecord.create({data:{applicationId:app.id,cpuPercent:m.cpuPercent,ramPercent:m.ramPercent,storagePercent:m.storagePercent,bandwidthPercent:m.bandwidthPercent,requests:m.requests,concurrentUsers:m.concurrentUsers}});
        checked++;
      }catch{failed++;}
    }
    return NextResponse.json({ok:true,checked,failed});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Usage reconciliation failed'},{status:500});}
}
