import React from "react";
import { useCallback, useEffect, useState } from "react";
import { PROTOTYPE_MODE, DEFAULT_USER_ID } from "./config/prototype.js";
import { db } from "./services/storage.js";
import { TH } from "./theme/themes.js";
import { TC } from "./theme/ThemeContext.jsx";
import { USERS_DEF } from "./data/users.js";
import { TAREFAS_SEED, OPORT_SEED } from "./data/seeds.js";
import { Clock, Login, ThemeSw, UserMenu } from "./components/shell/index.js";
import { Ticker } from "./components/shell/Ticker.jsx";
import { Dash } from "./features/dashboard/Dashboard.jsx";
import { Clientes } from "./features/clientes/Clientes.jsx";
import { Carteira } from "./features/carteira/Carteira.jsx";
import { Oport } from "./features/oportunidades/Oportunidades.jsx";
import { Tarefas } from "./features/tarefas/Tarefas.jsx";
import { Reunioes } from "./features/reunioes/Reunioes.jsx";
import { Plano } from "./features/plano/Plano.jsx";
import { Alertas } from "./features/alertas/Alertas.jsx";
import { Importacao } from "./features/importacao/Importacao.jsx";
import { Admin } from "./features/admin/Admin.jsx";

// 👇 AQUI FOI ADICIONADO A IMPORTAÇÃO DO ToastProvider 👇
import { ToastProvider } from "./components/ui/index.js";

const TABS = [
  { id: "dashboard",  lb: "Dashboard",       icon: "📊" },
  { id: "clientes",   lb: "Clientes",        icon: "👥" },
  { id: "carteira",   lb: "Carteira",        icon: "💼" },
  { id: "oport",      lb: "Oportunidades",   icon: "🔥" },
  { id: "tarefas",    lb: "Tarefas",         icon: "✅" },
  { id: "reunioes",   lb: "Reunioes",        icon: "📅" },
  { id: "plano",      lb: "Plano Comercial", icon: "🎯" },
  { id: "alertas",    lb: "Alertas",         icon: "🔔" },
  { id: "importacao", lb: "Importacao",      icon: "📥" },
  { id: "admin",      lb: "Admin",           icon: "⚙️", minPerfil: "Administrador" },
];

const ORDEM_PERFIL  = ["Assessor", "Gestor", "Administrador"];
const SIDEBAR_W     = 200;
const SIDEBAR_W_COL = 56;
const TICKER_H      = 36;
const TOPBAR_H      = 44;

