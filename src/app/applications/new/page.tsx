'use client';

import {useEffect,useState} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';

type Repo={name:string;defaultBranch:string;private:boolean;url:string};

export default function NewApplication(){
  const r=useRouter();
  const params=useSearchParams();
  const [plans,setPlans]=useState<any[]>([]);
  const [repos,setRepos]=useState<Repo[]>([]);
  const [githubConnected,setGithubConnected]=useState(false);
  const [loadingRepos,setLoadingRepos]=useState(true);
  const [repoError,setRepoError]=useState('');
  const [form,setForm]=useState({name:'',repository:'',branch:'main',buildCommand:'npm install && npm run build',startCommand:'npm start',rootDirectory:'',planId:''});
  const [error,setError]=useState('');

  useEffect(()=>{
    fetch('/api/plans').then(x=>x.json()).then(x=>{setPlans(x.plans||[]);if(x.plans?.[0])setForm(f=>({...f,planId:x.plans[0].id}))});
  },[]);

  useEffect(()=>{
    let cancelled=false;
    setLoadingRepos(true);
    fetch('/api/github/repos')
      .then(async x=>({ok:x.ok,data:await x.json()}))
      .then(({ok,data})=>{
        if(cancelled)return;
        if(!ok){setRepoError(data.error||'Could not load GitHub repositories');return;}
        setGithubConnected(Boolean(data.connected));
        setRepos(data.repositories||[]);
        if(data.repositories?.length){
          const selected=data.repositories.find((x:Repo)=>x.name===form.repository)||data.repositories[0];
          setForm(f=>({...f,repository:selected.name,branch:selected.defaultBranch||'main',name:f.name||selected.name.split('/').pop()||''}));
        }
      })
      .catch(()=>{if(!cancelled)setRepoError('Could not load GitHub repositories');})
      .finally(()=>{if(!cancelled)setLoadingRepos(false);});
    return()=>{cancelled=true;};
  },[params]);

  function set(k:string,v:string){setForm(f=>({...f,[k]:v}))}

  function selectRepo(name:string){
    const repo=repos.find(x=>x.name===name);
    setForm(f=>({...f,repository:name,branch:repo?.defaultBranch||f.branch,name:f.name||name.split('/').pop()||''}));
  }

  async function submit(e:React.FormEvent){
    e.preventDefault();
    const x=await fetch('/api/applications',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(form)});
    const j=await x.json();
    if(!x.ok)return setError(j.error);
    r.push(`/applications/${j.id}`);
  }

  return <div className="card form">
    <h1>New application</h1>
    <p className="muted">Connect your repository and choose how Bridge should run it.</p>
    <a className="btn secondary" href="/api/auth/github">{githubConnected?'Reconnect GitHub':'Connect GitHub'}</a>

    <form onSubmit={submit}>
      <div className="field">
        <label>Application name</label>
        <input value={form.name} onChange={e=>set('name',e.target.value)} required/>
      </div>

      <div className="field">
        <label>GitHub repository</label>
        {loadingRepos ? <p className="muted">Loading GitHub repositories...</p> : repos.length ? (
          <select value={form.repository} onChange={e=>selectRepo(e.target.value)} required>
            {repos.map(repo=><option key={repo.name} value={repo.name}>{repo.name}{repo.private?' — private':''}</option>)}
          </select>
        ) : <>
          <input value={form.repository} onChange={e=>set('repository',e.target.value)} placeholder="owner/my-app" required/>
          <p className="muted">{repoError||(!githubConnected?'Connect GitHub to load your repositories.':'No repositories were returned; you can enter owner/name manually.')}</p>
        </>}
      </div>

      <div className="field"><label>Branch</label><input value={form.branch} onChange={e=>set('branch',e.target.value)} required/></div>
      <div className="field"><label>Build command</label><input value={form.buildCommand} onChange={e=>set('buildCommand',e.target.value)} required/></div>
      <div className="field"><label>Start command</label><input value={form.startCommand} onChange={e=>set('startCommand',e.target.value)} required/></div>
      <div className="field"><label>Root directory (optional)</label><input value={form.rootDirectory} onChange={e=>set('rootDirectory',e.target.value)}/></div>
      <div className="field">
        <label>Hosting plan</label>
        <select value={form.planId} onChange={e=>set('planId',e.target.value)}>{plans.map(p=><option key={p.id} value={p.id}>{p.name} — ₦{Number(p.priceKobo)/100}/month</option>)}</select>
      </div>
      {error&&<p className="muted">{error}</p>}
      <button className="btn">Create & deploy</button>
    </form>
  </div>
}
