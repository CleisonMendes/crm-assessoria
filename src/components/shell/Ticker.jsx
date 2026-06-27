import { useEffect, useState, useRef } from "react"; // "i" minúsculo corrigido
import { useT } from "../../theme/ThemeContext.jsx";

// ── ATIVOS PARA BUSCAR ────────────────────────────────────────────────────────
const ATIVOS = [
  // Índices e Renda Variável
  { symbol: "IBOV",    label: "IBOV",     tipo: "indice" },
  { symbol: "XPBR31",  label: "XPBR31",   tipo: "acao"   },
  { symbol: "PETR4",   label: "PETR4",    tipo: "acao"   },
  { symbol: "VALE3",   label: "VALE3",    tipo: "acao"   },
  { symbol: "ITUB4",   label: "ITUB4",    tipo: "acao"   },
  // FIIs
  { symbol: "MXRF11",  label: "MXRF11",   tipo: "fii"    },
  { symbol: "HGLG11",  label: "HGLG11",   tipo: "fii"    },
  { symbol: "KNRI11",  label: "KNRI11",   tipo: "fii"    },
  // Cripto
  { symbol: "BTC-BRL", label: "Bitcoin",  tipo: "cripto" },
  { symbol: "ETH-BRL", label: "Ethereum", tipo: "cripto" },
  // Moedas
  { symbol: "USD-BRL", label: "USD/BRL",  tipo: "moeda"  },
  { symbol: "EUR-BRL", label: "EUR/BRL",  tipo: "moeda"  },
];

// Intervalo de atualização (ms)
const REFRESH_MS = 60_000;
const TOKEN = "2T61pBShbZQNJ4Pkvjo37r"; // O seu token real

// Cor por variação
function corVariacao(chg, t) {
  if (chg == null) return t.txm;
  return chg > 0 ? t.green : chg < 0 ? t.red : t.txm;
}

// Formata valor por tipo
function formatarValor(valor, tipo) {
  if (valor == null) return "–";
  if (tipo === "cripto") return `R$ ${Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (tipo === "moeda")  return `R$ ${Number(valor).toFixed(2).replace(".", ",")}`;
  if (tipo === "indice") return Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return `R$ ${Number(valor).toFixed(2).replace(".", ",")}`;
}

async function fetchBrapi() {
  try {
    // Dividimos em 3 gavetas para não dar Erro 400
    const urls = [
      `https://brapi.dev/api/quote/%5EBVSP,XPBR31,PETR4,VALE3,ITUB4,MXRF11,HGLG11,KNRI11?token=${TOKEN}`,
      `https://brapi.dev/api/v2/crypto?coin=BTC,ETH&currency=BRL&token=${TOKEN}`,
      `https://brapi.dev/api/v2/currency?currency=USD-BRL,EUR-BRL&token=${TOKEN}`
    ];

    const respostas = await Promise.all(urls.map(url => fetch(url).catch(() => null)));
    const mapa = {};

    // 1. Processar Ações, FIIs e IBOV
    if (respostas[0] && respostas[0].ok) {
      const dados = await respostas[0].json();
      if (dados.results) {
        dados.results.forEach(r => {
          let sym = r.symbol;
          if (sym === "^BVSP" || sym === "%5EBVSP") sym = "IBOV";
          mapa[sym] = { valor: r.regularMarketPrice, chg: r.regularMarketChangePercent, chgAbs: r.regularMarketChange };
        });
      }
    }

    // 2. Processar Cripto
    if (respostas[1] && respostas[1].ok) {
      const dados = await respostas[1].json();
      if (dados.coins) {
        dados.coins.forEach(r => {
          mapa[`${r.coin}-BRL`] = { valor: r.regularMarketPrice, chg: r.regularMarketChangePercent, chgAbs: null };
        });
      }
    }

    // 3. Processar Moedas
    if (respostas[2] && respostas[2].ok) {
      const dados = await respostas[2].json();
      if (dados.currency) {
        dados.currency.forEach(r => {
          mapa[`${r.fromCurrency}-${r.toCurrency}`] = { valor: r.bidPrice, chg: r.percentageChange, chgAbs: null };
        });
      }
    }

    return mapa;
  } catch {
    return {};
  }
}

