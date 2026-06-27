import { useT } from "../../theme/ThemeContext.jsx";
import { sv } from "../../utils/numbers.js";


export function Donut({slices,size=120,thick=16,label,sub}){
  const t=useT();
  if(!slices||!slices.length)return null;
  const r=(size-thick)/2,circ=2*Math.PI*r;
  let off=0;
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={t.lt} strokeWidth={thick}/>
        {slices.map((sl,i)=>{const sw=Math.max(sv(sl.pct)*circ-1.5,0);const el=<circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={sl.cor||t.gold} strokeWidth={thick} strokeDasharray={`${sw} ${circ}`} strokeDashoffset={-off}/>;off+=sv(sl.pct)*circ;return el;})}
      </svg>
      {(label||sub)&&<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:4}}>{label&&<div style={{color:t.tx,fontWeight:700,fontSize:size>100?10:8,lineHeight:1.2}}>{label}</div>}{sub&&<div style={{color:t.txd,fontSize:8,marginTop:1}}>{sub}</div>}</div>}
    </div>
  );
}
