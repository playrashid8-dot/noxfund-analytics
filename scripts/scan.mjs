import { createPublicClient, http, parseAbi, decodeEventLog, formatUnits } from 'viem';
import { bsc } from 'viem/chains';
import fs from 'fs';
const abi = JSON.parse(fs.readFileSync('abi.json'));
const C='0x433830E36585bdACC840E1caB419C4211bBf13f5';
const c=createPublicClient({chain:bsc,transport:http('https://bsc-rpc.publicnode.com',{timeout:30000})});
const B=await c.getBlockNumber(); const CH=49999n;
const b0=await c.getBlock({blockNumber:B}); const b1=await c.getBlock({blockNumber:B-1000000n});
console.log('blocktime',Number(b0.timestamp-b1.timestamp)/1e6);
let to=B, logs=[], empty=0, t=Date.now();
while(true){ const from=to-CH; let l; for(let i=0;i<5;i++){try{l=await c.getLogs({address:C,fromBlock:from,toBlock:to});break}catch(e){await new Promise(r=>setTimeout(r,1000))}}
  logs.push(...l); if(l.length===0) empty++; else empty=0;
  if(empty>=40 && logs.length) break; to=from-1n; }
console.log('chunks done', Date.now()-t,'ms', 'logs',logs.length, 'earliest', logs.reduce((m,x)=>x.blockNumber<m?x.blockNumber:m, B));
fs.writeFileSync('/tmp/logs.json', JSON.stringify(logs,(k,v)=>typeof v==='bigint'?v.toString():v));
