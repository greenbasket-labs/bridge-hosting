import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {getProvider} from '@/lib/providers';

function authorized(req:Request){const secret=process.env.INTERNAL_CRON_SECRET;return Boolean(secret&&req.headers.get('x-bridge-cron-secret')===secret);}
function pct(value:number,limit:number){return limit>0?(value/limit)*100:0;}

export async function POST(req:Request){
  if(!authorized(req))return NextResponse.json({error:'Unauthorized'},{status:401});
  try{
    const apps=await db.application.findMany({where:{status:{in:['LIVE','DEPLOYING']}},select:{id:true,customer:{select:{userId:true}},providerResourceId:true,subscription:{select:{plan:{select:{requests:true,concurrentUsers:true}}}}}});
    const provider=getProvider();let checked=0,failed=0,warnings=0,suspended=0;
    for(const app of apps){
      if(!app.providerResourceId)continue;
      try{
        const m=await provider.getMetrics(app.providerResourceId);
        await db.usageRecord.create({data:{applicationId:app.id,cpuPercent:m.cpuPercent,ramPercent:m.ramPercent,storagePercent:m.storagePercent,bandwidthPercent:m.bandwidthPercent,requests:m.requests,concurrentUsers:m.concurrentUsers}});
        const plan=app.subscription?.plan;
        const requestPct=pct(m.requests,plan?.requests||0);
        const userPct=pct(m.concurrentUsers,plan?.concurrentUsers||0);
        const hardMetrics=[requestPct>=100?'requests':null,userPct>=100?'concurrent users':null].filter(Boolean) as string[];
        if(hardMetrics.length){
          await provider.stop(app.providerResourceId);
          await db.application.update({where:{id:app.id},data:{status:'SUSPENDED',availabilityStatus:'OFFLINE'}});
          await db.notification.create({data:{userId:app.customer.userId,type:'USAGE_LIMIT_REACHED',title:'Application suspended for usage limit',message:`${app.id}: ${hardMetrics.join(' and ')} usage reached 100% of the plan limit. The application was suspended to prevent further overuse.`}});
          await db.auditLog.create({data:{userId:app.customer.userId,action:'USAGE_LIMIT_SUSPEND',entityType:'APPLICATION',entityId:app.id,metadata:{metrics:hardMetrics,requestPct,userPct}}});
          suspended++;continue;
        }
        const highMetrics=[requestPct>=80?'requests':null,userPct>=80?'concurrent users':null].filter(Boolean) as string[];
        if(highMetrics.length){
          const since=new Date(Date.now()-24*60*60*1000);
          const recent=await db.notification.findFirst({where:{userId:app.customer.userId,type:'USAGE_WARNING',createdAt:{gte:since},message:{contains:app.id}}});
          if(!recent){
            await db.notification.create({data:{userId:app.customer.userId,type:'USAGE_WARNING',title:'Usage approaching plan limit',message:`${app.id}: ${highMetrics.join(' and ')} usage has reached 80% or more of the plan limit.`}});
            warnings++;
          }
        }
        checked++;
      }catch{failed++;}
    }
    return NextResponse.json({ok:true,checked,failed,warnings,suspended});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Usage reconciliation failed'},{status:500});}
}
