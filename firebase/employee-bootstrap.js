import { db } from "./firebase-config.js";
import { waitForUser, logout, loadScripts } from "./cloud-common.js";
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const user = await waitForUser("employee");
const STATE_KEY="sbx_employee_state";
const safe=raw=>{try{return JSON.parse(raw||"null")}catch{return null}};
let syncing=false, timer=null;

async function readCollection(name, field="employeeId") {
  const snap=await getDocs(query(collection(db,name),where(field,"==",user.employeeId)));
  return snap.docs.map(d=>({id:d.id,...d.data()}));
}

async function hydrateFromCloud() {
  const local=safe(localStorage.getItem(STATE_KEY))||{};
  const [tasks,leaves,attendance,notifications,payslips,rewardRequests]=await Promise.all([
    readCollection("tasks","assignedToEmployeeId"),readCollection("leaveRequests"),readCollection("attendance"),readCollection("notifications"),readCollection("payslips"),readCollection("rewardRequests")
  ]);
  if(tasks.length) local.tasks=tasks.map(t=>({id:t.id,name:t.name||t.title||"Task",due:t.due||t.dueDate||"",status:t.status||"To Do",priority:t.priority||"Medium",progress:Number(t.progress||0),department:t.department||user.department||"",business:t.business||t.businessName||"Sandbox Media",description:t.description||"",checklist:Array.isArray(t.checklist)?t.checklist:[],completedChecks:Array.isArray(t.completedChecks)?t.completedChecks:[],timeSpent:Number(t.timeSpent||0),comments:Array.isArray(t.comments)?t.comments:[]}));
  if(leaves.length) local.leave=leaves.map(x=>({id:x.id,type:x.leaveType||x.type||"Leave",fromDate:x.fromDate||x.from||"",toDate:x.toDate||x.to||x.fromDate||"",date:x.fromDate||"",days:Number(x.totalDays||x.days||1),reason:x.reason||"",status:x.status||"Pending",submittedAt:x.submittedAt?.toDate?.()?.toISOString?.()||x.submittedAt||""}));
  if(attendance.length){
    const completed=attendance.filter(x=>x.checkOutAt||x.workedMs).map(x=>({dateKey:x.date||x.dateKey,checkInAt:x.checkInAt?.toMillis?.()||x.checkInAt||null,checkOutAt:x.checkOutAt?.toMillis?.()||x.checkOutAt||null,totalBreakMs:Number(x.totalBreakMs||0),workedMs:Number(x.workedMs||x.totalWorkedMs||0),status:x.attendanceStatus||x.dayStatus||"Present"}));
    if(completed.length)local.attendanceRecords=completed.sort((a,b)=>String(b.dateKey).localeCompare(String(a.dateKey)));
    const today=new Date().toISOString().slice(0,10),current=attendance.find(x=>(x.date||x.dateKey)===today&&!x.checkOutAt);
    if(current){local.attendance=current.status==="Break"?"in":"in";local.break=current.status==="Break";local.checkInAt=current.checkInAt?.toMillis?.()||current.checkInAt||null;local.breakStartedAt=current.breakStartedAt?.toMillis?.()||current.breakStartedAt||null;local.totalBreakMs=Number(current.totalBreakMs||0);local.attendanceDateKey=today;}
  }
  if(notifications.length)local.notifications=notifications.map(n=>({id:n.id,type:n.type||"system",title:n.title||"Update",message:n.message||"",time:n.time||"Recently",read:!!n.read,link:n.relatedPage||n.link||"dashboard",icon:n.icon||"◈"}));
  if(payslips.length)local.payslips=payslips;
  if(rewardRequests.length)local.redemptions=rewardRequests.map(r=>({id:r.id,rewardId:r.rewardId,rewardName:r.rewardName,points:r.points,date:r.date||"",status:r.status||"Pending"}));
  local.profile={...(local.profile||{}),fullName:user.name,email:user.email||'',employeeId:user.employeeId,department:user.department||'Unassigned',role:user.designation||'Employee',business:user.businessName||'Sandbox Media'};
  localStorage.setItem(STATE_KEY,JSON.stringify(local));
}

