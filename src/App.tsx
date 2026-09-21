import { useState } from "react";

type Trip = { date:string; from:string; to:string; reason:string; odoStart:number; odoEnd:number; biz:boolean; km:number; }

export default function App(){
  const [trips,setTrips]=useState<Trip[]>([]);
  const [form,setForm]=useState({date:"",from:"",to:"",reason:"",odoS:"",odoE:"",type:"Business"});
  const [travel,setTravel]=useState(""); const [subs,setSubs]=useState(""); const [days,setDays]=useState("");

  const totalBiz=trips.filter(t=>t.biz).reduce((s,t)=>s+t.km,0);
  const totalPriv=trips.filter(t=>!t.biz).reduce((s,t)=>s+t.km,0);
  const total=totalBiz+totalPriv;

  function addTrip(){
    const s=Number(form.odoS)||0; const e=Number(form.odoE)||0; const km=Math.max(0,e-s);
    if(!form.from||!form.to||km<=0) return alert("Fill From, To, Odo Start/End");
    setTrips([...trips,{date:form.date||new Date().toISOString().slice(0,10),from:form.from,to:form.to,reason:form.reason,odoStart:s,odoEnd:e,biz:form.type==="Business",km}]);
    setForm({date:"",from:"",to:"",reason:"",odoS:"",odoE:"",type:"Business"});
  }
  function genDraft(){
    if(!trips.length) return alert("Add trips first");
    const rows=trips.map(t=>`${t.date},${t.from},${t.to},${t.reason},${t.odoStart},${t.odoEnd},${t.km},${t.biz?"Business":"Private"}`).join("\n");
    const csv=`Date,From,To,Reason,OdoStart,OdoEnd,Distance,Type\n${rows}\n\nTotals,Business ${totalBiz}km,Private ${totalPriv}km,Total ${total}km`;
    const blob=new Blob([csv],{type:"text/csv"}); const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download=`Ilitha_Logbook_IN17_DRAFT_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  }

  const wa = (pkg:string, price:string) => `https://wa.me/27847392469?text=Hi%20Ilitha%20Hub%20-%20I%20paid%20${pkg}%20${price}%20to%20Capitec%202121467447%20Ref%20${encodeURIComponent(pkg)}%20MyCell%20-%20Please%20send%20License`;

  return (
    <div style={{fontFamily:"system-ui", background:"#0f172a", minHeight:"100vh", padding:"12px"}}>
      <div style={{maxWidth:520, margin:"0 auto"}}>

        <div style={{background:"#fffbeb", border:"2px solid #f59e0b", borderRadius:12, padding:12, marginBottom:12}}>
          <b style={{fontSize:14}}>Ilitha Fintech Pty Ltd - Reg 2026/707498/07</b><br/>
          <span style={{fontSize:13}}><b>Capitec SL Cengcani 2121467447 | Branch 470010</b><br/>
          WhatsApp POP: 0847392469 | Ref: YourCell+Package<br/>
          Instant License: ILITHA-30D-XXXX after POP</span>
        </div>

        <h2 style={{color:"#fff", margin:"8px 0"}}>Ilitha Fintech Hub - Logbook IN17 + Rule7 + LegalEstates</h2>

        <div style={{background:"#fff", borderRadius:16, padding:14, marginBottom:12}}>
          <b>💳 Choose Package - Pay to Capitec 2121467447</b>
          <div style={{display:"grid", gap:8, marginTop:10}}>
            <a href={wa("LOGBOOK","R99")} style={{background:"#0f172a", color:"#fff", padding:12, borderRadius:10, textAlign:"center", textDecoration:"none"}}><b>R99 Logbook IN17 - Starter</b><br/><small>CSV DRAFT + SARS Compliant</small></a>
            <a href={wa("LOG+RULE7","R199")} style={{background:"#0f172a", color:"#fff", padding:12, borderRadius:10, textAlign:"center", textDecoration:"none"}}><b>R199 Logbook + Rule7 - Popular</b><br/><small>Travel + Subsistence Calc</small></a>
            <a href={wa("FULL-BUNDLE","R299")} style={{background:"#f59e0b", color:"#000", padding:12, borderRadius:10, textAlign:"center", textDecoration:"none", fontWeight:"bold"}}><b>R299 Full - BEE + LegalEstates</b><br/><small>All Templates + BEE Affidavit</small></a>
          </div>
          <div style={{fontSize:12, marginTop:8, color:"#555"}}>After payment, click package → WhatsApp will open with POP message → Send to 0847392469</div>
        </div>

        <div style={{background:"#fff", borderRadius:16, padding:14, marginBottom:12}}>
          <b>ZATax + Logbook IN17 + Rule7 + BEE TEMPLATE</b>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:10}}>
            <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={s.input}/>
            <input placeholder="From" value={form.from} onChange={e=>setForm({...form,from:e.target.value})} style={s.input}/>
            <input placeholder="To" value={form.to} onChange={e=>setForm({...form,to:e.target.value})} style={s.input}/>
            <input placeholder="Reason" value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} style={s.input}/>
            <input placeholder="Odo Start" type="number" value={form.odoS} onChange={e=>setForm({...form,odoS:e.target.value})} style={s.input}/>
            <input placeholder="Odo End" type="number" value={form.odoE} onChange={e=>setForm({...form,odoE:e.target.value})} style={s.input}/>
          </div>
          <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={{...s.input, marginTop:8}}><option>Business</option><option>Private</option></select>
          <button onClick={addTrip} style={s.btnDark}>Add Trip</button>
          <div style={{fontSize:12, margin:"6px 0"}}>Business {totalBiz}km Private {totalPriv}km Total {total}km</div>
          <button onClick={genDraft} style={s.btnGreen}>Generate Logbook DRAFT (CSV)</button>
          {trips.length>0 && <div style={{fontSize:11, marginTop:6, maxHeight:80, overflow:"auto"}}>{trips.map((t,i)=><div key={i}>{t.date} {t.from}-{t.to} {t.km}km {t.biz?"Biz":"Priv"}</div>)}</div>}
        </div>

        <div style={{background:"#fff", borderRadius:16, padding:14}}>
          <b>Rule7 Calculator Subsistence + Travel</b>
          <input placeholder="Travel Allowance R" type="number" value={travel} onChange={e=>setTravel(e.target.value)} style={{...s.input, marginTop:8}}/>
          <input placeholder="Subsistence R" type="number" value={subs} onChange={e=>setSubs(e.target.value)} style={s.input}/>
          <input placeholder="Days away" type="number" value={days} onChange={e=>setDays(e.target.value)} style={s.input}/>
          <button onClick={()=>alert(`Total Claim: R ${(Number(travel)+Number(subs)).toFixed(2)}\nDays: ${days}\n\nSave this for SARS - Use Logbook DRAFT above for IN17`)} style={s.btnDark}>Calculate</button>
        </div>

        <div style={{textAlign:"center", color:"#fff", fontSize:11, marginTop:12, opacity:0.7}}>Ilitha Fintech Reg 2026/707498/07 | siseko.vercel.app | Support 0847392469</div>
      </div>
    </div>
  )
}
const s = {
  input:{padding:"10px", borderRadius:"10px", border:"1px solid #ccc", width:"100%", boxSizing:"border-box" as const},
  btnDark:{width:"100%", background:"#0f172a", color:"#fff", padding:"14px", borderRadius:12, border:"none", fontWeight:"bold" as const, marginTop:8},
  btnGreen:{width:"100%", background:"#14b8a6", color:"#fff", padding:"14px", borderRadius:12, border:"none", fontWeight:"bold" as const, marginTop:6}
                                                                                                          }
