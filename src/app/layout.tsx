import './globals.css';
import Link from 'next/link';
export const metadata={title:'Bridge Hosting',description:'Managed application hosting'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body><header><Link href="/" className="brand">Bridge</Link><nav><Link href="/dashboard">Dashboard</Link><Link href="/applications/new">New application</Link></nav></header><main>{children}</main></body></html>}
