const fs=require('node:fs');const path=require('node:path');const zlib=require('node:zlib');
const N=256,pixels=Buffer.alloc(N*(N*4+1));
function line(x,y,x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1,t=Math.max(0,Math.min(1,((x-x1)*dx+(y-y1)*dy)/(dx*dx+dy*dy)));return Math.hypot(x-x1-t*dx,y-y1-t*dy);}
for(let y=0;y<N;y++)for(let x=0;x<N;x++){const o=y*(N*4+1)+1+x*4;let coverage=0,ink=0;for(let sy=0;sy<4;sy++)for(let sx=0;sx<4;sx++){const px=x+(sx+.5)/4,py=y+(sy+.5)/4;const qx=Math.max(54-px,0,px-202),qy=Math.max(54-py,0,py-202);if(Math.hypot(qx,qy)>54)continue;coverage++;if(Math.min(line(px,py,64,56,192,200),line(px,py,64,200,192,56))<14)ink++;}const blend=coverage?ink/coverage:0;pixels[o]=Math.round(244*(1-blend)+53*blend);pixels[o+1]=Math.round(95*(1-blend)+19*blend);pixels[o+2]=Math.round(119*(1-blend)+27*blend);pixels[o+3]=Math.round(coverage/16*255);}
function crc(buf){let c=0xffffffff;for(const v of buf){c^=v;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(type,b){const t=Buffer.from(type),h=Buffer.alloc(4),f=Buffer.alloc(4);h.writeUInt32BE(b.length);f.writeUInt32BE(crc(Buffer.concat([t,b])));return Buffer.concat([h,t,b,f]);}
const ih=Buffer.alloc(13);ih.writeUInt32BE(N,0);ih.writeUInt32BE(N,4);ih[8]=8;ih[9]=6;
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);
const header=Buffer.alloc(22);header.writeUInt16LE(1,2);header.writeUInt16LE(1,4);header.writeUInt16LE(1,10);header.writeUInt16LE(32,12);header.writeUInt32LE(png.length,14);header.writeUInt32LE(22,18);
fs.writeFileSync(path.join(__dirname,'../src/assets/icon.ico'),Buffer.concat([header,png]));fs.writeFileSync(path.join(__dirname,'../src/assets/icon.png'),png);
