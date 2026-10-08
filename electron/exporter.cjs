'use strict';
const path=require('node:path');
const fs=require('node:fs/promises');
const {spawn}=require('node:child_process');
const Core=require('../src/core.js');
const ffmpeg=require('ffmpeg-static').replace('app.asar','app.asar.unpacked');
function escapeFilter(p){return p.replace(/\\/g,'/').replace(/:/g,'\\:').replace(/'/g,"'\\''");}
function atempo(speed){const factors=[];while(speed>2){factors.push(2);speed/=2;}while(speed<.5){factors.push(.5);speed/=.5;}factors.push(speed);return factors.map(f=>'atempo='+f).join(',');}
function exportSettings(options={},projectFps=30,presetsOnly=true){
 const format=options.format??'mp4',gif=format==='gif';
 const height=options.height??(gif?480:1080),fps=options.fps??(gif?15:projectFps),quality=options.quality??'standard',loop=options.loop??true;
 const validHeight=presetsOnly?(gif?[240,360,480,720]:[720,1080,2160]).includes(height):Number.isInteger(height)&&height>=2&&height<=2160&&height%2===0;
 if(!['mp4','gif'].includes(format)||!validHeight||!(gif?[10,15,20,24,25,30]:[24,25,30,60]).includes(fps)||!['standard','high'].includes(quality)||typeof loop!=='boolean')throw Error('Invalid export settings.');
 return {format,height,fps,quality,loop};
}
async function buildExport(project,options,tempDir,output){
 options=exportSettings(options,project.fps||30,false);const gif=options.format==='gif';
 const {width:W,height:H}=Core.dimensions(project.ratio,options.height);
 const total=Core.duration(project),fps=options.fps;
 if(!total)throw Error('Add a clip to the timeline before exporting.');
 const args=['-y','-hide_banner','-filter_complex_threads','2'];const filters=['color=c=0x0b0c0f:s='+W+'x'+H+':r='+fps+':d='+total+'[base]'];
 if(!gif)filters.push('anullsrc=r=48000:cl=stereo,atrim=duration='+total+'[silence]');
 let index=0,base='base';const audio=['silence'];
 for(const c of Core.orderedClips(project).filter(c=>c.track!=='text'&&!c.disabled)){
  const a=project.assets.find(a=>a.id===c.assetId);if(!a)throw Error('Missing source media.');
  if(gif&&(c.track!=='video'||a.type==='audio'||Core.trackState(project,c).hidden))continue;
  const dur=Core.clipDuration(c),i=index++,transition=Core.transitionFor(project,c);
  if(a.type==='image')args.push('-loop','1','-t',String(dur),'-i',a.path);
  else args.push('-ss',String(c.in),'-t',String(c.out-c.in),'-i',a.path);
  if(c.track==='video'&&a.type!=='audio'&&!Core.trackState(project,c).hidden){
   const fit=Math.min(W/a.width,H/a.height)*(c.scale||1);
   const w=Math.max(2,Math.round(a.width*fit/2)*2),h=Math.max(2,Math.round(a.height*fit/2)*2);
   let chain='['+i+':v]setpts=(PTS-STARTPTS)/'+(c.speed||1)+',scale='+w+':'+h+',setsar=1,eq=brightness='+(c.brightness||0)+':contrast='+(c.contrast??1)+':saturation='+(c.saturation??1);
   if(c.rotation)chain+=',rotate='+c.rotation+'*PI/180:ow=rotw('+c.rotation+'*PI/180):oh=roth('+c.rotation+'*PI/180):c=none';
   chain+=',format=rgba';
   if(c.keyframes?.some(f=>'opacity' in f.values)||(c.opacity??1)!==1)chain+=",geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='alpha(X,Y)*("+Core.propertyExpression(c,'opacity','T')+")'";
   if(transition)chain+=',fade=t=in:st='+(transition.type==='fadeblack'?transition.duration/2:0)+':d='+(transition.type==='fadeblack'?transition.duration/2:transition.duration)+':alpha=1';
   const incoming=project.clips.find(x=>x.transitionIn?.fromId===c.id&&x.transitionIn.type==='fadeblack'),outgoing=incoming&&Core.transitionFor(project,incoming);
   if(outgoing)chain+=',fade=t=out:st='+(incoming.start-c.start)+':d='+outgoing.duration/2+':alpha=1';
   if(c.fadeIn)chain+=',fade=t=in:st=0:d='+Math.min(c.fadeIn,dur)+':alpha=1';
   if(c.fadeOut)chain+=',fade=t=out:st='+Math.max(0,dur-c.fadeOut)+':d='+Math.min(c.fadeOut,dur)+':alpha=1';
   chain+=',setpts=PTS+'+c.start+'/TB[v'+i+']';filters.push(chain);
   const next='layer'+i;
   filters.push('['+base+'][v'+i+"]overlay=x='(W-w)/2+("+Core.propertyExpression(c,'x','(t-'+c.start+')')+")*W':y='(H-h)/2+("+Core.propertyExpression(c,'y','(t-'+c.start+')')+")*H':eof_action=pass:repeatlast=0:enable='gte(t,"+c.start+')*lt(t,'+(c.start+dur)+")'["+next+']');base=next;
  }
  if(!gif&&a.hasAudio&&(c.volume>0||c.keyframes?.some(f=>f.values.volume>0))&&!c.audioMuted&&!Core.trackState(project,c).muted){
   const audioFade=Core.fadeDurations(c);
   let chain='['+i+':a]asetpts=PTS-STARTPTS,'+atempo(c.speed||1)+",volume='"+Core.propertyExpression(c,'volume')+"':eval=frame";
   if(audioFade.in)chain+=',afade=t=in:st=0:d='+audioFade.in;
   if(audioFade.out)chain+=',afade=t=out:st='+(dur-audioFade.out)+':d='+audioFade.out;
   chain+=',adelay='+Math.round(c.start*1000)+'|'+Math.round(c.start*1000)+'[a'+i+']';filters.push(chain);audio.push('a'+i);
  }
 }
 const mediaInputs=index;
 for(const c of Core.orderedClips(project,'text').filter(c=>!c.disabled&&!Core.trackState(project,c).hidden)){
  const textPath=path.join(tempDir,'text-'+index+'.txt');await fs.writeFile(textPath,c.text,'utf8');
  const family=Core.fonts[c.fontFamily]||Core.fonts.Arial;
  const font=path.join(process.env.WINDIR||'C:/Windows','Fonts',c.bold?family.bold:family.regular);
  const next='text'+index++;
  const local='(t-'+c.start+')',size=Math.round(c.fontSize*H/1080);
  const layerOpacity=c.background&&((c.opacity??1)!==1||c.keyframes?.some(f=>'opacity' in f.values));
  const under=base;
  if(layerOpacity){base='titlebase'+index;filters.push('color=c=black@0:s='+W+'x'+H+':r='+fps+':d='+total+',format=rgba['+base+']');}
  filters.push('['+base+']drawtext=fontfile=\''+escapeFilter(font)+'\':textfile=\''+escapeFilter(textPath)+"':expansion=none:fontsize="+size+':fontcolor='+c.color+":alpha='"+(layerOpacity?'1':Core.propertyExpression(c,'opacity',local))+"':x='(w-text_w)/2+("+Core.propertyExpression(c,'x',local)+")*w':y='(h-text_h)/2+("+Core.propertyExpression(c,'y',local)+")*h':line_spacing="+Math.round(size*.2)+':borderw='+Math.round((c.strokeWidth||0)*H/1080)+':bordercolor='+(c.strokeColor||'#000000')+(c.background?':box=1:boxcolor='+(c.backgroundColor||'#15151b')+':boxborderw='+Math.round(12*H/1080):'')+(c.shadow===false?'':':shadowcolor=black@0.6:shadowx=2:shadowy=2')+":enable='gte(t,"+c.start+')*lt(t,'+(c.start+Core.clipDuration(c))+")'["+next+']');base=next;
  if(layerOpacity){const faded='titlealpha'+index,composite='titlelayer'+index;filters.push('['+next+"]geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='alpha(X,Y)*("+Core.propertyExpression(c,'opacity','(T-'+c.start+')')+")'["+faded+']');filters.push('['+under+']['+faded+']overlay=eof_action=pass:repeatlast=0['+composite+']');base=composite;}
 }
 let palettePlan;
 if(gif){
  // Generate a shared palette in a separate pass so long timelines are not buffered in RAM.
  const palettePath=path.join(tempDir,Core.uid()+'-palette.png');
  const paletteFilters=[...filters,'['+base+']palettegen=max_colors='+(options.quality==='high'?256:128)+':stats_mode=diff[palette]'];
  palettePlan={args:[...args,'-filter_complex',paletteFilters.join(';'),'-map','[palette]','-frames:v','1','-threads','1','-progress','pipe:1','-nostats',palettePath],total};
  args.push('-i',palettePath);
  filters.push('['+base+']fps='+fps+':eof_action=pass,tpad=stop_mode=clone:stop_duration='+1/fps+'[gifframes]');
  filters.push('[gifframes]['+mediaInputs+':v]paletteuse=dither='+(options.quality==='high'?'sierra2_4a':'bayer:bayer_scale=3')+':diff_mode=rectangle[gifout]');
  args.push('-filter_complex',filters.join(';'),'-map','[gifout]','-an','-t',String(total),'-c:v','gif','-loop',options.loop?'0':'-1','-f','gif');
 }else{
  filters.push(audio.map(a=>'['+a+']').join('')+'amix=inputs='+audio.length+':duration=first:normalize=0:dropout_transition=0,alimiter=limit=0.95[aout]');
  args.push('-filter_complex',filters.join(';'),'-map','['+base+']','-map','[aout]','-t',String(total),'-r',String(fps),'-c:v','libx264','-preset',options.quality==='high'?'slow':'fast','-crf',options.quality==='high'?'18':'23','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart','-f','mp4');
 }
 args.push('-progress','pipe:1','-nostats',output);
 const plan={args,total,width:W,height:H,format:options.format,fps};
 return palettePlan?{...plan,steps:[palettePlan,plan]}:plan;
}
function runExport(plan,onProgress,signal){
 if(plan.steps)return (async()=>{for(let i=0;i<plan.steps.length;i++){if(signal?.aborted)throw Error('Export cancelled.');await runExport(plan.steps[i],p=>onProgress?.((i===0?0:25)+p*(i===0?.25:.75)),signal);}})();
 return new Promise((resolve,reject)=>{
  const child=spawn(ffmpeg,plan.args,{windowsHide:true,stdio:['ignore','pipe','pipe']});let stderr='',pending='',cancelled=false;
  const cancel=()=>{cancelled=true;child.kill();};signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
  child.stderr.on('data',b=>{stderr=(stderr+b.toString()).slice(-6000);});
  child.stdout.on('data',b=>{pending+=b.toString();const lines=pending.split(/\r?\n/);pending=lines.pop();for(const line of lines)if(line.startsWith('out_time_us=')){const elapsed=Number(line.split('=')[1])/1e6;if(Number.isFinite(elapsed))onProgress?.(Math.min(99,Math.max(0,elapsed/plan.total*100)));}});
  child.on('error',reject);child.on('close',code=>{signal?.removeEventListener('abort',cancel);if(cancelled)reject(Error('Export cancelled.'));else if(code!==0)reject(Error('Export failed: '+stderr.slice(-2000)));else {onProgress?.(100);resolve();}});
 });
}
module.exports={buildExport,runExport,atempo,escapeFilter,exportSettings};
