import {redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth';

export default async function SupportPage(){
  const user=await getCurrentUser();
  if(!user?.customer)redirect('/login');
  const email=process.env.SUPPORT_EMAIL||'support@bridge.host';
  return <><div><h1>Support</h1><p className="muted">Need help with your application, deployment, domain, billing, or backup?</p></div><div className="card" style={{marginTop:18}}><h2>Contact Bridge Support</h2><p>Send us a message with your application name and a short description of the problem.</p><p><strong>Email:</strong> <a href={`mailto:${email}`}>{email}</a></p><p className="muted">For deployment problems, include the deployment status and relevant logs from your application page.</p></div></>}
