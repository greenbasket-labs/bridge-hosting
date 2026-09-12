import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth';
import {db} from '@/lib/db';

const labels:Record<string,string>={QUEUED:'Waiting',BUILDING:'Building',BUILD_FAILED:'Build failed',DEPLOYING:'Deploying',HEALTH_CHECK:'Health check',SUCCESS:'Successful',FAILED:'Failed',CANCELLED:'Cancelled',ROLLED_BACK:'Rolled back'};
const active=new Set(['QUEUED','BUILDING','DEPLOYING','HEALTH_CHECK']);
const bad=new Set(['FAILED','BUILD_FAILED']);

export default async function AdminDeployments(){
  const user=await getCurrentUser();
  if(!user||user.role!=='ADMIN')redirect('/login');
  const deployments=await db.deployment.findMany({orderBy:{createdAt:'desc'},take:100,include:{application:{include:{customer:{include:{user:true}}}}}});
  const activeCount=deployments.filter(d=>active.has(d.status)).length;
  const failedCount=deployments.filter(d=>bad.has(d.status)).length;
  const recentSuccess=deployments.filter(d=>d.status==='SUCCESS').length;
  return <><div className="actions" style={{justifyContent:'space-between'}}><div><h1>Deployment operations</h1><p className="muted">Read-only operational view of active, failed, and recent deployments.</p></div><div className="actions"><Link className="btn secondary" href="/admin">Operations</Link><Link className="btn secondary" href="/admin/applications">Applications</Link></div></div><div className="grid"><div className="card"><p className="muted">Active</p><h2>{activeCount}</h2></div><div className="card"><p className="muted">Failed</p><h2>{failedCount}</h2></div><div className="card"><p className="muted">Successful in recent 100</p><h2>{recentSuccess}</h2></div></div><div className="card" style={{marginTop:18}}><div className="table-wrap"><table className="table"><thead><tr><th>Application</th><th>Customer</th><th>Status</th><th>Commit</th><th>Retry</th><th>Created</th></tr></thead><tbody>{deployments.map(d=><tr key={d.id}><td>{d.application.name}</td><td>{d.application.customer.user.name||d.application.customer.user.email}</td><td><span className={bad.has(d.status)?'status danger':'status'}>{labels[d.status]||d.status}</span></td><td>{d.commitSha?d.commitSha.slice(0,8):'—'}</td><td>{d.retryCount}</td><td>{d.createdAt.toLocaleString()}</td></tr>)}</tbody></table></div>{deployments.length===0&&<p className="muted">No deployments yet.</p>}</div></>;
}
