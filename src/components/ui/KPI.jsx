import React from 'react';

// Aqui definimos a função do componente KPI corretamente
export const KPI = ({ label, value, trend, sub, color, sz = 24, t = { txm: '#666', gold: '#FFD700', green: 'green', red: 'red', txd: '#999' } }) => {
  return (
    <div>
      <div style={{color:t.txm,fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".6px",marginBottom:2}}>{label}</div>
      <div style={{display:"flex",alignItems:"baseline",gap:6}}>
        <div style={{color:color||t.gold,fontSize:sz,fontWeight:700,fontVariantNumeric:"tabular-nums",lineHeight:1.15}}>{value}</div>
        {trend!=null && (
          <span style={{fontSize:10,color:trend>=0?t.green:t.red,fontWeight:700}}>
            {trend>=0?"▲":"▼"}{Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      {sub && <div style={{color:t.txd,fontSize:10,marginTop:2}}>{sub}</div>}
    </div>
  );
};
