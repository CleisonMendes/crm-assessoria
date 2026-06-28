import { useT } from "../../theme/ThemeContext.jsx";
import { Bdg, ProgressBar } from "../../components/ui/index.js";
import { fB, fB2, fP } from "../../utils/formatters.js";
import { sv } from "../../utils/numbers.js";

export function CCard({ c, onClick }) {
  const t = useT();
  const netM  = sv(c.netM)  || 0;
  const netM1 = sv(c.netM1) || 0;
  const varNet = netM1 > 0 ? ((netM - netM1) / netM1) * 100 : 0;
  const adPct  = sv(c.ader);
  const adCor  = adPct < 50 ? t.red : adPct < 70 ? t.amber : t.green;

  // Monta mini-barras de alocação com dados reais
  const alocs = [
    { l: "RF",    v: sv(c.aloc_rf),     cor: t.blue   },
    { l: "RV",    v: sv(c.aloc_rv),     cor: t.green  },
    { l: "Fundos",v: sv(c.aloc_fundos), cor: t.gold   },
    { l: "FII",   v: sv(c.aloc_fi),     cor: t.amber  },
    { l: "Prev",  v: sv(c.aloc_prev),   cor: t.purple || "#8b5cf6" },
  ].filter(a => a.v > 0);
  const totalAloc = alocs.reduce((s, a) => s + a.v, 0);

  return (
    <div
      onClick={() => onClick && onClick(c)}
      style={{
        background: t.mid, border: `1px solid ${t.brd}`,
        borderRadius: 14, padding: "16px 18px",
        cursor: onClick ? "pointer" : "default",
        display: "flex", flexDirection: "column", gap: 10,
        transition: "border-color .2s, transform .15s",
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.borderColor = t.gold; e.currentTarget.style.transform = "translateY(-2px)"; }}}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.borderColor = t.brd;  e.currentTarget.style.transform = "translateY(0)"; }}}
    >
      {/* Header: nome + badges */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {c.nome || c.conta}
          </div>
          <div style={{ color: t.txd, fontSize: 10, marginTop: 1, fontFamily: "monospace" }}>
            #{c.conta} · {c.tipo_pessoa === "PESSOA JURÍDICA" ? "PJ" : "PF"} · {c.seg || "–"}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-end" }}>
          <Bdg label={c.status} />
          <Bdg label={c.suit}   />
        </div>
      </div>

      {/* NET + variação */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: `1px solid ${t.brd}`, paddingTop: 8 }}>
        <div>
          <div style={{ color: t.txd, fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>NET Atual</div>
          <div style={{ color: t.gold, fontSize: 16, fontWeight: 800 }}>{fB(netM)}</div>
          <div style={{ color: t.txd, fontSize: 10 }}>M-1: {fB(netM1)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: varNet >= 0 ? t.green : t.red, fontSize: 13, fontWeight: 700 }}>
            {varNet >= 0 ? "▲" : "▼"} {Math.abs(varNet).toFixed(1)}%
          </div>
          <div style={{ color: t.txd, fontSize: 10 }}>variação</div>
        </div>
      </div>

      {/* Alocação real por barras */}
      {alocs.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {alocs.slice(0, 4).map(a => (
            <div key={a.l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: t.txd, fontSize: 10, width: 38, flexShrink: 0 }}>{a.l}</span>
              <div style={{ flex: 1, height: 4, background: t.lt, borderRadius: 99, overflow: "hidden" }}>
                <div style={{ width: `${totalAloc > 0 ? (a.v / totalAloc) * 100 : 0}%`, height: "100%", background: a.cor }} />
              </div>
              <span style={{ color: t.txm, fontSize: 10, width: 36, textAlign: "right", flexShrink: 0 }}>
                {totalAloc > 0 ? ((a.v / totalAloc) * 100).toFixed(0) : 0}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* KPIs financeiros */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, borderTop: `1px solid ${t.brd}`, paddingTop: 8 }}>
        <div>
          <div style={{ color: t.txd, fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 1 }}>Receita</div>
          <div style={{ color: t.gold, fontSize: 11, fontWeight: 700 }}>{fB2(sv(c.rec))}</div>
        </div>
        <div>
          <div style={{ color: t.txd, fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 1 }}>Captação</div>
          <div style={{ color: t.green, fontSize: 11, fontWeight: 700 }}>{fB(sv(c.cap))}</div>
        </div>
        <div>
          <div style={{ color: t.txd, fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 1 }}>Saldo D0</div>
          <div style={{ color: sv(c.d0) > 5000 ? t.amber : t.txd, fontSize: 11, fontWeight: 700 }}>{fB2(sv(c.d0))}</div>
        </div>
      </div>

      {/* Aderência */}
      {c.ader != null && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ color: t.txd, fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>Aderência</span>
            <span style={{ color: adCor, fontWeight: 700, fontSize: 10 }}>{adPct.toFixed(0)}%</span>
          </div>
          <ProgressBar value={adPct} max={100} color={adCor} h={4} />
        </div>
      )}

      {/* Perfil bancário resumido */}
      {(c.status_pix || c.portabilidade || c.elegivel_turbo) && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", borderTop: `1px solid ${t.brd}`, paddingTop: 8 }}>
          {c.status_pix && (
            <span style={{ fontSize: 10, color: c.status_pix.includes("Tem") ? t.green : t.txd }}>
              {c.status_pix.includes("Tem") ? "✅ PIX" : "❌ PIX"}
            </span>
          )}
          {c.portabilidade && (
            <span style={{ fontSize: 10, color: t.blue }}>📲 {c.portabilidade}</span>
          )}
          {c.elegivel_turbo === "Sim" && (
            <span style={{ fontSize: 10, color: t.gold }}>⚡ Turbo</span>
          )}
          {c.principalidade && (
            <span style={{ fontSize: 10, color: t.txm }}>🏦 {c.principalidade}</span>
          )}
        </div>
      )}
    </div>
  );
}

export const ClienteCard = CCard;
