
const { chromium } = require("playwright");
const { createServer } = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");
(async()=>{
 const base=path.resolve("ip-workbench"),db=new Map(),files=new Map(),errors=[];
 const server=createServer(async(req,res)=>{try{const filename=path.join(base,decodeURIComponent(req.url.split("?")[0]));if(!filename.startsWith(base+path.sep))throw Error("bad path");const data=await fs.readFile(filename.endsWith("/")?filename+"index.html":filename);res.setHeader("Content-Type",filename.includes(".js")?"text/javascript":filename.includes(".css")?"text/css":"text/html");res.end(data)}catch{res.statusCode=404;res.end()}});
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on("pageerror",e=>errors.push(e.message));
 let conflict=false;
 await page.route("https://nitnaxbnovvkikjseevq.supabase.co/functions/v1/ip-workbench-api**",async route=>{
  const req=route.request(),url=new URL(req.url()),r=url.searchParams.get("resource");
  const answer=(body,status=200)=>route.fulfill({status,contentType:"application/json",body:JSON.stringify(body)});
  if(req.method()==="GET"&&r==="records")return answer({records:[...db.values()]});
  if(req.method()==="PUT"&&r==="records"){
   const {record,etag,editor}=req.postDataJSON();
   if(conflict){conflict=false;return answer({error:"这条内容刚被其他成员修改，请刷新后重新编辑"},409)}
   const old=db.get(record.id);if(old&&etag!==old._etag)return answer({error:"更新冲突"},409);
   if(record.kind==="asset"&&!old){record.production.versionGroup=record.production.versionGroup||record.id;const versions=[...db.values()].filter(a=>a.production?.versionGroup===record.production.versionGroup);record.production.version=Math.max(0,...versions.map(a=>a.production.version))+1}
   record._etag=String(Number(old?._etag||0)+1);record.updatedBy=editor;record.updatedAt=new Date().toISOString();db.set(record.id,record);return answer({record});
  }
  if(req.method()==="POST"&&r==="split"){
   const input=req.postDataJSON(),ep=db.get(input.episodeId);
   const created=input.blocks.map((detail,i)=>({id:input.requestId+"-"+(i+1),kind:"shot",title:"镜头 "+String(i+1).padStart(2,"0"),owner:"待认领",platform:"共用",due:"",hours:0,detail,status:"待开始",_etag:"1",production:{episodeId:ep.id,order:i+1,requirements:["分镜图","视频片段"],assetIds:[]}}));
   ep._etag=String(Number(ep._etag)+1);created.forEach(s=>db.set(s.id,s));return answer({records:[ep,...created]});
  }
  if(req.method()==="POST"&&r==="attach"){
   const {shotId,assetId}=req.postDataJSON(),shot=db.get(shotId);shot.production.assetIds=[...new Set([...shot.production.assetIds,assetId])];shot._etag=String(Number(shot._etag)+1);return answer({record:shot});
  }
  if(req.method()==="POST"&&r==="files"){
   const id="test-file-"+files.size;files.set(id,true);return answer({fileId:id,fileName:"storyboard.png"});
  }
  if(req.method()==="GET"&&r==="files")return route.fulfill({status:200,contentType:"image/png",body:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jDPkAAAAASUVORK5CYII=","base64")});
  return answer({error:"Unsupported mocked route"},400);
 });
 const origin="http://127.0.0.1:"+server.address().port;
 async function click(text){await page.getByRole("button",{name:text,exact:true}).click()}
 async function submit(){await page.locator("#submit-button").click();await page.locator("#dialog").waitFor({state:"detached"})}
 async function label(name,value){await page.getByLabel(name,{exact:true}).fill(value)}
 try{
  await page.goto(origin+"/index.html#access=test-only-fixture");
  await page.getByRole("heading",{name:"视频项目",exact:true}).waitFor();
  assert.equal(await page.getByText("PPT",{exact:false}).count(),0);
  await page.locator("#editor").selectOption("陈诗彤");
  await click("新建第一期");await label("视频标题","第一期 · 未说完的话");await label("目标完成日期","2026-12-03");await submit();
  await page.getByRole("heading",{name:"第一期 · 未说完的话",exact:true}).waitFor();
  await page.locator("#script-text").fill("逗号在门口等句号。\n\n句号把没说完的话放进抽屉。");
  await click("保存脚本");
  await page.getByText("脚本已保存",{exact:true}).waitFor();
  await click("按空行拆成分镜 →");await submit();
  assert.equal(await page.locator(".shot-card").count(),2);
  await page.locator(".shot-card").first().locator(".shot-summary").click();
  if(await page.locator(".shot-card.expanded").count()===0)await page.locator(".shot-card").first().locator(".shot-summary").click();
  await click("＋ 上传素材");
  await page.locator("#upload-files").setInputFiles({name:"storyboard.png",mimeType:"image/png",buffer:Buffer.from("test")});
  await page.getByLabel("分类",{exact:true}).selectOption("分镜图");
  await page.getByLabel("状态",{exact:true}).selectOption("已采用");
  await submit();
  assert.equal([...db.values()].filter(r=>r.kind==="asset").length,1);
  assert.equal([...db.values()].find(r=>r.kind==="shot").production.assetIds.length,1);
  await page.getByRole("button",{name:/storyboard.png v1/}).click();
  await label("补充一条意见（可选）","构图确认，接下来生成视频。");await submit();
  assert.equal([...db.values()].filter(r=>r.kind==="comment").length,1);
  await page.getByRole("button",{name:/storyboard.png v1/}).click();
  await click("上传新版本");
  await page.locator("#upload-files").setInputFiles({name:"storyboard-v2.png",mimeType:"image/png",buffer:Buffer.from("test2")});await submit();
  assert.equal(Math.max(...[...db.values()].filter(r=>r.kind==="asset").map(r=>r.production.version)),2);
  await page.getByRole("button",{name:"本期素材",exact:false}).click();
  await page.locator(".asset-card").first().click();
  await click("编辑信息");await label("素材名称","修正版分镜");
  conflict=true;await page.locator("#submit-button").click();await page.getByText("这条内容刚被其他成员修改，请刷新后重新编辑",{exact:true}).waitFor();
  assert.equal(await page.locator('[name="title"]').inputValue(),"修正版分镜");
  await page.locator("[data-close]").first().click();
  await page.getByRole("button",{name:"成片与发布",exact:true}).click();
  await page.locator('[data-publish="抖音"]').click();await label("发布标题","第一期测试");await page.getByLabel("发布状态",{exact:true}).selectOption("已发布");await label("发布日期","2026-11-23");await label("作品链接","https://www.douyin.com/video/example");await submit();
  assert.equal([...db.values()].find(r=>r.kind==="episode").production.publications["抖音"].status,"已发布");
  await page.locator('[data-nav="schedule"]').click();
  await page.getByRole("heading",{name:"制作排期",exact:true}).waitFor();
  await page.locator('[data-nav="reports"]').click();
  await page.locator('[data-report="陈诗彤"]').click();await label("发布数量","3");await label("播放 / 阅读","1234");await label("复盘：有效做法、问题原因、下月动作","下月优化标题与前3秒。");await submit();
  assert.equal([...db.values()].find(r=>r.kind==="report").values.views,1234);
  await page.locator('[data-nav="episodes"]').click();
  await fs.mkdir("ip-workbench/qa-artifacts",{recursive:true});
  await page.screenshot({path:"ip-workbench/qa-artifacts/desktop.png",fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator(".episode-row").first().click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:"ip-workbench/qa-artifacts/mobile.png",fullPage:true});
  assert.deepEqual(errors,[]);
  console.log("PASS: episode creation, script split, shot asset upload/link, comment, versioning, conflict preserves form, publishing, monthly report, mobile overflow and runtime errors.");
 }catch(e){await fs.mkdir("ip-workbench/qa-artifacts",{recursive:true});await page.screenshot({path:"ip-workbench/qa-artifacts/failure.png",fullPage:true});console.error(e);process.exitCode=1}
 finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
})();
