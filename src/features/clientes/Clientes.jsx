import { useEffect, useMemo, useState } from "react";
import { useT } from "../../theme/ThemeContext.jsx";
import { api } from "../../services/api.js";
import { CLIENTES_DB } from "../../data/clientes.js"; 
import { Crd, SelEl, Inp, Bdg, Btn } from "../../components/ui/index.js";
import { fB, fB2, fP } from "../../utils/formatters.js";
import { sv } from "../../utils/numbers.js";
import { CCard } from "./ClienteCard.jsx";
import { CDetalhe } from "./ClienteDetalhe.jsx";

function mapearCliente(c) {
  if (c.nome !== undefined && !c.cliente) return c;
  
  return {
    id: c.id,
    conta: String(c.cliente || ""),
    nome: String(c.cliente || "Código " + (c.cliente || "")), 
    suit: c.suitability || "NÃO INFORMADO",
    status: c.status || "INATIVO",
    seg: c.segmentacao_cliente || c.segmento || "–",
    netM1: c.net_m_anterior || 0,
    netM: c.net_m || 0,
    rec: c.receita_mes || 0,
    cap: c.captacao_bruta_m || 0,
    res: c.resgate_m || 0,
    d0: c.saldo_real_d0 !== null && c.saldo_real_d0 !== undefined ? c.saldo_real_d0 : (c.aloc_financeiro || 0),
     ader: c.aderencia ?? null, 
    ader: c.aderencia || null, 
    ult: c.atualizado_em || c.importado_em || "–",
    
    // Alocações por classe originais da tabela principal
    aloc_renda_fixa: c.aloc_renda_fixa || 0,
    aloc_fi: c.aloc_fi || 0,
    aloc_renda_variavel: c.aloc_renda_variavel || 0,
    aloc_fundos: c.aloc_fundos || 0,
    aloc_financeiro: c.aloc_financeiro || 0,
    aloc_previdencia: c.aloc_previdencia || 0,
    aloc_outros: c.aloc_outros || 0,
    
    profissao: c.profissao,
    sexo: c.sexo,
    tipo_pessoa: c.tipo_pessoa
  };
}

