import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from './db';

const secret = process.env.SESSION_SECRET || 'development-only-change-me';
function sign(value: string) { return crypto.createHmac('sha256', secret).update(value).digest('hex'); }
export async function hashPassword(password:string){ return bcrypt.hash(password,12); }
export async function verifyPassword(password:string,hash:string){ return bcrypt.compare(password,hash); }
export async function createSession(userId:string){
  const raw = `${userId}.${crypto.randomBytes(32).toString('hex')}`;
  const token = `${raw}.${sign(raw)}`;
  await db.session.create({data:{token,userId,expiresAt:new Date(Date.now()+1000*60*60*24*30)}});
  (await cookies()).set('bridge_session',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:60*60*24*30});
}
export async function getCurrentUser(){
  const token=(await cookies()).get('bridge_session')?.value; if(!token) return null;
  const parts=token.split('.'); if(parts.length!==3 || sign(`${parts[0]}.${parts[1]}`)!==parts[2]) return null;
  const session=await db.session.findUnique({where:{token},include:{user:{include:{customer:true}}}});
  if(!session || session.expiresAt<new Date()) return null; return session.user;
}
export async function requireUser(){ const user=await getCurrentUser(); if(!user) throw new Error('UNAUTHORIZED'); return user; }
