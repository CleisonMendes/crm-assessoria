// Simulação de integração com a API do Microsoft Graph / Outlook
export const syncOutlookCalendar = async () => {
  // Simula o tempo de resposta da internet
  await new Promise(resolve => setTimeout(resolve, 600));

  const hoje = new Date();
  
  // Cria uma data para amanhã para termos eventos futuros na agenda
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);

  return [
    {
      id: 1,
      titulo: "Alinhamento de Carteira (Rebalanceamento)",
      dataHora: new Date(hoje.setHours(14, 30, 0)).toISOString(),
      local: "Microsoft Teams",
      cliente: "João Silva",
      linkTeams: "https://teams.microsoft.com",
      tipo: "reuniao"
    },
    {
      id: 2,
      titulo: "Apresentação de FIIs",
      dataHora: new Date(hoje.setHours(16, 0, 0)).toISOString(),
      local: "Telefone",
      cliente: "Maria Santos",
      tipo: "call"
    },
    {
      id: 3,
      titulo: "Revisão de Planejamento Financeiro",
      dataHora: new Date(amanha.setHours(10, 0, 0)).toISOString(),
      local: "Escritório DOM Investimentos",
      cliente: "Ana Costa",
      tipo: "reuniao"
    },
    {
      id: 4,
      titulo: "Reunião de Alinhamento da Mesa",
      dataHora: new Date(amanha.setHours(17, 30, 0)).toISOString(),
      local: "Sala de Reuniões 2",
      tipo: "interno"
    }
  ];
};