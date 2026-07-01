// Criei um novo arqui em: src/utils/checkupService.js

export const REGRAS_CHECKUP = {
  SALDO_PARADO_CRITICO: 10000, // R$ 10k parado
  RESGATE_PERIGO: 50000,       // Resgates acima de R$ 50k
};

export function executarCheckup(clientes, dispararNotificacao) {
  if (!clientes || !clientes.length) return [];

  // 1. Cruzamento de dados (Filtros)
  const resgatesAltos = clientes.filter(c => c.resgate <= -REGRAS_CHECKUP.RESGATE_PERIGO);
  const contasInativas = clientes.filter(c => (c.status || "").toUpperCase() === "INATIVO");
  const saldoParado = clientes.filter(c => c.d0 >= REGRAS_CHECKUP.SALDO_PARADO_CRITICO);

  const alertasGerados = [];

  // 2. Montagem dos Alertas Consolidados (Toasts)
  if (resgatesAltos.length > 0) {
    alertasGerados.push({
      id: "alerta-resgate-lote",
      tipo: "urgente",
      titulo: "🚨 Atenção aos Resgates",
      mensagem: `Atenção: ${resgatesAltos.length} clientes tiveram resgates acima de R$ 50k este mês. Acompanhe de perto!`
    });
  }

  if (contasInativas.length > 0) {
    alertasGerados.push({
      id: "alerta-inativos-lote",
      tipo: "info",
      titulo: "💡 Oportunidade Comercial",
      mensagem: `Você tem ${contasInativas.length} clientes com conta inativa. É um ótimo momento para oferecer a portabilidade.`
    });
  }

  if (saldoParado.length > 0) {
    alertasGerados.push({
      id: "alerta-saldo-lote",
      tipo: "aviso",
      titulo: "💰 Dinheiro na Mesa",
      mensagem: `${saldoParado.length} clientes estão com mais de R$ 10k parados na conta corrente.`
    });
  }

  // 3. Disparo dos Toasts
  alertasGerados.forEach(alerta => {
    if (typeof dispararNotificacao === "function") {
      dispararNotificacao(alerta);
    } else {
      // Ponte para o <NotificacoesWindows />
      window.dispatchEvent(new CustomEvent("NOVO_ALERTA_SISTEMA", { detail: alerta }));
    }
  });

  return alertasGerados;
}
