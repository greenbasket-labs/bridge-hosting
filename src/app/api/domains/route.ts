import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {getCurrentUser} from '@/lib/auth';

const schema=z.object({applicationId:z.string().min(1),hostname:z.string().trim().toLowerCase().min(4).max(253).regex(/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/,'Invalid hostname')});

export async function POST(req:Request){
  try{
    const user=await getCurrentUser();
    if(!user?.customer)return NextResponse.json({error:'Unauthorized'},{status:401});
    const b=schema.parse(await req.json());
    const app=await db.application.findFirst({where:{id:b.applicationId,customerId:user.customer.id}});
    if(!app)return NextResponse.json({error:'Application not found'},{status:404});
    const existing=await db.domain.findUnique({where:{hostname:b.hostname}});
    if(existing&&existing.applicationId!==app.id)return NextResponse.json({error:'Domain is already connected to another application'},{status:409});
    if(existing)return NextResponse.json({domain:existing,dns:{type:'CNAME',name:b.hostname,target:existing.target||app.internalDomain}});
    const target=app.internalDomain;
    const verificationToken=`bridge-verify=${crypto.randomUUID().replaceAll('-','')}`;
    const domain=await db.domain.create({data:{applicationId:app.id,hostname:b.hostname,status:'DNS_PENDING',verificationToken,target}});
    return NextResponse.json({domain,dns:{type:'CNAME',name:b.hostname,target},instructions:[`Create a CNAME record for ${b.hostname} pointing to ${target}.`,`If your DNS provider does not allow a CNAME at the root domain, use the DNS provider's ALIAS/ANAME equivalent or connect a subdomain.`,`Allow DNS changes to propagate, then call POST /api/domains/${domain.id}/verify.`]},verification:{token:verificationToken}},{status:201});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Invalid request'},{status:400});}
}

export async function GET(){
  try{
    const user=await getCurrentUser();
    if(!user?.customer)return NextResponse.json({error:'Unauthorized'},{status:401});
    const domains=await db.domain.findMany({where:{application:{customerId:user.customer.id}},include:{application:{select:{id:true,name:true,internalDomain:true}}},orderBy:{createdAt:'desc'}});
    return NextResponse.json({domains});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not load domains'},{status:500});}
}
