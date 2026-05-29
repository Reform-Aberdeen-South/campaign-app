import { useState, useRef, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, onSnapshot, collection, addDoc, deleteDoc, updateDoc, query, orderBy } from "firebase/firestore";

// ─── FIREBASE CONFIG (Aberdeen South project) ───────────────
const firebaseConfig = {
  apiKey: "AIzaSyCXIV8Jy2dPCPBOBRfCeSH7kl_SroY4KUk",
  authDomain: "reform-aberdeen-south.firebaseapp.com",
  projectId: "reform-aberdeen-south",
  storageBucket: "reform-aberdeen-south.firebasestorage.app",
  messagingSenderId: "475091318246",
  appId: "1:475091318246:web:3448dae44a2c136a7c1227"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// ─── FIREBASE HELPER ─────────────────────────────────────────
// All shared data lives under /campaign/{collection}/items
function useCollection(collectionName) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const q = query(collection(db, "campaign", collectionName, "items"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => { console.error("Firestore error:", err); setLoading(false); });
    return () => unsub();
  }, [collectionName]);
  async function addItem(item) {
    const entry = { ...item, timestamp: new Date().toISOString() };
    await addDoc(collection(db, "campaign", collectionName, "items"), entry);
  }
  async function removeItem(id) { await deleteDoc(doc(db, "campaign", collectionName, "items", id)); }
  async function updateItem(id, changes) { await updateDoc(doc(db, "campaign", collectionName, "items", id), changes); }
  return { data, loading, addItem, removeItem, updateItem };
}

// ─── GEOGRAPHY (Aberdeen South — verified coordinates) ──────
// Campaign base: Torry Battery (Jo's launch site)
const BASE = { lat: 57.1370, lng: -2.0680, name: "Torry Battery" };
const AREA_COORDS = {
  torry:       { lat: 57.1336, lng: -2.0847 },
  kincorth:    { lat: 57.1170, lng: -2.0950 },
  niggcove:    { lat: 57.1045, lng: -2.0780 },
  ferryhill:   { lat: 57.1365, lng: -2.1050 },
  ruthrieston: { lat: 57.1280, lng: -2.1230 },
  garthdee:    { lat: 57.1180, lng: -2.1340 },
  cults:       { lat: 57.1167, lng: -2.1667 },
};
function haversineKm(la1,ln1,la2,ln2){const R=6371,dL=(la2-la1)*Math.PI/180,dN=(ln2-ln1)*Math.PI/180,a=Math.sin(dL/2)**2+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dN/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}
function distLabel(km){return km<1?"<1 km":`${km.toFixed(1)} km · ~${Math.max(1,Math.round(km/4.5*60))} min walk`;}
function getDistances(lat,lng){const r={};Object.entries(AREA_COORDS).forEach(([id,c])=>{r[id]=haversineKm(lat,lng,c.lat,c.lng);});return r;}

// ─── AREA SUB-DISTRICTS (for coverage tracking) ─────────────
// These are leaflet-delivery sub-areas only — NO voter data.
const AREA_SUBAREAS = {
  "Torry":["Victoria Road & Menzies Road","Walker Road & Walker Lane","Grampian Road & Sinclair Road","Abbey Road & Abbey Place","Balnagask & Oscar Road","Crombie Road area"],
  "Kincorth":["Kincorth Circle","Provost Watt Drive","Cairngorm area","Faulds area","Kincorth shops & centre"],
  "Nigg & Cove":["Cove Bay village","Loirston","Charleston","Cove modern estates","Altens edge (residential only)"],
  "Ferryhill":["Ferryhill Road & Bon Accord","Fonthill area","Polmuir & Duthie Park edge","Ferryhill terraces"],
  "Ruthrieston":["Ruthrieston Road","Holburn edge","Bridge of Dee area","Riverside terraces"],
  "Garthdee":["Garthdee Road housing","Kaimhill","Pittengullies edge","Garthdee estates (skip RGU & retail)"],
  "Cults":["Cults village core","North Deeside Road","Quarry Road area","Bieldside edge","Milltimber edge"],
};

// ─── AREAS (replaces WARDS) — public-knowledge briefing only ─
// Character/affluence drawn from SIMD 2020, council profiles, census — NO voter data.
const AREAS = [
  {id:"torry",name:"Torry",ward:"Torry/Ferryhill & Kincorth/Nigg/Cove wards",priority:1,color:"#FF6B35",population:"~9,000–10,000",
    towns:["Victoria Road","Menzies Road","Balnagask","Old Torry"],
    character:"Historic working-class harbour community — once a royal burgh (1495) and major fishing/fish-processing centre. Old fishing village largely cleared in the 1970s for oil-related harbour development. Dense granite tenements and post-war housing; a council regeneration priority next to the working harbour.",
    issues:["Energy Transition Zone / St Fittick's Park (live, contentious)","North Sea oil & gas jobs","Harbour & industrial impact on residents","Cost of living"],
    delivery:"Dense and walkable — tenements mean many doors close together (watch shared/secured stairs). Wellington Road & Market Street carry heavy traffic — take care.",
    political:"Jo's launch area and the heart of the oil & gas message. Bread-and-butter doorstep issues resonate.",
    coordId:"torry"},
  {id:"kincorth",name:"Kincorth",ward:"Kincorth/Nigg/Cove ward",priority:1,color:"#FF6B35",population:"part of ward",
    towns:["Kincorth Circle","Provost Watt Drive"],
    character:"Largely post-war residential suburb, built substantially as council housing from the late 1940s, on rising ground south of the Dee with views over the city. Settled family area, mix of social and owner-occupied homes.",
    issues:["Cost of living","Local services","Roads & transport","Energy policy"],
    delivery:"Mostly houses and low-rise estates with gardens — doors more spread out than Torry, so slower per street. Some sloping ground.",
    political:"Solid, populous residential territory — Tier 1.",
    coordId:"kincorth"},
  {id:"niggcove",name:"Nigg & Cove",ward:"Kincorth/Nigg/Cove ward",priority:1,color:"#FF6B35",population:"growing",
    towns:["Cove Bay","Loirston","Charleston"],
    character:"Cove Bay is a former fishing village grown into one of the city's main areas of modern housing expansion — large newer estates popular with commuters and families. Nigg includes residential pockets and significant industrial land (Altens/Tullos) near the harbour.",
    issues:["North Sea energy jobs","New-build infrastructure & services","Roads/commuting","Cost of living"],
    delivery:"Newer Cove estates are modern detached/semi housing with gardens and cul-de-sacs — lower door-density, slower, easy to lose bearings. Skip the Altens/Tullos industrial estates.",
    political:"Growing population of working families and commuters, many energy-linked. Newer residents may have weaker fixed loyalties.",
    coordId:"niggcove"},
  {id:"ferryhill",name:"Ferryhill",ward:"Torry/Ferryhill ward",priority:2,color:"#FFB347",population:"settled inner suburb",
    towns:["Ferryhill Road","Polmuir","Duthie Park edge"],
    character:"A fine example of mid-to-late-19th-century suburban Aberdeen — granite villas, semis, terraces and later flatted developments, close to Duthie Park. Among the least-deprived parts of the city (SIMD top 10%).",
    issues:["Cost of living","Local environment & parks","Council services","Energy policy"],
    delivery:"Mix of street-fronting villas/terraces (easy doors) and flatted blocks (shared entries). Dense and very walkable given the central position.",
    political:"More settled, professional electorate — tone differs from the harbour communities.",
    coordId:"ferryhill"},
  {id:"ruthrieston",name:"Ruthrieston",ward:"Airyhall/Broomhill/Garthdee & adjacent",priority:2,color:"#FFB347",population:"established residential",
    towns:["Ruthrieston Road","Bridge of Dee"],
    character:"A settled residential area on the north bank of the Dee near the historic Bridge of Dee (1527). Calm and established, appealing to professionals, families and some RGU students.",
    issues:["Cost of living","Roads & river crossings","Local services","Energy policy"],
    delivery:"Mix of inter-war and post-war houses, terraces and some flats. Mostly walkable, moderate door-density.",
    political:"Steady, mixed, fairly settled electorate.",
    coordId:"ruthrieston"},
  {id:"garthdee",name:"Garthdee",ward:"Airyhall/Broomhill/Garthdee ward",priority:3,color:"#90E0EF",population:"mixed + students",
    towns:["Garthdee Road","Kaimhill","RGU campus (skip)"],
    character:"Historically part of the rural Pitfodels estate, now home to the main Robert Gordon University (RGU) campus, plus housing and the Garthdee retail park. A mix of established family housing and a substantial student presence.",
    issues:["Cost of living","Student housing turnover","Roads","Energy policy"],
    delivery:"Mix of houses, estates and student accommodation. Skip the campus and retail park — focus on housing streets. Student lets mean more no-answers.",
    political:"Younger, more transient slice; student turnout less predictable.",
    coordId:"garthdee"},
  {id:"cults",name:"Cults",ward:"Lower Deeside ward",priority:3,color:"#90E0EF",population:"affluent suburb",
    towns:["Cults village","Bieldside","Milltimber"],
    character:"The city's prosperous western suburbs — Cults and neighbouring Bieldside are routinely described as among the wealthiest areas in Scotland. Leafy, large detached homes in mature gardens, strong schools, a long association with senior oil-industry figures. The least-deprived end of the seat.",
    issues:["Energy industry (management/ownership ties)","Local environment & green belt","Schools","Council tax / services"],
    delivery:"Large detached houses set back in big gardens along long roads — by far the LOWEST door-density in the seat, so leafleting is slow and tiring per delivery. Long drives, gates, 'no junk mail' signs. Budget volunteer time accordingly.",
    political:"Very different electorate — affluent, professional, many energy-industry ties. Decide deliberately how much effort to spend given low density.",
    coordId:"cults"},
];

// ─── 2024 RESULT (Aberdeen South Westminster — context only) ─
const ELECTION_RESULTS=[
  {party:"SNP",candidate:"Stephen Flynn",votes:15213,pct:32.8,color:"#FFA500"},
  {party:"Labour",candidate:"Tauqeer Malik",votes:11455,pct:24.7,color:"#E4003B"},
  {party:"Conservative",candidate:"John Wheeler",votes:11300,pct:24.4,color:"#0087DC"},
  {party:"Reform UK",candidate:"Michael Pearce",votes:3199,pct:6.9,color:"#12B6CF",isUs:true},
  {party:"Lib Dem",candidate:"Jeff Goodhall",votes:2921,pct:6.3,color:"#FAA61A"},
];
// 2026 by-election candidates (confirmed as at preparation date)
const CANDIDATES_2026=[
  {name:"Jo Hart",party:"Reform UK",note:"Our candidate — ex-nurse/midwife, oil & gas focus",isUs:true},
  {name:"Douglas Lumsden",party:"Conservative",note:"Sitting NE MSP — main right-of-SNP rival"},
  {name:"Richard Thomson",party:"SNP",note:"Former Gordon MP; defending the seat"},
  {name:"Nurul Hoque Ali",party:"Labour",note:"Announced 22 May"},
  {name:"(Lib Dem)",party:"Lib Dem",note:"Selected 22 May"},
  {name:"Jorg Shelton-Eckstein",party:"Green",note:"Independent AI consultant"},
];

const AREA_NAMES=AREAS.map(a=>a.name);

// ─── HELPERS ────────────────────────────────────────────────
const partyColor=p=>({SNP:"#FFA500",Conservative:"#0087DC",Labour:"#E4003B","Lib Dem":"#FAA61A","Reform UK":"#12B6CF",Green:"#528D6B",Independent:"#888"}[p]||"#888");
const priorityLabel=p=>p===1?"TIER 1":p===2?"TIER 2":"TIER 3";
const fmtDate=iso=>{try{return new Date(iso).toLocaleDateString("en-GB",{day:"numeric",month:"short"});}catch{return iso;}};
const fmtTime=iso=>{try{return new Date(iso).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});}catch{return "";}};

// ─── LOCAL USER STORAGE (device only) ───────────────────────
function loadUser(){try{const s=localStorage.getItem("as_user");return s?JSON.parse(s):null;}catch{return null;}}
function saveUser(u){try{localStorage.setItem("as_user",JSON.stringify(u));}catch{}}

// ─── UI PRIMITIVES ───────────────────────────────────────────
function Section({title,children}){return(<div style={{background:"#0d1b2a",borderRadius:8,padding:"12px 14px",marginBottom:10,border:"1px solid #1a3a50"}}><div style={{fontSize:"0.57rem",color:"#64b5d8",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8,fontWeight:700}}>{title}</div>{children}</div>);}
function Input({label,...props}){return(<div style={{marginBottom:10}}>{label&&<label style={{fontSize:"0.62rem",color:"#90a8b8",display:"block",marginBottom:3}}>{label}</label>}<input {...props} style={{width:"100%",background:"#162838",border:"1px solid #2a4a60",borderRadius:6,color:"#fff",fontSize:"0.78rem",padding:"9px 10px",outline:"none",fontFamily:"inherit",boxSizing:"border-box",...props.style}}/></div>);}
function Select({label,options,...props}){return(<div style={{marginBottom:10}}>{label&&<label style={{fontSize:"0.62rem",color:"#90a8b8",display:"block",marginBottom:3}}>{label}</label>}<select {...props} style={{width:"100%",background:"#162838",border:"1px solid #2a4a60",borderRadius:6,color:props.value?"#fff":"#4a6a7a",fontSize:"0.78rem",padding:"9px 10px",outline:"none",fontFamily:"inherit"}}>{options.map(o=><option key={o} value={o} style={{background:"#162838"}}>{o}</option>)}</select></div>);}
function Btn({onClick,disabled,children,style:s={},color="#12B6CF",textColor="#03045E"}){return(<button onClick={onClick} disabled={disabled} style={{background:disabled?"#1a3a50":color,border:"none",borderRadius:7,color:disabled?"#4a6a7a":textColor,fontSize:"0.78rem",fontWeight:700,padding:"11px 16px",cursor:disabled?"default":"pointer",transition:"all 0.15s",...s}}>{children}</button>);}
function EmptyState({icon,title,sub}){return(<div style={{textAlign:"center",padding:"40px 20px",color:"#4a7a8a"}}><div style={{fontSize:"2rem",marginBottom:10}}>{icon}</div><div style={{fontSize:"0.75rem",color:"#90a8b8",marginBottom:6}}>{title}</div><div style={{fontSize:"0.65rem",lineHeight:1.6}}>{sub}</div></div>);}
function SyncBadge({loading}){return loading?(<span style={{fontSize:"0.52rem",color:"#FFB347",marginLeft:6}}>⟳ syncing</span>):(<span style={{fontSize:"0.52rem",color:"#4CAF50",marginLeft:6}}>● live</span>);}

// ─── TAB DEFINITIONS ────────────────────────────────────────
const MANAGER_PIN = "0409";
const PUBLIC_TABS = [
  {id:"overview",icon:"📊",label:"Overview"},
  {id:"areas",icon:"📍",label:"Areas"},
  {id:"election",icon:"🗳️",label:"Election"},
  {id:"board",icon:"📣",label:"Board"},
  {id:"leaflets",icon:"📬",label:"Leaflets"},
];
const MANAGER_TABS = [
  {id:"coverage",icon:"🗺️",label:"Coverage"},
  {id:"routes",icon:"🚚",label:"Routes"},
  {id:"zonebuilder",icon:"✏️",label:"Zones"},
  {id:"volunteers",icon:"👥",label:"Volunteers"},
];

