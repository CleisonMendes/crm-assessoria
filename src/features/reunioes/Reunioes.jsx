import { useState, useEffect } from "react";

import { PLANO } from "../../data/plano.js";
import { db } from "../../services/storage.js";
import { Crd, KPI, Btn } from "../../components/ui/index.js";
import { useT } from "../../theme/ThemeContext.jsx";
import { fDT } from "../../utils/formatters.js";
import { sv } from "../../utils/numbers.js";
import { AgendaIntegrada } from "../agenda/AgendaIntegrada.jsx";

// --- CONTATOS PRÉ-CADASTRADOS PARA SUGESTÃO ---
const EQUIPE_SUGESTOES = [
  { nome: "Cleison Mendes", email: "cleison@dominvestimentos.com.br" },
  { nome: "Leo Sasi", email: "leosasi@dominvestimentos.com.br" },
  { nome: "Suporte Operacional", email: "suporte@dominvestimentos.com.br" },
  { nome: "Mesa de Operações", email: "mesa@dominvestimentos.com.br" }
];

// --- BADGE DE STATUS INLINE (sem dependência externa) ---
function Bdg({ label, color }) {
  return (
    <span style={{
      background: `${color}22`,
      color: color,
      border: `1px solid ${color}55`,
      borderRadius: 6,
      padding: "2px 8px",
      fontSize: 10,
      fontWeight: 700,
      whiteSpace: "nowrap"
    }}>
      {label}
    </span>
  );
}

