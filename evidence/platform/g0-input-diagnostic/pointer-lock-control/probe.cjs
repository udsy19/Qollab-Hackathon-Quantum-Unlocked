const path=require('path');const {execSync}=require('child_process');
const pp=require(path.join(execSync('npm root -g').toString().trim(),'@modelcontextprotocol/server-puppeteer/node_modules/puppeteer-core'));
(async()=>{const b=await pp.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const p=await b.newPage();await p.setViewport({width:1300,height:500});await p.goto('http://127.0.0.1:4902/index.html');await new Promise(r=>setTimeout(r,1500));
for(const id of ['a','b']){const box=await (await p.$('#'+id)).boundingBox();await p.mouse.click(box.x+300,box.y+300);await p.keyboard.press('KeyL');await new Promise(r=>setTimeout(r,800));
const f=p.frames().filter(f=>f.url().includes('frame.html'))[id==='a'?0:1];
console.log(id, await p.$eval('#'+id,e=>e.getAttribute('sandbox')), JSON.stringify(await f.$$eval('#input-diag td',t=>Object.fromEntries(t.map(x=>[x.dataset.diag,x.textContent])))));}
await p.screenshot({path:''+__dirname+'/probe.png'});await b.close();})();
