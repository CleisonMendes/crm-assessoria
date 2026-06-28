import { useEffect, useRef, useState } from "react";
import { db } from "../../services/storage.js";
import { Crd, Btn } from "../../components/ui/index.js";
import { useT } from "../../theme/ThemeContext.jsx";

// ── MAPEAMENTO INTELIGENTE DE COLUNAS ────────────────────────────────────────
const MAPA_COLUNAS = {
  positivador: {
    assessor:             ["assessor"],
    conta:                ["cliente"],
    profissao:            ["profissão", "profissao"],
    sexo:                 ["sexo"],
    tipo_pessoa:          ["tipo pessoa", "tipo_pessoa"],
    segmento:             ["segmento"],
    segmentacao_cliente:  ["segmentação cliente", "segmentacao cliente"],
    suitability:          ["suitability"],
    termo_qualificado:    ["termo qualificado"],
    termo_profissional:   ["termo profissional"],
    data_cadastro:        ["data de cadastro"],
    data_nascimento:      ["data de nascimento"],
    fez_segundo_aporte:   ["fez segundo aporte"],
    status:               ["status"],
    ativou_em_m:          ["ativou em m?", "ativou em m", "ativo em m?", "ativo em m"],
    evadiu_em_m:          ["evadiu em m?", "evadiu em m"],
    data:                 ["data"],
    operou_bolsa:         ["operou bolsa?", "operou bolsa"],
    operou_fundo:         ["operou fundo?", "operou fundo"],
    operou_renda_fixa:    ["operou renda fixa?", "operou renda fixa"],
    aplicacao_financeira: ["aplicação financeira declarada", "aplicacao financeira declarada"],
    receita_mes:          ["receita no mês", "receita no mes"],
    receita_bovespa:      ["receita bovespa"],
    receita_futuros:      ["receita futuros"],
    receita_rf_bancarios: ["receita rf bancários", "receita rf bancarios"],
    receita_rf_privados:  ["receita rf privados"],
    receita_rf_publicos:  ["receita rf públicos", "receita rf publicos"],
    valor_receita_aluguel:["valor receita aluguel"],
    valor_receita_pacote: ["valor receita complemento pacote"],
    captacao_bruta:       ["captação bruta em m", "captacao bruta em m"],
    resgate:              ["resgate em m"],
    captacao_liquida:     ["captação líquida em m", "captacao liquida em m"],
    captacao_ted:         ["captação ted", "captacao ted"],
    captacao_st:          ["captação st", "captacao st"],
    captacao_ota:         ["captação ota", "captacao ota"],
    captacao_rf:          ["captação rf", "captacao rf"],
    captacao_td:          ["captação td", "captacao td"],
    captacao_prev:        ["captação prev", "captacao prev"],
    net_m_anterior:       ["net em m-1"],
    net_m_atual:          ["net em m"],
    aloc_renda_fixa:      ["renda fixa"],
    aloc_fi:              ["fundos imobiliários", "fundos imobiliarios"],
    aloc_renda_variavel:  ["renda variável", "renda variavel"],
    aloc_fundos:          ["fundos"],
    aloc_financeiro:      ["financeiro"],
    aloc_previdencia:     ["previdência", "previdencia"],
    aloc_outros:          ["outros"],
  },

  saldo: {
    conta:    ["conta"],
    cliente:  ["cliente", "nome"],
    assessor: ["assessor"],
    saldo_d0: ["d0", "d 0"],
    saldo_d1: ["d+1", "d +1", "d1"],
    saldo_d2: ["d+2", "d +2", "d2"],
    saldo_d3: ["d+3", "d +3", "d3"],
    total:    ["total"],
  },

  diversificacao: {
    assessor:        ["assessor"],
    cliente:         ["cliente"],
    produto:         ["produto"],
    sub_produto:     ["sub produto", "sub_produto", "subproduto"],
    cnpj_fundo:      ["cnpj fundo", "cnpj_fundo", "cnpj"],
    ativo:           ["ativo"],
    emissor:         ["emissor"],
    data_vencimento: ["data de vencimento", "data vencimento", "vencimento"],
    quantidade:      ["quantidade"],
    net:             ["net"],
    data:            ["data"],
  },

  plano: {
    assessor:           ["assessor", "cód. assessor", "cod assessor", "advisor", "nome"],
    meta_captacao:      ["meta captação", "meta captacao", "meta", "target"],
    captacao_prevista:  ["captação prevista", "captacao prevista", "captação", "captacao", "previsto"],
    tickets_planejados: ["tickets", "tickets planejados", "operações", "operacoes"],
    comissao_projetada: ["comissão", "comissao", "comissão projetada", "receita projetada", "fee"],
  },

  qualidade_alocacao: {
    data:                ["data (mês e ano)", "data mes e ano", "data", "mes", "mês"],
    assessor:            ["cód. assessor", "cod. assessor", "assessor"],
    conta:               ["cód. conta", "cod. conta", "conta"],
    perfil:              ["perfil de investimentos", "perfil", "suitability"],
    custodia_total:      ["custódia total", "custodia total", "custódia", "custodia", "patrimônio", "aum"],
    politica_cadastrada: ["política cadastrada", "politica cadastrada"],
    politica_sugerida:   ["política sugerida", "politica sugerida"],
    segmentacao:         ["segmentação", "segmentacao", "segmento"],
    aderencia:           ["aderência da carteira", "aderencia da carteira", "aderência", "aderencia"],
    gap_over:            ["gap over", "gap_over"],
    gap_under:           ["gap under", "gap_under"],
    rentabilidade:       ["% rentabilidade relativa", "rentabilidade relativa", "rentabilidade"],
    saldo_global:        ["% saldo global", "saldo global"],
  },

  perfil_bancario: {
    conta:              ["cód.conta", "cod.conta", "cód. conta", "cod. conta", "conta"],
    cod_escritorio:     ["cód. escritório", "cod. escritorio"],
    escritorio:         ["escritório", "escritorio"],
    uso_conta:          ["uso_conta", "uso conta"],
    status_corretora:   ["status corretora"],
    elegivel_turbo:     ["elegível turbo conta", "elegivel turbo conta", "turbo conta"],
    faixa_auc:          ["faixa auc", "auc"],
    portabilidade:      ["portabilidade"],
    status_pgto_boleto: ["status pgto boleto", "pgto boleto"],
    status_pgto_fatura: ["status pgto fatura", "pgto fatura"],
    status_chave_pix:   ["status chave pix", "chave pix"],
    principalidade:     ["principalidade conta", "principalidade"],
    segmento:           ["segmento"],
    faixa_pgto_m0:      ["faixa pagamento m0", "pagamento m0"],
    faixa_pgto_m1:      ["faixa pagamento m-1", "pagamento m-1"],
    faixa_pgto_m2:      ["faixa pagamento m-2", "pagamento m-2"],
  },

  iea: {
    mes_ano:                  ["mês/ano", "mes/ano", "mês", "mes"],
    cod_grupo:                ["cód. grupo", "cod. grupo", "cod grupo"],
    grupo_economico:          ["grupo econômico", "grupo economico"],
    assessor:                 ["cód. assessor", "cod. assessor", "assessor"],
    flag_comercial:           ["flag comercial"],
    modelo_servir:            ["modelo de servir"],
    iea:                      ["iea"],
    prospeccao:               ["prospecção", "prospeccao"],
    relacionamento:           ["relacionamento"],
    qtde_carteiras_simuladas: ["qtde carteiras simuladas", "carteiras simuladas"],
    pct_contas_acessadas:     ["% contas acessadas", "contas acessadas"],
    qtde_xperformance:        ["qtde xperformance", "xperformance"],
    qtde_fp_realizados:       ["qtde fp realizados", "fp realizados"],
    qtde_fp_pf300k:           ["qtde fp realizados pf+300k", "fp realizados pf"],
    qtde_recebidos_opi:       ["qtde recebidos opi", "recebidos opi"],
    qtde_opi_rec_pf300k:      ["qtde opi recebidos pf+300k"],
    qtde_enviados_opi:        ["qtde enviados opi", "enviados opi"],
    qtde_opi_env_pf300k:      ["qtde opi enviados pf+300k"],
    qtde_leads_crm:           ["qtde leads cadastrados crm", "leads crm"],
    heavy_user_crm:           ["heavy user crm"],
    pct_ativ_criticas:        ["% atividades críticas tratadas", "% atividades criticas"],
    pct_ativ_ea:              ["% atividades ea tratadas", "atividades ea"],
    habilitacoes:             ["habilitações", "habilitacoes"],
    pct_sem_aporte_6m:        ["% contas que não aportam 6m", "sem aporte 6m"],
    pct_sem_ordem:            ["% contas sem ordem", "sem ordem"],
    qtde_ais_treinados:       ["qtde ais treinados", "ais treinados"],
    pct_estoque_treinado:     ["% estoque comercial treinado", "estoque treinado"],
    qtde_entrada_a:           ["qtde entrada a", "entrada a"],
    qtde_saidas_30m:          ["qtde saídas +30m", "saídas +30m", "saidas +30m"],
    qtde_bloqueados:          ["qtde bloqueados", "bloqueados"],
    migracoes_saida:          ["migrações saída", "migracoes saida"],
    t_medio_conversao:        ["t médio conversão com", "t medio conversao"],
    qtde_ais_baixa_rem:       ["qtde ais baixa remuneração", "baixa remuneração"],
    indice_saude:             ["índice de saúde", "indice de saude"],
    qtde_ruptura:             ["qtde contas em ruptura", "ruptura"],
    pct_detratores_nps:       ["% clientes detratores nps", "detratores nps"],
    pct_baixa_rent_300k:      ["% baixa rentabilidade +300k", "baixa rentabilidade"],
    pct_enquadramento:        ["% enquadramento", "enquadramento"],
    churn_bruto:              ["churn bruto"],
    reativacoes:              ["reativações", "reativacoes"],
  },

  xperformance: {
    produto:       ["produto", "fundo", "ativo", "papel"],
    rentabilidade: ["rentabilidade", "retorno", "return", "rendimento", "perf"],
    benchmark:     ["benchmark", "índice", "indice", "referência", "referencia"],
    diferenca:     ["diferença", "diferenca", "spread", "alpha", "gap"],
    movimentacao:  ["movimentação", "movimentacao", "movimento", "resgate", "aplicação"],
    periodo:       ["período", "periodo", "data", "competência", "competencia", "mês", "mes"],
  },
};

