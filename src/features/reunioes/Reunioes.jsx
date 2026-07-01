import { useState, useEffect, useMemo, useCallback } from "react";
import { PLANO } from "../../data/plano.js";
import { db } from "../../services/storage.js";
import { Crd, KPI, Btn } from "../../components/ui/index.js";
import { useT } from "../../theme/ThemeContext.jsx";
import { fDT } from "../../utils/formatters.js";
import { sv } from "../../utils/numbers.js";
import { AgendaIntegrada } from "../agenda/AgendaIntegrada.jsx";

/* ────────────────────────────────────────────────────────────
   CONSTANTES
──────────────────────────────────────────────────────────── */
const EQUIPE_SUGESTOES = [
  { nome: "Cleison Mendes",       email: "cleison@dominvestimentos.com.br" },
  { nome: "Leo Sasi",             email: "leosasi@dominvestimentos.com.br" },
  { nome: "Suporte Operacional",  email: "suporte@dominvestimentos.com.br" },
  { nome: "Mesa de Operações",    email: "mesa@dominvestimentos.com.br" },
];

const TIPOS_REUNIAO = [
  "Reuniao de Acompanhamento",
  "Diagnostico Inicial",
  "Proposta de Investimento",
  "Revisao de Carteira",
  "Rebalanceamento",
  "Follow-up",
  "Visita Presencial",
  "Outro",
];

// Peso por tipo (para score)
const PESO_TIPO = {
  "Proposta de Investimento": 30,
  "Diagnostico Inicial": 25,
  "Revisao de Carteira": 20,
  "Rebalanceamento": 18,
  "Reuniao de Acompanhamento": 14,
  "Visita Presencial": 16,
  "Follow-up": 10,
  "Outro": 5,
};

// Workflow completo de status
const STATUS_WORKFLOW = [
  "Agendada",
  "Confirmada",
  "Em andamento",
  "Realizada",
  "Nao realizada",
  "Reagendada",
  "Cancelada",
];

// Status finais (não devem ser movidos automaticamente)
const STATUS_FINAIS = new Set(["Realizada", "Cancelada", "Nao realizada"]);

// Limiar de patrimônio para sugestão automática (R$)
const PATRIMONIO_ALTO = 500000;
const DIAS_SEM_CONTATO = 30;

