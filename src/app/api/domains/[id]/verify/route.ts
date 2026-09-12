import {NextResponse} from 'next/server';
import {resolveCname,resolve4,resolve6,resolveTxt} from 'node:dns/promises';
import {db} from '@/lib/db';
import {getCurrentUser} from '@/lib/auth';
import {getProvider} from '@/lib/providers';

function normalize(value:string){return value.trim().toLowerCase().replace(/\.$/,'');}

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const user=await getCurrentUser();
    if(!user?.customer)return NextResponse.json({error:'Unauthorized'},{status:401});
    const {id}=await params;
    const domain=await db.domain.findFirst({where:{id,application:{customerId:user.customer.id}},include:{application:true}});
    if(!domain)return NextResponse.json({error:'Domain not found'},{status:404});
    if(domain.status==='ACTIVE')return NextResponse.json({domain,verified:true,message:'Domain is already active.'});

    const names=[domain.hostname,domain.hostname.replace(/^www\./,'')];
    let cname:string[]=[];
    let addresses:string[]=[];
    let txt:string[]=[];
    try{cname=(await resolveCname(domain.hostname)).map(normalize);}catch{}
    try{addresses=[...(await resolve4(domain.hostname)),...(await resolve6(domain.hostname))].map(normalize);}catch{}
    try{txt=(await resolveTxt(`_bridge.${domain.hostname}`)).flat().map(normalize);}catch{}

    const target=normalize(domain.target||domain.application.internalDomain);
    const cnameMatches=cname.some(v=>v===target||v.endsWith(`.${target}`));
    const token=domain.verificationToken?normalize(domain.verificationToken):'';
    const txtMatches=Boolean(token&&txt.includes(token));
    const verified=cnameMatches||txtMatches;
    if(!verified){
      await db.domain.update({where:{id},data:{status:'DNS_PENDING'}});
      return NextResponse.json({verified:false,status:'DNS_PENDING',message:'DNS record was not found yet. Add the requested CNAME record and try again.',dns:{type:'CNAME',name:domain.hostname,target},verificationTxt:domain.verificationToken?{type:'TXT',name:`_bridge.${domain.hostname}`,value:domain.verificationToken}:undefined,observed:{cname,addresses,txt,names}},{status:409});
    }

    await db.domain.update({where:{id},data:{status:'VERIFYING'}});
    let providerDomain;
    try{providerDomain=await getProvider().configureDomain(domain.application.providerResourceId!,domain.hostname);}catch(e){await db.domain.update({where:{id},data:{status:'ERROR'}});return NextResponse.json({verified:true,status:'ERROR',error:e instanceof Error?e.message:'Provider domain configuration failed'},{status:502});}
    const active=providerDomain.verified&&providerDomain.sslActive;
    const updated=await db.domain.update({where:{id},data:{status:active?'ACTIVE':'SSL_PENDING',target:providerDomain.target||domain.target,sslActive:providerDomain.sslActive}});
    return NextResponse.json({verified:true,domain:updated,provider:{target:providerDomain.target,verified:providerDomain.verified,sslActive:providerDomain.sslActive},message:active?'Domain is active over HTTPS.':'DNS is verified; SSL is still being provisioned.'});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Domain verification failed'},{status:500});}
}
