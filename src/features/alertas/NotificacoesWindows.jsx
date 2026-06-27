import { useState, useEffect } from 'react';
import { useT } from '../../theme/ThemeContext.jsx';
import { Crd } from '../../components/ui/index.js';
import { windowsNotification } from '../../services/notifications.js';

export function NotificacoesWindows() {
  const t = useT();
  const [notificacoes, setNotificacoes] = useState([]);
  const [config, setConfig] = useState({
    ativo: true,
    som: true,
    duracao: 5
  });

  useEffect(() => {
    // Simula recebimento de notificações
    const interval = setInterval(() => {
      const nova = gerarNotificacao();
      if (nova && config.ativo) {
        setNotificacoes(prev => [nova, ...prev].slice(0, 20));
        // Dispara notificação do Windows (simulada)
        windowsNotification.show({
          title: nova.titulo,
          body: nova.mensagem,
          icon: nova.icone
        });
      }
    }, 30000); // a cada 30 segundos

    return () => clearInterval(interval);
  }, [config.ativo]);

  const gerarNotificacao = () => {
    const tipos = [
      { titulo: '💰 Movimentação Relevante', mensagem: 'Cliente João Silva depositou R$ 50.000', icone: '💰' },
      { titulo: '📈 Oportunidade de Rebalanceamento', mensagem: 'Carteira de Maria Santos precisa de ajuste', icone: '📈' },
      { titulo: '🕐 Cliente sem contato', mensagem: 'Pedro Oliveira há 45 dias sem contato', icone: '🕐' },
      { titulo: '🎯 Meta do Mês', mensagem: 'Você atingiu 75% da meta de captação', icone: '🎯' },
      { titulo: '📅 Reunião Agendada', mensagem: 'Reunião com Ana Costa em 2 horas', icone: '📅' },
    ];
    return Math.random() > 0.7 ? tipos[Math.floor(Math.random() * tipos.length)] : null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Configurações */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: t.tx }}>
          <input
            type="checkbox"
            checked={config.ativo}
            onChange={(e) => setConfig({ ...config, ativo: e.target.checked })}
          />
          Notificações Ativas
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: t.tx }}>
          <input
            type="checkbox"
            checked={config.som}
            onChange={(e) => setConfig({ ...config, som: e.target.checked })}
          />
          Som
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: t.tx }}>
          <span>Duração:</span>
          <select
            value={config.duracao}
            onChange={(e) => setConfig({ ...config, duracao: Number(e.target.value) })}
            style={{
              background: t.mid,
              color: t.tx,
              border: `1px solid ${t.brd}`,
              borderRadius: 4,
              padding: '4px 8px'
            }}
          >
            <option value={3}>3 seg</option>
            <option value={5}>5 seg</option>
            <option value={10}>10 seg</option>
          </select>
        </div>
        <button
          style={{
            background: t.red,
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '6px 14px',
            cursor: 'pointer'
          }}
          onClick={() => {
            if (window.confirm('Limpar todas as notificações?')) {
              setNotificacoes([]);
            }
          }}
        >
          🗑️ Limpar
        </button>
      </div>

      {/* Lista de notificações */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {notificacoes.length === 0 && (
          <div style={{ color: t.txd, textAlign: 'center', padding: 30 }}>
            Nenhuma notificação no momento
          </div>
        )}
        {notificacoes.map((n, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              background: t.lt,
              borderRadius: 8,
              border: `1px solid ${t.brd}`,
              animation: 'slideIn 0.3s ease'
            }}
          >
            <div style={{ fontSize: 24 }}>{n.icone}</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: t.tx, fontWeight: 600 }}>{n.titulo}</div>
              <div style={{ color: t.txm, fontSize: 13 }}>{n.mensagem}</div>
            </div>
            <div style={{ color: t.txd, fontSize: 11 }}>
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      {/* Estilo para animação */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(-20px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}