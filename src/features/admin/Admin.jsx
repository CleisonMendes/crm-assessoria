import { useState, useMemo, useEffect } from "react";
import { CLIENTES_DB as DADOS_FALLBACK } from "../../data/clientes.js";
import { db } from "../../services/storage.js";
import { Crd, Btn, Inp } from "../../components/ui/index.js";
import { useT } from "../../theme/ThemeContext.jsx";
import { fB, fB2 } from "../../utils/formatters.js";
import { sv } from "../../utils/numbers.js";
import { RelatoriosPDF } from "../relatorios/RelatoriosPDF.jsx"; // <-- NOVO IMPORT

// --- BADGE INLINE ---
function Bdg({ label }) {
  const cores = {
    Administrador: "#f59e0b",
    Gestor: "#3b82f6",
    Assessor: "#10b981",
    Ativo: "#10b981",
    Inativo: "#ef4444",
  };
  const cor = cores[label] || "#6b7280";
  return (
    <span style={{
      background: `${cor}22`, color: cor,
      border: `1px solid ${cor}55`,
      borderRadius: 6, padding: "2px 10px",
      fontSize: 10, fontWeight: 700, whiteSpace: "nowrap"
    }}>{label}</span>
  );
}

// Permissões padrão por perfil
const PERMISSOES_PADRAO = {
  Assessor:      { "Ver Clientes": true,  "Importar Dados": false, "Painel Admin": false, "Criar Usuários": false, "Ver Auditoria": false },
  Gestor:        { "Ver Clientes": true,  "Importar Dados": true,  "Painel Admin": false, "Criar Usuários": false, "Ver Auditoria": true  },
  Administrador: { "Ver Clientes": true,  "Importar Dados": true,  "Painel Admin": true,  "Criar Usuários": true,  "Ver Auditoria": true  }
};

const TODAS_PERMISSOES = Object.keys(PERMISSOES_PADRAO.Administrador);

const USUARIO_VAZIO = {
  nome: "", email: "", perfil: "Assessor",
  permissoes: { ...PERMISSOES_PADRAO.Assessor }
};

// Bases de dados importadas — para limpeza seletiva
const BASES_IMPORT = [
  { key: "crm_import_positivador",    hist: "crm_hist_positivador",    label: "Positivador",       icon: "📋", cor: "#3b82f6" },
  { key: "crm_import_saldo",          hist: "crm_hist_saldo",          label: "Saldo Consolidado", icon: "💰", cor: "#10b981" },
  { key: "crm_import_diversificacao", hist: "crm_hist_diversificacao", label: "Diversificação",    icon: "🥧", cor: "#f59e0b" },
  { key: "crm_import_plano",          hist: "crm_hist_plano",          label: "Plano Comercial",   icon: "🎯", cor: "#f59e0b" },
  { key: "crm_import_xperformance",   hist: "crm_hist_xperformance",   label: "XPerformance",      icon: "📈", cor: "#8b5cf6" },
];

// Modal de confirmação de limpeza
function ModalLimpeza({ base, onConfirmar, onCancelar, t }) {
  const [limparHist, setLimparHist] = useState(false);
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999
    }}>
      <Crd style={{ width: 420, maxWidth: "95vw" }}>
        <div style={{ fontSize: 32, textAlign: "center", marginBottom: 10 }}>⚠️</div>
        <div style={{ fontWeight: 700, fontSize: 15, color: t.tx, textAlign: "center", marginBottom: 6 }}>
          Limpar dados de {base.label}?
        </div>
        <div style={{ fontSize: 12, color: t.txm, textAlign: "center", marginBottom: 18, lineHeight: 1.6 }}>
          Esta ação irá remover todos os dados importados desta base. Não poderá ser desfeita.
        </div>

        <div
          onClick={() => setLimparHist(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px", borderRadius: 8, cursor: "pointer",
            background: limparHist ? `${t.red}15` : t.lt,
            border: `1px solid ${limparHist ? t.red : t.brd}`,
            marginBottom: 18
          }}
        >
          <div style={{
            width: 18, height: 18, borderRadius: 4,
            border: `2px solid ${limparHist ? t.red : t.brd}`,
            background: limparHist ? t.red : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0
          }}>
            {limparHist && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>✓</span>}
          </div>
          <div>
            <div style={{ fontSize: 12, color: t.tx, fontWeight: 600 }}>Limpar histórico também</div>
            <div style={{ fontSize: 10, color: t.txm }}>Remove o registro de importações anteriores desta base</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={() => onConfirmar(limparHist)} color={t.red}>
            🗑️ Confirmar Limpeza
          </Btn>
          <Btn outline onClick={onCancelar}>Cancelar</Btn>
        </div>
      </Crd>
    </div>
  );
}

