import React from 'react';

// Ajuste os valores conforme o seu objeto de tema (t)
export const ProgressBar = ({ value, max, color, h = 10, t = { lt: '#eee', gold: 'gold' }, ...props }) => {
  const sv = (val) => val || 0;
  const pct = Math.min(Math.max((sv(value) / sv(max || 1)) * 100, 0), 100);

  return (
    <div style={{ background: t.lt, borderRadius: 99, height: h, overflow: "hidden" }}>
      <div 
        style={{ 
          width: `${pct}%`, 
          height: "100%", 
          background: color || t.gold, 
          borderRadius: 99, 
          transition: "width .5s" 
        }} 
      />
    </div>
  );
};
