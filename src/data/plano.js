export const PLANO = {
  assessor: "Leonardo Vitor", 
  codigo: "A51229", 
  escritorio: "Dom Investimentos", 
  ref: "13/06/2026",
  
  // Metas financeiras zeradas
  netMeta: 0, 
  comMeta: 0, 
  capMeta: 0, 
  churn: 0,
  
  // Funil Hunter zerado
  funilH: [
    { l: "Conexoes", meta: 0, real: 0, icon: "🔗" },
    { l: "Diagnosticos", meta: 0, real: 0, icon: "🔍" },
    { l: "Propostas", meta: 0, real: 0, icon: "📋" },
    { l: "Contas Abertas", meta: 0, real: 0, icon: "✅" }
  ],
  
  // Funil Farmer zerado
  funilF: [
    { l: "Mapeamentos", meta: 0, real: 0, icon: "🗺️" },
    { l: "Propostas Farm.", meta: 0, real: 0, icon: "📤" }
  ],
  
  // Metas semanais zeradas
  semanais: [
    { sem: 1, meta: 0, real: 0 },
    { sem: 2, meta: 0, real: 0 },
    { sem: 3, meta: 0, real: 0 },
    { sem: 4, meta: 0, real: 0 }
  ],
};