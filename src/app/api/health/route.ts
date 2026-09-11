import {NextResponse} from 'next/server'; export async function GET(){return NextResponse.json({status:'ok',service:'bridge',time:new Date().toISOString()});}