const TABELA_MAP = {
  positivador:        "positivador_completo",
  saldo:              "saldo",
  diversificacao:     "diversificacao",
  qualidade_alocacao: "qualidade_alocacao",
  perfil_bancario:    "perfil_bancario",
  iea:                "iea",
  plano:              "plano",
  xperformance:       "xperformance",
};

// ── LABELS AMIGÁVEIS PARA PREVIEW ────────────────────────────────────────────
const LABELS_POSITIVADOR = {
  assessor:             "Assessor",
  conta:                "Conta/Código",
  profissao:            "Profissão",
  sexo:                 "Sexo",
  tipo_pessoa:          "Tipo Pessoa",
  segmento:             "Segmento",
  segmentacao_cliente:  "Segmentação",
  suitability:          "Suitability",
  termo_qualificado:    "Termo Qualif.",
  termo_profissional:   "Termo Prof.",
  data_cadastro:        "Dt. Cadastro",
  data_nascimento:      "Dt. Nascimento",
  fez_segundo_aporte:   "2º Aporte?",
  status:               "Status",
  ativo_em_m:           "Ativo M?",
  evadiu_em_m:          "Evadiu M?",
  operou_bolsa:         "Op. Bolsa?",
  operou_fundo:         "Op. Fundo?",
  operou_renda_fixa:    "Op. RF?",
  aplicacao_financeira: "Apl. Declarada",
  receita_mes:          "Receita Mês",
  receita_bovespa:      "Rec. Bovespa",
  receita_futuros:      "Rec. Futuros",
  receita_rf_bancarios: "Rec. RF Banc.",
  receita_rf_privados:  "Rec. RF Priv.",
  receita_rf_publicos:  "Rec. RF Púb.",
  valor_receita_aluguel:"Rec. Aluguel",
  valor_receita_pacote: "Rec. Pacote",
  captacao_bruta:       "Cap. Bruta",
  resgate:              "Resgate",
  captacao_liquida:     "Cap. Líquida",
  captacao_ted:         "Cap. TED",
  captacao_st:          "Cap. ST",
  captacao_ota:         "Cap. OTA",
  captacao_rf:          "Cap. RF",
  captacao_td:          "Cap. TD",
  captacao_prev:        "Cap. PREV",
  net_m_anterior:       "NET M-1",
  net_m_atual:          "NET M Atual",
  aloc_renda_fixa:      "Renda Fixa",
  aloc_fi:              "FII",
  aloc_renda_variavel:  "Renda Variável",
  aloc_fundos:          "Fundos",
  aloc_financeiro:      "Financeiro",
  aloc_previdencia:     "Previdência",
  aloc_outros:          "Outros",
};

