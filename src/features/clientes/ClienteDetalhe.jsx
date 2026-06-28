import { useEffect, useState } from "react";
import { useT } from "../../theme/ThemeContext.jsx";
import { Crd, KPI, Bdg, ProgressBar, Btn } from "../../components/ui/index.js";
import { Donut, Gauge } from "../../components/charts/index.js";
import { fB, fB2, fD, fDT, fP } from "../../utils/formatters.js";
import { sv } from "../../utils/numbers.js";
import { PLANO } from "../../data/plano.js";

const SUB_ABAS = ["visao-geral", "diversificacao", "alocacao", "bancario", "tarefas", "reunioes", "oportunidades"];
const LABEL_ABAS = {
  "visao-geral":   "Visão Geral",
  "diversificacao":"Diversificação",
  "alocacao":      "Qualidade Alocação",
  "bancario":      "Perfil Bancário",
  "tarefas":       "Tarefas",
  "reunioes":      "Reuniões",
  "oportunidades": "Oportunidades",
};

// Monta slices do donut com a alocação real do positivador_completo
function montarAloc(c, t) {
  const items = [
    { label: "Renda Fixa",  val: c.aloc_rf,    cor: t.blue   },
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

export function CDetalhe({ c, onBack, tarefas, reunioes, oport }) {
  const t = useT();
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

  // Carrega diversificação ao abrir a aba
  useEffect(() => {
    if (subAba !== "diversificacao" || divs.length > 0) return;
    setLoadDiv(true);
    fetch(`http://localhost:3001/api/diversificacao?cliente=${c.conta}`)
      .then(r => r.json())
      .then(d => setDivs(Array.isArray(d) ? d : []))
      .catch(() => setDivs([]))
      .finally(() => setLoadDiv(false));
  }, [subAba, c.conta]);

  // Agrupa diversificação por produto
  const divPorProduto = divs.reduce((acc, d) => {
    const k = d.produto || "Outros";
    if (!acc[k]) acc[k] = { produto: k, net: 0, itens: [] };
    acc[k].net += sv(d.net);
    acc[k].itens.push(d);
    return acc;
  }, {});
  const totalDiv = divs.reduce((s, d) => s + sv(d.net), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Botão voltar */}
      <button onClick={onBack} style={{
        background: "none", border: `1px solid ${t.brd}`,
        color: t.gold, borderRadius: 8, padding: "6px 14px",
        cursor: "pointer", fontSize: 13, width: "fit-content"
      }}>← Voltar</button>

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
              {/* Resumo por produto */}
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

              {/* Tabela detalhada */}
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

      {/* ── PERFIL BANCÁRIO ── */}
      {subAba === "bancario" && (
        <Crd>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Perfil Bancário</div>
          {!c.uso_conta
            ? <div style={{ color: t.txd, fontSize: 12 }}>Dados bancários não disponíveis para este cliente.</div>
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Status e elegibilidades */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8 }}>
                  {[
                    { l: "Uso da Conta",      v: c.uso_conta        },
                    { l: "Status Corretora",  v: c.status_corretora  },
                    { l: "Elegível Turbo",    v: c.elegivel_turbo    },
                    { l: "Faixa AUC",         v: c.faixa_auc         },
                    { l: "Portabilidade",     v: c.portabilidade     },
                    { l: "Principalidade",    v: c.principalidade    },
                  ].map(({ l, v }) => (
                    <Crd key={l} style={{ padding: "10px 12px" }}>
                      <div style={{ color: t.txd, fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>{l}</div>
                      <div style={{ color: t.tx, fontSize: 12, fontWeight: 600 }}>{v || "–"}</div>
                    </Crd>
                  ))}
                </div>

                {/* Pagamentos */}
                <div>
                  <div style={{ color: t.txm, fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Status de Pagamentos</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { l: "Boleto",  v: c.status_boleto  },
                      { l: "Fatura",  v: c.status_fatura  },
                      { l: "Chave Pix",v: c.status_pix    },
                    ].map(({ l, v }) => {
                      const ok = v && v.includes("Paga") || v && v.includes("Tem");
                      return (
                        <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: t.lt, borderRadius: 8, border: `1px solid ${t.brd}` }}>
                          <span style={{ color: t.txm, fontSize: 12 }}>{l}</span>
                          <span style={{ color: ok ? t.green : t.txd, fontSize: 12, fontWeight: 600 }}>
                            {ok ? "✅" : "❌"} {v || "–"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Faixas de pagamento */}
                <div>
                  <div style={{ color: t.txm, fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Faixas de Pagamento</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                    {[
                      { l: "M0 (atual)",  v: c.faixa_pgto_m0 },
                      { l: "M-1",         v: c.faixa_pgto_m1 },
                      { l: "M-2",         v: c.faixa_pgto_m2 },
                    ].map(({ l, v }) => (
                      <Crd key={l} style={{ padding: "10px 12px", textAlign: "center" }}>
                        <div style={{ color: t.txd, fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>{l}</div>
                        <div style={{ color: v && v.includes("+7500") ? t.gold : t.tx, fontSize: 12, fontWeight: 700 }}>{v || "–"}</div>
                      </Crd>
                    ))}
                  </div>
                </div>
              </div>
            )}
        </Crd>
      )}

      {/* ── TAREFAS ── */}
      {subAba === "tarefas" && (
        <Crd>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Tarefas do Cliente</div>
          {tC.length === 0
            ? <div style={{ color: t.txd, fontSize: 12 }}>Nenhuma tarefa registrada</div>
            : tC.map(ta => (
              <div key={ta.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${t.brd}` }}>
                <div>
                  <div style={{ color: t.tx, fontSize: 12, fontWeight: 600 }}>{ta.titulo}</div>
                  <div style={{ color: t.txd, fontSize: 10 }}>{ta.tipo} · Prazo: {fD(ta.prazo)}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}><Bdg label={ta.prior} /><Bdg label={ta.status} /></div>
              </div>
            ))}
        </Crd>
      )}

      {/* ── REUNIÕES ── */}
      {subAba === "reunioes" && (
        <Crd>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Reuniões do Cliente</div>
          {rC.length === 0
            ? <div style={{ color: t.txd, fontSize: 12 }}>Nenhuma reunião registrada</div>
            : rC.map(r => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${t.brd}` }}>
                <div>
                  <div style={{ color: t.tx, fontSize: 12, fontWeight: 600 }}>{r.tipo}</div>
                  <div style={{ color: t.txd, fontSize: 10 }}>{fDT(r.dataHora)}</div>
                </div>
                <Bdg label={r.status} />
              </div>
            ))}
        </Crd>
      )}

      {/* ── OPORTUNIDADES ── */}
      {subAba === "oportunidades" && (
        <Crd>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Oportunidades</div>
          {oC.length === 0
            ? <div style={{ color: t.txd, fontSize: 12 }}>Nenhuma oportunidade registrada</div>
            : oC.map(o => (
              <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${t.brd}` }}>
                <div>
                  <div style={{ color: t.tx, fontSize: 12, fontWeight: 600 }}>{o.tipo}</div>
                  <div style={{ color: t.txd, fontSize: 10 }}>{o.desc}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Bdg label={o.prioridade} />
                  <span style={{ color: t.gold, fontWeight: 700, fontSize: 12 }}>{fB(o.valor)}</span>
                </div>
              </div>
            ))}
        </Crd>
      )}

    </div>
  );
}

export const ClienteDetalhe = CDetalhe;
