import { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "../../services/api.js";
import { sv } from "../../utils/numbers.js";
import { Crd, KPI, Btn, ProgressBar, Bdg } from "../../components/ui/index.js";
import { Donut } from "../../components/charts/index.js";
import { LineChart } from "../../components/charts/LineChart.jsx";
import { useT } from "../../theme/ThemeContext.jsx";
import { fB, fB2, fP } from "../../utils/formatters.js";
import { CDetalhe } from "../clientes/ClienteDetalhe.jsx";

const BASE = "http://localhost:3001/api";
const gj   = url => fetch(url).then(r => r.json()).catch(() => null);

// ════════════════════════════════════════════════════════════════════════════
// HELPERS PUROS (fora do componente → não recriados a cada render)
// ════════════════════════════════════════════════════════════════════════════

function mapearClienteAoClicar(c, saldos = [], qualidade = [], bancario = []) {
  if (c.nome !== undefined) return c;
  const saldo = saldos.find(s => String(s.conta) === String(c.cliente)) || {};
  const qual  = qualidade.find(q => String(q.conta) === String(c.cliente)) || {};
  const banco = bancario.find(b => String(b.conta) === String(c.cliente)) || {};
  return {
    id: c.id,
    conta: String(c.cliente || ""),
    nome: saldo.cliente || String(c.cliente || ""),
    suit: c.suitability || "NÃO INFORMADO",
    status: c.status || "INATIVO",
    seg: c.segmentacao_cliente || c.segmento || "–",
    profissao: c.profissao,
    sexo: c.sexo,
    tipo_pessoa: c.tipo_pessoa,
    data_cadastro: c.data_cadastro,
    data_nasc: c.data_nascimento,
    termo_qual: c.termo_qualificado,
    termo_prof: c.termo_profissional,
    ativo_m: c.ativou_em_m,
    evadiu_m: c.evadiu_em_m,
    fez_segundo_aporte: c.fez_segundo_aporte,
    operou_bolsa: c.operou_bolsa,
    operou_fundo: c.operou_fundo,
    operou_rf: c.operou_renda_fixa,
    netM1: sv(c.net_m_anterior) || 0,
    netM: sv(c.net_m) || 0,
    rec: sv(c.receita_mes) || 0,
    rec_bovespa: sv(c.receita_bovespa) || 0,
    rec_futuros: sv(c.receita_futuros) || 0,
    rec_rf_banc: sv(c.receita_rf_bancarios) || 0,
    rec_rf_priv: sv(c.receita_rf_privados) || 0,
    rec_rf_pub: sv(c.receita_rf_publicos) || 0,
    rec_aluguel: sv(c.valor_receita_aluguel) || 0,
    rec_pacote: sv(c.valor_receita_pacote) || 0,
    cap: sv(c.captacao_bruta_m) || 0,
    resgate: sv(c.resgate_m) || 0,
    cap_liq: sv(c.captacao_liquida_m) || 0,
    cap_ted: sv(c.captacao_ted) || 0,
    cap_prev: sv(c.captacao_prev) || 0,
    aloc_rf: sv(c.aloc_renda_fixa) || 0,
    aloc_fi: sv(c.aloc_fi) || 0,
    aloc_rv: sv(c.aloc_renda_variavel) || 0,
    aloc_fundos: sv(c.aloc_fundos) || 0,
    aloc_prev: sv(c.aloc_previdencia) || 0,
    aloc_fin: sv(c.aloc_financeiro) || 0,
    aloc_out: sv(c.aloc_outros) || 0,
    d0: sv(saldo.saldo_d0) || 0,
    d1: sv(saldo.saldo_d1) || 0,
    d2: sv(saldo.saldo_d2) || 0,
    d3: sv(saldo.saldo_d3) || 0,
    saldo_total: sv(saldo.total) || 0,
    ader: qual.aderencia ?? null,
    gap_over: qual.gap_over ?? null,
    gap_under: qual.gap_under ?? null,
    rentab_rel: qual.rentabilidade ?? null,
    pol_cadastrada: qual.politica_cadastrada || null,
    pol_sugerida: qual.politica_sugerida || null,
    saldo_global: qual.saldo_global ?? null,
    uso_conta: banco.uso_conta || null,
    status_corretora: banco.status_corretora || null,
    elegivel_turbo: banco.elegivel_turbo || null,
    faixa_auc: banco.faixa_auc || null,
    portabilidade: banco.portabilidade || null,
    status_boleto: banco.status_pgto_boleto || null,
    status_fatura: banco.status_pgto_fatura || null,
    status_pix: banco.status_chave_pix || null,
    principalidade: banco.principalidade || null,
    faixa_pgto_m0: banco.faixa_pgto_m0 || null,
    faixa_pgto_m1: banco.faixa_pgto_m1 || null,
    faixa_pgto_m2: banco.faixa_pgto_m2 || null,
    ult: c.data_referencia || c.data_cadastro || "–",
  };
}

// Normaliza aderência: aceita string com vírgula/ponto/%, e decimal (0.85 → 85)
function svAder(v) {
  if (v == null || v === "" || v === "–" || v === "-") return null;
  const n = parseFloat(String(v).replace(",", ".").replace("%", "").trim());
  if (isNaN(n)) return null;
  return n > 0 && n <= 1 ? n * 100 : n;
}

// ── SCORE BANCÁRIO (perfil bancário) ──────────────────────────────────────
function calcularScoreBancario(b) {
  let score = 0;
  const itens = [];
  const add = (cond, label, peso) => {
    if (cond) score += peso;
    itens.push({ l: label, v: peso, ok: !!cond });
  };
  add(b.status_chave_pix && b.status_chave_pix.includes("Tem"), "Chave PIX", 20);
  add(b.portabilidade && !b.portabilidade.includes("Nao"), "Portabilidade", 20);
  add(b.principalidade === "Principal", "Conta Principal", 25);
  add(b.uso_conta === "Conta_Ativa", "Conta Ativa", 15);
  add(b.elegivel_turbo === "Sim", "Elegível Turbo", 10);
  add(b.status_pgto_boleto && b.status_pgto_boleto !== "Nao_Tem", "Pgto Boleto", 5);
  add(b.status_pgto_fatura && b.status_pgto_fatura !== "Nao_Tem", "Pgto Fatura", 5);
  const label = score >= 80 ? "Excelente" : score >= 60 ? "Bom" : score >= 40 ? "Regular" : "Baixo";
  return { score, label, itens };
}

// ── SCORE DE SAÚDE DA CARTEIRA (cliente) — multi-fator, nível "private banking" ──
// Combina: aderência da alocação, tendência de NET (M-1→M), atividade operacional
// e relacionamento bancário, num único índice de 0–100 com pesos justificados:
//   Aderência 40%   → maior peso: é o indicador estrutural de risco de alocação
//   Tendência 25%   → fluxo recente importa mais que foto estática
//   Atividade 20%   → cliente engajado tende a reter melhor
//   Bancário  15%   → relacionamento bancário é complementar, não core
function calcularScoreCarteira({ aderencia, netM, netM1, operouBolsa, operouFundo, operouRF, scoreBancario }) {
  const adNorm = aderencia != null ? Math.max(0, Math.min(100, aderencia)) : 50; // neutro se sem dado

  const variacao = netM1 > 0 ? ((netM - netM1) / netM1) * 100 : 0;
  // Mapeia variação percentual para 0–100: -20% ou pior = 0, +20% ou melhor = 100
  const tendNorm = Math.max(0, Math.min(100, 50 + variacao * 2.5));

  const ativOps = [operouBolsa, operouFundo, operouRF].filter(v => String(v).toLowerCase().includes("sim")).length;
  const ativNorm = (ativOps / 3) * 100;

  const bancNorm = scoreBancario ?? 50;

  const score = Math.round(adNorm * 0.40 + tendNorm * 0.25 + ativNorm * 0.20 + bancNorm * 0.15);
  return { score: Math.max(0, Math.min(100, score)), variacao };
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function Carteira() {
  const t = useT();

  const [dash, setDash] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [divers, setDivers] = useState([]);
  const [saldos, setSaldos] = useState([]);
  const [qualidade, setQualidade] = useState([]);
  const [bancario, setBancario] = useState([]);
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState("alocacao");
  const [filtroAder, setFiltroAder] = useState("Todos");
  const [filtroBanc, setFiltroBanc] = useState("Todos");
  const [det, setDet] = useState(null);

  useEffect(() => {
    Promise.all([
      api.dashboard().catch(() => null),
      api.clientes().catch(() => []),
      gj(`${BASE}/diversificacao/consolidado`),
      gj(`${BASE}/saldo`),
      gj(`${BASE}/qualidade-alocacao`),
      gj(`${BASE}/perfil-bancario`),
    ]).then(([d, cli, div, sal, qual, banc]) => {
      setDash(d || { net_total: 0, receita: 0, captacao: 0, resgate: 0 });
      setClientes(cli || []);
      setDivers(div || []);
      setSaldos(sal || []);
      setQualidade(qual || []);
      setBancario(banc || []);
    }).finally(() => setLoading(false));
  }, []);

  // useCallback: a referência da função só muda se as listas mudarem,
  // evitando recriação a cada render dos cards (que passam isso como onClick)
  const abrirDetalheCliente = useCallback((conta) => {
    const idLimpo = String(conta).replace(".0", "");
    const c = clientes.find(cli => String(cli.cliente).replace(".0", "") === idLimpo);
    if (c) setDet(mapearClienteAoClicar(c, saldos, qualidade, bancario));
  }, [clientes, saldos, qualidade, bancario]);

  // ── MÉTRICAS MACRO ─────────────────────────────────────────────────────
  const macro = useMemo(() => {
    const d = dash || {};
    const capBruta = sv(d.captacao);
    const resgate = sv(d.resgate);
    return {
      net: sv(d.net_total),
      capBruta,
      resgate,
      capLiq: capBruta - Math.abs(resgate),
      receita: sv(d.receita),
    };
  }, [dash]);

  // ── SALDO CONSOLIDADO agregado ────────────────────────────────────────
  const saldoAgg = useMemo(() => ({
    d0: saldos.reduce((s, r) => s + sv(r.saldo_d0), 0),
    d1: saldos.reduce((s, r) => s + sv(r.saldo_d1), 0),
    d2: saldos.reduce((s, r) => s + sv(r.saldo_d2), 0),
    d3: saldos.reduce((s, r) => s + sv(r.saldo_d3), 0),
    total: saldos.reduce((s, r) => s + sv(r.total), 0),
    contas: saldos.length,
  }), [saldos]);

  // Mapa conta→nome — usado em várias abas, calculado uma vez
  const nomeMap = useMemo(
    () => Object.fromEntries(saldos.map(s => [String(s.conta), s.cliente || s.conta])),
    [saldos]
  );

  // ── ALOCAÇÃO GLOBAL ───────────────────────────────────────────────────
  const { classesGlobal, totalAloc } = useMemo(() => {
    const aloc = { rf: 0, rv: 0, fundos: 0, fi: 0, prev: 0, fin: 0, out: 0 };
    clientes.forEach(c => {
      aloc.rf += sv(c.aloc_renda_fixa);
      aloc.rv += sv(c.aloc_renda_variavel);
      aloc.fundos += sv(c.aloc_fundos);
      aloc.fi += sv(c.aloc_fi);
      aloc.prev += sv(c.aloc_previdencia);
      aloc.fin += sv(c.aloc_financeiro);
      aloc.out += sv(c.aloc_outros);
    });
    const total = Object.values(aloc).reduce((s, v) => s + v, 0);
    const classes = [
      { l: "Renda Fixa", valor: aloc.rf, cor: t.blue },
      { l: "Renda Variável", valor: aloc.rv, cor: t.gold },
      { l: "Fundos", valor: aloc.fundos, cor: t.purple || "#8b5cf6" },
      { l: "FIIs", valor: aloc.fi, cor: "#06b6d4" },
      { l: "Previdência", valor: aloc.prev, cor: t.green },
      { l: "Financeiro", valor: aloc.fin, cor: t.amber },
      { l: "Outros", valor: aloc.out, cor: t.txd },
    ]
      .filter(c => c.valor > 0)
      .map(c => ({ ...c, pct: total > 0 ? c.valor / total : 0 }))
      .sort((a, b) => b.valor - a.valor);
    return { classesGlobal: classes, totalAloc: total };
  }, [clientes, t]);

  const topClientesNet = useMemo(
    () => [...clientes].sort((a, b) => sv(b.net_m) - sv(a.net_m)).slice(0, 15),
    [clientes]
  );

  // ── QUALIDADE DE ALOCAÇÃO / ADERÊNCIA ─────────────────────────────────
  const aderAgg = useMemo(() => {
    const comAder = qualidade.filter(q => svAder(q.aderencia) !== null);
    const adMedia = comAder.length > 0
      ? comAder.reduce((s, q) => s + svAder(q.aderencia), 0) / comAder.length
      : null;
    const enquad = comAder.filter(q => svAder(q.aderencia) >= 70).length;
    const criticos = comAder.filter(q => svAder(q.aderencia) < 50).length;
    const atencao = comAder.filter(q => svAder(q.aderencia) >= 50 && svAder(q.aderencia) < 70).length;
    const gapOverTot = qualidade.reduce((s, q) => s + sv(q.gap_over), 0);
    const gapUnderTot = qualidade.reduce((s, q) => s + sv(q.gap_under), 0);
    return { comAder, adMedia, enquad, criticos, atencao, gapOverTot, gapUnderTot };
  }, [qualidade]);

  const listaAder = useMemo(() => {
    return aderAgg.comAder.filter(q => {
      const ad = svAder(q.aderencia);
      if (filtroAder === "Todos") return true;
      if (filtroAder === "Crítico") return ad < 50;
      if (filtroAder === "Atenção") return ad >= 50 && ad < 70;
      if (filtroAder === "OK") return ad >= 70;
      return true;
    }).sort((a, b) => svAder(a.aderencia) - svAder(b.aderencia));
  }, [aderAgg.comAder, filtroAder]);

  // ── PERFIL BANCÁRIO agregado + SCORE ──────────────────────────────────
  const bancAgg = useMemo(() => {
    const comPix = bancario.filter(b => b.status_chave_pix && b.status_chave_pix.includes("Tem")).length;
    const comPortab = bancario.filter(b => b.portabilidade && b.portabilidade !== "Nao_Tem_Portabilidade").length;
    const turboElegiv = bancario.filter(b => b.elegivel_turbo === "Sim").length;
    const principal = bancario.filter(b => b.principalidade === "Principal").length;
    const contasAtivas = bancario.filter(b => b.uso_conta === "Conta_Ativa").length;
    const comScore = bancario.map(b => ({ ...b, _score: calcularScoreBancario(b) }));
    const scoresMedio = comScore.length > 0
      ? Math.round(comScore.reduce((s, b) => s + b._score.score, 0) / comScore.length)
      : 0;
    return {
      comPix, comPortab, turboElegiv, principal, contasAtivas, comScore, scoresMedio,
      excel: comScore.filter(b => b._score.score >= 80).length,
      bom: comScore.filter(b => b._score.score >= 60 && b._score.score < 80).length,
      reg: comScore.filter(b => b._score.score >= 40 && b._score.score < 60).length,
      baixo: comScore.filter(b => b._score.score < 40).length,
    };
  }, [bancario]);

  const listaBanc = useMemo(() => {
    return bancAgg.comScore.filter(b => {
      const s = b._score.score;
      if (filtroBanc === "Todos") return true;
      if (filtroBanc === "Excelente") return s >= 80;
      if (filtroBanc === "Bom") return s >= 60 && s < 80;
      if (filtroBanc === "Regular") return s >= 40 && s < 60;
      if (filtroBanc === "Baixo") return s < 40;
      return true;
    }).sort((a, b) => b._score.score - a._score.score);
  }, [bancAgg.comScore, filtroBanc]);

  const faixasAuc = useMemo(() => bancario.reduce((acc, b) => {
    const k = b.faixa_auc || "Sem faixa";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {}), [bancario]);

  // ── INTELIGÊNCIA DE NEGÓCIO: SCORE DE CARTEIRA + INSIGHTS AUTOMÁTICOS ──
  // Cruza positivador (NET/operações) + qualidade (aderência) + bancário (score)
  // por conta, produzindo um índice único de saúde por cliente e uma lista
  // de alertas acionáveis ordenados por severidade × patrimônio em risco.
  const inteligencia = useMemo(() => {
    const qualMap = Object.fromEntries(qualidade.map(q => [String(q.conta), q]));
    const bancMap = Object.fromEntries(bancAgg.comScore.map(b => [String(b.conta), b]));

    const scored = clientes.map(c => {
      const conta = String(c.cliente);
      const qual = qualMap[conta];
      const banc = bancMap[conta];
      const netM = sv(c.net_m);
      const netM1 = sv(c.net_m_anterior);
      const aderencia = qual ? svAder(qual.aderencia) : null;

      const { score, variacao } = calcularScoreCarteira({
        aderencia,
        netM, netM1,
        operouBolsa: c.operou_bolsa,
        operouFundo: c.operou_fundo,
        operouRF: c.operou_renda_fixa,
        scoreBancario: banc?._score?.score,
      });

      return {
        conta, nome: nomeMap[conta] || conta,
        netM, netM1, variacao, aderencia, score,
        suitability: c.suitability,
        evadiu: String(c.evadiu_em_m).toLowerCase().includes("sim"),
        ativouM: String(c.ativou_em_m).toLowerCase().includes("sim"),
      };
    });

    // ── Alertas acionáveis (ordenados por relevância) ──
    const alertas = [];

    // 1) Fluxo negativo relevante: queda de NET >10% em clientes de alto patrimônio
    scored
      .filter(s => s.netM1 > 50_000 && s.variacao <= -10)
      .sort((a, b) => (a.netM - a.netM1) - (b.netM - b.netM1))
      .slice(0, 8)
      .forEach(s => alertas.push({
        tipo: "fluxo_negativo", severidade: "alta",
        conta: s.conta, nome: s.nome,
        msg: `Queda de ${Math.abs(s.variacao).toFixed(1)}% no NET`,
        valor: s.netM - s.netM1,
      }));

    // 2) Alto patrimônio + aderência crítica (desalinhamento de risco/política)
    scored
      .filter(s => s.netM > 100_000 && s.aderencia != null && s.aderencia < 50)
      .sort((a, b) => b.netM - a.netM)
      .slice(0, 8)
      .forEach(s => alertas.push({
        tipo: "desalinhamento", severidade: "alta",
        conta: s.conta, nome: s.nome,
        msg: `Alto patrimônio com aderência crítica (${s.aderencia.toFixed(0)}%)`,
        valor: s.netM,
      }));

    // 3) Risco de evasão: marcado como evadiu OU (sem 2º aporte + sem operação + score baixo)
    scored
      .filter(s => s.evadiu || s.score < 35)
      .sort((a, b) => b.netM - a.netM)
      .slice(0, 8)
      .forEach(s => alertas.push({
        tipo: "churn", severidade: s.evadiu ? "alta" : "media",
        conta: s.conta, nome: s.nome,
        msg: s.evadiu ? "Cliente evadiu no período" : `Score de saúde baixo (${s.score})`,
        valor: s.netM,
      }));

    // ── Ranking de oportunidades: clientes saudáveis com espaço para crescer ──
    // (score alto + aderência OK, mas ainda sem turbo/portabilidade → upsell bancário)
    const oportunidades = scored
      .filter(s => s.score >= 60)
      .map(s => ({ ...s, banc: bancMap[s.conta] }))
      .filter(s => s.banc && (s.banc.elegivel_turbo === "Sim" && s.banc._score.score < 100))
      .sort((a, b) => b.netM - a.netM)
      .slice(0, 10);

    const scoreMedioCarteira = scored.length > 0
      ? Math.round(scored.reduce((s, c) => s + c.score, 0) / scored.length)
      : 0;

    return { scored, alertas, oportunidades, scoreMedioCarteira };
  }, [clientes, qualidade, bancAgg.comScore, nomeMap]);

  // ── Série para o LineChart: evolução M-1 → M dos Top 6 clientes por NET ──
  // Única dimensão "temporal" real disponível nos dados atuais (sem histórico mensal).
  const serieEvolucaoNet = useMemo(() => {
    const top6 = [...clientes].sort((a, b) => sv(b.net_m) - sv(a.net_m)).slice(0, 6);
    return {
      labels: ["M-1", "M (atual)"],
      series: top6.map(c => ({
        name: (nomeMap[String(c.cliente)] || String(c.cliente)).split(" ").slice(0, 2).join(" "),
        data: [sv(c.net_m_anterior), sv(c.net_m)],
      })),
    };
  }, [clientes, nomeMap]);

  if (loading) return (
    <div style={{ padding: 40, color: t.gold, textAlign: "center", fontWeight: 700 }}>
      ⏳ Sincronizando Carteira...
    </div>
  );

  if (det) return (
    <CDetalhe c={det} onBack={() => setDet(null)} tarefas={[]} reunioes={[]} oport={[]} />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── KPIs MACRO ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
        {[
          { l: "NET Total", v: fB(macro.net), co: t.gold },
          { l: "Cap. Líquida", v: fB(macro.capLiq), co: macro.capLiq >= 0 ? t.green : t.red },
          { l: "Cap. Bruta", v: fB(macro.capBruta), co: t.green },
          { l: "Resgates", v: fB(macro.resgate), co: t.red },
          { l: "Receita/mês", v: fB2(macro.receita), co: t.gold },
          { l: "Saldo D0", v: fB(saldoAgg.d0), co: t.amber },
          { l: "Saldo D+1", v: fB(saldoAgg.d1), co: t.txm },
          { l: "Clientes", v: clientes.length, co: t.blue },
        ].map(({ l, v, co }) => (
          <Crd key={l} style={{ padding: "10px 14px" }}>
            <div style={{ color: t.txd, fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>{l}</div>
            <div style={{ color: co, fontSize: 15, fontWeight: 800 }}>{v}</div>
          </Crd>
        ))}
      </div>

      {/* ── PAINEL DE INTELIGÊNCIA: Score de Carteira + Alertas executivos ── */}
      {/* Posicionado logo abaixo dos KPIs macro para leitura "nível executivo": */}
      {/* score consolidado à esquerda, alertas priorizados à direita. */}
      <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", gap: 12 }}>
        <Crd style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "16px 14px" }}>
          <div style={{ color: t.txd, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Score de Carteira</div>
          <div style={{
            fontSize: 38, fontWeight: 900,
            color: inteligencia.scoreMedioCarteira >= 70 ? t.green
                 : inteligencia.scoreMedioCarteira >= 50 ? t.amber : t.red
          }}>
            {inteligencia.scoreMedioCarteira}
          </div>
          <div style={{ color: t.txd, fontSize: 10 }}>
            Aderência 40% · Tendência 25% · Atividade 20% · Bancário 15%
          </div>
        </Crd>

        <Crd style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ color: t.tx, fontWeight: 700, fontSize: 13 }}>Alertas Prioritários</div>
            <Bdg label={`${inteligencia.alertas.length} itens`} color={inteligencia.alertas.length > 0 ? t.red : t.green} />
          </div>
          {inteligencia.alertas.length === 0 ? (
            <div style={{ color: t.txd, fontSize: 12, padding: "8px 0" }}>Nenhum alerta crítico no momento.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 150, overflowY: "auto" }}>
              {inteligencia.alertas.slice(0, 6).map((a, i) => {
                const cor = a.severidade === "alta" ? t.red : t.amber;
                const icone = a.tipo === "fluxo_negativo" ? "📉" : a.tipo === "desalinhamento" ? "⚠️" : "🚪";
                return (
                  <div
                    key={i}
                    onClick={() => abrirDetalheCliente(a.conta)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "6px 8px", borderRadius: 6, cursor: "pointer",
                      background: `${cor}11`, border: `1px solid ${cor}33`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = `${cor}22`}
                    onMouseLeave={e => e.currentTarget.style.background = `${cor}11`}
                  >
                    <span style={{ fontSize: 13 }}>{icone}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ color: t.tx, fontSize: 11, fontWeight: 700 }}>
                        {String(a.nome).split(" ").slice(0, 2).join(" ")}
                      </span>
                      <span style={{ color: t.txm, fontSize: 11 }}> — {a.msg}</span>
                    </div>
                    <span style={{ color: cor, fontSize: 11, fontWeight: 700, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                      {fB(a.valor)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Crd>
      </div>

      {/* ── ABAS ── */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${t.brd}` }}>
        {[
          { id: "alocacao", l: "Alocação Global" },
          { id: "aderencia", l: "Aderência" },
          { id: "diversificacao", l: "Diversificação" },
          { id: "saldo", l: "Saldo Consolidado" },
          { id: "bancario", l: "Perfil Bancário" },
          { id: "inteligencia", l: "🧠 Inteligência" },
        ].map(({ id, l }) => (
          <button key={id} onClick={() => setAbaAtiva(id)} style={{
            background: "none", border: "none",
            color: abaAtiva === id ? t.gold : t.txm,
            padding: "8px 14px", fontSize: 12,
            fontWeight: abaAtiva === id ? 700 : 400,
            cursor: "pointer",
            borderBottom: abaAtiva === id ? `2px solid ${t.gold}` : "2px solid transparent",
            whiteSpace: "nowrap"
          }}>{l}</button>
        ))}
      </div>

      {/* ── ABA: ALOCAÇÃO GLOBAL ── (estrutura preservada, agora com LineChart de evolução) */}
      {abaAtiva === "alocacao" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: 12 }}>
            <Crd style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ color: t.tx, fontWeight: 700, fontSize: 13 }}>Distribuição por Classe</div>
              {totalAloc > 0 ? (
                <>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <Donut slices={classesGlobal} size={170} thick={26} label={fB(totalAloc)} sub="Mapeado" />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {classesGlobal.map(c => (
                      <div key={c.l}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.cor, flexShrink: 0 }} />
                          <span style={{ color: t.txm, fontSize: 11, flex: 1 }}>{c.l}</span>
                          <span style={{ color: t.tx, fontWeight: 700, fontSize: 11 }}>{(c.pct * 100).toFixed(1)}%</span>
                          <span style={{ color: t.txd, fontSize: 10 }}>{fB(c.valor)}</span>
                        </div>
                        <ProgressBar value={c.pct * 100} max={100} color={c.cor} h={3} />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ color: t.txd, fontSize: 12, textAlign: "center", marginTop: 40 }}>
                  Sem dados. Importe o Positivador.
                </div>
              )}
            </Crd>
            <Crd>
              <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Top Clientes por NET</div>
              <div style={{ overflowY: "auto", maxHeight: 340 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${t.brd}`, background: t.lt }}>
                      {["Conta", "Nome", "Perfil", "NET Atual", "Receita", "Cap. Bruta"].map(h => (
                        <th key={h} style={{ padding: "6px 10px", color: t.txm, fontWeight: 700, textAlign: "left", fontSize: 10, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topClientesNet.map((c, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${t.brd}33` }}>
                        <td style={{ padding: "5px 10px", color: t.txd, fontFamily: "monospace", fontSize: 10 }}>{c.cliente}</td>
                        <td style={{ padding: "5px 10px", color: t.tx, fontWeight: 600, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {nomeMap[String(c.cliente)] || c.cliente}
                        </td>
                        <td style={{ padding: "5px 10px" }}><Bdg label={c.suitability || "–"} /></td>
                        <td style={{ padding: "5px 10px", color: t.green, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fB(sv(c.net_m))}</td>
                        <td style={{ padding: "5px 10px", color: t.gold, fontVariantNumeric: "tabular-nums" }}>{fB2(sv(c.receita_mes))}</td>
                        <td style={{ padding: "5px 10px", color: t.txm, fontVariantNumeric: "tabular-nums" }}>{fB(sv(c.captacao_bruta_m))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Crd>
          </div>

          {/* Evolução NET: única dimensão temporal real disponível (M-1 → M) */}
          <Crd>
            <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
              Evolução de NET — Top 6 Clientes (M-1 → M)
            </div>
            <div style={{ color: t.txd, fontSize: 10, marginBottom: 10 }}>
              Passe o mouse sobre os pontos para ver os valores exatos
            </div>
            <LineChart
              labels={serieEvolucaoNet.labels}
              series={serieEvolucaoNet.series}
              height={240}
              formatY={fB}
            />
          </Crd>
        </div>
      )}

      {/* ── ABA: ADERÊNCIA ── (100% preservada, nenhuma mudança estrutural) */}
      {abaAtiva === "aderencia" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
            {[
              { l: "Ader. Média", v: aderAgg.adMedia != null ? `${aderAgg.adMedia.toFixed(1)}%` : "–", co: aderAgg.adMedia != null && aderAgg.adMedia < 70 ? t.red : t.green },
              { l: "Enquadrados", v: aderAgg.enquad, co: t.green },
              { l: "Críticos", v: aderAgg.criticos, co: t.red },
              { l: "Com Aderência", v: aderAgg.comAder.length, co: t.txm },
              { l: "Gap Over Tot.", v: fB(aderAgg.gapOverTot), co: t.amber },
              { l: "Gap Under Tot.", v: fB(aderAgg.gapUnderTot), co: t.amber },
            ].map(({ l, v, co }) => (
              <Crd key={l} style={{ padding: "10px 14px" }}>
                <div style={{ color: t.txd, fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>{l}</div>
                <div style={{ color: co, fontSize: 15, fontWeight: 800 }}>{v}</div>
              </Crd>
            ))}
          </div>
          <Crd>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div style={{ color: t.tx, fontWeight: 700, fontSize: 13 }}>
                Aderência por Cliente
                <span style={{ color: t.txd, fontSize: 11, fontWeight: 400, marginLeft: 8 }}>
                  {aderAgg.enquad} OK · {aderAgg.atencao} Atenção · {aderAgg.criticos} Críticos
                </span>
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                {[
                  { f: "Todos", label: `Todos (${aderAgg.comAder.length})` },
                  { f: "Crítico", label: `🔴 Crítico (${aderAgg.criticos})` },
                  { f: "Atenção", label: `🟡 Atenção (${aderAgg.atencao})` },
                  { f: "OK", label: `🟢 OK (${aderAgg.enquad})` },
                ].map(({ f, label }) => (
                  <Btn key={f} onClick={() => setFiltroAder(f)} outline={filtroAder !== f} small>{label}</Btn>
                ))}
              </div>
            </div>
            {listaAder.length === 0 ? (
              <div style={{ color: t.txd, fontSize: 12, textAlign: "center", padding: 20 }}>
                Nenhum dado. Importe a Qualidade de Alocação.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10, maxHeight: 500, overflowY: "auto", paddingRight: 4 }}>
                {listaAder.map((q, i) => {
                  const ad = svAder(q.aderencia) ?? 0;
                  const cor = ad < 50 ? t.red : ad < 70 ? t.amber : t.green;
                  const icone = ad < 50 ? "🔴" : ad < 70 ? "🟡" : "🟢";
                  const label = ad < 50 ? "Crítico" : ad < 70 ? "Atenção" : "OK";
                  const nome = nomeMap[String(q.conta)] || q.conta;
                  const gapOver = sv(q.gap_over);
                  const gapUnder = sv(q.gap_under);
                  const custodia = sv(q.custodia_total);
                  return (
                    <div key={i}
                      onClick={() => abrirDetalheCliente(q.conta)}
                      onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.15)"}
                      onMouseLeave={e => e.currentTarget.style.filter = "brightness(1)"}
                      style={{
                        cursor: "pointer", transition: "filter 0.2s",
                        background: t.lt, border: `1px solid ${cor}44`,
                        borderLeft: `3px solid ${cor}`, borderRadius: 10,
                        padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8,
                      }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: t.tx, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {String(nome).split(" ").slice(0, 3).join(" ")}
                          </div>
                          <div style={{ color: t.txd, fontSize: 10, marginTop: 1 }}>
                            #{String(q.conta).replace(".0", "")} · {q.perfil || "–"}
                          </div>
                        </div>
                        <div style={{
                          background: `${cor}22`, color: cor,
                          border: `1px solid ${cor}55`, borderRadius: 6,
                          padding: "2px 8px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0
                        }}>
                          {icone} {label}
                        </div>
                      </div>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ color: t.txm, fontSize: 10 }}>Aderência</span>
                          <span style={{ color: cor, fontWeight: 800, fontSize: 13 }}>{ad.toFixed(1)}%</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: t.brd, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${Math.min(ad, 100)}%`, background: cor, borderRadius: 3, transition: "width .4s" }} />
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ color: t.txd, fontSize: 9, textTransform: "uppercase", marginBottom: 2 }}>Custódia</div>
                          <div style={{ color: t.tx, fontWeight: 600, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{fB(custodia)}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ color: t.txd, fontSize: 9, textTransform: "uppercase", marginBottom: 2 }}>Gap</div>
                          <div style={{ fontWeight: 600, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                            {gapOver > 0 ? <span style={{ color: t.amber }}>↑ {fB(gapOver)}</span> :
                              gapUnder > 0 ? <span style={{ color: t.red }}>↓ {fB(gapUnder)}</span> :
                                <span style={{ color: t.green }}>✓ OK</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Crd>
        </div>
      )}

      {/* ── ABA: DIVERSIFICAÇÃO ── (preservada) */}
      {abaAtiva === "diversificacao" && (() => {
        const CORES_PROD = {
          "Fundos": t.blue, "Tesouro Direto": t.gold, "Renda Fixa": t.green,
          "Renda Variável": t.purple || "#8b5cf6", "Previdência": t.amber, "FII": "#06b6d4",
        };
        const COR_FB = [t.blue, t.gold, t.green, t.amber, t.purple || "#8b5cf6", "#06b6d4", t.red];
        const totalDiv = divers.reduce((s, d) => s + sv(d.net_total), 0);
        const porProd = divers.reduce((acc, d) => {
          acc[d.produto] = (acc[d.produto] || 0) + sv(d.net_total);
          return acc;
        }, {});
        const prodOrdenados = Object.entries(porProd).sort((a, b) => b[1] - a[1]);

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
              {[
                { l: "NET Total", v: fB(totalDiv), co: t.gold },
                { l: "Produtos", v: prodOrdenados.length, co: t.blue },
                { l: "Linhas", v: divers.length, co: t.txm },
              ].map(({ l, v, co }) => (
                <Crd key={l} style={{ padding: "10px 14px" }}>
                  <div style={{ color: t.txd, fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>{l}</div>
                  <div style={{ color: co, fontSize: 15, fontWeight: 800 }}>{v}</div>
                </Crd>
              ))}
            </div>
            <Crd>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ color: t.tx, fontWeight: 700, fontSize: 13 }}>Produtos Consolidados</div>
                <span style={{ background: `${t.blue}22`, color: t.blue, border: `1px solid ${t.blue}44`, borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                  {prodOrdenados.length} produtos
                </span>
              </div>
              {divers.length === 0 ? (
                <div style={{ color: t.txd, fontSize: 12, textAlign: "center", padding: 40 }}>
                  Sem dados. Importe a Diversificação.
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                    {prodOrdenados.map(([prod, val], i) => {
                      const cor = CORES_PROD[prod] || COR_FB[i % COR_FB.length];
                      const pct = totalDiv > 0 ? (val / totalDiv) * 100 : 0;
                      return (
                        <div key={prod}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                            <span style={{ color: cor, fontSize: 12, fontWeight: 700 }}>{prod}</span>
                            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                              <span style={{ color: t.green, fontWeight: 700, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{fB(val)}</span>
                              <span style={{ color: t.txd, fontSize: 11, width: 42, textAlign: "right" }}>{pct.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div style={{ height: 7, borderRadius: 4, background: t.lt, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: cor, borderRadius: 4, transition: "width .5s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ borderTop: `1px solid ${t.brd}`, marginBottom: 16 }} />
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${t.brd}` }}>
                          {[
                            { h: "PRODUTO", al: "left" }, { h: "SUB PRODUTO", al: "left" },
                            { h: "CLIENTES", al: "right" }, { h: "QTDE TOTAL", al: "right" },
                            { h: "NET TOTAL", al: "right" }, { h: "% CARTEIRA", al: "right" },
                          ].map(({ h, al }) => (
                            <th key={h} style={{ padding: "8px 12px", color: t.txd, fontSize: 10, fontWeight: 700, textTransform: "uppercase", textAlign: al, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...divers].sort((a, b) => sv(b.net_total) - sv(a.net_total)).map((d, i) => {
                          const cor = CORES_PROD[d.produto] || COR_FB[prodOrdenados.findIndex(([p]) => p === d.produto) % COR_FB.length];
                          const pct = totalDiv > 0 ? (sv(d.net_total) / totalDiv) * 100 : 0;
                          return (
                            <tr key={i} style={{ borderBottom: `1px solid ${t.brd}22`, background: i % 2 === 0 ? "transparent" : `${t.lt}66` }}>
                              <td style={{ padding: "7px 12px" }}><span style={{ color: cor, fontWeight: 700, fontSize: 12 }}>{d.produto}</span></td>
                              <td style={{ padding: "7px 12px", color: t.txm, fontSize: 12 }}>{d.sub_produto || "—"}</td>
                              <td style={{ padding: "7px 12px", color: t.tx, fontSize: 12, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{d.clientes || "–"}</td>
                              <td style={{ padding: "7px 12px", color: t.txm, fontSize: 12, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                                {d.quantidade_total != null ? sv(d.quantidade_total).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "—"}
                              </td>
                              <td style={{ padding: "7px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}><span style={{ color: t.green, fontWeight: 700, fontSize: 12 }}>{fB(sv(d.net_total))}</span></td>
                              <td style={{ padding: "7px 12px", color: t.txd, fontSize: 12, textAlign: "right" }}>{pct.toFixed(1)}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: `1px solid ${t.brd}` }}>
                          <td colSpan={4} style={{ padding: "8px 12px", color: t.txm, fontSize: 11, fontWeight: 700 }}>Total — {prodOrdenados.length} produtos</td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}><span style={{ color: t.gold, fontWeight: 800, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{fB(totalDiv)}</span></td>
                          <td style={{ padding: "8px 12px", textAlign: "right", color: t.txd, fontSize: 11, fontWeight: 700 }}>100%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </Crd>
          </div>
        );
      })()}

      {/* ── ABA: SALDO CONSOLIDADO ── (preservada) */}
      {abaAtiva === "saldo" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
            {[
              { l: "Saldo D0", v: fB(saldoAgg.d0), co: t.gold },
              { l: "Saldo D+1", v: fB(saldoAgg.d1), co: t.txm },
              { l: "Saldo D+2", v: fB(saldoAgg.d2), co: t.txm },
              { l: "Saldo D+3", v: fB(saldoAgg.d3), co: t.txm },
              { l: "Total", v: fB(saldoAgg.total), co: t.green },
              { l: "Contas", v: saldoAgg.contas, co: t.blue },
            ].map(({ l, v, co }) => (
              <Crd key={l} style={{ padding: "10px 14px" }}>
                <div style={{ color: t.txd, fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>{l}</div>
                <div style={{ color: co, fontSize: 15, fontWeight: 800 }}>{v}</div>
              </Crd>
            ))}
          </div>
          <Crd>
            <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 14 }}>
              Saldo por Conta
              <span style={{ color: t.txd, fontSize: 11, fontWeight: 400, marginLeft: 8 }}>ordenado por total</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10, maxHeight: 500, overflowY: "auto", paddingRight: 4 }}>
              {[...saldos].sort((a, b) => sv(b.total) - sv(a.total)).map((s, i) => {
                const d0 = sv(s.saldo_d0);
                const tot = sv(s.total);
                const cor = d0 > 50000 ? t.gold : d0 > 10000 ? t.amber : t.txd;
                return (
                  <div key={i}
                    onClick={() => abrirDetalheCliente(s.conta)}
                    onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.12)"}
                    onMouseLeave={e => e.currentTarget.style.filter = "brightness(1)"}
                    style={{
                      cursor: "pointer", transition: "filter .2s",
                      background: t.lt, border: `1px solid ${t.brd}`,
                      borderLeft: `3px solid ${cor}`, borderRadius: 10,
                      padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8,
                    }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: t.tx, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>
                          {s.cliente || "–"}
                        </div>
                        <div style={{ color: t.txd, fontSize: 10, marginTop: 1, fontFamily: "monospace" }}>
                          #{String(s.conta).replace(".0", "")}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ color: t.txd, fontSize: 9, textTransform: "uppercase" }}>Total</div>
                        <div style={{ color: t.green, fontWeight: 800, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{fB(tot)}</div>
                      </div>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: t.brd, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${saldoAgg.total > 0 ? Math.min((tot / saldoAgg.total) * 100 * 5, 100) : 0}%`, background: cor, borderRadius: 2 }} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4 }}>
                      {[
                        { l: "D0", v: sv(s.saldo_d0), co: d0 > 0 ? t.amber : t.txd },
                        { l: "D+1", v: sv(s.saldo_d1), co: t.txm },
                        { l: "D+2", v: sv(s.saldo_d2), co: t.txm },
                        { l: "D+3", v: sv(s.saldo_d3), co: t.txm },
                      ].map(({ l, v, co }) => (
                        <div key={l} style={{ background: `${t.brd}33`, borderRadius: 6, padding: "5px 6px", textAlign: "center" }}>
                          <div style={{ color: t.txd, fontSize: 8, fontWeight: 700, marginBottom: 2 }}>{l}</div>
                          <div style={{ color: co, fontSize: 10, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{v > 0 ? fB2(v) : "–"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Crd>
        </div>
      )}

      {/* ── ABA: PERFIL BANCÁRIO ── (preservada) */}
      {abaAtiva === "bancario" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
            {[
              { l: "Total Contas", v: bancario.length, co: t.blue },
              { l: "Contas Ativas", v: bancAgg.contasAtivas, co: t.green },
              { l: "Com PIX", v: bancAgg.comPix, co: t.green },
              { l: "Portabilidade", v: bancAgg.comPortab, co: t.blue },
              { l: "Elegível Turbo", v: bancAgg.turboElegiv, co: t.gold },
              { l: "Score Médio", v: `${bancAgg.scoresMedio}`, co: bancAgg.scoresMedio >= 70 ? t.green : bancAgg.scoresMedio >= 50 ? t.amber : t.red },
            ].map(({ l, v, co }) => (
              <Crd key={l} style={{ padding: "10px 14px" }}>
                <div style={{ color: t.txd, fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>{l}</div>
                <div style={{ color: co, fontSize: 15, fontWeight: 800 }}>{v}</div>
              </Crd>
            ))}
          </div>
          <Crd>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <div style={{ color: t.tx, fontWeight: 700, fontSize: 13 }}>
                Score Bancário por Cliente
                <span style={{ color: t.txd, fontSize: 11, fontWeight: 400, marginLeft: 8 }}>
                  {bancAgg.excel} Excelente · {bancAgg.bom} Bom · {bancAgg.reg} Regular · {bancAgg.baixo} Baixo
                </span>
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {[
                  { f: "Todos", label: `Todos (${bancario.length})` },
                  { f: "Excelente", label: `🟢 Excelente (${bancAgg.excel})` },
                  { f: "Bom", label: `🔵 Bom (${bancAgg.bom})` },
                  { f: "Regular", label: `🟡 Regular (${bancAgg.reg})` },
                  { f: "Baixo", label: `🔴 Baixo (${bancAgg.baixo})` },
                ].map(({ f, label }) => (
                  <Btn key={f} onClick={() => setFiltroBanc(f)} outline={filtroBanc !== f} small>{label}</Btn>
                ))}
              </div>
            </div>
            {listaBanc.length === 0 ? (
              <div style={{ color: t.txd, fontSize: 12, textAlign: "center", padding: 40 }}>
                Nenhum dado. Importe o Perfil Bancário.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10, maxHeight: 520, overflowY: "auto", paddingRight: 4 }}>
                {listaBanc.map((b, i) => {
                  const { score, label, itens } = b._score;
                  const cor = score >= 80 ? t.green : score >= 60 ? t.blue : score >= 40 ? t.amber : t.red;
                  const nome = nomeMap[String(b.conta)] || String(b.conta).replace(".0", "");
                  return (
                    <div key={i}
                      onClick={() => abrirDetalheCliente(b.conta)}
                      onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.12)"}
                      onMouseLeave={e => e.currentTarget.style.filter = "brightness(1)"}
                      style={{
                        cursor: "pointer", transition: "filter .2s",
                        background: t.lt, border: `1px solid ${cor}44`,
                        borderLeft: `3px solid ${cor}`, borderRadius: 10,
                        padding: "12px 14px", display: "flex", flexDirection: "column", gap: 9,
                      }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: t.tx, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {String(nome).split(" ").slice(0, 3).join(" ")}
                          </div>
                          <div style={{ color: t.txd, fontSize: 10, marginTop: 1 }}>
                            #{String(b.conta).replace(".0", "")} · {b.faixa_auc || "–"}
                          </div>
                        </div>
                        <div style={{ background: `${cor}22`, color: cor, border: `1px solid ${cor}55`, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
                          {label}
                        </div>
                      </div>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ color: t.txm, fontSize: 10 }}>Score Bancário</span>
                          <span style={{ color: cor, fontWeight: 800, fontSize: 14 }}>{score}<span style={{ fontSize: 10, fontWeight: 400, color: t.txd }}>/100</span></span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: t.brd, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${score}%`, background: cor, borderRadius: 3, transition: "width .4s" }} />
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                        {itens.map(it => (
                          <div key={it.l} style={{ display: "flex", alignItems: "center", gap: 5, background: it.ok ? `${t.green}11` : `${t.brd}33`, borderRadius: 5, padding: "4px 7px" }}>
                            <span style={{ fontSize: 10 }}>{it.ok ? "✅" : "❌"}</span>
                            <span style={{ color: it.ok ? t.tx : t.txd, fontSize: 10, fontWeight: it.ok ? 600 : 400 }}>{it.l}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${t.brd}33`, paddingTop: 8 }}>
                        <span style={{ color: t.txd, fontSize: 10 }}>{b.principalidade || "–"}</span>
                        <span style={{ color: b.uso_conta === "Conta_Ativa" ? t.green : t.txd, fontSize: 10, fontWeight: 600 }}>
                          {b.uso_conta === "Conta_Ativa" ? "● Ativa" : "○ Inativa"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Crd>
        </div>
      )}

      {/* ── ABA: INTELIGÊNCIA (NOVA) — score por cliente + ranking de oportunidades ── */}
      {abaAtiva === "inteligencia" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
            {[
              { l: "Score Médio Carteira", v: inteligencia.scoreMedioCarteira, co: inteligencia.scoreMedioCarteira >= 70 ? t.green : inteligencia.scoreMedioCarteira >= 50 ? t.amber : t.red },
              { l: "Alertas Ativos", v: inteligencia.alertas.length, co: inteligencia.alertas.length > 0 ? t.red : t.green },
              { l: "Oportunidades", v: inteligencia.oportunidades.length, co: t.gold },
              { l: "Em Risco de Churn", v: inteligencia.scored.filter(s => s.evadiu || s.score < 35).length, co: t.red },
            ].map(({ l, v, co }) => (
              <Crd key={l} style={{ padding: "10px 14px" }}>
                <div style={{ color: t.txd, fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>{l}</div>
                <div style={{ color: co, fontSize: 15, fontWeight: 800 }}>{v}</div>
              </Crd>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* Ranking de oportunidades (upsell bancário em clientes saudáveis) */}
            <Crd>
              <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>🎯 Ranking de Oportunidades</div>
              <div style={{ color: t.txd, fontSize: 10, marginBottom: 10 }}>
                Clientes saudáveis (score ≥ 60) elegíveis para Turbo Conta ainda não totalmente ativados
              </div>
              {inteligencia.oportunidades.length === 0 ? (
                <div style={{ color: t.txd, fontSize: 12, padding: "12px 0" }}>Nenhuma oportunidade identificada no momento.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 360, overflowY: "auto" }}>
                  {inteligencia.oportunidades.map((o, i) => (
                    <div key={i}
                      onClick={() => abrirDetalheCliente(o.conta)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                        borderRadius: 8, cursor: "pointer", background: t.lt, border: `1px solid ${t.brd}`,
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = t.gold}
                      onMouseLeave={e => e.currentTarget.style.borderColor = t.brd}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: `${t.gold}22`, color: t.gold,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 800, flexShrink: 0
                      }}>{i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: t.tx, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {String(o.nome).split(" ").slice(0, 3).join(" ")}
                        </div>
                        <div style={{ color: t.txd, fontSize: 10 }}>Score carteira: {o.score} · NET {fB(o.netM)}</div>
                      </div>
                      <Bdg label="⚡ Turbo" color={t.gold} />
                    </div>
                  ))}
                </div>
              )}
            </Crd>

            {/* Lista completa de alertas */}
            <Crd>
              <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>⚠️ Todos os Alertas</div>
              <div style={{ color: t.txd, fontSize: 10, marginBottom: 10 }}>
                Fluxo negativo, desalinhamento de aderência e risco de evasão
              </div>
              {inteligencia.alertas.length === 0 ? (
                <div style={{ color: t.txd, fontSize: 12, padding: "12px 0" }}>Nenhum alerta no momento. Carteira saudável.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 360, overflowY: "auto" }}>
                  {inteligencia.alertas.map((a, i) => {
                    const cor = a.severidade === "alta" ? t.red : t.amber;
                    const icone = a.tipo === "fluxo_negativo" ? "📉" : a.tipo === "desalinhamento" ? "⚠️" : "🚪";
                    return (
                      <div key={i}
                        onClick={() => abrirDetalheCliente(a.conta)}
                        style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                          borderRadius: 8, cursor: "pointer", background: `${cor}0d`, border: `1px solid ${cor}33`,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = `${cor}1a`}
                        onMouseLeave={e => e.currentTarget.style.background = `${cor}0d`}
                      >
                        <span style={{ fontSize: 14 }}>{icone}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: t.tx, fontSize: 12, fontWeight: 700 }}>
                            {String(a.nome).split(" ").slice(0, 3).join(" ")}
                          </div>
                          <div style={{ color: t.txm, fontSize: 10 }}>{a.msg}</div>
                        </div>
                        <span style={{ color: cor, fontSize: 11, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fB(a.valor)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Crd>
          </div>
        </div>
      )}

    </div>
  );
}
