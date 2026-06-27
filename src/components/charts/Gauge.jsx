import { useT } from "../../theme/ThemeContext.jsx";
import { sv } from "../../utils/numbers.js";

export function Gauge({value,max=100,label,color}){
  const t=useT();
  const pct=Math.min(sv(value)/sv(max||1),1);
  const r=42,cx=60,cy=58,start=-210,sweep=240;
  const toR=a=>a*Math.PI/180;
  const pt=(a,rad)=>[cx+rad*Math.cos(toR(a)),cy+rad*Math.sin(toR(a))];
  const arc=(a1,a2,ir,or)=>{const[x1,y1]=pt(a1,or);const[x2,y2]=pt(a2,or);const[x3,y3]=pt(a2,ir);const[x4,y4]=pt(a1,ir);const lg=Math.abs(a2-a1)>180?1:0;return `M${x1},${y1} A${or},${or} 0 ${lg},1 ${x2},${y2} L${x3},${y3} A${ir},${ir} 0 ${lg},0 ${x4},${y4} Z`;};
  const ang=start+pct*sweep;
  const[nx,ny]=pt(ang,r-6);
  return (
    <svg width={120} height={80} viewBox="0 0 120 80">
      <path d={arc(start,start+sweep,32,48)} fill={t.lt}/>
      {pct>0&&<path d={arc(start,ang,32,48)} fill={color||t.gold}/>}
      <circle cx={cx} cy={cy} r={4} fill={t.mid} stroke={color||t.gold} strokeWidth={2}/>
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={t.tx} strokeWidth={2} strokeLinecap="round"/>
      <text x={cx} y={cy+16} textAnchor="middle" fontSize={10} fontWeight={700} fill={color||t.gold}>{(pct*100).toFixed(0)}%</text>
      {label&&<text x={cx} y={cy+27} textAnchor="middle" fontSize={8} fill={t.txd}>{label}</text>}
    </svg>
  );
}
