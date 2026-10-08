const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const path=require('node:path');const {execFile}=require('node:child_process');const exec=require('node:util').promisify(execFile);
const ffmpeg=require('ffmpeg-static'),probe=require('ffprobe-static').path,C=require('../src/core.js'),E=require('../electron/exporter.cjs');
test('GIF export retains cuts, stacked video, animated text, timing and loop preference without audio',async()=>{
 const dir=path.resolve('.test-output/gif');await fs.mkdir(dir,{recursive:true});
 const assets=[];
 for(const color of ['red','blue']){
  const file=path.join(dir,color+'.mp4');await exec(ffmpeg,['-y','-v','error','-f','lavfi','-i','color=c='+color+':s=160x90:r=30:d=2','-f','lavfi','-i','sine=frequency=440:duration=2','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',file],{windowsHide:true});
  assets.push({id:color,path:file,name:color,type:'video',width:160,height:90,duration:2,hasAudio:true});
 }
 const p=C.newProject();p.assets=assets;p.clips=[{...C.createClip(assets[0],0),out:1},{...C.createClip(assets[1],1),out:1},{...C.createClip(assets[1],0),out:1,lane:1,scale:.3,x:.3,y:.3},{...C.createText(0),out:2,text:'GIF',fontSize:180,color:'#ffffff',shadow:false,keyframes:[{time:0,values:{x:-.2}},{time:2,values:{x:.2}}]}];
 for(const [quality,loop,fps]of [['standard',true,10],['high',false,15]]){
  const output=path.join(dir,quality+'.gif'),plan=await E.buildExport(p,{format:'gif',height:240,fps,quality,loop},dir,output);let progress=0;await E.runExport(plan,v=>progress=v);assert.equal(progress,100);
  const info=JSON.parse((await exec(probe,['-v','error','-count_frames','-show_streams','-show_packets','-of','json',output],{windowsHide:true})).stdout);
  assert.equal(info.streams.length,1);const stream=info.streams[0];assert.equal(stream.codec_name,'gif');assert.equal(stream.width,426);assert.equal(stream.height,240);assert.equal(Number(stream.nb_read_frames),fps*2);const lastPacket=info.packets.at(-1);assert.ok(Math.abs(Number(lastPacket.pts_time)+Number(lastPacket.duration_time)-2)<.02);
  const bytes=await fs.readFile(output);assert.equal(bytes.subarray(0,6).toString(),'GIF89a');assert.equal(bytes.includes(Buffer.from('NETSCAPE2.0')),loop);
  async function frame(time){return (await exec(ffmpeg,['-v','error','-ignore_loop','1','-i',output,'-ss',String(time),'-frames:v','1','-pix_fmt','rgb24','-f','rawvideo','pipe:1'],{windowsHide:true,encoding:'buffer',maxBuffer:1024*1024})).stdout;}
  const first=await frame(.2),last=await frame(1.5);const pixel=(b,x,y)=>[...b.subarray((y*426+x)*3,(y*426+x)*3+3)];
  assert.ok(pixel(first,15,15)[0]>200,'first main clip stays red');assert.ok(pixel(first,335,192)[2]>200,'upper video layer stays blue');assert.ok(pixel(last,15,15)[2]>200,'cut switches the main clip to blue');
  assert.ok(first.some((v,i)=>i%3===0&&v>200&&first[i+1]>200&&first[i+2]>200),'text is composited into the GIF');assert.equal(p.fps,30);
 }
 p.clips=[C.createClip(assets[0]),C.createClip(assets[1],2)];C.applyDissolve(p,p.clips[1].id,1);
 const dissolve=path.join(dir,'dissolve.gif');await E.runExport(await E.buildExport(p,{format:'gif',height:240,fps:20,quality:'high'},dir,dissolve));
 const midpoint=(await exec(ffmpeg,['-v','error','-ignore_loop','1','-i',dissolve,'-ss','1.5','-frames:v','1','-vf','crop=2:2:210:120','-pix_fmt','rgb24','-f','rawvideo','pipe:1'],{windowsHide:true,encoding:'buffer'})).stdout;
 assert.ok(Math.abs(midpoint[0]-127)<25&&Math.abs(midpoint[2]-127)<25,'cross dissolve survives GIF palette conversion');
});
test('GIF export validates format, dimensions, frame rate and looping before rendering',()=>{
 assert.deepEqual(E.exportSettings({format:'gif'}),{format:'gif',height:480,fps:15,quality:'standard',loop:true});
 assert.equal(E.exportSettings({height:720,quality:'high'},24).format,'mp4');
 for(const settings of [{format:'webm'},{format:'gif',height:2160},{format:'gif',fps:60},{format:'gif',loop:'yes'},{format:'mp4',height:480},{format:'gif',quality:'bad'}])assert.throws(()=>E.exportSettings(settings),/Invalid export/);
});
test('GIF cancellation rejects instead of reporting a completed animation',async()=>{
 const dir=path.resolve('.test-output/gif-cancel');await fs.mkdir(dir,{recursive:true});const p=C.newProject();p.clips=[{...C.createText(0),out:60}];
 const plan=await E.buildExport(p,{format:'gif',height:240,fps:10},dir,path.join(dir,'cancelled.gif'));const abort=new AbortController();abort.abort();await assert.rejects(E.runExport(plan,()=>{},abort.signal),/cancelled/);
});
test('Portrait title-only GIF uses no audio input and can cancel between palette and encoding passes',async()=>{
 const dir=path.resolve('.test-output/gif-title');await fs.mkdir(dir,{recursive:true});const p=C.newProject();p.ratio='9:16';p.assets=[{id:'audio',type:'audio',path:path.join(dir,'unused.wav'),duration:1,hasAudio:true}];p.clips=[{...C.createText(0),out:1,text:'Hello',background:true,opacity:.5},{...C.createClip(p.assets[0]),out:1}];
 const output=path.join(dir,'portrait.gif'),plan=await E.buildExport(p,{format:'gif',height:240,fps:10},dir,output);await E.runExport(plan);
 const info=JSON.parse((await exec(probe,['-v','error','-count_frames','-show_streams','-of','json',output],{windowsHide:true})).stdout);assert.equal(info.streams[0].width,136);assert.equal(info.streams[0].height,240);assert.equal(Number(info.streams[0].nb_read_frames),10);
 const cancelled=path.join(dir,'between-passes.gif');await fs.rm(cancelled,{force:true});const abort=new AbortController();await assert.rejects(E.runExport(await E.buildExport(p,{format:'gif',height:240,fps:10},dir,cancelled),progress=>{if(progress===25)abort.abort();},abort.signal),/cancelled/);await assert.rejects(fs.stat(cancelled),{code:'ENOENT'});
});
