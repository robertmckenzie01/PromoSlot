(function(){
if(window.PSBoot) return;
/* PromoSlot app logic — visual/interaction upgrade layer. Flows, fields and IA are final (per brief). */

/* ============================================================
   SUPPORT CONTACT DETAILS — PLACEHOLDERS.
   Swap these three values for the real details a few days before launch.
   This is the ONLY place to change them (rendered into the footer).
   ============================================================ */
const SUPPORT_INFO = {
  email:   "[Business Email — placeholder]",
  mobile:  "[Mobile Number — placeholder]",
  address: "[Business Address — placeholder]",
};
function renderFooterSupport(){
  const el=document.getElementById("footerSupport"); if(!el) return;
  el.innerHTML=`
    <div class="fs-row"><span>Business Email:</span> ${esc(SUPPORT_INFO.email)}</div>
    <div class="fs-row"><span>Mobile Number:</span> ${esc(SUPPORT_INFO.mobile)}</div>
    <div class="fs-row"><span>Business Address:</span> ${esc(SUPPORT_INFO.address)}</div>`;
}

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
 {name:"Hannah W.",co:"Bloom Cosmetics",stars:5,text:"Delivered exactly what the agreement said — post went live on time, stayed up, analytics screenshots without us chasing. Payment Protection made it painless."},
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
  notifications:[], marketTab:"platforms", filters:null, dealSeq:1,
  convos:[], activeConv:null, activeThread:null,
  attn:{unread:0,review_pending:0,awaiting_payout:0},
  perms:[], myRole:"USER"
};
function resetFilters(){
  S.filters = {q:"",platforms:new Set(),niches:new Set(),services:new Set(),countries:new Set(),pay:new Set(),min:"",max:""};
}
resetFilters();
const $ = id => document.getElementById(id);
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmtN = n => n>=1e6 ? (n/1e6).toFixed(1).replace(/\.0$/,"")+"M" : n>=1e3 ? (n/1e3).toFixed(n<1e4?1:0).replace(/\.0$/,"")+"K" : String(n);
const gbp = n => "£"+Number(n).toLocaleString("en-GB",{maximumFractionDigits:2}).replace(/\.00$/,"");
const gbpP = pence => "£"+(Number(pence||0)/100).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2});

function toast(msg,grn){
  const t=document.createElement("div"); t.className="toast"+(grn?" grn":"");
  t.innerHTML=`<span class="toast-ico">${grn?"✓":"ℹ"}</span><span>${esc(msg)}</span>`;
  $("toasts").appendChild(t);
  setTimeout(()=>{t.classList.add("out");setTimeout(()=>t.remove(),380)},3400);
}
function starsHtml(r,c){ if(r==null||c==null||c===0||c==="New"){ return `<span class="stars no-rating">No ratings yet</span>`; } return `<span class="stars">★ ${Number(r).toFixed(1)} <span class="rc">(${c})</span></span>`; }
function initials(name){ return String(name||"?").split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase(); }
// Identity avatar: the member's real uploaded profile picture when they have
// one, falling back to initials. (Listing/campaign cover images are a separate,
// optional feature — see image_url — and never replace the identity avatar.)
function pfp(name,platform,cls,avatarUrl){
  if(avatarUrl) return `<div class="pfp ${cls||""} has-img" style="background-image:url('${avatarUrl}')"></div>`;
  const col = platform ? PLATFORM_META[platform].color : "var(--acc)";
  return `<div class="pfp ${cls||""}" style="background:${col}">${esc(initials(name))}</div>`;
}
function pbadge(p){ const m=PLATFORM_META[p]; return `<span class="pbadge" style="background:${m.color}14;color:${m.color}">${m.ico} ${p}</span>`; }
function exWrap(inner,is){ return is?`<div class="pfp-wrap">${inner}<span class="ex-badge">EXAMPLE</span></div>`:inner; }
function priceFrom(l){ const ps=(l.pricing||[]).filter(p=>p.amount>0); return ps.length?Math.min(...ps.map(p=>p.amount)):0; }

