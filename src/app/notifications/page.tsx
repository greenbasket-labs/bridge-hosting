import {redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth';
import {db} from '@/lib/db';

export default async function NotificationsPage(){
  const user=await getCurrentUser();
  if(!user?.customer)redirect('/login');
  const notifications=await db.notification.findMany({where:{userId:user.id},orderBy:{createdAt:'desc'},take:50});
  return <><div><h1>Notifications</h1><p className="muted">Updates and important messages from Bridge.</p></div><div className="grid" style={{marginTop:18}}>{notifications.map(n=><div className="card" key={n.id}><div className="actions" style={{justifyContent:'space-between'}}><h2>{n.title}</h2><span className="muted">{n.createdAt.toISOString()}</span></div><p>{n.message}</p>{!n.read&&<span className="status">Unread</span>}</div>)}{notifications.length===0&&<div className="card"><h2>You're all caught up</h2><p className="muted">There are no notifications yet.</p></div>}</div></>}
