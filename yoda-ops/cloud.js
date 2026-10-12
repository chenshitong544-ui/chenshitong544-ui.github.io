if (!snapshot) {
/* Yoda 小红书运营协作：只用公开 publishable key，实际权限由 Supabase RLS 和触发器控制。 */
const cloud = window.supabase.createClient(
  'https://fzwutbqnytfioniknvvk.supabase.co',
  'sb_publishable_KF9XWMa2wCaOCrUwQ_Fg9w_KIylSolI'
);
const cloudState = {loading:true, user:null, member:null, error:'', syncing:false, local:readLocal()};
const originalRender = render;
const originalCard = card;
const originalOpenReview = openReview;
const localDate = today;
let refreshTimer, cloudChannel;

function errorText(err){return err?.message || '操作失败，请稍后重试。'}
function cloudBusy(message){cloudState.error=message||'';render()}
function cloudPayload(n){return {
  title:n.title,category:n.category,angle:n.angle||'',body:n.body||'',scheduledAt:n.scheduledAt||'',
  target:n.target||'',materials:n.materials||'',tags:n.tags||'',url:n.url||'',
  publishedAt:n.publishedAt||null,metrics:n.metrics||{}
}}
function cloudNote(row,review){return {
  ...row.payload,id:row.id,status:row.status,revision:row.revision,
  review:review?{by:review.reviewer_name,decision:review.decision,comment:review.comment,at:review.created_at}:null,
  createdAt:row.created_at,updatedAt:row.updated_at,_cloudUpdatedAt:row.updated_at,updatedBy:row.updated_by
}}
async function loadCloud(){
  if(!cloudState.user || !cloudState.member?.active)return;
  const [a,b]=await Promise.all([
    cloud.from('yoda_notes').select('*').order('created_at',{ascending:false}),
    cloud.from('yoda_reviews').select('*').order('created_at',{ascending:false}).order('id',{ascending:false})
  ]);
  if(a.error||b.error){cloudBusy('读取共享数据失败：'+errorText(a.error||b.error));return}
  const reviewMap=new Map();
  for(const item of b.data||[]){const k=item.note_id+':'+item.revision;if(!reviewMap.has(k))reviewMap.set(k,item)}
  notes=(a.data||[]).map(row=>cloudNote(row,reviewMap.get(row.id+':'+row.revision)));
  cloudState.error='';cloudState.loading=false;render();
}
async function connectUser(){
  cloudState.loading=true;render();
  const {data:{session},error}=await cloud.auth.getSession();
  if(error){cloudState.error=errorText(error);cloudState.loading=false;render();return}
  cloudState.user=session?.user||null;
  if(!cloudState.user){cloudState.member=null;cloudState.loading=false;render();return}
  const email=(cloudState.user.email||'').toLowerCase();
  const member=await cloud.from('yoda_members').select('*').eq('email',email).maybeSingle();
  if(member.error){cloudState.error=errorText(member.error);cloudState.loading=false;render();return}
  cloudState.member=member.data;
  if(!member.data?.active){cloudState.loading=false;render();return}
  await loadCloud();
  cloudChannel?.unsubscribe();
  cloudChannel=cloud.channel('yoda-ops-updates')
    .on('postgres_changes',{event:'*',schema:'public',table:'yoda_notes'},scheduleCloudRefresh)
    .on('postgres_changes',{event:'*',schema:'public',table:'yoda_reviews'},scheduleCloudRefresh)
    .subscribe();
}
function scheduleCloudRefresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(loadCloud,450)}
function authView(){
  if(cloudState.loading)return '<section class="panel cloud-auth"><h2>正在连接共享工作台…</h2></section>';
  if(!cloudState.user)return `<section class="panel cloud-auth"><h2>登录 Yoda 运营协作库</h2><p>同事使用自己的邮箱收取登录链接。被加入团队后，才能查看选题、修改文案和记录审核。</p><form id="cloudLogin"><label for="cloudEmail">邮箱地址</label><div class="cloud-auth-row"><input id="cloudEmail" name="email" type="email" required placeholder="name@company.com"><button class="btn primary" type="submit">发送登录链接</button></div></form><p class="note">${esc(cloudState.error||'网页链接无需 ChatGPT 登录；编辑和审核使用邮箱确认身份。')}</p></section>`;
  return `<section class="panel cloud-auth"><h2>当前账号尚未加入团队</h2><p>${esc(cloudState.user.email||'')} 已登录。请由负责人在「团队成员」中添加这个邮箱。</p><button class="btn" data-cloud="signout">换一个邮箱登录</button><p class="note">${esc(cloudState.error)}</p></section>`;
}
render=function(){
  originalRender();
  if(!cloudState.user||!cloudState.member?.active||cloudState.loading){
    $('#banner').innerHTML='';$('#mainActions').innerHTML='';$('#content').innerHTML=authView();return;
  }
  const owner=cloudState.member.is_owner,local=cloudState.local.length;
  $('#banner').innerHTML=`<div class="banner"><div><b>团队数据已同步</b>　登录：${esc(cloudState.member.display_name)} · ${esc(cloudState.user.email)}。同事刷新同一网址即可看到最新记录，在线更新也会自动刷新。${cloudState.error?`<br><b>连接提示：</b>${esc(cloudState.error)}`:''}${local&&owner?`<br>当前浏览器另有 ${local} 条旧记录：先备份，再手动导入共享库。`:''}</div><button class="btn small" data-cloud="signout">退出</button></div>`;
  $('#mainActions').innerHTML=`<button class="btn" data-action="export-json">备份 JSON</button><button class="btn" data-action="export-csv">导出 CSV</button>${owner?'<button class="btn" data-action="import-json">导入 JSON</button><button class="btn" data-cloud="team">团队成员</button>':''}${owner&&local?'<button class="btn" data-cloud="local-backup">备份本机旧数据</button><button class="btn" data-cloud="local-import">导入本机旧数据</button>':''}${cloudState.member.can_edit?'<button class="btn primary" data-action="new">＋ 新建选题</button>':''}`;
  if(!cloudState.member.can_edit){document.querySelectorAll('[data-action="edit"],[data-action="suggest"],[data-move]').forEach(x=>x.remove())}
  if(!owner){document.querySelectorAll('[data-action="publish"],[data-action="delete"]').forEach(x=>x.remove())}
  if(!cloudState.member.can_review){document.querySelectorAll('[data-action="review"]').forEach(x=>x.remove())}
};
card=function(n){let html=originalCard(n);if(!cloudState.member?.is_owner)html=html.replace(/<button class="btn small primary" data-action="publish"[^>]*>.*?<\/button>/,'');return html};
// 旧逻辑不会再写浏览器；每项修改均请求共享数据库，失败后重新读取。
persist=function(){throw Error('共享模式请使用数据库保存')};
async function cloudSave(n,old){
  if(!cloudState.member?.can_edit){toast('当前账号没有编辑权限');return false}
  const row={payload:cloudPayload(n),status:n.status};
  let request=old?cloud.from('yoda_notes').update(row).eq('id',old.id).eq('updated_at',old._cloudUpdatedAt):cloud.from('yoda_notes').insert({...row,id:n.id});
  const {data,error}=await request.select('id');
  if(error){toast('保存失败：'+errorText(error));await loadCloud();return false}
  if(old&&(!data||!data.length)){toast('这篇笔记已被同事更新，请查看最新版后重试。');await loadCloud();return false}
  await loadCloud();return true;
}
saveNote=async function(form){
  const fd=new FormData(form),id=form.dataset.id,old=id?notes.find(x=>x.id===id):null;
  const title=String(fd.get('title')||'').trim(),category=String(fd.get('category')||''),status=String(fd.get('status')||'');
  const url=String(fd.get('url')||'').trim(),scheduledAt=String(fd.get('scheduledAt')||'');
  if(!title||!CATEGORIES.includes(category)||!STATUSES.includes(status)){toast('请填写标题、栏目和状态。');return}
  if(url&&!/^https?:\/\//i.test(url)){toast('链接请以 https:// 开头。');return}
  if(scheduledAt&&!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(scheduledAt)){toast('计划时间格式不正确。');return}
  if(status==='已发布'&&old?.status!=='已发布'){toast('请由负责人在已审核卡片确认发布。');return}
  const n={id:old?.id||crypto.randomUUID(),title:title.slice(0,160),category,status,
    angle:String(fd.get('angle')||'').trim().slice(0,1200),body:String(fd.get('body')||'').trim().slice(0,12000),
    scheduledAt,target:String(fd.get('target')||'').trim().slice(0,80),
    materials:String(fd.get('materials')||'').trim().slice(0,1200),tags:String(fd.get('tags')||'').trim().slice(0,200),
    url,publishedAt:status==='已发布'?String(fd.get('publishedAt')||'')||old?.publishedAt||localDate():old?.publishedAt||null,
    metrics:old?.metrics||{}};
  if(await cloudSave(n,old)){closeModal();toast(old?'选题已同步':'选题已加入共享库')}
};
addSuggestion=async function(index){
  const s=SUGGESTIONS[index];if(!s||notes.some(n=>n.title===s.title))return;
  const n={...s,id:crypto.randomUUID(),status:'待评估',body:'',scheduledAt:'',url:'',publishedAt:null,metrics:{}};
  if(await cloudSave(n,null))toast('已加入共享选题板');
};
openReview=function(id){
  if(!cloudState.member?.can_review){toast('当前账号没有审核权限');return}
  const n=notes.find(x=>x.id===id);
  if(n?.updatedBy===cloudState.user?.id){toast('最后修改人不能审核自己的文案，请交给另一位同事。');return}
  originalOpenReview(id);
  const input=$('#reviewBy');if(input){input.value=cloudState.member.display_name;input.readOnly=true;input.required=false}
  const note=$('#reviewForm .note');if(note)note.textContent='审核人由邮箱登录身份确认；正文修改后，本次审核自动失效。';
};
saveReview=async function(form){
  const n=notes.find(x=>x.id===form.dataset.id);if(!n||n.status!=='待审核')return;
  const fd=new FormData(form),decision=String(fd.get('decision')||''),comment=String(fd.get('comment')||'').trim().slice(0,2000);
  if(!['approved','changes'].includes(decision))return;
  if(decision==='approved'&&!String(n.body||'').trim()){toast('请先补齐正文文案');return}
  const {error}=await cloud.from('yoda_reviews').insert({note_id:n.id,decision,comment});
  if(error){toast('审核失败：'+errorText(error));await loadCloud();return}
  closeModal();await loadCloud();toast(decision==='approved'?'审核通过已同步':'退回意见已同步');
};
saveMetric=async function(form){
  const n=notes.find(x=>x.id===form.dataset.id);if(!n||n.status!=='已发布')return;
  const fd=new FormData(form),w=String(fd.get('window'));if(!WINDOWS.includes(w))return;
  const m={};for(const k of ['views','likes','saves','comments','shares']){const v=Number(fd.get(k));if(!Number.isSafeInteger(v)||v<0||v>1e9){toast('请输入非负整数');return}m[k]=v}
  for(const k of ['trialComments','applications','activated']){const raw=String(fd.get(k)??'').trim();const v=Number(raw);if(raw&&(!Number.isSafeInteger(v)||v<0||v>1e9)){toast('试用数据请输入非负整数');return}m[k]=raw?v:null}
  if(m.trialComments!=null&&m.trialComments>m.comments){toast('有效试用评论不能超过总评论');return}
  const next={...n,metrics:{...n.metrics,[w]:{...m,recordedAt:new Date().toISOString()}}};
  if(await cloudSave(next,n)){closeModal();toast('复盘数据已同步')}
};
async function cloudStatus(id,status){const n=notes.find(x=>x.id===id);if(!n)return;
  const next={...n,status,publishedAt:status==='已发布'?(n.publishedAt||localDate()):n.publishedAt};
  if(await cloudSave(next,n))toast(status==='已发布'?'已确认发布':'状态已同步');
}
async function cloudDelete(id){const n=notes.find(x=>x.id===id);if(!n||!cloudState.member?.is_owner)return;
  if(!confirm(`确定删除《${n.title}》及其审核记录和数据吗？`))return;
  const {error}=await cloud.from('yoda_notes').delete().eq('id',id);
  if(error)toast('删除失败：'+errorText(error));else{closeModal();await loadCloud();toast('已删除')}
}
async function importShared(items){
  if(!cloudState.member?.is_owner)return;
  const existing=new Set(notes.map(n=>n.id));let count=0;
  for(const item of items){if(existing.has(item.id))continue;
    const copy={...item,review:null};
    const {error}=await cloud.from('yoda_notes').insert({id:copy.id,payload:cloudPayload(copy),status:copy.status});
    if(error){toast(`已导入 ${count} 条；下一条失败：${errorText(error)}`);await loadCloud();return}
    count++;
  }
  await loadCloud();toast(`已导入 ${count} 条；旧审核签名未当作实名审批迁移。`);
}
async function openTeam(){if(!cloudState.member?.is_owner)return;
  const {data,error}=await cloud.from('yoda_members').select('*').order('created_at');
  if(error){toast(errorText(error));return}
  $('#modalRoot').innerHTML=`<div class="modalback"><div class="modal" role="dialog" aria-modal="true" aria-label="团队成员"><div class="modalhead"><h2>团队成员</h2><button data-action="close" aria-label="关闭">×</button></div><div class="form"><p class="note">添加同事邮箱后，对方打开工作台，用这个邮箱收取登录链接。编辑与审核会记录登录身份；负责人确认发布。</p>${(data||[]).map(m=>`<div class="row"><div><b>${esc(m.display_name)}</b><small>${esc(m.email)} · ${m.is_owner?'负责人':m.active?'可编辑和审核':'已停用'}</small></div>${m.is_owner?'':`<button class="btn small" data-cloud="toggle-member" data-email="${esc(m.email)}" data-active="${m.active?'1':'0'}">${m.active?'停用':'启用'}</button>`}</div>`).join('')}<form id="cloudTeamForm"><div class="formgrid"><div class="field"><label>同事邮箱</label><input name="email" type="email" required></div><div class="field"><label>显示姓名</label><input name="display_name" required maxlength="80"></div></div><button class="btn primary" type="submit">添加成员</button></form></div><div class="modalfoot"><button class="btn" data-action="close">关闭</button></div></div></div>`;
}
// 捕获旧页面中直接写本地的按钮与状态变更，改由数据库执行。
document.addEventListener('click',async e=>{
  const btn=e.target.closest?.('[data-cloud],[data-action="publish"],[data-action="delete"]');if(!btn)return;
  const action=btn.dataset.cloud||btn.dataset.action;
  e.preventDefault();e.stopImmediatePropagation();
  if(action==='signout'){await cloud.auth.signOut();cloudChannel?.unsubscribe();cloudState.user=null;cloudState.member=null;notes=[];render();return}
  if(action==='team'){await openTeam();return}
  if(action==='local-backup'){download(`Yoda_本机旧数据_${localDate()}.json`,JSON.stringify({version:1,notes:cloudState.local},null,2),'application/json');return}
  if(action==='local-import'){if(!confirm(`将本机 ${cloudState.local.length} 条旧选题添加到共享库？已有相同 ID 会跳过。`))return;await importShared(cloudState.local);return}
  if(action==='toggle-member'){const active=btn.dataset.active!=='1';const {error}=await cloud.from('yoda_members').update({active}).eq('email',btn.dataset.email);if(error)toast(errorText(error));else openTeam();return}
  if(action==='publish'){if(!cloudState.member?.is_owner){toast('仅负责人确认发布');return}if(confirm('确认这篇笔记已经在小红书发布？'))await cloudStatus(btn.dataset.id,'已发布');return}
  if(action==='delete'){await cloudDelete(btn.dataset.id)}
},true);
document.addEventListener('change',async e=>{
  if(e.target?.matches?.('[data-move]')){e.stopImmediatePropagation();await cloudStatus(e.target.dataset.move,e.target.value)}
  if(e.target?.id==='importFile'){
    e.stopImmediatePropagation();const file=e.target.files?.[0];e.target.value='';if(!file)return;
    try{const raw=JSON.parse(await file.text()),items=Array.isArray(raw)?raw:raw.notes;
      if(!Array.isArray(items)||items.length>500||!items.every(validNote))throw Error('格式不正确');
      if(confirm(`将 ${items.length} 条旧选题添加到共享库？先确认文件来源。`))await importShared(items);
    }catch{toast('导入失败：请选择工作台导出的 JSON 文件')}
  }
},true);
document.addEventListener('submit',async e=>{
  if(e.target?.id==='cloudLogin'){
    e.preventDefault();e.stopImmediatePropagation();const email=String(new FormData(e.target).get('email')||'').trim();
    const {error}=await cloud.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});
    toast(error?'发送失败：'+errorText(error):'登录邮件已发送，请在邮箱点击链接后回到工作台。');return;
  }
  if(e.target?.id==='cloudTeamForm'){
    e.preventDefault();e.stopImmediatePropagation();const fd=new FormData(e.target);
    const email=String(fd.get('email')||'').trim().toLowerCase(),display_name=String(fd.get('display_name')||'').trim();
    if(!email||!display_name)return;
    const {error}=await cloud.from('yoda_members').insert({email,display_name,can_edit:true,can_review:true,active:true,is_owner:false});
    if(error)toast('添加失败：'+errorText(error));else{toast('已添加，同事可用该邮箱登录');await openTeam()}
  }
},true);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&cloudState.user)loadCloud()});
cloud.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='TOKEN_REFRESHED')setTimeout(()=>{if(event==='SIGNED_OUT'){cloudState.user=null;cloudState.member=null;notes=[];render()}else if(session?.user?.id!==cloudState.user?.id)connectUser()},0)});
connectUser();

}