// The headline price tag. A listing can carry several pricing models, and
// `amount` means a different thing in each (see PM_MODELS): a fixed price, a
// guaranteed minimum, or a rate. Taking a blind Math.min across all of them let
// a £0.05-per-view RATE outrank a £150 fixed PRICE, so this picks by type:
// a real fixed price first, then any other guaranteed £ floor, then a rate, and
// only says "Quote" when nothing structured exists at all.
function _pmNum(p,re){ const m=String(p&&p.detail||"").match(re); return m?Number(m[1]):0; }
function priceTagText(l){
  const ps=(l.pricing||[]).filter(p=>p&&p.type);
  const lowest=t=>{ const v=ps.filter(p=>p.type===t&&Number(p.amount)>0).map(p=>Number(p.amount));
                    return v.length?Math.min(...v):0; };

  const fixed=lowest("fixed");
  if(fixed) return `From ${gbp(fixed)}`;
  // hybrid / time / per-view all expose a guaranteed £ floor in `amount`.
  const floor=Math.min(...["hybrid","time","per-view"].map(lowest).filter(v=>v>0), Infinity);
  if(floor!==Infinity) return `From ${gbp(floor)}`;

  // No floor — fall back to the rate, which only lives in the detail string.
  const pv=ps.find(p=>p.type==="per-view");
  const pvRate=_pmNum(pv,/£([\d.]+)\s*per\s*1,?000\s*views/i);
  if(pvRate) return `From ${gbp(pvRate)}/1k views`;
  const aff=ps.find(p=>p.type==="affiliate");
  const pct=_pmNum(aff,/([\d.]+)%/);
  if(pct) return `${pct}% commission`;
  const pi=ps.find(p=>p.type==="per-imp"&&Number(p.amount)>0);
  if(pi) return `From ${gbp(Number(pi.amount))}/1k impressions`;

  return "Quote";
}
function priceFromHtml(l){
  const t=priceTagText(l);
  return t==="Quote" ? `<b class="quote-only">Quote</b>` : `<b>${esc(t)}</b>`;
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
  setRoute("home");
  showView("view-landing");
  if(scrollRoles && S.roles.length){ openDash(); return; }
  if(scrollRoles) setTimeout(()=>smoothTo($("roleCards")),80);
}
function goHow(){ showView("view-landing"); setTimeout(()=>smoothTo($("sec-how")),80); }
async function openDash(){
  if(!S.account){ authModal("login"); return; }
  if(!S.roles.includes(S.activeRole)) S.activeRole=S.roles[0];
  setRoute("dash");
  // Switch the view FIRST. This used to run only after every fetch resolved, so
  // "Go to my dashboard" appeared to do nothing until the slowest call returned —
  // and if the user had navigated away by then, it yanked them back.
  showView(S.activeRole==="biz"?"view-bizdash":"view-platdash");
  // These six calls are independent; they were awaited one after another.
  await Promise.all([
    loadMine(),
    loadDeals(),
    loadNotifications(),
    PSApi.get(`/users/${S.account.id}/reviews`).then(r=>{S.myRating=r;}).catch(()=>{S.myRating=null;}),
  ]);
  if(S.activeRole==="biz" && !S.biz){
    S.biz={company:S.account.display_name||S.account.email,product:"—",industry:"—",target:"",
      intents:[],countries:[],platforms:[],services:[],sizes:[],budget:0,payMethods:[],duration:"—"};
  }
  if(S.activeRole==="biz") renderBizDash(); else renderPlatDash();
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
// Own listings/campaigns are included deliberately: a suspended item is filtered
// out of the marketplace feed, so without this it exists in NO lookup list — and
// a "your listing was suspended" notification pointing at it resolved to nothing,
// making the click silently dead. De-duplicated by id, own copy wins (it is the
// one fetched with the owner's own permissions).
function _byId(...lists){
  const seen=new Map();
  lists.forEach(l=>(l||[]).forEach(x=>{ if(x && x.id!=null && !seen.has(x.id)) seen.set(x.id,x); }));
  return [...seen.values()];
}
function allListings(){ return _byId(S.myPlatforms, S.marketPlatforms, LISTINGS); }
function allCampaigns(){ return _byId(S.myCampaigns, S.marketCampaigns, CAMPAIGNS); }
async function loadMarket(){
  await Promise.all([
    PSApi.get("/platforms").then(r=>{S.marketPlatforms=r;}).catch(()=>{S.marketPlatforms=[];}),
    PSApi.get("/campaigns").then(r=>{S.marketCampaigns=r;}).catch(()=>{S.marketCampaigns=[];}),
  ]);
}

async function openMarket(tab){
  if(tab && typeof tab==="string") S.marketTab=tab;
  setRoute("market", S.marketTab);
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
  const map={fixed:"Fixed price","per-view":"Per view","per-imp":"Per impression",time:"Time-based",affiliate:"Affiliate",hybrid:"Hybrid",product:"Free product",giveaway:"Giveaway prize"};
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
function listingCard(l,i,owned){
  return `<article class="lcard${l.example?" example-card":""}" style="--d:${(i||0)*40}ms" onclick="openListing('${l.id}')" tabindex="0" onkeydown="if(event.key==='Enter')openListing('${l.id}')">
    <div class="lcard-top">${exWrap(pfp(l.name,l.platform,"",l.ownerAvatar),l.example)}
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
    ${owned?`<div style="margin-top:10px"><button class="btn btn-o btn-sm" onclick="event.stopPropagation();openEditListing('${l.id}')">✏️ Edit listing</button></div>`:""}
  </article>`;
}
function campaignCard(c,i,owned){
  return `<article class="lcard${c.example?" example-card":""}" style="--d:${(i||0)*40}ms" onclick="openCampaign('${c.id}')" tabindex="0" onkeydown="if(event.key==='Enter')openCampaign('${c.id}')">
    <div class="ccard-head">${exWrap(pfp(c.company,null,"",c.companyAvatar),c.example)}
      <div class="who" style="min-width:0"><h4 style="font-size:15px">${esc(c.title)}</h4>
        <div class="handle">${esc(c.company)} ${c.verified?'<span class="vtick">✔︎ Verified</span>':""} · ${esc(c.industry)}</div></div>
      <div class="ccard-budget"><b>${c.budget?gbp(c.budget):"Commission"}</b><span>${c.budget?"budget":"only"}</span></div>
    </div>
    <div class="tagrow">${c.platforms.map(p=>`<span class="tag">${PLATFORM_META[p].ico} ${p}</span>`).join("")}</div>
    <div class="payrow">${c.payment.map(p=>`<div><span class="pico">💷</span>${esc(p.detail)}</div>`).join("")}</div>
    <div class="lcard-bot">
      <span class="applied-line">${starsHtml(c.rating,c.reviewCount)} · ${c.applicants} applicants</span>
      ${owned?`<button class="btn btn-o btn-sm" onclick="event.stopPropagation();openEditCampaign('${c.id}')">✏️ Edit</button>`:""}
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
async function openListing(id,tab){
  const l=findListing(id); if(!l) return;
  const fresh = !$("overlay").classList.contains("open");
  if(fresh) openModal(detSkeleton(),"wide");
  // Fetch real listings' media (My Work + Past campaigns) once, cache on l.
  if(!l.example && /^p\d+$/.test(String(l.id))){
    const pid=String(l.id).slice(1);
    if(!l._media){
      try{ const all=await PSApi.get(`/platforms/${pid}/media`);
        l._media={work:all.filter(m=>m.kind==="work"),past:all.filter(m=>m.kind==="past_campaign")}; }
      catch(e){ l._media={work:[],past:[]}; }
    }
    // Reviews are fetched fresh every open so a just-left review shows immediately.
    try{ l._reviews=await PSApi.get(`/users/${l.ownerId}/reviews`); }
    catch(e){ l._reviews=l._reviews||{count:0,average:null,reviews:[]}; }
    // Completed deals auto-populate Past campaigns — refreshed on every open.
    try{ l._pastAuto=await PSApi.get(`/platforms/${pid}/past-campaigns`); }
    catch(e){ l._pastAuto=l._pastAuto||[]; }
  }
  renderListingModal(l,tab);
}
// A single My Work slot: an uploaded video OR a link to hosted content with its
// own cover image. Both video and cover accept click OR drag-and-drop.
function workSlotHtml(idx){
  return `<div class="work-slot" data-idx="${idx}">
    <div><label>Caption</label><input type="text" id="wk-title-${idx}" placeholder="e.g. Hypertrophy reel — my editing style"></div>
    <div class="row2">
      <div><label>Video · mp4 / webm / mov, up to 200MB</label>
        <div class="dropzone" id="wk-vdz-${idx}" ondragover="event.preventDefault();this.classList.add('drag')" ondragleave="this.classList.remove('drag')" ondrop="wkDrop(event,${idx},'video')">
          <input type="file" id="wk-video-${idx}" class="pf-file-input" accept="video/mp4,video/webm,video/quicktime" onchange="wkFileName(${idx},'video')">
          <span class="dz-text" id="wk-vdzt-${idx}">Drag &amp; drop a video, or <label for="wk-video-${idx}" class="dz-link">select</label></span>
        </div></div>
      <div><label>…or a link to hosted content</label>
        <input type="text" id="wk-link-${idx}" placeholder="https://youtube.com/watch?v=…">
        <div class="dropzone" id="wk-cdz-${idx}" ondragover="event.preventDefault();this.classList.add('drag')" ondragleave="this.classList.remove('drag')" ondrop="wkDrop(event,${idx},'cover')">
          <input type="file" id="wk-cover-${idx}" class="cover-file-input" onchange="wkFileName(${idx},'cover')">
          <span class="dz-text" id="wk-cdzt-${idx}">Cover image — drag &amp; drop or <label for="wk-cover-${idx}" class="dz-link">select</label></span>
        </div></div>
    </div></div>`;
}
function addWorkSlot(){
  const wrap=$("wk-slots"); if(!wrap) return;
  wrap.insertAdjacentHTML("beforeend", workSlotHtml(wrap.querySelectorAll(".work-slot").length));
}
function wkDrop(e,idx,which){
  e.preventDefault(); const dz=$((which==="video"?"wk-vdz-":"wk-cdz-")+idx); if(dz) dz.classList.remove("drag");
  const f=e.dataTransfer&&e.dataTransfer.files;
  if(f&&f.length){ try{ $((which==="video"?"wk-video-":"wk-cover-")+idx).files=f; }catch(_){} wkFileName(idx,which); }
}
function wkFileName(idx,which){
  const isV=which==="video";
  const inp=$((isV?"wk-video-":"wk-cover-")+idx), t=$((isV?"wk-vdzt-":"wk-cdzt-")+idx); if(!inp||!t) return;
  const f=inp.files[0], forId=(isV?"wk-video-":"wk-cover-")+idx;
  const empty=isV?`Drag &amp; drop a video, or <label for="${forId}" class="dz-link">select</label>`
                 :`Cover image — drag &amp; drop or <label for="${forId}" class="dz-link">select</label>`;
  t.innerHTML = f ? `📎 ${esc(f.name)} — <label for="${forId}" class="dz-link">change</label>` : empty;
}
async function uploadWork(listingId){
  const l=findListing(listingId); if(!l) return;
  const pid=String(l.id).slice(1);
  const err=$("md-err"); if(err) err.classList.add("hide");
  const jobs=[];
  document.querySelectorAll("#wk-slots .work-slot").forEach(s=>{
    const idx=s.dataset.idx;
    const title=(($("wk-title-"+idx)||{}).value||"").trim();
    const video=($("wk-video-"+idx)||{files:[]}).files[0];
    const link=(($("wk-link-"+idx)||{}).value||"").trim();
    const cover=($("wk-cover-"+idx)||{files:[]}).files[0];
    if(video || link) jobs.push({title,video,link,cover});
  });
  if(!jobs.length){ if(err){err.textContent="Add a video or a link for at least one sample.";err.classList.remove("hide");} return; }
  const btn=$("md-btn"); if(btn){ btn.disabled=true; btn.innerHTML=`<span class="spin"></span> Uploading…`; }
  try{
    for(const j of jobs){
      const fd=new FormData(); fd.append("kind","work");
      if(j.title) fd.append("title",j.title);
      if(j.video){ fd.append("video",j.video); }
      else { fd.append("link_url",j.link); if(j.cover) fd.append("cover",j.cover); }
      await PSApi.postForm(`/platforms/${pid}/media`, fd);
    }
  }catch(e){ if(btn){btn.disabled=false;btn.textContent="Upload";} if(err){err.textContent=e.message||"Upload failed";err.classList.remove("hide");} return; }
  toast(jobs.length>1?`${jobs.length} work samples added`:"Work sample added",true);
  l._media=null;
  openListing(l.id,"work");
}
/* ============ EDIT A PUBLISHED LISTING / CAMPAIGN (from the dashboard) ============ */
function editChips(field,opts){
  const sel=S._edit.sets[field];
  return `<div class="f-chips">${opts.map(o=>`<button type="button" class="chip ${sel.has(o)?"on":""}" data-v="${esc(o)}"
    onclick="const s=S._edit.sets['${field}'];s.has(this.dataset.v)?s.delete(this.dataset.v):s.add(this.dataset.v);this.classList.toggle('on')">${esc(o)}</button>`).join("")}</div>`;
}
function editPriceRow(i,p){
  p=p||{type:"fixed",label:"",detail:"",amount:0};
  return `<div class="pm-slot" data-idx="${i}">
    <div class="row2">
      <div><label>Type</label><select id="ep-type-${i}">${PM_ORDER.map(k=>`<option value="${k}" ${p.type===k?"selected":""}>${PM_MODELS[k].label}</option>`).join("")}</select></div>
      <div><label>Amount (£)</label><input type="number" id="ep-amount-${i}" value="${Number(p.amount)||0}"></div></div>
    <div><label>What's included</label><input type="text" id="ep-label-${i}" value="${esc(p.label||"")}" placeholder="1 promotional video"></div>
    <div><label>Details</label><input type="text" id="ep-detail-${i}" value="${esc(p.detail||"")}" placeholder="1 revision · draft approval"></div>
    <div style="margin-top:6px"><button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.pm-slot').remove()">Remove</button></div></div>`;
}
function addEditPriceRow(){
  const w=$("ep-rows"); if(!w) return;
  w.insertAdjacentHTML("beforeend", editPriceRow(Date.now()%100000));
}
function collectEditPricing(){
  const out=[];
  document.querySelectorAll("#ep-rows .pm-slot").forEach(r=>{
    const i=r.dataset.idx;
    const type=($("ep-type-"+i)||{}).value||"fixed";
    const label=(($("ep-label-"+i)||{}).value||"").trim();
    const detail=(($("ep-detail-"+i)||{}).value||"").trim();
    const amount=Number((($("ep-amount-"+i)||{}).value)||0);
    if(label||amount>0) out.push({type,label:label||PM_MODELS[type].label,detail,amount});
  });
  return out;
}
function openEditListing(id){
  const l=findListing(id); if(!l) return;
  if(!S.account || String(l.ownerId)!==String(S.account.id)){ toast("You can only edit your own listing"); return; }
  S._edit={kind:"listing", id:l.id, sets:{
    niches:new Set(l.niches||[]), services:new Set(l.services||[]),
    countries:new Set(l.countries||[]), ages:new Set(l.ages||[]), interests:new Set(l.interests||[])}};
  openModal(`<div class="m-pad"><h3 class="m-title">Edit listing</h3>
    <p class="m-sub">Changes go live on your published listing as soon as you save.</p>
    <div class="frm">
      <div class="row2"><div><label>Platform name</label><input type="text" id="el-name" value="${esc(l.name)}"></div>
        <div><label>Platform type</label><select id="el-type">${ALL_PLATFORMS.map(x=>`<option ${x===l.platform?"selected":""}>${x}</option>`).join("")}</select></div></div>
      <div class="row2"><div><label>Handle</label><input type="text" id="el-handle" value="${esc(l.handle||"")}"></div>
        <div><label>Brand</label><input type="text" id="el-brand" value="${esc(l.brand||"")}"></div></div>
      <div><label>Bio</label><textarea id="el-bio">${esc(l.bio||"")}</textarea></div>
      <div class="row2"><div><label>Audience</label><input type="number" id="el-aud" value="${l.audience||0}"></div>
        <div><label>Avg views</label><input type="number" id="el-views" value="${l.avgViews||0}"></div></div>
      <div class="row2"><div><label>Avg impressions</label><input type="number" id="el-imps" value="${l.impressions||0}"></div>
        <div><label>Engagement rate (%)</label><input type="number" step="0.1" id="el-er" value="${l.er||0}"></div></div>
      <div><label>Niches</label>${editChips("niches",ALL_NICHES)}</div>
      <div><label>Services offered</label>${editChips("services",ALL_SERVICES)}</div>
      <div><label>Audience countries</label>${editChips("countries",ALL_COUNTRIES)}</div>
      <div><label>Age ranges</label>${editChips("ages",ALL_AGES)}</div>
      <div><label>Offers &amp; pricing</label><div id="ep-rows">${(l.pricing||[]).map((p,i)=>editPriceRow(i,p)).join("")}</div>
        <div style="margin-top:6px"><button type="button" class="btn btn-ghost btn-sm" onclick="addEditPriceRow()">＋ add a price</button></div></div>
      <div class="hint-err hide" id="el-err"></div>
    </div>
    <div class="m-actions">
      <button class="btn btn-danger" style="margin-right:auto" onclick="confirmRemoveListing('${l.id}')">Remove listing</button>
      <button class="btn btn-o" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" id="el-save" onclick="saveListingEdits()">Save changes &amp; publish</button></div></div>`,"wide");
}
async function saveListingEdits(){
  const l=findListing(S._edit.id); const pid=String(l.id).slice(1);
  const err=$("el-err"); if(err) err.classList.add("hide");
  const name=($("el-name").value||"").trim();
  if(!name){ if(err){err.textContent="Platform name is required.";err.classList.remove("hide");} return; }
  const body={name, platform_type:$("el-type").value, handle:($("el-handle").value||"").trim(),
    brand:($("el-brand").value||"").trim(), bio:($("el-bio").value||"").trim(),
    audience:Number($("el-aud").value)||0, avg_views:Number($("el-views").value)||0,
    impressions:Number($("el-imps").value)||0, engagement_rate:Number($("el-er").value)||0,
    niches:[...S._edit.sets.niches], services:[...S._edit.sets.services],
    countries:[...S._edit.sets.countries], ages:[...S._edit.sets.ages],
    interests:[...S._edit.sets.interests], pricing:collectEditPricing()};
  const btn=$("el-save"); btn.disabled=true; btn.innerHTML=`<span class="spin"></span> Saving…`;
  try{ await PSApi.post(`/platforms/${pid}/update`, body); }
  catch(e){ btn.disabled=false; btn.textContent="Save changes & publish";
    if(err){err.textContent=e.message||"Could not save";err.classList.remove("hide");} return; }
  closeModal(); toast("Listing updated & republished ✓",true);
  await loadMarket(); await loadMine(); openDash();
}
function openEditCampaign(id){
  const c=findCampaign(id); if(!c) return;
  if(!S.account || String(c.businessId)!==String(S.account.id)){ toast("You can only edit your own campaign"); return; }
  S._edit={kind:"campaign", id:c.id, sets:{
    platforms:new Set(c.platforms||[]), niches:new Set(c.niches||[]),
    countries:new Set(c.countries||[]), services:new Set(c.services||[]),
    creatorSizes:new Set(c.creatorSizes||[])}};
  openModal(`<div class="m-pad"><h3 class="m-title">Edit campaign</h3>
    <p class="m-sub">Changes go live on your published campaign as soon as you save.</p>
    <div class="frm">
      <div><label>Campaign title</label><input type="text" id="ec-title" value="${esc(c.title)}"></div>
      <div class="row2"><div><label>Industry</label><input type="text" id="ec-industry" value="${esc(c.industry||"")}"></div>
        <div><label>Budget (£)</label><input type="number" id="ec-budget" value="${c.budget||0}"></div></div>
      <div><label>Description</label><textarea id="ec-desc">${esc(c.desc||"")}</textarea></div>
      <div><label>Expected deliverables</label><textarea id="ec-deliv">${esc(c.deliverables||"")}</textarea></div>
      <div><label>Campaign duration</label><select id="ec-dur">${["One-off","Video-by-video","2 weeks","4 weeks","6 weeks","3 months","Ongoing"].map(x=>`<option ${x===c.duration?"selected":""}>${x}</option>`).join("")}</select></div>
      <div><label>Platforms wanted</label>${editChips("platforms",ALL_PLATFORMS)}</div>
      <div><label>Niches</label>${editChips("niches",ALL_NICHES)}</div>
      <div><label>Services wanted</label>${editChips("services",ALL_SERVICES)}</div>
      <div><label>Target countries</label>${editChips("countries",ALL_COUNTRIES)}</div>
      <div><label>Creator sizes</label>${editChips("creatorSizes",CREATOR_SIZES)}</div>
      <div class="hint-err hide" id="ec-err"></div>
    </div>
    <div class="m-actions">
      <button class="btn btn-danger" style="margin-right:auto" onclick="confirmRemoveCampaign('${c.id}')">Remove campaign</button>
      <button class="btn btn-o" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" id="ec-save" onclick="saveCampaignEdits()">Save changes &amp; publish</button></div></div>`,"wide");
}
async function saveCampaignEdits(){
  const c=findCampaign(S._edit.id); const cid=String(c.id).replace(/^c/,"");
  const err=$("ec-err"); if(err) err.classList.add("hide");
  const title=($("ec-title").value||"").trim();
  if(!title){ if(err){err.textContent="Campaign title is required.";err.classList.remove("hide");} return; }
  const body={title, industry:($("ec-industry").value||"").trim(), budget:Number($("ec-budget").value)||0,
    description:($("ec-desc").value||"").trim(), deliverables:($("ec-deliv").value||"").trim(),
    duration:$("ec-dur").value,
    platforms:[...S._edit.sets.platforms], niches:[...S._edit.sets.niches],
    services:[...S._edit.sets.services], countries:[...S._edit.sets.countries],
    creator_sizes:[...S._edit.sets.creatorSizes]};
  const btn=$("ec-save"); btn.disabled=true; btn.innerHTML=`<span class="spin"></span> Saving…`;
  try{ await PSApi.post(`/campaigns/${cid}/update`, body); }
  catch(e){ btn.disabled=false; btn.textContent="Save changes & publish";
    if(err){err.textContent=e.message||"Could not save";err.classList.remove("hide");} return; }
  closeModal(); toast("Campaign updated & republished ✓",true);
  await loadMarket(); await loadMine(); openDash();
}

// ---- Removing a listing / campaign from the Edit screen ----
// The backend decides the outcome from the data: nothing attached -> the row is
// deleted outright; real deals attached -> it is archived so those deals, and
// the reviews and past-campaign history built on them, keep resolving. The
// confirmation below asks the backend first so it states what will actually
// happen rather than guessing.

function removalConfirmHtml(kind, label, info){
  const noun = kind==="listing" ? "listing" : "campaign";
  const archiving = info.mode==="archive";
  const n = info.deals_total, live = info.deals_active;
  const dealLine = archiving
    ? `<p class="m-sub">This ${noun} has <b>${n} deal${n===1?"":"s"}</b> attached${live?` (<b>${live}</b> still live)`:""}, so it can't be deleted outright — those records, and any reviews and completed-campaign history built on them, would be lost.</p>
       <p class="m-sub">Instead it will be <b>removed from the marketplace</b>: nobody can find, book or apply to it again, and it disappears from your dashboard. The deal records stay intact${live?", and any live deal carries on to completion as normal":""}.</p>`
    : `<p class="m-sub">No deals have ever been attached to this ${noun}, so it will be <b>permanently deleted</b>${kind==="listing"?", along with its My Work samples and images":" along with its image"}. This can't be undone.</p>`;
  return `<div class="m-pad"><h3 class="m-title">Remove &ldquo;${esc(label)}&rdquo;?</h3>
    ${dealLine}
    <div class="hint-err hide" id="rm-err"></div>
    <div class="m-actions"><button class="btn btn-o" onclick="closeModal()">Keep it</button>
      <button class="btn btn-danger" id="rm-go">${archiving?`Remove from marketplace`:`Delete permanently`}</button></div></div>`;
}

async function openRemoveConfirm(kind, uiId, apiPath, label){
  let info;
  try{ info = await PSApi.get(`${apiPath}/removal-preview`); }
  catch(e){ toast(e.message||"Could not check this before removing"); return; }
  openModal(removalConfirmHtml(kind, label, info));
  const btn=$("rm-go"), err=$("rm-err");
  btn.onclick = async () => {
    btn.disabled=true; btn.innerHTML=`<span class="spin"></span> Removing…`;
    let res;
    try{ res = await PSApi.del(apiPath); }
    catch(e){ btn.disabled=false; btn.textContent="Try again";
      if(err){ err.textContent=e.message||"Could not remove"; err.classList.remove("hide"); } return; }
    closeModal();
    toast(res.mode==="archived"
      ? `Removed from the marketplace — ${res.deals_total} deal record${res.deals_total===1?"":"s"} kept ✓`
      : `${kind==="listing"?"Listing":"Campaign"} deleted ✓`, true);
    await loadMarket(); await loadMine(); openDash();
  };
}

function confirmRemoveListing(id){
  const l=findListing(id); if(!l) return;
  if(!S.account || String(l.ownerId)!==String(S.account.id)){ toast("You can only remove your own listing"); return; }
  openRemoveConfirm("listing", id, `/platforms/${String(l.id).slice(1)}`, l.name);
}

function confirmRemoveCampaign(id){
  const c=findCampaign(id); if(!c) return;
  if(!S.account || String(c.businessId)!==String(S.account.id)){ toast("You can only remove your own campaign"); return; }
  openRemoveConfirm("campaign", id, `/campaigns/${String(c.id).replace(/^c/,"")}`, c.title);
}

// A completed campaign, derived automatically from a paid deal. Shows the
// campaign, the business, views promised vs delivered, and the star review.
function pastAutoHtml(x){
  const stars = x.rating ? `<div class="pcs">${"★".repeat(x.rating)}${"☆".repeat(5-x.rating)}</div>` : "";
  const txt = x.review_text ? `<p class="det-p" style="margin:6px 0 0;font-size:12.5px">“${esc(x.review_text)}”</p>` : "";
  // Exact figures, not abbreviations — this is a delivery claim, so 12,500 must
  // not be shown as "13K".
  const n = v => v!=null ? Number(v).toLocaleString("en-GB") : "—";
  const views = (x.views_promised!=null || x.views_delivered!=null)
    ? `<div class="pcs">📈 ${n(x.views_promised)} promised → ${n(x.views_delivered)} delivered</div>`
    : "";
  return `<div class="pc"><b>${esc(x.business||"")}</b><small>${esc(x.campaign||"")}</small>
    ${views}${stars}${txt}
    <div class="mut" style="font-size:11.5px;margin-top:6px">Completed ${x.completed_at?new Date(x.completed_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):""} · verified deal</div></div>`;
}
// A My Work sample card: an uploaded video, or a link with its cover image.
function workCardHtml(l,m,meOwner){
  const del = meOwner?`<button class="btn btn-danger btn-sm" onclick="deleteMedia('${l.id}',${m.id},'work')">Delete</button>`:"";
  let media="";
  if(m.has_video && m.video_url){
    media=`<video controls preload="metadata" src="${m.video_url}" style="width:100%;border-radius:10px;background:#000;max-height:340px"></video>`;
  } else if(m.link_url){
    media=`<a href="${esc(m.link_url)}" target="_blank" rel="noopener" class="work-link-card">${m.has_cover&&m.cover_url?`<img src="${m.cover_url}" alt="${esc(m.title||'sample')}">`:`<div class="work-link-ph">🔗</div>`}<span class="work-link-go">Open link ↗</span></a>`;
  }
  return `<div>${media}<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:6px"><small class="mut" style="font-size:12.5px">${esc(m.title||"Sample")}</small>${del}</div></div>`;
}
function mediaUploadForm(l,kind){
  if(kind==="work"){
    return `<div class="frm" style="margin-top:16px;border-top:1px solid var(--line);padding-top:14px">
      <div class="wiz-h5">Add work samples</div>
      <p class="mut" style="font-size:12.5px;margin:2px 0 4px">Upload a video, or link to content hosted elsewhere with its own cover image. Add as many as you like.</p>
      <div id="wk-slots">${workSlotHtml(0)}</div>
      <div style="margin-top:8px"><button class="btn btn-ghost btn-sm" onclick="addWorkSlot()">＋ Add another sample</button></div>
      <div style="margin-top:10px"><button class="btn btn-p btn-sm" id="md-btn" onclick="uploadWork('${l.id}')">Upload</button></div>
      <div class="hint-err hide" id="md-err"></div></div>`;
  }
  return `<div class="frm" style="margin-top:16px;border-top:1px solid var(--line);padding-top:14px">
    <div class="wiz-h5">Add a past campaign</div>
    <div class="row2"><div><label>Brand</label><input type="text" id="md-brand" placeholder="MyProtein"></div>
       <div><label>What you did</label><input type="text" id="md-title" placeholder="3-video creatine series"></div></div>
       <div><label>Result / stat</label><input type="text" id="md-stat" placeholder="1.2M views · 4.1% CTR"></div>
    <div><label>Video (optional) · mp4 / webm / mov, up to 200MB</label>
      <input type="file" id="md-video" accept="video/mp4,video/webm,video/quicktime"></div>
    <div><button class="btn btn-p btn-sm" id="md-btn" onclick="uploadMedia('${l.id}','past_campaign')">Upload</button></div>
    <div class="hint-err hide" id="md-err"></div></div>`;
}
async function uploadMedia(listingId,kind){
  const l=findListing(listingId); if(!l) return;
  const pid=String(l.id).slice(1);
  const title=($("md-title")?$("md-title").value:"").trim();
  const brand=($("md-brand")?$("md-brand").value:"").trim();
  const stat=($("md-stat")?$("md-stat").value:"").trim();
  const file=$("md-video")&&$("md-video").files[0];
  const err=$("md-err");
  if(kind==="work" && !file){ if(err){err.textContent="A work sample needs a video.";err.classList.remove("hide");} return; }
  const fd=new FormData(); fd.append("kind",kind);
  if(title)fd.append("title",title); if(brand)fd.append("brand",brand); if(stat)fd.append("stat",stat);
  if(file)fd.append("video",file);
  const btn=$("md-btn"); if(btn){ btn.disabled=true; btn.innerHTML=`<span class="spin"></span> Uploading…`; }
  try{ await PSApi.postForm(`/platforms/${pid}/media`, fd); }
  catch(e){ if(btn){btn.disabled=false;btn.textContent="Upload";} if(err){err.textContent=e.message||"Upload failed";err.classList.remove("hide");} return; }
  toast("Uploaded",true);
  l._media=null;  // invalidate cache so it refetches
  openListing(l.id, kind==="work"?"work":"past");
}
async function deleteMedia(listingId, mediaId, tab){
  const l=findListing(listingId); if(!l) return;
  if(!confirm("Delete this item?")) return;
  const pid=String(l.id).slice(1);
  try{ await PSApi.del(`/platforms/${pid}/media/${mediaId}`); }
  catch(e){ toast(e.message||"Delete failed"); return; }
  toast("Deleted");
  l._media=null;
  openListing(l.id, tab==="past"?"past":"work");
}
async function uploadListingImage(listingId){
  const f=$("list-img")&&$("list-img").files[0]; if(!f) return;
  const l=findListing(listingId); if(!l) return; const pid=String(l.id).slice(1);
  const fd=new FormData(); fd.append("file",f);
  try{ const r=await PSApi.postForm(`/platforms/${pid}/image`,fd); l.image_url=r.image_url+"?t="+Date.now(); }
  catch(e){ toast(e.message||"Upload failed"); return; }
  toast("Listing picture updated ✓",true); loadMarket(); openListing(l.id);
}
async function uploadCampaignImage(campId){
  const f=$("camp-img")&&$("camp-img").files[0]; if(!f) return;
  const c=findCampaign(campId); if(!c) return; const cid=String(c.id).replace(/^c/,"");
  const fd=new FormData(); fd.append("file",f);
  try{ const r=await PSApi.postForm(`/campaigns/${cid}/image`,fd); c.image_url=r.image_url+"?t="+Date.now(); }
  catch(e){ toast(e.message||"Upload failed"); return; }
  toast("Campaign picture updated ✓",true); loadMarket(); openCampaign(c.id);
}
function renderListingModal(l,tab){
  tab=tab||"offers";
  const others=allListings().filter(x=>x.ownerId===l.ownerId && x.id!==l.id);
  const revs=l.example?reviewsFor(l.id):[];
  const realReviews=(l._reviews&&l._reviews.reviews)||[];
  const realRevCount=(l._reviews&&l._reviews.count)||0;
  const realRevAvg=l._reviews?l._reviews.average:null;
  const meOwner = S.account && String(l.ownerId)===String(S.account.id);
  const workCount = l._media?l._media.work.length:0;
  const pastCount = l.example ? (l.past?l.past.length:0) : (l._media?l._media.past.length:0);
  const tabs=[["offers","Services & pricing"],["about","Audience & analytics"],
    ["work",`My Work${workCount?" ("+workCount+")":""}`],
    ["past",`Past campaigns${pastCount?" ("+pastCount+")":""}`],
    ["reviews",`Reviews${l.example?" (Example)":" ("+realRevCount+")"}`]];
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
      <div class="note blue">🔒 Payment is held pending verification before work starts and released only when the agreed delivery conditions are verified. PromoSlot's fee is 10% seller fee + 5% buyer protection fee, both on the agreed price.</div></div>`;
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
  } else if(tab==="work"){
    const work=(l._media&&l._media.work)||[];
    body = `<div class="det-sec"><h5>My Work — content samples</h5>
      ${work.length
        ? `<div class="work-grid">${work.map(m=>workCardHtml(l,m,meOwner)).join("")}</div>`
        : `<p class="det-p">${meOwner?"Showcase your content style — upload a video, or add a link to content hosted elsewhere with its own cover image.":"No work samples yet."}</p>`}
      ${meOwner?mediaUploadForm(l,"work"):""}</div>`;
  } else if(tab==="past"){
    const past = l.example
      ? (l.past||[]).map(p=>({brand:p.brand,title:p.what,stat:p.stat,video_url:null,id:null}))
      : ((l._media&&l._media.past)||[]);
    const auto = l._pastAuto||[];
    const nothing = !past.length && !auto.length;
    body = `<div class="det-sec"><h5>Past campaigns${auto.length?` (${auto.length} completed on PromoSlot)`:""}</h5><div class="pastc">
      ${auto.map(pastAutoHtml).join("")}
      ${past.map(p=>`<div class="pc"><b>${esc(p.brand||"")}</b><small>${esc(p.title||"")}</small>${p.stat?`<div class="pcs">📈 ${esc(p.stat)}</div>`:""}
        ${p.video_url?`<video controls preload="metadata" src="${p.video_url}" style="width:100%;margin-top:8px;border-radius:8px;background:#000;max-height:260px"></video>`:""}
        ${meOwner&&p.id?`<button class="btn btn-danger btn-sm" style="margin-top:8px" onclick="deleteMedia('${l.id}',${p.id},'past')">Delete</button>`:""}</div>`).join("")}
      ${nothing?`<p class="det-p" style="grid-column:1/-1">${meOwner?"Add a previous campaign below — attach a video if you have one.":"No campaigns completed yet — every completed deal appears here automatically with its verified results."}</p>`:""}
    </div>${meOwner&&!l.example?mediaUploadForm(l,"past_campaign"):""}
    <div class="note" style="margin-top:14px">Delivery ≠ performance: past results are evidence of reach, not a guarantee of sales or virality — unless written into a funded performance agreement.</div></div>`;
  } else {
    body = l.example
      ? `<div class="det-sec"><h5>What businesses say</h5><div class="note blue" style="margin-bottom:12px">These are illustrative example reviews — real reviews appear only after a completed deal.</div>
      ${revs.map(r=>`<div class="rev-item ex-review"><div class="rvtop"><span class="rev-who"><span class="rev-dot">${esc(initials(r.name))}</span><b>${esc(r.name)} · ${esc(r.co)}</b><span class="tag ex-tag rev-ex">EXAMPLE</span></span><span class="stars">${"★".repeat(r.stars)}${"☆".repeat(5-r.stars)}</span></div><p>${esc(r.text)}</p></div>`).join("")}</div>`
      : (realReviews.length
        ? `<div class="det-sec"><h5>What businesses say${realRevAvg!=null?` · ⭐ ${realRevAvg.toFixed(1)} (${realRevCount})`:""}</h5>
          ${realReviews.map(r=>`<div class="rev-item"><div class="rvtop"><span class="stars">${"★".repeat(r.rating)}${"☆".repeat(5-r.rating)}</span></div>${r.text?`<p>${esc(r.text)}</p>`:""}</div>`).join("")}</div>`
        : `<div class="det-sec"><h5>What businesses say</h5><div class="empty-state small"><div class="es-ico">📝</div><h4>No reviews yet</h4><p>Reviews appear here once a business completes a deal with ${esc(l.name)} and leaves feedback — every review is tied to a real, funded transaction.</p></div></div>`);
  }
  openModal(`
    <div class="det-head">${exWrap(pfp(l.name,l.platform,"",l.ownerAvatar),l.example)}
      <div class="det-title"><h3>${esc(l.name)} ${l.verified?'<span class="vtick">✔︎ Verified</span>':""}</h3>
        <div class="handle">${esc(l.handle)} · run by <b>${esc(l.brand)}</b> (${esc(l.owner)})</div>
        <div class="metaline">${l.example?'<span class="tag ex-tag">EXAMPLE PROFILE</span>':""}${pbadge(l.platform)}${l.niches.map(n=>`<span class="tag">${esc(n)}</span>`).join("")}${l.example?"":starsHtml(realRevAvg,realRevCount)}</div>
      </div>
      <div class="det-actions">
        <button class="btn btn-o btn-sm" onclick="openChat('${l.id}')">💬 Message</button>
        ${!l.example&&/^\d+$/.test(String(l.ownerId))?`<button class="btn btn-o btn-sm" onclick="openProfile(${parseInt(l.ownerId,10)},'${l.id}')">👤 View full profile</button>`:""}
        ${l.example?"":acpLinkHtml("listing", l.id)}
        <button class="btn btn-o btn-sm" onclick="requestQuote('${l.id}')">Request custom quote</button>
      </div>
    </div>
    <p class="det-bio">${esc(l.bio)}</p>
    ${l.image_url?`<div style="padding:0 28px 6px"><img class="list-hero" src="${l.image_url}" alt="${esc(l.name)}"></div>`:""}
    ${meOwner?`<div style="padding:0 28px 8px"><label class="btn btn-o btn-sm" for="list-img">${l.image_url?"Change listing picture":"＋ Add listing picture"}</label><input type="file" id="list-img" accept="image/*" class="pf-file-input" onchange="uploadListingImage('${l.id}')"></div>`:""}
    ${others.length?`<div style="padding:16px 28px 0"><div class="det-sec" style="margin:0"><h5>Also from ${esc(l.brand)} — ${others.length} more platform${others.length>1?"s":""}</h5>
      <div class="other-plats">${others.map(o=>`<div class="op-row" onclick="openListing('${o.id}')">${pfp(o.name,o.platform,"")}<div><b>${esc(o.name)}</b><small>${o.platform} · ${fmtN(o.audience)} ${o.platform==="Newsletter"?"subs":o.platform==="Discord"?"members":"followers"}${priceFrom(o)?" · from "+gbp(priceFrom(o)):""}</small></div><span class="op-go">View →</span></div>`).join("")}</div></div></div>`:""}
    <div class="det-tabs">${tabs.map(([k,lab])=>`<button class="det-tab ${tab===k?"on":""}" onclick="openListing('${l.id}','${k}')">${lab}</button>`).join("")}</div>
    <div class="det-body">${body}</div>`,"wide");
}
function requestQuote(id){
  const l=findListing(id); if(!l) return;
  const subj=chatSubject(id);
  if(!subj || !subj.real){ openModal(exampleChat(subj||{name:l.name})); return; }
  if(!S.account){ window._afterAuth=()=>requestQuote(id); authModal("login"); return; }
  if(String(subj.otherId)===String(S.account.id)){ toast("That's your own listing."); return; }
  openModal(`<div class="m-pad"><h3 class="m-title">Request a custom quote from ${esc(l.name)}</h3>
    <p class="m-sub">${esc(l.owner.split(" ")[0])} will reply with a personalised proposal you can accept, decline, or counter.</p>
    <div class="frm">
      <div><label>What do you need?</label><textarea id="rq-txt">We're launching a new product in your niche — could you put together a proposal for a 2-video package plus a 7-day link placement?</textarea></div>
      <div class="row2"><div><label>Rough budget</label><input type="text" id="rq-bud" value="£300–£500"></div><div><label>Timeline</label><input type="text" id="rq-when" value="Within 3 weeks"></div></div>
    </div>
    <div class="hint-err hide" id="rq-err"></div>
    <div class="m-actions"><button class="btn btn-o" onclick="openListing('${l.id}')">Back</button><button class="btn btn-p" id="rq-send" onclick="sendQuoteReq('${l.id}')">Send request</button></div></div>`);
}
async function sendQuoteReq(id){
  const l=findListing(id); if(!l) return;
  const subj=chatSubject(id); if(!subj || !subj.real) return;
  const err=$("rq-err"); if(err) err.classList.add("hide");
  const txt=(($("rq-txt")||{}).value||"").trim();
  if(!txt){ if(err){err.textContent="Describe what you need.";err.classList.remove("hide");} return; }
  const bud=(($("rq-bud")||{}).value||"").trim();
  const when=(($("rq-when")||{}).value||"").trim();

  // This is a real message on the same thread the Message button uses, so it
  // lands in the owner's inbox and fires the same notification. It used to
  // display a "recorded" confirmation without sending anything at all.
  const body=["Quote request", txt,
              bud?`Rough budget: ${bud}`:"", when?`Timeline: ${when}`:""]
             .filter(Boolean).join("\n");
  const btn=$("rq-send");
  if(btn){ btn.disabled=true; btn.innerHTML=`<span class="spin"></span> Sending…`; }
  try{
    await PSApi.post("/messages",{to_user_id:subj.otherId, body, context_ref:id});
  }catch(e){
    if(btn){ btn.disabled=false; btn.textContent="Send request"; }
    if(err){ err.textContent=e.message||"Could not send the request"; err.classList.remove("hide"); }
    return;
  }
  closeModal();
  openModal(`<div class="m-pad"><h3 class="m-title">Quote request sent</h3>
    <p class="m-sub">Your request was delivered to <b>${esc(subj.name)}</b> and is now in your Messages.
       They'll be notified. PromoSlot never writes a reply on their behalf — any proposal
       comes from their own account.</p>
    ${pendingPanel("💬","Awaiting a real reply","Custom proposals appear here only when a real owner actually sends one.")}
    <div class="m-actions"><button class="btn btn-o" onclick="closeModal();openMessages()">Open Messages</button>
      <button class="btn btn-p" onclick="closeModal()">Got it</button></div></div>`,"narrow");
  loadNotifications();
}

/* ==================== CAMPAIGN DETAIL ==================== */
async function openCampaign(id,tab){
  const c=findCampaign(id); if(!c) return;
  const real = !c.example && /^c\d+$/.test(String(c.id));
  const meBiz = real && S.account && String(c.businessId)===String(S.account.id);
  // The campaign owner sees real applicants — fetch fresh (they change as the
  // owner approves/declines). Only the owning business can read these.
  if(meBiz){
    try{ c._apps=await PSApi.get(`/campaigns/${String(c.id).replace(/^c/,'')}/applications`); }catch(e){ c._apps=c._apps||[]; }
  }
  // Same review source as the profile view — one source of truth, fetched fresh.
  if(real){
    try{ c._reviews=await PSApi.get(`/users/${c.businessId}/reviews`); }
    catch(e){ c._reviews=c._reviews||{count:0,average:null,reviews:[]}; }
  }
  const fresh = !$("overlay").classList.contains("open");
  if(fresh){ openModal(detSkeleton(),"wide"); setTimeout(()=>renderCampaignModal(c,tab),340); }
  else renderCampaignModal(c,tab);
}
function applicantsHtml(c, apps){
  if(!apps.length) return `<div class="det-sec"><h5>Applicants</h5><div class="empty-state small"><div class="es-ico">📭</div><h4>No applications yet</h4><p>Platform owners who apply to “${esc(c.title)}” appear here. Each application is a real, protected deal you can review, approve, and fund.</p></div></div>`;
  return `<div class="det-sec"><h5>${apps.length} applicant${apps.length>1?"s":""}</h5>
    ${apps.map(a=>`<div class="op-row" style="align-items:flex-start;cursor:default">
      ${pfp(a.applicant,null,"",a.applicant_avatar)}
      <div style="flex:1;min-width:0">
        <b>${esc(a.applicant)}</b>
        <small>Proposes ${gbpP(a.listed_price)} · you'd pay ${gbpP(a.total_charged)} · owner receives ${gbpP(a.net_to_owner)}</small>
        ${a.pitch?`<p class="det-p" style="margin:6px 0 0">${esc(a.pitch)}</p>`:""}
        <div style="margin-top:8px"><span class="tag ${a.funded?"grn":""}">${a.funded?"Funded":esc(a.status.replace(/_/g," "))}${a.business_approved?" · you approved":""}</span></div>
      </div>
      <button class="btn btn-p btn-sm" onclick="closeModal();showView('view-deal');renderRealDeal(${a.deal_id})">Review &amp; approve →</button>
    </div>`).join("")}</div>`;
}
function renderCampaignModal(c,tab){
  const real = !c.example && /^c\d+$/.test(String(c.id));
  const meBiz = real && S.account && String(c.businessId)===String(S.account.id);
  const canApply = real && !meBiz;   // platform-owner check happens in applyCampaign()
  const apps=c._apps||[];
  tab=tab||"offer";
  const revs=c.example?reviewsFor(c.id):[];
  const cRealReviews=(c._reviews&&c._reviews.reviews)||[];
  const cRevCount=(c._reviews&&c._reviews.count)||0;
  const cRevAvg=c._reviews?c._reviews.average:null;
  const tabs=[["offer","What they're offering"],["profile","Business profile"]];
  if(meBiz) tabs.push(["applicants",`Applicants (${apps.length})`]);
  tabs.push(["reviews",`Reviews${c.example?" (Example)":" ("+cRevCount+")"}`]);
  let body="";
  if(tab==="applicants"){ body=applicantsHtml(c, apps); } else
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
      : (cRealReviews.length
        ? `<div class="det-sec"><h5>What platform owners say about ${esc(c.company)}${cRevAvg!=null?` · ⭐ ${cRevAvg.toFixed(1)} (${cRevCount})`:""}</h5>
          ${cRealReviews.map(r=>`<div class="rev-item"><div class="rvtop"><span class="stars">${"★".repeat(r.rating)}${"☆".repeat(5-r.rating)}</span></div>${r.text?`<p>${esc(r.text)}</p>`:""}</div>`).join("")}</div>`
        : `<div class="det-sec"><h5>What platform owners say about ${esc(c.company)}</h5><div class="empty-state small"><div class="es-ico">📝</div><h4>No reviews yet</h4><p>Reviews appear here once a platform owner completes a deal with ${esc(c.company)} and leaves feedback — every review is tied to a real, funded transaction.</p></div></div>`);
  }
  openModal(`
    <div class="det-head">${exWrap(pfp(c.company,null,"",c.companyAvatar),c.example)}
      <div class="det-title"><h3>${esc(c.title)}</h3>
        <div class="handle">by <b>${esc(c.company)}</b> ${c.verified?'<span class="vtick">✔︎ Verified business</span>':""} · ${esc(c.industry)} · posted ${esc(c.posted)}</div>
        <div class="metaline">${c.example?'<span class="tag ex-tag">EXAMPLE CAMPAIGN</span>':starsHtml(c._reviews?cRevAvg:c.rating, c._reviews?cRevCount:c.reviewCount)}<span class="tag grn">${c.budget?gbp(c.budget)+" budget":"Commission only"}</span>${c.example?"":`<span class="tag">${c.applicants} applicants</span>`}</div>
      </div>
      <div class="det-actions">
        <button class="btn btn-o btn-sm" onclick="openChat('${c.id}')">💬 Message</button>
        ${real&&!meBiz?`<button class="btn btn-o btn-sm" onclick="openProfile(${parseInt(c.businessId,10)},'${c.id}')">👤 View full profile</button>`:""}
        ${real?acpLinkHtml("campaign", c.id):""}
        ${meBiz
          ? `<button class="btn btn-p btn-sm" onclick="openCampaign('${c.id}','applicants')">View applicants (${apps.length})</button>`
          : (canApply?`<button class="btn btn-p btn-sm" onclick="applyCampaign('${c.id}')">Apply to campaign</button>`:"")}
      </div>
    </div>
    <p class="det-bio">${esc(c.desc)}</p>
    ${c.image_url?`<div style="padding:0 28px 6px"><img class="camp-hero" src="${c.image_url}" alt="${esc(c.title)}"></div>`:""}
    ${meBiz?`<div style="padding:0 28px 8px"><label class="btn btn-o btn-sm" for="camp-img">${c.image_url?"Change campaign picture":"＋ Add campaign picture"}</label><input type="file" id="camp-img" accept="image/*" class="pf-file-input" onchange="uploadCampaignImage('${c.id}')"></div>`:""}
    <div class="det-tabs">${tabs.map(([k,lab])=>`<button class="det-tab ${tab===k?"on":""}" onclick="openCampaign('${c.id}','${k}')">${lab}</button>`).join("")}</div>
    <div class="det-body">${body}</div>`,"wide");
}

