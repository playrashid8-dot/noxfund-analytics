import { createPublicClient, http, decodeEventLog, formatUnits, erc20Abi } from 'viem'; import { bsc } from 'viem/chains'; import fs from 'fs';
const abi=JSON.parse(fs.readFileSync('abi.json')); const logs=JSON.parse(fs.readFileSync('/tmp/logs.json'));
const c=createPublicClient({chain:bsc,transport:http('https://bsc-rpc.publicnode.com')});
const d=logs.find(l=>decodeEventLog({abi,topics:l.topics,data:l.data}).eventName==='Deposited');
const rc=await c.getTransactionReceipt({hash:d.transactionHash});
for(const l of rc.logs){ try{const e=decodeEventLog({abi:l.address.toLowerCase()==='0x55d398326f99059ff775485246999027b3197955'?erc20Abi:abi,topics:l.topics,data:l.data}); console.log(l.address.slice(0,8),e.eventName,Object.fromEntries(Object.entries(e.args).map(([k,v])=>[k,typeof v==='bigint'&&v>10n**12n?formatUnits(v,18):String(v)])))}catch(e){console.log('?',l.address)} }
