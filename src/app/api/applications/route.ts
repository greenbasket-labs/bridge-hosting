import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {getCurrentUser} from '@/lib/auth';
import {getProvider} from '@/lib/providers';
import {decrypt} from '@/lib/github';

const schema=z.object({name:z.string().min(2).max(80),repository:z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),branch:z.string().min(1).max(100),buildCommand:z.string().max(500),startCommand:z.string().max(500),rootDirectory:z.string().max(200).optional(),planId:z.string().min(1)});

async function registerWebhook(userId:string,repo:string){const c=await db.githubConnection.findUnique({where:{userId}});if(!c||!process.env.APP_URL||!process.env.GITHUB_WEBHOOK_SECRET)return;const token=decrypt(c.accessTokenEncrypted);const r=await fetch(`https://api.github.com/repos/${repo}/hooks`,{method:'POST',headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:JSON.stringify({name:'web',active:true,events:['push'],config:{url:`${process.env.APP_URL}/api/webhooks/github`,content_type:'json',secret:process.env.GITHUB_WEBHOOK_SECRET,insecure_ssl:'0'}})});if(!r.ok){const text=await r.text();if(!text.includes('Hook already exists'))throw new Error('Could not register GitHub webhook');}}

export async function POST(req:Request){
  try{
    const user=await getCurrentUser();
    if(!user?.customer)return NextResponse.json({error:'Unauthorized'},{status:401});
    const b=schema.parse(await req.json());
    const plan=await db.plan.findUnique({where:{id:b.planId}});
    if(!plan||!plan.active)return NextResponse.json({error:'Plan unavailable'},{status:400});
    const provider=getProvider();
    const resource=await provider.createApplication({name:b.name,repo:`https://github.com/${b.repository}.git`,branch:b.branch,buildCommand:b.buildCommand,startCommand:b.startCommand,rootDirectory:b.rootDirectory});
    const app=await db.application.create({data:{customerId:user.customer.id,name:b.name,repository:b.repository,branch:b.branch,buildCommand:b.buildCommand,startCommand:b.startCommand,rootDirectory:b.rootDirectory||null,internalDomain:resource.internalUrl,provider:process.env.PROVIDER||'local',providerResourceId:resource.resourceId,status:'DEPLOYING',deploymentStatus:'QUEUED',subscription:{create:{customerId:user.customer.id,planId:plan.id,status:'TRIALING'}}}});
    await registerWebhook(user.id,b.repository).catch(()=>undefined);
    const d=await db.deployment.create({data:{applicationId:app.id,branch:b.branch,status:'QUEUED',buildStartedAt:new Date(),commitMessage:'Initial deployment'}});
    try{
      const dep=await provider.deploy(resource.resourceId);
      await db.deployment.update({where:{id:d.id},data:{providerDeploymentId:dep.id,status:'QUEUED'}});
    }catch(e){
      await db.deployment.update({where:{id:d.id},data:{status:'FAILED',errorMessage:e instanceof Error?e.message:'Deployment failed',buildFinishedAt:new Date()}});
      await db.application.update({where:{id:app.id},data:{status:'FAILED',deploymentStatus:'FAILED'}});
      return NextResponse.json({id:app.id,deploymentId:d.id},{status:202});
    }
    return NextResponse.json({id:app.id,deploymentId:d.id,status:'QUEUED'},{status:202});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Invalid request'},{status:400});}
}
