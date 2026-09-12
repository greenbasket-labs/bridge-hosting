import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth';
import {db} from '@/lib/db';

const availabilityLabel:Record<string,string>={ONLINE:'Online',OFFLINE:'Offline',CHECKING:'Checking',UNKNOWN:'Unknown'};
const statusLabel:Record<string,string>={LIVE:'Online',DEPLOYING:'Updating',BUILDING:'Updating',CREATING:'Setting up',STARTING:'Starting',STOPPING:'Stopping',SUSPENDED:'Suspended',FAILED:'Failed'};

export default async function AdminHealth(){
  const user=await getCurrentUser();
  if(!user||user.role!=='ADMIN')redirect('/login');
  const apps=await db.application.findMany({where:{OR:[{availabilityStatus:'OFFLINE'},{availabilityStatus:'CHECKING'},{status:'FAILED'}]},orderBy:{updatedAt:'desc'},take:100,include:{customer:{include:{user:true}}}});
  const [online,offline,checking,failed]=await Promise.all([
    db.application.count({where:{availabilityStatus:'ONLINE'}}),
    db.application.count({where:{availabilityStatus:'OFFLINE'}}),
    db.application.count({where:{availabilityStatus:'CHECKING'}}),
    db.application.count({where:{status:'FAILED'}})
  ]);
  return <><div className="actions" style={{justifyContent:'space-between'}}><div><h1>Health & outages</h1><p className="muted">Read-only view of applications that are offline, being checked, or have failed.</p></div><div className="actions"><Link className="btn secondary" href="/admin">Operations</Link><Link className="btn secondary" href="/admin/applications">Applications</Link></div></div><div className="grid"><div className="card"><p className="muted">Online</p><h2>{online}</h2></div><div className="card"><p className="muted">Offline</p><h2>{offline}</h2></div><div className="card"><p className="muted">Checking</p><h2>{checking}</h2></div><div className="card"><p className="muted">Failed</p><h2>{failed}</h2></div></div><div className="card" style={{marginTop:18}}><div className="table-wrap"><table className="table"><thead><tr><th>Application</th><th>Customer</th><th>Bridge status</th><th>Availability</th><th>Health</th><th>Last checked</th><th>Error</th></tr></thead><tbody>{apps.map(a=><tr key={a.id}><td>{a.name}</td><td>{a.customer.user.name||a.customer.user.email}</td><td><span className={a.status==='FAILED'?'status danger':'status'}>{statusLabel[a.status]||a.status}</span></td><td>{availabilityLabel[a.availabilityStatus]||a.availabilityStatus}</td><td>{a.healthCheckStatus?`${a.healthCheckStatus}`:'—'}</td><td>{a.healthCheckedAt?a.healthCheckedAt.toLocaleString():'Never'}</td><td>{a.healthCheckError||'—'}</td></tr>)}</tbody></table></div>{apps.length===0&&<p className="muted">No applications currently require health attention.</p>}</div></>;
}
