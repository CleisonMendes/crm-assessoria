import { useState, useEffect } from "react";
import { api } from "../../services/api.js";
import { sv } from "../../utils/numbers.js";
import { Crd, KPI, Btn, ProgressBar, Bdg } from "../../components/ui/index.js";
import { Donut } from "../../components/charts/index.js";
import { useT } from "../../theme/ThemeContext.jsx";
import { fB, fB2, fP } from "../../utils/formatters.js";
import { CDetalhe } from "../clientes/ClienteDetalhe.jsx";


const BASE = "http://localhost:3001/api";
const gj   = url => fetch(url).then(r => r.json()).catch(() => null);

// ── Função auxiliar para mapear o cliente ao ser clicado ───────────────────
function mapearClienteAoClicar(c, saldos = [], qualidade = [], bancario = []) {
  if (c.nome !== undefined) return c; 
  
  const saldo  = saldos.find(s => String(s.conta) === String(c.cliente)) || {};
  const qual   = qualidade.find(q => String(q.conta) === String(c.cliente)) || {};
  const banco  = bancario.find(b => String(b.conta) === String(c.cliente)) || {};

  return {
    id:    c.id,
    conta: String(c.cliente || ""),
    nome:  saldo.cliente || String(c.cliente || ""),
    suit:         c.suitability        || "NÃO INFORMADO",
    status:       c.status             || "INATIVO",
    seg:          c.segmentacao_cliente || c.segmento || "–",
    profissao:    c.profissao,
    sexo:         c.sexo,
    tipo_pessoa:  c.tipo_pessoa,
    data_cadastro:c.data_cadastro,
    data_nasc:    c.data_nascimento,
    termo_qual:   c.termo_qualificado,
    termo_prof:   c.termo_profissional,
    ativo_m:           c.ativou_em_m,
    evadiu_m:          c.evadiu_em_m,
    fez_segundo_aporte:c.fez_segundo_aporte,
    operou_bolsa:      c.operou_bolsa,
    operou_fundo:      c.operou_fundo,
    operou_rf:         c.operou_renda_fixa,
    netM1: sv(c.net_m_anterior) || 0,
    netM:  sv(c.net_m)          || 0,
    rec:              sv(c.receita_mes)          || 0,
    rec_bovespa:      sv(c.receita_bovespa)      || 0,
    rec_futuros:      sv(c.receita_futuros)      || 0,
    rec_rf_banc:      sv(c.receita_rf_bancarios) || 0,
    rec_rf_priv:      sv(c.receita_rf_privados)  || 0,
    rec_rf_pub:       sv(c.receita_rf_publicos)  || 0,
    rec_aluguel:      sv(c.valor_receita_aluguel)|| 0,
    rec_pacote:       sv(c.valor_receita_pacote) || 0,
    cap:         sv(c.captacao_bruta_m)   || 0,
    resgate:     sv(c.resgate_m)          || 0,
    cap_liq:     sv(c.captacao_liquida_m) || 0,
    cap_ted:     sv(c.captacao_ted)       || 0,
    cap_prev:    sv(c.captacao_prev)      || 0,
    aloc_rf:    sv(c.aloc_renda_fixa)    || 0,
    aloc_fi:    sv(c.aloc_fi)            || 0,
    aloc_rv:    sv(c.aloc_renda_variavel)|| 0,
    aloc_fundos:sv(c.aloc_fundos)        || 0,
    aloc_prev:  sv(c.aloc_previdencia)   || 0,
    aloc_fin:   sv(c.aloc_financeiro)    || 0,
    aloc_out:   sv(c.aloc_outros)        || 0,
    d0:       sv(saldo.saldo_d0) || 0,
    d1:       sv(saldo.saldo_d1) || 0,
    d2:       sv(saldo.saldo_d2) || 0,
    d3:       sv(saldo.saldo_d3) || 0,
    saldo_total: sv(saldo.total) || 0,
    ader:         qual.aderencia        ?? null,
    gap_over:     qual.gap_over         ?? null,
    gap_under:    qual.gap_under        ?? null,
    rentab_rel:   qual.rentabilidade    ?? null,
    pol_cadastrada: qual.politica_cadastrada || null,
    pol_sugerida:   qual.politica_sugerida   || null,
    saldo_global:   qual.saldo_global        ?? null,
    uso_conta:         banco.uso_conta         || null,
    status_corretora:  banco.status_corretora  || null,
    elegivel_turbo:    banco.elegivel_turbo    || null,
    faixa_auc:         banco.faixa_auc         || null,
    portabilidade:     banco.portabilidade     || null,
    status_boleto:     banco.status_pgto_boleto|| null,
    status_fatura:     banco.status_pgto_fatura|| null,
    status_pix:        banco.status_chave_pix  || null,
    principalidade:    banco.principalidade    || null,
    faixa_pgto_m0:     banco.faixa_pgto_m0     || null,
    faixa_pgto_m1:     banco.faixa_pgto_m1     || null,
    faixa_pgto_m2:     banco.faixa_pgto_m2     || null,
    ult: c.data_referencia || c.data_cadastro || "–",
  };
}

