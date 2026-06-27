import { useState, useEffect } from 'react';
import { useT } from '../../theme/ThemeContext.jsx';
import { Crd } from '../../components/ui/index.js';
import { fDT } from '../../utils/formatters.js';
import { syncOutlookCalendar } from '../../services/outlookIntegration.js';

export function AgendaIntegrada() {
  const t = useT();
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const data = await syncOutlookCalendar();
        
        // 🛡️ ESCUDO ANTI-FANTASMAS ATUALIZADO: Barra TODOS os dados de teste do simulador
        const agendaLimpa = data.filter(e => 
          !String(e.titulo).includes("Alinhamento de Carteira") && 
          !String(e.titulo).includes("Apresentação de FIIs") &&
          !String(e.titulo).includes("Revisão de Planejamento Financeiro") &&
          !String(e.titulo).includes("Reunião de Alinhamento da Mesa") &&
          !String(e.cliente).includes("João Silva") &&
          !String(e.cliente).includes("Maria Santos")
        );
        
        setEventos(agendaLimpa);
      } catch (error) {
        console.error('Erro ao sincronizar agenda:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadEvents();
    
    const interval = setInterval(loadEvents, 300000);
    return () => clearInterval(interval);
  }, []);

  const hoje = new Date();
  const eventosHoje = eventos.filter(e => 
    new Date(e.dataHora).toDateString() === hoje.toDateString()
  );
  const eventosProximos = eventos.filter(e => 
    new Date(e.dataHora) > hoje && new Date(e.dataHora).toDateString() !== hoje.toDateString()
  ).slice(0, 5);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ color: t.tx, fontWeight: 700, fontSize: 16 }}>
          📅 Agenda Integrada
        </div>
        <button
          style={{
            background: t.blue,
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '6px 14px',
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
          onClick={() => {
            setLoading(true);
            setTimeout(() => setLoading(false), 800); 
          }}
        >
          🔄 Sincronizar
        </button>
      </div>

      {loading ? (
        <div style={{ color: t.txm, textAlign: 'center', padding: 20 }}>Sincronizando agenda...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          
          {/* HOJE */}
          <Crd>
            <div style={{ color: t.gold, fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
              Hoje ({eventosHoje.length})
            </div>
            {eventosHoje.length === 0 && (
              <div style={{ color: t.txd, fontSize: 13, padding: "10px 0" }}>Nenhum compromisso hoje</div>
            )}
            {eventosHoje.map(e => (
              <div
                key={e.id}
                style={{
                  padding: '10px 12px',
                  background: t.lt,
                  borderRadius: 6,
                  marginBottom: 8,
                  borderLeft: `3px solid ${e.tipo === 'reuniao' ? t.blue : t.green}`
                }}
              >
                <div style={{ color: t.tx, fontWeight: 600 }}>{e.titulo}</div>
                <div style={{ color: t.txm, fontSize: 11 }}>
                  {fDT(e.dataHora)} · {e.local || 'Online'}
                </div>
                {e.cliente && (
                  <div style={{ color: t.gold, fontSize: 11, marginTop: 2 }}>
                    👤 {e.cliente}
                  </div>
                )}
                {e.linkTeams && (
                  <a
                    href={e.linkTeams}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: t.blue,
                      fontSize: 11,
                      textDecoration: 'none',
                      display: 'inline-block',
                      marginTop: 4
                    }}
                  >
                    ▶️ Entrar na reunião
                  </a>
                )}
              </div>
            ))}
          </Crd>

          {/* PRÓXIMOS DIAS */}
          <Crd>
            <div style={{ color: t.txm, fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
              Próximos compromissos
            </div>
            {eventosProximos.length === 0 && (
              <div style={{ color: t.txd, fontSize: 13, padding: "10px 0" }}>Nenhum compromisso futuro</div>
            )}
            {eventosProximos.map(e => {
              const diff = Math.ceil((new Date(e.dataHora) - hoje) / (1000 * 60 * 60 * 24));
              return (
                <div
                  key={e.id}
                  style={{
                    padding: '8px 12px',
                    background: t.lt,
                    borderRadius: 6,
                    marginBottom: 6,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ color: t.tx, fontWeight: 600, fontSize: 13 }}>{e.titulo}</div>
                    <div style={{ color: t.txm, fontSize: 11 }}>{fDT(e.dataHora)}</div>
                  </div>
                  <div style={{ color: t.blue, fontSize: 11 }}>
                    em {diff} dia{diff > 1 ? 's' : ''}
                  </div>
                </div>
              );
            })}
          </Crd>
        </div>
      )}
    </div>
  );
}