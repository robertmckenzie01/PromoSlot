(function(){
if(window.PSBoot) return;
/* PromoSlot app logic — visual/interaction upgrade layer. Flows, fields and IA are final (per brief). */
/* ==================== SEEDED DATA ==================== */
const PLATFORM_META = {
  TikTok:{color:"#0f172a",ico:"🎵"}, Instagram:{color:"#c026d3",ico:"📸"},
  Discord:{color:"#5865f2",ico:"💬"}, Newsletter:{color:"#d97706",ico:"✉️"},
  YouTube:{color:"#dc2626",ico:"▶️"}, Twitch:{color:"#7c3aed",ico:"🎮"}
};
const ALL_PLATFORMS = Object.keys(PLATFORM_META);
const ALL_NICHES = ["Fitness","Beauty","Gaming","Finance","Food","Tech","Parenting","Fashion","Education","Travel"];
const ALL_SERVICES = ["Sponsored social post","Short-form promo video","Instagram Story","TikTok Live promotion","YouTube integration","Community announcement","Pinned community post","Newsletter advertisement","Sponsored blog post","Product review","UGC content","Affiliate promotion","Giveaway","Product feedback","Brand AMA","Link-in-bio placement","Custom service"];
const ALL_COUNTRIES = ["UK","US","Canada","Australia","Germany","France","Spain","Netherlands","Ireland","India","Brazil"];
const ALL_AGES = ["13-17","18-24","25-34","35-44","45-54","55+"];
const ALL_PAY_MODELS = ["Fixed price","Per view","Per impression","Time-based","Affiliate","Hybrid","Custom quote"];
const CREATOR_SIZES = ["Nano (1K–10K)","Micro (10K–50K)","Mid (50K–250K)","Macro (250K–1M)","Mega (1M+)"];
const PM_LABEL = {fixed:"Fixed price","per-view":"Per view","per-imp":"Per impression",time:"Time-based",affiliate:"Affiliate",hybrid:"Hybrid",custom:"Custom quote"};

/* ==================== INFRASTRUCTURE CAPABILITY FLAGS ====================
   Real, trust-/money-critical infrastructure is NOT built yet. Nothing in the
   UI may simulate any of these succeeding. Each flow below checks the relevant
   flag and, while false, shows an honest "not available yet / pending" state
   instead of pretending the action completed. Flip a flag to true only when the
   corresponding real backend integration exists AND is wired to this UI.

   - payments:    Stripe charge (escrow funding) is confirmed by Stripe.
   - payouts:     Stripe Connect transfer to the platform owner succeeds.
   - fileStorage: submitted proof is really uploaded & stored server-side.
   - humanReview: a real human reviewer verifies delivery / verifies accounts.
   - liveAccounts: real second-party accounts exist to approve, reply, apply. */
const INFRA = {
  payments:false,
  payouts:false,
  fileStorage:false,
  humanReview:false,
  liveAccounts:false
};
function pendingPanel(icon,title,body){
  return `<div class="note" style="display:flex;gap:12px;align-items:flex-start;margin-top:14px">
    <span style="font-size:20px;line-height:1">${icon}</span>
    <div><b style="display:block;color:var(--amber);font-size:13.5px">${title}</b>
    <span style="color:var(--amber)">${body}</span></div></div>`;
}
function lockedStep(icon,label,desc){
  return `<div class="proof-item" style="opacity:.9">
    <span class="pi-ico">${icon}</span>
    <div style="flex:1;min-width:0"><b style="font-size:13.5px;display:block">${label}</b><small class="mut" style="font-size:12px">${desc}</small></div>
    <span class="status-pill st-review" style="margin-left:auto">🔒 Not available yet</span></div>`;
}

const LISTINGS = [
 {id:"px-ex",example:true,ownerId:"example-owner",owner:"Example Creator",brand:"Example Media",name:"Example Creator",handle:"@example_creator",platform:"TikTok",niches:["Fitness","Food"],
  bio:"This is an example listing showing how a complete, well-built platform-owner profile looks on PromoSlot. Replace this with your own audience, services and pricing when you list.",
  audience:120000,avgViews:54000,impressions:230000,er:6.8,countries:["UK","US"],ages:["18-24","25-34"],interests:["Gym & training","Quick recipes","Nutrition"],
  rating:5.0,reviewCount:"Example",verified:false,
  services:["Short-form promo video","Sponsored social post","Instagram Story","Affiliate promotion","Giveaway"],
  pricing:[
   {type:"fixed",label:"1 promotional video",detail:"1 × 30–60s video, 1 revision, live ≥ 30 days",amount:150},
   {type:"per-view",label:"Performance video deal",detail:"£40 min guaranteed + £8 per 1,000 verified views · measured 14 days after posting · capped at £300",amount:40},
   {type:"hybrid",label:"Hybrid: guaranteed + commission",detail:"£50 guaranteed + 10% commission on tracked sales · 30-day cookie",amount:50},
   {type:"affiliate",label:"Affiliate promotion",detail:"15% of each verified sale · 30-day cookie · £20 min payout",amount:0}
  ],
  past:[]}
];

const CAMPAIGNS = [
 {id:"cx-ex",example:true,company:"Example Brand",industry:"Beauty & skincare",title:"Example Campaign — Product Launch",verified:false,rating:5.0,reviewCount:"Example",posted:"example",applicants:0,budget:2500,
  desc:"This is an example campaign showing how a complete, well-built business listing looks on PromoSlot. Replace this with your own brief, budget and payment structure when you post a campaign.",
  platforms:["TikTok","Instagram","Newsletter"],niches:["Beauty"],countries:["UK","Ireland"],
  services:["Short-form promo video","Product review","Instagram Story","Affiliate promotion"],
  creatorSizes:["Nano (1K–10K)","Micro (10K–50K)","Mid (50K–250K)"],goals:["Product launch","UGC library","Affiliate sales"],
  payment:[{type:"fixed",detail:"£100 fixed per approved video"},{type:"per-view",detail:"£5 per 1,000 views (14-day measurement)"},{type:"affiliate",detail:"12% commission per referred sale · 30-day cookie"},{type:"product",detail:"Free product supplied to accepted creators"}],
  deliverables:"1 product demonstration or unboxing video + 1 Instagram Story. Content live ≥ 30 days.",duration:"6 weeks",samples:true,
  profile:{product:"Example product range",target:"Your target market description goes here",payMethods:["Fixed","Per view","Commission","Free product"],collabs:"New to PromoSlot"}}
];

const REVIEW_POOL = [
 {name:"Hannah W.",co:"Bloom Cosmetics",stars:5,text:"Delivered exactly what the agreement said — post went live on time, stayed up, analytics screenshots without us chasing. Escrow made it painless."},
 {name:"Marcus T.",co:"VoltEnergy",stars:5,text:"Views beat the guaranteed minimum by 3× and the measurement-period payout was calculated to the penny. Would fund again tomorrow."},
 {name:"Sofia R.",co:"Petal & Pot",stars:4,text:"Great content and communication. One revision needed on the caption, turned around same day."},
 {name:"Dev K.",co:"Loopwise App",stars:5,text:"The counter-offer flow saved this deal — we couldn't afford the fixed rate, they proposed a hybrid and it outperformed."},
 {name:"Amelia C.",co:"Fern & Co.",stars:5,text:"Audience is exactly as described in the listing. Engagement was real — we tracked 214 code uses in week one."},
 {name:"Jordan P.",co:"Trailhead Gear",stars:4,text:"Solid delivery, proof submitted early. Only wish we'd booked a longer placement."},
 {name:"Nina S.",co:"Kindred Kids",stars:5,text:"Third deal with this creator through PromoSlot. Zero drama, verified delivery every time."},
 {name:"Tom B.",co:"BrewBox",stars:5,text:"Livestream segment felt native, not forced. VOD views kept climbing through the measurement window."},
 {name:"Priya M.",co:"Asha Skincare",stars:4,text:"Professional throughout. Dispute never needed — the agreed deliverables doc kept everyone honest."},
 {name:"Callum D.",co:"ForgeFit",stars:5,text:"Applied to our campaign with a thoughtful pitch, accepted our terms, delivered in 6 days. This is how it should work."},
 {name:"Elise V.",co:"Nordic Sleep",stars:5,text:"Newsletter placement drove our best CPA of the quarter. Open-rate proof matched the listing's claims exactly."},
 {name:"Ryan O.",co:"PixelForge Games",stars:4,text:"Community announcement got real engagement, not bot noise. Renewal booked."}
];
function reviewsFor(id){
  const seed = id.split("").reduce((a,c)=>a+c.charCodeAt(0),0);
  const n = 3 + (seed % 3);
  const out=[]; for(let i=0;i<n;i++){ out.push(REVIEW_POOL[(seed+i*3)%REVIEW_POOL.length]); } return out;
}

/* ==================== STATE & HELPERS ==================== */
const S = {
  roles:[], activeRole:null, biz:null, myPlatforms:[], myCampaigns:[], deals:[],
  notifications:[], marketTab:"platforms", filters:null, chatLogs:{}, dealSeq:1
};
function resetFilters(){
  S.filters = {q:"",platforms:new Set(),niches:new Set(),services:new Set(),countries:new Set(),pay:new Set(),min:"",max:""};
}
resetFilters();
const $ = id => document.getElementById(id);
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmtN = n => n>=1e6 ? (n/1e6).toFixed(1).replace(/\.0$/,"")+"M" : n>=1e3 ? (n/1e3).toFixed(n<1e4?1:0).replace(/\.0$/,"")+"K" : String(n);
const gbp = n => "£"+Number(n).toLocaleString("en-GB",{maximumFractionDigits:2}).replace(/\.00$/,"");

function toast(msg,grn){
  const t=document.createElement("div"); t.className="toast"+(grn?" grn":"");
  t.innerHTML=`<span class="toast-ico">${grn?"✓":"ℹ"}</span><span>${esc(msg)}</span>`;
  $("toasts").appendChild(t);
  setTimeout(()=>{t.classList.add("out");setTimeout(()=>t.remove(),380)},3400);
}
function starsHtml(r,c){ if(r==null||c==null||c===0||c==="New"){ return `<span class="stars no-rating">No ratings yet</span>`; } return `<span class="stars">★ ${Number(r).toFixed(1)} <span class="rc">(${c})</span></span>`; }
function initials(name){ return String(name||"?").split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase(); }
function pfp(name,platform,cls){
  const col = platform ? PLATFORM_META[platform].color : "var(--acc)";
  return `<div class="pfp ${cls||""}" style="background:${col}">${esc(initials(name))}</div>`;
}
function pbadge(p){ const m=PLATFORM_META[p]; return `<span class="pbadge" style="background:${m.color}14;color:${m.color}">${m.ico} ${p}</span>`; }
function exWrap(inner,is){ return is?`<div class="pfp-wrap">${inner}<span class="ex-badge">EXAMPLE</span></div>`:inner; }
function priceFrom(l){ const ps=l.pricing.filter(p=>p.amount>0); return ps.length?Math.min(...ps.map(p=>p.amount)):0; }
function priceFromHtml(l){
  const f=priceFrom(l);
  return f ? `from <b>${gbp(f)}</b>` : `<b class="quote-only">Owner-set pricing</b>`;
}
function setTheme(){ 
  if(S.activeRole) document.body.dataset.role=S.activeRole; else delete document.body.dataset.role;
}

/* ---------- View routing ---------- */
function showView(id){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  const el=$(id); el.classList.add("active");
  el.classList.remove("view-anim"); void el.offsetWidth; el.classList.add("view-anim");
  window.scrollTo({top:0});
  document.querySelectorAll(".nav-link").forEach(b=>b.classList.remove("active"));
  if(id==="view-market") $("nl-market").classList.add("active");
  if(id==="view-messages") $("nl-msgs").classList.add("active");
  if(id==="view-bizdash"||id==="view-platdash") $("nl-dash").classList.add("active");
}
function smoothTo(el){
  if(!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 84;
  window.scrollTo({top, behavior:"smooth"});
}
function goHome(scrollRoles){
  showView("view-landing");
  if(scrollRoles && S.roles.length){ openDash(); return; }
  if(scrollRoles) setTimeout(()=>smoothTo($("roleCards")),80);
}
function goHow(){ showView("view-landing"); setTimeout(()=>smoothTo($("sec-how")),80); }
async function openDash(){
  if(!S.account){ authModal("login"); return; }
  if(!S.roles.includes(S.activeRole)) S.activeRole=S.roles[0];
  await loadMine();
  if(S.activeRole==="biz" && !S.biz){
    S.biz={company:S.account.display_name||S.account.email,product:"—",industry:"—",target:"",
      intents:[],countries:[],platforms:[],services:[],sizes:[],budget:0,payMethods:[],duration:"—"};
  }
  if(S.activeRole==="biz") renderBizDash(); else renderPlatDash();
  showView(S.activeRole==="biz"?"view-bizdash":"view-platdash");
}
function switchRole(r){
  if(!S.roles.includes(r)){
    openModal(`<div class="m-pad"><h3 class="m-title">Set up your ${r==="biz"?"business":"platform-owner"} profile?</h3>
      <p class="m-sub">You haven't created your ${r==="biz"?"business":"platform-owner"} profile yet. One account covers both roles — set it up in about a minute.</p>
      <div class="m-actions"><button class="btn btn-o" onclick="closeModal()">Not now</button>
      <button class="btn btn-p" onclick="closeModal();startWizard('${r}')">Set it up</button></div></div>`,"narrow");
    return;
  }
  S.activeRole=r; setTheme(); syncNav(); openDash();
  toast(`Switched to your ${r==="biz"?"business":"platform-owner"} dashboard`);
}
function syncNav(){
  const has=S.roles.length>0;
  $("nl-dash").classList.toggle("hide",!has);
  $("userChip").classList.toggle("hide",!has);
  $("nav-cta").classList.toggle("hide",has);
  $("roleSwitch").classList.toggle("hide",S.roles.length===0);
  setTheme();
  if(has){
    const nm = S.activeRole==="biz" && S.biz ? S.biz.company : (S.myPlatforms[0]?S.myPlatforms[0].brand:(S.biz?S.biz.company:"You"));
    $("userName").textContent=nm; $("userInit").textContent=initials(nm||"You");
    $("rs-biz").classList.toggle("on",S.activeRole==="biz");
    $("rs-plat").classList.toggle("on",S.activeRole==="plat");
  }
}

/* ---------- Modal ---------- */
let modalLock=false, closeTimer=null;
function openModal(html,size,lock){
  modalLock=!!lock;
  if(closeTimer){ clearTimeout(closeTimer); closeTimer=null; }
  $("overlay").classList.remove("closing");
  const m=$("modalBox"); m.className="modal"+(size?" "+size:"");
  m.innerHTML=(lock?"":`<button class="modal-x" onclick="closeModal()" aria-label="Close">✕</button>`)+html;
  $("overlay").classList.add("open"); document.body.style.overflow="hidden";
}
function closeModal(){
  const ov=$("overlay");
  if(!ov.classList.contains("open")) return;
  ov.classList.add("closing");
  closeTimer=setTimeout(()=>{ closeTimer=null; ov.classList.remove("open","closing"); document.body.style.overflow=""; },170);
}
function overlayClick(e){ if(e.target===$("overlay") && !modalLock) closeModal(); }

/* ==================== MARKETPLACE ==================== */
// Marketplace = real listings/campaigns from the backend + the labelled examples.
function allListings(){ return LISTINGS.concat(S.marketPlatforms||[]); }
function allCampaigns(){ return (S.marketCampaigns||[]).concat(CAMPAIGNS); }
async function loadMarket(){
  try{ S.marketPlatforms = await PSApi.get("/platforms"); }catch(e){ S.marketPlatforms=[]; }
  try{ S.marketCampaigns = await PSApi.get("/campaigns"); }catch(e){ S.marketCampaigns=[]; }
}

async function openMarket(tab){
  if(tab && typeof tab==="string") S.marketTab=tab;
  showView("view-market");
  buildFilters(); renderMarket(true);        // skeletons while we fetch
  await loadMarket();
  buildFilters(); renderMarketNow();          // real data
}
function setMarketTab(tab){
  S.marketTab=tab; resetFilters();
  buildFilters(); renderMarket(true);
}
function marketCtaClick(){
  if(S.marketTab==="platforms"){ S.roles.includes("plat") ? openRegisterPlatform() : startWizard("plat"); }
  else { S.roles.includes("biz") ? openNewCampaign() : startWizard("biz"); }
}
function toggleFilters(){ $("filtersBox").classList.toggle("open"); }
function chipsHtml(group,opts){
  return `<div class="f-chips">`+opts.map(o=>`<button class="chip ${S.filters[group].has(o)?"on":""}" onclick="toggleFilter('${group}',this.dataset.v,this)" data-v="${esc(o)}">${esc(o)}</button>`).join("")+`</div>`;
}
function toggleFilter(group,val,el){
  const s=S.filters[group]; s.has(val)?s.delete(val):s.add(val);
  if(el){ el.classList.toggle("on"); el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); }
  renderMarket();
}
function buildFilters(){
  const isPlat=S.marketTab==="platforms";
  $("tab-platforms").classList.toggle("on",isPlat);
  $("tab-campaigns").classList.toggle("on",!isPlat);
  $("cntPlat").textContent="("+allListings().length+")";
  $("cntCamp").textContent="("+allCampaigns().length+")";
  $("marketCta").textContent = isPlat ? "+ List your platform" : "+ Post a campaign";
  $("marketTitle").textContent = isPlat ? "Platform listings" : "Business campaigns";
  $("marketSub").textContent = isPlat ? "Audiences for sale — every listing shows verified analytics and the owner's own pricing." : "Brands publishing what they'll pay. Apply, accept the terms, or counter-offer.";
  const f=S.filters;
  $("filtersBox").innerHTML = `
    <input class="f-search" placeholder="Search ${isPlat?"platforms, niches, names…":"campaigns, brands, industries…"}" value="${esc(f.q)}" oninput="S.filters.q=this.value;renderMarket()">
    <div class="f-group"><h5>${isPlat?"Platform type":"Wanted platforms"}</h5>${chipsHtml("platforms",ALL_PLATFORMS)}</div>
    <div class="f-group"><h5>${isPlat?"Niche":"Target niche"}</h5>${chipsHtml("niches",ALL_NICHES)}</div>
    <div class="f-group"><h5>${isPlat?"Services offered":"Services wanted"}</h5>${chipsHtml("services",ALL_SERVICES.slice(0,12))}</div>
    <div class="f-group"><h5>${isPlat?"Audience countries":"Target countries"}</h5>${chipsHtml("countries",ALL_COUNTRIES.slice(0,8))}</div>
    <div class="f-group"><h5>Payment model</h5>${chipsHtml("pay",ALL_PAY_MODELS)}</div>
    <div class="f-group"><h5>${isPlat?"Price range (from £)":"Budget range (£)"}</h5>
      <div class="f-range">
        <input type="number" placeholder="Min" value="${esc(f.min)}" oninput="S.filters.min=this.value;renderMarket()">
        <input type="number" placeholder="Max" value="${esc(f.max)}" oninput="S.filters.max=this.value;renderMarket()">
      </div></div>
    <button class="btn btn-o btn-sm f-clear" onclick="resetFilters();buildFilters();renderMarket();toast('Filters cleared')">Clear all filters</button>`;
}
function payTypesOf(l){ return [...new Set(l.pricing.map(p=>PM_LABEL[p.type]))]; }
function campPayTypes(c){
  const map={fixed:"Fixed price","per-view":"Per view","per-imp":"Per impression",time:"Time-based",affiliate:"Affiliate",hybrid:"Hybrid",product:"Free product"};
  return [...new Set(c.payment.map(p=>map[p.type]||p.type))];
}
function matchPlat(l){
  const f=S.filters, q=f.q.trim().toLowerCase();
  if(q && ![l.name,l.brand,l.owner,l.bio,l.platform,...l.niches,...l.services].join(" ").toLowerCase().includes(q)) return false;
  if(f.platforms.size && !f.platforms.has(l.platform)) return false;
  if(f.niches.size && !l.niches.some(n=>f.niches.has(n))) return false;
  if(f.services.size && !l.services.some(sv=>f.services.has(sv))) return false;
  if(f.countries.size && !l.countries.some(c=>f.countries.has(c))) return false;
  if(f.pay.size && !payTypesOf(l).some(p=>f.pay.has(p))) return false;
  const from=priceFrom(l);
  if(f.min!=="" && from<Number(f.min)) return false;
  if(f.max!=="" && from>Number(f.max)) return false;
  return true;
}
function matchCamp(c){
  const f=S.filters, q=f.q.trim().toLowerCase();
  if(q && ![c.title,c.company,c.industry,c.desc,...c.niches,...c.services].join(" ").toLowerCase().includes(q)) return false;
  if(f.platforms.size && !c.platforms.some(p=>f.platforms.has(p))) return false;
  if(f.niches.size && !c.niches.some(n=>f.niches.has(n))) return false;
  if(f.services.size && !c.services.some(sv=>f.services.has(sv))) return false;
  if(f.countries.size && !c.countries.some(cc=>f.countries.has(cc))) return false;
  if(f.pay.size && !campPayTypes(c).some(p=>f.pay.has(p)||(p==="Free product"&&f.pay.has("Custom quote")))) return false;
  if(f.min!=="" && c.budget<Number(f.min)) return false;
  if(f.max!=="" && c.budget>Number(f.max)) return false;
  return true;
}
function listingCard(l,i){
  return `<article class="lcard${l.example?" example-card":""}" style="--d:${(i||0)*40}ms" onclick="openListing('${l.id}')" tabindex="0" onkeydown="if(event.key==='Enter')openListing('${l.id}')">
    <div class="lcard-top">${exWrap(pfp(l.name,l.platform),l.example)}
      <div class="who"><h4>${esc(l.name)} ${l.verified?'<span class="vtick" title="Verified analytics">✔︎</span>':""}</h4><div class="handle">${esc(l.handle)} · by ${esc(l.brand)}</div></div>
      ${pbadge(l.platform)}</div>
    <div class="tagrow">${l.niches.map(n=>`<span class="tag">${esc(n)}</span>`).join("")}${payTypesOf(l).slice(0,3).map(p=>`<span class="tag ind">${esc(p)}</span>`).join("")}</div>
    <div class="statrow">
      <div><b>${fmtN(l.audience)}</b><span>${l.platform==="Newsletter"?"Subs":l.platform==="Discord"?"Members":"Followers"}</span></div>
      <div><b>${fmtN(l.avgViews)}</b><span>${l.platform==="Newsletter"?"Opens":"Avg views"}</span></div>
      <div><b>${l.er}%</b><span>${l.platform==="Newsletter"?"Open rate":"Engage"}</span></div>
    </div>
    <div class="lcard-bio">${esc(l.bio)}</div>
    <div class="lcard-bot">${starsHtml(l.rating,l.reviewCount)}<div class="price-from">${priceFromHtml(l)}</div></div>
  </article>`;
}
function campaignCard(c,i){
  return `<article class="lcard${c.example?" example-card":""}" style="--d:${(i||0)*40}ms" onclick="openCampaign('${c.id}')" tabindex="0" onkeydown="if(event.key==='Enter')openCampaign('${c.id}')">
    <div class="ccard-head">${exWrap(pfp(c.company,null),c.example)}
      <div class="who" style="min-width:0"><h4 style="font-size:15px">${esc(c.title)}</h4>
        <div class="handle">${esc(c.company)} ${c.verified?'<span class="vtick">✔︎ Verified</span>':""} · ${esc(c.industry)}</div></div>
      <div class="ccard-budget"><b>${c.budget?gbp(c.budget):"Commission"}</b><span>${c.budget?"budget":"only"}</span></div>
    </div>
    <div class="tagrow">${c.platforms.map(p=>`<span class="tag">${PLATFORM_META[p].ico} ${p}</span>`).join("")}</div>
    <div class="payrow">${c.payment.slice(0,3).map(p=>`<div><span class="pico">💷</span>${esc(p.detail)}</div>`).join("")}</div>
    <div class="lcard-bot">
      <span class="applied-line">${starsHtml(c.rating,c.reviewCount)} · ${c.applicants} applicants</span>
      <span class="tag grn">Posted ${esc(c.posted)}</span>
    </div>
  </article>`;
}
function skCards(n){
  let out="";
  for(let i=0;i<n;i++){
    out+=`<div class="sk-card" style="--d:${i*60}ms">
      <div class="sk-row"><div class="sk sk-pfp"></div><div style="flex:1"><div class="sk sk-line" style="width:56%"></div><div class="sk sk-line thin" style="width:38%"></div></div></div>
      <div class="sk-row"><div class="sk sk-chip"></div><div class="sk sk-chip" style="width:64px"></div><div class="sk sk-chip" style="width:52px"></div></div>
      <div class="sk sk-block"></div>
      <div class="sk sk-line" style="width:92%"></div><div class="sk sk-line" style="width:70%"></div>
    </div>`;
  }
  return out;
}
let marketLoadTimer=null;
function renderMarket(withSkeleton){
  if(withSkeleton){
    clearTimeout(marketLoadTimer);
    $("marketCards").innerHTML=skCards(6);
    $("resultsCnt").innerHTML=`<span class="mut">Loading the marketplace…</span>`;
    marketLoadTimer=setTimeout(()=>renderMarketNow(),480);
    return;
  }
  renderMarketNow();
}
function renderMarketNow(){
  const isPlat=S.marketTab==="platforms";
  let items = isPlat ? allListings().filter(matchPlat) : allCampaigns().filter(matchCamp);
  const sort=$("sortSel").value;
  const from = x => isPlat?priceFrom(x):x.budget;
  if(sort==="rating") items.sort((a,b)=>b.rating-a.rating);
  else if(sort==="aud") items.sort((a,b)=>(b.audience||b.budget)-(a.audience||a.budget));
  else if(sort==="priceAsc") items.sort((a,b)=>from(a)-from(b));
  else if(sort==="priceDesc") items.sort((a,b)=>from(b)-from(a));
  items.sort((a,b)=>(b.example?1:0)-(a.example?1:0));
  const realCount=items.filter(x=>!x.example).length;
  $("resultsCnt").innerHTML=`<b>${realCount}</b> ${isPlat?"platform listing":"campaign"}${realCount===1?"":"s"} live${realCount?" · 1 example shown":""}`;
  const foundingES=`<div class="founding-state"><div class="fs-badge">Founding cohort</div><div class="fs-ico">🚀</div><h4>${isPlat?"3 founding creators have joined so far — be the next":"3 founding brands have joined so far — be the next"}</h4><p>PromoSlot is opening with a hand-picked founding cohort. The card above is an example of a complete ${isPlat?"platform-owner listing":"business campaign"} — real ${isPlat?"listings":"campaigns"} will appear here as founders come on board.</p><button class="btn btn-p" onclick="marketCtaClick()">${isPlat?"List your platform":"Post your campaign"}</button></div>`;
  $("marketCards").innerHTML = items.length
    ? items.map((x,i)=>isPlat?listingCard(x,i):campaignCard(x,i)).join("") + (realCount===0?foundingES:"")
    : `<div class="zero-state">
        <div class="zs-ico">🔎</div>
        <h4>No ${isPlat?"platforms":"campaigns"} match those filters</h4>
        <p>Try removing a filter or widening the ${isPlat?"price":"budget"} range — the marketplace has ${isPlat?allListings().length+" listings":allCampaigns().length+" live campaigns"} in total.</p>
        <button class="btn btn-o btn-sm" onclick="resetFilters();buildFilters();renderMarket()">Clear all filters</button>
      </div>`;
}
function renderMiniMarket(){
  const reals=(S.marketPlatforms||[]).slice(0,3);
  const picks = reals.length ? reals : [LISTINGS[0]];
  $("miniMarket").innerHTML=picks.map((l,i)=>listingCard(l,i)).join("");
}

/* ==================== LISTING DETAIL ==================== */
function findListing(id){ return allListings().find(l=>l.id===id); }
function findCampaign(id){ return allCampaigns().find(c=>c.id===id); }
function detSkeleton(){
  return `<div class="det-head"><div class="sk sk-pfp" style="width:64px;height:64px;border-radius:16px"></div>
    <div style="flex:1"><div class="sk sk-line" style="width:40%;height:16px"></div><div class="sk sk-line thin" style="width:60%"></div><div class="sk sk-line thin" style="width:30%"></div></div></div>
    <div style="padding:20px 28px"><div class="sk sk-line" style="width:95%"></div><div class="sk sk-line" style="width:80%"></div>
    <div class="sk sk-block" style="margin-top:18px;height:80px"></div><div class="sk sk-block" style="margin-top:12px;height:80px"></div></div>`;
}
function openListing(id,tab){
  const l=findListing(id); if(!l) return;
  const fresh = !$("overlay").classList.contains("open");
  if(fresh){ openModal(detSkeleton(),"wide"); setTimeout(()=>renderListingModal(l,tab),340); }
  else renderListingModal(l,tab);
}
function renderListingModal(l,tab){
  tab=tab||"offers";
  const others=allListings().filter(x=>x.ownerId===l.ownerId && x.id!==l.id);
  const revs=l.example?reviewsFor(l.id):[];
  const tabs=[["offers","Services & pricing"],["about","Audience & analytics"],["past","Past campaigns"],["reviews",`Reviews${l.example?" (Example)":" (0)"}`]];
  let body="";
  if(tab==="offers"){
    body = `<div class="det-sec"><h5>Services offered</h5><div class="tagrow">${l.services.map(s=>`<span class="tag">${esc(s)}</span>`).join("")}</div></div>
    <div class="det-sec"><h5>Offers & pricing — set by ${esc(l.owner.split(" ")[0])}</h5>
      ${l.pricing.map((p,i)=>`<div class="offer-row">
        <span class="tag ind offer-kind">${PM_LABEL[p.type]}</span>
        <div class="oi"><b>${esc(p.label)}</b><small>${esc(p.detail)}</small></div>
        <span class="op">${p.amount>0?gbp(p.amount)+(p.type==="per-view"||p.type==="hybrid"?"+":p.type==="per-imp"?" est.":""):"Quote"}</span>
        <button class="btn btn-p btn-sm" onclick="event.stopPropagation();buyOffer('${l.id}',${i})">${p.type==="custom"?"Request quote":"Buy offer"}</button>
      </div>`).join("")}
      <div class="note blue">🔒 Payment is funded into PromoSlot escrow before work starts and released only when the agreed delivery conditions are verified. PromoSlot's fee is 10% seller fee + 5% buyer protection fee, both on the agreed price.</div></div>`;
  } else if(tab==="about"){
    body = `<div class="det-sec"><h5>Audience analytics <span class="tag grn" style="margin-left:6px">${l.verified?"Analytics evidence verified ✔":"Self-reported"}</span></h5>
      <div class="statrow big" style="margin-bottom:12px">
        <div><b>${fmtN(l.audience)}</b><span>${l.platform==="Newsletter"?"Subscribers":l.platform==="Discord"?"Members":"Followers"}</span></div>
        <div><b>${fmtN(l.avgViews)}</b><span>${l.platform==="Newsletter"?"Avg opens":"Avg views"}</span></div>
        <div><b>${fmtN(l.impressions)}</b><span>Avg impressions</span></div>
        <div><b>${l.er}%</b><span>${l.platform==="Newsletter"?"Open rate":"Engagement"}</span></div>
      </div></div>
    <div class="det-sec"><h5>Audience countries</h5><div class="tagrow">${l.countries.map(c=>`<span class="tag">${esc(c)}</span>`).join("")}</div></div>
    <div class="det-sec"><h5>Age ranges</h5><div class="tagrow">${l.ages.map(a=>`<span class="tag">${esc(a)}</span>`).join("")}</div></div>
    <div class="det-sec"><h5>Audience interests</h5><div class="tagrow">${l.interests.map(a=>`<span class="tag amb">${esc(a)}</span>`).join("")}</div></div>
    <div class="det-sec"><h5>Availability</h5><p class="det-p">Currently accepting new deals · typical response time under 4 hours · next open slot within 7 days.</p></div>`;
  } else if(tab==="past"){
    body = `<div class="det-sec"><h5>Previous campaign examples</h5><div class="pastc">
      ${l.past.length?l.past.map(p=>`<div class="pc"><b>${esc(p.brand)}</b><small>${esc(p.what)}</small><div class="pcs">📈 ${esc(p.stat)}</div></div>`).join(""):`<p class="det-p" style="grid-column:1/-1">No campaigns completed on PromoSlot yet — every completed deal appears here automatically with its verified results.</p>`}
    </div><div class="note" style="margin-top:14px">Delivery ≠ performance: past results are evidence of reach, not a guarantee of sales or virality — unless written into a funded performance agreement.</div></div>`;
  } else {
    body = l.example
      ? `<div class="det-sec"><h5>What businesses say</h5><div class="note blue" style="margin-bottom:12px">These are illustrative example reviews — real reviews appear only after a completed deal.</div>
      ${revs.map(r=>`<div class="rev-item ex-review"><div class="rvtop"><span class="rev-who"><span class="rev-dot">${esc(initials(r.name))}</span><b>${esc(r.name)} · ${esc(r.co)}</b><span class="tag ex-tag rev-ex">EXAMPLE</span></span><span class="stars">${"★".repeat(r.stars)}${"☆".repeat(5-r.stars)}</span></div><p>${esc(r.text)}</p></div>`).join("")}</div>`
      : `<div class="det-sec"><h5>What businesses say</h5><div class="empty-state small"><div class="es-ico">📝</div><h4>No reviews yet</h4><p>Reviews appear here once a business completes a deal with ${esc(l.name)} and leaves feedback — every review is tied to a real, funded transaction.</p></div></div>`;
  }
  openModal(`
    <div class="det-head">${exWrap(pfp(l.name,l.platform),l.example)}
      <div class="det-title"><h3>${esc(l.name)} ${l.verified?'<span class="vtick">✔︎ Verified</span>':""}</h3>
        <div class="handle">${esc(l.handle)} · run by <b>${esc(l.brand)}</b> (${esc(l.owner)})</div>
        <div class="metaline">${l.example?'<span class="tag ex-tag">EXAMPLE PROFILE</span>':""}${pbadge(l.platform)}${l.niches.map(n=>`<span class="tag">${esc(n)}</span>`).join("")}${l.example?"":starsHtml(l.rating,l.reviewCount)}</div>
      </div>
      <div class="det-actions">
        <button class="btn btn-o btn-sm" onclick="openChat('${l.id}')">💬 Message</button>
        <button class="btn btn-o btn-sm" onclick="requestQuote('${l.id}')">Request custom quote</button>
      </div>
    </div>
    <p class="det-bio">${esc(l.bio)}</p>
    ${others.length?`<div style="padding:16px 28px 0"><div class="det-sec" style="margin:0"><h5>Also from ${esc(l.brand)} — ${others.length} more platform${others.length>1?"s":""}</h5>
      <div class="other-plats">${others.map(o=>`<div class="op-row" onclick="openListing('${o.id}')">${pfp(o.name,o.platform,"")}<div><b>${esc(o.name)}</b><small>${o.platform} · ${fmtN(o.audience)} ${o.platform==="Newsletter"?"subs":o.platform==="Discord"?"members":"followers"}${priceFrom(o)?" · from "+gbp(priceFrom(o)):""}</small></div><span class="op-go">View →</span></div>`).join("")}</div></div></div>`:""}
    <div class="det-tabs">${tabs.map(([k,lab])=>`<button class="det-tab ${tab===k?"on":""}" onclick="openListing('${l.id}','${k}')">${lab}</button>`).join("")}</div>
    <div class="det-body">${body}</div>`,"wide");
}
function requestQuote(id){
  const l=findListing(id);
  openModal(`<div class="m-pad"><h3 class="m-title">Request a custom quote from ${esc(l.name)}</h3>
    <p class="m-sub">${esc(l.owner.split(" ")[0])} will reply with a personalised proposal you can accept, decline, or counter.</p>
    <div class="frm">
      <div><label>What do you need?</label><textarea id="rq-txt">We're launching a new product in your niche — could you put together a proposal for a 2-video package plus a 7-day link placement?</textarea></div>
      <div class="row2"><div><label>Rough budget</label><input type="text" id="rq-bud" value="£300–£500"></div><div><label>Timeline</label><input type="text" id="rq-when" value="Within 3 weeks"></div></div>
    </div>
    <div class="m-actions"><button class="btn btn-o" onclick="openListing('${l.id}')">Back</button><button class="btn btn-p" onclick="sendQuoteReq('${l.id}')">Send request</button></div></div>`);
}
function sendQuoteReq(id){
  const l=findListing(id);
  // We record the request but never fabricate a reply or a proposal — a response
  // can only come from the real owner's account.
  closeModal();
  openModal(`<div class="m-pad"><h3 class="m-title">Quote request recorded</h3>
    <p class="m-sub">Your request to <b>${esc(l.name)}</b> has been noted. ${l.example?"This is an example profile, so there's no real owner to reply yet.":"You'll see their reply in Messages if and when they respond."} PromoSlot never writes a reply on their behalf.</p>
    ${pendingPanel("💬","Awaiting a real reply","Custom proposals appear here only when a real owner actually sends one.")}
    <div class="m-actions"><button class="btn btn-p" onclick="closeModal()">Got it</button></div></div>`,"narrow");
}

/* ==================== CAMPAIGN DETAIL ==================== */
function openCampaign(id,tab){
  const c=findCampaign(id); if(!c) return;
  const fresh = !$("overlay").classList.contains("open");
  if(fresh){ openModal(detSkeleton(),"wide"); setTimeout(()=>renderCampaignModal(c,tab),340); }
  else renderCampaignModal(c,tab);
}
function renderCampaignModal(c,tab){
  tab=tab||"offer";
  const revs=c.example?reviewsFor(c.id):[];
  const tabs=[["offer","What they're offering"],["profile","Business profile"],["reviews",`Reviews${c.example?" (Example)":" (0)"}`]];
  let body="";
  if(tab==="offer"){
    body=`<div class="det-sec"><h5>Looking for</h5><div class="tagrow">${c.platforms.map(p=>`<span class="tag">${PLATFORM_META[p].ico} ${p}</span>`).join("")}${c.niches.map(n=>`<span class="tag amb">${esc(n)}</span>`).join("")}${c.creatorSizes.map(s=>`<span class="tag">${esc(s)}</span>`).join("")}</div></div>
    <div class="det-sec"><h5>Services wanted</h5><div class="tagrow">${c.services.map(s=>`<span class="tag ind">${esc(s)}</span>`).join("")}</div></div>
    <div class="det-sec"><h5>Payment offered</h5>${c.payment.map(p=>`<div class="offer-row"><span class="pico">💷</span><div class="oi"><b>${esc(p.detail)}</b></div></div>`).join("")}
    ${c.samples?`<div class="note blue" style="margin-top:10px">🎁 Product samples available for accepted creators.</div>`:""}</div>
    <div class="det-sec"><h5>Expected deliverables</h5><p class="det-p">${esc(c.deliverables)}</p></div>
    <div class="det-sec"><h5>Campaign duration</h5><p class="det-p">${esc(c.duration)} · Target countries: ${c.countries.join(", ")}</p></div>`;
  } else if(tab==="profile"){
    body=`<div class="det-sec"><h5>Business profile</h5><div class="agree-doc"><div class="ad-head"><span>${esc(c.company)}</span><span>${c.verified?"✔ Business verified":"Unverified"}</span></div>
      <div class="ad-row"><span class="k">Product / service</span><span class="v">${esc(c.profile.product)}</span></div>
      <div class="ad-row"><span class="k">Industry</span><span class="v">${esc(c.industry)}</span></div>
      <div class="ad-row"><span class="k">Target market</span><span class="v">${esc(c.profile.target)}</span></div>
      <div class="ad-row"><span class="k">Target countries</span><span class="v">${c.countries.join(", ")}</span></div>
      <div class="ad-row"><span class="k">Campaign budget</span><span class="v">${c.budget?gbp(c.budget):"Commission-based"}</span></div>
      <div class="ad-row"><span class="k">Payment methods offered</span><span class="v">${c.profile.payMethods.join(" · ")}</span></div>
      <div class="ad-row"><span class="k">Product samples</span><span class="v">${c.samples?"Yes — supplied free":"Not offered"}</span></div>
      <div class="ad-row"><span class="k">Previous collaborations</span><span class="v">${esc(c.profile.collabs)}</span></div>
      <div class="ad-row"><span class="k">Active campaigns</span><span class="v">${allCampaigns().filter(x=>x.company===c.company).length} live on PromoSlot</span></div>
    </div></div>`;
  } else {
    body = c.example
      ? `<div class="det-sec"><h5>What platform owners say about ${esc(c.company)}</h5><div class="note blue" style="margin-bottom:12px">These are illustrative example reviews — real reviews appear only after a completed deal.</div>
      ${revs.map(r=>`<div class="rev-item ex-review"><div class="rvtop"><span class="rev-who"><span class="rev-dot">${esc(initials(r.name))}</span><b>${esc(r.name)}</b><span class="tag ex-tag rev-ex">EXAMPLE</span></span><span class="stars">${"★".repeat(r.stars)}${"☆".repeat(5-r.stars)}</span></div><p>${esc(r.text)}</p></div>`).join("")}</div>`
      : `<div class="det-sec"><h5>What platform owners say about ${esc(c.company)}</h5><div class="empty-state small"><div class="es-ico">📝</div><h4>No reviews yet</h4><p>Reviews appear here once a platform owner completes a deal with ${esc(c.company)} and leaves feedback — every review is tied to a real, funded transaction.</p></div></div>`;
  }
  openModal(`
    <div class="det-head">${exWrap(pfp(c.company,null),c.example)}
      <div class="det-title"><h3>${esc(c.title)}</h3>
        <div class="handle">by <b>${esc(c.company)}</b> ${c.verified?'<span class="vtick">✔︎ Verified business</span>':""} · ${esc(c.industry)} · posted ${esc(c.posted)}</div>
        <div class="metaline">${c.example?'<span class="tag ex-tag">EXAMPLE CAMPAIGN</span>':starsHtml(c.rating,c.reviewCount)}<span class="tag grn">${c.budget?gbp(c.budget)+" budget":"Commission only"}</span>${c.example?"":`<span class="tag">${c.applicants} applicants</span>`}</div>
      </div>
      <div class="det-actions">
        <button class="btn btn-o btn-sm" onclick="openChat('${c.id}')">💬 Message</button>
        <button class="btn btn-p btn-sm" onclick="applyCampaign('${c.id}')">Apply to campaign</button>
      </div>
    </div>
    <p class="det-bio">${esc(c.desc)}</p>
    <div class="det-tabs">${tabs.map(([k,lab])=>`<button class="det-tab ${tab===k?"on":""}" onclick="openCampaign('${c.id}','${k}')">${lab}</button>`).join("")}</div>
    <div class="det-body">${body}</div>`,"wide");
}

/* ==================== CHAT ==================== */
// A conversation starts empty. We never fabricate messages from the other party
// or a fake "typing…" reply — inbound messages only exist when a real account
// actually sends them.
function chatSeed(id){
  const l=findListing(id), c=l?null:findCampaign(id);
  if(l) return {them:l.owner.split(" ")[0], plat:l.platform, name:l.name, msgs:[], example:!!l.example};
  if(c) return {them:c.company, plat:null, name:c.company, msgs:[], example:!!c.example};
  return {them:"Unknown", plat:null, name:"Unknown", msgs:[], example:false};
}
function chatBanner(ch){
  return ch.example
    ? `<div class="note blue" style="margin:0">🧪 This is an <b>example profile</b>. Messages you send here aren't delivered to a real account — real conversations begin when members join. PromoSlot never writes replies on anyone's behalf.</div>`
    : `<div class="note blue" style="margin:0">💬 Messages are delivered to <b>${esc(ch.name)}</b>'s real account. Replies appear here only when they actually respond.</div>`;
}
function threadMsgsHtml(ch){
  if(!ch.msgs.length) return `<div class="thread-empty" style="min-height:120px"><div class="es-ico">✉️</div><p>No messages yet — say hello.</p></div>`;
  return ch.msgs.map(m=>`<div class="msg ${m.who}">${esc(m.txt)}<span class="mt">${m.t}</span></div>`).join("");
}
function openChat(id){
  if(!S.chatLogs[id]) S.chatLogs[id]=chatSeed(id);
  const ch=S.chatLogs[id];
  openModal(`<div class="chat-box">
    <div class="chat-head">${pfp(ch.name,ch.plat)}<div><b>${esc(ch.name)}</b><small class="mut" style="color:var(--mut)">${ch.example?"Example profile":"Direct message"}</small></div>
      <button class="btn btn-o btn-sm" style="margin-left:auto" onclick="${findListing(id)?`openListing('${id}')`:`openCampaign('${id}')`}">View ${findListing(id)?"profile":"campaign"}</button></div>
    <div style="padding:12px 16px 0">${chatBanner(ch)}</div>
    <div class="chat-msgs" id="chatMsgs">${threadMsgsHtml(ch)}</div>
    <div class="chat-input"><input id="chatInput" placeholder="Type a message…" onkeydown="if(event.key==='Enter')sendChat('${id}')"><button class="btn btn-p" onclick="sendChat('${id}')">Send</button></div>
  </div>`);
  const box=$("chatMsgs"); box.scrollTop=box.scrollHeight;
}
function sendChat(id){
  const inp=$("chatInput"); const txt=inp.value.trim(); if(!txt) return;
  const ch=S.chatLogs[id]; const now=new Date();
  const t=now.getHours()+":"+String(now.getMinutes()).padStart(2,"0");
  ch.msgs.push({who:"me",t,txt});
  inp.value="";
  // Only the user's real message is added. No fabricated reply.
  const box=$("chatMsgs");
  box.innerHTML=threadMsgsHtml(ch);
  box.scrollTop=box.scrollHeight;
}

/* ==================== MESSAGES INBOX ==================== */
// The inbox only contains conversations the user has really started. No seeded
// or fake unread threads.
function ensureInboxSeeds(){ /* intentionally empty — no fabricated conversations */ }
function convMeta(id){
  const ch=S.chatLogs[id]; const last=ch.msgs[ch.msgs.length-1]||{t:"",who:"me",txt:"No messages yet"};
  return {ch,last};
}
function openMessages(id){
  if(id) S.activeConv=id;
  if(!S.activeConv || !S.chatLogs[S.activeConv]) S.activeConv=Object.keys(S.chatLogs)[0]||null;
  renderMessages(false); showView("view-messages");
}
function openConv(id){
  S.activeConv=id; S.chatLogs[id].unread=false;
  renderMessages(true);
}
function renderMessages(showThread){
  const ids=Object.keys(S.chatLogs);
  const act=S.activeConv;
  if(!ids.length){
    $("msgsWrap").innerHTML=`
      <div class="msgs-head"><h2>Messages</h2><p class="mut" style="font-size:14px">Negotiate freely — when you're ready, move terms into the deal builder so everything is documented and escrow-protected.</p></div>
      <div class="empty-state"><div class="es-ico">💬</div><h4>No conversations yet</h4><p>Message a platform owner or business from their profile to start a conversation. Your real threads show up here — nothing is pre-filled.</p><button class="btn btn-o btn-sm" onclick="openMarket()">Browse the marketplace</button></div>`;
    return;
  }
  const list=ids.map(id=>{
    const {ch,last}=convMeta(id);
    return `<div class="conv ${id===act?"on":""}" onclick="openConv('${id}')">
      ${pfp(ch.name,ch.plat)}
      <div class="cv-main"><div class="cv-top"><b>${esc(ch.name)}</b><span class="cv-time">${esc(last.t)}</span></div>
      <div class="cv-prev">${last.who==="me"&&last.txt!=="No messages yet"?"You: ":""}${esc(last.txt)}</div></div>
      ${ch.unread?'<span class="unread-dot"></span>':""}</div>`;
  }).join("");
  let thread=`<div class="thread-empty"><div class="es-ico">💬</div><p>Select a conversation</p></div>`;
  if(act && S.chatLogs[act]){
    const ch=S.chatLogs[act];
    const isListing=!!findListing(act);
    thread=`<div class="chat-head">
      <button class="btn btn-ghost conv-back" onclick="renderMessages(false)">←</button>
      ${pfp(ch.name,ch.plat)}<div><b>${esc(ch.name)}</b><small class="mut" style="color:var(--mut)">${ch.example?"Example profile":"Direct message"}</small></div>
      <button class="btn btn-o btn-sm" style="margin-left:auto" onclick="${isListing?`openListing('${act}')`:`openCampaign('${act}')`}">View ${isListing?"profile":"campaign"}</button></div>
    <div style="padding:12px 16px 0">${chatBanner(ch)}</div>
    <div class="chat-msgs" id="ibMsgs">${threadMsgsHtml(ch)}</div>
    <div class="chat-input"><input id="ibInput" placeholder="Type a message…" onkeydown="if(event.key==='Enter')sendInboxMsg('${act}')"><button class="btn btn-p" onclick="sendInboxMsg('${act}')">Send</button></div>`;
  }
  $("msgsWrap").innerHTML=`
    <div class="msgs-head"><h2>Messages</h2><p class="mut" style="font-size:14px">Negotiate freely — when you're ready, move terms into the deal builder so everything is documented and escrow-protected.</p></div>
    <div class="inbox ${showThread?"show-thread":""}">
      <div class="conv-list">${list}</div>
      <div class="thread">${thread}</div>
    </div>`;
  const box=$("ibMsgs"); if(box) box.scrollTop=box.scrollHeight;
}
function sendInboxMsg(id){
  const inp=$("ibInput"); const txt=inp.value.trim(); if(!txt) return;
  const ch=S.chatLogs[id]; const now=new Date();
  const t=now.getHours()+":"+String(now.getMinutes()).padStart(2,"0");
  ch.msgs.push({who:"me",t,txt});
  inp.value="";
  // Only the user's real message is added. No fabricated reply.
  const box=$("ibMsgs");
  if(box){ box.innerHTML=threadMsgsHtml(ch); box.scrollTop=box.scrollHeight; }
}

/* ==================== DEAL BUILDER ==================== */
function buyOffer(listingId, priceIdx){
  const l=findListing(listingId); const p=l.pricing[priceIdx];
  const isTime=p.type==="time", isPV=p.type==="per-view", isAff=p.type==="affiliate", isHyb=p.type==="hybrid", isImp=p.type==="per-imp", isCustom=p.type==="custom";
  const guaranteed = isAff||isCustom ? 0 : p.amount;
  const deal={
    id:"D-"+(1040+S.dealSeq++), kind:"buy", with:l.name, withSub:l.brand, plat:l.platform, refId:l.id, example:!!l.example,
    title:`${p.label} — ${l.name}`, status:"Agreement draft", step:1, myApproved:false, theirApproved:false,
    funded:false, proofStored:false, verifiedByReviewer:false, paidOut:false,
    proof:[], measuredViews: 0, log:[{t:"Just now",txt:"Deal created from listing offer"}],
    terms:{
      platforms:[l.platform].concat(p.label.includes("Story")?["Instagram"]:[]),
      deliverables:p.label, posts: p.label.includes("Package")||p.label.includes("+")? "2 posts + 1 placement":"1 post",
      content:"Product shown in use · brand tag + tracked link in caption · draft approval before posting",
      pubDate:"Within 10 days of funding", liveFor:isTime?p.detail.match(/\d+ (days|weeks?|month)/)?.[0]||"7 days":"Minimum 30 days",
      model:PM_LABEL[p.type], guaranteed,
      performance: isPV? "£8 per 1,000 verified views" : isHyb? "10% commission on tracked sales" : isImp? p.detail.split("·")[0].trim() : isAff? p.detail.split("·")[0].trim() : "None — delivery-based deal",
      commission: isHyb||isAff ? (isAff?"15% per verified sale · 30-day cookie · £20 min payout":"10% of tracked sales · 30-day cookie") : "n/a",
      measurement: isPV||isHyb||isImp ? "14 days after publication" : isAff ? "30-day attribution window" : "On delivery approval",
      cap: isPV? 250 : isHyb? 400 : isImp? 300 : 0,
      revisions:"1 revision included", usage:"Organic usage · paid-ads rights available for +40%",
      proofReq:"Published link · analytics screenshot · view/impression count" + (isTime?" · live-duration confirmation":""),
      cancel:"Free cancellation before funding · after funding, escrow returns to business if delivery conditions unmet"
    }
  };
  S.deals.unshift(deal); closeModal(); renderDeal(deal.id); showView("view-deal");
  toast("Deal draft created — review the agreement");
}
function applyCampaign(campId){
  const c=findCampaign(campId);
  const fixed=c.payment.find(p=>p.type==="fixed"), pv=c.payment.find(p=>p.type==="per-view"), aff=c.payment.find(p=>p.type==="affiliate"), tm=c.payment.find(p=>p.type==="time");
  const guaranteed = fixed? Number((fixed.detail.match(/£(\d+)/)||[0,0])[1]) : tm? Number((tm.detail.match(/£(\d+)/)||[0,0])[1]) : 0;
  const deal={
    id:"D-"+(1040+S.dealSeq++), kind:"apply", with:c.company, withSub:c.title, plat:null, refId:c.id, example:!!c.example,
    title:`Application — ${c.title}`, status:"Agreement draft", step:1, myApproved:false, theirApproved:false,
    funded:false, proofStored:false, verifiedByReviewer:false, paidOut:false,
    proof:[], measuredViews:0, log:[{t:"Just now",txt:"Application started — terms seeded from campaign"}],
    terms:{
      platforms:c.platforms.slice(0,2), deliverables:c.deliverables.split(".")[0], posts:"1 post",
      content:"Follow campaign brief · tracked link/code required · draft approval before posting",
      pubDate:"Within 14 days of funding", liveFor:"Minimum 30 days",
      model:campPayTypes(c).join(" + "), guaranteed,
      performance: pv? pv.detail : "None — delivery-based deal",
      commission: aff? aff.detail : "n/a",
      measurement: pv? "14 days after publication" : aff? "30-day attribution" : "On delivery approval",
      cap: pv? Math.max(300,guaranteed*3) : 0,
      revisions:"1 revision included", usage:c.id==="c8"?"6-month paid usage rights":"Organic usage only",
      proofReq:"Published link · analytics screenshot" + (aff?" · referral sales report":""),
      cancel:"Free cancellation before funding · after funding, escrow returns to business if delivery conditions unmet"
    }
  };
  S.deals.unshift(deal); closeModal(); renderDeal(deal.id); showView("view-deal");
  toast("Application drafted — review & approve the agreement");
}
function dealById(id){ return S.deals.find(d=>d.id===id); }
const DEAL_STEPS=["Agreement","Approval","Escrow funding","Delivery & proof","Verification","Payout"];

function grossOf(d){
  let g=d.terms.guaranteed||0;
  if(d.measuredViews>0){
    const rate=(d.terms.performance.match(/£(\d+(?:\.\d+)?) per 1,?000/)||[])[1];
    if(rate){ let perf=d.measuredViews/1000*Number(rate); if(d.terms.cap) perf=Math.min(perf, Math.max(0,d.terms.cap-g)); g+=perf; }
    else if(d.terms.commission!=="n/a"){ g+= Math.round(d.measuredViews*0.011*8.4); }
  }
  return Math.round(g*100)/100;
}
function escrowOf(d){ return d.terms.cap ? Math.max(d.terms.cap, d.terms.guaranteed) : (d.terms.guaranteed||120); }

function renderDeal(id){
  const d=dealById(id); if(!d) return;
  const t=d.terms;
  const donePct = Math.min(100, Math.round(((d.step-1)/(DEAL_STEPS.length-1))*100));
  const stepper = `<div class="stepper"><div class="stepper-track"><i style="width:${donePct}%"></i></div>${DEAL_STEPS.map((s,i)=>{
    const n=i+1; const cls=n<d.step?"done":n===d.step?"cur":"";
    return `<div class="step ${cls}"><div class="dot">${n<d.step?"✓":n}</div><span>${s}</span></div>`;}).join("")}</div>`;
  const doc = `<div class="agree-doc"><div class="ad-head"><span>📄 Deal agreement ${d.id}</span><span>You ⇄ ${esc(d.with)}</span></div>
    <div class="ad-row"><span class="k">Selected platforms</span><span class="v">${t.platforms.join(" + ")}</span></div>
    <div class="ad-row"><span class="k">Deliverables</span><span class="v">${esc(t.deliverables)}</span></div>
    <div class="ad-row"><span class="k">Number of posts</span><span class="v">${esc(t.posts)}</span></div>
    <div class="ad-row"><span class="k">Content requirements</span><span class="v">${esc(t.content)}</span></div>
    <div class="ad-row"><span class="k">Publication date</span><span class="v">${esc(t.pubDate)}</span></div>
    <div class="ad-row"><span class="k">Required live duration</span><span class="v">${esc(t.liveFor)}</span></div>
    <div class="ad-row"><span class="k">Pricing model</span><span class="v">${esc(t.model)}</span></div>
    <div class="ad-row"><span class="k">Guaranteed payment</span><span class="v">${t.guaranteed?gbp(t.guaranteed):"None"}</span></div>
    <div class="ad-row"><span class="k">Performance payment</span><span class="v">${esc(t.performance)}</span></div>
    <div class="ad-row"><span class="k">Commission terms</span><span class="v">${esc(t.commission)}</span></div>
    <div class="ad-row"><span class="k">Measurement period</span><span class="v">${esc(t.measurement)}</span></div>
    <div class="ad-row"><span class="k">Maximum payout</span><span class="v">${t.cap?gbp(t.cap):"= guaranteed amount"}</span></div>
    <div class="ad-row"><span class="k">Revision allowance</span><span class="v">${esc(t.revisions)}</span></div>
    <div class="ad-row"><span class="k">Usage rights</span><span class="v">${esc(t.usage)}</span></div>
    <div class="ad-row"><span class="k">Proof required</span><span class="v">${esc(t.proofReq)}</span></div>
    <div class="ad-row"><span class="k">Cancellation terms</span><span class="v">${esc(t.cancel)}</span></div>
  </div>`;
  let main="";
  if(d.step===1){
    main=`<h3 class="deal-h">Step 1 — Build the agreement</h3>
    <p class="deal-sub">Either party can revise these terms before approval. Both sides approve the <b>same final agreement</b> before any work begins.</p>
    ${doc}
    <div class="btn-row">
      <button class="btn btn-p" onclick="dealNext('${d.id}')">Looks right — go to approval</button>
      <button class="btn btn-o" onclick="counterOffer('${d.id}')">✏️ Send counter-offer</button>
      <button class="btn btn-danger" onclick="cancelDeal('${d.id}')">Cancel deal</button>
    </div>`;
  } else {
    // Step 2+ — approval, then an honest, read-only roadmap of the gated stages.
    // Deals never auto-advance past approval: funding, proof storage, human
    // verification and payout each require real infrastructure that isn't live.
    const amt=escrowOf(d);
    const exampleBanner = d.example
      ? `<div class="note blue" style="margin:0 0 14px">🧪 This deal is with an <b>example profile</b>, shown so you can preview how PromoSlot documents an agreement. There is no real counterparty to approve, fund or pay — real deals begin when both accounts are real.</div>`
      : "";
    const theirState = d.theirApproved
      ? '<span class="ok-txt">✓ Approved</span>'
      : '<span class="mut">Waiting for their approval</span>';
    const waitingNote = d.myApproved && !d.theirApproved
      ? pendingPanel("⏳", `Waiting for ${esc(d.with)} to approve`,
          `They approve from their own account. This deal only moves to funding once both sides have approved the same agreement — there is no automatic or simulated approval.`)
      : "";
    const roadmap = `<div class="det-sec" style="margin-top:24px">
      <h5>The rest of this deal — not available yet</h5>
      <p class="deal-sub" style="margin-bottom:12px">Everything below activates only when the underlying integration is live and confirms a real event. Nothing here is simulated.</p>
      ${lockedStep("🔒","Escrow funding — "+gbp(amt),"The business funds the deal via Stripe. It is marked funded only after Stripe confirms the charge succeeded. Stripe payments are not connected yet.")}
      ${lockedStep("📤","Delivery & proof submission","The platform owner uploads the published link, analytics and view/impression counts. Proof counts only once a real file or link is uploaded and stored. Server-side storage is not connected yet.")}
      ${lockedStep("🔎","Human verification","A PromoSlot reviewer checks the real submitted evidence against this agreement and marks it verified by hand. This is never automatic. No reviewer is assigned yet.")}
      ${lockedStep("💸","Payout (minus 10% seller fee)","After a reviewer verifies delivery, funds transfer to the owner via Stripe Connect — the agreed price minus PromoSlot's 10% seller fee (the 5% buyer protection fee was already added at funding). Released only on a real successful transfer. Payouts are not connected yet.")}
    </div>`;
    main=`<h3 class="deal-h">Step 2 — Both parties approve</h3>
    <p class="deal-sub">Work cannot begin until both sides approve the identical agreement. This document becomes the basis for verification and any dispute.</p>
    ${exampleBanner}
    ${doc}
    <div class="approve-row">
      <div class="appr ${d.myApproved?"ok":""}"><b>You</b><small>${d.kind==="buy"?"Business":"Platform owner"}</small><div class="st">${d.myApproved?'<span class="ok-txt">✓ Approved</span>':`<button class="btn btn-p btn-sm" onclick="approveMine('${d.id}')">Approve agreement</button>`}</div></div>
      <div class="appr ${d.theirApproved?"ok":""}"><b>${esc(d.with)}</b><small>${d.kind==="buy"?"Platform owner":"Business"}</small><div class="st">${theirState}</div></div>
    </div>
    ${waitingNote}
    ${roadmap}`;
  }
  const statusCls = d.step>=6?"st-done":d.funded?"st-escrow":"st-draft";
  $("dealWrap").innerHTML=`
    <div class="deal-top">
      <button class="btn btn-ghost" onclick="openDash()">← Dashboard</button>
      <h2>${esc(d.title)}</h2>
      <span class="deal-status status-pill ${statusCls}">${esc(d.status)}</span>
    </div>
    ${stepper}
    <div class="deal-grid">
      <div class="deal-main view-anim">${main}</div>
      <div class="deal-side">
        <div class="side-card"><h5>Counterparty</h5>
          <div style="display:flex;gap:10px;align-items:center">${pfp(d.with,d.plat)}<div><b style="font-size:14px">${esc(d.with)}</b><div class="mut" style="font-size:12px">${esc(d.withSub)}</div></div></div>
          <button class="btn btn-o btn-sm" style="width:100%;margin-top:12px" onclick="openChat('${d.refId}')">💬 Message</button></div>
        <div class="side-card"><h5>Deal activity</h5><ul class="timeline">${d.log.map(e=>`<li>${esc(e.txt)}<small>${esc(e.t)}</small></li>`).join("")}</ul></div>
        <div class="side-card trust-card"><h5>Protected by PromoSlot</h5>
          <p>Escrow-secured funds · verified delivery · dispute support · 10% seller + 5% buyer fee, only on completion.</p></div>
      </div>
    </div>`;
}
function dlog(d,txt){ d.log.unshift({t:"Just now",txt}); }
function dealNext(id){
  const d=dealById(id);
  // Only the pre-money transition (build → approval) may happen from a click.
  // Every later transition is gated on a real event and handled elsewhere.
  if(d.step!==1) return;
  d.step=2;
  d.status="Awaiting approvals";
  dlog(d,"Agreement finalised — sent for dual approval");
  renderDeal(id);
}
function approveMine(id){
  const d=dealById(id);
  d.myApproved=true;
  dlog(d,"You approved the agreement");
  // The counterparty's approval is a real action taken by their real account.
  // We never fabricate it. It stays "waiting" until a real second party approves.
  renderDeal(id);
  toast("Your approval is recorded — waiting on "+d.with,true);
}
function counterOffer(id){
  const d=dealById(id);
  openModal(`<div class="m-pad"><h3 class="m-title">Counter-offer on ${esc(d.id)}</h3>
    <p class="m-sub">Revise the terms — ${esc(d.with)} can accept, decline, or counter again. Nothing is binding until both sides approve the same version.</p>
    <div class="frm">
      <div class="row2">
        <div><label>Guaranteed payment (£)</label><input type="number" id="co-guar" value="${d.terms.guaranteed}"></div>
        <div><label>Maximum payout (£, 0 = none)</label><input type="number" id="co-cap" value="${d.terms.cap}"></div>
      </div>
      <div><label>Deliverables</label><input type="text" id="co-del" value="${esc(d.terms.deliverables)}"></div>
      <div><label>Performance payment</label><input type="text" id="co-perf" value="${esc(d.terms.performance)}"></div>
      <div><label>Revision allowance</label><select id="co-rev"><option>1 revision included</option><option>2 revisions included</option><option>No revisions</option></select></div>
    </div>
    <div class="m-actions"><button class="btn btn-o" onclick="closeModal()">Cancel</button><button class="btn btn-p" onclick="sendCounter('${d.id}')">Send counter-offer</button></div></div>`);
}
function sendCounter(id){
  const d=dealById(id);
  d.terms.guaranteed=Number($("co-guar").value)||0;
  d.terms.cap=Number($("co-cap").value)||0;
  d.terms.deliverables=$("co-del").value;
  d.terms.performance=$("co-perf").value;
  d.terms.revisions=$("co-rev").value;
  d.myApproved=false; d.theirApproved=false;
  dlog(d,"You sent a counter-offer — awaiting their response");
  // We never fabricate the counterparty accepting. Their response comes from
  // their real account.
  closeModal(); renderDeal(id);
  toast("Counter-offer sent to "+d.with+" — awaiting their response");
}
function cancelDeal(id){
  const d=dealById(id);
  openModal(`<div class="m-pad"><h3 class="m-title">Cancel this deal?</h3><p class="m-sub">${d.step<3?"The deal hasn't been funded — cancellation is free and instant.":"Escrow will be returned to the business per the cancellation terms."}</p>
  <div class="m-actions"><button class="btn btn-o" onclick="closeModal()">Keep deal</button><button class="btn btn-danger" onclick="S.deals=S.deals.filter(x=>x.id!=='${id}');closeModal();openDash();toast('Deal ${id} cancelled')">Cancel deal</button></div></div>`,"narrow");
}
function fundDeal(id){
  // Escrow funding requires a real, confirmed Stripe charge. No such integration
  // exists yet, so we never mark a deal funded here.
  const d=dealById(id);
  if(!INFRA.payments){
    openModal(`<div class="m-pad"><h3 class="m-title">Escrow funding isn't available yet</h3>
      <p class="m-sub">Funding a deal moves real money into escrow, so it can only happen through a live payment provider. PromoSlot's Stripe integration isn't connected yet, so no deal can be funded — and none will ever be shown as funded until a real Stripe charge succeeds.</p>
      ${pendingPanel("💳","Payments pending","Stripe Connect is not wired up. When it is, this step will charge the business and mark the deal funded only after Stripe confirms the payment.")}
      <div class="m-actions"><button class="btn btn-p" onclick="closeModal()">Got it</button></div></div>`,"narrow");
    return;
  }
  // (Reachable only once INFRA.payments is true and a real Stripe flow is wired.)
  toast("Opening secure Stripe checkout…");
}
function submitProof(id,key){
  // Proof only counts once a real file/link is uploaded and stored server-side.
  if(!INFRA.fileStorage){
    openModal(`<div class="m-pad"><h3 class="m-title">Proof upload isn't available yet</h3>
      <p class="m-sub">Delivery evidence has to be really uploaded and stored so a reviewer and both parties can inspect it. That storage isn't connected yet, so nothing can be submitted or auto-filled as proof.</p>
      ${pendingPanel("📤","Evidence storage pending","When server-side file storage is live, you'll attach the published link, analytics screenshots and view counts here — and they'll count only once the upload is confirmed stored.")}
      <div class="m-actions"><button class="btn btn-p" onclick="closeModal()">Got it</button></div></div>`,"narrow");
    return;
  }
  // (Reachable only once INFRA.fileStorage is true and a real upload is wired.)
}
function openDispute(id){
  const d=dealById(id);
  openModal(`<div class="m-pad"><h3 class="m-title">⚖️ Dispute review — ${esc(d.id)}</h3>
  <p class="m-sub">PromoSlot reviews the accepted deal terms, content links, submitted evidence, platform analytics, messages, deadlines and revision requests. The decision follows the <b>agreed deliverables</b> — not whether a brand disliked the commercial outcome.</p>
  <div class="proof-item"><span class="pi-ico">📄</span>Accepted agreement ${esc(d.id)}<span class="ok">On file</span></div>
  <div class="proof-item"><span class="pi-ico">🔗</span>Submitted evidence (${d.proof.length} items)<span class="ok">On file</span></div>
  <div class="proof-item"><span class="pi-ico">💬</span>Message history with ${esc(d.with)}<span class="ok">On file</span></div>
  <div class="frm" style="margin-top:14px"><div><label>What wasn't fulfilled?</label><textarea placeholder="Describe which agreed deliverable was not met…"></textarea></div></div>
  <div class="m-actions"><button class="btn btn-o" onclick="closeModal()">Close</button><button class="btn btn-p" onclick="closeModal();toast('Dispute filed — a PromoSlot reviewer will respond within 48h',true)">File dispute</button></div></div>`);
}
function leaveReview(id){
  const d=dealById(id);
  // A review may only exist for a real, completed, paid-out deal between two real
  // accounts. No deal can reach that state yet, so reviews cannot be created.
  if(!d || !d.paidOut){
    openModal(`<div class="m-pad"><h3 class="m-title">Reviews come after a completed deal</h3>
      <p class="m-sub">A review can only be left once this deal is genuinely complete — funded, delivered, verified by a reviewer, and paid out to a real counterparty. That hasn't happened, so there's nothing to review yet. Reviews are never pre-written or auto-generated.</p>
      ${pendingPanel("⭐","Review pending completion","When the full deal really completes between two real accounts, both sides will be invited to leave a review that attaches permanently to this transaction.")}
      <div class="m-actions"><button class="btn btn-p" onclick="closeModal()">Got it</button></div></div>`,"narrow");
    return;
  }
  // (Reachable only once a real deal has genuinely completed.)
  openModal(`<div class="m-pad"><h3 class="m-title">Review ${esc(d.with)}</h3>
  <div class="rev-stars" id="revStars">${[1,2,3,4,5].map(i=>`<span data-n="${i}" onclick="this.parentNode.querySelectorAll('span').forEach((s,j)=>s.textContent=j<${i}?'★':'☆')">☆</span>`).join("")}</div>
  <div class="frm"><div><label>Your review</label><textarea placeholder="Describe how the deal went against what was agreed…"></textarea></div></div>
  <div class="m-actions"><button class="btn btn-o" onclick="closeModal()">Later</button><button class="btn btn-p" onclick="closeModal()">Publish review</button></div></div>`,"narrow");
}

/* ==================== ONBOARDING WIZARDS ==================== */
let W=null, lastPct=0;
const BIZ_INTENTS=[["📦","Looking to market a product","Get your product in front of the right audiences"],["🤝","Looking to offer affiliate partnerships","Pay commission on verified sales"],["🎁","Wanting to run a giveaway","Grow awareness with hosted giveaways"],["🌟","Looking for long-term brand ambassadors","Monthly retainers with creators you trust"],["🎬","Wanting UGC content","Videos for your own ads — not posted to creator pages"],["🧪","Testing a new market","Small campaigns to validate a niche or country"]];
const PLAT_INTENTS=[["🎵","I want to monetize my TikTok","Turn views into deal flow"],["🗂","I have multiple platforms to list","Each platform gets its own listing, audience & prices"],["💼","I'm looking for brand deals","Sponsored posts, integrations, reviews"],["🔗","I want to offer affiliate promotions","Earn commission on verified sales"],["📮","I run a community/newsletter","Discord, Substack, forums — communities monetise too"]];

function defW(){
  return {
    intentsB:new Set(), intentsP:new Set(), order:null,
    company:"Meadow & Moss", product:"Cold-process natural soap range", industry:"Beauty & skincare", target:"Eco-conscious women aged 22–40 who prefer plastic-free skincare",
    countries:new Set(["UK","Ireland"]), platforms:new Set(["TikTok","Instagram","Newsletter"]), services:new Set(["Product review","Short-form promo video","Instagram Story","Affiliate promotion"]),
    sizes:new Set(["Micro (10K–50K)","Mid (50K–250K)"]), budget:"2000", payMethods:new Set(["Fixed payment","Price per view","Free product"]), duration:"6 weeks", commission:"12", prize:"250", ugcCount:"10", ambTerm:"3 months",
    pType:"TikTok", pBrand:"Robert Media", pName:"RobertLifts", pDesc:"Daily hypertrophy training clips and honest supplement breakdowns for UK lifters.",
    pNiches:new Set(["Fitness"]), aud:"218400", views:"96200", imps:"412000", er:"7.4",
    pCountries:new Set(["UK","US","Australia"]), ages:new Set(["18-24","25-34"]), interests:new Set(["Gym & training","Nutrition","Supplements"]),
    pServices:new Set(["Short-form promo video","Sponsored social post","Affiliate promotion","Giveaway"]),
    pricing:[]
  };
}
function startWizard(kind){
  // Real accounts required. If not signed in, sign up first (role preselected),
  // then resume the wizard.
  if(!S.account){
    window._afterAuth=()=>startWizard(kind);
    authModal("signup");
    setTimeout(()=>{
      if(kind==="plat"||kind==="both"){ const b=$("au-r-plat"); if(b)b.classList.add("on"); }
      if(kind==="biz"||kind==="both"){ const b=$("au-r-biz"); if(b)b.classList.add("on"); }
    },30);
    return;
  }
  W={kind,d:defW(),i:0}; lastPct=0;
  if(kind==="biz") W.steps=["b-intent","b-company","b-target","b-budget","b-review"];
  else if(kind==="plat") W.steps=["p-intent","p-reg","p-aud","p-serv","p-review"];
  else W.steps=["x-intent","x-order"];
  renderWiz("fwd");
}
function openRegisterPlatform(){
  W={kind:"plat",d:defW(),i:0,steps:["p-reg","p-aud","p-serv","p-review"],again:true}; lastPct=0;
  const n=S.myPlatforms.length;
  if(n===1){ W.d.pType="Discord"; W.d.pName="RM Fit Hub"; W.d.pDesc="46k-member training community — check-ins, form reviews and a very active deals channel."; W.d.aud="46200"; W.d.views="18300"; W.d.imps="61000"; W.d.er="12.1"; W.d.pServices=new Set(["Community announcement","Pinned community post","Brand AMA"]); }
  if(n>=2){ W.d.pType="Newsletter"; W.d.pName="LiftLog Weekly"; W.d.pDesc="Weekly training newsletter for lifters who want evidence over hype. Sent Sundays, 48% open rate."; W.d.aud="32500"; W.d.views="15600"; W.d.imps="15600"; W.d.er="48"; W.d.pServices=new Set(["Newsletter advertisement","Sponsored blog post","Affiliate promotion"]); }
  renderWiz("fwd");
}
function wchip(field){
  return `onclick="W.d['${field}'].has(this.dataset.v)?W.d['${field}'].delete(this.dataset.v):W.d['${field}'].add(this.dataset.v);this.classList.toggle('on');this.classList.remove('pop');void this.offsetWidth;this.classList.add('pop')"`;
}
function wchipsHtml(field,opts){
  return `<div class="chips-lg">`+opts.map(o=>`<button class="chip ${W.d[field].has(o)?"on":""}" ${wchip(field)} data-v="${esc(o)}">${esc(o)}</button>`).join("")+`</div>`;
}
function selCardsHtml(field,items){
  return `<div class="sel-cards">`+items.map(([ico,t,sub])=>`<div class="sel-card ${W.d[field].has(t)?"on":""}" onclick="W.d['${field}'].has(this.dataset.v)?W.d['${field}'].delete(this.dataset.v):W.d['${field}'].add(this.dataset.v);this.classList.toggle('on')" data-v="${esc(t)}">
    <span class="sc-ico">${ico}</span><div><b>${esc(t)}</b><small>${esc(sub)}</small></div><span class="sc-check">✓</span></div>`).join("")+`</div>`;
}
function pmBox(key,title,sub,fields){
  const on=W.d.pricing.some(p=>p.key===key);
  return `<div class="price-model-box ${on?"on":""}" id="pmb-${key}">
    <div class="pm-head" onclick="document.getElementById('pmb-${key}').classList.toggle('on')"><b>${title}</b><small>${sub}</small><span class="sc-check">✓</span></div>
    <div class="pm-fields">${fields}</div></div>`;
}
function pmIn(id,label,val,type){ return `<div><label>${label}</label><input type="${type||"number"}" id="${id}" value="${esc(val)}"></div>`; }

function wizStepHtml(step){
  const d=W.d;
  switch(step){
    case "x-intent": return {t:"Welcome to PromoSlot",s:"You picked <b>Both roles</b> — one account, two dashboards. Select everything that applies:",h:
      `<h5 class="wiz-h5">As a business</h5>${selCardsHtml("intentsB",BIZ_INTENTS.slice(0,4))}
       <h5 class="wiz-h5" style="margin-top:14px">As a platform owner</h5>${selCardsHtml("intentsP",PLAT_INTENTS.slice(0,4))}`,
      valid:()=>d.intentsB.size||d.intentsP.size?null:"Select at least one goal."};
    case "x-order": return {t:"Which profile first?",s:"You'll set up one now — we'll offer the other right after.",h:
      `<div class="sel-cards">
        <div class="sel-card ${W.d.order==='biz'?'on':''}" onclick="W.d.order='biz';renderWiz()"><span class="sc-ico">🏢</span><div><b>Business profile first</b><small>Post campaigns & buy promotion</small></div><span class="sc-check">✓</span></div>
        <div class="sel-card ${W.d.order==='plat'?'on':''}" onclick="W.d.order='plat';renderWiz()"><span class="sc-ico">📣</span><div><b>Platform profile first</b><small>List your audience & get paid</small></div><span class="sc-check">✓</span></div>
      </div>`,
      valid:()=>W.d.order?null:"Pick one to start with."};
    case "b-intent": return {t:"What brings you to PromoSlot?",s:"Select everything that applies — this shapes the questions we ask next.",h:selCardsHtml("intentsB",BIZ_INTENTS),
      valid:()=>d.intentsB.size?null:"Select at least one goal."};
    case "b-company": return {t:"Tell us about your business",s:"This becomes your public business profile that platform owners can browse.",h:
      `<div class="frm"><div class="row2">
        <div><label>Company name</label><input type="text" id="w-company" value="${esc(d.company)}"></div>
        <div><label>Industry</label><select id="w-industry">${["Beauty & skincare","Fitness & nutrition","Food & drink","Fintech","Gaming","Developer tools","Kids & parenting","Fashion & apparel","EdTech","Travel","Other"].map(i=>`<option ${i===d.industry?"selected":""}>${i}</option>`).join("")}</select></div></div>
        <div><label>Product / service</label><input type="text" id="w-product" value="${esc(d.product)}"></div>
        <div><label>Target market description</label><textarea id="w-target">${esc(d.target)}</textarea></div></div>`,
      collect:()=>{d.company=$("w-company").value.trim();d.industry=$("w-industry").value;d.product=$("w-product").value.trim();d.target=$("w-target").value.trim();},
      valid:()=>d.company&&d.product?null:"Company name and product are required."};
    case "b-target": return {t:"Who should promote you?",s:`Multi-select everything — ${d.intentsB.size?[...d.intentsB][0].toLowerCase()+" works across many platforms at once.":"you're never limited to one option."}`,h:
      `<div class="frm">
        <div><label>Target countries</label>${wchipsHtml("countries",ALL_COUNTRIES)}</div>
        <div><label>Preferred platforms</label>${wchipsHtml("platforms",ALL_PLATFORMS)}</div>
        <div><label>Desired promotional services</label>${wchipsHtml("services",ALL_SERVICES)}</div>
        <div><label>Creator size ranges</label>${wchipsHtml("sizes",CREATOR_SIZES)}</div></div>`,
      valid:()=>d.platforms.size&&d.services.size?null:"Pick at least one platform and one service."};
    case "b-budget": {
      let extra="";
      if(d.intentsB.has("Looking to offer affiliate partnerships")) extra+=pmIn("w-comm","Default commission % per verified sale",d.commission);
      if(d.intentsB.has("Wanting to run a giveaway")) extra+=pmIn("w-prize","Giveaway prize value (£)",d.prize);
      if(d.intentsB.has("Wanting UGC content")) extra+=pmIn("w-ugc","UGC videos needed",d.ugcCount);
      if(d.intentsB.has("Looking for long-term brand ambassadors")) extra+=`<div><label>Ambassador term</label><select id="w-amb">${["1 month","3 months","6 months","12 months"].map(x=>`<option ${x===d.ambTerm?"selected":""}>${x}</option>`).join("")}</select></div>`;
      return {t:"Budget & payment",s:"Offer several payment methods — you set every amount yourself, and creators pick what suits their audience.",h:
      `<div class="frm"><div class="row2">
        <div><label>Campaign budget (£)</label><input type="number" id="w-budget" value="${esc(d.budget)}"></div>
        <div><label>Campaign duration</label><select id="w-dur">${["2 weeks","4 weeks","6 weeks","3 months","Ongoing"].map(x=>`<option ${x===d.duration?"selected":""}>${x}</option>`).join("")}</select></div></div>
        <div><label>Payment methods you'll offer</label>${wchipsHtml("payMethods",["Fixed payment","Price per view","Affiliate commission","Free product"])}</div>
        ${extra?`<div class="row2">${extra}</div>`:""}</div>`,
      collect:()=>{d.budget=$("w-budget").value; d.duration=$("w-dur").value; if($("w-comm"))d.commission=$("w-comm").value; if($("w-prize"))d.prize=$("w-prize").value; if($("w-ugc"))d.ugcCount=$("w-ugc").value; if($("w-amb"))d.ambTerm=$("w-amb").value;},
      valid:()=>d.payMethods.size?null:"Select at least one payment method."};}
    case "b-review": return {t:"Review your business profile",s:"This is how platform owners will see you. Your first campaign is created from these answers.",h:
      `<div class="review-card"><div class="rvh"><h4>${esc(d.company)}</h4><small>${esc(d.industry)} · ${esc(d.product)}</small></div>
       <div class="rv-rows">
        <div class="rv-row"><span class="k">Goals</span><span class="v">${[...d.intentsB].join(" · ")||"—"}</span></div>
        <div class="rv-row"><span class="k">Target market</span><span class="v">${esc(d.target)}</span></div>
        <div class="rv-row"><span class="k">Target countries</span><span class="v">${[...d.countries].join(", ")||"—"}</span></div>
        <div class="rv-row"><span class="k">Preferred platforms</span><span class="v">${[...d.platforms].join(", ")}</span></div>
        <div class="rv-row"><span class="k">Services wanted</span><span class="v">${[...d.services].join(" · ")}</span></div>
        <div class="rv-row"><span class="k">Creator sizes</span><span class="v">${[...d.sizes].join(", ")||"Any"}</span></div>
        <div class="rv-row"><span class="k">Budget & duration</span><span class="v">${gbp(d.budget||0)} · ${esc(d.duration)}</span></div>
        <div class="rv-row"><span class="k">Payment methods</span><span class="v">${[...d.payMethods].join(" · ")}</span></div>
       </div></div>`,
      nextLabel:"Create my business profile"};
    case "p-intent": return {t:"What brings you to PromoSlot?",s:"Select everything that applies.",h:selCardsHtml("intentsP",PLAT_INTENTS),
      valid:()=>d.intentsP.size?null:"Select at least one."};
    case "p-reg": return {t:W.again?"Register another platform":"Register your first platform",s:"Each platform you control gets its own listing — own audience, own prices, own offers. You can add more afterwards.",h:
      `<div class="frm"><div class="row2">
        <div><label>Platform type</label><select id="w-ptype">${ALL_PLATFORMS.map(p=>`<option ${p===d.pType?"selected":""}>${p}</option>`).join("")}</select></div>
        <div><label>Your brand / display name</label><input type="text" id="w-pbrand" value="${esc(d.pBrand)}"></div></div>
        <div><label>Platform / page name</label><input type="text" id="w-pname" value="${esc(d.pName)}"></div>
        <div><label>Description</label><textarea id="w-pdesc">${esc(d.pDesc)}</textarea></div>
        <div><label>Niche(s)</label>${wchipsHtml("pNiches",ALL_NICHES)}</div></div>`,
      collect:()=>{d.pType=$("w-ptype").value;d.pBrand=$("w-pbrand").value.trim();d.pName=$("w-pname").value.trim();d.pDesc=$("w-pdesc").value.trim();},
      valid:()=>d.pName&&d.pBrand?null:"Brand and platform name are required."};
    case "p-aud": return {t:"Your audience",s:"Businesses filter by these numbers — analytics evidence can be verified later for a ✔ badge.",h:
      `<div class="frm"><div class="row2">
        ${pmIn("w-aud","Audience size",d.aud)}${pmIn("w-views","Average views / opens",d.views)}</div>
        <div class="row2">${pmIn("w-imps","Average impressions",d.imps)}${pmIn("w-er","Engagement / open rate (%)",d.er)}</div>
        <div><label>Audience countries</label>${wchipsHtml("pCountries",ALL_COUNTRIES)}</div>
        <div><label>Audience age ranges</label>${wchipsHtml("ages",ALL_AGES)}</div>
        <div><label>Audience interests</label>${wchipsHtml("interests",["Gym & training","Nutrition","Supplements","Skincare","Makeup","Indie games","PC hardware","Investing","Budgeting","Quick recipes","Meal kits","Dev tools","AI","Parenting","Fashion","Travel"])}</div></div>`,
      collect:()=>{d.aud=$("w-aud").value;d.views=$("w-views").value;d.imps=$("w-imps").value;d.er=$("w-er").value;},
      valid:()=>Number(d.aud)>0?null:"Audience size is required."};
    case "p-serv": return {t:"Services & pricing",s:"Multi-select every service you offer, then attach one or several pricing methods. Every price is yours — set whatever you want, and change it anytime.",h:
      `<div class="frm"><div><label>Available services</label>${wchipsHtml("pServices",ALL_SERVICES)}</div>
      <div><label>Pricing models (select one or more)</label>
      ${pmBox("fixed","Fixed price","e.g. £100 for one promotional video",pmIn("pm-fx-label","Offer name","1 promotional video","text")+pmIn("pm-fx-price","Your price (£)","180"))}
      ${pmBox("per-view","Price per view","Guaranteed minimum + rate per 1,000 verified views",
        pmIn("pm-pv-min","Minimum guaranteed (£)","30")+pmIn("pm-pv-rate","Rate per 1,000 views (£)","8")+pmIn("pm-pv-cap","Maximum campaign payout (£)","250")+pmIn("pm-pv-days","Measurement period (days)","14"))}
      ${pmBox("per-imp","Price per impression","Great for newsletters & communities",pmIn("pm-pi-rate","Rate per 1,000 impressions (£)","5"))}
      ${pmBox("time","Time-based placement","Pinned posts, link-in-bio, banners",
        pmIn("pm-tm-price","Price (£)","40")+`<div><label>Per</label><select id="pm-tm-unit"><option>day</option><option selected>week</option><option>month</option></select></div>`+pmIn("pm-tm-min","Minimum duration","1")+pmIn("pm-tm-max","Maximum duration","4")+`<div><label>Renewal</label><select id="pm-tm-renew"><option selected>Renewable</option><option>Not renewable</option></select></div>`)}
      ${pmBox("affiliate","Affiliate commission","Earn per verified sale or lead",
        pmIn("pm-af-pct","% per verified sale","15")+pmIn("pm-af-lead","Flat per qualified lead (£, optional)","0")+pmIn("pm-af-cookie","Cookie / attribution (days)","30")+pmIn("pm-af-min","Minimum payout (£)","20"))}
      ${pmBox("hybrid","Hybrid","Guaranteed + performance mix",
        pmIn("pm-hy-guar","Guaranteed (£)","50")+pmIn("pm-hy-extra","Plus (e.g. 10% of sales, or £6 per 1,000 views)","10% commission on tracked sales","text"))}
      ${pmBox("custom","Custom quote","Invite businesses to request a personalised proposal","<div style='grid-column:1/-1;font-size:12.5px;color:var(--mut)'>Businesses will see a “Request quote” button on this listing.</div>")}
      </div></div>`,
      collect:collectPricing,
      valid:()=>{ collectPricing(); return d.pServices.size&&d.pricing.length?null:"Pick at least one service and one pricing model."; }};
    case "p-review": {
      const prev=buildMyListing();
      return {t:"Your listing — live preview",s:"Exactly how your card appears in the marketplace. Publish when it looks right.",h:
      `<div class="wiz-preview">${listingCard(prev)}</div>
       <div class="rv-rows boxed">
        <div class="rv-row"><span class="k">Pricing methods</span><span class="v">${d.pricing.map(p=>PM_LABEL[p.type]).join(" · ")}</span></div>
        <div class="rv-row"><span class="k">Services</span><span class="v">${[...d.pServices].slice(0,5).join(" · ")}${d.pServices.size>5?" +"+(d.pServices.size-5):""}</span></div>
        <div class="rv-row"><span class="k">Audience</span><span class="v">${fmtN(Number(d.aud))} · ${fmtN(Number(d.views))} avg views · ${d.er}% engagement</span></div>
       </div>`,
      nextLabel:"Publish listing"};}
  }
}
function collectPricing(){
  const d=W.d; d.pricing=[];
  const on=k=>document.getElementById("pmb-"+k)?.classList.contains("on");
  const v=id=>document.getElementById(id)?.value||"";
  if(on("fixed")) d.pricing.push({key:"fixed",type:"fixed",label:v("pm-fx-label")||"1 promotional post",detail:"1 revision included · draft approval before posting",amount:Number(v("pm-fx-price"))||0});
  if(on("per-view")) d.pricing.push({key:"per-view",type:"per-view",label:"Performance deal — per view",detail:`£${v("pm-pv-min")} minimum guaranteed + £${v("pm-pv-rate")} per 1,000 verified views · measured ${v("pm-pv-days")} days after posting · capped at £${v("pm-pv-cap")}`,amount:Number(v("pm-pv-min"))||0});
  if(on("per-imp")) d.pricing.push({key:"per-imp",type:"per-imp",label:"Per-impression sponsorship",detail:`£${v("pm-pi-rate")} per 1,000 verified impressions · measured at 7 days`,amount:Number(v("pm-pi-rate"))||0});
  if(on("time")) d.pricing.push({key:"time",type:"time",label:`Placement — per ${v("pm-tm-unit")}`,detail:`£${v("pm-tm-price")} per ${v("pm-tm-unit")} · min ${v("pm-tm-min")}, max ${v("pm-tm-max")} ${v("pm-tm-unit")}s · ${v("pm-tm-renew").toLowerCase()}`,amount:Number(v("pm-tm-price"))||0});
  if(on("affiliate")) d.pricing.push({key:"affiliate",type:"affiliate",label:"Affiliate promotion",detail:`${v("pm-af-pct")}% per verified sale${Number(v("pm-af-lead"))?` · £${v("pm-af-lead")} per qualified lead`:""} · ${v("pm-af-cookie")}-day cookie · £${v("pm-af-min")} min payout`,amount:0});
  if(on("hybrid")) d.pricing.push({key:"hybrid",type:"hybrid",label:"Hybrid: guaranteed + performance",detail:`£${v("pm-hy-guar")} guaranteed + ${v("pm-hy-extra")}`,amount:Number(v("pm-hy-guar"))||0});
  if(on("custom")) d.pricing.push({key:"custom",type:"custom",label:"Custom quote",detail:"Invite businesses to request a personalised proposal",amount:0});
}
function buildMyListing(){
  const d=W.d;
  return {id:"my-p"+(S.myPlatforms.length+1),ownerId:"you",owner:"You",brand:d.pBrand,name:d.pName,handle:"@"+d.pName.toLowerCase().replace(/[^a-z0-9]/g,""),
    platform:d.pType,niches:[...d.pNiches],bio:d.pDesc,audience:Number(d.aud)||0,avgViews:Number(d.views)||0,impressions:Number(d.imps)||0,er:Number(d.er)||0,
    countries:[...d.pCountries],ages:[...d.ages],interests:[...d.interests],rating:null,reviewCount:0,verified:false,
    services:[...d.pServices],pricing:d.pricing.map(p=>({type:p.type,label:p.label,detail:p.detail,amount:p.amount})),
    past:[]};
}
function renderWiz(dir){
  const step=W.steps[W.i];
  const def=wizStepHtml(step);
  const pct=Math.round(((W.i+1)/W.steps.length)*100);
  const animCls = dir==="back"?"from-left":dir==="fwd"?"from-right":"";
  openModal(`<div class="m-pad">
    <div class="wiz-prog"><span>Step ${W.i+1} of ${W.steps.length}</span><div class="bar"><i id="wizBar" style="width:${lastPct}%"></i></div>
      <button class="btn-ghost wiz-exit" onclick="if(confirm('Exit setup? Your answers won\\'t be saved.')){closeModal();W=null}">Exit</button></div>
    <div class="wiz-body"><div class="wiz-step ${animCls}"><h3>${def.t}</h3><p class="wsub">${def.s}</p>${def.h}<div class="hint-err hide" id="wizErr"></div></div></div>
    <div class="wiz-foot">
      <button class="btn btn-o" onclick="wizBack()" ${W.i===0?"disabled":""}>← Back</button>
      <button class="btn btn-p ${def.nextLabel?"btn-lg":""}" onclick="wizNext()">${def.nextLabel||"Next →"}</button>
    </div></div>`,"wide",true);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ const b=$("wizBar"); if(b) b.style.width=pct+"%"; }));
  lastPct=pct;
}
function wizBack(){
  const def=wizStepHtml(W.steps[W.i]);
  if(def.collect) try{def.collect()}catch(e){}
  if(W.i>0){W.i--;renderWiz("back");}
}
function wizNext(){
  const step=W.steps[W.i];
  const def=wizStepHtml(step);
  if(def.collect) def.collect();
  const err=def.valid?def.valid():null;
  if(err){
    const e=$("wizErr"); e.textContent=err; e.classList.remove("hide");
    const body=document.querySelector(".wiz-step");
    if(body){ body.classList.remove("shake"); void body.offsetWidth; body.classList.add("shake"); }
    return;
  }
  if(step==="x-order"){
    W.steps = W.d.order==="biz" ? ["x-intent","x-order","b-company","b-target","b-budget","b-review"] : ["x-intent","x-order","p-reg","p-aud","p-serv","p-review"];
  }
  if(step==="b-review"){ finishBiz(); return; }
  if(step==="p-review"){ finishPlat(); return; }
  W.i++; renderWiz("fwd");
}
async function finishBiz(){
  const d=W.d;
  // Local business profile for the dashboard view.
  S.biz={company:d.company,product:d.product,industry:d.industry,target:d.target,intents:[...d.intentsB],countries:[...d.countries],platforms:[...d.platforms],services:[...d.services],sizes:[...d.sizes],budget:Number(d.budget)||0,payMethods:[...d.payMethods],duration:d.duration};
  const pays=[];
  if(d.payMethods.has("Fixed payment")) pays.push({type:"fixed",detail:`£75 fixed per approved post`});
  if(d.payMethods.has("Price per view")) pays.push({type:"per-view",detail:`£5 per 1,000 views (14-day measurement)`});
  if(d.payMethods.has("Affiliate commission")) pays.push({type:"affiliate",detail:`${d.commission||12}% commission per referred sale · 30-day cookie`});
  if(d.payMethods.has("Free product")) pays.push({type:"product",detail:"Free product supplied"});
  const niche=d.industry.includes("Beauty")?"Beauty":d.industry.includes("Fitness")?"Fitness":d.industry.includes("Food")?"Food":d.industry.includes("Fin")?"Finance":d.industry.includes("Gam")?"Gaming":d.industry.includes("parent")||d.industry.includes("Kids")?"Parenting":"Tech";
  const title=`${d.product.split(" ").slice(0,3).join(" ")} — Launch Campaign`;
  const payload={title,industry:d.industry,description:`${d.company} is looking for creators to promote: ${d.product}. ${d.target}.`,
    budget:Number(d.budget)||0,platforms:[...d.platforms],niches:[niche],countries:[...d.countries],services:[...d.services],
    creator_sizes:[...d.sizes],goals:[...d.intentsB],payment:pays,
    deliverables:`${[...d.services].slice(0,2).join(" or ")} featuring the product. Content live ≥ 30 days. Draft approval required.`,
    duration:d.duration,samples:d.payMethods.has("Free product"),
    profile:{product:d.product,target:d.target,payMethods:[...d.payMethods],collabs:"New to PromoSlot"}};
  try{ await PSApi.post("/campaigns",payload); }
  catch(err){ toast(err.message||"Could not publish campaign"); return; }
  await loadMine(); authReflect();
  S.activeRole="biz"; setTheme();
  const created=S.myCampaigns[0];
  const isBothFlow = W.kind==="both" && S.account.is_platform_owner && S.myPlatforms.length===0;
  wizSuccess("Your business profile is live 🎉",`“${created?created.title:title}” has been published to the marketplace — platform owners can now apply, accept your terms, or counter-offer.`, isBothFlow?"plat":null);
}
async function finishPlat(){
  const l=buildMyListing();
  const payload={name:l.name,platform_type:l.platform,handle:l.handle,brand:l.brand,bio:l.bio,niches:l.niches,
    audience:l.audience,avg_views:l.avgViews,impressions:l.impressions,engagement_rate:l.er,
    countries:l.countries,ages:l.ages,interests:l.interests,services:l.services,pricing:l.pricing};
  try{ await PSApi.post("/platforms",payload); }
  catch(err){ toast(err.message||"Could not publish listing"); return; }
  await loadMine(); authReflect();
  S.activeRole="plat"; setTheme();
  const created=S.myPlatforms[0];
  const isBothFlow = W.kind==="both" && S.account.is_business && S.myCampaigns.length===0;
  wizSuccess("Your listing is live 🎉",`“${created?created.name:l.name}” is now visible to every business on PromoSlot. Got another audience? You can list each platform you own as its own separate listing.`, isBothFlow?"biz":null, true);
}
function confettiBurst(host){
  const colors=["#4f46e5","#7c3aed","#059669","#a5b4fc","#f59e0b","#c7d2fe"];
  for(let i=0;i<26;i++){
    const p=document.createElement("i");
    p.className="confetti";
    p.style.left=(38+Math.random()*24)+"%";
    p.style.background=colors[i%colors.length];
    p.style.setProperty("--tx",(Math.random()*320-160)+"px");
    p.style.setProperty("--rz",(Math.random()*540-270)+"deg");
    p.style.animationDelay=(Math.random()*120)+"ms";
    p.style.width=(5+Math.random()*5)+"px";
    p.style.height=(7+Math.random()*7)+"px";
    host.appendChild(p);
    setTimeout(()=>p.remove(),2000);
  }
}
function wizSuccess(title,sub,offerOtherRole,offerAnother){
  openModal(`<div class="m-pad success-wrap" id="successWrap"><div class="success-anim">
    <div class="ring"><svg viewBox="0 0 52 52" width="40" height="40"><path class="tick-path" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" d="M14 27l8 8 16-17"/></svg></div>
    <h3>${esc(title)}</h3><p>${esc(sub)}</p>
    <div class="success-actions">
      ${offerOtherRole?`<button class="btn btn-p btn-lg" onclick="startWizard('${offerOtherRole}')">Set up my ${offerOtherRole==="biz"?"business":"platform-owner"} profile too</button>`:""}
      ${offerAnother?`<button class="btn ${offerOtherRole?"btn-o":"btn-p"}" onclick="closeModal();openRegisterPlatform()">＋ Register another platform</button>`:""}
      <button class="btn btn-o" onclick="closeModal();W=null;syncNav();openDash()">Go to my dashboard →</button>
    </div></div></div>`,"",true);
  const host=$("successWrap"); if(host) confettiBurst(host);
}

