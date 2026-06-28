import { useState, useMemo, useEffect } from "react";
import { api } from "../../services/api.js";
import { PLANO } from "../../data/plano.js";
import { Crd, ProgressBar, Bdg } from "../../components/ui/index.js";
import { LChart } from "../../components/charts/index.js";
import { useT } from "../../theme/ThemeContext.jsx";
import { fB, fB2, fDT, fP } from "../../utils/formatters.js";
import { sv } from "../../utils/numbers.js";
import { CCard } from "../clientes/ClienteCard.jsx";
import { CDetalhe } from "../clientes/ClienteDetalhe.jsx";
import { getDashboardStats } from "./dashboardUtils.js";
import { PatrimonioAssessor } from "./PatrimonioAssessor.jsx";
import { ClientesSemContato } from "../clientes/ClientesSemContato.jsx";
import { RankingCaptacao } from "./RankingCaptacao.jsx";
import { NotificacoesWindows } from "../alertas/NotificacoesWindows.jsx";

const BASE = "http://localhost:3001/api";
const gj   = url => fetch(url).then(r => r.json()).catch(() => null);

// ── Mapeia positivador_completo → formato interno ─────────────────────────────
function mapearCliente(c, saldoMap = {}, qualMap = {}, bancoMap = {}) {
  if (c.nome !== undefined && !c.cliente) return c;
  const sal  = saldoMap[String(c.cliente)]  || {};
  const qual = qualMap[String(c.cliente)]   || {};
  const banc = bancoMap[String(c.cliente)]  || {};
  return {
    id:    c.id,
    conta: String(c.cliente || ""),
    nome:  sal.cliente || String(c.cliente || ""),
    suit:  c.suitability        || "NÃO INFORMADO",
    status:c.status             || "INATIVO",
    seg:   c.segmentacao_cliente || c.segmento || "–",
    netM1: sv(c.net_m_anterior)  || 0,
    netM:  sv(c.net_m)           || 0,
    rec:   sv(c.receita_mes)     || 0,
    cap:   sv(c.captacao_bruta_m)|| 0,
    resgate: sv(c.resgate_m)     || 0,
    cap_liq: sv(c.captacao_liquida_m) || 0,
    d0:    sv(sal.saldo_d0)      || 0,
    ader:  qual.aderencia        ?? null,
    gap_over:  qual.gap_over     ?? null,
    gap_under: qual.gap_under    ?? null,
    pol_cadastrada: qual.politica_cadastrada || null,
    pol_sugerida:   qual.politica_sugerida   || null,
    status_pix:     banc.status_chave_pix    || null,
    elegivel_turbo: banc.elegivel_turbo      || null,
    portabilidade:  banc.portabilidade       || null,
    principalidade: banc.principalidade      || null,
    tipo_pessoa:    c.tipo_pessoa,
    profissao:      c.profissao,
    // alocação
    aloc_rf:    sv(c.aloc_renda_fixa),
    aloc_rv:    sv(c.aloc_renda_variavel),
    aloc_fundos:sv(c.aloc_fundos),
    aloc_fi:    sv(c.aloc_fi),
    aloc_prev:  sv(c.aloc_previdencia),
    aloc_fin:   sv(c.aloc_financeiro),
    aloc_out:   sv(c.aloc_outros),
    ult: c.data_referencia || c.data_cadastro || "–",
  };
}

