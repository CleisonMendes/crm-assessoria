import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "../CRM.db");

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "50mb" }));

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
console.log(`✅ CRM.db conectado em: ${DB_PATH}`);

// ── CRIAÇÃO AUTOMÁTICA DAS TABELAS ────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS positivador_completo (
    -- Identificação
    cliente               TEXT PRIMARY KEY,
    assessor              TEXT,
    profissao             TEXT,
    sexo                  TEXT,
    tipo_pessoa           TEXT,

    -- Segmentação e perfil
    segmento              TEXT,
    segmentacao_cliente   TEXT,
    suitability           TEXT,
    termo_qualificado     TEXT,
    termo_profissional    TEXT,

    -- Datas e status
    data_cadastro         TEXT,
    data_nascimento       TEXT,
    fez_segundo_aporte    TEXT,
    status                TEXT,
    ativou_em_m           TEXT,
    evadiu_em_m           TEXT,
    data_referencia       TEXT,

    -- Operações
    operou_bolsa          TEXT,
    operou_fundo          TEXT,
    operou_renda_fixa     TEXT,
    aplicacao_financeira  REAL,

    -- Receitas
    receita_mes           REAL,
    receita_bovespa       REAL,
    receita_futuros       REAL,
    receita_rf_bancarios  REAL,
    receita_rf_privados   REAL,
    receita_rf_publicos   REAL,
    valor_receita_aluguel REAL,
    valor_receita_pacote  REAL,

    -- Captação
    captacao_bruta_m      REAL,
    resgate_m             REAL,
    captacao_liquida_m    REAL,
    captacao_ted          REAL,
    captacao_st           REAL,
    captacao_ota          REAL,
    captacao_rf           REAL,
    captacao_td           REAL,
    captacao_prev         REAL,

    -- Patrimônio NET
    net_m_anterior        REAL,
    net_m                 REAL,

    -- Alocação por classe
    aloc_renda_fixa       REAL,
    aloc_fi               REAL,
    aloc_renda_variavel   REAL,
    aloc_fundos           REAL,
    aloc_financeiro       REAL,
    aloc_previdencia      REAL,
    aloc_outros           REAL,

    -- Controle
    importado_em          TEXT DEFAULT (datetime('now','localtime')),
    atualizado_em         TEXT
  );

  CREATE TABLE IF NOT EXISTS perfil_bancario (
    conta               TEXT PRIMARY KEY,
    cod_escritorio      TEXT,
    escritorio          TEXT,
    uso_conta           TEXT,
    status_corretora    TEXT,
    elegivel_turbo      TEXT,
    faixa_auc           TEXT,
    portabilidade       TEXT,
    status_pgto_boleto  TEXT,
    status_pgto_fatura  TEXT,
    status_chave_pix    TEXT,
    principalidade      TEXT,
    segmento            TEXT,
    faixa_pgto_m0       TEXT,
    faixa_pgto_m1       TEXT,
    faixa_pgto_m2       TEXT,
    importado_em        TEXT DEFAULT (datetime('now','localtime')),
    atualizado_em       TEXT
  );

  CREATE TABLE IF NOT EXISTS iea (
    id                        INTEGER PRIMARY KEY AUTOINCREMENT,
    mes_ano                   TEXT,
    cod_grupo                 TEXT,
    grupo_economico           TEXT,
    assessor                  TEXT,
    flag_comercial            TEXT,
    modelo_servir             REAL,
    iea                       REAL,
    prospeccao                REAL,
    relacionamento            REAL,
    qtde_carteiras_simuladas  INTEGER,
    pct_contas_acessadas      REAL,
    qtde_xperformance         INTEGER,
    qtde_fp_realizados        INTEGER,
    qtde_fp_pf300k            INTEGER,
    qtde_recebidos_opi        INTEGER,
    qtde_opi_rec_pf300k       INTEGER,
    qtde_enviados_opi         INTEGER,
    qtde_opi_env_pf300k       INTEGER,
    qtde_leads_crm            INTEGER,
    heavy_user_crm            TEXT,
    pct_ativ_criticas         REAL,
    pct_ativ_ea               REAL,
    habilitacoes              INTEGER,
    pct_sem_aporte_6m         REAL,
    pct_sem_ordem             REAL,
    qtde_ais_treinados        INTEGER,
    pct_estoque_treinado      REAL,
    qtde_entrada_a            INTEGER,
    qtde_saidas_30m           INTEGER,
    qtde_bloqueados           INTEGER,
    migracoes_saida           TEXT,
    t_medio_conversao         REAL,
    qtde_ais_baixa_rem        INTEGER,
    indice_saude              REAL,
    qtde_ruptura              INTEGER,
    pct_detratores_nps        REAL,
    pct_baixa_rent_300k       REAL,
    pct_enquadramento         REAL,
    churn_bruto               INTEGER,
    reativacoes               INTEGER,
    importado_em              TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS qualidade_alocacao (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    data                TEXT,
    assessor            TEXT,
    conta               TEXT,
    perfil              TEXT,
    custodia_total      REAL,
    politica_cadastrada TEXT,
    politica_sugerida   TEXT,
    segmentacao         TEXT,
    aderencia           REAL,
    gap_over            REAL,
    gap_under           REAL,
    rentabilidade       REAL,
    saldo_global        REAL,
    importado_em        TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS saldo (
    conta        TEXT PRIMARY KEY,
    cliente      TEXT,
    assessor     TEXT,
    saldo_d0     REAL,
    saldo_d1     REAL,
    saldo_d2     REAL,
    saldo_d3     REAL,
    total        REAL,
    importado_em TEXT DEFAULT (datetime('now','localtime')),
    atualizado_em TEXT
  );

  CREATE TABLE IF NOT EXISTS captacao (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    cod_cliente TEXT,
    data        TEXT,
    captacao    REAL,
    tipo        TEXT,
    importado_em TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS diversificacao (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    assessor         TEXT,
    cliente          TEXT,
    produto          TEXT,
    sub_produto      TEXT,
    cnpj_fundo       TEXT,
    ativo            TEXT,
    emissor          TEXT,
    data_vencimento  TEXT,
    quantidade       REAL,
    net              REAL,
    data             TEXT,
    importado_em     TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS perfil_conta (
    cod_conta    TEXT PRIMARY KEY,
    perfil       TEXT,
    suitability  TEXT,
    importado_em TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS indicadores_assessor (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    assessor    TEXT,
    mes_ano     TEXT,
    net         REAL,
    captacao    REAL,
    receita     REAL,
    importado_em TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS positivador (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    data             TEXT,
    assessor         TEXT,
    conta            TEXT,
    perfil           TEXT,
    custodia_total   REAL,
    segmentacao      TEXT,
    aderencia        TEXT,
    importado_em     TEXT DEFAULT (datetime('now','localtime'))
  );
  
    CREATE TABLE IF NOT EXISTS plano (
    assessor TEXT PRIMARY KEY,
    meta_captacao REAL,
    captacao_prevista REAL,
    tickets_planejados INTEGER,
    comissao_projetada REAL,
    importado_em TEXT DEFAULT (datetime('now','localtime'))
  );

`);
console.log("✅ Tabelas verificadas/criadas");

// ── MAPEAMENTO: campo do frontend → coluna do banco ───────────────────────────
const MAPA_POSITIVADOR = {
  assessor:             "assessor",
  conta:                "cliente",
  profissao:            "profissao",
  sexo:                 "sexo",
  tipo_pessoa:          "tipo_pessoa",
  segmento:             "segmento",
  segmentacao_cliente:  "segmentacao_cliente",
  suitability:          "suitability",
  termo_qualificado:    "termo_qualificado",
  termo_profissional:   "termo_profissional",
  data_cadastro:        "data_cadastro",
  data_nascimento:      "data_nascimento",
  fez_segundo_aporte:   "fez_segundo_aporte",
  status:               "status",
  ativou_em_m:          "ativou_em_m",
  evadiu_em_m:          "evadiu_em_m",
  data:                 "data_referencia",
  operou_bolsa:         "operou_bolsa",
  operou_fundo:         "operou_fundo",
  operou_renda_fixa:    "operou_renda_fixa",
  aplicacao_financeira: "aplicacao_financeira",
  receita_mes:          "receita_mes",
  receita_bovespa:      "receita_bovespa",
  receita_futuros:      "receita_futuros",
  receita_rf_bancarios: "receita_rf_bancarios",
  receita_rf_privados:  "receita_rf_privados",
  receita_rf_publicos:  "receita_rf_publicos",
  valor_receita_aluguel:"valor_receita_aluguel",
  valor_receita_pacote: "valor_receita_pacote",
  captacao_bruta:       "captacao_bruta_m",
  resgate:              "resgate_m",
  captacao_liquida:     "captacao_liquida_m",
  captacao_ted:         "captacao_ted",
  captacao_st:          "captacao_st",
  captacao_ota:         "captacao_ota",
  captacao_rf:          "captacao_rf",
  captacao_td:          "captacao_td",
  captacao_prev:        "captacao_prev",
  net_m_anterior:       "net_m_anterior",
  net_m_atual:          "net_m",
  aloc_renda_fixa:      "aloc_renda_fixa",
  aloc_fi:              "aloc_fi",
  aloc_renda_variavel:  "aloc_renda_variavel",
  aloc_fundos:          "aloc_fundos",
  aloc_financeiro:      "aloc_financeiro",
  aloc_previdencia:     "aloc_previdencia",
  aloc_outros:          "aloc_outros",
};

function toNum(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  const s = String(v).replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

const CAMPOS_NUMERICOS = new Set([
  "aplicacao_financeira","receita_mes","receita_bovespa","receita_futuros",
  "receita_rf_bancarios","receita_rf_privados","receita_rf_publicos",
  "valor_receita_aluguel","valor_receita_pacote",
  "captacao_bruta_m","resgate_m","captacao_liquida_m",
  "captacao_ted","captacao_st","captacao_ota","captacao_rf","captacao_td","captacao_prev",
  "net_m_anterior","net_m",
  "aloc_renda_fixa","aloc_fi","aloc_renda_variavel","aloc_fundos",
  "aloc_financeiro","aloc_previdencia","aloc_outros",
]);

// ── HEALTH CHECK ──────────────────────────────────────────────────────────────
app.get("/api/ping", (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// ── CLIENTES (positivador_completo + qualidade_alocacao + saldo) ─────────────
// Atualizado para trazer a aderência e o saldo_d0 unificados com um LEFT JOIN
app.get("/api/clientes", (req, res) => {
  try {
    const { status, suitability, segmento, search } = req.query;
    let sql = `
      SELECT p.*, 
             q.aderencia, q.gap_over, q.gap_under,
             s.saldo_d0 as saldo_real_d0
      FROM positivador_completo p
      LEFT JOIN qualidade_alocacao q ON p.cliente = q.conta
      LEFT JOIN saldo s ON p.cliente = s.conta
      WHERE 1=1
    `;
    const params = [];
    if (status)      { sql += " AND UPPER(p.status) = ?";      params.push(status.toUpperCase()); }
    if (suitability) { sql += " AND UPPER(p.suitability) = ?"; params.push(suitability.toUpperCase()); }
    if (segmento)    { sql += " AND p.segmento = ?";            params.push(segmento); }
    if (search)      { sql += " AND (CAST(p.cliente AS TEXT) LIKE ? OR p.profissao LIKE ?)";
                       params.push(`%${search}%`, `%${search}%`); }
    sql += " ORDER BY p.net_m DESC";
    res.json(db.prepare(sql).all(...params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Detalhamento cruzado do cliente
app.get("/api/clientes/:conta", (req, res) => {
  try {
    const cli = db.prepare(`
      SELECT p.*, 
             q.aderencia, q.gap_over, q.gap_under,
             s.saldo_d0 as saldo_real_d0
      FROM positivador_completo p
      LEFT JOIN qualidade_alocacao q ON p.cliente = q.conta
      LEFT JOIN saldo s ON p.cliente = s.conta
      WHERE p.cliente = ?
    `).get(req.params.conta);
    
    if (!cli) return res.status(404).json({ error: "Cliente não encontrado" });
    
    const div = db.prepare("SELECT * FROM diversificacao WHERE cliente = ? ORDER BY net DESC").all(req.params.conta);
    const perfil = db.prepare("SELECT * FROM perfil_conta WHERE cod_conta = ?").get(req.params.conta);
    const cap = db.prepare("SELECT * FROM captacao WHERE cod_cliente = ? ORDER BY data DESC").all(req.params.conta);
    
    // 👇 ADICIONADO: Puxando o Perfil Bancário do banco
    const perfilBancario = db.prepare("SELECT * FROM perfil_bancario WHERE conta = ?").get(req.params.conta) || null;
    
    res.json({ ...cli, diversificacao: div, perfil_conta: perfil, perfil_bancario: perfilBancario, captacoes: cap });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POSITIVADOR RESUMO ────────────────────────────────────────────────────────
app.get("/api/positivador", (req, res) => {
  try {
    res.json(db.prepare("SELECT * FROM positivador ORDER BY custodia_total DESC").all());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CAPTAÇÃO ──────────────────────────────────────────────────────────────────
app.get("/api/captacao", (req, res) => {
  try {
    const rows  = db.prepare("SELECT * FROM captacao ORDER BY data DESC").all();
    const total = rows.reduce((s, r) => s + (r.captacao || 0), 0);
    res.json({ rows, total, count: rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DIVERSIFICAÇÃO ────────────────────────────────────────────────────────────
app.get("/api/diversificacao", (req, res) => {
  try {
    const { cliente } = req.query;
    let sql = "SELECT * FROM diversificacao WHERE 1=1";
    const params = [];
    if (cliente) { sql += " AND cliente = ?"; params.push(cliente); }
    sql += " ORDER BY net DESC";
    res.json(db.prepare(sql).all(...params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/diversificacao/consolidado", (req, res) => {
  try {
    res.json(db.prepare(`
      SELECT produto, sub_produto,
             COUNT(DISTINCT cliente) as clientes,
             ROUND(SUM(net), 2)      as net_total,
             ROUND(SUM(quantidade), 2) as quantidade_total
      FROM diversificacao WHERE net IS NOT NULL
      GROUP BY produto, sub_produto ORDER BY net_total DESC
    `).all());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PERFIL CONTA ──────────────────────────────────────────────────────────────
app.get("/api/perfil-conta", (req, res) => {
  try {
    res.json(db.prepare("SELECT * FROM perfil_conta").all());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SALDO CONSOLIDADO ─────────────────────────────────────────────────────────
app.get("/api/saldo", (req, res) => {
  try {
    const { conta, assessor } = req.query;
    let sql = "SELECT * FROM saldo WHERE 1=1";
    const params = [];
    if (conta)    { sql += " AND conta = ?";    params.push(conta); }
    if (assessor) { sql += " AND assessor = ?"; params.push(assessor); }
    sql += " ORDER BY total DESC";
    res.json(db.prepare(sql).all(...params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PERFIL BANCÁRIO ───────────────────────────────────────────────────────────
app.get("/api/perfil-bancario", (req, res) => {
  try {
    const { conta, status_corretora, principalidade } = req.query;
    let sql = "SELECT * FROM perfil_bancario WHERE 1=1";
    const params = [];
    if (conta)            { sql += " AND conta = ?";             params.push(conta); }
    if (status_corretora) { sql += " AND status_corretora = ?";  params.push(status_corretora); }
    if (principalidade)   { sql += " AND principalidade = ?";    params.push(principalidade); }
    res.json(db.prepare(sql).all(...params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── IEA — ÍNDICE DE ESFORÇOS DO ASSESSOR ─────────────────────────────────────
app.get("/api/iea", (req, res) => {
  try {
    const { assessor, mes_ano } = req.query;
    let sql = "SELECT * FROM iea WHERE 1=1";
    const params = [];
    if (assessor) { sql += " AND assessor = ?"; params.push(assessor); }
    if (mes_ano)  { sql += " AND mes_ano = ?";  params.push(mes_ano); }
    sql += " ORDER BY mes_ano DESC, iea DESC";
    res.json(db.prepare(sql).all(...params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── QUALIDADE DE ALOCAÇÃO ─────────────────────────────────────────────────────
app.get("/api/qualidade-alocacao", (req, res) => {
  try {
    const { conta, assessor } = req.query;
    let sql = "SELECT * FROM qualidade_alocacao WHERE 1=1";
    const params = [];
    if (conta)    { sql += " AND conta = ?";    params.push(conta); }
    if (assessor) { sql += " AND assessor = ?"; params.push(assessor); }
    sql += " ORDER BY custodia_total DESC";
    res.json(db.prepare(sql).all(...params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── INDICADORES ASSESSOR ──────────────────────────────────────────────────────
app.get("/api/indicadores", (req, res) => {
  try {
    res.json(db.prepare("SELECT * FROM indicadores_assessor ORDER BY mes_ano DESC").all());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
app.get("/api/dashboard", (req, res) => {
  try {
    const net_total = db.prepare("SELECT ROUND(SUM(net_m),2) as v FROM positivador_completo").get()?.v || 0;
    const receita   = db.prepare("SELECT ROUND(SUM(receita_mes),2) as v FROM positivador_completo").get()?.v || 0;
    const captacao  = db.prepare("SELECT ROUND(SUM(captacao_bruta_m),2) as v FROM positivador_completo").get()?.v || 0;
    const resgate   = db.prepare("SELECT ROUND(SUM(resgate_m),2) as v FROM positivador_completo").get()?.v || 0;
    const ativos    = db.prepare("SELECT COUNT(*) as v FROM positivador_completo WHERE UPPER(status) = 'ATIVO'").get()?.v || 0;
    const inativos  = db.prepare("SELECT COUNT(*) as v FROM positivador_completo WHERE UPPER(status) = 'INATIVO'").get()?.v || 0;

    const por_suitability = db.prepare(`
      SELECT suitability, COUNT(*) as clientes, ROUND(SUM(net_m),2) as net
      FROM positivador_completo GROUP BY suitability ORDER BY net DESC
    `).all();

    const por_segmento = db.prepare(`
      SELECT segmentacao_cliente, COUNT(*) as clientes, ROUND(SUM(net_m),2) as net
      FROM positivador_completo GROUP BY segmentacao_cliente ORDER BY net DESC
    `).all();

    const top10 = db.prepare(`
      SELECT cliente, suitability, segmentacao_cliente, net_m, receita_mes, captacao_bruta_m
      FROM positivador_completo ORDER BY net_m DESC LIMIT 10
    `).all();

    // ── ADIÇÃO DO PASSO 3.2 ──
    // Pega as metas do plano comercial
    const plano = db.prepare("SELECT * FROM plano LIMIT 1").get() || null;
    
    // Pega o último IEA do assessor
    const iea_recente = db.prepare("SELECT * FROM iea ORDER BY mes_ano DESC LIMIT 1").get() || null;

    res.json({ 
      net_total, 
      receita, 
      captacao, 
      resgate, 
      ativos, 
      inativos, 
      por_suitability, 
      por_segmento, 
      top10,
      plano,       // Agora enviado para o front-end
      iea_recente  // Agora enviado para o front-end
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// ── IMPORTAÇÃO COM UPSERT AUTOMÁTICO ─────────────────────────────────────────
app.post("/api/importar/:tabela", (req, res) => {
  try {
    const { tabela } = req.params;
    const { dados }  = req.body;
    if (!dados || !Array.isArray(dados)) return res.status(400).json({ error: "dados inválidos" });

    const tabelasPermitidas = [
      "positivador", "positivador_completo",
      "saldo", "captacao", "diversificacao",
      "qualidade_alocacao", "iea",
      "perfil_bancario",
      "perfil_conta", "indicadores_assessor"
    ];
    if (!tabelasPermitidas.includes(tabela))
      return res.status(400).json({ error: "tabela não permitida" });

    let inseridos = 0, atualizados = 0, erros = 0;

    if (tabela === "saldo") {
      const COLS     = ["conta","cliente","assessor","saldo_d0","saldo_d1","saldo_d2","saldo_d3","total"];
      const COLS_NUM = new Set(["saldo_d0","saldo_d1","saldo_d2","saldo_d3","total"]);

      const upsert = db.transaction((rows) => {
        for (const row of rows) {
          try {
            const reg = { atualizado_em: new Date().toISOString() };
            for (const c of COLS) {
              const v = row[c] ?? null;
              reg[c] = COLS_NUM.has(c) ? toNum(v) : (v === "" ? null : v);
            }
            if (!reg.conta) { erros++; continue; }

            const existe = db.prepare("SELECT 1 FROM saldo WHERE conta = ?").get(reg.conta);
            if (existe) {
              const upCols = [...COLS.filter(c => c !== "conta"), "atualizado_em"];
              db.prepare(`
                UPDATE saldo SET ${upCols.map(c => `${c} = ?`).join(", ")}
                WHERE conta = ?
              `).run([...upCols.map(c => reg[c]), reg.conta]);
              atualizados++;
            } else {
              const allCols = [...COLS, "atualizado_em"];
              db.prepare(`
                INSERT INTO saldo (${allCols.join(",")})
                VALUES (${allCols.map(() => "?").join(",")})
              `).run(allCols.map(c => reg[c]));
              inseridos++;
            }
          } catch (rowErr) {
            console.error("Erro saldo:", rowErr.message);
            erros++;
          }
        }
      });
      upsert(dados);
      return res.json({
        ok: true, tabela, inseridos, atualizados, erros, total: dados.length,
        msg: `${inseridos} novos · ${atualizados} atualizados · ${erros} erros`
      });
    }

    if (tabela === "perfil_bancario") {
      const COLS = [
        "conta","cod_escritorio","escritorio","uso_conta","status_corretora",
        "elegivel_turbo","faixa_auc","portabilidade","status_pgto_boleto",
        "status_pgto_fatura","status_chave_pix","principalidade","segmento",
        "faixa_pgto_m0","faixa_pgto_m1","faixa_pgto_m2",
      ];
      const upsert = db.transaction((rows) => {
        for (const row of rows) {
          try {
            const reg = { atualizado_em: new Date().toISOString() };
            for (const c of COLS) reg[c] = row[c] ?? null;
            if (!reg.conta) { erros++; continue; }

            const existe = db.prepare("SELECT 1 FROM perfil_bancario WHERE conta = ?").get(reg.conta);
            if (existe) {
              const upCols = [...COLS.filter(c => c !== "conta"), "atualizado_em"];
              db.prepare(`
                UPDATE perfil_bancario SET ${upCols.map(c => `${c} = ?`).join(", ")}
                WHERE conta = ?
              `).run([...upCols.map(c => reg[c]), reg.conta]);
              atualizados++;
            } else {
              const allCols = [...COLS, "atualizado_em"];
              db.prepare(`
                INSERT INTO perfil_bancario (${allCols.join(",")})
                VALUES (${allCols.map(() => "?").join(",")})
              `).run(allCols.map(c => reg[c]));
              inseridos++;
            }
          } catch (rowErr) {
            console.error("Erro perfil_bancario:", rowErr.message);
            erros++;
          }
        }
      });
      upsert(dados);
      return res.json({
        ok: true, tabela, inseridos, atualizados, erros, total: dados.length,
        msg: `${inseridos} novos · ${atualizados} atualizados · ${erros} erros`
      });
    }

    if (tabela === "positivador_completo") {
      const upsert = db.transaction((rows) => {
        for (const row of rows) {
          try {
            const reg = { atualizado_em: new Date().toISOString() };
            for (const [campoFront, colBanco] of Object.entries(MAPA_POSITIVADOR)) {
              const val = row[campoFront] ?? row[colBanco] ?? null;
              reg[colBanco] = CAMPOS_NUMERICOS.has(colBanco) ? toNum(val) : (val === "" ? null : val);
            }

            if (!reg.cliente) { erros++; continue; } 

            const existe = db.prepare("SELECT 1 FROM positivador_completo WHERE cliente = ?").get(reg.cliente);

            if (existe) {
              const cols = Object.keys(reg).filter(c => c !== "cliente");
              db.prepare(`
                UPDATE positivador_completo
                SET ${cols.map(c => `${c} = ?`).join(", ")}
                WHERE cliente = ?
              `).run([...cols.map(c => reg[c]), reg.cliente]);
              atualizados++;
            } else {
              const cols = Object.keys(reg);
              db.prepare(`
                INSERT INTO positivador_completo (${cols.join(", ")})
                VALUES (${cols.map(() => "?").join(", ")})
              `).run(cols.map(c => reg[c]));
              inseridos++;
            }
          } catch (rowErr) {
            console.error("Erro na linha:", rowErr.message, row);
            erros++;
          }
        }
      });

      upsert(dados);
      return res.json({
        ok: true, tabela,
        inseridos, atualizados, erros,
        total: dados.length,
        msg: `${inseridos} novos · ${atualizados} atualizados · ${erros} erros`
      });
    }

    if (tabela === "iea") {
      const COLS_NUM = new Set([
        "modelo_servir","iea","prospeccao","relacionamento",
        "pct_contas_acessadas","pct_ativ_criticas","pct_ativ_ea",
        "pct_sem_aporte_6m","pct_sem_ordem","pct_estoque_treinado",
        "t_medio_conversao","indice_saude","pct_detratores_nps",
        "pct_baixa_rent_300k","pct_enquadramento",
      ]);
      const COLS_INT = new Set([
        "qtde_carteiras_simuladas","qtde_xperformance","qtde_fp_realizados",
        "qtde_fp_pf300k","qtde_recebidos_opi","qtde_opi_rec_pf300k",
        "qtde_enviados_opi","qtde_opi_env_pf300k","qtde_leads_crm",
        "habilitacoes","qtde_ais_treinados","qtde_entrada_a","qtde_saidas_30m",
        "qtde_bloqueados","qtde_ais_baixa_rem","qtde_ruptura",
        "churn_bruto","reativacoes",
      ]);
      const COLS = [
        "mes_ano","cod_grupo","grupo_economico","assessor","flag_comercial",
        "modelo_servir","iea","prospeccao","relacionamento",
        "qtde_carteiras_simuladas","pct_contas_acessadas","qtde_xperformance",
        "qtde_fp_realizados","qtde_fp_pf300k","qtde_recebidos_opi","qtde_opi_rec_pf300k",
        "qtde_enviados_opi","qtde_opi_env_pf300k","qtde_leads_crm","heavy_user_crm",
        "pct_ativ_criticas","pct_ativ_ea","habilitacoes","pct_sem_aporte_6m",
        "pct_sem_ordem","qtde_ais_treinados","pct_estoque_treinado","qtde_entrada_a",
        "qtde_saidas_30m","qtde_bloqueados","migracoes_saida","t_medio_conversao",
        "qtde_ais_baixa_rem","indice_saude","qtde_ruptura","pct_detratores_nps",
        "pct_baixa_rent_300k","pct_enquadramento","churn_bruto","reativacoes",
      ];

      const upsert = db.transaction((rows) => {
        for (const row of rows) {
          try {
            const reg = {};
            for (const c of COLS) {
              const raw = row[c] ?? null;
              if      (COLS_NUM.has(c)) reg[c] = toNum(raw);
              else if (COLS_INT.has(c)) reg[c] = raw !== null ? parseInt(raw) || null : null;
              else                      reg[c] = raw === "" ? null : raw;
            }
            if (!reg.assessor) { erros++; continue; }

            const existe = db.prepare(
              "SELECT 1 FROM iea WHERE assessor = ? AND mes_ano = ?"
            ).get(reg.assessor, reg.mes_ano);

            if (existe) {
              const upCols = COLS.filter(c => c !== "assessor" && c !== "mes_ano");
              db.prepare(`
                UPDATE iea SET ${upCols.map(c => `${c} = ?`).join(", ")}
                WHERE assessor = ? AND mes_ano = ?
              `).run([...upCols.map(c => reg[c]), reg.assessor, reg.mes_ano]);
              atualizados++;
            } else {
              db.prepare(`
                INSERT INTO iea (${COLS.join(",")}) VALUES (${COLS.map(() => "?").join(",")})
              `).run(COLS.map(c => reg[c]));
              inseridos++;
            }
          } catch (rowErr) {
            console.error("Erro IEA linha:", rowErr.message);
            erros++;
          }
        }
      });
      upsert(dados);
      return res.json({
        ok: true, tabela, inseridos, atualizados, erros, total: dados.length,
        msg: `${inseridos} novos · ${atualizados} atualizados · ${erros} erros`
      });
    }

    if (tabela === "qualidade_alocacao") {
      const COLS_NUM = new Set(["custodia_total","aderencia","gap_over","gap_under","rentabilidade","saldo_global"]);
      const COLS     = ["data","assessor","conta","perfil","custodia_total","politica_cadastrada","politica_sugerida","segmentacao","aderencia","gap_over","gap_under","rentabilidade","saldo_global"];

      const MAPA = {
        data: "data", assessor: "assessor", conta: "conta",
        perfil: "perfil", custodia_total: "custodia_total",
        politica_cadastrada: "politica_cadastrada", politica_sugerida: "politica_sugerida",
        segmentacao: "segmentacao", aderencia: "aderencia",
        gap_over: "gap_over", gap_under: "gap_under",
        rentabilidade: "rentabilidade", saldo_global: "saldo_global",
      };

      const upsert = db.transaction((rows) => {
        const assessorRef = rows[0]?.assessor ?? null;
        const dataRef     = rows[0]?.data ?? null;
        if (assessorRef && dataRef) {
          db.prepare("DELETE FROM qualidade_alocacao WHERE assessor = ? AND data = ?").run(assessorRef, dataRef);
        } else {
          db.prepare("DELETE FROM qualidade_alocacao").run();
        }
        const ins = db.prepare(`INSERT INTO qualidade_alocacao (${COLS.join(",")}) VALUES (${COLS.map(() => "?").join(",")})`);
        for (const row of rows) {
          try {
            ins.run(COLS.map(c => {
              const v = row[c] ?? Object.entries(MAPA).find(([k,v2]) => v2 === c && row[k] !== undefined)?.[1] ?? null;
              const val = row[c] ?? null;
              return COLS_NUM.has(c) ? toNum(val) : val;
            }));
            inseridos++;
          } catch (e) { erros++; }
        }
      });
      upsert(dados);
      return res.json({ ok: true, tabela, inseridos, erros, total: dados.length,
        msg: `${inseridos} registros de qualidade de alocação importados` });
    }

    if (tabela === "diversificacao") {
      const upsert = db.transaction((rows) => {
        const assessorRef = rows[0]?.assessor ?? null;
        const dataRef     = rows[0]?.data ?? null;

        if (assessorRef && dataRef) {
          db.prepare("DELETE FROM diversificacao WHERE assessor = ? AND data = ?").run(assessorRef, dataRef);
        } else {
          db.prepare("DELETE FROM diversificacao").run();
        }

        const cols   = ["assessor","cliente","produto","sub_produto","cnpj_fundo","ativo","emissor","data_vencimento","quantidade","net","data"];
        const insert = db.prepare(`INSERT INTO diversificacao (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`);

        for (const row of rows) {
          try {
            insert.run(cols.map(c => {
              const v = row[c] ?? null;
              return (c === "quantidade" || c === "net") ? toNum(v) : v;
            }));
            inseridos++;
          } catch (e) { erros++; }
        }
      });
      upsert(dados);
      return res.json({ ok: true, tabela, inseridos, erros, total: dados.length,
        msg: `${inseridos} registros de diversificação importados` });
    }
    db.prepare(`DELETE FROM ${tabela}`).run();
    const cols   = Object.keys(dados[0]).filter(k => k !== "id" && k !== "importado_em");
    const insert = db.prepare(`INSERT INTO ${tabela} (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`);
    const insertMany = db.transaction((rows) => {
      for (const row of rows) {
        try { insert.run(cols.map(c => row[c] ?? null)); inseridos++; }
        catch (e) { erros++; }
      }
    });
    insertMany(dados);

    res.json({ ok: true, tabela, inseridos, erros, total: dados.length });
  } catch (e) {
    console.error("Erro importação:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── START ─────────────────────────────────────────────────────────────────────
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 API CRM rodando em http://localhost:${PORT}`);
  console.log(`   GET  /api/ping`);
  console.log(`   GET  /api/dashboard`);
  console.log(`   GET  /api/clientes`);
  console.log(`   GET  /api/clientes/:conta`);
  console.log(`   GET  /api/positivador`);
  console.log(`   GET  /api/captacao`);
  console.log(`   GET  /api/diversificacao`);
  console.log(`   GET  /api/diversificacao/consolidado`);
  console.log(`   GET  /api/perfil-conta`);
  console.log(`   GET  /api/indicadores`);
  console.log(`   GET  /api/saldo`);
  console.log(`   GET  /api/perfil-bancario`);
  console.log(`   GET  /api/iea`);
  console.log(`   GET  /api/qualidade-alocacao`);
  console.log(`   POST /api/importar/:tabela`);
});