function detectarMapeamento(headers, tipo) {
  const mapa = MAPA_COLUNAS[tipo] || {};
  const resultado = {};
  const usado = new Set();

  for (const [campo, variacoes] of Object.entries(mapa)) {
    for (let i = 0; i < headers.length; i++) {
      if (usado.has(i)) continue;
      const h = headers[i].toLowerCase().trim();
      const encontrou = variacoes.some(v => h.includes(v.toLowerCase()) || v.toLowerCase().includes(h));
      if (encontrou) {
        resultado[campo] = i;
        usado.add(i);
        break;
      }
    }
  }
  return resultado;
}

function excelSerialParaData(serial) {
  if (serial === "" || serial === null || serial === undefined) return serial;
  if (typeof serial === "string" && serial.includes("/")) return serial;
  
  const num = Number(serial);
  if (isNaN(num) || num < 100) return serial;
  
  const data = new Date(Math.round((num - 25569) * 86400 * 1000));
  if (isNaN(data.getTime())) return serial;
  
  return data.toLocaleDateString("pt-BR");
}

const CAMPOS_DATA = new Set([
  "data", "data_cadastro", "data_nascimento", "data_vencimento",
  "mes_ano", "data_competencia", "periodo"
]);

function aplicarMapeamento(rows, mapeamento, headers) {
  return rows.map(row => {
    const obj = {};
    for (const [campo, idx] of Object.entries(mapeamento)) {
      const valor = row[idx] ?? "";
      obj[campo] = CAMPOS_DATA.has(campo) ? excelSerialParaData(valor) : valor;
    }
    headers.forEach((h, i) => {
      const jaMapeado = Object.values(mapeamento).includes(i);
      if (!jaMapeado && h) obj[`_extra_${h}`] = row[i] ?? "";
    });
    return obj;
  });
}

