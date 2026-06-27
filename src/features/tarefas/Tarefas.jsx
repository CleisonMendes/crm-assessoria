import { useState, useEffect } from "react";
import { db } from "../../services/storage.js";
import { fB, fP, fD } from "../../utils/formatters.js";
import { Crd, KPI, Btn, Bdg } from "../../components/ui/index.js";
import { useT } from "../../theme/ThemeContext.jsx";
import { sv } from "../../utils/numbers.js";

export function Tarefas({ tarefas = [], setTarefas, listaClientes = [] }) {
  const t = useT();
  const [view, setView] = useState("lista");
  const [filtro, setFiltro] = useState("Todas");
  const [form, setForm] = useState(null);
  const [radarOpen, setRadarOpen] = useState(false);
  const [sugestoes, setSugestoes] = useState([]);
  const [isLimpo, setIsLimpo] = useState(false); // Flag de segurança

  const stCores = { Pendente: t.txm, "Em andamento": t.amber, Concluida: t.green, Atrasada: t.red };
  const inSt = { background: t.lt, border: `1px solid ${t.brd}`, borderRadius: 8, color: t.tx, padding: "8px 11px", fontSize: 12, outline: "none", width: "100%", boxSizing: "border-box" };
  const lista = tarefas.filter(x => filtro === "Todas" || x.status === filtro);

  // Efeito de segurança: Força a limpeza na primeira montagem se houver lixo estático
  useEffect(() => {
    if (!isLimpo && tarefas.length > 0) {
      const temFantasma = tarefas.some(x => String(x.cliente).includes("Antonio Justiniano") || String(x.cliente).includes("Sebastiao") || String(x.cliente).includes("Roberta"));
      if (temFantasma) {
        limparFantasmas();
      }
      setIsLimpo(true);
    }
  }, [tarefas, isLimpo]);

  // Função para exterminar dados antigos forçadamente
  const limparFantasmas = async () => {
    setTarefas([]);
    await db.set("crm_tarefas", []);
    console.log("Tarefas limpas!");
  };

  const toggle = async id => {
    const upd = tarefas.map(x => x.id === id ? { ...x, status: x.status === "Concluida" ? "Pendente" : "Concluida" } : x);
    setTarefas(upd);
    await db.set("crm_tarefas", upd);
  };
  
  const excluir = async id => {
    const upd = tarefas.filter(x => x.id !== id);
    setTarefas(upd);
    await db.set("crm_tarefas", upd);
  };
  
  const salvar = async () => {
    if (!form || !form.titulo) return;
    const nova = { ...form, id: Date.now(), status: "Pendente" };
    const upd = [nova, ...tarefas];
    setTarefas(upd);
    await db.set("crm_tarefas", upd);
    setForm(null);
  };

  // Lógica do Radar de Oportunidades usando a API real (listaClientes)
  const scanOportunidades = () => {
    const ops = [];
    listaClientes.forEach(c => {
      if ((c.status || "").toUpperCase() !== "ATIVO") return;
      
      const saldo = sv(c.d0 || c.financeiro);
      // 1. Saldo Parado
      if (saldo > 10000) {
        ops.push({ id: `d0-${c.id || c.conta}`, cliente: c.nome || c.cliente, conta: c.conta, icone: "💰", titulo: "Alocar Saldo Parado", motivo: `Possui ${fB(saldo)} parados na conta.`, tipo: "Ligacao", prior: "Alta" });
      }
      
      // 2. Agressivo com Baixa Renda Variável (Lendo da estrutura da API)
      if ((c.suit || c.suitability) === "AGRESSIVO" && c.aloc) {
        const rv = c.aloc.find(a => String(a.label).toLowerCase().includes("renda") || String(a.label).toLowerCase().includes("acoes"));
        const rvPct = rv ? sv(rv.pct) : 0;
        if (rvPct < 0.25) {
          ops.push({ id: `rv-${c.id || c.conta}`, cliente: c.nome || c.cliente, conta: c.conta, icone: "⚠️", titulo: "Rebalancear Carteira", motivo: `Perfil Agressivo com apenas ${(rvPct * 100).toFixed(0)}% em Renda Variável.`, tipo: "Rebalanceamento", prior: "Media" });
        }
      }
      
      // 3. Sem Aportes / Evolução
      if (sv(c.netM || c.net_m) > 0 && sv(c.netM1 || c.net_m1) >= sv(c.netM || c.net_m)) {
        ops.push({ id: `net-${c.id || c.conta}`, cliente: c.nome || c.cliente, conta: c.conta, icone: "📉", titulo: "Follow-up de Aportes", motivo: "Sem evolução de patrimônio nos últimos meses.", tipo: "Follow-up", prior: "Media" });
      }
    });
    
    return ops.filter(o => !tarefas.some(t => t.cliente === o.cliente && t.titulo === o.titulo && t.status !== "Concluida"));
  };

  const abrirRadar = () => {
    setSugestoes(scanOportunidades());
    setRadarOpen(true);
  };

  const aceitarSugestao = async (sug) => {
    const nova = { id: Date.now(), titulo: sug.titulo, cliente: sug.cliente, conta: sug.conta, tipo: sug.tipo, prior: sug.prior, prazo: new Date().toISOString().split('T')[0], resp: "Leonardo Vitor", status: "Pendente" };
    const upd = [nova, ...tarefas];
    setTarefas(upd);
    await db.set("crm_tarefas", upd);
    setSugestoes(sugestoes.filter(x => x.id !== sug.id));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      
      {/* ── BOTÃO DE EMERGÊNCIA (Apenas visível se houver tarefas) ── */}
      {tarefas.length > 0 && (
         <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={limparFantasmas} style={{ background: t.red, color: "#fff", border: "none", borderRadius: 4, padding: "4px 8px", fontSize: 10, cursor: "pointer", opacity: 0.7 }}>
              🗑️ Forçar Limpeza de Tarefas
            </button>
         </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10 }}>
        {[
          { l: "Total", v: tarefas.length, c: t.txm },
          { l: "Pendentes", v: tarefas.filter(x => x.status === "Pendente").length, c: t.amber },
          { l: "Em andamento", v: tarefas.filter(x => x.status === "Em andamento").length, c: t.blue },
          { l: "Concluidas", v: tarefas.filter(x => x.status === "Concluida").length, c: t.green },
          { l: "Atrasadas", v: tarefas.filter(x => x.status === "Atrasada").length, c: t.red }
        ].map(({ l, v, c }) => (
          <Crd key={l} style={{ padding: "12px 14px" }}><KPI label={l} value={v} color={c} size="sm" /></Crd>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {["Todas", "Pendente", "Em andamento", "Concluida", "Atrasada"].map(f => (
            <Btn key={f} onClick={() => setFiltro(f)} outline={filtro !== f} small>
              {f} {f !== "Todas" ? `(${tarefas.filter(x => x.status === f).length})` : ""}
            </Btn>
          ))}
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {["lista", "kanban"].map(v => <Btn key={v} onClick={() => setView(v)} outline={view !== v} small>{v}</Btn>)}
          <Btn onClick={abrirRadar} outline style={{ borderColor: t.gold, color: t.gold }}>✨ Mapear Oportunidades</Btn>
          <Btn onClick={() => setForm({ titulo: "", cliente: "", conta: "", tipo: "Ligacao", prior: "Alta", prazo: "", resp: "Leonardo Vitor" })}>+ Nova Tarefa</Btn>
        </div>
      </div>

      {form && (
        <Crd>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Nova Tarefa</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
            <div key="Titulo"><div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Titulo</div><input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Titulo da tarefa..." style={inSt} /></div>
            <div key="Cliente">
              <div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Cliente</div>
              <select value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} style={inSt}>
                <option value="">Selecione...</option>
                {listaClientes.map(c => <option key={c.id || c.conta} value={c.nome || c.cliente}>{c.nome || c.cliente}</option>)}
                <option value="Outro">Outro (Digitar)</option>
              </select>
              {form.cliente === "Outro" && <input onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} placeholder="Nome..." style={{ ...inSt, marginTop: 6 }} />}
            </div>
            <div key="Tipo"><div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Tipo</div><select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={inSt}>{["Ligacao", "WhatsApp", "Reuniao", "Follow-up", "Proposta", "Rebalanceamento", "Relatorio", "Outro"].map(tp => <option key={tp}>{tp}</option>)}</select></div>
            <div key="Prioridade"><div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Prioridade</div><select value={form.prior} onChange={e => setForm(f => ({ ...f, prior: e.target.value }))} style={inSt}>{["Alta", "Media", "Baixa"].map(p => <option key={p}>{p}</option>)}</select></div>
            <div key="Prazo"><div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Prazo</div><input type="date" value={form.prazo} onChange={e => setForm(f => ({ ...f, prazo: e.target.value }))} style={inSt} /></div>
            <div key="Responsavel"><div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Responsavel</div><input value={form.resp} onChange={e => setForm(f => ({ ...f, resp: e.target.value }))} style={inSt} /></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}><Btn onClick={salvar}>Salvar</Btn><Btn onClick={() => setForm(null)} outline>Cancelar</Btn></div>
        </Crd>
      )}

      {view === "kanban" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(160px,1fr))", gap: 10, overflowX: "auto" }}>
          {["Pendente", "Em andamento", "Concluida", "Atrasada"].map(col => (
            <div key={col} style={{ background: t.lt, borderRadius: 10, padding: "10px 8px" }}>
              <div style={{ color: stCores[col], fontWeight: 700, fontSize: 12, marginBottom: 8, padding: "0 4px" }}>
                {col} <span style={{ background: t.mid, color: t.txm, borderRadius: 99, padding: "1px 6px", fontSize: 10, marginLeft: 4 }}>{tarefas.filter(x => x.status === col).length}</span>
              </div>
              {tarefas.filter(x => x.status === col).length === 0 && <div style={{ color: t.txd, fontSize: 11, fontStyle: "italic", textAlign: "center", marginTop: 20 }}>Vazio</div>}
              {tarefas.filter(x => x.status === col).map(x => (
                <div key={x.id} style={{ background: t.mid, border: `1px solid ${t.brd}`, borderRadius: 8, padding: "10px", marginBottom: 8, borderLeft: `3px solid ${stCores[x.status] || t.gold}` }}>
                  <div style={{ color: t.tx, fontWeight: 600, fontSize: 12, marginBottom: 2 }}>{x.titulo}</div>
                  <div style={{ color: t.txm, fontSize: 10, marginBottom: 3 }}>{x.cliente} · {x.tipo}</div>
                  <div style={{ color: t.txd, fontSize: 10, marginBottom: 6 }}>Prazo: {fD(x.prazo)}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Bdg label={x.prior} />
                    <button onClick={() => toggle(x.id)} style={{ background: "none", border: `1px solid ${t.brd}`, borderRadius: 4, color: t.txm, fontSize: 9, padding: "2px 6px", cursor: "pointer" }}>{x.status === "Concluida" ? "Reabrir" : "Concluir"}</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {lista.length === 0 && <Crd style={{ textAlign: "center", color: t.txd, padding: 30 }}>Nenhuma tarefa encontrada.</Crd>}
          {lista.map(x => (
            <Crd key={x.id} style={{ borderLeft: `3px solid ${stCores[x.status] || t.gold}`, padding: "11px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <button onClick={() => toggle(x.id)} style={{ background: "none", border: `2px solid ${x.status === "Concluida" ? t.green : t.brd}`, borderRadius: "50%", width: 20, height: 20, cursor: "pointer", color: x.status === "Concluida" ? t.green : "transparent", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{x.status === "Concluida" ? "✓" : ""}</button>
                <div style={{ flex: 1 }}>
                  <div style={{ color: t.tx, fontWeight: 600, fontSize: 13, textDecoration: x.status === "Concluida" ? "line-through" : "none", opacity: x.status === "Concluida" ? 0.6 : 1 }}>{x.titulo}</div>
                  <div style={{ color: t.txd, fontSize: 11, marginTop: 1 }}>{x.tipo} · {x.cliente} · Prazo: {fD(x.prazo)} · {x.resp}</div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Bdg label={x.prior} /><Bdg label={x.status} />
                  <button onClick={() => excluir(x.id)} style={{ background: "none", border: "none", color: t.txd, fontSize: 12, cursor: "pointer" }}>🗑️</button>
                </div>
              </div>
            </Crd>
          ))}
        </div>
      )}

      {/* Modal Flutuante do Radar de Oportunidades */}
      {radarOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(3px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Crd style={{ width: "100%", maxWidth: 550, maxHeight: "80vh", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden", boxShadow: "0 10px 40px rgba(0,0,0,0.5)", border: `1px solid ${t.gold}` }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.brd}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: t.lt }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>✨</span>
                <div style={{ color: t.tx, fontWeight: 700, fontSize: 15 }}>Radar de Oportunidades</div>
              </div>
              <button onClick={() => setRadarOpen(false)} style={{ background: "none", border: "none", color: t.txm, fontSize: 24, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            
            <div style={{ padding: 20, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
              {sugestoes.length === 0 ? (
                <div style={{ color: t.txd, textAlign: "center", padding: "20px 0" }}>Nenhuma oportunidade mapeada. Importe seus clientes ou verifique os saldos.</div>
              ) : sugestoes.map(sug => (
                <div key={sug.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14, background: t.mid, borderRadius: 8, border: `1px solid ${t.brd}` }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <div style={{ fontSize: 24 }}>{sug.icone}</div>
                    <div>
                      <div style={{ color: t.tx, fontWeight: 700, fontSize: 13 }}>{sug.cliente}</div>
                      <div style={{ color: t.txm, fontSize: 11, marginTop: 3 }}>{sug.motivo}</div>
                    </div>
                  </div>
                  <Btn onClick={() => aceitarSugestao(sug)} small>+ Criar Tarefa</Btn>
                </div>
              ))}
            </div>
          </Crd>
        </div>
      )}
    </div>
  );
}