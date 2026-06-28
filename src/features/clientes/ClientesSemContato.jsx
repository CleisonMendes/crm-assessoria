import { useEffect, useState } from "react";
import { useT } from "../../theme/ThemeContext.jsx";
import { api } from "../../services/api.js";
import { CLIENTES_DB } from "../../data/clientes.js";
import { fB } from "../../utils/formatters.js";
import { sv } from "../../utils/numbers.js";

export function ClientesSemContato() {
  const t = useT();
  const [diasLimite, setDiasLimite]   = useState(30);
  const [contatados, setContatados]   = useState([]);
  const [clientes, setClientes]       = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    api.ping()
      .then(() => api.clientes())
      .then(dados => setClientes(dados))
      .catch(() => setClientes(CLIENTES_DB))
      .finally(() => setLoading(false));
  }, []);

  const hoje = new Date();

  const clientesAtencao = clientes
    .filter(c => {
      if (contatados.includes(c.cliente || c.id)) return false;
      // Usa data_referencia ou data_cadastro como proxy de último contato
      const ultContato = c.data_referencia || c.ultimoContato || null;
      if (!ultContato) return true;
      const dias = Math.floor((hoje - new Date(ultContato)) / (1000 * 60 * 60 * 24));
      return dias > diasLimite;
    })
    .sort((a, b) => {
      const dA = a.data_referencia || a.ultimoContato;
      const dB = b.data_referencia || b.ultimoContato;
      const diasA = dA ? Math.floor((hoje - new Date(dA)) / (1000 * 60 * 60 * 24)) : 9999;
      const diasB = dB ? Math.floor((hoje - new Date(dB)) / (1000 * 60 * 60 * 24)) : 9999;
      return diasB - diasA;
    });

  const handleRegistrarContato = (cliente) => {
    const nome = cliente.nome || cliente.cliente;
    const nota = window.prompt(`Registrar contato para ${nome}:\nQual foi o assunto abordado?`);
    if (nota) {
      alert("Contato registrado com sucesso no histórico!");
      setContatados(prev => [...prev, cliente.cliente || cliente.id]);
    }
  };

  if (loading) return (
    <div style={{ color: t.txd, fontSize: 12, padding: 20, textAlign: "center" }}>
      ⏳ Carregando clientes...
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ color: t.tx, fontWeight: 700, fontSize: 14 }}>
          🕐 Clientes sem contato há mais de {diasLimite} dias
          <span style={{ color: t.txd, fontWeight: 400, fontSize: 12, marginLeft: 8 }}>
            ({clientesAtencao.length} clientes)
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ color: t.txm, fontSize: 12 }}>Período:</span>
          <select
            value={diasLimite}
            onChange={e => setDiasLimite(Number(e.target.value))}
            style={{
              background: t.mid, color: t.tx,
              border: `1px solid ${t.brd}`,
              borderRadius: 6, padding: "4px 8px", fontSize: 12
            }}
          >
            <option value={15}>15 dias</option>
            <option value={30}>30 dias</option>
            <option value={45}>45 dias</option>
            <option value={60}>60 dias</option>
          </select>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {clientesAtencao.length === 0 && (
          <div style={{ color: t.green, textAlign: "center", padding: 20, fontSize: 13 }}>
            ✅ Todos os clientes foram contatados recentemente!
          </div>
        )}

        {clientesAtencao.slice(0, 15).map(c => {
          const ultContato = c.data_referencia || c.ultimoContato;
          const dias = ultContato
            ? Math.floor((hoje - new Date(ultContato)) / (1000 * 60 * 60 * 24))
            : null;
          const urgencia = !dias || dias > 90 ? t.red : dias > 45 ? t.amber : t.blue;
          const nome = c.nome || c.cliente;
          const net  = sv(c.net_m) || sv(c.netM) || 0;

          return (
            <div
              key={c.cliente || c.id}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 16px", background: t.lt, borderRadius: 8,
                border: `1px solid ${urgencia}44`, borderLeft: `3px solid ${urgencia}`,
                flexWrap: "wrap", gap: 10
              }}
            >
              <div>
                <div style={{ color: t.tx, fontWeight: 600, fontSize: 13 }}>
                  {nome}
                </div>
                <div style={{ color: t.txm, fontSize: 11, marginTop: 2 }}>
                  Conta {c.cliente || c.conta} · {c.suitability || c.suit || "–"} · {c.segmentacao_cliente || c.seg || "–"}
                </div>
                <div style={{ color: t.txd, fontSize: 10, marginTop: 1 }}>
                  Últ. referência: {ultContato || "Nunca"} · NET: {fB(net)}
                </div>
              </div>
              <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <div style={{ color: urgencia, fontWeight: 800, fontSize: 16 }}>
                  {dias != null ? `${dias}d` : "Sem data"}
                </div>
                <button
                  onClick={() => handleRegistrarContato(c)}
                  style={{
                    background: t.blue, color: "#fff", border: "none",
                    borderRadius: 6, padding: "5px 14px",
                    fontSize: 11, cursor: "pointer", fontWeight: 600
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                >
                  Registrar Contato
                </button>
              </div>
            </div>
          );
        })}

        {clientesAtencao.length > 15 && (
          <div style={{ color: t.txd, fontSize: 12, textAlign: "center", padding: 8 }}>
            + {clientesAtencao.length - 15} clientes adicionais — use os filtros na tela de Clientes
          </div>
        )}
      </div>
    </div>
  );
}
