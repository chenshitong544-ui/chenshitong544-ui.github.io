(()=>{

"use strict";
const ENDPOINT="https://nitnaxbnovvkikjseevq.supabase.co/functions/v1/ip-workbench-api";
const PUBLIC_KEY="sb_publishable_FLJV-HijuA6g_tFJ6kCEqg_dMQ5rJGD";
const MEMBERS=["陈诗彤","沈江琴","温馨如"];
const PLATFORMS=["抖音","小红书","B站"];
const CATEGORIES=["角色","场景","道具","分镜图","视频片段","配音","音乐音效","成片","参考资料"];
const EP_STAGES=["脚本准备","素材制作","剪辑中","待发布","已发布"];
const SHOT_STAGES=["待开始","进行中","待审核","已完成"];
const ASSET_STAGES=["备选","待审核","已采用","需修改"];
const root=document.getElementById("root");
const S={rows:[],key:new URLSearchParams(location.hash.slice(1)).get("access")||sessionStorage.getItem("ipwb-team-key")||"",name:localStorage.getItem("ipwb-editor")||"",page:"episodes",eid:"",tab:"script",category:"全部",search:"",owner:"全部成员",month:new Date().toISOString().slice(0,7),dirty:false,loading:true,error:"",sync:"",selectedShot:""};
let modalCtx=null,photoObserver=null;
const blobUrls=new Map();
const el=(q,node=document)=>node.querySelector(q);
const all=(q,node=document)=>[...node.querySelectorAll(q)];
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=>crypto.randomUUID();
const today=()=>new Date().toISOString().slice(0,10);
const p=r=>r.production||{};
const rows=k=>S.rows.filter(r=>r.kind===k&&!r.deleted);
const find=id=>S.rows.find(r=>r.id===id);
const isHttp=s=>{try{return ["http:","https:"].includes(new URL(s).protocol)}catch{return false}};
const activeEp=()=>find(S.eid);
const shots=id=>rows("shot").filter(r=>p(r).episodeId===id).sort((a,b)=>(p(a).order||0)-(p(b).order||0));
const relatedAssets=id=>{const ids=new Set(shots(id).flatMap(s=>p(s).assetIds||[]));return rows("asset").filter(a=>p(a).episodeId===id||ids.has(a.id))};
const newest=list=>list.filter(a=>!list.some(b=>(p(b).versionGroup||b.id)===(p(a).versionGroup||a.id)&&(p(b).version||1)>(p(a).version||1)));
const tag=(s)=>`<span class="tag ${["已发布","已完成","已采用"].includes(s)?"green":["需修改"].includes(s)?"red":["待审核"].includes(s)?"amber":""}">${esc(s)}</span>`;
const btn=(action,text,id="",cls="secondary")=>`<button type="button" class="${cls}" data-action="${action}"${id?` data-id="${esc(id)}"`:""}>${text}</button>`;
const opts=(values,current)=>values.map(v=>`<option${v===current?" selected":""}>${esc(v)}</option>`).join("");
const field=(label,name,value="",type="text",extra="")=>`<label>${label}<input name="${name}" aria-label="${esc(label)}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const select=(label,name,values,value)=>`<label>${label}<select name="${name}" aria-label="${esc(label)}">${opts(values,value)}</select></label>`;
const textField=(label,name,value="",extra="")=>`<label>${label}<textarea name="${name}" aria-label="${esc(label)}" ${extra}>${esc(value)}</textarea></label>`;
const empty=(title,desc,action="")=>`<div class="empty"><span class="empty-symbol">＋</span><h3>${title}</h3><p>${desc}</p>${action}</div>`;
function record(kind,title,extra={}){return {id:uid(),kind,title,owner:"待认领",platform:"共用",status:"待开始",due:"",hours:0,detail:"",_etag:"seed",...extra}}
function requireEditor(){if(!MEMBERS.includes(S.name)){el("#editor").focus();throw Error("请先在右上角选择你的名字，方便组员了解修改情况。")}}
async function api(resource,method="GET",data,raw=false){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
 try{
  const h={apikey:PUBLIC_KEY,Authorization:"Bearer "+S.key};
  if(data&&!(data instanceof FormData))h["Content-Type"]="application/json";
  const response=await fetch(ENDPOINT+"?resource="+resource,{method,headers:h,body:data instanceof FormData?data:data?JSON.stringify(data):undefined,signal:controller.signal,cache:"no-store"});
  if(!response.ok){let j={};try{j=await response.json()}catch{};const e=Error(j.error||"共享服务暂不可用，请稍后重试");e.status=response.status;throw e}
  return raw?await response.blob():await response.json();
 }catch(e){if(e.name==="AbortError")throw Error("连接超时，请重试；当前填写内容仍保留。");throw e}finally{clearTimeout(timer)}
}
function merge(items){for(const r of items){const i=S.rows.findIndex(x=>x.id===r.id);if(i<0)S.rows.push(r);else S.rows[i]=r}S.sync=new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})}
async function save(r){requireEditor();const j=await api("records","PUT",{record:r,etag:r._etag||"seed",editor:S.name});merge([j.record]);return j.record}
async function attach(shotId,assetId){const j=await api("attach","POST",{shotId,assetId,editor:S.name});merge([j.record])}
async function refresh(initial=false){
 if(!S.key){S.loading=false;render();return}
 try{
  const j=await api("records");const changed=JSON.stringify(j.records)!==JSON.stringify(S.rows);
  S.rows=j.records;S.loading=false;S.error="";S.sync=new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"});
  if(initial||changed)render();else{const t=el("#sync");if(t)t.textContent="已同步 "+S.sync}
 }catch(e){S.loading=false;S.error=e.message;if(initial||e.status===401){if(e.status===401)S.key="";render()}else toast(e.message,true)}
}
function toast(message,error=false){let n=el("#toast");if(!n){n=document.createElement("div");n.id="toast";document.body.append(n)}n.className=error?"error":"";n.textContent=message;clearTimeout(toast.timer);toast.timer=setTimeout(()=>n.remove(),5000)}
function leave(){return !S.dirty||confirm("脚本还没有保存。确定离开并放弃本次修改吗？")}
function navigate(page,eid=""){if(!leave())return;S.dirty=false;S.page=page;S.eid=eid;S.tab="script";S.category="全部";S.search="";S.selectedShot="";render();window.scrollTo(0,0)}
function showDialog(title,body,onSubmit,wide=false){
 closeDialog();const d=document.createElement("dialog");d.id="dialog";d.className=wide?"wide":"";
 d.innerHTML=`<form id="modal-form"><div class="dialog-heading"><h2>${esc(title)}</h2><button type="button" class="icon-button" data-close aria-label="关闭">×</button></div><div class="dialog-body">${body}<p id="form-error" class="form-error" role="alert"></p></div><div class="dialog-footer"><button type="button" class="secondary" data-close>取消</button>${onSubmit?'<button type="submit" class="primary" id="submit-button">保存</button>':""}</div></form>`;
 document.body.append(d);d.showModal();all("[data-close]",d).forEach(b=>b.onclick=()=>closeDialog());
 d.addEventListener("cancel",e=>{e.preventDefault();closeDialog()});
 if(onSubmit)el("form",d).onsubmit=async e=>{
  e.preventDefault();el("#form-error",d).textContent="";const b=el("#submit-button",d);b.disabled=true;b.textContent="保存中…";
  try{await onSubmit(new FormData(e.target),e.target);closeDialog();render();toast("已保存，组员打开同一链接即可看到")}catch(err){el("#form-error",d).textContent=err.message;b.disabled=false;b.textContent="重试保存"}
 };
 return d;
}
function closeDialog(){const d=el("#dialog");if(d){d.close();d.remove()}modalCtx=null}
function preview(r,cls=""){
 const f=(r.fileName||r.url||"").split("?")[0].toLowerCase();
 const isImage=/\.(png|jpe?g|gif|webp)$/.test(f);
 return `<div class="preview ${cls}">${r.fileId&&isImage?`<img data-file="${esc(r.fileId)}" alt="${esc(r.title)}" loading="lazy">`:`<span class="file-glyph">${/\.(mp4|mov|webm)$/.test(f)?"▷":/\.(mp3|wav|m4a|ogg)$/.test(f)?"♫":r.category==="角色"?"◉":r.category==="场景"?"▧":"▤"}</span><span class="file-type">${esc(r.category||"文件")}</span>`}</div>`;
}
function mountPreviews(){
 if(photoObserver)photoObserver.disconnect();
 photoObserver=new IntersectionObserver(entries=>entries.forEach(async entry=>{
  if(!entry.isIntersecting)return;const img=entry.target;photoObserver.unobserve(img);
  try{
   const id=img.dataset.file;
   if(!blobUrls.has(id)){const blob=await api("files&id="+encodeURIComponent(id),"GET",undefined,true);blobUrls.set(id,URL.createObjectURL(blob))}
   if(img.isConnected)img.src=blobUrls.get(id);
  }catch{img.replaceWith(Object.assign(document.createElement("span"),{className:"muted",textContent:"预览加载失败，可点击重试"}))}
 }),{rootMargin:"100px"});
 all("img[data-file]").forEach(img=>photoObserver.observe(img));
}
function releaseUnused(){const used=new Set(all("[data-file]").map(x=>x.dataset.file));if(blobUrls.size>20)for(const [id,url]of blobUrls){if(!used.has(id)){URL.revokeObjectURL(url);blobUrls.delete(id)}}}
function missing(s){const assets=(p(s).assetIds||[]).map(find).filter(Boolean);return (p(s).requirements||[]).filter(c=>!assets.some(a=>a.category===c&&a.status==="已采用"))}
function header(kicker,title,desc,actions=""){return `<header class="page-heading"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${desc}</p></div><div class="heading-actions">${actions}</div></header>`}
function render(){
 if(!S.key){root.innerHTML=`<main class="access"><div class="brand-mark">，。</div><h1>人类未完结事务所</h1><p>视频制作与账号运营，放在一个地方。</p><form id="access-form">${field("粘贴组内共享链接或访问码","key","","text",'required autocomplete="off"')}<button class="primary">进入工作台</button></form><p class="muted">${esc(S.error||"请使用组内的完整共享链接，无需注册或登录。")}</p></main>`;el("#access-form").onsubmit=e=>{e.preventDefault();const v=new FormData(e.target).get("key");let key=v;try{key=new URLSearchParams(new URL(v).hash.slice(1)).get("access")||v}catch{}S.key=String(key).trim();sessionStorage.setItem("ipwb-team-key",S.key);history.replaceState(null,"","#access="+encodeURIComponent(S.key));refresh(true)};return}
 sessionStorage.setItem("ipwb-team-key",S.key);
 const menu=[["episodes","▣","视频项目"],["assets","▧","共用资产"],["schedule","▦","制作排期"],["reports","◴","运营月报"],["docs","▤","项目资料"]];
 root.innerHTML=`<div class="app"><aside class="sidebar"><a class="brand" href="#" data-action="home"><span class="brand-mark">，。</span><span>人类未完结<br><b>事务所</b></span></a><span class="nav-caption">一起把故事做完</span><nav>${menu.map(([id,i,t],index)=>`${index===3?'<span class="nav-caption secondary-caption">运营与归档</span>':""}<button class="nav-item ${S.page===id?"active":""}" data-nav="${id}"><span>${i}</span>${t}</button>`).join("")}</nav><div class="sidebar-note"><span class="dot"></span>三个人 · 一个创作空间<p>按期推进，素材各就各位。</p></div></aside><div class="main-wrap"><div class="topbar"><span class="breadcrumb">IP 视频工作台 <span>/</span> ${esc(menu.find(a=>a[0]===S.page)?.[2]||"视频项目")}</span><div class="top-actions"><span id="sync" class="sync">${S.loading?"正在连接…":"已同步 "+S.sync}</span><button class="text-button" data-action="share">共享链接</button><label class="editor-label"><span class="sr-only">当前编辑人</span><select id="editor"><option value="">选择你的名字</option>${opts(MEMBERS,S.name)}</select></label></div></div><main id="content">${S.loading?'<div class="empty"><h2>正在打开团队工作台…</h2></div>':S.error?`<div class="notice">${esc(S.error)} ${btn("refresh","重试")}</div>`:""}${!S.loading&&!S.error?(S.page==="episodes"?(S.eid&&activeEp()?episodePage():episodesPage()):S.page==="assets"?assetsPage():S.page==="schedule"?schedulePage():S.page==="reports"?reportsPage():docsPage()):""}</main></div></div>`;
 el("#editor").onchange=e=>{S.name=e.target.value;localStorage.setItem("ipwb-editor",S.name);toast(S.name?"当前编辑人："+S.name:"请选择名字后再编辑")};
 bindPage();mountPreviews();releaseUnused();
}


function episodesPage(){
 const list=rows("episode").sort((a,b)=>(p(a).number||0)-(p(b).number||0));
 return header("VIDEO PROJECTS","视频项目","从一期视频开始。脚本、镜头、素材和成片，都在这一期里。",btn("new-episode","＋ 新建一期","","primary"))+
 `<div class="workflow-guide"><strong>每期这样推进</strong><span><b>1</b> 整理脚本</span><i>→</i><span><b>2</b> 拆解镜头</span><i>→</i><span><b>3</b> 准备素材</span><i>→</i><span><b>4</b> 剪辑发布</span></div>`+
 (!list.length?empty("先建立你们的第一期视频","不必一次填完。先起一个标题，再把现有脚本放进来。",btn("new-episode","新建第一期","","primary")):
 `<div class="section-heading"><h2>全部期数 <span>${list.length}</span></h2><p>打开一期，继续当前的制作。</p></div><div class="episode-list"><div class="episode-table-head"><span>本期视频</span><span>当前环节</span><span>负责人 / 截止日期</span><span>下一步</span></div>${list.map(r=>{
  const ss=shots(r.id),aa=relatedAssets(r.id),miss=ss.filter(s=>missing(s).length).length,done=ss.filter(s=>s.status==="已完成").length;
  const next=!p(r).script?"放入本期脚本":!ss.length?"把脚本拆成镜头":miss?`${miss} 个镜头待补素材`:r.status==="已发布"?"查看发布记录":"继续剪辑与发布";
  return `<button class="episode-row" data-action="open-episode" data-id="${esc(r.id)}"><div class="episode-name"><span class="episode-number">${String(p(r).number||0).padStart(2,"0")}</span><div><h3>${esc(r.title)}</h3><p>${ss.length?`${done} / ${ss.length} 个镜头完成 · ${aa.length} 份素材`:"尚未拆解镜头"}</p></div></div><div>${tag(r.status)}</div><div class="owner-date">${esc(r.owner)}<span>${esc(r.due||"日期待定")}</span></div><div class="next-step">${esc(next)} <span>↗</span></div></button>`;
 }).join("")}</div>`);
}
function episodePage(){
 const r=activeEp(),ss=shots(r.id),missingCount=ss.reduce((sum,s)=>sum+missing(s).length,0);
 return `<div class="back-row">${btn("home","← 全部视频","","text-button")}${btn("edit-episode","本期设置",r.id,"text-button")}</div>`+
 header(`EPISODE ${String(p(r).number||0).padStart(2,"0")}`,esc(r.title),`${esc(r.owner)} · ${esc(r.due||"日期待定")}`,tag(r.status))+
 `<div class="tabs">${[["script","脚本与分镜"],["assets","本期素材"],["publish","成片与发布"]].map(([id,t])=>`<button class="${S.tab===id?"selected":""}" data-tab="${id}">${t}${id==="assets"?`<span>${relatedAssets(r.id).length}</span>`:""}</button>`).join("")}</div>`+
 (S.tab==="assets"?assetSection(relatedAssets(r.id),false):
 S.tab==="publish"?publishSection(r):
 `<div class="production-layout"><section class="script-panel panel"><div class="panel-heading"><div><h2>本期脚本</h2><p>先放原文，再逐镜头对照。</p></div><label class="import-button">导入文本<input id="script-import" type="file" accept=".txt,.md" hidden></label></div><textarea id="script-text" aria-label="本期脚本" placeholder="把这一期的脚本粘贴到这里。建议每个镜头之间空一行，方便按段落拆解。">${esc(p(r).script||"")}</textarea><div class="script-footer"><span id="script-state" class="muted">支持粘贴 Word 文字或导入 TXT / Markdown</span>${btn("save-script","保存脚本","","primary")}</div><button type="button" class="split-button" data-action="split-script"${ss.length?" disabled":""}>按空行拆成分镜 <span>→</span></button><p class="hint">${ss.length?"已有分镜。修改脚本后，请在右侧调整对应镜头。":"拆分前会预览段落，不会改写原文。"}</p></section><section class="shots-panel"><div class="section-heading"><div><h2>分镜清单 <span>${ss.length}</span></h2><p>${ss.length?`${missingCount} 项素材待补齐 · 采用素材后自动更新`:"每个镜头对应需要的画面、声音和文件"}</p></div>${btn("new-shot","＋ 添加镜头",r.id)}</div>${!ss.length?empty("脚本有了，就开始拆镜头","左侧按空行拆分，或手动添加一个镜头。",btn("new-shot","手动添加镜头",r.id)):
 ss.map((s,i)=>{
  const open=S.selectedShot===s.id,aa=(p(s).assetIds||[]).map(find).filter(a=>a&&!a.deleted),miss=missing(s);
  return `<article class="shot-card ${open?"expanded":""}"><button class="shot-summary" data-action="toggle-shot" data-id="${esc(s.id)}"><span class="shot-number">${String(i+1).padStart(2,"0")}</span><div><h3>${esc(s.title)}</h3><p>${esc(s.owner)}${p(s).duration?` · ${p(s).duration} 秒`:""} · ${miss.length?`缺 ${miss.join("、")}`:aa.length?"素材已齐":"未设置素材需求"}</p></div>${tag(s.status)}<span class="chevron">${open?"−":"＋"}</span></button>${open?`<div class="shot-detail"><p class="script-excerpt">${esc(s.detail||"尚未填写镜头内容")}</p>${p(s).characters||p(s).scene?`<div class="shot-info"><span>角色：${esc(p(s).characters||"未填")}</span><span>场景：${esc(p(s).scene||"未填")}</span></div>`:""}<div class="requirements">${(p(s).requirements||[]).map(c=>`<span class="${miss.includes(c)?"missing":"ready"}">${miss.includes(c)?"○":"✓"} ${esc(c)}</span>`).join("")}</div><div class="linked-assets">${aa.map(a=>`<div class="linked-wrap"><button data-action="asset-detail" data-id="${esc(a.id)}" class="linked-asset">${preview(a)}<span>${esc(a.title)} <small>v${p(a).version||1}</small></span>${tag(a.status)}</button><button type="button" class="unlink-button" data-action="unlink-asset" data-id="${esc(s.id)}|${esc(a.id)}" aria-label="移除关联：${esc(a.title)}">移除关联</button></div>`).join("")}</div>${p(s).review?`<div class="review-note">修改意见：${esc(p(s).review)}</div>`:""}<div class="shot-actions">${btn("link-asset","关联已有素材",s.id)}${btn("upload-shot","＋ 上传素材",s.id,"primary")}${btn("edit-shot","编辑镜头",s.id,"text-button")}</div></div>`:""}</article>`;
 }).join("")}</section></div>`);
}
function assetsPage(){
 return header("SHARED LIBRARY","共用资产","角色设定、固定场景和可复用素材，统一收在这里。",btn("upload-common","＋ 添加资产","","primary"))+
 assetSection(rows("asset").filter(a=>!p(a).episodeId),true);
}
function assetSection(list,common){
 const latest=newest(list),filtered=latest.filter(a=>(S.category==="全部"||a.category===S.category)&&(!S.search||(a.title+" "+a.detail+" "+a.fileName).toLowerCase().includes(S.search.toLowerCase())));
 return `<div class="asset-toolbar"><div class="category-filter">${["全部",...CATEGORIES].map(c=>`<button class="${S.category===c?"selected":""}" data-category="${c}">${c}</button>`).join("")}</div><div class="asset-tools"><input id="asset-search" aria-label="搜索素材" placeholder="搜索文件、名称或备注" value="${esc(S.search)}">${!common?btn("upload-episode","＋ 上传本期素材","","primary"):""}</div></div><div class="result-meta">${filtered.length} 项资产 <span>仅展示最新版本 · 打开素材可查看历史</span></div>`+
 (!filtered.length?empty(latest.length?"没有符合条件的素材":common?"把常用的角色和场景放进来":"这一期的素材，从这里集中管理",latest.length?"换个分类或搜索词试试。":"支持图片、视频、音频、文件，也可以保存网盘链接。",btn(common?"upload-common":"upload-episode","添加素材","","primary")):
 `<div class="asset-grid">${filtered.map(a=>`<button class="asset-card" data-action="asset-detail" data-id="${esc(a.id)}">${preview(a)}<div class="asset-card-body"><div class="asset-title"><h3>${esc(a.title)}</h3><span>v${p(a).version||1}</span></div><div class="asset-meta">${tag(a.status)}<span>${esc(a.owner)}</span></div></div></button>`).join("")}</div>`);
}
function publishSection(r){
 const finals=newest(relatedAssets(r.id).filter(a=>a.category==="成片"));
 return `<div class="section-heading"><div><h2>本期成片</h2><p>定稿前保留版本，发布后补上链接。</p></div>${btn("upload-final","＋ 上传成片","","primary")}</div><div class="final-grid">${finals.length?finals.map(a=>`<button class="asset-card" data-action="asset-detail" data-id="${esc(a.id)}">${preview(a)}<div class="asset-card-body"><h3>${esc(a.title)}</h3>${tag(a.status)} <small>v${p(a).version||1}</small></div></button>`).join(""):'<p class="muted">还没有上传成片。</p>'}</div><div class="section-heading"><h2>平台发布记录</h2></div><div class="publication-grid">${PLATFORMS.map((platform,i)=>{const v=(p(r).publications||{})[platform]||{};return `<article class="panel publication"><span class="platform-icon p${i}">${platform[0]}</span><h3>${platform}</h3><p>${MEMBERS[i]}</p>${tag(v.status||"待发布")}<div class="pub-title">${esc(v.title||"尚未填写发布标题")}</div><p>${esc(v.date||"发布时间待定")}</p>${isHttp(v.url)?`<a href="${esc(v.url)}" target="_blank" rel="noopener noreferrer">查看发布作品 ↗</a>`:""}<button class="secondary" data-publish="${platform}">编辑发布记录</button></article>`}).join("")}</div>`;
}
function schedulePage(){
 const list=[...rows("episode"),...rows("shot")].filter(r=>S.owner==="全部成员"||r.owner===S.owner).sort((a,b)=>(a.due||"9999").localeCompare(b.due||"9999"));
 return header("PRODUCTION SCHEDULE","制作排期","只看制作任务、负责人和下一次交付。")+`<div class="schedule-toolbar"><select id="owner-filter" aria-label="筛选负责人">${opts(["全部成员",...MEMBERS,"待认领"],S.owner)}</select><span class="muted">负责人和日期可在本期设置、镜头编辑中调整。</span></div>`+
 (list.length?`<div class="schedule-list">${list.map(r=>`<div class="schedule-row"><div class="due ${r.due&&r.due<today()&&!["已发布","已完成"].includes(r.status)?"late":""}">${esc(r.due||"待排期")}</div><div><button class="title-button" data-action="open-episode" data-id="${esc(r.kind==="episode"?r.id:p(r).episodeId)}">${esc(r.title)}</button><p>${r.kind==="episode"?"整期视频":esc(find(p(r).episodeId)?.title||"镜头")}</p></div><span>${esc(r.owner)}</span>${tag(r.status)}</div>`).join("")}</div>`:empty("还没有制作排期","新建一期视频，或为镜头设置负责人和截止日期。",btn("home","前往视频项目","","primary")));
}
function reportsPage(){
 const reportRows=rows("report").filter(r=>r.month===S.month);
 return header("ACCOUNT REPORTS","运营月报","每人记录自己平台的结果，以及下个月准备怎么调整。")+`<div class="month-picker">${field("选择月份","month",S.month,"month",'id="report-month"')}</div><div class="report-grid">${MEMBERS.map((m,i)=>{const r=reportRows.find(r=>r.owner===m),v=r?.values||{};return `<article class="panel report-card"><div class="report-person"><span class="avatar">${m.slice(-2)}</span><div><h2>${m}</h2><p>${PLATFORMS[i]}</p></div></div><dl class="metrics">${[["发布","posts"],["播放 / 阅读","views"],["互动","engagements"],["新增粉丝","followers"]].map(([t,k])=>`<div><dt>${t}</dt><dd>${v[k]===undefined||v[k]===null?"—":Number(v[k]).toLocaleString("zh-CN")}</dd></div>`).join("")}</dl><p class="report-text">${esc(r?.detail||"还没有填写本月复盘。记录表现、原因和下月动作即可。")}</p><button class="secondary" data-report="${m}">${r?"编辑月报":"填写月报"}</button></article>`}).join("")}</div><p class="hint">不同平台的数据口径不同，月报用于各自纵向复盘，不直接按播放量给成员排名。</p>`;
}
function docsPage(){
 const docs=rows("resource"),notes=rows("note").filter(r=>!(/ppt/i.test(r.title))),old=S.rows.filter(r=>["task","plan","decision","monthplan","content"].includes(r.kind)&&!r.deleted&&!(/ppt/i.test(r.title)));
 return header("PROJECT ARCHIVE","项目资料","开题报告、调研、参考案例和项目共识，集中归档。",btn("new-doc","＋ 添加资料","","primary"))+
 `<div class="document-list">${[...docs,...notes].map(r=>`<article class="document-row"><span class="doc-icon">▤</span><div><h3>${esc(r.title)}</h3><p>${esc(r.category||"项目资料")} · ${esc(r.updatedBy||r.owner||"团队")}</p></div>${r.fileId?btn("download","下载",r.id):isHttp(r.url)?`<a class="secondary" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">打开 ↗</a>`:""}${btn("edit-doc","查看 / 编辑",r.id,"text-button")}</article>`).join("")||empty("把项目资料收在一起","报告、文献、参考链接和会议结论，都可以放进来。")}</div>${old.length?`<details class="legacy"><summary>早期项目记录 · ${old.length} 项</summary><p class="hint">保留原有记录供查阅，当前制作工作从“视频项目”进入。</p>${old.map(r=>`<button class="legacy-item" data-action="edit-doc" data-id="${esc(r.id)}">${esc(r.title)}<span>${esc(r.owner)} · ${esc(r.due||"未排期")}</span></button>`).join("")}</details>`:""}`;
}


function editEpisode(id){
 requireEditor();const r=id?find(id):record("episode","",{status:EP_STAGES[0],owner:S.name,production:{number:Math.max(0,...rows("episode").map(e=>p(e).number||0))+1}});
 showDialog(id?"本期设置":"新建一期视频",`<div class="form-grid">${field("第几期","number",p(r).number||1,"number",'min="1" max="9999" required')}${select("负责人","owner",["待认领",...MEMBERS],r.owner)}${field("视频标题","title",r.title,"text",'required maxlength="200" class="span2"')}${select("当前环节","status",EP_STAGES,r.status)}${field("目标完成日期","due",r.due,"date")}</div>${textField("本期想解决什么 / 简要备注","detail",r.detail,'maxlength="30000"')}`,async fd=>{
 const saved=await save({...r,title:fd.get("title"),owner:fd.get("owner"),status:fd.get("status"),due:fd.get("due"),detail:fd.get("detail"),production:{...p(r),number:Number(fd.get("number"))}});
 if(!id){S.eid=saved.id;S.page="episodes";S.tab="script"}
 });
}
function editShot(id){
 requireEditor();const r=id?find(id):record("shot","",{production:{episodeId:S.eid,order:shots(S.eid).length+1,requirements:["分镜图","视频片段"],assetIds:[]}});
 showDialog(id?"编辑镜头":"添加镜头",`<div class="form-grid">${field("镜头序号","order",p(r).order||1,"number",'min="1" required')}${field("镜头名称","title",r.title,"text",'required maxlength="200"')}${select("负责人","owner",["待认领",...MEMBERS],r.owner)}${select("进度","status",SHOT_STAGES,r.status)}${field("预计时长（秒）","duration",p(r).duration||"","number",'min="0" max="100000"')}${field("交付日期","due",r.due,"date")}</div>${textField("对应脚本 / 镜头内容","detail",r.detail,'required maxlength="30000"')}<div class="form-grid">${field("出场角色","characters",p(r).characters)}${field("场景","scene",p(r).scene)}</div><fieldset><legend>这个镜头需要什么素材？</legend><div class="check-grid">${CATEGORIES.filter(c=>!["成片","参考资料"].includes(c)).map(c=>`<label class="checkbox"><input type="checkbox" name="requirements" value="${c}" ${(p(r).requirements||[]).includes(c)?"checked":""}>${c}</label>`).join("")}</div></fieldset>${textField("修改意见 / 待解决问题","review",p(r).review)}`,async fd=>{
 const saved=await save({...r,title:fd.get("title"),owner:fd.get("owner"),status:fd.get("status"),due:fd.get("due"),detail:fd.get("detail"),production:{...p(r),order:Number(fd.get("order")),duration:Number(fd.get("duration")||0),characters:fd.get("characters"),scene:fd.get("scene"),requirements:fd.getAll("requirements"),review:fd.get("review")}});
 S.selectedShot=saved.id;
 },true);
}
async function saveScript(){
 requireEditor();const r=activeEp(),value=el("#script-text").value;
 if(value.length>80000)throw Error("脚本请控制在 8 万字以内。");
 const button=el('[data-action="save-script"]');button.disabled=true;
 try{await save({...r,production:{...p(r),script:value}});S.dirty=false;render();toast("脚本已保存")}finally{if(button.isConnected)button.disabled=false}
}
function splitScript(){
 requireEditor();const r=activeEp();if(S.dirty)throw Error("请先保存左侧脚本，再建立分镜。");
 const blocks=(p(r).script||"").trim().split(/\n\s*\n/).filter(Boolean);
 if(!blocks.length)throw Error("先把本期脚本放到左侧并保存。");
 if(blocks.length>200)throw Error("单次最多拆分 200 个镜头，请先整理脚本段落。");
 showDialog(`确认拆成 ${blocks.length} 个镜头`,`<p class="hint">按空行拆分，每段原文进入一个镜头。可取消后调整脚本。</p><div class="split-preview">${blocks.map((s,i)=>`<article><b>镜头 ${String(i+1).padStart(2,"0")}</b><p>${esc(s)}</p></article>`).join("")}</div>`,async()=>{
 const j=await api("split","POST",{episodeId:r.id,revision:Number(r._etag),blocks,editor:S.name,requestId:uid()});merge(j.records);S.selectedShot=j.records.find(x=>x.kind==="shot")?.id||"";
 },true);
}
function linkAsset(shotId){
 requireEditor();const shot=find(shotId),available=newest(rows("asset").filter(a=>!p(a).episodeId||p(a).episodeId===p(shot).episodeId)).filter(a=>!(p(shot).assetIds||[]).includes(a.id));
 if(!available.length){toast("还没有可关联的素材，可先上传共用资产或本期素材。");return}
 showDialog("为镜头关联素材",`<p class="hint">可复用共用资产。关联后，标记“已采用”的素材会计入需求完成情况。</p><div class="asset-picker">${available.map(a=>`<label class="asset-pick"><input type="checkbox" name="asset" value="${esc(a.id)}"><span><strong>${esc(a.title)}</strong><small>${esc(a.category)} · v${p(a).version||1} · ${esc(a.status)}</small></span></label>`).join("")}</div>`,async fd=>{for(const id of fd.getAll("asset"))await attach(shotId,id)});
}
function uploadAssets({episodeId="",shotId="",version=null,category="参考资料"}={}){
 requireEditor();const jobs=new Map(),uploads=new Map(),requestIds=new Map();
 const d=showDialog(version?"上传新版本":"添加素材",`<div class="upload-drop"><span class="upload-icon">↑</span><strong>${version?"选择一个文件作为新版本":"选择文件，可一次上传多个"}</strong><p>图片 / 视频 / 音频 / 文档，每个不超过 20MB</p><input id="upload-files" aria-label="上传素材文件" name="files" type="file" ${version?"":"multiple"} accept=".png,.jpg,.jpeg,.gif,.webp,.mp4,.mov,.webm,.mp3,.wav,.m4a,.ogg,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.md,.csv"></div><div class="or-line">或者保存网盘 / 素材链接</div>${field("链接（有文件时可留空）","url",version?"":undefined,"url",'placeholder="https://"')}${field("素材名称（多文件默认用文件名）","title",version?.title||"","text",'maxlength="200"')}<div class="form-grid">${select("分类","category",CATEGORIES,version?.category||category)}${select("状态","status",ASSET_STAGES,"待审核")}${select("负责人","owner",["待认领",...MEMBERS],S.name)}</div>${textField("素材说明 / 使用位置","detail",version?.detail||"",'maxlength="30000"')}${textField("生成提示词 / 参数（可选）","prompt",p(version||{}).prompt||"",'maxlength="10000"')}<p id="upload-progress" class="hint" aria-live="polite"></p>`,async(fd,form)=>{
 const files=all("#upload-files",form)[0].files;
 if(!files.length&&!fd.get("url"))throw Error("请选择文件，或填写素材链接。");
 if(version&&files.length>1)throw Error("每次为一个素材上传一个新版本。");
 if(files.length>30)throw Error("每次最多 30 个文件，请分批上传。");
 if([...files].some(f=>f.size>20*1024*1024))throw Error("有文件超过 20MB。大文件可改为保存网盘链接。");
 const source=files.length?[...files]:[null];
 for(let i=0;i<source.length;i++){
  const f=source[i],job=f?`${f.name}-${f.size}-${f.lastModified}`:"link";
  el("#upload-progress",form).textContent=`正在处理 ${i+1} / ${source.length}，请保持页面打开…`;
  if(!jobs.has(job)){
   let uploaded={};
   if(f){if(uploads.has(job))uploaded=uploads.get(job);else{const data=new FormData();data.append("file",f);uploaded=await api("files","POST",data);uploads.set(job,uploaded)}}
   if(!requestIds.has(job))requestIds.set(job,uid());
   const r=record("asset",source.length>1?f.name:(fd.get("title")||f?.name||"链接素材"),{id:requestIds.get(job),owner:fd.get("owner"),status:fd.get("status"),category:fd.get("category"),detail:fd.get("detail"),url:String(fd.get("url")||""),...uploaded,production:{episodeId:version?p(version).episodeId||"":episodeId,prompt:fd.get("prompt"),...(version?{versionGroup:p(version).versionGroup||version.id}:{})}});
   jobs.set(job,await save(r));
  }
  if(shotId)await attach(shotId,jobs.get(job).id);
 }
 });
 const drop=el(".upload-drop",d);
 drop.ondragover=e=>{e.preventDefault();drop.classList.add("dragover")};
 drop.ondragleave=()=>drop.classList.remove("dragover");
 drop.ondrop=e=>{e.preventDefault();drop.classList.remove("dragover");el("#upload-files",d).files=e.dataTransfer.files};
}
async function download(id){
 const r=find(id);if(!r?.fileId)throw Error("这条资料没有附件。");
 const blob=await api("files&id="+encodeURIComponent(r.fileId),"GET",undefined,true),url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download=r.fileName||r.title;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
}
async function assetDetail(id){
 const r=find(id);if(!r)return;
 const versions=rows("asset").filter(a=>(p(a).versionGroup||a.id)===(p(r).versionGroup||r.id)).sort((a,b)=>(p(b).version||1)-(p(a).version||1));
 const comments=rows("comment").filter(c=>p(c).targetId===id).sort((a,b)=>(a.updatedAt||"").localeCompare(b.updatedAt||""));
 const d=showDialog(r.title,`<div id="media-view" class="media-view">${r.fileId?"正在加载预览…":isHttp(r.url)?`<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">打开素材链接 ↗</a>`:"此素材暂无文件。"}</div><div class="detail-toolbar">${tag(r.status)}<span>v${p(r).version||1} · ${esc(r.category)} · ${esc(r.owner)}</span>${r.fileId?btn("download","下载原文件",r.id):""}${btn("new-version","上传新版本",r.id)}${btn("edit-asset","编辑信息",r.id,"text-button")}</div><p class="pre-line">${esc(r.detail)}</p>${p(r).prompt?`<details><summary>生成提示词 / 参数</summary><p class="pre-line">${esc(p(r).prompt)}</p></details>`:""}<div class="version-strip"><strong>历史版本</strong>${versions.map(a=>`<button type="button" class="${a.id===id?"current":""}" data-action="asset-detail" data-id="${esc(a.id)}">v${p(a).version||1} ${a.id===id?"· 当前":""}</button>`).join("")}</div><div class="review-thread"><h3>修改与讨论</h3>${comments.map(c=>`<article><strong>${esc(c.owner)}</strong><time>${esc((c.updatedAt||"").slice(0,16).replace("T"," "))}</time><p>${esc(c.detail)}</p></article>`).join("")||'<p class="muted">需要修改哪里？写在这里，组员可以继续跟进。</p>'}</div>${textField("补充一条意见（可选）","comment","","maxlength=30000")}`,async fd=>{
 const detail=String(fd.get("comment")||"").trim();if(!detail)throw Error("先写下意见再保存。");await save(record("comment","素材讨论",{owner:S.name,detail,production:{targetId:id},status:"已完成"}));
 },true);
 bindDialogActions(d);
 if(r.fileId){
 try{
  const blob=await api("files&id="+encodeURIComponent(r.fileId),"GET",undefined,true);
  if(!d.isConnected)return;
  const url=URL.createObjectURL(blob);d.addEventListener("close",()=>URL.revokeObjectURL(url),{once:true});
  const target=el("#media-view",d);target.textContent="";let media;
  if(blob.type.startsWith("image/")){media=document.createElement("img");media.alt=r.title}
  else if(blob.type.startsWith("video/")){media=document.createElement("video");media.controls=true;media.preload="metadata"}
  else if(blob.type.startsWith("audio/")){media=document.createElement("audio");media.controls=true;media.preload="metadata"}
  if(media){media.src=url;target.append(media)}else target.textContent="此类文件请下载后打开。";
 }catch(e){if(d.isConnected)el("#media-view",d).textContent=e.message}
 }
}
function editAsset(id){
 requireEditor();const r=find(id);
 showDialog("编辑素材信息",`${field("素材名称","title",r.title,"text",'required maxlength="200"')}<div class="form-grid">${select("分类","category",CATEGORIES,r.category)}${select("状态","status",ASSET_STAGES,r.status)}${select("负责人","owner",["待认领",...MEMBERS],r.owner)}</div>${textField("素材说明","detail",r.detail,'maxlength="30000"')}${textField("生成提示词 / 参数","prompt",p(r).prompt||"",'maxlength="10000"')}`,async fd=>{await save({...r,title:fd.get("title"),category:fd.get("category"),status:fd.get("status"),owner:fd.get("owner"),detail:fd.get("detail"),production:{...p(r),prompt:fd.get("prompt")}})});
}
function editPublication(platform){
 requireEditor();const r=activeEp(),v=(p(r).publications||{})[platform]||{};
 showDialog(platform+"发布记录",`${field("发布标题","title",v.title,"text",'maxlength="2000"')}<div class="form-grid">${select("发布状态","status",["待发布","已发布"],v.status||"待发布")}${field("发布日期","date",v.date,"date")}</div>${field("作品链接","url",v.url,"url",'maxlength="2000"')}`,async fd=>{await save({...r,production:{...p(r),publications:{...(p(r).publications||{}),[platform]:Object.fromEntries(fd)}}})});
}
function editReport(owner){
 requireEditor();const i=MEMBERS.indexOf(owner),r=rows("report").find(r=>r.owner===owner&&r.month===S.month)||record("report",`${S.month} ${owner}运营月报`,{owner,month:S.month,platform:PLATFORMS[i]});
 showDialog(`${owner} · ${S.month} 月报`,`<div class="form-grid">${[["发布数量","posts"],["播放 / 阅读","views"],["互动总数","engagements"],["新增粉丝","followers"]].map(([t,k])=>field(t,k,r.values?.[k]??"","number",'min="0"')).join("")}</div>${textField("复盘：有效做法、问题原因、下月动作","detail",r.detail,'maxlength="30000" placeholder="1. 本月什么内容表现较好？\\n2. 有什么原因或发现？\\n3. 下个月具体怎么调整？"')}`,async fd=>{const values={...r.values};for(const k of ["posts","views","engagements","followers"])values[k]=fd.get(k)===""?null:Number(fd.get(k));await save({...r,detail:fd.get("detail"),values,status:"已完成"})});
}
function editDoc(id){
 requireEditor();const r=id?find(id):record("resource","",{owner:S.name,status:"已完成",category:"项目资料"});let uploaded=null;
 showDialog(id?"项目资料":"添加资料",`${field("标题","title",r.title,"text",'required maxlength="200"')}${field("分类","category",r.category,"text",'maxlength="200"')}${textField("说明 / 原文","detail",r.detail,'maxlength="30000"')}${field("资料链接","url",r.url,"url",'maxlength="2000"')}<label>附件（可选，20MB 以内）<input type="file" id="doc-file"></label>${r.fileName?`<p class="hint">当前附件：${esc(r.fileName)}</p>`:""}`,async(fd,form)=>{
 const f=el("#doc-file",form).files[0];if(f&&!uploaded){if(f.size>20*1024*1024)throw Error("附件超过20MB，请用网盘链接。");const data=new FormData();data.append("file",f);uploaded=await api("files","POST",data)}
 await save({...r,title:fd.get("title"),category:fd.get("category"),detail:fd.get("detail"),url:fd.get("url"),...(uploaded||{})});
 });
}
function bindDialogActions(d){d.addEventListener("click",e=>{const b=e.target.closest("[data-action]");if(b)dispatch(b.dataset.action,b.dataset.id).catch(err=>toast(err.message,true))})}
function bindPage(){
 root.onclick=e=>{
  const nav=e.target.closest("[data-nav]");if(nav){navigate(nav.dataset.nav);return}
  const tab=e.target.closest("[data-tab]");if(tab){if(!leave())return;S.dirty=false;S.tab=tab.dataset.tab;S.category="全部";S.search="";render();return}
  const category=e.target.closest("[data-category]");if(category){S.category=category.dataset.category;render();return}
  const publication=e.target.closest("[data-publish]");if(publication){try{editPublication(publication.dataset.publish)}catch(err){toast(err.message,true)}return}
  const report=e.target.closest("[data-report]");if(report){try{editReport(report.dataset.report)}catch(err){toast(err.message,true)}return}
  const b=e.target.closest("[data-action]");if(b){e.preventDefault();dispatch(b.dataset.action,b.dataset.id).catch(err=>toast(err.message,true))}
 };
 const text=el("#script-text");if(text){text.oninput=()=>{S.dirty=true;el("#script-state").textContent="有未保存修改";el("#script-state").classList.add("unsaved")}};
 const file=el("#script-import");if(file)file.onchange=async()=>{
  const f=file.files[0];if(!f)return;if(f.size>400000){toast("文本文件过大，请分段粘贴。",true);return}
  if(text.value&&!confirm("导入内容会替换左侧尚未保存的脚本，继续吗？"))return;
  text.value=await f.text();text.dispatchEvent(new Event("input"));
 };
 const search=el("#asset-search");if(search)search.oninput=e=>{S.search=e.target.value;const pos=e.target.selectionStart;render();el("#asset-search").focus();el("#asset-search").setSelectionRange(pos,pos)};
 const owner=el("#owner-filter");if(owner)owner.onchange=e=>{S.owner=e.target.value;render()};
 const month=el("#report-month");if(month)month.onchange=e=>{if(e.target.value){S.month=e.target.value;render()}};
}
async function dispatch(action,id){
 if(S.dirty&&!["save-script","share","home","open-episode"].includes(action))throw Error("请先保存左侧脚本，再进行其他操作。");
 if(action==="home")navigate("episodes");
 else if(action==="open-episode")navigate("episodes",id);
 else if(action==="refresh")await refresh(true);
 else if(action==="new-episode")editEpisode();
 else if(action==="edit-episode")editEpisode(id);
 else if(action==="new-shot")editShot();
 else if(action==="edit-shot")editShot(id);
 else if(action==="toggle-shot"){if(S.dirty)throw Error("先保存左侧脚本，再展开其他镜头。");S.selectedShot=S.selectedShot===id?"":id;render()}
 else if(action==="save-script")await saveScript();
 else if(action==="split-script")splitScript();
 else if(action==="link-asset")linkAsset(id);
 else if(action==="unlink-asset"){requireEditor();const [shotId,assetId]=id.split("|"),shot=find(shotId);await save({...shot,production:{...p(shot),assetIds:(p(shot).assetIds||[]).filter(a=>a!==assetId)}});render();toast("已移除关联，原素材仍保留")}
 else if(action==="upload-shot")uploadAssets({episodeId:p(find(id)).episodeId,shotId:id});
 else if(action==="upload-common")uploadAssets();
 else if(action==="upload-episode")uploadAssets({episodeId:S.eid});
 else if(action==="upload-final")uploadAssets({episodeId:S.eid,category:"成片"});
 else if(action==="asset-detail")await assetDetail(id);
 else if(action==="edit-asset")editAsset(id);
 else if(action==="new-version")uploadAssets({version:find(id)});
 else if(action==="download")await download(id);
 else if(action==="new-doc")editDoc();
 else if(action==="edit-doc")editDoc(id);
 else if(action==="share"){
  const url=location.origin+location.pathname+"#access="+encodeURIComponent(S.key);
  try{await navigator.clipboard.writeText(url);toast("已复制成员链接，组员无需登录即可协作")}catch{showDialog("共享给组员",`<p>复制完整链接，组员无需注册或登录。</p>${textField("成员共享链接","share",url,'readonly')}`)}
 }
}
window.addEventListener("beforeunload",e=>{if(S.dirty){e.preventDefault();e.returnValue=""}});
render();refresh(true);
setInterval(()=>{if(!document.hidden&&!el("#dialog")&&!S.dirty&&!S.loading&&S.key)refresh()},20000);

})();