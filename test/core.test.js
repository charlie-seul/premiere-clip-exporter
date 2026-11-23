'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {planSegments, compare, safeName, scan, exportBatch} = require('../src/core');
const clip = (overrides = {}) => ({name: 'Plan', track: 0, start: '0', end: '100', selected: false, ...overrides});
test('large ticks remain distinct and sort chronologically', () => {
  const plan = planSegments([clip({start:'9007199254740993',end:'9007199254740994'}),
    clip({start:'9007199254740992',end:'9007199254740993'})]);
  assert.deepEqual(plan.map(s=>s.start), ['9007199254740992','9007199254740993']);
  assert.equal(compare('000100','100'), 0);
});
test('track mode ignores adjustment layers, disabled clips and muted tracks', () => {
  const plan = planSegments([clip(), clip({adjustment:true}), clip({disabled:true}), clip({muted:true}), clip({track:1})]);
  assert.equal(plan.length, 1);
});
test('selected clips across tracks deduplicate equal ranges, retain overlaps', () => {
  const plan = planSegments([clip({selected:true}),clip({selected:true,track:1}),
    clip({selected:true,start:'50',end:'150'}),clip({start:'200',end:'250'})], {mode:'selected'});
  assert.deepEqual(plan.map(s=>[s.start,s.end]), [['0','100'],['50','150']]);
});
test('gaps are not invented, alternate track can define boundaries', () => {
  assert.deepEqual(planSegments([clip({track:1}),clip({track:1,start:'200',end:'300'})],{track:1})
    .map(s=>[s.start,s.end]), [['0','100'],['200','300']]);
});
test('invalid ranges and unknown modes fail instead of exporting arbitrary intervals', () => {
  for (const c of [clip({end:'0'}),clip({start:'-1'}),clip({end:'NaN'}),clip({end:'1.5'})])
    assert.throws(()=>planSegments([c]));
  assert.throws(()=>planSegments([clip()],{mode:'anything'}));
});
test('names cannot escape output folder, duplicates have different filenames', () => {
  assert.equal(safeName('../a/b:clip\n'), '_a_b_clip_');
  assert.equal(safeName('...'), 'clip');
  const plan = planSegments([clip({name:'same'}),clip({name:'same',start:'100',end:'200'})]);
  assert.notEqual(plan[0].stem,plan[1].stem);
});
test('scan uses sequence times, not source in/out, and excludes transition requests', async () => {
  const item = {getName:async()=> 'ramp',isDisabled:async()=>false,isAdjustmentLayer:async()=>false,
    getIsSelected:async()=>true,getStartTime:async()=>({ticks:'500'}),getEndTime:async()=>({ticks:'900'})};
  const sequence = {getVideoTrackCount:async()=>1,getVideoTrack:async()=>({isMuted:async()=>false,
    getTrackItems:(type,empty)=> {assert.equal(type,1);assert.equal(empty,false);return [item];}})};
  assert.deepEqual((await scan({Constants:{TrackItemType:{CLIP:1}}},sequence)).map(s=>[s.start,s.end]),[['500','900']]);
});
function host({accept = true, cloneCount = 1, badRange = false, rejectTransaction = false} = {}) {
  const calls = [], clones = [];
  const source = {guid:{toString:()=> 'source'},in:'20',out:'80',createCloneAction:()=>()=>{
    for(let i=0;i<cloneCount;i++) {
      const id='clone-'+clones.length;
      const c={guid:{toString:()=>id},getProjectItem:async()=>({createSetNameAction:name=>()=>{c.name=name;}}),
        createSetInPointAction:t=>()=>{c.in=t;}, createSetOutPointAction:t=>()=>{c.out=t;},
        getInPoint:async()=>({ticks:badRange?'999':c.in}),getOutPoint:async()=>({ticks:c.out})};
      clones.push(c);
    }
  }};
  const project = {getSequences:async()=>[source,...clones],lockedAccess:fn=>fn(),executeTransaction:fn=>{
    if(rejectTransaction) return false;
    fn({addAction:a=>a()});return true;
  }};
  const ppro = {TickTime:{createWithTicks:t=>t},Constants:{ExportType:{IMMEDIATELY:7}},EncoderManager:{
    getExportFileExtension:async()=>'.mov',getManager:()=>({exportSequence:async(...args)=>{calls.push(args);return accept;}})}};
  return {calls,clones,source,project,ppro};
}
async function run(h, extra={}) {
  const report={jobs:[]};
  await exportBatch({...h,segments:planSegments([clip(),clip({start:'100',end:'200'})]),
    presetPath:'/preset.epr',folder:{nativePath:'/output/run',name:'run'},cancelled:()=>false,
    onUpdate:async()=>{},report,...extra});
  return report;
}
test('each export has an independent full clone, explicit false range flag and original untouched',async()=>{
  const h=host(); const r=await run(h);
  assert.equal(h.clones.length,2);
  assert.notEqual(h.calls[0][0],h.calls[1][0]);
  assert.deepEqual(h.calls.map(c=>[c[0].in,c[0].out,c[1],c[3],c[4]]),
    [['0','100',7,'/preset.epr',false],['100','200',7,'/preset.epr',false]]);
  assert.equal(h.source.in,'20'); assert.equal(h.source.out,'80');
  assert.ok(h.clones.every(c=>c.name.startsWith('PCE_run_')));
  assert.ok(r.jobs.every(j=>j.state==='api-accepted-unverified'));
});
test('API rejection halts subsequent exports and records failure',async()=>{
  const h=host({accept:false}), report={jobs:[]};
  await assert.rejects(()=>run(h,{report}),/rejected or canceled/);
  assert.equal(h.calls.length,1); assert.equal(report.jobs[0].state,'failed');
});
test('ambiguous clone identification fails closed',async()=>{
  const h=host({cloneCount:2}); await assert.rejects(()=>run(h),/single sequence copy/);
  assert.equal(h.calls.length,0);
});
test('transaction refusal never submits a render',async()=>{
  const h=host({rejectTransaction:true}); await assert.rejects(()=>run(h),/rejected the transaction/);
  assert.equal(h.calls.length,0);
});
test('range readback mismatch never submits a render',async()=>{
  const h=host({badRange:true}); await assert.rejects(()=>run(h),/requested range/);
  assert.equal(h.calls.length,0);
});
test('stop prevents next job while keeping already submitted clone intact',async()=>{
  const h=host(); let stop=false;
  const r=await run(h,{cancelled:()=>stop,onUpdate:async r=>{if(r.jobs[0]?.state==='api-accepted-unverified')stop=true;}});
  assert.equal(r.cancelled,true);assert.equal(h.calls.length,1);assert.equal(h.clones[0].in,'0');
});
test('invalid preset extension and empty batches fail before cloning',async()=>{
  const h=host();h.ppro.EncoderManager.getExportFileExtension=async()=> '../mov';
  await assert.rejects(()=>run(h),/Invalid preset file extension/);assert.equal(h.clones.length,0);
  await assert.rejects(()=>run(host(),{segments:[]}),/No clips to export/);
});

