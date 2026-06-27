import { useState, useEffect } from 'react';
import { useT } from '../../theme/ThemeContext.jsx';
import { Crd } from '../../components/ui/index.js';
import { CLIENTES_DB } from '../../data/clientes.js';
import { fB } from '../../utils/formatters.js';

export function Rebalanceamento() {
  const t = useT();
  const [oportunidades, setOportunidades] = useState([]);

  useEffect(() => {
    // Simula dados de rebalanceamento
    const clientesParaRebalancear = CLIENTES_DB
      .filter(c => c.ader != null && c.ader < 0.7)
      .slice(0, 5)
      .map(c => ({
        cliente: c.nome,
        aderencia: c.ader || 0,
        desvio: ((1 - (c.ader || 0)) * 100).toFixed(1),
        recomendacao: c.ader < 0.3 ? 'Revisão completa da carteira' : 'Ajuste de alocação',
        impacto: fB(Math.random() * 50000 + 10000)
      }));
    setOportunidades(clientesParaRebalancear);
  }, []);

  return (
    <Crd>
      <div style={{ color: t.tx, fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
        ⚖️ Oportunidades de Rebalanceamento
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {oportunidades.length === 0 && (
          <div style={{ color: t.green, textAlign: 'center', padding: 20 }}>
            ✅ Nenhum cliente precisa de rebalanceamento
          </div>
        )}
        {oportunidades.map((op, index) => {
          const cor = op.aderencia < 0.3 ? t.red : t.amber;
          return (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: t.lt,
                borderRadius: 8,
                border: `1px solid ${cor}44`,
                borderLeft: `3px solid ${cor}`
              }}
            >
              <div>
                <div style={{ color: t.tx, fontWeight: 600 }}>{op.cliente}</div>
                <div style={{ color: t.txm, fontSize: 11 }}>
                  Aderência: {(op.aderencia * 100).toFixed(0)}% · Desvio: {op.desvio}%
                </div>
                <div style={{ color: cor, fontSize: 12, marginTop: 2 }}>
                  {op.recomendacao}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: t.green, fontWeight: 700, fontSize: 14 }}>
                  {op.impacto}
                </div>
                <div style={{ color: t.txd, fontSize: 10 }}>impacto estimado</div>
                <button
                  style={{
                    background: t.blue,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    padding: '4px 12px',
                    fontSize: 11,
                    cursor: 'pointer',
                    marginTop: 4
                  }}
                >
                  Ver Detalhes
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Crd>
  );
}