/* ==================== VERIFICATION FLOW ==================== */
function openVerify(role){
  const isBiz = role==="biz";
  const items = isBiz
    ? [["🪪","Government ID","Photo ID of a company director"],["📄","Business registration","Companies House number or equivalent"],["🌐","Domain / email","Confirm ownership of your business domain"]]
    : [["📊","Analytics access","Read-only insights or a screen-recording walkthrough"],["🔗","Platform ownership","Verify you control the account/community"],["🪪","Government ID","Photo ID of the account owner"]];
  window._vSel = new Set(items.map(i=>i[2]));
  openModal(`<div class="m-pad"><div class="vf-head"><div class="vf-shield">🛡️</div>
      <div><h3 class="m-title">Get ${isBiz?"business":"analytics"} verified</h3>
      <p class="m-sub" style="margin:4px 0 0">A verified ✔ badge is only granted after a real PromoSlot reviewer checks your evidence by hand. The review team isn't operating yet, so no badge can be issued — and nothing here fakes one.</p></div></div>
    <div class="det-sec" style="margin-top:6px"><h5>What a reviewer will check</h5>
      ${items.map(([ico,t,sub])=>`<label class="vf-item" data-v="${esc(t)}">
        <span class="pi-ico">${ico}</span><div class="vf-body"><b>${esc(t)}</b><small>${esc(sub)}</small></div>
        <input type="checkbox" checked onchange="this.checked?window._vSel.add(this.closest('.vf-item').dataset.v):window._vSel.delete(this.closest('.vf-item').dataset.v);this.closest('.vf-item').classList.toggle('on',this.checked)">
        <span class="vf-check">✓</span></label>`).join("")}</div>
    <div class="vf-upload" id="vfDrop"><span class="vf-up-ico">⬆️</span><div><b>Upload supporting documents</b><small id="vfFileLbl">Document upload opens once verification is live</small></div></div>
    ${pendingPanel("🛡️","Verification isn't available yet","We're onboarding our review team. You can register your interest below; no documents are stored, nothing is charged, and no badge is granted until a real reviewer verifies your evidence.")}
    <div class="m-actions"><button class="btn btn-o" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="runVerify('${role}')">Register interest</button></div></div>`);
  requestAnimationFrame(()=>document.querySelectorAll(".vf-item").forEach(el=>el.classList.add("on")));
}
function vfPick(){ /* upload disabled until file storage + review are live */ }
function runVerify(role){
  const isBiz = role==="biz";
  // A verified badge requires a real human reviewer. That process isn't live, so
  // we never set verified=true or claim a pass here.
  if(!INFRA.humanReview){
    openModal(`<div class="m-pad"><div class="vf-head"><div class="vf-shield">🛡️</div><div><h3 class="m-title">Interest registered — verification pending</h3>
      <p class="m-sub" style="margin:4px 0 0">Thanks. Your ${isBiz?"business":"analytics"} verification request is noted. A real reviewer will check your evidence once the review team is live — no badge is granted, and none is shown, until then.</p></div></div>
      ${pendingPanel("⏳","Awaiting human review","Verification is deliberate and manual. It's never granted automatically, by a timer, or by clicking through this screen.")}
      <div class="m-actions"><button class="btn btn-p" onclick="closeModal();openDash()">Back to dashboard</button></div></div>`,"", false);
    return;
  }
  // (Reachable only once INFRA.humanReview is true and a real reviewer queue exists.)
}