/* ==================== CHAT (backend-driven) ==================== */
// Messages are real: persisted server-side and delivered to the other account,
// which is notified. We never fabricate an inbound message or a reply — an
// incoming message exists only because the real other account actually sent it.
function msgTime(iso){
  if(!iso) return "";
  const d=new Date(iso); if(isNaN(d)) return "";
  return d.getHours()+":"+String(d.getMinutes()).padStart(2,"0");
}
function threadMsgsHtml(msgs){
  if(!msgs||!msgs.length) return `<div class="thread-empty" style="min-height:120px"><div class="es-ico">✉️</div><p>No messages yet — say hello.</p></div>`;
  return msgs.map(m=>`<div class="msg ${m.mine?"me":"them"}">${esc(m.body)}<span class="mt">${msgTime(m.created_at)}</span></div>`).join("");
}
// Resolve the real counterparty + subject from a listing/campaign id.
function chatSubject(id){
  const l=findListing(id);
  if(l) return {kind:"listing", name:l.name, plat:l.platform,
                otherId: parseInt(l.ownerId,10),
                real: !l.example && /^\d+$/.test(String(l.ownerId))};
  const c=findCampaign(id);
  if(c) return {kind:"campaign", name:c.company, plat:null,
                otherId: parseInt(c.businessId,10),
                real: !c.example && /^c\d+$/.test(String(c.id))};
  return null;
}
function exampleChat(subj){
  return `<div class="chat-box">
    <div class="chat-head">${pfp(subj.name,subj.plat)}<div><b>${esc(subj.name)}</b><small class="mut" style="color:var(--mut)">Example ${subj.kind==="campaign"?"campaign":"profile"}</small></div></div>
    <div style="padding:12px 16px 0"><div class="note blue" style="margin:0">🧪 This is an <b>example ${subj.kind==="campaign"?"campaign":"profile"}</b> — there's no real account here, so messages aren't delivered. Real conversations begin when members join. PromoSlot never writes replies on anyone's behalf.</div></div>
    <div class="chat-msgs" style="min-height:120px"><div class="thread-empty"><div class="es-ico">✉️</div><p>Example — messaging is disabled here.</p></div></div>
  </div>`;
}
async function openChat(id){
  const subj=chatSubject(id); if(!subj) return;
  if(!subj.real){ openModal(exampleChat(subj)); return; }
  if(!S.account){ window._afterAuth=()=>openChat(id); authModal("login"); return; }
  if(String(subj.otherId)===String(S.account.id)){ toast("That's your own — you can't message yourself."); return; }
  // Load any existing thread for this (person, subject) so history shows.
  let msgs=[], convoId=null;
  try{
    const list=await PSApi.get("/conversations");
    const found=list.find(x=>String(x.other_id)===String(subj.otherId) && String(x.context_ref||"")===String(id));
    if(found){ convoId=found.id; const full=await PSApi.get(`/conversations/${found.id}/messages`); msgs=full.messages||[]; }
  }catch(e){}
  S._chatCtx={otherId:subj.otherId, contextRef:id, convoId};
  openModal(`<div class="chat-box">
    <div class="chat-head">${pfp(subj.name,subj.plat)}<div><b>${esc(subj.name)}</b><small class="mut" style="color:var(--mut)">Direct message</small></div>
      <button class="btn btn-o btn-sm" style="margin-left:auto" onclick="${subj.kind==="listing"?`openListing('${id}')`:`openCampaign('${id}')`}">View ${subj.kind==="listing"?"profile":"campaign"}</button></div>
    <div style="padding:12px 16px 0"><div class="note blue" style="margin:0">💬 Messages are delivered to <b>${esc(subj.name)}</b>'s account. Replies appear here only when they actually respond.</div></div>
    <div class="chat-msgs" id="chatMsgs">${threadMsgsHtml(msgs)}</div>
    <div class="chat-input"><input id="chatInput" autocomplete="off" placeholder="Type a message…" onkeydown="if(event.key==='Enter')sendChat()"><button class="btn btn-p" onclick="sendChat()">Send</button></div>
  </div>`);
  const box=$("chatMsgs"); if(box) box.scrollTop=box.scrollHeight;
}
async function sendChat(){
  const inp=$("chatInput"); const txt=(inp.value||"").trim(); if(!txt) return;
  const ctx=S._chatCtx; if(!ctx) return;
  inp.disabled=true;
  try{
    const res=await PSApi.post("/messages",{to_user_id:ctx.otherId, body:txt, context_ref:ctx.contextRef});
    ctx.convoId=res.conversation_id;
    const full=await PSApi.get(`/conversations/${ctx.convoId}/messages`);
    const box=$("chatMsgs"); if(box){ box.innerHTML=threadMsgsHtml(full.messages); box.scrollTop=box.scrollHeight; }
    inp.value="";
  }catch(err){ toast(err.message||"Could not send message"); }
  inp.disabled=false; if($("chatInput")) $("chatInput").focus();
}

// Suggested openers. These live in their own column beside the thread — never
// layered over the composer — and only ever prefill the box; nothing is sent
// until the user presses Send.
const MSG_SUGGESTIONS=[
  "Hi — could you share your availability for the next few weeks?",
  "What would you charge for a one-off promotional video?",
  "Could you send recent performance figures for a similar post?",
  "Is the price negotiable for a multi-post package?",
  "Happy to proceed — shall I open a deal so the funds are held pending verification?",
];
function msgSuggestHtml(){
  return `<aside class="msg-suggest"><h5>Suggested messages</h5>
    ${MSG_SUGGESTIONS.map((t,i)=>`<button type="button" onclick="useSuggestion(${i})">${esc(t)}</button>`).join("")}
    <p class="ms-hint">Tap one to drop it into the box — nothing sends until you press Send.</p></aside>`;
}
function useSuggestion(i){
  const inp=$("ibInput"); if(!inp) return;
  const t=MSG_SUGGESTIONS[i]; if(!t) return;
  inp.value = inp.value.trim() ? inp.value.trim()+" "+t : t;
  inp.focus();
}

/* ==================== MESSAGES INBOX (backend-driven) ==================== */
async function loadConvos(){
  if(!S.account){ S.convos=[]; return; }
  try{ S.convos=await PSApi.get("/conversations"); }catch(e){ S.convos=[]; }
}
async function openMessages(){
  showView("view-messages");
  await loadConvos();
  if(!S.activeConv || !(S.convos||[]).some(c=>String(c.id)===String(S.activeConv))){
    S.activeConv=(S.convos[0]&&S.convos[0].id)||null; S.activeThread=null;
  }
  if(S.activeConv && !S.activeThread){ try{ S.activeThread=await PSApi.get(`/conversations/${S.activeConv}/messages`); }catch(e){} }
  renderMessages(false);
}
async function openConv(cid){
  S.activeConv=cid;
  try{ S.activeThread=await PSApi.get(`/conversations/${cid}/messages`); }catch(e){ S.activeThread=null; }
  await loadConvos();                 // unread cleared for this thread
  loadNotifications();                // refresh the bell
  renderMessages(true);
}
function renderMessages(showThread){
  const convos=S.convos||[];
  const head=`<div class="msgs-head"><h2>Messages</h2><p class="mut" style="font-size:14px">Negotiate freely — when you're ready, move terms into the deal builder so everything is documented and covered by Payment Protection.</p></div>`;
  if(!convos.length){
    $("msgsWrap").innerHTML=`${head}
      <div class="empty-state"><div class="es-ico">💬</div><h4>No conversations yet</h4><p>Message a platform owner or business from their profile to start a conversation. Your real threads show up here — nothing is pre-filled.</p><button class="btn btn-o btn-sm" onclick="openMarket()">Browse the marketplace</button></div>`;
    return;
  }
  const act=S.activeConv;
  const list=convos.map(c=>`<div class="conv ${String(c.id)===String(act)?"on":""}" onclick="openConv(${c.id})">
      ${pfp(c.other_name,null,"",c.other_avatar)}
      <div class="cv-main"><div class="cv-top"><b>${esc(c.other_name)}</b><span class="cv-time">${msgTime(c.last_at)}</span></div>
      <div class="cv-prev">${c.last_mine&&c.last_body?"You: ":""}${esc(c.last_body||"No messages yet")}</div></div>
      ${c.unread?'<span class="unread-dot"></span>':""}</div>`).join("");
  let thread=`<div class="thread-empty"><div class="es-ico">💬</div><p>Select a conversation</p></div>`;
  const t=S.activeThread;
  if(t && String(t.id)===String(act)){
    const ctx=t.context_ref;
    const viewBtn = ctx ? `<button class="btn btn-o btn-sm" style="margin-left:auto" onclick="${/^c\d+$/.test(ctx)?`openCampaign('${ctx}')`:`openListing('${ctx}')`}">View ${/^c\d+$/.test(ctx)?"campaign":"profile"}</button>` : "";
    thread=`<div class="chat-head">
      <button class="btn btn-ghost conv-back" onclick="renderMessages(false)">←</button>
      ${pfp(t.other_name,null)}<div><b>${esc(t.other_name)}</b><small class="mut" style="color:var(--mut)">Direct message</small></div>${viewBtn}</div>
    <div style="padding:12px 16px 0"><div class="note blue" style="margin:0">💬 Messages are delivered to <b>${esc(t.other_name)}</b>'s account. Replies appear here only when they actually respond.</div></div>
    <div class="chat-msgs" id="ibMsgs">${threadMsgsHtml(t.messages)}</div>
    <div class="chat-input"><input id="ibInput" autocomplete="off" placeholder="Type a message…" onkeydown="if(event.key==='Enter')sendInboxMsg()"><button class="btn btn-p" onclick="sendInboxMsg()">Send</button></div>`;
  }
  $("msgsWrap").innerHTML=`${head}
    <div class="inbox ${showThread?"show-thread":""}">
      <div class="conv-list">${list}</div>
      <div class="thread">${thread}</div>
      ${t && String(t.id)===String(act) ? msgSuggestHtml() : ""}
    </div>`;
  const box=$("ibMsgs"); if(box) box.scrollTop=box.scrollHeight;
}
async function sendInboxMsg(){
  const inp=$("ibInput"); const txt=(inp.value||"").trim(); if(!txt) return;
  const t=S.activeThread; if(!t) return;
  inp.disabled=true;
  try{
    await PSApi.post("/messages",{to_user_id:t.other_id, body:txt, context_ref:t.context_ref||null});
    S.activeThread=await PSApi.get(`/conversations/${t.id}/messages`);
    await loadConvos();
    renderMessages(true);
  }catch(err){ toast(err.message||"Could not send message"); if($("ibInput")) $("ibInput").disabled=false; }
}

/* ==================== DEAL BUILDER ==================== */
async function buyOffer(listingId, priceIdx){
  const l=findListing(listingId); const p=l.pricing[priceIdx];
  if(l.example || !/^\d+$/.test(String(l.ownerId))){
    toast("This is an example listing — buy from a real listing to transact."); return;
  }
  if(!S.account){ window._afterAuth=()=>buyOffer(listingId,priceIdx); authModal("login"); return; }
  if(!S.account.is_business){ toast("Only a business can buy an offer — sign up as a business to fund a deal."); return; }
  const amount=Number(p.amount)||0;
  if(amount<=0){ toast("Commission / custom offers — use “Request a quote”."); requestQuote(listingId); return; }
  const listed_price=Math.round(amount*100); // offer amount is in pounds → pence
  try{
    const deal=await PSApi.post("/deals",{platform_owner_id:parseInt(l.ownerId,10),listed_price,currency:"gbp",
      terms:{offer:p.label,detail:p.detail,deliverables:p.label,platform:l.platform,owner:l.name,listing_id:l.id}});
    closeModal(); showView("view-deal"); renderRealDeal(deal.id);
    toast("Deal created — review & approve the agreement",true);
  }catch(err){ toast(err.message||"Could not create deal"); }
}

