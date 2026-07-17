(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch{return d}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const CORE='sbxRocketPremiumDataV2', KEY='sbxSuccessJourneyV2';
let selected='all';
let state=read(KEY,{progress:{'SIA Jewels':72,'Sandbox Media':7},milestones:[
{id:101,business:'SIA Jewels',metric:'Sales',target:100,destination:'Pune',origin:'Kolkata',travelType:'Weekend Trip',days:2,budget:12000,icon:'🏙️',notes:'Celebrate the first 100 sales.',status:'Active'},
{id:102,business:'SIA Jewels',metric:'Sales',target:500,destination:'Mumbai',origin:'Pune',travelType:'City Trip',days:3,budget:28000,icon:'🌆',notes:'Business growth celebration.',status:'Active'},
{id:103,business:'SIA Jewels',metric:'Sales',target:1000,destination:'Goa',origin:'Mumbai',travelType:'Beach Vacation',days:4,budget:55000,icon:'🏖️',notes:'Major sales milestone.',status:'Active'},
{id:201,business:'Sandbox Media',metric:'Projects',target:10,destination:'Pune',origin:'Kolkata',travelType:'Team Trip',days:2,budget:18000,icon:'🏙️',notes:'First ten completed projects.',status:'Active'},
{id:202,business:'Sandbox Media',metric:'Projects',target:50,destination:'Mumbai',origin:'Pune',travelType:'Founder Trip',days:3,budget:35000,icon:'🌇',notes:'Agency growth milestone.',status:'Active'}
],memories:[]});
function core(){return read(CORE,{businesses:[]})}
function saveCore(v){write(CORE,v)}
function businesses(){const a=(core().businesses||[]).filter(x=>x.status!=='Archived').map(x=>x.name);return [...new Set([...a,...state.milestones.map(x=>x.business)])].filter(Boolean)}
function save(){write(KEY,state)}
function notify(m){let t=$('#toast');if(t){t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}}
function setHeader(){document.body.classList.add('success-journey-active');const map={moduleTitle:'',moduleDescription:'',pageTitle:'Success Journey',pageSubtitle:'Business milestones mapped to dream travel destinations.'};Object.entries(map).forEach(([id,val])=>{const el=$('#'+id);if(el)el.textContent=val})}
function progressFor(b){return Number(state.progress[b]||0)}
function sortedFor(b){return state.milestones.filter(x=>x.business===b&&x.status!=='Archived').sort((a,z)=>Number(a.target)-Number(z.target))}
function visible(){return state.milestones.filter(x=>x.status!=='Archived'&&(selected==='all'||x.business===selected)).sort((a,z)=>a.business.localeCompare(z.business)||a.target-z.target)}
function heroData(){const b=selected==='all'?(businesses()[0]||'Your Business'):selected;const goals=sortedFor(b);const current=progressFor(b);const next=goals.find(x=>current<Number(x.target))||goals[goals.length-1];const completed=goals.filter(x=>current>=Number(x.target));const prev=completed[completed.length-1];let base=prev?Number(prev.target):0;let ceiling=next?Number(next.target):1;let pct=next?Math.max(0,Math.min(100,Math.round((current-base)/Math.max(1,ceiling-base)*100))):0;return {b,goals,current,next,prev,pct}}
function money(n){return '₹'+Number(n||0).toLocaleString('en-IN')}
function totals(){const l=visible(),done=l.filter(x=>progressFor(x.business)>=Number(x.target)).length;return {goals:l.length,done,pending:l.length-done,budget:l.reduce((s,x)=>s+Number(x.budget||0),0)}}
function filters(){return `<button class="${selected==='all'?'active':''}" data-journey-business="all">All Businesses</button>${businesses().map(b=>`<button class="${selected===b?'active':''}" data-journey-business="${esc(b)}">${esc(b)}</button>`).join('')}`}
function routeSvg(h){
  const nodes=h.goals.length?h.goals:[];
  const width=1120,height=300;
  const startPoint={x:70,y:205};
  const usableStart=250,usableEnd=1000;
  const pts=nodes.map((g,i)=>({
    x:usableStart+i*((usableEnd-usableStart)/Math.max(1,nodes.length-1)),
    y:i%2===0?170:145,
    g
  }));

  let d=`M ${startPoint.x} ${startPoint.y}`;
  if(pts.length){
    d+=` C 135 205, 170 188, ${pts[0].x} ${pts[0].y}`;
    for(let i=1;i<pts.length;i++){
      const p=pts[i-1],q=pts[i],mx=(p.x+q.x)/2;
      d+=` C ${mx-35} ${p.y-52}, ${mx+35} ${q.y+52}, ${q.x} ${q.y}`;
    }
  } else {
    d+=` C 300 130, 640 230, 1040 165`;
  }

  let idx=nodes.findIndex(x=>h.current<Number(x.target));
  if(idx<0) idx=Math.max(0,nodes.length-1);
  const target=pts[idx]||{x:560,y:165};
  const previous=idx===0?startPoint:(pts[idx-1]||startPoint);
  const segmentPct=Math.max(0,Math.min(1,h.pct/100));
  const planeX=previous.x+(target.x-previous.x)*segmentPct;
  const planeY=previous.y+(target.y-previous.y)*segmentPct;
  const angle=Math.atan2(target.y-previous.y,target.x-previous.x)*180/Math.PI;

  const completedPath = idx===0
    ? `M ${startPoint.x} ${startPoint.y} C 135 205, 170 188, ${planeX} ${planeY}`
    : d;

  return `<svg viewBox="0 0 ${width} ${height}" class="journey-map-svg" aria-label="Travel milestone flight map">
    <defs>
      <linearGradient id="skyGlow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".94"/><stop offset="1" stop-color="#efe7ff" stop-opacity=".72"/></linearGradient>
      <linearGradient id="doneRoute" x1="0" x2="1"><stop offset="0" stop-color="#6f2ae7"/><stop offset="1" stop-color="#a45cff"/></linearGradient>
      <filter id="nodeGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="6" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="planeShadow" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#39106b" flood-opacity=".35"/></filter>
    </defs>
    <path d="${d}" class="flight-route-base"/>
    <path d="${completedPath}" class="flight-route-progress"/>
    <g class="map-start premium-start" transform="translate(${startPoint.x},${startPoint.y})"><circle r="27"/><text text-anchor="middle" dy="8" font-size="25">✈</text><text y="52" text-anchor="middle" class="map-city">Start</text><text y="69" text-anchor="middle" class="map-target">Journey begins</text></g>
    ${pts.map((p,i)=>{
      const done=h.current>=Number(p.g.target),current=i===idx&&!done;
      return `<g class="map-stop ${done?'done':current?'current':'locked'}" data-goal-card="${p.g.id}" transform="translate(${p.x},${p.y})">
        <circle class="stop-ring" r="34"/>
        <circle class="stop-photo" r="27"/>
        <text text-anchor="middle" dy="9" class="map-icon">${esc(p.g.icon||'📍')}</text>
        ${!done&&!current?'<text x="20" y="-20" class="lock-mark">🔒</text>':''}
        ${current?'<text x="0" y="-47" text-anchor="middle" class="pin-mark">●</text>':''}
        <text text-anchor="middle" y="58" class="map-city">${esc(p.g.destination)}</text>
        <text text-anchor="middle" y="76" class="map-target">${Number(p.g.target).toLocaleString('en-IN')} ${esc(p.g.metric)}</text>
        ${current?'<rect x="-58" y="86" width="116" height="25" rx="12" class="current-badge"/><text y="103" text-anchor="middle" class="current-badge-text">CURRENT DESTINATION</text>':''}
      </g>`
    }).join('')}
    <g class="map-plane-progress" transform="translate(${planeX},${planeY-26}) rotate(${angle})" filter="url(#planeShadow)">
      <text text-anchor="middle" font-size="48">✈️</text>
    </g>
  </svg>`
}

function render(){
  setHeader();
  const c=$('#moduleContent'); if(!c)return;
  const h=heroData(),t=totals();
  const milestoneItems=visible().slice(0,3).map(g=>{
    const current=progressFor(g.business),pct=Math.min(100,Math.round(current/Math.max(1,Number(g.target))*100));
    const done=current>=Number(g.target),active=!done&&sortedFor(g.business).find(x=>progressFor(g.business)<Number(x.target))?.id===g.id;
    return `<article class="sj-list-goal ${done?'done':active?'active':'locked'}" data-goal-card="${g.id}">
      <div class="sj-list-thumb"><span>${esc(g.icon||'✈️')}</span></div>
      <div class="sj-list-main"><div class="sj-list-title"><div><h4>${esc(g.destination)}</h4><p>${esc(g.travelType||'Travel Goal')}</p></div><em>${done?'COMPLETED':active?'CURRENT':'LOCKED'}</em></div>
      <div class="sj-list-progress"><i style="width:${pct}%"></i></div>
      <div class="sj-list-meta"><span>${current.toLocaleString('en-IN')} / ${Number(g.target).toLocaleString('en-IN')} ${esc(g.metric)}</span><b>${pct}%</b></div>
      <small>${g.days||1} days · ${money(g.budget||0)} budget</small></div>
      <button class="sj-kebab" data-edit-milestone="${g.id}" aria-label="Edit goal">⋮</button>
    </article>`
  }).join('');
  c.innerHTML=`<div class="sj-shell sj-reference-shell">
    <section class="sj-reference-hero">
      <div class="sj-reference-copy"><span class="sj-kicker">FOUNDER SUCCESS JOURNEY</span><h2>${esc(h.b)} Journey <span>✈</span></h2><p>Keep flying high! Every milestone brings you closer to your next dream destination.</p></div>
      <div class="sj-reference-actions"><button class="sj-btn ghost" data-journey-settings>⚙ Journey Settings</button><button class="sj-btn light" data-update-progress>Update Progress</button></div>
      <div class="sj-reference-progress"><span>CURRENT PROGRESS</span><b>${h.pct}%</b><div><i style="width:${h.pct}%"></i></div><small>${h.current.toLocaleString('en-IN')} / ${Number(h.next?.target||0).toLocaleString('en-IN')} ${esc(h.next?.metric||'progress')} Completed</small></div>
      <div class="sj-reference-next"><small>NEXT DESTINATION</small><strong>${esc(h.next?.destination||'Add a goal')}</strong><span>${h.next?.days||1} days remaining</span><span>${money(h.next?.budget||0)} budget</span><button class="sj-btn" data-journey-settings>View Details</button></div>
      <div class="sj-reference-map">${routeSvg(h)}</div>
    </section>
    <div class="sj-toolbar sj-reference-toolbar"><div class="sj-filters">${filters()}<button class="add-business-chip" data-add-business>＋ Add Business</button></div><button class="sj-btn primary" data-new-milestone>＋ Add Destination</button></div>
    <div class="sj-stats sj-reference-stats"><article><div class="stat-icon">✈</div><div><span>Total Destinations</span><b>${t.goals}</b><small>All Businesses</small></div></article><article><div class="stat-icon success">✓</div><div><span>Completed</span><b>${t.done}</b><small>Destinations</small></div></article><article><div class="stat-icon violet">◷</div><div><span>Upcoming</span><b>${t.pending}</b><small>Destinations</small></div></article><article><div class="stat-icon gold">▣</div><div><span>Total Budget</span><b>${money(t.budget)}</b><small>Planned Travel</small></div></article><article><div class="stat-icon blue">↗</div><div><span>Overall Progress</span><b>${h.pct}%</b><small>${esc(h.b)}</small></div></article></div>
    <div class="sj-reference-lower">
      <section class="sj-panel sj-milestone-panel"><div class="sj-section-head"><div><span class="sj-kicker purple">JOURNEY MILESTONES</span><h3>${selected==='all'?'All Business Journeys':esc(selected)+' Journey'}</h3><p>See every travel goal, current progress and the next destination in one place.</p></div><button class="sj-compact-manage" data-journey-settings>Manage Goals</button></div><div class="sj-list-goals">${milestoneItems||'<div class="sj-empty">No destination goals yet.</div>'}</div><button class="sj-view-all" data-journey-settings>View all milestones →</button></section>
      <div class="sj-journey-side"><section class="sj-panel sj-reference-coach"><span class="sj-kicker purple">AI JOURNEY COACH</span><h3>${coach(h)}</h3><p class="sj-coach-summary">${coachDetail(h)}</p><div class="coach-tip"><b>Suggested action</b><span>${suggestion(h)}</span></div><div class="sj-coach-prediction"><small>At your current pace</small><strong>You can unlock ${esc(h.next?.destination||'your next trip')} sooner.</strong></div><div class="sj-coach-track"><i></i><i></i><i></i><i></i><i></i></div></section><section class="sj-panel sj-reference-quick"><div class="sj-section-head compact"><div><span class="sj-kicker purple">QUICK ACTIONS</span><h3>Manage your journey</h3><p>Update progress or add the next travel reward.</p></div></div><div class="sj-quick-grid"><button data-update-progress><b>↗</b><span><strong>Update Progress</strong><small>Change the current business achievement</small></span></button><button data-new-milestone><b>＋</b><span><strong>Add Destination</strong><small>Create a new travel milestone</small></span></button><button data-journey-settings><b>⚙</b><span><strong>Journey Settings</strong><small>Manage businesses, goals and targets</small></span></button></div></section></div>
    </div>
  </div>`;
  bind();
}
function coach(h){if(!h.next)return 'Build your first business travel journey';if(h.pct>=90)return `${h.next.destination} is ready for landing`;if(h.pct>=60)return `The flight to ${h.next.destination} is ahead of schedule`;if(h.pct>=25)return `Momentum is building toward ${h.next.destination}`;return `Your flight to ${h.next.destination} has taken off`}
function coachDetail(h){if(!h.next)return 'Create a business, choose a metric, set a target and attach a destination.';return `${h.b} needs ${Math.max(0,Number(h.next.target)-h.current).toLocaleString('en-IN')} more ${String(h.next.metric).toLowerCase()} to unlock the ${h.next.days||1}-day ${h.next.travelType||'trip'}.`}
function suggestion(h){if(!h.next)return 'Start with a milestone reachable in 30–90 days.';if(h.pct<40)return 'Split the target into weekly mini-goals and link them to your work plan.';if(h.pct<80)return 'Keep the current pace and review the progress every week.';return 'Start planning travel dates and reserve the reward budget.'}
function modal(title,subtitle,body,onSave,wide=false){$('#journeyModal')?.remove();const m=document.createElement('div');m.id='journeyModal';m.className='modal';m.innerHTML=`<form id="journeyForm" class="modal-card entity-form ${wide?'journey-wide':''}"><div class="modal-fixed-head"><button type="button" class="modal-close" data-close>×</button><span class="pill">SUCCESS JOURNEY</span><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div><div class="entity-fields">${body}</div><div class="form-actions"><button type="button" class="btn secondary" data-close>Cancel</button><button class="btn primary" type="submit">Save Changes</button></div></form>`;document.body.appendChild(m);$$('[data-close]',m).forEach(x=>x.onclick=()=>m.remove());$('#journeyForm').onsubmit=e=>{e.preventDefault();const o={};new FormData(e.currentTarget).forEach((v,k)=>{if(o[k])o[k]=[].concat(o[k],v);else o[k]=v});onSave(o);save();m.remove();render();notify('Success Journey saved')}}
function businessOptions(current=''){return businesses().map(b=>`<option ${b===current?'selected':''}>${esc(b)}</option>`).join('')}
function goalModal(id){const x=state.milestones.find(v=>v.id===id)||{};modal(id?'Edit Destination Goal':'Add Destination Goal','Set the business metric, target and travel destination.',`<div class="journey-form-grid"><label>Business<select name="business" required>${businessOptions(x.business)}</select></label><label>Metric<select name="metric"><option ${x.metric==='Sales'?'selected':''}>Sales</option><option ${x.metric==='Orders'?'selected':''}>Orders</option><option ${x.metric==='Projects'?'selected':''}>Projects</option><option ${x.metric==='Clients'?'selected':''}>Clients</option><option ${x.metric==='Revenue'?'selected':''}>Revenue</option><option ${x.metric==='Profit'?'selected':''}>Profit</option><option ${x.metric==='Custom'?'selected':''}>Custom</option></select></label><label>Target<input name="target" type="number" min="1" value="${x.target||100}" required></label><label>Destination<input name="destination" value="${esc(x.destination||'')}" placeholder="Pune" required></label><label>Starting City<input name="origin" value="${esc(x.origin||'Kolkata')}" placeholder="Kolkata"></label><label>Trip Type<input name="travelType" value="${esc(x.travelType||'Weekend Trip')}"></label><label>Travel Days<input name="days" type="number" min="1" value="${x.days||2}"></label><label>Budget<input name="budget" type="number" min="0" value="${x.budget||0}"></label><label>Destination Icon<input name="icon" value="${esc(x.icon||'✈️')}" maxlength="8"></label><label class="full">Notes<textarea name="notes" rows="3">${esc(x.notes||'')}</textarea></label></div>`,o=>{const val={...x,id:x.id||Date.now(),business:o.business,metric:o.metric,target:Number(o.target),destination:o.destination,origin:o.origin,travelType:o.travelType,days:Number(o.days),budget:Number(o.budget),icon:o.icon||'✈️',notes:o.notes,status:'Active'};if(id)Object.assign(x,val);else state.milestones.push(val)})}
function progressModal(){modal('Update Business Progress','Enter the latest achieved value for each business.',`<div class="progress-settings">${businesses().map(b=>`<label><span><b>${esc(b)}</b><small>${esc(sortedFor(b)[0]?.metric||'Progress')}</small></span><input name="p_${encodeURIComponent(b)}" type="number" min="0" value="${progressFor(b)}"></label>`).join('')}</div>`,o=>{businesses().forEach(b=>{const old=progressFor(b),nv=Number(o['p_'+encodeURIComponent(b)]||0);state.progress[b]=nv;const unlocked=sortedFor(b).find(x=>old<Number(x.target)&&nv>=Number(x.target));if(unlocked)setTimeout(()=>celebrate(unlocked),250)})})}
function addBusiness(){modal('Add Business','Create a business and immediately start its travel journey.',`<div class="journey-form-grid"><label>Business Name<input name="name" required placeholder="YOLOX"></label><label>Business Type<select name="type"><option>E-commerce</option><option>Digital Agency</option><option>Fashion</option><option>Education</option><option>Service</option><option>Other</option></select></label><label class="full">Description<textarea name="description" rows="3" placeholder="Short business description"></textarea></label></div>`,o=>{const c=core();c.businesses=c.businesses||[];if(c.businesses.some(b=>String(b.name).toLowerCase()===String(o.name).toLowerCase()))return;c.businesses.push({id:Date.now(),name:o.name,type:o.type,description:o.description,status:'Active'});saveCore(c);state.progress[o.name]=0;selected=o.name})}
function settingsModal(){const rows=state.milestones.filter(x=>x.status!=='Archived').sort((a,b)=>a.business.localeCompare(b.business)||a.target-b.target);modal('Journey Settings','Manage businesses, current progress, targets and destination order.',`<div class="journey-settings-top"><button type="button" class="sj-btn primary" data-settings-add-business>＋ Add Business</button><button type="button" class="sj-btn" data-settings-add-goal>＋ Add Destination</button></div><div class="settings-business-list">${businesses().map(b=>`<div class="settings-business-row"><div><b>${esc(b)}</b><small>${sortedFor(b).length} destinations · ${progressFor(b).toLocaleString('en-IN')} current progress</small></div><button type="button" data-settings-progress="${esc(b)}">Update</button></div>`).join('')}</div><div class="settings-goal-table"><div class="settings-row head"><span>Business</span><span>Target</span><span>Destination</span><span>Budget</span><span>Action</span></div>${rows.map(x=>`<div class="settings-row"><span><b>${esc(x.business)}</b></span><span>${Number(x.target).toLocaleString('en-IN')} ${esc(x.metric)}</span><span>${esc(x.destination)}</span><span>${money(x.budget)}</span><span><button type="button" data-settings-edit="${x.id}">Edit</button></span></div>`).join('')}</div>`,()=>{},true);setTimeout(()=>{$('[data-settings-add-business]')?.addEventListener('click',()=>{$('#journeyModal').remove();addBusiness()});$('[data-settings-add-goal]')?.addEventListener('click',()=>{$('#journeyModal').remove();goalModal()});$$('[data-settings-edit]').forEach(b=>b.onclick=()=>{$('#journeyModal').remove();goalModal(Number(b.dataset.settingsEdit))});$$('[data-settings-progress]').forEach(b=>b.onclick=()=>{$('#journeyModal').remove();selected=b.dataset.settingsProgress;progressModal()})},0)}
function memoryModal(id){const g=state.milestones.find(x=>x.id===id);if(!g)return;modal('Add Travel Memory','Save the celebration after reaching this destination.',`<div class="journey-form-grid"><label>Date<input name="date" type="date" value="${new Date().toISOString().slice(0,10)}"></label><label>Trip Expense<input name="expense" type="number" min="0"></label><label class="full">Memory Notes<textarea name="notes" rows="4"></textarea></label></div>`,o=>state.memories.unshift({id:Date.now(),business:g.business,destination:g.destination,date:o.date,expense:Number(o.expense||0),notes:o.notes}))}
function celebrate(g){const w=document.createElement('div');w.className='success-celebration';w.innerHTML=`${Array.from({length:36},(_,i)=>`<i class="confetti" style="left:${(i*41)%100}%;animation-delay:${(i%9)*.12}s;background:${['#ffc229','#7628df','#30b77a','#ff5870'][i%4]}"></i>`).join('')}<div class="success-celebration-card"><div class="big-plane">✈️</div><h2>${esc(g.destination)} Unlocked!</h2><p>${Number(g.target).toLocaleString('en-IN')} ${esc(g.metric)} achieved for ${esc(g.business)}.</p><button class="sj-btn primary" data-close-celebration>Continue Journey</button></div>`;document.body.appendChild(w);$('[data-close-celebration]',w).onclick=()=>w.remove()}
function bind(){
  $$('[data-journey-business]').forEach(b=>b.onclick=()=>{selected=b.dataset.journeyBusiness;render()});
  $$('[data-journey-settings]').forEach(b=>b.onclick=e=>{e.preventDefault();settingsModal()});
  $$('[data-new-milestone]').forEach(b=>b.onclick=e=>{e.preventDefault();goalModal()});
  $$('[data-update-progress]').forEach(b=>b.onclick=e=>{e.preventDefault();progressModal()});
  $$('[data-add-business]').forEach(b=>b.onclick=e=>{e.preventDefault();addBusiness()});
  $$('[data-edit-milestone]').forEach(b=>b.onclick=e=>{e.stopPropagation();goalModal(Number(b.dataset.editMilestone))});
  $$('[data-archive-milestone]').forEach(b=>b.onclick=e=>{e.stopPropagation();const x=state.milestones.find(v=>v.id===Number(b.dataset.archiveMilestone));if(x)x.status='Archived';save();render();notify('Travel goal archived')});
  $$('[data-add-memory]').forEach(b=>b.onclick=e=>{e.stopPropagation();memoryModal(Number(b.dataset.addMemory))});
  $$('[data-goal-card]').forEach(b=>b.onclick=()=>{const id=Number(b.dataset.goalCard);const g=state.milestones.find(x=>x.id===id);if(g){selected=g.business;render()}})
}
function route(page){if(page!=='success-journey')return false;setTimeout(render,0);return true}
document.addEventListener('click',e=>{const b=e.target.closest('.journey-nav');if(b){setTimeout(()=>{setHeader();render()},20);return;} const nav=e.target.closest('[data-page], .nav-item'); if(nav&&!nav.classList.contains('journey-nav')) document.body.classList.remove('success-journey-active');},true);
window.SBXSuccessJourney={render,route};
})();