export function Admin({ usuarios: propUsuarios, setUsuarios: propSetUsuarios }) {
  const t = useT();
  
  // ESTADOS LOCAIS BLINDADOS
  const [localUsuarios, setLocalUsuarios] = useState([]);
  const [dataClientes, setDataClientes] = useState(DADOS_FALLBACK);
  const [showForm, setShowForm] = useState(false);
  const [newUser, setNewUser] = useState(USUARIO_VAZIO);
  const [editando, setEditando] = useState(null);
  const [expandido, setExpandido] = useState(null);
  const [statusBases, setStatusBases] = useState({});
  const [confirmLimpeza, setConfirmLimpeza] = useState(null);

  // CARREGAR DADOS AO INICIAR A TELA
  useEffect(() => {
    const carregarDadosDoBanco = async () => {
      // 1. Carrega assessores e blinda no estado local
      const usuariosSalvos = await db.get("crm_usuarios") || [];
      setLocalUsuarios(usuariosSalvos);
      if (propSetUsuarios) propSetUsuarios(usuariosSalvos);

      // 2. Carrega clientes para o dashboard consolidado
      const dbClientes = await db.get("clientes") || DADOS_FALLBACK;
      setDataClientes(dbClientes);
    };
    carregarDadosDoBanco();
  }, []);

  // Consolidado por Assessor
  const consolidado = useMemo(() => {
    const mapa = {};
    if (!Array.isArray(dataClientes)) return [];
    dataClientes.forEach(c => {
      const nome = c.assessor || "Sem Assessor";
      if (!mapa[nome]) mapa[nome] = { net: 0, receita: 0, clientes: 0 };
      mapa[nome].net += sv(c.netM);
      mapa[nome].receita += sv(c.rec);
      mapa[nome].clientes += 1;
    });
    return Object.entries(mapa)
      .map(([nome, d]) => ({ nome, ...d }))
      .sort((a, b) => b.net - a.net);
  }, [dataClientes]);

  const inSt = {
    background: t.lt, border: `1px solid ${t.brd}`,
    borderRadius: 8, color: t.tx,
    padding: "9px 12px", fontSize: 12,
    outline: "none", width: "100%", boxSizing: "border-box"
  };

  const handlePerfilChange = (perfil) => {
    setNewUser(u => ({ ...u, perfil, permissoes: { ...PERMISSOES_PADRAO[perfil] } }));
  };

  const togglePermissao = (chave) => {
    setNewUser(u => ({ ...u, permissoes: { ...u.permissoes, [chave]: !u.permissoes[chave] } }));
  };

  // SALVAR ASSESSOR
  const salvarUsuario = async () => {
    if (!newUser.nome || !newUser.email) { alert("Preencha Nome e E-mail."); return; }
    
    let listaAtualizada;
    if (editando) {
      listaAtualizada = localUsuarios.map(u => u.id === editando ? { ...u, ...newUser } : u);
    } else {
      listaAtualizada = [...localUsuarios, { ...newUser, id: Date.now(), status: "Ativo" }];
    }
    
    setLocalUsuarios(listaAtualizada);
    await db.set("crm_usuarios", listaAtualizada);
    if (propSetUsuarios) propSetUsuarios(listaAtualizada);

    setShowForm(false);
    setEditando(null);
    setNewUser(USUARIO_VAZIO);
  };

  const toggleStatus = async (id) => {
    const listaAtualizada = localUsuarios.map(u =>
      u.id === id ? { ...u, status: u.status === "Ativo" ? "Inativo" : "Ativo" } : u
    );
    setLocalUsuarios(listaAtualizada);
    await db.set("crm_usuarios", listaAtualizada);
    if (propSetUsuarios) propSetUsuarios(listaAtualizada);
  };

  const abrirEdicao = (u) => {
    setNewUser({
      nome: u.nome, email: u.email, perfil: u.perfil,
      permissoes: u.permissoes || { ...PERMISSOES_PADRAO[u.perfil] }
    });
    setEditando(u.id);
    setShowForm(true);
  };

  // EXECUTA LIMPEZA APENAS NAS TABELAS DE DADOS
  const executarLimpeza = async (base, limparHist) => {
    setConfirmLimpeza(null);
    setStatusBases(s => ({ ...s, [base.key]: "limpando" }));
    try {
      await db.set(base.key, []);
      if (limparHist) await db.set(base.hist, []);
      
      if (base.key === "crm_import_diversificacao") {
        await db.set("clientes", []);
        setDataClientes([]);
      }
      
      setStatusBases(s => ({ ...s, [base.key]: "vazio" }));
    } catch {
      setStatusBases(s => ({ ...s, [base.key]: "erro" }));
    }
  };

  const limparTudo = async (limparHist) => {
    setConfirmLimpeza(null);
    for (const base of BASES_IMPORT) {
      setStatusBases(s => ({ ...s, [base.key]: "limpando" }));
      await db.set(base.key, []);
      if (limparHist) await db.set(base.hist, []);
      setStatusBases(s => ({ ...s, [base.key]: "vazio" }));
    }
    await db.set("clientes", []);
    setDataClientes([]);
  };

  const corStatus = (s) => {
    if (s === "vazio") return t.green;
    if (s === "limpando") return t.amber;
    if (s === "erro") return t.red;
    return t.txd;
  };

  const labelStatus = (s) => {
    if (s === "vazio") return "✅ Limpo";
    if (s === "limpando") return "⏳ Limpando...";
    if (s === "erro") return "❌ Erro";
    return "–";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── CONSOLIDADO POR ASSESSOR ── */}
      <div>
        <div style={{ color: t.gold, fontWeight: 700, fontSize: 13, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
          📊 Consolidado por Assessor
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          {consolidado.map(a => {
            const usuarioCadastrado = localUsuarios.find(u => u.nome === a.nome);
            return (
              <Crd key={a.nome} style={{ borderLeft: `3px solid ${t.gold}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.gold }}>{a.nome}</div>
                  {usuarioCadastrado
                    ? <Bdg label={usuarioCadastrado.perfil} />
                    : <span style={{ fontSize: 10, color: t.txd }}>Sem acesso</span>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: t.txm, fontSize: 12 }}>NET Total</span>
                    <span style={{ fontWeight: 700, color: t.tx, fontSize: 13 }}>{fB(a.net)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: t.txm, fontSize: 12 }}>Receita</span>
                    <span style={{ fontWeight: 600, color: t.green, fontSize: 12 }}>{fB2(a.receita)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: t.txm, fontSize: 12 }}>Clientes</span>
                    <span style={{ fontWeight: 600, fontSize: 12 }}>{a.clientes}</span>
                  </div>
                </div>
              </Crd>
            );
          })}
        </div>
      </div>

      {/* ── EQUIPE E ACESSOS ── */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ color: t.gold, fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>
            👥 Equipe e Acessos
          </div>
          <Btn onClick={() => { setNewUser(USUARIO_VAZIO); setEditando(null); setShowForm(true); }}>
            + Cadastrar Assessor
          </Btn>
        </div>

        <Crd style={{ padding: 0, overflow: "hidden" }}>
          {localUsuarios.length === 0 && (
            <div style={{ padding: 30, textAlign: "center", color: t.txd, fontSize: 13 }}>
              Nenhum assessor cadastrado ainda.
            </div>
          )}
          {localUsuarios.map((u, i) => (
            <div key={u.id}>
              <div style={{
                padding: "12px 18px",
                borderBottom: expandido === u.id ? "none" : i < localUsuarios.length - 1 ? `1px solid ${t.brd}` : "none",
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: t.tx }}>{u.nome}</div>
                  <div style={{ fontSize: 11, color: t.txm }}>{u.email}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <Bdg label={u.perfil} />
                  <Bdg label={u.status || "Ativo"} />
                  <Btn outline small color={t.gold} onClick={() => setExpandido(expandido === u.id ? null : u.id)}>
                    {expandido === u.id ? "🔼 Ocultar" : "🔑 Permissões"}
                  </Btn>
                  <Btn outline small onClick={() => abrirEdicao(u)}>✏️ Editar</Btn>
                  <Btn outline small color={u.status === "Ativo" ? t.red : t.green} onClick={() => toggleStatus(u.id)}>
                    {u.status === "Ativo" ? "Desativar" : "Ativar"}
                  </Btn>
                </div>
              </div>
              {expandido === u.id && (
                <div style={{
                  padding: "10px 18px 14px", background: t.lt,
                  borderBottom: i < localUsuarios.length - 1 ? `1px solid ${t.brd}` : "none"
                }}>
                  <div style={{ fontSize: 10, color: t.gold, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
                    Permissões de {u.nome}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {TODAS_PERMISSOES.map(p => {
                      const permissoes = u.permissoes || PERMISSOES_PADRAO[u.perfil];
                      const ativo = permissoes[p];
                      return (
                        <div key={p} style={{
                          display: "flex", alignItems: "center", gap: 6,
                          background: ativo ? `${t.green}18` : `${t.red}18`,
                          border: `1px solid ${ativo ? t.green : t.red}44`,
                          borderRadius: 8, padding: "5px 10px"
                        }}>
                          <span style={{ fontSize: 11, color: t.tx }}>{p}</span>
                          <span style={{ fontSize: 12 }}>{ativo ? "✅" : "❌"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </Crd>
      </div>

      {/* ── LIMPEZA DE DADOS IMPORTADOS ── */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ color: t.red, fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>
            🗑️ Limpeza de Dados Importados
          </div>
          <Btn
            color={t.red}
            onClick={() => setConfirmLimpeza({ label: "TODAS AS BASES", key: "__all__", hist: null, cor: t.red, icon: "🗑️" })}
          >
            ⚠️ Limpar Tudo
          </Btn>
        </div>

        <div style={{ background: `${t.red}10`, border: `1px solid ${t.red}33`, borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: t.red, fontWeight: 600, marginBottom: 2 }}>⚠️ Atenção</div>
          <div style={{ fontSize: 11, color: t.txm, lineHeight: 1.6 }}>
            Use esta área para limpar bases antes de uma nova importação. O cadastro da equipe (Assessores) NUNCA será apagado nesta zona de limpeza.
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
          {BASES_IMPORT.map(base => {
            const status = statusBases[base.key];
            return (
              <Crd key={base.key} style={{ borderLeft: `3px solid ${base.cor}`, padding: "12px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: t.tx }}>
                      {base.icon} {base.label}
                    </div>
                    {status && (
                      <div style={{ fontSize: 10, color: corStatus(status), fontWeight: 700, marginTop: 3 }}>
                        {labelStatus(status)}
                      </div>
                    )}
                  </div>
                </div>
                <Btn
                  outline
                  small
                  color={t.red}
                  onClick={() => setConfirmLimpeza(base)}
                >
                  🗑️ Limpar base
                </Btn>
              </Crd>
            );
          })}
        </div>
      </div>

      {/* ── RELATÓRIOS PDF ── */}
      <RelatoriosPDF />

      {/* ── MODAL LIMPEZA ── */}
      {confirmLimpeza && (
        <ModalLimpeza
          base={confirmLimpeza}
          t={t}
          onConfirmar={(limparHist) => {
            if (confirmLimpeza.key === "__all__") {
              limparTudo(limparHist);
            } else {
              executarLimpeza(confirmLimpeza, limparHist);
            }
          }}
          onCancelar={() => setConfirmLimpeza(null)}
        />
      )}

      {/* ── MODAL CADASTRO / EDIÇÃO ── */}
      {showForm && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999
        }}>
          <Crd style={{ width: 480, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: t.tx, marginBottom: 16 }}>
              {editando ? "✏️ Editar Assessor" : "➕ Cadastrar Novo Assessor"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: t.txm, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Nome Completo</div>
                <input value={newUser.nome} onChange={e => setNewUser({ ...newUser, nome: e.target.value })} placeholder="Ex: Leonardo Vitor" style={inSt} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: t.txm, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>E-mail</div>
                <input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="assessor@dominvestimentos.com.br" style={inSt} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: t.txm, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
                  Perfil de Acesso <span style={{ color: t.txd, fontWeight: 400, textTransform: "none" }}>(define as permissões padrão)</span>
                </div>
                <select value={newUser.perfil} onChange={e => handlePerfilChange(e.target.value)} style={inSt}>
                  <option>Assessor</option>
                  <option>Gestor</option>
                  <option>Administrador</option>
                </select>
              </div>
              <div style={{ marginTop: 4, padding: "12px 14px", background: t.lt, borderRadius: 8, border: `1px solid ${t.brd}` }}>
                <div style={{ fontSize: 10, color: t.gold, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
                  🔑 Permissões Customizadas
                </div>
                <div style={{ fontSize: 10, color: t.txd, marginBottom: 10 }}>
                  Clique para ativar ou desativar cada acesso individualmente.
                </div>
                {TODAS_PERMISSOES.map(p => {
                  const ativo = newUser.permissoes[p];
                  return (
                    <div
                      key={p}
                      onClick={() => togglePermissao(p)}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "9px 12px", marginBottom: 6, borderRadius: 8, cursor: "pointer",
                        background: ativo ? `${t.green}18` : `${t.red}12`,
                        border: `1px solid ${ativo ? t.green : t.red}44`
                      }}
                    >
                      <span style={{ fontSize: 12, color: t.tx, fontWeight: 500 }}>{p}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: ativo ? t.green : t.red, fontWeight: 700 }}>
                          {ativo ? "Liberado" : "Bloqueado"}
                        </span>
                        <div style={{ width: 36, height: 20, borderRadius: 10, background: ativo ? t.green : t.red, position: "relative" }}>
                          <div style={{ position: "absolute", top: 3, left: ativo ? 18 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <Btn onClick={salvarUsuario}>{editando ? "Salvar Alterações" : "Cadastrar Assessor"}</Btn>
              <Btn outline onClick={() => { setShowForm(false); setEditando(null); }}>Cancelar</Btn>
            </div>
          </Crd>
        </div>
      )}
    </div>
  );
}