export function gerarPS1(r) {
  const dt = new Date(r.dataHora);
  const f2 = n => String(n).padStart(2, "0");
  const [ano, mes, dia, h, m] = [dt.getFullYear(), f2(dt.getMonth() + 1), f2(dt.getDate()), f2(dt.getHours()), f2(dt.getMinutes())];
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
$xml.SelectSingleNode("//text[@id=2]").InnerText = "${r.tipo} | ${dia}/${mes}/${ano} ${h}:${m} | ${r.pauta || ''}"
$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("CRM Dom Investimentos").Show($toast)
'@
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -Command $script"
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DeleteExpiredTaskAfter (New-TimeSpan -Minutes 30)
Register-ScheduledTask -TaskName $taskName -Trigger $trigger -Action $action -Settings $settings -Force
Write-Host "Lembrete registrado para ${r.cliente} em ${dia}/${mes}/${ano} ${h}:${m}" -ForegroundColor Green
Write-Host "Aviso sera enviado as ${lh}:${lm} (${r.lembrete || 30} min antes)"`;
}

// ─── REUNIOES ────────────────────────────────────────────────────────────────
export function Reunioes({ reunioes = [], setReunioes, listaClientes = [] }) {
  const t = useT();
  const [form, setForm] = useState(null);
  const [filtro, setFiltro] = useState("Todas");
  const [ps1, setPs1] = useState(null);
  const [showSugestoes, setShowSugestoes] = useState(false);
  const [isLimpo, setIsLimpo] = useState(false); // Flag de segurança

  const tipos = ["Reuniao de Acompanhamento", "Diagnostico Inicial", "Proposta de Investimento", "Revisao de Carteira", "Rebalanceamento", "Follow-up", "Visita Presencial", "Outro"];
  const inSt = { background: t.lt, border: `1px solid ${t.brd}`, borderRadius: 8, color: t.tx, padding: "8px 11px", fontSize: 12, outline: "none", width: "100%", boxSizing: "border-box" };
  const agora = Date.now();

  // Cor do badge de acordo com o status
  const corStatus = (status) => {
    if (status === "Realizada" || status === "Concluida") return t.green;
    if (status === "Cancelada") return t.red;
    if (status === "Confirmada") return t.blue;
    return t.amber;
  };

  // Efeito de segurança: Força a limpeza na primeira montagem se houver lixo estático
  useEffect(() => {
    if (!isLimpo && reunioes.length > 0) {
      const temFantasma = reunioes.some(x => String(x.cliente).includes("Antonio") || String(x.cliente).includes("Sebastiao") || String(x.cliente).includes("Roberta"));
      if (temFantasma) {
        limparFantasmas();
      }
      setIsLimpo(true);
    }
  }, [reunioes, isLimpo]);

  // Função para exterminar dados antigos forçadamente
  const limparFantasmas = async () => {
    setReunioes([]);
    await db.set("crm_reunioes", []);
    console.log("Reuniões limpas!");
  };

  const salvar = async () => {
    if (!form || !form.cliente || !form.dataHora) {
      alert("Por favor, preencha pelo menos o Cliente e a Data/Hora.");
      return;
    }
    try {
      const nova = {
        ...form,
        id: Date.now(),
        // Puxa o ID da conta do cliente usando a lista real vinda da API
        clienteId: listaClientes.find(c => (c.nome || c.cliente) === form.cliente)?.conta || "",
        criadaEm: new Date().toISOString(),
        pauta: form.pauta || "",
        link: form.link || "",
        participantes: form.participantes || ""
      };
      const upd = [nova, ...reunioes];
      setReunioes(upd);
      await db.set("crm_reunioes", upd);
      setForm(null);
    } catch (erro) {
      console.error("Erro ao salvar:", erro);
      alert("Ocorreu um erro ao salvar. Verifique os dados.");
    }
  };

  const mudar = async (id, status) => {
    const upd = reunioes.map(r => r.id === id ? { ...r, status } : r);
    setReunioes(upd);
    await db.set("crm_reunioes", upd);
  };

  const excluir = async id => {
    const upd = reunioes.filter(r => r.id !== id);
    setReunioes(upd);
    await db.set("crm_reunioes", upd);
  };

  const baixar = r => {
    const bl = new Blob([gerarPS1(r)], { type: "text/plain" });
    const u = URL.createObjectURL(bl);
    const a = document.createElement("a");
    a.href = u;
    a.download = `lembrete_${r.id}.ps1`;
    a.click();
    URL.revokeObjectURL(u);
  };

  const h24 = reunioes.filter(r => r.status === "Agendada" && new Date(r.dataHora) - agora > 0 && new Date(r.dataHora) - agora < 86400000);
  const lista = reunioes.filter(r => filtro === "Todas" || r.status === filtro).sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));

  const handleClienteChange = (e) => {
    const val = e.target.value;
    const clienteEncontrado = listaClientes.find(c => (c.nome || c.cliente) === val);
    setForm(f => ({
      ...f,
      cliente: val === "+" ? "" : val,
      emailCliente: clienteEncontrado?.email || ""
    }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── BOTÃO DE EMERGÊNCIA (Apenas visível se houver reuniões) ── */}
      {reunioes.length > 0 && (
         <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={limparFantasmas} style={{ background: t.red, color: "#fff", border: "none", borderRadius: 4, padding: "4px 8px", fontSize: 10, cursor: "pointer", opacity: 0.7 }}>
              🗑️ Forçar Limpeza de Reuniões
            </button>
         </div>
      )}

      {/* ── AGENDA INTEGRADA (OUTLOOK/TEAMS) ── */}
      <AgendaIntegrada />

      {/* ALERTA 24H */}
      {h24.length > 0 && (
        <div style={{ background: `${t.amber}15`, border: `1px solid ${t.amber}44`, borderRadius: 10, padding: "12px 16px" }}>
          <div style={{ color: t.amber, fontWeight: 700, marginBottom: 5 }}>Reunioes nas proximas 24 horas</div>
          {h24.map(r => (
            <div key={r.id} style={{ color: t.tx, fontSize: 12, marginBottom: 2 }}>
              🔔 {r.cliente} — {fDT(r.dataHora)} · {r.tipo}
            </div>
          ))}
        </div>
      )}

      {/* FILTROS + BOTÃO NOVA REUNIÃO */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {["Todas", "Agendada", "Confirmada", "Realizada", "Cancelada"].map(f => (
            <Btn key={f} onClick={() => setFiltro(f)} outline={filtro !== f} small>
              {f} {f !== "Todas" ? `(${reunioes.filter(r => r.status === f).length})` : ""}
            </Btn>
          ))}
        </div>
        <Btn onClick={() => setForm({
          cliente: "", emailCliente: "",
          assessor: "Leonardo Vitor", emailAssessor: "leonardo.vitor@dominvestimentos.com.br",
          tipo: tipos[0], dataHora: "", pauta: "", link: "", participantes: "", lembrete: 30, status: "Agendada"
        })}>+ Nova Reuniao</Btn>
      </div>

      {/* FORMULÁRIO NOVA REUNIÃO */}
      {form && (
        <Crd>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Nova Reuniao</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
            {[
              {
                lb: "Cliente", ch: (
                  <>
                    <select
                      value={listaClientes.some(c => (c.nome || c.cliente) === form.cliente) ? form.cliente : ""}
                      onChange={handleClienteChange}
                      style={inSt}
                    >
                      <option value="">Selecione...</option>
                      {listaClientes.map(c => <option key={c.id || c.conta} value={c.nome || c.cliente}>{c.nome || c.cliente}</option>)}
                      <option value="+">Outro...</option>
                    </select>
                    {!listaClientes.some(c => (c.nome || c.cliente) === form.cliente) && form.cliente !== "" && (
                      <input
                        value={form.cliente}
                        onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))}
                        placeholder="Nome..."
                        style={{ ...inSt, marginTop: 6 }}
                      />
                    )}
                  </>
                )
              },
              { lb: "Email do Cliente", ch: <input type="email" value={form.emailCliente} onChange={e => setForm(f => ({ ...f, emailCliente: e.target.value }))} placeholder="cliente@email.com" style={inSt} /> },
              { lb: "Assessor", ch: <input value={form.assessor} onChange={e => setForm(f => ({ ...f, assessor: e.target.value }))} style={inSt} /> },
              { lb: "Email do Assessor", ch: <input type="email" value={form.emailAssessor} onChange={e => setForm(f => ({ ...f, emailAssessor: e.target.value }))} placeholder="assessor@email.com" style={inSt} /> },
              { lb: "Tipo", ch: <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} style={inSt}>{tipos.map(tp => <option key={tp}>{tp}</option>)}</select> },
              { lb: "Data e Hora", ch: <input type="datetime-local" value={form.dataHora} onChange={e => setForm(f => ({ ...f, dataHora: e.target.value }))} style={inSt} /> },
              {
                lb: "Lembrete", ch: (
                  <select value={form.lembrete} onChange={e => setForm(f => ({ ...f, lembrete: parseInt(e.target.value) }))} style={inSt}>
                    {[5, 10, 15, 30, 60, 120, 1440].map(m => (
                      <option key={m} value={m}>{m >= 60 ? `${m / 60}h antes` : `${m}min antes`}</option>
                    ))}
                  </select>
                )
              },
              { lb: "Status", ch: <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inSt}>{["Agendada", "Confirmada"].map(s => <option key={s}>{s}</option>)}</select> },
              { lb: "Link", ch: <input value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} placeholder="https://teams..." style={inSt} /> },
              {
                lb: "Participantes", ch: (
                  <div style={{ position: "relative" }}>
                    <input
                      value={form.participantes}
                      onChange={e => setForm(f => ({ ...f, participantes: e.target.value }))}
                      onFocus={() => setShowSugestoes(true)}
                      onBlur={() => setTimeout(() => setShowSugestoes(false), 200)}
                      placeholder="Selecione ou digite..."
                      style={inSt}
                    />
                    {showSugestoes && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: t.mid, border: `1px solid ${t.gold}`, borderRadius: 8, zIndex: 10, maxHeight: 160, overflowY: "auto", marginTop: 4, boxShadow: "0 6px 16px rgba(0,0,0,0.4)" }}>
                        <div style={{ padding: "6px 10px", fontSize: 10, color: t.gold, borderBottom: `1px solid ${t.brd}`, fontWeight: 700, textTransform: "uppercase" }}>Sugestões de Equipe</div>
                        {EQUIPE_SUGESTOES.map(s => (
                          <div
                            key={s.email}
                            onMouseDown={() => {
                              setForm(f => ({
                                ...f,
                                participantes: f.participantes ? `${f.participantes}, ${s.nome} <${s.email}>` : `${s.nome} <${s.email}>`
                              }));
                              setShowSugestoes(false);
                            }}
                            style={{ padding: "8px 10px", cursor: "pointer", display: "flex", flexDirection: "column", borderBottom: `1px solid ${t.brd}33` }}
                            onMouseEnter={e => e.currentTarget.style.background = t.lt}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <span style={{ color: t.tx, fontSize: 11, fontWeight: 600 }}>{s.nome}</span>
                            <span style={{ color: t.txm, fontSize: 10 }}>{s.email}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }
            ].map(({ lb, ch }) => (
              <div key={lb}>
                <div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>{lb}</div>
                {ch}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={{ color: t.txm, fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Pauta</div>
            <textarea value={form.pauta} onChange={e => setForm(f => ({ ...f, pauta: e.target.value }))} rows={2} style={{ ...inSt, resize: "vertical" }} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <Btn onClick={salvar}>Salvar</Btn>
            <Btn onClick={() => setForm(null)} outline>Cancelar</Btn>
          </div>
        </Crd>
      )}

      {/* LISTA DE REUNIÕES */}
      {lista.length === 0
        ? (
          <Crd style={{ textAlign: "center", padding: "40px" }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>📅</div>
            <div style={{ color: t.tx, fontWeight: 600, fontSize: 14 }}>Nenhuma reuniao agendada</div>
          </Crd>
        )
        : lista.map(r => {
          const pass = new Date(r.dataHora) < new Date() && r.status === "Agendada";
          const hj = new Date(r.dataHora) - agora < 86400000 && new Date(r.dataHora) > agora;
          const bc = r.status === "Realizada" || r.status === "Concluida" ? t.green : pass ? t.red : hj ? t.amber : t.blue;

          return (
            <Crd key={r.id} style={{ borderLeft: `3px solid ${bc}`, padding: "12px 16px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 3 }}>
                    <span style={{ color: t.tx, fontWeight: 700, fontSize: 14 }}>{r.cliente}</span>
                    <Bdg label={r.status} color={corStatus(r.status)} />
                    {pass && r.status === "Agendada" && <span style={{ color: t.red, fontSize: 10, fontWeight: 700 }}>⚠️ Vencida</span>}
                    {hj && <span style={{ color: t.amber, fontSize: 10, fontWeight: 700 }}>⏰ Hoje</span>}
                  </div>
                  <div style={{ color: t.txm, fontSize: 11, marginBottom: 2 }}>
                    📋 {r.tipo} · {r.assessor} {r.emailAssessor ? `(${r.emailAssessor})` : ""}
                  </div>
                  {r.emailCliente && <div style={{ color: t.txm, fontSize: 11, marginBottom: 2 }}>📧 {r.emailCliente}</div>}
                  <div style={{ color: t.gold, fontSize: 12, fontWeight: 700, marginBottom: 2 }}>
                    🕐 {fDT(r.dataHora)} <span style={{ color: t.txd, fontWeight: 400, fontSize: 10 }}>({r.lembrete || 30}min antes)</span>
                  </div>
                  {r.link && (
                    <div style={{ fontSize: 11, marginBottom: 2 }}>
                      🔗 <a href={r.link} target="_blank" rel="noreferrer" style={{ color: t.blue }}>Link da reuniao</a>
                    </div>
                  )}
                  {r.participantes && <div style={{ color: t.txd, fontSize: 11, marginBottom: 2 }}>👥 {r.participantes}</div>}
                  {r.pauta && <div style={{ color: t.txd, fontSize: 11, fontStyle: "italic" }}>"{r.pauta}"</div>}
                </div>

                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                  <Btn onClick={() => setPs1(ps1 === r.id ? null : r.id)} outline small color={t.blue}>🪟 Script</Btn>
                  <Btn onClick={() => baixar(r)} outline small color={t.purple}>⬇️ .ps1</Btn>
                  {r.status === "Agendada" && <Btn onClick={() => mudar(r.id, "Confirmada")} outline small color={t.green}>Confirmar</Btn>}
                  {(r.status === "Agendada" || r.status === "Confirmada") && <Btn onClick={() => mudar(r.id, "Realizada")} outline small color={t.green}>✅ Realizada</Btn>}
                  {r.status !== "Cancelada" && <Btn onClick={() => mudar(r.id, "Cancelada")} outline small color={t.red}>Cancelar</Btn>}
                  <button onClick={() => excluir(r.id)} style={{ background: "none", border: "none", color: t.txd, fontSize: 13, cursor: "pointer" }}>🗑️</button>
                </div>
              </div>

              {ps1 === r.id && (
                <div style={{ marginTop: 10, background: t.bg, borderRadius: 8, padding: "12px", border: `1px solid ${t.brd}` }}>
                  <div style={{ color: t.txm, fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginBottom: 5 }}>Script PowerShell — Task Scheduler Windows</div>
                  <pre style={{ color: t.green, fontSize: 9, margin: 0, overflowX: "auto", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{gerarPS1(r)}</pre>
                  <div style={{ color: t.txd, fontSize: 10, marginTop: 6 }}>Execute como Administrador no PowerShell. Notificacao nativa do Windows no horario configurado.</div>
                </div>
              )}
            </Crd>
          );
        })}
    </div>
  );
}