import { useT } from "../../theme/ThemeContext.jsx";

export function SelEl({value,onChange,opts,style={}}){
  const t=useT();
  return <select value={value||""} onChange={onChange} style={{background:t.lt,border:`1px solid ${t.brd}`,borderRadius:8,color:t.tx,padding:"8px 11px",fontSize:13,outline:"none",...style}}>{opts.map(o=>typeof o==="string"?<option key={o}>{o}</option>:<option key={o.v} value={o.v}>{o.l}</option>)}</select>;
}


export const Select = SelEl;
