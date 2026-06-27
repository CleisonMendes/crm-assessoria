import { sv } from "./numbers.js";
export const fB  = v => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0}).format(sv(v));
export const fB2 = v => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:2}).format(sv(v));
export const fP  = (v,d=1) => `${(sv(v)*100).toFixed(d)}%`;
export const fDT = d => d ? new Date(d).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "--";
export const fD  = d => d ? new Date(d+"T00:00").toLocaleDateString("pt-BR") : "--";
