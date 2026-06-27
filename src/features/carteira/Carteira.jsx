import { useState, useEffect } from "react";
import { api } from "../../services/api.js";
import { sv } from "../../utils/numbers.js";
import { Crd, KPI, Btn, ProgressBar, Bdg } from "../../components/ui/index.js";
import { Donut } from "../../components/charts/index.js";
import { useT } from "../../theme/ThemeContext.jsx";
import { fB, fB2, fP } from "../../utils/formatters.js";

export function Carteira() {
  const t = useT();
  const [filtro, setFiltro] = useState("Todos");
  
  // Estados da API
  const [dadosDash, setDadosDash] = useState(null);
  const [clientesDb, setClientesDb] = useState([]);
  const [diversificacao, setDiversificacao] = useState([]);
  const [loading, setLoading] = useState(true);

  // Busca dados consolidados do SQLite ao abrir a tela
  useEffect(() => {
    Promise.all([
      api.dashboard().catch(() => null),
      api.clientes().catch(() => []),
      fetch("http://localhost:3001/api/diversificacao/consolidado")
        .then(res => res.json())
        .catch(() => [])
    ])
      .then(([dashRes, cliRes, divRes]) => {
        setDadosDash(dashRes || { net_total: 0, receita: 0, captacao: 0, resgate: 0 });
        setClientesDb(cliRes || []);
        setDiversificacao(divRes || []);
      })
      .catch(err => console.error("Erro ao carregar carteira:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ padding: 40, color: t.gold, textAlign: 'center', fontWeight: 700 }}>⏳ Sincronizando Carteira com o SQLite...</div>;
  }

  // ── MÉTRICAS MACRO ──
  const d = dadosDash || {};
  const net = d.net_total || 0;
  const capLiquida = (d.captacao || 0) - (Math.abs(d.resgate || 0));

  // ── CONSOLIDAÇÃO DINÂMICA DE ALOCAÇÃO ──
  // Soma os campos de alocação de todos os clientes importados
  let aloc = { rf: 0, rv: 0, fundos: 0, fi: 0, prev: 0, fin: 0, out: 0 };
  clientesDb.forEach(c => {
    aloc.rf += sv(c.aloc_renda_fixa || c.renda_fixa);
    aloc.rv += sv(c.aloc_renda_variavel || c.renda_var);
    aloc.fundos += sv(c.aloc_fundos || c.fundos);
    aloc.fi += sv(c.aloc_fi || c.fundos_imob);
    aloc.prev += sv(c.aloc_previdencia || c.previdencia);
    aloc.fin += sv(c.aloc_financeiro || c.d0);
    aloc.out += sv(c.aloc_outros || c.outros);
  });

  const totalAloc = aloc.rf + aloc.rv + aloc.fundos + aloc.fi + aloc.prev + aloc.fin + aloc.out;

  // Monta as fatias apenas se houver saldo na classe
  const classesGlobal = [
    { l: "Renda Fixa", valor: aloc.rf, cor: t.blue },
    { l: "Renda Variável", valor: aloc.rv, cor: t.gold },
    { l: "Fundos de Invest.", valor: aloc.fundos, cor: t.purple || "#8b5cf6" },
    { l: "FIIs", valor: aloc.fi, cor: "#06b6d4" },
    { l: "Previdência", valor: aloc.prev, cor: t.green },
    { l: "Financeiro", valor: aloc.fin, cor: t.amber },
    { l: "Outros", valor: aloc.out, cor: t.txm },
  ]
    .filter(c => c.valor > 0)
    .map(c => ({ ...c, pct: totalAloc > 0 ? c.valor / totalAloc : 0 }))
    .sort((a, b) => b.valor - a.valor);

  // ── FILTROS DE ADERÊNCIA ──
  const comAder = clientesDb.filter(c => c.ader != null);
  const enquad = comAder.filter(c => sv(c.ader) >= 0.7).length;
  
  const listaAderencia = comAder.filter(c => 
    filtro === "Todos" || 
    (filtro === "Critico" && sv(c.ader) < 0.3) || 
    (filtro === "Atencao" && sv(c.ader) >= 0.3 && sv(c.ader) < 0.7) || 
    (filtro === "OK" && sv(c.ader) >= 0.7)
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      
      {/* ── KPIs GERAIS MACRO ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
        <Crd style={{ padding: "12px 14px" }}><KPI label="NET Total" value={fB(net)} size="sm" /></Crd>
        <Crd style={{ padding: "12px 14px" }}><KPI label="Cap. Líquida" value={fB(capLiquida)} color={capLiquida >= 0 ? t.green : t.red} size="sm" /></Crd>
        <Crd style={{ padding: "12px 14px" }}><KPI label="Captação Bruta" value={fB(d.captacao || 0)} color={t.green} size="sm" /></Crd>
        <Crd style={{ padding: "12px 14px" }}><KPI label="Resgates" value={fB(d.resgate || 0)} color={t.red} size="sm" /></Crd>
        <Crd style={{ padding: "12px 14px" }}><KPI label="Receita / Mês" value={fB2(d.receita || 0)} color={t.gold} size="sm" /></Crd>
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
        
        {/* ── GRÁFICO DE ALOCAÇÃO DINÂMICO ── */}
        <Crd style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 13 }}>Alocação Global de Ativos</div>
          {totalAloc > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginTop: 10 }}>
              <Donut slices={classesGlobal} size={170} thick={26} label={fB(totalAloc)} sub="Mapeado" />
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                {classesGlobal.map(c => (
                  <div key={c.l} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.cor, flexShrink: 0 }} />
                    <span style={{ color: t.txm, fontSize: 11, flex: 1 }}>{c.l}</span>
                    <span style={{ color: t.tx, fontWeight: 700, fontSize: 11 }}>{(c.pct * 100).toFixed(1)}%</span>
                    <span style={{ color: t.txd, fontSize: 10 }}>{fB(c.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: t.txd, fontSize: 12, textAlign: "center", marginTop: 40 }}>
              Sem dados de alocação. Importe a planilha completa no Positivador.
            </div>
          )}
        </Crd>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* ── RANKING DE DIVERSIFICAÇÃO CONSOLIDADA ── */}
          <Crd style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ color: t.tx, fontWeight: 700, fontSize: 13 }}>Top Produtos Consolidados</div>
              <Bdg label={`${diversificacao.length} produtos`} />
            </div>
            
            <div style={{ overflowX: "auto", maxHeight: 200, overflowY: "auto" }}>
              {diversificacao.length === 0 ? (
                <div style={{ color: t.txd, fontSize: 12, textAlign: "center", padding: 20 }}>
                  Nenhum produto mapeado. Importe os dados de Diversificação.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${t.brd}`, color: t.txm }}>
                      <th style={{ padding: 6, textAlign: "left" }}>Produto</th>
                      <th style={{ padding: 6, textAlign: "left" }}>Sub-produto</th>
                      <th style={{ padding: 6, textAlign: "center" }}>Clientes</th>
                      <th style={{ padding: 6, textAlign: "right" }}>NET Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diversificacao.slice(0, 10).map((d, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${t.brd}44` }}>
                        <td style={{ padding: "6px", color: t.tx, fontWeight: 600 }}>{d.produto}</td>
                        <td style={{ padding: "6px", color: t.txm }}>{d.sub_produto || "—"}</td>
                        <td style={{ padding: "6px", color: t.tx, textAlign: "center" }}>{d.clientes}</td>
                        <td style={{ padding: "6px", color: t.green, fontWeight: 700, textAlign: "right" }}>{fB(d.net_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Crd>

          {/* ── LISTA DE ADERÊNCIA ── */}
          <Crd style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ color: t.tx, fontWeight: 700, fontSize: 13 }}>Aderência por Cliente</div>
                <div style={{ fontSize: 10, color: t.txd }}>
                  <span style={{ color: t.green, fontWeight: 600 }}>{enquad} OK</span> / <span style={{ color: t.red, fontWeight: 600 }}>{comAder.length - enquad} GAP</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                {["Todos", "Critico", "Atencao", "OK"].map(f => (
                  <Btn key={f} onClick={() => setFiltro(f)} outline={filtro !== f} small>{f}</Btn>
                ))}
              </div>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 180, overflowY: "auto" }}>
              {listaAderencia.length === 0 ? (
                <div style={{ color: t.txd, fontSize: 12, textAlign: "center", marginTop: 20 }}>
                  Nenhum dado de aderência de carteira disponível.
                </div>
              ) : (
                listaAderencia.sort((a, b) => sv(a.ader) - sv(b.ader)).map(c => (
                  <div key={c.id || c.conta} style={{ display: "grid", gridTemplateColumns: "140px 1fr 54px 90px", alignItems: "center", gap: 8 }}>
                    <div>
                      <div style={{ color: t.tx, fontSize: 11, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {String(c.nome || c.cliente || "").split(" ").slice(0, 2).join(" ")}
                      </div>
                      <div style={{ color: t.txd, fontSize: 9 }}>#{c.conta}</div>
                    </div>
                    <ProgressBar value={sv(c.ader) * 100} max={100} color={sv(c.ader) < 0.3 ? t.red : sv(c.ader) < 0.7 ? t.amber : t.green} h={5} />
                    <span style={{ color: sv(c.ader) < 0.7 ? t.red : t.green, fontWeight: 700, fontSize: 10, textAlign: "right" }}>{fP(c.ader)}</span>
                    <span style={{ color: t.txd, fontSize: 9, textAlign: "right" }}>{fB(Math.max(sv(c.netM1 || c.net_m1), sv(c.netM || c.net_m)))}</span>
                  </div>
                ))
              )}
            </div>
          </Crd>
        </div>
      </div>
    </div>
  );
}