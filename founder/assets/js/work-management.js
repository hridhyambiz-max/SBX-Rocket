(()=>{

function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function fieldOptions(items,current){return items.map(v=>`<option ${String(v)===String(current)?'selected':''}>${esc(v)}</option>`).join('')}

function founderData(){
 try{return JSON.parse(localStorage.getItem('sbxRocketPremiumDataV2')||'{}')||{}}catch(e){return {}}
}
function activeFounderEmployees(){return (founderData().employees||[]).filter(e=>(e.status||'Active')!=='Disabled')}
function founderDepartments(){
 const d=founderData();
 const names=[...(d.departments||[]).map(x=>x.name),...(d.employees||[]).map(x=>x.department)];
 return [...new Set(names.filter(Boolean))];
}
function founderRoles(){
 const d=founderData();
 const names=[...(d.roles||[]).map(x=>x.name),...(d.employees||[]).map(x=>x.role)];
 return [...new Set(names.filter(Boolean))];
}
function founderBusinesses(){
 const d=founderData();
 return ['All Businesses',...(d.businesses||[]).filter(x=>(x.status||'Active')!=='Archived').map(x=>x.name)];
}
function employeeOptions(current='',dept='',role=''){
 let rows=activeFounderEmployees().filter(e=>(!dept||dept==='All Departments'||e.department===dept)&&(!role||role==='Auto Assigned'||e.role===role));
 if(!rows.length) rows=activeFounderEmployees();
 return `<option value="">Select employee</option>`+rows.map(e=>`<option value="${esc(e.name)}" ${e.name===current?'selected':''}>${esc(e.name)}${e.employeeId?' · '+esc(e.employeeId):''}</option>`).join('');
}
function resolveWorkflowAssignee(st,workflow){
 const employees=activeFounderEmployees();
 const eligible=employees.filter(e=>(!st.dept||e.department===st.dept)&&(!st.role||st.role==='Auto Assigned'||e.role===st.role));
 if(st.assignBy==='Specific employee') return st.employee||'Unassigned';
 if(st.assignBy==='Department lead'){
  const lead=employees.find(e=>e.department===st.dept&&/lead|manager|head/i.test(e.role||''));
  return (lead||eligible[0]||employees.find(e=>e.department===st.dept)||{}).name||'Unassigned';
 }
 if(st.assignBy==='Reporting manager'){
  const mgr=employees.find(e=>/manager|founder|admin/i.test(e.role||''));return (mgr||eligible[0]||{}).name||'Unassigned';
 }
 if(st.assignBy==='Least workload'){
  const pool=eligible.length?eligible:employees;
  return (pool.slice().sort((a,b)=>tasks.filter(t=>t.assignee===a.name&&t.status!=='Completed').length-tasks.filter(t=>t.assignee===b.name&&t.status!=='Completed').length)[0]||{}).name||'Unassigned';
 }
 if(st.assignBy==='Round robin'){
  const pool=eligible.length?eligible:employees;if(!pool.length)return 'Unassigned';
  const idx=(workflow.runs||0)%pool.length;return pool[idx].name;
 }
 return (eligible[0]||employees.find(e=>e.department===st.dept)||{}).name||st.role||'Unassigned';
}

function openWMForm({title,subtitle='Complete the details below.',saveText='Save',fields,onSave}){
 let old=document.getElementById('wmFormModal'); if(old) old.remove();
 let modal=document.createElement('div'); modal.id='wmFormModal'; modal.className='wm-form-modal';
 modal.innerHTML=`<div class="wm-form-dialog"><div class="wm-form-head"><div><span>Create</span><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div><button type="button" class="wm-form-close">×</button></div><form id="wmDynamicForm"><div class="wm-form-body">${fields}</div><div class="wm-form-foot"><button type="button" class="wm-btn wm-cancel">Cancel</button><button class="wm-btn primary" type="submit">${esc(saveText)}</button></div></form></div>`;
 document.body.appendChild(modal); document.body.classList.add('wm-modal-open');
 const close=()=>{modal.remove();document.body.classList.remove('wm-modal-open')};
 modal.querySelector('.wm-form-close').onclick=close; modal.querySelector('.wm-cancel').onclick=close; modal.onclick=e=>{if(e.target===modal)close()};
 modal.querySelector('form').onsubmit=e=>{e.preventDefault();let fd=new FormData(e.currentTarget),obj=Object.fromEntries(fd.entries());if(onSave(obj)!==false)close()};
 setTimeout(()=>modal.querySelector('input,select,textarea')?.focus(),20);
}
function templateForm(t={},index=-1){
 const depts=['Creative','Marketing','Sales','Technology','Finance','Operations','HR','General'];
 const roles=['Graphic Designer','Marketing Executive','Sales Executive','Web Developer','Finance Executive','Founder','Employee'];
 const businesses=['All Businesses','SBX Media','Sandbox Media','Sia Jewels','YOLOX'];
 openWMForm({title:index>=0?'Edit Task Template':'Add Task Template',subtitle:'Create a reusable task blueprint for your team.',saveText:index>=0?'Update Template':'Save Template',fields:`
 <div class="wm-form-grid"><label>Task name<input name="name" required value="${esc(t.name||'')}"></label><label>Task code<input name="id" required value="${esc(t.id||('TASK-'+String(templates.length+1).padStart(3,'0')))}"></label>
 <label>Department<select name="dept">${fieldOptions(depts,t.dept||'Creative')}</select></label><label>Role<select name="role">${fieldOptions(roles,t.role||'Graphic Designer')}</select></label>
 <label>Business<select name="business">${fieldOptions(businesses,t.business||'All Businesses')}</select></label><label>Priority<select name="priority">${fieldOptions(['High','Medium','Low'],t.priority||'Medium')}</select></label>
 <label>Due rule<select name="due">${fieldOptions(['Today','Tomorrow','This Week','Next Week','Monthly'],t.due||'Today')}</select></label><label>Status<select name="status">${fieldOptions(['Backlog','In Progress','Review','Active','Archived'],t.status||'Backlog')}</select></label>
 <label class="full">Description<textarea name="description" rows="3">${esc(t.description||'')}</textarea></label></div>`,onSave:o=>{if(!o.name.trim()||!o.id.trim())return false;let duplicate=templates.findIndex((x,j)=>x.id.toLowerCase()===o.id.trim().toLowerCase()&&j!==index);if(duplicate>=0){alert('Task code already exists.');return false}let n={...t,...o,name:o.name.trim(),id:o.id.trim()};index>=0?templates[index]=n:templates.unshift(n);save();renderLibrary();}})
}
function workflowForm(){openWMForm({title:'Create Workflow',subtitle:'Build an automated workflow for a repeatable process.',saveText:'Create Workflow',fields:`<div class="wm-form-grid"><label>Workflow name<input name="name" required></label><label>Trigger<select name="trigger">${fieldOptions(['Manual trigger','Employee added','Task completed','Product approved','Month end'],'Manual trigger')}</select></label><label>Business<select name="business">${fieldOptions(['All Businesses','SBX Media','Sandbox Media','Sia Jewels'],'All Businesses')}</select></label><label>Number of steps<input type="number" min="1" max="20" name="steps" value="4"></label><label>Status<select name="status">${fieldOptions(['Draft','Active'],'Draft')}</select></label></div>`,onSave:o=>{const count=Math.max(1,+o.steps||4);workflows.unshift({id:'WF-'+Date.now(),name:o.name,trigger:o.trigger,business:o.business,steps:count,runs:0,status:o.status,stepDetails:Array.from({length:count},(_,i)=>workflowStepFromTemplate({},i))});save();renderWorkflow();}})}
function generatedTaskForm(){openWMForm({title:'Generate Task',subtitle:'Create an actual task and assign it to your team.',saveText:'Generate Task',fields:`<div class="wm-form-grid"><label>Task name<input name="name" required></label><label>Assignee<input name="assignee" placeholder="Employee name" value="Priya Sharma"></label><label>Business<select name="business">${fieldOptions(['All Businesses','SBX Media','Sandbox Media','Sia Jewels'],'All Businesses')}</select></label><label>Department<select name="dept">${fieldOptions(['Creative','Marketing','Sales','Technology','Finance','Operations'],'Creative')}</select></label><label>Priority<select name="priority">${fieldOptions(['High','Medium','Low'],'Medium')}</select></label><label>Status<select name="status">${fieldOptions(['Backlog','In Progress','Review','Completed'],'Backlog')}</select></label><label>Due date<input type="date" name="due"></label></div>`,onSave:o=>{tasks.unshift({id:'GEN-'+Date.now(),name:o.name,assignee:o.assignee||'Unassigned',business:o.business,dept:o.dept,role:'Employee',priority:o.priority,status:o.status,due:o.due||'Today'});save();renderGenerated(false);}})}
function eventForm(prefillDate=''){
 const defaultDate=prefillDate||new Date().toISOString().slice(0,10);
 openWMForm({title:'Add Calendar Item',subtitle:'Add a task deadline, meeting, holiday, festival, leave, birthday or reminder.',saveText:'Add to Calendar',fields:`<div class="wm-form-grid">
 <label>Title<input name="name" required></label><label>Type<select name="type">${fieldOptions(['Meeting','Holiday','Festival','Leave','Birthday','Reminder','Workflow','Task'],'Meeting')}</select></label>
 <label>Date<input type="date" name="due" value="${esc(defaultDate)}" required></label><label>Time<input type="time" name="time"></label>
 <label>Business<select name="business">${fieldOptions(founderBusinesses(),'All Businesses')}</select></label><label>Owner / Employee<select name="assignee"><option>Founder</option><option>All Team</option>${activeFounderEmployees().map(e=>`<option>${esc(e.name)}</option>`).join('')}</select></label>
 <label>Repeat<select name="recurrence">${fieldOptions(['None','Daily','Weekly','Monthly','Yearly'],'None')}</select></label><label>Status<select name="status">${fieldOptions(['Scheduled','Confirmed','Tentative'],'Scheduled')}</select></label>
 <label class="full">Notes<textarea name="description" rows="3"></textarea></label></div>`,onSave:o=>{calendarEvents.unshift({id:'CAL-'+Date.now(),...o});save();renderCalendar();}})
}

const sampleTemplates=[
{id:'GFX-SM-001',name:'Design Instagram Feed Post',dept:'Creative',role:'Graphic Designer',business:'All Businesses',priority:'High',due:'Today',status:'Backlog'},
{id:'GFX-SM-002',name:'Design Instagram Carousel',dept:'Creative',role:'Graphic Designer',business:'All Businesses',priority:'High',due:'Today',status:'In Progress'},
{id:'GFX-SM-003',name:'Design Instagram Story',dept:'Creative',role:'Graphic Designer',business:'All Businesses',priority:'Medium',due:'Tomorrow',status:'Backlog'},
{id:'GFX-SM-004',name:'Design Instagram Reel Cover',dept:'Creative',role:'Graphic Designer',business:'All Businesses',priority:'High',due:'May 30',status:'Blocked'},
{id:'SAL-CL-001',name:'Client Discovery Call',dept:'Sales',role:'Sales Executive',business:'SBX Media',priority:'High',due:'Yesterday',status:'Overdue'},
{id:'WEB-DEV-003',name:'Develop Landing Page',dept:'Technology',role:'Web Developer',business:'SBX Media',priority:'High',due:'May 30',status:'In Progress'},
{id:'MKT-PLN-009',name:'Monthly Content Calendar',dept:'Marketing',role:'Marketing Executive',business:'All Businesses',priority:'Medium',due:'Jun 1',status:'Review'},
{id:'FIN-REP-006',name:'Monthly P&L Report',dept:'Finance',role:'Finance Executive',business:'All Businesses',priority:'High',due:'Jun 5',status:'Backlog'}];
let workflows=JSON.parse(localStorage.getItem('sbx_wm_workflows')||'null')||[
{id:'WF-001',name:'New Employee Onboarding',trigger:'Employee added',business:'All Businesses',steps:6,runs:12,status:'Active'},
{id:'WF-002',name:'New Product Launch',trigger:'Product approved',business:'All Businesses',steps:6,runs:28,status:'Active'},
{id:'WF-003',name:'New Client Onboarding',trigger:'Advance received',business:'All Businesses',steps:6,runs:19,status:'Active'},
{id:'WF-004',name:'Monthly Finance Closing',trigger:'Month end',business:'All Businesses',steps:6,runs:8,status:'Active'},
{id:'WF-005',name:'Customer Complaint Resolution',trigger:'Ticket created',business:'All Businesses',steps:6,runs:34,status:'Active'},
{id:'WF-006',name:'Employee Exit Process',trigger:'Exit approved',business:'All Businesses',steps:5,runs:3,status:'Draft'}];
const readyTemplates=[['Employee Onboarding','HR','10 steps','♟'],['New Product Launch','E-commerce','14 steps','▰'],['Client Onboarding','Agency','11 steps','◎'],['Content Production','Marketing','8 steps','▣'],['Order Processing','Operations','10 steps','□'],['Monthly Finance Closing','Finance','9 steps','₹']];
let templates=JSON.parse(localStorage.getItem('sbx_wm_templates')||'null')||sampleTemplates;
let tasks=JSON.parse(localStorage.getItem('sbx_wm_tasks')||'null')||templates.map((t,i)=>({...t,assignee:['Priya Sharma','Rohit Kumar','Priya Sharma','Priya Sharma','Neha Gupta','Vikash Singh'][i%6]}));
let calendarEvents=JSON.parse(localStorage.getItem('sbx_wm_calendar_events')||'null')||[
{id:'CAL-1',name:'Weekly Team Meeting',type:'Meeting',due:'2026-07-17',time:'11:00',business:'All Businesses',assignee:'Founder',description:'Weekly priorities and blockers.',recurrence:'Weekly'},
{id:'CAL-2',name:'Priya Leave',type:'Leave',due:'2026-07-20',time:'',business:'Sandbox Media',assignee:'Priya Singh',description:'Approved leave.',recurrence:'None'},
{id:'CAL-3',name:'Company Foundation Day',type:'Festival',due:'2026-07-24',time:'',business:'All Businesses',assignee:'All Team',description:'Internal company celebration.',recurrence:'Yearly'}
];
let calendarCursor=new Date();
let calendarView='month';
let calendarFilters=new Set(['Task','Meeting','Holiday','Festival','Leave','Birthday','Reminder','Workflow']);
const save=()=>{localStorage.setItem('sbx_wm_templates',JSON.stringify(templates));localStorage.setItem('sbx_wm_tasks',JSON.stringify(tasks));localStorage.setItem('sbx_wm_workflows',JSON.stringify(workflows));localStorage.setItem('sbx_wm_calendar_events',JSON.stringify(calendarEvents));updateBadges();};
function normalizeStatus(status){return ({'To Do':'Backlog','Done':'Completed'}[status]||status||'Backlog')}
function fromFounderTask(t){return {id:'F-'+String(t.id),sourceId:String(t.id),name:t.name||'Untitled Task',dept:t.department||'General',role:t.role||'',business:t.business||'All Businesses',priority:t.priority||'Medium',due:t.due||'Today',status:normalizeStatus(t.status),assignee:t.assignee||'Unassigned',createdAt:t.createdAt||Date.now(),updatedAt:t.updatedAt||Date.now()}}
function updateBadges(){let generated=document.querySelector('.wm-nav[data-page="generated-tasks"] b'),mine=document.querySelector('.wm-nav[data-page="my-tasks"] b');if(generated)generated.textContent=tasks.filter(t=>t.status!=='Completed').length;if(mine)mine.textContent=tasks.filter(t=>t.assignee&&t.assignee!=='Unassigned'&&t.status!=='Completed').length}
function currentWorkPage(){return document.querySelector('.wm-nav.active')?.dataset.page||''}
function refreshCurrent(){let p=currentWorkPage();if(p)route(p)}
window.SBXWorkManagement={upsertTask(task){let n=fromFounderTask(task),i=tasks.findIndex(x=>String(x.sourceId)===String(task.id)||x.id===n.id);if(i>=0)tasks[i]={...tasks[i],...n};else tasks.unshift(n);save();refreshCurrent();},getTasks(){return tasks.slice()},refresh(){refreshCurrent()}};
save();
const gp=()=>document.getElementById('genericPage'), mc=()=>document.getElementById('moduleContent');
function head(title,sub,actions=''){document.getElementById('dashboard').classList.remove('active');gp().classList.add('active');document.getElementById('pageTitle').textContent=title;document.getElementById('pageSubtitle').textContent=sub;document.getElementById('moduleTitle').textContent=title;document.getElementById('moduleDescription').textContent=sub;document.getElementById('toolbarActions').innerHTML=actions;}
const count=s=>tasks.filter(t=>t.status===s).length;
function renderDash(){
 head('Work Dashboard','Complete work management overview');
 const total=tasks.length, inProgress=count('In Progress'), completed=count('Completed'), overdue=tasks.filter(t=>t.status==='Overdue'||t.due==='Yesterday').length;
 mc().innerHTML=`
 <div class="wm-kpis dashboard-kpis">
 ${[['Total Tasks',total,'▣','purple','↑ 18% from yesterday'],['In Progress',inProgress,'↻','amber','↑ 12% from yesterday'],['Completed',completed,'✓','green','↑ 18% from yesterday'],['Overdue',overdue,'◷','red','↓ 8% from yesterday'],['Team Members',3,'♟','purple','3 active members'],['Workflows',workflows.length,'▰','blue',workflows.filter(w=>w.status==='Active').length+' active workflows']].map(x=>`<div class="wm-stat"><div><small>${x[0]}</small><strong>${x[1]}</strong><span>${x[4]}</span></div><i class="${x[3]}">${x[2]}</i></div>`).join('')}</div>
 <div class="wm-dashboard-row wm-dashboard-main">
   <section class="wm-panel wm-line-panel"><div class="wm-panel-head"><div><h3>Task Overview</h3><small>Weekly progress across all tasks</small></div><select><option>This Week</option><option>This Month</option></select></div>
   <svg class="wm-line-chart" viewBox="0 0 650 245" preserveAspectRatio="none"><g class="grid"><line x1="35" y1="45" x2="630" y2="45"/><line x1="35" y1="95" x2="630" y2="95"/><line x1="35" y1="145" x2="630" y2="145"/><line x1="35" y1="195" x2="630" y2="195"/></g><polyline class="line green" points="35,180 120,160 205,105 290,150 375,120 460,165 545,205"/><polyline class="line purple" points="35,205 120,180 205,145 290,165 375,140 460,180 545,195"/><polyline class="line orange" points="35,225 120,205 205,220 290,190 375,215 460,200 545,215"/></svg>
   <div class="wm-legend"><span class="green-dot">Completed</span><span class="purple-dot">In Progress</span><span class="orange-dot">Pending</span></div></section>
   <section class="wm-panel wm-priority-panel"><div class="wm-panel-head"><div><h3>Tasks by Priority</h3><small>Current workload mix</small></div></div><div class="wm-donut-wrap"><div class="wm-donut"><div><b>${total}</b><span>Total</span></div></div><div class="wm-priority-list"><p><i class="dot high"></i>High <b>${tasks.filter(t=>t.priority==='High').length}</b></p><p><i class="dot med"></i>Medium <b>${tasks.filter(t=>t.priority==='Medium').length}</b></p><p><i class="dot low"></i>Low <b>${tasks.filter(t=>t.priority==='Low').length}</b></p><p><i class="dot back"></i>Backlog <b>${count('Backlog')}</b></p></div></div></section>
   <section class="wm-panel wm-activity-panel"><div class="wm-panel-head"><div><h3>Recent Activity</h3><small>Latest workspace changes</small></div><button class="wm-link-btn">View All</button></div><div class="wm-activity-list">${[['New task created','Design Instagram Post','2 min','purple'],['Task completed','Website Landing Page','15 min','green'],['Team member joined','Priya joined Creative team','1 hour','blue'],['Workflow updated','SBX Media Website','2 hours','amber'],['Task overdue','Client Follow-up Call','3 hours','red']].map(a=>`<div class="wm-activity"><i class="${a[3]}"></i><div><b>${a[0]}</b><span>${a[1]}</span></div><small>${a[2]}</small></div>`).join('')}</div></section>
 </div>
 <div class="wm-dashboard-row wm-dashboard-secondary">
   <section class="wm-panel"><div class="wm-panel-head"><div><h3>Today’s Top Tasks</h3><small>Tasks requiring attention</small></div><button class="wm-link-btn" data-nav-page="generated-tasks">View All</button></div><div class="wm-top-list">${tasks.slice(0,5).map(t=>`<div><span class="check"></span><b>${t.name}</b><em class="wm-badge ${t.priority==='High'?'wm-high':'wm-medium'}">${t.priority}</em><small>${t.due}</small></div>`).join('')}</div></section>
   <section class="wm-panel"><div class="wm-panel-head"><div><h3>Task Status Distribution</h3><small>Live status breakdown</small></div></div>${[['Completed',completed,'green'],['In Progress',inProgress,'blue'],['Pending',count('Backlog'),'purple'],['Overdue',overdue,'red']].map(s=>`<div class="wm-progress-row"><span>${s[0]}</span><div><i class="${s[2]}" style="width:${Math.min(100,(s[1]/Math.max(1,total))*100)}%"></i></div><b>${s[1]}</b></div>`).join('')}</section>
   <section class="wm-panel"><div class="wm-panel-head"><div><h3>Upcoming Deadlines</h3><small>Next important dates</small></div></div><div class="wm-deadlines">${tasks.slice(0,4).map((t,i)=>`<div><i class="${['green','amber','purple','blue'][i]}">${['▰','◉','♟','□'][i]}</i><div><b>${t.name}</b><span>${t.due}</span></div><em>${i+2} days</em></div>`).join('')}</div></section>
   <section class="wm-panel"><div class="wm-panel-head"><div><h3>Quick Actions</h3><small>Create and manage work</small></div></div><div class="wm-quick-grid"><button data-action="add-task">＋<span>Add Task</span></button><button data-nav-page="workflow-builder">▰<span>Workflow</span></button><button data-nav-page="task-library">▦<span>Library</span></button><button data-nav-page="calendar">□<span>Calendar</span></button><button data-nav-page="generated-tasks">⇄<span>Board</span></button><button data-nav-page="my-tasks">♟<span>My Tasks</span></button></div></section>
 </div>
 <section class="wm-panel wm-recent-table"><div class="wm-panel-head"><div><h3>Recent Tasks</h3><small>Latest work items across businesses</small></div></div>${table(tasks.slice(0,7))}</section>`;
 bindDashboardActions();
}
function bindDashboardActions(){document.querySelectorAll('[data-nav-page]').forEach(b=>b.onclick=()=>{document.querySelector(`.wm-nav[data-page="${b.dataset.navPage}"]`)?.click()});document.querySelectorAll('[data-action="add-task"]').forEach(b=>b.onclick=()=>{tasks.push({...templates[0],id:'GEN-'+Date.now().toString().slice(-5),assignee:'Unassigned',status:'Backlog'});save();renderDash();});}
function table(rows){return `<div class="wm-table-wrap"><table class="wm-table"><thead><tr><th>Code</th><th>Task</th><th>Department</th><th>Role</th><th>Business</th><th>Priority</th><th>Due</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.map((t,i)=>`<tr><td>${t.id}</td><td><b>${t.name}</b></td><td>${t.dept}</td><td>${t.role}</td><td>${t.business}</td><td><span class="wm-badge ${t.priority==='High'?'wm-high':'wm-medium'}">${t.priority}</span></td><td>${t.due}</td><td><span class="status-pill ${t.status.toLowerCase().replaceAll(' ','-')}">${t.status}</span></td><td><button class="wm-btn" data-edit-template="${i}">Edit</button> <button class="wm-btn" data-generate="${i}">Generate</button></td></tr>`).join('')}</tbody></table></div>`}
function renderLibrary(){head('Master Task Library','Reusable task templates','<button class="wm-btn" id="wmExport">Export CSV</button><button class="wm-btn primary" id="wmAddTemplate">＋ Add Task</button>');mc().innerHTML=`<div class="wm-panel"><div class="wm-filters"><input id="wmSearch" placeholder="Search code, task, role, business..."><select><option>All Departments</option></select><select><option>All Priorities</option></select><select><option>All Status</option></select></div></div><div class="wm-panel" style="margin-top:14px"><h3>Task Templates</h3><div id="wmTable">${table(templates)}</div></div>`;document.getElementById('wmSearch').oninput=e=>{const q=e.target.value.toLowerCase();document.getElementById('wmTable').innerHTML=table(templates.filter(t=>Object.values(t).join(' ').toLowerCase().includes(q)))};document.getElementById('wmAddTemplate').onclick=()=>addTemplate();document.getElementById('wmExport').onclick=exportCSV;bindTable();}
function bindTable(){document.querySelectorAll('[data-generate]').forEach(b=>b.onclick=()=>{tasks.push({...templates[+b.dataset.generate],assignee:'Unassigned',status:'Backlog'});save();alert('Task generated successfully');});document.querySelectorAll('[data-edit-template]').forEach(b=>b.onclick=()=>addTemplate(+b.dataset.editTemplate));}
function addTemplate(i=-1){templateForm(i>=0?templates[i]:{},i)}
function exportCSV(){let csv='Code,Task,Department,Role,Business,Priority,Due,Status\n'+templates.map(t=>[t.id,t.name,t.dept,t.role,t.business,t.priority,t.due,t.status].join(',')).join('\n');let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='master-task-library.csv';a.click();}


const workflowStepSuggestions={
 'New Employee Onboarding':['Create Offer Letter','Collect Employee Documents','Sign NDA','Create Login & Tool Access','Department Introduction','Assign First Task'],
 'New Product Launch':['Product Research','Finalize Product Details','Product Photoshoot','Create Product Listing','Prepare Marketing Campaign','Launch Product'],
 'New Client Onboarding':['Confirm Advance Payment','Send Welcome Pack','Collect Client Requirements','Create Project Workspace','Assign Project Team','Schedule Kickoff Meeting'],
 'Monthly Finance Closing':['Collect Monthly Transactions','Reconcile Accounts','Verify Receivables & Payables','Prepare P&L Report','Founder Review','Close Month'],
 'Customer Complaint Resolution':['Receive Complaint','Investigate Issue','Assign Responsible Team','Resolve Complaint','Customer Confirmation','Close Ticket'],
 'Employee Exit Process':['Receive Exit Request','Manager Approval','Knowledge Handover','Revoke Access','Final Settlement']
};
function workflowStepFromTemplate(t={},i=0){
 return {
  taskName:t.taskName||t.name||'',
  dept:t.dept||'Operations',
  role:t.role||'Auto Assigned',
  employee:t.employee||'',
  sla:t.sla||(i===0?'30 Min':'1 Day'),
  priority:t.priority||'Medium',
  approval:t.approval||'No',
  approver:t.approver||'Founder',
  assignBy:t.assignBy||'Role based',
  startRule:t.startRule||(i===0?'Start immediately':'When previous step is completed'),
  delay:t.delay||'No delay',
  completionRule:t.completionRule||'Task marked completed',
  onComplete:t.onComplete||'Generate next step',
  notification:t.notification||'In-app notification',
  condition:t.condition||'Always run'
 };
}
function openWorkflowBuilder(index){
 const w=workflows[index]; if(!w) return;
 if(!Array.isArray(w.stepDetails)||!w.stepDetails.length){
   const suggested=workflowStepSuggestions[w.name]||[];
   w.stepDetails=Array.from({length:w.steps||Math.max(1,suggested.length||4)},(_,i)=>workflowStepFromTemplate({taskName:suggested[i]||''},i));
 } else w.stepDetails=w.stepDetails.map((st,i)=>workflowStepFromTemplate(st,i));
 let draft=JSON.parse(JSON.stringify(w));
 const old=document.getElementById('workflowBuilderModal'); if(old) old.remove();
 const modal=document.createElement('div'); modal.id='workflowBuilderModal'; modal.className='workflow-builder-modal structured-builder';
 const businessOptions=founderBusinesses();
 const triggerOptions=['Manual trigger','Employee added','Task completed','Product approved','Advance received','Month end','Ticket created'];
 const slaOptions=['15 Min','30 Min','1 Hour','2 Hours','4 Hours','1 Day','2 Days','3 Days'];
 const assignOptions=['Role based','Specific employee','Round robin','Least workload','Department lead','Reporting manager'];
 const startOptions=['Start immediately','When previous step is completed','After previous step approval','On a specific date'];
 const delayOptions=['No delay','15 Min','30 Min','1 Hour','4 Hours','1 Day','2 Days'];
 const completionOptions=['Task marked completed','Checklist completed','Approval received','All assignees complete'];
 const onCompleteOptions=['Generate next step','Generate next step and notify manager','Pause workflow','Complete workflow'];
 const notificationOptions=['In-app notification','Email + in-app','WhatsApp + in-app','No notification'];
 const conditionOptions=['Always run','Only for selected business','Only when priority is High','Only after approval'];
 const render=()=>{
   const departments=founderDepartments(); const roles=founderRoles();
   modal.innerHTML=`<div class="workflow-builder-dialog structured-dialog automation-dialog">
    <header class="workflow-builder-head compact"><div><span>Edit Visual Workflow</span><h2>${esc(draft.name)}</h2><p>Build an automatic department-to-department handoff.</p></div><button class="workflow-builder-close" type="button">×</button></header>
    <div class="structured-body">
      <section class="structured-top"><div class="wm-form-grid workflow-meta-grid">
        <label>Workflow Name<input id="wbName" value="${esc(draft.name)}"></label>
        <label>Business<select id="wbBusiness">${fieldOptions(businessOptions,draft.business)}</select></label>
        <label class="full">Description<input id="wbDescription" value="${esc(draft.description||'Reusable automated company workflow')}"></label>
        <label>Trigger<select id="wbTrigger">${fieldOptions(triggerOptions,draft.trigger)}</select></label>
        <label>Status<select id="wbStatus">${fieldOptions(['Draft','Active'],draft.status)}</select></label>
      </div></section>
      <section class="structured-canvas">
        <div class="structured-canvas-head"><div><h3>Workflow Canvas</h3><small>${draft.stepDetails.length} connected handoff steps</small></div><button class="wm-btn wb-add-step" type="button">＋ Add Step</button></div>
        <div class="workflow-explainer"><b>Automatic handoff:</b> employee completes the current task, then the next department and employee receive the next task automatically.</div>
        <div class="structured-step-list">${draft.stepDetails.map((st,i)=>`
          <article class="structured-step automation-step ${st.approval==='Yes'?'needs-approval':''}" data-step="${i}">
            <span class="structured-step-number">${i+1}</span><div class="structured-step-main">
              <div class="structured-step-top"><input class="workflow-task-name" data-field="taskName" value="${esc(st.taskName||'')}" placeholder="Write work / task name" autocomplete="off"><button type="button" class="step-remove" data-remove-step="${i}" ${draft.stepDetails.length<=1?'disabled':''}>×</button></div>
              <div class="step-handoff-label">${i===0?'Workflow starts here':'Assigned automatically after previous step'}</div>
              <div class="structured-fields automation-fields">
                <label>Department<select data-field="dept" class="wf-dept"><option value="">Select department</option>${fieldOptions(departments,st.dept)}</select></label>
                <label>Role<select data-field="role" class="wf-role"><option value="">Select role</option>${fieldOptions(roles,st.role)}</select></label>
                <label>Specific Employee<select data-field="employee" class="wf-employee">${employeeOptions(st.employee,st.dept,st.role)}</select></label>
                <label>Assign By<select data-field="assignBy">${fieldOptions(assignOptions,st.assignBy||'Role based')}</select></label>
                <label>SLA<select data-field="sla">${fieldOptions(slaOptions,st.sla||'30 Min')}</select></label>
                <label>Priority<select data-field="priority">${fieldOptions(['Low','Medium','High','Urgent'],st.priority||'Medium')}</select></label>
                <label>Start Rule<select data-field="startRule">${fieldOptions(startOptions,st.startRule||'When previous step is completed')}</select></label>
                <label>Delay<select data-field="delay">${fieldOptions(delayOptions,st.delay||'No delay')}</select></label>
                <label>Approval<select data-field="approval">${fieldOptions(['No','Yes'],st.approval||'No')}</select></label>
                <label>Approved By<select data-field="approver">${fieldOptions(['Founder','Manager','Department lead','Reporting manager'],st.approver||'Founder')}</select></label>
                <label>Completion Rule<select data-field="completionRule">${fieldOptions(completionOptions,st.completionRule||'Task marked completed')}</select></label>
                <label>On Complete<select data-field="onComplete">${fieldOptions(onCompleteOptions,st.onComplete||'Generate next step')}</select></label>
              </div>
              <details class="conditions-panel"><summary>Conditions & Notifications</summary><div class="condition-grid automation-condition-grid"><label>Run Condition<select data-field="condition">${fieldOptions(conditionOptions,st.condition||'Always run')}</select></label><label>Notify Via<select data-field="notification">${fieldOptions(notificationOptions,st.notification||'In-app notification')}</select></label></div></details>
            </div><div class="structured-step-move"><button type="button" data-move-up="${i}" ${i===0?'disabled':''}>↑</button><button type="button" data-move-down="${i}" ${i===draft.stepDetails.length-1?'disabled':''}>↓</button></div>
          </article>${i<draft.stepDetails.length-1?`<div class="structured-connector automation-connector"><span>↓</span><small>${esc(st.onComplete||'Generate next step')}</small></div>`:''}`).join('')}</div>
      </section>
    </div><footer class="workflow-builder-foot"><button type="button" class="wm-btn wb-cancel">Cancel</button><button type="button" class="wm-btn run wb-test">Test Run</button><button type="button" class="wm-btn primary wb-save">Save Workflow</button></footer></div>`;
   const syncTop=()=>{draft.name=modal.querySelector('#wbName').value.trim()||'Untitled Workflow';draft.business=modal.querySelector('#wbBusiness').value;draft.description=modal.querySelector('#wbDescription').value;draft.trigger=modal.querySelector('#wbTrigger').value;draft.status=modal.querySelector('#wbStatus').value};
   modal.querySelector('.workflow-builder-close').onclick=close; modal.querySelector('.wb-cancel').onclick=close;
   modal.querySelector('.wb-add-step').onclick=()=>{syncTop();draft.stepDetails.push(workflowStepFromTemplate({dept:'',role:''},draft.stepDetails.length));render()};
   modal.querySelectorAll('.structured-step').forEach(card=>{const i=+card.dataset.step;const dept=card.querySelector('.wf-dept'),role=card.querySelector('.wf-role'),emp=card.querySelector('.wf-employee');card.querySelectorAll('[data-field]').forEach(el=>{el.oninput=el.onchange=()=>{draft.stepDetails[i][el.dataset.field]=el.value;if(el===dept||el===role){emp.innerHTML=employeeOptions(draft.stepDetails[i].employee,dept.value,role.value);if(![...emp.options].some(o=>o.value===draft.stepDetails[i].employee)){draft.stepDetails[i].employee='';emp.value=''}}}})});
   modal.querySelectorAll('[data-move-up]').forEach(btn=>btn.onclick=()=>{syncTop();const i=+btn.dataset.moveUp;[draft.stepDetails[i-1],draft.stepDetails[i]]=[draft.stepDetails[i],draft.stepDetails[i-1]];render()});
   modal.querySelectorAll('[data-move-down]').forEach(btn=>btn.onclick=()=>{syncTop();const i=+btn.dataset.moveDown;[draft.stepDetails[i+1],draft.stepDetails[i]]=[draft.stepDetails[i],draft.stepDetails[i+1]];render()});
   modal.querySelectorAll('[data-remove-step]').forEach(btn=>btn.onclick=()=>{syncTop();draft.stepDetails.splice(+btn.dataset.removeStep,1);render()});
   modal.querySelector('.wb-test').onclick=()=>{syncTop();const tmp={...draft,id:draft.id||('WF-'+Date.now())};launchWorkflow(tmp,true);showWMToast('Test workflow started. First employee task generated.')};
   modal.querySelector('.wb-save').onclick=()=>{syncTop();if(draft.stepDetails.some(st=>!String(st.taskName||'').trim())){showWMToast('Write a work / task name for every workflow step.');return}if(draft.stepDetails.some(st=>!st.dept)){showWMToast('Select a department for every workflow step.');return}draft.steps=draft.stepDetails.length;workflows[index]=draft;save();close();renderWorkflow();showWMToast('Workflow saved successfully.')};
 };
 const close=()=>{modal.remove();document.body.classList.remove('wm-modal-open')};document.body.appendChild(modal);document.body.classList.add('wm-modal-open');modal.onclick=e=>{if(e.target===modal)close()};render();
}
function taskFromWorkflowStep(workflow,runId,stepIndex,isTest=false){
 const st=workflow.stepDetails[stepIndex];
 return {
  id:(isTest?'TEST-':'AUTO-')+Date.now()+'-'+stepIndex,
  name:(isTest?'Test: ':'')+(st.taskName||`Workflow step ${stepIndex+1}`),
  dept:st.dept||'Operations',role:st.role||'Employee',business:workflow.business||'All Businesses',
  priority:st.priority||'Medium',due:stepIndex===0?'Today':st.sla||'Next',status:'Backlog',
  assignee:resolveWorkflowAssignee(st,workflow),
  workflowId:workflow.id,workflowRunId:runId,workflowStepIndex:stepIndex,workflowStepCount:workflow.stepDetails.length,
  workflowApproval:st.approval||'No',workflowApprover:st.approver||'Founder',workflowOnComplete:st.onComplete||'Generate next step',
  workflowName:workflow.name,notification:st.notification||'In-app notification',isWorkflowTask:true
 };
}
function launchWorkflow(workflow,isTest=false){
 if(!workflow.stepDetails||!workflow.stepDetails.length){showWMToast('Open Builder and configure workflow steps first.');return}
 const runId='RUN-'+Date.now();
 tasks.unshift(taskFromWorkflowStep(workflow,runId,0,isTest));
 const original=workflows.find(x=>x.id===workflow.id);if(original)original.runs=(original.runs||0)+1;
 save();
}
function advanceWorkflowTask(task,approved=false){
 if(!task||!task.isWorkflowTask)return;
 const workflow=workflows.find(w=>w.id===task.workflowId);if(!workflow||!workflow.stepDetails)return;
 if(task.workflowApproval==='Yes'&&!approved){task.status='Review';showWMToast(`Submitted for approval to ${task.workflowApprover}.`);return}
 task.status='Completed';task.completedAt=Date.now();
 const nextIndex=(task.workflowStepIndex||0)+1;
 if(nextIndex>=workflow.stepDetails.length){task.workflowCompleted=true;showWMToast(`${workflow.name} workflow completed.`);return}
 if(tasks.some(t=>t.workflowRunId===task.workflowRunId&&t.workflowStepIndex===nextIndex))return;
 const next=taskFromWorkflowStep(workflow,task.workflowRunId,nextIndex,String(task.id).startsWith('TEST-'));
 tasks.unshift(next);showWMToast(`Next task assigned automatically to ${next.assignee}: ${next.name}`);
}
function showWMToast(message){let t=document.getElementById('wmToast');if(!t){t=document.createElement('div');t.id='wmToast';t.className='wm-toast';document.body.appendChild(t)}t.textContent=message;t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),2600)}

