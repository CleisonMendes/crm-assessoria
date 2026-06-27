import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable"; // Importação direta da função

export const generatePDF = async (tipo, dados) => {
  const doc = new jsPDF();
  
  // Cabeçalho
  doc.setFontSize(18);
  doc.setTextColor(212, 175, 55);
  doc.text('DOM Investimentos', 14, 22);
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Assessor: ${dados.assessor || 'Leonardo Vitor'}`, 14, 32);
  doc.text(`Data: ${dados.data}`, 14, 39);
  
  doc.setDrawColor(212, 175, 55);
  doc.line(14, 45, 196, 45);
  
  doc.setFontSize(16);
  doc.setTextColor(50);
  doc.text(dados.titulo, 14, 55);

  // APLICAÇÃO MANUAL DO PLUGIN
  // Em vez de doc.autoTable, usamos a função importada passando o doc
  const aplicarTabela = (config) => {
    autoTable(doc, config);
  };

  switch(tipo) {
    case 'resumo':
      let y = 65;
      if (dados.indicadores) {
        Object.entries(dados.indicadores).forEach(([key, value]) => {
          doc.setFontSize(11);
          doc.text(key, 14, y);
          doc.text(String(value), 120, y);
          y += 8;
        });
      }
      if (dados.topClientes) {
        aplicarTabela({
          startY: y + 10,
          head: [['Cliente', 'NET', 'Suit']],
          body: dados.topClientes.map(c => [c.nome, c.net, c.suit]),
          theme: 'striped',
          headStyles: { fillColor: [212, 175, 55] }
        });
      }
      break;

    case 'clientes':
      aplicarTabela({
        startY: 65,
        head: [['Cliente', 'Conta', 'NET', 'Status']],
        body: dados.clientes.map(c => [c.nome, c.conta, c.net, c.status]),
        theme: 'striped'
      });
      break;

    case 'captacao':
      aplicarTabela({
        startY: 65,
        head: [['Mês', 'Captação (R$)']],
        body: dados.captacaoMensal.map(m => [m.mes, m.valor.toLocaleString('pt-BR')]),
        theme: 'striped'
      });
      break;
  }

  doc.save(`${tipo}_relatorio.pdf`);
};