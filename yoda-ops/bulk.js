/* Latest metrics and dated snapshots share the existing note payload and CAS save. */
(()=>{
'use strict';
const fields=[['views','阅读'],['likes','点赞'],['saves','收藏'],['comments','评论'],['shares','分享']];
const oldAnalytics=renderAnalytics;
const monday=d=>{const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()-((x.getUTCDay()+6)%7));return x.toISOString().slice(0,10)};
const previous=d=>{const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()-1);return x.toISOString().slice(0,10)};
const ui={date:today(),start:monday(today()),end:today(),baseline:previous(monday(today())),advanced:false};
const interaction=m=>['likes','saves','comments','shares'].reduce((s,k)=>s+Number(m[k]||0),0);
function latest(n){return Object.entries(n.metrics||{}).filter(([k,m])=>(WINDOWS.includes(k)||k==='latest')&&m&&m.views!=null&&Number.isFinite(Number(m.views))).sort((a,b)=>String(b[1].recordedAt||'').localeCompare(String(a[1].recordedAt||''))||((b[0]==='latest')-(a[0]==='latest')))[0]?.[1]||null}
const rows=()=>published().map(note=>({note,m:latest(note)}));
function account(date){return notes.flatMap(n=>Object.values(n.metrics?.__account||{})).filter(a=>a.date===date).sort((a,b)=>String(b.recordedAt).localeCompare(String(a.recordedAt)))[0]||{}}
function comparison(){
 const result={views:0,interactions:0,count:0,missing:0,adjusted:0};
 for(const n of published()){
  if(n.publishedAt>ui.end)continue;
  const end=n.metrics?.__history?.[ui.end];
  const base=n.metrics?.__history?.[ui.baseline]||(n.publishedAt>ui.baseline?{views:0,likes:0,saves:0,comments:0,shares:0}:null);
  if(!end||!base){result.missing++;continue}
  const dv=end.views-base.views,di=interaction(end)-interaction(base);
  result.views+=dv;result.interactions+=di;result.count++;
  if(dv<0||di<0)result.adjusted++;
 }
 return result;
}
function report(){
 const list=rows().filter(x=>x.m),t=totals(list),c=comparison(),a=account(ui.end),all=published();
 const top=list.length?[...list].sort((a,b)=>interaction(b.m)-interaction(a.m))[0]:null;
 const pub=all.filter(n=>n.publishedAt>=ui.start&&n.publishedAt<=ui.end).length;
 return `Yoda 小红书运营周报｜${ui.start}—${ui.end}\n\n运营情况：本期发布 ${pub} 篇笔记。当前已录入 ${list.length}/${all.length} 篇已发布笔记，最新记录合计阅读 ${fmt(t.views)}，互动 ${fmt(interaction(t))}（点赞 ${fmt(t.likes)}、收藏 ${fmt(t.saves)}、评论 ${fmt(t.comments)}、分享 ${fmt(t.shares)}）。\n本期阅读变化：${c.count?fmt(c.views):'暂无可比数据'}；互动变化：${c.count?fmt(c.interactions):'暂无可比数据'}。${c.count?`按 ${ui.baseline} 与 ${ui.end} 快照比较，覆盖 ${c.count} 篇。`:''}${c.missing?`另有 ${c.missing} 篇缺少快照，不能计算完整增量。`:''}${c.adjusted?'存在负差额，请核对平台回调或录入修正。':''}\n新增粉丝：${a.start===ui.start?(a.followers??'待补充'):'待补充'}；私信咨询：${a.start===ui.start?(a.inquiries??'待补充'):'待补充'}。\n\n内容表现：${top?`当前互动最多的是《${top.note.title}》，共 ${interaction(top.m)} 次互动、${top.m.saves} 次收藏。样本与观察时长不同，内容方向仍需继续验证。`:'暂无已录入数据。'}\n\n下周优化：围绕运营痛点与产品使用场景测试选题，比较标题、封面和评论引导效果，持续记录咨询与体验申请。\n\n口径：仅统计已发布且有链接、发布日期的笔记。累计采用各笔记最新一条记录（可能统计时间不同），不累加不同观察窗口。本期增量使用指定日期快照，首次录入用于建立基线。`;
}
function input(k,value,label,attrs=''){return `<input class="bulk-number" data-key="${k}" type="number" min="0" max="1000000000" step="1" value="${esc(value??'')}" aria-label="${esc(label)}" ${attrs}>`}
function renderBulk(){
 const list=rows(),known=list.filter(x=>x.m),t=totals(known),a=account(ui.end),c=comparison();
 const dates=[...new Set(notes.flatMap(n=>Object.keys(n.metrics?.__history||{})))].sort().reverse();
 return `<div class="bulk-intro"><div><span class="pill">仅已发布且有链接</span><h2>一张表，完成本周统计</h2><p>打开笔记核对当前累计数 → 批量填入 → 保存日期快照 → 复制周报</p></div><button class="btn" type="button" data-bulk="advanced">${ui.advanced?'收起':'展开'} 24h / 72h / 7d 复盘</button></div>
 <div class="stats">${stat('已发布笔记',list.length,known.length+' 篇已有数据','▤')}${stat('当前累计阅读',known.length?fmt(t.views):'—','各笔记最新记录之和','▥')}${stat('当前累计互动',known.length?fmt(interaction(t)):'—','赞 + 藏 + 评 + 转','♡')}${stat('整体互动率',known.length?pct(interaction(t),t.views):'—','合计互动 ÷ 合计阅读','%')}</div>
 <form id="bulkForm"><section class="panel bulk-panel"><div class="panel-head"><div><h2>批量填数</h2><p>预填最近一次数据，请核对后保存；空白表示未记录，0 表示已确认没有。</p></div><label>统计日期 <input class="select" type="date" id="bulkDate" value="${ui.date}" max="${today()}" required></label></div>
 <div class="tablewrap"><table class="table bulk-table"><thead><tr><th>已发布笔记</th><th>上次记录</th>${fields.map(([,label])=>`<th>${label}</th>`).join('')}<th>互动率</th></tr></thead><tbody>${list.map(({note:n,m})=>`<tr data-note="${esc(n.id)}"><td><a href="${esc(n.url)}" target="_blank" rel="noopener noreferrer"><b>${esc(n.title)} ↗</b></a><small>${esc(n.category)} · ${esc(n.publishedAt)}</small></td><td>${m?.recordedAt?esc(new Date(m.recordedAt).toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai'})):m?'旧窗口记录':'尚未录入'}</td>${fields.map(([k,label])=>`<td>${input(k,m?.[k],n.title+' '+label,snapshot?'disabled':'')}</td>`).join('')}<td>${m?pct(interaction(m),m.views):'—'}</td></tr>`).join('')}</tbody></table>${!list.length?empty('暂无符合条件的笔记','请先在选题板补齐已发布状态、链接与实际发布日期。'):''}</div>
 <div class="panel-body bulk-foot"><p class="note">可从 Excel 复制连续数字，点击对应的数字格直接粘贴多行。保存会把所有完整行记录为该日快照；同日再次保存将更新该日记录。</p><button class="btn primary" type="submit" ${snapshot||!list.length?'disabled':''}>保存全部与日期快照</button><button class="btn" type="button" data-bulk="discard">放弃未保存修改</button><span id="bulkStatus" role="status" class="note">尚未修改</span></div></section>
 <section class="panel bulk-panel"><div class="panel-head"><div><h2>账号周数据</h2><p>每个周期填写一次，与本次快照一起保存。</p></div></div><div class="panel-body bulk-account"><label>周期开始<input class="select" id="bulkStart" type="date" value="${ui.start}" required></label><label>周期结束<input class="select" id="bulkEnd" type="date" value="${ui.end}" max="${today()}" required></label><label>新增粉丝${input('followers',a.start===ui.start?a.followers:null,'本期新增粉丝')}</label><label>私信咨询${input('inquiries',a.start===ui.start?a.inquiries:null,'本期私信咨询')}</label></div></section></form>
 <div class="grid"><section class="panel"><div class="panel-head"><div><h2>本期变化</h2><p>选择期初基线与周期结束日快照，新增笔记按发布日判断。</p></div></div><div class="panel-body"><label>期初基线日期 <input class="select" type="date" id="bulkBaseline" value="${ui.baseline}" max="${ui.end}" ${snapshot?'disabled':''}></label><div class="row"><div><b>阅读变化：${c.count?fmt(c.views):'暂无可比数据'}</b><small>互动变化：${c.count?fmt(c.interactions):'暂无可比数据'} · 已覆盖 ${c.count} 篇，缺少快照 ${c.missing} 篇</small></div></div><p class="note">${c.adjusted?'出现负差额，请核对平台数据或录入修正。':'首次保存建立基线，后续选择两个日期即可比较。'}</p><p class="note">已有快照：${dates.length?dates.map(esc).join('、'):'暂无'}</p></div></section><section class="panel"><div class="panel-head"><div><h2>栏目收藏与点赞率</h2><p>采用各笔记最新记录，观察时间可能不同。</p></div></div>${chartBars(known)}</section></div>
 <section class="panel bulk-panel"><div class="panel-head"><div><h2>自动周报</h2><p>基于已保存数据生成；填数后请先保存。</p></div><button class="btn" type="button" data-bulk="copy">复制周报</button></div><div class="review">${esc(report())}</div></section>${ui.advanced?`<section class="bulk-panel"><h2>按发布后相同时间比较</h2>${oldAnalytics()}</section>`:''}`;
}
renderAnalytics=renderBulk;
const style=document.createElement('style');style.textContent=`.bulk-intro{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:20px}.bulk-intro h2{margin:9px 0 4px;font-size:22px}.bulk-intro p{margin:0;color:var(--muted);font-size:12px}.bulk-panel{margin-top:16px}.bulk-table{min-width:1000px}.bulk-table td:first-child{min-width:260px;max-width:340px}.bulk-table small{display:block;color:var(--muted);font-size:10px;margin-top:5px}.bulk-number{width:94px;padding:9px 8px;border:1px solid #d9e3d9;border-radius:7px;background:white;color:var(--ink)}.bulk-number:focus{background:#f0f6ef}.bulk-foot{padding-top:12px}.bulk-account{display:flex;flex-wrap:wrap;gap:16px}.bulk-account label{display:grid;gap:7px;font-size:12px;color:var(--muted)}.bulk-account .bulk-number{width:145px}#bulkStatus{margin-left:12px}.bulk-panel .panel-head label{font-size:12px;color:var(--muted)}@media(max-width:650px){.bulk-intro{display:block}.bulk-intro .btn{margin-top:12px}.bulk-panel .panel-head{align-items:start;flex-wrap:wrap}.bulk-account{gap:12px}.bulk-account label{width:calc(50% - 6px)}.bulk-account input{max-width:100%}}`;document.head.append(style);
function dirty(){window.yodaBulkDirty=true;const s=$('#bulkStatus');if(s)s.textContent='有未保存修改';}
function number(raw){if(raw==='')return null;const n=Number(raw);if(!/^\d+$/.test(raw)||!Number.isSafeInteger(n)||n>1e9)throw Error('请输入 0 至 10 亿的整数，未记录请留空。');return n}
function buildUpdates(form){
 const date=$('#bulkDate').value,start=$('#bulkStart').value,end=$('#bulkEnd').value;
 if(!date||date>today()||!start||!end||start>end||end>today()||ui.baseline>=end)throw Error('请检查统计日期和周期起止日期。');
 const at=new Date().toISOString(),updates=[];
 for(const tr of form.querySelectorAll('[data-note]')){
  const n=notes.find(x=>x.id===tr.dataset.note);if(n.publishedAt>date)throw Error('统计日期不能早于笔记发布日期：'+n.title);
  const m=Object.fromEntries(fields.map(([k])=>[k,number(tr.querySelector(`[data-key="${k}"]`).value.trim())]));
  const count=Object.values(m).filter(v=>v!==null).length;if(!count)continue;if(count!==5)throw Error('请补齐该笔记的五项数据，确认没有请填 0：'+n.title);
  m.recordedAt=at;m.snapshotDate=date;
  const history={...n.metrics?.__history,[date]:m};
  const newest=Object.keys(history).sort().at(-1);
  updates.push({...n,metrics:{...n.metrics,latest:history[newest],__history:history}});
 }
 const followers=number(form.querySelector('[data-key="followers"]').value.trim()),inquiries=number(form.querySelector('[data-key="inquiries"]').value.trim());
 // Account observations live once, on the oldest existing published note, avoiding schema changes.
 const old=published().slice().sort((a,b)=>a.id.localeCompare(b.id))[0];
 if(old&&(followers!==null||inquiries!==null||Object.keys(account(end)).length)){
  let next=updates.find(n=>n.id===old.id);if(!next){next={...old,metrics:{...old.metrics}};updates.push(next)}
  next.metrics.__account={...next.metrics.__account,[end]:{date:end,start,followers,inquiries,recordedAt:at}};
 }
 if(!updates.length)throw Error('请至少填写一篇笔记的完整数据或账号周数据。');
 return {updates,date,start,end};
}
let saving=false;
document.addEventListener('submit',async e=>{
 if(e.target.id!=='bulkForm')return;e.preventDefault();if(snapshot||saving)return;
 try{const {updates,date,start,end}=buildUpdates(e.target);saving=true;dirty();e.target.querySelector('button[type="submit"]').disabled=true;$('#bulkStatus').textContent='正在保存…';
  if(window.yodaSaveBatch)await window.yodaSaveBatch(updates);else{notes=notes.map(n=>updates.find(x=>x.id===n.id)||n);window.yodaBulkDirty=false;persist()}
  Object.assign(ui,{date,start,end});window.yodaBulkDirty=false;render();toast('已保存全部数据与日期快照');
 }catch(err){toast(err.message);const b=$('#bulkForm button[type="submit"]');if(b)b.disabled=false;const s=$('#bulkStatus');if(s)s.textContent='保存未完成，填数内容已保留';}finally{saving=false}
});
document.addEventListener('input',e=>{if(e.target.closest('#bulkForm'))dirty()});
document.addEventListener('paste',e=>{
 const el=e.target;if(!el.matches('#bulkForm [data-note] .bulk-number'))return;
 const text=e.clipboardData.getData('text/plain').trim();if(!/[\t\n]/.test(text))return;e.preventDefault();
 const lines=text.split(/\r?\n/).map(l=>l.split('\t')),tr=el.closest('tr'),trs=[...tr.parentElement.children],row=trs.indexOf(tr),col=fields.findIndex(([k])=>k===el.dataset.key);
 try{if(row+lines.length>trs.length||lines.some(l=>col+l.length>5))throw Error('粘贴范围超出表格，请核对起始单元格和行列数。');lines.flat().forEach(v=>number(v.trim()));for(let i=0;i<lines.length;i++)for(let j=0;j<lines[i].length;j++)trs[row+i].querySelector(`[data-key="${fields[col+j][0]}"]`).value=lines[i][j].trim();dirty();toast('已粘贴，核对后点击保存全部。')}catch(err){toast(err.message)}
});
document.addEventListener('change',e=>{
 if(['bulkStart','bulkEnd'].includes(e.target.id)){for(const k of ['followers','inquiries'])$('#bulkForm [data-key="'+k+'"]').value='';toast('周期已调整，请重新填写对应周期的粉丝与咨询数。')}
 if(e.target.id==='bulkBaseline'){if(window.yodaBulkDirty){toast('请先保存填数，再切换基线日期。');e.target.value=ui.baseline;return}ui.baseline=e.target.value;render()}
});
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-bulk]');if(!b)return;
 if(b.dataset.bulk==='discard'){if(saving)return;window.yodaBulkDirty=false;render();toast('已恢复到保存的数据');return}
 if(b.dataset.bulk==='copy'){if(window.yodaBulkDirty){toast('请先保存修改，再复制周报。');return}try{await navigator.clipboard.writeText(report());toast('周报已复制')}catch{prompt('复制周报',report())}}
 if(b.dataset.bulk==='advanced'){if(window.yodaBulkDirty){toast('请先保存修改，再切换复盘。');return}ui.advanced=!ui.advanced;render()}
},true);
// Protect drafts from navigation and realtime refreshes.
document.addEventListener('click',e=>{if(!window.yodaBulkDirty)return;const target=e.target.closest('[data-view],[data-action],[data-window]');if(target){e.preventDefault();e.stopImmediatePropagation();toast('请先保存批量填数，再切换页面或操作。')}},true);
window.addEventListener('beforeunload',e=>{if(window.yodaBulkDirty){e.preventDefault();e.returnValue=''}});
window.YodaBulk={latest,comparison,report,buildUpdates,ui};
if(state.view==='analytics')render();
})();