/* ────────────────────────────────────────────────────────────
   BADGE INLINE
──────────────────────────────────────────────────────────── */
function Bdg({ label, color }) {
  return (
    <span style={{
      background: `${color}22`, color, border: `1px solid ${color}55`,
      borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────
   GERADOR DE SCRIPT POWERSHELL (exportado)
──────────────────────────────────────────────────────────── */
export function gerarPS1(r) {
  const dt = new Date(r.dataHora);
  const f2 = (n) => String(n).padStart(2, "0");
  const [ano, mes, dia, h, m] = [
    dt.getFullYear(), f2(dt.getMonth() + 1), f2(dt.getDate()),
    f2(dt.getHours()), f2(dt.getMinutes()),
  ];
  const ldt = new Date(dt.getTime() - sv(r.lembrete || 30) * 60000);
  const [lh, lm] = [f2(ldt.getHours()), f2(ldt.getMinutes())];

  return `# CRM ${PLANO.escritorio} - Lembrete de Reuniao
# Gerado em: ${new Date().toLocaleString("pt-BR")}

$taskName = "CRM_${r.id}"
$trigger = New-ScheduledTaskTrigger -Once -At "${ano}-${mes}-${dia}T${lh}:${lm}:00"
$script = @'
[Windows.UI.Notifications.ToastNotificationManager,Windows.UI.Notifications,ContentType=WindowsRuntime]|Out-Null
[Windows.Data.Xml.Dom.XmlDocument,Windows.Data.Xml.Dom.XmlDocument,ContentType=WindowsRuntime]|Out-Null
$xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$xml.SelectSingleNode("//text[@id=1]").InnerText = "Reuniao em ${r.lembrete || 30}min: ${r.cliente}"
$xml.SelectSingleNode("//text[@id=2]").InnerText = "${r.tipo} | ${dia}/${mes}/${ano} ${h}:${m} | ${r.pauta || ""}"
$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("CRM Dom Investimentos").Show($toast)
'@
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -Command $script"
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DeleteExpiredTaskAfter (New-TimeSpan -Minutes 30)
Register-ScheduledTask -TaskName $taskName -Trigger $trigger -Action $action -Settings $settings -Force
Write-Host "Lembrete registrado para ${r.cliente} em ${dia}/${mes}/${ano} ${h}:${m}" -ForegroundColor Green
Write-Host "Aviso sera enviado as ${lh}:${lm} (${r.lembrete || 30} min antes)"`;
}

/* ────────────────────────────────────────────────────────────
   HELPERS PUROS
──────────────────────────────────────────────────────────── */
const genId = () => `r_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const msAte = (dataHora) => new Date(dataHora).getTime() - Date.now();

const diasDesde = (iso) => {
  if (!iso) return 999;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
};

/** Verifica se a reunião é válida para persistência */
const isReuniaoValida = (r) =>
  r &&
  typeof r === "object" &&
  r.id != null &&
  typeof r.cliente === "string" &&
  r.cliente.trim().length > 0 &&
  r.dataHora;

/** Score 0–100: quanto maior, mais prioritária */
const calcularScore = (r, clienteInfo = {}) => {
  const ms = msAte(r.dataHora);
  const patrimonio = sv(clienteInfo.netM || clienteInfo.net_m || 0);
  const saldo = sv(clienteInfo.d0 || clienteInfo.financeiro || 0);

  let score = 0;

  // Urgência temporal (até 50 pts)
  if (ms < 0 && !STATUS_FINAIS.has(r.status)) score += 50;       // atrasada
  else if (ms < 7200000) score += 40;    // < 2h
  else if (ms < 86400000) score += 28;   // < 24h
  else if (ms < 259200000) score += 14;  // < 3 dias
  else if (ms < 604800000) score += 6;   // < 7 dias

  // Tipo (até 30 pts)
  score += PESO_TIPO[r.tipo] ?? 5;

  // Impacto financeiro (até 20 pts)
  if (patrimonio > 2000000 || saldo > 200000) score += 20;
  else if (patrimonio > PATRIMONIO_ALTO || saldo > 50000) score += 10;

  // Sem pauta definida = penalidade leve
  if (!r.pauta?.trim()) score -= 5;

  // Status finais não competem por prioridade
  if (STATUS_FINAIS.has(r.status)) score = 0;

  return Math.max(0, Math.min(100, score));
};

/** Prioridade legível baseada no score */
const scoreToPrioridade = (score, status) => {
  if (STATUS_FINAIS.has(status)) return null;
  if (score >= 70) return "Urgente";
  if (score >= 45) return "Alta";
  if (score >= 20) return "Normal";
  return "Baixa";
};

/** Próxima ação sugerida */
const calcularNextAction = (r, score) => {
  if (r.status === "Nao realizada") return "📞 Tentar novo contato / Reagendar";
  if (r.status === "Reagendada") return "📋 Confirmar nova data";
  if (r.status === "Realizada") return "✅ Registrar ata / Criar follow-up";
  if (r.status === "Cancelada") return "🔁 Verificar interesse em reagendar";
  const ms = msAte(r.dataHora);
  if (ms < 0) return "⚡ Atualizar status imediatamente";
  if (ms < 7200000) return "🔥 Preparar-se — reunião em breve";
  if (ms < 86400000) return "📩 Enviar confirmação ao cliente";
  if (!r.pauta?.trim()) return "📝 Definir pauta antes da reunião";
  if (r.status === "Agendada") return "✉️ Confirmar presença do cliente";
  return "👁️ Acompanhar agenda";
};

/** Classificação de temperatura do cliente */
const calcularTemperatura = (reunioesCliente = []) => {
  const realizadas = reunioesCliente.filter((r) => r.status === "Realizada");
  const canceladas = reunioesCliente.filter((r) => r.status === "Cancelada");
  const ultima = reunioesCliente
    .filter((r) => r.status === "Realizada")
    .sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora))[0];

  const diasUltimo = ultima ? diasDesde(ultima.dataHora) : 999;

  if (diasUltimo <= 15 && realizadas.length > 0) return { label: "Quente 🔥", cor: "#ef4444" };
  if (diasUltimo <= 45 && realizadas.length > 0) return { label: "Morno 🌡️", cor: "#f59e0b" };
  if (canceladas.length > realizadas.length)     return { label: "Evasivo ⚠️", cor: "#a855f7" };
  return { label: "Frio 🧊", cor: "#64748b" };
};

/* ────────────────────────────────────────────────────────────
   SUGESTÕES AUTOMÁTICAS
──────────────────────────────────────────────────────────── */
const gerarSugestoesReunioes = (listaClientes = [], reunioes = []) => {
  const sugestoes = [];

  listaClientes.forEach((c) => {
    if ((c.status || "").toUpperCase() !== "ATIVO") return;

    const nome = c.nome || c.cliente;
    if (!nome) return;

    const reunioesCliente = reunioes.filter((r) => r.cliente === nome);
    const temAberta = reunioesCliente.some((r) => !STATUS_FINAIS.has(r.status));
    if (temAberta) return; // já tem reunião aberta, não sugerir duplicata

    const ultimaRealizada = reunioesCliente
      .filter((r) => r.status === "Realizada")
      .sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora))[0];

    const diasSemContato = ultimaRealizada ? diasDesde(ultimaRealizada.dataHora) : 999;
    const patrimonio = sv(c.netM || c.net_m || 0);
    const saldo = sv(c.d0 || c.financeiro || 0);
    const idBase = c.id || c.conta;

    // 1. Alto patrimônio sem contato recente
    if (patrimonio > PATRIMONIO_ALTO && diasSemContato > DIAS_SEM_CONTATO) {
      sugestoes.push({
        id: `hp-${idBase}`,
        cliente: nome,
        icone: "💎",
        titulo: "Revisao de Carteira",
        motivo: `Alto patrimônio (${Math.round(diasSemContato)}d sem contato).`,
        tipo: "Revisao de Carteira",
        prioridade: "Alta",
        score: 75,
      });
      return;
    }

    // 2. Saldo parado significativo
    if (saldo > 50000 && diasSemContato > 20) {
      sugestoes.push({
        id: `saldo-${idBase}`,
        cliente: nome,
        icone: "💰",
        titulo: "Proposta de Investimento",
        motivo: `Saldo disponível sem alocação (${Math.round(diasSemContato)}d sem reunião).`,
        tipo: "Proposta de Investimento",
        prioridade: "Alta",
        score: 70,
      });
      return;
    }

    // 3. Perfil agressivo com baixa RV
    const isAgressivo = (c.suit || c.suitability) === "AGRESSIVO";
    const rv = c.aloc?.find((a) =>
      String(a.label).toLowerCase().includes("renda") ||
      String(a.label).toLowerCase().includes("acoes")
    );
    if (isAgressivo && sv(rv?.pct) < 0.25) {
      sugestoes.push({
        id: `rv-${idBase}`,
        cliente: nome,
        icone: "⚠️",
        titulo: "Rebalanceamento",
        motivo: "Perfil Agressivo com baixa exposição em RV.",
        tipo: "Rebalanceamento",
        prioridade: "Media",
        score: 60,
      });
      return;
    }

    // 4. Sem contato há muito tempo
    if (diasSemContato > 60 && patrimonio > 0) {
      sugestoes.push({
        id: `rel-${idBase}`,
        cliente: nome,
        icone: "🤝",
        titulo: "Manutencao de Relacionamento",
        motivo: `Sem reunião realizada há ${Math.round(diasSemContato)} dias.`,
        tipo: "Reuniao de Acompanhamento",
        prioridade: "Media",
        score: 45,
      });
    }
  });

  return sugestoes.sort((a, b) => b.score - a.score);
};

/* ────────────────────────────────────────────────────────────
   KPIs
──────────────────────────────────────────────────────────── */
const calcularKPIs = (reunioes, t) => {
  const total = reunioes.length;
  const realizadas = reunioes.filter((r) => r.status === "Realizada").length;
  const canceladas = reunioes.filter((r) => r.status === "Cancelada").length;
  const atrasadas = reunioes.filter(
    (r) => !STATUS_FINAIS.has(r.status) && msAte(r.dataHora) < 0
  ).length;

  const hoje = new Date();
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() - hoje.getDay());
  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 6);

  const semana = reunioes.filter((r) => {
    const d = new Date(r.dataHora);
    return d >= inicioSemana && d <= fimSemana;
  }).length;

  const finalizadas = realizadas + canceladas;
  const taxaComp = finalizadas > 0 ? ((realizadas / finalizadas) * 100).toFixed(0) : 0;

  return [
    { l: "Comparecimento", v: `${taxaComp}%`, c: parseInt(taxaComp) >= 70 ? t.green : t.amber },
    { l: "Esta Semana",    v: semana,          c: t.blue },
    { l: "Realizadas",     v: realizadas,       c: t.green },
    { l: "Atrasadas",      v: atrasadas,        c: atrasadas > 0 ? t.red : t.txm },
    { l: "Total",          v: total,            c: t.txm },
  ];
};

/* ────────────────────────────────────────────────────────────
   FORM PADRÃO
──────────────────────────────────────────────────────────── */
const formPadrao = () => ({
  cliente: "",
  clienteSelect: "",
  emailCliente: "",
  assessor: "Leonardo Vitor",
  emailAssessor: "leonardo.vitor@dominvestimentos.com.br",
  tipo: TIPOS_REUNIAO[0],
  dataHora: "",
  pauta: "",
  link: "",
  participantes: [],   // array estruturado: [{nome, email}]
  lembrete: 30,
  status: "Agendada",
});

/* ════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
════════════════════════════════════════════════════════════ */
export function Reunioes({ reunioes = [], setReunioes, listaClientes = [] }) {
  const t = useT();
  const [form, setForm] = useState(null);
  const [filtro, setFiltro] = useState("Todas");
  const [ps1, setPs1] = useState(null);
  const [radarOpen, setRadarOpen] = useState(false);
  const [showSugestoes, setShowSugestoes] = useState(false);
  const [view, setView] = useState("lista");      // lista | cliente
  const [sanitizado, setSanitizado] = useState(false);

  const agora = Date.now();

  const inSt = useMemo(() => ({
    background: t.lt, border: `1px solid ${t.brd}`, borderRadius: 8,
    color: t.tx, padding: "8px 11px", fontSize: 12, outline: "none",
    width: "100%", boxSizing: "border-box",
  }), [t]);

  /* ── cores por status ── */
  const corStatus = useCallback((status) => {
    if (status === "Realizada")        return t.green;
    if (status === "Cancelada")        return t.red;
    if (status === "Nao realizada")    return t.red;
    if (status === "Confirmada")       return t.blue;
    if (status === "Em andamento")     return t.blue;
    if (status === "Reagendada")       return t.purple;
    return t.amber;
  }, [t]);

  /* ── mapa rápido de clientes ── */
  const clienteMap = useMemo(() => {
    const m = {};
    listaClientes.forEach((c) => {
      const nome = c.nome || c.cliente;
      if (nome) m[nome] = c;
    });
    return m;
  }, [listaClientes]);

  /* ────────────────────────────────────────────────────────
     PERSISTÊNCIA CENTRALIZADA
  ──────────────────────────────────────────────────────── */
  const salvarDB = useCallback(async (lista) => {
    setReunioes(lista);
    await db.set("crm_reunioes", lista);
    return lista;
  }, [setReunioes]);

  /* ────────────────────────────────────────────────────────
     ENGINE: LIMPEZA + GESTÃO AUTOMÁTICA DE STATUS
  ──────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!reunioes || reunioes.length === 0 || sanitizado) return;

    let mudou = false;

    // 1. Remove registros inválidos
    let lista = reunioes.filter((r) => {
      if (!isReuniaoValida(r)) { mudou = true; return false; }
      return true;
    });

    // 2. Marca reuniões vencidas como "Atrasadas" (sem sobrescrever status finais)
    lista = lista.map((r) => {
      if (!STATUS_FINAIS.has(r.status) && r.status !== "Reagendada" && msAte(r.dataHora) < 0) {
        if (r.status !== "Atrasada") {
          mudou = true;
          return {
            ...r,
            status: "Atrasada",
            historico: [
              ...(r.historico || []),
              { data: new Date().toISOString(), acao: "Auto: marcada como Atrasada" },
            ],
          };
        }
      }
      return r;
    });

    setSanitizado(true);
    if (mudou) salvarDB(lista);
  }, [reunioes, sanitizado, salvarDB]);

  /* ────────────────────────────────────────────────────────
     ENRIQUECIMENTO COM SCORE (derived state)
  ──────────────────────────────────────────────────────── */
  const reunioesEnriquecidas = useMemo(() => {
    return reunioes.map((r) => {
      const info = clienteMap[r.cliente] || {};
      const score = calcularScore(r, info);
      return {
        ...r,
        score,
        prioridade: scoreToPrioridade(score, r.status),
        nextAction: calcularNextAction(r, score),
        patrimonio: sv(info.netM || info.net_m || 0),
      };
    }).sort((a, b) => {
      // Finalizadas vão para o fim; demais ordenam por data
      const aFinal = STATUS_FINAIS.has(a.status) ? 1 : 0;
      const bFinal = STATUS_FINAIS.has(b.status) ? 1 : 0;
      if (aFinal !== bFinal) return aFinal - bFinal;
      return new Date(a.dataHora) - new Date(b.dataHora);
    });
  }, [reunioes, clienteMap]);

  /* ── filtros ── */
  const listaFiltrada = useMemo(() => {
    return reunioesEnriquecidas.filter((r) =>
      filtro === "Todas" || r.status === filtro
    );
  }, [reunioesEnriquecidas, filtro]);

  /* ── alertas ── */
  const alertas = useMemo(() => ({
    h2:  reunioesEnriquecidas.filter((r) => !STATUS_FINAIS.has(r.status) && msAte(r.dataHora) > 0 && msAte(r.dataHora) < 7200000),
    h24: reunioesEnriquecidas.filter((r) => !STATUS_FINAIS.has(r.status) && msAte(r.dataHora) > 7200000 && msAte(r.dataHora) < 86400000),
    atrasadas: reunioesEnriquecidas.filter((r) => r.status === "Atrasada"),
  }), [reunioesEnriquecidas]);

  /* ── KPIs ── */
  const kpis = useMemo(() => calcularKPIs(reunioes, t), [reunioes, t]);

  /* ── sugestões automáticas ── */
  const sugestoes = useMemo(
    () => gerarSugestoesReunioes(listaClientes, reunioes),
    [listaClientes, reunioes]
  );

  /* ── agrupamento por cliente ── */
  const porCliente = useMemo(() => {
    const grupos = {};
    listaFiltrada.forEach((r) => {
      if (!grupos[r.cliente]) grupos[r.cliente] = [];
      grupos[r.cliente].push(r);
    });
    return Object.entries(grupos).sort(
      (a, b) => Math.max(...b[1].map((r) => r.score)) - Math.max(...a[1].map((r) => r.score))
    );
  }, [listaFiltrada]);

  /* ────────────────────────────────────────────────────────
     AÇÕES
  ──────────────────────────────────────────────────────── */
  const addHistorico = useCallback((reuniao, acao) => [
    ...(reuniao.historico || []),
    { data: new Date().toISOString(), acao },
  ], []);

  const mudar = useCallback(async (id, novoStatus) => {
    const upd = reunioes.map((r) =>
      r.id === id
        ? { ...r, status: novoStatus, historico: addHistorico(r, `Status: ${novoStatus}`) }
        : r
    );
    salvarDB(upd);
  }, [reunioes, salvarDB, addHistorico]);

  const excluir = useCallback(async (id) => {
    salvarDB(reunioes.filter((r) => r.id !== id));
  }, [reunioes, salvarDB]);

  const salvar = useCallback(async () => {
    if (!form || !form.cliente?.trim() || !form.dataHora) return;

    const clienteInfo = clienteMap[form.cliente] || {};
    const isEdicao = !!form.id;

    if (isEdicao) {
      const upd = reunioes.map((r) =>
        r.id === form.id
          ? { ...form, historico: addHistorico(r, "Reunião atualizada") }
          : r
      );
      await salvarDB(upd);
    } else {
      const nova = {
        ...form,
        id: genId(),
        clienteId: clienteInfo.conta || "",
        criadaEm: new Date().toISOString(),
        historico: [{ data: new Date().toISOString(), acao: "Reunião criada" }],
        pauta: form.pauta || "",
        link: form.link || "",
      };
      // Remove campo de controle interno do select
      delete nova.clienteSelect;
      await salvarDB([nova, ...reunioes]);
    }

    setForm(null);
  }, [form, reunioes, clienteMap, salvarDB, addHistorico]);

  const aceitarSugestao = useCallback(async (sug) => {
    const nova = {
      id: genId(),
      cliente: sug.cliente,
      clienteSelect: "",
      emailCliente: clienteMap[sug.cliente]?.email || "",
      assessor: "Leonardo Vitor",
      emailAssessor: "leonardo.vitor@dominvestimentos.com.br",
      tipo: sug.tipo,
      dataHora: "",           // assessor vai preencher
      pauta: sug.motivo,
      link: "",
      participantes: [],
      lembrete: 30,
      status: "Agendada",
      origem: "Radar",
      criadaEm: new Date().toISOString(),
      historico: [{ data: new Date().toISOString(), acao: "Criada via Radar de Reuniões" }],
    };
    await salvarDB([nova, ...reunioes]);
    setRadarOpen(false);
  }, [reunioes, clienteMap, salvarDB]);

  const baixar = useCallback((r) => {
    const bl = new Blob([gerarPS1(r)], { type: "text/plain" });
    const u = URL.createObjectURL(bl);
    const a = document.createElement("a");
    a.href = u;
    a.download = `lembrete_${r.id}.ps1`;
    a.click();
    URL.revokeObjectURL(u);
  }, []);

  /* ── handler do select de cliente ── */
  const handleClienteSelect = useCallback((e) => {
    const val = e.target.value;
    const info = clienteMap[val] || {};
    setForm((f) => ({
      ...f,
      clienteSelect: val,
      cliente: val === "Outro" ? "" : val,
      emailCliente: info.email || f.emailCliente || "",
    }));
  }, [clienteMap]);

  /* ── adicionar participante estruturado ── */
  const addParticipante = useCallback((nome, email) => {
    setForm((f) => ({
      ...f,
      participantes: [...(f.participantes || []), { nome, email }],
    }));
  }, []);

  const removeParticipante = useCallback((idx) => {
    setForm((f) => ({
      ...f,
      participantes: (f.participantes || []).filter((_, i) => i !== idx),
    }));
  }, []);

  /* ────────────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────────────── */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10 }}>
        {kpis.map(({ l, v, c }) => (
          <Crd key={l} style={{ padding: "12px 14px", borderTop: `2px solid ${c}` }}>
            <KPI label={l} value={v} color={c} size="sm" />
          </Crd>
        ))}
      </div>

      {/* ── AGENDA INTEGRADA ── */}
      <AgendaIntegrada />

      {/* ── ALERTAS: 2H ── */}
      {alertas.h2.length > 0 && (
        <div style={{ background: `${t.red}15`, border: `1px solid ${t.red}44`, borderRadius: 10, padding: "12px 16px" }}>
          <div style={{ color: t.red, fontWeight: 700, fontSize: 12, marginBottom: 6 }}>
            🔥 Reuniões em menos de 2 horas!
          </div>
          {alertas.h2.map((r) => (
            <div key={r.id} style={{ color: t.tx, fontSize: 12, marginBottom: 3 }}>
              ⚡ <strong>{r.cliente}</strong> — {fDT(r.dataHora)} · {r.tipo}
            </div>
          ))}
        </div>
      )}

      {/* ── ALERTAS: 24H ── */}
      {alertas.h24.length > 0 && (
        <div style={{ background: `${t.amber}15`, border: `1px solid ${t.amber}44`, borderRadius: 10, padding: "12px 16px" }}>
          <div style={{ color: t.amber, fontWeight: 700, fontSize: 12, marginBottom: 6 }}>
            ⏰ Reuniões nas próximas 24 horas
          </div>
          {alertas.h24.map((r) => (
            <div key={r.id} style={{ color: t.tx, fontSize: 12, marginBottom: 3 }}>
              🔔 {r.cliente} — {fDT(r.dataHora)} · {r.tipo}
            </div>
          ))}
        </div>
      )}

      {/* ── ALERTAS: ATRASADAS ── */}
      {alertas.atrasadas.length > 0 && (
        <div style={{ background: `${t.red}10`, border: `1px solid ${t.red}33`, borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ color: t.red, fontWeight: 700, fontSize: 11 }}>
            ⚠️ {alertas.atrasadas.length} reunião(ões) sem status atualizado. Resolva agora.
          </div>
        </div>
      )}

      {/* ── CONTROLES ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {["Todas", "Agendada", "Confirmada", "Em andamento", "Realizada", "Cancelada"].map((f) => (
            <Btn key={f} onClick={() => setFiltro(f)} outline={filtro !== f} small>
              {f}{f !== "Todas" ? ` (${reunioesEnriquecidas.filter((r) => r.status === f).length})` : ""}
            </Btn>
          ))}
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {["lista", "cliente"].map((v) => (
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
          <Btn onClick={() => setForm(formPadrao())}>+ Nova Reuniao</Btn>
        </div>
      </div>

      {/* ── RADAR DE SUGESTÕES ── */}
      {radarOpen && (
        <Crd style={{ border: `1px dashed ${t.gold}`, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ color: t.gold, fontWeight: 700, fontSize: 13 }}>
              ✨ Radar de Relacionamento — {sugestoes.length} sugestão(ões)
            </div>
            <button onClick={() => setRadarOpen(false)} style={{ background: "none", border: "none", color: t.txd, cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>

          {sugestoes.length === 0 && (
            <div style={{ color: t.txd, fontSize: 12, textAlign: "center", padding: "16px 0" }}>
              Todos os clientes ativos possuem reuniões recentes. ✅
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sugestoes.map((s) => (
              <div
                key={s.id}
                style={{
                  background: t.mid, border: `1px solid ${t.brd}`,
                  borderRadius: 8, padding: "10px 12px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  gap: 10, flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 14 }}>{s.icone}</span>
                    <span style={{ color: t.tx, fontWeight: 700, fontSize: 12 }}>{s.titulo}</span>
                    <Bdg label={s.prioridade} color={s.prioridade === "Alta" ? t.red : t.gold} />
                  </div>
                  <div style={{ color: t.txm, fontSize: 11 }}>👤 {s.cliente} — {s.motivo}</div>
                </div>
                <Btn small onClick={() => aceitarSugestao(s)}>Agendar</Btn>
              </div>
            ))}
          </div>
        </Crd>
      )}

      {/* ── FORMULÁRIO ── */}
      {form && (
        <Crd style={{ border: `1px solid ${t.gold}`, boxShadow: "0 4px 15px rgba(0,0,0,.1)" }}>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
            {form.id ? "Editar Reunião" : "Nova Reuniao"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>

            {/* CLIENTE */}
            <div>
              <div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Cliente</div>
              <select
                value={form.clienteSelect ?? (listaClientes.some((c) => (c.nome || c.cliente) === form.cliente) ? form.cliente : "")}
                onChange={handleClienteSelect}
                style={inSt}
              >
                <option value="">— Selecione na base —</option>
                {listaClientes.map((c) => {
                  const nome = c.nome || c.cliente;
                  return <option key={c.id || c.conta || nome} value={nome}>{nome}</option>;
                })}
                <option value="Outro">Outro (Prospect/Lead)</option>
              </select>
              {(form.clienteSelect === "Outro" || (!listaClientes.some((c) => (c.nome || c.cliente) === form.cliente) && form.cliente !== "")) && (
                <input
                  type="text"
                  placeholder="Digite o nome..."
                  value={form.cliente}
                  onChange={(e) => setForm((f) => ({ ...f, cliente: e.target.value }))}
                  style={{ ...inSt, marginTop: 6 }}
                  autoFocus
                />
              )}
              {listaClientes.length === 0 && (
                <div style={{ color: t.red, fontSize: 9, marginTop: 4 }}>
                  ⚠️ Base de clientes vazia — verifique a prop listaClientes.
                </div>
              )}
            </div>

            {/* EMAIL CLIENTE */}
            <div>
              <div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Email do Cliente</div>
              <input type="email" value={form.emailCliente} onChange={(e) => setForm((f) => ({ ...f, emailCliente: e.target.value }))} placeholder="cliente@email.com" style={inSt} />
            </div>

            {/* ASSESSOR */}
            <div>
              <div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Assessor</div>
              <input value={form.assessor} onChange={(e) => setForm((f) => ({ ...f, assessor: e.target.value }))} style={inSt} />
            </div>

            {/* EMAIL ASSESSOR */}
            <div>
              <div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Email do Assessor</div>
              <input type="email" value={form.emailAssessor} onChange={(e) => setForm((f) => ({ ...f, emailAssessor: e.target.value }))} style={inSt} />
            </div>

            {/* TIPO */}
            <div>
              <div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Tipo</div>
              <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))} style={inSt}>
                {TIPOS_REUNIAO.map((tp) => <option key={tp}>{tp}</option>)}
              </select>
            </div>

            {/* DATA E HORA */}
            <div>
              <div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Data e Hora</div>
              <input type="datetime-local" value={form.dataHora} onChange={(e) => setForm((f) => ({ ...f, dataHora: e.target.value }))} style={inSt} />
            </div>

            {/* LEMBRETE */}
            <div>
              <div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Lembrete</div>
              <select value={form.lembrete} onChange={(e) => setForm((f) => ({ ...f, lembrete: parseInt(e.target.value) }))} style={inSt}>
                {[5, 10, 15, 30, 60, 120, 1440].map((m) => (
                  <option key={m} value={m}>{m >= 60 ? `${m / 60}h antes` : `${m}min antes`}</option>
                ))}
              </select>
            </div>

            {/* STATUS */}
            <div>
              <div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Status</div>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} style={inSt}>
                {STATUS_WORKFLOW.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>

            {/* LINK */}
            <div>
              <div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Link</div>
              <input value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} placeholder="https://teams..." style={inSt} />
            </div>

            {/* PARTICIPANTES ESTRUTURADOS */}
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>
                Participantes
              </div>

              {/* Lista de participantes já adicionados */}
              {(form.participantes || []).length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {(form.participantes || []).map((p, i) => (
                    <div key={i} style={{
                      background: t.lt, border: `1px solid ${t.brd}`,
                      borderRadius: 6, padding: "3px 8px", fontSize: 11,
                      display: "flex", gap: 6, alignItems: "center",
                    }}>
                      <span style={{ color: t.tx }}>{p.nome}</span>
                      {p.email && <span style={{ color: t.txm }}>({p.email})</span>}
                      <button
                        onClick={() => removeParticipante(i)}
                        style={{ background: "none", border: "none", color: t.red, cursor: "pointer", fontSize: 11, padding: 0 }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Sugestões de equipe */}
              <div style={{ position: "relative" }}>
                <input
                  placeholder="Buscar ou digitar participante..."
                  onFocus={() => setShowSugestoes(true)}
                  onBlur={() => setTimeout(() => setShowSugestoes(false), 200)}
                  style={inSt}
                />
                {showSugestoes && (
                  <div style={{
                    position: "absolute", top: "100%", left: 0, right: 0,
                    background: t.mid, border: `1px solid ${t.gold}`,
                    borderRadius: 8, zIndex: 10, maxHeight: 160, overflowY: "auto",
                    marginTop: 4, boxShadow: "0 6px 16px rgba(0,0,0,.4)",
                  }}>
                    <div style={{ padding: "6px 10px", fontSize: 10, color: t.gold, borderBottom: `1px solid ${t.brd}`, fontWeight: 700, textTransform: "uppercase" }}>
                      Equipe Dom Investimentos
                    </div>
                    {EQUIPE_SUGESTOES.map((s) => (
                      <div
                        key={s.email}
                        onMouseDown={() => addParticipante(s.nome, s.email)}
                        style={{
                          padding: "8px 10px", cursor: "pointer",
                          display: "flex", flexDirection: "column",
                          borderBottom: `1px solid ${t.brd}33`,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = t.lt)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <span style={{ color: t.tx, fontSize: 11, fontWeight: 600 }}>{s.nome}</span>
                        <span style={{ color: t.txm, fontSize: 10 }}>{s.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PAUTA */}
          <div style={{ marginTop: 10 }}>
            <div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Pauta</div>
            <textarea
              value={form.pauta}
              onChange={(e) => setForm((f) => ({ ...f, pauta: e.target.value }))}
              rows={2}
              placeholder="Tópicos a discutir..."
              style={{ ...inSt, resize: "vertical" }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Btn onClick={salvar} disabled={!form.cliente?.trim() || !form.dataHora}>
              {form.id ? "Atualizar" : "Salvar"}
            </Btn>
            <Btn onClick={() => setForm(null)} outline>Cancelar</Btn>
          </div>
        </Crd>
      )}

      {/* ════════════════════════════════════
          VIEW: LISTA
      ════════════════════════════════════ */}
      {view === "lista" && (
        <>
          {listaFiltrada.length === 0 && (
            <Crd style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 34, marginBottom: 8 }}>📅</div>
              <div style={{ color: t.tx, fontWeight: 600, fontSize: 14 }}>Nenhuma reuniao agendada</div>
            </Crd>
          )}

          {listaFiltrada.map((r) => {
            const atrasada = r.status === "Atrasada";
            const hoje = msAte(r.dataHora) > 0 && msAte(r.dataHora) < 86400000;
            const muitoProxima = msAte(r.dataHora) > 0 && msAte(r.dataHora) < 7200000;
            const bc = r.status === "Realizada" ? t.green
              : r.status === "Cancelada" || r.status === "Nao realizada" ? t.red
              : r.status === "Reagendada" ? t.purple
              : atrasada ? t.red
              : muitoProxima ? t.red
              : hoje ? t.amber
              : t.blue;

            const participantesStr = Array.isArray(r.participantes)
              ? r.participantes.map((p) => `${p.nome}${p.email ? ` <${p.email}>` : ""}`).join(", ")
              : r.participantes || "";

            return (
              <Crd key={r.id} style={{ borderLeft: `3px solid ${bc}`, padding: "12px 16px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>

                    {/* Cabeçalho */}
                    <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ color: t.tx, fontWeight: 700, fontSize: 14 }}>{r.cliente}</span>
                      <Bdg label={r.status} color={corStatus(r.status)} />
                      {r.prioridade && (
                        <Bdg
                          label={r.prioridade}
                          color={r.prioridade === "Urgente" ? t.red : r.prioridade === "Alta" ? t.amber : t.txm}
                        />
                      )}
                      {r.origem === "Radar" && <span style={{ fontSize: 9, color: t.gold }}>✨ Auto</span>}
                      {atrasada && <span style={{ color: t.red, fontSize: 10, fontWeight: 700 }}>⚠️ Vencida</span>}
                      {muitoProxima && <span style={{ color: t.red, fontSize: 10, fontWeight: 700 }}>🔥 &lt;2h</span>}
                      {hoje && !muitoProxima && <span style={{ color: t.amber, fontSize: 10, fontWeight: 700 }}>⏰ Hoje</span>}
                    </div>

                    {/* Tipo + Assessor */}
                    <div style={{ color: t.txm, fontSize: 11, marginBottom: 2 }}>
                      📋 {r.tipo} · {r.assessor}{r.emailAssessor ? ` (${r.emailAssessor})` : ""}
                    </div>

                    {r.emailCliente && (
                      <div style={{ color: t.txm, fontSize: 11, marginBottom: 2 }}>📧 {r.emailCliente}</div>
                    )}

                    {/* Data */}
                    <div style={{ color: t.gold, fontSize: 12, fontWeight: 700, marginBottom: 2 }}>
                      🕐 {r.dataHora ? fDT(r.dataHora) : <span style={{ color: t.red }}>Data não definida</span>}
                      <span style={{ color: t.txd, fontWeight: 400, fontSize: 10, marginLeft: 6 }}>
                        ({r.lembrete || 30}min antes)
                      </span>
                    </div>

                    {r.link && (
                      <div style={{ fontSize: 11, marginBottom: 2 }}>
                        🔗 <a href={r.link} target="_blank" rel="noreferrer" style={{ color: t.blue }}>Link da reuniao</a>
                      </div>
                    )}

                    {participantesStr && (
                      <div style={{ color: t.txd, fontSize: 11, marginBottom: 2 }}>👥 {participantesStr}</div>
                    )}

                    {r.pauta && (
                      <div style={{ color: t.txd, fontSize: 11, fontStyle: "italic", marginBottom: 4 }}>"{r.pauta}"</div>
                    )}

                    {/* Score e próxima ação */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <span style={{ fontSize: 9, color: r.score > 50 ? t.red : t.txd, fontWeight: 700 }}>⚡ {r.score} pts</span>
                      <span style={{ fontSize: 10, color: t.blue, fontStyle: "italic" }}>{r.nextAction}</span>
                    </div>
                  </div>

                  {/* AÇÕES */}
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                    <Btn onClick={() => setPs1(ps1 === r.id ? null : r.id)} outline small color={t.blue}>🪟 Script</Btn>
                    <Btn onClick={() => baixar(r)} outline small color={t.purple}>⬇️ .ps1</Btn>

                    {!STATUS_FINAIS.has(r.status) && r.status !== "Confirmada" && (
                      <Btn onClick={() => mudar(r.id, "Confirmada")} outline small color={t.green}>Confirmar</Btn>
                    )}
                    {["Agendada", "Confirmada", "Em andamento"].includes(r.status) && (
                      <Btn onClick={() => mudar(r.id, "Em andamento")} outline small color={t.blue}>▶ Iniciar</Btn>
                    )}
                    {["Agendada", "Confirmada", "Em andamento", "Atrasada"].includes(r.status) && (
                      <Btn onClick={() => mudar(r.id, "Realizada")} outline small color={t.green}>✅ Realizada</Btn>
                    )}
                    {!STATUS_FINAIS.has(r.status) && (
                      <Btn onClick={() => mudar(r.id, "Nao realizada")} outline small color={t.amber}>⬜ Faltou</Btn>
                    )}
                    {!STATUS_FINAIS.has(r.status) && r.status !== "Reagendada" && (
                      <Btn onClick={() => mudar(r.id, "Reagendada")} outline small color={t.purple}>🔁 Reagendar</Btn>
                    )}
                    {r.status !== "Cancelada" && (
                      <Btn onClick={() => mudar(r.id, "Cancelada")} outline small color={t.red}>Cancelar</Btn>
                    )}
                    <button
                      onClick={() => setForm({ ...r, clienteSelect: r.cliente })}
                      style={{ background: "none", border: "none", color: t.txm, fontSize: 13, cursor: "pointer" }}
                      title="Editar"
                    >✏️</button>
                    <button
                      onClick={() => excluir(r.id)}
                      style={{ background: "none", border: "none", color: t.txd, fontSize: 13, cursor: "pointer" }}
                      title="Excluir"
                    >🗑️</button>
                  </div>
                </div>

                {/* SCRIPT POWERSHELL */}
                {ps1 === r.id && (
                  <div style={{ marginTop: 10, background: t.bg, borderRadius: 8, padding: 12, border: `1px solid ${t.brd}` }}>
                    <div style={{ color: t.txm, fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>
                      Script PowerShell — Task Scheduler Windows
                    </div>
                    <pre style={{ color: t.green, fontSize: 9, margin: 0, overflowX: "auto", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {gerarPS1(r)}
                    </pre>
                    <div style={{ color: t.txd, fontSize: 10, marginTop: 6 }}>
                      Execute como Administrador no PowerShell. Notificação nativa do Windows.
                    </div>
                  </div>
                )}
              </Crd>
            );
          })}
        </>
      )}

      {/* ════════════════════════════════════
          VIEW: POR CLIENTE
      ════════════════════════════════════ */}
      {view === "cliente" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {porCliente.length === 0 && (
            <Crd style={{ textAlign: "center", color: t.txd, padding: 30 }}>Nenhuma reunião encontrada.</Crd>
          )}

          {porCliente.map(([cliente, grupoReunioes]) => {
            const temp = calcularTemperatura(grupoReunioes);
            const maxScore = Math.max(...grupoReunioes.map((r) => r.score));
            const realizadas = grupoReunioes.filter((r) => r.status === "Realizada").length;

            return (
              <Crd key={cliente} style={{ padding: 0, overflow: "hidden" }}>
                {/* Cabeçalho do grupo */}
                <div style={{
                  background: t.lt, padding: "10px 14px",
                  borderBottom: `1px solid ${t.brd}`,
                  display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: t.tx, fontWeight: 700, fontSize: 13 }}>👤 {cliente}</span>
                    <Bdg label={temp.label} color={temp.cor} />
                  </div>
                  <div style={{ display: "flex", gap: 10, fontSize: 11, color: t.txm }}>
                    <span>{grupoReunioes.length} reunião(ões)</span>
                    <span style={{ color: t.green }}>{realizadas} realizada(s)</span>
                    <span style={{ color: maxScore > 50 ? t.red : t.txd, fontWeight: 700 }}>⚡ {maxScore}</span>
                  </div>
                </div>

                {/* Reuniões do cliente */}
                {grupoReunioes.map((r, i) => (
                  <div
                    key={r.id}
                    style={{
                      padding: "10px 14px",
                      borderBottom: i < grupoReunioes.length - 1 ? `1px solid ${t.brd}` : "none",
                      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                      transition: "background .12s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = t.lt)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: corStatus(r.status), flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: t.tx, fontWeight: 600, fontSize: 12 }}>{r.tipo}</div>
                      <div style={{ color: t.txm, fontSize: 10, marginTop: 2 }}>
                        {r.dataHora ? fDT(r.dataHora) : "Data não definida"}
                        {" · "}
                        <span style={{ fontStyle: "italic", color: t.blue }}>{r.nextAction}</span>
                      </div>
                    </div>
                    <Bdg label={r.status} color={corStatus(r.status)} />
                    {r.prioridade && (
                      <Bdg label={r.prioridade} color={r.prioridade === "Urgente" ? t.red : t.gold} />
                    )}
                    <span style={{ fontSize: 10, color: r.score > 50 ? t.red : t.txd, fontWeight: 700 }}>⚡ {r.score}</span>

                    <div style={{ display: "flex", gap: 4 }}>
                      {["Agendada", "Confirmada", "Em andamento", "Atrasada"].includes(r.status) && (
                        <Btn onClick={() => mudar(r.id, "Realizada")} outline small color={t.green}>✅</Btn>
                      )}
                      {!STATUS_FINAIS.has(r.status) && (
                        <Btn onClick={() => mudar(r.id, "Nao realizada")} outline small color={t.amber}>⬜</Btn>
                      )}
                      <button
                        onClick={() => excluir(r.id)}
                        style={{ background: "none", border: "none", color: t.txd, fontSize: 11, cursor: "pointer" }}
                      >🗑️</button>
                    </div>
                  </div>
                ))}
              </Crd>
            );
          })}
        </div>
      )}
    </div>
  );
}