function KpiCard({ label, value, color, sub, t }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div style={{ color: color || t.tx, fontWeight: 800, fontSize: "clamp(12px,1.6vw,20px)", lineHeight: 1.15, wordBreak: "break-word" }}>{value}</div>
      {sub && <div style={{ color: t.txd, fontSize: 10, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

export function Dash({ reunioes, tarefas, oport, setTab }) {
  const t = useT();
  const [det,       setDet]       = useState(null);
  const [modalList, setModalList] = useState(null);

  // Dados da API
  const [dadosDash, setDadosDash] = useState(null);
  const [clientes,  setClientes]  = useState([]);
  const [iea,       setIea]       = useState(null);   // último registro IEA
  const [saldoAgg,  setSaldoAgg]  = useState(null);   // totais de saldo
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.dashboard().catch(() => null),
      api.clientes().catch(() => []),
      gj(`${BASE}/saldo`),
      gj(`${BASE}/qualidade-alocacao`),
      gj(`${BASE}/perfil-bancario`),
      gj(`${BASE}/iea`),
    ]).then(([dash, cli, sal, qual, banc, ieaRes]) => {
      setDadosDash(dash || { net_total: 0, receita: 0, captacao: 0, resgate: 0, ativos: 0, inativos: 0 });

      // Indexa por conta para cruzamento
      const saldoMap = Object.fromEntries((sal  || []).map(s => [String(s.conta),   s]));
      const qualMap  = Object.fromEntries((qual || []).map(q => [String(q.conta),   q]));
      const bancoMap = Object.fromEntries((banc || []).map(b => [String(b.conta),   b]));

      setClientes((cli || []).map(c => mapearCliente(c, saldoMap, qualMap, bancoMap)));

      // Saldo agregado
      if (sal && sal.length > 0) {
        setSaldoAgg({
          d0:    sal.reduce((s, r) => s + sv(r.saldo_d0), 0),
          d1:    sal.reduce((s, r) => s + sv(r.saldo_d1), 0),
          total: sal.reduce((s, r) => s + sv(r.total),    0),
          contas: sal.length,
        });
      }

      // IEA — pega o mais recente
      if (ieaRes && ieaRes.length > 0) {
        setIea(ieaRes[0]);
      }
    }).finally(() => setLoading(false));
  }, []);

  // ── Derivados ────────────────────────────────────────────────────────────
  const d       = dadosDash || {};
  const net     = sv(d.net_total);
  const capBruta= sv(d.captacao);
  const resgate = sv(d.resgate);
  const capLiq  = capBruta - Math.abs(resgate);
  const receita = sv(d.receita);
  const progNet = Math.min((net / (PLANO.netMeta || 1)) * 100, 100);

  const D0_TOT  = saldoAgg?.d0 || clientes.reduce((s, c) => s + sv(c.d0), 0);

  const stats = useMemo(() =>
    getDashboardStats(reunioes, tarefas, oport, clientes),
    [reunioes, tarefas, oport, clientes]
  );
  const { proxR, alertH24, tarAtr, top4, saldoTop, rebalTop, porSuit, porSeg, semPix, comTurbo } = stats;

  // Gráficos — ponto atual + histórico zerado (será preenchido quando IEA histórico chegar)
  const netEvD = { lb: ["M-4","M-3","M-2","M-1","Atual"], v: [0,0,0,0, net/1e6] };
  const capEvD = { lb: ["M-4","M-3","M-2","M-1","Atual"], v: [0,0,0,0, capBruta/1e6] };
  const recEvD = { lb: ["M-4","M-3","M-2","M-1","Atual"], v: [0,0,0,0, receita] };

  // Métricas de qualidade de alocação agregadas
  const comAder  = clientes.filter(c => c.ader != null);
  const adMedia  = comAder.length > 0 ? comAder.reduce((s, c) => s + sv(c.ader), 0) / comAder.length : null;
  const criticos = comAder.filter(c => sv(c.ader) < 50).length;
  const enquad   = comAder.filter(c => sv(c.ader) >= 70).length;

  const handleFunilClick = (f) => {
    const opsNaFase = oport.filter(o =>
      (o.fase   && o.fase.toLowerCase()   === f.l.toLowerCase()) ||
      (o.status && o.status.toLowerCase() === f.l.toLowerCase()) ||
      (o.tipo   && o.tipo.toLowerCase()   === f.l.toLowerCase())
    );
    if (opsNaFase.length > 0) {
      const contas = opsNaFase.map(o => o.conta);
      setModalList({ title: `Clientes em: ${f.l}`, clients: clientes.filter(c => contas.includes(c.conta)) });
    } else {
      setTab("oportunidades");
    }
  };

  if (loading) return (
    <div style={{ padding: 40, color: t.gold, textAlign: "center", fontWeight: 700 }}>
      ⏳ Sincronizando Dashboard...
    </div>
  );

  if (det) return <CDetalhe c={det} onBack={() => setDet(null)} tarefas={tarefas} reunioes={reunioes} oport={oport} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* ── PATRIMÔNIO ASSESSOR ── */}
      <PatrimonioAssessor
        netTotal={net}
        clientesAtivos={d.ativos || 0}
        captacaoMes={capBruta}
      />

      {/* ── HERO STRIP ── */}
      <div style={{ background: `linear-gradient(135deg,${t.lt},${t.bg})`, borderRadius: 14, padding: "20px 24px", border: `1px solid ${t.gold}33`, display: "flex", flexWrap: "wrap", gap: 22, alignItems: "center" }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ color: t.gold, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
            {PLANO.escritorio} · {PLANO.codigo} · Ref {PLANO.ref || "–"}
          </div>
          <div style={{ color: t.tx, fontSize: 20, fontWeight: 800, marginTop: 3 }}>{PLANO.assessor}</div>
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", flex: 1 }}>
          {[
            { lb: "NET Total",       v: fB(net),      s: `Meta: ${fB(PLANO.netMeta)}`,  c: t.gold  },
            { lb: "Receita/mês",     v: fB2(receita), s: `Meta: ${fB(PLANO.comMeta)}`, c: t.green },
            { lb: "Cap. Líquida",    v: fB(capLiq),   s: `Bruta: ${fB(capBruta)}`,      c: capLiq >= 0 ? t.green : t.red },
            { lb: "Saldo Parado D0", v: fB(D0_TOT),   s: null,                          c: t.amber },
            { lb: "Clientes Ativos", v: d.ativos || 0,s: `${d.inativos || 0} inativos`, c: t.tx    },
          ].map(({ lb, v, s, c }) => (
            <div key={lb} style={{ minWidth: 100, maxWidth: 180, flex: "1 1 100px" }}>
              <KpiCard label={lb} value={v} color={c} sub={s} t={t} />
            </div>
          ))}
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
        {[
          { l: "NET Atual",      v: fB(net),       c: t.gold,  s: `${progNet.toFixed(1)}% da meta` },
          { l: "Cap. Líquida",   v: fB(capLiq),    c: capLiq >= 0 ? t.green : t.red, s: "no mês" },
          { l: "Receita/mês",    v: fB2(receita),  c: t.green, s: `Meta: ${fB(PLANO.comMeta)}` },
          { l: "Saldo D0",       v: fB(D0_TOT),    c: t.amber, s: `${saldoAgg?.contas || 0} contas` },
          { l: "Alertas 24h",    v: alertH24,      c: alertH24 > 0 ? t.red : t.green, s: "reuniões" },
          { l: "Tar. Atrasadas", v: tarAtr,        c: tarAtr > 0 ? t.red : t.green },
          { l: "Ader. Média",    v: adMedia != null ? `${adMedia.toFixed(0)}%` : "–", c: adMedia != null && adMedia < 70 ? t.red : t.green, s: `${criticos} críticos` },
          { l: "Rebalancear",    v: comAder.length - enquad, c: t.red, s: "aderência < 70%" },
          { l: "Sem PIX",        v: semPix,        c: t.amber, s: "oportunidade" },
          { l: "Turbo Elegível", v: comTurbo,      c: t.gold,  s: "banco" },
        ].map(({ l, v, c, s }) => (
          <Crd key={l} style={{ padding: "12px 14px", overflow: "hidden", minWidth: 0 }}>
            <KpiCard label={l} value={v} color={c} sub={s} t={t} />
          </Crd>
        ))}
      </div>

      {/* ── IEA — ÍNDICE DE ESFORÇOS ── */}
      {iea && (
        <Crd>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div style={{ color: t.tx, fontWeight: 700, fontSize: 13 }}>
              💪 Índice de Esforços do Assessor — {iea.mes_ano}
            </div>
            <Bdg label={`IEA: ${sv(iea.iea).toFixed(1)}%`} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8 }}>
            {[
              { l: "IEA",             v: `${sv(iea.iea).toFixed(1)}%`,           c: sv(iea.iea) >= 80 ? t.green : sv(iea.iea) >= 60 ? t.amber : t.red },
              { l: "Prospecção",      v: `${sv(iea.prospeccao).toFixed(1)}%`,    c: t.blue  },
              { l: "Relacionamento",  v: `${sv(iea.relacionamento).toFixed(1)}%`,c: t.green },
              { l: "Índice de Saúde", v: sv(iea.indice_saude).toFixed(1),        c: t.gold  },
              { l: "XPerformance",    v: iea.qtde_xperformance || 0,             c: t.purple || "#8b5cf6" },
              { l: "FP Realizados",   v: iea.qtde_fp_realizados || 0,            c: t.txm   },
              { l: "Ativ. Críticas",  v: `${sv(iea.pct_ativ_criticas).toFixed(0)}%`, c: sv(iea.pct_ativ_criticas) >= 80 ? t.green : t.red },
              { l: "Churn Bruto",     v: iea.churn_bruto || 0,                   c: iea.churn_bruto > 0 ? t.red : t.green },
            ].map(({ l, v, c }) => (
              <div key={l} style={{ background: t.lt, borderRadius: 8, padding: "10px 12px", border: `1px solid ${t.brd}` }}>
                <div style={{ color: t.txd, fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>{l}</div>
                <div style={{ color: c, fontSize: 15, fontWeight: 800 }}>{v}</div>
              </div>
            ))}
          </div>
          {/* Barras de prospecção e relacionamento */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
            {[
              { l: "Prospecção",     v: sv(iea.prospeccao),     c: t.blue  },
              { l: "Relacionamento", v: sv(iea.relacionamento),  c: t.green },
            ].map(({ l, v, c }) => (
              <div key={l}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ color: t.txm, fontSize: 11 }}>{l}</span>
                  <span style={{ color: c, fontWeight: 700, fontSize: 11 }}>{v.toFixed(1)}%</span>
                </div>
                <ProgressBar value={v} max={100} color={c} h={6} />
              </div>
            ))}
          </div>
        </Crd>
      )}

      {/* ── PROGRESSO NET ── */}
      <Crd>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
          <span style={{ color: t.txm, fontSize: 12, fontWeight: 600 }}>
            Evolução NET — {fB(net)} de {fB(PLANO.netMeta)}
          </span>
          <span style={{ color: t.gold, fontWeight: 700 }}>{progNet.toFixed(1)}%</span>
        </div>
        <ProgressBar value={net} max={PLANO.netMeta || 1} h={10} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 10, color: t.txd }}>
          <span>Atual: {fB(net)}</span>
          <span>Gap: {fB((PLANO.netMeta || 0) - net)}</span>
          <span>Meta: {fB(PLANO.netMeta)}</span>
        </div>
      </Crd>

      {/* ── GRÁFICOS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
        <Crd>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Evolução NET (R$ Mi)</div>
          <LChart series={[{ data: netEvD.v, color: t.gold, area: true }]} labels={netEvD.lb} height={95} />
        </Crd>
        <Crd>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Captação Bruta (R$ Mi)</div>
          <LChart series={[{ data: capEvD.v, color: t.green }]} labels={capEvD.lb} height={95} type="bar" />
        </Crd>
        <Crd>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Receita Mensal (R$)</div>
          <LChart series={[{ data: recEvD.v, color: t.purple || "#8b5cf6", area: true }]} labels={recEvD.lb} height={95} />
        </Crd>
      </div>

      {/* ── DISTRIBUIÇÃO POR SUITABILITY E SEGMENTO ── */}
      {(porSuit.length > 0 || porSeg.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* Por Suitability */}
          <Crd>
            <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Por Suitability</div>
            {porSuit.map((s, i) => {
              const cores = [t.red, t.gold, t.green, t.blue, t.txm];
              const totalNet = porSuit.reduce((acc, x) => acc + x.net, 0);
              return (
                <div key={s.label} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ color: t.txm, fontSize: 11 }}>{s.label}</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ color: cores[i % cores.length], fontWeight: 700, fontSize: 11 }}>{s.count}</span>
                      <span style={{ color: t.txd, fontSize: 10 }}>{fB(s.net)}</span>
                    </div>
                  </div>
                  <ProgressBar value={s.net} max={totalNet || 1} color={cores[i % cores.length]} h={4} />
                </div>
              );
            })}
          </Crd>

          {/* Por Segmento */}
          <Crd>
            <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Por Segmento</div>
            {porSeg.slice(0, 6).map((s, i) => {
              const cores = [t.gold, t.blue, t.green, t.amber, t.purple || "#8b5cf6", t.txm];
              const totalNet = porSeg.reduce((acc, x) => acc + x.net, 0);
              return (
                <div key={s.label} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ color: t.txm, fontSize: 11 }}>{s.label}</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ color: cores[i % cores.length], fontWeight: 700, fontSize: 11 }}>{s.count}</span>
                      <span style={{ color: t.txd, fontSize: 10 }}>{fB(s.net)}</span>
                    </div>
                  </div>
                  <ProgressBar value={s.net} max={totalNet || 1} color={cores[i % cores.length]} h={4} />
                </div>
              );
            })}
          </Crd>
        </div>
      )}

      {/* ── FUNIL ── */}
      <Crd>
        <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
          Funil Comercial — {new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 8 }}>
          {[...PLANO.funilH, ...PLANO.funilF].map(f => {
            const pct = (sv(f.real) / sv(f.meta || 1)) * 100;
            const co  = pct >= 70 ? t.green : pct >= 40 ? t.amber : t.red;
            return (
              <div
                key={f.l}
                onClick={() => handleFunilClick(f)}
                style={{ background: t.lt, borderRadius: 8, padding: "10px 12px", border: `1px solid ${t.brd}`, cursor: "pointer", transition: "transform 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = co; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = t.brd; }}
              >
                <div style={{ fontSize: 15, marginBottom: 3 }}>{f.icon}</div>
                <div style={{ color: t.txm, fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>{f.l}</div>
                <div style={{ color: co, fontSize: 17, fontWeight: 700, margin: "2px 0" }}>
                  {f.real} <span style={{ color: t.txd, fontSize: 11 }}>/ {f.meta}</span>
                </div>
                <ProgressBar value={f.real} max={f.meta || 1} color={co} h={3} />
              </div>
            );
          })}
        </div>
      </Crd>

      <ClientesSemContato />
      <RankingCaptacao />

      {/* ── PRÓXIMA REUNIÃO + ALERTAS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {proxR && (
            <div onClick={() => setTab("reunioes")} style={{ background: `${t.blue}15`, border: `1px solid ${t.blue}44`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
              <div style={{ fontSize: 20 }}>📅</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: t.tx, fontWeight: 700 }}>Próxima reunião: {proxR.cliente}</div>
                <div style={{ color: t.txm, fontSize: 11 }}>{fDT(proxR.dataHora)} · {proxR.tipo}</div>
              </div>
              <div style={{ color: t.blue, fontSize: 12, fontWeight: 600 }}>Ver →</div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {saldoTop.slice(0, 2).map(c => (
              <div key={c.conta} style={{ background: `${t.amber}15`, border: `1px solid ${t.amber}33`, borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ color: t.amber, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>Saldo Parado</div>
                <div style={{ color: t.tx, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.nome}</div>
                <div style={{ color: t.amber, fontWeight: 700, fontSize: 14 }}>{fB(c.d0)}</div>
              </div>
            ))}
          </div>
        </div>

        <Crd>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Alertas Rápidos</div>
          {[
            { i: "💰", l: `${clientes.filter(c => sv(c.d0) > 5000).length} com saldo parado`, c: t.amber, clis: clientes.filter(c => sv(c.d0) > 5000) },
            { i: "😴", l: `${d.inativos || 0} clientes inativos`, c: t.txm, clis: clientes.filter(c => (c.status || "").toUpperCase() === "INATIVO") },
            { i: "⚠️", l: `${comAder.length - enquad} rebalancear`, c: t.red, clis: clientes.filter(c => c.ader != null && sv(c.ader) < 70) },
            { i: "🔑", l: `${semPix} sem chave PIX`, c: t.amber, clis: clientes.filter(c => c.status_pix && !c.status_pix.includes("Tem")) },
            { i: "📋", l: `${tarAtr} tarefas atrasadas`, c: t.red, tabRouter: "tarefas" },
            { i: "🔥", l: `${oport.filter(o => o.status === "Nova").length} novas oportunidades`, c: t.blue, tabRouter: "oportunidades" },
          ].map(({ i, l, c, clis, tabRouter }) => (
            <div
              key={l}
              onClick={() => clis ? setModalList({ title: l, clients: clis }) : setTab(tabRouter)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderBottom: `1px solid ${t.brd}`, fontSize: 12, cursor: "pointer", borderRadius: 4, transition: "background 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.background = `${c}15`}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span>{i}</span><span style={{ color: c, flex: 1 }}>{l}</span>
            </div>
          ))}
        </Crd>
      </div>

      <NotificacoesWindows />

      {/* ── TOP CLIENTES ── */}
      <div>
        <div style={{ color: t.tx, fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Top Clientes por NET</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
          {top4.map(c => <CCard key={c.conta} c={c} onClick={setDet} />)}
        </div>
      </div>

      {/* ── MODAL LISTA ── */}
      {modalList && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(3px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Crd style={{ width: "100%", maxWidth: 450, maxHeight: "80vh", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden", boxShadow: "0 10px 40px rgba(0,0,0,0.5)", border: `1px solid ${t.gold}` }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.brd}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: t.lt }}>
              <div style={{ color: t.tx, fontWeight: 700, fontSize: 15 }}>{modalList.title}</div>
              <button onClick={() => setModalList(null)} style={{ background: "none", border: "none", color: t.txm, fontSize: 24, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
              {modalList.clients.length === 0
                ? <div style={{ color: t.txd, fontSize: 13, textAlign: "center", padding: "20px 0" }}>Nenhum cliente encontrado.</div>
                : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {modalList.clients.map(c => (
                      <div
                        key={c.conta}
                        onClick={() => { setDet(c); setModalList(null); }}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: t.lt, borderRadius: 8, cursor: "pointer", border: `1px solid ${t.brd}`, transition: "border-color 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = t.gold}
                        onMouseLeave={e => e.currentTarget.style.borderColor = t.brd}
                      >
                        <div>
                          <div style={{ color: t.tx, fontWeight: 600, fontSize: 14 }}>{c.nome}</div>
                          <div style={{ color: t.txm, fontSize: 11, fontFamily: "monospace", marginTop: 2 }}>Conta: {c.conta}</div>
                          {c.ader != null && <div style={{ color: sv(c.ader) < 70 ? t.red : t.green, fontSize: 10, marginTop: 2 }}>Aderência: {sv(c.ader).toFixed(0)}%</div>}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ color: t.gold, fontWeight: 700, fontSize: 14 }}>{fB(c.netM)}</div>
                          <div style={{ color: t.txm, fontSize: 10 }}>{c.suit}</div>
                          {c.d0 > 0 && <div style={{ color: t.amber, fontSize: 10 }}>D0: {fB2(c.d0)}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </Crd>
        </div>
      )}

    </div>
  );
}

export const Dashboard = Dash;
