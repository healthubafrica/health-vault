$env:PATH = "C:\Program Files\Amazon\SessionManagerPlugin\bin;" + $env:PATH

# Node script to test Redis
$script = "const Redis=require('ioredis');const c=new Redis(process.env.REDIS_URL,{tls:{},connectTimeout:8000,retryStrategy:function(){return null;}});c.on('ready',function(){console.log('REDIS_OK');c.ping().then(function(r){console.log('PING:'+r);c.disconnect();process.exit(0);});});c.on('error',function(e){console.error('REDIS_ERROR:'+e.message);process.exit(1);});setTimeout(function(){console.error('TIMEOUT');process.exit(1);},10000);"

# Base64 encode it
$b64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($script))

Write-Host "Base64 script length: $($b64.Length)"

# Run inside container: decode base64 -> write to /tmp/rc.js -> run with node
$cmd = "sh -c 'echo $b64 | base64 -d > /app/rc.js && node /app/rc.js'"

aws ecs execute-command `
  --cluster hha-cluster `
  --task 311c18fb3d374b3284b9caf1d01d66ff `
  --container myvaultplus `
  --region af-south-1 `
  --interactive `
  --command $cmd
