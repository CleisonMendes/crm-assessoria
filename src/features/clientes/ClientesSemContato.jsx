import { useState } from 'react';
import { useT } from '../../theme/ThemeContext.jsx';
import { CLIENTES_DB } from '../../data/clientes.js';
import { fDT } from '../../utils/formatters.js';

export function ClientesSemContato() {
  const t = useT();
  const [diasLimite, setDiasLimite] = useState(30);
  const [contatados, setContatados] = useState([]); // Guarda quem já foi contatado hoje
  
  const hoje = new Date();
  const clientesAtencao = CLIENTES_DB.filter(c => {
    // Esconde se já clicamos em registrar hoje
    if (contatados.includes(c.id)) return false; 
    
    if (!c.ultimoContato) return true;
    const dias = Math.floor((hoje - new Date(c.ultimoContato)) / (1000 * 60 * 60 * 24));
    return dias > diasLimite;
  }).sort((a, b) => {
    const diasA = Math.floor((hoje - new Date(a.ultimoContato || hoje)) / (1000 * 60 * 60 * 24));
    const diasB = Math.floor((hoje - new Date(b.ultimoContato || hoje)) / (1000 * 60 * 60 * 24));
    return diasB - diasA;
  });

  const handleRegistrarContato = (cliente) => {
    const nota = window.prompt(`Registrar contato para ${cliente.nome}:\nQual foi o assunto abordado?`);
    if (nota) {
      alert("Contato registrado com sucesso no histórico!");
      setContatados([...contatados, cliente.id]); // Remove da lista visualmente
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ color: t.tx, fontWeight: 700, fontSize: 16 }}>
          🕐 Clientes sem contato há mais de {diasLimite} dias
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: t.txm, fontSize: 12 }}>Período:</span>
          <select 
            value={diasLimite}
            onChange={(e) => setDiasLimite(Number(e.target.value))}
            style={{
              background: t.mid, color: t.tx, border: `1px solid ${t.brd}`,
              borderRadius: 6, padding: '4px 8px', fontSize: 12
            }}
          >
            <option value={15}>15 dias</option>
            <option value={30}>30 dias</option>
            <option value={45}>45 dias</option>
            <option value={60}>60 dias</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {clientesAtencao.length === 0 && (
          <div style={{ color: t.green, textAlign: 'center', padding: 20 }}>
            ✅ Todos os clientes foram contatados recentemente!
          </div>
        )}
        {clientesAtencao.slice(0, 10).map(c => {
          const dias = Math.floor((hoje - new Date(c.ultimoContato || hoje)) / (1000 * 60 * 60 * 24));
          const urgencia = dias > 90 ? t.red : dias > 45 ? t.amber : t.blue;
          return (
            <div
              key={c.id}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', background: t.lt, borderRadius: 8,
                border: `1px solid ${urgencia}44`, borderLeft: `3px solid ${urgencia}`
              }}
            >
              <div>
                <div style={{ color: t.tx, fontWeight: 600 }}>{c.nome}</div>
                <div style={{ color: t.txm, fontSize: 11 }}>
                  Último contato: {c.ultimoContato ? fDT(c.ultimoContato) : 'Nunca'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: urgencia, fontWeight: 700, fontSize: 14 }}>
                  {dias} dias
                </div>
                <button
                  onClick={() => handleRegistrarContato(c)}
                  style={{
                    background: t.blue, color: '#fff', border: 'none', borderRadius: 4,
                    padding: '4px 12px', fontSize: 11, cursor: 'pointer', marginTop: 4
                  }}
                >
                  Registrar Contato
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}