// ── TIPOS DE IMPORTAÇÃO ──────────────────────────────────────────────────────
const TIPOS_IMPORT = {
  positivador: {
    label: "Positivador", icon: "📋",
    descricao: "Clientes · Status · NET · Captação · Receita · Alocação",
    formatos: ".xlsx · .xls · .csv",
    dbKey: "crm_import_positivador",
    histKey: "crm_hist_positivador",
    destino: "Base de clientes"
  },
  saldo: {
    label: "Saldo Consolidado", icon: "💰",
    descricao: "Saldo D0 por conta",
    formatos: ".xlsx · .xls · .csv",
    dbKey: "crm_import_saldo",
    histKey: "crm_hist_saldo",
    destino: "Base de clientes"
  },
  diversificacao: {
    label: "Diversificação", icon: "🥧",
    descricao: "Alocação por produto + Aderência",
    formatos: ".xlsx · .xls · .csv",
    dbKey: "crm_import_diversificacao",
    histKey: "crm_hist_diversificacao",
    destino: "Ficha individual do cliente"
  },
  plano: {
    label: "Plano Comercial", icon: "🎯",
    descricao: "Metas, captação prevista, tickets e comissões por assessor",
    formatos: ".xlsx · .xls · .csv",
    dbKey: "crm_import_plano",
    histKey: "crm_hist_plano",
    destino: "Painel Admin → Consolidado por Assessor"
  },
  qualidade_alocacao: {
    label: "Qualidade de Alocação", icon: "🏅",
    descricao: "Aderência · Gap Over/Under · Rentabilidade Relativa · Custódia por conta",
    formatos: ".xlsx · .xls · .csv",
    dbKey: "crm_import_qualidade",
    histKey: "crm_hist_qualidade",
    destino: "Ficha do cliente + Carteira"
  },
  perfil_bancario: {
    label: "Perfil Bancário", icon: "🏦",
    descricao: "Elegibilidade · Portabilidade · Pix · Boleto · Fatura · Faixas de Pagamento",
    formatos: ".xlsx · .xls · .csv",
    dbKey: "crm_import_perfil_bancario",
    histKey: "crm_hist_perfil_bancario",
    destino: "Ficha do cliente + Oportunidades"
  },
  iea: {
    label: "IEA – Esforços do Assessor", icon: "💪",
    descricao: "IEA · Prospecção · Relacionamento · Atividades · Churn · Saúde do Assessor",
    formatos: ".xlsx · .xls · .csv",
    dbKey: "crm_import_iea",
    histKey: "crm_hist_iea",
    destino: "Painel Admin + Dashboard Assessor"
  },
  xperformance: {
    label: "XPerformance", icon: "📈",
    descricao: "Rentabilidade, performance, benchmark e movimentações",
    formatos: ".xlsx · .xls · .csv",
    dbKey: "crm_import_xperformance",
    histKey: "crm_hist_xperformance",
    destino: "Ficha individual do cliente"
  }
};

function Bdg({ label, color }) {
  return (
    <span style={{
      background: `${color}22`, color,
      border: `1px solid ${color}55`,
      borderRadius: 6, padding: "2px 8px",
      fontSize: 10, fontWeight: 700, whiteSpace: "nowrap"
    }}>{label}</span>
  );
}

const GRUPOS_POSITIVADOR = [
  { label: "Identificação",  campos: ["assessor","conta","profissao","sexo","tipo_pessoa"] },
  { label: "Perfil",         campos: ["segmento","segmentacao_cliente","suitability","termo_qualificado","termo_profissional"] },
  { label: "Status",         campos: ["data_cadastro","data_nascimento","fez_segundo_aporte","status","ativo_em_m","evadiu_em_m"] },
  { label: "Operações",      campos: ["operou_bolsa","operou_fundo","operou_renda_fixa","aplicacao_financeira"] },
  { label: "Receita",        campos: ["receita_mes","receita_bovespa","receita_futuros","receita_rf_bancarios","receita_rf_privados","receita_rf_publicos","valor_receita_aluguel","valor_receita_pacote"] },
  { label: "Captação",       campos: ["captacao_bruta","resgate","captacao_liquida","captacao_ted","captacao_st","captacao_ota","captacao_rf","captacao_td","captacao_prev"] },
  { label: "Patrimônio NET", campos: ["net_m_anterior","net_m_atual"] },
  { label: "Alocação",       campos: ["aloc_renda_fixa","aloc_fi","aloc_renda_variavel","aloc_fundos","aloc_financeiro","aloc_previdencia","aloc_outros"] },
];


