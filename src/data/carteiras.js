import { CLIENTES_DB } from "./clientes.js";
import { sv } from "../utils/numbers.js";

export const CART_UNIQUE = {
  patrimonio:2062961.02, rentabCDI:99.10, rend:14170.23, rentab:0.1382,
  aloc:[
    {label:"Pos Fixado",  pct:0.9747,valor:2010698,cor:"#C9A84C"},
    {label:"Pre Fixado",  pct:0.0093,valor:19136,  cor:"#7C6FEB"},
    {label:"Inflacao",    pct:0.0061,valor:12500,  cor:"#4A9EEB"},
    {label:"Caixa",       pct:0.0100,valor:20626,  cor:"#4A6480"},
  ],
  classes:[
    {label:"Renda Fixa",  pct:97.47,valor:2010698},
    {label:"Pre Fixado",  pct:0.93, valor:19136},
    {label:"Inflacao",    pct:0.61, valor:12500},
    {label:"Caixa",       pct:1.00, valor:20626},
  ],
  datas:["Set/25","Out/25","Nov/25","Dez/25","Jan/26","Fev/26","Mar/26","Abr/26","Mai/26"],
  cart:[0,1.04,1.70,2.87,3.91,5.03,6.40,12.14,13.82],
  cdiL:[0,0.96,2.18,3.35,4.35,5.56,6.65,7.72,8.04],
  hist:[
    {mes:"Jun/25",r:0.0131,c:0.0128},{mes:"Jul/25",r:0.0124,c:0.0116},
    {mes:"Ago/25",r:0.0127,c:0.0122},{mes:"Set/25",r:0.0135,c:0.0128},
    {mes:"Out/25",r:0.0114,c:0.0105},{mes:"Nov/25",r:0.0066,c:0.0122},
    {mes:"Dez/25",r:0.0116,c:0.0117},{mes:"Jan/26",r:0.0104,c:0.0100},
    {mes:"Fev/26",r:0.0112,c:0.0121},{mes:"Mar/26",r:0.0137,c:0.0109},
    {mes:"Abr/26",r:0.0574,c:0.0107},{mes:"Mai/26",r:0.0144,c:0.0032},
  ],
  mesesPos:20,mesesNeg:4,retMax:0.4285,retMin:-0.2521,acimaCDI:13,volat:0.0327,
};

export const ALC = {
  AGRESSIVO: [{label:"Pos Fixado",pct:0.45,cor:"#C9A84C"},{label:"Renda Variavel",pct:0.30,cor:"#2ECC9A"},{label:"Inflacao",pct:0.15,cor:"#4A9EEB"},{label:"Prefixado",pct:0.10,cor:"#7C6FEB"}],
  MODERADO:  [{label:"Pos Fixado",pct:0.55,cor:"#C9A84C"},{label:"Renda Variavel",pct:0.20,cor:"#2ECC9A"},{label:"Inflacao",pct:0.15,cor:"#4A9EEB"},{label:"Prefixado",pct:0.10,cor:"#7C6FEB"}],
  CONSERVADOR:[{label:"Pos Fixado",pct:0.75,cor:"#C9A84C"},{label:"Inflacao",pct:0.15,cor:"#4A9EEB"},{label:"Prefixado",pct:0.10,cor:"#7C6FEB"}],
};

export const CARTEIRAS = Object.fromEntries(CLIENTES_DB.map(c => {
  if (c.id === "3404470") return [c.id, CART_UNIQUE];
  const net = Math.max(sv(c.netM1), sv(c.netM), sv(c.d0));
  const base = ALC[c.suit] || ALC.MODERADO;
  return [c.id, {
    patrimonio: net, rentabCDI: sv(c.cdi), rend: sv(c.rend), rentab: sv(c.rentab),
    aloc: base.map(a => ({...a, valor: a.pct * net})),
    classes:[], datas:[], cart:[], cdiL:[], hist:[],
    mesesPos:0, mesesNeg:0, retMax:0, retMin:0, acimaCDI:0, volat:0,
  }];
}));