/* ---------- Real deal room (backend-driven) ---------- */
// Delivery evidence: image proofs render inline; PDFs/other files get a view
// link; submitted URLs are clickable. Served same-origin from the proof store.
function proofItemHtml(p){
  const label = esc(p.kind || "evidence");
  let media = "";
  if(p.is_image && p.file_url){
    media = `<a href="${p.file_url}" target="_blank" rel="noopener" class="proof-thumb"><img src="${p.file_url}" alt="${label}" loading="lazy"></a>`;
  } else if(p.has_file && p.file_url){
    media = `<a href="${p.file_url}" target="_blank" rel="noopener" class="btn btn-o btn-sm" style="margin-top:8px">📄 View file</a>`;
  }
  const link = p.url ? `<div class="pb-link"><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.url)}</a></div>` : "";
  return `<div class="proof-item got proof-block">
    <div class="pb-head"><span class="pi-ico">${p.is_image?"🖼️":p.has_file?"📄":"🔗"}</span><b>${label}</b><span class="ok">submitted</span></div>
    ${link}${media}
  </div>`;
}
// A deal party's real name, clickable through to their actual profile.
function partyLink(id,name){
  return `<a href="#" class="party-link" onclick="event.preventDefault();openProfile(${id})">${esc(name||"—")}</a>`;
}
// backRef: optional "c12"/"p3" so the viewer can return to where they came from
// instead of only being able to close out entirely.
async function openProfile(userId, backRef){
  setRoute("profile", userId);
  let p; try{ p=await PSApi.get(`/users/${userId}/public`); }catch(e){ toast("Couldn't load that profile"); return; }
  const roles=[]; if(p.is_business)roles.push("Business"); if(p.is_platform_owner)roles.push("Platform owner");
  const stars = p.rating!=null ? `⭐ ${p.rating.toFixed(1)} (${p.review_count})` : "No rating yet";
  const listings = p.listings&&p.listings.length ? `<div class="det-sec"><h5>Listings</h5>${p.listings.map(l=>`<div class="op-row" onclick="closeModal();openListing('${l.id}')">${pfp(l.name,l.platform,"",l.ownerAvatar)}<div><b>${esc(l.name)}</b><small>${esc(l.platform)} · ${fmtN(l.audience)}</small></div><span class="op-go">View →</span></div>`).join("")}</div>` : "";
  // Mirror the listing's sections on the profile: services & pricing, audience
  // & analytics, My Work, past campaigns — all from the same real data.
  const svc = (p.listings||[]).filter(l=>(l.services&&l.services.length)||(l.pricing&&l.pricing.length)).map(l=>
    `<div class="det-sec"><h5>Services &amp; pricing — ${esc(l.name)}</h5>
      ${l.services&&l.services.length?`<div class="tagrow" style="margin-bottom:8px">${l.services.map(x=>`<span class="tag">${esc(x)}</span>`).join("")}</div>`:""}
      ${(l.pricing||[]).map(pr=>`<div class="offer-row"><span class="tag ind offer-kind">${esc(PM_LABEL[pr.type]||pr.type||"")}</span>
        <div class="oi"><b>${esc(pr.label||"")}</b><small>${esc(pr.detail||"")}</small></div>
        <span class="op">${pr.amount>0?gbp(pr.amount):"Quote"}</span></div>`).join("")}</div>`).join("");
  const aud = (p.listings||[]).map(l=>
    `<div class="det-sec"><h5>Audience &amp; analytics — ${esc(l.name)} ${l.verified?'<span class="tag grn">Verified ✔</span>':'<span class="tag">Self-reported</span>'}</h5>
      <div class="statrow big"><div><b>${fmtN(l.audience)}</b><span>Followers</span></div>
      <div><b>${fmtN(l.avgViews)}</b><span>Avg views</span></div>
      <div><b>${fmtN(l.impressions)}</b><span>Avg impressions</span></div>
      <div><b>${l.er}%</b><span>Engagement</span></div></div></div>`).join("");
  const work = (p.work&&p.work.length) ? `<div class="det-sec"><h5>My Work</h5><div class="work-grid">${p.work.map(m=>{
      if(m.has_video&&m.video_url) return `<div><video controls preload="metadata" src="${m.video_url}" style="width:100%;border-radius:10px;background:#000;max-height:300px"></video><small class="mut" style="font-size:12.5px">${esc(m.title||"Sample")}</small></div>`;
      if(m.link_url) return `<div><a href="${esc(m.link_url)}" target="_blank" rel="noopener" class="work-link-card">${m.cover_url?`<img src="${m.cover_url}" alt="${esc(m.title||'sample')}">`:`<div class="work-link-ph">🔗</div>`}<span class="work-link-go">Open link ↗</span></a><small class="mut" style="font-size:12.5px">${esc(m.title||"Sample")}</small></div>`;
      return "";
    }).join("")}</div></div>` : "";
  const pastAuto = (p.past_campaigns&&p.past_campaigns.length)
    ? `<div class="det-sec"><h5>Past campaigns (${p.past_campaigns.length})</h5><div class="pastc">${p.past_campaigns.map(pastAutoHtml).join("")}</div></div>` : "";
  // Business side: campaigns they've completed and paid out for — evidence that
  // they pay for real work. Derived from genuinely completed deals.
  const bizPast = (p.business_past_campaigns&&p.business_past_campaigns.length)
    ? `<div class="det-sec"><h5>Our previous campaigns (${p.business_past_campaigns.length})</h5>
        <p class="mut" style="font-size:12.5px;margin:-4px 0 10px">Completed and paid out through PromoSlot Payment Protection.</p>
        <div class="pastc">${p.business_past_campaigns.map(x=>{
          const n=v=>v!=null?Number(v).toLocaleString("en-GB"):"—";
          const stars=x.rating?`<div class="pcs">${"★".repeat(x.rating)}${"☆".repeat(5-x.rating)}</div>`:"";
          const txt=x.review_text?`<p class="det-p" style="margin:6px 0 0;font-size:12.5px">“${esc(x.review_text)}”</p>`:"";
          const views=(x.views_promised!=null||x.views_delivered!=null)
            ? `<div class="pcs">📈 ${n(x.views_promised)} promised → ${n(x.views_delivered)} delivered</div>`:"";
          return `<div class="pc"><b>${esc(x.campaign||"")}</b><small>Delivered by ${esc(x.owner||"")}</small>
            <div class="pcs">💷 ${gbpP(x.amount_paid||0)} paid</div>${views}${stars}${txt}
            <div class="mut" style="font-size:11.5px;margin-top:6px">Completed ${x.completed_at?new Date(x.completed_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):""}</div></div>`;
        }).join("")}</div></div>` : "";
  const campaigns = p.campaigns&&p.campaigns.length ? `<div class="det-sec"><h5>Campaigns</h5>${p.campaigns.map(c=>`<div class="op-row" onclick="closeModal();openCampaign('${c.id}')">${pfp(c.company,null,"",c.companyAvatar)}<div><b>${esc(c.title)}</b><small>${esc(c.company)}</small></div><span class="op-go">View →</span></div>`).join("")}</div>` : "";
  const reviews = p.reviews&&p.reviews.length
    ? `<div class="det-sec"><h5>Reviews (${p.review_count})</h5>${p.reviews.map(r=>`<div class="rev-item"><div class="rvtop"><span class="rev-who">${pfp(r.author_name,null,"rev-dot",r.author_avatar)}<b>${esc(r.author_name||"")}</b></span><span class="stars">${"★".repeat(r.rating)}${"☆".repeat(5-r.rating)}</span></div>${r.text?`<p>${esc(r.text)}</p>`:""}</div>`).join("")}</div>`
    : `<div class="det-sec"><h5>Reviews</h5><p class="mut" style="font-size:13px">No reviews yet — a rating appears after a completed deal.</p></div>`;
  const intro = p.intro_video_url ? `<div class="det-sec pintro"><h5>Who we are — video</h5><video controls preload="metadata" src="${p.intro_video_url}"></video></div>` : "";
  const about = p.about_text ? `<div class="det-sec"><h5>Who we are</h5><p class="det-p" style="white-space:pre-wrap">${esc(p.about_text)}</p></div>` : "";
  const links = (p.links&&p.links.length)
    ? `<div class="det-sec"><h5>Links</h5><div class="tagrow">${p.links.map(l=>`<a class="tag ind" href="${esc(l.url)}" target="_blank" rel="noopener">🔗 ${esc(l.label||l.url)}</a>`).join("")}</div></div>` : "";
  const assets = (p.assets&&p.assets.length)
    ? `<div class="det-sec"><h5>Files &amp; images</h5><div class="work-grid">${p.assets.map(a=>a.is_image
        ? `<a href="${a.url}" target="_blank" rel="noopener" class="proof-thumb"><img src="${a.url}" alt="${esc(a.title)}" loading="lazy"></a>`
        : `<a href="${a.url}" target="_blank" rel="noopener" class="btn btn-o btn-sm">📄 ${esc(a.title)}</a>`).join("")}</div></div>` : "";
  const backBtn = backRef
    ? `<button class="btn btn-o btn-sm" onclick="${/^c\d+$/.test(backRef)?`openCampaign('${backRef}')`:`openListing('${backRef}')`}">← Back to ${/^c\d+$/.test(backRef)?"campaign":"listing"}</button>`
    : "";
  openModal(`<div class="det-head">${avatarBlock(p.avatar_url,p.display_name,true)}
      <div class="det-title"><h3>${esc(p.display_name)}</h3>
        <div class="handle">${roles.join(" · ")||"Member"} · ${stars}</div></div>
      <div class="det-actions">${backBtn}${acpAccountLinkHtml(p.id, p.display_name || "")}</div></div>
    <div class="det-body">${about}${intro}${links}${assets}${svc}${aud}${work}${pastAuto}${bizPast}${listings}${campaigns}${reviews}</div>`,"wide");
}
async function renderRealDeal(dealId){
  setRoute("deal", dealId);
  let d;
  try{ d=await PSApi.get("/deals/"+dealId); }catch(err){ toast(err.message||"Could not load deal"); return; }
  const meBiz = S.account && S.account.id===d.business_id;
  const meOwner = S.account && S.account.id===d.platform_owner_id;
  const isReviewer = can("deal.view_evidence");
  const bothApproved = d.business_approved && d.owner_approved;
  let proofs=[];
  if(d.funded && (meBiz||meOwner||isReviewer)){ try{ proofs=await PSApi.get("/deals/"+dealId+"/proofs"); }catch(e){} }
  let myReview=null;
  if(d.paid && (meBiz||meOwner)){
    try{ const revs=await PSApi.get("/deals/"+dealId+"/reviews");
      myReview=revs.find(r=>String(r.author_id)===String(S.account&&S.account.id))||null; }catch(e){}
  }
  const steps=["Agreement","Approval","Funding","Delivery","Verification","Payout"];
  let cur=1;
  if(d.business_approved||d.owner_approved) cur=2;
  if(bothApproved) cur=3; if(d.funded) cur=4; if(d.verified) cur=5; if(d.paid) cur=6;
  const donePct=Math.min(100,Math.round(((cur-1)/(steps.length-1))*100));
  const stepper=`<div class="stepper"><div class="stepper-track"><i style="width:${donePct}%"></i></div>${steps.map((s,i)=>{
    const n=i+1, cls=n<cur?"done":n===cur?"cur":""; return `<div class="step ${cls}"><div class="dot">${n<cur?"✓":n}</div><span>${s}</span></div>`;}).join("")}</div>`;
  const ctxLabel = d.terms&&d.terms.offer ? " · "+esc(d.terms.offer)
                 : d.terms&&d.terms.campaign_title ? " · "+esc(d.terms.campaign_title) : "";
  const doc=`<div class="agree-doc">
    <div class="ad-head"><span>📄 Deal ${d.id}${ctxLabel}</span><span>${partyLink(d.business_id,d.business_name)} ⇄ ${partyLink(d.platform_owner_id,d.owner_name)}</span></div>
    ${d.terms&&d.terms.kind==="application"?`<div class="ad-row"><span class="k">Source</span><span class="v">Application to “${esc(d.terms.campaign_title||"campaign")}”</span></div>`:""}
    ${d.terms&&d.terms.kind==="application"&&d.terms.pitch?`<div class="ad-row"><span class="k">Applicant pitch</span><span class="v">${esc(d.terms.pitch)}</span></div>`:""}
    <div class="ad-row"><span class="k">Listed price</span><span class="v">${gbpP(d.listed_price)}</span></div>
    <div class="ad-row"><span class="k">Buyer protection fee (${d.buyer_fee_percent}%)</span><span class="v">${gbpP(d.buyer_protection_fee)}</span></div>
    <div class="ad-row"><span class="k">Total charged to business</span><span class="v"><b>${gbpP(d.total_charged)}</b></span></div>
    <div class="ad-row"><span class="k">Seller fee (${d.seller_fee_percent}%)</span><span class="v">− ${gbpP(d.seller_fee)}</span></div>
    <div class="ad-row"><span class="k">Owner receives</span><span class="v"><b>${gbpP(d.net_to_owner)}</b></span></div>
    <div class="ad-row"><span class="k">PromoSlot take</span><span class="v">${gbpP(d.platform_take)}</span></div>
    ${d.terms&&d.terms.deliverables?`<div class="ad-row"><span class="k">Deliverables</span><span class="v">${esc(d.terms.deliverables)}</span></div>`:""}
    ${d.terms&&d.terms.pricing&&d.terms.pricing.length?d.terms.pricing.map(pm=>`<div class="ad-row"><span class="k">${esc(pm.label||"Payment")}</span><span class="v">${esc(pm.detail||"")}</span></div>`).join(""):""}</div>`;
  let main;
  if(d.status==="cancelled"){
    main=`<h3 class="deal-h">Deal declined</h3>
    <p class="deal-sub">This deal was cancelled before funding — no money moved. ${d.terms&&d.terms.kind==="application"?"The application is closed; the owner can apply again with new terms.":""}</p>
    ${doc}`;
  } else if(!d.funded){
    // The other side withdrew the listing/campaign this deal came from before it
    // was funded. Say so plainly instead of showing "waiting for funding"
    // indefinitely — the deal stays in history either way.
    const gone = d.source_removed;                       // "listing" | "campaign" | null
    const goneWord = gone==="campaign" ? "Campaign" : "Listing";
    const goneNote = gone ? `<div class="note" style="margin-top:0;margin-bottom:14px">
      <b>${goneWord} removed by ${gone==="campaign"?"the business":"the owner"}.</b>
      This deal was never funded, and the ${gone} it came from has since been taken down —
      so it is not going ahead. No money moved. It stays here in your deal history for
      your records.</div>` : "";
    main=`${goneNote}<h3 class="deal-h">${gone?`${goneWord} removed — deal not going ahead`:(bothApproved?"Fund the deal":"Approve the agreement")}</h3>
    <p class="deal-sub">${gone?"Nothing further is expected from either side.":(bothApproved?"Both parties approved. The business funds the agreed amount, held pending verification, before work starts.":"Both parties approve the same agreement before any money moves.")}</p>
    ${doc}
    <div class="approve-row">
      <div class="appr ${d.business_approved?"ok":""}"><b>${partyLink(d.business_id,d.business_name)}</b><small>business · funds the deal</small><div class="st">${d.business_approved?'<span class="ok-txt">✓ Approved</span>':(gone?'<span class="mut">—</span>':meBiz?`<button class="btn btn-p btn-sm" onclick="realApprove(${d.id})">Approve</button>`:'<span class="mut">Waiting</span>')}</div></div>
      <div class="appr ${d.owner_approved?"ok":""}"><b>${partyLink(d.platform_owner_id,d.owner_name)}</b><small>platform owner · delivers</small><div class="st">${d.owner_approved?'<span class="ok-txt">✓ Approved</span>':(gone?'<span class="mut">—</span>':meOwner?`<button class="btn btn-p btn-sm" onclick="realApprove(${d.id})">Approve</button>`:'<span class="mut">Waiting</span>')}</div></div>
    </div>
    ${!gone&&bothApproved&&meBiz?`<div id="fundArea"><button class="btn btn-g btn-lg" style="margin-top:16px" onclick="realFund(${d.id})">🔒 Fund ${gbpP(d.total_charged)} with Payment Protection</button></div>`:""}
    ${!gone&&bothApproved&&!meBiz?`<div class="note blue" style="margin-top:16px">Waiting for the business to fund ${gbpP(d.total_charged)}, held pending verification.</div>`:""}
    ${(meBiz||meOwner)?`<div style="margin-top:12px"><button class="btn btn-ghost btn-sm" onclick="realDecline(${d.id})">Decline &amp; cancel</button></div>`:""}`;
  } else {
    const proofList = proofs.length
      ? proofs.map(proofItemHtml).join("")
      : `<p class="mut" style="font-size:12.5px">No delivery evidence submitted yet.</p>`;
    main=`<h3 class="deal-h">Funded — ${gbpP(d.total_charged)} held pending verification 🔒</h3>
    <p class="deal-sub">Money held by PromoSlot. The owner delivers &amp; submits proof → a reviewer verifies → the owner is paid ${gbpP(d.net_to_owner)} (listed price − ${d.seller_fee_percent}% seller fee).</p>
    ${doc}
    <div class="det-sec" style="margin-top:18px"><h5>Progress</h5>
      <div class="proof-item got"><span class="pi-ico">🔒</span>Payment Protection funded<span class="ok">✓</span></div>
      <div class="proof-item ${d.verified?"got":""}"><span class="pi-ico">🔎</span>Delivery verified by a reviewer<span class="ok">${d.verified?"✓":"pending"}</span></div>
      <div class="proof-item ${d.paid?"got":""}"><span class="pi-ico">💸</span>Payout released to owner<span class="ok">${d.paid?"✓ "+gbpP(d.net_to_owner):"pending"}</span></div></div>
    <div class="det-sec"><h5>Delivery evidence</h5>${proofList}
      ${meOwner && proofs.length ? `<p class="review-thanks" style="margin-top:10px">Thank you for submitting proof of delivery, your submission will be reviewed by our team shortly</p>` : ""}
      ${meOwner && !d.verified ? `<div class="frm" style="margin-top:10px">
        <div><label>Views delivered (optional — shown on your Past campaigns)${d.views_promised?` · ${fmtN(d.views_promised)} promised`:""}</label>
          <input type="number" id="pf-views" min="0" placeholder="e.g. 12500" value="${d.views_delivered!=null?d.views_delivered:""}"></div>
        <div id="pf-slots">${proofSlotHtml(0)}</div>
        <div style="margin-top:8px"><button class="btn btn-ghost btn-sm" onclick="addProofSlot()">＋ Add another item</button></div>
        <button class="btn btn-p btn-sm" style="margin-top:10px" onclick="realSubmitProof(${d.id})">Submit evidence</button></div>` : ""}</div>
    ${isReviewer ? reviewerControls(d, proofs.length) : ""}
    ${(d.paid && (meBiz||meOwner)) ? (myReview
      ? `<p class="review-thanks">– Thank you for leaving a review, your response has been submitted</p>`
      : `<div class="btn-row"><button class="btn btn-p" onclick="realReviewModal(${d.id})">⭐ Leave a review</button></div>`) : ""}`;
  }
  $("dealWrap").innerHTML=`
    <div class="deal-top"><button class="btn btn-ghost" onclick="openDash()">← Dashboard</button><h2>Deal ${d.id}</h2>
      <span class="deal-status status-pill ${d.paid?"st-done":d.funded?"st-escrow":"st-review"}">${d.source_removed?esc(d.source_removed==="campaign"?"Campaign removed":"Listing removed"):esc(d.status)}</span></div>
    ${stepper}
    <div class="deal-grid"><div class="deal-main view-anim">${main}</div>
      <div class="deal-side">
        <div class="side-card"><h5>Amounts</h5><div class="mini-rows">
          <div><span>Listed price</span><b>${gbpP(d.listed_price)}</b></div>
          <div><span>Business pays</span><b>${gbpP(d.total_charged)}</b></div>
          <div><span>Owner receives</span><b>${gbpP(d.net_to_owner)}</b></div>
          <div><span>PromoSlot</span><b>${gbpP(d.platform_take)}</b></div>
        </div></div>
        <div class="side-card trust-card"><h5>Protected by PromoSlot</h5><p>Funds held pending verification · verified delivery · payout only on completion.</p></div>
      </div></div>`;
}
async function realApprove(dealId){
  try{ await PSApi.post(`/deals/${dealId}/approve`); }catch(err){ toast(err.message||"Could not approve"); return; }
  toast("Your approval is recorded",true); renderRealDeal(dealId);
}
async function realDecline(dealId){
  if(!confirm("Decline and cancel this deal? This can't be undone — no money has moved.")) return;
  try{ await PSApi.post(`/deals/${dealId}/decline`); }catch(err){ toast(err.message||"Could not decline"); return; }
  toast("Deal declined",true); openDash();
}
function ensureStripeJs(){
  // The design-tool runtime rebuilds <head>, stripping static external scripts,
  // so we load Stripe.js dynamically at point of use.
  if(typeof window.Stripe!=="undefined") return Promise.resolve();
  if(window._stripeJsPromise) return window._stripeJsPromise;
  window._stripeJsPromise=new Promise((resolve,reject)=>{
    const s=document.createElement("script");
    s.src="https://js.stripe.com/v3/";
    s.onload=()=>resolve(); s.onerror=()=>reject(new Error("Stripe.js failed to load"));
    document.head.appendChild(s);
  });
  return window._stripeJsPromise;
}
async function realFund(dealId){
  let r;
  try{ r=await PSApi.post(`/deals/${dealId}/fund`); }catch(err){ toast(err.message||"Could not start funding"); return; }
  try{ await ensureStripeJs(); }catch(e){ toast("Stripe.js failed to load"); return; }
  const li=r.line_items.map(x=>`<div class="ad-row"><span class="k">${esc(x.label)}</span><span class="v">${gbpP(x.amount)}</span></div>`).join("");
  $("fundArea").innerHTML=`
    <div class="agree-doc" style="margin:14px 0">${li}<div class="ad-row"><span class="k"><b>Total to pay</b></span><span class="v"><b>${gbpP(r.total_charged)}</b></span></div></div>
    <div id="payment-element" style="margin:12px 0"></div>
    <div class="hint-err hide" id="pay-err"></div>
    <button class="btn btn-g btn-lg" id="pay-btn" onclick="realPay()">Pay ${gbpP(r.total_charged)}</button>
    <p class="mut" style="font-size:12px;margin-top:8px">Test card: 4242 4242 4242 4242 · any future expiry · any CVC.</p>`;
  if(typeof Stripe==="undefined"){ const e=$("pay-err"); e.textContent="Stripe.js failed to load."; e.classList.remove("hide"); return; }
  const stripe=Stripe(r.publishable_key);
  const elements=stripe.elements({clientSecret:r.client_secret});
  const pe=elements.create("payment");
  pe.mount("#payment-element");
  window._stripeCtx={stripe,elements,dealId,total:r.total_charged};
}
async function realPay(){
  const ctx=window._stripeCtx; if(!ctx) return;
  const btn=$("pay-btn"); btn.disabled=true; btn.innerHTML=`<span class="spin"></span> Processing…`;
  const res=await ctx.stripe.confirmPayment({elements:ctx.elements, redirect:"if_required"});
  if(res.error){ btn.disabled=false; btn.textContent="Pay "+gbpP(ctx.total); const e=$("pay-err"); e.textContent=res.error.message; e.classList.remove("hide"); return; }
  // Reconcile with the backend (real Stripe re-verify; the deal funds only if
  // Stripe confirms the PaymentIntent succeeded).
  try{ await PSApi.post(`/deals/${ctx.dealId}/refresh`); }catch(e){}
  window._stripeCtx=null;
  toast("Payment successful — Payment Protection funded 🔒",true);
  renderRealDeal(ctx.dealId);
}
function reviewerControls(d, proofCount){
  let inner;
  if(!d.verified){
    // Verification step — three distinct outcomes. Verifying does NOT pay out.
    inner = proofCount>0
      ? `<p class="mut" style="font-size:12.5px;margin-bottom:9px">Verifying only confirms the evidence meets the agreed terms — it does <b>not</b> release money. Payout is a separate step you take afterwards.</p>
         <div class="btn-row">
           <button class="btn btn-g btn-sm" onclick="realVerify(${d.id},'approved')">✓ Verify — evidence meets terms</button>
           <button class="btn btn-o btn-sm" onclick="realVerify(${d.id},'rejected')">↩︎ Send back for revision</button>
           <button class="btn btn-danger btn-sm" onclick="realRefund(${d.id})">✕ Disapprove &amp; refund business</button>
         </div>`
      : `<p class="mut" style="font-size:12.5px">Waiting for the owner to submit evidence before you can verify.</p>`;
  } else if(!d.paid){
    // Verified but unpaid — payout is a separate, deliberate action (also on the Awaiting Payouts page).
    inner = `<div class="note blue" style="margin:0 0 10px">✓ Verified — <b>awaiting payout</b>. Releasing funds is a separate action; do it now or later from <b>Awaiting Payouts</b>.</div>
      <div class="btn-row">
        <button class="btn btn-g btn-sm" onclick="realRelease(${d.id})">💸 Release payout — ${gbpP(d.net_to_owner)} to owner</button>
        <button class="btn btn-danger btn-sm" onclick="realRefund(${d.id})">✕ Refund business instead</button>
      </div>`;
  } else {
    inner = `<p class="ok-txt" style="font-size:13px">✓ Verified &amp; paid out — deal complete.</p>`;
  }
  return `<div class="det-sec" style="margin-top:18px"><h5>Reviewer actions</h5>${inner}</div>`;
}
// Delivery evidence: one slot by default, "+" adds more (no cap). Each slot
// takes a link and/or a file via click OR drag-and-drop (any file type).
function proofSlotHtml(idx){
  return `<div class="pf-slot" data-idx="${idx}">
    <div class="row2">
      <div><label>Kind</label><input type="text" id="pf-kind-${idx}" placeholder="screenshot / analytics / link" value="screenshot"></div>
      <div><label>Published link (optional)</label><input type="text" id="pf-url-${idx}" placeholder="https://tiktok.com/@you/video/…"></div>
    </div>
    <div class="dropzone" id="pf-dz-${idx}"
         ondragover="event.preventDefault();this.classList.add('drag')"
         ondragleave="this.classList.remove('drag')"
         ondrop="pfDrop(event,${idx})">
      <input type="file" id="pf-file-${idx}" class="pf-file-input" onchange="pfFileName(${idx})">
      <span class="dz-text" id="pf-dzt-${idx}">Drag &amp; drop a file here, or <label for="pf-file-${idx}" class="dz-link">select file</label> — any type</span>
    </div>
  </div>`;
}
function addProofSlot(){
  const wrap=$("pf-slots"); if(!wrap) return;
  wrap.insertAdjacentHTML("beforeend", proofSlotHtml(wrap.querySelectorAll(".pf-slot").length));
}
function pfDrop(e,idx){
  e.preventDefault(); const dz=$("pf-dz-"+idx); if(dz) dz.classList.remove("drag");
  const f=e.dataTransfer&&e.dataTransfer.files;
  if(f&&f.length){ try{ $("pf-file-"+idx).files=f; }catch(_){} pfFileName(idx); }
}
function pfFileName(idx){
  const inp=$("pf-file-"+idx), t=$("pf-dzt-"+idx); if(!inp||!t) return;
  const f=inp.files[0];
  t.innerHTML = f ? `📎 ${esc(f.name)} — <label for="pf-file-${idx}" class="dz-link">change</label>`
                  : `Drag &amp; drop a file here, or <label for="pf-file-${idx}" class="dz-link">select file</label> — any type`;
}
async function realSubmitProof(dealId){
  const items=[];
  document.querySelectorAll("#pf-slots .pf-slot").forEach(s=>{
    const idx=s.dataset.idx;
    const kind=(($("pf-kind-"+idx)||{}).value||"screenshot").trim();
    const url=(($("pf-url-"+idx)||{}).value||"").trim();
    const file=($("pf-file-"+idx)||{files:[]}).files[0];
    if(url||file) items.push({kind,url,file});
  });
  if(!items.length){ toast("Add at least one link or file"); return; }
  const vd=(($("pf-views")||{}).value||"").trim();
  try{
    for(let i=0;i<items.length;i++){
      const it=items[i];
      const fd=new FormData(); fd.append("kind",it.kind||"screenshot");
      if(it.url) fd.append("url",it.url); if(it.file) fd.append("file",it.file);
      if(i===0 && vd!=="") fd.append("views_delivered", vd);   // owner-reported, once
      await PSApi.postForm(`/deals/${dealId}/proof`, fd);
    }
  }catch(err){ toast(err.message||"Could not submit evidence"); renderRealDeal(dealId); return; }
  toast(items.length>1?`${items.length} evidence items submitted`:"Evidence submitted",true);
  renderRealDeal(dealId);
}
// The API requires a stated reason and an explicit confirmation that the
// evidence was reviewed — these are enforced server-side, not just here.
function adminReasonPrompt(title){
  const reason=window.prompt(`${title}\n\nState a reason (recorded permanently in the audit log):`,"");
  if(reason===null) return null;
  if(reason.trim().length<3){ toast("A reason of at least 3 characters is required"); return null; }
  if(!confirm("Confirm: you have reviewed the delivery evidence for this deal.")) return null;
  return reason.trim();
}
async function realVerify(dealId, decision){
  const label={approved:"Verify this delivery",rejected:"Reject this delivery",
               changes_requested:"Send back for revision"}[decision]||"Review decision";
  const reason=adminReasonPrompt(label); if(reason===null) return;
  try{ await PSApi.post(`/review/deals/${dealId}/verify`,{decision,reason,evidence_reviewed:true}); }
  catch(err){ toast(err.message||"Verify failed"); return; }
  toast(decision==="approved"
    ? "Verified ✓ — moved to Awaiting Payouts (release payout separately when ready)"
    : "Sent back to the owner for revision", true);
  loadNotifications();
  renderRealDeal(dealId);
}
async function realRelease(dealId){
  const reason=adminReasonPrompt("Release this payout"); if(reason===null) return;
  try{ const r=await PSApi.post(`/review/deals/${dealId}/release`,{reason,evidence_reviewed:true});
    toast("Payout released — "+gbpP(r.net_to_owner)+" to owner 💸",true); }
  catch(err){ toast(err.message||"Release failed"); return; }
  loadNotifications();
  renderRealDeal(dealId);
}
async function realRefund(dealId){
  if(!confirm("Disapprove this delivery and refund the business? The protected funds are returned to the business and the deal is closed. This can't be undone.")) return;
  const reason=adminReasonPrompt("Refund the business"); if(reason===null) return;
  try{ await PSApi.post(`/review/deals/${dealId}/refund`,{reason,evidence_reviewed:true}); toast("Business refunded ↩︎",true); }
  catch(err){ toast(err.message||"Refund failed"); return; }
  loadNotifications();
  renderRealDeal(dealId);
}
function realReviewModal(dealId){
  window._reviewStars=5;
  openModal(`<div class="m-pad"><h3 class="m-title">Leave a review</h3>
    <p class="m-sub">Reviews only attach to a genuinely completed deal.</p>
    <div class="rev-stars" id="revStars">${[1,2,3,4,5].map(i=>`<span data-n="${i}" onclick="setReviewStars(${i})">★</span>`).join("")}</div>
    <div class="frm"><div><label>Your review</label><textarea id="rev-text" placeholder="How did the deal go against what was agreed?"></textarea></div></div>
    <div class="m-actions"><button class="btn btn-o" onclick="closeModal()">Later</button><button class="btn btn-p" onclick="realSubmitReview(${dealId})">Publish review</button></div></div>`,"narrow");
}
function setReviewStars(n){ window._reviewStars=n; document.querySelectorAll("#revStars span").forEach((s,j)=>s.textContent=j<n?"★":"☆"); }
async function realSubmitReview(dealId){
  const rating=window._reviewStars||5; const text=($("rev-text").value||"").trim();
  try{ await PSApi.post(`/deals/${dealId}/review`,{rating,text}); }catch(err){ toast(err.message||"Could not publish review"); return; }
  closeModal(); toast("Review published — thanks for keeping the marketplace honest",true);
  loadMarket();          // refresh cached ratings so profiles/cards reflect it immediately
  renderRealDeal(dealId); // re-render: the review option is now replaced by the thank-you
}
// Applying to a campaign creates a REAL owner-initiated deal (backend), which the
// business then approves and funds — the same escrow flow as a bought offer, only
// the platform owner starts it. Example campaigns can't transact.
// Payment-method models — same set as the platform-listing pricing builder,
// reused here so an applicant can propose one or more payment methods, each with
// its own relevant fields. The upfront/guaranteed portion is escrowed.
const PM_MODELS={
  fixed:{label:"Fixed price",fields:[{id:"label",l:"What's included",t:"text",d:"1 promotional post"},{id:"price",l:"Amount (£)",t:"number",d:"100"}],
    amount:v=>Number(v.price)||0, detail:v=>`${v.label||"1 post"} · £${v.price||0} fixed`},
  "per-view":{label:"Per view",fields:[{id:"min",l:"Minimum guaranteed (£)",t:"number",d:"30"},{id:"rate",l:"Rate per 1,000 views (£)",t:"number",d:"8"},{id:"views",l:"Expected views",t:"number",d:"10000"},{id:"cap",l:"Maximum payout (£)",t:"number",d:"250"}],
    amount:v=>Number(v.min)||0, detail:v=>`£${v.min||0} min + £${v.rate||0} per 1,000 views (expected ${v.views||0}) · capped £${v.cap||0}`},
  "per-imp":{label:"Per impression",fields:[{id:"rate",l:"Rate per 1,000 impressions (£)",t:"number",d:"3"},{id:"imps",l:"Expected impressions",t:"number",d:"50000"}],
    amount:v=>Number(v.rate)||0, detail:v=>`£${v.rate||0} per 1,000 impressions (expected ${v.imps||0})`},
  time:{label:"Time-based",fields:[{id:"price",l:"Price (£)",t:"number",d:"40"},{id:"unit",l:"Per",t:"select",opts:["day","week","month"],d:"week"},{id:"dur",l:"Duration",t:"number",d:"4"}],
    amount:v=>Number(v.price)||0, detail:v=>`£${v.price||0} per ${v.unit||"week"} · ${v.dur||1} ${v.unit||"week"}(s)`},
  affiliate:{label:"Affiliate",fields:[{id:"pct",l:"% per sale",t:"number",d:"12"},{id:"cookie",l:"Cookie window (days)",t:"number",d:"30"},{id:"min",l:"Min payout (£)",t:"number",d:"0"}],
    amount:v=>Number(v.min)||0, detail:v=>`${v.pct||0}% per sale · ${v.cookie||30}-day cookie${Number(v.min)?` · £${v.min} min`:""}`},
  hybrid:{label:"Hybrid (guaranteed + performance)",fields:[{id:"guar",l:"Guaranteed (£)",t:"number",d:"50"},{id:"extra",l:"Plus performance terms",t:"text",d:"£5 per 1,000 views"}],
    amount:v=>Number(v.guar)||0, detail:v=>`£${v.guar||0} guaranteed + ${v.extra||"performance"}`},
  custom:{label:"Custom",fields:[{id:"note",l:"Describe the terms",t:"text",d:""}],
    amount:()=>0, detail:v=>v.note||"Custom terms"},
};
const PM_ORDER=["fixed","per-view","per-imp","time","affiliate","hybrid","custom"];
function pmFieldsHtml(idx,type){
  const m=PM_MODELS[type]||PM_MODELS.fixed;
  return `<div class="row2">${m.fields.map(f=>f.t==="select"
    ? `<div><label>${f.l}</label><select id="pm-${idx}-${f.id}">${f.opts.map(o=>`<option ${o===f.d?"selected":""}>${o}</option>`).join("")}</select></div>`
    : `<div><label>${f.l}</label><input type="${f.t}" id="pm-${idx}-${f.id}" value="${esc(f.d)}"></div>`).join("")}</div>`;
}
function pmSlotHtml(idx){
  return `<div class="pm-slot" data-idx="${idx}">
    <div><label>Payment method</label><select id="pm-type-${idx}" onchange="pmSlotChange(${idx})">${PM_ORDER.map(k=>`<option value="${k}">${PM_MODELS[k].label}</option>`).join("")}</select></div>
    <div id="pm-fields-${idx}">${pmFieldsHtml(idx,"fixed")}</div>
  </div>`;
}
function pmSlotChange(idx){
  const type=($("pm-type-"+idx)||{}).value||"fixed";
  const host=$("pm-fields-"+idx); if(host) host.innerHTML=pmFieldsHtml(idx,type);
}
function addPmSlot(){
  const wrap=$("pm-slots"); if(!wrap) return;
  wrap.insertAdjacentHTML("beforeend", pmSlotHtml(wrap.querySelectorAll(".pm-slot").length));
}
function collectApplyPricing(){
  const pricing=[]; let total=0;
  document.querySelectorAll("#pm-slots .pm-slot").forEach(s=>{
    const idx=s.dataset.idx, type=($("pm-type-"+idx)||{}).value||"fixed", m=PM_MODELS[type];
    const v={}; m.fields.forEach(f=>{ const el=$(`pm-${idx}-${f.id}`); v[f.id]=el?el.value:""; });
    const amount=m.amount(v); total+=amount;
    pricing.push({type, label:m.label, detail:m.detail(v), amount, fields:v});
  });
  return {pricing, total};
}
async function applyCampaign(campId){
  const c=findCampaign(campId); if(!c) return;
  if(c.example || !/^c\d+$/.test(String(c.id))){ toast("This is an example campaign — apply to a real one to transact."); return; }
  if(!S.account){ window._afterAuth=()=>applyCampaign(campId); authModal("login"); return; }
  if(!S.account.is_platform_owner){ toast("Only a platform owner can apply — sign up as a platform owner to pitch."); return; }
  if(String(c.businessId)===String(S.account.id)){ toast("That's your own campaign — you can review applicants from it."); return; }
  let plats=S.myPlatforms||[];
  if(!plats.length){ try{ plats=await PSApi.get("/platforms/mine"); S.myPlatforms=plats; }catch(e){} }
  const platOpts=plats.map(p=>`<option value="${p.id}">${esc(p.name)} · ${esc(p.platform)}</option>`).join("");
  openModal(`<div class="m-pad"><h3 class="m-title">Apply to “${esc(c.title)}”</h3>
    <p class="m-sub">Propose one or more payment methods and a short pitch. <b>${esc(c.company)}</b> reviews applicants, then approves and funds the upfront amount, held pending verification, before you start work.</p>
    <div class="frm">
      ${plats.length
        ? `<div><label>Promote on</label><select id="ap-plat">${platOpts}</select></div>`
        : `<div class="note blue" style="margin:0">You don't have a listing yet — you can still apply, and add one anytime.</div>`}
      <div><label>Payment methods you propose</label>
        <div id="pm-slots">${pmSlotHtml(0)}</div>
        <div style="margin-top:6px"><button type="button" class="btn btn-ghost btn-sm" onclick="addPmSlot()">＋ add another payment method</button></div>
      </div>
      <div><label>Pitch (optional)</label><textarea id="ap-pitch" placeholder="Why you're a great fit, what you'd deliver, and a rough timeline…"></textarea></div>
    </div>
    <div class="m-actions"><button class="btn btn-o" onclick="openCampaign('${c.id}')">Back</button><button class="btn btn-p" onclick="submitApplication('${String(c.id).replace(/^c/,'')}')">Send application</button></div></div>`);
}
async function submitApplication(cid){
  const {pricing, total}=collectApplyPricing();
  if(!pricing.length){ toast("Add at least one payment method"); return; }
  const listed_price=Math.round(total*100);
  if(!(listed_price>=100)){ toast("At least one method needs an upfront/guaranteed amount (min £1) to hold pending verification."); return; }
  const platSel=$("ap-plat");
  const platform_id = platSel ? parseInt(platSel.value,10) : null;
  const pitch=(($("ap-pitch")||{}).value||"").trim();
  try{
    const deal=await PSApi.post(`/campaigns/${cid}/apply`,{listed_price, platform_id:platform_id||null, pitch, pricing});
    closeModal(); showView("view-deal"); renderRealDeal(deal.id);
    toast("Application sent — the business will review & approve",true);
  }catch(err){ toast(err.message||"Could not apply"); }
}
function dealById(id){ return S.deals.find(d=>d.id===id); }
const DEAL_STEPS=["Agreement","Approval","Payment Protection","Delivery & proof","Verification","Payout"];

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
      ${lockedStep("🔒","Payment Protection — "+gbp(amt),"The business funds the deal via Stripe. It is marked funded only after Stripe confirms the charge succeeded. Stripe payments are not connected yet.")}
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
          <p>Funds held pending verification · verified delivery · dispute support · 10% seller + 5% buyer fee, only on completion.</p></div>
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
  openModal(`<div class="m-pad"><h3 class="m-title">Cancel this deal?</h3><p class="m-sub">${d.step<3?"The deal hasn't been funded — cancellation is free and instant.":"Protected funds will be returned to the business per the cancellation terms."}</p>
  <div class="m-actions"><button class="btn btn-o" onclick="closeModal()">Keep deal</button><button class="btn btn-danger" onclick="S.deals=S.deals.filter(x=>x.id!=='${id}');closeModal();openDash();toast('Deal ${id} cancelled')">Cancel deal</button></div></div>`,"narrow");
}
function fundDeal(id){
  // Escrow funding requires a real, confirmed Stripe charge. No such integration
  // exists yet, so we never mark a deal funded here.
  const d=dealById(id);
  if(!INFRA.payments){
    openModal(`<div class="m-pad"><h3 class="m-title">Payment Protection isn't available yet</h3>
      <p class="m-sub">Funding a deal moves real money, held pending verification, so it can only happen through a live payment provider. PromoSlot's Stripe integration isn't connected yet, so no deal can be funded — and none will ever be shown as funded until a real Stripe charge succeeds.</p>
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
// Payment method offered only on the giveaway path (see the b-budget step).
// Campaign payment methods, each unlocked only by the step-1 goals that imply
// it. A method the business never unlocked must not appear at all: it used to
// render with no editable value, and a stale default could still reach the
// published campaign.
const BIZ_PAY_METHODS=[
  {key:"fixed",    label:"Fixed payment",        field:"Amount per approved post (£)",
   unlocks:["Looking to market a product","Wanting UGC content",
            "Looking for long-term brand ambassadors","Testing a new market"],
   detail:v=>`${gbp(v)} fixed per approved post`},
  {key:"per-view", label:"Price per view",       field:"Rate per 1,000 views (£)",
   unlocks:["Looking to market a product","Testing a new market"],
   detail:v=>`${gbp(v)} per 1,000 verified views`},
  {key:"affiliate",label:"Affiliate commission", field:"Commission per verified sale (%)",
   unlocks:["Looking to offer affiliate partnerships"],
   detail:v=>`${v}% commission per verified sale`},
  {key:"product",  label:"Free product",         field:"Retail value of the product supplied (£)",
   unlocks:["Looking to market a product","Wanting UGC content"],
   detail:v=>v?`Free product supplied (${gbp(v)} value)`:"Free product supplied"},
  {key:"giveaway", label:"Giveaway prize",       field:"Giveaway prize value (£)",
   unlocks:["Wanting to run a giveaway"],
   detail:v=>`${gbp(v)} giveaway prize supplied by the brand`},
];
function unlockedPayMethods(intents){
  return BIZ_PAY_METHODS.filter(m=>m.unlocks.some(i=>intents.has(i)));
}
function payMethodByKey(k){ return BIZ_PAY_METHODS.find(m=>m.key===k); }

// Selection + per-method value/note live in W.d.paySel: {key:{on,amount,note}}
function paySel(k){
  const d=W.d; d.paySel=d.paySel||{};
  d.paySel[k]=d.paySel[k]||{on:false,amount:"",note:""};
  return d.paySel[k];
}
function togglePayMethod(k){
  const c=paySel(k); c.on=!c.on;
  collectPaySel();            // keep what is already typed before re-rendering
  renderWiz();
}
function collectPaySel(){
  unlockedPayMethods(W.d.intentsB).forEach(m=>{
    const a=$("pm-amt-"+m.key), n=$("pm-note-"+m.key);
    if(a) paySel(m.key).amount=a.value;
    if(n) paySel(m.key).note=n.value;
  });
}
function payMethodsHtml(){
  const list=unlockedPayMethods(W.d.intentsB);
  if(!list.length) return `<p class="mut" style="font-size:12.5px">Go back to step 1 and pick a goal — the payment methods you can offer follow from it.</p>`;
  return `<div class="chips-lg">${list.map(m=>
      `<button type="button" class="chip ${paySel(m.key).on?"on":""}" onclick="togglePayMethod('${m.key}')">${esc(m.label)}</button>`).join("")}</div>`
    + list.filter(m=>paySel(m.key).on).map(m=>{
      const c=paySel(m.key);
      return `<div class="pm-slot" style="margin-top:10px">
        <div class="row2">
          <div><label>${esc(m.label)} — ${esc(m.field)}</label>
            <input type="number" min="0" step="any" id="pm-amt-${m.key}" value="${esc(c.amount)}"></div>
          <div><label>Clarification (optional)</label>
            <input type="text" id="pm-note-${m.key}" value="${esc(c.note)}"
              placeholder="e.g. Message for a more detailed quote"></div>
        </div></div>`;
    }).join("");
}
// -> [{type,key,amount,note,detail}] for every SELECTED and still-unlocked method.
function collectCampaignPayments(){
  return unlockedPayMethods(W.d.intentsB)
    .filter(m=>paySel(m.key).on)
    .map(m=>{
      const c=paySel(m.key), amount=Number(c.amount)||0, note=(c.note||"").trim();
      return {type:m.key, amount, note,
              detail:m.detail(amount)+(note?` · ${note}`:"")};
    });
}

const GIVEAWAY_PM="Giveaway prize";
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
  if(kind==="biz") W.steps=["b-intent","b-company","b-target","b-budget","b-who","b-review"];
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
      // Only methods unlocked by a step-1 goal are shown, and each selected one
      // carries its own editable amount plus an optional clarification note.
      const unlocked=unlockedPayMethods(d.intentsB);
      // A giveaway campaign's only unlocked method is the prize, so pre-select
      // it once rather than dead-ending that path.
      if(unlocked.length===1 && unlocked[0].key==="giveaway" && !d.giveawayPmSeeded){
        paySel("giveaway").on=true; d.giveawayPmSeeded=true;
      }
      const extras=[];
      if(d.intentsB.has("Wanting UGC content")) extras.push(pmIn("w-ugc","UGC videos needed",d.ugcCount));
      if(d.intentsB.has("Looking for long-term brand ambassadors")) extras.push(`<div><label>Ambassador term</label><select id="w-amb">${["1 month","3 months","6 months","12 months"].map(x=>`<option ${x===d.ambTerm?"selected":""}>${x}</option>`).join("")}</select></div>`);
      return {t:"Budget & payment",s:"Pick every payment method you want to offer — you set each amount yourself, and creators choose what suits their audience.",h:
      `<div class="frm"><div class="row2">
        <div><label>Campaign budget (£)</label><input type="number" id="w-budget" value="${esc(d.budget)}"></div>
        <div><label>Campaign duration</label><select id="w-dur">${["One-off","Video-by-video","2 weeks","4 weeks","6 weeks","3 months","Ongoing"].map(x=>`<option ${x===d.duration?"selected":""}>${x}</option>`).join("")}</select></div></div>
        <div><label>Payment methods you'll offer</label>${payMethodsHtml()}</div>
        ${extras.length?`<div class="row2">${extras.join("")}</div>`:""}</div>`,
      collect:()=>{d.budget=$("w-budget").value; d.duration=$("w-dur").value;
        collectPaySel();
        if($("w-ugc"))d.ugcCount=$("w-ugc").value; if($("w-amb"))d.ambTerm=$("w-amb").value;},
      valid:()=>{
        const sel=collectCampaignPayments();
        if(!sel.length) return "Select at least one payment method.";
        const blank=sel.find(x=>x.type!=="product" && !x.amount);
        if(blank) return `Enter an amount for ${payMethodByKey(blank.type).label}.`;
        return null;
      }};}
    case "b-who": {
      // Same "who we are" record as My Account — loaded once, saved on Next.
      if(!W.d.whoLoaded){
        W.d.whoLoaded="loading";
        PSApi.get(`/users/${S.account.id}/public`)
          .then(p=>{ W.d.who={about_text:p.about_text||"",links:p.links||[],assets:p.assets||[]}; W.d.whoLoaded=true; renderWiz(); })
          .catch(()=>{ W.d.who={about_text:"",links:[],assets:[]}; W.d.whoLoaded=true; renderWiz(); });
      }
      const p=W.d.who||{about_text:"",links:[],assets:[]};
      return {t:"Who we are",s:"Platform owners see this when they view your full profile from your campaign. All optional — and it's the same profile you can edit any time from My Account.",h:
        W.d.whoLoaded===true
          ? `<div class="frm">${whoEditorHtml("wz",p)}</div>`
          : `<div class="frm"><div class="sk sk-line" style="width:60%"></div><div class="sk sk-block" style="height:80px;margin-top:10px"></div></div>`,
        collect:()=>{
          if(W.d.whoLoaded!==true) return;
          W.d.who={...(W.d.who||{}), about_text:(($("wz-about")||{}).value||"").trim(), links:collectWhoLinks("wz")};
          // Persist immediately so it's saved even if they exit before finishing.
          saveWho("wz").catch(()=>{});
        }};
    }
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
        <div class="rv-row"><span class="k">Payment methods</span><span class="v">${collectCampaignPayments().map(p=>esc(p.detail)).join("<br>")||"—"}</span></div>
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
  // Publishing is a real POST. The wizard stays on the review step while it is
  // in flight, so without this a second click fired a second create and
  // published a duplicate. The flag is set synchronously, before any await, so
  // two clicks in the same tick cannot both get through.
  if(step==="b-review"||step==="p-review"){
    if(W._publishing) return;
    W._publishing=true;
    const btn=document.querySelector(".wiz-foot .btn-p");
    if(btn){ btn.disabled=true; btn.innerHTML=`<span class="spin"></span> Publishing…`; }
    (step==="b-review"?finishBiz:finishPlat)();
    return;
  }
  W.i++; renderWiz("fwd");
}

