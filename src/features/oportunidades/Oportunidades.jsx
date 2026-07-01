import { useState, useEffect, useMemo, useCallback } from "react";
import { db } from "../../services/storage.js";
import { Crd, KPI, Btn, Bdg } from "../../components/ui/index.js";
import { useT } from "../../theme/ThemeContext.jsx";
import { fB } from "../../utils/formatters.js";
import { sv } from "../../utils/numbers.js";
import { Rebalanceamento } from "../clientes/Rebalanceamento.jsx";

// 👇 IMPORTANDO A BASE REAL DE CLIENTES
import { CLIENTES_DB } from '../../data/clientes.js'; 

/* ────────────────────────────────────────────────────────────
   CONSTANTES
──────────────────────────────────────────────────────────── */
const COLS = ["Nova", "Em andamento", "Negociacao", "Convertida", "Perdida"];
const TIPOS = ["Saldo Parado", "Sem Movimentacao", "Rebalanceamento", "Cross Sell", "Reativacao", "Upgrade Segmento"];
const PRIORIDADES = ["Alta", "Media", "Baixa"];
const NOMES_FANTASMA = new Set(["Sebastiao dos Santos", "Roberta Areias", "Jose Tavares"]);

const PESO_PRIORIDADE = { Alta: 40, Media: 22, Baixa: 8 };
const PESO_TIPO = {
  "Saldo Parado": 25, "Sem Movimentacao": 15, "Rebalanceamento": 20,
  "Cross Sell": 18, "Reativacao": 12, "Upgrade Segmento": 22,
};
const PESO_STATUS = { "Nova": 0, "Em andamento": 8, "Negociacao": 18, "Convertida": 0, "Perdida": -50 };

// Limiar para a IA sugerir negócios (50 mil)
const SALDO_PARADO_LIMIAR = 50000;

