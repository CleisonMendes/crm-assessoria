import { Donut, LChart } from "../../components/charts/index.js";
import { sv } from "../../utils/numbers.js";
import { useT } from "../../theme/ThemeContext.jsx";
import { Bdg, ProgressBar } from "../../components/ui/index.js";
import { fB, fP, fB2 } from "../../utils/formatters.js";

export function CCard({ c, onClick }) {
  const t = useT();
  const net = Math.max(sv(c.netM), sv(c.netM1));
  
  const labels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
  const cartData = [0, 0.4, 0.9, 1.5, 2.1, 2.8]; 
  const cdiData = [0, 0.4, 0.8, 1.4, 2.0, 2.5];  

  // Montagem proporcional simples das classes para visualização rápida no Donut do Card
  const slicesCard = [
    { label: "RF", pct: net > 0 ? (c.aloc_renda_fixa || 0) / net : 0, cor: t.blue },
    { label: "RV", pct: net > 0 ? (c.aloc_renda_variavel || 0) / net : 0, cor: t.gold },
    { label: "Fundos", pct: net > 0 ? (c.aloc_fundos || 0) / net : 0, cor: t.purple || "#8b5cf6" },
    { label: "Prev", pct: net > 0 ? (c.aloc_previdencia || 0) / net : 0, cor: t.green }
  ].filter(s => s.pct > 0);

  return (
    <div onClick={() => onClick && onClick(c)} style={{ background: t.mid, border: `1px solid ${t.brd}`, borderRadius: 14, padding: "16px 18px", cursor: onClick ? "pointer" : "default", display: "flex", flexDirection: "column", gap: 10, transition: "border-color .2s" }} onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = t.gold)} onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = t.brd)}>
      <div style={{ display: "flex", alignItems: "flex-start", justifycontent: "space-between", gap: 8 }}>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.nome}</div>
          <div style={{ color: t.txd, fontSize: 10, marginTop: 1, fontFamily: "monospace" }}>#{c.conta} · {c.ult}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-end" }}><Bdg label={c.status} /><Bdg label={c.suit} /></div>
      </div>
      
      {slicesCard.length > 0 && (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Donut slices={slicesCard} size={80} thick={10} label={fB(net).replace("R$", "").trim()} sub="patrimônio" />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
            {slicesCard.slice(0, 4).map(a => (
              <div key={a.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: a.cor, flexShrink: 0 }} />
                <span style={{ color: t.txm, fontSize: 10, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.label}</span>
                <span style={{ color: t.tx, fontWeight: 700, fontSize: 10 }}>{(sv(a.pct) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, paddingTop: 8, borderTop: `1px solid ${t.brd}` }}>
        <div><div style={{ color: t.txd, fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 1 }}>Receita Mês</div><div style={{ color: t.gold, fontSize: 11, fontWeight: 700 }}>{fB2(c.rec)}</div></div>
        <div><div style={{ color: t.txd, fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 1 }}>Cap. Bruta</div><div style={{ color: t.green, fontSize: 11, fontWeight: 700 }}>{fB(c.cap)}</div></div>
      </div>
      
      <LChart 
        series={[
          { data: cartData, color: t.gold, area: true },
          { data: cdiData, color: t.green }
        ]} 
        labels={labels} 
        height={55}
      />
      
      <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}><Bdg label={c.seg} /></div>
    </div>
  );
}

export const ClienteCard = CCard;