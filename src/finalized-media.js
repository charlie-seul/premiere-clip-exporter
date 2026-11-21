'use strict';
// Read only container headers, never load multi-GB videos into memory.
async function inspectContainer(read, fileSize, expectedSeconds) {
  if (!Number.isSafeInteger(fileSize) || fileSize < 32) return false;
  async function atom(at, limit) {
    const bytes = await read(at, Math.min(16, limit-at));
    if (bytes.byteLength < 8) return null;
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let size=v.getUint32(0), header=8;
    const type=String.fromCharCode(...bytes.slice(4,8));
    if (size===1) {
      if(bytes.length<16)return null;
      size=v.getUint32(8)*4294967296+v.getUint32(12);header=16;
    }
    // An open-ended mdat can still be under construction: keep its sequence.
    if(!Number.isSafeInteger(size)||size<header||at+size>limit)return null;
    return {type,size,body:at+header,end:at+size};
  }
  let offset=0, media=false, movie=false, track=false, duration=null;
  for(let n=0;offset<fileSize && n<10000;n++) {
    const a=await atom(offset,fileSize);if(!a)return false;
    if(a.type==='moof')return false; // fragmented outputs are deliberately unsupported
    if(a.type==='mdat' && a.end>a.body)media=true;
    if(a.type==='moov') {
      movie=true;let child=a.body;
      for(let m=0;child<a.end && m<1000;m++) {
        const b=await atom(child,a.end);if(!b)return false;
        if(b.type==='trak')track=true;
        if(b.type==='mvhd') {
          const bytes=await read(b.body,Math.min(32,b.end-b.body));
          const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
          if(bytes[0]===0 && bytes.length>=20)duration=v.getUint32(16)/v.getUint32(12);
          else if(bytes[0]===1 && bytes.length>=32)duration=(v.getUint32(24)*4294967296+v.getUint32(28))/v.getUint32(20);
        }
        child=b.end;
      }
      if(child!==a.end)return false;
    }
    offset=a.end;
  }
  return offset===fileSize && media && movie && track && Number.isFinite(duration) && duration>0 &&
    Math.abs(duration-expectedSeconds)<0.1;
}
async function verifyFinalizedOutput(fs, path, expectedSeconds, cancelled, {timeoutMs=30000,stableMs=2000,pollMs=250}={}) {
  if(!/\.(mp4|mov)$/i.test(path))return false;
  const deadline=Date.now()+timeoutMs;
  let previousSize=null, stableSince=Date.now();
  while(!cancelled() && Date.now()<deadline) {
    let fd;
    try {
      const size=(await fs.lstat(path)).size;
      if(size!==previousSize){previousSize=size;stableSince=Date.now();}
      if(size>0 && Date.now()-stableSince>=stableMs) {
        fd=await fs.open(path,'r');
        const read=async(position,length)=>{
          const buffer=new ArrayBuffer(length);
          const {bytesRead}=await fs.read(fd,buffer,0,length,position);
          return new Uint8Array(buffer,0,bytesRead);
        };
        if(await inspectContainer(read,size,expectedSeconds) && !cancelled() &&
            (await fs.lstat(path)).size===size)return true;
      }
    } catch (_) { /* missing/incomplete/unreadable output: keep the copy */ }
    finally { if(fd!==undefined)await fs.close(fd); }
    await new Promise(resolve=>setTimeout(resolve,pollMs));
  }
  return false;
}
module.exports={inspectContainer,verifyFinalizedOutput};
// Premiere 27 does not implement fs.lstat. Use the granted UXP Folder/File API.
// Bound memory use: larger outputs remain in the project for manual cleanup.
async function verifyFinalizedEntry(folder, filename, expectedSeconds, cancelled, binaryFormat, options={}) {
  const maxBytes=256*1024*1024;
  let entry;
  const adapter={
    lstat:async()=>{entry=await folder.getEntry(filename);return entry.getMetadata();},
    open:async()=>{
      if((await entry.getMetadata()).size>maxBytes)throw Error('Output exceeds automatic cleanup size limit');
      return new Uint8Array(await entry.read({format:binaryFormat}));
    },
    read:async(bytes,buffer,offset,length,position)=>{
      const part=bytes.subarray(position,position+length);
      new Uint8Array(buffer).set(part,offset);return {bytesRead:part.length};
    },
    close:async()=>{}
  };
  try {
    entry=await folder.getEntry(filename);
    if((await entry.getMetadata()).size>maxBytes)return false;
  }catch(_){/* output may not exist yet */}
  return verifyFinalizedOutput(adapter,filename,expectedSeconds,cancelled,options);
}
module.exports.verifyFinalizedEntry=verifyFinalizedEntry;
