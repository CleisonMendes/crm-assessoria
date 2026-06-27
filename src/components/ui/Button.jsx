import { useT } from "../../theme/ThemeContext.jsx";

export function Btn({children,onClick,color,outline,small,style={}}){
  const t=useT();
  const c=color||t.gold;
  return <button onClick={onClick} style={{background:outline?`${c}22`:c,color:outline?c:"#0B1929",border:`1px solid ${outline?c+"44":c}`,borderRadius:7,padding:small?"5px 11px":"9px 18px",fontSize:small?11:13,fontWeight:700,cursor:"pointer",...style}}>{children}</button>;
}
export const Button = Btn;
