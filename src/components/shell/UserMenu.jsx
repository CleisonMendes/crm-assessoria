import { useEffect, useRef, useState } from "react";
import { USERS_DEF } from "../../data/users.js";
import { useT } from "../../theme/ThemeContext.jsx";

export function UserMenu({user,onSwitch,onLogout}){
  const t=useT();const [open,setOpen]=useState(false);const ref=useRef(null);
  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  const pc={Assessor:t.gold,Gestor:t.green,Administrador:t.purple}[user.perfil]||t.gold;
  return (
    <div ref={ref} style={{position:"relative"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:8,background:open?`${t.gold}15`:"transparent",border:`1px solid ${open?t.gold+"88":t.brd}`,borderRadius:8,padding:"5px 10px",cursor:"pointer"}}>
        <div style={{width:30,height:30,borderRadius:"50%",background:user.cor,display:"flex",alignItems:"center",justifyContent:"center",color:"#0B1929",fontWeight:800,fontSize:11}}>{user.init}</div>
        <div style={{textAlign:"left",lineHeight:1.25}}>
          <div style={{color:t.tx,fontSize:12,fontWeight:700,whiteSpace:"nowrap"}}>{user.nome}</div>
          <div style={{color:pc,fontSize:10,fontWeight:600}}>{user.perfil}</div>
        </div>
        <span style={{color:t.txd,fontSize:9}}>{open?"▲":"▼"}</span>
      </button>
      {open&&<div style={{position:"absolute",right:0,top:"calc(100% + 6px)",zIndex:999,background:t.mid,border:`1px solid ${t.brd}`,borderRadius:12,minWidth:240,boxShadow:"0 8px 40px #00000070",overflow:"hidden"}}>
        <div style={{padding:"14px 16px",background:`linear-gradient(135deg,${user.cor}22,transparent)`,display:"flex",gap:10,alignItems:"center",borderBottom:`1px solid ${t.brd}`}}>
          <div style={{width:40,height:40,borderRadius:"50%",background:user.cor,display:"flex",alignItems:"center",justifyContent:"center",color:"#0B1929",fontWeight:800,fontSize:14}}>{user.init}</div>
          <div><div style={{color:t.tx,fontWeight:700}}>{user.nome}</div><div style={{color:t.txm,fontSize:11}}>{user.cargo}</div><div style={{color:t.txd,fontSize:10}}>{user.email}</div></div>
        </div>
        <div style={{padding:"6px 0"}}>
          {USERS_DEF.map(u=>{const uc={Assessor:t.gold,Gestor:t.green,Administrador:t.purple}[u.perfil]||t.gold;return(
            <button key={u.id} onClick={()=>{onSwitch(u);setOpen(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",background:u.id===user.id?`${u.cor}15`:"transparent",border:"none",padding:"8px 14px",cursor:"pointer",borderLeft:u.id===user.id?`2px solid ${u.cor}`:"2px solid transparent"}}>
              <div style={{width:26,height:26,borderRadius:"50%",background:u.cor,display:"flex",alignItems:"center",justifyContent:"center",color:"#0B1929",fontWeight:800,fontSize:10}}>{u.init}</div>
              <div style={{flex:1,textAlign:"left"}}><div style={{color:t.tx,fontSize:12,fontWeight:u.id===user.id?700:400}}>{u.nome}</div><div style={{color:uc,fontSize:10}}>{u.perfil}</div></div>
              {u.id===user.id&&<span style={{color:u.cor}}>✓</span>}
            </button>
          );})}
        </div>
        <div style={{borderTop:`1px solid ${t.brd}`,padding:"8px 14px"}}>
          <button onClick={()=>{onLogout();setOpen(false);}} style={{color:t.red,background:"none",border:"none",fontSize:12,cursor:"pointer",fontWeight:600}}>🚪 Sair</button>
        </div>
      </div>}
    </div>
  );
}
