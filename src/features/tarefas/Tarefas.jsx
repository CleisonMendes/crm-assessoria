import { useState, useEffect, useMemo, useCallback } from "react";
import { db } from "../../services/storage.js";
import { fB } from "../../utils/formatters.js";
import { Crd, KPI, Btn, Bdg } from "../../components/ui/index.js";
import { useT } from "../../theme/ThemeContext.jsx";
import { sv } from "../../utils/numbers.js";

/* ────────────────────────────────────────────────────────────
   CONSTANTES
──────────────────────────────────────────────────────────── */
const HOJE_STR = new Date().toISOString().split("T")[0];

const TIPOS_TAREFA = [
  "Ligacao", "WhatsApp", "Reuniao", "Follow-up",
  "Proposta", "Rebalanceamento", "Relatorio", "Onboarding", "Outro",
];

const PRIORIDADES = ["Urgente", "Alta", "Media", "Baixa"];

const STATUS_WORKFLOW = [
  "Criada", "Pendente", "Em andamento",
  "Em contato", "Aguardando cliente", "Concluida", "Perdida", "Atrasada",
];

const STATUS_KANBAN = [
  "Pendente", "Em andamento", "Em contato", "Aguardando cliente", "Concluida",
];

const NOMES_FANTASMA = /Antonio Justiniano|Sebastiao|Roberta/i;

const SALDO_LIMIAR_RELACIONAMENTO = 50000;
const SALDO_LIMIAR_LIQUIDEZ = 10000;

