import {redirect} from 'next/navigation';
import Link from 'next/link';
import {getCurrentUser} from '@/lib/auth';
import {db} from '@/lib/db';
import {getProvider} from '@/lib/providers';

const statusLabel:Record<string,string>={LIVE:'Online',DEPLOYING:'Updating',BUILDING:'Updating',CREATING:'Setting up',STARTING:'Starting',STOPPING:'Stopping',SUSPENDED:'Suspended',FAILED:'Needs attention'};
const availabilityLabel:Record<string,string>={ONLINE:'Online',OFFLINE:'Offline',CHECKING:'Checking',UNKNOWN:'Unknown'};

export default async function AdminApplications(){
  const user=await getCurrentUser();
  if(!user||user.role!=='ADMIN')redirect('/login');
  const apps=await db.application.findMany({orderBy:{updatedAt:'desc'},take:100,include:{customer:{include:{user:true}},subscription:{include:{plan:true}},domains:true}});
  const providerStatuses=await Promise.all(apps.map(async a=>{if(!a.providerResourceId)return null;try{return await getProvider(a.provider).getStatus(a.providerResourceId)}catch{return 'UNAVAILABLE'}}));
  return <><div className="actions" style={{justifyContent:'space-between'}}><div><h1>Applications</h1><p className="muted">Operational and provider resource view for Bridge operators.</p></div><Link className="btn secondary" href="/admin">Operations</Link></div><div className="card" style={{marginTop:18}}><div className="table-wrap"><table className="table"><thead><tr><th>Application</th><th>Customer</th><th>Bridge status</th><th>Availability</th><th>Provider</th><th>Provider resource</th><th>Provider status</th><th>Domain</th><th>Plan</th></tr></thead><tbody>{apps.map((a,i)=><tr key={a.id}><td>{a.name}</td><td>{a.customer.user.name||a.customer.user.email}</td><td><span className={a.status==='FAILED'?'status danger':'status'}>{statusLabel[a.status]||a.status}</span></td><td>{availabilityLabel[a.availabilityStatus]||a.availabilityStatus}</td><td>{a.provider}</td><td>{a.providerResourceId||'Not assigned'}</td><td>{providerStatuses[i]||'Not assigned'}</td><td>{a.customDomain||a.domains[0]?.hostname||a.internalDomain}</td><td>{a.subscription?.plan.name||'No plan'}</td></tr>)}</tbody></table></div>{apps.length===0&&<p className="muted">No applications yet.</p>}</div></>;
}