// Publishing failed — let them try again rather than stranding the wizard.
function wizPublishFailed(label){
  if(!W) return;
  W._publishing=false;
  const btn=document.querySelector(".wiz-foot .btn-p");
  if(btn){ btn.disabled=false; btn.textContent=label; }
}
async function finishBiz(){
  const d=W.d;
  // Local business profile for the dashboard view.
  S.biz={company:d.company,product:d.product,industry:d.industry,target:d.target,intents:[...d.intentsB],countries:[...d.countries],platforms:[...d.platforms],services:[...d.services],sizes:[...d.sizes],budget:Number(d.budget)||0,payMethods:collectCampaignPayments().map(p=>payMethodByKey(p.type).label),duration:d.duration};
  // Every selected, still-unlocked method with the amount the business typed.
  // Nothing is inferred and no default amount is ever invented.
  const pays=collectCampaignPayments();
  const niche=d.industry.includes("Beauty")?"Beauty":d.industry.includes("Fitness")?"Fitness":d.industry.includes("Food")?"Food":d.industry.includes("Fin")?"Finance":d.industry.includes("Gam")?"Gaming":d.industry.includes("parent")||d.industry.includes("Kids")?"Parenting":"Tech";
  const title=`${d.product.split(" ").slice(0,3).join(" ")} — Launch Campaign`;
  const payload={title,industry:d.industry,description:`${d.company} is looking for creators to promote: ${d.product}. ${d.target}.`,
    budget:Number(d.budget)||0,platforms:[...d.platforms],niches:[niche],countries:[...d.countries],services:[...d.services],
    creator_sizes:[...d.sizes],goals:[...d.intentsB],payment:pays,
    deliverables:`${[...d.services].slice(0,2).join(" or ")} featuring the product. Content live ≥ 30 days. Draft approval required.`,
    duration:d.duration,samples:pays.some(p=>p.type==="product"),
    profile:{product:d.product,target:d.target,
             payMethods:pays.map(p=>payMethodByKey(p.type).label),collabs:"New to PromoSlot"}};
  try{ await PSApi.post("/campaigns",payload); }
  catch(err){ toast(err.message||"Could not publish campaign"); wizPublishFailed("Create my business profile"); return; }
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
  catch(err){ toast(err.message||"Could not publish listing"); wizPublishFailed("Publish my listing"); return; }
  await loadMine(); authReflect();
  S.activeRole="plat"; setTheme();
  const created=S.myPlatforms[0];
  const isBothFlow = W.kind==="both" && S.account.is_business && S.myCampaigns.length===0;
  wizSuccess("Your listing is live 🎉",`“${created?created.name:l.name}” is now visible to every business on PromoSlot. Got another audience? You can list each platform you own as its own separate listing.`, isBothFlow?"biz":null, true);
}
function confettiBurst(host){
  const colors=["#4f46e5","#7c3aed","#0ea5e9","#a5b4fc","#f59e0b","#c7d2fe"];
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
async function loadDeals(){
  if(!S.account){ S.realDeals=[]; return; }
  try{ S.realDeals=await PSApi.get("/deals"); }catch(e){ S.realDeals=[]; }
}
function dealRows(){
  const deals=S.realDeals||[];
  if(!deals.length) return `<div class="empty-state small">
    <div class="es-ico">🤝</div><h4>No deals yet</h4>
    <p>Buy an offer from a listing to open a protected deal — funding, delivery and payout all happen in one deal room.</p>
    <button class="btn btn-o btn-sm" onclick="openMarket('platforms')">Browse listings</button></div>`;
  return deals.map(d=>{
    const meBiz=S.account&&S.account.id===d.business_id;
    const other=meBiz?(d.owner_name||(d.terms&&d.terms.owner)||"platform owner"):(d.business_name||"the business");
    // Verified-but-unpaid is called out here (not only in notifications) so it can't be missed.
    const awaitingPayout = d.verified && !d.paid && d.status!=="refunded";
    // Cancelled before escrow was ever funded: nothing was charged, so the money
    // column must not imply a payment is still coming. (Cancelled AFTER funding
    // is a separate case and deliberately left on its existing path.)
    const cancelledUnfunded = d.status==="cancelled" && !d.funded;
    const stCls=d.paid?"st-done":awaitingPayout?"st-review":d.funded?"st-escrow":"st-review";
    const stLabel=d.source_removed
      ? (d.source_removed==="campaign"?"Campaign removed by business":"Listing removed by owner")
      : (awaitingPayout?"Verified — awaiting payout":esc(d.status));
    return `<div class="deal-row" onclick="showView('view-deal');renderRealDeal(${d.id})">
      ${pfp(other,d.terms&&d.terms.platform,"",meBiz?d.owner_avatar:d.business_avatar)}<div><div class="dr-t">Deal ${d.id}${d.terms&&d.terms.offer?" · "+esc(d.terms.offer):""}</div>
      <div class="dr-s">${meBiz?"You buy · "+esc(other):"You deliver · "+esc(other)}</div></div>
      <span class="status-pill ${stCls}">${stLabel}</span>
      <div class="dr-amt"><b>${gbpP(meBiz?d.total_charged:d.net_to_owner)}</b><small>${d.paid?"paid":awaitingPayout?"awaiting payout":d.funded?"protected":cancelledUnfunded?"Not funded":d.source_removed?"not going ahead":"pending"}</small></div></div>`;
  }).join("");
}
function notifRows(){
  const items=S.realNotifs||[];
  if(!items.length) return `<div class="empty">Nothing yet — updates from your deals appear here.</div>`;
  return items.map(n=>`<div class="notif"><div class="n-ico">${NOTIF_ICON[n.type]||"🔔"}</div><div>${esc(n.body)}<small>${relTime(n.created_at)}</small></div></div>`).join("");
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
    if(el.dataset.done==="1") return;                 // already counted up
    el.dataset.done="1";
    // Nothing is being painted — don't animate from 0, the correct value is
    // already in place from kpi().
    if(document.visibilityState==="hidden"){ el.textContent=kpiText(to,pre,suf,dec); return; }
    const dur=750, t0=performance.now();
    const tick=now=>{ let p=Math.min(1,(now-t0)/dur); p=1-Math.pow(1-p,3);
      const val=to*p; el.textContent=pre+(dec?val.toFixed(dec):Math.round(val).toLocaleString("en-GB"))+suf;
      if(p<1) requestAnimationFrame(tick);
      else el.textContent=kpiText(to,pre,suf,dec); };   // land exactly on the real value
    requestAnimationFrame(tick);
  });
}
// Draggable-scrubber growth timeline (real deal events only). x = time,
// y = cumulative £. A single draggable dot scrubs time; event dots are fixed.
function renderGrowthTimeline(hostId, events, cfg){
  const host=document.getElementById(hostId); if(!host) return;
  cfg=cfg||{}; const verb=cfg.verb||"earned";
  events=(events||[]).filter(e=>e.t && !isNaN(+e.t)).sort((a,b)=>a.t-b.t);
  if(!events.length){
    host.innerHTML=`<div class="empty-state small"><div class="es-ico">📈</div><h4>No ${verb==="earned"?"earnings":"purchases"} yet</h4><p>Your account growth appears here once you have a completed deal — drag along the line to scrub through time.</p></div>`;
    return;
  }
  let cum=0; const pts=events.map(e=>({t:+e.t, v:(cum+=e.amount), amount:e.amount, dealId:e.dealId}));
  const W=640,H=210,padL=52,padR=16,padT=16,padB=26, plotW=W-padL-padR, plotH=H-padT-padB;
  let tStart=pts[0].t, tEnd=Math.max(pts[pts.length-1].t, Date.now());
  if(tEnd<=tStart) tEnd=tStart+864e5;
  const span=tEnd-tStart, yMax=Math.max(...pts.map(p=>p.v))*1.15||1;
  const xs=t=>padL+(t-tStart)/span*plotW, ys=v=>(padT+plotH)-(v/yMax)*plotH;
  // stepped cumulative path + area
  let d=`M ${xs(tStart).toFixed(1)} ${ys(0).toFixed(1)}`, prev=0;
  const poly=[`${xs(tStart).toFixed(1)},${ys(0).toFixed(1)}`];
  pts.forEach(p=>{
    d+=` L ${xs(p.t).toFixed(1)} ${ys(prev).toFixed(1)} L ${xs(p.t).toFixed(1)} ${ys(p.v).toFixed(1)}`;
    poly.push(`${xs(p.t).toFixed(1)},${ys(prev).toFixed(1)}`,`${xs(p.t).toFixed(1)},${ys(p.v).toFixed(1)}`);
    prev=p.v;
  });
  d+=` L ${xs(tEnd).toFixed(1)} ${ys(prev).toFixed(1)}`;
  poly.push(`${xs(tEnd).toFixed(1)},${ys(prev).toFixed(1)}`,
            `${xs(tEnd).toFixed(1)},${ys(0).toFixed(1)}`);
  const areaPts=poly.join(" ");
  const dots=pts.map(p=>`<circle class="g-dot" cx="${xs(p.t).toFixed(1)}" cy="${ys(p.v).toFixed(1)}" r="4"><title>Deal ${p.dealId} · +£${p.amount.toFixed(2)} · ${new Date(p.t).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</title></circle>`).join("");
  const sx0=xs(tEnd), sy0=ys(pts[pts.length-1].v);
  host.innerHTML=`<div class="growth">
    <div class="g-readout" id="${hostId}-ro"></div>
    <svg class="growth-svg" viewBox="0 0 ${W} ${H}" role="img">
      <line class="g-axis" x1="${padL}" y1="${padT+plotH}" x2="${W-padR}" y2="${padT+plotH}"/>
      <polygon class="g-area" points="${areaPts}"/>
      <path class="g-line" d="${d}"/>
      ${dots}
      <line class="g-scrub-line" x1="${sx0.toFixed(1)}" y1="${padT}" x2="${sx0.toFixed(1)}" y2="${padT+plotH}"/>
      <circle class="g-scrub" cx="${sx0.toFixed(1)}" cy="${sy0.toFixed(1)}" r="7"/>
    </svg>
    <div class="g-scale"><span>${new Date(tStart).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</span><span>drag the dot to scrub ↔</span><span>${new Date(tEnd).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</span></div>
  </div>`;
  const svg=host.querySelector(".growth-svg"), scrub=host.querySelector(".g-scrub"),
        sline=host.querySelector(".g-scrub-line"), ro=document.getElementById(hostId+"-ro");
  const cumAt=tms=>{ let v=0,n=0; pts.forEach(p=>{ if(p.t<=tms){ v=p.v; n++; } }); return {v,n}; };
  const setScrub=tms=>{ if(!isFinite(tms)) return; tms=Math.max(tStart,Math.min(tEnd,tms)); const {v,n}=cumAt(tms);
    const sx=xs(tms), sy=ys(v); scrub.setAttribute("cx",sx.toFixed(1)); scrub.setAttribute("cy",sy.toFixed(1));
    sline.setAttribute("x1",sx.toFixed(1)); sline.setAttribute("x2",sx.toFixed(1));
    ro.innerHTML=`<b>By ${new Date(tms).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</b> · £${v.toFixed(2)} ${verb} · ${n} deal${n===1?"":"s"}`; };
  const cxToT=cx=>{ const r=svg.getBoundingClientRect(); if(!r.width||!isFinite(cx)) return tEnd; const px=(cx-r.left)/r.width*W; return tStart+Math.max(0,Math.min(1,(px-padL)/plotW))*span; };
  let dragging=false;
  svg.addEventListener("pointerdown",e=>{ dragging=true; try{svg.setPointerCapture(e.pointerId);}catch(_){}; setScrub(cxToT(e.clientX)); e.preventDefault(); });
  svg.addEventListener("pointermove",e=>{ if(dragging) setScrub(cxToT(e.clientX)); });
  svg.addEventListener("pointerup",e=>{ dragging=false; try{svg.releasePointerCapture(e.pointerId);}catch(_){} });
  setScrub(tEnd);  // start showing "today" (full total)
}
function kpiText(to,pre,suf,dec){
  return pre+(dec?Number(to).toFixed(dec):Math.round(to).toLocaleString("en-GB"))+suf;
}
function kpi(cfg){
  const i=cfg.i,val=cfg.val,to=cfg.to,pre=cfg.pre||"",suf=cfg.suf||"",dec=cfg.dec||0,label=cfg.label,delta=cfg.delta,cls=cfg.cls||"neu",spark=cfg.spark,act=cfg.act;
  // Render the REAL figure into the markup. The count-up is decoration on top;
  // it used to be the only thing that ever wrote the number, so whenever
  // requestAnimationFrame did not run (a background tab, a throttled or
  // non-painting page) every KPI sat at a hard-coded "0" over correct data.
  const head=(to!=null)?kpiText(to,pre,suf,dec):val;
  return '<div class="kpi'+(act?" clickable":"")+'" style="--d:'+(i*60)+'ms" '+(act?('onclick="'+act+'"'):"")+'>'
    +'<div class="kpi-top"><div class="kv" data-to="'+(to!=null?to:"")+'" data-pre="'+pre+'" data-suf="'+suf+'" data-dec="'+dec+'">'+head+'</div>'
    +(spark?sparkline((label||"").length+(to||0),spark):"")+'</div>'
    +'<div class="kl">'+label+'</div><div class="kd '+cls+'">'+delta+'</div></div>';
}
function renderBizDash(){
  const b=S.biz;
  // Real analytics from actual deals where this account is the business.
  const myId=String(S.account&&S.account.id);
  const asBiz=(S.realDeals||[]).filter(d=>String(d.business_id)===myId);
  const escrowPence=asBiz.filter(d=>d.funded&&!d.paid&&d.status!=="refunded").reduce((a,d)=>a+(d.total_charged||0),0);
  const completedCount=asBiz.filter(d=>d.paid).length;
  const growthEvents=asBiz.filter(d=>d.funded_at).map(d=>({t:new Date(d.funded_at),amount:(d.total_charged||0)/100,dealId:d.id}));
  const applicants=S.myCampaigns.reduce((a,c)=>a+c.applicants,0);
  $("bizDash").innerHTML=`
    <div class="dash-head"><div class="avatar-dot dash-avatar">${initials(b.company)}</div>
      <div><h2>${esc(b.company)}</h2><div class="sub"><span class="mode-tag">🏢 Business</span> ${esc(b.industry)} · ${b.countries.join(", ")}</div></div>
      <div class="dash-actions">
        <button class="btn btn-o" onclick="openMarket('platforms')">Browse platform listings</button>
        <button class="btn btn-p" onclick="openNewCampaign()">＋ New campaign</button></div></div>
    <div class="kpis">${kpi({i:0,to:S.myCampaigns.length,label:"Live campaigns",delta:S.myCampaigns.length?"↑ published today":"none yet — post one",cls:S.myCampaigns.length?"up":"neu",spark:"#4f46e5",act:"scrollToPanel('yourCampaigns')"})}${kpi({i:1,to:applicants,label:"Applicants",delta:applicants?"↑ new applications":"awaiting first applications",cls:applicants?"up":"neu",spark:"#4f46e5",act:"scrollToPanel('yourDeals')"})}${kpi({i:2,val:escrowPence?gbpP(escrowPence):"—",to:escrowPence?escrowPence/100:null,pre:"£",dec:2,label:"Payment Protection",delta:escrowPence?"released on verified delivery":"fund a deal to protect it",cls:"neu",spark:"#4f46e5",act:"scrollToPanel('yourDeals')"})}${kpi({i:3,to:completedCount,label:"Completed deals",delta:completedCount?"fee only on completion":"none yet",cls:"neu",spark:"#4f46e5"})}    </div>
    <div class="panel"><div class="panel-h"><h4>Account growth · spend over time</h4></div><div class="panel-b" id="bizGrowth"></div></div>
    <div class="dash-cols"><div>
      <div class="panel" id="yourCampaigns"><div class="panel-h"><h4>Your campaigns</h4><button class="btn btn-o btn-sm" onclick="openMarket('campaigns')">View in marketplace</button></div>
        <div class="panel-b">${S.myCampaigns.length?`<div class="cards tight">${S.myCampaigns.map((c,i)=>campaignCard(c,i,true)).join("")}</div>`:`<div class="empty-state"><div class="es-ico">📢</div><h4>No campaigns yet</h4><p>Publish a campaign describing what you want promoted and what you'll pay — platform owners apply to you.</p><button class="btn btn-p btn-sm" onclick="openNewCampaign()">＋ Post your first campaign</button></div>`}</div></div>
      <div class="panel" id="yourDeals"><div class="panel-h"><h4>Your deals</h4><button class="btn btn-o btn-sm" onclick="openMarket('platforms')">Start a deal</button></div><div class="panel-b">${dealRows()}</div></div>
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
  renderGrowthTimeline("bizGrowth", growthEvents, {verb:"spent"});
  requestAnimationFrame(animateKpis);
}
function renderPlatDash(){
  // Real analytics from actual deals where this account is the platform owner.
  const myId=String(S.account&&S.account.id);
  const asOwner=(S.realDeals||[]).filter(d=>String(d.platform_owner_id)===myId);
  const paidReal=asOwner.filter(d=>d.paid);
  const earnedPence=paidReal.reduce((a,d)=>a+(d.net_to_owner||0),0);          // cumulative, after 10% seller fee
  const inEscrow=asOwner.filter(d=>d.funded&&!d.paid&&d.status!=="refunded").length;
  const rAvg=S.myRating&&S.myRating.average, rCount=(S.myRating&&S.myRating.count)||0;
  const growthEvents=paidReal.filter(d=>d.paid_at).map(d=>({t:new Date(d.paid_at),amount:(d.net_to_owner||0)/100,dealId:d.id}));
  const brand=S.myPlatforms[0]?S.myPlatforms[0].brand:"Your brand";
  const myNiches=[...new Set(S.myPlatforms.flatMap(p=>p.niches))];
  const matches=allCampaigns().filter(c=>!c.id.startsWith("my-")&&(c.niches.some(n=>myNiches.includes(n))||!myNiches.length)).slice(0,3);
  $("platDash").innerHTML=`
    <div class="dash-head"><div class="avatar-dot dash-avatar">${initials(brand)}</div>
      <div><h2>${esc(brand)}</h2><div class="sub"><span class="mode-tag">📣 Platform owner</span> ${S.myPlatforms.length} listing${S.myPlatforms.length===1?"":"s"} live</div></div>
      <div class="dash-actions">
        <button class="btn btn-o" onclick="openMarket('campaigns')">Browse campaigns</button>
        <button class="btn btn-p" onclick="openRegisterPlatform()">＋ Register another platform</button></div></div>
    <div class="kpis">${kpi({i:0,to:S.myPlatforms.length,label:"Live listings",delta:S.myPlatforms.length?"live in the marketplace":"list one to get seen",cls:S.myPlatforms.length?"up":"neu",spark:"#4f46e5",act:"scrollToPanel('yourListings')"})}${kpi({i:1,val:earnedPence?gbpP(earnedPence):"—",to:earnedPence?earnedPence/100:null,pre:"£",dec:2,label:"Earned (after 10% seller fee)",delta:earnedPence?`from ${paidReal.length} completed deal${paidReal.length>1?"s":""}`:"complete a deal to earn",cls:earnedPence?"up":"neu",spark:"#4f46e5"})}${kpi({i:2,to:inEscrow,label:"Protected deals",delta:inEscrow?"funds secured before you work":"none protected yet",cls:"neu",spark:"#4f46e5",act:"scrollToPanel('yourDeals')"})}${kpi({i:3,val:rAvg!=null?"⭐ "+rAvg.toFixed(1):"—",label:"Your rating",delta:rAvg!=null?`${rCount} review${rCount===1?"":"s"}`:"appears after your first completed deal",cls:rAvg!=null?"up":"neu",spark:"#4f46e5"})}    </div>
    <div class="panel"><div class="panel-h"><h4>Account growth · earnings over time</h4></div><div class="panel-b" id="platGrowth"></div></div>
    <div class="dash-cols"><div>
      <div class="panel" id="yourListings"><div class="panel-h"><h4>Your platform listings</h4><button class="btn btn-o btn-sm" onclick="openRegisterPlatform()">＋ Add platform</button></div>
        <div class="panel-b">${S.myPlatforms.length?`<div class="cards tight">${S.myPlatforms.map((l,i)=>listingCard(l,i,true)).join("")}</div>`:`<div class="empty-state"><div class="es-ico">📣</div><h4>No listings yet</h4><p>Register each platform you control — its own audience, services and prices.</p><button class="btn btn-p btn-sm" onclick="openRegisterPlatform()">＋ Register a platform</button></div>`}
        ${S.myPlatforms.length&&S.myPlatforms.length<3?`<div class="note blue" style="margin-top:14px">💡 Owners with multiple listings get seen by more campaigns — list each platform you own separately, each with its own audience and prices. <a href="#" onclick="openRegisterPlatform();return false">Register another platform →</a></div>`:""}</div></div>
      <div class="panel" id="yourDeals"><div class="panel-h"><h4>Your deals</h4><button class="btn btn-o btn-sm" onclick="openMarket('campaigns')">Find campaigns</button></div><div class="panel-b">${dealRows()}</div></div>
    </div><div>
      <div class="panel"><div class="panel-h"><h4>Activity</h4></div><div class="panel-b">${notifRows()}</div></div>
      <div class="panel"><div class="panel-h"><h4>Campaigns matching your niches</h4></div><div class="panel-b">
        ${matches.map(c=>`<div class="op-row" style="margin-bottom:8px" onclick="openCampaign('${c.id}')">${pfp(c.company,null,"",c.companyAvatar)}<div><b>${esc(c.title)}</b><small>${esc(c.company)} · ${c.budget?gbp(c.budget)+" budget":"commission"}</small></div><span class="op-go">Apply →</span></div>`).join("")}
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
  renderGrowthTimeline("platGrowth", growthEvents, {verb:"earned"});
  requestAnimationFrame(animateKpis);
}
function openNewCampaign(){
  if(!S.biz){ startWizard("biz"); return; }
  W={kind:"biz",d:defW(),i:0,steps:["b-intent","b-company","b-target","b-budget","b-who","b-review"]}; lastPct=0;
  const b=S.biz; const d=W.d;
  d.company=b.company; d.product=b.product; d.industry=b.industry; d.target=b.target;
  d.intentsB=new Set(b.intents); d.countries=new Set(b.countries); d.platforms=new Set(b.platforms); d.services=new Set(b.services); d.sizes=new Set(b.sizes); d.budget=String(b.budget); d.payMethods=new Set(b.payMethods); d.duration=b.duration;
  // Their saved payment methods are their real answer — don't re-seed the
  // giveaway default over a choice they already made.
  d.giveawayPmSeeded=true;
  W.i=0; renderWiz("fwd"); toast("Campaign builder — prefilled from your profile");
}

/* ==================== NOTIFICATIONS ==================== */
const NOTIF_FEED=[
 {ico:"🚀",tag:"Founding cohort",txt:"PromoSlot is now open to its founding cohort — real listings and campaigns appear here as members join."},
 {ico:"📣",tag:"New offer",txt:"See how a complete platform-owner listing looks — open the Example Creator profile.",ref:"px-ex"},
 {ico:"🏢",tag:"New campaign",txt:"See how a complete business campaign looks — open the Example Campaign.",ref:"cx-ex"}
];
let notifOpen=false;
const NOTIF_ICON={deal_funded:"🔒",deal_verified:"✅",payout_sent:"💸",deal_completed:"🎉",deal_refunded:"↩︎",proof_submitted:"📤",deal_revision:"✏️",message:"💬",campaign_application:"📩",deal_declined:"🚫",deal_approved:"🤝",review_received:"⭐",listing_removed:"🗑️",campaign_removed:"🗑️"};
function setBell(n){ const b=$("bellCnt"); if(!b) return; b.classList.toggle("hide",n<=0); b.textContent=n>9?"9+":n; }
function bellSync(){ if(!S.account) setBell(0); }
function _dot(id,on){ const e=$(id); if(e) e.classList.toggle("hide", !on); }
// Per-user attention dots. Notification unread clears when the bell is viewed;
// reviewer queue/payout dots persist until the work is actually done, so a
// verified-but-unpaid deal keeps flagging attention until it's paid or refunded.
function updateDots(){
  const a=S.attn||{unread:0,review_pending:0,awaiting_payout:0};
  const dashAttn=(a.unread>0)||(a.review_pending>0)||(a.awaiting_payout>0);
  _dot("userDot", !!S.account && dashAttn);   // avatar / dashboard attention
  _dot("dashDot", !!S.account && dashAttn);
  _dot("dot-review", (a.review_pending||0)>0);
  _dot("dot-payouts", (a.awaiting_payout||0)>0);
}
function relTime(iso){ if(!iso) return ""; const d=new Date(iso), s=(Date.now()-d.getTime())/1000;
  if(s<60) return "just now"; if(s<3600) return Math.floor(s/60)+"m ago"; if(s<86400) return Math.floor(s/3600)+"h ago"; return d.toLocaleDateString(); }
async function loadNotifications(){
  if(!S.account){ S.realNotifs=[]; S.attn={unread:0,review_pending:0,awaiting_payout:0}; setBell(0); updateDots(); return; }
  await Promise.all([
    PSApi.get("/notifications").then(r=>{S.realNotifs=r;}).catch(()=>{S.realNotifs=[];}),
    PSApi.get("/notifications/summary").then(r=>{S.attn=r;})
      .catch(()=>{S.attn={unread:0,review_pending:0,awaiting_payout:0};}),
  ]);
  setBell((S.attn&&S.attn.unread)||0);
  updateDots();
}
// Live attention: poll so dots appear on new real events without a page refresh.
// They persist (server-driven unread count) until the notification is actually
// viewed (opening the bell marks read). Only polls while signed in and visible.
let _attnTimer=null;
function startAttnPolling(){
  if(_attnTimer) return;
  _attnTimer=setInterval(()=>{
    if(S.account && document.visibilityState!=="hidden") loadNotifications();
  }, 15000);
  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState!=="hidden" && S.account) loadNotifications();
  });
}
function pushNotif(item,quiet){ if(!quiet && item && item.txt) toast(item.txt); }
function tagCls(tag){ return tag==="New campaign"?"amb":tag==="New offer"?"ind":""; }
function renderNotifPop(){
  const real=(S.realNotifs||[]).map(n=>({ico:NOTIF_ICON[n.type]||"🔔",tag:"Your account",txt:n.body,t:relTime(n.created_at),ref:n.ref}));
  const items=real.concat(NOTIF_FEED);
  $("notifPop").innerHTML=`<div class="np-head"><h4>Notifications</h4><span class="mut" style="font-size:12px">${S.account?"Real updates from your deals":"Offers & changes from both sides of the marketplace"}</span></div>
  <div class="np-list">${items.length?items.map(n=>`<div class="np-item ${n.ref?"clickable":""}" ${n.ref?`onclick="openNotif('${n.ref}')"`:""}><div class="n-ico">${n.ico}</div>
    <div class="np-body"><span class="tag ${tagCls(n.tag)} np-tag">${esc(n.tag)}</span>
    <div class="np-txt">${esc(n.txt)}</div><small>${esc(n.t)}${n.ref?' · <span class="np-go">View →</span>':""}</small></div></div>`).join(""):'<div class="empty">Nothing yet.</div>'}</div>`;
}
function openNotif(ref){
  toggleNotifs(false);
  if(typeof ref==="string" && ref.indexOf("convo:")===0){ openMessages().then(()=>openConv(parseInt(ref.slice(6),10))); return; }
  // New-ticket alerts for reviewers open the queue on that ticket.
  if(typeof ref==="string" && ref.indexOf("support_ticket:")===0){
    openSupportQueue(parseInt(ref.slice(15),10)); return;
  }
  if(findListing(ref)){ openListing(ref); return; }
  if(findCampaign(ref)){ openCampaign(ref); return; }
  if(/^\d+$/.test(String(ref))){ showView("view-deal"); renderRealDeal(parseInt(ref,10)); return; }  // deal notifications
}
async function toggleNotifs(force){
  notifOpen = force!==undefined?force:!notifOpen;
  $("notifPop").classList.toggle("hide",!notifOpen);
  if(notifOpen){
    if(S.account) await loadNotifications();
    renderNotifPop();
    if(S.account){
      try{ await PSApi.post("/notifications/read-all"); }catch(e){}
      setBell(0);
      if(S.attn) S.attn.unread=0;   // viewed -> notification attention clears
      updateDots();
    }
  }
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
  const canReview=can("deal.view_evidence");
  $("nl-review").classList.toggle("hide", !canReview);
  // Every reviewer/admin account, current and future — driven by the permission,
  // never by a hardcoded account.
  $("nl-support").classList.toggle("hide", !canReview);
  $("nl-payouts").classList.toggle("hide", !canReview);
  $("nl-completed").classList.toggle("hide", !canReview);
  $("nl-admin").classList.toggle("hide", !can("admin.view"));
  if(a){
    $("userChip").classList.remove("hide");   // avatar shows whenever logged in (incl. reviewer)
    const ui=$("userInit");
    if(a.avatar_url){ ui.textContent=""; ui.classList.add("has-img"); ui.style.backgroundImage=`url('${a.avatar_url}')`; }
    else { ui.classList.remove("has-img"); ui.style.backgroundImage=""; ui.textContent=(a.display_name||a.email||"?").slice(0,1).toUpperCase(); }
    $("userName").textContent=a.display_name||a.email;
  }
  updateDots();
}
async function openReviewQueue(){
  if(!can("deal.view_evidence")){ toast("Admin access required"); return; }
  setRoute("review-queue");
  showView("view-deal");
  let q=[]; try{ q=await PSApi.get("/review/queue"); }catch(e){}
  loadNotifications();
  $("dealWrap").innerHTML=`
    <div class="deal-top"><button class="btn btn-ghost" onclick="goHome()">← Home</button><h2>Review queue</h2>
      <button class="btn btn-o btn-sm" onclick="openPayouts()">💸 Awaiting Payouts →</button>
      <span class="status-pill st-review">${q.length} awaiting</span></div>
    <div class="panel"><div class="panel-b">${q.length?q.map(item=>`
      <div class="deal-row" onclick="showView('view-deal');renderRealDeal(${item.deal_id})">
        <div class="pfp" style="background:var(--amber)">${item.deal_id}</div>
        <div><div class="dr-t">Deal ${item.deal_id}</div><div class="dr-s">${item.proof_count} evidence item(s) · ${esc(item.status)}</div></div>
        <div class="dr-amt"><b>${gbpP(item.listed_price)}</b><small>listed</small></div></div>`).join("")
      :`<div class="empty-state"><div class="es-ico">✅</div><h4>Nothing to review</h4><p>Funded deals with submitted evidence appear here for verification.</p></div>`}</div></div>`;
}
/* ============ CONTACTED SUPPORT (shared reviewer queue) ============
   Separate from Messages: these are Contact Support submissions, many from
   people with no PromoSlot account. Every reviewer sees every ticket; the
   first to claim one owns the customer-facing reply. Everything here is
   re-authorised by the API — hiding a button is convenience, not security. */
async function openSupportQueue(ticketId){
  if(!can("deal.view_evidence")){ toast("Reviewer access required"); return; }
  setRoute("support-queue");
  showView("view-deal");
  let list=[]; try{ list=await PSApi.get("/support/tickets"); }catch(e){}
  S._supportList=list;
  if(ticketId!=null){ return openSupportTicket(ticketId); }
  const open=list.filter(t=>!t.handled).length;
  $("dealWrap").innerHTML=`
    <div class="deal-top"><button class="btn btn-ghost" onclick="goHome()">← Home</button>
      <h2>Contacted Support</h2>
      <span class="status-pill st-review">${open} open</span></div>
    <div class="panel"><div class="panel-b">${list.length?list.map(t=>`
      <div class="deal-row" onclick="openSupportTicket(${t.id})">
        <div class="pfp" style="background:var(--acc)">${esc((t.name||"?").slice(0,1).toUpperCase())}</div>
        <div><div class="dr-t">${esc(t.subject)}</div>
          <div class="dr-s">${esc(t.name)}${t.email?" · "+esc(t.email):""}${t.user_id?" · has an account":""}</div></div>
        <span class="status-pill ${t.handled?"st-done":t.assigned_to?"st-escrow":"st-review"}">${
          t.handled?"Replied":t.assigned_to?esc(t.assigned_to.name):"Unclaimed"}</span>
        <div class="dr-amt"><small>${t.created_at?new Date(t.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short"}):""}</small></div>
      </div>`).join("")
      :`<div class="empty-state"><div class="es-ico">📮</div><h4>No tickets yet</h4><p>Contact Support submissions appear here.</p></div>`}</div></div>`;
}

async function openSupportTicket(id){
  if(!can("deal.view_evidence")){ toast("Reviewer access required"); return; }
  let t; try{ t=await PSApi.get(`/support/tickets/${id}`); }catch(e){ toast(e.message||"Could not load that ticket"); return; }
  S._supportTicket=t;
  const meId=String(S.account&&S.account.id);
  const owner=t.assigned_to;
  const iOwn=owner && String(owner.id)===meId;
  const events=(t.events||[]).map(e=>{
    const who=e.author?esc(e.author.name):"—";
    const when=e.created_at?new Date(e.created_at).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"";
    if(e.kind==="note") return `<div class="proof-item got"><span class="pi-ico">🔒</span>
      <div><b>Internal note · ${who}</b><div class="mut" style="font-size:12px;white-space:pre-wrap">${esc(e.body||"")}</div>
      <div class="mut" style="font-size:11.5px">${when} · never shown to the submitter</div></div></div>`;
    if(e.kind==="submitter_reply") return `<div class="proof-item got" style="border-left:3px solid var(--acc)">
      <span class="pi-ico">📥</span>
      <div><b>Reply from ${esc(t.name)}</b> <span class="tag ind" style="font-size:10.5px">submitter</span>
      <div class="mut" style="font-size:12px;white-space:pre-wrap">${esc(e.body||"")}</div>
      <div class="mut" style="font-size:11.5px">${when} · received by email</div></div></div>`;
    if(e.kind==="reply") return `<div class="proof-item got"><span class="pi-ico">📤</span>
      <div><b>Reply sent · ${who}</b><div class="mut" style="font-size:12px;white-space:pre-wrap">${esc(e.body||"")}</div>
      <div class="mut" style="font-size:11.5px">${when} · emailed to ${esc(t.email||"")}</div></div></div>`;
    return `<div class="proof-item"><span class="pi-ico">${e.kind==="claim"?"🙋":"🔁"}</span>
      <div><b>${e.kind==="claim"?"Claimed":"Transferred"} · ${who}</b>
      ${e.body?`<div class="mut" style="font-size:12px">${esc(e.body)}</div>`:""}
      <div class="mut" style="font-size:11.5px">${when}</div></div></div>`;
  }).join("") || `<p class="mut" style="font-size:12.5px">Nothing yet.</p>`;

  const ownerRow = owner
    ? `<span class="status-pill ${iOwn?"st-done":"st-escrow"}">${iOwn?"You own this":esc(owner.name)+" owns this"}</span>`
    : `<span class="status-pill st-review">Unclaimed</span>`;

  $("dealWrap").innerHTML=`
    <div class="deal-top"><button class="btn btn-ghost" onclick="openSupportQueue()">← Contacted Support</button>
      <h2>Ticket ${t.id}</h2>${ownerRow}</div>
    <div class="agree-doc">
      <div class="ad-head"><span>📮 ${esc(t.subject)}</span><span>${t.created_at?new Date(t.created_at).toLocaleString("en-GB"):""}</span></div>
      <div class="ad-row"><span class="k">From</span><span class="v">${esc(t.name)}</span></div>
      <div class="ad-row"><span class="k">Email</span><span class="v">${esc(t.email||"— none given")}</span></div>
      <div class="ad-row"><span class="k">Mobile</span><span class="v">${esc(t.mobile||"—")}</span></div>
      <div class="ad-row"><span class="k">PromoSlot account</span><span class="v">${t.user_id?`yes — they'll also get an in-app notification`:"no — email only"}</span></div>
    </div>
    <div class="det-sec" style="margin-top:16px"><h5>Message</h5>
      <p class="det-p" style="white-space:pre-wrap">${esc(t.body)}</p></div>

    ${!owner?`<div class="btn-row" style="margin-top:12px">
        <button class="btn btn-p" id="sq-claim" onclick="claimSupportTicket(${t.id})">Claim this ticket</button></div>`:""}

    <div class="det-sec" style="margin-top:18px"><h5>Activity</h5>${events}</div>

    <div class="det-sec"><h5>Reply to ${esc(t.name)}</h5>
      ${iOwn ? `<div class="frm">
          <div><textarea id="sq-reply" placeholder="This is emailed to ${esc(t.email||"the submitter")}…"></textarea></div>
          <div class="hint-err hide" id="sq-err"></div>
          <button class="btn btn-p btn-sm" id="sq-send" onclick="sendSupportReply(${t.id})">Send reply</button></div>`
        : `<p class="mut" style="font-size:12.5px">${owner?`Only ${esc(owner.name)} can reply to this ticket. You can still add an internal note or transfer it.`:"Claim the ticket to reply."}</p>`}
    </div>

    <div class="det-sec"><h5>Internal note (reviewers only)</h5>
      <div class="frm">
        <div><textarea id="sq-note" placeholder="Never emailed, never shown to the submitter…"></textarea></div>
        <button class="btn btn-o btn-sm" onclick="addSupportNote(${t.id})">Add note</button></div></div>

    <div class="det-sec"><h5>Transfer ownership</h5>
      <div class="frm"><div class="row2">
        <div><label>Reviewer's account ID</label><input type="number" id="sq-to" placeholder="e.g. 4"></div>
        <div><label>Reason (optional)</label><input type="text" id="sq-why" placeholder="e.g. owner away"></div></div>
        <button class="btn btn-o btn-sm" onclick="transferSupportTicket(${t.id})">Transfer</button></div></div>`;
}

async function claimSupportTicket(id){
  const b=$("sq-claim"); if(b){ b.disabled=true; b.innerHTML=`<span class="spin"></span> Claiming…`; }
  try{ await PSApi.post(`/support/tickets/${id}/claim`); }
  catch(e){ toast(e.message||"Could not claim"); }      // 409 = someone beat you to it
  openSupportTicket(id);
}
async function sendSupportReply(id){
  const ta=$("sq-reply"), err=$("sq-err"); if(!ta) return;
  const body=(ta.value||"").trim();
  if(!body){ if(err){err.textContent="Write a reply first.";err.classList.remove("hide");} return; }
  const b=$("sq-send"); if(b){ b.disabled=true; b.innerHTML=`<span class="spin"></span> Sending…`; }
  try{ await PSApi.post(`/support/tickets/${id}/reply`,{body}); }
  catch(e){
    if(b){ b.disabled=false; b.textContent="Send reply"; }
    if(err){ err.textContent=e.message||"Could not send"; err.classList.remove("hide"); }
    return;
  }
  toast("Reply sent ✓",true);
  openSupportTicket(id);
}
async function addSupportNote(id){
  const ta=$("sq-note"); const body=(ta&&ta.value||"").trim();
  if(!body){ toast("Write the note first"); return; }
  try{ await PSApi.post(`/support/tickets/${id}/note`,{body}); }
  catch(e){ toast(e.message||"Could not add note"); return; }
  toast("Internal note added");
  openSupportTicket(id);
}
async function transferSupportTicket(id){
  const to=Number(($("sq-to")||{}).value);
  if(!to){ toast("Enter the reviewer's account ID"); return; }
  try{ await PSApi.post(`/support/tickets/${id}/transfer`,{to_user_id:to, reason:(($("sq-why")||{}).value||"").trim()||null}); }
  catch(e){ toast(e.message||"Could not transfer"); return; }
  toast("Ownership transferred");
  openSupportTicket(id);
}

/* ==================== ADMIN CONSOLE ====================
   Permissions here only decide what to SHOW. Every action is independently
   authorised by the API, so hiding a control is convenience, not security. */
function can(permission){ return (S.perms||[]).indexOf(permission)>=0; }
async function loadPerms(){
  try{ const r=await PSApi.get("/admin/me"); S.perms=r.permissions||[]; S.myRole=r.role||"USER";
       S.actionCodeSet=!!r.action_code_set; }
  catch(e){ S.perms=[]; S.myRole="USER"; S.actionCodeSet=false; }
}
function roleBadge(role){
  // Only privileged accounts are ever labelled — a regular member is
  // represented by what they do (listing / campaign), never by "User".
  if(role==="SUPER_ADMIN") return `<span class="tag role-tag super">Super-Admin</span>`;
  if(role==="ADMIN") return `<span class="tag role-tag">Admin</span>`;
  return "";
}
// Fixed set, mirroring ALLOWED_DURATION_DAYS on the server — anything else is
// rejected there, so the picker can only ever offer valid values.
const SUSPEND_DURATIONS=[
  ["3 days",3],["1 week",7],["2 weeks",14],["3 weeks",21],
  ["1 month",30],["3 months",90],["6 months",180],["1 year",365],
  ["Indefinite — until manually restored",null],
];
// Returns {duration_days} or null if cancelled. Indefinite is a real choice,
// not the absence of one: an admin often can't know an end date up front.
function askDuration(){
  const menu=SUSPEND_DURATIONS.map(([l],i)=>`${i+1}) ${l}`).join("\n");
  const raw=window.prompt("How long should this suspension last?\n\n"+menu+
                          "\n\nEnter a number 1-"+SUSPEND_DURATIONS.length+":","1");
  if(raw===null) return null;
  const i=parseInt((raw||"").trim(),10);
  if(!(i>=1 && i<=SUSPEND_DURATIONS.length)){
    toast("Pick a number between 1 and "+SUSPEND_DURATIONS.length); return null;
  }
  return {duration_days:SUSPEND_DURATIONS[i-1][1]};
}

function adminCreds(){
  const password=window.prompt("Confirm your password to authorise this action:","");
  if(password===null) return null;
  let action_code=null;
  if(S.myRole==="SUPER_ADMIN"){
    action_code=window.prompt("Enter your 8-digit action code:","");
    if(action_code===null) return null;
  }
  const reason=window.prompt("Reason (recorded permanently in the audit log):","");
  if(reason===null) return null;
  if(reason.trim().length<3){ toast("A reason of at least 3 characters is required"); return null; }
  return {password, action_code, reason:reason.trim()};
}
async function openAdmin(tab, focus){
  if(!can("admin.view")){ toast("Super-Admin access required"); return; }
  setRoute("admin");
  tab=tab||"admins";
  showView("view-deal");
  let admins=[], logs=[], mods={listings:[],campaigns:[]}, banned=[];
  if(tab==="admins"){ try{ admins=await PSApi.get("/admin/admins"); }catch(e){} }
  else if(tab==="banned"){
    try{ mods.members=await PSApi.get("/admin/members"); }catch(e){ mods.members={active:[],restricted:[]}; }
    try{ mods.suspended=await PSApi.get("/admin/suspended"); }catch(e){ mods.suspended={listings:[],campaigns:[]}; }
  }
  else if(tab==="moderation"){
    try{ mods.listings=await PSApi.get("/platforms"); }catch(e){}
    try{ mods.campaigns=await PSApi.get("/campaigns"); }catch(e){}
    try{ mods.suspended=await PSApi.get("/admin/suspended"); }catch(e){ mods.suspended={listings:[],campaigns:[]}; }
    try{ mods.members=await PSApi.get("/admin/members"); }catch(e){ mods.members={active:[],restricted:[]}; }
  }
  else if(tab==="audit"){ try{ logs=await PSApi.get("/admin/audit-log?limit=100"); }catch(e){} }
  let body="";
  if(tab==="admins"){
    body=`<p class="deal-sub" style="padding:0 2px 8px">Privileged accounts. Assigning or removing a role requires your password${S.myRole==="SUPER_ADMIN"?" and action code":""}, and is written to the immutable audit log.</p>
      <div class="panel"><div class="panel-b">
      ${admins.length?admins.map(u=>`<div class="deal-row" style="cursor:default">
        ${pfp(u.display_name||u.email,null)}
        <div><div class="dr-t">${esc(u.display_name||u.email)} ${roleBadge(u.role)}</div>
          <div class="dr-s">${esc(u.email)}${u.suspended?" · <b>suspended</b>":""} · Action code ${u.action_code_set?"set":"not set"}</div></div>
        <div class="btn-row">
          ${u.suspended
            ? `<button class="btn btn-o btn-sm" onclick="adminUnsuspend(${u.id})">Unsuspend</button>`
            : `<button class="btn btn-danger btn-sm" onclick="adminSuspend(${u.id})">Suspend</button>`}
          ${u.role!=="SUPER_ADMIN"?`<button class="btn btn-ghost btn-sm" onclick="adminSetRole(${u.id},'USER')">Remove admin</button>`:""}
        </div></div>`).join("")
        :`<div class="empty-state"><div class="es-ico">🛡️</div><h4>No admins yet</h4></div>`}
      </div></div>
      <div class="panel"><div class="panel-h"><h4>Find a member to promote</h4></div><div class="panel-b">
        <p class="mut" style="font-size:12.5px;margin-bottom:10px">Search an existing account by email or name, then promote it to Admin. You'll confirm with your password and action code, and the change is written to the audit log.</p>
        <div class="frm"><div><label>Search by email or name</label>
          <input type="text" id="ad-search" placeholder="e.g. sam@ or Sam Taylor"
                 onkeydown="if(event.key==='Enter')adminSearchUsers()"></div></div>
        <div style="margin-top:10px"><button class="btn btn-p btn-sm" onclick="adminSearchUsers()">Search</button></div>
        <div id="ad-results" style="margin-top:12px"></div>
      </div></div>`;
  } else if(tab==="banned"){
    // Everything currently withheld — accounts and marketplace items alike.
    // Moderation next door stays purely about what is live and actionable.
    S._restrictedUsers=(mods.members||{}).restricted||[];
    S._restrictedItems=mods.suspended||{listings:[],campaigns:[]};
    body=`<p class="deal-sub" style="padding:0 2px 8px">Accounts and items currently withheld. A suspension can be lifted, by hand or when its period runs out; a ban is permanent, and that address can never sign up again.</p>
      <div class="panel"><div class="panel-h"><h4>Banned/Suspended Users</h4></div><div class="panel-b">
        <div class="frm"><div><label>Search</label>
          <input type="text" id="bs-user-filter" placeholder="Filter by email or name" oninput="filterRestrictedUsers()"></div></div>
        <div id="bs-user-rows" style="margin-top:10px">${restrictedUserRowsHtml(S._restrictedUsers)}</div>
      </div></div>
      <div class="panel"><div class="panel-h"><h4>Banned/Suspended Campaigns/Listings</h4></div><div class="panel-b">
        <div class="frm"><div><label>Search</label>
          <input type="text" id="bs-item-filter" placeholder="Filter by listing name or campaign title" oninput="filterRestrictedItems()"></div></div>
        <div id="bs-item-rows" style="margin-top:10px">${restrictedItemRowsHtml(S._restrictedItems)}</div>
      </div></div>`;
  } else if(tab==="moderation"){
    const sus=mods.suspended||{listings:[],campaigns:[]};
    const row=(title,sub,btn,ref)=>`<div class="deal-row" style="cursor:default"${ref?` id="acp-${esc(ref)}"`:""}>
        <div class="pfp" style="background:var(--acc)">${esc((title||"?").slice(0,1).toUpperCase())}</div>
        <div><div class="dr-t">${esc(title)}</div><div class="dr-s">${sub}</div></div>
        <div class="btn-row">${btn}</div></div>`;
    const mem=mods.members||{active:[],restricted:[]};
    // Users get their own row shape: an avatar, and role/state in the subtitle.
    const urow=(u,btn)=>`<div class="deal-row" style="cursor:default" id="acp-u${u.id}">
        ${pfp(u.display_name||u.email,null)}
        <div><div class="dr-t">${esc(u.display_name||u.email)}</div>
          <div class="dr-s">${esc(u.email)}${u.banned?" · <b>banned</b>":u.suspended?" · <b>suspended</b>":""}${u.suspended_reason?" · "+esc(u.suspended_reason):""}</div></div>
        <div class="btn-row">${btn}</div></div>`;
    body=`<p class="deal-sub" style="padding:0 2px 8px">What's live right now. Suspending hides an item and blocks new bookings but keeps it intact — it moves to <b>Banned/Suspended</b>, and returns here when restored or when its period runs out. <b>Delete removes it outright and cannot be undone.</b> Both are written to the audit log.</p>
      <div class="panel"><div class="panel-h"><h4>Live listings</h4></div><div class="panel-b">
        ${mods.listings.length?mods.listings.map(l=>row(l.name,`${esc(l.platform)} · by ${esc(l.owner||"")}`,
          `<button class="btn btn-o btn-sm" onclick="adminSuspendListing(${String(l.id).slice(1)})">Suspend</button>`
          +`<button class="btn btn-danger btn-sm" onclick="adminRemoveListing(${String(l.id).slice(1)})">Delete</button>`, l.id)).join("")
          :`<p class="mut" style="font-size:12.5px">No live listings.</p>`}
      </div></div>
      <div class="panel"><div class="panel-h"><h4>Live campaigns</h4></div><div class="panel-b">
        ${mods.campaigns.length?mods.campaigns.map(c=>row(c.title,`by ${esc(c.company||"")}`,
          `<button class="btn btn-o btn-sm" onclick="adminSuspendCampaign(${String(c.id).replace(/^c/,'')})">Suspend</button>`
          +`<button class="btn btn-danger btn-sm" onclick="adminRemoveCampaign(${String(c.id).replace(/^c/,'')})">Delete</button>`, c.id)).join("")
          :`<p class="mut" style="font-size:12.5px">No live campaigns.</p>`}
      </div></div>
      <div class="panel"><div class="panel-h"><h4>Active users</h4></div><div class="panel-b">
        ${mem.active.length?mem.active.map(u=>urow(u,
          `<button class="btn btn-o btn-sm" onclick="adminSuspend(${u.id})">Suspend</button>`
          +`<button class="btn btn-danger btn-sm" onclick="adminBan(${u.id})">Ban</button>`)).join("")
          :`<p class="mut" style="font-size:12.5px">No active member accounts.</p>`}
        ${mem.truncated?`<p class="mut" style="font-size:12px;margin-top:8px">Showing the ${mem.limit} most recent. Use the Admins tab search to find anyone older.</p>`:""}
      </div></div>
