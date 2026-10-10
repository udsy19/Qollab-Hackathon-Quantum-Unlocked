const http=require('http'),fs=require('fs'),path=require('path');
http.createServer((q,r)=>{const u=q.url.split('?')[0];const f=u==='/diag.js'?path.join(__dirname,'../../../../echo/diag.js'):path.join(__dirname,'site',u);fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}
r.writeHead(200,{'Content-Type':f.endsWith('.js')?'text/javascript':'text/html','Access-Control-Allow-Origin':'*'});r.end(d);});}).listen(4902);
