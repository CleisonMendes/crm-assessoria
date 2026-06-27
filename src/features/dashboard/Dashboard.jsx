import { useState, useMemo, useEffect } from "react";
import { api } from "../../services/api.js"; 
import { PLANO } from "../../data/plano.js";
import { Crd, ProgressBar } from "../../components/ui/index.js";
import { LChart } from "../../components/charts/index.js";
import { useT } from "../../theme/ThemeContext.jsx";
import { fB, fB2, fDT } from "../../utils/formatters.js";
import { sv } from "../../utils/numbers.js";
import { CCard } from "../clientes/ClienteCard.jsx";
import { CDetalhe } from "../clientes/ClienteDetalhe.jsx";
import { getDashboardStats } from "./dashboardUtils.js";
import CotacoesBar from '../../components/CotacoesBar';

import { PatrimonioAssessor } from './PatrimonioAssessor.jsx';
import { ClientesSemContato } from '../clientes/ClientesSemContato.jsx';
import { RankingCaptacao } from './RankingCaptacao.jsx';
import { NotificacoesWindows } from '../alertas/NotificacoesWindows.jsx';

// Mapeia as colunas cruas do banco (SQLite) para os campos padrão que os componentes React esperam
function mapearCliente(c) {
  if (c.nome !== undefined && !c.cliente) return c; // Evita re-mapear dados locais antigos
  return {
    id: c.id,
    conta: String(c.cliente || ""),
    nome: String(c.cliente || "Código " + (c.cliente || "")), 
    suit: c.suitability || "NÃO INFORMADO",
    status: c.status || "INATIVO",
    seg: c.segmentacao_cliente || c.segmento || "–",
    netM1: c.net_m_anterior || 0,
    netM: c.net_m || 0,
    rec: c.receita_mes || 0,
    cap: c.captacao_bruta_m || 0,
    res: c.resgate_m || 0,
    d0: c.aloc_financeiro || 0, 
    ader: c.aderencia || null, 
    ult: c.atualizado_em || c.importado_em || "–",
    profissao: c.profissao,
    sexo: c.sexo,
    tipo_pessoa: c.tipo_pessoa
  };
}

