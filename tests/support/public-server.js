import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root=resolve('dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
createServer(async(req,res)=>{
  try {
    let path=decodeURIComponent(new URL(req.url,'http://127.0.0.1:3100').pathname);
    if(path==='/SEMAS') {res.writeHead(301,{Location:'/SEMAS/'}).end();return;}
    if(path.startsWith('/SEMAS/'))path=path.slice('/SEMAS'.length);
    if(path.endsWith('/'))path+='index.html';
    const file=resolve(root,'.'+path);
    if(!file.startsWith(root+sep)||!['GET','HEAD'].includes(req.method))throw new Error('Not found');
    const data=await readFile(file);
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});
    res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404).end('Not found');}
}).listen(3100,'127.0.0.1');
