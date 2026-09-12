import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth';
import {db} from '@/lib/db';

export default async function AdminCapacity(){
  const user=await getCurrentUser();
  if(!user||user.role!=='ADMIN')redirect('/login');
  const [apps,plans,usage]=await Promise.all([
    db.application.count(),
    db.plan.count({where:{active:true}}),
    db.usageRecord.findMany({orderBy:{recordedAt:'desc'},take:100,select:{applicationId:true,cpuPercent:true,ramPercent:true,storagePercent:true,recordedAt:true}})
  ]);
  const latest=new Map<string,typeof usage[number]>();
  for(const row of usage)if(!latest.has(row.applicationId))latest.set(row.applicationId,row);
  const rows=[...latest.values()];
  const avg=(key:'cpuPercent'|'ramPercent'|'storagePercent')=>rows.length?Math.round(rows.reduce((sum,r)=>sum+r[key],0)/rows.length):0;
  return <><div className="actions" style={{justifyContent:'space-between'}}><div><h1>Resource capacity</h1><p className="muted">Compact view of current Bridge allocation and collected provider usage.</p></div><div className="actions"><Link className="btn secondary" href="/admin">Operations</Link><Link className="btn secondary" href="/admin/usage">Usage</Link></div></div><div className="grid"><div className="card"><p className="muted">Applications</p><h2>{apps}</h2></div><div className="card"><p className="muted">Active plans</p><h2>{plans}</h2></div><div className="card"><p className="muted">CPU average</p><h2>{avg('cpuPercent')}%</h2></div><div className="card"><p className="muted">RAM average</p><h2>{avg('ramPercent')}%</h2></div><div className="card"><p className="muted">Storage average</p><h2>{avg('storagePercent')}%</h2></div></div><div className="card" style={{marginTop:18}}><h2>Capacity status</h2><p className="muted">Bridge currently reports provider usage per application. A provider-wide hard capacity limit is not yet exposed by the adapter, so these figures are allocation indicators rather than guaranteed remaining infrastructure capacity.</p><span className="status">PROVIDER CAPACITY DATA LIMITED</span></div></>;
}
