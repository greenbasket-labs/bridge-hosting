import {NextResponse} from 'next/server';
import {getCurrentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import {getProvider} from '@/lib/providers';

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  const user=await getCurrentUser();
  if(!user||user.role!=='ADMIN')return NextResponse.json({error:'Unauthorized'},{status:403});
  const {id}=await params;
  let body:{action?:string};
  try{body=await req.json()}catch{return NextResponse.json({error:'Invalid request'},{status:400})}
  if(body.action!=='restart')return NextResponse.json({error:'Unsupported intervention'},{status:400});
  const app=await db.application.findUnique({where:{id}});
  if(!app)return NextResponse.json({error:'Application not found'},{status:404});
  if(!app.providerResourceId)return NextResponse.json({error:'Provider resource is not assigned'},{status:409});
  try{
    await getProvider(app.provider).restart(app.providerResourceId);
    await db.auditLog.create({data:{userId:user.id,action:'ADMIN_RESTART_APPLICATION',entityType:'Application',entityId:app.id,metadata:{provider:app.provider,providerResourceId:app.providerResourceId}}});
    return NextResponse.json({ok:true});
  }catch(error){
    await db.auditLog.create({data:{userId:user.id,action:'ADMIN_RESTART_APPLICATION_FAILED',entityType:'Application',entityId:app.id,metadata:{error:error instanceof Error?error.message:'Unknown error'}}});
    return NextResponse.json({error:'Restart failed'},{status:502});
  }
}
