// Store artwork fixture only. Excluded from the extension package.
const defaults={rotationSeconds:8,showOverlay:true,sites:[{url:'https://example.com/',label:'Team dashboard',refreshEverySeconds:300},{url:'https://example.org/',label:'Service status',refreshEverySeconds:60}]};
let saved={config:defaults,revision:'artwork-fixture'},running=true,paused=false;
const listeners=[];
Object.defineProperty(globalThis,'chrome',{value:{runtime:{id:'artwork-preview',openOptionsPage:async()=>{},sendMessage:async m=>{
 if(m.type==='getSettings')return {success:true,...saved};
 if(m.type==='saveSettings'){saved={config:KioskCore.validateConfig(m.config),revision:'artwork-fixture'};return {success:true,...saved};}
 if(m.type==='startCycle'){running=true;paused=false;return {success:true};}
 if(m.type==='controlCycle'){running=m.action!=='stop';paused=m.action==='pause';}
 return {success:true,...saved,running,paused,totalSites:2,currentLabel:'Team dashboard',missingOrigins:[]};
}},windows:{getCurrent:async()=>({id:1})},storage:{onChanged:{addListener:f=>listeners.push(f)}},permissions:{request:async()=>true,onAdded:{addListener:()=>{}},onRemoved:{addListener:()=>{}}}}});