`;
  } else {
    body=`<p class="deal-sub" style="padding:0 2px 8px">Append-only. The database itself rejects any update or delete on this table — these entries cannot be edited or removed through any path.</p>
      <div class="panel"><div class="panel-b">
      ${logs.length?logs.map(r=>`<div class="proof-item got proof-block">
        <div class="pb-head"><span class="pi-ico">🧾</span><b>${esc(r.action)}</b>
          <span class="ok">${r.created_at?new Date(r.created_at).toLocaleString("en-GB"):""}</span></div>
        <div class="pb-link">Admin ${r.actor_id==null?"—":r.actor_id} (${esc(r.actor_role||"—")}) → ${esc(r.target_type||"—")} ${esc(r.target_id||"")}</div>
        ${r.reason?`<div class="mut" style="font-size:12.5px;margin-top:4px">Reason: ${esc(r.reason)}</div>`:""}
        <div class="mut" style="font-size:11.5px;margin-top:4px">IP ${esc(r.ip_address||"—")} · request ${esc(String(r.request_id||"").slice(0,12))}</div>
        <div class="mut" style="font-size:11.5px;margin-top:2px">was ${esc(JSON.stringify(r.previous_state||{}))} → now ${esc(JSON.stringify(r.new_state||{}))}</div>
      </div>`).join("")
        :`<div class="empty-state"><div class="es-ico">🧾</div><h4>No audit entries yet</h4></div>`}
      </div></div>`;
  }
  $("dealWrap").innerHTML=`
    <div class="deal-top"><button class="btn btn-ghost" onclick="goHome()">← Home</button><h2>Admin console</h2>
      <span class="status-pill st-review">${esc(S.myRole==="SUPER_ADMIN"?"Super-Admin":"Admin")}</span></div>
    <div class="det-tabs">${[["admins","Admins"],["moderation","Moderation"],["banned","Banned/Suspended"],["audit","Audit log"]].map(([k,l])=>`<button class="det-tab ${tab===k?"on":""}" onclick="openAdmin('${k}')">${l}</button>`).join("")}</div>
    ${body}`;
  if(focus) _acpFocus(tab, focus);
}

// Deep-link target from a "View on ACP" link: scroll to and flash the row, or
// for an account, run the member search on their email so the existing
// promote/suspend/ban actions are right there.
// A timed suspension shows when it lifts; an indefinite one says so plainly,
// so "no date" is never mistaken for missing data.
function suspensionSuffix(u){
  if(u.banned) return "";
  if(!u.suspended_at && !u.suspended) return "";
  return u.suspended_until
    ? " · until "+new Date(u.suspended_until).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})
    : " · indefinitely";
}
function restrictedUserRowsHtml(rows){
  if(!rows.length) return `<div class="empty-state small"><div class="es-ico">👤</div><h4>No suspended or banned accounts</h4><p>Accounts you suspend or ban appear here.</p></div>`;
  return rows.map(u=>`<div class="deal-row" style="cursor:default" id="acp-u${u.id}">
      ${pfp(u.display_name||u.email,null)}
      <div><div class="dr-t">${esc(u.display_name||u.email)}</div>
        <div class="dr-s">${esc(u.email)} · <b>${u.banned?"banned":"suspended"}</b>${esc(suspensionSuffix(u))}${u.suspended_reason?" · "+esc(u.suspended_reason):""}</div></div>
      <div class="btn-row">${u.banned
        // No unban endpoint exists, so no button rather than one that would 404.
        ? `<span class="mut" style="font-size:12.5px">Banned — permanent</span>`
        : `<button class="btn btn-o btn-sm" onclick="adminUnsuspend(${u.id})">Restore</button>`}</div>
    </div>`).join("");
}
function restrictedItemRowsHtml(items){
  const ls=items.listings||[], cs=items.campaigns||[];
  if(!ls.length && !cs.length) return `<div class="empty-state small"><div class="es-ico">🚧</div><h4>Nothing suspended</h4><p>Suspended listings and campaigns appear here.</p></div>`;
  const row=(title,sub,btn,ref)=>`<div class="deal-row" style="cursor:default" id="acp-${esc(ref)}">
      <div class="pfp" style="background:var(--acc)">${esc((title||"?").slice(0,1).toUpperCase())}</div>
      <div><div class="dr-t">${esc(title)}</div><div class="dr-s">${sub}</div></div>
      <div class="btn-row">${btn}</div></div>`;
  const until=x=>x.suspended_until
    ? " · until "+new Date(x.suspended_until).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})
    : " · indefinitely";
  return ls.map(l=>row(l.name,`Listing${esc(until(l))}${l.suspended_reason?" · "+esc(l.suspended_reason):""}`,
      `<button class="btn btn-o btn-sm" onclick="adminUnsuspendListing(${l.id})">Restore</button>`
      +`<button class="btn btn-danger btn-sm" onclick="adminRemoveListing(${l.id})">Delete</button>`, "p"+l.id)).join("")
   + cs.map(c=>row(c.title,`Campaign${esc(until(c))}${c.suspended_reason?" · "+esc(c.suspended_reason):""}`,
      `<button class="btn btn-o btn-sm" onclick="adminUnsuspendCampaign(${c.id})">Restore</button>`
      +`<button class="btn btn-danger btn-sm" onclick="adminRemoveCampaign(${c.id})">Delete</button>`, "c"+c.id)).join("");
}
// Each section filters only its own list.
function filterRestrictedUsers(){
  const q=(($("bs-user-filter")||{}).value||"").trim().toLowerCase();
  const rows=(S._restrictedUsers||[]).filter(u=>!q ||
    (u.email||"").toLowerCase().includes(q) || (u.display_name||"").toLowerCase().includes(q));
  const host=$("bs-user-rows"); if(host) host.innerHTML=restrictedUserRowsHtml(rows);
}
function filterRestrictedItems(){
  const q=(($("bs-item-filter")||{}).value||"").trim().toLowerCase();
  const src=S._restrictedItems||{listings:[],campaigns:[]};
  const host=$("bs-item-rows"); if(!host) return;
  host.innerHTML=restrictedItemRowsHtml({
    listings:(src.listings||[]).filter(l=>!q||(l.name||"").toLowerCase().includes(q)),
    campaigns:(src.campaigns||[]).filter(c=>!q||(c.title||"").toLowerCase().includes(q)),
  });
}

function _acpFocus(tab, focus){
  if(tab==="admins"){
    const box=$("ad-search");
    if(box){ box.value=focus; adminSearchUsers(); }
    return;
  }
  return _flashRow(focus);
}
function _flashRow(focus){
  const el=$("acp-"+focus);
  if(!el) return false;
  if(el.scrollIntoView) el.scrollIntoView({behavior:"smooth", block:"center"});
  el.classList.add("flash"); setTimeout(()=>el.classList.remove("flash"),1600);
  return true;
}

// A listing/campaign lives on Moderation while live and on Banned/Suspended
// once withheld, so a link has to try both — otherwise suspending something
// silently breaks its own deep-link, the bug fixed in 03ddbb4.
async function openAcpItem(ref){
  await openAdmin("moderation", ref);
  if($("acp-"+ref)) return;
  await openAdmin("banned", ref);
  if(!$("acp-"+ref)) toast("That item isn't listed — it may have been deleted.");
}

// Super-Admin shortcut shown on listing/campaign/profile detail views. Purely
// navigation into the existing panel — the actual suspend/ban/remove controls
// stay in one place rather than being duplicated onto public-facing views.
// Accounts need two possible destinations: regular members are browsable on the
// Moderation tab now, privileged accounts still only exist on the Admins tab.
// The profile payload deliberately carries no role — exposing it publicly is
// exactly what the role design forbids — so rather than leaking it, this tries
// Moderation and falls back to the Admins search when the row isn't there,
// which is precisely the privileged case.
function acpAccountLinkHtml(userId, displayName){
  if(!can("admin.view") || !userId) return "";
  return `<button class="btn btn-o btn-sm" style="margin-left:8px"
      onclick="event.stopPropagation();closeModal();openAcpAccount(${Number(userId)},'${esc(displayName)}')"
      title="Open this account in the Admin Control Panel">🛡️ View on ACP</button>`;
}
async function openAcpAccount(userId, displayName){
  await openAdmin("moderation", "u"+userId);    // active members
  if($("acp-u"+userId)) return;
  await openAdmin("banned", "u"+userId);        // suspended or banned members
  if($("acp-u"+userId)) return;
  // Neither list has them, which is what a privileged account looks like.
  if(displayName) await openAdmin("admins", displayName);
  else toast("That account isn't listed under Moderation — try the Admins tab.");
}

function acpLinkHtml(kind, ref){
  if(!can("admin.view")) return "";
  const tab = kind==="account" ? "admins" : "moderation";
  return `<button class="btn btn-o btn-sm" style="margin-left:8px"
      onclick="event.stopPropagation();closeModal();openAcpItem('${esc(String(ref))}')"
      title="Open this in the Admin Control Panel">🛡️ View on ACP</button>`;
}
// Look up an existing member by email/name so real team members can be promoted
// without knowing their numeric id.
async function adminSearchUsers(){
  const host=$("ad-results"); if(!host) return;
  const q=(($("ad-search")||{}).value||"").trim();
  if(q.length<2){ host.innerHTML=`<p class="mut" style="font-size:12.5px">Enter at least 2 characters.</p>`; return; }
  host.innerHTML=`<p class="mut" style="font-size:12.5px"><span class="spin"></span> Searching…</p>`;
  let rows=[];
  try{ rows=await PSApi.get(`/admin/users/search?q=${encodeURIComponent(q)}`); }
  catch(e){ host.innerHTML=`<p class="hint-err">${esc(e.message||"Search failed")}</p>`; return; }
  if(!rows.length){ host.innerHTML=`<p class="mut" style="font-size:12.5px">No accounts match “${esc(q)}”.</p>`; return; }
  host.innerHTML=rows.map(u=>{
    const isSelf = S.account && u.id===S.account.id;
    let action;
    if(isSelf) action=`<span class="mut" style="font-size:12.5px">That's you — you can't change your own role.</span>`;
    else if(u.role==="SUPER_ADMIN") action=`<span class="mut" style="font-size:12.5px">Super-Admin</span>`;
    else if(u.role==="ADMIN") action=`<button class="btn btn-ghost btn-sm" onclick="adminSetRole(${u.id},'USER')">Remove admin</button>`;
    else action=`<button class="btn btn-p btn-sm" onclick="adminSetRole(${u.id},'ADMIN')">Promote to Admin</button>`;
    // Suspension and ban apply to ANY account, not just privileged ones — these
    // were previously only reachable from the Admins list.
    if(!isSelf && u.role!=="SUPER_ADMIN"){
      if(u.banned) action+=`<span class="mut" style="font-size:12.5px;margin-left:8px">Banned</span>`;
      else action+=(u.suspended
          ? `<button class="btn btn-o btn-sm" onclick="adminUnsuspend(${u.id})">Unsuspend</button>`
          : `<button class="btn btn-o btn-sm" onclick="adminSuspend(${u.id})">Suspend</button>`)
        +`<button class="btn btn-danger btn-sm" onclick="adminBan(${u.id})">Ban</button>`;
    }
    const what=[u.is_business?"business":null,u.is_platform_owner?"platform owner":null]
      .filter(Boolean).join(" · ")||"member";
    return `<div class="deal-row" style="cursor:default">
      ${pfp(u.display_name||u.email,null)}
      <div><div class="dr-t">${esc(u.display_name||u.email)} ${roleBadge(u.role)}</div>
        <div class="dr-s">${esc(u.email)} · ${what}${u.suspended?" · <b>suspended</b>":""}${u.banned?" · <b>banned</b>":""}</div></div>
      <div class="btn-row">${action}</div></div>`;
  }).join("");
}
async function _modAction(path, okMsg, opts){
  opts=opts||{};
  // Duration first: no point collecting credentials for a flow they abandon.
  let extra={};
  if(opts.withDuration){ const d=askDuration(); if(!d) return; extra=d; }
  const c=adminCreds(); if(!c) return;
  try{ await PSApi.post(path, {...c, ...extra}); }catch(e){ toast(e.message||"Action failed"); return; }
  toast(okMsg,true); loadMarket(); openAdmin(opts.backTo||"moderation");
}
const adminSuspendListing   = id => _modAction(`/admin/listings/${id}/suspend`,   "Listing suspended — hidden from the marketplace", {withDuration:true, backTo:"banned"});
const adminUnsuspendListing = id => _modAction(`/admin/listings/${id}/unsuspend`, "Listing restored", {backTo:"banned"});
const adminSuspendCampaign  = id => _modAction(`/admin/campaigns/${id}/suspend`,  "Campaign suspended — hidden from the marketplace", {withDuration:true, backTo:"banned"});
const adminUnsuspendCampaign= id => _modAction(`/admin/campaigns/${id}/unsuspend`,"Campaign restored", {backTo:"banned"});
// Permanent: the server hard-deletes the row. Distinguished from Suspend in
// both wording and styling because Suspend can be undone and this cannot. The
// server still demands password + action code.
const adminRemoveListing    = id => _modAction(`/admin/listings/${id}/remove`,    "Listing removed permanently");
const adminRemoveCampaign   = id => _modAction(`/admin/campaigns/${id}/remove`,   "Campaign removed permanently");

async function adminSetRole(userId, role){
  if(!userId){ toast("Enter a user ID"); return; }
  const c=adminCreds(); if(!c) return;
  try{ await PSApi.post(`/admin/users/${userId}/role`, Object.assign({role}, c)); }
  catch(e){ toast(e.message||"Could not assign role"); return; }
  toast("Role updated ✓",true); openAdmin("admins");
}
async function adminSuspend(userId){
  const d=askDuration(); if(!d) return;
  const c=adminCreds(); if(!c) return;
  try{ await PSApi.post(`/admin/users/${userId}/suspend`, {...c, ...d}); }
  catch(e){ toast(e.message||"Could not suspend"); return; }
  toast("Account suspended — sessions revoked",true); openAdmin("banned");
}
async function adminUnsuspend(userId){
  const c=adminCreds(); if(!c) return;
  try{ await PSApi.post(`/admin/users/${userId}/unsuspend`, c); }
  catch(e){ toast(e.message||"Could not unsuspend"); return; }
  toast("Account restored",true); openAdmin("admins");
}
// Ban is permanent in effect (sessions revoked, the email can never sign up
// again) — the server still requires password + action code on top of this.
async function adminBan(userId){
  const c=adminCreds(); if(!c) return;
  try{ await PSApi.post(`/admin/users/${userId}/ban`, c); }
  catch(e){ toast(e.message||"Could not ban"); return; }
  toast("Account banned — sessions revoked",true); openAdmin("banned");
}
function scrollToPanel(id){
  const el=$(id); if(!el) return;
  // scrollIntoView handles nested scroll containers; scroll-margin-top clears the nav.
  if(el.scrollIntoView) el.scrollIntoView({behavior:"smooth", block:"start"});
  else smoothTo(el);
  el.classList.add("flash"); setTimeout(()=>el.classList.remove("flash"),1200);
}
async function openCompleted(){
  if(!can("deal.view_evidence")){ toast("Admin access required"); return; }
  setRoute("completed");
  showView("view-deal");
  let q=[]; try{ q=await PSApi.get("/review/completed"); }catch(e){}
  const total=q.reduce((a,x)=>a+(x.platform_take||0),0);
  $("dealWrap").innerHTML=`
    <div class="deal-top"><button class="btn btn-ghost" onclick="openPayouts()">← Awaiting payouts</button><h2>Completed Deals</h2>
      <span class="status-pill st-done">${q.length} completed</span></div>
    <p class="deal-sub" style="padding:0 2px 6px">Historical record of paid-out deals.${q.length?` PromoSlot take across these: <b>${gbpP(total)}</b>.`:""}</p>
    <div class="panel"><div class="panel-b">${q.length?q.map(item=>`
      <div class="deal-row" onclick="showView('view-deal');renderRealDeal(${item.deal_id})">
        <div class="pfp" style="background:var(--acc2)">${item.deal_id}</div>
        <div><div class="dr-t">Deal ${item.deal_id} · ${esc(item.business)} ⇄ ${esc(item.owner)}</div>
          <div class="dr-s">Paid ${item.paid_at?new Date(item.paid_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"—"}${item.transfer_id?" · "+esc(item.transfer_id):""}</div></div>
        <div class="dr-amt"><b>${gbpP(item.net_to_owner)}</b><small>to owner · fee ${gbpP(item.platform_take)}</small></div></div>`).join("")
      :`<div class="empty-state"><div class="es-ico">🗂️</div><h4>No completed deals yet</h4><p>Deals appear here once their payout has been released.</p></div>`}</div></div>`;
}
async function openPayouts(){
  if(!can("deal.view_evidence")){ toast("Admin access required"); return; }
  setRoute("payouts");
  showView("view-deal");
  let q=[]; try{ q=await PSApi.get("/review/payouts"); }catch(e){}
  loadNotifications();
  $("dealWrap").innerHTML=`
    <div class="deal-top"><button class="btn btn-ghost" onclick="openReviewQueue()">← Review queue</button><h2>Awaiting Payouts</h2>
      <button class="btn btn-o btn-sm" onclick="openCompleted()">🗂️ Completed Deals →</button>
      <span class="status-pill st-escrow">${q.length} to pay</span></div>
    <p class="deal-sub" style="padding:0 2px 6px">Verified deals waiting for a payout. They stay here until you release the funds (or refund) — nothing is lost after verification.</p>
    <div class="panel"><div class="panel-b">${q.length?q.map(item=>`
      <div class="deal-row" onclick="showView('view-deal');renderRealDeal(${item.deal_id})">
        <div class="pfp" style="background:var(--acc)">${item.deal_id}</div>
        <div><div class="dr-t">Deal ${item.deal_id} · ${esc(item.owner)}</div>
          <div class="dr-s">Verified · ${item.payout_ready?"payout ready":"owner hasn't set up payouts yet"}</div></div>
        <div class="dr-amt"><b>${gbpP(item.net_to_owner)}</b><small>to owner</small></div></div>`).join("")
      :`<div class="empty-state"><div class="es-ico">💸</div><h4>No payouts pending</h4><p>Verified deals awaiting payout appear here until you release the funds.</p></div>`}</div></div>`;
}
async function loadMine(){
  if(!S.account){ S.myPlatforms=[]; S.myCampaigns=[]; return; }
  await Promise.all([
    S.account.is_platform_owner
      ? PSApi.get("/platforms/mine").then(r=>{S.myPlatforms=r;}).catch(()=>{S.myPlatforms=[];})
      : Promise.resolve(S.myPlatforms=[]),
    S.account.is_business
      ? PSApi.get("/campaigns/mine").then(r=>{S.myCampaigns=r;}).catch(()=>{S.myCampaigns=[];})
      : Promise.resolve(S.myCampaigns=[]),
  ]);
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
      ${isSignup?"":`<p class="mut" style="font-size:12.5px;margin-top:2px">Signed up but never got the verification email?
        <a href="#" class="party-link" onclick="event.preventDefault();resendVerification(($('au-email')||{}).value||'')">Send it again</a></p>`}
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
  let res;
  try{
    res=await PSApi.signup({email,password,display_name:display_name||null,is_business,is_platform_owner});
  }catch(err){ btn.disabled=false; btn.textContent="Create account"; _authErr(err.message||"Signup failed"); return; }
  // The account exists but cannot be used until the emailed link is clicked, so
  // there is no session to reflect — say what happens next instead.
  checkYourEmailModal(res && res.email || email);
}
async function doLogin(){
  const email=($("au-email").value||"").trim(), password=$("au-pass").value||"";
  if(!email||!password){ _authErr("Email and password are required."); return; }
  const btn=$("au-submit"); btn.disabled=true; btn.textContent="Logging in…";
  try{
    S.account=await PSApi.login({email,password});
    await loadPerms();
    closeModal(); authReflect(); await loadMine(); authReflect(); toast("Logged in",true);
    _resumeAfterAuth();
  }catch(err){
    btn.disabled=false; btn.textContent="Log in";
    // Count consecutive failures for this email; after 3, offer a password reset.
    S._loginFails = (S._loginFailEmail===email.toLowerCase() ? (S._loginFails||0) : 0) + 1;
    S._loginFailEmail = email.toLowerCase();
    _authErr(err.message||"Login failed");
    if(S._loginFails>=3){
      const e=$("au-err");
      // An unverified account needs a new link, not a password reset.
      const unverified=/verify your email/i.test(err.message||"");
      if(e) e.innerHTML = unverified
        ? `${esc(err.message)} · <a href="#" class="party-link" onclick="event.preventDefault();resendVerification('${esc(email)}')">Resend the link</a>`
        : `${esc(err.message||"Login failed")} · <a href="#" class="party-link" onclick="event.preventDefault();forgotPasswordModal('${esc(email)}')">Reset password</a>`;
    }
  }
}
/* ---------- Password reset (real email via Resend) ---------- */
function checkYourEmailModal(email){
  openModal(`<div class="m-pad"><h3 class="m-title">Check your email</h3>
    <p class="m-sub">We've sent a link to <b>${esc(email||"your inbox")}</b>. Click it to confirm
       your address — you'll be signed in straight away. The link works once and expires in 24 hours.</p>
    <p class="mut" style="font-size:12.5px">Not arrived? Check spam, or send it again below.</p>
    <div class="hint-err hide" id="vr-err"></div>
    <div class="m-actions">
      <button class="btn btn-o" id="vr-resend" onclick="resendVerification('${esc(email||"")}')">Send it again</button>
      <button class="btn btn-p" onclick="closeModal()">Got it</button></div></div>`,"narrow");
}

// Reachable from the login screen for anyone who never got (or lost) the email.
async function resendVerification(prefill){
  const email=(prefill||"").trim() || window.prompt("Which email address did you sign up with?","")||"";
  if(!email.trim()) return;
  const btn=$("vr-resend"); if(btn){ btn.disabled=true; btn.innerHTML=`<span class="spin"></span> Sending…`; }
  let msg;
  try{ const r=await PSApi.post("/auth/resend-verification",{email:email.trim()}); msg=r&&r.message; }
  catch(e){
    if(btn){ btn.disabled=false; btn.textContent="Send it again"; }
    const err=$("vr-err"); if(err){ err.textContent=e.message||"Could not send"; err.classList.remove("hide"); }
    else toast(e.message||"Could not send");
    return;
  }
  if(btn){ btn.disabled=false; btn.textContent="Send it again"; }
  // Deliberately the same wording whether or not the address needed verifying.
  toast(msg||"If that email needs verifying, a new link is on its way.",true);
}

// A real verification link lands as /?verify=<token>: confirm it, which also
// signs the account in, then carry on as a normal fresh login.
async function verifyEmailFromLink(token){
  openModal(`<div class="m-pad"><h3 class="m-title">Verifying your email…</h3>
    <p class="m-sub">One moment.</p></div>`,"narrow",true);
  let acct;
  try{ acct=await PSApi.post("/auth/verify-email",{token}); }
  catch(e){
    openModal(`<div class="m-pad"><h3 class="m-title">That link didn't work</h3>
      <p class="m-sub">${esc(e.message||"The link is invalid or has expired.")}</p>
      <div class="m-actions">
        <button class="btn btn-o" onclick="closeModal();resendVerification('')">Send a new link</button>
        <button class="btn btn-p" onclick="closeModal()">Close</button></div></div>`,"narrow");
    return;
  }
  S.account=acct;
  await loadPerms(); await loadMine(); await loadNotifications();
  closeModal(); authReflect();
  toast("Email verified — you're signed in ✓",true);
  openDash();
}

function forgotPasswordModal(prefill){
  openModal(`<div class="m-pad"><h3 class="m-title">Reset your password</h3>
    <p class="m-sub">Enter the email on your account. We'll send a secure link to set a new password — it expires in 1 hour.</p>
    <div class="frm">
      <div><label>Email</label><input type="text" id="fp-email" value="${esc(prefill||"")}" onkeydown="if(event.key==='Enter')sendReset()"></div>
      <div class="hint-err hide" id="fp-err"></div>
    </div>
    <div class="m-actions"><button class="btn btn-o" onclick="authModal('login')">Back to log in</button>
      <button class="btn btn-p" id="fp-btn" onclick="sendReset()">Send reset link</button></div></div>`,"narrow");
}
async function sendReset(){
  const email=($("fp-email").value||"").trim();
  const err=$("fp-err"); const fail=m=>{ if(err){err.textContent=m;err.classList.remove("hide");} };
  if(err) err.classList.add("hide");
  if(!email){ fail("Enter your email."); return; }
  const btn=$("fp-btn"); btn.disabled=true; btn.innerHTML=`<span class="spin"></span> Sending…`;
  let r; try{ r=await PSApi.post("/auth/forgot-password",{email}); }
  catch(e){ btn.disabled=false; btn.textContent="Send reset link"; fail(e.message||"Could not send the reset email."); return; }
  openModal(`<div class="m-pad"><h3 class="m-title">Check your email</h3>
    <p class="m-sub">${esc(r.message||"If that email is registered, a reset link is on its way.")} The link expires in 1 hour and can only be used once.</p>
    <div class="m-actions"><button class="btn btn-p" onclick="closeModal()">Done</button></div></div>`,"narrow");
}
function resetPasswordModal(token){
  openModal(`<div class="m-pad"><h3 class="m-title">Set a new password</h3>
    <p class="m-sub">Choose a new password for your account.</p>
    <div class="frm">
      <div><label>New password</label><input type="password" id="rp-new" placeholder="At least 8 characters"></div>
      <div><label>Confirm new password</label><input type="password" id="rp-conf" onkeydown="if(event.key==='Enter')doResetPassword('${esc(token)}')"></div>
      <div class="hint-err hide" id="rp-err"></div>
    </div>
    <div class="m-actions"><button class="btn btn-p" onclick="doResetPassword('${esc(token)}')">Save new password</button></div></div>`,"narrow");
}
async function doResetPassword(token){
  const nw=($("rp-new").value||""), conf=($("rp-conf").value||"");
  const err=$("rp-err"); const fail=m=>{ if(err){err.textContent=m;err.classList.remove("hide");} };
  if(err) err.classList.add("hide");
  if(nw.length<8){ fail("Password must be at least 8 characters."); return; }
  if(nw!==conf){ fail("Passwords don't match."); return; }
  try{ await PSApi.post("/auth/reset-password",{token,new_password:nw}); }
  catch(e){ fail(e.message||"That reset link is invalid or has expired."); return; }
  S._loginFails=0;
  closeModal(); toast("Password updated — please log in",true);
  history.replaceState({}, "", location.pathname);
  authModal("login");
}
async function doLogout(){
  clearRoute();
  try{ await PSApi.logout(); }catch(e){}
  S.account=null; S.perms=[]; S.myRole="USER";
  // Wipe already-rendered privileged/account markup so nothing from the previous
  // session lingers in the DOM (audit entries, admin emails, deal details).
  ["dealWrap","accountWrap","msgsWrap","bizDash","platDash"].forEach(id=>{
    const el=$(id); if(el) el.innerHTML="";
  });
  S.convos=[]; S.activeThread=null; S.realDeals=[]; S.realNotifs=[]; S._who=null;
  authReflect(); goHome(); toast("Logged out");
}
/* ==================== MY ACCOUNT ==================== */
function roleLabels(a){
  const r=[];
  if(a.is_business) r.push("Business");
  if(a.is_platform_owner) r.push("Platform owner");
  // Role tier is shown ONLY for privileged accounts, never "User".
  if(S.myRole==="SUPER_ADMIN") r.push("Super-Admin");
  else if(S.myRole==="ADMIN") r.push("Admin");
  return r.length?r:["No role set"];
}
function avatarBlock(url, name, big){
  const cls=(big?"avatar-dot dash-avatar":"avatar-dot");
  return url ? `<span class="${cls} has-img" style="background-image:url('${url}')"></span>`
             : `<span class="${cls}">${esc((name||"?").slice(0,1).toUpperCase())}</span>`;
}
function supportFormHtml(){
  const a=S.account||{};
  return `<h5 style="margin-bottom:6px">Contact Support</h5>
    <p class="mut" style="font-size:12.5px;margin-bottom:10px">Questions or an issue? Send our team a message and we'll get back to you.</p>
    <div class="frm">
      <div class="row2"><div><label>Name</label><input type="text" id="sup-name" value="${esc(a.display_name||"")}"></div>
        <div><label>Email (optional)</label><input type="text" id="sup-email" value="${esc(a.email||"")}"></div></div>
      <div class="row2"><div><label>Mobile (optional)</label><input type="text" id="sup-mobile" placeholder="+44 …"></div>
        <div><label>Subject</label><input type="text" id="sup-subject" placeholder="How can we help?"></div></div>
      <div><label>Message</label><textarea id="sup-body" placeholder="Describe your question or issue…"></textarea></div>
      <div class="hint-err hide" id="sup-err"></div>
    </div>
    <div style="margin-top:12px"><button class="btn btn-p btn-sm" onclick="submitSupport()">Send message</button></div>`;
}
function openAccount(){
  const a=S.account;
  if(!a){ authModal("login"); return; }
  setRoute("account");
  showView("view-account");
  $("accountWrap").innerHTML=`
    <div class="deal-top"><button class="btn btn-ghost" onclick="goHome()">← Home</button><h2>My Account</h2></div>
    <div class="acct-grid">
      <div class="panel"><div class="panel-b">
        <div class="acct-id">${avatarBlock(a.avatar_url, a.display_name||a.email, true)}
          <div><div class="acct-name">${esc(a.display_name||"—")}</div><div class="acct-email">${esc(a.email)}</div></div></div>
        <div style="margin:0 0 14px">
          <label class="btn btn-o btn-sm" for="acct-avatar">${a.avatar_url?"Change profile picture":"Add profile picture"}</label>
          <input type="file" id="acct-avatar" accept="image/*" class="pf-file-input" onchange="uploadAvatar()"></div>
        <div class="acct-rows">
          <div class="acct-row"><span>Name</span><b>${esc(a.display_name||"—")}</b></div>
          <div class="acct-row"><span>Email</span><b>${esc(a.email)}</b></div>
          <div class="acct-row"><span>Role${roleLabels(a).length>1?"s":""}</span><b>${roleLabels(a).map(r=>`<span class="tag">${esc(r)}</span>`).join(" ")}</b></div>
        </div>
        <div style="margin-top:16px"><button class="btn btn-o btn-sm" onclick="doLogout()">Log out</button></div>
      </div></div>

      <div class="panel"><div class="panel-b">
        <h5 style="margin-bottom:8px">Profile intro video</h5>
        <p class="mut" style="font-size:12.5px;margin-bottom:8px">A short intro shown on your public profile — separate from your My Work portfolio.</p>
        ${a.intro_video_url
          ? `<video controls preload="metadata" src="${a.intro_video_url}" style="width:100%;border-radius:10px;background:#000;max-height:260px"></video>`
          : `<div class="empty-state small"><div class="es-ico">🎬</div><p>No intro video yet.</p></div>`}
        <div style="margin-top:10px">
          <label class="btn btn-o btn-sm" for="acct-intro">${a.intro_video_url?"Replace intro video":"Add intro video"}</label>
          <input type="file" id="acct-intro" accept="video/*" class="pf-file-input" onchange="uploadIntroVideo()"></div>
        <div class="hint-err hide" id="intro-err"></div>
      </div></div>

      <div class="panel"><div class="panel-b">
        <h5 style="margin-bottom:10px">Change password</h5>
        <div class="frm">
          <div><label>Current password</label><input type="password" id="pw-cur" autocomplete="current-password"></div>
          <div><label>New password</label><input type="password" id="pw-new" placeholder="At least 8 characters" autocomplete="new-password"></div>
          <div><label>Confirm new password</label><input type="password" id="pw-conf" autocomplete="new-password" onkeydown="if(event.key==='Enter')doChangePassword()"></div>
          <div class="hint-err hide" id="pw-err"></div>
        </div>
        <div style="margin-top:12px"><button class="btn btn-p btn-sm" onclick="doChangePassword()">Update password</button></div>
      </div></div>

      ${a.is_platform_owner?`<div class="panel" style="grid-column:1/-1"><div class="panel-b">
        <h5 style="margin-bottom:6px">Your listings — services, pricing &amp; analytics</h5>
        <p class="mut" style="font-size:12.5px;margin-bottom:10px">These sections also appear on your public profile. Edit a listing to change what people see.</p>
        ${(S.myPlatforms||[]).length?(S.myPlatforms||[]).map(l=>`<div class="op-row">${pfp(l.name,l.platform,"",l.ownerAvatar)}
            <div><b>${esc(l.name)}</b><small>${esc(l.platform)} · ${(l.services||[]).length} service(s) · ${(l.pricing||[]).length} price(s)</small></div>
            <button class="btn btn-o btn-sm" onclick="openListing('${l.id}')">Open</button></div>`).join("")
          :`<p class="mut" style="font-size:12.5px">No listings yet.</p>`}
        <div style="margin-top:10px"><button class="btn btn-o btn-sm" onclick="openRegisterPlatform()">＋ Add a listing</button></div>
      </div></div>`:""}

      <div class="panel" style="grid-column:1/-1"><div class="panel-b" id="actionCodePanel"></div></div>

      <div class="panel" style="grid-column:1/-1"><div class="panel-b" id="whoPanel"></div></div>

      <div class="panel"><div class="panel-b" id="supportPanel">${supportFormHtml()}</div></div>
    </div>`;
  renderWhoWeAre();
  renderActionCodePanel();
}
/* ---------- Action code ----------
   A single static 8-digit code, required alongside the password on every
   dangerous action. Mandatory for a Super-Admin: privileged actions stay
   blocked until one is set. Replaces the old authenticator-app enrolment —
   no app, no QR, no recovery codes. */
async function renderActionCodePanel(){
  const host=$("actionCodePanel"); if(!host||!S.account) return;
  if(S.myRole!=="SUPER_ADMIN"){ host.innerHTML=""; return; }
  const isSet=!!S.actionCodeSet;
  host.innerHTML=`
    <div class="panel-h" style="padding:0 0 10px"><h4>Action code</h4></div>
    <p class="mut" style="font-size:12.5px">
      ${isSet
        ? "An 8-digit code is set. You'll be asked for it, with your password, on every dangerous action."
        : "<b>Not set yet.</b> Suspending, banning, deleting and releasing payouts stay blocked until you set one."}
      Five wrong codes in a row locks further attempts for 15 minutes.</p>
    <div class="frm" style="margin-top:10px">
      <div><label>Your password</label><input type="password" id="ac-pw" autocomplete="off"></div>
      <div class="row2">
        <div><label>${isSet?"New 8-digit code":"8-digit code"}</label>
          <input type="password" id="ac-code" inputmode="numeric" maxlength="8" autocomplete="off"></div>
        <div><label>Confirm code</label>
          <input type="password" id="ac-code2" inputmode="numeric" maxlength="8" autocomplete="off"
                 onkeydown="if(event.key==='Enter')saveActionCode()"></div>
      </div>
      <div class="hint-err hide" id="ac-err"></div>
    </div>
    <div style="margin-top:10px">
      <button class="btn btn-p btn-sm" id="ac-save" onclick="saveActionCode()">
        ${isSet?"Change action code":"Set action code"}</button></div>`;
}
function _acErr(msg){
  const e=$("ac-err"); if(e){ e.textContent=msg; e.classList.remove("hide"); } else toast(msg);
}
async function saveActionCode(){
  const pw=(($("ac-pw")||{}).value||"");
  const code=(($("ac-code")||{}).value||"").trim();
  const code2=(($("ac-code2")||{}).value||"").trim();
  const err=$("ac-err"); if(err) err.classList.add("hide");
  if(!pw){ _acErr("Enter your password."); return; }
  if(!/^\d{8}$/.test(code)){ _acErr("The code must be exactly 8 digits."); return; }
  if(code!==code2){ _acErr("The two codes don't match."); return; }
  const btn=$("ac-save"); if(btn){ btn.disabled=true; btn.innerHTML=`<span class="spin"></span> Saving…`; }
  try{ await PSApi.post("/admin/action-code",{password:pw,code}); }
  catch(e){
    if(btn){ btn.disabled=false; btn.textContent=S.actionCodeSet?"Change action code":"Set action code"; }
    _acErr(e.message||"Could not save the action code"); return;
  }
  S.actionCodeSet=true;
  toast("Action code saved ✓",true);
  renderActionCodePanel();
}
/* ---------- "Who we are" profile content (text, links, files) ----------
   Shared by My Account and the campaign-setup wizard: same fields, same
   endpoints, one underlying record — edit it in either place.            */
function linkRowHtml(idx,l,prefix){
  prefix=prefix||"lk"; l=l||{label:"",url:""};
  return `<div class="link-row" data-idx="${idx}">
    <div class="row2"><div><label>Label</label><input type="text" id="${prefix}-label-${idx}" value="${esc(l.label||"")}" placeholder="Instagram"></div>
    <div><label>URL</label><input type="text" id="${prefix}-url-${idx}" value="${esc(l.url||"")}" placeholder="https://…"></div></div></div>`;
}
function addLinkRow(prefix){
  prefix=prefix||"lk";
  const w=$(prefix+"-rows"); if(!w) return;
  w.insertAdjacentHTML("beforeend", linkRowHtml(w.querySelectorAll(".link-row").length,null,prefix));
}
function collectWhoLinks(prefix){
  prefix=prefix||"lk";
  const links=[];
  document.querySelectorAll(`#${prefix}-rows .link-row`).forEach(r=>{
    const i=r.dataset.idx;
    const url=(($(`${prefix}-url-${i}`)||{}).value||"").trim();
    const label=(($(`${prefix}-label-${i}`)||{}).value||"").trim();
    if(url) links.push({label,url});
  });
  return links;
}
function whoEditorHtml(prefix,p){
  const links=(p.links&&p.links.length)?p.links:[{label:"",url:""}];
  return `<div><label>About you / your business</label><textarea id="${prefix}-about" placeholder="Who you are, what you do, what you're looking for…">${esc(p.about_text||"")}</textarea></div>
    <div><label>Links (social media, website — no limit)</label>
      <div id="${prefix}-rows">${links.map((l,i)=>linkRowHtml(i,l,prefix)).join("")}</div>
      <div style="margin-top:6px"><button type="button" class="btn btn-ghost btn-sm" onclick="addLinkRow('${prefix}')">＋ add another link</button></div></div>
    <div><label>Files &amp; images</label>
      ${(p.assets&&p.assets.length)?`<div class="work-grid" style="margin:6px 0">${p.assets.map(a=>`<div>${a.is_image
          ? `<a href="${a.url}" target="_blank" rel="noopener" class="proof-thumb"><img src="${a.url}" alt="${esc(a.title)}"></a>`
          : `<a href="${a.url}" target="_blank" rel="noopener" class="btn btn-o btn-sm">📄 ${esc(a.title)}</a>`}
        <button type="button" class="btn btn-danger btn-sm" style="margin-top:6px" onclick="deleteAsset(${a.id},'${prefix}')">Delete</button></div>`).join("")}</div>`
        :`<p class="mut" style="font-size:12.5px;margin:6px 0">No files yet.</p>`}
      <label class="btn btn-o btn-sm" for="${prefix}-asset">＋ Add file or image</label>
      <input type="file" id="${prefix}-asset" class="pf-file-input" onchange="uploadAsset('${prefix}')"></div>`;
}
async function saveWho(prefix){
  const about_text=(($(prefix+"-about")||{}).value||"").trim();
  return PSApi.post("/me/profile",{about_text,links:collectWhoLinks(prefix)});
}
async function renderWhoWeAre(){
  const host=$("whoPanel"); if(!host||!S.account) return;
  let p={about_text:"",links:[],assets:[]};
  try{ p=await PSApi.get(`/users/${S.account.id}/public`); }catch(e){}
  S._who=p;
  paintWho(host,p);
}
// Re-render from local state so unsaved text/links survive a file add/delete.
function renderWhoWeArePreserving(){
  const host=$("whoPanel"); if(!host) return;
  paintWho(host, S._who||{about_text:"",links:[],assets:[]});
}
function paintWho(host,p){
  host.innerHTML=`<h5 style="margin-bottom:6px">Who we are — public profile</h5>
    <p class="mut" style="font-size:12.5px;margin-bottom:10px">Shown to anyone viewing your profile from a campaign or listing. Add as much as you like — all optional, and editable here or during campaign setup (it's the same profile).</p>
    <div class="frm">${whoEditorHtml("who",p)}<div class="hint-err hide" id="who-err"></div></div>
    <div style="margin-top:12px"><button class="btn btn-p btn-sm" onclick="saveWhoWeAre()">Save profile</button></div>`;
}
async function saveWhoWeAre(){
  const err=$("who-err"); if(err) err.classList.add("hide");
  try{ await saveWho("who"); }
  catch(e){ if(err){err.textContent=e.message||"Could not save";err.classList.remove("hide");} return; }
  toast("Profile saved ✓",true); renderWhoWeAre();
}
// Snapshot whatever is typed so re-rendering after a file add/delete never
// discards unsaved text or links — text and files accumulate independently.
function stashWho(prefix){
  const about=$(prefix+"-about"); if(!about) return null;
  return {about_text:about.value||"", links:collectWhoLinks(prefix)};
}
async function refreshWho(prefix,stash){
  let assets=[];
  try{ const p=await PSApi.get(`/users/${S.account.id}/public`); assets=p.assets||[]; }catch(e){}
  if(prefix==="wz"){
    W.d.who={...(W.d.who||{}), ...(stash||{}), assets};
    renderWiz();
  } else {
    S._who={...(S._who||{}), ...(stash||{}), assets};
    renderWhoWeArePreserving();
  }
}
async function uploadAsset(prefix){
  prefix=prefix||"who";
  const inp=$(prefix+"-asset"); const f=inp&&inp.files[0]; if(!f) return;
  const stash=stashWho(prefix);          // keep in-progress text/links
  const fd=new FormData(); fd.append("file",f);
  try{ await PSApi.postForm("/me/assets",fd); }catch(e){ toast(e.message||"Upload failed"); return; }
  toast("Added ✓",true);
  await refreshWho(prefix,stash);
}
async function deleteAsset(id,prefix){
  prefix=prefix||"who";
  if(!confirm("Delete this file?")) return;
  const stash=stashWho(prefix);
  try{ await PSApi.del(`/me/assets/${id}`); }catch(e){ toast(e.message||"Delete failed"); return; }
  await refreshWho(prefix,stash);
}
async function uploadAvatar(){
  const f=$("acct-avatar")&&$("acct-avatar").files[0]; if(!f) return;
  const fd=new FormData(); fd.append("file",f);
  try{ const r=await PSApi.postForm("/me/avatar",fd); S.account.avatar_url=r.avatar_url+"?t="+Date.now(); }
  catch(e){ toast(e.message||"Upload failed"); return; }
  toast("Profile picture updated ✓",true); authReflect(); openAccount();
}
async function uploadIntroVideo(){
  const f=$("acct-intro")&&$("acct-intro").files[0]; if(!f) return;
  const err=$("intro-err"); if(err) err.classList.add("hide");
  const fd=new FormData(); fd.append("file",f);
  try{ const r=await PSApi.postForm("/me/intro-video",fd); S.account.intro_video_url=r.intro_video_url+"?t="+Date.now(); }
  catch(e){ if(err){err.textContent=e.message||"Upload failed";err.classList.remove("hide");} return; }
  toast("Intro video updated ✓",true); openAccount();
}
async function submitSupport(){
  const name=($("sup-name").value||"").trim(), subject=($("sup-subject").value||"").trim(), body=($("sup-body").value||"").trim();
  const email=($("sup-email").value||"").trim(), mobile=($("sup-mobile").value||"").trim();
  const err=$("sup-err"); const fail=m=>{ if(err){err.textContent=m;err.classList.remove("hide");} };
  if(err) err.classList.add("hide");
  if(!name||!subject||!body){ fail("Name, subject and message are required."); return; }
  try{ await PSApi.post("/support",{name,email:email||null,mobile:mobile||null,subject,body}); }
  catch(e){ fail(e.message||"Could not submit — please try again."); return; }
  const panel=$("supportPanel");
  if(panel) panel.innerHTML=`<h5 style="margin-bottom:6px">Contact Support</h5>
    <p class="review-thanks">– Thank you for submitting your form, our team will be in contact with you shortly</p>`;
}
async function doChangePassword(){
  const cur=($("pw-cur").value||""), nw=($("pw-new").value||""), conf=($("pw-conf").value||"");
  const err=$("pw-err");
  const fail=m=>{ if(err){ err.textContent=m; err.classList.remove("hide"); } };
  if(err) err.classList.add("hide");
  if(!cur||!nw){ fail("Enter your current and new password."); return; }
  if(nw.length<8){ fail("New password must be at least 8 characters."); return; }
  if(nw!==conf){ fail("New passwords don't match."); return; }
  try{ await PSApi.post("/auth/change-password",{current_password:cur,new_password:nw}); }
  catch(e){ fail(e.message||"Could not change password"); return; }
  $("pw-cur").value=$("pw-new").value=$("pw-conf").value="";
  toast("Password updated ✓",true);
}
async function restoreSession(){
  let live=false;
  try{
    S.account=await PSApi.me();          // the httpOnly cookie is the only proof
    live=true;
    await Promise.all([loadPerms(), loadMine(), loadNotifications()]);
  }catch(e){
    // Expired, revoked, suspended or never signed in — all land here. Treat every
    // one as logged out: drop client state and forget where they were, so a stale
    // session can never leave the app looking authenticated.
    S.account=null; S.perms=[]; S.myRole="USER";
    clearRoute();
  }
  authReflect();
  return live;
}

