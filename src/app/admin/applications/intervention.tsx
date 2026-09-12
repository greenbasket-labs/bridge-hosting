'use client';
import {useState} from 'react';

export default function Intervention({applicationId}:{applicationId:string}){
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  async function restart(){
    if(!window.confirm('Restart this application now?'))return;
    setBusy(true);setMessage('');
    try{const res=await fetch(`/api/admin/applications/${applicationId}/intervention`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'restart'})});const data=await res.json();if(!res.ok)throw new Error(data.error||'Restart failed');setMessage('Restart requested');}catch(error){setMessage(error instanceof Error?error.message:'Restart failed')}finally{setBusy(false)}
  }
  return <div><button className="btn secondary" onClick={restart} disabled={busy}>{busy?'Restarting…':'Restart'}</button>{message&&<div className="muted" style={{marginTop:6}}>{message}</div>}</div>;
}
