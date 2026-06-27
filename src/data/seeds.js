export const OPORT_SEED = [
  {id:1,cliente:"Sebastiao dos Santos",    conta:"3416409", tipo:"Saldo Parado",    valor:255536, prioridade:"Alta", status:"Nova",         resp:"Leonardo Vitor",desc:"Saldo total em C/C"},
  {id:2,cliente:"Roberta Areias Leite",    conta:"4711054", tipo:"Saldo Parado",    valor:250000, prioridade:"Alta", status:"Nova",         resp:"Leonardo Vitor",desc:"Saldo elevado sem aplicacao"},
  {id:3,cliente:"Jose Tavares Paiva Neto", conta:"512871",  tipo:"Saldo Parado",    valor:841764, prioridade:"Alta", status:"Em andamento", resp:"Leonardo Vitor",desc:"Maior saldo parado da carteira"},
  {id:4,cliente:"Paula Cristina Pirolo",   conta:"2741160", tipo:"Reativacao",      valor:1020266,prioridade:"Alta", status:"Nova",         resp:"Leonardo Vitor",desc:"Inativa com NET acima de R$1M"},
  {id:5,cliente:"Antonio Justiniano Paiva",conta:"15687600",tipo:"Reativacao",      valor:571822, prioridade:"Alta", status:"Nova",         resp:"Leonardo Vitor",desc:"Resgate de R$125k — necessita contato"},
  {id:6,cliente:"Ralph da Silva Inchauspe",conta:"16108613",tipo:"Rebalanceamento", valor:275856, prioridade:"Media",status:"Em andamento", resp:"Leonardo Vitor",desc:"Aderencia 51% — desalocado"},
  {id:7,cliente:"Tiago Rocha Chiapetti",   conta:"3534901", tipo:"Rebalanceamento", valor:61980,  prioridade:"Alta", status:"Nova",         resp:"Leonardo Vitor",desc:"Aderencia 11% — critico"},
  {id:8,cliente:"Moises Adriano Koch",     conta:"4646870", tipo:"Rebalanceamento", valor:79168,  prioridade:"Alta", status:"Nova",         resp:"Leonardo Vitor",desc:"Aderencia 20% — urgente"},
];

export const TAREFAS_SEED = [
  {id:1,titulo:"Rebalancear Ralph Inchauspe",          cliente:"Ralph da Silva Inchauspe",  conta:"16108613",tipo:"Rebalanceamento",prior:"Alta", status:"Pendente",  prazo:"2026-06-16",resp:"Leonardo Vitor"},
  {id:2,titulo:"Contato urgente Antonio Paiva",        cliente:"Antonio Justiniano Paiva",  conta:"15687600",tipo:"Ligacao",         prior:"Alta", status:"Atrasada",  prazo:"2026-06-10",resp:"Leonardo Vitor"},
  {id:3,titulo:"Proposta Sebastiao dos Santos",        cliente:"Sebastiao dos Santos",      conta:"3416409", tipo:"Proposta",        prior:"Alta", status:"Pendente",  prazo:"2026-06-17",resp:"Leonardo Vitor"},
  {id:4,titulo:"Follow-up Roberta Areias Leite",       cliente:"Roberta Areias Leite",      conta:"4711054", tipo:"Follow-up",       prior:"Alta", status:"Pendente",  prazo:"2026-06-17",resp:"Leonardo Vitor"},
  {id:5,titulo:"Rebalancear Moises Koch",              cliente:"Moises Adriano Koch",       conta:"4646870", tipo:"Rebalanceamento",prior:"Alta", status:"Pendente",  prazo:"2026-06-18",resp:"Leonardo Vitor"},
  {id:6,titulo:"Reativar Paula Pirolo",                cliente:"Paula Cristina Pirolo",     conta:"2741160", tipo:"Ligacao",         prior:"Media",status:"Pendente",  prazo:"2026-06-19",resp:"Leonardo Vitor"},
  {id:7,titulo:"Enviar relatorio Unique",              cliente:"Unique - Leonardo",         conta:"3404470", tipo:"Relatorio",       prior:"Baixa",status:"Concluida", prazo:"2026-06-15",resp:"Leonardo Vitor"},
  {id:8,titulo:"Proposta Esdras Poty",                 cliente:"Esdras Poty de Franca",     conta:"18259514",tipo:"Proposta",        prior:"Media",status:"Concluida", prazo:"2026-06-14",resp:"Leonardo Vitor"},
];