// ── PAINEL: IMPORTAÇÃO EM LOTE INTELIGENTE ───────────────────────────────────
function PainelImportLote({ t, onImportar }) {
  const [arquivos, setArquivos] = useState({});
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);

  // Carrega o último log ao montar o componente
  useEffect(() => {
    db.get("crm_lote_last_log").then(savedLog => {
      if (savedLog && Array.isArray(savedLog) && savedLog.length > 0) {
        setLog(savedLog);
      }
    });
  }, []);

  // Função auxiliar para atualizar o log na tela e salvar no IndexedDB simultaneamente
  const addLog = (msg) => {
    setLog(prev => {
      const next = [...prev, msg];
      db.set("crm_lote_last_log", next);
      return next;
    });
  };

  // Função para limpar todos os arquivos e o log (tanto da tela quanto do banco)
  const limparTudo = () => {
    setArquivos({});
    setLog([]);
    db.set("crm_lote_last_log", []); // Limpa a memória
  };

  // Mágica 1: Lê os nomes dos arquivos e adivinha para qual categoria eles vão
  const classificarArquivo = (file) => {
    const nome = file.name.toLowerCase();
    
    if (nome.includes("positivador") || nome.includes("clientes") || nome.includes("base")) return "positivador";
    if (nome.includes("saldo") || nome.includes("d0")) return "saldo";
    if (nome.includes("diversificacao") || nome.includes("diversificação") || nome.includes("produtos")) return "diversificacao";
    if (nome.includes("plano") || nome.includes("comercial") || nome.includes("metas")) return "plano";
    if (nome.includes("qualidade") || nome.includes("aderencia") || nome.includes("aderência") || nome.includes("alocacao")) return "qualidade_alocacao";
    if (nome.includes("perfil") || nome.includes("bancario") || nome.includes("banco") || nome.includes("conta")) return "perfil_bancario";
    if (nome.includes("iea") || nome.includes("esforço") || nome.includes("esforco")) return "iea";
    if (nome.includes("xperformance") || nome.includes("performance") || nome.includes("rentabilidade")) return "xperformance";
    
    return null; // Não encontrou classificação
  };

  const lidarComArquivos = (files) => {
    const novosArquivos = { ...arquivos };
    const naoReconhecidos = [];

    Array.from(files).forEach(file => {
      const tipo = classificarArquivo(file);
      if (tipo) {
        novosArquivos[tipo] = file;
      } else {
        naoReconhecidos.push(file.name);
      }
    });

    setArquivos(novosArquivos);
    
    if (naoReconhecidos.length > 0) {
      addLog(`⚠️ Arquivos não classificados automaticamente: ${naoReconhecidos.join(", ")} (Anexe-os manualmente)`);
    } else {
      addLog(`✅ ${Array.from(files).length} arquivo(s) classificado(s) com sucesso!`);
    }
  };

  const lidarComArquivoManual = (tipo, file) => {
    if (file) setArquivos(prev => ({ ...prev, [tipo]: file }));
  };

  const removerArquivo = (tipo) => {
    setArquivos(prev => {
      const novo = { ...prev };
      delete novo[tipo];
      return novo;
    });
  };

  const processarLote = async () => {
    const tipos = Object.keys(arquivos);
    if (tipos.length === 0) return;

    setLoading(true);
    
    // Inicia um novo log do zero (limpando a operação anterior)
    const logInicial = ["🚀 Iniciando importação em lote..."];
    setLog(logInicial);
    await db.set("crm_lote_last_log", logInicial);

    try {
      const { read, utils } = await import(/* @vite-ignore */ "https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs");
      let apiModulo = null;
      try {
        apiModulo = await import("../../services/api.js");
      } catch(e) {
        addLog("⚠️ Backend offline. Salvando apenas localmente.");
      }

      for (const tipo of tipos) {
        const file = arquivos[tipo];
        const cfg = TIPOS_IMPORT[tipo];
        addLog(`\n⏳ Processando ${cfg.label}...`);

        try {
          const buf = await file.arrayBuffer();
          const wb = read(buf);
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = utils.sheet_to_json(ws, { header: 1, defval: "" });

          if (!rows.length) { 
            addLog(`  ❌ O arquivo está vazio.`); 
            continue; 
          }

          const headers = rows[0].map(h => String(h || "").trim());
          const dataRows = rows.slice(1).filter(r => r.some(v => v !== ""));
          const mp = detectarMapeamento(headers.map(h => h.toLowerCase()), tipo);
          
          const dadosMapeados = aplicarMapeamento(dataRows, mp, headers);
          const tabelaBanco = TABELA_MAP[tipo] || tipo;

          // Enviar para o banco / API
          let resultado = null;
          if (apiModulo && apiModulo.api) {
            resultado = await apiModulo.api.importar(tabelaBanco, dadosMapeados);
          }
          await db.set(cfg.dbKey, dadosMapeados);

          addLog(`  ✅ Sucesso! ${dadosMapeados.length} registros salvos.`);
          
          // Registra no histórico individual para manter compatibilidade com as abas únicas
          const entry = {
            data: new Date().toLocaleString("pt-BR"),
            arquivo: file.name,
            add: resultado?.inseridos ?? dadosMapeados.length,
            upd: resultado?.atualizados ?? 0,
            skip: resultado?.erros ?? 0,
            camposMapeados: Object.keys(mp)
          };
          const hLocal = await db.get(cfg.histKey) || [];
          await db.set(cfg.histKey, [entry, ...hLocal.slice(0, 9)]);

        } catch (erroArquivo) {
          addLog(`  ❌ Erro ao ler planilha: ${erroArquivo.message}`);
        }
      }

      addLog(`\n🎉 Processamento em lote finalizado com sucesso!`);
      
      if (onImportar) await onImportar("lote", null);

    } catch (e) {
      addLog(`❌ Erro crítico no lote: ${e.message}`);
    } finally {
      setLoading(false);
      setArquivos({}); 
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      
      {/* SUPER DROPZONE - A mágica acontece aqui */}
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { 
          e.preventDefault(); 
          setDrag(false); 
          if (e.dataTransfer.files.length > 0) lidarComArquivos(e.dataTransfer.files); 
        }}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${drag ? t.gold : t.brd}`,
          borderRadius: 10, padding: "40px 20px", textAlign: "center",
          cursor: "pointer", background: drag ? `${t.gold}08` : t.lt, 
          transition: "all .2s", marginBottom: 10
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
        <div style={{ color: t.tx, fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
          Arraste e solte TODAS as planilhas aqui
        </div>
        <div style={{ color: t.txd, fontSize: 13 }}>
          O sistema vai ler os nomes e classificar cada uma automaticamente.
        </div>
        
        {/* Input escondido permitindo múltipla seleção */}
        <input 
          ref={fileRef} 
          type="file" 
          multiple 
          accept=".xlsx,.xls,.csv" 
          style={{ display: "none" }} 
          onChange={e => lidarComArquivos(e.target.files)} 
        />
      </div>

      <div style={{ color: t.tx, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
        Arquivos Prontos para Importação
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {Object.entries(TIPOS_IMPORT).map(([chave, cfg]) => {
          const temArquivo = arquivos[chave] !== undefined;
          return (
            <div key={chave} style={{
              background: t.lt, border: `1px solid ${temArquivo ? t.green : t.brd}`,
              borderRadius: 8, padding: "12px", position: "relative",
              transition: "border .2s"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span>{cfg.icon}</span>
                <span style={{ color: t.tx, fontWeight: 600, fontSize: 12 }}>{cfg.label}</span>
              </div>
              
              {temArquivo ? (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: `${t.green}15`, padding: "6px 10px", borderRadius: 6, border: `1px solid ${t.green}33` }}>
                  <span style={{ color: t.green, fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80%" }}>
                    ✅ {arquivos[chave].name}
                  </span>
                  <button onClick={() => removerArquivo(chave)} style={{ background: "none", border: "none", color: t.red, cursor: "pointer", fontSize: 12, fontWeight: "bold" }}>X</button>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    id={`file-${chave}`}
                    accept=".xlsx,.xls,.csv"
                    style={{ display: "none" }}
                    onChange={e => lidarComArquivoManual(chave, e.target.files[0])}
                  />
                  <label htmlFor={`file-${chave}`} style={{
                    display: "block", textAlign: "center", padding: "8px",
                    background: `${t.blue}08`, color: t.blue, borderRadius: 6,
                    fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px dashed ${t.blue}66`
                  }}>
                    + Anexar Manualmente
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* BOTÕES DE AÇÃO GLOBAIS */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 10 }}>
        {(Object.keys(arquivos).length > 0 || log.length > 0) && (
          <Btn onClick={limparTudo} disabled={loading} outline style={{ borderColor: t.red, color: t.red, fontSize: 14 }}>
            🗑️ Limpar Tudo
          </Btn>
        )}
        
        {Object.keys(arquivos).length > 0 && (
          <Btn onClick={processarLote} disabled={loading} style={{ background: t.gold, color: "#000", border: "none", padding: "10px 20px", fontSize: 14 }}>
            {loading ? "⏳ Processando Lote..." : `🚀 Finalizar Importação de ${Object.keys(arquivos).length} arquivo(s)`}
          </Btn>
        )}
      </div>

      {/* LOG EM LOTE SALVO */}
      {log.length > 0 && (
        <Crd>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Último Log de Execução</div>
          {log.map((l, i) => (
            <div key={i} style={{
              color: l.startsWith("❌") ? t.red : l.startsWith("✅") ? t.green : l.startsWith("⚠️") ? t.amber : t.txm,
              fontSize: 11, marginBottom: 4, fontFamily: "monospace", whiteSpace: "pre-wrap", lineHeight: 1.4
            }}>{l}</div>
          ))}
        </Crd>
      )}
    </div>
  );
}