export default function App() {
  const defaultUser = USERS_DEF.find(u => u.id === DEFAULT_USER_ID) || USERS_DEF[0];

  const [ok, setOk]               = useState(PROTOTYPE_MODE);
  const [user, setUser]           = useState(PROTOTYPE_MODE ? defaultUser : null);
  const [tab, setTab]             = useState("dashboard");
  const [thk, setThk]             = useState("navy");
  const [reunioes, setReunioes]   = useState([]);
  const [tarefas, setTarefas]     = useState(TAREFAS_SEED);
  const [oport, setOport]         = useState(OPORT_SEED);
  const [auditoria, setAuditoria] = useState([]);
  const [usuarios, setUsuarios]   = useState([]);
  const [clientes, setClientes]   = useState(null);
  const [loaded, setLoaded]       = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  // Contador de reload forçado — incrementar força remontagem das telas
  const [reloadKey, setReloadKey] = useState(0);

  const theme = TH[thk];
  const sw    = collapsed ? SIDEBAR_W_COL : SIDEBAR_W;

  useEffect(() => {
    Promise.all([
      db.get("crm_reunioes"),
      db.get("crm_tarefas"),
      db.get("crm_oport"),
      db.get("crm_theme"),
      db.get("crm_auditoria"),
      db.get("crm_usuarios"),
      db.get("crm_clientes"),
    ]).then(([r, ta, op, th, au, us, cl]) => {
      if (r)  setReunioes(r);
      if (ta) setTarefas(ta);
      if (op) setOport(op);
      if (th) setThk(th);
      if (au) setAuditoria(au);
      if (us) setUsuarios(us);
      if (cl) setClientes(cl);
      setLoaded(true);
    });
  }, []);

  const handleTheme = async k => { setThk(k); await db.set("crm_theme", k); };

  const logAudit = useCallback(async (acao, tela) => {
    if (!user) return;
    const entry = {
      acao, tela,
      usuario: user.nome, perfil: user.perfil,
      criadaEm: new Date().toLocaleString("pt-BR"),
      id: Date.now()
    };
    const upd = [entry, ...auditoria.slice(0, 99)];
    setAuditoria(upd);
    await db.set("crm_auditoria", upd);
  }, [user, auditoria]);

  const onLimparBase = async (dbKey) => {
    if (dbKey === "crm_clientes" || dbKey === "__all__") {
      setClientes(null);
      await db.set("crm_clientes", null);
    }
  };

  // ── Handler de importação unificado ──────────────────────────────────────
  const handleImportar = async (key, dados) => {
    // Apenas salva a chave se ela foi enviada; na Importação em Lote "key" pode ser "lote" (passamos null nos dados)
    if(key !== "lote") {
        await db.set(key, dados);
    }

    // Chaves com estado React direto — atualização imediata e silenciosa
    if (key === "crm_clientes")           { setClientes(dados);  return; }
    if (key === "crm_import_positivador") { setClientes(dados);  return; }
    if (key === "crm_reunioes")           { setReunioes(dados);  return; }
    if (key === "crm_tarefas")            { setTarefas(dados);   return; }
    if (key === "crm_oport")              { setOport(dados);     return; }

    // Qualquer outra chave crm_import_* (Saldo, Plano, Carteira, etc.)
    // — incrementa reloadKey para forçar remontagem das telas dependentes
    if (key.startsWith("crm_import_") || key === "lote") {
      setReloadKey(k => k + 1);
      return;
    }

    // Fallback genérico — força remontagem também
    setReloadKey(k => k + 1);
  };

  const alertCnt =
    reunioes.filter(r => r.status === "Agendada" && new Date(r.dataHora) - Date.now() > 0 && new Date(r.dataHora) - Date.now() < 86400000).length
    + tarefas.filter(x => x.status === "Atrasada").length;

  const visTabs = TABS.filter(tx =>
    !tx.minPerfil || ORDEM_PERFIL.indexOf(user?.perfil || "Assessor") >= ORDEM_PERFIL.indexOf(tx.minPerfil)
  );

  // ── Loading ──
  if (!loaded) return (
    <TC.Provider value={theme}>
      <div style={{ minHeight: "100vh", background: theme.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
        <div style={{ color: theme.gold, fontSize: 20, fontWeight: 800, letterSpacing: "1px" }}>◆ Carregando...</div>
      </div>
    </TC.Provider>
  );

  // ── Login ──
  if (!ok) return (
    <TC.Provider value={theme}>
      {/* 👇 AQUI: Envolvemos o App com o ToastProvider 👇 */}
      <ToastProvider>
        <Login onLogin={u => { setUser(u); setOk(true); logAudit("Login", "Sistema"); }} />
      </ToastProvider>
    </TC.Provider>
  );

  // reloadKey como key nas telas que dependem de importações externas
  // garante remontagem (e novo useEffect/fetch) quando dados mudam
  const page = {
    dashboard:  <Dash       key={reloadKey} reunioes={reunioes} tarefas={tarefas} oport={oport} setTab={setTab} />,
    clientes:   <Clientes   tarefas={tarefas} reunioes={reunioes} oport={oport} clientesImportados={clientes} />,
    carteira:   <Carteira   key={reloadKey} />,
    oport:      <Oport      oport={oport} setOport={setOport} />,
    tarefas:    <Tarefas    tarefas={tarefas} setTarefas={setTarefas} />,
    reunioes:   <Reunioes   reunioes={reunioes} setReunioes={setReunioes} />,
    plano:      <Plano      key={reloadKey} />,
    alertas:    <Alertas    reunioes={reunioes} tarefas={tarefas} oport={oport} setTab={setTab} />,
    importacao: <Importacao onImportar={handleImportar} />,
    admin:      <Admin      auditoria={auditoria} usuarios={usuarios} setUsuarios={setUsuarios} onLimparBase={onLimparBase} />,
  }[tab];

  return (
    <TC.Provider value={theme}>
      {/* 👇 AQUI: Envolvemos toda a aplicação logada com o ToastProvider 👇 */}
      <ToastProvider>
        <div style={{ display: "flex", minHeight: "100vh", background: theme.bg, color: theme.tx, fontFamily: "'Inter','Segoe UI',sans-serif" }}>

          {/* ── SIDEBAR ── */}
          <div style={{
            width: sw, minHeight: "100vh", background: theme.mid,
            borderRight: `1px solid ${theme.brd}`,
            display: "flex", flexDirection: "column",
            position: "fixed", top: 0, left: 0, zIndex: 100,
            transition: "width 0.2s ease", overflow: "hidden"
          }}>

            {/* TOPO: Logo + Toggle + User + Theme */}
            <div style={{
              borderBottom: `1px solid ${theme.brd}`, flexShrink: 0,
              padding: collapsed ? "12px 0" : "12px 14px",
              display: "flex", flexDirection: "column", gap: 10
            }}>
              {/* Logo + botão recolher */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between" }}>
                {!collapsed && (
                  <div style={{ color: theme.gold, fontWeight: 900, fontSize: 14, letterSpacing: "1px" }}>◆ CRM</div>
                )}
                <button
                  onClick={() => setCollapsed(c => !c)}
                  style={{ background: "none", border: "none", color: theme.txm, cursor: "pointer", fontSize: 16, padding: 4, lineHeight: 1 }}
                  title={collapsed ? "Expandir menu" : "Recolher menu"}
                >
                  {collapsed ? "▶" : "◀"}
                </button>
              </div>

              {/* User + Theme — só expandido */}
              {!collapsed && (
                <>
                  <UserMenu
                    user={user}
                    onSwitch={u => { setUser(u); logAudit(`Trocou para ${u.nome}`, "Sistema"); }}
                    onLogout={() => { logAudit("Logout", "Sistema"); setOk(false); setUser(null); setTab("dashboard"); }}
                  />
                  <ThemeSw cur={thk} onChange={handleTheme} />
                </>
              )}

              {/* Avatar — só colapsado */}
              {collapsed && (
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: theme.gold, color: theme.bg,
                    fontSize: 13, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }} title={user?.nome}>
                    {user?.nome?.charAt(0) || "U"}
                  </div>
                </div>
              )}
            </div>

            {/* NAV ITEMS */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
              {visTabs.map(tx => {
                const ativa = tab === tx.id;
                return (
                  <button
                    key={tx.id}
                    onClick={() => { setTab(tx.id); logAudit(`Acessou ${tx.lb}`, tx.lb); }}
                    title={collapsed ? tx.lb : ""}
                    style={{
                      width: "100%", background: ativa ? `${theme.gold}18` : "none",
                      border: "none", borderLeft: ativa ? `3px solid ${theme.gold}` : "3px solid transparent",
                      color: ativa ? theme.gold : theme.txm,
                      padding: collapsed ? "11px 0" : "11px 16px",
                      fontSize: 12, fontWeight: ativa ? 700 : 400,
                      cursor: "pointer", display: "flex", alignItems: "center",
                      gap: collapsed ? 0 : 9, justifyContent: collapsed ? "center" : "flex-start",
                      transition: "all .15s", position: "relative", whiteSpace: "nowrap"
                    }}
                    onMouseEnter={e => { if (!ativa) e.currentTarget.style.background = `${theme.gold}0a`; }}
                    onMouseLeave={e => { if (!ativa) e.currentTarget.style.background = "none"; }}
                  >
                    <span style={{ fontSize: 15, flexShrink: 0 }}>{tx.icon}</span>
                    {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{tx.lb}</span>}
                    {tx.id === "alertas" && alertCnt > 0 && (
                      <span style={{
                        background: theme.red, color: "#fff",
                        borderRadius: 99, fontSize: 9, fontWeight: 800,
                        padding: "1px 5px",
                        position: collapsed ? "absolute" : "static",
                        top: collapsed ? 6 : "auto",
                        right: collapsed ? 6 : "auto",
                        marginLeft: collapsed ? 0 : "auto"
                      }}>{alertCnt}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* RODAPÉ: Theme compacto quando colapsado */}
            {collapsed && (
              <div style={{ borderTop: `1px solid ${theme.brd}`, padding: "10px 0", display: "flex", justifyContent: "center", flexShrink: 0 }}>
                <ThemeSw cur={thk} onChange={handleTheme} compact />
              </div>
            )}
          </div>

          {/* ── HEADER DIREITO (Ticker + Topbar) ── */}
          <div style={{
            position: "fixed",
            top: 0, left: sw, right: 0,
            zIndex: 99,
            transition: "left 0.2s ease"
          }}>
            {/* Ticker de cotações */}
            <Ticker />

            {/* Topbar com relógio */}
            <div style={{
              height: TOPBAR_H,
              background: theme.mid,
              borderBottom: `1px solid ${theme.brd}`,
              display: "flex", alignItems: "center",
              justifyContent: "flex-end",
              padding: "0 20px", gap: 12,
            }}>
              <Clock />
              {collapsed && (
                <>
                  <div style={{ width: 1, height: 22, background: theme.brd }} />
                  <UserMenu
                    user={user}
                    onSwitch={u => { setUser(u); logAudit(`Trocou para ${u.nome}`, "Sistema"); }}
                    onLogout={() => { logAudit("Logout", "Sistema"); setOk(false); setUser(null); setTab("dashboard"); }}
                  />
                </>
              )}
            </div>
          </div>

          {/* ── CONTENT ── */}
          <div style={{
            marginLeft: sw,
            marginTop: TICKER_H + TOPBAR_H,
            flex: 1,
            padding: "20px 20px",
            transition: "margin-left 0.2s ease",
            boxSizing: "border-box",
            minWidth: 0
          }}>
            {page}
          </div>

        </div>
      </ToastProvider>
    </TC.Provider>
  );
}