function Header({tab,setTab,user,managerUnlocked,setManagerUnlocked}){
  const [showPin,setShowPin]=useState(false);
  const [pin,setPin]=useState("");
  const [pinError,setPinError]=useState(false);
  function handleLockTap(){
    if(managerUnlocked){setManagerUnlocked(false);if(MANAGER_TABS.find(t=>t.id===tab))setTab("overview");}
    else setShowPin(true);
  }
  const visibleTabs=managerUnlocked?[...PUBLIC_TABS,...MANAGER_TABS]:PUBLIC_TABS;
  return(
    <div style={{background:"#03045E",borderBottom:"2px solid #12B6CF",position:"sticky",top:0,zIndex:100}}>
      <div style={{padding:"10px 16px 6px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontFamily:"Georgia,serif",fontSize:"1rem",fontWeight:700,color:"#fff",lineHeight:1.2}}>Aberdeen <span style={{color:"#12B6CF"}}>South</span></div>
          <div style={{fontSize:"0.52rem",color:"#90E0EF",letterSpacing:"0.1em",textTransform:"uppercase",marginTop:1}}>Reform UK · Campaign Hub · By-election 18 June 2026</div>
        </div>
        <div style={{textAlign:"right",display:"flex",alignItems:"center",gap:8}}>
          {user?.name?(<div style={{background:"#12B6CF22",border:"1px solid #12B6CF",borderRadius:6,padding:"3px 8px"}}><div style={{fontSize:"0.6rem",color:"#12B6CF",fontWeight:700}}>{user.name}</div><div style={{fontSize:"0.5rem",color:"#64b5d8"}}>{user.location||"No location"}</div></div>):(<div style={{background:"#FF6B3522",border:"1px solid #FF6B35",borderRadius:6,padding:"3px 8px"}}><div style={{fontSize:"0.57rem",color:"#FF6B35"}}>Set your name →</div></div>)}
          <button onClick={handleLockTap} style={{background:managerUnlocked?"#FFB34722":"#1a3a50",border:`1px solid ${managerUnlocked?"#FFB347":"#2a4a60"}`,borderRadius:6,padding:"4px 7px",cursor:"pointer",fontSize:"0.9rem",lineHeight:1}} title={managerUnlocked?"Lock manager tabs":"Unlock manager tabs"}>
            {managerUnlocked?"🔓":"🔒"}
          </button>
        </div>
      </div>
      <div style={{display:"flex",overflowX:"auto",scrollbarWidth:"none"}}>
        {visibleTabs.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{flex:"0 0 auto",padding:"7px 10px",fontSize:"0.63rem",fontWeight:600,background:"none",border:"none",cursor:"pointer",whiteSpace:"nowrap",color:tab===t.id?"#12B6CF":"#90cce0",borderBottom:tab===t.id?"2px solid #12B6CF":"2px solid transparent",letterSpacing:"0.03em",transition:"all 0.15s"}}>{t.icon} {t.label}</button>))}
        {managerUnlocked&&<div style={{flex:"0 0 auto",padding:"7px 6px",display:"flex",alignItems:"center"}}><div style={{width:1,height:16,background:"#FFB347",opacity:0.5,marginRight:6}}/><span style={{fontSize:"0.52rem",color:"#FFB347",letterSpacing:"0.06em",textTransform:"uppercase"}}>Manager</span></div>}
      </div>
      {showPin&&<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(3,4,94,0.95)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
        <div style={{background:"#0d1b2a",border:"1px solid #12B6CF",borderRadius:12,padding:"28px 24px",width:280,textAlign:"center"}}>
          <div style={{fontSize:"1.5rem",marginBottom:8}}>🔒</div>
          <div style={{fontSize:"0.8rem",fontWeight:700,color:"#fff",marginBottom:4}}>Manager Access</div>
          <div style={{fontSize:"0.65rem",color:"#64b5d8",marginBottom:20}}>Enter your 4-digit PIN</div>
          <div style={{display:"flex",justifyContent:"center",gap:10,marginBottom:16}}>
            {[0,1,2,3].map(i=><div key={i} style={{width:14,height:14,borderRadius:"50%",background:pin.length>i?"#12B6CF":"#1a3a50",border:"1px solid #2a4a60",transition:"all 0.15s"}}/>)}
          </div>
          {pinError&&<div style={{fontSize:"0.65rem",color:"#F44336",marginBottom:10}}>Incorrect PIN — try again</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
            {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k,i)=>(
              <button key={i} onClick={()=>{
                if(k==="⌫")setPin(p=>p.slice(0,-1));
                else if(k!=="")setPin(p=>{const n=p+k;if(n.length===4){setTimeout(()=>{if(n===MANAGER_PIN){setManagerUnlocked(true);setShowPin(false);setPin("");setPinError(false);}else{setPinError(true);setPin("");}},100);}return n.length<4?n:p;});
              }} disabled={k===""} style={{background:k==="⌫"?"#1a3a50":"#162838",border:"1px solid #2a4a60",borderRadius:8,color:"#fff",fontSize:"1.1rem",padding:"12px",cursor:k===""?"default":"pointer",fontWeight:600,opacity:k===""?0:1}}>
                {k}
              </button>
            ))}
          </div>
          <button onClick={()=>{setShowPin(false);setPin("");}} style={{background:"none",border:"none",color:"#4a7a8a",fontSize:"0.65rem",cursor:"pointer"}}>Cancel</button>
        </div>
      </div>}
    </div>
  );
}

