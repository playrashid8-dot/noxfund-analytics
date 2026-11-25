const u='https://bsc.blockrazor.xyz';
const call=async(m,p)=>{const r=await fetch(u,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:m,params:p})});return r.json()};
const B=parseInt((await call('eth_blockNumber',[])).result);
for (const R of [5000,50000,100000,500000]){const t=Date.now();const j=await call('eth_getLogs',[{address:'0x433830E36585bdACC840E1caB419C4211bBf13f5',fromBlock:'0x'+(B-R).toString(16),toBlock:'0x'+B.toString(16)}]);console.log(R, j.error?JSON.stringify(j.error):j.result.length, Date.now()-t,'ms');}
for (const back of [5e6,2e7,5e7]){const f=B-back;const j=await call('eth_getLogs',[{address:'0x55d398326f99059fF775485246999027B3197955',fromBlock:'0x'+f.toString(16),toBlock:'0x'+(f+1).toString(16)}]);console.log('usdt',back,j.error?JSON.stringify(j.error):j.result.length);}