async function restoreRoute(live){
  const r=readRoute();
  _routeReady=true;                      // only now may navigation record routes
  if(!r) return;
  // A route behind the login wall is only ever replayed for a verified session.
  if(!live && !PUBLIC_ROUTES.has(r.name)){ clearRoute(); return; }
  try{
    if(!await applyRoute(r)) clearRoute();
  }catch(e){
    // The row is gone, or this account may no longer see it — the server decides.
    clearRoute();
    if(live) openDash(); else goHome();
  }
}

/* ==================== WHERE THE USER WAS ====================
The session itself lives in the httpOnly ps_session cookie and is restored by
restoreSession() -> GET /auth/me. That already survived a refresh; what did not
was the VIEW, which always booted to the marketing landing page and so read as
being logged out.

Only the route is remembered here — a view name and, at most, a numeric id.
Never a token, never identity: the cookie stays httpOnly and unreadable to JS,
and the server re-authorises every request behind these views regardless.
sessionStorage (not localStorage) so it is per-tab and dies with the tab.
*/
const ROUTE_KEY="ps_route";
// Routes anyone may land on. Everything else needs a live session to restore.
const PUBLIC_ROUTES=new Set(["home","market"]);
let _routeReady=false;                 // don't record routes during restore

function setRoute(name, arg){
  if(!_routeReady) return;
  try{ sessionStorage.setItem(ROUTE_KEY, JSON.stringify(arg==null?{name}:{name,arg})); }
  catch(e){}                            // private mode / storage disabled
}
function clearRoute(){ try{ sessionStorage.removeItem(ROUTE_KEY); }catch(e){} }
function readRoute(){
  try{
    const r=JSON.parse(sessionStorage.getItem(ROUTE_KEY)||"null");
    if(!r || typeof r.name!=="string") return null;
    // Only ever accept an integer id back out of storage.
    if(r.arg!=null && !/^\d+$/.test(String(r.arg))) return null;
    return r;
  }catch(e){ return null; }
}

