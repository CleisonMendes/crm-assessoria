import { useT } from "../../theme/ThemeContext.jsx";

export function Inp({value,onChange,placeholder,type="text",style={}}){
  const t=useT();
  return <input type={type} value={value||""} onChange={onChange} placeholder={placeholder} style={{background:t.lt,border:`1px solid ${t.brd}`,borderRadius:8,color:t.tx,padding:"9px 12px",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box",...style}}/>;
}

export const Input = Inp;
