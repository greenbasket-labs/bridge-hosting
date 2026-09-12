import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth';
import {db} from '@/lib/db';

function pct(value:number,limit:number){return limit>0?Math.round((value/limit)*100):0}
function metric(value:number,limit:number){return `${Math.round(value)} / ${Math.round(limit)}`}

export default async function AdminUsage(){
  const user=await getCurrentUser();
  if(!user||user.role!=='ADMIN')redirect('/login');
  const apps=await db.application.findMany({orderBy:{updatedAt:'desc'},take:100,include:{customer:{include:{user:true}},subscription:{include:{plan:true}},usageRecords:{orderBy:{recordedAt:'desc'},take:1}}});
  const rows=apps.map(a=>{const u=a.usageRecords[0];const p=a.subscription?.plan;return {a,u,p,cpu:p?pct(u?.cpuPercent||0,p.cpuCores*100):null,ram:p?pct(u?.ramPercent||0,p.ramMb):null,storage:p?pct(u?.storagePercent||0,p.fileStorageGb*1024):null,requests:p?pct(u?.requests||0,p.requests):null,users:p?pct(u?.concurrentUsers||0,p.concurrentUsers):null}});
  const attention=rows.filter(r=>[r.cpu,r.ram,r.storage,r.requests,r.users].some(v=>v!==null&&v>=80)).length;
  return <><div className="actions" style={{justifyContent:'space-between'}}><div><h1>Usage overview</h1><p className="muted">Latest collected resource usage against each application's plan.</p></div><div className="actions"><Link className="btn secondary" href="/admin">Operations</Link><Link className="btn secondary" href="/admin/applications">Applications</Link></div></div><div className="grid"><div className="card"><p className="muted">Applications</p><h2>{rows.length}</h2></div><div className="card"><p className="muted">With usage data</p><h2>{rows.filter(r=>r.u).length}</h2></div><div className="card"><p className="muted">At 80%+ of a limit</p><h2>{attention}</h2></div></div><div className="card" style={{marginTop:18}}><div className="table-wrap"><table className="table"><thead><tr><th>Application</th><th>Customer</th><th>Plan</th><th>CPU</th><th>RAM</th><th>Storage</th><th>Requests</th><th>Users</th><th>Recorded</th></tr></thead><tbody>{rows.map(r=><tr key={r.a.id}><td>{r.a.name}</td><td>{r.a.customer.user.name||r.a.customer.user.email}</td><td>{r.p?.name||'No plan'}</td><td>{r.p?metric(r.u?.cpuPercent||0,r.p.cpuCores*100):'—'}<br/><span className="muted">{r.cpu}%</span></td><td>{r.p?metric(r.u?.ramPercent||0,r.p.ramMb):'—'}<br/><span className="muted">{r.ram}%</span></td><td>{r.p?metric(r.u?.storagePercent||0,r.p.fileStorageGb*1024):'—'}<br/><span className="muted">{r.storage}%</span></td><td>{r.p?metric(r.u?.requests||0,r.p.requests):'—'}<br/><span className="muted">{r.requests}%</span></td><td>{r.p?metric(r.u?.concurrentUsers||0,r.p.concurrentUsers):'—'}<br/><span className="muted">{r.users}%</span></td><td>{r.u?.recordedAt?r.u.recordedAt.toLocaleString():'Never'}</td></tr>)}</tbody></table></div>{rows.length===0&&<p className="muted">No applications yet.</p>}</div></>;
}
