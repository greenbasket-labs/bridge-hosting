import {redirect} from 'next/navigation';
import Link from 'next/link';
import {getCurrentUser} from '@/lib/auth';
import {db} from '@/lib/db';

const statusLabel:Record<string,string>={LIVE:'Online',DEPLOYING:'Updating',BUILDING:'Updating',CREATING:'Setting up',STARTING:'Starting',STOPPING:'Stopping',SUSPENDED:'Suspended',FAILED:'Needs attention'};
const availabilityLabel:Record<string,string>={ONLINE:'Online',OFFLINE:'Offline',CHECKING:'Checking',UNKNOWN:'Unknown'};

export default async function AdminApplications(){
  const user=await getCurrentUser();
  if(!user||user.role!=='ADMIN')redirect('/login');
  const apps=await db.application.findMany({orderBy:{updatedAt:'desc'},take:100,include:{customer:{include:{user:true}},subscription:{include:{plan:true}},domains:true}});
  return <><div className="actions" style={{justifyContent:'space-between'}}><div><h1>Applications</h1><p className="muted">Operational view of customer applications and their current state.</p></div><Link className="btn secondary" href="/admin">Operations</Link></div><div className="card" style={{marginTop:18}}><div className="table-wrap"><table className="table"><thead><tr><th>Application</th><th>Customer</th><th>Status</th><th>Availability</th><th>Domain</th><th>Plan</th><th>Updated</th></tr></thead><tbody>{apps.map(a=><tr key={a.id}><td>{a.name}</td><td>{a.customer.user.name||a.customer.user.email}</td><td><span className={a.status==='FAILED'?'status danger':'status'}>{statusLabel[a.status]||a.status}</span></td><td>{availabilityLabel[a.availabilityStatus]||a.availabilityStatus}</td><td>{a.customDomain||a.domains[0]?.hostname||a.internalDomain}</td><td>{a.subscription?.plan.name||'No plan'}</td><td>{a.updatedAt.toLocaleString()}</td></tr>)}</tbody></table></div>{apps.length===0&&<p className="muted">No applications yet.</p>}</div></>;
}
