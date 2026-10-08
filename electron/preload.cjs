const {contextBridge,ipcRenderer,webUtils}=require('electron');
contextBridge.exposeInMainWorld('desktop',{
 newProject:()=>ipcRenderer.invoke('project:new'),
 importMedia:()=>ipcRenderer.invoke('media:import'),
 importDropped:files=>ipcRenderer.invoke('media:drop',Array.from(files).map(f=>webUtils.getPathForFile(f))),
 openProject:()=>ipcRenderer.invoke('project:open'),
 saveProject:(project,saveAs)=>ipcRenderer.invoke('project:save',project,saveAs),
 exportVideo:(project,options)=>ipcRenderer.invoke('export:start',project,options),
 cancelExport:()=>ipcRenderer.invoke('export:cancel'),
 showOutput:()=>ipcRenderer.invoke('export:show'),
 onProgress:callback=>{const listener=(_e,p)=>callback(p);ipcRenderer.on('export:progress',listener);return ()=>ipcRenderer.removeListener('export:progress',listener);},
 minimize:()=>ipcRenderer.send('window:minimize'),maximize:()=>ipcRenderer.send('window:maximize'),close:()=>ipcRenderer.send('window:close'),
 onAction:callback=>{ipcRenderer.on('menu:action',(_e,a)=>callback(a));}
});