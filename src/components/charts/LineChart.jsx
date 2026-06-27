import { sv } from "../../utils/numbers.js";
import { useEffect, useRef, useState } from "react";
import { useT } from "../../theme/ThemeContext.jsx";

export function LChart({series,labels,height=90,type="line"}){
  const t=useT();
  const ref=useRef(null);
  const [w,setW]=useState(280);
  useEffect(()=>{if(!ref.current)return;setW(ref.current.clientWidth||280);const ro=new ResizeObserver(e=>setW(e[0].contentRect.width));ro.observe(ref.current);return()=>ro.disconnect();},[]);
  if(!labels||labels.length<2)return null;
  const pad={l:32,r:6,t:6,b:20};
  const pw=w-pad.l-pad.r,ph=height-pad.t-pad.b;
  const allV=series.flatMap(s=>s.data||[]).filter(v=>v!=null);
  if(!allV.length)return null;
  const mn=Math.min(...allV,0),mx=Math.max(...allV,0.1);
  const xs=i=>pad.l+(i/(labels.length-1))*pw;
  const ys=v=>pad.t+ph-((sv(v)-mn)/(mx-mn||1))*ph;
  const pd=data=>data.map((v,i)=>`${i===0?"M":"L"}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(" ");
  const ev=Math.ceil(labels.length/5);
  const bw=pw/labels.length*0.6;
  return (
    <div ref={ref} style={{width:"100%"}}>
      <svg width="100%" height={height} style={{overflow:"visible",display:"block"}}>
        {[0,0.5,1].map(f=><line key={f} x1={pad.l} x2={w-pad.r} y1={pad.t+ph*(1-f)} y2={pad.t+ph*(1-f)} stroke={t.brd} strokeDasharray="3,3" strokeWidth={1}/>)}
        {type==="bar"
          ?series.map((sr,si)=><g key={si}>{(sr.data||[]).map((v,i)=>{const bh=((sv(v)-mn)/(mx-mn||1))*ph;return <rect key={i} x={xs(i)-bw/2} y={ys(v)} width={bw} height={Math.max(bh,0)} fill={sr.color} rx={2} fillOpacity={0.85}/>;})}</g>)
          :series.map((sr,si)=><g key={si}>{sr.area&&<path d={`${pd(sr.data||[])} L${xs((sr.data||[]).length-1).toFixed(1)},${(pad.t+ph).toFixed(1)} L${pad.l},${(pad.t+ph).toFixed(1)} Z`} fill={sr.color} fillOpacity={0.1}/>}<path d={pd(sr.data||[])} fill="none" stroke={sr.color} strokeWidth={si===0?2:1.5} strokeLinecap="round" strokeLinejoin="round"/></g>)
        }
        {labels.map((lb,i)=>(i%ev===0||i===labels.length-1)&&<text key={i} x={xs(i)} y={height-3} textAnchor="middle" fontSize={8} fill={t.txd}>{lb}</text>)}
        {[mn,(mn+mx)/2,mx].map((v,i)=><text key={i} x={pad.l-3} y={ys(v)+3} textAnchor="end" fontSize={8} fill={t.txd}>{sv(v).toFixed(1)}</text>)}
      </svg>
    </div>
  );
}


export const LineChart = LChart;
