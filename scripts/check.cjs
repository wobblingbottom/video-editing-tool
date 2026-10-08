const fs=require('node:fs');const {execFileSync}=require('node:child_process');
for(const f of ['electron/main.cjs','electron/preload.cjs','electron/exporter.cjs','src/core.js','src/renderer.js','src/timeline.js'])execFileSync(process.execPath,['--check',f],{stdio:'inherit'});
for(const f of ['src/index.html','src/styles.css','src/assets/icon.svg'])if(!fs.existsSync(f))throw Error('Missing '+f);
const html=fs.readFileSync('src/index.html','utf8');const js=fs.readFileSync('src/renderer.js','utf8')+fs.readFileSync('src/timeline.js','utf8');const ids=new Set([...(html+js).matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));for(const m of js.matchAll(/\$\('#([^' ]+)'\)/g))if(!ids.has(m[1]))throw Error('Missing element #'+m[1]);
console.log('JavaScript syntax, assets, and UI references checked.');
