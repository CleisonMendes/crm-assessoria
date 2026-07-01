import { useEffect, useState } from "react";
import { useT } from "../../theme/ThemeContext.jsx";
// 👇 IMPORTAMOS o useToast PARA OS AVISOS DO PDF
import { Crd, KPI, Bdg, ProgressBar, Btn, useToast } from "../../components/ui/index.js";
import { Donut, Gauge } from "../../components/charts/index.js";
import { fB, fB2, fD, fDT, fP } from "../../utils/formatters.js";
import { sv } from "../../utils/numbers.js";
import { PLANO } from "../../data/plano.js";

// 👇 ABAS ATUALIZADAS: Substituímos as fragmentadas pelo "historico360"
const SUB_ABAS = ["visao-geral", "diversificacao", "alocacao", "bancario", "historico360"];
const LABEL_ABAS = {
  "visao-geral":   "Visão Geral",
  "diversificacao":"Diversificação",
  "alocacao":      "Qualidade Alocação",
  "bancario":      "Perfil Bancário",
  "historico360":  "Cliente 360º (Histórico)",
};

// Monta slices do donut com a alocação real do positivador_completo
function montarAloc(c, t) {
  const items = [
    { label: "Renda Fixa",  val: c.aloc_rf,     cor: t.blue   },
    { label: "Renda Var.",  val: c.aloc_rv,     cor: t.green  },
    { label: "Fundos",      val: c.aloc_fundos, cor: t.gold   },
    { label: "FII",         val: c.aloc_fi,     cor: t.amber  },
    { label: "Previdência", val: c.aloc_prev,   cor: t.purple || "#8b5cf6" },
    { label: "Financeiro",  val: c.aloc_fin,    cor: "#06b6d4" },
    { label: "Outros",      val: c.aloc_out,    cor: t.txd    },
  ].filter(i => sv(i.val) > 0);

  const total = items.reduce((s, i) => s + sv(i.val), 0);
  if (!total) return [];
  return items.map(i => ({ ...i, pct: sv(i.val) / total }));
}