function cleanupHost() {
  const h=host(),removed=[];
  h.project.deleteSequence=async clone=>{removed.push(clone.guid.toString());h.clones.splice(h.clones.indexOf(clone),1);return true;};
  return {...h,removed};
}
test('automatic cleanup waits for output verification then deletes only generated copies',async()=>{
  const h=cleanupHost();let verified=0;
  const r=await run(h,{autoCleanup:true,verifyOutput:async()=>{assert.equal(h.removed.length,verified);verified++;return true;}});
  assert.equal(verified,2);assert.equal(h.removed.length,2);assert.equal(h.source.in,'20');
  assert.ok(r.jobs.every(j=>j.cleanup==='removed'));
});
test('missing verifier, incomplete file, or export rejection never deletes copies',async()=>{
  for(const verifyOutput of [undefined,async()=>false,async()=>{throw Error('unreadable');}]) {
    const h=cleanupHost();await run(h,{autoCleanup:true,verifyOutput});assert.equal(h.removed.length,0);
  }
  const h=cleanupHost();h.ppro.EncoderManager.getManager=()=>({exportSequence:async()=>false});
  await assert.rejects(()=>run(h,{autoCleanup:true,verifyOutput:async()=>true}));assert.equal(h.removed.length,0);
});
test('cleanup refuses original GUID and renamed copies',async()=>{
  const {removeCompletedCopy,cloneSequence}=require('../src/core');const h=cleanupHost();
  assert.equal(await removeCompletedCopy(h.project,h.source,{completion:'file-finalized',cloneGuid:'source'}),'kept');
  const c=await cloneSequence(h.project,h.source);
  assert.equal(await removeCompletedCopy(h.project,h.source,{completion:'file-finalized',cloneGuid:c.guid.toString(),cloneName:'renamed'}),'kept-modified');
  assert.equal(h.removed.length,0);
});
test('cancellation after verification preserves the copy',async()=>{
  const h=cleanupHost();let stop=false;
  await run(h,{autoCleanup:true,cancelled:()=>stop,verifyOutput:async()=>{stop=true;return true;}});
  assert.equal(h.removed.length,0);assert.equal(h.calls.length,1);
});
