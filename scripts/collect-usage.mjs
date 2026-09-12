const baseUrl=process.env.APP_URL;
const secret=process.env.INTERNAL_CRON_SECRET;
if(!baseUrl||!secret){console.error('APP_URL and INTERNAL_CRON_SECRET are required');process.exit(1);}
const response=await fetch(`${baseUrl.replace(/\/$/,'')}/api/internal/usage/reconcile`,{method:'POST',headers:{'x-bridge-cron-secret':secret}});
const body=await response.text();console.log(body);if(!response.ok)process.exit(1);
