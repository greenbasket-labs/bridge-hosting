import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth';
import {db} from '@/lib/db';

export default async function AdminSupport(){
  const user=await getCurrentUser();
  if(!user||user.role!=='ADMIN')redirect('/login');
  const [customers,apps,offline,failed]=await Promise.all([
    db.customer.findMany({orderBy:{createdAt:'desc'},take:50,select:{id:true,user:{select:{name:true,email:true}},applications:{select:{id:true,name:true,status:true,availabilityStatus:true},orderBy:{updatedAt:'desc'},take:5}}}),
    db.application.count(),
    db.application.count({where:{availabilityStatus:'OFFLINE'}}),
    db.application.count({where:{status:'FAILED'}})
  ]);
  return <><div className="actions" style={{justifyContent:'space-between'}}><div><h1>Customer support</h1><p className="muted">Read-only support context for operators. No ticketing or intervention controls.</p></div><div className="actions"><Link className="btn secondary" href="/admin">Operations</Link><Link className="btn secondary" href="/support">Support guidance</Link></div></div><div className="grid" style={{marginTop:18}}><div className="card"><p className="muted">Customers</p><h2>{customers.length}</h2></div><div className="card"><p className="muted">Applications</p><h2>{apps}</h2></div><div className="card"><p className="muted">Offline</p><h2>{offline}</h2></div><div className="card"><p className="muted">Failed</p><h2>{failed}</h2></div></div><div className="card" style={{marginTop:18}}><h2>Recent customer context</h2><div className="table-wrap"><table className="table"><thead><tr><th>Customer</th><th>Email</th><th>Applications</th><th>Attention</th></tr></thead><tbody>{customers.map(c=>{const attention=c.applications.filter(a=>a.availabilityStatus==='OFFLINE'||a.status==='FAILED').length;return <tr key={c.id}><td>{c.user.name||'Unnamed'}</td><td>{c.user.email}</td><td>{c.applications.length}</td><td>{attention?`${attention} issue${attention===1?'':'s'}`:'None'}</td></tr>})}</tbody></table></div>{customers.length===0&&<p className="muted">No customers yet.</p>}</div></>;
}
