import React from "react";
import { useEffect, useRef, useState } from "react";
import { TH } from "../../theme/themes.js";
import { useT } from "../../theme/ThemeContext.jsx";

export function ThemeSw({cur,onChange}){
  const t=useT();const [open,setOpen]=useState(false);const ref=useRef(null);
  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  return (
    <div ref={ref} style={{position:"relative"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{background:open?`${t.gold}18`:"transparent",border:`1px solid ${open?t.gold+"88":t.brd}`,borderRadius:8,padding:"6px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:6,color:t.txm,fontSize:12}}>
        <span>{TH[cur].i}</span><span style={{fontWeight:600}}>{TH[cur].n}</span><span style={{fontSize:9}}>{open?"▲":"▼"}</span>
      </button>
      {open&&<div style={{position:"absolute",right:0,top:"calc(100% + 6px)",zIndex:999,background:t.mid,border:`1px solid ${t.brd}`,borderRadius:10,minWidth:150,boxShadow:"0 8px 32px #00000060",padding:"6px 0"}}>
        {Object.entries(TH).map(([k,th])=>(
          <button key={k} onClick={()=>{onChange(k);setOpen(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",background:cur===k?`${t.gold}15`:"transparent",border:"none",padding:"8px 14px",cursor:"pointer",borderLeft:cur===k?`2px solid ${t.gold}`:"2px solid transparent"}}>
            <span>{th.i}</span><span style={{color:cur===k?t.gold:t.tx,fontSize:13,fontWeight:cur===k?700:400}}>{th.n}</span>
            {cur===k&&<span style={{marginLeft:"auto",color:t.gold}}>✓</span>}
          </button>
        ))}
      </div>}
    </div>
  );
}
