import { useState, useEffect } from 'react';
import './CotacoesBar.css';

const CotacoesBar = () => {
  const [cotacoes, setCotacoes] = useState([]);
  const [atualizacao, setAtualizacao] = useState('');
  const [erro, setErro] = useState(false);

  const buscarCotacoes = async () => {
    try {
      const token = "2T61pBShbZQNJ4Pkvjo37r";
      
      // 1. As 3 chamadas separadas para não dar Erro 400!
      const urls = [
        `https://brapi.dev/api/quote/%5EBVSP,PETR4,VALE3,ITUB4,HGLG11,KNRI11?token=${token}`, // Apenas Ações e FIIs
        `https://brapi.dev/api/v2/crypto?coin=BTC&currency=BRL&token=${token}`,               // Apenas Cripto
        `https://brapi.dev/api/v2/currency?currency=USD-BRL,EUR-BRL&token=${token}`           // Apenas Moedas
      ];

      // Dispara as 3 buscas ao mesmo tempo
      const respostas = await Promise.all(
        urls.map(url => fetch(url).catch(() => null))
      );
      
      const mapeados = [];

      // 2. Processando as Ações (Primeira URL)
      if (respostas[0] && respostas[0].ok) {
        const dadosAcoes = await respostas[0].json();
        if (dadosAcoes.results) {
          dadosAcoes.results.forEach(stock => {
            let nome = stock.symbol;
            if (nome === "^BVSP" || nome === "%5EBVSP") nome = "IBOV";
            mapeados.push({ ticker: nome, preco: stock.regularMarketPrice, variacao: stock.regularMarketChangePercent });
          });
        }
      }

      // 3. Processando Cripto (Segunda URL)
      if (respostas[1] && respostas[1].ok) {
        const dadosCripto = await respostas[1].json();
        if (dadosCripto.coins) {
          dadosCripto.coins.forEach(coin => {
            mapeados.push({ ticker: "BITCOIN", preco: coin.regularMarketPrice, variacao: coin.regularMarketChangePercent });
          });
        }
      }

      // 4. Processando Moedas (Terceira URL)
      if (respostas[2] && respostas[2].ok) {
        const dadosMoedas = await respostas[2].json();
        if (dadosMoedas.currency) {
          dadosMoedas.currency.forEach(moeda => {
            let nome = moeda.fromCurrency === "USD" ? "DÓLAR" : "EURO";
            mapeados.push({ ticker: nome, preco: moeda.bidPrice, variacao: moeda.percentageChange });
          });
        }
      }

      // Se todas as 3 falharem, força o erro
      if (mapeados.length === 0) throw new Error("Todas as requisições falharam.");

      // Coloca o IBOVESPA sempre em primeiro na fita
      const ibovIndex = mapeados.findIndex(m => m.ticker === "IBOV");
      if (ibovIndex > 0) {
        const ibovItem = mapeados.splice(ibovIndex, 1)[0];
        mapeados.unshift(ibovItem);
      }

      setCotacoes(mapeados);
      setAtualizacao(new Date().toLocaleTimeString());
      setErro(false); // SUCESSO! Tira o Modo Offline
      
    } catch (err) {
      console.error('⚠️ ERRO GERAL:', err.message);
      setErro(true);
      setAtualizacao(new Date().toLocaleTimeString());
      
      setCotacoes([
        { ticker: "IBOV", preco: 128540.00, variacao: 0.45 },
        { ticker: "PETR4", preco: 38.40, variacao: -1.2 },
        { ticker: "DÓLAR", preco: 5.20, variacao: -0.15 },
        { ticker: "VALE3", preco: 61.20, variacao: 0.8 },
        { ticker: "BITCOIN", preco: 345000.00, variacao: 2.1 }
      ]);
    }
  };

  useEffect(() => {
    buscarCotacoes();
    const intervalo = setInterval(buscarCotacoes, 60000);
    return () => clearInterval(intervalo);
  }, []);

  const tickerItems = [...cotacoes, ...cotacoes];

  return (
    <div className="cotacoes-wrapper">
      <div className="cotacoes-header">
        <span className="label">
          📊 MERCADO AO VIVO {erro && <span style={{color: '#ff4757', marginLeft: 8}}>(Modo Offline)</span>}
        </span>
        <span className="atualizacao">Atualizado: {atualizacao}</span>
      </div>
      
      <div className="cotacoes-scroll">
        {cotacoes.length === 0 && !erro ? (
            <span style={{ color: "#aaa", fontSize: 12 }}>A carregar mercado...</span>
        ) : (
            <div className="cotacoes-track">
              {tickerItems.map((item, index) => (
                <div key={index} className="cotacao-item">
                    <span className="ticker">{item.ticker}</span>
                    <span className="preco">
                      {item.preco ? item.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '--'}
                    </span>
                    <span
                      className={`variacao ${
                          item.variacao !== null && item.variacao !== undefined 
                          ? (item.variacao >= 0 ? 'positivo' : 'negativo') 
                          : ''
                      }`}
                    >
                      {item.variacao !== null && item.variacao !== undefined
                          ? `${item.variacao > 0 ? '+' : ''}${item.variacao.toFixed(2)}%`
                          : '--'}
                    </span>
                </div>
              ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default CotacoesBar;