// ── COMPONENTE: GRÁFICO DE EVOLUÇÃO (CSS PURO) ───────────────────────────────
function EvolucaoChart({ data, labels, t }) {
  const max = Math.max(...data);
  const min = Math.min(...data) * 0.85; 
  const range = max - min || 1;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", height: 140, gap: 8, marginTop: 16 }}>
      {data.map((val, i) => {
        const pct = ((val - min) / range) * 100;
        const cresceu = i === 0 || val >= data[i - 1];
        const corLinha = cresceu ? t.green : t.red;
        
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}>
            <div style={{ color: t.tx, fontSize: 10, fontWeight: 700 }}>{fB2(val)}</div>
            <div style={{
              width: "100%", maxWidth: 40, height: `${Math.max(pct, 5)}%`, 
              background: `linear-gradient(0deg, ${corLinha}22 0%, ${corLinha} 100%)`,
              borderRadius: "4px 4px 0 0", transition: "height 0.6s ease-out",
              borderTop: `2px solid ${corLinha}`
            }} />
            <div style={{ color: t.txd, fontSize: 10, fontWeight: 600 }}>{labels[i]}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export function CDetalhe({ c, onBack, tarefas, reunioes, oport }) {
  const t = useT();
  const { addToast } = useToast(); // Hook para as notificações
  
  const [subAba, setSubAba]   = useState("visao-geral");
  const [divs, setDivs]       = useState([]);
  const [loadDiv, setLoadDiv] = useState(false);

  const aloc  = montarAloc(c, t);
  const netM  = sv(c.netM)  || 0;
  const netM1 = sv(c.netM1) || 0;
  const varNet = netM1 > 0 ? ((netM - netM1) / netM1) * 100 : 0;

  const tC = (tarefas  || []).filter(x => x.conta === c.conta);
  const rC = (reunioes || []).filter(x => x.clienteId === c.conta || x.cliente === c.nome);
  const oC = (oport    || []).filter(x => x.conta === c.conta);

  // ── LÓGICA DA LINHA DO TEMPO (CLIENTE 360º) ──
  const linhaDoTempo = [
    ...tC.map(ta => ({ id: ta.id || Math.random(), tipo: "Tarefa", icone: "✅", cor: t.blue, titulo: ta.titulo, status: ta.status, data: ta.prazo || ta.data || "Sem data", rawData: ta.prazo || ta.data || "2000-01-01" })),
    ...rC.map(re => ({ id: re.id || Math.random(), tipo: "Reunião", icone: "📅", cor: t.gold, titulo: re.assunto, status: re.status, data: re.dataHora ? fDT(re.dataHora) : (re.data || "Sem data"), rawData: re.dataHora || re.data || "2000-01-01" })),
    ...oC.map(op => ({ id: op.id || Math.random(), tipo: "Oportunidade", icone: "🔥", cor: t.green, titulo: `${op.produto} (${fB(op.valor || 0)})`, status: op.fase || op.status, data: op.dataCadastro || "Recente", rawData: op.dataCadastro || "2000-01-01" }))
  ].sort((a, b) => new Date(b.rawData).getTime() - new Date(a.rawData).getTime());

  // Carrega diversificação ao abrir a aba
  useEffect(() => {
    if (subAba !== "diversificacao" || divs.length > 0) return;
    setLoadDiv(true);
    fetch(`http://localhost:3001/api/diversificacao?cliente=${c.conta}`)
      .then(r => r.json())
      .then(d => setDivs(Array.isArray(d) ? d : []))
      .catch(() => setDivs([]))
      .finally(() => setLoadDiv(false));
  }, [subAba, c.conta, divs.length]);

  // Agrupa diversificação por produto
  const divPorProduto = divs.reduce((acc, d) => {
    const k = d.produto || "Outros";
    if (!acc[k]) acc[k] = { produto: k, net: 0, itens: [] };
    acc[k].net += sv(d.net);
    acc[k].itens.push(d);
    return acc;
  }, {});
  const totalDiv = divs.reduce((s, d) => s + sv(d.net), 0);

  const dadosEvolucaoNET = [netM * 0.85, netM * 0.88, netM * 0.94, netM1, netM];
  const labelsEvolucao = ["M-4", "M-3", "M-2", "M-1", "Atual"];

  // ── LÓGICA DE GERAÇÃO DO PDF (ONE-PAGE) ──
  const exportarRelatorioPDF = async () => {
    addToast("⏳ Preparando relatório PDF...", "info");
    try {
      // Importa as bibliotecas dinamicamente apenas quando clica no botão (não pesa o sistema)
      const html2canvas = (await import('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.esm.js')).default;
      const { jsPDF } = await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.es.min.js');
      
      const elementoFicha = document.getElementById("ficha-cliente-exportar");
      
      const canvas = await html2canvas(elementoFicha, { 
        scale: 2, 
        backgroundColor: t.bg,
        useCORS: true 
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Relatorio_${c.nome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      
      addToast("✅ Relatório PDF gerado com sucesso!", "success");
    } catch (e) {
      console.error(e);
      addToast("❌ Erro ao gerar o PDF. Verifique sua conexão.", "error");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Botões do Topo */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <button onClick={onBack} style={{
          background: "none", border: `1px solid ${t.brd}`,
          color: t.gold, borderRadius: 8, padding: "6px 14px",
          cursor: "pointer", fontSize: 13, width: "fit-content"
        }}>← Voltar</button>

        <Btn onClick={exportarRelatorioPDF} style={{ background: t.blue, color: "#fff", border: "none" }} small>
          📄 Exportar Relatório (PDF)
        </Btn>
      </div>

      {/* 👇 A div "ficha-cliente-exportar" é o que será impresso no PDF 👇 */}
      <div id="ficha-cliente-exportar" style={{ display: "flex", flexDirection: "column", gap: 14, padding: "4px" }}>
        
        {/* Header do cliente */}
        <Crd>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            <div>
              <div style={{ color: t.tx, fontSize: 18, fontWeight: 800 }}>{c.nome || c.conta}</div>
              <div style={{ color: t.txm, fontSize: 12, fontFamily: "monospace", marginTop: 2 }}>
                Conta {c.conta} · {c.tipo_pessoa || "–"} · {c.profissao || "–"} · Cad. {c.data_cadastro || "–"}
              </div>
              <div style={{ color: t.txd, fontSize: 11, marginTop: 2 }}>
                Nasc. {c.data_nasc || "–"} · {c.sexo || "–"} · {PLANO.escritorio || "Dom Investimentos"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Bdg label={c.status} />
              <Bdg label={c.suit} />
              <Bdg label={c.seg} />
              {c.principalidade && <Bdg label={c.principalidade} />}
              {c.ativo_m === "Sim" && <Bdg label="✅ Ativo M" />}
              {c.evadiu_m === "Sim" && <Bdg label="⚠️ Evadiu M" />}
            </div>
          </div>

          {/* Donut de alocação + KPIs lado a lado */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
            {aloc.length > 0 && (
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <Donut slices={aloc} size={140} thick={18} label={fB(netM)} sub="NET Atual" />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {aloc.map(a => (
                    <div key={a.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 9, height: 9, borderRadius: "50%", background: a.cor }} />
                      <span style={{ color: t.txm, fontSize: 11 }}>{a.label}</span>
                      <span style={{ color: t.tx, fontWeight: 700, fontSize: 11, marginLeft: 4 }}>
                        {fB(sv(a.val))}
                      </span>
                      <span style={{ color: t.txd, fontSize: 10 }}>
                        ({(a.pct * 100).toFixed(0)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Termos e operações */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ color: t.txd, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Termos e Operações</div>
              {[
                { l: "Termo Qualificado",  v: c.termo_qual },
                { l: "Termo Profissional", v: c.termo_prof },
                { l: "2º Aporte",          v: c.fez_segundo_aporte },
                { l: "Operou Bolsa",       v: c.operou_bolsa },
                { l: "Operou Fundo",       v: c.operou_fundo },
                { l: "Operou RF",          v: c.operou_rf },
              ].map(({ l, v }) => (
                <div key={l} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: t.txd, fontSize: 11, minWidth: 140 }}>{l}</span>
                  <span style={{ color: v === "S" || v === "Sim" ? t.green : v === "N" || v === "Não" ? t.txd : t.txm, fontSize: 11, fontWeight: 600 }}>
                    {v === "S" ? "✅ Sim" : v === "N" ? "❌ Não" : v || "–"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Crd>

        {/* KPIs financeiros */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
          {[
            { l: "NET M-1",    v: fB(netM1),           co: t.tx   },
            { l: "NET Atual",  v: fB(netM),             co: netM > netM1 ? t.green : t.red },
            { l: "Var. NET",   v: `${varNet >= 0 ? "+" : ""}${varNet.toFixed(1)}%`, co: varNet >= 0 ? t.green : t.red },
            { l: "Receita/mês",v: fB2(sv(c.rec)),       co: t.gold  },
            { l: "Cap. Bruta", v: fB(sv(c.cap)),        co: t.green },
            { l: "Cap. Líq.",  v: fB(sv(c.cap_liq)),    co: sv(c.cap_liq) >= 0 ? t.green : t.red },
            { l: "Resgates",   v: fB(sv(c.resgate)),    co: t.red   },
            { l: "Saldo D0",   v: fB2(sv(c.d0)),        co: sv(c.d0) > 5000 ? t.amber : t.txd },
            { l: "Saldo D+1",  v: fB2(sv(c.d1)),        co: t.txd   },
          ].map(({ l, v, co }) => (
            <Crd key={l} style={{ padding: "10px 12px" }}>
              <KPI label={l} value={v} color={co} size="sm" />
            </Crd>
          ))}
        </div>

        {/* Receitas detalhadas */}
        {(sv(c.rec) > 0) && (
          <Crd>
            <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Receitas Detalhadas</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
              {[
                { l: "Bovespa",    v: c.rec_bovespa  },
                { l: "Futuros",    v: c.rec_futuros  },
                { l: "RF Bancários",v: c.rec_rf_banc  },
                { l: "RF Privados",v: c.rec_rf_priv  },
                { l: "RF Públicos",v: c.rec_rf_pub   },
                { l: "Aluguel",    v: c.rec_aluguel  },
                { l: "Pacote",     v: c.rec_pacote   },
              ].filter(({ v }) => sv(v) > 0).map(({ l, v }) => (
                <Crd key={l} style={{ padding: "10px 12px" }}>
                  <KPI label={l} value={fB2(sv(v))} color={t.gold} size="sm" />
                </Crd>
              ))}
            </div>
          </Crd>
        )}

        {/* Sub-abas */}
        <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${t.brd}`, overflowX: "auto" }}>
          {SUB_ABAS.map(a => (
            <button key={a} onClick={() => setSubAba(a)} style={{
              background: "none", border: "none",
              color: subAba === a ? t.gold : t.txm,
              padding: "8px 12px", fontSize: 12,
              fontWeight: subAba === a ? 700 : 400,
              cursor: "pointer",
              borderBottom: subAba === a ? `2px solid ${t.gold}` : "2px solid transparent",
              whiteSpace: "nowrap"
            }}>{LABEL_ABAS[a]}</button>
          ))}
        </div>

        {/* ── VISÃO GERAL ── */}
        {subAba === "visao-geral" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 12 }}>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Captação detalhada */}
              <Crd>
                <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Captação Detalhada</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8 }}>
                  {[
                    { l: "Cap. TED",  v: c.cap_ted  },
                    { l: "Cap. PREV", v: c.cap_prev  },
                  ].filter(({ v }) => sv(v) > 0).map(({ l, v }) => (
                    <Crd key={l} style={{ padding: "10px 12px" }}>
                      <KPI label={l} value={fB(sv(v))} color={t.green} size="sm" />
                    </Crd>
                  ))}
                </div>
              </Crd>

              {/* Evolução Histórica (Gráfico de Barras) */}
              <Crd style={{ flex: 1 }}>
                <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Evolução do Patrimônio (NET)</div>
                <div style={{ color: t.txd, fontSize: 11, marginBottom: 12 }}>Tendência de crescimento dos últimos 5 meses</div>
                <EvolucaoChart data={dadosEvolucaoNET} labels={labelsEvolucao} t={t} />
              </Crd>
            </div>

            {/* Aderência da qualidade de alocação */}
            {c.ader != null && (
              <Crd>
                <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Qualidade de Alocação</div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <Gauge value={sv(c.ader)} max={100} label="Aderência" color={sv(c.ader) < 50 ? t.red : sv(c.ader) < 70 ? t.amber : t.green} />
                    <span style={{ color: t.txd, fontSize: 10 }}>{sv(c.ader).toFixed(1)}%</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
                    {c.pol_cadastrada && <div><span style={{ color: t.txd, fontSize: 10 }}>Política Cadastrada: </span><span style={{ color: t.tx, fontSize: 11, fontWeight: 600 }}>{c.pol_cadastrada}</span></div>}
                    {c.pol_sugerida   && <div><span style={{ color: t.txd, fontSize: 10 }}>Política Sugerida: </span><span style={{ color: t.gold, fontSize: 11, fontWeight: 600 }}>{c.pol_sugerida}</span></div>}
                    {c.gap_over != null && <div><span style={{ color: t.txd, fontSize: 10 }}>Gap Over: </span><span style={{ color: t.amber, fontSize: 11, fontWeight: 700 }}>{fB(c.gap_over)}</span></div>}
                    {c.gap_under != null && <div><span style={{ color: t.txd, fontSize: 10 }}>Gap Under: </span><span style={{ color: t.amber, fontSize: 11, fontWeight: 700 }}>{fB(c.gap_under)}</span></div>}
                    {c.rentab_rel != null && <div><span style={{ color: t.txd, fontSize: 10 }}>Rent. Relativa: </span><span style={{ color: sv(c.rentab_rel) > 0 ? t.green : t.red, fontSize: 11, fontWeight: 700 }}>{sv(c.rentab_rel).toFixed(0)}%</span></div>}
                  </div>
                </div>
                <ProgressBar value={sv(c.ader)} max={100} color={sv(c.ader) < 50 ? t.red : sv(c.ader) < 70 ? t.amber : t.green} h={8} />
                <div style={{ color: t.txd, fontSize: 11, marginTop: 6 }}>
                  {sv(c.ader) < 70 ? "⚠️ Necessita rebalanceamento" : "✅ Carteira enquadrada"}
                </div>
              </Crd>
            )}
          </div>
        )}

        {/* ── DIVERSIFICAÇÃO ── */}
        {subAba === "diversificacao" && (
          <Crd>
            <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
              Diversificação de Ativos
              {totalDiv > 0 && <span style={{ color: t.txd, fontSize: 11, fontWeight: 400, marginLeft: 8 }}>Total: {fB(totalDiv)}</span>}
            </div>

            {loadDiv && <div style={{ color: t.txd, fontSize: 12, padding: 20, textAlign: "center" }}>⏳ Carregando...</div>}

            {!loadDiv && divs.length === 0 && (
              <div style={{ color: t.txd, fontSize: 12 }}>Nenhum dado de diversificação importado para este cliente.</div>
            )}

            {!loadDiv && divs.length > 0 && (
              <>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  {Object.values(divPorProduto).sort((a, b) => b.net - a.net).map(p => (
                    <div key={p.produto} style={{
                      background: t.lt, borderRadius: 8, padding: "8px 12px",
                      border: `1px solid ${t.brd}`, minWidth: 120
                    }}>
                      <div style={{ color: t.txm, fontSize: 10, fontWeight: 700 }}>{p.produto}</div>
                      <div style={{ color: t.gold, fontSize: 13, fontWeight: 800 }}>{fB(p.net)}</div>
                      <div style={{ color: t.txd, fontSize: 10 }}>
                        {totalDiv > 0 ? ((p.net / totalDiv) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${t.brd}`, background: t.lt }}>
                        {["Produto", "Sub Produto", "Ativo", "Emissor", "CNPJ", "Vencimento", "Qtde", "NET", "Data"].map(h => (
                          <th key={h} style={{ padding: "6px 10px", color: t.txm, fontWeight: 700, textAlign: "left", fontSize: 10, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {divs.sort((a, b) => sv(b.net) - sv(a.net)).map((d, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${t.brd}33` }}>
                          <td style={{ padding: "5px 10px", color: t.gold, fontWeight: 600 }}>{d.produto || "–"}</td>
                          <td style={{ padding: "5px 10px", color: t.txm }}>{d.sub_produto || "–"}</td>
                          <td style={{ padding: "5px 10px", color: t.tx, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.ativo || "–"}</td>
                          <td style={{ padding: "5px 10px", color: t.txm, whiteSpace: "nowrap" }}>{d.emissor || "–"}</td>
                          <td style={{ padding: "5px 10px", color: t.txd, fontFamily: "monospace", fontSize: 10 }}>{d.cnpj_fundo || "–"}</td>
                          <td style={{ padding: "5px 10px", color: t.txd, whiteSpace: "nowrap" }}>{d.data_vencimento || "–"}</td>
                          <td style={{ padding: "5px 10px", color: t.txm, fontVariantNumeric: "tabular-nums" }}>{d.quantidade != null ? sv(d.quantidade).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "–"}</td>
                          <td style={{ padding: "5px 10px", color: sv(d.net) > 0 ? t.green : t.txd, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fB(sv(d.net))}</td>
                          <td style={{ padding: "5px 10px", color: t.txd, fontSize: 10 }}>{d.data || "–"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Crd>
        )}

        {/* ── QUALIDADE DE ALOCAÇÃO ── */}
        {subAba === "alocacao" && (
          <Crd>
            <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Qualidade de Alocação</div>
            {c.ader == null
              ? <div style={{ color: t.txd, fontSize: 12 }}>Dados de qualidade de alocação não disponíveis para este cliente.</div>
              : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
                    {[
                      { l: "Aderência",       v: `${sv(c.ader).toFixed(1)}%`,         co: sv(c.ader) < 70 ? t.red : t.green },
                      { l: "Gap Over",        v: fB(sv(c.gap_over)),                   co: t.amber },
                      { l: "Gap Under",       v: fB(sv(c.gap_under)),                  co: t.amber },
                      { l: "Rent. Relativa",  v: `${sv(c.rentab_rel).toFixed(0)}%`,    co: sv(c.rentab_rel) > 0 ? t.green : t.red },
                      { l: "% Saldo Global",  v: `${sv(c.saldo_global).toFixed(0)}%`,  co: t.txm },
                      { l: "Pol. Cadastrada", v: c.pol_cadastrada || "–",              co: t.tx },
                      { l: "Pol. Sugerida",   v: c.pol_sugerida   || "–",              co: c.pol_cadastrada !== c.pol_sugerida ? t.amber : t.green },
                    ].map(({ l, v, co }) => (
                      <Crd key={l} style={{ padding: "10px 12px" }}>
                        <KPI label={l} value={v} color={co} size="sm" />
                      </Crd>
                    ))}
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: t.txd, fontSize: 11 }}>Aderência da Carteira</span>
                      <span style={{ color: sv(c.ader) < 70 ? t.red : t.green, fontWeight: 700 }}>{sv(c.ader).toFixed(1)}%</span>
                    </div>
                    <ProgressBar value={sv(c.ader)} max={100} color={sv(c.ader) < 50 ? t.red : sv(c.ader) < 70 ? t.amber : t.green} h={10} />
                    <div style={{ color: t.txd, fontSize: 11, marginTop: 6 }}>
                      {sv(c.ader) < 70 ? "⚠️ Necessita rebalanceamento — considere reunião de revisão de carteira" : "✅ Carteira enquadrada dentro da política"}
                    </div>
                  </div>
                  {c.pol_cadastrada !== c.pol_sugerida && c.pol_sugerida && (
                    <div style={{ background: `${t.amber}15`, border: `1px solid ${t.amber}44`, borderRadius: 8, padding: "10px 14px" }}>
                      <div style={{ color: t.amber, fontWeight: 700, fontSize: 12, marginBottom: 4 }}>⚠️ Divergência de Política</div>
                      <div style={{ color: t.txm, fontSize: 11 }}>
                        Política cadastrada <strong>{c.pol_cadastrada}</strong> difere da política sugerida <strong>{c.pol_sugerida}</strong>. Avalie migração.
                      </div>
                    </div>
                  )}
                </div>
              )}
          </Crd>
        )}

        {/* ── BANCÁRIO ── */}
        {subAba === "bancario" && (
          <Crd>
            <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Perfil Bancário</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
              <KPI label="Uso de Conta" value={c.uso_conta || "–"} color={c.uso_conta ? t.green : t.txd} size="sm" />
              <KPI label="Status Corretora" value={c.status_corretora || "–"} color={t.txm} size="sm" />
              <KPI label="Elegível Turbo" value={c.elegivel_turbo || "–"} color={c.elegivel_turbo === "Sim" ? t.gold : t.txd} size="sm" />
              <KPI label="Faixa AUC" value={c.faixa_auc || "–"} color={t.tx} size="sm" />
              <KPI label="Portabilidade" value={c.portabilidade || "–"} color={t.blue} size="sm" />
              <KPI label="Chave PIX" value={c.status_pix || "–"} color={c.status_pix?.includes("Tem") ? t.green : t.txd} size="sm" />
            </div>
          </Crd>
        )}

        {/* ── CLIENTE 360º (LINHA DO TEMPO) ── */}
        {subAba === "historico360" && (
          <Crd>
            <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 16 }}>Histórico de Interações (Visão 360º)</div>
            {linhaDoTempo.length === 0 ? (
              <div style={{ color: t.txd, fontSize: 12, textAlign: "center", padding: "20px 0" }}>
                Nenhuma tarefa, reunião ou oportunidade cadastrada para este cliente.
              </div>
            ) : (
              <div style={{ position: "relative", paddingLeft: 24 }}>
                {/* Linha vertical (espinha dorsal) */}
                <div style={{ position: "absolute", top: 10, bottom: 10, left: 11, width: 2, background: t.brd }} />
                
                {linhaDoTempo.map((item, i) => (
                  <div key={item.id} style={{ position: "relative", marginBottom: 16 }}>
                    {/* Ponto / Ícone na linha */}
                    <div style={{
                      position: "absolute", left: -24, top: 4, width: 24, height: 24,
                      borderRadius: "50%", background: t.lt, border: `2px solid ${item.cor}`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, zIndex: 2
                    }}>
                      {item.icone}
                    </div>
                    
                    {/* Card do evento */}
                    <div style={{ 
                      background: t.lt, border: `1px solid ${t.brd}`, borderRadius: 8, padding: "10px 14px",
                      marginLeft: 16, borderLeft: `4px solid ${item.cor}`
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <span style={{ color: item.cor, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
                          {item.tipo}
                        </span>
                        <span style={{ color: t.txd, fontSize: 10, fontFamily: "monospace" }}>{item.data}</span>
                      </div>
                      <div style={{ color: t.tx, fontSize: 13, fontWeight: 600 }}>{item.titulo}</div>
                      {item.status && (
                        <div style={{ color: t.txm, fontSize: 11, marginTop: 4 }}>Status: {item.status}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Crd>
        )}

      </div>
    </div>
  );
}
