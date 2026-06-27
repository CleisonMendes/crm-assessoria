import { useT } from "../../theme/ThemeContext.jsx";

export function Crd({children, style={}}) {
  const t = useT();
  return (
    <div style={{background:t.mid, border:`1px solid ${t.brd}`, borderRadius:12, padding:"16px 18px", ...style}}>
      {children}
    </div>
  );
}

export const Card = Crd;
