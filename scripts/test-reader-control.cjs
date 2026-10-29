// Full consent/lifecycle integration with fake processes and SDK. No capture or keyboard IO.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {EventEmitter}=require('node:events');const {Writable,PassThrough}=require('node:stream');
const children=[],intervals=[];
function load(file,imports){const exports={};const source=fs.readFileSync(file,'utf8').replaceAll('import.meta.url','"file:///C:/fake/bin/plugin.js"');vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText,{
 exports,Buffer,Date,queueMicrotask,console,process:{env:{SystemRoot:'C:\\Windows'},once(){}},
 setInterval:fn=>{const t={fn,unref(){}};intervals.push(t);return t;},clearInterval:t=>{t.cleared=true;},
 setTimeout(){throw Error('Automatic delayed start is forbidden');},clearTimeout(){},
 require:name=>{assert(Object.hasOwn(imports,name),name);return imports[name];}
});return exports;}
const sdk={default:{logger:{info(){},warn(){},error(e){throw Error(e);}}},action:()=>value=>value,SingletonAction:class{}};
const control=load('src/dev/readerControl.ts',{});
const bars=load('src/actionBars.ts',{});
const protocol=load('src/dev/liveProtocol.ts',{'../actionBars':bars});
const reader=load('src/dev/liveIcons.ts',{
 './readerControl':control,'./liveProtocol':protocol,'node:url':require('node:url'),'node:path':{default:require('node:path')},
 'node:child_process':{spawn:()=>{
   const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.writes=[];
   child.stdin=new Writable({write(data,_enc,done){child.writes.push(String(data));done();}});
   child.kill=()=>{child.killed=true;return true;};children.push(child);return child;
 }}
});
const parser=load('src/dev/luaParser.ts',{});
const data=load('src/dev/data.ts',{'node:fs':{default:{}},'./luaParser':parser});
const slotModule=load('src/dev/slot.ts',{
 '@elgato/streamdeck':sdk,'node:fs':{default:{existsSync:()=>false,watchFile(){},unwatchFile(){}}},
 './data':data,'./icons':{iconDataUri:async()=>undefined},'./keys':{MAX_SLOT:96,keyDown(){},keyUp(){},warmUp(){},releaseAllKeys(){}},
 '../actionBars':bars,'node:path':{default:require('node:path')},'../wowPaths':{findSavedVariables:()=>[]},'./liveIcons':reader,'./readerControl':control
});
const {ReaderAction}=load('src/dev/readerAction.ts',{'@elgato/streamdeck':sdk,'./readerControl':control});
function button(id){return{id,isKey:()=>true,setState:async function(s){this.state=s;},setTitle:async function(t){this.title=t;},setImage:async()=>{}};}
const event=action=>({action,payload:{settings:{bar:1,position:1}}});
async function flush(){for(let i=0;i<20;i++)await Promise.resolve();}
(async()=>{
 const slot=new slotModule.SlotAction(),toggle=new ReaderAction(),a=button('slot'),b=button('reader'),c=button('reader2');
 await slot.onWillAppear(event(a));await toggle.onWillAppear(event(b));await flush();
 assert.equal(children.length,0);assert.equal(b.title,'Reader\nOFF');
 control.setReaderEnabled(false);await flush();assert.equal(children.length,0);
 toggle.onKeyDown(event(b));await flush();assert.equal(children.length,1);assert.equal(control.readerStatus().phase,'starting');
 const first=children[0];first.emit('spawn');await flush();assert.equal(b.title,'Reader\nON');assert(first.writes.includes('PING\n'));
 toggle.onKeyDown(event(b));await flush();assert(first.killed);assert.equal(control.readerStatus().phase,'stopping');
 first.emit('close');await flush();assert.equal(b.title,'Reader\nOFF');
 // Multiple control buttons mirror state; removing the last one revokes consent.
 await toggle.onWillAppear(event(c));toggle.onKeyDown(event(b));await flush();children[1].emit('spawn');await flush();assert.equal(c.title,'Reader\nON');
 toggle.onWillDisappear(event(b));await flush();assert(!children[1].killed);
 toggle.onWillDisappear(event(c));await flush();assert(children[1].killed);children[1].emit('close');await flush();
 await toggle.onWillAppear(event(b));await flush();assert.equal(children.length,2);assert.equal(b.title,'Reader\nOFF');
 // Hiding the last slot also revokes permission, even if the control stays visible.
 toggle.onKeyDown(event(b));await flush();children[2].emit('spawn');await flush();slot.onWillDisappear(event(a));await flush();assert(children[2].killed);children[2].emit('close');await flush();
 await slot.onWillAppear(event(a));await flush();assert.equal(children.length,3);assert.equal(b.title,'Reader\nOFF');
 // A crash requires an explicit retry. Merely appearing/settings do not grant consent.
 toggle.onKeyDown(event(b));await flush();children[3].emit('spawn');children[3].emit('close');await flush();
 assert.equal(control.readerStatus().enabled,false);assert.equal(control.readerStatus().phase,'error');assert.equal(children.length,4);
 await slot.onDidReceiveSettings(event(a));await toggle.onWillAppear(event(b));await flush();assert.equal(children.length,4);
 // Game exit is a normal OFF transition, not ERROR, and revokes permission.
 toggle.onKeyDown(event(b));await flush();const game=children[4];game.emit('spawn');await flush();
 assert.equal(b.title,'Reader\nON');
 game.stdout.emit('data',Buffer.from('DBREADER_GAME_EXITED\n'));await flush();
 assert(game.killed);assert.equal(control.readerStatus().enabled,false);assert.equal(control.readerStatus().phase,'stopping');
 game.emit('close');await flush();assert.equal(b.title,'Reader\nOFF');
 await slot.onDidReceiveSettings(event(a));await toggle.onWillAppear(event(b));await flush();assert.equal(children.length,5);
 // Consent cannot be granted without a visible control, even through this internal API.
 toggle.onWillDisappear(event(b));control.setReaderEnabled(true);await flush();assert.equal(control.readerStatus().enabled,false);assert.equal(children.length,5);
 const clean=load('src/dev/readerControl.ts',{});assert.equal(clean.readerStatus().enabled,false);assert.equal(clean.readerStatus().phase,'off');
 const manifest=JSON.parse(fs.readFileSync('com.deckbridge.wow.dev.sdPlugin/manifest.json','utf8'));
 const entry=manifest.Actions.find(a=>a.UUID.endsWith('.reader'));assert.equal(entry.DisableAutomaticStates,true);assert.equal(entry.States.length,2);
 console.log('OK: default/restart OFF, explicit consent, process start/stop confirmation, heartbeat, mirrored controls, page/slot disappearance, crash without retry and settings without consent (mocked processes/SDK).');
})().catch(error=>{console.error(error);process.exitCode=1;});
