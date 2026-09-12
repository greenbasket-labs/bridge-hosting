import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth';
import {db} from '@/lib/db';

const labels:Record<string,string>={FAILED:'Failed',BUILD_FAILED:'Build failed'};

export default async function FailedDeployments(){
  const user=await getCurrentUser();
  if(!user||user.role!=='ADMIN')redirect('/login');
  const deployments=await db.deployment.findMany({where:{status:{in:['FAILED','BUILD_FAILED']}},orderBy:{createdAt:'desc'},take:100,include:{application:{include:{customer:{include:{user:true}}}}}});
  return <><div className="actions" style={{justifyContent:'space-between'}}><div><h1>Failed deployment queue</h1><p className="muted">Deployments requiring operator attention. This view is read-only.</p></div><div className="actions"><Link className="btn secondary" href="/admin/deployments">All deployments</Link><Link className="btn secondary" href="/admin">Operations</Link></div></div><div className="card" style={{marginTop:18}}><div className="actions" style={{justifyContent:'space-between'}}><div><h2>{deployments.length}</h2><p className="muted">Failed deployments shown</p></div><span className="status danger">ATTENTION REQUIRED</span></div><div className="table-wrap"><table className="table"><thead><tr><th>Application</th><th>Customer</th><th>Status</th><th>Error</th><th>Retries</th><th>Commit</th><th>Created</th></tr></thead><tbody>{deployments.map(d=><tr key={d.id}><td>{d.application.name}</td><td>{d.application.customer.user.name||d.application.customer.user.email}</td><td><span className="status danger">{labels[d.status]||d.status}</span></td><td>{d.errorMessage||'No error message recorded'}</td><td>{d.retryCount}</td><td>{d.commitSha?d.commitSha.slice(0,8):'—'}</td><td>{d.createdAt.toLocaleString()}</td></tr>)}</tbody></table></div>{deployments.length===0&&<p className="muted">No failed deployments require attention.</p>}</div></>;
}
