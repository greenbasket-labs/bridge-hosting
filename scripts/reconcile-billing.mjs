const appUrl=process.env.APP_URL;
const secret=process.env.INTERNAL_CRON_SECRET;
if(!appUrl||!secret){console.error('APP_URL and INTERNAL_CRON_SECRET are required');process.exit(1)}
const r=await fetch(`${appUrl}/api/internal/billing/reconcile`,{method:'POST',headers:{'x-bridge-cron-secret':secret}});
const text=await r.text();
if(!r.ok){console.error(text);process.exit(1)}
console.log(text);
