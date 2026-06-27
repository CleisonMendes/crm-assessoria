import React from "react";
import { useEffect, useState } from "react";
import { useT } from "../../theme/ThemeContext.jsx";

export function Clock(){
  const t=useT();
  const [now,setNow]=useState(new Date());
  useEffect(()=>{const id=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(id);},[]);
  return (
    <div style={{textAlign:"right",lineHeight:1.3}}>
      <div style={{color:t.tx,fontSize:13,fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{now.toLocaleTimeString("pt-BR")}</div>
      <div style={{color:t.txd,fontSize:10,textTransform:"capitalize"}}>{now.toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short",year:"numeric"})}</div>
    </div>
  );
}
