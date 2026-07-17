import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

export function waitForUser(requiredRole) {
  return new Promise((resolve, reject) => {
    const stop = onAuthStateChanged(auth, async user => {
      stop();
      if (!user) { location.replace("../index.html"); return reject(new Error("Not signed in")); }
      try {
        const snap = await getDoc(doc(db,"users",user.uid));
        if (!snap.exists()) throw new Error("User profile missing");
        const profile = snap.data();
        if (profile.active !== true || profile.role !== requiredRole) throw new Error("Access denied");
        const session={uid:user.uid,email:user.email,name:profile.name||user.email,role:profile.role,businessId:profile.businessId||"sandbox-media",employeeId:profile.employeeId||"",department:profile.department||"",designation:profile.designation||""};
        localStorage.setItem("sbx_session",JSON.stringify(session));
        sessionStorage.setItem("sbxUser",JSON.stringify(session));
        window.SBX_FIREBASE_USER={...session,...profile}; resolve(window.SBX_FIREBASE_USER);
      } catch(e) { console.error(e); await signOut(auth); localStorage.removeItem("sbx_session"); location.replace("../index.html"); reject(e); }
    });
  });
}

export async function logout() {
  await signOut(auth); localStorage.removeItem("sbx_session"); sessionStorage.clear(); location.replace("../index.html");
}

export function loadScripts(paths) {
  return paths.reduce((p,src)=>p.then(()=>new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error(`Unable to load ${src}`));document.body.appendChild(s);})),Promise.resolve());
}
