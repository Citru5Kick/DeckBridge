const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, imports) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022} }).outputText;
  vm.runInNewContext(code, {exports, Buffer, require: name => { assert(Object.hasOwn(imports,name),name);return imports[name]; }});
  return exports;
}
const parser=load('src/dev/luaParser.ts',{});
let size=0, modified=1, symbolic=false, readCount=0;
let content='';
const fakeFS={
  lstatSync:()=>({isFile:()=>true,isSymbolicLink:()=>symbolic,size,mtimeMs:modified}),
  openSync:()=>1,fstatSync:()=>({isFile:()=>true,size}),closeSync:()=>{},
  readSync:(_fd,buffer,offset,length,position)=>{
    readCount++;
    if(position!==null)throw Error('Unexpected read position');
    // This fixture is consumed in one read, followed by EOF.
    if(offset)return 0;
    return Buffer.from(content).copy(buffer,offset,0,length);
  }
};
const data=load('src/dev/data.ts',{'node:fs':{default:fakeFS},'./luaParser':parser});
const text='DeckBridgeDevDB = { active="Mage-Realm-62", profiles={ ["Mage-Realm-62"]={ [1]={id=1,icon=123},[2]={id=2,icon="../../private"},[97]={id=1,icon=123},[3]={id=3,icon=0} } } }';
const saved=data.parseSavedSnapshot(text);
assert.equal(saved.slots.size,2);assert.equal(saved.slots.get(1).icon,123);assert.equal(saved.slots.get(3).icon,0);
assert.equal(saved.context,data.contextId('Mage-Realm-62'));
assert.throws(()=>data.parseSavedSnapshot('DeckBridgeDB = {}'));
assert.throws(()=>parser.parseLuaSaved('a={x="unterminated}'));
assert.throws(()=>parser.parseLuaSaved('a='+ '{'.repeat(40)+'}'.repeat(40)),/nesting/);
assert.throws(()=>parser.parseLuaSaved('a="'+'x'.repeat(4097)+'"'),/long/);
assert.throws(()=>parser.parseLuaSaved('a={ [1 123 }'));
const proto=parser.parseLuaSaved('a={ ["__proto__"]={polluted=true} }');
assert.equal(Object.getPrototypeOf(proto.a),null);assert.equal({}.polluted,undefined);
size=data.MAX_SAVED_BYTES+1;
assert.throws(()=>data.loadSlots('DeckBridgeDev.lua','DeckBridgeDevDB'));assert.equal(readCount,0);
content=text;size=Buffer.byteLength(text);symbolic=true;
assert.throws(()=>data.loadSlots('DeckBridgeDev.lua','DeckBridgeDevDB'));assert.equal(readCount,0);
symbolic=false;
const first=data.loadSlots('DeckBridgeDev.lua','DeckBridgeDevDB');const reads=readCount;
assert.equal(data.loadSlots('DeckBridgeDev.lua','DeckBridgeDevDB'),first);assert.equal(readCount,reads);
const live=new data.LiveState();
assert.equal(live.update(saved.context,new Map([[1,{kind:'action',id:1,icon:999}]]),0),true);
assert.equal(live.update(saved.context,new Map([[1,{kind:'action',id:1,icon:999}]]),1000),false);
assert.equal(live.overlay(saved).get(1).icon,999);
assert.equal(live.expire(4499),false);assert.equal(live.expire(4500),true);
assert.equal(live.overlay(saved).get(1).icon,123);
live.update(saved.context+1,new Map([[2,{kind:'action',id:2,icon:456}]]),5000);
assert.equal(live.overlay(saved).size,1);assert.equal(live.overlay(saved).has(1),false);
live.expire(8500);assert.equal(live.overlay(saved).size,0); // Never show previous character's saved icons.
live.clear();assert.equal(live.overlay(saved).get(1).icon,123);
console.log('OK: strict DEV database, invalid icon/slot rejection, parser depth/size/string limits, prototype isolation, symlinks, file cache, live expiry and profile changes.');