function renderWorkflow(){
 head('Workflow Builder','Build automated workflows','<button class="wm-btn primary" id="wmCreateFlow">＋ Create Workflow</button>');
 const active=workflows.filter(w=>w.status==='Active').length,totalSteps=workflows.reduce((a,w)=>a+w.steps,0),runs=workflows.reduce((a,w)=>a+w.runs,0);
 mc().innerHTML=`<div class="wm-kpis workflow-kpis">${[['Active Workflows',active],['Total Automated Steps',totalSteps],['Runs This Month',runs],['Hours Saved',Math.round(runs*2.08)+'h']].map(x=>`<div class="wm-card"><small>${x[0]}</small><strong>${x[1]}</strong></div>`).join('')}</div>
 <div class="wm-workflow-layout"><div><h3 class="wm-section-title">Your Workflows</h3><div class="wm-workflows">${workflows.map((w,i)=>workflowCard(w,i)).join('')}</div></div>
 <aside class="wm-ready"><h3>Ready Templates</h3><div class="wm-ready-list">${readyTemplates.map((t,i)=>`<button data-ready="${i}"><i>${t[3]}</i><span><b>${t[0]}</b><small>${t[1]} · ${t[2]}</small></span><em>＋</em></button>`).join('')}</div></aside></div>`;
 bindWorkflow();
}
function workflowCard(w,i){return `<article class="wm-flow"><div class="wm-flow-top"><i>⚡</i><span class="flow-status ${w.status.toLowerCase()}">${w.status}</span></div><h3>${w.name}</h3><p>Reusable automated company workflow</p><div class="wm-flow-meta"><div><small>Trigger</small><b>${w.trigger}</b></div><div><small>Business</small><b>${w.business}</b></div><div><small>Steps</small><b>${w.steps}</b></div><div><small>Runs</small><b>${w.runs}</b></div></div><div class="wm-steps">${Array.from({length:w.steps},(_,j)=>`<span class="wm-step">${j+1}</span>${j<w.steps-1?'<em>→</em>':''}`).join('')}</div><div class="wm-actions"><button class="wm-btn primary" data-open-flow="${i}">Open Builder</button><button class="wm-btn run" data-run-flow="${i}">▶ Run</button><button class="wm-btn" data-duplicate-flow="${i}">Duplicate</button><button class="wm-btn danger" data-delete-flow="${i}">Delete</button></div></article>`}
function bindWorkflow(){
 document.querySelectorAll('[data-run-flow]').forEach(b=>b.onclick=()=>{let i=+b.dataset.runFlow;launchWorkflow(workflows[i],false);renderWorkflow();showWMToast('Workflow started. First step generated.');});
 document.querySelectorAll('[data-open-flow]').forEach(b=>b.onclick=()=>openWorkflowBuilder(+b.dataset.openFlow));
 document.querySelectorAll('[data-duplicate-flow]').forEach(b=>b.onclick=()=>{let w={...workflows[+b.dataset.duplicateFlow],id:'WF-'+Date.now(),name:workflows[+b.dataset.duplicateFlow].name+' Copy',runs:0,status:'Draft'};workflows.push(w);save();renderWorkflow();});
 document.querySelectorAll('[data-delete-flow]').forEach(b=>b.onclick=()=>{if(confirm('Delete this workflow?')){workflows.splice(+b.dataset.deleteFlow,1);save();renderWorkflow();}});
 document.querySelectorAll('[data-ready]').forEach(b=>b.onclick=()=>{let t=readyTemplates[+b.dataset.ready],count=parseInt(t[2])||4,suggested=workflowStepSuggestions[t[0]]||[];workflows.push({id:'WF-'+Date.now(),name:t[0],trigger:'Manual trigger',business:'All Businesses',steps:count,runs:0,status:'Draft',stepDetails:Array.from({length:count},(_,i)=>workflowStepFromTemplate({taskName:suggested[i]||''},i))});save();renderWorkflow();});
 document.getElementById('wmCreateFlow').onclick=workflowForm;
}
function renderGenerated(my=false){
 const employees=activeFounderEmployees();
 let selected=localStorage.getItem('sbx_wm_employee_view')||employees[0]?.name||'';
 if(selected&&!employees.some(e=>e.name===selected))selected=employees[0]?.name||'';
 const employeeSelect=my?`<select id="wmEmployeeView" class="wm-employee-view"><option value="">All assigned work</option>${employees.map(e=>`<option value="${esc(e.name)}" ${e.name===selected?'selected':''}>${esc(e.name)}${e.department?' · '+esc(e.department):''}</option>`).join('')}</select>`:'';
 head(my?'Employee Task Dashboard':'Generated Tasks',my?'Assigned work, reviews and automatic handoffs':'Company work board',`${employeeSelect}<button class="wm-btn primary" id="wmGen">＋ Generate Task</button>`);
 let rows=my?(selected?tasks.filter(t=>t.assignee===selected):tasks):tasks;let sts=['Backlog','In Progress','Review','Completed'];
 const action=(t)=>{if(!my)return'';if(t.status==='Backlog')return`<button class="wm-task-action" data-task-action="start" data-id="${t.id}">Start Task</button>`;if(t.status==='In Progress')return t.workflowApproval==='Yes'?`<button class="wm-task-action" data-task-action="submit" data-id="${t.id}">Submit for Review</button>`:`<button class="wm-task-action" data-task-action="complete" data-id="${t.id}">Complete Task</button>`;if(t.status==='Review')return`<button class="wm-task-action approve" data-task-action="approve" data-id="${t.id}">Approve & Complete</button>`;return`<span class="wm-task-done">Completed</span>`};
 mc().innerHTML=`${my?`<div class="employee-task-summary"><div><small>Employee</small><strong>${esc(selected||'All Employees')}</strong></div><div><small>Assigned</small><strong>${rows.filter(t=>t.status==='Backlog').length}</strong></div><div><small>In Progress</small><strong>${rows.filter(t=>t.status==='In Progress').length}</strong></div><div><small>Review</small><strong>${rows.filter(t=>t.status==='Review').length}</strong></div></div>`:''}<div class="wm-kanban">${sts.map(s=>`<div class="wm-col" data-status="${s}"><h3>${s}<span>${rows.filter(t=>t.status===s).length}</span></h3>${rows.filter(t=>t.status===s).map(t=>`<div class="wm-task" draggable="${my?'false':'true'}" data-id="${t.id}" data-open-task="${t.id}" title="Open task details"><b>${esc(t.name)}</b><span class="wm-badge ${t.priority==='High'||t.priority==='Urgent'?'wm-high':'wm-medium'}">${esc(t.priority)}</span><br><small>${esc(t.assignee||'Unassigned')} · ${esc(t.dept||'')} · ${esc(t.due)}</small>${t.isWorkflowTask?`<p class="wm-flow-context">${esc(t.workflowName)} · Step ${(t.workflowStepIndex||0)+1}/${t.workflowStepCount}</p>`:''}${action(t)}</div>`).join('')}</div>`).join('')}</div>`;
 document.getElementById('wmGen').onclick=generatedTaskForm;
 const view=document.getElementById('wmEmployeeView');if(view)view.onchange=()=>{localStorage.setItem('sbx_wm_employee_view',view.value);renderGenerated(true)};
 document.querySelectorAll('[data-task-action]').forEach(b=>b.onclick=()=>{const t=tasks.find(x=>String(x.id)===String(b.dataset.id));if(!t)return;const a=b.dataset.taskAction;if(a==='start'){t.status='In Progress';t.startedAt=Date.now();showWMToast('Task started.')}else if(a==='submit'){advanceWorkflowTask(t,false)}else if(a==='complete'){advanceWorkflowTask(t,true)}else if(a==='approve'){advanceWorkflowTask(t,true)}save();renderGenerated(my)});
 document.querySelectorAll('[data-open-task]').forEach(card=>card.onclick=e=>{if(e.target.closest('button'))return;openTaskDetails(card.dataset.openTask,my?'my-tasks':'generated-tasks')});
 if(!my){document.querySelectorAll('.wm-task').forEach(x=>x.ondragstart=e=>e.dataTransfer.setData('text',x.dataset.id));document.querySelectorAll('.wm-col').forEach(c=>{c.ondragover=e=>e.preventDefault();c.ondrop=e=>{let id=e.dataTransfer.getData('text'),t=tasks.find(x=>String(x.id)===String(id));if(t){const target=c.dataset.status;if(target==='Completed')advanceWorkflowTask(t,t.status==='Review');else t.status=target}save();renderGenerated(false)}})}
}