// ─── USER SETUP ─────────────────────────────────────────────
function UserSetup({user,setUser}){
  const [name,setName]=useState(user?.name||"");
  const [locating,setLocating]=useState(false);
  const [locLabel,setLocLabel]=useState(user?.location||"");
  const [locCoords,setLocCoords]=useState(user?.coords||null);
  const [saved,setSaved]=useState(false);
  function locateMe(){setLocating(true);navigator.geolocation.getCurrentPosition(async pos=>{const{latitude:lat,longitude:lng}=pos.coords;setLocCoords({lat,lng});try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);const d=await r.json();const town=d.address?.town||d.address?.village||d.address?.city||d.address?.suburb||"";setLocLabel(`${town}${d.address?.postcode?", "+d.address.postcode:""}`.trim()||`${lat.toFixed(3)}, ${lng.toFixed(3)}`);}catch{setLocLabel(`${lat.toFixed(3)}, ${lng.toFixed(3)}`);}setLocating(false);},()=>setLocating(false));}
  function save(){if(!name.trim())return;const u={name:name.trim(),location:locLabel,coords:locCoords};setUser(u);saveUser(u);setSaved(true);setTimeout(()=>setSaved(false),2000);}
  const userDists=locCoords?getDistances(locCoords.lat,locCoords.lng):null;
  const bDist=getDistances(BASE.lat,BASE.lng);
  return(
    <div style={{background:"#0d1b2a",borderRadius:10,padding:"16px",marginBottom:16,border:"1px solid #1a3a50"}}>
      <div style={{fontSize:"0.6rem",color:"#64b5d8",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:12}}>Your Team Profile</div>
      <Input label="Your name" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Alan"/>
      <div style={{marginBottom:12}}><label style={{fontSize:"0.62rem",color:"#90a8b8",display:"block",marginBottom:4}}>Your location</label><div style={{display:"flex",gap:8}}><div style={{flex:1,background:"#162838",border:"1px solid #2a4a60",borderRadius:6,padding:"9px 12px",fontSize:"0.72rem",color:locLabel?"#fff":"#4a6a7a",minHeight:36,display:"flex",alignItems:"center"}}>{locLabel||"Tap to set your position"}</div><button onClick={locateMe} disabled={locating} style={{background:locating?"#1a3a50":"#0077B6",border:"none",borderRadius:6,color:"#fff",fontSize:"0.62rem",padding:"0 10px",cursor:"pointer",whiteSpace:"nowrap",fontWeight:600}}>{locating?"…":"📍 Locate"}</button></div></div>
      <Btn onClick={save} disabled={!name.trim()} style={{width:"100%"}}>{saved?"✓ Saved!":"Save Profile"}</Btn>
      <div style={{marginTop:14}}>
        <div style={{fontSize:"0.57rem",color:"#64b5d8",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>{userDists?"Distances from your location":"Distances from Torry Battery (base)"}</div>
        {AREAS.map(a=>(
          <div key={a.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #162838"}}>
            <span style={{fontSize:"0.68rem",color:"#c0d8e4"}}>{a.name}</span>
            <div style={{textAlign:"right"}}>
              {userDists&&<div style={{fontSize:"0.62rem",color:"#12B6CF",fontFamily:"monospace"}}>You: {distLabel(userDists[a.coordId])}</div>}
              <div style={{fontSize:"0.58rem",color:"#4a7a8a",fontFamily:"monospace"}}>Base: {distLabel(bDist[a.coordId])}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── OVERVIEW (light — profile, message, priorities) ────────
function OverviewTab({user,setUser}){
  const daysLeft=Math.max(0,Math.ceil((new Date("2026-06-18")-new Date())/(1000*60*60*24)));
  return(
    <div style={{padding:"16px",paddingBottom:32}}>
      {/* COUNTDOWN */}
      <div style={{background:"linear-gradient(135deg,#03045E,#0077B6)",borderRadius:10,padding:"14px 16px",marginBottom:14,border:"1px solid #12B6CF",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><div style={{fontSize:"0.55rem",color:"#90E0EF",textTransform:"uppercase",letterSpacing:"0.1em"}}>Polling Day Countdown</div><div style={{fontSize:"0.7rem",color:"#fff",marginTop:2}}>Thursday 18 June 2026</div></div>
        <div style={{textAlign:"right"}}><div style={{fontSize:"2rem",fontWeight:700,color:"#12B6CF",fontFamily:"monospace",lineHeight:1}}>{daysLeft}</div><div style={{fontSize:"0.55rem",color:"#90E0EF",textTransform:"uppercase",letterSpacing:"0.08em"}}>days left</div></div>
      </div>

      {/* CANDIDATE CARD */}
      <div style={{background:"linear-gradient(135deg,#03045E 0%,#023E8A 100%)",borderRadius:10,marginBottom:16,border:"1px solid #12B6CF",overflow:"hidden",padding:"14px"}}>
        <div style={{fontSize:"0.52rem",color:"#90E0EF",letterSpacing:"0.12em",textTransform:"uppercase"}}>Reform UK</div>
        <div style={{fontSize:"1.15rem",fontFamily:"Georgia,serif",fontWeight:700,color:"#fff",marginTop:2,lineHeight:1.2}}>Jo Hart</div>
        <div style={{fontSize:"0.62rem",color:"#12B6CF",marginTop:3}}>Candidate — Aberdeen South (Westminster)</div>
        <div style={{fontSize:"0.6rem",color:"#90E0EF",marginTop:2}}>By-election · 18 June 2026</div>
        <div style={{marginTop:8,padding:"6px 8px",background:"rgba(18,182,207,0.15)",borderRadius:5,fontSize:"0.6rem",color:"#e0f4f8",lineHeight:1.5,borderLeft:"2px solid #12B6CF"}}>
          ★ Former nurse and midwife · launched her campaign at Torry Battery, putting the future of oil &amp; gas at the centre of her pitch
        </div>
      </div>

      {/* GOOGLE MY MAPS — placeholder link, update when Jo's map is created */}
      <a href="https://www.google.com/maps/d/" target="_blank" rel="noopener noreferrer" style={{display:"block",textDecoration:"none",marginBottom:14}}>
        <div style={{background:"#0a2a15",border:"1px solid #4CAF50",borderRadius:8,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:"1.3rem"}}>&#x1F5FA;</span>
            <div>
              <div style={{fontSize:"0.75rem",fontWeight:700,color:"#4CAF50"}}>Campaign Street Map</div>
              <div style={{fontSize:"0.6rem",color:"#64b5d8",marginTop:2}}>Google My Maps — leaflet rounds &amp; key locations (set link in code)</div>
            </div>
          </div>
          <div style={{fontSize:"1rem",color:"#4CAF50",flexShrink:0}}>&rarr;</div>
        </div>
      </a>

      {/* MESSAGE FOCUS */}
      <div style={{background:"#0d1b2a",border:"1px solid #1a3a50",borderRadius:8,padding:"12px 14px",marginBottom:14}}>
        <div style={{fontSize:"0.57rem",color:"#64b5d8",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10}}>Campaign Focus</div>
        {[
          {icon:"🛢️",text:"Back our oil & gas and the North Sea energy workforce"},
          {icon:"💷",text:"Lower the cost of living and energy bills"},
          {icon:"🏘️",text:"Stand up for working communities like Torry"},
          {icon:"🗳️",text:"Offer a real alternative — one vote, one ballot, on 18 June"},
        ].map((p,i)=>(
          <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8,paddingBottom:8,borderBottom:i<3?"1px solid #162838":"none"}}>
            <span style={{fontSize:"1rem",flexShrink:0}}>{p.icon}</span>
            <span style={{fontSize:"0.7rem",color:"#c0d8e4",lineHeight:1.5}}>{p.text}</span>
          </div>
        ))}
        <div style={{fontSize:"0.55rem",color:"#4a7a8a",marginTop:4,fontStyle:"italic"}}>Note: this is a Westminster by-election — single FPTP vote, not the Holyrood "both votes" system.</div>
      </div>

      {/* FIREBASE STATUS */}
      <div style={{background:"#0a1228",border:"1px solid #4CAF50",borderRadius:8,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:"#4CAF50",flexShrink:0,boxShadow:"0 0 6px #4CAF50"}}/>
        <div style={{fontSize:"0.65rem",color:"#c0d8e4"}}>Connected to Firebase — all team data syncing in real time</div>
      </div>

      <UserSetup user={user} setUser={setUser}/>
    </div>
  );
}

// ─── AREAS (rebuilt from Wards — briefing only, NO voter data) ─
function AreasTab({user}){
  const [sel,setSel]=useState(null);
  const area=sel?AREAS.find(a=>a.id===sel):null;
  const userDists=user?.coords?getDistances(user.coords.lat,user.coords.lng):null;
  const bDist=getDistances(BASE.lat,BASE.lng);
  if(area)return(<div style={{padding:"16px",paddingBottom:32}}><button onClick={()=>setSel(null)} style={{background:"none",border:"none",color:"#12B6CF",fontSize:"0.75rem",cursor:"pointer",marginBottom:12,padding:0}}>← All Areas</button><div style={{borderLeft:`4px solid ${area.color}`,paddingLeft:12,marginBottom:14}}><div style={{fontSize:"1.05rem",fontFamily:"Georgia,serif",fontWeight:700,color:"#fff"}}>{area.name}</div><div style={{fontSize:"0.6rem",color:"#64b5d8",marginTop:2}}>{area.ward}</div><div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}><span style={{background:area.color+"22",color:area.color,fontSize:"0.57rem",padding:"2px 7px",borderRadius:3,fontWeight:700}}>{priorityLabel(area.priority)} PRIORITY</span><span style={{background:"#162838",color:"#64b5d8",fontSize:"0.57rem",padding:"2px 7px",borderRadius:3}}>{area.population}</span></div></div>
    <Section title="Distances"><div style={{display:"flex",gap:16,flexWrap:"wrap"}}><div><div style={{fontSize:"0.58rem",color:"#4a7a8a"}}>From base (Torry Battery)</div><div style={{fontSize:"0.8rem",color:"#12B6CF",fontFamily:"monospace",fontWeight:600}}>{distLabel(bDist[area.coordId])}</div></div>{userDists&&user?.name&&<div><div style={{fontSize:"0.58rem",color:"#4a7a8a"}}>{user.name}</div><div style={{fontSize:"0.8rem",color:"#FFB347",fontFamily:"monospace",fontWeight:600}}>{distLabel(userDists[area.coordId])}</div></div>}</div></Section>
    {[{title:"Notable streets / parts",content:area.towns.map(t=><div key={t} style={{fontSize:"0.7rem",color:"#c0d8e4",padding:"4px 0",borderBottom:"1px solid #162838"}}>📍 {t}</div>)},{title:"Character",content:<p style={{fontSize:"0.7rem",color:"#c0d8e4",lineHeight:1.7,margin:0}}>{area.character}</p>},{title:"Delivery notes",content:<p style={{fontSize:"0.7rem",color:"#c0d8e4",lineHeight:1.7,margin:0}}>{area.delivery}</p>},{title:"Local issues",content:area.issues.map((i,idx)=><div key={idx} style={{display:"flex",gap:8,marginBottom:6}}><div style={{color:area.color,fontSize:"0.7rem",flexShrink:0}}>▸</div><div style={{fontSize:"0.68rem",color:"#c0d8e4",lineHeight:1.5}}>{i}</div></div>)},{title:"For the campaign",content:<p style={{fontSize:"0.7rem",color:"#c0d8e4",lineHeight:1.7,margin:0}}>{area.political}</p>}].map(s=><Section key={s.title} title={s.title}>{s.content}</Section>)}
    <div style={{fontSize:"0.55rem",color:"#4a7a8a",lineHeight:1.6,marginTop:8,fontStyle:"italic"}}>Public-knowledge briefing only — drawn from SIMD, council profiles and census. No voter data.</div></div>);
  return(<div style={{padding:"16px",paddingBottom:32}}><div style={{fontSize:"0.57rem",color:"#64b5d8",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10}}>7 Areas — Tap for Detail</div>{AREAS.map(a=>(<button key={a.id} onClick={()=>setSel(a.id)} style={{width:"100%",background:"#0d1b2a",border:"1px solid #1a3a50",borderLeft:`4px solid ${a.color}`,borderRadius:8,padding:"13px 14px",marginBottom:10,cursor:"pointer",textAlign:"left",display:"block"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div style={{flex:1}}><div style={{fontSize:"0.85rem",fontWeight:700,color:"#fff"}}>{a.name}</div><div style={{fontSize:"0.58rem",color:"#64b5d8",marginTop:2}}>{a.ward}</div></div><div style={{textAlign:"right",flexShrink:0,marginLeft:10}}><div style={{fontSize:"0.58rem",color:a.color,fontWeight:700}}>{priorityLabel(a.priority)}</div></div></div><div style={{marginTop:8,display:"flex",gap:8,flexWrap:"wrap"}}><span style={{fontSize:"0.58rem",color:"#4a7a8a"}}>🚶 Base: {distLabel(bDist[a.coordId])}</span>{userDists&&user?.name&&<span style={{fontSize:"0.58rem",color:"#FFB347"}}>{user.name}: {distLabel(userDists[a.coordId])}</span>}</div></button>))}</div>);
}

// ─── ELECTION (Aberdeen South 2024 context + 2026 field) ────
function ElectionTab(){return(<div style={{padding:"16px",paddingBottom:32}}><Section title="2024 General Election — Aberdeen South">{ELECTION_RESULTS.map(r=>(<div key={r.party} style={{marginBottom:12,paddingBottom:12,borderBottom:"1px solid #162838"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><div><span style={{fontSize:"0.75rem",fontWeight:r.isUs?700:500,color:r.isUs?"#12B6CF":"#fff"}}>{r.party}</span><span style={{fontSize:"0.58rem",color:"#4a7a8a",marginLeft:6}}>{r.candidate}</span></div><div><span style={{fontSize:"0.73rem",fontFamily:"monospace",color:r.isUs?"#12B6CF":"#c0d8e4"}}>{r.pct}%</span><span style={{fontSize:"0.57rem",color:"#4a7a8a",marginLeft:4}}>{r.votes.toLocaleString()}</span></div></div><div style={{height:7,background:"#162838",borderRadius:4,overflow:"hidden"}}><div style={{width:`${r.pct*2.5}%`,height:"100%",background:r.color,borderRadius:4}}/></div>{r.isUs&&<div style={{fontSize:"0.57rem",color:"#FF6B35",marginTop:4}}>★ Reform's 2024 base here — the figure to build well beyond</div>}</div>))}<div style={{fontSize:"0.58rem",color:"#4a7a8a",lineHeight:1.5}}>SNP held the seat (Stephen Flynn). Turnout 59.9%. Flynn has since resigned it to take his Holyrood seat, triggering this by-election. Source: official declaration / BBC.</div></Section>
  <Section title="2026 By-election Candidates">{CANDIDATES_2026.map(c=>(<div key={c.name} style={{padding:"9px 10px",marginBottom:7,borderRadius:6,background:c.isUs?"rgba(18,182,207,0.12)":"#162838",border:c.isUs?"1px solid #12B6CF":"1px solid transparent"}}><div style={{display:"flex",justifyContent:"space-between"}}><div style={{fontSize:"0.75rem",fontWeight:c.isUs?700:500,color:c.isUs?"#12B6CF":"#fff"}}>{c.name}{c.isUs?" ★":""}</div><div style={{fontSize:"0.58rem",color:partyColor(c.party),fontWeight:600,marginLeft:8}}>{c.party}</div></div><div style={{fontSize:"0.62rem",color:"#64b5d8",marginTop:2}}>{c.note}</div></div>))}<div style={{fontSize:"0.55rem",color:"#4a7a8a",marginTop:4,fontStyle:"italic"}}>Field as confirmed at preparation — verify against the official notice before relying on it.</div></Section></div>);}

// ─── COVERAGE (REBUILT — leaflet delivery only, NO voter data) ─
function CoverageTab(){
  const {data:leaflets,loading:ll}=useCollection("leaflets");
  const {data:zones,loading:zl}=useCollection("zones");
  const [selArea,setSelArea]=useState(null);
  const loading=ll||zl;
  const daysLeft=Math.max(0,Math.ceil((new Date("2026-06-18")-new Date())/(1000*60*60*24)));
  function areaStats(areaName){
    const subs=AREA_SUBAREAS[areaName]||[];
    const leafleted=leaflets.filter(l=>l.area===areaName&&l.status==="Complete").map(l=>l.subarea);
    const partial=leaflets.filter(l=>l.area===areaName&&l.status?.includes("Partial")).map(l=>l.subarea);
    const areaZones=zones.filter(z=>z.town===areaName);
    const pct=subs.length>0?Math.round((leafleted.length/subs.length)*100):0;
    return{subs,leafleted,partial,areaZones,pct,leafleted_count:leafleted.length,partial_count:partial.length,total:subs.length};
  }
  const totalSubs=Object.values(AREA_SUBAREAS).flat().length;
  const totalDone=leaflets.filter(l=>l.status==="Complete").length;
  const overallPct=totalSubs>0?Math.round((totalDone/totalSubs)*100):0;
  const totalLeaflets=leaflets.reduce((s,r)=>s+(parseInt(r.qty)||0),0);
  function cColor(pct){return pct>=75?"#4CAF50":pct>=40?"#FFB347":pct>0?"#FF6B35":"#2a3a4a";}
  function cLabel(pct){return pct>=75?"Good":pct>=40?"Partial":pct>0?"Low":"None";}

  if(selArea){
    const area=AREAS.find(a=>a.name===selArea);
    const stats=areaStats(selArea);
    return(
      <div style={{padding:"16px",paddingBottom:32}}>
        <button onClick={()=>setSelArea(null)} style={{background:"none",border:"none",color:"#12B6CF",fontSize:"0.75rem",cursor:"pointer",marginBottom:12,padding:0}}>← Coverage Dashboard</button>
        <div style={{borderLeft:`4px solid ${area?.color||"#12B6CF"}`,paddingLeft:12,marginBottom:14}}>
          <div style={{fontSize:"1.05rem",fontFamily:"Georgia,serif",fontWeight:700,color:"#fff"}}>{selArea}</div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2}}><div style={{fontSize:"0.85rem",fontWeight:700,color:cColor(stats.pct),fontFamily:"monospace"}}>{stats.pct}%</div><div style={{fontSize:"0.6rem",color:cColor(stats.pct)}}>{cLabel(stats.pct)} leaflet coverage</div></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
          {[{l:"Sub-areas Done",v:`${stats.leafleted_count}/${stats.total}`,c:"#FFB347"},{l:"Delivery Zones",v:stats.areaZones.length,c:"#12B6CF"}].map(s=>(<div key={s.l} style={{background:"#0d1b2a",border:"1px solid #1a3a50",borderRadius:8,padding:"10px 8px",textAlign:"center"}}><div style={{fontSize:"1.1rem",fontWeight:700,color:s.c,fontFamily:"monospace"}}>{s.v}</div><div style={{fontSize:"0.52rem",color:"#64b5d8",textTransform:"uppercase"}}>{s.l}</div></div>))}
        </div>
        <Section title="Sub-area Coverage — Leaflets">
          {stats.subs.map(sub=>{
            const done=stats.leafleted.includes(sub);
            const part=stats.partial.includes(sub);
            const record=leaflets.find(l=>l.area===selArea&&l.subarea===sub);
            return(<div key={sub} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #162838"}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:done?"#4CAF50":part?"#FFB347":"#2a3a4a",flexShrink:0,border:"1px solid rgba(255,255,255,0.15)"}}/>
              <div style={{flex:1}}><div style={{fontSize:"0.7rem",color:done?"#4CAF50":part?"#FFB347":"#90a8b8",fontWeight:done||part?600:400}}>{sub}</div>{record&&<div style={{fontSize:"0.57rem",color:"#4a7a8a",marginTop:1}}>👤 {record.deliveredBy} · {record.date}{record.qty?` · ${parseInt(record.qty).toLocaleString()} leaflets`:""}</div>}</div>
              <div style={{fontSize:"0.62rem",color:done?"#4CAF50":part?"#FFB347":"#4a7a8a",fontWeight:600}}>{done?"✓":part?"~":"—"}</div>
            </div>);
          })}
        </Section>
      </div>
    );
  }
  return(
    <div style={{padding:"16px",paddingBottom:32}}>
      <div style={{background:"linear-gradient(135deg,#03045E,#0077B6)",borderRadius:10,padding:"14px 16px",marginBottom:14,border:"1px solid #12B6CF",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><div style={{fontSize:"0.55rem",color:"#90E0EF",textTransform:"uppercase",letterSpacing:"0.1em"}}>Leaflet Coverage</div><div style={{fontSize:"0.7rem",color:"#fff",marginTop:2}}>Polling day Thu 18 June 2026</div><SyncBadge loading={loading}/></div>
        <div style={{textAlign:"right"}}><div style={{fontSize:"2rem",fontWeight:700,color:"#12B6CF",fontFamily:"monospace",lineHeight:1}}>{daysLeft}</div><div style={{fontSize:"0.55rem",color:"#90E0EF",textTransform:"uppercase",letterSpacing:"0.08em"}}>days left</div></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
        {[{l:"Sub-areas Done",v:`${totalDone}/${totalSubs}`,c:"#FFB347"},{l:"Leaflets Out",v:totalLeaflets>0?totalLeaflets.toLocaleString():"—",c:"#12B6CF"},{l:"Coverage",v:`${overallPct}%`,c:cColor(overallPct)}].map(s=>(<div key={s.l} style={{background:"#0d1b2a",border:"1px solid #1a3a50",borderRadius:8,padding:"12px 8px",textAlign:"center"}}><div style={{fontSize:"1.2rem",fontWeight:700,color:s.c,fontFamily:"monospace",lineHeight:1}}>{s.v}</div><div style={{fontSize:"0.53rem",color:"#64b5d8",textTransform:"uppercase",marginTop:3}}>{s.l}</div></div>))}
      </div>
      <div style={{background:"#0d1b2a",borderRadius:8,padding:"14px",marginBottom:14,border:"1px solid #1a3a50"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:"0.6rem",color:"#64b5d8",textTransform:"uppercase",letterSpacing:"0.1em"}}>Overall Leaflet Coverage</span><span style={{fontSize:"0.7rem",color:cColor(overallPct),fontFamily:"monospace",fontWeight:700}}>{overallPct}%</span></div>
        <div style={{height:12,background:"#162838",borderRadius:6,overflow:"hidden"}}><div style={{width:`${overallPct}%`,height:"100%",background:cColor(overallPct),borderRadius:6,transition:"width 0.8s ease"}}/></div>
      </div>
      <div style={{fontSize:"0.57rem",color:"#64b5d8",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10}}>Area Breakdown — Tap for Detail</div>
      {AREAS.map(area=>{
        const stats=areaStats(area.name);
        return(
          <button key={area.id} onClick={()=>setSelArea(area.name)} style={{width:"100%",background:"#0d1b2a",border:"1px solid #1a3a50",borderLeft:`4px solid ${area.color}`,borderRadius:8,padding:"13px 14px",marginBottom:10,cursor:"pointer",textAlign:"left",display:"block"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div style={{flex:1}}><div style={{fontSize:"0.82rem",fontWeight:700,color:"#fff"}}>{area.name}</div><div style={{fontSize:"0.58rem",color:"#64b5d8",marginTop:1}}>{priorityLabel(area.priority)}</div></div>
              <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}><div style={{fontSize:"0.85rem",fontWeight:700,color:cColor(stats.pct),fontFamily:"monospace"}}>{stats.pct}%</div><div style={{fontSize:"0.55rem",color:cColor(stats.pct)}}>{cLabel(stats.pct)}</div></div>
            </div>
            <div style={{height:6,background:"#162838",borderRadius:3,overflow:"hidden"}}><div style={{display:"flex",height:"100%"}}><div style={{width:`${stats.pct}%`,background:"#4CAF50"}}/><div style={{width:`${stats.total>0?Math.round((stats.partial_count/stats.total)*100):0}%`,background:"#FFB347"}}/></div></div>
            <div style={{marginTop:6,display:"flex",gap:10,flexWrap:"wrap"}}><span style={{fontSize:"0.58rem",color:"#FFB347"}}>📬 {stats.leafleted_count}/{stats.total} sub-areas</span><span style={{fontSize:"0.58rem",color:"#12B6CF"}}>🗺️ {stats.areaZones.length} zones</span></div>
          </button>
        );
      })}
    </div>
  );
}

// ─── VOLUNTEERS (clean half of old Contacts — sign-ups only) ─
function VolunteersTab(){
  const [volunteers,setVolunteers]=useState([]);
  const [loadingVols,setLoadingVols]=useState(false);
  useEffect(()=>{
    setLoadingVols(true);
    const unsub=onSnapshot(collection(db,"volunteers"),snap=>{
      const vols=snap.docs.map(d=>({id:d.id,...d.data()}));
      setVolunteers(vols.sort((a,b)=>(a.name||"").localeCompare(b.name||"")));
      setLoadingVols(false);
    },()=>setLoadingVols(false));
    return()=>unsub();
  },[]);
  function exportCSV(){
    const rows=[["Name","Phone","Joined"],...volunteers.map(v=>[v.name||"",v.phone||"",v.joinedAt?.toDate?v.joinedAt.toDate().toLocaleDateString("en-GB"):""])];
    const csv=rows.map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="volunteers.csv";a.click();
    URL.revokeObjectURL(url);
  }
  return(<div style={{padding:"16px",paddingBottom:32}}>
    <div style={{background:"#0a1228",border:"1px solid #12B6CF",borderRadius:8,padding:"12px 14px",marginBottom:14}}>
      <div style={{fontSize:"0.6rem",color:"#12B6CF",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>👥 Volunteer Sign-ups <SyncBadge loading={loadingVols}/></div>
      <div style={{fontSize:"0.7rem",color:"#c0d8e4",lineHeight:1.6}}>Everyone who has signed up via the Volunteer Hub app. (Volunteer contact details only — no voter data.)</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
      <div style={{background:"#0d1b2a",border:"1px solid #1a3a50",borderRadius:8,padding:"10px",textAlign:"center"}}>
        <div style={{fontSize:"1.3rem",fontWeight:700,color:"#12B6CF",fontFamily:"monospace"}}>{volunteers.length}</div>
        <div style={{fontSize:"0.53rem",color:"#64b5d8",textTransform:"uppercase"}}>Signed Up</div>
      </div>
      <div style={{background:"#0d1b2a",border:"1px solid #1a3a50",borderRadius:8,padding:"10px",textAlign:"center",display:"flex",alignItems:"center"}}>
        <button onClick={exportCSV} style={{background:"#4CAF50",border:"none",borderRadius:6,color:"#fff",fontSize:"0.65rem",fontWeight:700,padding:"8px 12px",cursor:"pointer",width:"100%"}}>📥 Export CSV</button>
      </div>
    </div>
    {loadingVols&&<EmptyState icon="⏳" title="Loading volunteers…" sub=""/>}
    {!loadingVols&&volunteers.length===0&&<EmptyState icon="👥" title="No volunteers yet" sub="When people sign up via the Volunteer Hub they will appear here."/>}
    {volunteers.map(v=>(
      <div key={v.id} style={{background:"#0d1b2a",border:"1px solid #1a3a50",borderRadius:8,padding:"12px 14px",marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:"0.82rem",fontWeight:700,color:"#fff"}}>{v.name||"Unknown"}</div>
            <div style={{fontSize:"0.65rem",color:"#12B6CF",marginTop:2}}>📱 {v.phone||"No phone"}</div>
            {v.joinedAt?.toDate&&<div style={{fontSize:"0.58rem",color:"#4a7a8a",marginTop:2}}>Joined {v.joinedAt.toDate().toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</div>}
          </div>
          <a href={`tel:${v.phone}`} style={{background:"#12B6CF22",border:"1px solid #12B6CF",borderRadius:20,padding:"5px 12px",fontSize:"0.62rem",color:"#12B6CF",textDecoration:"none",flexShrink:0}}>📞 Call</a>
        </div>
      </div>
    ))}
  </div>);}

// ─── NOTICEBOARD (kept) ─────────────────────────────────────
function BoardTab({user}){
  const {data:posts,loading,addItem,removeItem}=useCollection("board");
  const [showForm,setShowForm]=useState(false);const [savedMsg,setSavedMsg]=useState("");
  const [form,setForm]=useState({title:"",body:"",priority:"Normal"});
  async function submit(){if(!form.title.trim()||!form.body.trim())return;await addItem({...form,author:user?.name||"Unknown"});setSavedMsg("✓ Posted!");setTimeout(()=>setSavedMsg(""),2000);setShowForm(false);setForm({title:"",body:"",priority:"Normal"});}
  const pColor=p=>p==="Urgent"?"#F44336":p==="Important"?"#FFB347":"#12B6CF";
  return(<div style={{padding:"16px",paddingBottom:32}}>
    <div style={{background:"#0a1a10",border:"1px solid #4CAF50",borderRadius:8,padding:"12px 14px",marginBottom:14}}><div style={{fontSize:"0.6rem",color:"#4CAF50",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>📣 Team Noticeboard <SyncBadge loading={loading}/></div><div style={{fontSize:"0.7rem",color:"#c0d8e4",lineHeight:1.6}}>Campaign updates for the team. All members see every post in real time.</div></div>
    {savedMsg&&<div style={{background:"#0a2a15",border:"1px solid #4CAF50",borderRadius:6,padding:"8px 12px",marginBottom:12,fontSize:"0.7rem",color:"#4CAF50"}}>{savedMsg}</div>}
    <Btn onClick={()=>setShowForm(!showForm)} style={{width:"100%",marginBottom:14}} color={showForm?"#1a3a50":"#4CAF50"} textColor={showForm?"#4CAF50":"#0a1a0a"}>{showForm?"✕ Cancel":"+ Post Update"}</Btn>
    {showForm&&<div style={{background:"#0d1b2a",borderRadius:10,padding:"16px",marginBottom:16,border:"1px solid #4CAF50"}}>
      <Select label="Priority" value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} options={["Normal","Important","Urgent"]}/>
      <Input label="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Focus on Torry this weekend"/>
      <div style={{marginBottom:14}}><label style={{fontSize:"0.62rem",color:"#90a8b8",display:"block",marginBottom:3}}>Message</label><textarea value={form.body} onChange={e=>setForm({...form,body:e.target.value})} placeholder="Full message for the team…" rows={4} style={{width:"100%",background:"#162838",border:"1px solid #2a4a60",borderRadius:6,color:"#fff",fontSize:"0.73rem",padding:"9px 10px",outline:"none",fontFamily:"inherit",resize:"vertical",lineHeight:1.5,boxSizing:"border-box"}}/></div>
      <Btn onClick={submit} disabled={!form.title.trim()||!form.body.trim()} style={{width:"100%"}}>✓ Post to Team</Btn>
    </div>}
    {posts.map(p=>(<div key={p.id} style={{background:"#0d1b2a",border:`1px solid ${p.priority==="Urgent"?"#F44336":p.priority==="Important"?"#FFB347":"#1a3a50"}`,borderRadius:8,padding:"14px",marginBottom:12}}>{p.priority!=="Normal"&&<div style={{fontSize:"0.55rem",color:pColor(p.priority),fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:3}}>⚡ {p.priority}</div>}<div style={{fontSize:"0.85rem",fontWeight:700,color:"#fff",lineHeight:1.3,marginBottom:6}}>{p.title}</div><div style={{fontSize:"0.72rem",color:"#c0d8e4",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{p.body}</div><div style={{marginTop:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",gap:8}}><span style={{fontSize:"0.58rem",color:"#64b5d8"}}>📣 {p.author}</span><span style={{fontSize:"0.55rem",color:"#4a7a8a"}}>{fmtDate(p.timestamp)} {fmtTime(p.timestamp)}</span></div><button onClick={()=>removeItem(p.id)} style={{background:"none",border:"none",color:"#4a7a8a",fontSize:"0.55rem",cursor:"pointer",padding:0}}>🗑</button></div></div>))}
    {posts.length===0&&!showForm&&<EmptyState icon="📣" title="No posts yet" sub="Post updates, logistics and briefings. The whole team sees them instantly."/>}
  </div>);}

// ─── LEAFLET TRACKER (kept — uses area/subarea) ─────────────
function LeafletsTab({user}){
  const {data:records,loading,addItem,removeItem}=useCollection("leaflets");
  const [showForm,setShowForm]=useState(false);const [savedMsg,setSavedMsg]=useState("");
  const [form,setForm]=useState({area:"",subarea:"",qty:"",notes:"",date:new Date().toISOString().split("T")[0],status:"Complete"});
  async function submit(){if(!form.area||!form.subarea)return;await addItem({...form,deliveredBy:user?.name||"Unknown"});setSavedMsg("✓ Logged!");setTimeout(()=>setSavedMsg(""),2000);setShowForm(false);setForm({area:"",subarea:"",qty:"",notes:"",date:new Date().toISOString().split("T")[0],status:"Complete"});}
  const totalLeaflets=records.reduce((s,r)=>s+(parseInt(r.qty)||0),0);
  const byArea={};records.forEach(r=>{if(!byArea[r.area])byArea[r.area]=[];byArea[r.area].push(r);});
  const availableSubs=form.area&&AREA_SUBAREAS[form.area]?["Select sub-area…",...AREA_SUBAREAS[form.area]]:["Select area first…"];
  return(<div style={{padding:"16px",paddingBottom:32}}>
    <div style={{background:"#0a1228",border:"1px solid #FFB347",borderRadius:8,padding:"12px 14px",marginBottom:14}}><div style={{fontSize:"0.6rem",color:"#FFB347",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>📬 Leaflet Delivery Tracker <SyncBadge loading={loading}/></div><div style={{fontSize:"0.7rem",color:"#c0d8e4",lineHeight:1.6}}>Log every drop. The Coverage tab tracks progress automatically.</div></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>{[{l:"Drops Logged",v:records.length,c:"#FFB347"},{l:"Leaflets Delivered",v:totalLeaflets>0?totalLeaflets.toLocaleString():"—",c:"#FFB347"}].map(s=>(<div key={s.l} style={{background:"#0d1b2a",border:"1px solid #1a3a50",borderRadius:8,padding:"10px",textAlign:"center"}}><div style={{fontSize:"1.3rem",fontWeight:700,color:s.c,fontFamily:"monospace"}}>{s.v}</div><div style={{fontSize:"0.53rem",color:"#64b5d8",textTransform:"uppercase"}}>{s.l}</div></div>))}</div>
    {Object.keys(byArea).length>0&&<Section title="Coverage by Area">{Object.entries(byArea).map(([area,recs])=>(<div key={area} style={{marginBottom:8,paddingBottom:8,borderBottom:"1px solid #162838"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:"0.7rem",color:"#fff",fontWeight:600}}>{area}</span><span style={{fontSize:"0.62rem",color:"#FFB347",fontFamily:"monospace"}}>{recs.filter(r=>r.status==="Complete").length}/{(AREA_SUBAREAS[area]||[]).length} sub-areas</span></div><div style={{height:5,background:"#162838",borderRadius:3,overflow:"hidden"}}><div style={{width:`${(AREA_SUBAREAS[area]||[]).length>0?Math.round(recs.filter(r=>r.status==="Complete").length/(AREA_SUBAREAS[area]||[]).length*100):0}%`,height:"100%",background:"#4CAF50",borderRadius:3}}/></div></div>))}</Section>}
    {savedMsg&&<div style={{background:"#1a1200",border:"1px solid #FFB347",borderRadius:6,padding:"8px 12px",marginBottom:12,fontSize:"0.7rem",color:"#FFB347"}}>{savedMsg}</div>}
    <Btn onClick={()=>setShowForm(!showForm)} style={{width:"100%",marginBottom:14}} color={showForm?"#1a3a50":"#FFB347"} textColor={showForm?"#FFB347":"#0a0800"}>{showForm?"✕ Cancel":"+ Log Leaflet Drop"}</Btn>
    {showForm&&<div style={{background:"#0d1b2a",borderRadius:10,padding:"16px",marginBottom:16,border:"1px solid #FFB347"}}>
      <Select label="Area" value={form.area} onChange={e=>setForm({...form,area:e.target.value,subarea:""})} options={["Select area…",...AREA_NAMES]}/>
      <Select label="Sub-area" value={form.subarea} onChange={e=>setForm({...form,subarea:e.target.value})} options={availableSubs}/>
      <Input label="Leaflets Delivered (approx)" type="number" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})} placeholder="e.g. 150"/>
      <Select label="Status" value={form.status} onChange={e=>setForm({...form,status:e.target.value})} options={["Complete","Partial — needs finishing","Could not deliver"]}/>
      <Input label="Date" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/>
      <div style={{marginBottom:14}}><label style={{fontSize:"0.62rem",color:"#90a8b8",display:"block",marginBottom:3}}>Notes</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="e.g. Some flats no letterbox" rows={2} style={{width:"100%",background:"#162838",border:"1px solid #2a4a60",borderRadius:6,color:"#fff",fontSize:"0.73rem",padding:"9px 10px",outline:"none",fontFamily:"inherit",resize:"vertical",lineHeight:1.5,boxSizing:"border-box"}}/></div>
      <Btn onClick={submit} disabled={!form.area||!form.subarea} style={{width:"100%"}}>✓ Log Delivery</Btn>
    </div>}
    {records.map(r=>{const sc=r.status==="Complete"?"#4CAF50":r.status?.includes("Partial")?"#FFB347":"#F44336";return(<div key={r.id} style={{background:"#0d1b2a",border:"1px solid #1a3a50",borderRadius:8,padding:"12px 14px",marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><div style={{fontSize:"0.75rem",fontWeight:600,color:"#fff"}}>{r.subarea}</div><div style={{fontSize:"0.62rem",color:"#64b5d8",marginTop:1}}>{r.area}</div></div><div style={{textAlign:"right",flexShrink:0,marginLeft:8}}><div style={{fontSize:"0.62rem",color:sc,fontWeight:700}}>{r.status}</div>{r.qty&&<div style={{fontSize:"0.58rem",color:"#FFB347",fontFamily:"monospace"}}>{parseInt(r.qty).toLocaleString()} leaflets</div>}</div></div><div style={{marginTop:6,display:"flex",gap:8}}><span style={{fontSize:"0.55rem",color:"#64b5d8"}}>👤 {r.deliveredBy}</span><span style={{fontSize:"0.55rem",color:"#4a7a8a"}}>{r.date}</span></div>{r.notes&&<div style={{marginTop:4,fontSize:"0.63rem",color:"#a0b8c8",lineHeight:1.5,fontStyle:"italic"}}>"{r.notes}"</div>}<button onClick={()=>removeItem(r.id)} style={{background:"none",border:"none",color:"#4a7a8a",fontSize:"0.55rem",cursor:"pointer",marginTop:4,padding:0}}>🗑 Delete</button></div>);})}
    {records.length===0&&!showForm&&<EmptyState icon="📬" title="No leaflet drops logged yet" sub="Log every delivery. The Coverage tab tracks progress across all areas automatically."/>}
  </div>);}

// ─── TOWNS / DELIVERY AREAS (Aberdeen South — verified) ─────
// Torry is built out fully as the worked example. AB postcodes verified
// (StreetCheck/StreetList/postcodes.io); coordinates cross-checked.
const TOWNS = [
  {
    id: "torry", name: "Torry", ward: "Torry/Ferryhill ward (AB11)",
    priority: 1, color: "#FF6B35", lat: 57.1336, lng: -2.0847,
    sectors: ["AB11 8","AB11 9"], subsectorPrefix: "AB11 ",
    customSubsectors: [
      {code:"AB11 8", label:"AB11 8 — Balnagask, Oscar Road, Tullos edge"},
      {code:"AB11 9", label:"AB11 9 — Victoria Road, Menzies Road, Walker Road"},
    ],
    estProperties: 4500,
    notes: "Jo's launch area. Dense granite tenements — efficient leafleting, watch shared stairs. Oil & gas heartland.",
    // Verified Torry residential streets (cross-checked, real):
    knownStreets: ["Victoria Road","Menzies Road","Walker Road","Walker Lane","Walker Place","Grampian Road","Sinclair Road","Abbey Road","Abbey Place","Crombie Road","Oscar Road","Balnagask Road"],
  },
  {
    id: "kincorth", name: "Kincorth", ward: "Kincorth/Nigg/Cove ward (AB12)",
    priority: 1, color: "#FF6B35", lat: 57.1170, lng: -2.0950,
    sectors: ["AB12 5"], subsectorPrefix: "AB12 5",
    subsectorLetters: ["A","B","D","E","F","G","H","J","L","N","P","Q","R","S"],
    estProperties: 4000,
    notes: "Post-war residential suburb, houses with gardens. Slower per street than Torry.",
  },
  {
    id: "niggcove", name: "Nigg & Cove", ward: "Kincorth/Nigg/Cove ward (AB12)",
    priority: 1, color: "#FF6B35", lat: 57.1045, lng: -2.0780,
    sectors: ["AB12 3"], subsectorPrefix: "AB12 3",
    subsectorLetters: ["A","B","D","E","F","G","H","J","L","N","P","Q","R","S","T","U","W"],
    estProperties: 5000,
    notes: "Modern commuter estates + Cove Bay village. Lower density, skip Altens/Tullos industry.",
  },
  {
    id: "ferryhill", name: "Ferryhill", ward: "Torry/Ferryhill ward (AB10/AB11)",
    priority: 2, color: "#FFB347", lat: 57.1365, lng: -2.1050,
    sectors: ["AB11 6","AB11 7"], subsectorPrefix: "AB11 ",
    customSubsectors: [
      {code:"AB11 6", label:"AB11 6 — Ferryhill / Bon Accord side"},
      {code:"AB11 7", label:"AB11 7 — Ferryhill / Polmuir side"},
    ],
    estProperties: 3500,
    notes: "Victorian villas, terraces and flats. Central, dense, walkable.",
  },
  {
    id: "ruthrieston", name: "Ruthrieston", ward: "Airyhall/Broomhill/Garthdee (AB10)",
    priority: 2, color: "#FFB347", lat: 57.1280, lng: -2.1230,
    sectors: ["AB10 7"], subsectorPrefix: "AB10 7",
    subsectorLetters: ["A","B","D","E","F","G","H","J","L","N","P"],
    estProperties: 3000,
    notes: "Settled residential near Bridge of Dee. Moderate door-density.",
  },
  {
    id: "garthdee", name: "Garthdee", ward: "Airyhall/Broomhill/Garthdee (AB10)",
    priority: 3, color: "#90E0EF", lat: 57.1180, lng: -2.1340,
    sectors: ["AB10 7"], subsectorPrefix: "AB10 7",
    subsectorLetters: ["Q","R","S","T","U","W","X","Y"],
    estProperties: 2500,
    notes: "Housing + RGU campus + retail park. Skip campus & retail; student lets = no-answers.",
  },
  {
    id: "cults", name: "Cults", ward: "Lower Deeside ward (AB15)",
    priority: 3, color: "#90E0EF", lat: 57.1167, lng: -2.1667,
    sectors: ["AB15 9"], subsectorPrefix: "AB15 9",
    subsectorLetters: ["A","B","D","E","F","G","H","J","L","N","P","Q","R","S"],
    estProperties: 3000,
    notes: "Affluent — large detached homes, big gardens, LOWEST door-density. Slow; budget time.",
  },
];

// ─── ROUTES TAB (ported intact — postcodes.io routing) ──────
function RoutesTab({user}) {
  const {data:routes,loading,addItem,removeItem,updateItem} = useCollection("routes");
  const {data:zones} = useCollection("zones");
  const [view, setView] = useState("towns");
  const [selTown, setSelTown] = useState(null);
  const [selRoute, setSelRoute] = useState(null);
  const [selZone, setSelZone] = useState(null);
  const [subsectors, setSubsectors] = useState([]);
  const [loadingSubsectors, setLoadingSubsectors] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [assignTo, setAssignTo] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  const teamMembers = [...new Set(routes.map(r => r.assignedTo).filter(Boolean))];

  async function fetchSubsectors(town) {
    setLoadingSubsectors(true); setSubsectors([]);
    try {
      if (town.customSubsectors) {
        const results = [];
        for (const cs of town.customSubsectors) {
          try {
            const res = await fetch(`https://api.postcodes.io/postcodes?query=${encodeURIComponent(cs.code)}&limit=100`);
            const data = await res.json();
            const postcodes = data.result || [];
            results.push({ code: cs.code, label: cs.label, postcodes: postcodes.slice(0,20), count: postcodes.length, lat: postcodes[0]?.latitude || town.lat, lng: postcodes[0]?.longitude || town.lng });
          } catch(e) { results.push({code:cs.code, label:cs.label, postcodes:[], count:0, lat:town.lat, lng:town.lng}); }
        }
        setSubsectors(results);
      } else {
        const results = [];
        for (const letter of (town.subsectorLetters||[])) {
          const q = `${town.subsectorPrefix}${letter}`;
          try {
            const res = await fetch(`https://api.postcodes.io/postcodes?query=${encodeURIComponent(q)}&limit=100`);
            const data = await res.json();
            const postcodes = data.result || [];
            if (postcodes.length > 0) results.push({ code: q, label: `${q} — ${postcodes.length} postcodes`, postcodes, count: postcodes.length, lat: postcodes[Math.floor(postcodes.length/2)]?.latitude || town.lat, lng: postcodes[Math.floor(postcodes.length/2)]?.longitude || town.lng });
          } catch(e) {}
        }
        setSubsectors(results);
      }
    } catch(e) { console.error("Failed to fetch subsectors:", e); }
    setLoadingSubsectors(false);
  }
  function openTown(town) { setSelTown(town); setView("town"); fetchSubsectors(town); }
  function openRoute(subsector) { setSelRoute(subsector); setView("route"); }
  function openMap(subsector) { setSelRoute(subsector); setView("map"); }
  function openZoneMap(zone) { setSelZone(zone); setView("zonemap"); }

  async function assignRoute(subsector) {
    if (!assignTo.trim()) return;
    const existing = routes.find(r => r.code === subsector.code && r.town === selTown?.name);
    if (existing) await updateItem(existing.id, {assignedTo: assignTo.trim(), status: "Assigned", assignedDate: new Date().toISOString().split("T")[0]});
    else await addItem({ town: selTown?.name, code: subsector.code, label: subsector.label, count: subsector.count, lat: subsector.lat, lng: subsector.lng, assignedTo: assignTo.trim(), assignedBy: user?.name || "Unknown", status: "Assigned", assignedDate: new Date().toISOString().split("T")[0] });
    setSavedMsg(`✓ ${subsector.code} assigned to ${assignTo}`); setTimeout(() => setSavedMsg(""), 3000); setShowAssign(false); setAssignTo("");
  }
  async function assignZone(zone) {
    if (!assignTo.trim()) return;
    const existing = routes.find(r => r.zoneId === zone.id);
    if (existing) await updateItem(existing.id, {assignedTo: assignTo.trim(), status: "Assigned", assignedDate: new Date().toISOString().split("T")[0]});
    else await addItem({ town: zone.town, zoneId: zone.id, code: zone.name, label: zone.name, count: zone.count, lat: zone.lat, lng: zone.lng, assignedTo: assignTo.trim(), assignedBy: user?.name || "Unknown", status: "Assigned", assignedDate: new Date().toISOString().split("T")[0] });
    setSavedMsg(`✓ "${zone.name}" assigned to ${assignTo}`); setTimeout(() => setSavedMsg(""), 3000); setShowAssign(false); setAssignTo("");
  }
  async function markComplete(route) { await updateItem(route.id, {status: "Complete", completedDate: new Date().toISOString().split("T")[0], completedBy: user?.name || "Unknown"}); }
  function getZoneStatus(zoneId) { return routes.find(r => r.zoneId === zoneId); }
  function statusColor(status) { return status === "Complete" ? "#4CAF50" : status === "Assigned" ? "#FFB347" : "#1a3a50"; }

  if (view === "zonemap" && selZone) {
    const routeRecord = getZoneStatus(selZone.id);
    const status = routeRecord?.status || "Unassigned";
    return (
      <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 106px)"}}>
        <div style={{background:"#03045E",padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div>
            <button onClick={()=>setView("town")} style={{background:"none",border:"none",color:"#12B6CF",fontSize:"0.75rem",cursor:"pointer",padding:0,marginBottom:2,display:"block"}}>← Back</button>
            <div style={{fontSize:"0.85rem",fontWeight:700,color:"#fff"}}>{selZone.name}</div>
            <div style={{fontSize:"0.6rem",color:"#90E0EF"}}>{selZone.count} delivery points · Tap Navigate to start</div>
          </div>
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${selZone.lat},${selZone.lng}&travelmode=walking`} target="_blank" rel="noopener noreferrer" style={{background:"#4CAF50",border:"none",borderRadius:7,color:"#fff",fontSize:"0.65rem",fontWeight:700,padding:"8px 10px",textDecoration:"none",flexShrink:0,textAlign:"center"}}>Navigate<br/>in Maps</a>
        </div>
        <ZoneMapLeaflet zone={selZone}/>
        <div style={{background:"#0d1b2a",padding:"10px 16px",flexShrink:0,borderTop:"1px solid #1a3a50"}}>
          {savedMsg && <div style={{background:"#0a2a15",border:"1px solid #4CAF50",borderRadius:6,padding:"6px 10px",marginBottom:8,fontSize:"0.65rem",color:"#4CAF50"}}>{savedMsg}</div>}
          {status !== "Complete" && !showAssign && (<button onClick={()=>setShowAssign(true)} style={{width:"100%",background:"#FFB347",border:"none",borderRadius:8,padding:"11px",cursor:"pointer",fontSize:"0.78rem",fontWeight:700,color:"#0a0800",marginBottom:8}}>{status === "Assigned" ? "✏️ Reassign Zone" : "👤 Assign Zone"}</button>)}
          {showAssign && (<div style={{marginBottom:8}}>
            <input value={assignTo} onChange={e=>setAssignTo(e.target.value)} placeholder="Team member name" style={{width:"100%",background:"#162838",border:"1px solid #2a4a60",borderRadius:6,color:"#fff",fontSize:"0.78rem",padding:"9px 10px",outline:"none",fontFamily:"inherit",boxSizing:"border-box",marginBottom:6}}/>
            {teamMembers.length > 0 && <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>{teamMembers.map(m=><button key={m} onClick={()=>setAssignTo(m)} style={{background:"#12B6CF22",border:"1px solid #12B6CF",borderRadius:20,padding:"3px 9px",fontSize:"0.6rem",color:"#12B6CF",cursor:"pointer"}}>{m}</button>)}</div>}
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setShowAssign(false);setAssignTo("");}} style={{flex:1,background:"#1a3a50",border:"none",borderRadius:6,color:"#64b5d8",fontSize:"0.7rem",padding:"9px",cursor:"pointer"}}>Cancel</button>
              <button onClick={()=>assignZone(selZone)} disabled={!assignTo.trim()} style={{flex:2,background:assignTo.trim()?"#FFB347":"#1a3a50",border:"none",borderRadius:6,color:assignTo.trim()?"#0a0800":"#4a6a7a",fontSize:"0.75rem",fontWeight:700,padding:"9px",cursor:assignTo.trim()?"pointer":"default"}}>✓ Assign</button>
            </div>
          </div>)}
          {routeRecord && status === "Assigned" && (<button onClick={()=>markComplete(routeRecord)} style={{width:"100%",background:"#4CAF50",border:"none",borderRadius:8,padding:"11px",cursor:"pointer",fontSize:"0.78rem",fontWeight:700,color:"#0a1a0a"}}>✓ Mark Delivered — Complete</button>)}
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (view !== "map" || !mapRef.current || !selRoute) return;
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
      if (!window.L) return;
      const L = window.L;
      const map = L.map(mapRef.current, {zoomControl: true, attributionControl: true});
      mapInstanceRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {attribution: "© OpenStreetMap contributors", maxZoom: 19}).addTo(map);
      const bounds = [];
      (selRoute.postcodes || []).forEach(pc => {
        if (!pc.latitude || !pc.longitude) return;
        const marker = L.circleMarker([pc.latitude, pc.longitude], {radius: 8, fillColor: "#12B6CF", color: "#03045E", weight: 2, opacity: 1, fillOpacity: 0.8}).addTo(map);
        marker.bindPopup(`<b>${pc.postcode}</b>`); bounds.push([pc.latitude, pc.longitude]); markersRef.current.push(marker);
      });
      if (bounds.length > 0) map.fitBounds(bounds, {padding: [30, 30]});
      else map.setView([selRoute.lat || 57.1336, selRoute.lng || -2.0847], 15);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          const {latitude: lat, longitude: lng} = pos.coords;
          const youIcon = L.divIcon({html: '<div style="width:14px;height:14px;background:#FF6B35;border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px rgba(255,107,53,0.8)"></div>', iconSize: [14, 14], iconAnchor: [7, 7], className: ""});
          L.marker([lat, lng], {icon: youIcon}).addTo(map).bindPopup("You are here");
        });
      }
    }, 200);
    return () => { clearTimeout(timer); if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } markersRef.current = []; };
  }, [view, selRoute]);

  const totalRoutes = routes.length;
  const completedRoutes = routes.filter(r => r.status === "Complete").length;
  const assignedRoutes = routes.filter(r => r.status === "Assigned").length;

  if (view === "map" && selRoute) {
    return (
      <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 106px)"}}>
        <div style={{background:"#03045E",padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div>
            <button onClick={()=>setView("route")} style={{background:"none",border:"none",color:"#12B6CF",fontSize:"0.75rem",cursor:"pointer",padding:0,marginBottom:2,display:"block"}}>← Back to Route</button>
            <div style={{fontSize:"0.85rem",fontWeight:700,color:"#fff"}}>{selRoute.code}</div>
            <div style={{fontSize:"0.6rem",color:"#90E0EF"}}>{selRoute.count} postcodes · Blue = delivery points · Orange = you</div>
          </div>
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${selRoute.lat},${selRoute.lng}&travelmode=walking`} target="_blank" rel="noopener noreferrer" style={{background:"#4CAF50",border:"none",borderRadius:7,color:"#fff",fontSize:"0.65rem",fontWeight:700,padding:"8px 10px",textDecoration:"none",flexShrink:0,textAlign:"center"}}>Navigate<br/>in Maps</a>
        </div>
        <div ref={mapRef} style={{flex:1,width:"100%"}}/>
        <div style={{background:"#0d1b2a",padding:"10px 16px",flexShrink:0,display:"flex",gap:12,alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:10,borderRadius:"50%",background:"#12B6CF",border:"2px solid #03045E"}}/><span style={{fontSize:"0.6rem",color:"#90E0EF"}}>Delivery points</span></div>
          <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:10,borderRadius:"50%",background:"#FF6B35",border:"2px solid #fff"}}/><span style={{fontSize:"0.6rem",color:"#90E0EF"}}>You</span></div>
          <div style={{flex:1}}/>
          <button onClick={()=>setView("route")} style={{background:"#12B6CF",border:"none",borderRadius:6,color:"#03045E",fontSize:"0.65rem",fontWeight:700,padding:"6px 12px",cursor:"pointer"}}>Done</button>
        </div>
      </div>
    );
  }

  if (view === "route" && selRoute) {
    const routeRecord = routes.find(r => r.code === selRoute.code && r.town === selTown?.name);
    const status = routeRecord?.status || "Unassigned";
    const sc = statusColor(status);
    return (
      <div style={{padding:"16px",paddingBottom:32}}>
        <button onClick={()=>setView("town")} style={{background:"none",border:"none",color:"#12B6CF",fontSize:"0.75rem",cursor:"pointer",marginBottom:12,padding:0}}>← Back to {selTown?.name}</button>
        <div style={{background:"#0d1b2a",border:`2px solid ${sc}`,borderRadius:10,padding:"14px",marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div><div style={{fontSize:"1.1rem",fontFamily:"monospace",fontWeight:700,color:"#fff"}}>{selRoute.code}</div><div style={{fontSize:"0.65rem",color:"#64b5d8",marginTop:2}}>{selTown?.name}</div></div>
            <div style={{textAlign:"right"}}><div style={{fontSize:"0.65rem",fontWeight:700,color:sc,background:sc+"22",padding:"3px 8px",borderRadius:4}}>{status}</div>{selRoute.count > 0 && <div style={{fontSize:"0.6rem",color:"#4a7a8a",marginTop:3,fontFamily:"monospace"}}>~{selRoute.count * 2} properties</div>}</div>
          </div>
          {routeRecord?.assignedTo && (<div style={{marginTop:8,padding:"6px 8px",background:"#162838",borderRadius:5,fontSize:"0.65rem",color:"#FFB347"}}>👤 Assigned to {routeRecord.assignedTo} · {routeRecord.assignedDate}</div>)}
          {routeRecord?.completedBy && (<div style={{marginTop:4,padding:"6px 8px",background:"#0a2a15",borderRadius:5,fontSize:"0.65rem",color:"#4CAF50"}}>✓ Completed by {routeRecord.completedBy} · {routeRecord.completedDate}</div>)}
        </div>
        <button onClick={()=>openMap(selRoute)} style={{width:"100%",background:"#03045E",border:"2px solid #12B6CF",borderRadius:8,padding:"12px",marginBottom:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
          <span style={{fontSize:"1.2rem"}}>🗺️</span><div style={{textAlign:"left"}}><div style={{fontSize:"0.75rem",fontWeight:700,color:"#12B6CF"}}>Open Delivery Map</div><div style={{fontSize:"0.58rem",color:"#64b5d8"}}>All delivery points · Your location · Navigate</div></div>
        </button>
        {status !== "Complete" && (<div style={{marginBottom:14}}>
          {!showAssign ? (<button onClick={()=>setShowAssign(true)} style={{width:"100%",background:"#FFB347",border:"none",borderRadius:8,padding:"11px",cursor:"pointer",fontSize:"0.78rem",fontWeight:700,color:"#0a0800"}}>{status === "Assigned" ? "✏️ Reassign Route" : "👤 Assign Route"}</button>) : (
            <div style={{background:"#0d1b2a",border:"1px solid #FFB347",borderRadius:8,padding:"14px"}}>
              <div style={{fontSize:"0.6rem",color:"#FFB347",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Assign to team member</div>
              <input value={assignTo} onChange={e=>setAssignTo(e.target.value)} placeholder="Type team member name" style={{width:"100%",background:"#162838",border:"1px solid #2a4a60",borderRadius:6,color:"#fff",fontSize:"0.78rem",padding:"9px 10px",outline:"none",fontFamily:"inherit",boxSizing:"border-box",marginBottom:8}}/>
              {teamMembers.length > 0 && (<div style={{marginBottom:8}}><div style={{fontSize:"0.57rem",color:"#4a7a8a",marginBottom:4}}>Recent team members:</div><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{teamMembers.map(m => (<button key={m} onClick={()=>setAssignTo(m)} style={{background:"#12B6CF22",border:"1px solid #12B6CF",borderRadius:20,padding:"3px 9px",fontSize:"0.6rem",color:"#12B6CF",cursor:"pointer"}}>{m}</button>))}</div></div>)}
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setShowAssign(false);setAssignTo("");}} style={{flex:1,background:"#1a3a50",border:"none",borderRadius:6,color:"#64b5d8",fontSize:"0.7rem",padding:"9px",cursor:"pointer"}}>Cancel</button>
                <button onClick={()=>assignRoute(selRoute)} disabled={!assignTo.trim()} style={{flex:2,background:assignTo.trim()?"#FFB347":"#1a3a50",border:"none",borderRadius:6,color:assignTo.trim()?"#0a0800":"#4a6a7a",fontSize:"0.75rem",fontWeight:700,padding:"9px",cursor:assignTo.trim()?"pointer":"default"}}>✓ Assign</button>
              </div>
            </div>
          )}
        </div>)}
        {routeRecord && status === "Assigned" && (<button onClick={()=>markComplete(routeRecord)} style={{width:"100%",background:"#4CAF50",border:"none",borderRadius:8,padding:"11px",cursor:"pointer",fontSize:"0.78rem",fontWeight:700,color:"#0a1a0a",marginBottom:14}}>✓ Mark as Delivered — Complete</button>)}
        {savedMsg && <div style={{background:"#0a2a15",border:"1px solid #4CAF50",borderRadius:6,padding:"8px 12px",marginBottom:12,fontSize:"0.7rem",color:"#4CAF50"}}>{savedMsg}</div>}
        {selRoute.postcodes && selRoute.postcodes.length > 0 && (
          <div style={{background:"#0d1b2a",border:"1px solid #1a3a50",borderRadius:8,padding:"12px 14px"}}>
            <div style={{fontSize:"0.57rem",color:"#64b5d8",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>Postcodes in this route</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{selRoute.postcodes.map(pc => (<span key={pc.postcode} style={{background:"#162838",color:"#90E0EF",fontSize:"0.6rem",padding:"3px 7px",borderRadius:4,fontFamily:"monospace"}}>{pc.postcode}</span>))}</div>
            <div style={{fontSize:"0.55rem",color:"#4a7a8a",marginTop:8}}>Each postcode typically covers 10-20 properties on that street section</div>
          </div>
        )}
      </div>
    );
  }

  if (view === "town" && selTown) {
    const townRoutes = routes.filter(r => r.town === selTown.name);
    const townComplete = townRoutes.filter(r => r.status === "Complete").length;
    const townAssigned = townRoutes.filter(r => r.status === "Assigned").length;
    const townZones = zones.filter(z => z.townId === selTown.id);
    return (
      <div style={{padding:"16px",paddingBottom:32}}>
        <button onClick={()=>setView("towns")} style={{background:"none",border:"none",color:"#12B6CF",fontSize:"0.75rem",cursor:"pointer",marginBottom:12,padding:0}}>← All Areas</button>
        <div style={{borderLeft:`4px solid ${selTown.color}`,paddingLeft:12,marginBottom:14}}>
          <div style={{fontSize:"1.1rem",fontFamily:"Georgia,serif",fontWeight:700,color:"#fff"}}>{selTown.name}</div>
          <div style={{fontSize:"0.62rem",color:"#64b5d8",marginTop:2}}>{selTown.ward} · ~{selTown.estProperties.toLocaleString()} properties</div>
          <div style={{fontSize:"0.65rem",color:"#c0d8e4",marginTop:4,lineHeight:1.5}}>{selTown.notes}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
          {[{l:"Zones",v:townZones.length,c:"#12B6CF"},{l:"Assigned",v:townAssigned,c:"#FFB347"},{l:"Done",v:townComplete,c:"#4CAF50"}].map(s=>(<div key={s.l} style={{background:"#0d1b2a",border:"1px solid #1a3a50",borderRadius:8,padding:"10px 8px",textAlign:"center"}}><div style={{fontSize:"1.2rem",fontWeight:700,color:s.c,fontFamily:"monospace"}}>{s.v}</div><div style={{fontSize:"0.53rem",color:"#64b5d8",textTransform:"uppercase"}}>{s.l}</div></div>))}
        </div>
        {selTown.knownStreets && selTown.knownStreets.length > 0 && (
          <div style={{background:"#0a1228",border:"1px solid #12B6CF33",borderRadius:8,padding:"12px 14px",marginBottom:14}}>
            <div style={{fontSize:"0.57rem",color:"#12B6CF",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>Known residential streets ({selTown.name})</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{selTown.knownStreets.map(s=><span key={s} style={{background:"#162838",color:"#c0d8e4",fontSize:"0.6rem",padding:"3px 7px",borderRadius:4}}>{s}</span>)}</div>
            <div style={{fontSize:"0.55rem",color:"#4a7a8a",marginTop:6}}>Verified street names — use the Zones tab to draw delivery rounds across these.</div>
          </div>
        )}
        {townZones.length > 0 && (
          <div style={{marginBottom:16}}>
            <div style={{fontSize:"0.57rem",color:"#4CAF50",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>✓ Zones from Zone Builder</div>
            {townZones.map(zone => {
              const rec = getZoneStatus(zone.id); const status = rec?.status || "Unassigned"; const sc = statusColor(status);
              return (
                <button key={zone.id} onClick={()=>openZoneMap(zone)} style={{width:"100%",background:"#0d1b2a",border:`1px solid ${sc}`,borderLeft:`4px solid ${zone.color||selTown.color}`,borderRadius:8,padding:"13px 14px",marginBottom:8,cursor:"pointer",textAlign:"left",display:"block"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{flex:1}}><div style={{fontSize:"0.85rem",fontWeight:700,color:"#fff"}}>{zone.name}</div><div style={{fontSize:"0.6rem",color:"#64b5d8",marginTop:2}}>{zone.count} delivery points</div>{rec?.assignedTo && <div style={{fontSize:"0.6rem",color:"#FFB347",marginTop:2}}>👤 {rec.assignedTo}</div>}</div>
                    <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}><div style={{fontSize:"0.62rem",fontWeight:700,color:sc,background:sc+"22",padding:"3px 8px",borderRadius:4,marginBottom:4}}>{status}</div><div style={{fontSize:"0.6rem",color:"#4a7a8a"}}>Tap to open →</div></div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {townZones.length === 0 && (<div style={{background:"#0a1228",border:"1px solid #12B6CF33",borderRadius:8,padding:"12px 14px",marginBottom:14,textAlign:"center"}}><div style={{fontSize:"0.68rem",color:"#64b5d8",marginBottom:4}}>No zones built yet for {selTown.name}</div><div style={{fontSize:"0.6rem",color:"#4a7a8a"}}>Use the ✏️ Zones tab to plot delivery zones on the map</div></div>)}
        {subsectors.length > 0 && (
          <div>
            <div style={{fontSize:"0.57rem",color:"#64b5d8",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>Postcode Sectors</div>
            {loadingSubsectors && (<div style={{background:"#0d1b2a",border:"1px solid #1a3a50",borderRadius:8,padding:"20px",textAlign:"center",marginBottom:12}}><div style={{fontSize:"0.7rem",color:"#64b5d8"}}>Loading routes from postcodes.io…</div><div style={{marginTop:8,width:24,height:24,border:"3px solid #1a3a50",borderTopColor:"#12B6CF",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"8px auto 0"}}/></div>)}
            {subsectors.map(sub => {
              const rec = routes.find(r => r.code === sub.code && r.town === selTown.name); const status = rec?.status || "Unassigned"; const sc = statusColor(status);
              return (
                <button key={sub.code} onClick={()=>openRoute(sub)} style={{width:"100%",background:"#0d1b2a",border:`1px solid ${sc}`,borderRadius:8,padding:"13px 14px",marginBottom:8,cursor:"pointer",textAlign:"left",display:"block"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{flex:1}}><div style={{fontSize:"0.85rem",fontWeight:700,color:"#fff",fontFamily:"monospace"}}>{sub.code}</div><div style={{fontSize:"0.6rem",color:"#64b5d8",marginTop:2}}>~{sub.count * 2} properties · {sub.count} postcodes</div>{rec?.assignedTo && <div style={{fontSize:"0.6rem",color:"#FFB347",marginTop:2}}>👤 {rec.assignedTo}</div>}</div>
                    <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}><div style={{fontSize:"0.62rem",fontWeight:700,color:sc,background:sc+"22",padding:"3px 8px",borderRadius:4,marginBottom:4}}>{status}</div><div style={{fontSize:"0.6rem",color:"#4a7a8a"}}>Tap to open →</div></div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{padding:"16px",paddingBottom:32}}>
      <div style={{background:"#0a1228",border:"1px solid #12B6CF",borderRadius:8,padding:"12px 14px",marginBottom:14}}>
        <div style={{fontSize:"0.6rem",color:"#12B6CF",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>🗺️ Leaflet Routes <span style={{fontSize:"0.52rem",color:"#4CAF50",marginLeft:6}}>● live</span></div>
        <div style={{fontSize:"0.7rem",color:"#c0d8e4",lineHeight:1.6}}>Assign postcode routes to team members. Each route shows a map so helpers find their streets. Data from postcodes.io.</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
        {[{l:"Routes Assigned",v:assignedRoutes,c:"#FFB347"},{l:"Completed",v:completedRoutes,c:"#4CAF50"},{l:"Total Logged",v:totalRoutes,c:"#12B6CF"}].map(s=>(<div key={s.l} style={{background:"#0d1b2a",border:"1px solid #1a3a50",borderRadius:8,padding:"10px 8px",textAlign:"center"}}><div style={{fontSize:"1.2rem",fontWeight:700,color:s.c,fontFamily:"monospace"}}>{s.v}</div><div style={{fontSize:"0.52rem",color:"#64b5d8",textTransform:"uppercase"}}>{s.l}</div></div>))}
      </div>
      {savedMsg && <div style={{background:"#0a2a15",border:"1px solid #4CAF50",borderRadius:6,padding:"8px 12px",marginBottom:12,fontSize:"0.7rem",color:"#4CAF50"}}>{savedMsg}</div>}
      <div style={{fontSize:"0.57rem",color:"#64b5d8",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>Priority Areas — Tap to Manage Routes</div>
      {[1,2,3].map(tier => {
        const tierTowns = TOWNS.filter(t => t.priority === tier);
        return (
          <div key={tier}>
            <div style={{fontSize:"0.55rem",color:"#4a7a8a",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6,marginTop:tier>1?12:0}}>{tier===1?"● Tier 1 — Maximum Priority":tier===2?"● Tier 2 — Good Return":"● Tier 3 — If Time Allows"}</div>
            {tierTowns.map(town => {
              const townRoutes = routes.filter(r => r.town === town.name);
              const done = townRoutes.filter(r => r.status === "Complete").length;
              const assigned = townRoutes.filter(r => r.status === "Assigned").length;
              return (
                <button key={town.id} onClick={()=>openTown(town)} style={{width:"100%",background:"#0d1b2a",border:"1px solid #1a3a50",borderLeft:`4px solid ${town.color}`,borderRadius:8,padding:"13px 14px",marginBottom:10,cursor:"pointer",textAlign:"left",display:"block"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{flex:1}}><div style={{fontSize:"0.9rem",fontWeight:700,color:"#fff"}}>{town.name}</div><div style={{fontSize:"0.58rem",color:"#64b5d8",marginTop:2}}>~{town.estProperties.toLocaleString()} properties · {town.sectors.join(", ")}</div></div>
                    <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>{done > 0 && <div style={{fontSize:"0.62rem",color:"#4CAF50",fontWeight:700}}>✓ {done} done</div>}{assigned > 0 && <div style={{fontSize:"0.62rem",color:"#FFB347"}}>{assigned} assigned</div>}{done===0&&assigned===0&&<div style={{fontSize:"0.6rem",color:"#4a7a8a"}}>Not started</div>}</div>
                  </div>
                  <div style={{marginTop:6,fontSize:"0.58rem",color:"#4a7a8a"}}>{town.notes}</div>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── ZONE MAP LEAFLET (ported intact) ───────────────────────
function ZoneMapLeaflet({zone}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  useEffect(() => {
    if (!mapRef.current) return;
    const timer = setTimeout(() => {
      if (!window.L) return;
      const L = window.L;
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
      const map = L.map(mapRef.current, {zoomControl:true});
      mapInstanceRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {attribution:"© OpenStreetMap contributors",maxZoom:19}).addTo(map);
      const bounds = [];
      (zone.postcodes||[]).forEach(pc => {
        if (!pc.lat && !pc.latitude) return;
        const lat = pc.lat || pc.latitude; const lng = pc.lng || pc.longitude;
        L.circleMarker([lat,lng],{radius:8,fillColor:"#12B6CF",color:"#03045E",weight:2,opacity:1,fillOpacity:0.8}).addTo(map).bindPopup(`<b>${pc.postcode}</b>`);
        bounds.push([lat,lng]);
      });
      if (bounds.length > 0) map.fitBounds(bounds, {padding:[30,30]});
      else map.setView([zone.lat||57.1336, zone.lng||-2.0847], 15);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          const {latitude:lat,longitude:lng} = pos.coords;
          const youIcon = L.divIcon({html:'<div style="width:14px;height:14px;background:#FF6B35;border:2px solid #fff;border-radius:50%"></div>',iconSize:[14,14],iconAnchor:[7,7],className:""});
          L.marker([lat,lng],{icon:youIcon}).addTo(map).bindPopup("You are here");
        });
      }
    }, 200);
    return () => { clearTimeout(timer); if (mapInstanceRef.current){mapInstanceRef.current.remove();mapInstanceRef.current=null;} };
  }, [zone]);
  return <div ref={mapRef} style={{flex:1,width:"100%"}}/>;
}

// ─── ZONE BUILDER TAB (ported intact — Overpass street select) ─
function ZoneBuilderTab({user}) {
  const {data:zones, addItem:addZone, removeItem:removeZone} = useCollection("zones");
  const {data:skippedAreas, addItem:addSkipped, removeItem:removeSkipped} = useCollection("skipped");
  const [selTown, setSelTown] = useState(null);
  const [allDots, setAllDots] = useState([]);
  const [streets, setStreets] = useState([]);
  const [selectedStreets, setSelectedStreets] = useState(new Set());
  const [selected, setSelected] = useState(new Set());
  const [mode, setMode] = useState("zone");
  const modeRef = useRef("zone");
  useEffect(() => { modeRef.current = mode; }, [mode]);
  const [zoneName, setZoneName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [view, setView] = useState("towns");
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const streetLayersRef = useRef({});

  async function loadStreets(town) {
    setStreets([]); setLoading(true);
    try {
      const pad = 0.05;
      const south = (town.lat - pad).toFixed(6), west = (town.lng - pad).toFixed(6), north = (town.lat + pad).toFixed(6), east = (town.lng + pad).toFixed(6);
      const endpoints = ["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter","https://maps.mail.ru/osm/tools/overpass/api/interpreter"];
      const overpassQuery = `[out:json][timeout:30];way["highway"~"^(residential|primary|secondary|tertiary|unclassified|living_street|pedestrian|service)$"]["name"](${south},${west},${north},${east});out geom;`;
      let data = null;
      for (const endpoint of endpoints) {
        try { const res = await fetch(`${endpoint}?data=${encodeURIComponent(overpassQuery)}`); if (res.ok) { data = await res.json(); break; } } catch(e) { continue; }
      }
      if (data) {
        const streetMap = {};
        (data.elements || []).forEach(el => {
          if (!el.tags?.name || !el.geometry || el.geometry.length < 2) return;
          const name = el.tags.name;
          if (!streetMap[name]) streetMap[name] = { name, id: name, segments: [] };
          streetMap[name].segments.push(el.geometry.map(n => [n.lat, n.lon]));
        });
        setStreets(Object.values(streetMap));
      }
    } catch(e) { console.error("Overpass error:", e); }
    setLoading(false);
  }

  async function loadTownDots(town) {
    setLoading(true); setAllDots([]); setSelected(new Set());
    const dots = []; const seen = new Set();
    try {
      const townsToLoad = town.id === "constituency" ? TOWNS : [town];
      for (const t of townsToLoad) {
        const hasLetters = t.subsectorLetters && t.subsectorLetters.length > 0;
        const sectorQueries = hasLetters ? t.subsectorLetters.map(l => `${t.subsectorPrefix}${l}`) : t.customSubsectors ? t.customSubsectors.map(cs => cs.code) : t.sectors || [];
        for (const sector of sectorQueries) {
          try {
            const res = await fetch(`https://api.postcodes.io/postcodes?query=${encodeURIComponent(sector)}&limit=100`);
            const data = await res.json();
            if (data.result) {
              const bySector = {};
              data.result.forEach(pc => {
                if (!pc.latitude || !pc.longitude) return;
                const parts = pc.postcode.split(" "); const inward = parts[1] || "";
                const sectorKey = inward.length === 3 ? `${parts[0]} ${inward.slice(0, 2)}` : pc.postcode;
                if (!bySector[sectorKey]) bySector[sectorKey] = pc;
              });
              Object.entries(bySector).forEach(([sectorKey, pc]) => {
                if (seen.has(sectorKey)) return; seen.add(sectorKey);
                dots.push({ postcode: sectorKey, lat: pc.latitude, lng: pc.longitude, townId: t.id, townColor: t.color, townName: t.name });
              });
            }
          } catch(e) {}
        }
      }
    } catch(e) {}
    setAllDots(dots); setLoading(false);
  }

  function openTownMap(town) {
    setSelTown(town); setSelectedStreets(new Set()); setSelected(new Set()); setZoneName(""); setView("map");
    loadTownDots(town);
    if (town.id !== "constituency") loadStreets(town);
  }
  function toggleStreet(streetId) { setSelectedStreets(prev => { const next = new Set(prev); if (next.has(streetId)) next.delete(streetId); else next.add(streetId); return next; }); }
  function toggleDot(postcode) { setSelected(prev => { const next = new Set(prev); if (next.has(postcode)) next.delete(postcode); else next.add(postcode); return next; }); }

  // Street colour update — with the debugged 500ms delayed re-run (skip-mode fix)
  useEffect(() => {
    if (!selTown) return;
    const run = () => {
      const savedStreetNames = new Set(zones.filter(z => z.townId === selTown.id).flatMap(z => (z.streets || []).map(s => s.name)));
      const skippedStreetNames = new Set(skippedAreas.filter(s => s.townId === selTown.id).flatMap(s => (s.streets || []).map(st => st.name)));
      Object.entries(streetLayersRef.current).forEach(([id, layers]) => {
        const isSelected = selectedStreets.has(id);
        const isSaved = savedStreetNames.has(id);
        const isSkipped = skippedStreetNames.has(id);
        const color = isSelected && modeRef.current === "skip" ? "#FF006E" : isSelected ? "#FF8C00" : isSkipped ? "#FF006E" : isSaved ? "#00C853" : "#00B0CA";
        const weight = isSelected ? 7 : isSkipped ? 6 : isSaved ? 5 : 3;
        const opacity = isSelected ? 1 : isSkipped ? 1 : isSaved ? 0.9 : 0.65;
        layers.forEach(l => l.setStyle({ color, weight, opacity }));
      });
    };
    run();
    const t = setTimeout(run, 500);
    return () => clearTimeout(t);
  }, [selectedStreets, mode, zones, skippedAreas, selTown]);

  // Dot colour update — with the debugged 500ms delayed re-run (skip-mode fix)
  useEffect(() => {
    if (!selTown) return;
    const runDots = () => {
      const townSkipped = new Set(skippedAreas.filter(s => s.townId === selTown.id).flatMap(s => (s.postcodes||[]).map(p => p.postcode)));
      const zonedPcs = new Set(zones.filter(z => z.townId === selTown.id).flatMap(z => (z.postcodes||[]).map(p => p.postcode)));
      Object.entries(markersRef.current).forEach(([pc, marker]) => {
        if (!marker) return;
        const isSelected = selected.has(pc); const isSkipped = townSkipped.has(pc); const isZoned = zonedPcs.has(pc);
        let fillColor = "#00B0CA", radius = 7, weight = 1;
        if (isSelected && modeRef.current === "skip") { fillColor = "#FF006E"; radius = 12; weight = 3; }
        else if (isSelected) { fillColor = "#FF8C00"; radius = 11; weight = 3; }
        else if (isSkipped) { fillColor = "#FF006E"; radius = 10; weight = 2; }
        else if (isZoned) { fillColor = "#00C853"; }
        marker.setStyle({ fillColor, radius, weight });
      });
    };
    runDots();
    const t = setTimeout(runDots, 500);
    return () => clearTimeout(t);
  }, [selected, mode, skippedAreas, zones, selTown]);

  useEffect(() => {
    if (view !== "map" || !mapRef.current) return;
    const timer = setTimeout(() => {
      if (!window.L) return;
      const L = window.L;
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
      markersRef.current = {}; streetLayersRef.current = {};
      const map = L.map(mapRef.current, { zoomControl: true });
      mapInstanceRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(map);
      const bounds = [];
      const savedStreetNameSet = new Set(zones.filter(z => z.townId === (selTown?.id || "")).flatMap(z => (z.streets||[]).map(s => s.name)));
      const skippedStreetNameSet = new Set(skippedAreas.filter(s => s.townId === (selTown?.id || "")).flatMap(s => (s.streets||[]).map(st => st.name)));
      streets.forEach(street => {
        const layers = [];
        const isSaved = savedStreetNameSet.has(street.name);
        const isSkipped = skippedStreetNameSet.has(street.name);
        const initColor = isSkipped ? "#FF006E" : isSaved ? "#00C853" : "#00B0CA";
        const initWeight = isSkipped ? 6 : isSaved ? 5 : 3;
        const initOpacity = isSkipped ? 1 : isSaved ? 0.9 : 0.65;
        street.segments.forEach(seg => {
          if (seg.length < 2) return;
          const line = L.polyline(seg, { color: initColor, weight: initWeight, opacity: initOpacity }).addTo(map);
          line.bindTooltip(`${street.name}${isSaved ? " ✓ Zoned" : isSkipped ? " ❌ Skipped" : ""}`, { sticky: true, direction: "top", className: "" });
          line.on("click", () => { toggleStreet(street.id); });
          layers.push(line); seg.forEach(pt => bounds.push(pt));
        });
        streetLayersRef.current[street.id] = layers;
      });
      const zonedPcSet = new Set(zones.flatMap(z => (z.postcodes||[]).map(p => p.postcode)));
      const skippedPcSet = new Set(skippedAreas.flatMap(s => (s.postcodes||[]).map(p => p.postcode)));
      allDots.forEach(dot => {
        const isSkipped = skippedPcSet.has(dot.postcode); const isZoned = zonedPcSet.has(dot.postcode);
        const dotColor = isSkipped ? "#FF006E" : isZoned ? "#00C853" : (dot.townColor || "#00B0CA");
        const marker = L.circleMarker([dot.lat, dot.lng], { radius: 5, fillColor: dotColor, color: "#03045E", weight: 1, opacity: 0.7, fillOpacity: 0.5 }).addTo(map);
        marker.bindTooltip(dot.postcode, { permanent: false, direction: "top" });
        marker.on("click", () => toggleDot(dot.postcode));
        markersRef.current[dot.postcode] = marker;
        if (streets.length === 0) bounds.push([dot.lat, dot.lng]);
      });
      if (bounds.length > 0) map.fitBounds(bounds, { padding: [30, 30] });
      // Shift+drag select circle
      let dragging = false, startLatLng = null, dragCircle = null;
      map.on("mousedown", e => { if (e.originalEvent.shiftKey) { dragging = true; startLatLng = e.latlng; map.dragging.disable(); e.originalEvent.preventDefault(); } });
      map.on("mousemove", e => { if (!dragging || !startLatLng) return; const radiusM = startLatLng.distanceTo(e.latlng); if (dragCircle) map.removeLayer(dragCircle); dragCircle = L.circle(startLatLng, { radius: radiusM, color: "#FF6B35", weight: 2, fillOpacity: 0.1, dashArray: "6,4" }).addTo(map); });
      map.on("mouseup", e => {
        if (!dragging || !startLatLng) return; dragging = false; map.dragging.enable();
        if (dragCircle) {
          const centre = startLatLng; const radiusM = dragCircle.getRadius(); map.removeLayer(dragCircle); dragCircle = null;
          streets.forEach(street => {
            if (savedStreetNameSet.has(street.name)) return;
            if (skippedStreetNameSet.has(street.name)) return;
            const inCircle = street.segments.some(seg => seg.some(pt => centre.distanceTo(L.latLng(pt[0], pt[1])) <= radiusM));
            if (inCircle) setSelectedStreets(prev => { const next = new Set(prev); next.add(street.id); return next; });
          });
          allDots.forEach(dot => { if (centre.distanceTo(L.latLng(dot.lat, dot.lng)) <= radiusM) setSelected(prev => { const next = new Set(prev); next.add(dot.postcode); return next; }); });
        }
        startLatLng = null;
      });
    }, 300);
    return () => { clearTimeout(timer); if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } markersRef.current = {}; streetLayersRef.current = {}; };
  }, [view, allDots, streets]);

  async function saveZone() {
    const hasStreets = selectedStreets.size > 0; const hasDots = selected.size > 0;
    if ((!hasStreets && !hasDots) || !zoneName.trim()) return;
    setSaving(true);
    const isConstituency = selTown.id === "constituency";
    const selectedStreetData = streets.filter(s => selectedStreets.has(s.id));
    const selectedDots = allDots.filter(d => selected.has(d.postcode));
    const allLats = [...selectedDots.map(d => d.lat), ...selectedStreetData.flatMap(s => s.segments.flatMap(seg => seg.map(pt => pt[0])))];
    const allLngs = [...selectedDots.map(d => d.lng), ...selectedStreetData.flatMap(s => s.segments.flatMap(seg => seg.map(pt => pt[1])))];
    const centreLat = allLats.length > 0 ? allLats.reduce((a,b) => a+b,0) / allLats.length : selTown.lat;
    const centreLng = allLngs.length > 0 ? allLngs.reduce((a,b) => a+b,0) / allLngs.length : selTown.lng;
    const townId = isConstituency ? (selectedDots[0]?.townId || selectedStreetData[0]?.townId || "constituency") : selTown.id;
    const townName = isConstituency ? (selectedDots[0]?.townName || selTown.name) : selTown.name;
    const townColor = isConstituency ? (selectedDots[0]?.townColor || selTown.color) : selTown.color;
    const streetsList = selectedStreetData.map(s => ({ name: s.name, done: false }));
    await addZone({ name: zoneName.trim(), town: townName, townId, ward: selTown.ward || "", color: townColor, postcodes: selectedDots, streets: streetsList, count: selectedStreetData.length > 0 ? selectedStreetData.length : selectedDots.length, lat: centreLat, lng: centreLng, createdBy: user?.name || "Manager", status: "Unassigned" });
    setSavedMsg(`✓ Zone "${zoneName.trim()}" saved — ${selectedStreetData.length} streets · ${selectedDots.length} postcode pts`);
    setZoneName(""); setSelectedStreets(new Set()); setSelected(new Set()); setSaving(false);
    setTimeout(() => setSavedMsg(""), 4000);
  }

  async function saveSkipped() {
    if (selected.size === 0 && selectedStreets.size === 0) return;
    setSaving(true);
    const selectedDots = allDots.filter(d => selected.has(d.postcode));
    const selectedStreetData = streets.filter(s => selectedStreets.has(s.id));
    const isConstituency = selTown.id === "constituency";
    const townId = isConstituency ? (selectedDots[0]?.townId || "constituency") : selTown.id;
    const townName = isConstituency ? (selectedDots[0]?.townName || "Constituency") : selTown.name;
    await addSkipped({ town: townName, townId, ward: selTown.ward || "", postcodes: selectedDots, streets: selectedStreetData.map(s => ({ name: s.name })), count: selectedDots.length + selectedStreetData.length, reason: "Not delivering", createdBy: user?.name || "Manager" });
    setSavedMsg(`❌ ${selected.size + selectedStreets.size} items marked as Skip`);
    setSelected(new Set()); setSelectedStreets(new Set()); setSaving(false);
    setTimeout(() => setSavedMsg(""), 4000);
  }

  if (view === "zones") {
    const townZones = selTown ? zones.filter(z => z.townId === selTown.id) : zones;
    const townSkipped = selTown ? skippedAreas.filter(s => s.townId === selTown.id) : skippedAreas;
    return (
      <div style={{padding:"16px",paddingBottom:32}}>
        <button onClick={()=>setView("map")} style={{background:"none",border:"none",color:"#12B6CF",fontSize:"0.75rem",cursor:"pointer",marginBottom:12,padding:0}}>← Back to Map</button>
        <div style={{fontSize:"0.9rem",fontWeight:700,color:"#fff",marginBottom:4}}>{selTown?.name} — Zones & Skips</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
          <div style={{background:"#0d1b2a",border:"1px solid #1a3a50",borderRadius:8,padding:"10px 8px",textAlign:"center"}}><div style={{fontSize:"1.2rem",fontWeight:700,color:"#4CAF50",fontFamily:"monospace"}}>{townZones.length}</div><div style={{fontSize:"0.52rem",color:"#64b5d8",textTransform:"uppercase"}}>Zones</div></div>
          <div style={{background:"#0d1b2a",border:"1px solid #1a3a50",borderRadius:8,padding:"10px 8px",textAlign:"center"}}><div style={{fontSize:"1.2rem",fontWeight:700,color:"#E53935",fontFamily:"monospace"}}>{townSkipped.length}</div><div style={{fontSize:"0.52rem",color:"#64b5d8",textTransform:"uppercase"}}>Skipped</div></div>
        </div>
        {savedMsg && <div style={{background:"#0a2a15",border:"1px solid #4CAF50",borderRadius:6,padding:"8px 12px",marginBottom:12,fontSize:"0.7rem",color:"#4CAF50"}}>{savedMsg}</div>}
        {townZones.length === 0 && townSkipped.length === 0 && <EmptyState icon="✏️" title="No zones yet" sub="Go back to the map and select streets or dots to create your first zone."/>}
        {townZones.length > 0 && <div style={{fontSize:"0.57rem",color:"#4CAF50",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>Delivery Zones</div>}
        {townZones.map(z => (
          <div key={z.id} style={{background:"#0d1b2a",border:"1px solid #1a3a50",borderLeft:`4px solid ${z.color||"#12B6CF"}`,borderRadius:8,padding:"12px 14px",marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:"0.85rem",fontWeight:700,color:"#fff"}}>{z.name}</div>
                <div style={{fontSize:"0.6rem",color:"#64b5d8",marginTop:2}}>{(z.streets||[]).length > 0 ? `${z.streets.length} streets` : `${z.count} pts`} · {z.town}</div>
                {(z.streets||[]).length > 0 && (<div style={{fontSize:"0.58rem",color:"#4a7a8a",marginTop:2}}>{z.streets.slice(0,3).map(s=>s.name).join(", ")}{z.streets.length>3?` +${z.streets.length-3} more`:""}</div>)}
                <div style={{fontSize:"0.58rem",color:"#4a7a8a",marginTop:1}}>Created by {z.createdBy}</div>
              </div>
              <button onClick={()=>removeZone(z.id)} style={{background:"none",border:"none",color:"#4a7a8a",fontSize:"0.7rem",cursor:"pointer",padding:0}}>🗑</button>
            </div>
          </div>
        ))}
        {townSkipped.length > 0 && <div style={{fontSize:"0.57rem",color:"#E53935",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8,marginTop:townZones.length>0?12:0}}>Skipped Areas</div>}
        {townSkipped.map(s => (
          <div key={s.id} style={{background:"#1a0a0a",border:"1px solid #E5393533",borderLeft:"4px solid #E53935",borderRadius:8,padding:"12px 14px",marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div><div style={{fontSize:"0.85rem",fontWeight:700,color:"#E53935"}}>❌ Not delivering</div><div style={{fontSize:"0.6rem",color:"#64b5d8",marginTop:2}}>{s.count} items · {s.town}</div><div style={{fontSize:"0.58rem",color:"#4a7a8a",marginTop:1}}>Marked by {s.createdBy}</div></div>
              <button onClick={()=>removeSkipped(s.id)} style={{background:"none",border:"none",color:"#4a7a8a",fontSize:"0.7rem",cursor:"pointer",padding:0}}>🗑</button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (view === "map" && selTown) {
    const townZones = zones.filter(z => z.townId === selTown.id);
    const totalSelected = selectedStreets.size + selected.size;
    return (
      <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 106px)"}}>
        <div style={{background:"#03045E",padding:"10px 16px",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
            <button onClick={()=>{setView("towns");if(mapInstanceRef.current){mapInstanceRef.current.remove();mapInstanceRef.current=null;}}} style={{background:"none",border:"none",color:"#12B6CF",fontSize:"0.75rem",cursor:"pointer",padding:0}}>← Areas</button>
            <button onClick={()=>setView("zones")} style={{background:"#1a3a50",border:"1px solid #12B6CF",borderRadius:6,color:"#12B6CF",fontSize:"0.62rem",padding:"4px 10px",cursor:"pointer"}}>{townZones.length} zones</button>
          </div>
          <div style={{fontSize:"0.82rem",fontWeight:700,color:"#fff"}}>{selTown.name} — {mode === "skip" ? "❌ Skip mode" : "🗺 Zone mode"}</div>
          <div style={{fontSize:"0.58rem",color:"#90E0EF",marginTop:2}}>{loading ? "Loading…" : `${streets.length} streets · ${allDots.length} postcode pts · ${totalSelected} selected`}</div>
          <div style={{fontSize:"0.55rem",color:"#4a7a8a",marginTop:2}}>Tap streets or dots to select · Hold Shift + drag to select area</div>
        </div>
        {loading ? <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:"#060d18"}}><div style={{color:"#12B6CF",fontSize:"0.8rem"}}>Loading map data…</div></div> : <div ref={mapRef} style={{flex:1,width:"100%"}}/>}
        <div style={{background:"#0d1b2a",padding:"10px 16px",flexShrink:0,borderTop:"1px solid #1a3a50"}}>
          {savedMsg && <div style={{background:savedMsg.startsWith("❌")?"#2a0a0a":"#0a2a15",border:`1px solid ${savedMsg.startsWith("❌")?"#E53935":"#4CAF50"}`,borderRadius:6,padding:"6px 10px",marginBottom:8,fontSize:"0.65rem",color:savedMsg.startsWith("❌")?"#E53935":"#4CAF50"}}>{savedMsg}</div>}
          <div style={{display:"flex",gap:6,marginBottom:8}}>
            <button onClick={()=>setMode("zone")} style={{flex:1,background:mode==="zone"?"#12B6CF":"#1a3a50",border:"none",borderRadius:6,color:mode==="zone"?"#03045E":"#64b5d8",fontSize:"0.65rem",fontWeight:700,padding:"7px",cursor:"pointer"}}>🗺 Zone mode</button>
            <button onClick={()=>setMode("skip")} style={{flex:1,background:mode==="skip"?"#FF006E":"#1a3a50",border:"none",borderRadius:6,color:mode==="skip"?"#fff":"#64b5d8",fontSize:"0.65rem",fontWeight:700,padding:"7px",cursor:"pointer"}}>❌ Skip mode</button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:20,height:3,background:"#00B0CA",borderRadius:2}}/><span style={{fontSize:"0.58rem",color:"#90E0EF"}}>Street</span></div>
            <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:20,height:3,background:"#FF8C00",borderRadius:2}}/><span style={{fontSize:"0.58rem",color:"#90E0EF"}}>Selected</span></div>
            <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:20,height:3,background:"#00C853",borderRadius:2}}/><span style={{fontSize:"0.58rem",color:"#90E0EF"}}>Zoned</span></div>
            <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:20,height:3,background:"#FF006E",borderRadius:2}}/><span style={{fontSize:"0.58rem",color:"#90E0EF"}}>Skipped</span></div>
          </div>
          {totalSelected > 0 && mode === "zone" && (
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input value={zoneName} onChange={e=>setZoneName(e.target.value)} placeholder={`Name e.g. "${selTown.name} round 1"`} style={{flex:1,background:"#162838",border:"1px solid #2a4a60",borderRadius:6,color:"#fff",fontSize:"0.72rem",padding:"8px 10px",outline:"none",fontFamily:"inherit"}}/>
              <button onClick={saveZone} disabled={!zoneName.trim()||saving} style={{background:zoneName.trim()&&!saving?"#4CAF50":"#1a3a50",border:"none",borderRadius:6,color:zoneName.trim()&&!saving?"#fff":"#4a7a8a",fontSize:"0.72rem",fontWeight:700,padding:"8px 12px",cursor:zoneName.trim()&&!saving?"pointer":"default",whiteSpace:"nowrap"}}>{saving?"Saving…":"Save Zone ✓"}</button>
            </div>
          )}
          {totalSelected > 0 && mode === "skip" && (
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <div style={{flex:1,fontSize:"0.68rem",color:"#E53935"}}>{totalSelected} items selected to skip</div>
              <button onClick={saveSkipped} disabled={saving} style={{background:saving?"#1a3a50":"#E53935",border:"none",borderRadius:6,color:"#fff",fontSize:"0.72rem",fontWeight:700,padding:"8px 12px",cursor:saving?"default":"pointer",whiteSpace:"nowrap"}}>{saving?"Saving…":"Mark as Skip ❌"}</button>
            </div>
          )}
          {totalSelected === 0 && (<div style={{fontSize:"0.62rem",color:"#4a7a8a",textAlign:"center"}}>{mode === "zone" ? "Tap streets (lines) or postcode dots to select · Shift+drag to select area" : "Tap streets or dots to mark as skip"}</div>)}
        </div>
      </div>
    );
  }

  return (
    <div style={{padding:"16px",paddingBottom:32}}>
      <div style={{background:"#0a1228",border:"1px solid #12B6CF",borderRadius:8,padding:"12px 14px",marginBottom:14}}>
        <div style={{fontSize:"0.6rem",color:"#12B6CF",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>✏️ Zone Builder</div>
        <div style={{fontSize:"0.7rem",color:"#c0d8e4",lineHeight:1.6}}>Select an area. Streets are drawn as lines — tap to select, or hold Shift and drag to select an area. Name your zone and save to Firebase.</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
        {[{l:"Zones Created",v:zones.length,c:"#12B6CF"},{l:"Areas",v:TOWNS.length,c:"#FFB347"},{l:"Skipped",v:skippedAreas.length,c:"#E53935"}].map(s=>(<div key={s.l} style={{background:"#0d1b2a",border:"1px solid #1a3a50",borderRadius:8,padding:"10px 8px",textAlign:"center"}}><div style={{fontSize:"1.2rem",fontWeight:700,color:s.c,fontFamily:"monospace"}}>{s.v}</div><div style={{fontSize:"0.52rem",color:"#64b5d8",textTransform:"uppercase"}}>{s.l}</div></div>))}
      </div>
      <div style={{fontSize:"0.57rem",color:"#64b5d8",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>Select an Area to Zone</div>
      <button onClick={()=>openTownMap({id:"constituency",name:"Whole Constituency",ward:"All areas",color:"#9C27B0",lat:57.125,lng:-2.10,estProperties:25000,notes:"All areas across Aberdeen South"})} style={{width:"100%",background:"#0d1228",border:"2px solid #9C27B0",borderRadius:8,padding:"13px 14px",marginBottom:14,cursor:"pointer",textAlign:"left",display:"block"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div><div style={{fontSize:"0.9rem",fontWeight:700,color:"#CE93D8"}}>🗺 Whole Constituency</div><div style={{fontSize:"0.58rem",color:"#9C27B0",marginTop:2}}>All {TOWNS.length} areas · postcode dots only</div></div>
          <div style={{fontSize:"0.6rem",color:"#9C27B0",fontWeight:700}}>{zones.length} zones total</div>
        </div>
        <div style={{marginTop:6,fontSize:"0.58rem",color:"#4a7a8a"}}>Overview of the whole seat — gaps and skipped areas</div>
      </button>
      {TOWNS.map(town => {
        const townZones = zones.filter(z => z.townId === town.id);
        const totalStreets = townZones.reduce((a,z) => a+(z.streets||[]).length, 0);
        return (
          <button key={town.id} onClick={()=>openTownMap(town)} style={{width:"100%",background:"#0d1b2a",border:"1px solid #1a3a50",borderLeft:`4px solid ${town.color}`,borderRadius:8,padding:"13px 14px",marginBottom:10,cursor:"pointer",textAlign:"left",display:"block"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div><div style={{fontSize:"0.9rem",fontWeight:700,color:"#fff"}}>{town.name}</div><div style={{fontSize:"0.58rem",color:"#64b5d8",marginTop:2}}>~{town.estProperties.toLocaleString()} properties</div></div>
              <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>{townZones.length > 0 ? <div style={{fontSize:"0.62rem",color:"#4CAF50",fontWeight:700}}>✓ {townZones.length} zones · {totalStreets} streets</div> : <div style={{fontSize:"0.6rem",color:"#4a7a8a"}}>Not zoned yet</div>}</div>
            </div>
            <div style={{marginTop:6,fontSize:"0.58rem",color:"#4a7a8a"}}>{town.notes}</div>
            <div style={{marginTop:6,fontSize:"0.55rem",color:"#4a7a8a",textAlign:"right"}}>Tap to open map →</div>
          </button>
        );
      })}
    </div>
  );
}

// ─── ROOT ────────────────────────────────────────────────────
export default function App(){
  const [tab,setTab]=useState("overview");
  const [user,setUser]=useState(()=>loadUser());
  const [managerUnlocked,setManagerUnlocked]=useState(false);
  return(
    <div style={{background:"#060d18",minHeight:"100vh",color:"#e8f4f8",fontFamily:"'Segoe UI',system-ui,sans-serif"}} className="app-root">
      <Header tab={tab} setTab={setTab} user={user} managerUnlocked={managerUnlocked} setManagerUnlocked={setManagerUnlocked}/>
      {tab==="overview"    && <OverviewTab user={user} setUser={setUser}/>}
      {tab==="areas"       && <AreasTab user={user}/>}
      {tab==="election"    && <ElectionTab/>}
      {tab==="board"       && <BoardTab user={user}/>}
      {tab==="leaflets"    && <LeafletsTab user={user}/>}
      {tab==="coverage"    && <CoverageTab/>}
      {tab==="routes"      && <RoutesTab user={user}/>}
      {tab==="zonebuilder" && <ZoneBuilderTab user={user}/>}
      {tab==="volunteers"  && <VolunteersTab/>}
    </div>
  );
}
