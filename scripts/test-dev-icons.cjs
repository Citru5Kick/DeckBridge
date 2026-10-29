// All disk/network operations are mocked. No downloads or user cache writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync('src/dev/icons.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function fixture(fetcher,map={123:'test_icon',124:'other_icon'}){
  let diskReads=0;const writes=[];const timers=new Set();
  const files=new Map([['icon-map.json',Buffer.from(JSON.stringify(map))]]);
  const io={
    lstatSync:file=>{diskReads++;const bytes=files.get(path.basename(file));if(!bytes)throw Error('ENOENT');return{isFile:()=>true,isSymbolicLink:()=>false,size:bytes.length};},
    openSync:file=>path.basename(file),fstatSync:fd=>({isFile:()=>true,size:files.get(fd).length}),closeSync:()=>{},
    readSync:(fd,buffer,offset,length)=>offset?0:files.get(fd).copy(buffer,offset,0,length),
    mkdirSync:()=>{},writeFileSync:(file,data)=>{files.set(path.basename(file),Buffer.from(data));writes.push(file);}
  };
  const exports={};
  vm.runInNewContext(code,{exports,Buffer,URL,Response,AbortController,TextDecoder,fetch:fetcher,
    setTimeout:(fn,delay)=>{const timer={fn,delay};timers.add(timer);return timer;},clearTimeout:t=>timers.delete(t),
    require:name=>({'node:fs':{default:io},'node:os':{default:{homedir:()=> 'C:/fake-home'}},'node:path':{default:path}}[name])});
  return{api:exports,timers,writes,reads:()=>diskReads};
}
(async()=>{
  let calls=0;
  const f=fixture(async()=>{calls++;return new Response(Buffer.from([255,216,255,0,1]));});
  for(const id of [-1,0,1.2,0x1000000,'../../private',null])assert.equal(await f.api.iconDataUri(id),undefined);
  assert.equal(f.reads(),0);assert.equal(calls,0);
  const images=await Promise.all([f.api.iconDataUri(123),f.api.iconDataUri(123)]);
  assert.equal(images[0],images[1]);assert(images[0].startsWith('data:image/jpeg;base64,'));assert.equal(calls,1);
  const reads=f.reads();await f.api.iconDataUri(123);assert.equal(f.reads(),reads);assert.equal(calls,1);
  assert(f.writes.every(p=>p.includes('.deckbridge-dev')));
  await assert.rejects(()=>f.api.safeResponse('https://attacker.invalid/icon',new AbortController().signal),/Unexpected/);
  assert.equal(calls,1);
  await assert.rejects(()=>f.api.readLimited(new Response(Buffer.alloc(33)),16),/large/);
  const redirect=fixture(async()=>new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}}));
  await assert.rejects(()=>redirect.api.safeResponse('https://wow.zamimg.com/test',new AbortController().signal),/Unexpected/);
  const invalid=fixture(async()=>new Response('not a JPEG'));
  await assert.rejects(()=>invalid.api.iconDataUri(123),/format/);assert.equal(invalid.writes.length,0);
  let slowCalls=0;
  const slow=fixture((_url,{signal})=>{slowCalls++;return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted'))));});
  const download=assert.rejects(slow.api.iconDataUri(124),/aborted/);
  for(let i=0;i<10&&!Array.from(slow.timers).some(t=>t.delay===8000);i++)await Promise.resolve();
  const timeout=Array.from(slow.timers).find(t=>t.delay===8000);assert(timeout,'No image deadline');timeout.fn();await download;
  assert.equal(await slow.api.iconDataUri(124),undefined);assert.equal(slowCalls,1); // Retry cooldown.
  let active=0,max=0;const resolve=[];
  const many=fixture(()=>{active++;max=Math.max(max,active);return new Promise(r=>resolve.push(()=>{active--;r(new Response(Buffer.from([255,216,255,0])));}));},Object.fromEntries(Array.from({length:12},(_,i)=>[200+i,'test_'+i])));
  const jobs=Array.from({length:12},(_,i)=>many.api.iconDataUri(200+i));
  for(let i=0;i<10;i++)await Promise.resolve();assert.equal(max,4);
  for(const finish of resolve)finish();await Promise.all(jobs);
  console.log('OK: invalid IDs before filesystem access, request deduplication, memory cache, DEV-only writes, redirect allowlist, byte limits, image validation, deadlines, retry cooldown and concurrency cap (mocked IO).');
})().catch(error=>{console.error(error);process.exitCode=1;});