function ensureTaskDetails(t){
 if(!Array.isArray(t.checklist))t.checklist=[
  {id:'c1',text:'Review task brief and requirements',done:false},
  {id:'c2',text:'Collect required references or files',done:false},
  {id:'c3',text:'Complete the main work',done:false},
  {id:'c4',text:'Run internal quality check',done:false}
 ];
 if(!Array.isArray(t.comments))t.comments=[];
 if(!Array.isArray(t.attachments))t.attachments=[];
 if(!Array.isArray(t.activity))t.activity=[{text:'Task created',time:t.createdAt||Date.now()}];
 if(!t.description)t.description='Add a clear task description, expected outcome, specifications and any important instructions for the assignee.';
 if(!t.estimated)t.estimated='2 Hours';
 if(!t.tags)t.tags=['Work'];
 if(!t.actualSeconds)t.actualSeconds=0;
 return t;
}
function fmtDuration(sec){sec=Math.max(0,Math.floor(sec||0));const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60);return h?`${h}h ${m}m`:`${m}m`;}
function taskElapsed(t){return (t.actualSeconds||0)+(t.timerStartedAt?Math.floor((Date.now()-t.timerStartedAt)/1000):0)}
function addTaskActivity(t,text){ensureTaskDetails(t);t.activity.unshift({text,time:Date.now()});}
function taskProgress(t){ensureTaskDetails(t);return t.checklist.length?Math.round(t.checklist.filter(x=>x.done).length/t.checklist.length*100):0}
function openTaskDetails(id,backPage='generated-tasks'){
 const t=tasks.find(x=>String(x.id)===String(id));if(!t)return;ensureTaskDetails(t);save();
 head('Task Details','Manage execution, files, review and workflow handoff',`<button class="wm-btn" id="taskBack">← Back</button>`);
 const progress=taskProgress(t),elapsed=taskElapsed(t),approval=t.workflowApproval==='Yes'||t.approvalRequired==='Yes';
 const workflowSteps=t.isWorkflowTask?Array.from({length:t.workflowStepCount||1},(_,i)=>`<div class="td-flow-step ${i<(t.workflowStepIndex||0)?'done':''} ${i===(t.workflowStepIndex||0)?'current':''}"><span>${i+1}</span><div><b>${i===(t.workflowStepIndex||0)?esc(t.name):i<(t.workflowStepIndex||0)?'Completed step':'Upcoming step'}</b><small>${i===(t.workflowStepIndex||0)?esc(t.dept||'Department'):'Workflow sequence'}</small></div></div>`).join('<i class="td-flow-line"></i>'):'<div class="td-empty-small">This task is not linked to a workflow.</div>';
 mc().innerHTML=`
 <div class="td-page" data-task-detail="${esc(t.id)}">
  <div class="td-hero">
   <div class="td-title-wrap"><div class="td-breadcrumb">WORK MANAGEMENT / ${esc(t.business||'ALL BUSINESSES')}</div><h2>${esc(t.name)}</h2><div class="td-meta-line"><code>${esc(t.id)}</code><span class="wm-badge ${t.priority==='High'||t.priority==='Urgent'?'wm-high':'wm-medium'}">${esc(t.priority||'Medium')}</span><span class="status-pill ${(t.status||'Backlog').toLowerCase().replaceAll(' ','-')}">${esc(t.status||'Backlog')}</span></div></div>
   <div class="td-actions">
    ${t.status==='Backlog'?'<button class="wm-btn primary" data-td-action="start">▶ Start Task</button>':''}
    ${t.status==='In Progress'?`<button class="wm-btn" data-td-action="pause">${t.timerStartedAt?'Ⅱ Pause Timer':'▶ Resume Timer'}</button><button class="wm-btn primary" data-td-action="${approval?'review':'complete'}">${approval?'Request Review':'Complete Task'}</button>`:''}
    ${t.status==='Review'?'<button class="wm-btn danger" data-td-action="reject">Reject</button><button class="wm-btn primary" data-td-action="approve">Approve & Complete</button>':''}
    ${t.status==='Completed'?'<button class="wm-btn" data-td-action="reopen">Reopen</button>':''}
   </div>
  </div>
  <div class="td-layout">
   <div class="td-main">
    <section class="wm-panel td-section"><div class="td-section-head"><div><h3>Description</h3><p>Task brief and expected outcome</p></div><button class="wm-link-btn" id="tdEditDescription">Edit</button></div><div id="tdDescription" class="td-description">${esc(t.description).replace(/\n/g,'<br>')}</div></section>
    <section class="wm-panel td-section"><div class="td-section-head"><div><h3>Checklist</h3><p>${t.checklist.filter(x=>x.done).length} of ${t.checklist.length} completed</p></div><b>${progress}%</b></div><div class="td-progress"><i style="width:${progress}%"></i></div><div class="td-checklist">${t.checklist.map(c=>`<label><input type="checkbox" data-check-id="${c.id}" ${c.done?'checked':''}><span>${esc(c.text)}</span><button type="button" data-delete-check="${c.id}">×</button></label>`).join('')}</div><div class="td-add-row"><input id="tdNewCheck" placeholder="Add checklist item"><button class="wm-btn" id="tdAddCheck">＋ Add</button></div></section>
    <section class="wm-panel td-section"><div class="td-section-head"><div><h3>Attachments</h3><p>Briefs, references and completed files</p></div><label class="wm-btn td-upload">＋ Upload<input type="file" id="tdFile" multiple hidden></label></div><div class="td-files">${t.attachments.length?t.attachments.map((f,i)=>`<div class="td-file"><i>▱</i><div><b>${esc(f.name)}</b><small>${esc(f.size||'File')} · ${new Date(f.addedAt||Date.now()).toLocaleDateString()}</small></div><button data-remove-file="${i}">×</button></div>`).join(''):'<div class="td-empty-small">No attachments yet. Upload briefs, designs, PDFs or reference files.</div>'}</div></section>
    <section class="wm-panel td-section"><div class="td-section-head"><div><h3>Comments</h3><p>Team discussion and review notes</p></div></div><div class="td-comment-box"><textarea id="tdComment" placeholder="Write a comment or review note..."></textarea><button class="wm-btn primary" id="tdAddComment">Post Comment</button></div><div class="td-comments">${t.comments.length?t.comments.map(c=>`<div class="td-comment"><span>${esc((c.author||'Founder')[0])}</span><div><b>${esc(c.author||'Founder')}<small>${new Date(c.time).toLocaleString()}</small></b><p>${esc(c.text)}</p></div></div>`).join(''):'<div class="td-empty-small">No comments yet.</div>'}</div></section>
    <section class="wm-panel td-section"><div class="td-section-head"><div><h3>Activity Timeline</h3><p>Complete history of this task</p></div></div><div class="td-activity">${t.activity.map(a=>`<div><i></i><span><b>${esc(a.text)}</b><small>${new Date(a.time).toLocaleString()}</small></span></div>`).join('')}</div></section>
   </div>
   <aside class="td-side">
    <section class="wm-panel td-info"><h3>Task Information</h3>${[['Task Code',t.id],['Business',t.business],['Department',t.dept],['Role',t.role||'—'],['Assigned To',t.assignee||'Unassigned'],['Priority',t.priority],['Status',t.status],['Due Date',t.due],['Estimated',t.estimated],['Created',new Date(t.createdAt||Date.now()).toLocaleDateString()]].map(x=>`<div><span>${x[0]}</span><b>${esc(String(x[1]||'—'))}</b></div>`).join('')}</section>
    <section class="wm-panel td-time"><h3>Time Tracking</h3><div class="td-time-number" id="tdTimeValue">${fmtDuration(elapsed)}</div><p>Estimated: ${esc(t.estimated)}</p><button class="wm-btn ${t.timerStartedAt?'danger':'primary'}" data-td-action="timer">${t.timerStartedAt?'Ⅱ Pause Timer':'▶ Start Timer'}</button></section>
    <section class="wm-panel td-approval"><h3>Approval</h3><div><span>Required</span><b>${approval?'Yes':'No'}</b></div><div><span>Approver</span><b>${esc(t.approvedBy||t.workflowApprovedBy||'Founder')}</b></div><div><span>Status</span><b>${t.status==='Review'?'Pending Review':t.status==='Completed'?'Approved':'Not Submitted'}</b></div></section>
    <section class="wm-panel td-workflow"><h3>Workflow Progress</h3>${workflowSteps}</section>
    <section class="wm-panel td-linked"><h3>Linked Items</h3><button>▰ ${esc(t.workflowName||'No workflow')}</button><button>▦ ${esc(t.templateName||'Task template')}</button><button>□ Calendar deadline</button></section>
   </aside>
  </div>
 </div>`;
 document.getElementById('taskBack').onclick=()=>route(backPage);
 bindTaskDetails(t,backPage);
}
function bindTaskDetails(t,backPage){
 document.querySelectorAll('[data-td-action]').forEach(b=>b.onclick=()=>{
  const a=b.dataset.tdAction;
  if(a==='start'){t.status='In Progress';t.startedAt=t.startedAt||Date.now();t.timerStartedAt=Date.now();addTaskActivity(t,'Task started');}
  else if(a==='pause'||a==='timer'){if(t.timerStartedAt){t.actualSeconds=(t.actualSeconds||0)+Math.floor((Date.now()-t.timerStartedAt)/1000);delete t.timerStartedAt;addTaskActivity(t,'Time tracker paused');}else{t.timerStartedAt=Date.now();addTaskActivity(t,'Time tracker started');}}
  else if(a==='review'){if(t.timerStartedAt){t.actualSeconds=(t.actualSeconds||0)+Math.floor((Date.now()-t.timerStartedAt)/1000);delete t.timerStartedAt;}advanceWorkflowTask(t,false);addTaskActivity(t,'Submitted for review');}
  else if(a==='complete'){if(t.timerStartedAt){t.actualSeconds=(t.actualSeconds||0)+Math.floor((Date.now()-t.timerStartedAt)/1000);delete t.timerStartedAt;}advanceWorkflowTask(t,true);addTaskActivity(t,'Task completed');}
  else if(a==='approve'){advanceWorkflowTask(t,true);addTaskActivity(t,'Approved and completed');}
  else if(a==='reject'){t.status='In Progress';addTaskActivity(t,'Review rejected — changes requested');}
  else if(a==='reopen'){t.status='In Progress';addTaskActivity(t,'Task reopened');}
  save();openTaskDetails(t.id,backPage);
 });
 document.getElementById('tdEditDescription').onclick=()=>{const next=prompt('Edit task description',t.description||'');if(next!==null){t.description=next;addTaskActivity(t,'Description updated');save();openTaskDetails(t.id,backPage)}};
 document.querySelectorAll('[data-check-id]').forEach(x=>x.onchange=()=>{const c=t.checklist.find(c=>String(c.id)===String(x.dataset.checkId));if(c){c.done=x.checked;addTaskActivity(t,`${x.checked?'Completed':'Reopened'} checklist: ${c.text}`);save();openTaskDetails(t.id,backPage)}});
 document.querySelectorAll('[data-delete-check]').forEach(x=>x.onclick=()=>{t.checklist=t.checklist.filter(c=>String(c.id)!==String(x.dataset.deleteCheck));save();openTaskDetails(t.id,backPage)});
 document.getElementById('tdAddCheck').onclick=()=>{const i=document.getElementById('tdNewCheck');if(!i.value.trim())return;t.checklist.push({id:'c'+Date.now(),text:i.value.trim(),done:false});addTaskActivity(t,'Checklist item added');save();openTaskDetails(t.id,backPage)};
 document.getElementById('tdFile').onchange=e=>{[...e.target.files].forEach(f=>t.attachments.push({name:f.name,size:f.size>1048576?(f.size/1048576).toFixed(1)+' MB':Math.ceil(f.size/1024)+' KB',addedAt:Date.now()}));addTaskActivity(t,'Attachment uploaded');save();openTaskDetails(t.id,backPage)};
 document.querySelectorAll('[data-remove-file]').forEach(x=>x.onclick=()=>{t.attachments.splice(+x.dataset.removeFile,1);save();openTaskDetails(t.id,backPage)});
 document.getElementById('tdAddComment').onclick=()=>{const i=document.getElementById('tdComment');if(!i.value.trim())return;t.comments.unshift({author:'Founder',text:i.value.trim(),time:Date.now()});addTaskActivity(t,'Comment added');save();openTaskDetails(t.id,backPage)};
}
function calendarDateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function calendarTypeForTask(t){if(t.id&&String(t.id).startsWith('EVT-'))return t.dept||'Reminder';if(t.workflowId)return 'Workflow';return 'Task'}
function fixedHolidays(year){return [
 {id:`HOL-${year}-NY`,name:'New Year',type:'Holiday',due:`${year}-01-01`,business:'All Businesses',assignee:'All Team'},
 {id:`HOL-${year}-RD`,name:'Republic Day',type:'Holiday',due:`${year}-01-26`,business:'All Businesses',assignee:'All Team'},
 {id:`HOL-${year}-ID`,name:'Independence Day',type:'Holiday',due:`${year}-08-15`,business:'All Businesses',assignee:'All Team'},
 {id:`HOL-${year}-GJ`,name:'Gandhi Jayanti',type:'Holiday',due:`${year}-10-02`,business:'All Businesses',assignee:'All Team'},
 {id:`HOL-${year}-XMAS`,name:'Christmas',type:'Festival',due:`${year}-12-25`,business:'All Businesses',assignee:'All Team'}
]}
function dateForTask(t,year,month,index){
 if(/^\d{4}-\d{2}-\d{2}$/.test(t.due||''))return t.due;
 const now=new Date(); if(t.due==='Today')return calendarDateKey(now); if(t.due==='Tomorrow'){let d=new Date(now);d.setDate(d.getDate()+1);return calendarDateKey(d)};
 return null;
}
function allCalendarItems(year,month){
 const taskItems=tasks.map((t,i)=>({...t,type:calendarTypeForTask(t),due:dateForTask(t,year,month,i)||t.due})).filter(t=>/^\d{4}-\d{2}-\d{2}$/.test(t.due||''));
 const recurring=[];
 calendarEvents.forEach(e=>{recurring.push(e);if(e.recurrence==='Yearly'&&e.due){recurring.push({...e,id:e.id+'-'+year,due:`${year}-${e.due.slice(5)}`})}});
 return [...taskItems,...recurring,...fixedHolidays(year)].filter((v,i,a)=>a.findIndex(x=>x.id===v.id&&x.due===v.due)===i).filter(x=>calendarFilters.has(x.type||'Task'));
}
function calendarDayModal(dateKey){
 const d=new Date(dateKey+'T00:00:00'),items=allCalendarItems(d.getFullYear(),d.getMonth()).filter(x=>x.due===dateKey);
 let old=document.getElementById('calendarDayModal');if(old)old.remove();
 let modal=document.createElement('div');modal.id='calendarDayModal';modal.className='wm-form-modal';modal.innerHTML=`<div class="wm-form-dialog calendar-day-dialog"><div class="wm-form-head"><div><span>Day details</span><h2>${d.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</h2><p>${items.length} calendar item${items.length===1?'':'s'}</p></div><button class="wm-form-close">×</button></div><div class="wm-form-body calendar-day-list">${items.length?items.map(x=>`<div class="calendar-day-item type-${String(x.type||'Task').toLowerCase()}"><i></i><div><b>${esc(x.name)}</b><small>${esc(x.type||'Task')} · ${esc(x.time||'All day')} · ${esc(x.assignee||'Unassigned')}</small>${x.description?`<p>${esc(x.description)}</p>`:''}</div></div>`).join(''):'<div class="wm-empty-mini">No items on this date.</div>'}</div><div class="wm-form-foot"><button class="wm-btn wm-cancel">Close</button><button class="wm-btn primary calendar-add-day">＋ Add Item</button></div></div>`;
 document.body.appendChild(modal);document.body.classList.add('wm-modal-open');const close=()=>{modal.remove();document.body.classList.remove('wm-modal-open')};modal.querySelector('.wm-form-close').onclick=close;modal.querySelector('.wm-cancel').onclick=close;modal.onclick=e=>{if(e.target===modal)close()};modal.querySelector('.calendar-add-day').onclick=()=>{close();eventForm(dateKey)};
}
function renderCalendar(){
 const year=calendarCursor.getFullYear(),month=calendarCursor.getMonth(),monthName=calendarCursor.toLocaleDateString('en-IN',{month:'long',year:'numeric'});
 head('Operations Calendar','Tasks, meetings, holidays, festivals, leave and deadlines',`<div class="calendar-top-actions"><button class="wm-btn" id="calPrev">←</button><button class="wm-btn" id="calToday">Today</button><button class="wm-btn" id="calNext">→</button><button class="wm-btn primary" id="wmAddEvent">＋ Add Event</button></div>`);
 const items=allCalendarItems(year,month),types=['Task','Meeting','Holiday','Festival','Leave','Birthday','Reminder','Workflow'];
 const first=new Date(year,month,1),daysInMonth=new Date(year,month+1,0).getDate(),offset=(first.getDay()+6)%7;
 const cells=[];for(let i=0;i<offset;i++){let d=new Date(year,month,1-offset+i);cells.push({date:d,other:true})}for(let i=1;i<=daysInMonth;i++)cells.push({date:new Date(year,month,i),other:false});while(cells.length%7) {let d=new Date(year,month+1,cells.length-offset-daysInMonth+1);cells.push({date:d,other:true})}
 const upcoming=items.filter(x=>x.due>=calendarDateKey(new Date())).sort((a,b)=>a.due.localeCompare(b.due)).slice(0,10);
 mc().innerHTML=`<div class="calendar-shell">
 <div class="calendar-toolbar"><div><h2>${monthName}</h2><small>${items.length} visible items</small></div><div class="calendar-view-tabs"><button class="${calendarView==='month'?'active':''}" data-cal-view="month">Month</button><button class="${calendarView==='agenda'?'active':''}" data-cal-view="agenda">Agenda</button></div></div>
 <div class="calendar-filters">${types.map(t=>`<button class="type-${t.toLowerCase()} ${calendarFilters.has(t)?'active':''}" data-cal-filter="${t}"><i></i>${t}</button>`).join('')}</div>
 ${calendarView==='month'?`<div class="operations-calendar"><div class="calendar-weekdays">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=>`<b>${x}</b>`).join('')}</div><div class="calendar-grid">${cells.map(c=>{const key=calendarDateKey(c.date),dayItems=items.filter(x=>x.due===key);return `<div class="calendar-cell ${c.other?'other-month':''} ${key===calendarDateKey(new Date())?'today':''}" data-calendar-date="${key}"><div class="calendar-date"><span>${c.date.getDate()}</span>${dayItems.length?`<em>${dayItems.length}</em>`:''}</div><div class="calendar-events">${dayItems.slice(0,4).map(x=>`<button class="calendar-event type-${String(x.type||'Task').toLowerCase()}" title="${esc(x.name)}"><i></i><span>${esc(x.name)}</span></button>`).join('')}${dayItems.length>4?`<small>+${dayItems.length-4} more</small>`:''}</div></div>`}).join('')}</div></div>`:`<div class="calendar-agenda">${items.sort((a,b)=>a.due.localeCompare(b.due)).map(x=>`<button data-calendar-date="${x.due}" class="agenda-row"><time>${new Date(x.due+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',weekday:'short'})}</time><i class="type-${String(x.type||'Task').toLowerCase()}"></i><div><b>${esc(x.name)}</b><small>${esc(x.type||'Task')} · ${esc(x.business||'All Businesses')} · ${esc(x.assignee||'Unassigned')}</small></div><span>${esc(x.time||'All day')}</span></button>`).join('')||'<div class="wm-empty-mini">No matching calendar items.</div>'}</div>`}
 <aside class="calendar-agenda-panel"><div class="wm-panel-head"><div><h3>Upcoming</h3><small>Next items across your workspace</small></div></div>${upcoming.map(x=>`<button data-calendar-date="${x.due}" class="upcoming-item"><time>${new Date(x.due+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</time><i class="type-${String(x.type||'Task').toLowerCase()}"></i><div><b>${esc(x.name)}</b><small>${esc(x.type||'Task')} · ${esc(x.assignee||'Unassigned')}</small></div></button>`).join('')||'<div class="wm-empty-mini">Nothing upcoming.</div>'}</aside>
 </div>`;
 document.getElementById('wmAddEvent').onclick=()=>eventForm();document.getElementById('calPrev').onclick=()=>{calendarCursor=new Date(year,month-1,1);renderCalendar()};document.getElementById('calNext').onclick=()=>{calendarCursor=new Date(year,month+1,1);renderCalendar()};document.getElementById('calToday').onclick=()=>{calendarCursor=new Date();renderCalendar()};
 mc().querySelectorAll('[data-cal-view]').forEach(b=>b.onclick=()=>{calendarView=b.dataset.calView;renderCalendar()});mc().querySelectorAll('[data-cal-filter]').forEach(b=>b.onclick=()=>{const t=b.dataset.calFilter;calendarFilters.has(t)?calendarFilters.delete(t):calendarFilters.add(t);renderCalendar()});mc().querySelectorAll('[data-calendar-date]').forEach(el=>el.onclick=e=>{if(e.target.closest('.calendar-event'))e.stopPropagation();calendarDayModal(el.dataset.calendarDate)});
}
function route(p){if(p==='work-dashboard')renderDash();else if(p==='task-library')renderLibrary();else if(p==='workflow-builder')renderWorkflow();else if(p==='generated-tasks')renderGenerated(false);else if(p==='my-tasks')renderGenerated(true);else if(p==='calendar')renderCalendar();else return false;return true;}
document.addEventListener('click',e=>{let b=e.target.closest('.wm-nav');if(!b)return;e.preventDefault();setTimeout(()=>{document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));b.classList.add('active');route(b.dataset.page)},0)},true);
})();
