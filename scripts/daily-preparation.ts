import{runDaily}from"../lib/daily-preparation";
if(!process.argv.includes('--allow-live'))throw Error('Pass --allow-live; only opted-in account workspaces are prepared.');
void runDaily().then(counts=>console.log(JSON.stringify({operation:'daily-preparation',...counts}))).catch(()=>{console.error('Daily preparation failed.');process.exitCode=1;});
