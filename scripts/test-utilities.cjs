// No WoW, keyboard input or Stream Deck connection. Validate action routing with mocks.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,imports){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,experimentalDecorators:true}}).outputText,{exports,require:name=>{assert(Object.hasOwn(imports,name),name);return imports[name];}});return exports;}
const catalog=load('src/dev/utilities.ts',{});
const calls=[];
const actions=load('src/dev/utilityActions.ts',{
  '@elgato/streamdeck':{action:()=>value=>value,SingletonAction:class{}},
  './keys':{warmUp(){},keyDownUtility:(id,slot)=>calls.push(['D',id,slot]),keyUp:id=>calls.push(['U',id])},'./utilities':catalog
});
(async()=>{
  let title;
  const action={id:'button',isKey:()=>true,setTitle:async value=>{title=value;}};
  const event=settings=>({action,payload:{settings}});
  const emote=new actions.EmoteAction();
  await emote.onWillAppear(event({}));assert.equal(title,'Wave');
  const slots=new Set([catalog.QUEST_SLOT,catalog.BACKPACK_SLOT,catalog.WORLD_MAP_SLOT,catalog.CHARACTER_SLOT,catalog.SPELLBOOK_SLOT]);
  for(const option of catalog.EMOTES){
    assert(!slots.has(option.slot));slots.add(option.slot);
    await emote.onDidReceiveSettings(event({emote:option.id}));assert.equal(title,option.label);
    emote.onKeyDown(event({emote:option.id}));assert.deepEqual(calls.at(-1),['D','button',option.slot]);
    emote.onKeyUp(event({emote:'changed-after-down'}));assert.deepEqual(calls.at(-1),['U','button']);
  }
  const before=calls.length;emote.onKeyDown(event({emote:'/run malicious()'}));assert.equal(calls.length,before);
  for(const [Class,slot,label]of [[actions.QuestAction,97,'Map &\nQuests'],[actions.BackpackAction,98,'Backpack'],[actions.WorldMapAction,97,'Map &\nQuests'],[actions.CharacterAction,112,'Character'],[actions.SpellbookAction,113,'Spellbook']]){
    const instance=new Class();await instance.onWillAppear(event({}));assert.equal(title,label);
    instance.onKeyDown(event({}));assert.deepEqual(calls.at(-1),['D','button',slot]);
    instance.onWillDisappear(event({}));assert.deepEqual(calls.at(-1),['U','button']);
  }
  const lua=fs.readFileSync('addon/DeckBridgeDev/UtilityActions.lua','utf8');
  const tokens=[...lua.match(/local emotes = \{([^}]+)\}/)[1].matchAll(/"([A-Z]+)"/g)].map(match=>match[1]);
  assert.deepEqual(tokens,Array.from(catalog.EMOTES,e=>e.token));
  assert(lua.includes('"TOGGLEQUESTLOG"'));assert(lua.includes('"TOGGLEBACKPACK"'));
  for(const command of ['TOGGLECHARACTER0','TOGGLESPELLBOOK'])assert(lua.includes('"'+command+'"'));
  assert(lua.includes('[14] = "TOGGLEQUESTLOG"')); // Legacy key shares the canonical panel.
  const html=fs.readFileSync('com.deckbridge.wow.dev.sdPlugin/ui/emote.html','utf8');
  assert.deepEqual([...html.matchAll(/<option value="([a-z]+)">/g)].map(m=>m[1]),Array.from(catalog.EMOTES,e=>e.id));
  const manifest=JSON.parse(fs.readFileSync('com.deckbridge.wow.dev.sdPlugin/manifest.json','utf8'));
  assert.deepEqual(manifest.Actions.map(a=>a.UUID).sort(),['slot','emote','quests','backpack','worldmap','character','spellbook','reader'].map(n=>'com.deckbridge.wow.dev.'+n).sort());
  const visible=manifest.Actions.filter(a=>a.VisibleInActionsList!==false);
  assert.equal(visible.filter(a=>a.Name==='Map & Quests').length,1);
  assert(!visible.some(a=>a.UUID.endsWith('.worldmap')));
  assert.equal(manifest.Actions.find(a=>a.UUID.endsWith('.worldmap')).VisibleInActionsList,false);
  assert.equal(slots.size,17);assert(Math.min(...slots)>96);
  console.log('OK: all 12 emotes, selection validation, labels, press/release/settings lifecycle, quest/backpack routing, separate key bank and addon/inspector/manifest consistency.');
})().catch(error=>{console.error(error);process.exitCode=1;});
