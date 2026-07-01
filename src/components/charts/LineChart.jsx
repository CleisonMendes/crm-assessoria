import { sv } from "../../utils/numbers.js";
import { useEffect, useRef, useState, useId, useMemo } from "react";
import { useT } from "../../theme/ThemeContext.jsx";

// ── Escala Y "nice": arredonda min/max para múltiplos legíveis ──────────────
// Evita eixos como "1.243.717,32" — gera ticks tipo "1.2M", "1.4M", etc.
function niceScale(min, max, ticks = 4) {
  if (min === max) { min -= 1; max += 1; }
  const range = max - min;
  const raw   = range / ticks;
  const mag   = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm  = raw / mag;
  const step  = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const nMin  = Math.floor(min / step) * step;
  const nMax  = Math.ceil(max / step) * step;
  const steps = [];
  for (let v = nMin; v <= nMax + step * 0.001; v += step) steps.push(v);
  return { min: nMin, max: nMax, steps };
}

// ── Curva suavizada Catmull-Rom → Bézier ────────────────────────────────────
// Passa exatamente pelos pontos sem overshoot agressivo (melhor que quadrático simples)
function smoothPath(pts) {
  if (pts.length < 2) return "";
  if (pts.length === 2) return `M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y}`;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

// Formatador padrão do eixo Y — compacto (K / M)
function fmtY(v) {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return String(Math.round(v));
}

// ════════════════════════════════════════════════════════════════════════════

export function LChart({
  series  = [],
  labels  = [],
  height  = 90,
  type    = "line",   // "line" | "bar"
  formatY = fmtY,     // prop opcional para sobrescrever formatador (ex: fB para reais)
  showLegend = true,  // mostra legenda quando houver 2+ séries
  smooth  = true,     // curva suavizada (só para type="line")
}) {
  const t   = useT();
  const ref = useRef(null);
  const uid = useId(); // ID único por instância → gradients não colidem
  const [w, setW] = useState(280);
  const [hoverIdx, setHoverIdx] = useState(null);

  // ResizeObserver: já existia no original, mantido igual
  useEffect(() => {
    if (!ref.current) return;
    setW(ref.current.clientWidth || 280);
    const ro = new ResizeObserver(e => setW(e[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  // Validação mínima (igual ao original)
  if (!labels || labels.length < 2) return null;

  const pad = { l: 38, r: 8, t: 8, b: 22 };
  const pw  = w   - pad.l - pad.r;
  const ph  = height - pad.t - pad.b;

  // ── Escala Y "nice" (memoizada por series+labels) ────────────────────────
  const { scale, palette } = useMemo(() => {
    const allV = series.flatMap(s => s.data || []).filter(v => v != null);
    if (!allV.length) return { scale: niceScale(0, 1), palette: [] };
    const mn = Math.min(...allV, 0);
    const mx = Math.max(...allV, 0.1);
    return { scale: niceScale(mn, mx, 4), palette: series.map(s => s.color) };
  }, [series]);

  const { min: mn, max: mx, steps } = scale;

  // Coordenadas
  const xs = i  => pad.l + (i  / (labels.length - 1)) * pw;
  const ys = v  => pad.t + ph - ((sv(v) - mn) / (mx - mn || 1)) * ph;

  // Caminho de linha simples (original) ou suavizado
  const makePath = data => {
    const pts = data.map((v, i) => ({ x: xs(i), y: ys(v) }));
    return smooth && type === "line" ? smoothPath(pts) : pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  };

  const bw  = (pw / labels.length) * 0.6;
  const ev  = Math.ceil(labels.length / 5); // espaçamento de labels X (original)

  // Multi-série: mostra legenda apenas quando > 1 série e showLegend=true
  const temLegenda = showLegend && series.length > 1;

  return (
    <div ref={ref} style={{ width: "100%" }}>

      {/* Legenda — nova, opcional */}
      {temLegenda && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 6, paddingLeft: pad.l }}>
          {series.map((sr, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: sr.color, display: "inline-block" }} />
              <span style={{ color: t.txm, fontSize: 10, fontWeight: 600 }}>{sr.name || `Série ${i + 1}`}</span>
            </div>
          ))}
        </div>
      )}

      <svg
        width="100%"
        height={height}
        style={{ overflow: "visible", display: "block" }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          {/* Gradiente de área por série — IDs únicos por instância */}
          {series.map((sr, i) => (
            <linearGradient key={i} id={`${uid}-g${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={sr.color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={sr.color} stopOpacity="0"    />
            </linearGradient>
          ))}
        </defs>

        {/* Grade horizontal — agora usa ticks "nice" em vez de 0/0.5/1 fixos */}
        {steps.map((v, i) => (
          <g key={i}>
            <line
              x1={pad.l} x2={w - pad.r}
              y1={ys(v)} y2={ys(v)}
              stroke={t.brd} strokeDasharray="3,3" strokeWidth={1}
            />
            <text x={pad.l - 4} y={ys(v) + 3} textAnchor="end" fontSize={8} fill={t.txd}>
              {formatY(v)}
            </text>
          </g>
        ))}

        {/* Labels eixo X — mantido exatamente como no original */}
        {labels.map((lb, i) => (i % ev === 0 || i === labels.length - 1) && (
          <text key={i} x={xs(i)} y={height - 3} textAnchor="middle" fontSize={8} fill={t.txd}>{lb}</text>
        ))}

        {/* Linha guia vertical no hover */}
        {hoverIdx != null && (
          <line
            x1={xs(hoverIdx)} x2={xs(hoverIdx)}
            y1={pad.t} y2={pad.t + ph}
            stroke={t.txd} strokeWidth={1} strokeDasharray="2,3" opacity={0.4}
          />
        )}

        {/* Séries: Bar ou Line (lógica original + melhorias) */}
        {type === "bar"
          ? series.map((sr, si) => (
              <g key={si}>
                {(sr.data || []).map((v, i) => {
                  const bh = ((sv(v) - mn) / (mx - mn || 1)) * ph;
                  return (
                    <rect
                      key={i}
                      x={xs(i) - bw / 2} y={ys(v)}
                      width={bw} height={Math.max(bh, 0)}
                      fill={sr.color} rx={2}
                      fillOpacity={hoverIdx === i ? 1 : 0.82}
                      style={{ transition: "fill-opacity .15s" }}
                      onMouseEnter={() => setHoverIdx(i)}
                    />
                  );
                })}
              </g>
            ))
          : series.map((sr, si) => {
              const data = sr.data || [];
              const path = makePath(data);
              const areaPath = `${path} L${xs(data.length - 1).toFixed(1)},${(pad.t + ph).toFixed(1)} L${pad.l},${(pad.t + ph).toFixed(1)} Z`;
              return (
                <g key={si}>
                  {/* Área com gradiente (antes era fillOpacity fixo 0.1) */}
                  <path d={areaPath} fill={`url(#${uid}-g${si})`} stroke="none" />

                  {/* Linha com animação de entrada via stroke-dashoffset */}
                  <path
                    d={path}
                    fill="none"
                    stroke={sr.color}
                    strokeWidth={si === 0 ? 2 : 1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      strokeDasharray: 2000,
                      strokeDashoffset: 2000,
                      animation: "lc-draw 1.1s ease-out forwards",
                    }}
                  />

                  {/* Pontos com highlight no hover */}
                  {data.map((v, i) => (
                    <circle
                      key={i}
                      cx={xs(i)} cy={ys(v)}
                      r={hoverIdx === i ? 4 : 2.5}
                      fill={t.bg || "#0c1220"}
                      stroke={sr.color}
                      strokeWidth={hoverIdx === i ? 2 : 1.5}
                      style={{ transition: "r .12s, stroke-width .12s", cursor: "pointer" }}
                      onMouseEnter={() => setHoverIdx(i)}
                    />
                  ))}
                </g>
              );
            })
        }

        {/* Hit-areas invisíveis por coluna — hover fácil sem precisar acertar o ponto */}
        {type === "line" && labels.map((_, i) => {
          const colW = pw / Math.max(labels.length - 1, 1);
          return (
            <rect
              key={i}
              x={xs(i) - colW / 2} y={pad.t}
              width={colW} height={ph}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
            />
          );
        })}
      </svg>

      {/* Tooltip — posicionado em % para acompanhar o SVG responsivo */}
      {hoverIdx != null && (
        <div style={{
          position: "absolute",
          left: `calc(${pad.l}px + ${(hoverIdx / (labels.length - 1)) * pw}px)`,
          transform: "translate(-50%, -100%)",
          marginTop: -8,
          background: t.mid || "#161d2e",
          border: `1px solid ${t.brd}`,
          borderRadius: 8,
          padding: "5px 9px",
          pointerEvents: "none",
          whiteSpace: "nowrap",
          boxShadow: "0 4px 14px rgba(0,0,0,.35)",
          zIndex: 20,
        }}>
          <div style={{ color: t.txd, fontSize: 9, fontWeight: 700, marginBottom: 3 }}>{labels[hoverIdx]}</div>
          {series.map((sr, si) => (
            <div key={si} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: sr.color, display: "inline-block" }} />
              {series.length > 1 && <span style={{ color: t.txm }}>{sr.name || `S${si + 1}`}:</span>}
              <span style={{ color: t.tx, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {formatY(sv((sr.data || [])[hoverIdx]))}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Animação de entrada — CSS injetado uma única vez no DOM */}
      <style>{`@keyframes lc-draw{to{stroke-dashoffset:0}}`}</style>
    </div>
  );
}

// Export mantido igual ao original
export const LineChart = LChart;
