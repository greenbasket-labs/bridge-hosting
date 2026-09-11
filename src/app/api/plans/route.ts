import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
const defaults=[
 {name:'Basic',cpuCores:.5,ramMb:512,databaseGb:1,fileStorageGb:5,bandwidthGb:20,requests:100000,concurrentUsers:25,backupRetentionDays:0,deploymentLimit:30,priceKobo:500000},
 {name:'Standard',cpuCores:1,ramMb:1024,databaseGb:5,fileStorageGb:20,bandwidthGb:100,requests:500000,concurrentUsers:100,backupRetentionDays:7,deploymentLimit:100,priceKobo:1000000},
 {name:'Pro',cpuCores:2,ramMb:4096,databaseGb:20,fileStorageGb:50,bandwidthGb:500,requests:2000000,concurrentUsers:500,backupRetentionDays:30,deploymentLimit:300,priceKobo:2500000}
];
export async function GET(){let plans=await db.plan.findMany({where:{active:true},orderBy:{priceKobo:'asc'}});if(!plans.length){for(const p of defaults)await db.plan.create({data:p});plans=await db.plan.findMany({where:{active:true},orderBy:{priceKobo:'asc'}})}return NextResponse.json({plans});}
