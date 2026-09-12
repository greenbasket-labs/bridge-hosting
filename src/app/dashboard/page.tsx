import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

const statusLabel:Record<string,string>={LIVE:'Online',DEPLOYING:'Updating',BUILDING:'Updating',CREATING:'Setting up',STARTING:'Starting',STOPPING:'Stopping',SUSPENDED:'Suspended',FAILED:'Needs attention'};
const availabilityLabel:Record<string,string>={ONLINE:'Online',OFFLINE:'Offline',CHECKING:'Checking',UNKNOWN:'Checking'};

export default async function Dashboard(){
  const user=await getCurrentUser();
  if(!user)redirect('/login');
  if(user.role==='ADMIN')redirect('/admin');
  const apps=await db.application.findMany({where:{customerId:user.customer?.id},include:{subscription:{include:{plan:true}},domains:true,deployments:{orderBy:{createdAt:'desc'},take:1}}});
  return <><div className="actions" style={{justifyContent:'space-between'}}><div><h1>My applications</h1><p className="muted">See what is online, updating, or needs attention.</p></div><Link className="btn" href="/applications/new">+ New application</Link></div><div className="grid">{apps.map(a=>{const label=statusLabel[a.status]||a.status;const availability=availabilityLabel[a.availabilityStatus]||a.availabilityStatus;return <div className="card" key={a.id}><div className="actions" style={{justifyContent:'space-between'}}><h2>{a.name}</h2><span className="status">{label}</span></div><p>{availability}</p><p className="muted">{a.customDomain||a.internalDomain}</p><p>{a.subscription?.plan.name||'No plan'} · ₦{Number(a.subscription?.plan.priceKobo||0)/100}/{a.subscription?.plan.billingInterval==='YEARLY'?'year':'month'}</p><Link className="btn secondary" href={`/applications/${a.id}`}>Manage</Link></div>})}{apps.length===0&&<div className="card"><h2>No applications yet</h2><p className="muted">Connect a GitHub repository and deploy your first application.</p><Link className="btn" href="/applications/new">Create application</Link></div>}</div></>;
}
