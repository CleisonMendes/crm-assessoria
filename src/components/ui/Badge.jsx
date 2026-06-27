import { useT } from "../../theme/ThemeContext.jsx";

export function Bdg({label}){
  const t=useT();
  const M={
    ATIVO:{bg:"#0E2620",tx:t.green},INATIVO:{bg:"#2D1515",tx:t.red},
    Alta:{bg:"#2D1515",tx:t.red},Media:{bg:"#2D1F08",tx:t.amber},Baixa:{bg:"#0E2620",tx:t.green},
    AGRESSIVO:{bg:"#2D1515",tx:t.red},MODERADO:{bg:"#2D1F08",tx:t.amber},CONSERVADOR:{bg:"#0E2620",tx:t.green},
    Agendada:{bg:"#1A2D45",tx:t.blue},Confirmada:{bg:"#1A2430",tx:t.green},
    Realizada:{bg:"#0E2620",tx:t.green},Cancelada:{bg:"#2D1515",tx:t.red},
    Pendente:{bg:"#1A2D45",tx:t.txm},Atrasada:{bg:"#2D1515",tx:t.red},Concluida:{bg:"#0E2620",tx:t.green},"Em andamento":{bg:"#2D1F08",tx:t.amber},
    Nova:{bg:"#1A2D45",tx:t.blue},Negociacao:{bg:"#1A2240",tx:t.purple},Convertida:{bg:"#0E2620",tx:t.green},Perdida:{bg:"#2D1515",tx:t.red},
    "PF 1M+":{bg:"#1A2240",tx:t.purple},"PF 300K+":{bg:"#1A2D45",tx:t.blue},"PF 300K-":{bg:"#1A2420",tx:t.txm},"PJ PME":{bg:"#1A2D30",tx:t.green},
  };
  const st=M[label]||{bg:t.lt,tx:t.txm};
  return <span style={{background:st.bg,color:st.tx,padding:"2px 8px",borderRadius:4,fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{label}</span>;
}

export const Badge = Bdg;