async function syncState(raw) {
  if(syncing)return; syncing=true;
  try{
    const state=safe(raw); if(!state)return;
    const batch=writeBatch(db);
    (state.tasks||[]).forEach(t=>{const id=String(t.id||crypto.randomUUID());batch.set(doc(db,"tasks",id),{title:t.name||"Task",name:t.name||"Task",description:t.description||"",assignedToEmployeeId:user.employeeId,assignedToUid:"",assignedToName:user.name,businessId:user.businessId,businessName:t.business||"",department:t.department||user.department||"",priority:t.priority||"Medium",status:t.status||"To Do",progress:Number(t.progress||0),checklist:t.checklist||[],completedChecks:t.completedChecks||[],timeSpent:Number(t.timeSpent||0),comments:t.comments||[],due:t.due||"",updatedAt:serverTimestamp()},{merge:true});});
    (state.leave||[]).forEach(x=>{const id=String(x.id||crypto.randomUUID());batch.set(doc(db,"leaveRequests",id),{employeeId:user.employeeId,employeeUid:"",employeeName:user.name,businessId:user.businessId,leaveType:x.type||"Leave",fromDate:x.fromDate||x.date||"",toDate:x.toDate||x.fromDate||x.date||"",totalDays:Number(x.days||1),reason:x.reason||"",status:x.status||"Pending",updatedAt:serverTimestamp()},{merge:true});});
    (state.redemptions||[]).forEach(r=>{const id=String(r.id||crypto.randomUUID());batch.set(doc(db,"rewardRequests",id),{employeeId:user.employeeId,employeeUid:"",employeeName:user.name,businessId:user.businessId,rewardId:r.rewardId||"",rewardName:r.rewardName||"Reward",points:Number(r.points||0),date:r.date||"",status:r.status||"Pending",updatedAt:serverTimestamp()},{merge:true});});
    const records=state.attendanceRecords||[];records.forEach(r=>{const id=`${user.employeeId}_${r.dateKey}`;batch.set(doc(db,"attendance",id),{employeeId:user.employeeId,employeeUid:"",employeeName:user.name,businessId:user.businessId,date:r.dateKey,checkInAt:r.checkInAt||null,checkOutAt:r.checkOutAt||null,totalBreakMs:Number(r.totalBreakMs||0),workedMs:Number(r.workedMs||0),attendanceStatus:r.status||"Present",updatedAt:serverTimestamp()},{merge:true});});
    if(state.attendance==="in"&&state.attendanceDateKey){const id=`${user.employeeId}_${state.attendanceDateKey}`;batch.set(doc(db,"attendance",id),{employeeId:user.employeeId,employeeUid:"",employeeName:user.name,businessId:user.businessId,date:state.attendanceDateKey,status:state.break?"Break":"Working",checkInAt:state.checkInAt||null,breakStartedAt:state.breakStartedAt||null,totalBreakMs:Number(state.totalBreakMs||0),updatedAt:serverTimestamp()},{merge:true});}
    await batch.commit();
  }catch(e){console.error("Employee Firestore sync failed",e)}finally{syncing=false}
}

await hydrateFromCloud();
const originalSet=localStorage.setItem.bind(localStorage);
localStorage.setItem=(key,value)=>{originalSet(key,value);if(key===STATE_KEY){clearTimeout(timer);timer=setTimeout(()=>syncState(value),350)}};
await loadScripts(["assets/employee.js"]);
const logoutBtn=document.getElementById("logout");if(logoutBtn)logoutBtn.onclick=logout;
window.addEventListener("beforeunload",()=>{const raw=localStorage.getItem(STATE_KEY);if(raw)syncState(raw)});
