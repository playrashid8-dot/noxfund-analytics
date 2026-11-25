const u=process.argv[2]||'https://bsc-rpc.publicnode.com';
const call=async(m,p)=>{const r=await fetch(u,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:m,params:p})});return r.json()};
const B=parseInt((await call('eth_blockNumber',[])).result);
for (const back of [60000, 200000, 1000000, 3000000, 10000000]){const f=B-back;const j=await call('eth_getLogs',[{address:'0x55d398326f99059fF775485246999027B3197955',fromBlock:'0x'+f.toString(16),toBlock:'0x'+(f+5).toString(16)}]);console.log(back, j.error?JSON.stringify(j.error):j.result.length);}
// USDT transfers TO contract, older
const topic='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';const pad='0x000000000000000000000000433830e36585bdacc840e1cab419c4211bbf13f5';
for (const back of [100000,1000000,2000000,4000000]){const f=B-back;const j=await call('eth_getLogs',[{address:'0x55d398326f99059fF775485246999027B3197955',topics:[topic,null,pad],fromBlock:'0x'+f.toString(16),toBlock:'0x'+(f+49999).toString(16)}]);console.log('toC',back, j.error?JSON.stringify(j.error):j.result.length);}
