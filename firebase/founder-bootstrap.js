import { db } from "./firebase-config.js";
import { waitForUser, logout, loadScripts } from "./cloud-common.js";
import { collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const user=await waitForUser("founder");
const CLEANUP_VERSION="sbx_clean_live_data_v4";
if(localStorage.getItem(CLEANUP_VERSION)!=="done"){
 ["sbx_wm_templates","sbx_wm_tasks","sbx_wm_workflows","sbx_wm_calendar_events","sbx_team_org_v1","sbx_automation_v1","sbx_analytics_actions"].forEach(k=>localStorage.removeItem(k));
 localStorage.setItem(CLEANUP_VERSION,"done");
}
const CORE="sbxRocketPremiumDataV2", WM_TASKS="sbx_wm_tasks", ATT="sbxAttendanceV17Founder";
const safe=x=>{try{return JSON.parse(x||"null")}catch{return null}};
let usersByName=new Map(), employeeIdByName=new Map(), employeeUidById=new Map(), syncing=false, timer=null;

async function all(name){const s=await getDocs(collection(db,name));return s.docs.map(d=>({id:d.id,...d.data()}));}
async function hydrate(){
 usersByName=new Map(); employeeIdByName=new Map(); employeeUidById=new Map();
 const [profiles,loginProfiles,tasks,attendance,leaves]=await Promise.all([all("users"),all("employeeLogins"),all("tasks"),all("attendance"),all("leaveRequests")]);
 const employees=profiles.filter(x=>x.role==="employee"&&x.active===true);
 loginProfiles.forEach(p=>employeeIdByName.set(String(p.name||"").toLowerCase(),String(p.employeeId||p.id))); employees.forEach((p,i)=>{usersByName.set(String(p.name||"").toLowerCase(),p.id);employeeUidById.set(String(p.employeeId||p.id),p.id)});
 const core=safe(localStorage.getItem(CORE))||{businesses:[],employees:[],departments:[],roles:[],tasks:[]};
 const activeProfiles=profiles.filter(x=>x.role==="employee");
 core.employees=loginProfiles.map(p=>({id:p.employeeId||p.id,name:p.name||p.employeeId||p.id,employeeId:p.employeeId||p.id,email:p.email||"",phone:p.phone||"",role:p.designation||"Employee",department:p.department||"Unassigned",business:p.businessName||"Sandbox Media",businessId:p.businessId||"sandbox-media",status:p.active===false?"Disabled":"Active",loginDocId:p.id,accountStatus:p.active===false?"inactive":"active"}));
 core.tasks=tasks.map(t=>({id:t.id,name:t.title||t.name||"Task",description:t.description||"",business:t.businessName||"Sandbox Media",businessId:t.businessId||"sandbox-media",assignee:t.assignedToName||"Unassigned",assignedToUid:t.assignedToUid||"",assignedToEmployeeId:t.assignedToEmployeeId||"",department:t.department||"",priority:t.priority||"Medium",status:t.status||"To Do",progress:Number(t.progress||0),due:t.due||t.dueDate||"",checklist:t.checklist||[],completedChecks:t.completedChecks||[],comments:t.comments||[],timeSpent:Number(t.timeSpent||0)}));
 localStorage.setItem("sbx_wm_tasks",JSON.stringify(core.tasks));
 if(!localStorage.getItem("sbx_wm_templates"))localStorage.setItem("sbx_wm_templates","[]");
 if(!localStorage.getItem("sbx_wm_workflows"))localStorage.setItem("sbx_wm_workflows","[]");
 if(!localStorage.getItem("sbx_wm_calendar_events"))localStorage.setItem("sbx_wm_calendar_events","[]");
 localStorage.setItem(CORE,JSON.stringify(core));
 const fs=safe(localStorage.getItem(ATT))||{records:{},history:[],leaves:[],rules:{start:'09:30',end:'18:30',grace:15,halfDay:240,fullDay:480,breakAllowance:60,weeklyOff:['Sunday'],overtime:540},logs:[]};
 fs.leaves=leaves.map(l=>({id:l.id,employeeId:l.employeeUid||l.employeeId,type:l.leaveType||l.type||"Leave",from:l.fromDate||l.from||"",to:l.toDate||l.to||l.fromDate||"",reason:l.reason||"",status:l.status||"Pending",createdAt:l.createdAt?.toMillis?.()||Date.now(),employeeName:l.employeeName||""}));
 fs.records=fs.records||{};fs.history=fs.history||[];
 attendance.forEach(a=>{const eid=a.employeeUid||a.employeeId;const checkIn=a.checkInAt?.toMillis?.()||a.checkInAt;const checkOut=a.checkOutAt?.toMillis?.()||a.checkOutAt;const rec={employeeId:eid,date:a.date||a.dateKey,checkIn:checkIn?new Date(checkIn).toTimeString().slice(0,5):'',checkOut:checkOut?new Date(checkOut).toTimeString().slice(0,5):'',breakStart:a.breakStartedAt?(new Date(a.breakStartedAt?.toMillis?.()||a.breakStartedAt).toTimeString().slice(0,5)):'',breakEnd:'',status:a.status|| (checkOut?'Checked Out':'Checked In'),late:(a.attendanceStatus==='Late')};if((a.date||a.dateKey)===new Date().toISOString().slice(0,10))fs.records[eid]=rec;else fs.history.push(rec);});
 localStorage.setItem(ATT,JSON.stringify(fs));
}

async function syncFounder(key,raw){
 if(syncing){return false;}
 syncing=true;
 try{
  const batch=writeBatch(db);
  let writes=0;
  if(key===CORE||key===WM_TASKS){
   const parsed=safe(raw)||{};
   const taskList=key===WM_TASKS?(Array.isArray(parsed)?parsed:[]):(Array.isArray(parsed.tasks)?parsed.tasks:[]);
   taskList.forEach(t=>{
    if(!t)return;
    const id=String(t.id||crypto.randomUUID());
    const assigneeName=String(t.assignee||t.assignedToName||"").trim();
    const assigned=String(t.assignedToUid||usersByName.get(assigneeName.toLowerCase())||"");
    const assignedEmployeeId=String(t.assignedToEmployeeId||t.employeeId||employeeIdByName.get(assigneeName.toLowerCase())||"").trim().toUpperCase();
    const payload={
     title:String(t.name||t.title||"Task"),name:String(t.name||t.title||"Task"),description:String(t.description||""),
     businessId:String(t.businessId||user.businessId||"sandbox-media"),businessName:String(t.business||t.businessName||"Sandbox Media"),
     assignedToUid:assigned,assignedToEmployeeId,assignedToName:assigneeName||"Unassigned",assignee:assigneeName||"Unassigned",
     department:String(t.department||t.dept||"General"),role:String(t.role||"Employee"),priority:String(t.priority||"Medium"),
     status:String(t.status||"Backlog"),progress:Number(t.progress||0),due:String(t.due||t.dueDate||""),
     checklist:Array.isArray(t.checklist)?t.checklist:[],completedChecks:Array.isArray(t.completedChecks)?t.completedChecks:[],
     comments:Array.isArray(t.comments)?t.comments:[],timeSpent:Number(t.timeSpent||0),createdByUid:String(user.uid||""),updatedAt:serverTimestamp()
    };
    batch.set(doc(db,"tasks",id),payload,{merge:true}); writes++;
   });
  }
  if(key===ATT){
   const st=safe(raw)||{};
   (Array.isArray(st.leaves)?st.leaves:[]).forEach(l=>{
    if(!l||!l.id)return;
    const id=String(l.id);
    batch.set(doc(db,"leaveRequests",id),{employeeUid:String(l.employeeId||""),employeeName:String(l.employeeName||""),businessId:String(user.businessId||"sandbox-media"),leaveType:String(l.type||"Leave"),fromDate:String(l.from||""),toDate:String(l.to||l.from||""),reason:String(l.reason||""),status:String(l.status||"Pending"),reviewedByUid:l.status!=="Pending"?String(user.uid||""):null,updatedAt:serverTimestamp()},{merge:true}); writes++;
   });
  }
  if(writes){await batch.commit();}
  return true;
 }catch(e){
  console.error("Founder Firestore sync failed",e);
  window.SBXApp?.toast?.("Task could not be saved. Please try again.");
  return false;
 }finally{syncing=false;}
}

await hydrate();
window.SBX_REFRESH_FOUNDER=async()=>{await hydrate(); if(window.hydrate)window.hydrate();};

window.SBXEmployee = {
 async save(form, existing=null){
  const employeeId=String(form.employeeId||'').trim().toUpperCase().replace(/[^A-Z0-9_-]/g,'');
  const pin=String(form.pin||'').trim();
  if(!employeeId) throw new Error('Employee ID is required.');
  if(!existing && pin.length<4) throw new Error('PIN must be at least 4 digits.');
  if(pin && pin.length<4) throw new Error('PIN must be at least 4 digits.');
  const business=form.business||'Sandbox Media';
  const businessId=business.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||user.businessId||'sandbox-media';
  const payload={employeeId,name:String(form.name||employeeId).trim(),email:String(form.email||'').trim(),phone:String(form.phone||'').trim(),department:form.department||'Unassigned',designation:form.role||'Employee',businessName:business,businessId,active:(form.status||'Active')!=='Disabled',updatedAt:serverTimestamp(),createdBy:user.uid};
  if(pin){const bytes=new TextEncoder().encode(pin);const hash=await crypto.subtle.digest('SHA-256',bytes);payload.pinHash=[...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');}
  if(!existing)payload.createdAt=serverTimestamp();
  const oldId=existing?.loginDocId||existing?.employeeId||'';
  await setDoc(doc(db,'employeeLogins',employeeId),payload,{merge:true});
  if(oldId && oldId!==employeeId)await deleteDoc(doc(db,'employeeLogins',oldId));
  await hydrate();
  return {employeeId};
 },
 async setStatus(employee,status){await updateDoc(doc(db,'employeeLogins',employee.loginDocId||employee.employeeId),{active:status==='Active',updatedAt:serverTimestamp()});await hydrate();},
 async remove(employee){await deleteDoc(doc(db,'employeeLogins',employee.loginDocId||employee.employeeId));await hydrate();}
};
window.SBXInvite=window.SBXEmployee;

const originalSet=localStorage.setItem.bind(localStorage);
window.SBXTaskStore={

 async upsert(task){
  const assigneeName=String(task.assignee||task.assignedToName||'').trim();
  const id=String(task.id||('GEN-'+Date.now()));
  const assignedToEmployeeId=String(task.assignedToEmployeeId||task.employeeId||employeeIdByName.get(assigneeName.toLowerCase())||'').trim().toUpperCase();
  const assignedToUid=String(task.assignedToUid||usersByName.get(assigneeName.toLowerCase())||'');
  const payload={
   title:String(task.name||task.title||'Task'),name:String(task.name||task.title||'Task'),description:String(task.description||''),
   businessId:String(task.businessId||user.businessId||'sandbox-media'),businessName:String(task.business||task.businessName||'Sandbox Media'),
   assignedToUid,assignedToEmployeeId,assignedToName:assigneeName||'Unassigned',assignee:assigneeName||'Unassigned',
   department:String(task.department||task.dept||'General'),role:String(task.role||'Employee'),priority:String(task.priority||'Medium'),
   status:String(task.status||'Backlog'),progress:Number(task.progress||0),due:String(task.due||task.dueDate||''),
   checklist:Array.isArray(task.checklist)?task.checklist:[],completedChecks:Array.isArray(task.completedChecks)?task.completedChecks:[],
   comments:Array.isArray(task.comments)?task.comments:[],timeSpent:Number(task.timeSpent||0),createdByUid:String(user.uid||''),
   createdAt:task.createdAt||serverTimestamp(),updatedAt:serverTimestamp()
  };
  await setDoc(doc(db,'tasks',id),payload,{merge:true});
  const cached=safe(localStorage.getItem(WM_TASKS))||[];
  const localTask={id,name:payload.name,description:payload.description,business:payload.businessName,businessId:payload.businessId,assignee:payload.assignedToName,assignedToUid:payload.assignedToUid,assignedToEmployeeId:payload.assignedToEmployeeId,department:payload.department,dept:payload.department,role:payload.role,priority:payload.priority,status:payload.status,progress:payload.progress,due:payload.due,checklist:payload.checklist,completedChecks:payload.completedChecks,comments:payload.comments,timeSpent:payload.timeSpent,createdAt:task.createdAt||Date.now()};
  const idx=cached.findIndex(x=>String(x.id)===id);
  if(idx>=0)cached[idx]={...cached[idx],...localTask};else cached.unshift(localTask);
  originalSet(WM_TASKS,JSON.stringify(cached));
  const core=safe(localStorage.getItem(CORE))||{};core.tasks=cached;originalSet(CORE,JSON.stringify(core));
  return localTask;
 },
 async saveAll(taskList){
  const raw=JSON.stringify(Array.isArray(taskList)?taskList:[]);
  originalSet(WM_TASKS,raw);
  return await syncFounder(WM_TASKS,raw);
 },
 async refresh(){await hydrate();return safe(localStorage.getItem(WM_TASKS))||[];}
};

localStorage.setItem=(k,v)=>{originalSet(k,v);if(k===CORE||k===WM_TASKS||k===ATT){clearTimeout(timer);timer=setTimeout(()=>syncFounder(k,v),150)}};
await loadScripts(["assets/js/app.js","assets/js/work-management.js","assets/js/team-organization.js","assets/js/automation.js","assets/js/attendance.js","assets/js/analytics.js","assets/js/rewards.js","assets/js/success-journey.js","assets/js/system.js","assets/js/payroll.js","assets/js/ai-copilot.js"]);
const logoutBtn=document.getElementById("founderLogoutButton");if(logoutBtn)logoutBtn.onclick=logout;