// ── PAINEL DE UMA ABA (UNITÁRIO ORIGINAL) ────────────────────────────────────
function PainelImport({ tipo, t, onImportar }) {
  const cfg = TIPOS_IMPORT[tipo];
  const [log, setLog] = useState([]);
  const [preview, setPreview] = useState(null);
  const [hist, setHist] = useState([]);
  const [drag, setDrag] = useState(false);
  const [grupoAtivo, setGrupoAtivo] = useState(0);
  const fileRef = useRef(null);

  useEffect(() => {
    db.get(cfg.histKey).then(h => { if (h) setHist(h); });
  }, [cfg.histKey]);

  const proc = async file => {
    if (!file) return;
    setLog([`📂 Lendo: ${file.name}...`]);
    setPreview(null);
    setGrupoAtivo(0);
    try {
      const { read, utils } = await import(/* @vite-ignore */ "https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs");
      const buf = await file.arrayBuffer();
      const wb = read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = utils.sheet_to_json(ws, { header: 1, defval: "" });
      if (!rows.length) { setLog(["❌ Arquivo vazio"]); return; }

      const headers = rows[0].map(h => String(h || "").trim());
      const dataRows = rows.slice(1).filter(r => r.some(v => v !== ""));
      const mp = detectarMapeamento(headers.map(h => h.toLowerCase()), tipo);

      const camposEsperados   = Object.keys(MAPA_COLUNAS[tipo] || {});
      const camposMapeados    = Object.keys(mp);
      const camposNaoMapeados = camposEsperados.filter(c => !camposMapeados.includes(c));

      setLog([
        `📂 Lendo: ${file.name}...`,
        `✅ ${dataRows.length} linhas detectadas · ${headers.length} colunas no arquivo`,
        `✅ ${camposMapeados.length} campos mapeados automaticamente`,
        camposNaoMapeados.length > 0
          ? `⚠️ Campos não encontrados (ficarão em branco): ${camposNaoMapeados.join(", ")}`
          : `✅ Todos os ${camposEsperados.length} campos esperados foram mapeados`,
        `🎯 Destino: ${cfg.destino}`
      ]);

      setPreview({ file: file.name, headers, rows: dataRows.slice(0, 5), allRows: dataRows, mapeamento: mp });
    } catch (e) {
      setLog(l => [...l, `❌ Erro: ${e.message}`]);
    }
  };

  const confirmar = async () => {
    if (!preview) return;
    const dadosMapeados = aplicarMapeamento(preview.allRows, preview.mapeamento, preview.headers);

    setLog(l => [...l, `⏳ Enviando ${dadosMapeados.length} registros para o banco...`]);

    try {
      const tabelaBanco = TABELA_MAP[tipo] || tipo;
      let resultado = null;
      try {
        const { api } = await import("../../services/api.js");
        resultado = await api.importar(tabelaBanco, dadosMapeados);
      } catch (apiErr) {
        console.warn("Backend indisponível, salvando localmente:", apiErr.message);
        setLog(l => [...l, `⚠️ Backend offline — dados salvos localmente (IndexedDB)`]);
      }

      await db.set(cfg.dbKey, dadosMapeados);

      if (resultado?.ok) {
        setLog(l => [...l, `✅ ${resultado.msg || `${dadosMapeados.length} registros processados`}`]);
        if (resultado.inseridos  > 0) setLog(l => [...l, `  ➕ ${resultado.inseridos} novos registros criados`]);
        if (resultado.atualizados > 0) setLog(l => [...l, `  🔄 ${resultado.atualizados} registros atualizados`]);
        if (resultado.erros       > 0) setLog(l => [...l, `  ⚠️ ${resultado.erros} linhas com erro (verifique o console)`]);
      } else if (!resultado) {
        setLog(l => [...l, `✅ ${dadosMapeados.length} registros salvos localmente`]);
      }

      const entry = {
        data: new Date().toLocaleString("pt-BR"),
        arquivo: preview.file,
        add: resultado?.inseridos ?? dadosMapeados.length,
        upd: resultado?.atualizados ?? 0,
        skip: resultado?.erros ?? 0,
        camposMapeados: Object.keys(preview.mapeamento)
      };
      const nh = [entry, ...hist.slice(0, 9)];
      setHist(nh);
      await db.set(cfg.histKey, nh);

      if (onImportar) await onImportar(cfg.dbKey, dadosMapeados);

      setPreview(null);
    } catch (e) {
      setLog(l => [...l, `❌ Erro na importação: ${e.message}`]);
    }
  };

  const renderPreviewTabela = () => {
    if (!preview) return null;
    const previewMapeado = aplicarMapeamento(preview.rows, preview.mapeamento, preview.headers);

    if (tipo === "positivador") {
      const grupos = GRUPOS_POSITIVADOR.filter(g =>
        g.campos.some(c => preview.mapeamento[c] !== undefined)
      );
      const grupoSel = grupos[grupoAtivo] || grupos[0];
      const camposVisiveis = grupoSel
        ? grupoSel.campos.filter(c => preview.mapeamento[c] !== undefined)
        : [];

      return (
        <>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {grupos.map((g, i) => (
              <button key={g.label} onClick={() => setGrupoAtivo(i)} style={{
                background: grupoAtivo === i ? `${t.gold}22` : t.lt,
                border: `1px solid ${grupoAtivo === i ? t.gold : t.brd}`,
                borderRadius: 6, padding: "4px 10px",
                color: grupoAtivo === i ? t.gold : t.txm,
                fontSize: 10, fontWeight: grupoAtivo === i ? 700 : 400,
                cursor: "pointer"
              }}>{g.label}</button>
            ))}
          </div>

          <div style={{ overflowX: "auto", marginBottom: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${t.brd}` }}>
                  {camposVisiveis.map(c => (
                    <th key={c} style={{ padding: "5px 10px", color: t.gold, textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {LABELS_POSITIVADOR[c] || c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewMapeado.map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${t.brd}33` }}>
                    {camposVisiveis.map(c => (
                      <td key={c} style={{ padding: "4px 10px", color: t.tx, whiteSpace: "nowrap" }}>
                        {String(row[c] ?? "—").slice(0, 30)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
    }

    const camposVisiveis = [
      ...Object.keys(preview.mapeamento),
      ...preview.headers
        .filter((_, i) => !Object.values(preview.mapeamento).includes(i))
        .slice(0, 3)
        .map(h => `_extra_${h}`)
    ].slice(0, 8);

    return (
      <div style={{ overflowX: "auto", marginBottom: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${t.brd}` }}>
              {camposVisiveis.map(c => (
                <th key={c} style={{ padding: "5px 10px", color: t.gold, textAlign: "left", fontWeight: 600 }}>
                  {c.startsWith("_extra_") ? c.replace("_extra_", "") : c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewMapeado.map((row, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${t.brd}33` }}>
                {camposVisiveis.map(c => (
                  <td key={c} style={{ padding: "4px 10px", color: t.tx }}>
                    {String(row[c] ?? "—").slice(0, 35)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* INFO */}
      <div style={{ background: t.lt, borderRadius: 10, padding: "12px 16px", border: `1px solid ${t.brd}`, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ fontSize: 28 }}>{cfg.icon}</span>
        <div>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 13 }}>{cfg.label}</div>
          <div style={{ color: t.txm, fontSize: 12, marginTop: 2 }}>{cfg.descricao}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
            <Bdg label={`Destino: ${cfg.destino}`} color={t.blue} />
            <Bdg label={cfg.formatos} color={t.txm} />
            <Bdg label="Mapeamento automático" color={t.green} />
            {tipo === "positivador" && <Bdg label={`${Object.keys(MAPA_COLUNAS.positivador).length} campos`} color={t.gold} />}
          </div>
        </div>
      </div>

      {/* DRAG & DROP */}
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); proc(e.dataTransfer.files[0]); }}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${drag ? t.gold : t.brd}`,
          borderRadius: 10, padding: "32px 20px", textAlign: "center",
          cursor: "pointer", background: drag ? `${t.gold}08` : t.lt, transition: "all .2s"
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>📤</div>
        <div style={{ color: t.tx, fontWeight: 600, marginBottom: 4 }}>Arraste ou clique para importar</div>
        <div style={{ color: t.txd, fontSize: 12 }}>{cfg.formatos} · Colunas detectadas automaticamente</div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={e => proc(e.target.files[0])} />
      </div>

      {/* LOG */}
      {log.length > 0 && (
        <Crd>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Log de Execução</div>
          {log.map((l, i) => (
            <div key={i} style={{
              color: l.startsWith("❌") ? t.red : l.startsWith("✅") ? t.green : l.startsWith("⚠️") ? t.amber : t.txm,
              fontSize: 11, marginBottom: 4, fontFamily: "monospace", lineHeight: 1.5
            }}>{l}</div>
          ))}
        </Crd>
      )}

      {/* PREVIEW */}
      {preview && (
        <Crd>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
            👁️ Preview — {preview.file}
          </div>
          <div style={{ color: t.txd, fontSize: 11, marginBottom: 10 }}>
            {preview.allRows.length} linhas · {Object.keys(preview.mapeamento).length} campos mapeados
            {tipo === "positivador" && " · Use as abas abaixo para navegar entre os grupos de campos"}
          </div>

          {tipo !== "positivador" && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {Object.entries(preview.mapeamento).map(([campo, idx]) => (
                <div key={campo} style={{
                  background: `${t.green}15`, border: `1px solid ${t.green}44`,
                  borderRadius: 6, padding: "3px 8px", fontSize: 10
                }}>
                  <span style={{ color: t.green, fontWeight: 700 }}>{campo}</span>
                  <span style={{ color: t.txd }}> ← </span>
                  <span style={{ color: t.tx }}>"{preview.headers[idx]}"</span>
                </div>
              ))}
            </div>
          )}

          {renderPreviewTabela()}

          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={confirmar}>✅ Confirmar Importação</Btn>
            <Btn onClick={() => { setPreview(null); setLog([]); }} outline>Cancelar</Btn>
          </div>
        </Crd>
      )}

      {/* HISTÓRICO */}
      {hist.length > 0 && (
        <Crd>
          <div style={{ color: t.tx, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>🕓 Histórico</div>
          {hist.map((h, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
              padding: "8px 0", borderBottom: `1px solid ${t.brd}`, flexWrap: "wrap", gap: 6
            }}>
              <div>
                <div style={{ color: t.tx, fontSize: 12, fontWeight: 600 }}>📄 {h.arquivo}</div>
                <div style={{ color: t.txd, fontSize: 10 }}>{h.data}</div>
                {h.camposMapeados && (
                  <div style={{ color: t.txm, fontSize: 10, marginTop: 2 }}>
                    {h.camposMapeados.length} campos importados
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 10, fontSize: 11 }}>
                <span style={{ color: t.green }}>+{h.add} registros</span>
              </div>
            </div>
          ))}
        </Crd>
      )}
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export function Importacao({ onImportar }) {
  const t = useT();
  const abas = ["lote", ...Object.keys(TIPOS_IMPORT)];
  const [abaAtiva, setAbaAtiva] = useState("lote");

  const configAba = {
    lote:               { label: "Importação em Lote", icon: "📦", cor: t.gold || "#f59e0b" },
    positivador:        { ...TIPOS_IMPORT.positivador, cor: t.blue },
    saldo:              { ...TIPOS_IMPORT.saldo, cor: t.green },
    diversificacao:     { ...TIPOS_IMPORT.diversificacao, cor: t.amber },
    qualidade_alocacao: { ...TIPOS_IMPORT.qualidade_alocacao, cor: t.purple || "#8b5cf6" },
    perfil_bancario:    { ...TIPOS_IMPORT.perfil_bancario, cor: "#06b6d4" },
    iea:                { ...TIPOS_IMPORT.iea, cor: t.red || "#ef4444" },
    plano:              { ...TIPOS_IMPORT.plano, cor: t.gold },
    xperformance:       { ...TIPOS_IMPORT.xperformance, cor: "#10b981" }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ color: t.tx, fontWeight: 700, fontSize: 14 }}>📥 Central de Importação</div>

      {/* ABAS */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", borderBottom: `1px solid ${t.brd}`, paddingBottom: 10 }}>
        {abas.map(a => {
          const cfg = configAba[a];
          const ativa = abaAtiva === a;
          const cor = cfg.cor;
          return (
            <button
              key={a}
              onClick={() => setAbaAtiva(a)}
              style={{
                background: ativa ? `${cor}20` : "transparent",
                border: `1px solid ${ativa ? cor : t.brd}`,
                borderRadius: 8, padding: "7px 14px",
                color: ativa ? cor : t.txm,
                fontSize: 12, fontWeight: ativa ? 700 : 400,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                transition: "all .15s"
              }}
            >
              <span>{cfg.icon}</span>
              <span>{cfg.label}</span>
            </button>
          );
        })}
      </div>

      {/* CONTEÚDO */}
      {abaAtiva === "lote" 
        ? <PainelImportLote t={t} onImportar={onImportar} />
        : <PainelImport key={abaAtiva} tipo={abaAtiva} t={t} onImportar={onImportar} />
      }
    </div>
  );
}
