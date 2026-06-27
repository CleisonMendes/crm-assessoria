const BASE = "http://localhost:3001/api";

async function get(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = qs ? `${BASE}${path}?${qs}` : `${BASE}${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API erro ${res.status}: ${path}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API erro ${res.status}: ${path}`);
  return res.json();
}

export const api = {
  ping:                    ()         => get("/ping"),
  dashboard:               ()         => get("/dashboard"),
  clientes:                (filtros)  => get("/clientes", filtros),
  cliente:                 (conta)    => get(`/clientes/${conta}`),
  positivador:             ()         => get("/positivador"),
  captacao:                ()         => get("/captacao"),
  diversificacao:          (cliente)  => get("/diversificacao", cliente ? { cliente } : {}),
  diversificacaoConsolid:  ()         => get("/diversificacao/consolidado"),
  perfilConta:             ()         => get("/perfil-conta"),
  indicadores:             ()         => get("/indicadores"),
  importar:                (tabela, dados) => post(`/importar/${tabela}`, { dados }),
};