import { db } from "./firebase-config.js";
import { waitForUser, logout, loadScripts } from "./cloud-common.js";
import { collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const user=await waitForUser("founder");
const CLEANUP_VERSION="sbx_clean_live_data_v4";
if(localStorage.getItem(CLEANUP_VERSION)!=="done"){
 ["sbx_wm_templates","sbx_wm_tasks","sbx_wm_workflows","sbx_wm_calendar_events","sbx_team_org_v1","sbx_automation_v1","sbx_analytics_actions"].forEach(k=>localStorage.removeItem(k));
 localStorage.setItem(CLEANUP_VERSION,"done");
}
const CORE="sbxRocketPremiumDataV2", ATT="sbxAttendanceV17Founder";
const safe=x=>{try{return JSON.parse(x||"null")}catch{return null}};
let usersByName=new Map(), employeeIdByName=new Map(), employeeUidById=new Map(), syncing=false, timer=null;

async function all(name){const s=await getDocs(collection(db,name));return s.docs.map(d=>({id:d.id,...d.data()}));}
async function hydrate(){
 const [profiles,loginProfiles,tasks,attendance,leaves]=await Promise.all([all("users"),all("employeeLogins"),all("tasks"),all("attendance"),all("leaveRequests")]);
 const employees=profiles.filter(x=>x.role==="employee"&&x.active===true);
 loginProfiles.forEach(p=>employeeIdByName.set(String(p.name||"").toLowerCase(),String(p.employeeId||p.id))); employees.forEach((p,i)=>{usersByName.set(String(p.name||"").toLowerCase(),p.id);employeeUidById.set(String(p.employeeId||p.id),p.id)});
 const core=safe(localStorage.getItem(CORE))||{businesses:[],employees:[],departments:[],roles:[],tasks:[]};
 const activeProfiles=profiles.filter(x=>x.role==="employee");
 core.employees=loginProfiles.map(p=>({id:p.employeeId||p.id,name:p.name||p.employeeId||p.id,employeeId:p.employeeId||p.id,email:p.email||"",phone:p.phone||"",role:p.designation||"Employee",department:p.department||"Unassigned",business:p.businessName||"Sandbox Media",businessId:p.businessId||"sandbox-media",status:p.active===false?"Disabled":"Active",loginDocId:p.id,accountStatus:p.active===false?"inactive":"active"}));
 core.tasks=tasks.map(t=>({id:t.id,name:t.title||t.name||"Task",description:t.description||"",business:t.businessName||"Sandbox Media",businessId:t.businessId||"sandbox-media",assignee:t.assignedToName||"Unassigned",assignedToUid:t.assignedToUid||"",department:t.department||"",priority:t.priority||"Medium",status:t.status||"To Do",progress:Number(t.progress||0),due:t.due||t.dueDate||"",checklist:t.checklist||[],completedChecks:t.completedChecks||[],comments:t.comments||[],timeSpent:Number(t.timeSpent||0)}));
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

async function syncFounder(key,raw){if(syncing)return;syncing=true;try{const batch=writeBatch(db);if(key===CORE){const core=safe(raw)||{};(core.tasks||[]).forEach(t=>{const id=String(t.id||crypto.randomUUID());const assigned=t.assignedToUid||usersByName.get(String(t.assignee||"").toLowerCase())||"";const assignedEmployeeId=t.assignedToEmployeeId||employeeIdByName.get(String(t.assignee||"").toLowerCase())||"";batch.set(doc(db,"tasks",id),{title:t.name||"Task",name:t.name||"Task",description:t.description||"",businessId:t.businessId||user.businessId,businessName:t.business||"Sandbox Media",assignedToUid:assigned,assignedToEmployeeId:assignedEmployeeId,assignedToName:t.assignee||"Unassigned",department:t.department||"",priority:t.priority||"Medium",status:t.status||"To Do",progress:Number(t.progress||0),due:t.due||"",checklist:t.checklist||[],completedChecks:t.completedChecks||[],comments:t.comments||[],timeSpent:Number(t.timeSpent||0),createdByUid:user.uid,updatedAt:serverTimestamp()},{merge:true});});}
 if(key===ATT){const st=safe(raw)||{};(st.leaves||[]).forEach(l=>{const id=String(l.id);batch.set(doc(db,"leaveRequests",id),{employeeUid:l.employeeId||"",employeeName:l.employeeName||"",businessId:user.businessId,leaveType:l.type||"Leave",fromDate:l.from||"",toDate:l.to||l.from||"",reason:l.reason||"",status:l.status||"Pending",reviewedByUid:l.status!=="Pending"?user.uid:null,updatedAt:serverTimestamp()},{merge:true});});}
 await batch.commit();}catch(e){console.error("Founder Firestore sync failed",e)}finally{syncing=false}}

await hydrate();

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

const originalSet=localStorage.setItem.bind(localStorage);localStorage.setItem=(k,v)=>{originalSet(k,v);if(k===CORE||k===ATT){clearTimeout(timer);timer=setTimeout(()=>syncFounder(k,v),350)}};
await loadScripts(["assets/js/app.js","assets/js/work-management.js","assets/js/team-organization.js","assets/js/automation.js","assets/js/attendance.js","assets/js/analytics.js","assets/js/rewards.js","assets/js/success-journey.js","assets/js/system.js","assets/js/payroll.js","assets/js/ai-copilot.js"]);
const logoutBtn=document.getElementById("founderLogoutButton");if(logoutBtn)logoutBtn.onclick=logout;
