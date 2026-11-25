import { decodeEventLog, formatUnits } from 'viem'; import fs from 'fs';
const abi=JSON.parse(fs.readFileSync('abi.json')); const logs=JSON.parse(fs.readFileSync('/tmp/logs.json'));
const agg={}; let dep=0n, roi=0n, pw=0n, rp=0n, rw=0n, fee=0n; const users=new Set();
for(const l of logs){ const d=decodeEventLog({abi,topics:l.topics,data:l.data}); agg[d.eventName]=(agg[d.eventName]||0)+1;
 const a=d.args; if(d.eventName==='Deposited'){dep+=a.amount;users.add(a.user)} if(d.eventName==='ROIWithdrawn')roi+=a.amount; if(d.eventName==='PrincipalWithdrawn')pw+=a.principal; if(d.eventName==='ReferralPaid')rp+=a.amount; if(d.eventName==='ReferralWithdrawn')rw+=a.amount; if(d.eventName==='FeeSent')fee+=a.amount;}
const f=x=>formatUnits(x,18);
console.log(agg,{dep:f(dep),roi:f(roi),pw:f(pw),refPaid:f(rp),refW:f(rw),fee:f(fee),users:users.size, minBlock:Math.min(...logs.map(l=>+l.blockNumber))});
