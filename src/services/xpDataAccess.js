// Simulação da API da XP
export const xpDataAccess = {
  // Busca patrimônio consolidado do assessor
  getPatrimonioAssessor: async (assessorId) => {
    // Simula delay de rede
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      total: 12097941,
      clientes: 37,
      custodia: 'B3',
      evolucao: 8.4,
      variacao30d: 937000,
      metaMes: 15000000,
      captacaoMes: 1087852,
      assessor: {
        id: assessorId,
        nome: 'Leonardo Vitor',
        escritorio: 'DOM Investimentos',
        codigo: 'A5 1229'
      },
      distribuicao: {
        rendaVariavel: 0.35,
        rendaFixa: 0.45,
        fundos: 0.15,
        previdencia: 0.05
      }
    };
  },

  // Busca evolução patrimonial dos clientes
  getEvolucaoClientes: async (assessorId) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return [
      { mes: 'Jan', valor: 39000000 },
      { mes: 'Fev', valor: 41000000 },
      { mes: 'Mar', valor: 19600000 },
      { mes: 'Abr', valor: 5800000 },
      { mes: 'Mai', valor: 0 },
      { mes: 'Jun', valor: 12097941 }
    ];
  },

  // Busca oportunidades de rebalanceamento
  getRebalanceamentos: async (assessorId) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return [
      {
        cliente: 'Maria Santos',
        desvio: 12.5,
        recomendacao: 'Reduzir RV para 25%',
        impacto: '+R$ 15.000'
      },
      {
        cliente: 'João Silva',
        desvio: 8.3,
        recomendacao: 'Aumentar renda fixa para 50%',
        impacto: '+R$ 8.500'
      },
      {
        cliente: 'Ana Costa',
        desvio: 15.1,
        recomendacao: 'Realocar para previdência',
        impacto: '+R$ 22.000'
      }
    ];
  }
};