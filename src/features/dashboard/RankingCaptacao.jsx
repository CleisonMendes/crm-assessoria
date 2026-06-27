import { useState } from 'react';
import { useT } from '../../theme/ThemeContext.jsx';
import { Crd } from '../../components/ui/index.js';
import { CLIENTES_DB } from '../../data/clientes.js';
import { fB } from '../../utils/formatters.js';

export function RankingCaptacao() {
  const t = useT();
  const [periodo, setPeriodo] = useState('mes');

  // Ordena clientes por captação (simulado)
  const clientesRanking = [...CLIENTES_DB]
    .sort((a, b) => (b.captacaoMensal || 0) - (a.captacaoMensal || 0))
    .slice(0, 10)
    .map((c, index) => ({
      ...c,
      posicao: index + 1,
      captacao: c.captacaoMensal || Math.random() * 500000
    }));

  const getMedalha = (pos) => {
    if (pos === 1) return '🥇';
    if (pos === 2) return '🥈';
    if (pos === 3) return '🥉';
    return `#${pos}`;
  };

  return (
    <Crd>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ color: t.tx, fontWeight: 700, fontSize: 16 }}>
          🏆 Ranking de Captação
        </div>
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          style={{
            background: t.mid,
            color: t.tx,
            border: `1px solid ${t.brd}`,
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 12
          }}
        >
          <option value="mes">Este Mês</option>
          <option value="trimestre">Último Trimestre</option>
          <option value="ano">Ano</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {clientesRanking.map((c) => (
          <div
            key={c.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 12px',
              background: c.posicao <= 3 ? `${t.gold}15` : t.lt,
              borderRadius: 6,
              border: c.posicao <= 3 ? `1px solid ${t.gold}44` : `1px solid ${t.brd}`
            }}
          >
            <div style={{ 
              width: 30, 
              textAlign: 'center',
              color: c.posicao <= 3 ? t.gold : t.txm,
              fontWeight: c.posicao <= 3 ? 700 : 400,
              fontSize: c.posicao <= 3 ? 18 : 14
            }}>
              {getMedalha(c.posicao)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: t.tx, fontWeight: 600, fontSize: 14 }}>{c.nome}</div>
              <div style={{ color: t.txm, fontSize: 11 }}>{c.suit || 'Perfil não definido'}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: t.green, fontWeight: 700, fontSize: 15 }}>
                +{fB(c.captacao)}
              </div>
              <div style={{ color: t.txd, fontSize: 10 }}>captado</div>
            </div>
          </div>
        ))}
        {clientesRanking.length === 0 && (
          <div style={{ color: t.txd, textAlign: 'center', padding: 20 }}>
            Nenhum dado de captação disponível
          </div>
        )}
      </div>
    </Crd>
  );
}