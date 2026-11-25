const u=process.argv[2]||'https://bsc-rpc.publicnode.com';
const call=async(m,p)=>{const r=await fetch(u,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:m,params:p})});return r.json()};
const B=parseInt((await call('eth_blockNumber',[])).result);
const has=async b=>{const j=await call('eth_getLogs',[{address:'0x55d398326f99059fF775485246999027B3197955',fromBlock:'0x'+b.toString(16),toBlock:'0x'+(b+2).toString(16)}]);return !j.error&&j.result.length>0};
let lo=B-200000, hi=B-58000; while(hi-lo>100){const m=Math.floor((lo+hi)/2); if(await has(m)) hi=m; else lo=m;}
console.log('head',B,'oldest log block ~',hi,'depth',B-hi,'hours',(B-hi)*0.45/3600);
