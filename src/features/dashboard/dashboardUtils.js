import { sv } from "../../utils/numbers.js";
import { PLANO } from "../../data/plano.js";

/**
 * Calcula estatísticas do dashboard a partir dos dados reais da API.
 * Recebe clientes já mapeados (formato interno do CRM).
 */
export const getDashboardStats = (reunioes, tarefas, oport, clientes) => {

  // ── Reuniões ──────────────────────────────────────────────────────────────
  const proxR = reunioes
    .filter(r => r.status === "Agendada" && new Date(r.dataHora) > Date.now())
    .sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora))[0] || null;

  const alertH24 = reunioes.filter(r => {
    const diff = new Date(r.dataHora) - Date.now();
    return r.status === "Agendada" && diff > 0 && diff < 86400000;
  }).length;

  // ── Tarefas ───────────────────────────────────────────────────────────────
  const tarAtr = tarefas.filter(x => x.status === "Atrasada").length;

  // ── Top clientes por NET ───────────────────────────────────────────────────
  const top4 = [...clientes]
    .sort((a, b) => sv(b.netM) - sv(a.netM))
    .slice(0, 4);

  // ── Saldo parado D0 ───────────────────────────────────────────────────────
  const saldoTop = [...clientes]
    .filter(c => sv(c.d0) > 5000)
    .sort((a, b) => sv(b.d0) - sv(a.d0))
    .slice(0, 4);

  // ── Rebalancear (aderência < 70%) ─────────────────────────────────────────
  const rebalTop = [...clientes]
    .filter(c => c.ader != null && sv(c.ader) < 70)
    .sort((a, b) => sv(a.ader) - sv(b.ader))
    .slice(0, 4);

  // ── Por suitability ───────────────────────────────────────────────────────
  const porSuit = clientes.reduce((acc, c) => {
    const k = c.suit || "NÃO INFORMADO";
    if (!acc[k]) acc[k] = { label: k, count: 0, net: 0 };
    acc[k].count++;
    acc[k].net += sv(c.netM);
    return acc;
  }, {});

  // ── Por segmento ──────────────────────────────────────────────────────────
  const porSeg = clientes.reduce((acc, c) => {
    const k = c.seg || "–";
    if (!acc[k]) acc[k] = { label: k, count: 0, net: 0 };
    acc[k].count++;
    acc[k].net += sv(c.netM);
    return acc;
  }, {});

  // ── Captação líquida ──────────────────────────────────────────────────────
  const capTotal  = clientes.reduce((s, c) => s + sv(c.cap),    0);
  const resTotal  = clientes.reduce((s, c) => s + sv(c.resgate), 0);
  const capLiq    = capTotal - resTotal;

  // ── Receita total por tipo ────────────────────────────────────────────────
  const recBovespa = clientes.reduce((s, c) => s + sv(c.rec_bovespa), 0);
  const recFundos  = clientes.reduce((s, c) => s + sv(c.rec_rf_priv), 0);
  const recRFPub   = clientes.reduce((s, c) => s + sv(c.rec_rf_pub),  0);

  // ── Alertas bancários (se perfil_bancario estiver no cliente) ────────────
  const semPix    = clientes.filter(c => c.status_pix && !c.status_pix.includes("Tem")).length;
  const comTurbo  = clientes.filter(c => c.elegivel_turbo === "Sim").length;

  return {
    proxR,
    alertH24,
    tarAtr,
    top4,
    saldoTop,
    rebalTop,
    porSuit:    Object.values(porSuit).sort((a, b) => b.net - a.net),
    porSeg:     Object.values(porSeg).sort((a, b) => b.net - a.net),
    capLiq,
    recBovespa,
    recFundos,
    recRFPub,
    semPix,
    comTurbo,
  };
};
