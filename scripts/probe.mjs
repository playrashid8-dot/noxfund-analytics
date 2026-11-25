const u='https://bsc-rpc.publicnode.com';
const call=async(m,p)=>{const r=await fetch(u,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:m,params:p})});return r.json()};
const B=parseInt((await call('eth_blockNumber',[])).result);
for (const R of [100000,500000,2000000]){const t=Date.now();const j=await call('eth_getLogs',[{address:'0x433830E36585bdACC840E1caB419C4211bBf13f5',fromBlock:'0x'+(B-R).toString(16),toBlock:'0x'+B.toString(16)}]);console.log(R, j.error?JSON.stringify(j.error):j.result.length, Date.now()-t,'ms', j.result?.[0]?.blockNumber && parseInt(j.result[0].blockNumber));}