function KpiCard({ label, value, color, sub, t }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div style={{ color: color || t.tx, fontWeight: 800, fontSize: "clamp(12px, 1.6vw, 20px)", lineHeight: 1.15, wordBreak: "break-word", whiteSpace: "normal" }}>{value}</div>
      {sub && <div style={{ color: t.txd, fontSize: 10, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

export function Dash({ reunioes, tarefas, oport, setTab }) {
  const t = useT();
  const [det, setDet] = useState(null);
  const [modalList, setModalList] = useState(null);
  const [assessorId] = useState("A5-1229");

  // Estados integrados com a API
  const [dadosDash, setDadosDash] = useState(null);
  const [clientesDb, setClientesDb] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sincronização inicial com o backend
  useEffect(() => {
    Promise.all([api.dashboard(), api.clientes()])
      .then(([dashRes, cliRes]) => {
        setDadosDash(dashRes);
        // Normaliza a base de clientes imediatamente após o fetch
        setClientesDb(cliRes ? cliRes.map(mapearCliente) : []);
      })
      .catch(err => console.error("Erro na API:", err))
      .finally(() => setLoading(false));
  }, []);

   // Consolidadores
  const d = dadosDash || { net_total: 0, receita: 0, captacao: 0, resgate: 0, ativos: 0, inativos: 0 };
  
  // 👇 NOVO: Usar o plano do banco se existir, senão usa o arquivo estático
  const PLANO_DINAMICO = d.plano ? {
    ...PLANO, // Mantém dados visuais como ícones do funil
    netMeta: d.plano.meta_captacao || PLANO.netMeta,
    comMeta: d.plano.comissao_projetada || PLANO.comMeta,
    tickets: d.plano.tickets_planejados || PLANO.tickets
  } : PLANO;

  const IEA_DINAMICO = d.iea_recente || null;

  // Agora usamos c.d0 tranquilamente pois o mapeamento já traduziu de c.aloc_financeiro
  const D0_TOT = clientesDb.reduce((acc, c) => acc + sv(c.d0), 0);
  const progNet = Math.min((d.net_total / (PLANO_DINAMICO.netMeta || 1)) * 100, 100);

  // Evolução Gráfica (Dados Atuais do Mês)
  const netMi = (d.net_total || 0) / 1000000;
  const capMi = (d.captacao || 0) / 1000000;
  const rec = d.receita || 0;
  const netEvDynamic = { lb: ["Mês -4", "Mês -3", "Mês -2", "Mês -1", "Atual"], v: [0, 0, 0, 0, netMi] };
  const capEvDynamic = { lb: ["Mês -4", "Mês -3", "Mês -2", "Mês -1", "Atual"], v: [0, 0, 0, 0, capMi] };
  const recEvDynamic = { lb: ["Mês -4", "Mês -3", "Mês -2", "Mês -1", "Atual"], v: [0, 0, 0, 0, rec] };

  // Atualiza as estatísticas usando a base normalizada
  const stats = useMemo(() =>
    getDashboardStats(reunioes, tarefas, oport, clientesDb),
    [reunioes, tarefas, oport, clientesDb]
  );

  const { proxR, alertH24, tarAtr, top4, saldoTop } = stats;

  const handleFunilClick = (f) => {
    const opsNaFase = oport.filter(o =>
      (o.fase && o.fase.toLowerCase() === f.l.toLowerCase()) ||
      (o.status && o.status.toLowerCase() === f.l.toLowerCase()) ||
      (o.tipo && o.tipo.toLowerCase() === f.l.toLowerCase())
    );
    if (opsNaFase.length > 0) {
      const contas = opsNaFase.map(o => o.conta);
      const clientesDoFunil = clientesDb.filter(c => contas.includes(c.conta));
      setModalList({ title: `Clientes em: ${f.l}`, clients: clientesDoFunil });
    } else {
      setTab("oportunidades");
    }
  };

  if (loading) {
    return <div style={{ padding: 40, color: t.gold, textAlign: 'center', fontWeight: 700 }}>⏳ Sincronizando Dashboard com SQLite...</div>;
  }

  if (det) return <CDetalhe c={det} onBack={() => setDet(null)} tarefas={tarefas} reunioes={reunioes} oport={oport} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      <CotacoesBar />

      <PatrimonioAssessor assessorId={assessorId} netTotal={d.net_total} clientesAtivos={d.ativos} captacaoMes={d.captacao} />

      {/* ── HERO STRIP ── */}
      <div style={{ background: `linear-gradient(135deg,${t.lt},${t.bg})`, borderRadius: 14, padding: "20px 24px", border: `1px solid ${t.gold}33`, display: "flex", flexWrap: "wrap", gap: 22, alignItems: "center" }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ color: t.gold, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{PLANO.escritorio} · {PLANO.codigo} · Ref {PLANO.ref || "13/06/2026"}</div>
          <div style={{ color: t.tx, fontSize: 20, fontWeight: 800, marginTop: 3 }}>{PLANO.assessor}</div>
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", flex: 1 }}>
          {[
            { lb: "NET Total",        v: fB(d.net_total), s: `Meta: ${fB(PLANO.netMeta)}`, c: t.gold  },
            { lb: "Receita/mes",      v: fB2(d.receita),  s: `Meta: ${fB(PLANO.comMeta)}`, c: t.green },
            { lb: "Captacao Bruta",   v: fB(d.captacao),  s: `Resgate: ${fB(d.resgate)}`,  c: t.tx    },
            { lb: "Saldo Parado D0",  v: fB(D0_TOT),      s: null,                         c: t.amber },
            { lb: "Clientes Ativos",  v: d.ativos,        s: `${d.inativos} inativos`,     c: t.tx    },
          ].map(({ lb, v, s, c }) => (
            <div key={lb} style={{ minWidth: 100, maxWidth: 180, flex: "1 1 100px" }}>
              <KpiCard label={lb} value={v} color={c} sub={s} t={t} />
            </div>
          ))}
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
        {[
          { l: "NET Atual",      v: fB(d.net_total), c: t.gold,  s: `${progNet.toFixed(1)}% da meta` },
          { l: "Comissao est.",  v: fB2(d.receita),  c: t.green, s: `Meta: ${fB(PLANO.comMeta)}` },
          { l: "Cap. Bruta",     v: fB(d.captacao),  c: t.green, s: "no mes" },
          { l: "Resgates",       v: fB(d.resgate),   c: t.red,   s: "no mes" },
          { l: "Alertas 24h",    v: alertH24,        c: alertH24 > 0 ? t.red : t.green, s: "reunioes" },
          { l: "Tar. Atrasadas", v: tarAtr,          c: tarAtr > 0 ? t.red : t.green },
          { l: "Oport. Ativas",  v: oport.filter(o => o.status !== "Convertida" && o.status !== "Perdida").length, c: t.blue, s: "em aberto" },
          { l: "Rebalancear",    v: clientesDb.filter(c => c.ader != null && sv(c.ader) < 0.7).length, c: t.red, s: "aderencia < 70%" },
        ].map(({ l, v, c, s }) => (
          <Crd key={l} style={{ padding: "12px 14px", overflow: "hidden", minWidth: 0 }}>
            <KpiCard label={l} value={v} color={c} sub={s} t={t} />
          </Crd>
        ))}
      </div>

      {/* ── PROGRESSO NET ── */}
      <Crd>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
          <span style={{ color: t.txm, fontSize: 12, fontWeight: 600 }}>Evolucao NET — {fB(d.net_total)} de {fB(PLANO.netMeta)}</span>
          <span style={{ color: t.gold, fontWeight: 700 }}>{progNet.toFixed(1)}%</span>
        </div>
        <ProgressBar value={d.net_total} max={PLANO.netMeta || 1} h={10} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 10, color: t.txd }}>
          <span>Atual: {fB(d.net_total)}</span><span>Gap: {fB((PLANO.netMeta || 0) - d.net_total)}</span><span>Meta: {fB(PLANO.netMeta)}</span>
        </div>
      </Crd>

      {/* ── GRÁFICOS DINÂMICOS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
        <Crd><div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Evolucao NET (R$ Mi)</div><LChart series={[{ data: netEvDynamic.v, color: t.gold, area: true }]} labels={netEvDynamic.lb} height={95} /></Crd>
        <Crd><div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Captacao Bruta (R$ Mi)</div><LChart series={[{ data: capEvDynamic.v, color: t.green }]} labels={capEvDynamic.lb} height={95} type="bar" /></Crd>
        <Crd><div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Receita Mensal (R$)</div><LChart series={[{ data: recEvDynamic.v, color: t.purple, area: true }]} labels={recEvDynamic.lb} height={95} /></Crd>
      </div>

      {/* ── FUNIL ── */}
      <Crd>
        <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Funil Comercial — Junho 2026</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 8 }}>
          {[...PLANO.funilH, ...PLANO.funilF].map(f => {
            const pct = (sv(f.real) / sv(f.meta || 1)) * 100;
            const co = pct >= 70 ? t.green : pct >= 40 ? t.amber : t.red;
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
                <div style={{ color: co, fontSize: 17, fontWeight: 700, margin: "2px 0" }}>{f.real} <span style={{ color: t.txd, fontSize: 11 }}>/ {f.meta}</span></div>
                <ProgressBar value={f.real} max={f.meta} color={co} h={3} />
              </div>
            );
          })}
        </div>
      </Crd>

      <ClientesSemContato />
      <RankingCaptacao />

      {/* ── PRÓXIMA REUNIÃO + ALERTAS DINÂMICOS ── */}
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
              <div key={c.id || c.conta} style={{ background: `${t.amber}15`, border: `1px solid ${t.amber}33`, borderRadius: 8, padding: "10px 12px" }}>
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
            { i: "💰", l: `${clientesDb.filter(c => sv(c.d0) > 5000).length} com saldo parado`, c: t.amber, clis: clientesDb.filter(c => sv(c.d0) > 5000) },
            { i: "😴", l: `${d.inativos} clientes inativos`, c: t.txm, clis: clientesDb.filter(c => c.status.toUpperCase() === "INATIVO") },
            { i: "⚠️", l: `${clientesDb.filter(c => c.ader != null && sv(c.ader) < 0.7).length} rebalancear`, c: t.red, clis: clientesDb.filter(c => c.ader != null && sv(c.ader) < 0.7) },
            { i: "📋", l: `${tarAtr} tarefas atrasadas`, c: t.red, tabRouter: "tarefas" },
            { i: "🔥", l: `${oport.filter(o => o.status === "Nova").length} novas oportunidades`, c: t.blue, tabRouter: "oportunidades" },
          ].map(({ i, l, c, clis, tabRouter }) => (
            <div
              key={l}
              onClick={() => clis ? setModalList({ title: l.replace(/^[0-9]+ /, ''), clients: clis }) : setTab(tabRouter)}
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
          {top4.map(c => <CCard key={c.id || c.conta} c={c} onClick={setDet} />)}
        </div>
      </div>

      {/* ── MODAL LISTA CLIENTES ── */}
      {modalList && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(3px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Crd style={{ width: "100%", maxWidth: 450, maxHeight: "80vh", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden", boxShadow: "0 10px 40px rgba(0,0,0,0.5)", border: `1px solid ${t.gold}` }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.brd}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: t.lt }}>
              <div style={{ color: t.tx, fontWeight: 700, fontSize: 15, textTransform: "capitalize" }}>{modalList.title}</div>
              <button onClick={() => setModalList(null)} style={{ background: "none", border: "none", color: t.txm, fontSize: 24, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
              {modalList.clients.length === 0
                ? <div style={{ color: t.txd, fontSize: 13, textAlign: "center", padding: "20px 0" }}>Nenhum cliente encontrado.</div>
                : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {modalList.clients.map(c => (
                    <div
                      key={c.id || c.conta}
                      onClick={() => { setDet(c); setModalList(null); }}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: t.lt, borderRadius: 8, cursor: "pointer", border: `1px solid ${t.brd}`, transition: "border-color 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = t.gold}
                      onMouseLeave={e => e.currentTarget.style.borderColor = t.brd}
                    >
                      <div>
                        <div style={{ color: t.tx, fontWeight: 600, fontSize: 14 }}>{c.nome}</div>
                        <div style={{ color: t.txm, fontSize: 11, fontFamily: "monospace", marginTop: 2 }}>Conta: {c.conta}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: t.gold, fontWeight: 700, fontSize: 14 }}>{fB(c.netM)}</div>
                        <div style={{ color: t.txm, fontSize: 10 }}>{c.suit}</div>
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