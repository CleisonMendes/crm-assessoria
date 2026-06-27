import { useState } from 'react';
import { useT } from '../../theme/ThemeContext.jsx';
import { Crd, Btn } from '../../components/ui/index.js';
import { generatePDF } from '../../services/pdfGenerator.js';
import { CLIENTES_DB, NET_TOT, REC_TOT } from '../../data/clientes.js';
import { fB, fB2 } from '../../utils/formatters.js';


export function RelatoriosPDF() {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [tipoRelatorio, setTipoRelatorio] = useState('resumo');

  const handleGerarPDF = async () => {
    setLoading(true);
    try {
      let dados = {};
      
      switch(tipoRelatorio) {
        case 'resumo':
          dados = {
            titulo: 'Resumo Executivo - DOM Investimentos',
            assessor: 'Leonardo Vitor',
            data: new Date().toLocaleDateString('pt-BR'),
            indicadores: {
              'NET Total': fB(NET_TOT),
              'Receita/Mês': fB2(REC_TOT),
              'Clientes Ativos': CLIENTES_DB.filter(c => c.status === 'ATIVO').length,
              'Patrimônio Médio': fB(NET_TOT / (CLIENTES_DB.length || 1))
            },
            topClientes: CLIENTES_DB
              .filter(c => c.netM1)
              .sort((a, b) => b.netM1 - a.netM1)
              .slice(0, 5)
              .map(c => ({ nome: c.nome, net: fB(c.netM1), suit: c.suit || 'N/A' }))
          };
          break;
        case 'clientes':
          dados = {
            titulo: 'Relatório de Clientes',
            data: new Date().toLocaleDateString('pt-BR'),
            clientes: CLIENTES_DB.map(c => ({ nome: c.nome, conta: c.conta, net: fB(c.netM1 || 0), status: c.status || 'ATIVO' }))
          };
          break;
        case 'captacao':
          dados = {
            titulo: 'Relatório de Captação',
            data: new Date().toLocaleDateString('pt-BR'),
            captacaoMensal: [
              { mes: 'Jan', valor: 2100000 }, { mes: 'Fev', valor: 1800000 },
              { mes: 'Mar', valor: 1100000 }, { mes: 'Abr', valor: 950000 }, { mes: 'Mai', valor: 0 }
            ]
          };
          break;
      }
      
      await generatePDF(tipoRelatorio, dados);
      alert('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao gerar PDF.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ color: t.tx, fontWeight: 700, fontSize: 16, marginBottom: 16 }}>📄 Relatórios em PDF</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {['resumo', 'clientes', 'captacao'].map((tipo) => (
          <Crd key={tipo} onClick={() => setTipoRelatorio(tipo)} style={{ cursor: 'pointer', border: tipoRelatorio === tipo ? `2px solid ${t.gold}` : '1px solid transparent' }}>
            <div style={{ fontSize: 24 }}>{tipo === 'resumo' ? '📊' : tipo === 'clientes' ? '👥' : '💰'}</div>
            <div style={{ color: t.tx, fontWeight: 700, marginTop: 8 }}>{tipo.charAt(0).toUpperCase() + tipo.slice(1)}</div>
          </Crd>
        ))}
      </div>
      <Btn onClick={handleGerarPDF} style={{ marginTop: 20, width: '100%' }} disabled={loading}>
        {loading ? 'Processando...' : 'Gerar PDF'}
      </Btn>
    </div>
  );
}