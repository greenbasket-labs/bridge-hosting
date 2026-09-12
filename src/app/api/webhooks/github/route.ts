import {NextResponse} from 'next/server';
import crypto from 'node:crypto';
import {db} from '@/lib/db';
import {getProvider} from '@/lib/providers';

function valid(raw:string,signature:string|null){if(!process.env.GITHUB_WEBHOOK_SECRET||!signature)return false;const expected='sha256='+crypto.createHmac('sha256',process.env.GITHUB_WEBHOOK_SECRET).update(raw).digest('hex');const a=Buffer.from(expected);const b=Buffer.from(signature);return a.length===b.length&&crypto.timingSafeEqual(a,b);}

export async function POST(req:Request){
  const raw=await req.text();
  if(!valid(raw,req.headers.get('x-hub-signature-256')))return NextResponse.json({error:'Invalid signature'},{status:401});
  try{
    const event=req.headers.get('x-github-event');
    if(event!=='push')return NextResponse.json({ok:true,ignored:true});
    const p=JSON.parse(raw);const repo=p.repository?.full_name,branch=p.ref?.replace('refs/heads/',''),sha=p.after;
    if(!repo||!branch||!sha)return NextResponse.json({ok:true,ignored:true});
    const apps=await db.application.findMany({where:{repository:repo,branch}});let created=0;
    for(const app of apps){
      if(!app.providerResourceId)continue;
      const active=await db.deployment.findFirst({where:{applicationId:app.id,status:{in:['QUEUED','BUILDING','DEPLOYING','HEALTH_CHECK']}},orderBy:{createdAt:'desc'}});
      if(active?.commitSha===sha)continue;
      const d=await db.deployment.create({data:{applicationId:app.id,commitSha:sha,branch,commitMessage:p.head_commit?.message||'',status:'QUEUED'}});
      await db.application.update({where:{id:app.id},data:{status:'DEPLOYING',deploymentStatus:'QUEUED'}});
      try{
        const x=await getProvider().deploy(app.providerResourceId,sha);
        await db.deployment.update({where:{id:d.id},data:{providerDeploymentId:x.id,status:'QUEUED'}});
        created++;
      }catch(e){await db.deployment.update({where:{id:d.id},data:{status:'FAILED',errorMessage:e instanceof Error?e.message:'Deployment failed',buildFinishedAt:new Date()}});}
    }
    return NextResponse.json({ok:true,deployments:created});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Webhook processing failed'},{status:500});}
}