export function Carteira() {
  const t = useT();

  const [dash,      setDash]      = useState(null);
  const [clientes,  setClientes]  = useState([]);
  const [divers,    setDivers]    = useState([]);
  const [saldos,    setSaldos]    = useState([]);
  const [qualidade, setQualidade] = useState([]);
  const [bancario,  setBancario]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [abaAtiva,  setAbaAtiva]  = useState("alocacao");
  const [filtroAder,setFiltroAder]= useState("Todos");
  
  // Estado para controlar a abertura dos detalhes do cliente
  const [det, setDet] = useState(null);

  useEffect(() => {
    Promise.all([
      api.dashboard().catch(() => null),
      api.clientes().catch(() => []),
      gj(`${BASE}/diversificacao/consolidado`),
      gj(`${BASE}/saldo`),
      gj(`${BASE}/qualidade-alocacao`),
      gj(`${BASE}/perfil-bancario`),
    ]).then(([d, cli, div, sal, qual, banc]) => {
      setDash(     d    || { net_total: 0, receita: 0, captacao: 0, resgate: 0 });
      setClientes( cli  || []);
      setDivers(   div  || []);
      setSaldos(   sal  || []);
      setQualidade(qual || []);
      setBancario( banc || []);
    }).finally(() => setLoading(false));
  }, []);

  // Função que captura o clique e formata os dados para o CDetalhe
  const abrirDetalheCliente = (conta) => {
    // Tira o ".0" de ambos os lados para garantir que os IDs batam perfeitamente
    const idLimpo = String(conta).replace(".0", "");
    const c = clientes.find(cli => String(cli.cliente).replace(".0", "") === idLimpo);
    
    if (c) {
      setDet(mapearClienteAoClicar(c, saldos, qualidade, bancario));
    } else {
      console.warn("Cliente não encontrado na lista principal:", conta);
    }
  };

  if (loading) return (
    <div style={{ padding: 40, color: t.gold, textAlign: "center", fontWeight: 700 }}>
      ⏳ Sincronizando Carteira...
    </div>
  );

  // Se houver um cliente clicado, exibe a tela de Detalhes
  if (det) return (
    <CDetalhe
      c={det} 
      onBack={() => setDet(null)}
      tarefas={[]}   // 👈 Passando arrays vazios evita que o CDetalhe quebre
      reunioes={[]}  // se ele tentar fazer um .map() ou .filter() nessas listas
      oport={[]} 
    />
  );


  // ── MÉTRICAS MACRO (dashboard) ────────────────────────────────────────────
  const d        = dash || {};
  const net      = sv(d.net_total);
  const capBruta = sv(d.captacao);
  const resgate  = sv(d.resgate);
  const capLiq   = capBruta - Math.abs(resgate);
  const receita  = sv(d.receita);

  // ── SALDO CONSOLIDADO agregado ────────────────────────────────────────────
  const saldoD0    = saldos.reduce((s, r) => s + sv(r.saldo_d0), 0);
  const saldoD1    = saldos.reduce((s, r) => s + sv(r.saldo_d1), 0);
  const saldoD2    = saldos.reduce((s, r) => s + sv(r.saldo_d2), 0);
  const saldoD3    = saldos.reduce((s, r) => s + sv(r.saldo_d3), 0);
  const saldoTotal = saldos.reduce((s, r) => s + sv(r.total),    0);
  const contasSaldo = saldos.length;

  // ── ALOCAÇÃO GLOBAL (positivador_completo) ────────────────────────────────
  const aloc = { rf: 0, rv: 0, fundos: 0, fi: 0, prev: 0, fin: 0, out: 0 };
  clientes.forEach(c => {
    aloc.rf     += sv(c.aloc_renda_fixa);
    aloc.rv     += sv(c.aloc_renda_variavel);
    aloc.fundos += sv(c.aloc_fundos);
    aloc.fi     += sv(c.aloc_fi);
    aloc.prev   += sv(c.aloc_previdencia);
    aloc.fin    += sv(c.aloc_financeiro);
    aloc.out    += sv(c.aloc_outros);
  });
  const totalAloc = Object.values(aloc).reduce((s, v) => s + v, 0);

  const classesGlobal = [
    { l: "Renda Fixa",       valor: aloc.rf,     cor: t.blue              },
    { l: "Renda Variável",   valor: aloc.rv,     cor: t.gold              },
    { l: "Fundos",           valor: aloc.fundos, cor: t.purple || "#8b5cf6" },
    { l: "FIIs",             valor: aloc.fi,     cor: "#06b6d4"           },
    { l: "Previdência",      valor: aloc.prev,   cor: t.green             },
    { l: "Financeiro",       valor: aloc.fin,    cor: t.amber             },
    { l: "Outros",           valor: aloc.out,    cor: t.txd               },
  ]
    .filter(c => c.valor > 0)
    .map(c => ({ ...c, pct: totalAloc > 0 ? c.valor / totalAloc : 0 }))
    .sort((a, b) => b.valor - a.valor);

  // ── QUALIDADE DE ALOCAÇÃO agregada ───────────────────────────────────────
  // Normaliza aderência: aceita string com vírgula/ponto/%, e converte decimal (0.85 → 85)
  const svAder = v => {
    if (v == null || v === "" || v === "–" || v === "-") return null;
    const n = parseFloat(String(v).replace(",", ".").replace("%", "").trim());
    if (isNaN(n)) return null;
    // Se vier como decimal (0 a 1), converte para percentual (0 a 100)
    return n > 0 && n <= 1 ? n * 100 : n;
  };

  const comAder     = qualidade.filter(q => svAder(q.aderencia) !== null);
  const adMedia     = comAder.length > 0 ? comAder.reduce((s, q) => s + svAder(q.aderencia), 0) / comAder.length : null;
  const enquad      = comAder.filter(q => svAder(q.aderencia) >= 70).length;
  const criticos    = comAder.filter(q => svAder(q.aderencia) < 50).length;
  const atencao     = comAder.filter(q => svAder(q.aderencia) >= 50 && svAder(q.aderencia) < 70).length;
  const gapOverTot  = qualidade.reduce((s, q) => s + sv(q.gap_over),  0);
  const gapUnderTot = qualidade.reduce((s, q) => s + sv(q.gap_under), 0);

  const listaAder = comAder.filter(q => {
    const ad = svAder(q.aderencia);
    if (filtroAder === "Todos")   return true;
    if (filtroAder === "Crítico") return ad < 50;
    if (filtroAder === "Atenção") return ad >= 50 && ad < 70;
    if (filtroAder === "OK")      return ad >= 70;
    return true;
  }).sort((a, b) => svAder(a.aderencia) - svAder(b.aderencia));

  // Cruzar conta com nome do saldo
  const nomeMap = Object.fromEntries(saldos.map(s => [String(s.conta), s.cliente || s.conta]));

  // ── PERFIL BANCÁRIO agregado ──────────────────────────────────────────────
  const comPix         = bancario.filter(b => b.status_chave_pix && b.status_chave_pix.includes("Tem")).length;
  const comPortab      = bancario.filter(b => b.portabilidade && b.portabilidade !== "Nao_Tem_Portabilidade").length;
  const turboElegiv    = bancario.filter(b => b.elegivel_turbo === "Sim").length;
  const principal      = bancario.filter(b => b.principalidade === "Principal").length;
  const contasAtivas   = bancario.filter(b => b.uso_conta === "Conta_Ativa").length;

  // Faixas AUC
  const faixasAuc = bancario.reduce((acc, b) => {
    const k = b.faixa_auc || "Sem faixa";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── KPIs MACRO ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
        {[
          { l: "NET Total",     v: fB(net),      co: t.gold  },
          { l: "Cap. Líquida",  v: fB(capLiq),   co: capLiq >= 0 ? t.green : t.red },
          { l: "Cap. Bruta",    v: fB(capBruta), co: t.green },
          { l: "Resgates",      v: fB(resgate),  co: t.red   },
          { l: "Receita/mês",   v: fB2(receita), co: t.gold  },
          { l: "Saldo D0",      v: fB(saldoD0),  co: t.amber },
          { l: "Saldo D+1",     v: fB(saldoD1),  co: t.txm   },
          { l: "Clientes",      v: clientes.length, co: t.blue },
        ].map(({ l, v, co }) => (
          <Crd key={l} style={{ padding: "10px 14px" }}>
            <div style={{ color: t.txd, fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>{l}</div>
            <div style={{ color: co, fontSize: 15, fontWeight: 800 }}>{v}</div>
          </Crd>
        ))}
      </div>

      {/* ── ABAS ── */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${t.brd}` }}>
        {[
          { id: "alocacao",    l: "Alocação Global" },
          { id: "aderencia",   l: "Aderência"       },
          { id: "diversificacao", l: "Diversificação" },
          { id: "saldo",       l: "Saldo Consolidado"},
          { id: "bancario",    l: "Perfil Bancário"  },
        ].map(({ id, l }) => (
          <button key={id} onClick={() => setAbaAtiva(id)} style={{
            background: "none", border: "none",
            color: abaAtiva === id ? t.gold : t.txm,
            padding: "8px 14px", fontSize: 12,
            fontWeight: abaAtiva === id ? 700 : 400,
            cursor: "pointer",
            borderBottom: abaAtiva === id ? `2px solid ${t.gold}` : "2px solid transparent",
            whiteSpace: "nowrap"
          }}>{l}</button>
        ))}
      </div>

      {/* ── ABA: ALOCAÇÃO GLOBAL ── */}
      {abaAtiva === "alocacao" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: 12 }}>
          <Crd style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ color: t.tx, fontWeight: 700, fontSize: 13 }}>Distribuição por Classe</div>
            {totalAloc > 0 ? (
              <>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Donut slices={classesGlobal} size={170} thick={26} label={fB(totalAloc)} sub="Mapeado" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {classesGlobal.map(c => (
                    <div key={c.l}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.cor, flexShrink: 0 }} />
                        <span style={{ color: t.txm, fontSize: 11, flex: 1 }}>{c.l}</span>
                        <span style={{ color: t.tx, fontWeight: 700, fontSize: 11 }}>{(c.pct * 100).toFixed(1)}%</span>
                        <span style={{ color: t.txd, fontSize: 10 }}>{fB(c.valor)}</span>
                      </div>
                      <ProgressBar value={c.pct * 100} max={100} color={c.cor} h={3} />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ color: t.txd, fontSize: 12, textAlign: "center", marginTop: 40 }}>
                Sem dados. Importe o Positivador.
              </div>
            )}
          </Crd>

          {/* Top clientes por NET */}
          <Crd>
            <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
              Top Clientes por NET
            </div>
            <div style={{ overflowY: "auto", maxHeight: 340 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.brd}`, background: t.lt }}>
                    {["Conta", "Nome", "Perfil", "NET Atual", "Receita", "Cap. Bruta"].map(h => (
                      <th key={h} style={{ padding: "6px 10px", color: t.txm, fontWeight: 700, textAlign: "left", fontSize: 10, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...clientes].sort((a, b) => sv(b.net_m) - sv(a.net_m)).slice(0, 15).map((c, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${t.brd}33` }}>
                      <td style={{ padding: "5px 10px", color: t.txd, fontFamily: "monospace", fontSize: 10 }}>{c.cliente}</td>
                      <td style={{ padding: "5px 10px", color: t.tx, fontWeight: 600, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {nomeMap[String(c.cliente)] || c.cliente}
                      </td>
                      <td style={{ padding: "5px 10px" }}><Bdg label={c.suitability || "–"} /></td>
                      <td style={{ padding: "5px 10px", color: t.green, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fB(sv(c.net_m))}</td>
                      <td style={{ padding: "5px 10px", color: t.gold, fontVariantNumeric: "tabular-nums" }}>{fB2(sv(c.receita_mes))}</td>
                      <td style={{ padding: "5px 10px", color: t.txm, fontVariantNumeric: "tabular-nums" }}>{fB(sv(c.captacao_bruta_m))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Crd>
        </div>
      )}

      {/* ── ABA: ADERÊNCIA ── */}
      {abaAtiva === "aderencia" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* KPIs de aderência */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
            {[
              { l: "Ader. Média",  v: adMedia != null ? `${adMedia.toFixed(1)}%` : "–", co: adMedia != null && adMedia < 70 ? t.red : t.green },
              { l: "Enquadrados",  v: enquad,                                             co: t.green },
              { l: "Críticos",     v: criticos,                                           co: t.red   },
              { l: "Com Aderência",v: comAder.length,                                     co: t.txm   },
              { l: "Gap Over Tot.",v: fB(gapOverTot),                                     co: t.amber },
              { l: "Gap Under Tot.",v: fB(gapUnderTot),                                   co: t.amber },
            ].map(({ l, v, co }) => (
              <Crd key={l} style={{ padding: "10px 14px" }}>
                <div style={{ color: t.txd, fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>{l}</div>
                <div style={{ color: co, fontSize: 15, fontWeight: 800 }}>{v}</div>
              </Crd>
            ))}
          </div>

          {/* Lista de aderência */}
          <Crd>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div style={{ color: t.tx, fontWeight: 700, fontSize: 13 }}>
                Aderência por Cliente
                <span style={{ color: t.txd, fontSize: 11, fontWeight: 400, marginLeft: 8 }}>
                  {enquad} OK · {atencao} Atenção · {criticos} Críticos
                </span>
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                {[
                  { f: "Todos",   label: `Todos (${comAder.length})` },
                  { f: "Crítico", label: `🔴 Crítico (${criticos})`  },
                  { f: "Atenção", label: `🟡 Atenção (${atencao})`   },
                  { f: "OK",      label: `🟢 OK (${enquad})`         },
                ].map(({ f, label }) => (
                  <Btn key={f} onClick={() => setFiltroAder(f)} outline={filtroAder !== f} small>{label}</Btn>
                ))}
              </div>
            </div>

            {listaAder.length === 0 ? (
              <div style={{ color: t.txd, fontSize: 12, textAlign: "center", padding: 20 }}>
                Nenhum dado. Importe a Qualidade de Alocação.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10, maxHeight: 500, overflowY: "auto", paddingRight: 4 }}>
                {listaAder.map((q, i) => {
                  const ad       = svAder(q.aderencia) ?? 0;
                  const cor      = ad < 50 ? t.red : ad < 70 ? t.amber : t.green;
                  const icone    = ad < 50 ? "🔴" : ad < 70 ? "🟡" : "🟢";
                  const label    = ad < 50 ? "Crítico" : ad < 70 ? "Atenção" : "OK";
                  const nome     = nomeMap[String(q.conta)] || q.conta;
                  const gapOver  = sv(q.gap_over);
                  const gapUnder = sv(q.gap_under);
                  const custodia = sv(q.custodia_total);
                  return (
                    <div key={i} 
                      onClick={() => abrirDetalheCliente(q.conta)}
                      onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.15)"}
                      onMouseLeave={e => e.currentTarget.style.filter = "brightness(1)"}
                      style={{
                        cursor: "pointer",
                        transition: "filter 0.2s",
                        background: t.lt,
                        border: `1px solid ${cor}44`,
                        borderLeft: `3px solid ${cor}`,
                        borderRadius: 10,
                        padding: "12px 14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}>
                      {/* Linha 1: nome + badge */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: t.tx, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {String(nome).split(" ").slice(0, 3).join(" ")}
                          </div>
                          <div style={{ color: t.txd, fontSize: 10, marginTop: 1 }}>
                            #{String(q.conta).replace(".0", "")} · {q.perfil || "–"}
                          </div>
                        </div>
                        <div style={{
                          background: `${cor}22`, color: cor,
                          border: `1px solid ${cor}55`,
                          borderRadius: 6, padding: "2px 8px",
                          fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0
                        }}>
                          {icone} {label}
                        </div>
                      </div>

                      {/* Linha 2: barra de aderência */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ color: t.txm, fontSize: 10 }}>Aderência</span>
                          <span style={{ color: cor, fontWeight: 800, fontSize: 13 }}>{ad.toFixed(1)}%</span>
                        </div>
                        {/* Barra customizada com fundo visível */}
                        <div style={{ height: 6, borderRadius: 3, background: `${t.brd}`, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${Math.min(ad, 100)}%`, background: cor, borderRadius: 3, transition: "width .4s" }} />
                        </div>
                      </div>

                      {/* Linha 3: custódia + gap */}
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ color: t.txd, fontSize: 9, textTransform: "uppercase", marginBottom: 2 }}>Custódia</div>
                          <div style={{ color: t.tx, fontWeight: 600, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{fB(custodia)}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ color: t.txd, fontSize: 9, textTransform: "uppercase", marginBottom: 2 }}>Gap</div>
                          <div style={{ fontWeight: 600, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                            {gapOver  > 0 ? <span style={{ color: t.amber }}>↑ {fB(gapOver)}</span>  :
                             gapUnder > 0 ? <span style={{ color: t.red   }}>↓ {fB(gapUnder)}</span> :
                             <span style={{ color: t.green }}>✓ OK</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Crd>
        </div>
      )}

      {/* ── ABA: DIVERSIFICAÇÃO ── */}
      {abaAtiva === "diversificacao" && (
        <Crd>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ color: t.tx, fontWeight: 700, fontSize: 13 }}>Produtos Consolidados</div>
            <Bdg label={`${divers.length} produtos`} />
          </div>
          {divers.length === 0 ? (
            <div style={{ color: t.txd, fontSize: 12, textAlign: "center", marginTop: 40 }}>
                Sem dados. Importe o Positivador.
            </div>
          ) : (
            <>
              {/* Barras por produto */}
              {(() => {
                const porProd = divers.reduce((acc, d) => {
                  acc[d.produto] = (acc[d.produto] || 0) + sv(d.net_total);
                  return acc;
                }, {});
                const totalDiv = Object.values(porProd).reduce((s, v) => s + v, 0);
                const cores = [t.blue, t.gold, t.green, t.amber, t.purple || "#8b5cf6", "#06b6d4", t.red];
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                    {Object.entries(porProd).sort((a, b) => b[1] - a[1]).map(([prod, val], i) => (
                      <div key={prod}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <span style={{ color: t.txm, fontSize: 12 }}>{prod}</span>
                          <div style={{ display: "flex", gap: 10 }}>
                            <span style={{ color: cores[i % cores.length], fontWeight: 700, fontSize: 12 }}>{fB(val)}</span>
                            <span style={{ color: t.txd, fontSize: 11 }}>{totalDiv > 0 ? ((val / totalDiv) * 100).toFixed(1) : 0}%</span>
                          </div>
                        </div>
                        <ProgressBar value={val} max={totalDiv || 1} color={cores[i % cores.length]} h={5} />
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Tabela detalhada */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${t.brd}`, background: t.lt }}>
                      {["Produto", "Sub Produto", "Clientes", "Qtde Total", "NET Total", "% Carteira"].map(h => (
                        <th key={h} style={{ padding: "6px 10px", color: t.txm, fontWeight: 700, textAlign: "left", fontSize: 10, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const totalDiv = divers.reduce((s, d) => s + sv(d.net_total), 0);
                      return divers.sort((a, b) => sv(b.net_total) - sv(a.net_total)).map((d, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${t.brd}33` }}>
                          <td style={{ padding: "5px 10px", color: t.gold, fontWeight: 600 }}>{d.produto}</td>
                          <td style={{ padding: "5px 10px", color: t.txm }}>{d.sub_produto || "—"}</td>
                          <td style={{ padding: "5px 10px", color: t.tx, textAlign: "center" }}>{d.clientes}</td>
                          <td style={{ padding: "5px 10px", color: t.txm, fontVariantNumeric: "tabular-nums" }}>
                            {d.quantidade_total != null ? sv(d.quantidade_total).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "—"}
                          </td>
                          <td style={{ padding: "5px 10px", color: t.green, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fB(sv(d.net_total))}</td>
                          <td style={{ padding: "5px 10px", color: t.txd }}>
                            {totalDiv > 0 ? ((sv(d.net_total) / totalDiv) * 100).toFixed(1) : 0}%
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Crd>
      )}

      {/* ── ABA: SALDO CONSOLIDADO ── */}
      {abaAtiva === "saldo" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
            {[
              { l: "Saldo D0",    v: fB(saldoD0),    co: t.gold  },
              { l: "Saldo D+1",   v: fB(saldoD1),    co: t.txm   },
              { l: "Saldo D+2",   v: fB(saldoD2),    co: t.txm   },
              { l: "Saldo D+3",   v: fB(saldoD3),    co: t.txm   },
              { l: "Total",       v: fB(saldoTotal),  co: t.green },
              { l: "Contas",      v: contasSaldo,     co: t.blue  },
            ].map(({ l, v, co }) => (
              <Crd key={l} style={{ padding: "10px 14px" }}>
                <div style={{ color: t.txd, fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>{l}</div>
                <div style={{ color: co, fontSize: 15, fontWeight: 800 }}>{v}</div>
              </Crd>
            ))}
          </div>

          <Crd>
            <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
              Saldo por Conta — Top 20
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.brd}`, background: t.lt }}>
                    {["Conta", "Nome", "D0", "D+1", "D+2", "D+3", "Total"].map(h => (
                      <th key={h} style={{ padding: "6px 10px", color: t.txm, fontWeight: 700, textAlign: h === "Conta" || h === "Nome" ? "left" : "right", fontSize: 10, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...saldos].sort((a, b) => sv(b.total) - sv(a.total)).slice(0, 20).map((s, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${t.brd}33` }}>
                      <td style={{ padding: "5px 10px", color: t.txd, fontFamily: "monospace", fontSize: 10 }}>{s.conta}</td>
                      <td style={{ padding: "5px 10px", color: t.tx, fontWeight: 600, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.cliente || "–"}</td>
                      <td style={{ padding: "5px 10px", color: sv(s.saldo_d0) > 0 ? t.amber : t.txd, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fB2(sv(s.saldo_d0))}</td>
                      <td style={{ padding: "5px 10px", color: t.txm, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fB2(sv(s.saldo_d1))}</td>
                      <td style={{ padding: "5px 10px", color: t.txm, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fB2(sv(s.saldo_d2))}</td>
                      <td style={{ padding: "5px 10px", color: t.txm, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fB2(sv(s.saldo_d3))}</td>
                      <td style={{ padding: "5px 10px", color: t.green, fontWeight: 700, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fB(sv(s.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Crd>
        </div>
      )}

      {/* ── ABA: PERFIL BANCÁRIO ── */}
      {abaAtiva === "bancario" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* KPIs bancários */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
            {[
              { l: "Total Contas",    v: bancario.length,  co: t.blue  },
              { l: "Contas Ativas",   v: contasAtivas,     co: t.green },
              { l: "Com PIX",         v: comPix,           co: t.green },
              { l: "Portabilidade",   v: comPortab,        co: t.blue  },
              { l: "Elegível Turbo",  v: turboElegiv,      co: t.gold  },
              { l: "Principal",       v: principal,        co: t.purple || "#8b5cf6" },
            ].map(({ l, v, co }) => (
              <Crd key={l} style={{ padding: "10px 14px" }}>
                <div style={{ color: t.txd, fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>{l}</div>
                <div style={{ color: co, fontSize: 15, fontWeight: 800 }}>{v}</div>
              </Crd>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* Faixas AUC */}
            <Crd>
              <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Distribuição por Faixa AUC</div>
              {Object.entries(faixasAuc).sort((a, b) => b[1] - a[1]).map(([faixa, qtde]) => (
                <div key={faixa} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ color: t.txm, fontSize: 12 }}>{faixa}</span>
                    <span style={{ color: t.gold, fontWeight: 700, fontSize: 12 }}>{qtde}</span>
                  </div>
                  <ProgressBar value={qtde} max={bancario.length || 1} color={t.gold} h={4} />
                </div>
              ))}
            </Crd>

            {/* Oportunidades bancárias */}
            <Crd>
              <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Oportunidades Identificadas</div>
              {[
                { l: "Sem PIX",             v: bancario.length - comPix,      co: t.red,   ic: "🔑", desc: "Clientes sem chave PIX" },
                { l: "Sem Portabilidade",   v: bancario.length - comPortab,   co: t.amber, ic: "📲", desc: "Potencial portabilidade" },
              ].map(({ l, v, co, ic, desc }) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ fontSize: 18 }}>{ic}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: t.tx, fontSize: 12, fontWeight: 700 }}>{l}</div>
                    <div style={{ color: t.txd, fontSize: 10 }}>{desc}</div>
                  </div>
                  <div style={{ color: co, fontSize: 14, fontWeight: 800 }}>{v}</div>
                </div>
              ))}
            </Crd>
          </div>
        </div>
      )}

    </div>
  );
}
