import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'ADMIN') redirect('/admin');
  const apps = await db.application.findMany({ where: { customerId: user.customer?.id }, include: { subscription: { include: { plan: true } }, domains: true, deployments: { orderBy: { createdAt: 'desc' }, take: 1 } } });
  return <><div className="actions" style={{justifyContent:'space-between'}}><div><h1>My applications</h1><p className="muted">Deploy and manage your applications.</p></div><Link className="btn" href="/applications/new">+ New application</Link></div><div className="grid">{apps.map(a => <div className="card" key={a.id}><h2>{a.name}</h2><span className="status">{a.status}</span><p className="muted">{a.customDomain || a.internalDomain}</p><p>{a.subscription?.plan.name || 'No plan'} · ₦{Number(a.subscription?.plan.priceKobo || 0)/100}/month</p><Link className="btn secondary" href={`/applications/${a.id}`}>Manage</Link></div>)}{apps.length===0 && <div className="card"><h2>No applications yet</h2><p className="muted">Connect a GitHub repository and deploy your first application.</p></div>}</div></>;
}