async function applyRoute(r){
  if(!r) return false;
  const id = r.arg!=null ? parseInt(r.arg,10) : null;
  switch(r.name){
    case "market":      await openMarket(r.arg||undefined); return true;
    case "dash":        await openDash(); return true;
    case "messages":    await openMessages(); return true;
    case "account":     openAccount(); return true;
    case "profile":
      // The profile is a modal, so give it a sensible page underneath rather
      // than leaving the marketing landing page behind it.
      if(S.account && S.roles.length) await openDash(); else goHome();
      await openProfile(id); return true;
    case "deal":        showView("view-deal"); await renderRealDeal(id); return true;
    // Permission-gated views. The check here is only so a route this account
    // can no longer use is dropped instead of re-toasting on every refresh —
    // the server is still the authority, and each of these calls re-checks too.
    case "review-queue":
      if(!can("deal.view_evidence")) return false;
      await openReviewQueue(); return true;
    case "support-queue":
      if(!can("deal.view_evidence")) return false;
      await openSupportQueue(); return true;
    case "payouts":
      if(!can("deal.view_evidence")) return false;
      await openPayouts(); return true;
    case "completed":
      if(!can("deal.view_evidence")) return false;
      await openCompleted(); return true;
    case "admin":
      if(!can("admin.view")) return false;
      await openAdmin(); return true;
    case "home":        goHome(); return true;
  }
  return false;
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
  "account":()=>openAccount(),
  "review-queue":()=>openReviewQueue(),
  "support-queue":()=>openSupportQueue(),
  "payouts":()=>openPayouts(),
  "completed":()=>openCompleted(),
  "admin":()=>openAdmin(),
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
  renderFooterSupport();
  syncNav();
  restoreSession().then(restoreRoute);
  startAttnPolling();
  // A real reset link (emailed) lands as /?reset=<token> — open the set-password step.
  const _q=new URLSearchParams(location.search);
  const _rt=_q.get("reset");
  if(_rt) setTimeout(()=>resetPasswordModal(_rt),300);
  const _vt=_q.get("verify");
  if(_vt) setTimeout(()=>verifyEmailFromLink(_vt),300);
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

const EXPORTS={PSBoot,overlayClick,renderMarket,setMarketTab,toggleFilters,toggleFilter,resetFilters,buildFilters,openMarket,marketCtaClick,openListing,openCampaign,openChat,sendChat,requestQuote,sendQuoteReq,buyOffer,applyCampaign,submitApplication,renderDeal,showView,dealNext,approveMine,counterOffer,sendCounter,cancelDeal,fundDeal,submitProof,openDispute,leaveReview,startWizard,openRegisterPlatform,renderWiz,wizBack,wizNext,openNewCampaign,openDash,switchRole,goHome,goHow,closeModal,toast,syncNav,openMessages,openConv,renderMessages,sendInboxMsg,toggleNotifs,pushNotif,openNotif,openVerify,runVerify,vfPick,animateKpis,authModal,doSignup,doLogin,doLogout,renderRealDeal,realApprove,realDecline,realFund,realPay,realSubmitProof,realVerify,realRelease,realRefund,realReviewModal,setReviewStars,realSubmitReview,openReviewQueue,openPayouts,openAccount,doChangePassword,openProfile,addProofSlot,pfDrop,pfFileName,addWorkSlot,wkDrop,wkFileName,uploadWork,uploadMedia,deleteMedia,uploadAvatar,uploadIntroVideo,submitSupport,uploadListingImage,uploadCampaignImage,addPmSlot,pmSlotChange,submitApplication,confirmRemoveListing,confirmRemoveCampaign,
forgotPasswordModal,sendReset,resetPasswordModal,doResetPassword,
checkYourEmailModal,resendVerification,verifyEmailFromLink,scrollToPanel,openCompleted,
renderWhoWeAre,addLinkRow,saveWhoWeAre,uploadAsset,deleteAsset,
openEditListing,saveListingEdits,openEditCampaign,saveCampaignEdits,addEditPriceRow,
openAdmin,adminSetRole,adminSuspend,adminUnsuspend,adminSearchUsers,can,loadPerms,
renderActionCodePanel,saveActionCode,
adminSuspendListing,adminUnsuspendListing,adminSuspendCampaign,adminUnsuspendCampaign,
askDuration,setRoute,clearRoute,readRoute,restoreRoute,restoreSession,togglePayMethod,useSuggestion,
openSupportQueue,openSupportTicket,claimSupportTicket,sendSupportReply,addSupportNote,transferSupportTicket,
acpLinkHtml,acpAccountLinkHtml,openAcpAccount,openAcpItem,adminBan,
restrictedUserRowsHtml,restrictedItemRowsHtml,filterRestrictedUsers,filterRestrictedItems,adminRemoveListing,adminRemoveCampaign};
Object.assign(window,EXPORTS);
window.S=S;
Object.defineProperty(window,"W",{get:()=>W,set:v=>{W=v}});
})();
