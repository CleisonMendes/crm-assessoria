import { useT } from '../../theme/ThemeContext.jsx';
import { Crd, ProgressBar } from '../../components/ui/index.js';
import { fB } from '../../utils/formatters.js';
import { PLANO } from '../../data/plano.js';

// Agora ele recebe os dados diretamente do Dashboard Principal
export function PatrimonioAssessor({ netTotal = 0, clientesAtivos = 0, captacaoMes = 0 }) {
  const t = useT();

  // Recebe exatamente o que está no plano.js (agora vai respeitar o zero!)
  const meta = PLANO.netMeta;
  
  // Proteção matemática: só calcula a porcentagem se a meta for maior que zero
  const pctMeta = meta > 0 ? Math.min((captacaoMes / meta) * 100, 100).toFixed(1) : "0.0";

  // Calcula a evolução baseada na captação do mês vs Patrimônio Total
  const evolucaoPct = netTotal > 0 ? (captacaoMes / (netTotal - captacaoMes)) * 100 : 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
      
      {/* ── CARD 1: PATRIMÔNIO TOTAL ── */}
      <Crd>
        <div style={{ color: t.txm, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
          Patrimônio Total
        </div>
        <div style={{ color: t.gold, fontSize: 24, fontWeight: 800, marginTop: 4 }}>
          {fB(netTotal)}
        </div>
        <div style={{ color: t.txd, fontSize: 12, marginTop: 2 }}>
          {clientesAtivos} clientes ativos · B3 custódia
        </div>
      </Crd>

      {/* ── CARD 2: EVOLUÇÃO 30D ── */}
      <Crd>
        <div style={{ color: t.txm, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
          Evolução (30d)
        </div>
        <div style={{ color: evolucaoPct >= 0 ? t.green : t.red, fontSize: 20, fontWeight: 700 }}>
          {evolucaoPct >= 0 ? '+' : ''}{evolucaoPct.toFixed(2)}%
        </div>
        <div style={{ color: t.txd, fontSize: 12 }}>
          {fB(captacaoMes)}
        </div>
      </Crd>

      {/* ── CARD 3: META DO MÊS ── */}
      <Crd>
        <div style={{ color: t.txm, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
          Meta do Mês
        </div>
        <div style={{ color: t.blue, fontSize: 20, fontWeight: 700 }}>
          {fB(meta)}
        </div>
        <div style={{ marginTop: 6 }}>
          <ProgressBar 
            value={captacaoMes} 
            max={meta || 1} // O "|| 1" aqui é só para a barra gráfica não quebrar visualmente
            h={6} 
          />
        </div>
        <div style={{ color: t.txd, fontSize: 11, marginTop: 3 }}>
          {pctMeta}% da meta
        </div>
      </Crd>

    </div>
  );
}