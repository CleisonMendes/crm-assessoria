import { useState, useEffect } from "react";
import { api } from "../../services/api.js";
import { PLANO } from "../../data/plano.js";
import { sv } from "../../utils/numbers.js";
import { Gauge } from "../../components/charts/index.js";
import { useT } from "../../theme/ThemeContext.jsx";
import { fB, fP } from "../../utils/formatters.js";
import { Crd, KPI, ProgressBar, Btn } from "../../components/ui/index.js";

// ── Helpers de data ──────────────────────────────────────────────────────────
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function getMesAtual() {
  const d = new Date();
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Retorna o índice (0-3) da semana ATUAL dentro do mês corrente.
 * Semana 1 = dias 1-7, Semana 2 = 8-14, Semana 3 = 15-21, Semana 4 = 22+
 */
function getSemanaAtual() {
  const dia = new Date().getDate();
  if (dia <= 7)  return 0;
  if (dia <= 14) return 1;
  if (dia <= 21) return 2;
  return 3;
}

// ────────────────────────────────────────────────────────────────────────────

export function Plano() {
  const t = useT();
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);

  const mesAtual    = getMesAtual();
  const semanaAtual = getSemanaAtual();

  useEffect(() => {
    api.dashboard()
      .then(res => setDados(res))
      .catch(err => console.error("Erro ao carregar metas:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 40, color: t.gold, textAlign: "center", fontWeight: 700 }}>
        ⏳ Sincronizando metas com o banco de dados...
      </div>
    );
  }

  const d = dados || { net_total: 0, receita: 0, captacao: 0 };

  const gauges = [
    { l: "NET",      val: d.net_total, max: PLANO.netMeta || 0, color: t.gold   },
    { l: "Captação", val: d.captacao,  max: PLANO.capMeta || 0, color: t.green  },
    { l: "Receita",  val: d.receita,   max: PLANO.comMeta || 0, color: t.purple },
    { l: "Conexões", val: 0,           max: 0,                  color: t.blue   },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── GAUGES DE METAS ── */}
      <Crd>
        <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
          Gauges de Metas — {mesAtual}
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
          {gauges.map(g => (
            <div key={g.l} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <Gauge value={g.val} max={g.max || 1} label={g.l} color={g.color} />
              <div style={{ color: g.color, fontSize: 11, fontWeight: 700 }}>{fB(g.val)}</div>
              <div style={{ color: t.txd, fontSize: 10 }}>Meta: {fB(g.max)}</div>
            </div>
          ))}
        </div>
      </Crd>

      {/* ── FUNIS HUNTER E FARMER ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Crd>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Funil Hunter</div>
          {PLANO.funilH.map(f => {
            const pct = (sv(f.real) / sv(f.meta || 1)) * 100;
            const co  = pct >= 70 ? t.green : pct >= 40 ? t.amber : t.red;
            return (
              <div key={f.l} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: t.txm, fontSize: 12 }}>{f.icon} {f.l}</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ color: co, fontWeight: 700, fontSize: 13 }}>{f.real}</span>
                    <span style={{ color: t.txd, fontSize: 11 }}>/ {f.meta}</span>
                    <span style={{ color: co, fontSize: 10, fontWeight: 700 }}>{pct.toFixed(0)}%</span>
                  </div>
                </div>
                <ProgressBar value={f.real} max={f.meta || 1} color={co} h={5} />
              </div>
            );
          })}
        </Crd>

        <Crd>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Funil Farmer</div>
          {PLANO.funilF.map(f => {
            const pct = (sv(f.real) / sv(f.meta || 1)) * 100;
            const co  = pct >= 70 ? t.green : pct >= 40 ? t.amber : t.red;
            return (
              <div key={f.l} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: t.txm, fontSize: 12 }}>{f.icon} {f.l}</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ color: co, fontWeight: 700, fontSize: 13 }}>{f.real}</span>
                    <span style={{ color: t.txd, fontSize: 11 }}>/ {f.meta}</span>
                    <span style={{ color: co, fontSize: 10, fontWeight: 700 }}>{pct.toFixed(0)}%</span>
                  </div>
                </div>
                <ProgressBar value={f.real} max={f.meta || 1} color={co} h={5} />
              </div>
            );
          })}
        </Crd>
      </div>

      {/* ── ACOMPANHAMENTO SEMANAL ── */}
      <Crd>
        <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
          Acompanhamento Semanal — {mesAtual}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {PLANO.semanais.map((s, i) => {
            const acum  = s.meta * (i + 1);
            const pct   = (sv(s.real) / sv(acum || 1)) * 100;
            const co    = pct >= 80 ? t.green : pct >= 50 ? t.amber : t.red;
            const ativa = i === semanaAtual;          // ← dinâmico, não hardcoded
            const passada = i < semanaAtual;
            return (
              <div
                key={i}
                style={{
                  background: ativa ? `${t.gold}18` : t.lt,
                  borderRadius: 8,
                  padding: "12px 14px",
                  border: `1px solid ${ativa ? t.gold : passada ? t.brd + "88" : t.brd}`,
                  opacity: passada && s.real === 0 ? 0.55 : 1,
                  transition: "all .2s",
                }}
              >
                <div style={{ color: ativa ? t.gold : passada ? t.txd : t.txm, fontWeight: 700, fontSize: 11, marginBottom: 6 }}>
                  SEM {i + 1}{ativa ? " · ATUAL" : passada ? " · ENCERRADA" : " · FUTURA"}
                </div>
                <div style={{ color: t.txd, fontSize: 9, marginBottom: 2 }}>Meta acumulada</div>
                <div style={{ color: t.tx, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{fB(acum)}</div>
                <div style={{ color: t.txd, fontSize: 9, marginBottom: 2 }}>Realizado</div>
                <div style={{ color: s.real > 0 ? t.green : t.red, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                  {fB(s.real)} {s.real === 0 && "❌"}
                </div>
                <ProgressBar value={s.real} max={acum || 1} color={co} h={4} />
              </div>
            );
          })}
        </div>
      </Crd>

      {/* ── KPIs INFERIORES ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
        {[
          { l: "NET Atual",     v: fB(d.net_total),        c: t.gold,  s: `Meta: ${fB(PLANO.netMeta || 0)}` },
          { l: "Churn/mês",    v: fB(PLANO.churn || 0),   c: t.red,   s: "esperado" },
          { l: "Ticket Hunter", v: fB(0),                  c: t.txm,   s: "ticket médio" },
          { l: "Ticket Farmer", v: fB(0),                  c: t.txm,   s: "ticket médio" },
          { l: "ROA Objetivo",  v: "0.40%",                c: t.gold },
          { l: "Cap. Meta/mês", v: fB(PLANO.capMeta || 0), c: t.green },
        ].map(({ l, v, c, s }) => (
          <Crd key={l} style={{ padding: "12px 14px" }}>
            <KPI label={l} value={v} color={c} sub={s} size="sm" />
          </Crd>
        ))}
      </div>

    </div>
  );
}
