import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth';
import {db} from '@/lib/db';

export default async function AdminAudit(){
  const user=await getCurrentUser();
  if(!user||user.role!=='ADMIN')redirect('/login');
  const logs=await db.auditLog.findMany({orderBy:{createdAt:'desc'},take:100,include:{user:{select:{email:true,name:true}}}});
  return <><div className="actions" style={{justifyContent:'space-between'}}><div><h1>Audit log</h1><p className="muted">Recent operational and account events. Read-only.</p></div><div className="actions"><Link className="btn secondary" href="/admin">Operations</Link></div></div><div className="card" style={{marginTop:18}}><div className="table-wrap"><table className="table"><thead><tr><th>Time</th><th>Action</th><th>Entity</th><th>Actor</th></tr></thead><tbody>{logs.map(log=><tr key={log.id}><td>{log.createdAt.toLocaleString()}</td><td>{log.action}</td><td>{log.entityType}{log.entityId?` · ${log.entityId.slice(0,12)}`:''}</td><td>{log.user?.name||log.user?.email||'System'}</td></tr>)}</tbody></table></div>{logs.length===0&&<p className="muted">No audit events recorded yet.</p>}</div></>;
}
