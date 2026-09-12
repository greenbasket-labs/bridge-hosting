import {NextResponse} from 'next/server';
import {getCurrentUser} from '@/lib/auth';
import {db} from '@/lib/db';

const RECOVERY_ACTIONS=['BACKUP_RECOVERY_STARTED','BACKUP_RECOVERY_VERIFIED','BACKUP_RECOVERY_NOT_READY','BACKUP_RECOVERY_FAILED','BACKUP_RECOVERY_VERIFICATION_FAILED'];

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  const user=await getCurrentUser();
  if(!user?.customer)return NextResponse.json({error:'Unauthorized'},{status:401});
  const {id}=await params;
  const app=await db.application.findFirst({where:{id,customerId:user.customer.id},select:{id:true}});
  if(!app)return NextResponse.json({error:'Application not found'},{status:404});
  const history=await db.auditLog.findMany({where:{entityType:'Application',entityId:id,action:{in:RECOVERY_ACTIONS}},orderBy:{createdAt:'desc'},take:50,select:{id:true,action:true,metadata:true,createdAt:true}});
  return NextResponse.json({history});
}