export function Clientes({ tarefas, reunioes, oport }) {
  const t = useT();
  const [det, setDet] = useState(null);
  const [busca, setBusca] = useState("");
  const [fSt, setFSt] = useState("Todos");
  const [fSu, setFSu] = useState("Todos");
  const [fSg, setFSg] = useState("Todos");
  const [ord, setOrd] = useState("net");
  const [view, setView] = useState("tabela");

  const [dadosApi, setDadosApi] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(false);

  useEffect(() => {
    api.ping()
      .then(() => {
        setApiOnline(true);
        return api.clientes();
      })
      .then(dados => {
        setDadosApi(dados.map(mapearCliente));
      })
      .catch(() => {
        setApiOnline(false);
        setDadosApi(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const fonte = dadosApi || CLIENTES_DB;

  const lista = useMemo(() => fonte
    .filter(c =>
      (String(c.nome || "").toLowerCase().includes(busca.toLowerCase()) ||
       String(c.conta || "").includes(busca)) &&
      (fSt === "Todos" || c.status === fSt) &&
      (fSu === "Todos" || c.suit === fSu) &&
      (fSg === "Todos" || c.seg === fSg)
    )
    .sort((a, b) =>
      ord === "net"  ? Math.max(sv(b.netM1), sv(b.netM)) - Math.max(sv(a.netM1), sv(a.netM)) :
      ord === "nome" ? String(a.nome || "").localeCompare(String(b.nome || "")) :
      ord === "rec"  ? sv(b.rec) - sv(a.rec) :
                       sv(b.d0)  - sv(a.d0)
    )
  , [fonte, busca, fSt, fSu, fSg, ord]);

  if (det) return <CDetalhe c={det} onBack={() => setDet(null)} tarefas={tarefas} reunioes={reunioes} oport={oport} />;

  const exportCSV = () => {
    const h = "Conta,Nome,Perfil,Status,Segmento,NET M1,NET M,Receita,Cap.Bruta,Saldo D0,Ult.Contato";
    const rows = lista.map(c => [c.conta, `"${c.nome}"`, c.suit, c.status, c.seg, c.netM1, c.netM, c.rec, c.cap, c.d0, c.ult].join(","));
    const blob = new Blob([[h, ...rows].join("\n")], { type: "text/csv" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = "clientes.csv"; a.click();
    URL.revokeObjectURL(u);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <Inp value={busca} onChange={e => setBusca(e.target.value)} placeholder="Pesquisar nome ou conta..." style={{ width: 220 }} />
        <SelEl value={fSt} onChange={e => setFSt(e.target.value)} opts={["Todos", "ATIVO", "INATIVO"]} />
        <SelEl value={fSu} onChange={e => setFSu(e.target.value)} opts={["Todos", "AGRESSIVO", "MODERADO", "CONSERVADOR"]} />
        <SelEl value={fSg} onChange={e => setFSg(e.target.value)} opts={["Todos", "PF 1M+", "PF 300K+", "PF 300K-", "PJ PME"]} />
        <SelEl value={ord} onChange={e => setOrd(e.target.value)} opts={[
          { v: "net", l: "Ordenar: NET" }, { v: "nome", l: "Ordenar: Nome" },
          { v: "rec", l: "Ordenar: Receita" }, { v: "d0", l: "Ordenar: Saldo D0" }
        ]} />
        <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          {["tabela", "cards"].map(v => <Btn key={v} onClick={() => setView(v)} outline={view !== v} small>{v}</Btn>)}
          <Btn onClick={exportCSV} outline small>⬇️ CSV</Btn>
        </div>
        <span style={{ color: t.txd, fontSize: 12 }}>{lista.length} clientes</span>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: t.txd, fontSize: 13 }}>
          Carregando dados...
        </div>
      )}

      {!loading && view === "cards" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
          {lista.map(c => <CCard key={c.conta} c={c} onClick={setDet} />)}
        </div>
      )}

      {!loading && view === "tabela" && (
        <Crd style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${t.brd}`, background: t.lt }}>
                  {["Conta", "Nome", "Perfil", "Segmento", "Status", "NET M-1", "NET Atual", "Receita", "Cap.Bruta", "Saldo D0", "Ult. Modif."].map(h => (
                    <th key={h} style={{ padding: "9px 11px", color: t.txm, fontWeight: 700, textAlign: "left", fontSize: 10, textTransform: "uppercase", letterSpacing: ".4px", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lista.map(c => (
                  <tr key={c.conta} style={{ borderBottom: `1px solid ${t.brd}`, cursor: "pointer" }}
                    onClick={() => setDet(c)}
                    onMouseEnter={e => e.currentTarget.style.background = t.lt}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "7px 11px", color: t.txm, fontFamily: "monospace", fontSize: 11 }}>{c.conta}</td>
                    <td style={{ padding: "7px 11px", color: t.tx, fontWeight: 600, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nome}</td>
                    <td style={{ padding: "7px 11px" }}><Bdg label={c.suit} /></td>
                    <td style={{ padding: "7px 11px" }}><Bdg label={c.seg} /></td>
                    <td style={{ padding: "7px 11px" }}><Bdg label={c.status} /></td>
                    <td style={{ padding: "7px 11px", color: t.txm, fontVariantNumeric: "tabular-nums" }}>{fB(c.netM1)}</td>
                    <td style={{ padding: "7px 11px", color: c.netM > 0 ? t.green : t.txd, fontWeight: c.netM > 0 ? 700 : 400, fontVariantNumeric: "tabular-nums" }}>{fB(c.netM)}</td>
                    <td style={{ padding: "7px 11px", color: c.rec > 0 ? t.gold : t.txd, fontVariantNumeric: "tabular-nums" }}>{fB2(c.rec)}</td>
                    <td style={{ padding: "7px 11px", color: c.cap > 0 ? t.green : t.txd, fontVariantNumeric: "tabular-nums" }}>{fB(c.cap)}</td>
                    <td style={{ padding: "7px 11px", color: c.d0 > 5000 ? t.amber : t.txd, fontVariantNumeric: "tabular-nums" }}>{fB2(c.d0)}</td>
                    <td style={{ padding: "7px 11px", color: t.txm, fontSize: 11 }}>{c.ult}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Crd>
      )}
    </div>
  );
}