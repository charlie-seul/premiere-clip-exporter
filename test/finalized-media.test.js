'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {inspectContainer,verifyFinalizedOutput}=require('../src/finalized-media');
function atom(type,payload=Buffer.alloc(0)) {const b=Buffer.alloc(8+payload.length);b.writeUInt32BE(b.length);b.write(type,4);payload.copy(b,8);return b;}
function media(seconds=2){const mvhd=Buffer.alloc(20);mvhd.writeUInt32BE(1000,12);mvhd.writeUInt32BE(seconds*1000,16);
return Buffer.concat([atom('ftyp',Buffer.from('isom0000')),atom('mdat',Buffer.alloc(20)),atom('moov',Buffer.concat([atom('mvhd',mvhd),atom('trak')]))]);}
const inspect=(b,seconds=2)=>inspectContainer(async(p,n)=>b.subarray(p,p+n),b.length,seconds);
test('finalized container needs complete media, movie metadata, track and expected duration',async()=>{
 assert.equal(await inspect(media()),true);assert.equal(await inspect(media(),3),false);
 for(let i=0;i<media().length;i++)assert.equal(await inspect(media().subarray(0,i)),false);
});
test('open ended media and fragmented movies do not authorize deletion',async()=>{
 const b=media();b.writeUInt32BE(0,16);assert.equal(await inspect(b),false);
 assert.equal(await inspect(Buffer.concat([media(),atom('moof')])),false);
});
test('stable file is structurally checked and closed before cleanup is allowed',async()=>{
 const b=media();let closes=0,reads=0;
 const fs={lstat:async()=>({size:b.length}),open:async()=>5,read:async(fd,buffer,off,len,pos)=>{
  reads++;const part=b.subarray(pos,pos+len);new Uint8Array(buffer).set(part,off);return {bytesRead:part.length};},close:async()=>{closes++;}};
 assert.equal(await verifyFinalizedOutput(fs,'test.mp4',2,()=>false,{stableMs:0,pollMs:1,timeoutMs:200}),true);
 assert.ok(reads>0);assert.equal(closes,1);
 assert.equal(await verifyFinalizedOutput(fs,'test.mxf',2,()=>false,{stableMs:0}),false);
 assert.equal(await verifyFinalizedOutput(fs,'test.mp4',2,()=>true),false);
});
test('changing files or unreadable outputs are retained',async()=>{
 let size=100;
 const fs={lstat:async()=>({size:++size})};
 assert.equal(await verifyFinalizedOutput(fs,'test.mov',2,()=>false,{timeoutMs:10,pollMs:1,stableMs:20}),false);
 const denied={lstat:async()=>{throw Error('permission denied');}};
 assert.equal(await verifyFinalizedOutput(denied,'test.mov',2,()=>false,{timeoutMs:10,pollMs:1}),false);
});
