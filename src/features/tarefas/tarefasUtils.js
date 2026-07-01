import { sv } from "../../utils/numbers.js";

/**
 * ENGINE DE PRIORIZAÇÃO E SCORING (Inteligência de Decisão)
 * Calcula dinamicamente o score de uma tarefa com base em regras de negócio financeiras.
 */
export const calcularScoreETargets = (tarefa, hoje, listaClientes = []) => {
  let score = 50; // Score Base
  let sugestaoAcao = "Acompanhar tarefa";

  // 1. Urgência por Prazo (Ponderação Temporal)
  const dataPrazo = new Date(tarefa.prazo).setHours(0, 0, 0, 0);
  const diffDias = (dataPrazo - hoje) / (1000 * 60 * 60 * 24);

  if (diffDias < 0) {
    score += 40; // Crítico: Atrasado
    sugestaoAcao = "Follow-up urgente";
  } else if (diffDias === 0) {
    score += 30; // Urgente: Vence hoje
    sugestaoAcao = "Ligar hoje";
  } else if (diffDias <= 2) {
    score += 15; // Próximo de vencer
    sugestaoAcao = "Enviar mensagem";
  }

  // 2. Impacto do Tipo de Tarefa (Prioridade Operacional)
  const pesosPorTipo = {
    "Rebalanceamento": 25,
    "Proposta": 20,
    "Reuniao": 15,
    "Ligacao": 10,
    "Follow-up": 10
  };
  score += (pesosPorTipo[tarefa.tipo] || 5);

  // 3. Cruzamento com Valor/Perfil do Cliente (Se mapeado na listaClientes)
  const dadosCliente = listaClientes.find(c => (c.nome || c.cliente) === tarefa.cliente);
  if (dadosCliente) {
    const saldo = sv(dadosCliente.d0 || dadosCliente.financeiro);
    if (saldo > 50000) score += 20; // Cliente Alta Renda (VIP)
    else if (saldo > 10000) score += 10;

    if ((dadosCliente.suit || dadosCliente.suitability) === "AGRESSIVO") {
      if (tarefa.tipo === "Rebalanceamento") {
        sugestaoAcao = "Rebalancear carteira";
        score += 15;
      }
    }
  }

  // Ajuste fino de sugestões específicas por tipo de tarefa original
  if (tarefa.tipo === "Proposta" && statusAtual !== "Concluida") sugestaoAcao = "Enviar proposta";

  // Normalização do score (Garantir que fique entre 0 e 100)
  const scoreFinal = Math.min(Math.max(score, 0), 100);

  // Classificação automática de prioridade por faixa de pontuação
  let prioridadeAutomatica = "Baixa";
  if (scoreFinal >= 80) prioridadeAutomatica = "Alta";
  else if (scoreFinal >= 60) prioridadeAutomatica = "Media";

  return {
    score: scoreFinal,
    prioridadeAutomatica,
    sugestaoAcao
  };
};

/**
 * DETECTAR OPORTUNIDADES NO RADAR (Regras comerciais automáticas)
 */
export const scanOportunidadesMercado = (listaClientes, tarefasExistentes) => {
  const ops = [];

  listaClientes.forEach(c => {
    if ((c.status || "").toUpperCase() !== "ATIVO") return;
    
    const saldo = sv(c.d0 || c.financeiro);
    const nomeCliente = c.nome || c.cliente;

    // 1. Saldo Parado (Oportunidade de Alocação)
    if (saldo > 10000) {
      ops.push({
        id: `d0-${c.id || c.conta}`,
        cliente: nomeCliente,
        conta: c.conta,
        icone: "💰",
        titulo: "Alocar Saldo Parado",
        motivo: `Possui saldo parado na conta.`,
        tipo: "Rebalanceamento"
      });
    }
    
    // 2. Desalinhamento de Perfil (Agressivo sem Renda Variável)
    if ((c.suit || c.suitability) === "AGRESSIVO" && c.aloc) {
      const rv = c.aloc.find(a => String(a.label).toLowerCase().includes("renda") || String(a.label).toLowerCase().includes("acoes"));
      const rvPct = rv ? sv(rv.pct) : 0;
      if (rvPct < 0.25) {
        ops.push({
          id: `rv-${c.id || c.conta}`,
          cliente: nomeCliente,
          conta: c.conta,
          icone: "⚠️",
          titulo: "Rebalancear Carteira",
          motivo: `Perfil Agressivo com baixa exposição em Renda Variável.`,
          tipo: "Rebalanceamento"
        });
      }
    }
    
    // 3. Queda / Estagnação de Patrimônio
    if (sv(c.netM || c.net_m) > 0 && sv(c.netM1 || c.net_m1) >= sv(c.netM || c.net_m)) {
      ops.push({
        id: `net-${c.id || c.conta}`,
        cliente: nomeCliente,
        conta: c.conta,
        icone: "📉",
        titulo: "Follow-up de Aportes",
        motivo: "Sem evolução de patrimônio recente.",
        tipo: "Follow-up"
      });
    }
  });
  
  // Remove duplicadas ou itens que já possuem tarefas pendentes/em andamento abertas
  return ops.filter(o => 
    !tarefasExistentes.some(t => t.cliente === o.cliente && t.titulo === o.titulo && t.status !== "Concluida")
  );
};
