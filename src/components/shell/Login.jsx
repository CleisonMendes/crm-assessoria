import { useState } from "react";
import { PLANO } from "../../data/plano.js";
import { USERS_DEF } from "../../data/users.js";
import { useT } from "../../theme/ThemeContext.jsx";
import { Btn } from "../ui/index.js";

export function Login({onLogin}){
  const t=useT();
  const [sel,setSel]=useState(null);const [pwd,setPwd]=useState("");const [err,setErr]=useState("");
  const go=()=>{if(!sel){setErr("Selecione um usuario");return;}if(pwd!=="1234"){setErr("Senha incorreta");return;}onLogin(sel);};
  return (
    <div style={{minHeight:"100vh",background:`radial-gradient(ellipse at 30% 20%,${t.lt}88,${t.bg})`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter','Segoe UI',sans-serif"}}>
      <div style={{background:t.mid,border:`1px solid ${t.brd}`,borderRadius:20,padding:"40px 36px",width:390,boxShadow:"0 32px 80px #00000090"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{color:t.gold,fontWeight:900,fontSize:24,letterSpacing:"1px",marginBottom:6}}>◆ ASSESSORIA CRM</div>
          <div style={{color:t.txd,fontSize:12}}>{PLANO.escritorio} · {PLANO.codigo} · Ref {PLANO.ref}</div>
        </div>
        <div style={{marginBottom:16}}>
          <div style={{color:t.txm,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".7px",marginBottom:8}}>Usuario</div>
          {USERS_DEF.map(u=>{const uc={Assessor:t.gold,Gestor:t.green,Administrador:t.purple}[u.perfil]||t.gold;return(
            <button key={u.id} onClick={()=>{setSel(u);setErr("");}} style={{display:"flex",alignItems:"center",gap:10,background:sel&&sel.id===u.id?`${u.cor}18`:t.lt,border:`1px solid ${sel&&sel.id===u.id?u.cor:t.brd}`,borderRadius:10,padding:"10px 14px",cursor:"pointer",width:"100%",marginBottom:6,transition:"all .15s"}}>
              <div style={{width:34,height:34,borderRadius:"50%",background:u.cor,display:"flex",alignItems:"center",justifyContent:"center",color:"#0B1929",fontWeight:800,fontSize:12}}>{u.init}</div>
              <div style={{textAlign:"left"}}><div style={{color:t.tx,fontWeight:600,fontSize:13}}>{u.nome}</div><div style={{color:uc,fontSize:11}}>{u.perfil} · {u.cargo}</div></div>
              {sel&&sel.id===u.id&&<span style={{marginLeft:"auto",color:u.cor,fontSize:16}}>✓</span>}
            </button>
          );})}
        </div>
        <div style={{marginBottom:20}}>
          <div style={{color:t.txm,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".7px",marginBottom:6}}>Senha</div>
          <Inp type="password" value={pwd} onChange={e=>{setPwd(e.target.value);setErr("");}} placeholder="••••••"/>
          {err?<div style={{color:t.red,fontSize:11,marginTop:4}}>{err}</div>:<div style={{color:t.txd,fontSize:11,marginTop:4}}>Demo: senha = 1234</div>}
        </div>
        <button onClick={go} style={{width:"100%",background:t.gold,color:"#0B1929",border:"none",borderRadius:10,padding:"13px",fontSize:14,fontWeight:800,cursor:"pointer"}}>ENTRAR</button>
      </div>
    </div>
  );
}
