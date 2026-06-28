import { useEffect, useMemo, useState } from "react";
import { useT } from "../../theme/ThemeContext.jsx";
import { api } from "../../services/api.js";
import { CLIENTES_DB } from "../../data/clientes.js";
import { Crd, SelEl, Inp, Bdg, Btn } from "../../components/ui/index.js";
import { fB, fB2, fP } from "../../utils/formatters.js";
import { sv } from "../../utils/numbers.js";
import { CCard } from "./ClienteCard.jsx";
import { CDetalhe } from "./ClienteDetalhe.jsx";

// ── Mapeia positivador_completo → formato interno ─────────────────────────────
function mapearCliente(c, saldos = {}, qualidade = {}, perfBancario = {}) {
  if (c.nome !== undefined) return c; // já está no formato antigo

  const saldo  = saldos[String(c.cliente)]  || {};
  const qual   = qualidade[String(c.cliente)] || {};
  const banco  = perfBancario[String(c.cliente)] || {};

  return {
    id:    c.id,
    conta: String(c.cliente || ""),
    nome:  saldo.cliente || String(c.cliente || ""), // nome vem do saldo consolidado

    // Perfil
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

    // Flags
    ativo_m:           c.ativou_em_m,
    evadiu_m:          c.evadiu_em_m,
    fez_segundo_aporte:c.fez_segundo_aporte,
    operou_bolsa:      c.operou_bolsa,
    operou_fundo:      c.operou_fundo,
    operou_rf:         c.operou_renda_fixa,

    // Patrimônio
    netM1: sv(c.net_m_anterior) || 0,
    netM:  sv(c.net_m)          || 0,

    // Receitas
    rec:              sv(c.receita_mes)          || 0,
    rec_bovespa:      sv(c.receita_bovespa)      || 0,
    rec_futuros:      sv(c.receita_futuros)      || 0,
    rec_rf_banc:      sv(c.receita_rf_bancarios) || 0,
    rec_rf_priv:      sv(c.receita_rf_privados)  || 0,
    rec_rf_pub:       sv(c.receita_rf_publicos)  || 0,
    rec_aluguel:      sv(c.valor_receita_aluguel)|| 0,
    rec_pacote:       sv(c.valor_receita_pacote) || 0,

    // Captação
    cap:         sv(c.captacao_bruta_m)   || 0,
    resgate:     sv(c.resgate_m)          || 0,
    cap_liq:     sv(c.captacao_liquida_m) || 0,
    cap_ted:     sv(c.captacao_ted)       || 0,
    cap_prev:    sv(c.captacao_prev)      || 0,

    // Alocação por classe
    aloc_rf:    sv(c.aloc_renda_fixa)    || 0,
    aloc_fi:    sv(c.aloc_fi)            || 0,
    aloc_rv:    sv(c.aloc_renda_variavel)|| 0,
    aloc_fundos:sv(c.aloc_fundos)        || 0,
    aloc_prev:  sv(c.aloc_previdencia)   || 0,
    aloc_fin:   sv(c.aloc_financeiro)    || 0,
    aloc_out:   sv(c.aloc_outros)        || 0,

    // Saldo consolidado (cruzado)
    d0:       sv(saldo.saldo_d0) || 0,
    d1:       sv(saldo.saldo_d1) || 0,
    d2:       sv(saldo.saldo_d2) || 0,
    d3:       sv(saldo.saldo_d3) || 0,
    saldo_total: sv(saldo.total) || 0,

    // Qualidade de alocação (cruzado)
    ader:         qual.aderencia        ?? null,
    gap_over:     qual.gap_over         ?? null,
    gap_under:    qual.gap_under        ?? null,
    rentab_rel:   qual.rentabilidade    ?? null,
    pol_cadastrada: qual.politica_cadastrada || null,
    pol_sugerida:   qual.politica_sugerida   || null,
    saldo_global:   qual.saldo_global        ?? null,

    // Perfil bancário (cruzado)
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

export function Clientes({ tarefas, reunioes, oport }) {
  const t = useT();
  const [det, setDet]         = useState(null);
  const [busca, setBusca]     = useState("");
  const [fSt, setFSt]         = useState("Todos");
  const [fSu, setFSu]         = useState("Todos");
  const [fSg, setFSg]         = useState("Todos");
  const [fTp, setFTp]         = useState("Todos");
  const [ord, setOrd]         = useState("net");
  const [view, setView]       = useState("tabela");
  const [dadosApi, setDadosApi] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [apiOnline, setApiOnline] = useState(false);

  useEffect(() => {
    api.ping()
      .then(async () => {
        setApiOnline(true);

        // Carrega tudo em paralelo
        const [clientes, saldoRes, qualRes, bancoRes] = await Promise.allSettled([
          api.clientes(),
          fetch("http://localhost:3001/api/saldo").then(r => r.json()),
          fetch("http://localhost:3001/api/qualidade-alocacao").then(r => r.json()),
          fetch("http://localhost:3001/api/perfil-bancario").then(r => r.json()),
        ]);

        const cli  = clientes.status  === "fulfilled" ? clientes.value  : [];
        const sald = saldoRes.status  === "fulfilled" ? saldoRes.value  : [];
        const qual = qualRes.status   === "fulfilled" ? qualRes.value   : [];
        const banc = bancoRes.status  === "fulfilled" ? bancoRes.value  : [];

        // Indexa por conta para cruzamento O(1)
        const saldoMap   = Object.fromEntries((sald || []).map(s => [String(s.conta), s]));
        const qualMap    = Object.fromEntries((qual || []).map(q => [String(q.conta), q]));
        const bancoMap   = Object.fromEntries((banc || []).map(b => [String(b.conta), b]));

        setDadosApi(cli.map(c => mapearCliente(c, saldoMap, qualMap, bancoMap)));
      })
      .catch(() => {
        setApiOnline(false);
        setDadosApi(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const fonte = dadosApi || CLIENTES_DB;

  // Opções dinâmicas dos filtros
  const optsStatus = ["Todos", "ATIVO", "INATIVO"];
  const optsSuit   = ["Todos", ...new Set(fonte.map(c => c.suit).filter(Boolean))].slice(0, 8);
  const optsSeg    = ["Todos", ...new Set(fonte.map(c => c.seg).filter(s => s && s !== "–"))];
  const optsTipo   = ["Todos", "PESSOA FÍSICA", "PESSOA JURÍDICA"];

  const lista = useMemo(() => fonte
    .filter(c =>
      (String(c.nome || c.conta || "").toLowerCase().includes(busca.toLowerCase()) ||
       String(c.conta || "").includes(busca)) &&
      (fSt === "Todos" || (c.status || "").toUpperCase() === fSt) &&
      (fSu === "Todos" || c.suit === fSu) &&
      (fSg === "Todos" || c.seg === fSg) &&
      (fTp === "Todos" || (c.tipo_pessoa || "").toUpperCase() === fTp)
    )
    .sort((a, b) =>
      ord === "net"    ? sv(b.netM)  - sv(a.netM)  :
      ord === "nome"   ? String(a.nome || "").localeCompare(String(b.nome || "")) :
      ord === "rec"    ? sv(b.rec)   - sv(a.rec)   :
      ord === "cap"    ? sv(b.cap)   - sv(a.cap)   :
      ord === "ader"   ? sv(b.ader)  - sv(a.ader)  :
                         sv(b.d0)    - sv(a.d0)
    )
  , [fonte, busca, fSt, fSu, fSg, fTp, ord]);

  if (det) return (
    <CDetalhe
      c={det} onBack={() => setDet(null)}
      tarefas={tarefas} reunioes={reunioes} oport={oport}
    />
  );

  const exportCSV = () => {
    const h = "Conta,Nome,Perfil,Status,Segmento,Tipo Pessoa,NET M-1,NET Atual,Receita,Cap.Bruta,Cap.Liq,Resgate,Saldo D0,Aderencia,Gap Over,Gap Under,Portabilidade,Status PIX,Principalidade";
    const rows = lista.map(c => [
      c.conta, `"${c.nome}"`, c.suit, c.status, c.seg, c.tipo_pessoa || "",
      c.netM1, c.netM, c.rec, c.cap, c.cap_liq || 0, c.resgate || 0,
      c.d0, c.ader ?? "", c.gap_over ?? "", c.gap_under ?? "",
      c.portabilidade || "", c.status_pix || "", c.principalidade || ""
    ].join(","));
    const blob = new Blob([[h, ...rows].join("\n")], { type: "text/csv" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = u; a.download = "clientes.csv"; a.click();
    URL.revokeObjectURL(u);
  };

  // KPIs do topo
  const totalNET    = lista.reduce((s, c) => s + sv(c.netM), 0);
  const totalRec    = lista.reduce((s, c) => s + sv(c.rec), 0);
  const totalCap    = lista.reduce((s, c) => s + sv(c.cap), 0);
  const ativos      = lista.filter(c => (c.status || "").toUpperCase() === "ATIVO").length;
  const comAder     = lista.filter(c => c.ader != null).length;
  const adMedia     = comAder > 0 ? lista.filter(c => c.ader != null).reduce((s, c) => s + sv(c.ader), 0) / comAder : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Status da fonte */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "6px 12px", borderRadius: 8, fontSize: 11,
        background: apiOnline ? `${t.green}15` : `${t.amber}15`,
        border: `1px solid ${apiOnline ? t.green : t.amber}44`,
        alignSelf: "flex-start"
      }}>
        <span>{apiOnline ? "🟢" : "🟡"}</span>
        <span style={{ color: apiOnline ? t.green : t.amber, fontWeight: 600 }}>
          {loading ? "Conectando ao banco..." :
           apiOnline ? `Banco CRM.db · ${fonte.length} clientes` :
           `Dados locais (API offline) · ${fonte.length} clientes`}
        </span>
      </div>

      {/* KPIs rápidos */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 }}>
          {[
            { l: "NET Total",   v: fB(totalNET),  c: t.gold  },
            { l: "Receita",     v: fB2(totalRec), c: t.green },
            { l: "Captação",    v: fB(totalCap),  c: t.blue  },
            { l: "Ativos",      v: ativos,         c: t.green },
            { l: "Filtrados",   v: lista.length,   c: t.txm   },
            { l: "Ader. Média", v: adMedia != null ? fP(adMedia / 100) : "–", c: adMedia != null && adMedia < 70 ? t.red : t.green },
          ].map(({ l, v, c }) => (
            <Crd key={l} style={{ padding: "10px 14px" }}>
              <div style={{ color: t.txd, fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>{l}</div>
              <div style={{ color: c, fontSize: 15, fontWeight: 800 }}>{v}</div>
            </Crd>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Inp
          value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Pesquisar nome ou conta..." style={{ width: 220 }}
        />
        <SelEl value={fSt} onChange={e => setFSt(e.target.value)} opts={optsStatus} />
        <SelEl value={fSu} onChange={e => setFSu(e.target.value)} opts={optsSuit}   />
        <SelEl value={fSg} onChange={e => setFSg(e.target.value)} opts={optsSeg}    />
        <SelEl value={fTp} onChange={e => setFTp(e.target.value)} opts={optsTipo}   />
        <SelEl value={ord} onChange={e => setOrd(e.target.value)} opts={[
          { v: "net",  l: "Ordenar: NET"     },
          { v: "nome", l: "Ordenar: Nome"    },
          { v: "rec",  l: "Ordenar: Receita" },
          { v: "cap",  l: "Ordenar: Captação"},
          { v: "ader", l: "Ordenar: Aderência"},
          { v: "d0",   l: "Ordenar: Saldo D0"},
        ]} />
        <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          {["tabela", "cards"].map(v => (
            <Btn key={v} onClick={() => setView(v)} outline={view !== v} small>{v}</Btn>
          ))}
          <Btn onClick={exportCSV} outline small>⬇️ CSV</Btn>
        </div>
        <span style={{ color: t.txd, fontSize: 12 }}>{lista.length} clientes</span>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: t.txd, fontSize: 13 }}>
          Carregando dados...
        </div>
      )}

      {/* Cards */}
      {!loading && view === "cards" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
          {lista.map(c => <CCard key={c.id || c.conta} c={c} onClick={setDet} />)}
        </div>
      )}

      {/* Tabela */}
      {!loading && view === "tabela" && (
        <Crd style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${t.brd}`, background: t.lt }}>
                  {[
                    "Conta","Nome","Perfil","Segmento","Status","Tipo",
                    "NET M-1","NET Atual","Receita","Cap.Bruta","Cap.Líq.",
                    "Saldo D0","Aderência","Gap Over","Portabilidade","PIX","Principalidade"
                  ].map(h => (
                    <th key={h} style={{
                      padding: "9px 10px", color: t.txm, fontWeight: 700,
                      textAlign: "left", fontSize: 10, textTransform: "uppercase",
                      letterSpacing: ".4px", whiteSpace: "nowrap"
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lista.map(c => {
                  const adPct = sv(c.ader);
                  const adCor = adPct < 50 ? t.red : adPct < 70 ? t.amber : t.green;
                  return (
                    <tr
                      key={c.id || c.conta}
                      style={{ borderBottom: `1px solid ${t.brd}`, cursor: "pointer" }}
                      onClick={() => setDet(c)}
                      onMouseEnter={e => e.currentTarget.style.background = t.lt}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "7px 10px", color: t.txm, fontFamily: "monospace", fontSize: 11 }}>{c.conta}</td>
                      <td style={{ padding: "7px 10px", color: t.tx, fontWeight: 600, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nome}</td>
                      <td style={{ padding: "7px 10px" }}><Bdg label={c.suit} /></td>
                      <td style={{ padding: "7px 10px" }}><Bdg label={c.seg} /></td>
                      <td style={{ padding: "7px 10px" }}><Bdg label={c.status} /></td>
                      <td style={{ padding: "7px 10px", color: t.txd, fontSize: 10 }}>{c.tipo_pessoa || "–"}</td>
                      <td style={{ padding: "7px 10px", color: t.txm, fontVariantNumeric: "tabular-nums" }}>{fB(c.netM1)}</td>
                      <td style={{ padding: "7px 10px", color: c.netM > 0 ? t.green : t.txd, fontWeight: c.netM > 0 ? 700 : 400, fontVariantNumeric: "tabular-nums" }}>{fB(c.netM)}</td>
                      <td style={{ padding: "7px 10px", color: c.rec > 0 ? t.gold : t.txd, fontVariantNumeric: "tabular-nums" }}>{fB2(c.rec)}</td>
                      <td style={{ padding: "7px 10px", color: c.cap > 0 ? t.green : t.txd, fontVariantNumeric: "tabular-nums" }}>{fB(c.cap)}</td>
                      <td style={{ padding: "7px 10px", color: (c.cap_liq || 0) >= 0 ? t.green : t.red, fontVariantNumeric: "tabular-nums" }}>{fB(c.cap_liq || 0)}</td>
                      <td style={{ padding: "7px 10px", color: c.d0 > 5000 ? t.amber : t.txd, fontWeight: c.d0 > 5000 ? 700 : 400, fontVariantNumeric: "tabular-nums" }}>{fB2(c.d0)}</td>
                      <td style={{ padding: "7px 10px" }}>
                        {c.ader != null
                          ? <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <div style={{ width: 36, height: 4, background: t.lt, borderRadius: 99, overflow: "hidden" }}>
                                <div style={{ width: `${Math.min(adPct, 100)}%`, height: "100%", background: adCor }} />
                              </div>
                              <span style={{ color: adCor, fontSize: 10, fontWeight: 700 }}>{adPct.toFixed(0)}%</span>
                            </div>
                          : <span style={{ color: t.txd, fontSize: 10 }}>--</span>}
                      </td>
                      <td style={{ padding: "7px 10px", color: c.gap_over ? t.amber : t.txd, fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
                        {c.gap_over != null ? fB(c.gap_over) : "–"}
                      </td>
                      <td style={{ padding: "7px 10px" }}>
                        {c.portabilidade
                          ? <Bdg label={c.portabilidade} />
                          : <span style={{ color: t.txd, fontSize: 10 }}>–</span>}
                      </td>
                      <td style={{ padding: "7px 10px" }}>
                        {c.status_pix
                          ? <span style={{ fontSize: 10, color: c.status_pix.includes("Tem") ? t.green : t.txd, fontWeight: 700 }}>
                              {c.status_pix.includes("Tem") ? "✅" : "❌"}
                            </span>
                          : <span style={{ color: t.txd }}>–</span>}
                      </td>
                      <td style={{ padding: "7px 10px", color: t.txm, fontSize: 10 }}>{c.principalidade || "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Crd>
      )}
    </div>
  );
}
