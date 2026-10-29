// Stream Deck, process spawning and streams are mocked: no keyboard/device IO.
const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
const {EventEmitter}=require('node:events');const {PassThrough,Writable}=require('node:stream');
function load(file,imports,globals={}) {
  const exports={};const code=ts.transpileModule(fs.readFileSync(file,'utf8').replaceAll('import.meta.url','"file:///C:/fake/bin/plugin.js"'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText;
  vm.runInNewContext(code,{exports,Buffer,Date,console,setInterval:()=>({unref(){}}),setTimeout:()=>({}),clearTimeout(){},process:{env:{SystemRoot:'C:\\Windows'},once(){}},require:name=>{assert(Object.hasOwn(imports,name),name);return imports[name];},...globals});return exports;
}
let writes=[];const children=[];
const driver=load('src/dev/keys.ts',{
  'node:child_process':{spawn:()=>{
    const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();
    child.stdin=new Writable({write(chunk,_encoding,done){writes.push(String(chunk));done();}});children.push(child);return child;
  }},'node:url':require('node:url'),'node:path':{default:require('node:path')}
});
driver.keyDown('a',25);assert.equal(writes.length,0); // No delayed startup replay.
children[0].stdout.emit('data',Buffer.from('rea'));children[0].stdout.emit('data',Buffer.from('dy\n'));
driver.keyDown('a',25);driver.keyDown('a',26);driver.keyUp('a');
assert.equal(writes.length,2);assert.match(writes[0],/^D p1 25 /);assert.equal(writes[1],'U p1\n');
driver.keyDown('b',37);driver.releaseAllKeys();driver.keyUp('b');assert.equal(writes.at(-1),'R\n');
driver.keyDown('bad',0);driver.keyDown('bad',97);const before=writes.length;
children[0].emit('error',Error('spawn failed'));driver.keyDown('bad',1);assert.equal(writes.length,before);
children[0].emit('close');driver.warmUp();assert.equal(children.length,2);

const calls=[];const logs={info(){},warn(){},error(error){throw Error(error);}};
const bars=load('src/actionBars.ts',{});
const parser=load('src/dev/luaParser.ts',{});
const data=load('src/dev/data.ts',{'node:fs':{default:{}},'./luaParser':parser});
const actions=load('src/dev/slot.ts',{
  '@elgato/streamdeck':{default:{logger:logs},action:()=>value=>value,SingletonAction:class{}},
  'node:fs':{default:{existsSync:()=>false,watchFile(){},unwatchFile(){}}},
  './data':data,'./icons':{iconDataUri:async()=>{throw Error('No icon request expected');}},
  './keys':{MAX_SLOT:96,warmUp(){},keyDown:(id,slot)=>calls.push(['D',id,slot]),keyUp:id=>calls.push(['U',id]),releaseAllKeys:()=>calls.push(['R'])},
  '../actionBars':bars,'node:path':{default:require('node:path')},'../wowPaths':{findSavedVariables:()=>[]},
  './liveIcons':{startLiveIcons(){},stopLiveIcons(){}},
  './readerControl':{readerStatus:()=>({enabled:false,phase:'off'}),setReaderEnabled(){},onReaderChanged(){}}
});
(async()=>{
  let images=0,titles=0;
  const action={id:'a',isKey:()=>true,setImage:async()=>{images++;},setTitle:async()=>{titles++;}};
  const slot=new actions.SlotAction();
  await slot.onWillAppear({action,payload:{settings:{bar:1,position:1}}});
  assert.equal(images,1);assert.equal(titles,1);
  await slot.onDidReceiveSettings({action,payload:{settings:{bar:1,position:1}}});
  assert.equal(images,1);assert.equal(titles,1); // Unchanged images are not resent.
  slot.onKeyDown({action,payload:{settings:{bar:3,position:1}}});
  assert.deepEqual(calls.at(-1),['D','a',25]);
  await slot.onDidReceiveSettings({action,payload:{settings:{bar:4,position:1}}});
  assert.deepEqual(calls.at(-1),['U','a']); // Release original token before accepting changed settings.
  slot.onKeyUp({action,payload:{settings:{bar:4,position:1}}});
  assert.deepEqual(calls.at(-1),['U','a']);
  slot.onWillDisappear({action});assert.deepEqual(calls.at(-1),['R']);
  console.log('OK: key routing by press token, settings changes, startup/error handling, disappearance cleanup and no unchanged image/title writes (mocked SDK/IO).');
})().catch(error=>{console.error(error);process.exitCode=1;});