/* ────────────────────────────────────────────────────────────
   HELPERS PUROS
──────────────────────────────────────────────────────────── */
const genId = () => `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const calcularDiasDiff = (dataRef) => {
  if (!dataRef) return 0;
  const hoje = new Date(HOJE_STR).getTime();
  const alvo = new Date(dataRef).getTime();
  return Math.ceil((alvo - hoje) / (1000 * 60 * 60 * 24));
};

/** Normaliza um objeto de tarefa garantindo campos obrigatórios. */
const sanitizarTarefa = (t) => ({
  ...t,
  status: t.status && STATUS_WORKFLOW.includes(t.status) ? t.status : "Pendente",
  historico: Array.isArray(t.historico) ? t.historico : [{ data: new Date().toISOString(), acao: "Migrada" }],
});

/** Filtra registros inválidos/fantasma. */
const validarLista = (lista) =>
  Array.isArray(lista)
    ? lista.filter(
        (x) =>
          x &&
          typeof x === "object" &&
          x.id != null &&
          typeof x.titulo === "string" &&
          x.titulo.trim().length > 0 &&
          !NOMES_FANTASMA.test(x.cliente || "")
      )
    : [];

/** Calcula score de prioridade (0–100) para uma tarefa. */
const calcularScore = (task, clienteInfo = {}) => {
  const saldo = sv(clienteInfo.d0 || clienteInfo.financeiro || 0);
  const patrimony = sv(clienteInfo.netM || clienteInfo.net_m || 0);
  const dias = calcularDiasDiff(task.prazo);

  let score = 0;
  if (task.status === "Atrasada" || dias < 0) score += 50;
  else if (dias === 0) score += 40;
  else if (dias <= 2) score += 20;
  else if (dias <= 7) score += 8;

  if (saldo > 100000 || patrimony > 1000000) score += 30;
  else if (saldo > 50000 || patrimony > 500000) score += 15;

  if (task.tipo === "Proposta") score += 20;
  else if (task.tipo === "Rebalanceamento") score += 15;
  else if (task.tipo === "Reuniao") score += 12;

  return Math.min(100, score);
};

/** Define a próxima ação sugerida com base nos dados da tarefa. */
const calcularNextAction = (task, score) => {
  if (task.status === "Atrasada" || score >= 70) return "⚡ Ação imediata necessária";
  if (task.status === "Em contato") return "⏳ Aguardar retorno / Follow-up";
  if (task.status === "Aguardando cliente") return "📞 Cobrar posicionamento";
  if (task.tipo === "Proposta") return "📄 Revisar/Enviar Proposta";
  if (task.tipo === "Rebalanceamento") return "📊 Montar cenário RV/RF";
  if (task.tipo === "Ligacao") return "📱 Ligar no melhor horário";
  const dias = calcularDiasDiff(task.prazo);
  if (dias === 0) return "🔥 Executar hoje";
  if (dias <= 2) return "📋 Preparar material";
  return "👁️ Acompanhar";
};

/** Prioridade inteligente (sobrescreve se score for crítico). */
const calcularPrioridadeInteligente = (task, score) => {
  if (score >= 70) return "Urgente";
  if (score >= 50) return "Alta";
  return task.prior || "Media";
};

/** Gera oportunidades automáticas a partir da base de clientes. */
const gerarSugestoes = (listaClientes = [], tarefas = []) => {
  const sugestoes = [];

  listaClientes.forEach((c) => {
    if ((c.status || "").toUpperCase() !== "ATIVO") return;

    const saldo = sv(c.d0 || c.financeiro);
    const nomeCli = c.nome || c.cliente;
    const idBase = c.id || c.conta;
    if (!nomeCli) return;

    const jaAberta = (titulo) =>
      tarefas.some(
        (t) => t.cliente === nomeCli && t.titulo === titulo && !["Concluida", "Perdida"].includes(t.status)
      );

    // 1. Saldo parado
    if (saldo > SALDO_LIMIAR_LIQUIDEZ && !jaAberta("Alocar Saldo Parado")) {
      sugestoes.push({
        id: `liq-${idBase}`,
        cliente: nomeCli,
        conta: c.conta,
        icone: "💰",
        titulo: "Alocar Saldo Parado",
        motivo: `Possui ${fB(saldo)} parados na conta.`,
        tipo: "Proposta",
        prior: "Alta",
        scoreSugerido: 80,
      });
    }

    // 2. Desalinhamento de perfil
    const isAgressivo = (c.suit || c.suitability) === "AGRESSIVO";
    const rv = c.aloc?.find(
      (a) => String(a.label).toLowerCase().includes("renda") || String(a.label).toLowerCase().includes("acoes")
    );
    const rvPct = rv ? sv(rv.pct) : 0;
    if (isAgressivo && rvPct < 0.25 && !jaAberta("Rebalanceamento Tático")) {
      sugestoes.push({
        id: `rv-${idBase}`,
        cliente: nomeCli,
        conta: c.conta,
        icone: "⚠️",
        titulo: "Rebalanceamento Tático",
        motivo: `Perfil Agressivo com sub-alocação em RV (${(rvPct * 100).toFixed(0)}%).`,
        tipo: "Rebalanceamento",
        prior: "Media",
        scoreSugerido: 65,
      });
    }

    // 3. Queda patrimonial
    const netAtual = sv(c.netM || c.net_m);
    const netAnterior = sv(c.netM1 || c.net_m1);
    if (netAtual > 0 && netAtual < netAnterior * 0.9 && !jaAberta("Queda Patrimonial (>10%)")) {
      sugestoes.push({
        id: `churn-${idBase}`,
        cliente: nomeCli,
        conta: c.conta,
        icone: "🚨",
        titulo: "Queda Patrimonial (>10%)",
        motivo: "Verificar saques recentes ou queda brusca de performance.",
        tipo: "Ligacao",
        prior: "Urgente",
        scoreSugerido: 95,
      });
    }

    // 4. Manutenção de relacionamento
    const teveContatoRecente = tarefas.some(
      (t) => t.cliente === nomeCli && calcularDiasDiff(t.dataCriacao || t.prazo) > -30
    );
    if (!teveContatoRecente && netAtual > SALDO_LIMIAR_RELACIONAMENTO && !jaAberta("Manutenção de Relacionamento")) {
      sugestoes.push({
        id: `rel-${idBase}`,
        cliente: nomeCli,
        conta: c.conta,
        icone: "🤝",
        titulo: "Manutenção de Relacionamento",
        motivo: "Cliente High Ticket sem contato registrado nos últimos 30 dias.",
        tipo: "Follow-up",
        prior: "Media",
        scoreSugerido: 50,
      });
    }
  });

  return sugestoes.sort((a, b) => b.scoreSugerido - a.scoreSugerido);
};

/* ────────────────────────────────────────────────────────────
   ESTADO INICIAL DO FORMULÁRIO
──────────────────────────────────────────────────────────── */
const formVazio = () => ({
  titulo: "",
  cliente: "",
  clienteSelect: "",   // controla o <select> separado do valor final
  conta: "",
  tipo: "Ligacao",
  prior: "Media",
  prazo: HOJE_STR,
  resp: "Leonardo Vitor",
});

/* ────────────────────────────────────────────────────────────
   COMPONENTE
──────────────────────────────────────────────────────────── */
export function Tarefas({ tarefas = [], setTarefas, listaClientes = [] }) {
  const t = useT();
  const [view, setView] = useState("lista");
  const [filtro, setFiltro] = useState("Todas");
  const [form, setForm] = useState(null);
  const [radarOpen, setRadarOpen] = useState(false);
  const [sanitizado, setSanitizado] = useState(false);

  /* ── cores por status ── */
  const stCores = useMemo(() => ({
    Criada: t.txm,
    Pendente: t.txm,
    "Em andamento": t.blue,
    "Em contato": t.amber,
    "Aguardando cliente": t.gold,
    Concluida: t.green,
    Perdida: t.txd,
    Atrasada: t.red,
  }), [t]);

  const inSt = useMemo(() => ({
    background: t.lt,
    border: `1px solid ${t.brd}`,
    borderRadius: 8,
    color: t.tx,
    padding: "8px 11px",
    fontSize: 12,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  }), [t]);

  /* ────────────────────────────────────────────────────────
     1. PERSISTÊNCIA CENTRALIZADA
  ──────────────────────────────────────────────────────── */
  const salvarDB = useCallback(async (lista) => {
    setTarefas(lista);
    await db.set("crm_tarefas", lista);
    return lista;
  }, [setTarefas]);

  /* ────────────────────────────────────────────────────────
     2. ENGINE: LIMPEZA + GESTÃO AUTOMÁTICA DE PRAZO
  ──────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!tarefas || tarefas.length === 0 || sanitizado) return;

    let mudou = false;
    let lista = validarLista(tarefas.map((x) => {
      const s = sanitizarTarefa(x);

      if (s.prazo && !["Concluida", "Perdida"].includes(s.status)) {
        const dias = calcularDiasDiff(s.prazo);
        if (dias < 0 && s.status !== "Atrasada") {
          mudou = true;
          return {
            ...s,
            status: "Atrasada",
            historico: [
              ...(s.historico || []),
              { data: new Date().toISOString(), acao: "Auto: marcada como Atrasada" },
            ],
          };
        }
      }
      return s;
    }));

    if (lista.length !== tarefas.length) mudou = true;

    setSanitizado(true);
    if (mudou) salvarDB(lista);
  }, [tarefas, sanitizado, salvarDB]);

  /* ────────────────────────────────────────────────────────
     3. ENRIQUECIMENTO COM SCORE E INTELIGÊNCIA
  ──────────────────────────────────────────────────────── */
  const clienteMap = useMemo(() => {
    const m = {};
    listaClientes.forEach((c) => {
      const nome = c.nome || c.cliente;
      if (nome) m[nome] = c;
    });
    return m;
  }, [listaClientes]);

  const tarefasEnriquecidas = useMemo(() => {
    return tarefas
      .map((task) => {
        const info = clienteMap[task.cliente] || {};
        const score = calcularScore(task, info);
        return {
          ...task,
          score,
          prioridadeInteligente: calcularPrioridadeInteligente(task, score),
          nextAction: calcularNextAction(task, score),
          impactoCli: sv(info.d0 || info.financeiro || 0) + sv(info.netM || info.net_m || 0),
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [tarefas, clienteMap]);

  /* ────────────────────────────────────────────────────────
     4. FILTROS
  ──────────────────────────────────────────────────────── */
  const listaFiltrada = useMemo(() => {
    return tarefasEnriquecidas.filter((x) => filtro === "Todas" || x.status === filtro);
  }, [tarefasEnriquecidas, filtro]);

  /* ── Agrupamento por cliente (view "cliente") ── */
  const tarefasPorCliente = useMemo(() => {
    const grupos = {};
    listaFiltrada.forEach((task) => {
      if (!grupos[task.cliente]) grupos[task.cliente] = { tarefas: [], impactoSoma: 0 };
      grupos[task.cliente].tarefas.push(task);
      grupos[task.cliente].impactoSoma += task.impactoCli || 0;
    });
    return Object.entries(grupos).sort((a, b) => b[1].impactoSoma - a[1].impactoSoma);
  }, [listaFiltrada]);

  /* ────────────────────────────────────────────────────────
     5. RADAR DE OPORTUNIDADES
  ──────────────────────────────────────────────────────── */
  const sugestoes = useMemo(() => gerarSugestoes(listaClientes, tarefas), [listaClientes, tarefas]);

  /* ────────────────────────────────────────────────────────
     6. KPIs
  ──────────────────────────────────────────────────────── */
  const kpis = useMemo(() => {
    const total = tarefas.length;
    const concluidas = tarefas.filter((x) => x.status === "Concluida").length;
    const atrasadas = tarefas.filter((x) => x.status === "Atrasada").length;
    const emFluxo = tarefas.filter((x) => ["Em andamento", "Em contato"].includes(x.status)).length;
    const pendentes = tarefas.filter((x) => ["Criada", "Pendente", "Aguardando cliente"].includes(x.status)).length;
    const taxaExec = total > 0 ? ((concluidas / total) * 100).toFixed(0) : 0;

    return [
      { l: "Produtividade", v: `${taxaExec}%`, c: parseInt(taxaExec) >= 70 ? t.green : t.txm },
      { l: "Pendentes", v: pendentes, c: t.amber },
      { l: "Em Fluxo", v: emFluxo, c: t.blue },
      { l: "Atrasadas", v: atrasadas, c: atrasadas > 0 ? t.red : t.txm },
      { l: "Concluídas", v: concluidas, c: t.green },
    ];
  }, [tarefas, t]);

  /* ────────────────────────────────────────────────────────
     7. AÇÕES MUTÁVEIS
  ──────────────────────────────────────────────────────── */
  const adicionarHistorico = useCallback((tarefa, acao) => [
    ...(tarefa.historico || []),
    { data: new Date().toISOString(), acao },
  ], []);

  const alterarStatus = useCallback(async (id, novoStatus) => {
    const upd = tarefas.map((x) =>
      x.id === id ? { ...x, status: novoStatus, historico: adicionarHistorico(x, `Status: ${novoStatus}`) } : x
    );
    salvarDB(upd);
  }, [tarefas, salvarDB, adicionarHistorico]);

  const salvar = useCallback(async () => {
    if (!form || !form.titulo.trim() || !form.cliente.trim()) return;

    const isEdicao = !!form.id;
    let upd;

    if (isEdicao) {
      upd = tarefas.map((x) =>
        x.id === form.id ? { ...form, historico: adicionarHistorico(x, "Tarefa atualizada") } : x
      );
    } else {
      const nova = {
        ...form,
        id: genId(),
        status: "Criada",
        dataCriacao: new Date().toISOString(),
        historico: [{ data: new Date().toISOString(), acao: "Tarefa criada" }],
      };
      // Remove campo de controle interno do select antes de salvar
      delete nova.clienteSelect;
      upd = [nova, ...tarefas];
    }

    await salvarDB(upd);
    setForm(null);
  }, [form, tarefas, salvarDB, adicionarHistorico]);

  const excluir = useCallback(async (id) => {
    salvarDB(tarefas.filter((x) => x.id !== id));
  }, [tarefas, salvarDB]);

  const aceitarSugestao = useCallback(async (sug) => {
    const nova = {
      id: genId(),
      titulo: sug.titulo,
      cliente: sug.cliente,
      conta: sug.conta,
      tipo: sug.tipo,
      prior: sug.prior,
      prazo: HOJE_STR,
      resp: "Leonardo Vitor",
      status: "Pendente",
      origem: "Radar",
      scoreBase: sug.scoreSugerido,
      dataCriacao: new Date().toISOString(),
      historico: [{ data: new Date().toISOString(), acao: "Criada via Radar de Oportunidades" }],
    };
    await salvarDB([nova, ...tarefas]);
    setRadarOpen(false);
  }, [tarefas, salvarDB]);

  /* ────────────────────────────────────────────────────────
     8. HANDLER DO FORMULÁRIO — CLIENTE
     Separa o valor do <select> do campo final `cliente`
     para que "Outro" abra o input manual sem conflito.
  ──────────────────────────────────────────────────────── */
  const handleClienteSelect = useCallback((e) => {
    const val = e.target.value;
    setForm((f) => ({
      ...f,
      clienteSelect: val,
      cliente: val === "Outro" ? "" : val,
    }));
  }, []);

  /* ────────────────────────────────────────────────────────
     9. RENDER
  ──────────────────────────────────────────────────────── */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10 }}>
        {kpis.map(({ l, v, c }) => (
          <Crd key={l} style={{ padding: "12px 14px", borderTop: `2px solid ${c}` }}>
            <KPI label={l} value={v} color={c} size="sm" />
          </Crd>
        ))}
      </div>

      {/* ── CONTROLES E FILTROS ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {["Todas", "Pendente", "Em andamento", "Aguardando cliente", "Concluida"].map((f) => (
            <Btn key={f} onClick={() => setFiltro(f)} outline={filtro !== f} small>
              {f}{f !== "Todas" ? ` (${tarefasEnriquecidas.filter((x) => x.status === f).length})` : ""}
            </Btn>
          ))}
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {["lista", "kanban", "cliente"].map((v) => (
            <Btn key={v} onClick={() => setView(v)} outline={view !== v} small style={{ textTransform: "capitalize" }}>
              {v}
            </Btn>
          ))}
          <Btn
            onClick={() => setRadarOpen((o) => !o)}
            outline
            style={{ borderColor: t.gold, color: t.gold, fontWeight: 600 }}
          >
            ✨ Radar {sugestoes.length > 0 && `(${sugestoes.length})`}
          </Btn>
          <Btn onClick={() => setForm(formVazio())}>+ Nova Tarefa</Btn>
        </div>
      </div>

      {/* ── RADAR DE OPORTUNIDADES ── */}
      {radarOpen && (
        <Crd style={{ border: `1px dashed ${t.gold}`, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ color: t.gold, fontWeight: 700, fontSize: 13 }}>
              ✨ Radar de Oportunidades — {sugestoes.length} sugestão(ões)
            </div>
            <button
              onClick={() => setRadarOpen(false)}
              style={{ background: "none", border: "none", color: t.txd, cursor: "pointer", fontSize: 14 }}
            >
              ✕
            </button>
          </div>

          {sugestoes.length === 0 && (
            <div style={{ color: t.txd, fontSize: 12, textAlign: "center", padding: "16px 0" }}>
              Nenhuma oportunidade detectada no momento.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sugestoes.map((s) => (
              <div
                key={s.id}
                style={{
                  background: t.mid,
                  border: `1px solid ${t.brd}`,
                  borderRadius: 8,
                  padding: "10px 12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 14 }}>{s.icone}</span>
                    <span style={{ color: t.tx, fontWeight: 700, fontSize: 12 }}>{s.titulo}</span>
                    <Bdg label={s.prior} color={s.prior === "Urgente" ? t.red : t.gold} />
                  </div>
                  <div style={{ color: t.txm, fontSize: 11 }}>
                    👤 {s.cliente} — {s.motivo}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn small onClick={() => aceitarSugestao(s)}>Criar Tarefa</Btn>
                </div>
              </div>
            ))}
          </div>
        </Crd>
      )}

      {/* ── FORMULÁRIO DE CRIAÇÃO/EDIÇÃO ── */}
      {form && (
        <Crd style={{ border: `1px solid ${t.gold}`, boxShadow: "0 4px 15px rgba(0,0,0,.1)" }}>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
            {form.id ? "Editar Tarefa" : "Nova Execução"}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>

            {/* TÍTULO */}
            <div>
              <div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Título</div>
              <input
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: Ligar para apresentar CDB..."
                style={inSt}
                autoFocus
              />
            </div>

            {/* ── CLIENTE / CONTA ── CORREÇÃO PRINCIPAL ── */}
            <div>
              <div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>
                Cliente / Conta
              </div>

              {/* Select que lista a base + opção "Outro" */}
              <select
                value={form.clienteSelect ?? form.cliente}
                onChange={handleClienteSelect}
                style={inSt}
              >
                <option value="">— Selecione na base —</option>
                {listaClientes.length === 0 && (
                  <option disabled value="">Nenhum cliente na base</option>
                )}
                {listaClientes.map((c) => {
                  const nome = c.nome || c.cliente;
                  return (
                    <option key={c.id || c.conta || nome} value={nome}>
                      {nome}
                    </option>
                  );
                })}
                <option value="Outro">Outro (Prospect / Lead)</option>
              </select>

              {/* Input manual — só aparece quando "Outro" está selecionado */}
              {form.clienteSelect === "Outro" && (
                <input
                  type="text"
                  placeholder="Digite o nome do cliente ou lead..."
                  value={form.cliente}
                  onChange={(e) => setForm((f) => ({ ...f, cliente: e.target.value }))}
                  style={{ ...inSt, marginTop: 6 }}
                  autoFocus
                />
              )}

              {/* Aviso de debug temporário — remova quando confirmar que a base carrega */}
              {listaClientes.length === 0 && (
                <div style={{ color: t.red, fontSize: 9, marginTop: 4 }}>
                  ⚠️ listaClientes está vazia — verifique a prop no componente pai.
                </div>
              )}
            </div>

            {/* AÇÃO (TIPO) */}
            <div>
              <div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Ação (Tipo)</div>
              <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))} style={inSt}>
                {TIPOS_TAREFA.map((tp) => <option key={tp}>{tp}</option>)}
              </select>
            </div>

            {/* PRAZO */}
            <div>
              <div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Prazo Limite</div>
              <input
                type="date"
                value={form.prazo}
                onChange={(e) => setForm((f) => ({ ...f, prazo: e.target.value }))}
                style={inSt}
              />
            </div>

            {/* PRIORIDADE */}
            <div>
              <div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Prioridade</div>
              <select value={form.prior} onChange={(e) => setForm((f) => ({ ...f, prior: e.target.value }))} style={inSt}>
                {PRIORIDADES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>

            {/* RESPONSÁVEL */}
            <div>
              <div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Responsável</div>
              <input
                value={form.resp}
                onChange={(e) => setForm((f) => ({ ...f, resp: e.target.value }))}
                style={inSt}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Btn
              onClick={salvar}
              disabled={!form.titulo?.trim() || !form.cliente?.trim()}
            >
              Salvar Tarefa
            </Btn>
            <Btn onClick={() => setForm(null)} outline>Cancelar</Btn>
          </div>
        </Crd>
      )}

      {/* ════════════════════════════════════
          VIEW: KANBAN
      ════════════════════════════════════ */}
      {view === "kanban" && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(200px, 1fr))",
          gap: 10,
          overflowX: "auto",
          paddingBottom: 10,
        }}>
          {STATUS_KANBAN.map((col) => {
            const colTarefas = tarefasEnriquecidas.filter((x) => x.status === col);
            return (
              <div key={col} style={{ background: t.lt, borderRadius: 10, padding: "10px 8px", minHeight: 300 }}>
                <div style={{
                  color: stCores[col],
                  fontWeight: 700,
                  fontSize: 12,
                  marginBottom: 8,
                  padding: "0 4px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <span>{col}</span>
                  <span style={{ background: t.mid, color: t.tx, borderRadius: 99, padding: "1px 8px", fontSize: 10 }}>
                    {colTarefas.length}
                  </span>
                </div>

                {colTarefas.length === 0 && (
                  <div style={{ color: t.txd, fontSize: 11, fontStyle: "italic", textAlign: "center", marginTop: 24 }}>
                    Vazio
                  </div>
                )}

                {colTarefas.map((x) => (
                  <div
                    key={x.id}
                    style={{
                      background: t.mid,
                      border: `1px solid ${t.brd}`,
                      borderRadius: 8,
                      padding: "12px",
                      marginBottom: 8,
                      borderLeft: `4px solid ${stCores[x.status] || t.gold}`,
                      boxShadow: x.score > 60 ? "0 2px 8px rgba(255,50,50,.15)" : "none",
                      transition: "transform .12s, box-shadow .12s",
                      cursor: "default",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,.25)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = x.score > 60 ? "0 2px 8px rgba(255,50,50,.15)" : "none";
                    }}
                  >
                    {/* Cabeçalho */}
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ fontSize: 9, color: t.txm, textTransform: "uppercase", fontWeight: 700, display: "flex", gap: 4 }}>
                        {x.tipo}
                        {x.origem === "Radar" && <span style={{ color: t.gold }}>✨</span>}
                      </div>
                      <div style={{ fontSize: 9, color: x.score > 50 ? t.red : t.txd, fontWeight: 700 }}>
                        ⚡ {x.score}
                      </div>
                    </div>

                    <div style={{ color: t.tx, fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{x.titulo}</div>
                    <div style={{ color: t.txm, fontSize: 11, marginBottom: 4 }}>👤 {x.cliente}</div>

                    {x.prazo && (
                      <div style={{ fontSize: 10, color: calcularDiasDiff(x.prazo) < 0 ? t.red : t.txm, marginBottom: 6 }}>
                        📅 {x.prazo} {calcularDiasDiff(x.prazo) < 0 ? "(atrasada)" : `(${calcularDiasDiff(x.prazo)}d)`}
                      </div>
                    )}

                    {/* Dica de Próxima Ação */}
                    <div style={{
                      background: t.lt, padding: "4px 6px", borderRadius: 4,
                      fontSize: 9, color: t.blue, marginBottom: 8, fontStyle: "italic",
                    }}>
                      {x.nextAction}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                      <Bdg
                        label={x.prioridadeInteligente}
                        color={x.prioridadeInteligente === "Urgente" ? t.red : t.gold}
                      />
                      <div style={{ display: "flex", gap: 4 }}>
                        <select
                          value={x.status}
                          onChange={(e) => alterarStatus(x.id, e.target.value)}
                          style={{
                            background: t.lt, border: `1px solid ${t.brd}`, color: t.tx,
                            fontSize: 9, borderRadius: 4, padding: "2px 4px", outline: "none", cursor: "pointer",
                          }}
                        >
                          {STATUS_WORKFLOW.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button
                          onClick={() => excluir(x.id)}
                          style={{ background: "none", border: "none", color: t.txd, fontSize: 11, cursor: "pointer" }}
                        >🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════
          VIEW: LISTA
      ════════════════════════════════════ */}
      {view === "lista" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {listaFiltrada.length === 0 && (
            <Crd style={{ textAlign: "center", color: t.txd, padding: 30 }}>
              Pipeline limpo. Bom trabalho. ✅
            </Crd>
          )}

          {listaFiltrada.map((x) => (
            <Crd
              key={x.id}
              style={{
                borderLeft: `4px solid ${stCores[x.status] || t.gold}`,
                padding: "12px 14px",
                opacity: x.status === "Concluida" ? 0.7 : 1,
                transition: "background .12s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = t.lt)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>

                {/* Botão toggle concluída */}
                <button
                  onClick={() => alterarStatus(x.id, x.status === "Concluida" ? "Em andamento" : "Concluida")}
                  title={x.status === "Concluida" ? "Reabrir" : "Marcar como concluída"}
                  style={{
                    width: 22, height: 22, borderRadius: "50%",
                    border: `2px solid ${x.status === "Concluida" ? t.green : t.brd}`,
                    background: x.status === "Concluida" ? t.green : "transparent",
                    cursor: "pointer", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, color: "#fff",
                  }}
                >
                  {x.status === "Concluida" ? "✓" : ""}
                </button>

                {/* Conteúdo principal */}
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ color: t.tx, fontWeight: 600, fontSize: 13 }}>{x.titulo}</span>
                    {x.origem === "Radar" && <span style={{ fontSize: 10, color: t.gold }}>✨ Auto</span>}
                  </div>
                  <div style={{ color: t.txm, fontSize: 11, marginTop: 2 }}>
                    👤 {x.cliente}
                    {x.conta ? ` · ${x.conta}` : ""}
                    {" · "}
                    {x.tipo}
                  </div>
                  <div style={{
                    marginTop: 4, fontSize: 10, color: t.blue,
                    fontStyle: "italic",
                  }}>
                    {x.nextAction}
                  </div>
                </div>

                {/* Metadados */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, minWidth: 90 }}>
                  <Bdg
                    label={x.prioridadeInteligente}
                    color={x.prioridadeInteligente === "Urgente" ? t.red : t.gold}
                  />
                  {x.prazo && (
                    <div style={{
                      fontSize: 10,
                      color: calcularDiasDiff(x.prazo) < 0 ? t.red : t.txm,
                    }}>
                      📅 {x.prazo}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: x.score > 50 ? t.red : t.txd, fontWeight: 700 }}>
                    ⚡ {x.score} pts
                  </div>
                </div>

                {/* Ações */}
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <select
                    value={x.status}
                    onChange={(e) => alterarStatus(x.id, e.target.value)}
                    style={{
                      background: t.lt, border: `1px solid ${t.brd}`, color: t.tx,
                      fontSize: 10, borderRadius: 4, padding: "4px 6px", outline: "none", cursor: "pointer",
                    }}
                  >
                    {STATUS_WORKFLOW.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button
                    onClick={() => setForm({ ...x, clienteSelect: x.cliente })}
                    style={{ background: "none", border: "none", color: t.txm, fontSize: 12, cursor: "pointer" }}
                    title="Editar"
                  >✏️</button>
                  <button
                    onClick={() => excluir(x.id)}
                    style={{ background: "none", border: "none", color: t.txd, fontSize: 12, cursor: "pointer" }}
                    title="Excluir"
                  >🗑️</button>
                </div>
              </div>
            </Crd>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════
          VIEW: POR CLIENTE
      ════════════════════════════════════ */}
      {view === "cliente" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tarefasPorCliente.length === 0 && (
            <Crd style={{ textAlign: "center", color: t.txd, padding: 30 }}>
              Nenhuma tarefa encontrada para este filtro.
            </Crd>
          )}

          {tarefasPorCliente.map(([cliente, { tarefas: tCli, impactoSoma }]) => (
            <Crd key={cliente} style={{ padding: 0, overflow: "hidden" }}>

              {/* Cabeçalho do grupo */}
              <div style={{
                background: t.lt,
                padding: "10px 14px",
                borderBottom: `1px solid ${t.brd}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <div>
                  <span style={{ color: t.tx, fontWeight: 700, fontSize: 13 }}>👤 {cliente}</span>
                  <span style={{ color: t.txm, fontSize: 11, marginLeft: 8 }}>
                    {tCli.length} tarefa(s)
                  </span>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {impactoSoma > 0 && (
                    <span style={{ color: t.gold, fontSize: 12, fontWeight: 700 }}>
                      {fB(impactoSoma)}
                    </span>
                  )}
                  <span style={{ fontSize: 10, color: t.txd }}>
                    Score máx: {Math.max(...tCli.map((t) => t.score))}
                  </span>
                </div>
              </div>

              {/* Tarefas do cliente */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {tCli.map((x, i) => (
                  <div
                    key={x.id}
                    style={{
                      padding: "10px 14px",
                      borderBottom: i < tCli.length - 1 ? `1px solid ${t.brd}` : "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                      transition: "background .12s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = t.lt)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <div
                      style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: stCores[x.status] || t.brd, flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: t.tx, fontWeight: 600, fontSize: 12 }}>{x.titulo}</div>
                      <div style={{ color: t.txm, fontSize: 10, marginTop: 2 }}>
                        {x.tipo}{x.prazo ? ` · 📅 ${x.prazo}` : ""}{" "}
                        <span style={{ fontStyle: "italic", color: t.blue }}>— {x.nextAction}</span>
                      </div>
                    </div>
                    <Bdg label={x.status} color={stCores[x.status]} />
                    <Bdg
                      label={x.prioridadeInteligente}
                      color={x.prioridadeInteligente === "Urgente" ? t.red : t.gold}
                    />
                    <div style={{ fontSize: 10, color: x.score > 50 ? t.red : t.txd, fontWeight: 700 }}>
                      ⚡ {x.score}
                    </div>
                    <select
                      value={x.status}
                      onChange={(e) => alterarStatus(x.id, e.target.value)}
                      style={{
                        background: t.lt, border: `1px solid ${t.brd}`, color: t.tx,
                        fontSize: 10, borderRadius: 4, padding: "2px 6px", outline: "none", cursor: "pointer",
                      }}
                    >
                      {STATUS_WORKFLOW.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button
                      onClick={() => excluir(x.id)}
                      style={{ background: "none", border: "none", color: t.txd, fontSize: 11, cursor: "pointer" }}
                    >🗑️</button>
                  </div>
                ))}
              </div>
            </Crd>
          ))}
        </div>
      )}
    </div>
  );
}
