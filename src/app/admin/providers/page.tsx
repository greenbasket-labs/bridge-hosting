import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth';
import {db} from '@/lib/db';

export default async function AdminProviders(){
  const user=await getCurrentUser();
  if(!user||user.role!=='ADMIN')redirect('/login');
  const providers=await db.providerConfig.findMany({orderBy:{name:'asc'}});
  return <><div className="actions" style={{justifyContent:'space-between'}}><div><h1>Provider configuration</h1><p className="muted">Read-only view of configured infrastructure providers.</p></div><div className="actions"><Link className="btn secondary" href="/admin">Operations</Link><Link className="btn secondary" href="/admin/capacity">Capacity</Link></div></div><div className="card" style={{marginTop:18}}><div className="table-wrap"><table className="table"><thead><tr><th>Provider</th><th>Type</th><th>Enabled</th><th>Configuration</th></tr></thead><tbody>{providers.map(p=><tr key={p.id}><td>{p.name}</td><td>{p.type}</td><td><span className="status">{p.enabled?'ENABLED':'DISABLED'}</span></td><td>{p.config?'Configured':'Not configured'}</td></tr>)}</tbody></table></div>{providers.length===0&&<p className="muted">No provider configurations have been added.</p>}</div></>;
}
