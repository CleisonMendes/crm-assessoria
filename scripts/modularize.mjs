import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const sourcePath =
  "C:/Users/cleis/.codex/attachments/0b7764fc-6c6d-4067-919f-69b8c4561a1a/pasted-text.txt";
const root = process.cwd();
const lines = readFileSync(sourcePath, "utf8").replace(/\r\n/g, "\n").split("\n");

const slice = (start, end) => lines.slice(start - 1, end).join("\n");
const ensure = (file) => mkdirSync(dirname(join(root, file)), { recursive: true });
const write = (file, content) => {
  ensure(file);
  writeFileSync(join(root, file), `${content.trim()}\n`, "utf8");
};
const exportConsts = (code, names) => {
  let out = code;
  for (const name of names) {
    out = out.replace(new RegExp(`(^|\\n)const ${name}\\b`), `$1export const ${name}`);
  }
  return out;
};
const exportFunctions = (code, names) => {
  let out = code;
  for (const name of names) {
    out = out.replace(new RegExp(`(^|\\n)function ${name}\\b`), `$1export function ${name}`);
  }
  return out;
};

write(
  "src/config/prototype.js",
  `
export const PROTOTYPE_MODE = true;
export const DEFAULT_USER_ID = "u1";

export const USE_SUPABASE = false;
export const SUPA_URL = "https://SEU_PROJETO.supabase.co";
export const SUPA_KEY = "SUA_ANON_KEY";
`,
);

write(
  "src/services/storage.js",
  `
export const db = {
  get: async (key) => {
    try {
      if (!window.storage) return null;
      const result = await window.storage.get(key);
      return result ? JSON.parse(result.value) : null;
    } catch {
      return null;
    }
  },
  set: async (key, value) => {
    try {
      if (!window.storage) return;
      await window.storage.set(key, JSON.stringify(value));
    } catch {}
  },
};
`,
);

write("src/utils/formatters.js", exportConsts(slice(201, 205), ["fB", "fB2", "fP", "fDT", "fD"]));
write("src/utils/numbers.js", "export const sv = v => (v==null||isNaN(v)) ? 0 : +v;");

write(
  "src/data/clientes.js",
  `${exportConsts(slice(69, 111), ["CLIENTES_DB"])}

import { sv } from "../utils/numbers.js";

${exportConsts(slice(162, 168), ["NET_TOT", "REC_TOT", "CAP_TOT", "RES_TOT", "D0_TOT", "N_AT", "N_IN"])}`,
);

write(
  "src/data/carteiras.js",
  `import { CLIENTES_DB } from "./clientes.js";
import { sv } from "../utils/numbers.js";

${exportConsts(`${slice(113, 146)}\n${slice(149, 160)}`, ["CART_UNIQUE", "ALC", "CARTEIRAS"])}`,
);

write("src/data/plano.js", exportConsts(slice(170, 176), ["PLANO"]));
write("src/data/seeds.js", exportConsts(slice(178, 199), ["OPORT_SEED", "TAREFAS_SEED"]));
write("src/data/users.js", exportConsts(slice(216, 221), ["USERS_DEF"]));

write("src/theme/themes.js", exportConsts(slice(208, 212), ["TH"]));
write(
  "src/theme/ThemeContext.jsx",
  `import { createContext, useContext } from "react";
import { TH } from "./themes.js";

export const TC = createContext(TH.navy);
export const useT = () => useContext(TC);`,
);

write(
  "src/components/ui/Card.jsx",
  `import { useT } from "../../theme/ThemeContext.jsx";

${exportFunctions(slice(223, 225), ["Crd"])}

export const Card = Crd;`,
);
write(
  "src/components/ui/KPI.jsx",
  `import { useT } from "../../theme/ThemeContext.jsx";

${exportFunctions(slice(227, 239), ["KPI"])}`,
);
write(
  "src/components/ui/ProgressBar.jsx",
  `import { useT } from "../../theme/ThemeContext.jsx";

${exportFunctions(slice(241, 244), ["ProgressBar"])}`,
);
write(
  "src/components/ui/Badge.jsx",
  `import { useT } from "../../theme/ThemeContext.jsx";

${exportFunctions(slice(246, 259), ["Bdg"])}

export const Badge = Bdg;`,
);
write(
  "src/components/ui/Button.jsx",
  `import { useT } from "../../theme/ThemeContext.jsx";

${exportFunctions(slice(261, 264), ["Btn"])}

export const Button = Btn;`,
);
write(
  "src/components/ui/Input.jsx",
  `import { useT } from "../../theme/ThemeContext.jsx";

${exportFunctions(slice(266, 268), ["Inp"])}

export const Input = Inp;`,
);
write(
  "src/components/ui/Select.jsx",
  `import { useT } from "../../theme/ThemeContext.jsx";

${exportFunctions(slice(270, 274), ["SelEl"])}

export const Select = SelEl;`,
);
write(
  "src/components/ui/index.js",
  `
export { Crd, Card } from "./Card.jsx";
export { KPI } from "./KPI.jsx";
export { ProgressBar } from "./ProgressBar.jsx";
export { Bdg, Badge } from "./Badge.jsx";
export { Btn, Button } from "./Button.jsx";
export { Inp, Input } from "./Input.jsx";
export { SelEl, Select } from "./Select.jsx";
`,
);