/* ==================== DASHBOARDS ==================== */
function dealRows(){
  if(!S.deals.length) return `<div class="empty-state small">
    <div class="es-ico">🤝</div><h4>No deals yet</h4>
    <p>Open a deal from any listing or campaign — funding, delivery and payout all happen in one protected deal room.</p>
    <button class="btn btn-o btn-sm" onclick="openMarket()">Browse the marketplace</button></div>`;
  return S.deals.map(d=>`<div class="deal-row" onclick="renderDeal('${d.id}');showView('view-deal')">
    ${pfp(d.with,d.plat)}<div><div class="dr-t">${esc(d.title)}</div><div class="dr-s">${esc(d.id)} · with ${esc(d.with)}</div></div>
    <span class="status-pill ${d.paidOut?"st-done":d.funded?"st-escrow":"st-review"}">${esc(d.status)}</span>
    <div class="dr-amt"><b>${gbp(escrowOf(d))}</b><small>${d.funded&&!d.paidOut?"in escrow":d.paidOut?"completed":"proposed"}</small></div></div>`).join("");
}
function notifRows(){
  const base=S.notifications.map(n=>`<div class="notif"><div class="n-ico">${n.ico}</div><div>${esc(n.txt)}<small>${esc(n.t)}</small></div></div>`).join("");
  return base||`<div class="empty">Nothing yet.</div>`;
}
function sparkline(seed,color){
  const n=8, pts=[]; let v=40+(seed%20);
  for(let i=0;i<n;i++){ v += ((seed*(i+3))%17)-7; v=Math.max(12,Math.min(88,v)); pts.push(v); }
  const w=100,h=30, step=w/(n-1);
  const line=pts.map((p,i)=>(i*step).toFixed(1)+","+(h-p/100*h).toFixed(1)).join(" ");
  const area="0,"+h+" "+line+" "+w+","+h;
  return '<svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none"><polygon points="'+area+'" fill="'+color+'" opacity=".08"/><polyline points="'+line+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
function animateKpis(){
  document.querySelectorAll(".kpi .kv[data-to]").forEach(el=>{
    const to=parseFloat(el.dataset.to); if(isNaN(to)) return;
    const pre=el.dataset.pre||"", suf=el.dataset.suf||"", dec=+el.dataset.dec||0;
    const dur=750, t0=performance.now();
    const tick=now=>{ let p=Math.min(1,(now-t0)/dur); p=1-Math.pow(1-p,3);
      const val=to*p; el.textContent=pre+(dec?val.toFixed(dec):Math.round(val).toLocaleString("en-GB"))+suf;
      if(p<1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
}
function kpi(cfg){
  const i=cfg.i,val=cfg.val,to=cfg.to,pre=cfg.pre||"",suf=cfg.suf||"",dec=cfg.dec||0,label=cfg.label,delta=cfg.delta,cls=cfg.cls||"neu",spark=cfg.spark,act=cfg.act;
  const head=(to!=null)?(pre+"0"+suf):val;
  return '<div class="kpi'+(act?" clickable":"")+'" style="--d:'+(i*60)+'ms" '+(act?('onclick="'+act+'"'):"")+'>'
    +'<div class="kpi-top"><div class="kv" data-to="'+(to!=null?to:"")+'" data-pre="'+pre+'" data-suf="'+suf+'" data-dec="'+dec+'">'+head+'</div>'
    +(spark?sparkline((label||"").length+(to||0),spark):"")+'</div>'
    +'<div class="kl">'+label+'</div><div class="kd '+cls+'">'+delta+'</div></div>';
}
function renderBizDash(){
  const b=S.biz;
  const escrowHeld=S.deals.filter(d=>d.funded&&!d.paidOut).reduce((a,d)=>a+escrowOf(d),0);
  const applicants=S.myCampaigns.reduce((a,c)=>a+c.applicants,0);
  $("bizDash").innerHTML=`
    <div class="dash-head"><div class="avatar-dot dash-avatar">${initials(b.company)}</div>
      <div><h2>${esc(b.company)}</h2><div class="sub"><span class="mode-tag">🏢 Business</span> ${esc(b.industry)} · ${b.countries.join(", ")}</div></div>
      <div class="dash-actions">
        <button class="btn btn-o" onclick="openMarket('platforms')">Browse platform listings</button>
        <button class="btn btn-p" onclick="openNewCampaign()">＋ New campaign</button></div></div>
    <div class="kpis">${kpi({i:0,to:S.myCampaigns.length,label:"Live campaigns",delta:S.myCampaigns.length?"↑ published today":"none yet — post one",cls:S.myCampaigns.length?"up":"neu",spark:"#4f46e5",act:"openMarket('campaigns')"})}${kpi({i:1,to:applicants,label:"Applicants",delta:applicants?"↑ new applications":"awaiting first applications",cls:applicants?"up":"neu",spark:"#4f46e5"})}${kpi({i:2,val:escrowHeld?gbp(escrowHeld):"—",to:escrowHeld?escrowHeld:null,pre:"£",label:"Secured in escrow",delta:escrowHeld?"released on verified delivery":"fund a deal to protect it",cls:"neu",spark:"#059669",act:"openMarket('platforms')"})}${kpi({i:3,to:S.deals.filter(d=>d.paidOut).length,label:"Completed deals",delta:"fee only on completion",cls:"neu",spark:"#059669"})}    </div>
    <div class="dash-cols"><div>
      <div class="panel"><div class="panel-h"><h4>Your campaigns</h4><button class="btn btn-o btn-sm" onclick="openMarket('campaigns')">View in marketplace</button></div>
        <div class="panel-b">${S.myCampaigns.length?`<div class="cards tight">${S.myCampaigns.map((c,i)=>campaignCard(c,i)).join("")}</div>`:`<div class="empty-state"><div class="es-ico">📢</div><h4>No campaigns yet</h4><p>Publish a campaign describing what you want promoted and what you'll pay — platform owners apply to you.</p><button class="btn btn-p btn-sm" onclick="openNewCampaign()">＋ Post your first campaign</button></div>`}</div></div>
      <div class="panel"><div class="panel-h"><h4>Your deals</h4><button class="btn btn-o btn-sm" onclick="openMarket('platforms')">Start a deal</button></div><div class="panel-b">${dealRows()}</div></div>
    </div><div>
      <div class="panel"><div class="panel-h"><h4>Activity</h4></div><div class="panel-b">${notifRows()}</div></div>
      <div class="panel"><div class="panel-h"><h4>Your public profile</h4><button class="btn btn-o btn-sm" onclick="startWizard('biz')">Edit</button></div>
        <div class="panel-b mini-rows">
          <div><span>Product</span><b>${esc(b.product)}</b></div>
          <div><span>Budget</span><b>${gbp(b.budget)}</b></div>
          <div><span>Payment methods</span><b style="text-align:right">${b.payMethods.join(" · ")}</b></div>
          <div><span>Verification</span><button class="btn btn-o btn-sm" onclick="S.biz.verified?toast('Your business is already verified ✔',true):openVerify('biz')">${S.biz.verified?"Verified ✔":"Get verified ✔"}</button></div>
        </div></div>
      <div class="panel"><div class="panel-h"><h4>Suggested for you</h4></div><div class="panel-b">
        ${allListings().filter(l=>l.ownerId!=="you"&&(b.platforms.includes(l.platform))).slice(0,3).map(l=>`<div class="op-row" style="margin-bottom:8px" onclick="openListing('${l.id}')">${pfp(l.name,l.platform)}<div><b>${esc(l.name)}</b><small>${l.platform} · ${fmtN(l.audience)}${priceFrom(l)?" · from "+gbp(priceFrom(l)):""}</small></div><span class="op-go">View →</span></div>`).join("")}
      </div></div>
    </div></div>`;
  requestAnimationFrame(animateKpis);
}
function renderPlatDash(){
  const earned=S.deals.filter(d=>d.paidOut).reduce((a,d)=>a+grossOf(d)*0.8,0);
  const brand=S.myPlatforms[0]?S.myPlatforms[0].brand:"Your brand";
  const myNiches=[...new Set(S.myPlatforms.flatMap(p=>p.niches))];
  const matches=allCampaigns().filter(c=>!c.id.startsWith("my-")&&(c.niches.some(n=>myNiches.includes(n))||!myNiches.length)).slice(0,3);
  $("platDash").innerHTML=`
    <div class="dash-head"><div class="avatar-dot dash-avatar">${initials(brand)}</div>
      <div><h2>${esc(brand)}</h2><div class="sub"><span class="mode-tag">📣 Platform owner</span> ${S.myPlatforms.length} listing${S.myPlatforms.length===1?"":"s"} live</div></div>
      <div class="dash-actions">
        <button class="btn btn-o" onclick="openMarket('campaigns')">Browse campaigns</button>
        <button class="btn btn-p" onclick="openRegisterPlatform()">＋ Register another platform</button></div></div>
    <div class="kpis">${kpi({i:0,to:S.myPlatforms.length,label:"Live listings",delta:S.myPlatforms.length?"live in the marketplace":"list one to get seen",cls:S.myPlatforms.length?"up":"neu",spark:"#059669",act:"openMarket('campaigns')"})}${kpi({i:1,val:earned?gbp(Math.round(earned)):"—",to:earned?Math.round(earned):null,pre:"£",label:"Earned (after 10% seller fee)",delta:earned?"paid via escrow":"complete a deal to earn",cls:earned?"up":"neu",spark:"#4f46e5"})}${kpi({i:2,to:S.deals.filter(d=>d.funded&&!d.paidOut).length,label:"Deals in escrow",delta:"funds secured before you work",cls:"neu",spark:"#4f46e5"})}${kpi({i:3,val:"—",label:"Your rating",delta:"appears after your first completed deal",cls:"neu",spark:"#059669"})}    </div>
    <div class="dash-cols"><div>
      <div class="panel"><div class="panel-h"><h4>Your platform listings</h4><button class="btn btn-o btn-sm" onclick="openRegisterPlatform()">＋ Add platform</button></div>
        <div class="panel-b">${S.myPlatforms.length?`<div class="cards tight">${S.myPlatforms.map((l,i)=>listingCard(l,i)).join("")}</div>`:`<div class="empty-state"><div class="es-ico">📣</div><h4>No listings yet</h4><p>Register each platform you control — its own audience, services and prices.</p><button class="btn btn-p btn-sm" onclick="openRegisterPlatform()">＋ Register a platform</button></div>`}
        ${S.myPlatforms.length&&S.myPlatforms.length<3?`<div class="note blue" style="margin-top:14px">💡 Owners with multiple listings get seen by more campaigns — list each platform you own separately, each with its own audience and prices. <a href="#" onclick="openRegisterPlatform();return false">Register another platform →</a></div>`:""}</div></div>
      <div class="panel"><div class="panel-h"><h4>Your deals</h4><button class="btn btn-o btn-sm" onclick="openMarket('campaigns')">Find campaigns</button></div><div class="panel-b">${dealRows()}</div></div>
    </div><div>
      <div class="panel"><div class="panel-h"><h4>Activity</h4></div><div class="panel-b">${notifRows()}</div></div>
      <div class="panel"><div class="panel-h"><h4>Campaigns matching your niches</h4></div><div class="panel-b">
        ${matches.map(c=>`<div class="op-row" style="margin-bottom:8px" onclick="openCampaign('${c.id}')">${pfp(c.company,null)}<div><b>${esc(c.title)}</b><small>${esc(c.company)} · ${c.budget?gbp(c.budget)+" budget":"commission"}</small></div><span class="op-go">Apply →</span></div>`).join("")}
      </div></div>
      <div class="panel"><div class="panel-h"><h4>Verification</h4></div><div class="panel-b mini-rows">
        <div><span>Analytics evidence</span><b>${S.myPlatforms.some(p=>p.verified)?'<span style="color:var(--money)">Verified ✔</span>':"Self-reported"}</b></div>
        <div><span>Verified listings win more deals</span><button class="btn btn-o btn-sm" onclick="S.myPlatforms.some(p=>p.verified)?toast('Your listings are already verified ✔',true):openVerify('plat')">${S.myPlatforms.some(p=>p.verified)?"Verified ✔":"Get verified ✔"}</button></div>
      </div></div>
      <div class="panel"><div class="panel-h"><h4>Payout settings</h4></div><div class="panel-b mini-rows">
        <div><span>Payout method</span><b class="mut">Not connected yet</b></div>
        <div><span>Marketplace fee</span><b>10% seller fee (+5% buyer at checkout)</b></div>
        <div><span>Connect payouts</span><button class="btn btn-o btn-sm" onclick="toast('Payouts run on Stripe Connect, which isn\\'t live yet — you\\'ll connect a bank account here before your first payout')">Set up later</button></div>
      </div></div>
    </div></div>`;
  requestAnimationFrame(animateKpis);
}
function openNewCampaign(){
  if(!S.biz){ startWizard("biz"); return; }
  W={kind:"biz",d:defW(),i:0,steps:["b-intent","b-company","b-target","b-budget","b-review"]}; lastPct=0;
  const b=S.biz; const d=W.d;
  d.company=b.company; d.product=b.product; d.industry=b.industry; d.target=b.target;
  d.intentsB=new Set(b.intents); d.countries=new Set(b.countries); d.platforms=new Set(b.platforms); d.services=new Set(b.services); d.sizes=new Set(b.sizes); d.budget=String(b.budget); d.payMethods=new Set(b.payMethods); d.duration=b.duration;
  W.i=0; renderWiz("fwd"); toast("Campaign builder — prefilled from your profile");
}

/* ==================== NOTIFICATIONS ==================== */
const NOTIF_FEED=[
 {ico:"🚀",tag:"Founding cohort",txt:"PromoSlot is now open to its founding cohort — real listings and campaigns appear here as members join."},
 {ico:"📣",tag:"New offer",txt:"See how a complete platform-owner listing looks — open the Example Creator profile.",ref:"px-ex"},
 {ico:"🏢",tag:"New campaign",txt:"See how a complete business campaign looks — open the Example Campaign.",ref:"cx-ex"}
];
let notifUnread=1, notifOpen=false;
function bellSync(){
  const b=$("bellCnt"); if(!b) return;
  b.classList.toggle("hide",notifUnread<=0);
  b.textContent=notifUnread>9?"9+":notifUnread;
}
function pushNotif(item,quiet){
  NOTIF_FEED.unshift(item);
  if(!notifOpen) notifUnread++;
  bellSync();
  if(notifOpen) renderNotifPop();
  if(!quiet) toast(item.txt);
}
function tagCls(tag){ return tag==="Price drop"?"grn":tag==="New campaign"?"amb":tag==="New offer"?"ind":""; }
function renderNotifPop(){
  const personal=S.notifications.map(n=>({ico:n.ico,tag:"Your account",txt:n.txt,t:n.t}));
  const items=personal.concat(NOTIF_FEED);
  $("notifPop").innerHTML=`<div class="np-head"><h4>Notifications</h4><span class="mut" style="font-size:12px">Offers & changes from both sides of the marketplace</span></div>
  <div class="np-list">${items.map(n=>`<div class="np-item ${n.ref?"clickable":""}" ${n.ref?`onclick="openNotif('${n.ref}')"`:""}><div class="n-ico">${n.ico}</div>
    <div class="np-body"><span class="tag ${tagCls(n.tag)} np-tag">${esc(n.tag)}</span>
    <div class="np-txt">${esc(n.txt)}</div><small>${esc(n.t)}${n.ref?' · <span class="np-go">View →</span>':""}</small></div></div>`).join("")}</div>`;
}
function openNotif(ref){
  toggleNotifs(false);
  if(findListing(ref)) openListing(ref);
  else if(findCampaign(ref)) openCampaign(ref);
}
function toggleNotifs(force){
  notifOpen = force!==undefined?force:!notifOpen;
  const p=$("notifPop");
  p.classList.toggle("hide",!notifOpen);
  if(notifOpen){ renderNotifPop(); notifUnread=0; bellSync(); }
}

/* ==================== REAL AUTH (backend) ==================== */
function authReflect(){
  const a = S.account;
  if(a){
    const roles=[]; if(a.is_business)roles.push("biz"); if(a.is_platform_owner)roles.push("plat");
    S.roles=roles;
    if(!roles.includes(S.activeRole)) S.activeRole=roles[0]||null;
  } else {
    S.roles=[]; S.activeRole=null; S.biz=null; S.myPlatforms=[]; S.myCampaigns=[];
  }
  syncNav();  // toggles roleSwitch / dashboard / userChip / get-started from S.roles
  $("nav-login").classList.toggle("hide", !!a);
  $("nav-logout").classList.toggle("hide", !a);
  if(a){
    $("userChip").classList.remove("hide");
    $("userInit").textContent=(a.display_name||a.email||"?").slice(0,1).toUpperCase();
    $("userName").textContent=a.display_name||a.email;
  }
}
async function loadMine(){
  if(!S.account){ S.myPlatforms=[]; S.myCampaigns=[]; return; }
  try{ S.myPlatforms = S.account.is_platform_owner ? await PSApi.get("/platforms/mine") : []; }catch(e){ S.myPlatforms=[]; }
  try{ S.myCampaigns = S.account.is_business ? await PSApi.get("/campaigns/mine") : []; }catch(e){ S.myCampaigns=[]; }
}
function authModal(mode){
  const isSignup = mode==="signup";
  openModal(`<div class="m-pad">
    <h3 class="m-title">${isSignup?"Create your PromoSlot account":"Log in"}</h3>
    <p class="m-sub">${isSignup?"One account — choose one or both roles.":"Welcome back."}</p>
    <div class="frm">
      ${isSignup?`<div><label>Display name</label><input type="text" id="au-name" placeholder="Robert Media"></div>`:""}
      <div><label>Email</label><input type="text" id="au-email" placeholder="you@example.com"></div>
      <div><label>Password</label><input type="password" id="au-pass" placeholder="${isSignup?"At least 8 characters":"Your password"}" onkeydown="if(event.key==='Enter'){${isSignup?"doSignup":"doLogin"}()}"></div>
      ${isSignup?`<div><label>I am a…</label><div class="chips-lg">
        <button type="button" class="chip" id="au-r-biz" onclick="this.classList.toggle('on')">🏢 Business</button>
        <button type="button" class="chip" id="au-r-plat" onclick="this.classList.toggle('on')">📣 Platform owner</button>
      </div></div>`:""}
      <div class="hint-err hide" id="au-err"></div>
    </div>
    <div class="m-actions">
      <button class="btn btn-ghost" onclick="authModal('${isSignup?"login":"signup"}')">${isSignup?"Have an account? Log in":"Need an account? Sign up"}</button>
      <button class="btn btn-p" id="au-submit" onclick="${isSignup?"doSignup":"doLogin"}()">${isSignup?"Create account":"Log in"}</button>
    </div></div>`,"narrow");
}
function _authErr(msg){ const e=$("au-err"); if(e){ e.textContent=msg; e.classList.remove("hide"); } }
async function doSignup(){
  const email=($("au-email").value||"").trim(), password=$("au-pass").value||"";
  const display_name=($("au-name").value||"").trim();
  const is_business=$("au-r-biz").classList.contains("on");
  const is_platform_owner=$("au-r-plat").classList.contains("on");
  if(!email||!password){ _authErr("Email and password are required."); return; }
  if(!is_business && !is_platform_owner){ _authErr("Select at least one role."); return; }
  const btn=$("au-submit"); btn.disabled=true; btn.textContent="Creating…";
  try{
    S.account=await PSApi.signup({email,password,display_name:display_name||null,is_business,is_platform_owner});
    closeModal(); authReflect(); await loadMine(); authReflect(); toast("Account created — you're signed in",true);
    _resumeAfterAuth();
  }catch(err){ btn.disabled=false; btn.textContent="Create account"; _authErr(err.message||"Signup failed"); }
}
async function doLogin(){
  const email=($("au-email").value||"").trim(), password=$("au-pass").value||"";
  if(!email||!password){ _authErr("Email and password are required."); return; }
  const btn=$("au-submit"); btn.disabled=true; btn.textContent="Logging in…";
  try{
    S.account=await PSApi.login({email,password});
    closeModal(); authReflect(); await loadMine(); authReflect(); toast("Logged in",true);
    _resumeAfterAuth();
  }catch(err){ btn.disabled=false; btn.textContent="Log in"; _authErr(err.message||"Login failed"); }
}
async function doLogout(){
  try{ await PSApi.logout(); }catch(e){}
  S.account=null; authReflect(); goHome(); toast("Logged out");
}
async function restoreSession(){
  try{ S.account=await PSApi.me(); await loadMine(); }catch(e){ S.account=null; }
  authReflect();
}

/* ==================== BOOT ==================== */
const NAV_ACTIONS={
  "home":()=>goHome(),
  "get-started":()=>authModal("signup"),
  "login":()=>authModal("login"),
  "logout":()=>doLogout(),
  "market":()=>openMarket(),
  "market-platforms":()=>openMarket("platforms"),
  "market-campaigns":()=>openMarket("campaigns"),
  "how":()=>goHow(),
  "messages":()=>openMessages(),
  "notifs":()=>toggleNotifs(),
  "dash":()=>openDash(),
  "wiz-biz":()=>startWizard("biz"),
  "wiz-plat":()=>startWizard("plat"),
  "wiz-both":()=>startWizard("both"),
  "role-biz":()=>switchRole("biz"),
  "role-plat":()=>switchRole("plat"),
  "market-cta":()=>marketCtaClick(),
  "toast-terms":()=>toast("Terms of Service — demo link"),
  "toast-privacy":()=>toast("Privacy Policy — demo link"),
  "toast-fees":()=>toast("Fees: 10% seller fee + 5% buyer protection fee, on the agreed price. No listing fees.")
};
function PSBoot(){
  renderMiniMarket();
  syncNav();
  restoreSession();
  loadMarket().then(renderMiniMarket);  // refresh peek with real listings
  document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&!modalLock) closeModal(); });
  document.addEventListener("click",e=>{
    const el=e.target.closest("[data-act]");
    if(el && NAV_ACTIONS[el.dataset.act]){ e.preventDefault(); NAV_ACTIONS[el.dataset.act](); return; }
    if(notifOpen && !e.target.closest("#notifPop") && !e.target.closest("#navBell")) toggleNotifs(false);
  });
  bellSync();
}
window.PSBoot=PSBoot;

const EXPORTS={PSBoot,overlayClick,renderMarket,setMarketTab,toggleFilters,toggleFilter,resetFilters,buildFilters,openMarket,marketCtaClick,openListing,openCampaign,openChat,sendChat,requestQuote,sendQuoteReq,buyOffer,applyCampaign,renderDeal,showView,dealNext,approveMine,counterOffer,sendCounter,cancelDeal,fundDeal,submitProof,openDispute,leaveReview,startWizard,openRegisterPlatform,renderWiz,wizBack,wizNext,openNewCampaign,openDash,switchRole,goHome,goHow,closeModal,toast,syncNav,openMessages,openConv,renderMessages,sendInboxMsg,toggleNotifs,pushNotif,openNotif,openVerify,runVerify,vfPick,animateKpis,authModal,doSignup,doLogin,doLogout};
Object.assign(window,EXPORTS);
window.S=S;
Object.defineProperty(window,"W",{get:()=>W,set:v=>{W=v}});
})();
