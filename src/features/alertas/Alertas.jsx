import { CLIENTES_DB } from "../../data/clientes.js";
//import { Crd, KPI, Btn } from "../../components/ui/index.js";
import { Crd, KPI, SelEl, Btn, Bdg, ProgressBar } from "../../components/ui/index.js";
import { useT } from "../../theme/ThemeContext.jsx";
import { fB, fDT, fP } from "../../utils/formatters.js";
import { sv } from "../../utils/numbers.js";
import { fD } from "../../utils/formatters.js";

export function Alertas({reunioes,tarefas,oport,setTab}){
  const t=useT();const agora=Date.now();
  const h24=reunioes.filter(r=>r.status==="Agendada"&&new Date(r.dataHora)-agora>0&&new Date(r.dataHora)-agora<86400000);
  const h72=reunioes.filter(r=>r.status==="Agendada"&&new Date(r.dataHora)-agora>=86400000&&new Date(r.dataHora)-agora<259200000);
  const venc=reunioes.filter(r=>r.status==="Agendada"&&new Date(r.dataHora)<new Date());
  const tarAtr=tarefas.filter(x=>x.status==="Atrasada");
  const saldoTop=CLIENTES_DB.filter(c=>c.d0>30000).sort((a,b)=>b.d0-a.d0).slice(0,6);
  const rebalTop=CLIENTES_DB.filter(c=>c.ader!=null&&c.ader<0.3).sort((a,b)=>a.ader-b.ader);
  const inativos=CLIENTES_DB.filter(c=>c.status==="INATIVO"&&c.netM1>100000).sort((a,b)=>b.netM1-a.netM1).slice(0,5);
  const Sec=({title,items,color,icon,render})=>items.length>0&&(
    <Crd>
      <div style={{color:t.tx,fontWeight:700,fontSize:13,marginBottom:8}}>{icon} {title} <span style={{color}}>{items.length}</span></div>
      {items.map((item,i)=>render(item,i))}
    </Crd>
  );
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
        {[
          {l:"Reunioes Hoje",   v:h24.length,   c:h24.length>0?t.red:t.green,     s:"24h"},
          {l:"Reunioes 72h",    v:h72.length,   c:t.amber,                         s:"proximas"},
          {l:"Reunioes Venc.",  v:venc.length,  c:venc.length>0?t.red:t.green},
          {l:"Tar. Atrasadas",  v:tarAtr.length,c:tarAtr.length>0?t.red:t.green},
          {l:"Saldo Parado",    v:CLIENTES_DB.filter(c=>c.d0>5000).length,c:t.amber,s:"D0 > R$5k"},
          {l:"Rebalancear",     v:CLIENTES_DB.filter(c=>c.ader!=null&&c.ader<0.5).length,c:t.red,s:"ader. < 50%"},
          {l:"Inativos c/NET",  v:inativos.length,c:t.txm,s:"reativacao"},
          {l:"Oport. Novas",    v:oport.filter(o=>o.status==="Nova").length,c:t.blue},
        ].map(({l,v,c,s})=><Crd key={l} style={{padding:"12px 14px"}}><KPI label={l} value={v} color={c} sub={s} size="sm"/></Crd>)}
      </div>
      <Sec title="Reunioes Vencidas" items={venc} color={t.red} icon="🔴" render={(r,i)=>(
        <div key={r.id||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${t.brd}`,flexWrap:"wrap",gap:6}}>
          <div><div style={{color:t.tx,fontWeight:600,fontSize:12}}>{r.cliente}</div><div style={{color:t.txd,fontSize:10}}>{r.tipo} · {fDT(r.dataHora)}</div></div>
          <Btn onClick={()=>setTab("reunioes")} outline small color={t.red}>Ver</Btn>
        </div>
      )}/>
      <Sec title="Reunioes nas proximas 24h" items={h24} color={t.amber} icon="⏰" render={(r,i)=>(
        <div key={r.id||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${t.brd}`,flexWrap:"wrap",gap:6}}>
          <div><div style={{color:t.tx,fontWeight:600,fontSize:12}}>{r.cliente}</div><div style={{color:t.txd,fontSize:10}}>{r.tipo} · {fDT(r.dataHora)}</div></div>
          <Btn onClick={()=>setTab("reunioes")} outline small color={t.amber}>Ver</Btn>
        </div>
      )}/>
      <Sec title="Tarefas Atrasadas" items={tarAtr} color={t.red} icon="📋" render={(x,i)=>(
        <div key={x.id||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${t.brd}`,flexWrap:"wrap",gap:6}}>
          <div><div style={{color:t.tx,fontWeight:600,fontSize:12}}>{x.titulo}</div><div style={{color:t.txd,fontSize:10}}>{x.cliente} · Prazo: {fD(x.prazo)}</div></div>
          <div style={{display:"flex",gap:5}}><Bdg label={x.prior}/><Btn onClick={()=>setTab("tarefas")} outline small color={t.red}>Ver</Btn></div>
        </div>
      )}/>
      {saldoTop.length>0&&<Crd>
        <div style={{color:t.tx,fontWeight:700,fontSize:13,marginBottom:8}}>💰 Maior Saldo Parado (D0)</div>
        {saldoTop.map(c=>(
          <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${t.brd}`}}>
            <div><div style={{color:t.tx,fontWeight:600,fontSize:12}}>{c.nome}</div><div style={{color:t.txd,fontSize:10}}>#{c.conta} · {c.suit}</div></div>
            <span style={{color:t.amber,fontWeight:700,fontSize:13}}>{fB(c.d0)}</span>
          </div>
        ))}
      </Crd>}
      {rebalTop.length>0&&<Crd>
        <div style={{color:t.tx,fontWeight:700,fontSize:13,marginBottom:8}}>⚠️ Aderencia Critica (abaixo de 30%)</div>
        {rebalTop.map(c=>(
          <div key={c.id} style={{marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <div><div style={{color:t.tx,fontWeight:600,fontSize:12}}>{c.nome}</div><div style={{color:t.txd,fontSize:10}}>NET {fB(c.netM1)}</div></div>
              <span style={{color:t.red,fontWeight:700,fontSize:12}}>{fP(c.ader)}</span>
            </div>
            <ProgressBar value={sv(c.ader)*100} max={100} color={t.red} h={4}/>
          </div>
        ))}
      </Crd>}
      {inativos.length>0&&<Crd>
        <div style={{color:t.tx,fontWeight:700,fontSize:13,marginBottom:8}}>😴 Inativos com NET para Reativar</div>
        {inativos.map(c=>(
          <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${t.brd}`}}>
            <div><div style={{color:t.tx,fontWeight:600,fontSize:12}}>{c.nome}</div><div style={{color:t.txd,fontSize:10}}>#{c.conta}</div></div>
            <span style={{color:t.txm,fontWeight:700,fontSize:12}}>{fB(c.netM1)}</span>
          </div>
        ))}
      </Crd>}
      {(venc.length+h24.length+tarAtr.length+rebalTop.length)===0&&<Crd style={{textAlign:"center",padding:"36px"}}>
        <div style={{fontSize:38,marginBottom:8}}>✅</div>
        <div style={{color:t.tx,fontWeight:600,fontSize:15}}>Nenhum alerta critico no momento</div>
      </Crd>}
    </div>
  );
}