write(
  "src/components/charts/Donut.jsx",
  `import { useT } from "../../theme/ThemeContext.jsx";

${exportFunctions(slice(276, 291), ["Donut"])}`,
);
write(
  "src/components/charts/LineChart.jsx",
  `import { useEffect, useRef, useState } from "react";
import { useT } from "../../theme/ThemeContext.jsx";

${exportFunctions(slice(293, 323), ["LChart"])}

export const LineChart = LChart;`,
);
write(
  "src/components/charts/Gauge.jsx",
  `import { useT } from "../../theme/ThemeContext.jsx";

${exportFunctions(slice(325, 345), ["Gauge"])}`,
);
write(
  "src/components/charts/index.js",
  `
export { Donut } from "./Donut.jsx";
export { LChart, LineChart } from "./LineChart.jsx";
export { Gauge } from "./Gauge.jsx";
`,
);

write(
  "src/components/shell/Clock.jsx",
  `import { useEffect, useState } from "react";
import { useT } from "../../theme/ThemeContext.jsx";

${exportFunctions(slice(347, 358), ["Clock"])}`,
);
write(
  "src/components/shell/ThemeSw.jsx",
  `import { useEffect, useRef, useState } from "react";
import { TH } from "../../theme/themes.js";
import { useT } from "../../theme/ThemeContext.jsx";

${exportFunctions(slice(360, 379), ["ThemeSw"])}`,
);
write(
  "src/components/shell/UserMenu.jsx",
  `import { useEffect, useRef, useState } from "react";
import { USERS_DEF } from "../../data/users.js";
import { useT } from "../../theme/ThemeContext.jsx";

${exportFunctions(slice(381, 416), ["UserMenu"])}`,
);
write(
  "src/components/shell/Login.jsx",
  `import { useState } from "react";
import { PLANO } from "../../data/plano.js";
import { USERS_DEF } from "../../data/users.js";
import { useT } from "../../theme/ThemeContext.jsx";
import { Btn } from "../ui/index.js";

${exportFunctions(slice(418, 449), ["Login"])}`,
);
write(
  "src/components/shell/index.js",
  `
export { Clock } from "./Clock.jsx";
export { ThemeSw } from "./ThemeSw.jsx";
export { UserMenu } from "./UserMenu.jsx";
export { Login } from "./Login.jsx";
`,
);

write(
  "src/features/clientes/ClienteCard.jsx",
  `import { useT } from "../../theme/ThemeContext.jsx";
import { Bdg, Crd, ProgressBar } from "../../components/ui/index.js";
import { fB, fP } from "../../utils/formatters.js";

${exportFunctions(slice(451, 483), ["CCard"])}

export const ClienteCard = CCard;`,
);
write(
  "src/features/clientes/ClienteDetalhe.jsx",
  `import { useState } from "react";
import { CARTEIRAS } from "../../data/carteiras.js";
import { Crd, KPI, Bdg, ProgressBar } from "../../components/ui/index.js";
import { Donut, Gauge, LChart } from "../../components/charts/index.js";
import { useT } from "../../theme/ThemeContext.jsx";
import { fB, fB2, fD, fDT, fP } from "../../utils/formatters.js";

${exportFunctions(slice(485, 578), ["CDetalhe"])}

export const ClienteDetalhe = CDetalhe;`,
);
write(
  "src/features/clientes/Clientes.jsx",
  `import { useMemo, useState } from "react";
import { CLIENTES_DB } from "../../data/clientes.js";
import { Crd, KPI, SelEl, Inp, Bdg, ProgressBar } from "../../components/ui/index.js";
import { fB, fP } from "../../utils/formatters.js";
import { CCard } from "./ClienteCard.jsx";
import { CDetalhe } from "./ClienteDetalhe.jsx";

${exportFunctions(slice(703, 773), ["Clientes"])}`,
);

write(
  "src/features/dashboard/Dashboard.jsx",
  `import { CLIENTES_DB, NET_TOT, REC_TOT, CAP_TOT, RES_TOT, D0_TOT, N_AT, N_IN } from "../../data/clientes.js";
import { PLANO } from "../../data/plano.js";
import { CARTEIRAS } from "../../data/carteiras.js";
import { Crd, KPI, Bdg, ProgressBar } from "../../components/ui/index.js";
import { Donut, Gauge, LChart } from "../../components/charts/index.js";
import { useT } from "../../theme/ThemeContext.jsx";
import { fB, fB2, fDT, fP } from "../../utils/formatters.js";
import { sv } from "../../utils/numbers.js";

${exportFunctions(slice(580, 701), ["Dash"])}

export const Dashboard = Dash;`,
);

