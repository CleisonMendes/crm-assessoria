import { useState, useEffect } from "react";
import { Crd, KPI, Bdg, ProgressBar } from "../../components/ui/index.js"; 
import { Donut, LChart } from "../../components/charts/index.js";
import { useT } from "../../theme/ThemeContext.jsx";
import { fB, fB2, fD, fDT, fP } from "../../utils/formatters.js";
import { sv } from "../../utils/numbers.js";

export function CDetalhe({ c, onBack, tarefas, reunioes, oport }) {
  const t = useT();
  const [subAba, setSubAba] = useState("carteira");
  const [exibirAtivos, setExibirAtivos] = useState(false);
  const [carregandoExt, setCarregandoExt] = useState(true);
  const [dadosCruzados, setDadosCruzados] = useState({
    diversificacao: [],
    perfil_conta: null,
    captacoes: []
  });

  const net = Math.max(sv(c.netM), sv(c.netM1));

  // Busca o cruzamento completo em tempo de execução no SQLite
  useEffect(() => {
    fetch(`http://localhost:3001/api/clientes/${c.conta}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setDadosCruzados({
            diversificacao: data.diversificacao || [],
            perfil_conta: data.perfil_conta || null,
            captacoes: data.captacoes || []
          });
        }
      })
      .catch(err => console.error("Erro ao cruzar dados do cliente:", err))
      .finally(() => setCarregandoExt(false));
  }, [c.conta]);

  // Filtros locais de interações do CRM
  const tC = (tarefas || []).filter(x => x.conta === c.conta);
  const rC = (reunioes || []).filter(x => x.clienteId === c.conta || x.cliente === c.nome);
  const oC = (oport || []).filter(x => x.conta === c.conta);

  // Monta fatias do Donut dinamicamente com base nas colunas do positivador_completo
  const slicesAlocacao = [
    { label: "Renda Fixa", pct: net > 0 ? (c.aloc_renda_fixa || 0) / net : 0, cor: t.blue },
    { label: "Fundos", pct: net > 0 ? (c.aloc_fundos || 0) / net : 0, cor: t.purple || "#8b5cf6" },
    { label: "Renda Variável", pct: net > 0 ? (c.aloc_renda_variavel || 0) / net : 0, cor: t.gold },
    { label: "FIIs", pct: net > 0 ? (c.aloc_fi || 0) / net : 0, cor: "#06b6d4" },
    { label: "Previdência", pct: net > 0 ? (c.aloc_previdencia || 0) / net : 0, cor: t.green },
    { label: "Financeiro/Saldo", pct: net > 0 ? (c.aloc_financeiro || 0) / net : 0, cor: t.amber },
    { label: "Outros", pct: net > 0 ? (c.aloc_outros || 0) / net : 0, cor: t.txm }
  ].filter(s => s.pct > 0);

  const subAbas = ["carteira", "ativos_detalhados", "historico_captacao", "tarefas", "reunioes", "oportunidades"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <button onClick={onBack} style={{ background: "none", border: `1px solid ${t.brd}`, color: t.gold, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13, width: "fit-content" }}>
        ← Voltar para Lista
      </button>

      {/* CARD PRINCIPAL COM PIE CHART DINÂMICO */}
      <Crd>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <div>
            <div style={{ color: t.tx, fontSize: 18, fontWeight: 800 }}>{c.nome}</div>
            <div style={{ color: t.txm, fontSize: 12, fontFamily: "monospace", marginTop: 2 }}>
              Conta Corretora: {c.conta} {c.profissao ? `· Profissão: ${c.profissao}` : ""} · Atualizado: {c.ult}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Bdg label={c.status} />
            <Bdg label={c.suit} />
            <Bdg label={c.seg} />
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <Donut slices={slicesAlocacao.length > 0 ? slicesAlocacao : [{ label: "Sem Alocação", pct: 1, cor: t.brd }]} size={150} thick={20} label={fB(net)} sub="Patrimônio Consolidado" />
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {slicesAlocacao.map(a => (
                <div key={a.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 9, height: 9, borderRadius: "50%", background: a.cor }} />
                  <span style={{ color: t.txm, fontSize: 11 }}>{a.label}</span>
                  <span style={{ color: t.tx, fontWeight: 700, fontSize: 11, marginLeft: 4 }}>{(sv(a.pct) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Crd>

      {/* REPRODUÇÃO DAS INFOS FINANCEIRAS DO POSITIVADOR */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
        {[
          { l: "NET M-1", v: fB(c.netM1), co: t.tx },
          { l: "NET Atual", v: fB(c.netM), co: c.netM > 0 ? t.green : t.txd },
          { l: "Receita", v: fB2(c.rec), co: t.gold },
          { l: "Cap. Bruta", v: fB(c.cap), co: t.green },
          { l: "Resgates", v: fB(c.res), co: t.red },
          { l: "Financeiro (D0)", v: fB2(c.d0), co: c.d0 > 5000 ? t.amber : t.txd }
        ].map(({ l, v, co }) => (
          <Crd key={l} style={{ padding: "10px 12px" }}><KPI label={l} value={v} color={co} size="sm"/></Crd>
        ))}
      </div>

      {/* SEÇÃO: DIVERSIFICADOR DE ATIVOS */}
      <Crd style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: t.lt, border: `1px solid ${t.brd}`, flexWrap: "wrap", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(0, 255, 128, 0.1)", color: t.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            📊
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: "bold", color: t.tx }}>Diversificador de Ativos ({dadosCruzados.diversificacao.length} papéis)</div>
            <div style={{ fontSize: 12, color: t.txm }}>Composição da carteira aberta importada do lote de diversificação.</div>
          </div>
        </div>
        <button 
          onClick={() => setSubAba("ativos_detalhados")}
          style={{ background: t.green, color: "#000", border: "none", padding: "10px 20px", borderRadius: "6px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}
        >
          Ver Ativos
        </button>
      </Crd>

      {/* ABAS DA FICHA */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${t.brd}`, overflowX: "auto" }}>
        {subAbas.map(a => (
          <button key={a} onClick={() => setSubAba(a)} style={{ background: "none", border: "none", color: subAba === a ? t.gold : t.txm, padding: "8px 12px", fontSize: 12, fontWeight: subAba === a ? 700 : 400, cursor: "pointer", borderBottom: subAba === a ? `2px solid ${t.gold}` : "2px solid transparent", textTransform: "capitalize", whiteSpace: "nowrap" }}>
            {a.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* ABA: COMPOSIÇÃO / CARTEIRA */}
      {subAba === "carteira" && (
        <Crd>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Aderência e Qualidade de Alocação</div>
          {c.ader != null ? (
            <>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 10 }}>
                <KPI label="Aderência Geral" value={fP(c.ader)} color={sv(c.ader) < 0.7 ? t.red : t.green} />
              </div>
              <ProgressBar value={sv(c.ader) * 100} max={100} color={sv(c.ader) < 0.5 ? t.red : sv(c.ader) < 0.7 ? t.amber : t.green} h={8} />
            </>
          ) : (
            <div style={{ color: t.txd, fontSize: 12 }}>Nenhuma métrica de enquadramento de lote de Qualidade importada.</div>
          )}
        </Crd>
      )}

      {/* ABA DE PRODUTOS DINÂMICA (DIVERSIFICAÇÃO) */}
      {subAba === "ativos_detalhados" && (
        <Crd>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Lista de Custódia Ativa</div>
          {carregandoExt ? (
            <div style={{ fontSize: 12, color: t.txm }}>Cruzando tabelas...</div>
          ) : dadosCruzados.diversificacao.length === 0 ? (
            <div style={{ fontSize: 12, color: t.txd }}>Nenhum papel encontrado para esta conta. Importe planilhas de "Diversificação".</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.brd}`, color: t.txm, fontWeight: 700, textAlign: "left" }}>
                    <th style={{ padding: 6 }}>Produto</th>
                    <th style={{ padding: 6 }}>Sub-Produto</th>
                    <th style={{ padding: 6 }}>Ativo/Papel</th>
                    <th style={{ padding: 6 }}>Emissor</th>
                    <th style={{ padding: 6 }} style={{ textAlign: "right" }}>Quantidade</th>
                    <th style={{ padding: 6 }} style={{ textAlign: "right" }}>Net Patrimônio</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosCruzados.diversificacao.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${t.brd}44` }}>
                      <td style={{ padding: "6px 4px", color: t.tx }}>{item.produto}</td>
                      <td style={{ padding: "6px 4px", color: t.txm }}><Bdg label={item.sub_produto || "Geral"} /></td>
                      <td style={{ padding: "6px 4px", color: t.gold, fontWeight: 600 }}>{item.ativo}</td>
                      <td style={{ padding: "6px 4px", color: t.txm }}>{item.emissor || "—"}</td>
                      <td style={{ padding: "6px 4px", color: t.tx, textAlign: "right" }}>{sv(item.quantidade).toFixed(2)}</td>
                      <td style={{ padding: "6px 4px", color: t.green, fontWeight: 600, textAlign: "right" }}>{fB(item.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Crd>
      )}

      {/* ABA: HISTÓRICO DE CAPTAÇÃO EXTRATO */}
      {subAba === "historico_captacao" && (
        <Crd>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Movimentações Recentes</div>
          {dadosCruzados.captacoes.length === 0 ? (
            <div style={{ fontSize: 12, color: t.txd }}>Nenhum aporte ou resgate isolado no histórico desta conta.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {dadosCruzados.captacoes.map((mov, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${t.brd}33` }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: t.tx }}>{mov.tipo || "Aporte"}</span>
                    <div style={{ fontSize: 10, color: t.txd }}>{mov.data}</div>
                  </div>
                  <span style={{ color: sv(mov.captacao) >= 0 ? t.green : t.red, fontWeight: 700, fontSize: 12 }}>
                    {fB(mov.captacao)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Crd>
      )}

      {/* ABAS ORIGINAIS DO CRM DE CONTROLE INTERNO */}
      {subAba === "tarefas" && (
        <Crd>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Tarefas do Cliente</div>
          {tC.length === 0 ? <div style={{ color: t.txd, fontSize: 12 }}>Nenhuma tarefa registrada</div> : tC.map(ta => (
            <div key={ta.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${t.brd}` }}>
              <div><div style={{ color: t.tx, fontSize: 12, fontWeight: 600 }}>{ta.titulo}</div><div style={{ color: t.txd, fontSize: 10 }}>{ta.tipo} · Prazo: {fD(ta.prazo)}</div></div>
              <div style={{ display: "flex", gap: 6 }}><Bdg label={ta.prior} /><Bdg label={ta.status} /></div>
            </div>
          ))}
        </Crd>
      )}

      {subAba === "reunioes" && (
        <Crd>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Reuniões do Cliente</div>
          {rC.length === 0 ? <div style={{ color: t.txd, fontSize: 12 }}>Nenhuma reunião registrada</div> : rC.map(r => (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${t.brd}` }}>
              <div><div style={{ color: t.tx, fontSize: 12, fontWeight: 600 }}>{r.tipo}</div><div style={{ color: t.txd, fontSize: 10 }}>{fDT(r.dataHora)}</div></div>
              <Bdg label={r.status} />
            </div>
          ))}
        </Crd>
      )}

      {subAba === "oportunidades" && (
        <Crd>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Oportunidades</div>
          {oC.length === 0 ? <div style={{ color: t.txd, fontSize: 12 }}>Nenhuma oportunidade</div> : oC.map(o => (
            <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${t.brd}` }}>
              <div><div style={{ color: t.tx, fontSize: 12, fontWeight: 600 }}>{o.tipo}</div><div style={{ color: t.txd, fontSize: 10 }}>{o.desc}</div></div>
              <div style={{ display: "flex", gap: 6 }}><Bdg label={o.prioridade} /><span style={{ color: t.gold, fontWeight: 700, fontSize: 12 }}>{fB(o.valor)}</span></div>
            </div>
          ))}
        </Crd>
      )}
    </div>
  );
}
export const ClienteDetalhe = CDetalhe;