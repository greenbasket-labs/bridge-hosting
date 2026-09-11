import crypto from 'node:crypto';
const secret=()=>process.env.SESSION_SECRET||'development-only-change-me';
function key(){return crypto.createHash('sha256').update(secret()).digest();}
export function encrypt(value:string){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key(),iv);const data=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${data.toString('base64')}`;}
export function decrypt(value:string){const [iv,tag,data]=value.split('.');const decipher=crypto.createDecipheriv('aes-256-gcm',key(),Buffer.from(iv,'base64'));decipher.setAuthTag(Buffer.from(tag,'base64'));return Buffer.concat([decipher.update(Buffer.from(data,'base64')),decipher.final()]).toString('utf8');}
export function githubAuthorizeUrl(state:string){const p=new URLSearchParams({client_id:process.env.GITHUB_CLIENT_ID||'',redirect_uri:`${process.env.APP_URL}/api/auth/github/callback`,scope:'repo',state});return `https://github.com/login/oauth/authorize?${p}`;}
