import {redirect} from 'next/navigation';
import Link from 'next/link';
import {getCurrentUser} from '@/lib/auth';
import {db} from '@/lib/db';

export default async function AdminCustomers(){
  const user=await getCurrentUser();
  if(!user||user.role!=='ADMIN')redirect('/login');
  const customers=await db.customer.findMany({orderBy:{createdAt:'desc'},take:100,include:{user:true,applications:{select:{id:true,status:true}} ,subscriptions:{include:{plan:true},take:1,orderBy:{createdAt:'desc'}}}});
  return <><div className="actions" style={{justifyContent:'space-between'}}><div><h1>Customers</h1><p className="muted">Customer accounts and their current application footprint.</p></div><Link className="btn secondary" href="/admin">Operations</Link></div><div className="card" style={{marginTop:18}}><div className="table-wrap"><table className="table"><thead><tr><th>Customer</th><th>Email</th><th>Applications</th><th>Live</th><th>Plan</th><th>Joined</th></tr></thead><tbody>{customers.map(c=>{const live=c.applications.filter(a=>a.status==='LIVE').length;const plan=c.subscriptions[0]?.plan.name||'No plan';return <tr key={c.id}><td>{c.user.name||'Unnamed'}</td><td>{c.user.email}</td><td>{c.applications.length}</td><td>{live}</td><td>{plan}</td><td>{c.createdAt.toLocaleDateString()}</td></tr>})}</tbody></table></div>{customers.length===0&&<p className="muted">No customers yet.</p>}</div></>;
}