write(
  "src/features/carteira/Carteira.jsx",
  `import { useState } from "react";
import { CLIENTES_DB } from "../../data/clientes.js";
import { CARTEIRAS } from "../../data/carteiras.js";
import { Crd, KPI, SelEl } from "../../components/ui/index.js";
import { Donut, Gauge, LChart } from "../../components/charts/index.js";
import { useT } from "../../theme/ThemeContext.jsx";
import { fB, fB2, fP } from "../../utils/formatters.js";

${exportFunctions(slice(775, 838), ["Carteira"])}`,
);

write(
  "src/features/oportunidades/Oportunidades.jsx",
  `import { useState } from "react";
import { CLIENTES_DB } from "../../data/clientes.js";
import { db } from "../../services/storage.js";
import { Crd, KPI, Btn, Bdg } from "../../components/ui/index.js";
import { useT } from "../../theme/ThemeContext.jsx";
import { fB } from "../../utils/formatters.js";
import { sv } from "../../utils/numbers.js";

${exportFunctions(slice(840, 925), ["Oport"])}

export const Oportunidades = Oport;`,
);

write(
  "src/features/tarefas/Tarefas.jsx",
  `import { useState } from "react";
import { CLIENTES_DB } from "../../data/clientes.js";
import { db } from "../../services/storage.js";
import { Crd, KPI, Btn } from "../../components/ui/index.js";
import { useT } from "../../theme/ThemeContext.jsx";
import { fD } from "../../utils/formatters.js";

${exportFunctions(slice(927, 1009), ["Tarefas"])}`,
);

write(
  "src/features/reunioes/Reunioes.jsx",
  `import { useState } from "react";
import { CLIENTES_DB } from "../../data/clientes.js";
import { PLANO } from "../../data/plano.js";
import { db } from "../../services/storage.js";
import { Crd, KPI, Btn } from "../../components/ui/index.js";
import { useT } from "../../theme/ThemeContext.jsx";
import { fDT } from "../../utils/formatters.js";

${exportFunctions(slice(1011, 1125), ["gerarPS1", "Reunioes"])}`,
);

write(
  "src/features/plano/Plano.jsx",
  `import { PLANO } from "../../data/plano.js";
import { Crd, KPI, ProgressBar } from "../../components/ui/index.js";
import { Gauge, LChart } from "../../components/charts/index.js";
import { useT } from "../../theme/ThemeContext.jsx";
import { fB } from "../../utils/formatters.js";

${exportFunctions(slice(1127, 1213), ["Plano"])}`,
);

write(
  "src/features/alertas/Alertas.jsx",
  `import { CLIENTES_DB } from "../../data/clientes.js";
import { Crd, KPI, Btn } from "../../components/ui/index.js";
import { useT } from "../../theme/ThemeContext.jsx";
import { fB, fDT, fP } from "../../utils/formatters.js";

${exportFunctions(slice(1215, 1299), ["Alertas"])}`,
);

write(
  "src/features/admin/Admin.jsx",
  `import { PLANO } from "../../data/plano.js";
import { USERS_DEF } from "../../data/users.js";
import { Crd, KPI } from "../../components/ui/index.js";
import { useT } from "../../theme/ThemeContext.jsx";

${exportFunctions(slice(1301, 1390), ["Admin"])}`,
);

write(
  "src/features/importacao/Importacao.jsx",
  `import { useEffect, useRef, useState } from "react";
import { db } from "../../services/storage.js";
import { Crd, Btn } from "../../components/ui/index.js";
import { useT } from "../../theme/ThemeContext.jsx";

${exportFunctions(slice(1392, 1465), ["Importacao"]).replace(
    'await import("https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs")',
    'await import(/* @vite-ignore */ "https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs")',
  )}`,
);

const appShell = slice(1467, 1602)
  .replace('export default function App(){', 'export default function App(){')
  .replace('const [ok,setOk]               = useState(false);', 'const defaultUser = USERS_DEF.find(u=>u.id===DEFAULT_USER_ID) || USERS_DEF[0];\n  const [ok,setOk]               = useState(PROTOTYPE_MODE);')
  .replace('const [user,setUser]           = useState(null);', 'const [user,setUser]           = useState(PROTOTYPE_MODE ? defaultUser : null);');

write(
  "src/App.jsx",
  `import { useCallback, useEffect, useState } from "react";
import { PROTOTYPE_MODE, DEFAULT_USER_ID } from "./config/prototype.js";
import { db } from "./services/storage.js";
import { TH } from "./theme/themes.js";
import { TC } from "./theme/ThemeContext.jsx";
import { USERS_DEF } from "./data/users.js";
import { TAREFAS_SEED, OPORT_SEED } from "./data/seeds.js";
import { Clock, Login, ThemeSw, UserMenu } from "./components/shell/index.js";
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

${appShell}`,
);
