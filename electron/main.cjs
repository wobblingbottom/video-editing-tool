'use strict';
const {app,BrowserWindow,ipcMain,dialog,Menu,shell}=require('electron');
const fs=require('node:fs/promises');const path=require('node:path');const os=require('node:os');
const {pathToFileURL}=require('node:url');const {execFile,spawn}=require('node:child_process');const {promisify}=require('node:util');
const exec=promisify(execFile);const ffmpeg=require('ffmpeg-static').replace('app.asar','app.asar.unpacked');const ffprobe=require('ffprobe-static').path.replace('app.asar','app.asar.unpacked');
const Core=require('../src/core.js');const Exporter=require('./exporter.cjs');
let win,projectPath=null,exportAbort=null,lastOutput=null;const assets=new Map();
const extensions=new Set(['.mp4','.mov','.mkv','.webm','.avi','.m4v','.mp3','.wav','.aac','.m4a','.ogg','.flac','.png','.jpg','.jpeg','.webp']);
function analyzeWaveform(file,duration){return new Promise((resolve,reject)=>{const bins=Array(2048).fill(0);let samples=0,carry=Buffer.alloc(0),stderr='';const child=spawn(ffmpeg,['-v','error','-i',file,'-vn','-ac','1','-ar','1000','-f','f32le','pipe:1'],{windowsHide:true,timeout:90000,stdio:['ignore','pipe','pipe']});child.stdout.on('data',data=>{const buffer=carry.length?Buffer.concat([carry,data]):data;const count=Math.floor(buffer.length/4);for(let i=0;i<count;i++){const bucket=Math.min(bins.length-1,Math.floor(samples++/(duration*1000)*bins.length));bins[bucket]=Math.max(bins[bucket],Math.min(1,Math.abs(buffer.readFloatLE(i*4))));}carry=Buffer.from(buffer.subarray(count*4));});child.stderr.on('data',b=>{stderr=(stderr+b.toString()).slice(-1000);});child.on('error',reject);child.on('close',code=>code===0?resolve(bins):reject(Error(stderr||'Waveform analysis failed.')));});}
async function importOne(file,id=Core.uid()){
 if(!extensions.has(path.extname(file).toLowerCase()))throw Error('Unsupported media: '+path.basename(file));
 const stat=await fs.stat(file);if(!stat.isFile())throw Error('Media source is not a file.');
 const result=await exec(ffprobe,['-v','error','-show_format','-show_streams','-of','json',file],{windowsHide:true,maxBuffer:4*1024*1024});
 const meta=JSON.parse(result.stdout);const v=meta.streams.find(s=>s.codec_type==='video'&&!s.disposition?.attached_pic);const a=meta.streams.find(s=>s.codec_type==='audio');
 const image=['.png','.jpg','.jpeg','.webp'].includes(path.extname(file).toLowerCase());const type=image?'image':v?'video':'audio';
 const duration=image?5:Number(meta.format.duration||v?.duration||a?.duration);if(!Number.isFinite(duration)||duration<=0)throw Error('Could not read the duration of '+path.basename(file));
 const asset={id,path:file,name:path.basename(file),src:pathToFileURL(file).href,type,duration,width:v?.width||1,height:v?.height||1,hasAudio:!!a,thumbnail:null,waveform:[]};
 if(v){try {const thumb=await exec(ffmpeg,['-hide_banner','-loglevel','error','-ss',String(image?0:Math.min(.5,duration/2)),'-i',file,'-frames:v','1','-vf','scale=320:-1','-f','image2pipe','-vcodec','mjpeg','pipe:1'],{windowsHide:true,encoding:'buffer',maxBuffer:5*1024*1024});asset.thumbnail='data:image/jpeg;base64,'+thumb.stdout.toString('base64');}catch{}}
 if(a){try{asset.waveform=await analyzeWaveform(file,duration);asset.waveformDuration=duration;}catch{}}
 assets.set(id,asset);return asset;
}
function trusted(event){if(event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame)throw Error('Untrusted request.');}
function handle(name,fn){ipcMain.handle(name,async(e,...args)=>{trusted(e);return fn(...args);});}
function canonical(raw){const p=Core.normalizeProject(raw);p.assets=p.assets.map(a=>{const known=assets.get(a.id);if(!known)throw Error('Media is not imported.');return known;});for(const c of p.clips){const a=p.assets.find(a=>a.id===c.assetId);if(a&&a.type!=='image'&&c.out>a.duration+.05)throw Error('Clip extends beyond its source.');if(a&&((c.track==='audio'&&!a.hasAudio)||(c.track==='video'&&a.type==='audio')))throw Error('Media does not match its track.');}return p;}
async function importFiles(files){const imported=[],errors=[];for(const f of files){try{imported.push(await importOne(f));}catch(e){errors.push(e.message);}}return {assets:imported,errors};}
function register(){
 handle('project:new',()=>{projectPath=null;return true;});
 handle('media:import',async()=>{const r=await dialog.showOpenDialog(win,{title:'Import media',properties:['openFile','multiSelections'],filters:[{name:'Video, audio and images',extensions:[...extensions].map(x=>x.slice(1))}]});return r.canceled?{assets:[],errors:[]}:importFiles(r.filePaths);});
 handle('media:drop',files=>{if(!Array.isArray(files)||files.length>500||files.some(f=>typeof f!=='string'))throw Error('Invalid files.');return importFiles(files);});
 handle('project:save',async(raw,saveAs)=>{const p=canonical(raw);let dest=projectPath;if(!dest||saveAs){const r=await dialog.showSaveDialog(win,{title:'Save project',defaultPath:p.name+'.cutline',filters:[{name:'Cutline project',extensions:['cutline']}]});if(r.canceled)return {cancelled:true};dest=r.filePath;}await fs.writeFile(dest+'.tmp',JSON.stringify(p,null,2),'utf8');await fs.rename(dest+'.tmp',dest);projectPath=dest;return {path:dest};});
 handle('project:open',async()=>{const r=await dialog.showOpenDialog(win,{title:'Open project',properties:['openFile'],filters:[{name:'Cutline project',extensions:['cutline']}]});if(r.canceled)return null;const stat=await fs.stat(r.filePaths[0]);if(stat.size>20*1024*1024)throw Error('Project file is too large.');const p=Core.normalizeProject(JSON.parse(await fs.readFile(r.filePaths[0],'utf8')));const resolved=[];for(const a of p.assets){try{resolved.push(await importOne(a.path,a.id));}catch{throw Error('Source file is missing or unreadable: '+a.name+'. Restore it to '+a.path+' and reopen the project.');}}p.assets=resolved;canonical(p);projectPath=r.filePaths[0];return p;});
 handle('export:start',async(raw,options)=>{if(exportAbort)throw Error('An export is already running.');const p=canonical(raw);if(!Core.duration(p))throw Error('Add media to the timeline first.');options=Exporter.exportSettings(options,p.fps);const format=options.format;const r=await dialog.showSaveDialog(win,{title:format==='gif'?'Export GIF':'Export video',defaultPath:p.name+'.'+format,filters:[{name:format==='gif'?'GIF animation':'MP4 video',extensions:[format]}]});if(r.canceled)return {cancelled:true};const destination=path.extname(r.filePath).toLowerCase()==='.'+format?r.filePath:r.filePath+'.'+format;if(p.assets.some(a=>path.resolve(a.path).toLowerCase()===path.resolve(destination).toLowerCase()))throw Error('Choose a different file; export cannot replace source media.');const temp=await fs.mkdtemp(path.join(os.tmpdir(),'cutline-'));const staged=path.join(path.dirname(destination),'.cutline-'+Core.uid()+'.'+format);exportAbort=new AbortController();try{const plan=await Exporter.buildExport(p,options,temp,staged);await Exporter.runExport(plan,percent=>win?.webContents.send('export:progress',percent),exportAbort.signal);await fs.rename(staged,destination);lastOutput=destination;return {path:destination};}finally{exportAbort=null;await fs.rm(temp,{recursive:true,force:true});await fs.rm(staged,{force:true});}});
 handle('export:cancel',()=>exportAbort?.abort());handle('export:show',()=>{if(lastOutput)shell.showItemInFolder(lastOutput);});
 for(const [name,fn]of [['minimize',()=>win.minimize()],['maximize',()=>win.isMaximized()?win.unmaximize():win.maximize()],['close',()=>win.destroy()]])ipcMain.on('window:'+name,e=>{trusted(e);fn();});
}
app.whenReady().then(()=>{
 win=new BrowserWindow({width:1500,height:960,minWidth:1000,minHeight:700,frame:false,icon:path.join(__dirname,'../src/assets/icon.ico'),backgroundColor:'#111216',title:'Cutline Studio',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());
 Menu.setApplicationMenu(null);register();win.loadFile(path.join(__dirname,'../src/index.html'));
 win.on('close',e=>{e.preventDefault();win.webContents.send('menu:action','close');});
 win.on('closed',()=>{win=null;exportAbort?.abort();});
});
app.on('window-all-closed',()=>app.quit());