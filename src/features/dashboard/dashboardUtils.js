import { sv } from "../../utils/numbers.js";
import { NET_TOT, REC_TOT, CAP_TOT } from "../../data/clientes.js";
import { PLANO } from "../../data/plano.js";

export const getDashboardStats = (reunioes, tarefas, oport, clientes) => {
  const progNet = (NET_TOT / PLANO.netMeta) * 100;
  
  const proxR = reunioes
    .filter(r => r.status === "Agendada")
    .sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora))[0];

  const alertH24 = reunioes.filter(
    r => r.status === "Agendada" && 
    new Date(r.dataHora) - Date.now() > 0 && 
    new Date(r.dataHora) - Date.now() < 86400000
  ).length;

  const tarAtr = tarefas.filter(x => x.status === "Atrasada").length;

  const top4 = [...clientes]
    .sort((a, b) => Math.max(sv(b.netM1), sv(b.netM)) - Math.max(sv(a.netM1), sv(a.netM)))
    .slice(0, 4);

  const saldoTop = clientes
    .filter(c => c.d0 > 50000)
    .sort((a, b) => b.d0 - a.d0)
    .slice(0, 4);

  const rebalTop = clientes
    .filter(c => c.ader != null && c.ader < 0.5)
    .sort((a, b) => a.ader - b.ader)
    .slice(0, 4);

  const netEv = {
    lb: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"],
    v: [28.1, 31.2, 33.8, 36.4, 39.1, NET_TOT / 1e6]
  };

  const capEv = {
    lb: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"],
    v: [1.2, 0.8, 1.5, 2.1, 0.9, CAP_TOT / 1e6]
  };

  const recEv = {
    lb: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"],
    v: [8200, 9100, 10500, 11200, 9800, REC_TOT]
  };

  return {
    progNet,
    proxR,
    alertH24,
    tarAtr,
    top4,
    saldoTop,
    rebalTop,
    netEv,
    capEv,
    recEv
  };
};