export function Ticker() {
  const t = useT();
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ultimaAtt, setUltimaAtt] = useState(null);
  const trackRef = useRef(null);
  const animRef = useRef(null);
  const posRef = useRef(0);

  const carregar = async () => {
    const mapaResultados = await fetchBrapi();

    const novos = ATIVOS.map(a => {
      const r = mapaResultados[a.symbol];
      return {
        ...a,
        valor: r?.valor ?? null,
        chg: r?.chg ?? null,
        chgAbs: r?.chgAbs ?? null,
      };
    });

    setItens(novos);
    setUltimaAtt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    setLoading(false);
  };

  // Busca inicial + refresh periódico
  useEffect(() => {
    carregar();
    const timer = setInterval(carregar, REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  // Animação scroll contínuo
  useEffect(() => {
    if (!trackRef.current || itens.length === 0) return;
    cancelAnimationFrame(animRef.current);

    const speed = 0.5; // px por frame
    const track = trackRef.current;

    const animate = () => {
      posRef.current -= speed;
      const halfW = track.scrollWidth / 2;
      if (Math.abs(posRef.current) >= halfW) posRef.current = 0;
      track.style.transform = `translateX(${posRef.current}px)`;
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [itens]);

  return (
    <div style={{
      height: 36,
      background: t.mid,
      borderBottom: `1px solid ${t.brd}`,
      display: "flex",
      alignItems: "center",
      overflow: "hidden",
      position: "relative",
      userSelect: "none",
    }}>

      {/* Label fixo à esquerda */}
      <div style={{
        flexShrink: 0,
        padding: "0 12px",
        borderRight: `1px solid ${t.brd}`,
        fontSize: 10,
        fontWeight: 800,
        color: t.gold,
        letterSpacing: 1,
        textTransform: "uppercase",
        height: "100%",
        display: "flex",
        alignItems: "center",
        background: t.mid,
        zIndex: 2,
        gap: 6
      }}>
        📡 Mercado
        {ultimaAtt && (
          <span style={{ color: t.txd, fontWeight: 400, fontSize: 9 }}>{ultimaAtt}</span>
        )}
      </div>

      {/* Fade esquerda */}
      <div style={{ position: "absolute", left: 110, top: 0, bottom: 0, width: 24, background: `linear-gradient(to right, ${t.mid}, transparent)`, zIndex: 1, pointerEvents: "none" }} />

      {/* Scroll area */}
      <div style={{ flex: 1, overflow: "hidden", height: "100%" }}>
        {loading ? (
          <div style={{ color: t.txd, fontSize: 11, paddingLeft: 16, lineHeight: "36px" }}>Carregando cotações...</div>
        ) : (
          <div
            ref={trackRef}
            style={{ display: "flex", alignItems: "center", height: "100%", willChange: "transform", whiteSpace: "nowrap" }}
          >
            {/* Duplica os itens para scroll infinito */}
            {[...itens, ...itens].map((item, i) => {
              const cor = corVariacao(item.chg, t);
              const sinal = item.chg > 0 ? "▲" : item.chg < 0 ? "▼" : "–";
              return (
                <div
                  key={`${item.symbol}-${i}`}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "0 18px", height: "100%",
                    borderRight: `1px solid ${t.brd}22`,
                    cursor: "default"
                  }}
                >
                  {/* Ícone por tipo */}
                  <span style={{ fontSize: 10, opacity: 0.7 }}>
                    {item.tipo === "cripto" ? "₿" : item.tipo === "moeda" ? "💱" : item.tipo === "fii" ? "🏢" : item.tipo === "indice" ? "📊" : "📈"}
                  </span>

                  {/* Label */}
                  <span style={{ color: t.txm, fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>
                    {item.label}
                  </span>

                  {/* Valor */}
                  <span style={{ color: t.tx, fontSize: 11, fontWeight: 600 }}>
                    {formatarValor(item.valor, item.tipo)}
                  </span>

                  {/* Variação */}
                  {item.chg != null && (
                    <span style={{
                      color: cor, fontSize: 10, fontWeight: 700,
                      background: `${cor}18`,
                      borderRadius: 4, padding: "1px 5px"
                    }}>
                      {sinal} {Math.abs(item.chg).toFixed(2)}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fade direita */}
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 24, background: `linear-gradient(to left, ${t.mid}, transparent)`, zIndex: 1, pointerEvents: "none" }} />

      {/* Botão refresh manual */}
      <button
        onClick={carregar}
        title="Atualizar cotações"
        style={{
          flexShrink: 0, background: "none", border: "none",
          color: t.txd, cursor: "pointer", fontSize: 12,
          padding: "0 10px", height: "100%",
          borderLeft: `1px solid ${t.brd}`,
          transition: "color .15s"
        }}
        onMouseEnter={e => e.currentTarget.style.color = t.gold}
        onMouseLeave={e => e.currentTarget.style.color = t.txd}
      >
        ↻
      </button>
    </div>
  );
}