/* ────────────────────────────────────────────────────────────
   HELPERS
──────────────────────────────────────────────────────────── */
const genId = () => `op_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const isOportunidadeValida = (o) =>
  o && typeof o === "object" &&
  o.id != null &&
  typeof o.cliente === "string" && o.cliente.trim().length > 0 &&
  COLS.includes(o.status) &&
  !NOMES_FANTASMA.has(o.cliente);

const calcularScore = (o) => {
  const valor = sv(o.valor) || 0;
  const pontosValor = Math.min(35, Math.round(valor / 10000));
  const pontosPrioridade = PESO_PRIORIDADE[o.prioridade] ?? 0;
  const pontosTipo = PESO_TIPO[o.tipo] ?? 0;
  const pontosStatus = PESO_STATUS[o.status] ?? 0;
  const bruto = pontosValor + pontosPrioridade + pontosTipo + pontosStatus;
  return Math.max(0, Math.min(100, bruto));
};

const criarEntradaHistorico = (de, para) => ({
  de, para, timestamp: new Date().toISOString(),
});

const sanitizarLista = (lista) => (Array.isArray(lista) ? lista.filter(isOportunidadeValida) : []);

const gerarOportunidadesAutomaticas = (listaDeClientes = [], oportExistentes = []) => {
  const jaTemAuto = new Set(
    oportExistentes.filter((o) => o.auto).map((o) => `${o.cliente}__${o.tipo}`)
  );
  const sugestoes = [];

  listaDeClientes.forEach((c) => {
    const nome = c.nome || c.cliente;
    // Tenta pegar o saldo de onde estiver (saldo, saldoParado, ou patrimônio dependendo de como está no seu arquivo)
    const saldo = sv(c.saldoParado ?? c.saldo ?? 0); 
    
    if (!nome) return;

    if (saldo >= SALDO_PARADO_LIMIAR) {
      const chave = `${nome}__Saldo Parado`;
      if (!jaTemAuto.has(chave)) {
        sugestoes.push({
          id: genId(),
          cliente: nome,
          tipo: "Saldo Parado",
          valor: saldo,
          prioridade: saldo >= SALDO_PARADO_LIMIAR * 3 ? "Alta" : "Media",
          desc: "Sugestão automática: saldo parado detectado na conta do cliente.",
          status: "Nova",
          resp: "Sistema IA",
          auto: true,
          historico: [criarEntradaHistorico(null, "Nova")],
        });
      }
    }
  });

  return sugestoes;
};

const indexarPorStatus = (oport) => {
  const idx = Object.fromEntries(COLS.map((c) => [c, []]));
  oport.forEach((o) => {
    if (idx[o.status]) idx[o.status].push(o);
    else idx["Nova"].push(o);
  });
  COLS.forEach((c) => idx[c].sort((a, b) => calcularScore(b) - calcularScore(a)));
  return idx;
};

const calcularKPIs = (oport) => {
  const porStatus = {};
  let totalGeral = 0, valorGeral = 0;

  COLS.forEach((c) => {
    const itens = oport.filter((o) => o.status === c);
    const valor = itens.reduce((a, x) => a + (sv(x.valor) || 0), 0);
    porStatus[c] = { count: itens.length, valor };
    totalGeral += itens.length;
    valorGeral += valor;
  });

  const convertidas = porStatus["Convertida"]?.count || 0;
  const perdidas = porStatus["Perdida"]?.count || 0;
  const finalizadas = convertidas + perdidas;
  const taxaConversao = finalizadas > 0 ? (convertidas / finalizadas) * 100 : 0;
  const ticketMedio = convertidas > 0 ? (porStatus["Convertida"]?.valor || 0) / convertidas : 0;

  return { porStatus, totalGeral, valorGeral, taxaConversao, ticketMedio };
};

/* ────────────────────────────────────────────────────────────
   COMPONENTE PRINCIPAL
──────────────────────────────────────────────────────────── */
export function Oport({ oport = [], setOport, listaClientes = [] }) {
  const t = useT();
  const [view, setView] = useState("kanban");
  const [form, setForm] = useState(null);
  const [isLimpo, setIsLimpo] = useState(false);
  const [filtro, setFiltro] = useState({ prioridade: "", tipo: "", busca: "" });

  const cCor = useMemo(() => ({
    "Nova": t.blue, "Em andamento": t.amber, "Negociacao": t.purple,
    "Convertida": t.green, "Perdida": t.red,
  }), [t]);

  const inSt = useMemo(() => ({
    background: t.lt, border: `1px solid ${t.brd}`, borderRadius: 8, color: t.tx,
    padding: "8px 11px", fontSize: 12, outline: "none", width: "100%", boxSizing: "border-box",
  }), [t]);

  // Se a prop listaClientes vier vazia, usamos o CLIENTES_DB importado
  const clientesAtivos = useMemo(() => {
    return listaClientes && listaClientes.length > 0 ? listaClientes : CLIENTES_DB;
  }, [listaClientes]);

  /* ── persistência centralizada ── */
  const salvar = useCallback(async (novaLista) => {
    setOport(novaLista);
    await db.set("crm_oport", novaLista);
    return novaLista;
  }, [setOport]);

  /* ── limpeza automática de dados inválidos/fantasma ── */
  useEffect(() => {
    if (isLimpo) return;
    if (oport.length > 0) {
      const limpa = sanitizarLista(oport);
      if (limpa.length !== oport.length) {
        salvar(limpa);
      }
    }
    setIsLimpo(true);
  }, [oport, isLimpo, salvar]);

  const limparFantasmas = useCallback(() => salvar([]), [salvar]);

  /* ── ações principais ── */
  const mover = useCallback((id, novoStatus) => {
    const upd = oport.map((o) => {
      if (o.id !== id || o.status === novoStatus) return o;
      const historico = [...(o.historico || []), criarEntradaHistorico(o.status, novoStatus)];
      return { ...o, status: novoStatus, historico };
    });
    salvar(upd);
  }, [oport, salvar]);

  const criar = useCallback(() => {
    if (!form || !form.cliente || !form.cliente.trim()) return;
    const nova = {
      ...form,
      cliente: form.cliente.trim(),
      id: genId(),
      status: "Nova",
      resp: "Leonardo Vitor",
      auto: false,
      historico: [criarEntradaHistorico(null, "Nova")],
    };
    if (!isOportunidadeValida(nova)) return;
    salvar([nova, ...oport]);
    setForm(null);
  }, [form, oport, salvar]);

  const excluir = useCallback((id) => {
    salvar(oport.filter((o) => o.id !== id));
  }, [oport, salvar]);

  const aceitarSugestao = useCallback((sugestao) => {
    salvar([sugestao, ...oport]);
  }, [oport, salvar]);

  /* ── filtros ── */
  const oportFiltrada = useMemo(() => {
    return oport.filter((o) => {
      if (filtro.prioridade && o.prioridade !== filtro.prioridade) return false;
      if (filtro.tipo && o.tipo !== filtro.tipo) return false;
      if (filtro.busca && !String(o.cliente).toLowerCase().includes(filtro.busca.toLowerCase())) return false;
      return true;
    });
  }, [oport, filtro]);

  const porStatus = useMemo(() => indexarPorStatus(oportFiltrada), [oportFiltrada]);
  const kpis = useMemo(() => calcularKPIs(oport), [oport]);
  
  // Utiliza a lista unificada para gerar sugestões
  const sugestoesAuto = useMemo(
    () => gerarOportunidadesAutomaticas(clientesAtivos, oport),
    [clientesAtivos, oport]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Rebalanceamento assessorId="A5-1229" />

      {oport.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={limparFantasmas}
            style={{ background: t.red, color: "#fff", border: "none", borderRadius: 4, padding: "4px 8px", fontSize: 10, cursor: "pointer", opacity: 0.7, transition: "opacity .15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.7)}
          >
            🗑️ Forçar Limpeza do Kanban
          </button>
        </div>
      )}

      {/* ── SUGESTÕES AUTOMÁTICAS ── */}
      {sugestoesAuto.length > 0 && (
        <Crd style={{ padding: 12, border: `1px dashed ${t.gold}` }}>
          <div style={{ color: t.gold, fontWeight: 700, fontSize: 12, marginBottom: 8 }}>
            💡 {sugestoesAuto.length} oportunidade(s) sugerida(s) automaticamente
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sugestoesAuto.map((s) => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: t.tx }}>
                <span>{s.cliente} — {s.tipo} ({fB(s.valor)})</span>
                <Btn onClick={() => aceitarSugestao(s)} small>Adicionar</Btn>
              </div>
            ))}
          </div>
        </Crd>
      )}

      {/* ── KPIs DO FUNIL ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10 }}>
        {COLS.map((c) => (
          <Crd key={c} style={{ padding: "12px 14px" }}>
            <KPI
              label={c}
              value={kpis.porStatus[c].count}
              color={cCor[c]}
              size="sm"
              sub={fB(kpis.porStatus[c].valor)}
            />
          </Crd>
        ))}
      </div>

      {/* ── KPIs AVANÇADOS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
        <Crd style={{ padding: "12px 14px" }}>
          <KPI label="Taxa de Conversão" value={`${kpis.taxaConversao.toFixed(1)}%`} color={t.green} size="sm" />
        </Crd>
        <Crd style={{ padding: "12px 14px" }}>
          <KPI label="Ticket Médio" value={fB(kpis.ticketMedio)} color={t.gold} size="sm" />
        </Crd>
        <Crd style={{ padding: "12px 14px" }}>
          <KPI label="Total Pipeline" value={fB(kpis.valorGeral)} color={t.blue} size="sm" />
        </Crd>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 5 }}>
          {["kanban", "lista"].map((v) => (
            <Btn key={v} onClick={() => setView(v)} outline={view !== v} small>{v}</Btn>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <input
            placeholder="Buscar cliente..."
            value={filtro.busca}
            onChange={(e) => setFiltro((f) => ({ ...f, busca: e.target.value }))}
            style={{ ...inSt, width: 160 }}
          />
          <select value={filtro.prioridade} onChange={(e) => setFiltro((f) => ({ ...f, prioridade: e.target.value }))} style={{ ...inSt, width: 120 }}>
            <option value="">Prioridade</option>
            {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filtro.tipo} onChange={(e) => setFiltro((f) => ({ ...f, tipo: e.target.value }))} style={{ ...inSt, width: 160 }}>
            <option value="">Tipo</option>
            {TIPOS.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
          </select>
        </div>
        <Btn onClick={() => setForm({ cliente: "", tipo: "Saldo Parado", valor: 0, prioridade: "Alta", desc: "" })}>
          + Nova Oportunidade
        </Btn>
      </div>

      {form && (
        <Crd>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Nova Oportunidade</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
            <div key="Cliente">
              <div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Cliente</div>
              <select value={form.cliente} onChange={(e) => setForm((f) => ({ ...f, cliente: e.target.value }))} style={inSt}>
                <option value="">Selecione...</option>
                {clientesAtivos.map((c) => <option key={c.id || c.conta} value={c.nome || c.cliente}>{c.nome || c.cliente}</option>)}
                <option value="Outro (Digitar Manualmente)">Outro (Digitar Manualmente)</option>
              </select>
              {form.cliente === "Outro (Digitar Manualmente)" && (
                <input
                  type="text"
                  placeholder="Digite o nome..."
                  autoFocus
                  onChange={(e) => setForm((f) => ({ ...f, cliente: e.target.value }))}
                  style={{ ...inSt, marginTop: 5 }}
                />
              )}
            </div>

            <div key="Tipo"><div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Tipo</div>
              <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))} style={inSt}>
                {TIPOS.map((tp) => <option key={tp}>{tp}</option>)}
              </select>
            </div>
            <div key="Valor"><div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Valor Potencial</div>
              <input type="number" value={form.valor || 0} onChange={(e) => setForm((f) => ({ ...f, valor: +e.target.value }))} style={inSt} />
            </div>
            <div key="Prioridade"><div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Prioridade</div>
              <select value={form.prioridade} onChange={(e) => setForm((f) => ({ ...f, prioridade: e.target.value }))} style={inSt}>
                {PRIORIDADES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Descricao</div>
            <textarea value={form.desc || ""} onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))} rows={2} style={{ ...inSt, resize: "vertical" }} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <Btn onClick={criar} disabled={!form.cliente || !form.cliente.trim()}>Salvar</Btn>
            <Btn onClick={() => setForm(null)} outline>Cancelar</Btn>
          </div>
        </Crd>
      )}

      {view === "kanban" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10, overflowX: "auto" }}>
          {COLS.map((col) => (
            <div key={col} style={{ background: t.lt, borderRadius: 10, padding: "10px 8px", minHeight: 200 }}>
              <div style={{ color: cCor[col], fontWeight: 700, fontSize: 12, marginBottom: 8, padding: "0 4px" }}>
                {col} <span style={{ background: t.mid, color: t.txm, borderRadius: 99, padding: "1px 6px", fontSize: 10, marginLeft: 4 }}>{porStatus[col].length}</span>
              </div>

              {porStatus[col].length === 0 && (
                <div style={{ color: t.txd, fontSize: 11, fontStyle: "italic", textAlign: "center", marginTop: 20 }}>Vazio</div>
              )}

              {porStatus[col].map((o) => (
                <div
                  key={o.id}
                  draggable
                  data-op-id={o.id}
                  style={{ background: t.mid, border: `1px solid ${t.brd}`, borderRadius: 8, padding: "10px", marginBottom: 8, transition: "transform .12s, box-shadow .12s", cursor: "grab" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 4px 12px rgba(0,0,0,.25)`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                    <div style={{ color: t.tx, fontWeight: 600, fontSize: 12, marginBottom: 2 }}>
                      {String(o.cliente).split(" ").slice(0, 2).join(" ")}
                      {o.auto && <span style={{ marginLeft: 4, fontSize: 9, color: t.gold }}>✨auto</span>}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: t.txm, background: t.lt, borderRadius: 99, padding: "1px 6px" }}>
                      {calcularScore(o)}
                    </span>
                  </div>
                  <div style={{ color: t.txm, fontSize: 10, marginBottom: 4 }}>{o.tipo}</div>
                  <div style={{ color: t.gold, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{fB(o.valor)}</div>
                  <Bdg label={o.prioridade} color={t.gold} />
                  <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                    <select
                      onChange={(e) => e.target.value !== o.status && mover(o.id, e.target.value)}
                      value={o.status}
                      style={{ background: t.lt, border: `1px solid ${t.brd}`, borderRadius: 4, color: t.txm, fontSize: 9, padding: "2px 4px", outline: "none", cursor: "pointer" }}
                    >
                      {COLS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button onClick={() => excluir(o.id)} style={{ background: "none", border: "none", color: t.txd, fontSize: 10, cursor: "pointer" }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <Crd style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${t.brd}`, background: t.lt }}>
                {["Cliente", "Tipo", "Valor", "Score", "Prioridade", "Status", "Resp", "Acoes"].map((h) => (
                  <th key={h} style={{ padding: "9px 12px", color: t.txm, fontWeight: 700, textAlign: "left", fontSize: 10, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {oportFiltrada.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 20, color: t.txd }}>Nenhuma oportunidade cadastrada.</td></tr>
              )}
              {oportFiltrada.map((o) => (
                <tr
                  key={o.id}
                  style={{ borderBottom: `1px solid ${t.brd}`, transition: "background .12s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = t.lt)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "8px 12px", color: t.tx, fontWeight: 600 }}>{o.cliente}{o.auto && <span style={{ marginLeft: 4, fontSize: 9, color: t.gold }}>✨</span>}</td>
                  <td style={{ padding: "8px 12px", color: t.txm }}>{o.tipo}</td>
                  <td style={{ padding: "8px 12px", color: t.gold, fontWeight: 700 }}>{fB(o.valor)}</td>
                  <td style={{ padding: "8px 12px", color: t.txm, fontWeight: 700 }}>{calcularScore(o)}</td>
                  <td style={{ padding: "8px 12px" }}><Bdg label={o.prioridade} color={t.gold} /></td>
                  <td style={{ padding: "8px 12px" }}><Bdg label={o.status} color={cCor[o.status]} /></td>
                  <td style={{ padding: "8px 12px", color: t.txm, fontSize: 11 }}>{o.resp}</td>
                  <td style={{ padding: "8px 12px", display: "flex", gap: 6 }}>
                    <select
                      onChange={(e) => e.target.value !== o.status && mover(o.id, e.target.value)}
                      value={o.status}
                      style={{ background: t.lt, border: `1px solid ${t.brd}`, borderRadius: 4, color: t.txm, fontSize: 10, padding: "2px 6px", outline: "none", cursor: "pointer" }}
                    >
                      {COLS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button onClick={() => excluir(o.id)} style={{ background: "none", border: "none", color: t.txd, fontSize: 12, cursor: "pointer" }}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Crd>
      )}
    </div>
  );
}

export { calcularScore, calcularKPIs, indexarPorStatus, gerarOportunidadesAutomaticas };