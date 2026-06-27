import { useState, useEffect } from "react";
import { db } from "../../services/storage.js";
import { Crd, KPI, Btn, Bdg } from "../../components/ui/index.js";
import { useT } from "../../theme/ThemeContext.jsx";
import { fB } from "../../utils/formatters.js";
import { sv } from "../../utils/numbers.js";
import { Rebalanceamento } from "../clientes/Rebalanceamento.jsx";

export function Oport({ oport = [], setOport, listaClientes = [] }) {
  const t = useT();
  const [view, setView] = useState("kanban");
  const [form, setForm] = useState(null);
  const [isLimpo, setIsLimpo] = useState(false); // Flag de segurança
  
  const cols = ["Nova", "Em andamento", "Negociacao", "Convertida", "Perdida"];
  const cCor = { "Nova": t.blue, "Em andamento": t.amber, "Negociacao": t.purple, "Convertida": t.green, "Perdida": t.red };
  const inSt = { background: t.lt, border: `1px solid ${t.brd}`, borderRadius: 8, color: t.tx, padding: "8px 11px", fontSize: 12, outline: "none", width: "100%", boxSizing: "border-box" };
  
  // Efeito de segurança: Força a limpeza na primeira montagem se houver lixo estático
  useEffect(() => {
    if (!isLimpo && oport.length > 0) {
      // Verifica se os dados atuais são os fantasmas (ex: "Sebastiao dos Santos")
      const temFantasma = oport.some(o => o.cliente === "Sebastiao dos Santos" || o.cliente === "Roberta Areias" || o.cliente === "Jose Tavares");
      if (temFantasma) {
         limparFantasmas();
      }
      setIsLimpo(true);
    }
  }, [oport, isLimpo]);

  // Função para exterminar dados antigos forçadamente
  const limparFantasmas = async () => {
    setOport([]);
    await db.set("crm_oport", []);
    console.log("Kanban limpo!");
  };

  const mover = async (id, st) => {
    const upd = oport.map(o => o.id === id ? { ...o, status: st } : o);
    setOport(upd);
    await db.set("crm_oport", upd);
  };
  
  const criar = async () => {
    if (!form || !form.cliente) return;
    const nova = { ...form, id: Date.now(), status: "Nova", resp: "Leonardo Vitor" };
    const upd = [nova, ...oport];
    setOport(upd);
    await db.set("crm_oport", upd);
    setForm(null);
  };
  
  const excluir = async id => {
    const upd = oport.filter(o => o.id !== id);
    setOport(upd);
    await db.set("crm_oport", upd);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Rebalanceamento assessorId="A5-1229" />

      {/* ── BOTÃO DE EMERGÊNCIA (Apenas visível se houver oportunidades) ── */}
      {oport.length > 0 && (
         <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={limparFantasmas} style={{ background: t.red, color: "#fff", border: "none", borderRadius: 4, padding: "4px 8px", fontSize: 10, cursor: "pointer", opacity: 0.7 }}>
              🗑️ Forçar Limpeza do Kanban
            </button>
         </div>
      )}

      {/* ── KPIs DO FUNIL ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10 }}>
        {cols.map(c => (
          <Crd key={c} style={{ padding: "12px 14px" }}>
            <KPI 
              label={c} 
              value={oport.filter(o => o.status === c).length} 
              color={cCor[c]} 
              size="sm" 
              sub={fB(oport.filter(o => o.status === c).reduce((a, x) => a + sv(x.valor), 0))}
            />
          </Crd>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 5 }}>
          {["kanban", "lista"].map(v => (
            <Btn key={v} onClick={() => setView(v)} outline={view !== v} small>{v}</Btn>
          ))}
        </div>
        <Btn onClick={() => setForm({ cliente: "", tipo: "Saldo Parado", valor: 0, prioridade: "Alta", desc: "" })}>
          + Nova Oportunidade
        </Btn>
      </div>

      {form && (
        <Crd>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Nova Oportunidade</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
             {/* Select Dinâmico */}
             <div key="Cliente">
                <div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Cliente</div>
                <select value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} style={inSt}>
                  <option value="">Selecione...</option>
                  {listaClientes.map(c => <option key={c.id || c.conta} value={c.nome || c.cliente}>{c.nome || c.cliente}</option>)}
                  <option value="Outro (Digitar Manualmente)">Outro (Digitar Manualmente)</option>
                </select>
                {form.cliente === "Outro (Digitar Manualmente)" && (
                    <input type="text" placeholder="Digite o nome..." onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} style={{...inSt, marginTop: 5}}/>
                )}
             </div>

            <div key="Tipo"><div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Tipo</div><select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={inSt}>{["Saldo Parado","Sem Movimentacao","Rebalanceamento","Cross Sell","Reativacao","Upgrade Segmento"].map(tp => <option key={tp}>{tp}</option>)}</select></div>
            <div key="Valor"><div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Valor Potencial</div><input type="number" value={form.valor || 0} onChange={e => setForm(f => ({ ...f, valor: +e.target.value }))} style={inSt}/></div>
            <div key="Prioridade"><div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Prioridade</div><select value={form.prioridade} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value }))} style={inSt}>{["Alta","Media","Baixa"].map(p => <option key={p}>{p}</option>)}</select></div>
          </div>
          <div style={{ marginTop: 10 }}><div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Descricao</div><textarea value={form.desc || ""} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} rows={2} style={{ ...inSt, resize: "vertical" }}/></div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}><Btn onClick={criar}>Salvar</Btn><Btn onClick={() => setForm(null)} outline>Cancelar</Btn></div>
        </Crd>
      )}

      {view === "kanban" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(170px,1fr))", gap: 10, overflowX: "auto" }}>
          {cols.map(col => (
            <div key={col} style={{ background: t.lt, borderRadius: 10, padding: "10px 8px", minHeight: 200 }}>
              <div style={{ color: cCor[col], fontWeight: 700, fontSize: 12, marginBottom: 8, padding: "0 4px" }}>
                {col} <span style={{ background: t.mid, color: t.txm, borderRadius: 99, padding: "1px 6px", fontSize: 10, marginLeft: 4 }}>{oport.filter(o => o.status === col).length}</span>
              </div>
              
              {oport.filter(o => o.status === col).length === 0 && (
                  <div style={{ color: t.txd, fontSize: 11, fontStyle: "italic", textAlign: "center", marginTop: 20 }}>Vazio</div>
              )}

              {oport.filter(o => o.status === col).map(o => (
                <div key={o.id} style={{ background: t.mid, border: `1px solid ${t.brd}`, borderRadius: 8, padding: "10px", marginBottom: 8 }}>
                  <div style={{ color: t.tx, fontWeight: 600, fontSize: 12, marginBottom: 2 }}>{String(o.cliente).split(" ").slice(0, 2).join(" ")}</div>
                  <div style={{ color: t.txm, fontSize: 10, marginBottom: 4 }}>{o.tipo}</div>
                  <div style={{ color: t.gold, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{fB(o.valor)}</div>
                  <Bdg label={o.prioridade} color={t.gold} />
                  <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                    <select onChange={e => e.target.value && mover(o.id, e.target.value)} value="" style={{ background: t.lt, border: `1px solid ${t.brd}`, borderRadius: 4, color: t.txm, fontSize: 9, padding: "2px 4px", outline: "none", cursor: "pointer" }}>
                      <option value="">Mover...</option>
                      {cols.filter(c => c !== col).map(c => <option key={c} value={c}>{c}</option>)}
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
            <thead><tr style={{ borderBottom: `2px solid ${t.brd}`, background: t.lt }}>{["Cliente","Tipo","Valor","Prioridade","Status","Resp","Acoes"].map(h => <th key={h} style={{ padding: "9px 12px", color: t.txm, fontWeight: 700, textAlign: "left", fontSize: 10, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
            <tbody>
              {oport.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: 20, color: t.txd }}>Nenhuma oportunidade cadastrada.</td></tr>
              )}
              {oport.map(o => (
                <tr key={o.id} style={{ borderBottom: `1px solid ${t.brd}` }} onMouseEnter={e => e.currentTarget.style.background = t.lt} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "8px 12px", color: t.tx, fontWeight: 600 }}>{o.cliente}</td>
                  <td style={{ padding: "8px 12px", color: t.txm }}>{o.tipo}</td>
                  <td style={{ padding: "8px 12px", color: t.gold, fontWeight: 700 }}>{fB(o.valor)}</td>
                  <td style={{ padding: "8px 12px" }}><Bdg label={o.prioridade} color={t.gold}/></td>
                  <td style={{ padding: "8px 12px" }}><Bdg label={o.status} color={cCor[o.status]}/></td>
                  <td style={{ padding: "8px 12px", color: t.txm, fontSize: 11 }}>{o.resp}</td>
                  <td style={{ padding: "8px 12px", display: "flex", gap: 6 }}>
                    <select onChange={e => e.target.value && mover(o.id, e.target.value)} value="" style={{ background: t.lt, border: `1px solid ${t.brd}`, borderRadius: 4, color: t.txm, fontSize: 10, padding: "2px 6px", outline: "none", cursor: "pointer" }}>
                      <option value="">Mover...</option>
                      {cols.filter(c => c !== o.status).map(c => <option key={c} value={c}>{c}</option>)}
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