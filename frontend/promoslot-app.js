(function(){
if(window.PSBoot) return;
/* PromoSlot app logic — visual/interaction upgrade layer. Flows, fields and IA are final (per brief). */

/* ============================================================
   SUPPORT CONTACT DETAILS — PLACEHOLDERS.
   Swap these three values for the real details a few days before launch.
   This is the ONLY place to change them (rendered into the footer).
   ============================================================ */
const SUPPORT_INFO = {
  email:   "[Business Email: placeholder]",
  mobile:  "[Mobile Number: placeholder]",
  address: "[Business Address: placeholder]",
};
function renderFooterSupport(){
  // Public pages each carry their own footer (same pattern as the original
  // single-footer landing page), so this now targets every copy by class
  // rather than one id — querySelectorAll, not getElementById.
  document.querySelectorAll(".footer-support").forEach(el=>{
    el.innerHTML=`
      <div class="fs-row"><span>Business Email:</span> ${esc(SUPPORT_INFO.email)}</div>
      <div class="fs-row"><span>Mobile Number:</span> ${esc(SUPPORT_INFO.mobile)}</div>
      <div class="fs-row"><span>Business Address:</span> ${esc(SUPPORT_INFO.address)}</div>`;
  });
}

/* ==================== SEEDED DATA ==================== */
/* Brand marks sourced from Simple Icons (simpleicons.org, MIT-licensed) — official
   logo shapes, rendered with fill="currentColor" so each inherits its badge color.
   Generic (non-brand) categories use Lucide (lucide.dev, ISC-licensed) line icons.
   LinkedIn has no available open-license mark (removed from icon libraries at
   LinkedIn's own request) so it renders as a plain "in" text monogram instead. */
const _sic = d => `<svg viewBox="0 0 24 24" width="13" height="13" style="vertical-align:-2px" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;
const _lic = inner => `<svg viewBox="0 0 24 24" width="13" height="13" style="vertical-align:-2px" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const _liMonogram = `<svg viewBox="0 0 24 24" width="13" height="13" style="vertical-align:-2px" aria-hidden="true"><rect width="24" height="24" rx="4" fill="#0A66C2"/><text x="12" y="16.5" font-size="11" font-weight="700" font-family="Arial,Helvetica,sans-serif" fill="#fff" text-anchor="middle">in</text></svg>`;
const PLATFORM_META = {
  TikTok:{color:"#0f172a",ico:_sic("M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z")},
  Instagram:{color:"#c026d3",ico:_sic("M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077")},
  Discord:{color:"#5865f2",ico:_sic("M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z")},
  Newsletter:{color:"#d97706",ico:_lic('<path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/>')},
  YouTube:{color:"#FF0000",ico:_sic("M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z")},
  Livestream:{color:"#ec4899",ico:_lic('<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>')},
  Reddit:{color:"#FF4500",ico:_sic("M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z")},
  Quora:{color:"#B92B27",ico:_sic("M7.3799.9483A11.9628 11.9628 0 0 1 21.248 19.5397l2.4096 2.4225c.7322.7362.21 1.9905-.8272 1.9905l-10.7105.01a12.52 12.52 0 0 1-.304 0h-.02A11.9628 11.9628 0 0 1 7.3818.9503Zm7.3217 4.428a7.1717 7.1717 0 1 0-5.4873 13.2512 7.1717 7.1717 0 0 0 5.4883-13.2511Z")},
  X:{color:"#000000",ico:_sic("M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z")},
  LinkedIn:{color:"#0A66C2",ico:_liMonogram},
  Pinterest:{color:"#E60023",ico:_sic("M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z")},
  "Blog/Website":{color:"#0891b2",ico:_lic('<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>')},
  Podcast:{color:"#9333ea",ico:_lic('<path d="M12 19v3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><rect x="9" y="2" width="6" height="13" rx="3"/>')},
  Facebook:{color:"#1877F2",ico:_sic("M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z")},
  Telegram:{color:"#26A5E4",ico:_sic("M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z")},
  Threads:{color:"#171717",ico:_sic("M18.263 11.097c-.03-3.486-1.92-5.586-5.111-5.586-2.13 0-3.922.963-4.863 2.499l2.062 1.438c.535-.843 1.272-1.543 2.628-1.543 1.528 0 2.318.85 2.544 2.431a15 15 0 0 0-2.236-.173c-4.125 0-6.068 1.867-6.068 4.336s1.943 3.99 4.804 3.99c3.139 0 5.013-2.115 5.781-4.735.798.361 1.348 1.204 1.348 2.47 0 3.387-3.907 5.232-7.22 5.232-4.885 0-8.077-3.207-8.077-8.424 0-6.392 4.223-10.487 9.9-10.487 3.808 0 5.69 1.671 6.97 3.914l2.108-1.475C21.44 2.078 18.331 0 13.663 0 6.227 0 1.168 5.277 1.168 12.934c0 7 4.953 11.066 10.856 11.066 4.878 0 9.809-2.846 9.809-7.716 0-2.545-1.46-4.231-3.569-5.187m-6.33 4.855c-1.077 0-2.026-.512-2.026-1.453 0-1.483 1.822-1.934 3.606-1.934.678 0 1.34.045 1.927.173-.422 1.927-1.671 3.215-3.508 3.214Z")},
  "Forum/Community":{color:"#059669",ico:_lic('<path d="M16 10a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 14.286V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/><path d="M20 9a2 2 0 0 1 2 2v10.286a.71.71 0 0 1-1.212.502l-2.202-2.202A2 2 0 0 0 17.172 19H10a2 2 0 0 1-2-2v-1"/>')},
  Other:{color:"#6b7280",ico:_lic('<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>')}
};
const ALL_PLATFORMS = Object.keys(PLATFORM_META);
const ALL_NICHES = ["Fitness","Beauty","Gaming","Finance","Food","Tech","Parenting","Fashion","Education","Travel"];
const ALL_SERVICES = ["Sponsored social post","Short-form promo video","Instagram Story","TikTok Live promotion","YouTube integration","Community announcement","Pinned community post","Newsletter advertisement","Sponsored blog post","Product review","UGC content","Affiliate promotion","Giveaway","Product feedback","Brand AMA","Link-in-bio placement","Custom service"];
const ALL_COUNTRIES = ["UK","US","Canada","Australia","Germany","France","Spain","Netherlands","Ireland","India","Brazil"];
const ALL_AGES = ["13-17","18-24","25-34","35-44","45-54","55+"];
const ALL_PAY_MODELS = ["Fixed price","Per view","Per impression","Time-based","Affiliate","Hybrid","Custom quote"];
const CREATOR_SIZES = ["Nano (1K–10K)","Micro (10K–50K)","Mid (50K–250K)","Macro (250K–1M)","Mega (1M+)"];
const PM_LABEL = {fixed:"Fixed price","per-view":"Per view","per-imp":"Per impression",time:"Time-based",affiliate:"Affiliate",hybrid:"Hybrid",custom:"Custom quote"};
// The price badge on a listing card / profile pricing row. A per-view/per-imp
// tier with rate_pence set is real and buyable (see openPoolBuyModal) even
// when its guaranteed floor (amount) is £0 — a pure performance tier with no
// guarantee is a deliberate, allowed choice (backend validates listed_price
// as "0, or >=100", never anything in between). Falling through to the old
// amount>0-only check for those would wrongly show "Quote", implying the
// buyer has to request custom terms when they can just buy it now.
function priceTagHtml(p){
  if(p.rate_pence>0){
    const rate=(Number(p.rate_pence)/100).toFixed(2);
    const unit=p.type==="per-imp"?"impressions":"views";
    const floor=Number(p.amount)||0;
    return `£${rate}/1,000 ${esc(unit)}${floor>0?` +£${floor} min`:""}`;
  }
  return p.amount>0 ? gbp(p.amount)+(p.type==="per-view"||p.type==="hybrid"?"+":p.type==="per-imp"?" est.":"") : "Quote";
}

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
 {id:"cx-ex",example:true,company:"Example Brand",industry:"Beauty & skincare",title:"Example Campaign: Product Launch",verified:false,rating:5.0,reviewCount:"Example",posted:"example",applicants:0,budget:2500,
  desc:"This is an example campaign showing how a complete, well-built business listing looks on PromoSlot. Replace this with your own brief, budget and payment structure when you post a campaign.",
  platforms:["TikTok","Instagram","Newsletter"],niches:["Beauty"],countries:["UK","Ireland"],
  services:["Short-form promo video","Product review","Instagram Story","Affiliate promotion"],
  creatorSizes:["Nano (1K–10K)","Micro (10K–50K)","Mid (50K–250K)"],goals:["Product launch","UGC library","Affiliate sales"],
  payment:[{type:"fixed",detail:"£100 fixed per approved video"},{type:"per-view",detail:"£5 per 1,000 views (14-day measurement)"},{type:"affiliate",detail:"12% commission per referred sale · 30-day cookie"},{type:"product",detail:"Free product supplied to accepted creators"}],
  deliverables:"1 product demonstration or unboxing video + 1 Instagram Story. Content live ≥ 30 days.",duration:"6 weeks",samples:true,
  profile:{product:"Example product range",target:"Your target market description goes here",payMethods:["Fixed","Per view","Commission","Free product"],collabs:"New to PromoSlot"}}
];

const REVIEW_POOL = [
 {name:"Hannah W.",co:"Bloom Cosmetics",stars:5,text:"Delivered exactly what the agreement said: post went live on time, stayed up, analytics screenshots without us chasing. Payment Protection made it painless."},
 {name:"Marcus T.",co:"VoltEnergy",stars:5,text:"Views beat the guaranteed minimum by 3× and the measurement-period payout was calculated to the penny. Would fund again tomorrow."},
 {name:"Sofia R.",co:"Petal & Pot",stars:4,text:"Great content and communication. One revision needed on the caption, turned around same day."},
 {name:"Dev K.",co:"Loopwise App",stars:5,text:"The counter-offer flow saved this deal: we couldn't afford the fixed rate, they proposed a hybrid and it outperformed."},
 {name:"Amelia C.",co:"Fern & Co.",stars:5,text:"Audience is exactly as described in the listing. Engagement was real: we tracked 214 code uses in week one."},
 {name:"Jordan P.",co:"Trailhead Gear",stars:4,text:"Solid delivery, proof submitted early. Only wish we'd booked a longer placement."},
 {name:"Nina S.",co:"Kindred Kids",stars:5,text:"Third deal with this creator through PromoSlot. Zero drama, verified delivery every time."},
 {name:"Tom B.",co:"BrewBox",stars:5,text:"Livestream segment felt native, not forced. VOD views kept climbing through the measurement window."},
 {name:"Priya M.",co:"Asha Skincare",stars:4,text:"Professional throughout. Dispute never needed: the agreed deliverables doc kept everyone honest."},
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
  notifications:[], marketTab:"platforms", heroDirection:"promotion", filters:null, dealSeq:1,
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
/* ---------- Ambient signup nudge ----------
   A soft prompt for guests, quite separate from the gates: it fires on its own
   after 2 detail views or 25s of browsing, whichever comes first, and only once
   a session. Dismissing it retires it for good — but it has no bearing on the
   gates, so a guest who dismissed this still gets the full modal the moment they
   click something that needs an account. */
const NUDGE_DELAY_MS = 25000;
const NUDGE_VIEWS    = 2;

// Kept short and fixed on purpose — no escalating wording. authModal()'s own
// copy is fixed too; gate bounces aren't used for text anywhere anymore.
function nudgeCopy(){
  return "Sign up for free";
}

function startSignupNudgeTimer(){
  if(S.account || S._nudgeDone || S._nudgeTimer) return;
  S._nudgeTimer = setTimeout(()=>{ S._nudgeTimer=null; maybeShowSignupNudge(); }, NUDGE_DELAY_MS);
}

// Detail views are modals, so this counts opens rather than page loads.
function noteDetailView(){
  if(S.account || S._nudgeDone) return;
  S._detailViewsSeen = (S._detailViewsSeen||0) + 1;
  if(S._detailViewsSeen >= NUDGE_VIEWS) maybeShowSignupNudge();
}

function maybeShowSignupNudge(){
  if(S.account || S._nudgeDone || $("signupNudge")) return;
  // Never over an open modal — wait for it to close rather than stacking two
  // prompts on top of each other.
  if($("overlay").classList.contains("open")){ S._nudgePending=true; return; }
  S._nudgePending=false;
  S._nudgeDone=true;                       // once a session, shown or not
  if(S._nudgeTimer){ clearTimeout(S._nudgeTimer); S._nudgeTimer=null; }
  const el=document.createElement("div");
  el.id="signupNudge";
  el.innerHTML=`<span class="nudge-txt">${esc(nudgeCopy())}</span>
    <button class="nudge-cta" onclick="closeSignupNudge();authModal('signup')">Sign up free</button>
    <button class="nudge-x" onclick="closeSignupNudge()" aria-label="Dismiss">✕</button>`;
  document.body.appendChild(el);
}

function closeSignupNudge(){
  S._nudgeDone=true; S._nudgePending=false;
  if(S._nudgeTimer){ clearTimeout(S._nudgeTimer); S._nudgeTimer=null; }
  const el=$("signupNudge");
  if(!el) return;
  el.classList.add("out");
  setTimeout(()=>el.remove(),320);
}

/* ==================== GUIDED PRODUCT TOUR ====================
   A five-step spotlight tour of the nav, offered once to a brand-new account.

   Desktop / wide-tablet only. Below 901px `.nav-links` is display:none with
   nothing replacing it (there is no mobile menu in this app), so three of the
   five targets do not exist — the tour is never offered at that width rather
   than pointing at empty space. The "continue setup tour" pill stays available
   at every width so a half-finished tour is never stranded.

   The backend is authoritative (users.product_tour_*); T below is only the
   live in-page state. */
const TOUR_VERSION = "1";
const TOUR_MIN_W   = 901;
let T = null;

function tourRoleKey(){
  const b=S.roles.includes("biz"), p=S.roles.includes("plat");
  return b&&p ? "both" : (p ? "plat" : "biz");
}

// Copy for steps 3 and 5 follows the role the account actually holds, using the
// same S.roles the rest of the app switches on.
function tourSteps(){
  const rk=tourRoleKey();
  const dash={
    biz:"A live view of your campaigns: what's running, what you're spending, who has applied, deliverables you're waiting on, and recent activity.",
    plat:"A live view of your deals: what's active, applications you've sent, what you've earned, deliveries due, and fresh opportunities.",
    both:"Both sides in one place: campaigns you run and deals you deliver, spend and earnings, applications either way, and anything waiting on you."
  }[rk];
  const prof={
    biz:"Keep your company details, industry and campaigns current. Platform owners weigh that up before applying. Verified activity and reviews build the rest.",
    plat:"Keep your platforms, audience figures, services and pricing current. Businesses weigh that up before they buy. Verified activity and reviews build the rest.",
    both:"Keep both sides current: company and campaigns, plus your platforms, audience and pricing. Verified activity and reviews build the rest."
  }[rk];
  return [
    {sel:"#nl-market", label:"Marketplace", title:"Discover opportunities",
     body:"The Marketplace is where both sides of PromoSlot meet. Browse active campaigns, discover platform owners, compare opportunities, and find partnerships that fit.",
     sub:"Businesses find platform owners and promotional offers. Platform owners find businesses actively looking for promotion."},
    {sel:"#nl-msgs", label:"Messages", title:"Keep every deal organised",
     body:"Talk directly with businesses or platform owners: discuss requirements, negotiate terms, ask questions, all tied to your PromoSlot activity.",
     sub:"Keeping it here preserves deal history, documents what was agreed, and protects both sides if anything is ever disputed."},
    {sel:"#nl-dash", label:"Dashboard", title:"Everything in one place", body:dash},
    {sel:"#navBell", label:"Notifications", title:"Never miss an opportunity",
     body:"You'll hear about new messages, applications, deal updates, delivery reviews and payment activity as they happen.",
     sub:"You can fine-tune what reaches you later from your account settings."},
    {sel:"#userChip", label:"Your Profile", title:"Build your reputation", body:prof}
  ];
}

// A target that is hidden has no rect to spotlight. #nl-dash is the real case:
// syncNav() hides it for an account with no business/platform role (a
// reviewer-only login), so that step is dropped rather than left pointing at
// nothing.
function tourVisible(sel){
  const el=document.querySelector(sel);
  return el && el.offsetParent !== null ? el : null;
}
function tourWideEnough(){ return window.innerWidth >= TOUR_MIN_W; }

// Never offered before = all three timestamps null. Anyone who skipped or
// finished is left alone; that is what stops the tour reappearing every login.
function tourNeverOffered(){
  const a=S.account;
  return !!a && !a.product_tour_started_at && !a.product_tour_completed_at
              && !a.product_tour_skipped_at;
}
function tourUnfinished(){
  const a=S.account;
  return !!a && !!a.product_tour_started_at && !a.product_tour_completed_at;
}

// Fire-and-forget: the tour must never stall because a write is slow or fails,
// so the UI advances on its own and the server catches up.
function tourSave(action, step){
  if(!S.account) return;
  const body={action, step, version:TOUR_VERSION};
  PSApi.post("/auth/tour", body).then(acct=>{ if(acct) S.account=acct; }).catch(()=>{});
  // Mirror locally so a reload mid-tour doesn't re-offer from scratch.
  const a=S.account, now=new Date().toISOString();
  if(action==="start"){ a.product_tour_started_at=now; a.product_tour_completed_at=null; a.product_tour_skipped_at=null; }
  if(action==="skip") a.product_tour_skipped_at=now;
  if(action==="complete"){ a.product_tour_completed_at=now; a.product_tour_skipped_at=null; }
  if(typeof step==="number") a.product_tour_current_step=Math.max(a.product_tour_current_step||0, step);
}

/* ---- the welcome offer ---- */
function maybeOfferTour(){
  if(!tourNeverOffered() || !tourWideEnough() || T) return;
  // Let the page settle first — landing straight into an overlay reads as an
  // interruption rather than an offer.
  setTimeout(()=>{ if(tourNeverOffered() && tourWideEnough() && !T) tourWelcome(); }, 800);
}

function tourWelcome(){
  tourMount();
  T.mode="welcome";
  // Centred, with no spotlight — nothing is being pointed at yet.
  $("tourPop").classList.add("tour-center");
  tourPaintCard(`<h4 id="tourTitle">Welcome to PromoSlot</h4>
    <p id="tourBody">Want a 60-second tour of the marketplace? We'll show you the five things worth knowing, then leave you to it.</p>
    <div class="tour-foot">
      <span class="tour-count">Takes about a minute</span>
      <button class="btn btn-ghost" onclick="tourDismissWelcome()">Maybe later</button>
      <button class="btn btn-p" onclick="tourBegin()">Start tour</button>
    </div>`);
}

function tourDismissWelcome(){
  // "Maybe later" is a skip, not a refusal: it leaves the resume pill up.
  tourSave("skip", 0);
  tourTeardown();
  syncTourResume();
}

function tourBegin(){
  const from = Math.min(S.account?.product_tour_current_step||0, 4);
  tourSave("start", from);
  tourStart(from);
}

/* ---- lifecycle ---- */
function tourMount(){
  if($("tourRoot")) return;
  const r=document.createElement("div");
  r.id="tourRoot";
  r.setAttribute("role","dialog");
  r.setAttribute("aria-modal","true");
  r.setAttribute("aria-labelledby","tourTitle");
  r.setAttribute("aria-describedby","tourBody");
  r.innerHTML=`<div class="tour-blur" id="tourBlur"></div>
    <div class="tour-catch"></div>
    <div class="tour-hole" id="tourHole" style="opacity:0"></div>
    <div class="tour-pop" id="tourPop"></div>
    <div class="tour-prog hide" id="tourProg"></div>`;
  document.body.appendChild(r);
  r.classList.add("on");
  T={i:0, steps:[], mode:"welcome", prevFocus:document.activeElement};
  document.addEventListener("keydown", tourKey, true);   // capture: beat the app's own handlers
  window.addEventListener("resize", tourReflow);
  window.addEventListener("scroll", tourReflow, true);
  // Crossing the breakpoint is the case that actually matters, and a media
  // query reports it even where a resize event doesn't (some embedded/remote
  // viewports resize without emitting one).
  T._mq = window.matchMedia(`(max-width:${TOUR_MIN_W-1}px)`);
  T._mqFn = () => tourReflow();
  if(T._mq.addEventListener) T._mq.addEventListener("change", T._mqFn);
  else T._mq.addListener(T._mqFn);                       // older Safari
}

function tourTeardown(){
  document.removeEventListener("keydown", tourKey, true);
  window.removeEventListener("resize", tourReflow);
  window.removeEventListener("scroll", tourReflow, true);
  if(T && T._mq){
    if(T._mq.removeEventListener) T._mq.removeEventListener("change", T._mqFn);
    else T._mq.removeListener(T._mqFn);
  }
  const r=$("tourRoot"); if(r) r.remove();
  const f=T && T.prevFocus;
  T=null;
  if(f && f.focus) { try{ f.focus(); }catch(e){} }
}

function tourStart(from){
  tourMount();
  T.steps=tourSteps().filter(s=>tourVisible(s.sel));
  T.mode="steps";
  T.i=Math.min(from||0, T.steps.length-1);
  $("tourProg").classList.remove("hide");
  tourRender();
}

/* ---- rendering ---- */
function tourRender(justCompleted){
  const step=T.steps[T.i];
  const el=tourVisible(step.sel);
  if(!el){ tourNext(); return; }                 // vanished mid-tour — move on
  const pad=8, r=el.getBoundingClientRect();
  const hole=$("tourHole");
  hole.style.opacity="1";
  hole.style.top=(r.top-pad)+"px";
  hole.style.left=(r.left-pad)+"px";
  hole.style.width=(r.width+pad*2)+"px";
  hole.style.height=(r.height+pad*2)+"px";
  const rad=parseFloat(getComputedStyle(el).borderRadius)||10;
  hole.style.borderRadius=(rad+pad)+"px";
  tourClip(r, pad, rad);

  const pop=$("tourPop");
  pop.classList.remove("tour-center");
  pop.classList.add("fade");
  setTimeout(()=>{
    // Skip / Escape / a narrowing resize can tear the tour down inside this
    // fade window, taking T and the card with it. Bail rather than throw.
    if(!T || !$("tourPop")) return;
    tourPaintCard(`<h4 id="tourTitle">${esc(step.title)}</h4>
      <p id="tourBody">${esc(step.body)}</p>
      ${step.sub?`<p class="tour-sub">${esc(step.sub)}</p>`:""}
      <div class="tour-foot">
        <span class="tour-count">Step ${T.i+1} of ${T.steps.length}</span>
        <button class="tour-skip" onclick="tourSkip()">Skip tour</button>
        ${T.i>0?`<button class="btn btn-ghost" onclick="tourBack()">Back</button>`:""}
        <button class="btn btn-p" onclick="tourNext()">${T.i===T.steps.length-1?"Finish":"Next"}</button>
      </div>`);
    tourPlacePop(r);
    pop.classList.remove("fade");
  }, 190);
  tourProgress(justCompleted);
}

// Anchor under the target (every target lives in the sticky top nav), clamped
// so the card can never hang off either edge.
function tourPlacePop(r){
  const pop=$("tourPop"), pw=pop.offsetWidth||335;
  let left=r.left + r.width/2 - pw/2;
  left=Math.max(16, Math.min(left, window.innerWidth-pw-16));
  pop.style.left=left+"px";
  pop.style.top=(r.bottom+16)+"px";
}

function tourPaintCard(html){
  const pop=$("tourPop");
  pop.innerHTML=html;
  // Focus moves to the card each step so a keyboard user lands on the new
  // content rather than being left where the last button was.
  const first=pop.querySelector(".btn-p")||pop.querySelector("button");
  if(first) setTimeout(()=>{ try{ first.focus(); }catch(e){} },20);
}

// The blur layer is cut out over the target so the spotlit element stays sharp.
// Where clip-path:path() isn't supported the layer is simply dropped and the
// box-shadow dim carries the effect on its own.
function tourClip(r, pad, rad){
  const b=$("tourBlur");
  if(!window.CSS || !CSS.supports || !CSS.supports("clip-path",'path("M0 0")')){
    b.style.display="none"; return;
  }
  const W=window.innerWidth, H=window.innerHeight;
  const x=r.left-pad, y=r.top-pad, w=r.width+pad*2, h=r.height+pad*2;
  const k=Math.min(rad+pad, w/2, h/2);
  const hole=`M${x+k},${y} H${x+w-k} A${k},${k} 0 0 1 ${x+w},${y+k} V${y+h-k} `+
             `A${k},${k} 0 0 1 ${x+w-k},${y+h} H${x+k} A${k},${k} 0 0 1 ${x},${y+h-k} `+
             `V${y+k} A${k},${k} 0 0 1 ${x+k},${y} Z`;
  b.style.clipPath=`path(evenodd,"M0,0 H${W} V${H} H0 Z ${hole}")`;
}

function tourProgress(justCompleted){
  const p=$("tourProg");
  p.innerHTML=`<div class="tour-prog-head"><span class="tour-prog-mark">P</span>
      <b>Getting started</b><span>${Math.min(T.i+1,T.steps.length)} of ${T.steps.length}</span></div>
    <ul>${T.steps.map((s,n)=>{
      const done=n<T.i, now=n===T.i;
      const jd = justCompleted===n ? " just-done" : "";
      return `<li class="${done?"done":now?"now":""}${jd}"><span class="tour-tick">✓</span>${esc(s.label)}</li>`;
    }).join("")}</ul>`;
}

/* ---- navigation ---- */
function tourNext(){
  if(T.i>=T.steps.length-1){ tourComplete(); return; }
  const done=T.i;
  const hole=$("tourHole");
  hole.classList.add("shrink");                 // contract, travel, expand
  setTimeout(()=>{ const h=$("tourHole"); if(h) h.classList.remove("shrink"); },180);
  T.i++;
  tourSave("advance", T.i);
  tourRender(done);
}
function tourBack(){
  if(T.i<=0) return;
  T.i--;
  tourRender();                                  // no save: step only moves forward
}
function tourSkip(){
  tourSave("skip", T.i);
  tourTeardown();
  syncTourResume();
  toast("Tour paused. Pick it up any time from the corner.");
}

function tourComplete(){
  tourSave("complete", T.steps.length);
  T.mode="done";
  T.i=T.steps.length;                            // every row reads as complete
  tourProgress();
  $("tourProg").classList.add("celebrate");
  $("tourHole").style.opacity="0";
  const b=$("tourBlur"); if(b) b.style.clipPath="";
  const pop=$("tourPop");
  pop.classList.add("fade");
  setTimeout(()=>{
    if(!T || !$("tourPop")) return;              // dismissed inside the fade
    pop.classList.add("tour-center");
    pop.style.left=""; pop.style.top="";
    tourPaintCard(`<h4 id="tourTitle">You're ready to use PromoSlot</h4>
      <p id="tourBody">You now know the core tools. Explore the marketplace, connect with the right people, and start building your first opportunity.</p>
      <div class="tour-foot">
        <span class="tour-count">All five done</span>
        <button class="btn btn-ghost" onclick="tourFinish()">Finish tour</button>
        <button class="btn btn-p" onclick="tourFinish(true)">Explore marketplace</button>
      </div>`);
    pop.classList.remove("fade");
  }, 200);
}

function tourFinish(goMarket){
  tourTeardown();
  syncTourResume();
  if(goMarket) openMarket();
}

/* ---- resume pill ---- */
// Deliberately available at any width, including below 901px where the tour
// itself is never offered — someone who starts on a laptop and reopens on a
// phone still sees that it is waiting for them.
function syncTourResume(){
  const want = tourUnfinished() && !T;
  const el=$("tourResume");
  if(!want){ if(el) el.remove(); return; }
  if(el) return;
  const d=document.createElement("div");
  d.id="tourResume";
  d.innerHTML=`<span>Continue setup tour</span>
    <button class="btn btn-p btn-sm" onclick="tourResumeClick()">Resume</button>
    <button class="tr-x" onclick="tourHideResume()" aria-label="Hide">✕</button>`;
  document.body.appendChild(d);
}
function tourHideResume(){ const e=$("tourResume"); if(e) e.remove(); }

// Restart from My Account. Goes home first: every target lives in the nav, but
// the tour reads better against the landing page than a half-scrolled settings
// form.
function tourRestart(){
  if(!tourWideEnough()){
    toast("The tour needs a wider screen. Open PromoSlot on a laptop or desktop.");
    return;
  }
  tourHideResume();
  goHome();
  tourSave("start", 0);
  setTimeout(()=>tourStart(0), 120);
}
function tourResumeClick(){
  if(!tourWideEnough()){
    toast("The tour needs a wider screen. Open PromoSlot on a laptop or desktop.");
    return;
  }
  tourHideResume();
  tourStart(Math.min(S.account?.product_tour_current_step||0, 4));
}

/* ---- input blocking + focus trap ---- */
// Capture phase, so this runs before the app's own document-level keydown
// (Escape closes modals) and before anything a background view is listening for.
function tourKey(e){
  if(!T) return;
  const root=$("tourRoot");
  // Below the supported width the CSS hides #tourRoot. A tour nobody can see
  // must not go on swallowing keystrokes, so stand down until reflow tidies up.
  // Checked via computed display, not offsetParent: #tourRoot is position:fixed
  // and fixed elements always report a null offsetParent.
  if(!root || getComputedStyle(root).display==="none") return;
  if(e.key==="Escape"){
    e.preventDefault(); e.stopPropagation();
    if(T.mode==="welcome") tourDismissWelcome(); else tourSkip();
    return;
  }
  if(e.key==="Tab"){
    const f=[...root.querySelectorAll("button:not([disabled])")].filter(b=>b.offsetParent!==null);
    if(!f.length) return;
    const first=f[0], last=f[f.length-1];
    const cur=document.activeElement;
    // Wrap at both ends, and pull focus back in if it ever escaped the card.
    if(e.shiftKey && (cur===first || !root.contains(cur))){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && (cur===last || !root.contains(cur))){ e.preventDefault(); first.focus(); }
    return;
  }
  // Enter/Space on a tour button is the browser's own default — leave it be.
  if(e.key==="Enter"||e.key===" "){ if(root.contains(document.activeElement)) return; }
  // The Deal Journey and pricing-calculator cards are illustrative, self-contained
  // homepage widgets with no real side effects (nothing saved, nothing sent) - they
  // aren't the kind of "background form" this trap exists to protect against, so
  // typing/clicking inside them should work normally even mid-tour.
  if(e.target.closest(".dj-card,.ps-card")) return;
  // Everything else (app shortcuts, typing into a background form) is swallowed.
  if(!root.contains(e.target)){ e.preventDefault(); e.stopPropagation(); }
}

// Targets move when the window resizes or the page scrolls under the sticky nav.
function tourReflow(){
  if(!T || T.mode!=="steps") return;
  if(!tourWideEnough()){ tourSkip(); return; }   // narrowed past the supported width
  if(T._raf) return;
  T._raf=requestAnimationFrame(()=>{
    T._raf=null;
    const step=T.steps[T.i], el=step && tourVisible(step.sel);
    if(!el) return;
    const pad=8, r=el.getBoundingClientRect();
    const hole=$("tourHole");
    hole.style.top=(r.top-pad)+"px";  hole.style.left=(r.left-pad)+"px";
    hole.style.width=(r.width+pad*2)+"px"; hole.style.height=(r.height+pad*2)+"px";
    tourClip(r, pad, parseFloat(getComputedStyle(el).borderRadius)||10);
    tourPlacePop(r);
  });
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
  closeNavMenu();   // any navigation, from any source, retires the mobile menu
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  const el=$(id); el.classList.add("active");
  el.classList.remove("view-anim"); void el.offsetWidth; el.classList.add("view-anim");
  if(id==="view-landing") renderLandingState();
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
/* ---------- Homepage: new-signup checklist vs default hero ----------
   Deliberately simple: "new" for a role means that role hasn't published
   its first campaign/listing yet — the one real, already-loaded signal
   (S.myCampaigns/S.myPlatforms) rather than anything fabricated. Once that
   role has published, this always resolves back to the default hero, so
   there is no half-done checklist state to design for. */
function landingIsNew(role){
  if(role==="biz") return !S.myCampaigns || S.myCampaigns.length===0;
  if(role==="plat") return !S.myPlatforms || S.myPlatforms.length===0;
  return false;
}
function renderLandingState(){
  const sk=$("heroSkeleton"); if(sk) sk.classList.add("hide");
  const def=$("heroDefault"), chk=$("heroSignupChecklist"), ret=$("heroReturning"), nr=$("heroNoRole");
  const loggedIn = !!S.account;
  // A logged-in account with zero roles (S.roles empty) can't be "new" or
  // "returning" for either role — those states presuppose one. This mostly
  // matters for older accounts; every current signup requires picking at
  // least one role, so it shouldn't be reachable going forward, but showing
  // the guest marketing hero to someone who's actually logged in (nav says
  // "Log out") is more confusing than a dedicated pick-a-role prompt.
  const hasRole = loggedIn && !!S.roles && S.roles.length>0 && !!S.activeRole;
  const isNew = hasRole && landingIsNew(S.activeRole);
  // showGuest is the ONLY thing that may ever reveal the guest marketing
  // hero — it is explicitly "not logged in", never inferred from anything
  // else. #heroDefault also starts with class="hide" in the static markup
  // (not visible-by-default), so if this function never runs at all —
  // stale cache, an error earlier in boot, whatever — the failure mode is a
  // blank landing area, never guest content shown to a signed-in user. Each
  // block is guarded independently so one missing element (e.g. an old
  // cached page missing a newer block) can't stop the others from
  // resolving correctly.
  const showGuest = !loggedIn;
  const showNoRole = loggedIn && !hasRole;
  const showChecklist = hasRole && isNew;
  const showReturning = hasRole && !isNew;
  if(def) def.classList.toggle("hide", !showGuest);
  if(nr) nr.classList.toggle("hide", !showNoRole);
  if(chk) chk.classList.toggle("hide", !showChecklist);
  if(ret) ret.classList.toggle("hide", !showReturning);
  if(showChecklist) renderSignupChecklist();
  if(showReturning) renderReturningActionCenter();
}
function renderSignupChecklist(){
  const el=$("setupAvatarInit");
  if(el) el.textContent = initials(S.account.display_name||S.account.email||"You");
  const viewed = !!S.account.profile_setup_viewed_at;
  document.querySelectorAll("#heroSignupChecklist .setup-row-profile").forEach(row=>{
    row.classList.toggle("done", viewed);
    const check=row.querySelector(".setup-check");
    if(check) check.innerHTML = viewed ? ICON_CHECK : "";
    const btn=row.querySelector(".btn");
    if(btn) btn.textContent = viewed ? "Done" : "Open";
  });
  document.querySelectorAll("#heroSignupChecklist .setup-progress-bar").forEach(bar=>{
    bar.style.width = viewed ? "66%" : "33%";
  });
  document.querySelectorAll("#heroSignupChecklist .setup-progress-label").forEach(lbl=>{
    lbl.textContent = `Getting started · ${viewed?2:1} of 3 complete`;
  });
}
const ICON_MSG='<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
const ICON_CHECK='<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
/* ---------- Homepage: returning-user action centre ----------
   Every row here is a real, already-loaded (or one extra real fetch of)
   signal — no invented deadlines, no fabricated "matching" and no evidence-
   review items for the account holder, since PromoSlot's reviewer (not the
   business or the platform owner) verifies delivery. See deal_state.py:
   only business_approved/owner_approved and unread messages are things the
   account holder can actually act on themselves. */
function returningAttnRows(role){
  const myId=String(S.account.id);
  const deals=S.realDeals||[];
  const convos=S.convos||[];
  const unread=convos.reduce((n,c)=>n+(c.unread||0),0);
  const mostUnread=convos.filter(c=>c.unread>0).sort((a,b)=>new Date(b.last_at)-new Date(a.last_at))[0];
  const rows=[];
  if(role==="biz"){
    const mine=deals.filter(d=>String(d.business_id)===myId);
    const awaiting=mine.filter(d=>d.status==="awaiting_approval" && !d.business_approved);
    if(awaiting.length) rows.push({color:"#dc2626",
      title:`${awaiting.length} deal${awaiting.length>1?"s":""} awaiting your approval`,
      sub:`With ${awaiting.slice(0,2).map(d=>esc(d.owner_name)).join(", ")}`, act:"dash"});
  } else if(role==="plat"){
    const mine=deals.filter(d=>String(d.platform_owner_id)===myId);
    const awaiting=mine.filter(d=>d.status==="awaiting_approval" && !d.owner_approved);
    const changes=mine.filter(d=>d.status==="changes_requested");
    if(awaiting.length) rows.push({color:"#dc2626",
      title:`${awaiting.length} deal${awaiting.length>1?"s":""} awaiting your approval`,
      sub:`With ${awaiting.slice(0,2).map(d=>esc(d.business_name)).join(", ")}`, act:"dash"});
    if(changes.length) rows.push({color:"#d97706",
      title:`${changes.length} deal${changes.length>1?"s":""} need${changes.length>1?"":"s"} changes`,
      sub:"Resubmit evidence after the requested changes", act:"dash"});
  }
  if(unread) rows.push({color:"#4f46e5",
    title:`${unread} unread message${unread>1?"s":""}`,
    sub: mostUnread?`From ${esc(mostUnread.other_name)}`:"", act:"messages"});
  return {rows, mostUnread};
}
function renderReturningActionCenter(){
  const role=S.activeRole;
  const name=(S.account.display_name||S.account.email||"there").split(" ")[0];
  const greetEl=$("returningGreeting"); if(greetEl) greetEl.textContent=`Welcome back, ${esc(name)}.`;

  const {rows, mostUnread}=returningAttnRows(role);
  const subEl=$("returningSub");
  if(subEl) subEl.textContent = rows.length ? "Here's what needs a look." : "You're all caught up.";

  const attnEl=$("returningAttnCard");
  if(attnEl){
    attnEl.innerHTML = rows.length
      ? `<div class="attn-card">${rows.map(r=>`<div class="attn-row"><span class="attn-dot" style="background:${r.color}"></span><div class="attn-t"><h4>${r.title}</h4><p>${r.sub}</p></div><button class="btn btn-o btn-sm" data-act="${r.act}">Open</button></div>`).join("")}</div>`
      : `<div class="attn-empty-card">${ICON_CHECK}<div><h4>You're all caught up</h4><p>${role==="biz"?"Nothing needs your attention right now. Explore the marketplace or check your active campaigns.":"Nothing needs your attention right now. Browse open campaigns or check your active deals."}</p></div></div>`;
  }

  const oppEl=$("returningOppList"), oppTitleEl=$("returningOppTitle");
  if(oppEl){
    if(role==="biz"){
      const real=(S.marketPlatforms||[]).slice(0,6);
      oppEl.innerHTML = real.length ? real.map((l,i)=>listingCard(l,i,false)).join("") : `<p class="mut" style="font-size:13.5px">No new listings yet. Check back soon.</p>`;
      if(oppTitleEl) oppTitleEl.textContent="Recently published platform owners";
    } else {
      const real=(S.marketCampaigns||[]).slice(0,6);
      oppEl.innerHTML = real.length ? real.map((c,i)=>campaignCard(c,i,false)).join("") : `<p class="mut" style="font-size:13.5px">No new campaigns yet. Check back soon.</p>`;
      if(oppTitleEl) oppTitleEl.textContent="Recently published campaigns";
    }
  }

  const actEl=$("returningActivity");
  if(actEl){
    const notifs=(S.realNotifs||[]).slice(0,5);
    actEl.innerHTML = notifs.length
      ? notifs.map(n=>`<div class="activity-row"><span class="act-time">${relTime(n.created_at)}</span><span>${esc(n.body)}</span></div>`).join("")
      : `<div class="activity-row"><span class="mut">Nothing yet. Updates from your deals and messages appear here.</span></div>`;
  }

  const nudgeEl=$("returningNudges");
  if(nudgeEl){
    const nudges=[];
    if(mostUnread) nudges.push(`<div class="nudge-card">${ICON_MSG}<div><h4>Reply to ${esc(mostUnread.other_name)}</h4><p>Waiting on your reply</p></div></div>`);
    nudgeEl.innerHTML = nudges.length ? nudges.join("") : `<p class="mut" style="font-size:13px">Nothing new to flag right now.</p>`;
  }
}
function goHow(){ setRoute("how"); showView("view-how"); }
function goPricingPage(){ setRoute("pricing"); showView("view-pricing"); }
function goProtect(){ setRoute("protect"); showView("view-protect"); }
function goResources(){ setRoute("resources"); showView("view-resources"); }
function goAbout(){ setRoute("about"); showView("view-about"); initAboutMotion(); }
function goTerms(){ setRoute("terms"); showView("view-terms"); }
function goPrivacy(){ setRoute("privacy"); showView("view-privacy"); }
function goRefundPolicy(){ setRoute("refund"); showView("view-refund-policy"); }
// Scroll choreography for the About page: headline line-mask reveals, block
// rises, ledger-pair reveals, drawn rules, beat-focus tracking and magnetic
// buttons. Runs once per page load (guarded by data-motion-wired) since the
// view stays in the DOM across navigations — no need to replay on revisit.
function initAboutMotion(){
  const root=$("view-about"); if(!root||root.dataset.motionWired) return;
  root.dataset.motionWired="1";
  const reduced=resVisReduced();

  const lineGroups=new Map();
  root.querySelectorAll("[data-line]").forEach(el=>{
    const h=el.closest("h1,h2");
    if(!lineGroups.has(h)) lineGroups.set(h,[]);
    lineGroups.get(h).push(el);
    if(!reduced){ el.style.transform="translateY(105%)"; el.style.transition="transform 1s cubic-bezier(.16,1,.3,1)"; }
  });
  const playLines=h=>(lineGroups.get(h)||[]).forEach((el,i)=>{
    setTimeout(()=>{ el.style.transform="translateY(0)"; }, i*110);
  });

  if(reduced){
    root.querySelectorAll("[data-rise]").forEach(el=>{ el.style.opacity="1"; el.style.transform="none"; });
    root.querySelectorAll("[data-new]").forEach(el=>{ el.style.opacity="1"; el.style.transform="none"; });
    root.querySelectorAll("[data-old]").forEach(el=>{ el.style.opacity=".78"; });
    root.querySelectorAll("[data-drawline],[data-beatrule]").forEach(el=>{ el.style.transform=el.hasAttribute("data-drawline")?"scaleY(1)":"scaleX(1)"; });
    lineGroups.forEach((_,h)=>playLines(h));
    return;
  }

  const rises=[...root.querySelectorAll("[data-rise]")];
  rises.forEach(el=>{
    const d=parseFloat(el.dataset.rise)||16;
    el.style.opacity="0"; el.style.transform="translateY("+d+"px)";
    el.style.transition="opacity .85s cubic-bezier(.16,1,.3,1),transform .95s cubic-bezier(.16,1,.3,1)";
  });

  const pairs=[...root.querySelectorAll("[data-pair]")];
  pairs.forEach(li=>{
    const nw=li.querySelector("[data-new]"), old=li.querySelector("[data-old]");
    nw.style.opacity="0"; nw.style.transform="translateX(-14px)";
    nw.style.transition="opacity .7s ease,transform .8s cubic-bezier(.16,1,.3,1)";
    old.style.opacity="1"; old.style.transition="opacity .9s ease .25s";
  });

  const draws=[...root.querySelectorAll("[data-drawline],[data-beatrule]")];
  draws.forEach(el=>{
    const vertical=el.hasAttribute("data-drawline");
    el.style.transform=vertical?"scaleY(0)":"scaleX(0)";
    el.style.transition="transform 1.1s cubic-bezier(.16,1,.3,1)";
  });

  const show=el=>{
    if(el.hasAttribute("data-rise")){ el.style.opacity="1"; el.style.transform="translateY(0)"; }
    if(el.hasAttribute("data-pair")){
      const nw=el.querySelector("[data-new]"), old=el.querySelector("[data-old]");
      nw.style.opacity="1"; nw.style.transform="translateX(0)"; old.style.opacity=".78";
    }
    if(el.hasAttribute("data-drawline")) el.style.transform="scaleY(1)";
    if(el.hasAttribute("data-beatrule")) el.style.transform="scaleX(1)";
    if(el.tagName==="H1"||el.tagName==="H2") playLines(el);
  };

  const pending=new Set([...lineGroups.keys(), ...rises, ...pairs, ...draws]);
  const reveal=(el,delay)=>{
    if(!pending.has(el)) return;
    pending.delete(el);
    if(delay) setTimeout(()=>show(el),delay); else show(el);
    io.unobserve(el);
  };

  const io=new IntersectionObserver(es=>{
    es.forEach(e=>{
      if(!e.isIntersecting) return;
      const el=e.target;
      reveal(el, el.hasAttribute("data-pair") ? (pairs.indexOf(el)%3)*90 : 0);
    });
  }, { rootMargin:"0px 0px -12% 0px", threshold:.18 });
  pending.forEach(el=>io.observe(el));

  const hero=root.querySelector("h1");
  requestAnimationFrame(()=>reveal(hero,0));

  const beats=[...root.querySelectorAll("[data-beat]")];
  const parallaxEls=[...root.querySelectorAll("[data-parallax]")];
  const track=()=>{
    if(pending.size){
      [...pending].forEach(el=>{ if(el.getBoundingClientRect().top<window.innerHeight*0.92) reveal(el,0); });
    }
    const line=window.innerHeight*0.46;
    let best=null, bestD=Infinity;
    beats.forEach(b=>{
      const r=b.getBoundingClientRect();
      const d=Math.abs((r.top+r.height/2)-line);
      if(d<bestD){ bestD=d; best=b; }
    });
    beats.forEach(b=>{
      const on=b===best && bestD<window.innerHeight*0.42;
      const t=b.querySelector("[data-beattitle]"), c=b.querySelector("[data-beatcap]");
      if(t) t.style.color=on?"#ffffff":"var(--navy-mut)";
      if(c) c.style.opacity=on?"1":".55";
    });
    parallaxEls.forEach(el=>{
      const f=parseFloat(el.dataset.parallax)||0;
      const r=el.getBoundingClientRect();
      const off=((r.top+r.height/2)-window.innerHeight/2)*-f;
      el.style.transform="translate3d(0,"+off.toFixed(1)+"px,0)";
    });
  };
  let queued=false;
  const onScroll=()=>{ if(!queued){ queued=true; requestAnimationFrame(()=>{ queued=false; track(); }); } };
  window.addEventListener("scroll", onScroll, { passive:true });
  window.addEventListener("resize", onScroll, { passive:true });

  root.querySelectorAll("[data-magnetic]").forEach(btn=>{
    const move=e=>{
      const r=btn.getBoundingClientRect();
      const dx=(e.clientX-(r.left+r.width/2))/r.width;
      const dy=(e.clientY-(r.top+r.height/2))/r.height;
      btn.style.transform="translate("+(dx*5).toFixed(2)+"px,"+(dy*4-1).toFixed(2)+"px)";
    };
    const leave=()=>{ btn.style.transform="translate(0,0)"; };
    btn.addEventListener("pointermove", move);
    btn.addEventListener("pointerleave", leave);
  });

  track();
}
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
  if(S.roles.includes(r)){
    S.activeRole=r; setTheme(); syncNav(); openDash();
    toast(`Switched to your ${r==="biz"?"business":"platform-owner"} dashboard`);
    return;
  }
  const linked=S.account && S.account.linked_account;
  const linkedRole = linked ? (linked.is_business?"biz":"plat") : null;
  if(linked && linkedRole===r){
    switchToLinkedAccount(r);
    return;
  }
  const label = r==="biz" ? "business" : "platform-owner";
  openModal(`<div class="m-pad"><h3 class="m-title">Set up your ${label} profile?</h3>
    <p class="m-sub">This creates a separate, linked profile with its own name, switch between
      the two anytime from My Account. One login, two identities.</p>
    <div class="frm"><label>${label==="business"?"Business":"Platform-owner"} name</label>
      <input type="text" id="lp-name" placeholder="${r==='biz'?'Meadow & Moss':'RobertLifts'}"></div>
    <div class="hint-err hide" id="lp-err"></div>
    <div class="m-actions"><button class="btn btn-o" onclick="closeModal()">Not now</button>
    <button class="btn btn-p" id="lp-submit" onclick="confirmLinkProfile('${r}')">Set it up</button></div></div>`,"narrow");
}
async function confirmLinkProfile(r){
  const name=(($("lp-name")||{}).value||"").trim();
  const err=$("lp-err"); if(err) err.classList.add("hide");
  if(!name){ if(err){err.textContent="Enter a name for this profile.";err.classList.remove("hide");} return; }
  if(S.account.display_name && name.toLowerCase()===S.account.display_name.trim().toLowerCase()){
    if(err){err.textContent="That name is already used by your other PromoSlot profile. Choose a different one.";err.classList.remove("hide");}
    return;
  }
  const btn=$("lp-submit"); if(btn){ btn.disabled=true; btn.innerHTML=`<span class="spin"></span> Creating…`; }
  try{
    S.account=await PSApi.linkProfile({role: r==="biz"?"business":"platform_owner", display_name:name});
  }catch(e){
    if(btn){ btn.disabled=false; btn.textContent="Set it up"; }
    if(err){ err.textContent=e.message||"Could not set up that profile"; err.classList.remove("hide"); } else toast(e.message||"Could not set up that profile");
    return;
  }
  await loadPerms(); authReflect(); closeModal();
  S.activeRole=r; setTheme(); syncNav();
  // requireRole() (below) stashes what the person was actually trying to do
  // before this profile existed — resume that instead of always opening the
  // role's default wizard, so e.g. "buy this offer" -> create business
  // profile -> lands back on buying the offer, not on the campaign wizard.
  const resume=_roleGateResume; _roleGateResume=null;
  if(resume) resume(); else startWizard(r);
}
// Gates an action that only makes sense for one identity (business vs
// platform-owner) behind the account's ACTIVE identity. S.roles reflects
// only the identity currently in use (see authReflect()), not everything the
// underlying account can do — a business-active account has S.roles=["biz"]
// even if a linked platform-owner profile exists. Without this, entry points
// reachable regardless of which dashboard is open (marketplace CTAs, buying
// an offer, applying to a campaign) either silently proceeded with the wrong
// role or dead-ended in a plain toast. Reuses the exact switch/create
// machinery switchRole() already uses for the nav role switcher, so "already
// linked" vs "needs creating" is detected the same way in both places.
let _roleGateResume=null;
function requireRole(role, resumeFn){
  if(S.roles.includes(role)){ resumeFn(); return; }
  if(!S.account){ authGate("login"); return; }   // no account yet: not a role mismatch
  _roleGateResume=resumeFn;
  const label = role==="biz" ? "business" : "platform owner";
  const activeLabel = S.activeRole==="biz" ? "business" : "platform-owner";
  const linked=S.account.linked_account;
  const linkedRole = linked ? (linked.is_business?"biz":"plat") : null;
  const already = linkedRole===role;
  openModal(`<div class="m-pad"><h3 class="m-title">You'll need a ${label} account</h3>
    <p class="m-sub">This action is for ${label} accounts. You're currently using your ${activeLabel} profile.</p>
    <div class="m-actions" style="flex-direction:column;align-items:stretch;gap:8px">
      ${already
        ? `<button class="btn btn-p" onclick="_roleGateSwitch('${role}')">Already have one? Switch to it now</button>`
        : `<button class="btn btn-p" onclick="_roleGateCreate('${role}')">Don't have one? Create one</button>`}
      <button class="btn btn-ghost" onclick="closeModal();_roleGateResume=null">Cancel</button>
    </div></div>`,"narrow");
}
function _roleGateSwitch(role){
  closeModal();
  const resume=_roleGateResume; _roleGateResume=null;
  switchToLinkedAccount(role).then(()=>{ if(resume) resume(); });
}
function _roleGateCreate(role){
  // Same "set up a linked profile" form switchRole() uses, kept in sync
  // deliberately rather than duplicated with different copy — the only
  // difference is confirmLinkProfile() resumes _roleGateResume when set.
  closeModal();
  const label = role==="biz" ? "business" : "platform-owner";
  openModal(`<div class="m-pad"><h3 class="m-title">Set up your ${label} profile?</h3>
    <p class="m-sub">This creates a separate, linked profile with its own name, switch between
      the two anytime from My Account. One login, two identities.</p>
    <div class="frm"><label>${label==="business"?"Business":"Platform-owner"} name</label>
      <input type="text" id="lp-name" placeholder="${role==='biz'?'Meadow & Moss':'RobertLifts'}"></div>
    <div class="hint-err hide" id="lp-err"></div>
    <div class="m-actions"><button class="btn btn-o" onclick="closeModal();_roleGateResume=null">Not now</button>
    <button class="btn btn-p" id="lp-submit" onclick="confirmLinkProfile('${role}')">Set it up</button></div></div>`,"narrow");
}
async function switchToLinkedAccount(r){
  try{ S.account=await PSApi.switchAccount(); }
  catch(e){ toast(e.message||"Could not switch accounts"); return; }
  await loadPerms(); authReflect();
  S.activeRole=r; setTheme(); syncNav();
  toast(`Switched to your ${r==="biz"?"business":"platform-owner"} profile`,true);
  openDash();
}
function syncNav(){
  const has=S.roles.length>0;
  $("nl-dash").classList.toggle("hide",!has);
  $("userChip").classList.toggle("hide",!has);
  $("nav-cta").classList.toggle("hide",has);
  $("mobileStickyCta").classList.toggle("hide",has);
  $("roleSwitch").classList.toggle("hide",S.roles.length===0);
  setTheme();
  if(has){
    const nm = S.activeRole==="biz" && S.biz ? S.biz.company : (S.myPlatforms[0]?S.myPlatforms[0].brand:(S.biz?S.biz.company:"You"));
    $("userName").textContent=nm; $("userName").title=nm||""; $("userInit").textContent=initials(nm||"You");
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
  closeTimer=setTimeout(()=>{
    closeTimer=null; ov.classList.remove("open","closing"); document.body.style.overflow="";
    if(S._nudgePending) maybeShowSignupNudge();   // it fired while this was open
  },170);
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
  // Root cause of Rob's testing note: this used to check S.roles directly and
  // fall straight to startWizard() on a mismatch — which for a guest is
  // correct (they haven't chosen a role yet), but for someone already logged
  // in on the OTHER role it silently launched the wrong wizard instead of
  // ever asking. requireRole() below only intervenes in that second case.
  const role = S.marketTab==="platforms" ? "plat" : "biz";
  const openWizard = role==="plat" ? openRegisterPlatform : openNewCampaign;
  if(!S.account){ startWizard(role); return; }
  requireRole(role, openWizard);
}
function toggleFilters(){ $("filtersBox").classList.toggle("open"); }

/* Homepage "Payment Protection" detail accordion — a premium expand/collapse
   list (smooth grid-rows height animation, not the native <details> snap),
   each row independent so a visitor only opens what they care about. */
function toggleAccRow(headBtn){
  const row = headBtn.closest(".acc-row");
  if(row) row.classList.toggle("open");
}

/* ---------- Homepage: search + platform quick-links ----------
   The hero search bar and the platform chip rows (hero + "Browse by
   platform") are shortcuts into the real marketplace filters, not a
   separate search system — they just set S.filters and hand off to the
   same openMarket() the rest of the app already uses. */
function heroSearchGo(){
  const v = ($("heroSearchInput")||{}).value || "";
  S.filters.q = v.trim();
  openMarket(S.heroDirection==="campaigns" ? "campaigns" : "platforms");
}
function heroPlatformGo(name){
  resetFilters();
  S.filters.platforms.add(name);
  openMarket(S.heroDirection==="campaigns" ? "campaigns" : "platforms");
}
/* Hero "Find promotion / Find campaigns" toggle — demonstrates the two-sided
   model directly rather than explaining it. Swaps the search placeholder and
   which marketplace tab "Explore Marketplace" / the search bar target. */
function setHeroDirection(dir){
  S.heroDirection = (dir==="campaigns") ? "campaigns" : "promotion";
  const isPromo = S.heroDirection==="promotion";
  document.querySelectorAll("#heroDirToggle .dir-btn").forEach(b=>{
    b.classList.toggle("on", b.dataset.dir===S.heroDirection);
  });
  const input=$("heroSearchInput");
  if(input) input.placeholder = isPromo
    ? "Search creators, communities, newsletters and audience platforms"
    : "Search campaigns by industry, platform, budget or audience";
  S.marketTab = isPromo ? "platforms" : "campaigns";
}
function platChipBtn(p){
  // Neutral pill + neutral label — only the small icon swatch keeps the
  // platform's brand colour, so a row of these reads as one calm control
  // instead of a rainbow of competing colours.
  const m=PLATFORM_META[p];
  return `<button type="button" class="plat-chip-btn" onclick="heroPlatformGo('${esc(p)}')"><span class="pcb-ico" style="background:${m.color}1a;color:${m.color}">${m.ico}</span>${esc(p)}</button>`;
}
function renderHeroChips(){
  const el=$("heroPlatChips"); if(!el) return;
  el.innerHTML = ALL_PLATFORMS.slice(0,7).map(p=>platChipBtn(p)).join("");
}
/* Simplified hero (guest-focused): one realistic listing preview instead of
   the old direction toggle + chip row. Reuses the same example listing (and
   the same EXAMPLE labelling) already shown in the marketplace, so nothing
   new is fabricated for the homepage. */
function renderHeroPreview(){
  const el=$("heroPreviewCard"); if(!el) return;
  el.innerHTML = listingCard(LISTINGS[0],0,false);
}
function renderPlatBrowseChips(){
  const el=$("platBrowseChips"); if(!el) return;
  el.innerHTML = ALL_PLATFORMS.map(p=>platChipBtn(p)).join("");
}

/* ---------- Mobile nav menu ----------
   Below 900px .nav-links has nowhere to live inline (see index.html), so it
   becomes a toggleable full-width dropdown instead — same "hide behind a
   toggle at this width" pattern as the filters panel above. Closes itself on
   any nav-link click, any outside click, Escape, or any view change (see
   showView()), so it never gets left open pointing at a stale page. */
function toggleNavMenu(){
  const el=$("navLinks"); if(!el) return;
  const open=el.classList.toggle("open");
  const t=$("navMenuToggle"); if(t) t.setAttribute("aria-expanded", open?"true":"false");
}
function closeNavMenu(){
  const el=$("navLinks"); if(el) el.classList.remove("open");
  const t=$("navMenuToggle"); if(t) t.setAttribute("aria-expanded","false");
  closeNavDropdowns();
}
function closeNavDropdowns(except){
  document.querySelectorAll("nav.nav details.nav-dd[open]").forEach(d=>{ if(d!==except) d.open=false; });
}
/* .nav-links has overflow-x:auto so accounts with a lot of nav items (admin,
   reviewer, ...) scroll instead of wrapping - but per the CSS overflow spec,
   setting overflow-x to anything but visible forces overflow-y to compute as
   auto too, which silently clips any absolutely-positioned child that pokes
   out of it. That child is the "How it works" dropdown panel, so on desktop
   it was opening (details.open really did flip to true) but rendering
   clipped to nothing - looked completely dead. Escaping to position:fixed,
   placed from the real click position, sidesteps the clipping instead of
   fighting the scroll container (which genuinely needs to stay auto for the
   long authenticated nav). Below the mobile breakpoint the panel lives
   inside the open mobile menu in normal flow (see the .nav-links
   .nav-dd-panel CSS override) and is never clipped, so this is skipped there. */
function positionNavDropdown(dd){
  const panel=dd.querySelector(".nav-dd-panel");
  if(!panel) return;
  if(window.innerWidth<=900){ panel.style.cssText=""; return; }
  const r=dd.getBoundingClientRect();
  panel.style.position="fixed";
  panel.style.left=r.left+"px";
  panel.style.top=(r.bottom+4)+"px";
  panel.style.right="auto";
}
function resetNavDropdownPosition(dd){
  const panel=dd.querySelector(".nav-dd-panel");
  if(panel) panel.style.cssText="";
}
function wireNavDropdowns(){
  document.querySelectorAll("details.nav-dd").forEach(dd=>{
    dd.addEventListener("toggle",()=>{
      if(dd.open) positionNavDropdown(dd); else resetNavDropdownPosition(dd);
    });
  });
  // A stale fixed-position panel left floating mid-scroll/resize would be
  // worse than just closing it - dropdowns closing on scroll is standard
  // behaviour anyway.
  window.addEventListener("scroll",()=>closeNavDropdowns(),{passive:true});
  window.addEventListener("resize",()=>closeNavDropdowns());
}
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
  $("marketSub").textContent = isPlat ? "Audiences for sale: every listing shows verified analytics and the owner's own pricing." : "Brands publishing what they'll pay. Apply, accept the terms, or counter-offer.";
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
  const foundingES=`<div class="founding-state"><div class="fs-badge">Founding cohort</div><div class="fs-ico">🚀</div><h4>${isPlat?"3 founding creators have joined so far: be the next":"3 founding brands have joined so far: be the next"}</h4><p>PromoSlot is opening with a hand-picked founding cohort. The card above is an example of a complete ${isPlat?"platform-owner listing":"business campaign"}. Real ${isPlat?"listings":"campaigns"} will appear here as founders come on board.</p><button class="btn btn-p" onclick="marketCtaClick()">${isPlat?"List your platform":"Post your campaign"}</button></div>`;
  $("marketCards").innerHTML = items.length
    ? items.map((x,i)=>isPlat?listingCard(x,i):campaignCard(x,i)).join("") + (realCount===0?foundingES:"")
    : `<div class="zero-state">
        <div class="zs-ico">🔎</div>
        <h4>No ${isPlat?"platforms":"campaigns"} match those filters</h4>
        <p>Try removing a filter or widening the ${isPlat?"price":"budget"} range. The marketplace has ${isPlat?allListings().length+" listings":allCampaigns().length+" live campaigns"} in total.</p>
        <button class="btn btn-o btn-sm" onclick="resetFilters();buildFilters();renderMarket()">Clear all filters</button>
      </div>`;
}
/* ---------- Guest homepage marketplace rail ----------
   Real data only (S.marketPlatforms / S.marketCampaigns, loaded by loadMarket()),
   never a manually maintained duplicate list. Below RAIL_AUTOSCROLL_THRESHOLD
   real items it's a plain scrollable strip (same pattern used elsewhere on the
   site); at/above that count it switches itself on to the looping marquee -
   nothing to flip by hand as the marketplace fills up. */
const RAIL_AUTOSCROLL_THRESHOLD=6;
let railRole="plat";
function railSetRole(r){ railRole=r; renderMarketRail(); }
function renderMarketRail(){
  const el=$("marketRail"); if(!el) return;
  const isPlat = railRole==="plat";
  $("railTabPlat")?.classList.toggle("on",isPlat);
  $("railTabBiz")?.classList.toggle("on",!isPlat);
  $("railHeading") && ($("railHeading").textContent = isPlat ? "See how platform listings appear" : "See how business campaigns appear");
  const reals = isPlat ? (S.marketPlatforms||[]) : (S.marketCampaigns||[]);
  const items = reals.length ? reals : [isPlat ? LISTINGS[0] : CAMPAIGNS[0]];
  const cardsHtml = items.map((x,i)=> isPlat ? listingCard(x,i) : campaignCard(x,i)).join("");
  const auto = reals.length >= RAIL_AUTOSCROLL_THRESHOLD;
  el.classList.toggle("rail-auto",auto);
  el.classList.toggle("rail-static",!auto);
  // Auto mode loops a doubled list via translateX(-50%); static mode is a
  // normal scrollable strip, so it only ever needs the one real copy.
  el.innerHTML = auto ? (cardsHtml+cardsHtml) : cardsHtml;
  const cap=$("railCaption");
  if(cap){
    // Only ever call this "live" when it actually is - the LISTINGS[0]/CAMPAIGNS[0]
    // fallback above is the same labelled .example-card used in the real
    // Marketplace, never presented as real activity.
    const label = reals.length ? "live marketplace activity" : "an illustrative example, not a live listing";
    cap.textContent = auto ? `Hover or focus to pause · ${label}` : (reals.length ? "Live marketplace activity" : "Illustrative example, not a live listing");
  }
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
  // Counted after the modal is up on purpose: if this is the view that trips the
  // nudge, it defers until they close the listing instead of firing underneath it.
  if(fresh) noteDetailView();
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
    <div><label>Caption</label><input type="text" id="wk-title-${idx}" placeholder="e.g. Hypertrophy reel, my editing style"></div>
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
          <span class="dz-text" id="wk-cdzt-${idx}">Cover image: drag &amp; drop or <label for="wk-cover-${idx}" class="dz-link">select</label></span>
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
                 :`Cover image: drag &amp; drop or <label for="${forId}" class="dz-link">select</label>`;
  t.innerHTML = f ? `📎 ${esc(f.name)} · <label for="${forId}" class="dz-link">change</label>` : empty;
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
function editChips(field,opts,customLabel){
  const sel=S._edit.sets[field];
  const toggleAttr=`onclick="const s=S._edit.sets['${field}'];s.has(this.dataset.v)?s.delete(this.dataset.v):s.add(this.dataset.v);this.classList.toggle('on')"`;
  let html=`<div class="f-chips" id="ec-chips-${field}">${opts.map(o=>`<button type="button" class="chip ${sel.has(o)?"on":""}" data-v="${esc(o)}" ${toggleAttr}>${esc(o)}</button>`).join("")}`;
  if(customLabel){
    const customVals=[...sel].filter(v=>!opts.includes(v));
    html+=customVals.map(v=>`<button type="button" class="chip on" data-v="${esc(v)}" ${toggleAttr}>${esc(v)}</button>`).join("");
    html+=`<button type="button" class="chip chip-add" onclick="eAddCustomChip('${field}','${esc(customLabel)}')">+ Add ${esc(customLabel)}</button>`;
  }
  html+=`</div>`;
  return html;
}
function eAddCustomChip(field,label){
  const v=(window.prompt(`Add a custom ${label}:`,"")||"").trim();
  if(!v) return;
  const sel=S._edit.sets[field];
  if([...sel].some(x=>x.toLowerCase()===v.toLowerCase())){ toast(`"${v}" is already added`); return; }
  sel.add(v);
  // No dedicated re-render for this modal (unlike the wizard's renderWiz()),
  // and rebuilding the whole modal here would wipe any other not-yet-saved
  // chip edits the person has made - so just insert the new chip directly,
  // reusing the exact same toggle handler as every other chip in this group.
  const wrap=document.getElementById("ec-chips-"+field);
  if(!wrap) return;
  const btn=document.createElement("button");
  btn.type="button"; btn.className="chip on"; btn.dataset.v=v; btn.textContent=v;
  btn.onclick=function(){ const s=S._edit.sets[field]; s.has(this.dataset.v)?s.delete(this.dataset.v):s.add(this.dataset.v); this.classList.toggle("on"); };
  const addBtn=wrap.querySelector(".chip-add");
  if(addBtn) wrap.insertBefore(btn,addBtn); else wrap.appendChild(btn);
}
// Real per-view/per-impression rate input, only shown for those two types —
// filling this in (and saving) is what makes this tier real-money-usable via
// buyOffer() (see openPoolBuyModal below), not just descriptive text like
// every other type here. Left blank, the row still saves exactly as before
// (decorative only) — no existing listing is forced to add this.
function editPriceRateHtml(i,type,ratePence){
  if(type!=="per-view" && type!=="per-imp") return "";
  const unit = type==="per-imp" ? "impressions" : "views";
  const val = ratePence ? (Number(ratePence)/100) : "";
  return `<div><label>Rate per 1,000 verified ${unit} (£, leave blank if this is descriptive-only)</label><input type="number" id="ep-rate-${i}" value="${val}"></div>`;
}
function editPriceTypeChange(i){
  const type=($("ep-type-"+i)||{}).value||"fixed";
  const host=$("ep-rate-wrap-"+i); if(host) host.innerHTML=editPriceRateHtml(i,type,null);
  const lbl=$("ep-amt-label-"+i);
  if(lbl) lbl.textContent = (type==="per-view"||type==="per-imp") ? "Guaranteed floor (£, optional)" : "Amount (£)";
}
function editPriceRow(i,p){
  p=p||{type:"fixed",label:"",detail:"",amount:0};
  const isPool = p.type==="per-view"||p.type==="per-imp";
  return `<div class="pm-slot" data-idx="${i}">
    <div class="row2">
      <div><label>Type</label><select id="ep-type-${i}" onchange="editPriceTypeChange(${i})">${PM_ORDER.map(k=>`<option value="${k}" ${p.type===k?"selected":""}>${PM_MODELS[k].label}</option>`).join("")}</select></div>
      <div><label id="ep-amt-label-${i}">${isPool?"Guaranteed floor (£, optional)":"Amount (£)"}</label><input type="number" id="ep-amount-${i}" value="${Number(p.amount)||0}"></div></div>
    <div id="ep-rate-wrap-${i}">${editPriceRateHtml(i,p.type,p.rate_pence)}</div>
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
    const isPool = type==="per-view"||type==="per-imp";
    const ratePounds = isPool ? Number((($("ep-rate-"+i)||{}).value)||0) : 0;
    if(ratePounds>0){
      out.push({type,label:label||PM_MODELS[type].label,detail,amount,
        rate_pence:Math.round(ratePounds*100), rate_qty:1000});
    } else if(label||amount>0){
      out.push({type,label:label||PM_MODELS[type].label,detail,amount});
    }
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
      <div><label>Niches</label>${editChips("niches",ALL_NICHES,"niche")}</div>
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
      <div><label>Niches</label>${editChips("niches",ALL_NICHES,"niche")}</div>
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
    ? `<p class="m-sub">This ${noun} has <b>${n} deal${n===1?"":"s"}</b> attached${live?` (<b>${live}</b> still live)`:""}, so it can't be deleted outright. Those records, and any reviews and completed-campaign history built on them, would be lost.</p>
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
      ? `Removed from the marketplace: ${res.deals_total} deal record${res.deals_total===1?"":"s"} kept ✓`
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
    <div class="det-sec"><h5>Offers & pricing: set by ${esc(l.owner.split(" ")[0])}</h5>
      ${l.pricing.map((p,i)=>`<div class="offer-row">
        <span class="tag ind offer-kind">${PM_LABEL[p.type]}</span>
        <div class="oi"><b>${esc(p.label)}</b><small>${esc(p.detail)}</small></div>
        <span class="op">${priceTagHtml(p)}</span>
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
    body = `<div class="det-sec"><h5>My Work: content samples</h5>
      ${work.length
        ? `<div class="work-grid">${work.map(m=>workCardHtml(l,m,meOwner)).join("")}</div>`
        : `<p class="det-p">${meOwner?"Showcase your content style, upload a video, or add a link to content hosted elsewhere with its own cover image.":"No work samples yet."}</p>`}
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
      ${nothing?`<p class="det-p" style="grid-column:1/-1">${meOwner?"Add a previous campaign below, attach a video if you have one.":"No campaigns completed yet. Every completed deal appears here automatically with its verified results."}</p>`:""}
    </div>${meOwner&&!l.example?mediaUploadForm(l,"past_campaign"):""}
    <div class="note" style="margin-top:14px">Delivery ≠ performance: past results are evidence of reach, not a guarantee of sales or virality, unless written into a funded performance agreement.</div></div>`;
  } else {
    body = l.example
      ? `<div class="det-sec"><h5>What businesses say</h5><div class="note blue" style="margin-bottom:12px">These are illustrative example reviews, real reviews appear only after a completed deal.</div>
      ${revs.map(r=>`<div class="rev-item ex-review"><div class="rvtop"><span class="rev-who"><span class="rev-dot">${esc(initials(r.name))}</span><b>${esc(r.name)} · ${esc(r.co)}</b><span class="tag ex-tag rev-ex">EXAMPLE</span></span><span class="stars">${"★".repeat(r.stars)}${"☆".repeat(5-r.stars)}</span></div><p>${esc(r.text)}</p></div>`).join("")}</div>`
      : (realReviews.length
        ? `<div class="det-sec"><h5>What businesses say${realRevAvg!=null?` · ⭐ ${realRevAvg.toFixed(1)} (${realRevCount})`:""}</h5>
          ${realReviews.map(r=>`<div class="rev-item"><div class="rvtop"><span class="stars">${"★".repeat(r.rating)}${"☆".repeat(5-r.rating)}</span></div>${r.text?`<p>${esc(r.text)}</p>`:""}</div>`).join("")}</div>`
        : `<div class="det-sec"><h5>What businesses say</h5><div class="empty-state small"><div class="es-ico">📝</div><h4>No reviews yet</h4><p>Reviews appear here once a business completes a deal with ${esc(l.name)} and leaves feedback. Every review is tied to a real, funded transaction.</p></div></div>`);
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
    ${others.length?`<div style="padding:16px 28px 0"><div class="det-sec" style="margin:0"><h5>Also from ${esc(l.brand)}: ${others.length} more platform${others.length>1?"s":""}</h5>
      <div class="other-plats">${others.map(o=>`<div class="op-row" onclick="openListing('${o.id}')">${pfp(o.name,o.platform,"")}<div><b>${esc(o.name)}</b><small>${o.platform} · ${fmtN(o.audience)} ${o.platform==="Newsletter"?"subs":o.platform==="Discord"?"members":"followers"}${priceFrom(o)?" · from "+gbp(priceFrom(o)):""}</small></div><span class="op-go">View →</span></div>`).join("")}</div></div></div>`:""}
    <div class="det-tabs">${tabs.map(([k,lab])=>`<button class="det-tab ${tab===k?"on":""}" onclick="openListing('${l.id}','${k}')">${lab}</button>`).join("")}</div>
    <div class="det-body">${body}</div>`,"wide");
}
function requestQuote(id){
  const l=findListing(id); if(!l) return;
  const subj=chatSubject(id);
  if(!subj || !subj.real){ openModal(exampleChat(subj||{name:l.name})); return; }
  if(!S.account){ authGate("login"); return; }
  if(String(subj.otherId)===String(S.account.id)){ toast("That's your own listing."); return; }
  openModal(`<div class="m-pad"><h3 class="m-title">Request a custom quote from ${esc(l.name)}</h3>
    <p class="m-sub">${esc(l.owner.split(" ")[0])} will reply with a personalised proposal you can accept, decline, or counter.</p>
    <div class="frm">
      <div><label>What do you need?</label><textarea id="rq-txt">We're launching a new product in your niche, could you put together a proposal for a 2-video package plus a 7-day link placement?</textarea></div>
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
       They'll be notified. PromoSlot never writes a reply on their behalf; any proposal
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
  if(fresh) noteDetailView();   // see openListing — deferred until the modal closes
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
      <div class="ad-row"><span class="k">Product samples</span><span class="v">${c.samples?"Yes, supplied free":"Not offered"}</span></div>
      <div class="ad-row"><span class="k">Previous collaborations</span><span class="v">${esc(c.profile.collabs)}</span></div>
      <div class="ad-row"><span class="k">Active campaigns</span><span class="v">${allCampaigns().filter(x=>x.company===c.company).length} live on PromoSlot</span></div>
    </div></div>`;
  } else {
    body = c.example
      ? `<div class="det-sec"><h5>What platform owners say about ${esc(c.company)}</h5><div class="note blue" style="margin-bottom:12px">These are illustrative example reviews, real reviews appear only after a completed deal.</div>
      ${revs.map(r=>`<div class="rev-item ex-review"><div class="rvtop"><span class="rev-who"><span class="rev-dot">${esc(initials(r.name))}</span><b>${esc(r.name)}</b><span class="tag ex-tag rev-ex">EXAMPLE</span></span><span class="stars">${"★".repeat(r.stars)}${"☆".repeat(5-r.stars)}</span></div><p>${esc(r.text)}</p></div>`).join("")}</div>`
      : (cRealReviews.length
        ? `<div class="det-sec"><h5>What platform owners say about ${esc(c.company)}${cRevAvg!=null?` · ⭐ ${cRevAvg.toFixed(1)} (${cRevCount})`:""}</h5>
          ${cRealReviews.map(r=>`<div class="rev-item"><div class="rvtop"><span class="stars">${"★".repeat(r.rating)}${"☆".repeat(5-r.rating)}</span></div>${r.text?`<p>${esc(r.text)}</p>`:""}</div>`).join("")}</div>`
        : `<div class="det-sec"><h5>What platform owners say about ${esc(c.company)}</h5><div class="empty-state small"><div class="es-ico">📝</div><h4>No reviews yet</h4><p>Reviews appear here once a platform owner completes a deal with ${esc(c.company)} and leaves feedback. Every review is tied to a real, funded transaction.</p></div></div>`);
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
  if(!msgs||!msgs.length) return `<div class="thread-empty" style="min-height:120px"><div class="es-ico">✉️</div><p>No messages yet, say hello.</p></div>`;
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
    <div style="padding:12px 16px 0"><div class="note blue" style="margin:0">🧪 This is an <b>example ${subj.kind==="campaign"?"campaign":"profile"}</b>: there's no real account here, so messages aren't delivered. Real conversations begin when members join. PromoSlot never writes replies on anyone's behalf.</div></div>
    <div class="chat-msgs" style="min-height:120px"><div class="thread-empty"><div class="es-ico">✉️</div><p>Example: messaging is disabled here.</p></div></div>
  </div>`;
}
async function openChat(id){
  const subj=chatSubject(id); if(!subj) return;
  if(!subj.real){ openModal(exampleChat(subj)); return; }
  if(!S.account){ authGate("login"); return; }
  if(String(subj.otherId)===String(S.account.id)){ toast("That's your own, you can't message yourself."); return; }
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
  "Hi, could you share your availability for the next few weeks?",
  "What would you charge for a one-off promotional video?",
  "Could you send recent performance figures for a similar post?",
  "Is the price negotiable for a multi-post package?",
  "Happy to proceed, shall I open a deal so the funds are held pending verification?",
];
function msgSuggestHtml(){
  return `<aside class="msg-suggest"><h5>Suggested messages</h5>
    ${MSG_SUGGESTIONS.map((t,i)=>`<button type="button" onclick="useSuggestion(${i})">${esc(t)}</button>`).join("")}
    <p class="ms-hint">Tap one to drop it into the box. Nothing sends until you press Send.</p></aside>`;
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
  if(!S.account){ authGate("login"); return; }
  showView("view-messages");
  await loadConvos();
  if(!S.activeConv || !(S.convos||[]).some(c=>String(c.id)===String(S.activeConv))){
    S.activeConv=(S.convos[0]&&S.convos[0].id)||null; S.activeThread=null;
  }
  // Always refetch, never reuse a cached thread: coming back to Messages has to
  // show anything that arrived while you were away (and mark it read) rather
  // than redisplaying the copy from last time.
  if(S.activeConv){ try{ S.activeThread=await PSApi.get(`/conversations/${S.activeConv}/messages`); }catch(e){} }
  loadNotifications();                // fetching the thread marked it read — reflect that now
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
  const head=`<div class="msgs-head"><h2>Messages</h2></div>`;
  if(!convos.length){
    $("msgsWrap").innerHTML=`${head}
      <div class="empty-state"><div class="es-ico">💬</div><h4>No conversations yet</h4><p>Message a platform owner or business from their profile to start a conversation. Your real threads show up here, nothing is pre-filled.</p><button class="btn btn-o btn-sm" onclick="openMarket()">Browse the marketplace</button></div>`;
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
    <div style="padding:12px 16px 0"><div class="note grey" style="margin:0"><b>Welcome to Messages.</b> You're free to discuss anything here: pricing, timelines, ideas, whatever's useful. If you do reach an agreement, make sure it's reflected in your listing or campaign, with the other party buying or applying to it. That's what allows PromoSlot to verify delivery and release the correct payout.</div></div>
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
    toast("This is an example listing. Buy from a real listing to transact."); return;
  }
  if(!S.account){ authGate("login"); return; }
  // Was a dead-end toast with no path forward. Same mismatched-active-role
  // case marketCtaClick() had — a platform-owner-active account browsing the
  // marketplace can reach "buy" on a listing same as anyone else.
  if(!S.roles.includes("biz")){ requireRole("biz", ()=>buyOffer(listingId,priceIdx)); return; }
  // A real per-view/per-impression tier (rate_pence set via the "Edit
  // listing"/onboarding pricing editor) needs a budget + duration from the
  // buyer before it can become a real Deal — see openPoolBuyModal below.
  // amount alone can legitimately be 0 here (a pure per-view tier with no
  // guaranteed floor), so the old "amount<=0 → quote" check would have
  // wrongly sent these to Request a quote; check rate_pence first.
  if(p.rate_pence>0){ openPoolBuyModal(listingId,priceIdx); return; }
  const amount=Number(p.amount)||0;
  if(amount<=0){ toast("Commission / custom offers, use “Request a quote”."); requestQuote(listingId); return; }
  const listed_price=Math.round(amount*100); // offer amount is in pounds → pence
  try{
    const deal=await PSApi.post("/deals",{platform_owner_id:parseInt(l.ownerId,10),listed_price,currency:"gbp",
      terms:{offer:p.label,detail:p.detail,deliverables:p.label,platform:l.platform,owner:l.name,listing_id:l.id}});
    closeModal(); showView("view-deal"); renderRealDeal(deal.id);
    toast("Deal created, review & approve the agreement",true);
  }catch(err){ toast(err.message||"Could not create deal"); }
}
// Second step for a per-view/per-impression tier: the listing only defines
// the rate (and optional guaranteed floor); the budget commitment and
// campaign duration are the buyer's own choice, made here at purchase time —
// matches Deal.pricing_model in backend/models.py, which collects
// pool_max_budget/campaign_duration_days at deal creation, not listing time.
function openPoolBuyModal(listingId, priceIdx){
  const l=findListing(listingId); const p=l.pricing[priceIdx];
  const unit = p.type==="per-imp" ? "impressions" : "views";
  const rate = ((Number(p.rate_pence)||0)/100).toFixed(2);
  const floor = Number(p.amount)||0;
  openModal(`<div class="m-pad"><h3 class="m-title">${esc(p.label||"Performance deal")}</h3>
    <p class="m-sub">£${rate} per 1,000 verified ${unit}${floor>0?` · £${floor} guaranteed floor`:""}. Choose a budget and duration — you're only ever charged up to your budget, held in Payment Protection until delivery is verified.</p>
    <div class="frm"><div class="row2">
      <div><label>Budget to commit (£)</label><input type="number" id="pb-budget" value="${Math.max(50,Math.ceil(floor))}"></div>
      <div><label>Campaign duration (days)</label><input type="number" id="pb-days" value="30" min="1" max="60"></div>
    </div></div>
    <div class="m-actions"><button class="btn btn-o" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="confirmPoolBuy('${listingId}',${priceIdx})">Continue</button></div></div>`);
}
async function confirmPoolBuy(listingId, priceIdx){
  const l=findListing(listingId); const p=l.pricing[priceIdx];
  const budget=Number((($("pb-budget")||{}).value)||0);
  const days=Math.round(Number((($("pb-days")||{}).value)||0));
  if(!(budget>=1)){ toast("Enter a budget of at least £1"); return; }
  if(!(days>=1 && days<=60)){ toast("Duration must be between 1 and 60 days"); return; }
  const floor=Number(p.amount)||0;
  try{
    const deal=await PSApi.post("/deals",{platform_owner_id:parseInt(l.ownerId,10),
      listed_price: floor>0 ? Math.round(floor*100) : 0,
      currency:"gbp",
      pricing_model: p.type==="per-imp" ? "per_impression" : "per_view",
      rate_unit_pence: p.rate_pence, rate_unit_quantity: p.rate_qty||1000,
      pool_max_budget: Math.round(budget*100),
      campaign_duration_days: days,
      terms:{offer:p.label,detail:p.detail,deliverables:p.label,platform:l.platform,owner:l.name,listing_id:l.id}});
    closeModal(); showView("view-deal"); renderRealDeal(deal.id);
    toast("Deal created, review & approve the agreement",true);
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
  if(!S.account){ authGate("login"); return; }
  setRoute("profile", userId);
  let p; try{ p=await PSApi.get(`/users/${userId}/public`); }catch(e){ toast("Couldn't load that profile"); return; }
  const roles=[]; if(p.is_business)roles.push("Business"); if(p.is_platform_owner)roles.push("Platform owner");
  const stars = p.rating!=null ? `⭐ ${p.rating.toFixed(1)} (${p.review_count})` : "No rating yet";
  const listings = p.listings&&p.listings.length ? `<div class="det-sec"><h5>Listings</h5>${p.listings.map(l=>`<div class="op-row" onclick="closeModal();openListing('${l.id}')">${pfp(l.name,l.platform,"",l.ownerAvatar)}<div><b>${esc(l.name)}</b><small>${esc(l.platform)} · ${fmtN(l.audience)}</small></div><span class="op-go">View →</span></div>`).join("")}</div>` : "";
  // Mirror the listing's sections on the profile: services & pricing, audience
  // & analytics, My Work, past campaigns — all from the same real data.
  const svc = (p.listings||[]).filter(l=>(l.services&&l.services.length)||(l.pricing&&l.pricing.length)).map(l=>
    `<div class="det-sec"><h5>Services &amp; pricing: ${esc(l.name)}</h5>
      ${l.services&&l.services.length?`<div class="tagrow" style="margin-bottom:8px">${l.services.map(x=>`<span class="tag">${esc(x)}</span>`).join("")}</div>`:""}
      ${(l.pricing||[]).map(pr=>`<div class="offer-row"><span class="tag ind offer-kind">${esc(PM_LABEL[pr.type]||pr.type||"")}</span>
        <div class="oi"><b>${esc(pr.label||"")}</b><small>${esc(pr.detail||"")}</small></div>
        <span class="op">${priceTagHtml(pr)}</span></div>`).join("")}</div>`).join("");
  const aud = (p.listings||[]).map(l=>
    `<div class="det-sec"><h5>Audience &amp; analytics: ${esc(l.name)} ${l.verified?'<span class="tag grn">Verified ✔</span>':'<span class="tag">Self-reported</span>'}</h5>
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
    : `<div class="det-sec"><h5>Reviews</h5><p class="mut" style="font-size:13px">No reviews yet, a rating appears after a completed deal.</p></div>`;
  const intro = p.intro_video_url ? `<div class="det-sec pintro"><h5>Who we are: video</h5><video controls preload="metadata" src="${p.intro_video_url}"></video></div>` : "";
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
  const disputeOpen = !!d.payment_dispute_open;
  const graceOpen = !!d.proof_grace_deadline && new Date(d.proof_grace_deadline) > new Date();
  let proofs=[];
  if(d.funded && (meBiz||meOwner||isReviewer)){ try{ proofs=await PSApi.get("/deals/"+dealId+"/proofs"); }catch(e){} }
  let checklist=[];
  if(d.funded && (meBiz||meOwner||isReviewer)){ try{ checklist=(await PSApi.get("/deals/"+dealId+"/delivery-checklist")).items; }catch(e){} }
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
    <div class="ad-row"><span class="k">Listed price${d.pricing_model!=="fixed"?" (guaranteed floor)":""}</span><span class="v">${gbpP(d.listed_price)}</span></div>
    ${d.pricing_model!=="fixed"?`
    <div class="ad-row"><span class="k">Pricing model</span><span class="v">${d.pricing_model==="per_impression"?"Per impression":"Per view"}${d.listed_price>0?" + guaranteed floor":""}</span></div>
    <div class="ad-row"><span class="k">Rate</span><span class="v">£${((d.rate_unit_pence||0)/100).toFixed(2)} per ${fmtN(d.rate_unit_quantity||1000)} verified ${d.pricing_model==="per_impression"?"impressions":"views"}</span></div>
    <div class="ad-row"><span class="k">Budget committed</span><span class="v">${gbpP(d.pool_max_budget||0)}</span></div>
    <div class="ad-row"><span class="k">Campaign duration</span><span class="v">${d.campaign_duration_days||0} days${d.campaign_starts_at?` · starts ${new Date(d.campaign_starts_at).toLocaleDateString("en-GB")}`:""}</span></div>`:""}
    <!-- Fixed-portion fee breakdown below (buyer protection fee / seller fee / net to
         owner / platform take) is exactly that — the fixed/guaranteed slice only.
         For a pool deal, "Total charged to business" already includes the pool's
         own fees; there is no separate per-pool fee row since the pool only
         settles (and only then incurs its fee) once verified quantity is known. -->
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
    <p class="deal-sub">This deal was cancelled before funding, no money moved. ${d.terms&&d.terms.kind==="application"?"The application is closed; the owner can apply again with new terms.":""}</p>
    ${doc}`;
  } else if(!d.funded){
    // The other side withdrew the listing/campaign this deal came from before it
    // was funded. Say so plainly instead of showing "waiting for funding"
    // indefinitely — the deal stays in history either way.
    const gone = d.source_removed;                       // "listing" | "campaign" | null
    const goneWord = gone==="campaign" ? "Campaign" : "Listing";
    const goneNote = gone ? `<div class="note" style="margin-top:0;margin-bottom:14px">
      <b>${goneWord} removed by ${gone==="campaign"?"the business":"the owner"}.</b>
      This deal was never funded, and the ${gone} it came from has since been taken down,
      so it is not going ahead. No money moved. It stays here in your deal history for
      your records.</div>` : "";
    main=`${goneNote}<h3 class="deal-h">${gone?`${goneWord} removed: deal not going ahead`:(bothApproved?"Fund the deal":"Approve the agreement")}</h3>
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
    main=`<h3 class="deal-h">Funded: ${gbpP(d.total_charged)} held pending verification 🔒</h3>
    <p class="deal-sub">Money held by PromoSlot. The owner delivers &amp; submits proof → a reviewer verifies → the owner is paid ${gbpP(d.net_to_owner)} (listed price − ${d.seller_fee_percent}% seller fee).</p>
    ${graceOpen ? `<div class="note">⏳ <b>Proof-update grace period open until ${new Date(d.proof_grace_deadline).toLocaleString("en-GB")}.</b>
      ${meOwner ? "A reviewer wants a chance to see more delivery proof before this is finalized. Add anything further to your submitted evidence below before the deadline." : ""}
      ${meBiz ? "PromoSlot has asked the platform owner for additional delivery proof before finalizing payout. This is routine caution, not an accusation." : ""}
      ${isReviewer ? "Settlement/approval is blocked until this closes, or the owner resubmits." : ""}</div>` : ""}
    ${doc}
    <div class="det-sec" style="margin-top:18px"><h5>Progress</h5>
      <div class="proof-item got"><span class="pi-ico">🔒</span>Payment Protection funded<span class="ok">✓</span></div>
      <div class="proof-item ${d.verified?"got":""}"><span class="pi-ico">🔎</span>Delivery verified by a reviewer<span class="ok">${d.verified?"✓":"pending"}</span></div>
      <div class="proof-item ${d.paid?"got":""}"><span class="pi-ico">💸</span>Payout released to owner<span class="ok">${d.paid?"✓ "+gbpP(d.instant_paid?d.instant_net_amount:d.net_to_owner)+(d.instant_paid?" (instant)":""):"pending"}</span></div></div>
    ${!d.verified && checklist.length ? `<div class="det-sec"><h5>Delivery Checklist</h5>
      <p class="mut" style="font-size:12.5px;margin:0 0 8px">${meOwner
        ? "What to submit as proof. Ticking these is just for your own reference, it doesn't submit anything, and PromoSlot always verifies delivery independently regardless of what's checked."
        : "What we ask the platform owner to submit as proof of delivery for this deal."}</p>
      ${checklist.map(it=>`<label class="proof-item" style="cursor:${meOwner?"pointer":"default"}" onchange="this.classList.toggle('got',this.querySelector('input').checked)">
        <input type="checkbox" style="width:16px;height:16px;accent-color:var(--acc);flex-shrink:0" ${meOwner?"":"disabled"}>
        <span>${esc(it.label)}</span></label>`).join("")}</div>` : ""}
    <div class="det-sec"><h5>Delivery evidence</h5>${proofList}
      ${meOwner && proofs.length ? (d.paid
        ? (d.instant_paid
          ? `<p class="review-thanks ok-txt" style="margin-top:10px">✓ Verified &amp; paid instantly: your evidence met PromoSlot's delivery conditions, and ${gbpP(d.instant_net_amount)} (after Stripe's instant-payout fee) was sent to your account. It should land within about 30 minutes.</p>`
          : `<p class="review-thanks ok-txt" style="margin-top:10px">✓ Verified &amp; paid: your evidence met PromoSlot's delivery conditions, and ${gbpP(d.net_to_owner)} has been sent to your connected account. Bank transfers can take up to 7 days to land, especially on newer accounts. No action needed on your end.</p>`)
        : d.verified
          ? `<p class="review-thanks ok-txt" style="margin-top:10px">✓ Verified: your evidence met PromoSlot's delivery conditions. Payout is being released to your account now.</p>`
          : `<p class="review-thanks" style="margin-top:10px">Thank you for submitting proof of delivery, your submission will be reviewed by our team shortly</p>`
      ) : ""}
      ${meOwner && d.paid && !d.instant_paid ? `<div style="margin-top:10px"><button class="btn btn-o btn-sm" id="instantBtn-${d.id}" onclick="realInstantPayout(${d.id})">⚡ Get paid now, 1% fee</button></div>` : ""}
      ${meOwner && !d.verified && !disputeOpen ? `<div class="frm" style="margin-top:10px">
        <div><label>Views delivered (optional, shown on your Past campaigns)${d.views_promised?` · ${fmtN(d.views_promised)} promised`:""}</label>
          <input type="number" id="pf-views" min="0" placeholder="e.g. 12500" value="${d.views_delivered!=null?d.views_delivered:""}"></div>
        <div id="pf-slots">${proofSlotHtml(0)}</div>
        <div style="margin-top:8px"><button class="btn btn-ghost btn-sm" onclick="addProofSlot()">＋ Add another item</button></div>
        <button class="btn btn-p btn-sm" style="margin-top:10px" onclick="realSubmitProof(${d.id})">Submit evidence</button></div>` : ""}</div>
    ${isReviewer && !disputeOpen ? reviewerControls(d, proofs.length) : ""}
    ${(d.paid && (meBiz||meOwner)) ? (myReview
      ? `<p class="review-thanks">– Thank you for leaving a review, your response has been submitted</p>`
      : `<div class="btn-row"><button class="btn btn-p" onclick="realReviewModal(${d.id})">⭐ Leave a review</button></div>`) : ""}`;
  }
  // Read-only for both parties: never the raw backend status string when a
  // dispute is open (that string is literally "disputed" server-side, which
  // both parties should never see — reads as an internal delivery dispute,
  // not a card-network chargeback). Compound with Paid when relevant, per
  // spec: "Paid · Payment dispute under review", never a bare "Disputed".
  const statusLabel = disputeOpen
    ? (d.paid ? "Paid · Payment dispute under review" : "Payment dispute under review")
    : (d.source_removed ? (d.source_removed==="campaign"?"Campaign removed":"Listing removed") : d.status);
  const statusCls = disputeOpen ? "st-dispute" : (d.paid?"st-done":d.funded?"st-escrow":"st-review");
  const disputeNotice = disputeOpen ? `<div class="dispute-notice">
    <b>Payment dispute under review.</b> PromoSlot is handling this case directly with Stripe
    and will contact ${meBiz||meOwner?"you":"the relevant party"} if anything is needed.
    No action is required from either side right now.</div>` : "";
  $("dealWrap").innerHTML=`
    <div class="deal-top"><button class="btn btn-ghost" onclick="openDash()">← Dashboard</button><h2>Deal ${d.id}</h2>
      <span class="deal-status status-pill ${statusCls}">${esc(statusLabel)}</span></div>
    ${stepper}
    <div class="deal-grid"><div class="deal-main view-anim">${disputeNotice}${main}</div>
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
  if(!confirm("Decline and cancel this deal? This can't be undone, no money has moved.")) return;
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
    ${String(r.publishable_key||"").startsWith("pk_live_")?"":'<p class="mut" style="font-size:12px;margin-top:8px">Test card: 4242 4242 4242 4242 · any future expiry · any CVC.</p>'}`;
  if(typeof Stripe==="undefined"){ const e=$("pay-err"); e.textContent="Stripe.js failed to load."; e.classList.remove("hide"); return; }
  const stripe=Stripe(r.publishable_key);
  const elements=stripe.elements({clientSecret:r.client_secret});
  const pe=elements.create("payment");
  pe.mount("#payment-element");
  window._stripeCtx={stripe,elements,dealId,total:r.total_charged};
}
function cardErrorMessage(err){
  // Stripe's raw err.message can be verbose/internal-sounding (e.g. the live-mode
  // test-card decline text). Show a short, consistent, customer-facing message
  // instead, with just enough hint to be actionable.
  if(!err) return "Something went wrong, please try again.";
  const code=err.code||"";
  if(code==="incomplete_number"||code==="incorrect_number") return "Card Invalid: check the card number.";
  if(code==="incomplete_expiry"||code==="invalid_expiry_month"||code==="invalid_expiry_year"||code==="expired_card") return "Card Invalid: check the expiry date.";
  if(code==="incomplete_cvc"||code==="incorrect_cvc") return "Card Invalid: check the security code.";
  return "Card Invalid: please check your details or try a different card.";
}
async function realPay(){
  const ctx=window._stripeCtx; if(!ctx) return;
  const btn=$("pay-btn"); btn.disabled=true; btn.innerHTML=`<span class="spin"></span> Processing…`;
  const res=await ctx.stripe.confirmPayment({elements:ctx.elements, redirect:"if_required"});
  if(res.error){ btn.disabled=false; btn.textContent="Pay "+gbpP(ctx.total); const e=$("pay-err"); e.textContent=cardErrorMessage(res.error); e.classList.remove("hide"); return; }
  // Reconcile with the backend (real Stripe re-verify; the deal funds only if
  // Stripe confirms the PaymentIntent succeeded).
  try{ await PSApi.post(`/deals/${ctx.dealId}/refresh`); }catch(e){}
  window._stripeCtx=null;
  toast("Payment successful, Payment Protection funded 🔒",true);
  renderRealDeal(ctx.dealId);
}
function reviewerControls(d, proofCount){
  let inner;
  const isPool = d.pricing_model==="per_view" || d.pricing_model==="per_impression";
  const graceOpen = !!d.proof_grace_deadline && new Date(d.proof_grace_deadline) > new Date();
  if(!d.verified){
    // Verification step — three distinct outcomes. Verifying does NOT pay out.
    inner = proofCount>0
      ? `<p class="mut" style="font-size:12.5px;margin-bottom:9px">Verifying only confirms the evidence meets the agreed terms, it does <b>not</b> release money. Payout is a separate step you take afterwards.</p>
         <div class="btn-row">
           <button class="btn btn-g btn-sm" onclick="realVerify(${d.id},'approved')">✓ Verify: evidence meets terms</button>
           <button class="btn btn-o btn-sm" onclick="realVerify(${d.id},'rejected')">↩︎ Send back for revision</button>
           <button class="btn btn-danger btn-sm" onclick="realRefund(${d.id})">✕ Disapprove &amp; refund business</button>
         </div>
         ${isPool && !graceOpen ? `<div style="margin-top:9px"><button class="btn btn-ghost btn-sm" onclick="realOpenGracePeriod(${d.id})">⏳ Suspect underdelivery: give the owner 24h to add proof</button></div>` : ""}
         ${isPool && graceOpen ? `<p class="mut" style="font-size:12.5px;margin-top:9px">Grace period already open until ${new Date(d.proof_grace_deadline).toLocaleString("en-GB")} . Wait for it to close, or for the owner to resubmit, before approving.</p>` : ""}`
      : `<p class="mut" style="font-size:12.5px">Waiting for the owner to submit evidence before you can verify.</p>`;
  } else if(!d.paid){
    // Verified but unpaid — payout is a separate, deliberate action (also on the Awaiting Payouts page).
    inner = `<div class="note blue" style="margin:0 0 10px">✓ Verified: <b>awaiting payout</b>. Releasing funds is a separate action; do it now or later from <b>Awaiting Payouts</b>.</div>
      <div class="btn-row">
        <button class="btn btn-g btn-sm" onclick="realRelease(${d.id})">💸 Release payout: ${gbpP(d.net_to_owner)} to owner</button>
        <button class="btn btn-danger btn-sm" onclick="realRefund(${d.id})">✕ Refund business instead</button>
      </div>`;
  } else {
    inner = `<p class="ok-txt" style="font-size:13px">✓ Verified &amp; paid out, deal complete.</p>`;
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
      <span class="dz-text" id="pf-dzt-${idx}">Drag &amp; drop a file here, or <label for="pf-file-${idx}" class="dz-link">select file</label>, any type</span>
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
  t.innerHTML = f ? `📎 ${esc(f.name)} · <label for="pf-file-${idx}" class="dz-link">change</label>`
                  : `Drag &amp; drop a file here, or <label for="pf-file-${idx}" class="dz-link">select file</label>, any type`;
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
async function realInstantPayout(dealId){
  const btn=$("instantBtn-"+dealId);
  if(!confirm("Get paid instantly? Stripe charges a small fee for instant payouts (typically around 1%), deducted automatically from what you receive. Funds should land within about 30 minutes instead of the standard schedule.")) return;
  if(btn){ btn.disabled=true; btn.innerHTML=`<span class="spin"></span> Sending…`; }
  try{
    await PSApi.post(`/deals/${dealId}/payout/instant`);
    toast("Instant payout sent, should land within about 30 minutes ⚡",true);
  }catch(err){
    toast(err.message||"Could not send instant payout");
    if(btn){ btn.disabled=false; btn.innerHTML="⚡ Get paid now, 1% fee"; }
  }
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
    ? "Verified ✓, moved to Awaiting Payouts (release payout separately when ready)"
    : "Sent back to the owner for revision", true);
  loadNotifications();
  renderRealDeal(dealId);
}
async function realOpenGracePeriod(dealId){
  const reason=adminReasonPrompt("Open a 24-hour proof-update grace period"); if(reason===null) return;
  const note=window.prompt("Message to the platform owner: what should they add or clarify? (sent to them by app and email)","");
  if(note===null) return;
  if(!note.trim()){ toast("A message to the owner is required"); return; }
  try{
    await PSApi.post(`/review/deals/${dealId}/verify`,
      {decision:"changes_requested", reason, notes:note.trim(), evidence_reviewed:true, open_grace_period:true});
  }catch(err){ toast(err.message||"Could not open grace period"); return; }
  toast("Grace period opened, owner notified, 24 hours to add proof",true);
  loadNotifications();
  renderRealDeal(dealId);
}
async function realRelease(dealId){
  const reason=adminReasonPrompt("Release this payout"); if(reason===null) return;
  try{ const r=await PSApi.post(`/review/deals/${dealId}/release`,{reason,evidence_reviewed:true});
    toast("Payout released: "+gbpP(r.net_to_owner)+" to owner 💸",true); }
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
  closeModal(); toast("Review published, thanks for keeping the marketplace honest",true);
  loadMarket();          // refresh cached ratings so profiles/cards reflect it immediately
  renderRealDeal(dealId); // re-render: the review option is now replaced by the thank-you
}
// Applying to a campaign creates a REAL owner-initiated deal (backend), which the
// business then approves and funds — the same escrow flow as a bought offer, only
// the platform owner starts it. Example campaigns can't transact.
// Payment-method models — same set as the platform-listing pricing builder,
// reused here so an applicant can propose one or more payment methods, each with
// its own relevant fields. The upfront/guaranteed portion is escrowed.
// "per-view"/"per-imp" are the only two that create a REAL structured pool
// deal (see Deal.pricing_model in backend/models.py) — "budget"/"days" here
// are the applicant's own proposed pool_max_budget/campaign_duration_days,
// since applying originates the whole Deal (owner_approved=True immediately).
// "min" doubles as the optional guaranteed floor; >0 is what backend calls a
// "hybrid" deal — there's deliberately no separate Hybrid option any more,
// see collectApplyPricing/submitApplication below for how it's wired through.
// Every other type here (fixed/time/affiliate/custom) has no backend
// settlement support yet and stays exactly as decorative as it always was.
const PM_MODELS={
  fixed:{label:"Fixed price",fields:[{id:"label",l:"What's included",t:"text",d:"1 promotional post"},{id:"price",l:"Amount (£)",t:"number",d:"100"}],
    amount:v=>Number(v.price)||0, detail:v=>`${v.label||"1 post"} · £${v.price||0} fixed`},
  "per-view":{label:"Per view",fields:[{id:"min",l:"Guaranteed floor (£, optional)",t:"number",d:"0"},{id:"rate",l:"Rate per 1,000 verified views (£)",t:"number",d:"8"},{id:"budget",l:"Your proposed budget cap (£)",t:"number",d:"250"},{id:"days",l:"Campaign duration (days)",t:"number",d:"30"}],
    amount:v=>Number(v.min)||0, detail:v=>`${Number(v.min)?`£${v.min} guaranteed + `:""}£${v.rate||0} per 1,000 verified views · up to £${v.budget||0} over ${v.days||0} days`},
  "per-imp":{label:"Per impression",fields:[{id:"min",l:"Guaranteed floor (£, optional)",t:"number",d:"0"},{id:"rate",l:"Rate per 1,000 verified impressions (£)",t:"number",d:"3"},{id:"budget",l:"Your proposed budget cap (£)",t:"number",d:"250"},{id:"days",l:"Campaign duration (days)",t:"number",d:"30"}],
    amount:v=>Number(v.min)||0, detail:v=>`${Number(v.min)?`£${v.min} guaranteed + `:""}£${v.rate||0} per 1,000 verified impressions · up to £${v.budget||0} over ${v.days||0} days`},
  time:{label:"Time-based",fields:[{id:"price",l:"Price (£)",t:"number",d:"40"},{id:"unit",l:"Per",t:"select",opts:["day","week","month"],d:"week"},{id:"dur",l:"Duration",t:"number",d:"4"}],
    amount:v=>Number(v.price)||0, detail:v=>`£${v.price||0} per ${v.unit||"week"} · ${v.dur||1} ${v.unit||"week"}(s)`},
  affiliate:{label:"Affiliate",fields:[{id:"pct",l:"% per sale",t:"number",d:"12"},{id:"cookie",l:"Cookie window (days)",t:"number",d:"30"},{id:"min",l:"Min payout (£)",t:"number",d:"0"}],
    amount:v=>Number(v.min)||0, detail:v=>`${v.pct||0}% per sale · ${v.cookie||30}-day cookie${Number(v.min)?` · £${v.min} min`:""}`},
  // Kept only so PM_LABEL/PM_MODELS lookups don't break on any pre-existing
  // stored "hybrid" tier — no longer reachable via PM_ORDER, see above.
  hybrid:{label:"Hybrid (guaranteed + performance)",fields:[{id:"guar",l:"Guaranteed (£)",t:"number",d:"50"},{id:"extra",l:"Plus performance terms",t:"text",d:"£5 per 1,000 views"}],
    amount:v=>Number(v.guar)||0, detail:v=>`£${v.guar||0} guaranteed + ${v.extra||"performance"}`},
  custom:{label:"Custom",fields:[{id:"note",l:"Describe the terms",t:"text",d:""}],
    amount:()=>0, detail:v=>v.note||"Custom terms"},
};
const PM_ORDER=["fixed","per-view","per-imp","time","affiliate","custom"];
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
  // At most one per-view/per-imp slot actually drives a real structured Deal
  // (Deal.pricing_model is a single column) — see submitApplication below,
  // which rejects a second one rather than silently dropping it.
  let structured=null, structuredConflict=false;
  document.querySelectorAll("#pm-slots .pm-slot").forEach(s=>{
    const idx=s.dataset.idx, type=($("pm-type-"+idx)||{}).value||"fixed", m=PM_MODELS[type];
    const v={}; m.fields.forEach(f=>{ const el=$(`pm-${idx}-${f.id}`); v[f.id]=el?el.value:""; });
    const amount=m.amount(v);
    if(type==="per-view"||type==="per-imp"){
      if(structured) structuredConflict=true;
      else structured={
        pricing_model: type==="per-imp" ? "per_impression" : "per_view",
        floor: Number(v.min)||0,
        rate_pence: Math.round((Number(v.rate)||0)*100),
        rate_qty: 1000,
        budget_pence: Math.round((Number(v.budget)||0)*100),
        days: Math.round(Number(v.days))||0,
      };
    } else {
      total+=amount;   // structured slot's floor is carried on `structured`, not summed here
    }
    pricing.push({type, label:m.label, detail:m.detail(v), amount, fields:v});
  });
  return {pricing, total, structured, structuredConflict};
}
async function applyCampaign(campId){
  const c=findCampaign(campId); if(!c) return;
  if(c.example || !/^c\d+$/.test(String(c.id))){ toast("This is an example campaign. Apply to a real one to transact."); return; }
  if(!S.account){ authGate("login"); return; }
  // Same fix as buyOffer() above: was a dead-end toast, now offers switching
  // to (or creating) the platform-owner profile and resumes this application.
  if(!S.roles.includes("plat")){ requireRole("plat", ()=>applyCampaign(campId)); return; }
  if(String(c.businessId)===String(S.account.id)){ toast("That's your own campaign, you can review applicants from it."); return; }
  let plats=S.myPlatforms||[];
  if(!plats.length){ try{ plats=await PSApi.get("/platforms/mine"); S.myPlatforms=plats; }catch(e){} }
  const platOpts=plats.map(p=>`<option value="${p.id}">${esc(p.name)} · ${esc(p.platform)}</option>`).join("");
  openModal(`<div class="m-pad"><h3 class="m-title">Apply to “${esc(c.title)}”</h3>
    <p class="m-sub">Propose one or more payment methods and a short pitch. <b>${esc(c.company)}</b> reviews applicants, then approves and funds the upfront amount, held pending verification, before you start work.</p>
    <div class="frm">
      ${plats.length
        ? `<div><label>Promote on</label><select id="ap-plat">${platOpts}</select></div>`
        : `<div class="note blue" style="margin:0">You don't have a listing yet, you can still apply, and add one anytime.</div>`}
      <div><label>Payment methods you propose</label>
        <div id="pm-slots">${pmSlotHtml(0)}</div>
        <div style="margin-top:6px"><button type="button" class="btn btn-ghost btn-sm" onclick="addPmSlot()">＋ add another payment method</button></div>
      </div>
      <div><label>Pitch (optional)</label><textarea id="ap-pitch" placeholder="Why you're a great fit, what you'd deliver, and a rough timeline…"></textarea></div>
    </div>
    <div class="m-actions"><button class="btn btn-o" onclick="openCampaign('${c.id}')">Back</button><button class="btn btn-p" onclick="submitApplication('${String(c.id).replace(/^c/,'')}')">Send application</button></div></div>`);
}
async function submitApplication(cid){
  const {pricing, total, structured, structuredConflict}=collectApplyPricing();
  if(!pricing.length){ toast("Add at least one payment method"); return; }
  if(structuredConflict){ toast("Only one performance-based (per-view or per-impression) payment method can be proposed per application — remove the extra one."); return; }
  const platSel=$("ap-plat");
  const platform_id = platSel ? parseInt(platSel.value,10) : null;
  const pitch=(($("ap-pitch")||{}).value||"").trim();
  let payload;
  if(structured){
    if(!(structured.rate_pence>0)){ toast("Enter a rate per 1,000 for your performance-based method."); return; }
    if(!(structured.budget_pence>=100)){ toast("Enter a proposed budget cap of at least £1 for your performance-based method."); return; }
    if(!(structured.days>=1 && structured.days<=60)){ toast("Campaign duration must be between 1 and 60 days."); return; }
    payload={
      listed_price: structured.floor>0 ? Math.round(structured.floor*100) : 0,
      platform_id: platform_id||null, pitch, pricing,
      pricing_model: structured.pricing_model,
      rate_unit_pence: structured.rate_pence,
      rate_unit_quantity: structured.rate_qty,
      pool_max_budget: structured.budget_pence,
      campaign_duration_days: structured.days,
    };
  } else {
    const listed_price=Math.round(total*100);
    if(!(listed_price>=100)){ toast("At least one method needs an upfront/guaranteed amount (min £1) to hold pending verification."); return; }
    payload={listed_price, platform_id:platform_id||null, pitch, pricing};
  }
  try{
    const deal=await PSApi.post(`/campaigns/${cid}/apply`,payload);
    closeModal(); showView("view-deal"); renderRealDeal(deal.id);
    toast("Application sent, the business will review & approve",true);
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
    main=`<h3 class="deal-h">Step 1: Build the agreement</h3>
    <p class="deal-sub">Either party can revise these terms before approval. Both sides approve the <b>same final agreement</b> before any work begins.</p>
    ${doc}
    <div class="btn-row">
      <button class="btn btn-p" onclick="dealNext('${d.id}')">Looks right, go to approval</button>
      <button class="btn btn-o" onclick="counterOffer('${d.id}')">✏️ Send counter-offer</button>
      <button class="btn btn-danger" onclick="cancelDeal('${d.id}')">Cancel deal</button>
    </div>`;
  } else {
    // Step 2+ — approval, then an honest, read-only roadmap of the gated stages.
    // Deals never auto-advance past approval: funding, proof storage, human
    // verification and payout each require real infrastructure that isn't live.
    const amt=escrowOf(d);
    const exampleBanner = d.example
      ? `<div class="note blue" style="margin:0 0 14px">🧪 This deal is with an <b>example profile</b>, shown so you can preview how PromoSlot documents an agreement. There is no real counterparty to approve, fund or pay. Real deals begin when both accounts are real.</div>`
      : "";
    const theirState = d.theirApproved
      ? '<span class="ok-txt">✓ Approved</span>'
      : '<span class="mut">Waiting for their approval</span>';
    const waitingNote = d.myApproved && !d.theirApproved
      ? pendingPanel("⏳", `Waiting for ${esc(d.with)} to approve`,
          `They approve from their own account. This deal only moves to funding once both sides have approved the same agreement. There is no automatic or simulated approval.`)
      : "";
    const roadmap = `<div class="det-sec" style="margin-top:24px">
      <h5>The rest of this deal: not available yet</h5>
      <p class="deal-sub" style="margin-bottom:12px">Everything below activates only when the underlying integration is live and confirms a real event. Nothing here is simulated.</p>
      ${lockedStep("🔒","Payment Protection: "+gbp(amt),"The business funds the deal via Stripe. It is marked funded only after Stripe confirms the charge succeeded. Stripe payments are not connected yet.")}
      ${lockedStep("📤","Delivery & proof submission","The platform owner uploads the published link, analytics and view/impression counts. Proof counts only once a real file or link is uploaded and stored. Server-side storage is not connected yet.")}
      ${lockedStep("🔎","Human verification","A PromoSlot reviewer checks the real submitted evidence against this agreement and marks it verified by hand. This is never automatic. No reviewer is assigned yet.")}
      ${lockedStep("💸","Payout (minus 10% seller fee)","After a reviewer verifies delivery, funds transfer to the owner via Stripe Connect, the agreed price minus PromoSlot's 10% seller fee (the 5% buyer protection fee was already added at funding). Released only on a real successful transfer. Payouts are not connected yet.")}
    </div>`;
    main=`<h3 class="deal-h">Step 2: Both parties approve</h3>
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
  dlog(d,"Agreement finalised, sent for dual approval");
  renderDeal(id);
}
function approveMine(id){
  const d=dealById(id);
  d.myApproved=true;
  dlog(d,"You approved the agreement");
  // The counterparty's approval is a real action taken by their real account.
  // We never fabricate it. It stays "waiting" until a real second party approves.
  renderDeal(id);
  toast("Your approval is recorded, waiting on "+d.with,true);
}
function counterOffer(id){
  const d=dealById(id);
  openModal(`<div class="m-pad"><h3 class="m-title">Counter-offer on ${esc(d.id)}</h3>
    <p class="m-sub">Revise the terms: ${esc(d.with)} can accept, decline, or counter again. Nothing is binding until both sides approve the same version.</p>
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
  dlog(d,"You sent a counter-offer, awaiting their response");
  // We never fabricate the counterparty accepting. Their response comes from
  // their real account.
  closeModal(); renderDeal(id);
  toast("Counter-offer sent to "+d.with+", awaiting their response");
}
function cancelDeal(id){
  const d=dealById(id);
  openModal(`<div class="m-pad"><h3 class="m-title">Cancel this deal?</h3><p class="m-sub">${d.step<3?"The deal hasn't been funded, cancellation is free and instant.":"Protected funds will be returned to the business per the cancellation terms."}</p>
  <div class="m-actions"><button class="btn btn-o" onclick="closeModal()">Keep deal</button><button class="btn btn-danger" onclick="S.deals=S.deals.filter(x=>x.id!=='${id}');closeModal();openDash();toast('Deal ${id} cancelled')">Cancel deal</button></div></div>`,"narrow");
}
function fundDeal(id){
  // Escrow funding requires a real, confirmed Stripe charge. No such integration
  // exists yet, so we never mark a deal funded here.
  const d=dealById(id);
  if(!INFRA.payments){
    openModal(`<div class="m-pad"><h3 class="m-title">Payment Protection isn't available yet</h3>
      <p class="m-sub">Funding a deal moves real money, held pending verification, so it can only happen through a live payment provider. PromoSlot's Stripe integration isn't connected yet, so no deal can be funded, and none will ever be shown as funded until a real Stripe charge succeeds.</p>
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
      ${pendingPanel("📤","Evidence storage pending","When server-side file storage is live, you'll attach the published link, analytics screenshots and view counts here, and they'll count only once the upload is confirmed stored.")}
      <div class="m-actions"><button class="btn btn-p" onclick="closeModal()">Got it</button></div></div>`,"narrow");
    return;
  }
  // (Reachable only once INFRA.fileStorage is true and a real upload is wired.)
}
function openDispute(id){
  const d=dealById(id);
  openModal(`<div class="m-pad"><h3 class="m-title">⚖️ Dispute review: ${esc(d.id)}</h3>
  <p class="m-sub">PromoSlot reviews the accepted deal terms, content links, submitted evidence, platform analytics, messages, deadlines and revision requests. The decision follows the <b>agreed deliverables</b>, not whether a brand disliked the commercial outcome.</p>
  <div class="proof-item"><span class="pi-ico">📄</span>Accepted agreement ${esc(d.id)}<span class="ok">On file</span></div>
  <div class="proof-item"><span class="pi-ico">🔗</span>Submitted evidence (${d.proof.length} items)<span class="ok">On file</span></div>
  <div class="proof-item"><span class="pi-ico">💬</span>Message history with ${esc(d.with)}<span class="ok">On file</span></div>
  <div class="frm" style="margin-top:14px"><div><label>What wasn't fulfilled?</label><textarea placeholder="Describe which agreed deliverable was not met…"></textarea></div></div>
  <div class="m-actions"><button class="btn btn-o" onclick="closeModal()">Close</button><button class="btn btn-p" onclick="closeModal();toast('Dispute filed, a PromoSlot reviewer will respond within 48h',true)">File dispute</button></div></div>`);
}
function leaveReview(id){
  const d=dealById(id);
  // A review may only exist for a real, completed, paid-out deal between two real
  // accounts. No deal can reach that state yet, so reviews cannot be created.
  if(!d || !d.paidOut){
    openModal(`<div class="m-pad"><h3 class="m-title">Reviews come after a completed deal</h3>
      <p class="m-sub">A review can only be left once this deal is genuinely complete: funded, delivered, verified by a reviewer, and paid out to a real counterparty. That hasn't happened, so there's nothing to review yet. Reviews are never pre-written or auto-generated.</p>
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
  if(!list.length) return `<p class="mut" style="font-size:12.5px">Go back to step 1 and pick a goal. The payment methods you can offer follow from it.</p>`;
  return `<div class="chips-lg">${list.map(m=>
      `<button type="button" class="chip ${paySel(m.key).on?"on":""}" onclick="togglePayMethod('${m.key}')">${esc(m.label)}</button>`).join("")}</div>`
    + list.filter(m=>paySel(m.key).on).map(m=>{
      const c=paySel(m.key);
      return `<div class="pm-slot" style="margin-top:10px">
        <div class="row2">
          <div><label>${esc(m.label)}: ${esc(m.field)}</label>
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
const BIZ_INTENTS=[["📦","Looking to market a product","Get your product in front of the right audiences"],["🤝","Looking to offer affiliate partnerships","Pay commission on verified sales"],["🎁","Wanting to run a giveaway","Grow awareness with hosted giveaways"],["🌟","Looking for long-term brand ambassadors","Monthly retainers with creators you trust"],["🎬","Wanting UGC content","Videos for your own ads, not posted to creator pages"],["🧪","Testing a new market","Small campaigns to validate a niche or country"]];
// First card was hardcoded to "TikTok" regardless of which of the 18
// platform types the person actually has — generalized so it reads
// correctly for a newsletter, podcast, Discord server, etc. too.
const PLAT_INTENTS=[["🎵","I want to monetize my platform","Turn views into deal flow"],["🗂","I have multiple platforms to list","Each platform gets its own listing, audience & prices"],["💼","I'm looking for brand deals","Sponsored posts, integrations, reviews"],["🔗","I want to offer affiliate promotions","Earn commission on verified sales"],["📮","I run a community/newsletter","Discord, Substack, forums, communities monetise too"]];

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
// Guests are let in as far as step 1 — seeing what the wizard actually asks for
// is a better pitch than a signup wall. wizNext() gates the step past it.
function startWizard(kind){
  W={kind,d:defW(),i:0}; lastPct=0;
  if(kind==="biz") W.steps=["b-intent","b-company","b-target","b-budget","b-who","b-review"];
  else if(kind==="plat") W.steps=["p-intent","p-reg","p-aud","p-serv","p-review"];
  else W.steps=["x-intent","x-order"];
  renderWiz("fwd");
}
function openRegisterPlatform(){
  // "again" drives the p-reg step's title ("Register another platform" vs
  // "Register your first platform") — this used to be hardcoded true, so a
  // platform owner with zero listings was told to register "another" one
  // before ever registering a first.
  W={kind:"plat",d:defW(),i:0,steps:["p-reg","p-aud","p-serv","p-review"],again:S.myPlatforms.length>0}; lastPct=0;
  const n=S.myPlatforms.length;
  if(n===1){ W.d.pType="Discord"; W.d.pName="RM Fit Hub"; W.d.pDesc="46k-member training community: check-ins, form reviews and a very active deals channel."; W.d.aud="46200"; W.d.views="18300"; W.d.imps="61000"; W.d.er="12.1"; W.d.pServices=new Set(["Community announcement","Pinned community post","Brand AMA"]); }
  if(n>=2){ W.d.pType="Newsletter"; W.d.pName="LiftLog Weekly"; W.d.pDesc="Weekly training newsletter for lifters who want evidence over hype. Sent Sundays, 48% open rate."; W.d.aud="32500"; W.d.views="15600"; W.d.imps="15600"; W.d.er="48"; W.d.pServices=new Set(["Newsletter advertisement","Sponsored blog post","Affiliate promotion"]); }
  renderWiz("fwd");
}
function wchip(field){
  return `onclick="W.d['${field}'].has(this.dataset.v)?W.d['${field}'].delete(this.dataset.v):W.d['${field}'].add(this.dataset.v);this.classList.toggle('on');this.classList.remove('pop');void this.offsetWidth;this.classList.add('pop')"`;
}
function wchipsHtml(field,opts,customLabel){
  const set=W.d[field];
  let html=`<div class="chips-lg">`+opts.map(o=>`<button type="button" class="chip ${set.has(o)?"on":""}" ${wchip(field)} data-v="${esc(o)}">${esc(o)}</button>`).join("");
  if(customLabel){
    // Anything the person typed in via "+ Add ..." that isn't one of the
    // preset options - reuses the same toggle handler as a preset chip
    // (wchip() reads the value off data-v at click-time), so removing one
    // just untoggles it like any other chip.
    const customVals=[...set].filter(v=>!opts.includes(v));
    html+=customVals.map(v=>`<button type="button" class="chip on" ${wchip(field)} data-v="${esc(v)}">${esc(v)}</button>`).join("");
    html+=`<button type="button" class="chip chip-add" onclick="wAddCustomChip('${field}','${esc(customLabel)}')">+ Add ${esc(customLabel)}</button>`;
  }
  html+=`</div>`;
  return html;
}
function wAddCustomChip(field,label){
  const v=(window.prompt(`Add a custom ${label}:`,"")||"").trim();
  if(!v) return;
  const set=W.d[field];
  if([...set].some(x=>x.toLowerCase()===v.toLowerCase())){ toast(`"${v}" is already added`); return; }
  set.add(v);
  renderWiz();
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
    case "x-intent": return {t:"Welcome to PromoSlot",s:"You picked <b>Both roles</b>: one account, two dashboards. Select everything that applies:",h:
      `<h5 class="wiz-h5">As a business</h5>${selCardsHtml("intentsB",BIZ_INTENTS.slice(0,4))}
       <h5 class="wiz-h5" style="margin-top:14px">As a platform owner</h5>${selCardsHtml("intentsP",PLAT_INTENTS.slice(0,4))}`,
      valid:()=>d.intentsB.size||d.intentsP.size?null:"Select at least one goal."};
    case "x-order": return {t:"Which profile first?",s:"You'll set up one now, we'll offer the other right after.",h:
      `<div class="sel-cards">
        <div class="sel-card ${W.d.order==='biz'?'on':''}" onclick="W.d.order='biz';renderWiz()"><div><b>Business profile first</b><small>Post campaigns & buy promotion</small></div><span class="sc-check">✓</span></div>
        <div class="sel-card ${W.d.order==='plat'?'on':''}" onclick="W.d.order='plat';renderWiz()"><div><b>Platform profile first</b><small>List your audience & get paid</small></div><span class="sc-check">✓</span></div>
      </div>`,
      valid:()=>W.d.order?null:"Pick one to start with."};
    case "b-intent": return {t:"What brings you to PromoSlot?",s:"Select everything that applies, this shapes the questions we ask next.",h:selCardsHtml("intentsB",BIZ_INTENTS),
      valid:()=>d.intentsB.size?null:"Select at least one goal."};
    case "b-company": return {t:"Tell us about your business",s:"This becomes your public business profile that platform owners can browse.",h:
      `<div class="frm"><div class="row2">
        <div><label>Company name</label><input type="text" id="w-company" value="${esc(d.company)}"></div>
        <div><label>Industry</label><select id="w-industry">${["Beauty & skincare","Fitness & nutrition","Food & drink","Fintech","Gaming","Developer tools","Kids & parenting","Fashion & apparel","EdTech","Travel","Other"].map(i=>`<option ${i===d.industry?"selected":""}>${i}</option>`).join("")}</select></div></div>
        <div><label>Product / service</label><input type="text" id="w-product" value="${esc(d.product)}"></div>
        <div><label>Target market description</label><textarea id="w-target">${esc(d.target)}</textarea></div></div>`,
      collect:()=>{d.company=$("w-company").value.trim();d.industry=$("w-industry").value;d.product=$("w-product").value.trim();d.target=$("w-target").value.trim();},
      valid:()=>d.company&&d.product?null:"Company name and product are required."};
    case "b-target": return {t:"Who should promote you?",s:`Multi-select everything: ${d.intentsB.size?[...d.intentsB][0].toLowerCase()+" works across many platforms at once.":"you're never limited to one option."}`,h:
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
      return {t:"Budget & payment",s:"Pick every payment method you want to offer, you set each amount yourself, and creators choose what suits their audience.",h:
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
      return {t:"Who we are",s:"Platform owners see this when they view your full profile from your campaign. All optional, and it's the same profile you can edit any time from My Account.",h:
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
    case "p-reg": return {t:W.again?"Register another platform":"Register your first platform",s:"Each platform you control gets its own listing: own audience, own prices, own offers. You can add more afterwards.",h:
      `<div class="frm"><div class="row2">
        <div><label>Platform type</label><select id="w-ptype">${ALL_PLATFORMS.map(p=>`<option ${p===d.pType?"selected":""}>${p}</option>`).join("")}</select></div>
        <div><label>Your brand / display name</label><input type="text" id="w-pbrand" value="${esc(d.pBrand)}"></div></div>
        <div><label>Platform / page name</label><input type="text" id="w-pname" value="${esc(d.pName)}"></div>
        <div><label>Description</label><textarea id="w-pdesc">${esc(d.pDesc)}</textarea></div>
        <div><label>Niche(s)</label>${wchipsHtml("pNiches",ALL_NICHES,"niche")}</div></div>`,
      collect:()=>{d.pType=$("w-ptype").value;d.pBrand=$("w-pbrand").value.trim();d.pName=$("w-pname").value.trim();d.pDesc=$("w-pdesc").value.trim();},
      valid:()=>d.pName&&d.pBrand?null:"Brand and platform name are required."};
    case "p-aud": return {t:"Your audience",s:"Businesses filter by these numbers, analytics evidence can be verified later for a ✔ badge.",h:
      `<div class="frm"><div class="row2">
        ${pmIn("w-aud","Audience size",d.aud)}${pmIn("w-views","Average views / opens",d.views)}</div>
        <div class="row2">${pmIn("w-imps","Average impressions",d.imps)}${pmIn("w-er","Engagement / open rate (%)",d.er)}</div>
        <div><label>Audience countries</label>${wchipsHtml("pCountries",ALL_COUNTRIES)}</div>
        <div><label>Audience age ranges</label>${wchipsHtml("ages",ALL_AGES)}</div>
        <div><label>Audience interests</label>${wchipsHtml("interests",["Gym & training","Nutrition","Supplements","Skincare","Makeup","Indie games","PC hardware","Investing","Budgeting","Quick recipes","Meal kits","Dev tools","AI","Parenting","Fashion","Travel"])}</div></div>`,
      collect:()=>{d.aud=$("w-aud").value;d.views=$("w-views").value;d.imps=$("w-imps").value;d.er=$("w-er").value;},
      valid:()=>Number(d.aud)>0?null:"Audience size is required."};
    case "p-serv": return {t:"Services & pricing",s:"Multi-select every service you offer, then attach one or several pricing methods. Every price is yours: set whatever you want, and change it anytime.",h:
      `<div class="frm"><div><label>Available services</label>${wchipsHtml("pServices",ALL_SERVICES)}</div>
      <div><label>Pricing models (select one or more)</label>
      ${pmBox("fixed","Fixed price","e.g. £100 for one promotional video",pmIn("pm-fx-label","Offer name","1 promotional video","text")+pmIn("pm-fx-price","Your price (£)","180"))}
      ${pmBox("per-view","Price per view","Optional guaranteed floor + rate per 1,000 verified views — buyers pick their own budget & duration when they buy",
        pmIn("pm-pv-min","Guaranteed floor (£, optional)","0")+pmIn("pm-pv-rate","Rate per 1,000 verified views (£)","8"))}
      ${pmBox("per-imp","Price per impression","Optional guaranteed floor + rate per 1,000 verified impressions — great for newsletters & communities",
        pmIn("pm-pi-min","Guaranteed floor (£, optional)","0")+pmIn("pm-pi-rate","Rate per 1,000 verified impressions (£)","5"))}
      ${pmBox("time","Time-based placement","Pinned posts, link-in-bio, banners",
        pmIn("pm-tm-price","Price (£)","40")+`<div><label>Per</label><select id="pm-tm-unit"><option>day</option><option selected>week</option><option>month</option></select></div>`+pmIn("pm-tm-min","Minimum duration","1")+pmIn("pm-tm-max","Maximum duration","4")+`<div><label>Renewal</label><select id="pm-tm-renew"><option selected>Renewable</option><option>Not renewable</option></select></div>`)}
      ${pmBox("affiliate","Affiliate commission","Earn per verified sale or lead",
        pmIn("pm-af-pct","% per verified sale","15")+pmIn("pm-af-lead","Flat per qualified lead (£, optional)","0")+pmIn("pm-af-cookie","Cookie / attribution (days)","30")+pmIn("pm-af-min","Minimum payout (£)","20"))}
      ${pmBox("custom","Custom quote","Invite businesses to request a personalised proposal","<div style='grid-column:1/-1;font-size:12.5px;color:var(--mut)'>Businesses will see a “Request quote” button on this listing.</div>")}
      </div></div>`,
      collect:collectPricing,
      valid:()=>{ collectPricing(); return d.pServices.size&&d.pricing.length?null:"Pick at least one service and one pricing model."; }};
    case "p-review": {
      const prev=buildMyListing();
      return {t:"Your listing: live preview",s:"Exactly how your card appears in the marketplace. Publish when it looks right.",h:
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
  // rate_pence/rate_qty are what makes this tier real-money-usable via
  // buyOffer() (see openPoolBuyModal) — amount stays the optional guaranteed
  // floor, >0 being what backend calls a "hybrid" deal (no separate option).
  if(on("per-view")) d.pricing.push({key:"per-view",type:"per-view",label:"Performance deal: per view",
    detail:`${Number(v("pm-pv-min"))?`£${v("pm-pv-min")} guaranteed + `:""}£${v("pm-pv-rate")} per 1,000 verified views`,
    amount:Number(v("pm-pv-min"))||0, rate_pence:Math.round((Number(v("pm-pv-rate"))||0)*100), rate_qty:1000});
  if(on("per-imp")) d.pricing.push({key:"per-imp",type:"per-imp",label:"Per-impression sponsorship",
    detail:`${Number(v("pm-pi-min"))?`£${v("pm-pi-min")} guaranteed + `:""}£${v("pm-pi-rate")} per 1,000 verified impressions`,
    amount:Number(v("pm-pi-min"))||0, rate_pence:Math.round((Number(v("pm-pi-rate"))||0)*100), rate_qty:1000});
  if(on("time")) d.pricing.push({key:"time",type:"time",label:`Placement: per ${v("pm-tm-unit")}`,detail:`£${v("pm-tm-price")} per ${v("pm-tm-unit")} · min ${v("pm-tm-min")}, max ${v("pm-tm-max")} ${v("pm-tm-unit")}s · ${v("pm-tm-renew").toLowerCase()}`,amount:Number(v("pm-tm-price"))||0});
  if(on("affiliate")) d.pricing.push({key:"affiliate",type:"affiliate",label:"Affiliate promotion",detail:`${v("pm-af-pct")}% per verified sale${Number(v("pm-af-lead"))?` · £${v("pm-af-lead")} per qualified lead`:""} · ${v("pm-af-cookie")}-day cookie · £${v("pm-af-min")} min payout`,amount:0});
  if(on("custom")) d.pricing.push({key:"custom",type:"custom",label:"Custom quote",detail:"Invite businesses to request a personalised proposal",amount:0});
}
function buildMyListing(){
  const d=W.d;
  return {id:"my-p"+(S.myPlatforms.length+1),ownerId:"you",owner:"You",brand:d.pBrand,name:d.pName,handle:"@"+d.pName.toLowerCase().replace(/[^a-z0-9]/g,""),
    platform:d.pType,niches:[...d.pNiches],bio:d.pDesc,audience:Number(d.aud)||0,avgViews:Number(d.views)||0,impressions:Number(d.imps)||0,er:Number(d.er)||0,
    countries:[...d.pCountries],ages:[...d.ages],interests:[...d.interests],rating:null,reviewCount:0,verified:false,
    // rate_pence/rate_qty carried through (not stripped) — dropping them here
    // would silently publish a first listing whose per-view/per-imp tiers
    // look real but can never actually be bought via openPoolBuyModal.
    services:[...d.pServices],pricing:d.pricing.map(p=>({type:p.type,label:p.label,detail:p.detail,amount:p.amount,
      ...(p.rate_pence?{rate_pence:p.rate_pence,rate_qty:p.rate_qty}:{})})),
    past:[]};
}
function renderWiz(dir){
  const step=W.steps[W.i];
  const def=wizStepHtml(step);
  const pct=Math.round(((W.i+1)/W.steps.length)*100);
  const animCls = dir==="back"?"from-left":dir==="fwd"?"from-right":"";
  openModal(`<div class="m-pad">
    <div class="wiz-prog"><span>Step ${W.i+1} of ${W.steps.length}</span><div class="bar"><i id="wizBar" style="width:${lastPct}%"></i></div>
      <button class="btn-ghost wiz-exit" onclick="if(confirm('Exit setup? Your answers won\\'t be saved.')){closeModal();W=null;try{sessionStorage.removeItem(WIZARD_RESUME_KEY)}catch(e){}}">Exit</button></div>
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
  // Guests get step 1 free; advancing past it requires an account. Checked after
  // validation on purpose — an incomplete step 1 shows the normal error first, so
  // the signup prompt only appears when they are genuinely ready to move on.
  if(!S.account && W.i===0){
    // Remember what they were trying to do — see WIZARD_RESUME_KEY above.
    // Cleared the moment it's consumed (_resumeAfterAuth) or if they hit
    // "Exit setup" on the wizard itself (wizExit below). If they instead
    // just close the signup form and come back to log in some unrelated
    // day later, this can still fire once on that login — a minor, mostly
    // harmless surprise (they land in the platform wizard once) rather
    // than something worth a heavier abandonment-tracking mechanism.
    try{ sessionStorage.setItem(WIZARD_RESUME_KEY, W.kind); }catch(e){}
    authGate("signup");
    // Pre-tick the role they implicitly chose by starting this wizard.
    if(W.kind==="plat"||W.kind==="both"){ const b=$("au-r-plat"); if(b) b.classList.add("on"); }
    if(W.kind==="biz"||W.kind==="both"){ const b=$("au-r-biz"); if(b) b.classList.add("on"); }
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
  const title=`${d.product.split(" ").slice(0,3).join(" ")}: Launch Campaign`;
  const payload={title,industry:d.industry,description:`${d.company} is looking for creators to promote: ${d.product}. ${d.target}.`,
    budget:Number(d.budget)||0,platforms:[...d.platforms],niches:[niche],countries:[...d.countries],services:[...d.services],
    creator_sizes:[...d.sizes],goals:[...d.intentsB],payment:pays,
    deliverables:`${[...d.services].slice(0,2).join(" or ")} featuring the product. Content live ≥ 30 days. Draft approval required.`,
    duration:d.duration,samples:pays.some(p=>p.type==="product"),
    profile:{product:d.product,target:d.target,
             payMethods:pays.map(p=>payMethodByKey(p.type).label),collabs:"New to PromoSlot"}};
  try{ await PSApi.post("/campaigns",payload); }
  catch(err){ toast(err.message||"Could not publish campaign"); wizPublishFailed("Create my business profile"); return; }
  // Real backing row for this business identity — see backend/models.py's
  // Business. Best-effort: a hiccup here shouldn't undo a campaign that just
  // published successfully, but it's what verification (My Account) needs to
  // exist, so failures are logged rather than silently swallowed.
  try{ await PSApi.post("/businesses",{company:d.company,product:d.product,industry:d.industry,target:d.target}); }
  catch(err){ console.error("Could not save business profile record:",err); }
  await loadMine(); authReflect();
  S.activeRole="biz"; setTheme();
  const created=S.myCampaigns[0];
  const linkedP = S.account.linked_account;
  const isBothFlow = W.kind==="both" && linkedP && linkedP.is_platform_owner && !linkedP.has_published_listing_or_campaign;
  wizSuccess("Your business profile is live 🎉",`“${created?created.title:title}” has been published to the marketplace. Platform owners can now apply, accept your terms, or counter-offer.`, isBothFlow?"plat":null);
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
  const linkedB = S.account.linked_account;
  const isBothFlow = W.kind==="both" && linkedB && linkedB.is_business && !linkedB.has_published_listing_or_campaign;
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
      ${offerOtherRole?`<button class="btn btn-p btn-lg" onclick="closeModal();switchToLinkedAccount('${offerOtherRole}').then(()=>startWizard('${offerOtherRole}'))">Set up my ${offerOtherRole==="biz"?"business":"platform-owner"} profile too</button>`:""}
      ${offerAnother?`<button class="btn ${offerOtherRole?"btn-o":"btn-p"}" onclick="closeModal();openRegisterPlatform()">＋ Register another platform</button>`:""}
      <button class="btn btn-o" onclick="closeModal();W=null;syncNav();openDash()">Go to my dashboard →</button>
    </div></div></div>`,"",true);
  const host=$("successWrap"); if(host) confettiBurst(host);
}

/* ==================== VERIFICATION FLOW ====================
   Two real, separate checks — business identity (Stripe KYB on the
   business's own account) and platform-owner identity + ownership evidence
   (Stripe reused from their existing payout account, plus real evidence
   they control the listed account). A human reviewer confirms every one of
   these before a badge shows — see backend/services.py's
   decide_verification for exactly where that gate lives. Nothing here ever
   sets a badge from a Stripe pass alone. */
const VF_DISCLOSURE = "This information is never made public. It's only ever seen by a PromoSlot reviewer deciding on your badge, and any documents or evidence are deleted the moment a decision is made — approved or rejected.";

function vfShell(title, sub, body, actions){
  return `<div class="m-pad"><div class="vf-head"><div class="vf-shield">🛡️</div>
    <div><h3 class="m-title">${esc(title)}</h3>${sub?`<p class="m-sub" style="margin:4px 0 0">${sub}</p>`:""}</div></div>
    ${body||""}
    <p class="review-thanks" style="margin-top:14px">${VF_DISCLOSURE}</p>
    <div class="m-actions">${actions}</div></div>`;
}
function vfStatusPill(status){
  if(status==="approved") return `<span class="status-pill st-live">Verified</span>`;
  if(status==="pending") return `<span class="status-pill st-review">Pending review</span>`;
  if(status==="rejected") return `<span class="status-pill st-dispute">Needs another look</span>`;
  return `<span class="status-pill st-draft">Not started</span>`;
}
function vfRejectedNotice(req){
  return `<div class="note" style="border-left:3px solid var(--red)">
    <b style="display:block;color:var(--red);font-size:13.5px">Not approved</b>
    <span>${esc(req.rejected_reason||"No reason given.")}</span></div>
    <p class="review-thanks">Think we made an error? <a href="#" onclick="event.preventDefault();vfContactSupport(${req.id})">Contact PromoSlot support</a> from your account, or email <a href="mailto:support@usepromoslot.com">support@usepromoslot.com</a>.</p>`;
}
function vfContactSupport(reqId){
  closeModal(); openAccount();
  setTimeout(()=>{
    const subj=$("sup-subject"); if(subj) subj.value="Verification review — request #"+reqId;
    const el=$("supportPanel"); if(el) el.scrollIntoView({behavior:"smooth",block:"center"});
  },250);
}

async function openVerify(role){
  openModal(`<div class="m-pad" style="text-align:center;padding:48px 20px"><span class="spin"></span></div>`,"",false);
  try{
    if(role==="biz") await vfRenderBiz();
    else await vfRenderPlat();
  }catch(e){ toast(e.message||"Could not load verification"); closeModal(); }
}

async function vfRenderBiz(){
  const biz = await PSApi.get("/businesses/me");
  if(!biz){
    openModal(vfShell("Get business verified","Set up your business profile first — verification attaches to it.","",
      `<button class="btn btn-p" onclick="closeModal()">Close</button>`)); return;
  }
  if(biz.verified){
    openModal(vfShell("You're verified ✔","Your business already carries the Verified badge across PromoSlot.","",
      `<button class="btn btn-p" onclick="closeModal()">Close</button>`)); return;
  }
  const existing = await PSApi.get("/verification/business/my-request").catch(()=>null);
  if(existing && existing.status==="pending"){
    openModal(vfShell("Submitted for review","A PromoSlot reviewer will confirm this matches your profile before your badge appears. You'll be notified either way.","",
      `<button class="btn btn-p" onclick="closeModal()">Got it</button>`)); return;
  }
  let status = {has_account:false};
  if(biz.has_stripe_account) status = await PSApi.get("/verification/business/status").catch(()=>({has_account:false}));

  // One step, not two — Rob, 2026-08-28: "I want every verification to be
  // a one step process that submits for verification on promoslot the
  // second they finish their application." The moment Stripe's own check
  // passes, submit for PromoSlot review automatically — no separate manual
  // click to notice and take. Consent for that is captured up front instead
  // (see the "Continue with Stripe" step below), not as a second click
  // after the fact. Only on a FRESH attempt though — after a rejection,
  // resubmitting is still an explicit act, not silent (see below).
  if(status.verified_by_stripe && !existing){
    try{
      await PSApi.post("/verification/business/submit",{});
      return vfRenderBiz();
    }catch(e){ /* falls through to the normal ready-to-submit screen below as a fallback */ }
  }

  const rejected = (existing && existing.status==="rejected") ? vfRejectedNotice(existing) : "";

  if(!status.has_account){
    openModal(vfShell("Get business verified",
      "We verify your business through Stripe's own identity check — the same one used by businesses everywhere. PromoSlot never sees your documents; Stripe handles that directly and only ever tells us pass or fail, plus your verified legal name. The moment Stripe confirms it, this is submitted for PromoSlot review automatically — no extra step, and by continuing you confirm you're authorised to verify this business on PromoSlot's behalf.",
      rejected+`<div class="det-sec"><h5>What Stripe checks</h5>
        <div class="proof-item"><span class="pi-ico">🏢</span><div class="vf-body"><b>Legal business name &amp; registration</b><small>Whatever's on file for your business</small></div></div>
        <div class="proof-item"><span class="pi-ico">🧑</span><div class="vf-body"><b>Representative identity</b><small>Whoever completes this on your business's behalf</small></div></div>
      </div>`,
      `<button class="btn btn-o" onclick="closeModal()">Not now</button>
       <button class="btn btn-p" onclick="vfStartBizStripe()">Continue with Stripe</button>`)); return;
  }
  if(!status.verified_by_stripe){
    openModal(vfShell("Finish verifying with Stripe",
      status.requirements_due?"Stripe still needs a bit more information to finish this check.":"Stripe is reviewing what you've submitted — this can take a few minutes. Come back and reopen this once it's done; it'll submit for PromoSlot review on its own.",
      rejected,
      `<button class="btn btn-o" onclick="closeModal()">Close</button>
       <button class="btn btn-p" onclick="vfStartBizStripe()">${status.requirements_due?"Continue with Stripe":"Refresh status"}</button>`)); return;
  }
  // Only reachable after a REJECTED prior attempt with Stripe still (or
  // again) passing, or if the auto-submit call above genuinely failed —
  // resubmitting is a real decision either way, so it stays an explicit click.
  openModal(vfShell("Ready to resubmit",
    `Stripe verified this business as <b>${esc(status.stripe_legal_name||"—")}</b>.`,
    rejected,
    `<button class="btn btn-o" onclick="closeModal()">Not now</button>
     <button class="btn btn-p" onclick="vfSubmitBiz()">Submit application to PromoSlot</button>`));
}
async function vfStartBizStripe(){
  try{
    await PSApi.post("/verification/business/account",{});
    const r = await PSApi.post("/verification/business/onboarding-link",{});
    window.location.href = r.url;
  }catch(e){ toast(e.message||"Could not start Stripe verification"); }
}
async function vfSubmitBiz(){
  try{ await PSApi.post("/verification/business/submit",{}); toast("Submitted for review ✓",true); await vfRenderBiz(); }
  catch(e){ toast(e.message||"Could not submit for review"); }
}

async function vfRenderPlat(){
  // Account-level — no listing required (Rob, 2026-08-27: identity + ownership
  // both attach to the owner, not to any one Platform row; see
  // backend/services.py's platform_owner_verified). A listing you add later,
  // or already have, just inherits whatever your account status is.
  const [reqs,connStatus]=await Promise.all([
    PSApi.get("/verification/platform/my-requests").catch(()=>({})),
    PSApi.get("/connect/status").catch(()=>({has_account:false}))
  ]);
  if(reqs.verified){
    openModal(vfShell("You're verified ✔","Your Verified badge now shows on every listing you have, and any new one you add.","",
      `<button class="btn btn-p" onclick="closeModal()">Close</button>`)); return;
  }
  // One step, not two — same reasoning as vfRenderBiz above. The moment the
  // payout account is genuinely ready, submit the identity gate for review
  // automatically instead of leaving a manual "Submit identity check" click
  // sitting there to be missed. Only on a fresh attempt — a rejected
  // identity check still needs an explicit resubmit (vfIdentitySectionHtml's
  // existing "connected but not submitted" branch handles that fallback).
  if(connStatus.transfers_active && !reqs.platform_identity){
    try{
      await PSApi.post("/verification/platform/submit-identity",{});
      return vfRenderPlat();
    }catch(e){ /* falls through to the normal render below as a fallback */ }
  }
  openModal(vfShell("Get verified",
    "Two separate checks, each confirmed by a real PromoSlot reviewer before your badge appears. No listing needed first — this verifies your account.",
    vfIdentitySectionHtml(reqs.platform_identity,connStatus)+vfOwnershipSectionHtml(reqs.platform_ownership),
    `<button class="btn btn-o" onclick="closeModal()">Close</button>`),"wide");
}
function vfIdentitySectionHtml(req,connStatus){
  const status=req?req.status:"none";
  let body="";
  if(status==="rejected") body+=vfRejectedNotice(req);
  if(status==="approved") body+=`<p class="mut" style="font-size:13px">Confirmed via your Stripe payout account.</p>`;
  else if(status==="pending") body+=`<p class="mut" style="font-size:13px">Submitted — a PromoSlot reviewer will confirm this shortly.</p>`;
  else if(!connStatus.has_account || !connStatus.transfers_active){
    // Rob, 2026-08-28: this shouldn't feel like a separate errand — connecting
    // Stripe payouts and verification are the same flow from here, so the
    // button to do it lives right here instead of just pointing at the
    // dashboard. vfConnectPayouts() sets a one-shot resume flag so PSBoot
    // reopens this exact modal once Stripe sends them back, instead of
    // dropping them on the dashboard to go find "Get verified" again.
    body+=`<p class="mut" style="font-size:13px">Uses the same Stripe account you set up for payouts.${connStatus.has_account?" Stripe still needs a bit more from you to finish it.":" Once it's ready, this is submitted for PromoSlot review automatically — no extra step, and by continuing you confirm this account is genuinely yours."}</p>
      <button class="btn btn-p btn-sm" onclick="vfConnectPayouts()">${connStatus.has_account?"Continue on Stripe":"Connect payout account"}</button>`;
  } else {
    body+=`<p class="mut" style="font-size:13px">Your Stripe payout account is ready — submit it as your identity check too.</p>
      <button class="btn btn-p btn-sm" onclick="vfSubmitPlatIdentity()">Submit identity check</button>`;
  }
  return `<div class="det-sec" style="margin-top:14px"><h5>1. Identity ${vfStatusPill(status)}</h5>${body}</div>`;
}
async function vfSubmitPlatIdentity(){
  try{ await PSApi.post("/verification/platform/submit-identity",{}); toast("Identity check submitted ✓",true); await vfRenderPlat(); }
  catch(e){ toast(e.message||"Could not submit identity check"); }
}
// Same Stripe call as the dashboard's connectPayouts(), just also marking
// that this was reached from the verify modal — see VERIFY_RESUME_KEY in
// PSBoot, which reopens "Get verified" (instead of just the dashboard) once
// Stripe redirects back, so this never feels like leaving to do an unrelated errand.
async function vfConnectPayouts(){
  try{ sessionStorage.setItem(VERIFY_RESUME_KEY,"plat"); }catch(e){}
  try{
    await PSApi.post("/connect/account");
    const r=await PSApi.post("/connect/onboarding-link");
    window.location.href=r.url;
  }catch(err){
    try{ sessionStorage.removeItem(VERIFY_RESUME_KEY); }catch(e){}
    toast(err.message||"Could not start payout setup");
  }
}
function vfOwnershipSectionHtml(req){
  const status=req?req.status:"none";
  if(status==="approved") return `<div class="det-sec" style="margin-top:14px"><h5>2. Platform ownership ${vfStatusPill(status)}</h5><p class="mut" style="font-size:13px">Confirmed.</p></div>`;
  if(status==="pending") return `<div class="det-sec" style="margin-top:14px"><h5>2. Platform ownership ${vfStatusPill(status)}</h5><p class="mut" style="font-size:13px">Submitted — a PromoSlot reviewer will look this over.</p></div>`;
  const rejected = status==="rejected" ? vfRejectedNotice(req) : "";
  const items=[["📊","Analytics access","A read-only insights link, or a short recording of your real dashboard"],["🔗","Platform ownership","A recording of you logged into the actual account being listed"]];
  window._vSel=new Set(items.map(i=>i[1]));
  window._vfEvidenceFiles=[];
  return `<div class="det-sec" style="margin-top:14px"><h5>2. Platform ownership ${vfStatusPill(status)}</h5>${rejected}
    ${items.map(([ico,t,sub])=>`<label class="vf-item on" data-v="${esc(t)}">
      <span class="pi-ico">${ico}</span><div class="vf-body"><b>${esc(t)}</b><small>${esc(sub)}</small></div>
      <input type="checkbox" checked onchange="this.checked?window._vSel.add(this.closest('.vf-item').dataset.v):window._vSel.delete(this.closest('.vf-item').dataset.v);this.closest('.vf-item').classList.toggle('on',this.checked)">
      <span class="vf-check">✓</span></label>`).join("")}
    <label class="vf-upload" id="vfDrop" for="vfFileInput"><span class="vf-up-ico">⬆️</span><div><b>Attach evidence</b><small id="vfFileLbl">A recording or screenshot — you can add more than one</small></div></label>
    <input type="file" id="vfFileInput" class="pf-file-input" multiple onchange="vfPick(event)">
    <div class="frm" style="margin-top:10px"><div><label>Anything else worth noting? (optional)</label><textarea id="vfNotes" placeholder="Context for the reviewer…"></textarea></div></div>
    <button class="btn btn-p btn-sm" style="margin-top:10px" onclick="vfSubmitPlatOwnership()">Submit for review</button>
  </div>`;
}
function vfPick(e){
  const files=[...(e.target.files||[])];
  window._vfEvidenceFiles=(window._vfEvidenceFiles||[]).concat(files);
  const lbl=$("vfFileLbl"); if(lbl) lbl.textContent=window._vfEvidenceFiles.length+" file"+(window._vfEvidenceFiles.length===1?"":"s")+" attached";
}
async function vfSubmitPlatOwnership(){
  try{
    const req=await PSApi.post("/verification/platform/submit-ownership",
      {evidence_checklist:[...(window._vSel||[])],evidence_notes:($("vfNotes")||{}).value||null});
    for(const f of (window._vfEvidenceFiles||[])){
      const fd=new FormData(); fd.append("request_id",req.id); fd.append("file",f);
      await PSApi.postForm("/verification/platform/evidence",fd);
    }
    toast("Ownership evidence submitted ✓",true);
    await vfRenderPlat();
  }catch(e){ toast(e.message||"Could not submit"); }
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
    <p>Buy an offer from a listing to open a protected deal: funding, delivery and payout all happen in one deal room.</p>
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
      : (awaitingPayout?"Verified: awaiting payout":esc(d.status));
    return `<div class="deal-row" onclick="showView('view-deal');renderRealDeal(${d.id})">
      ${pfp(other,d.terms&&d.terms.platform,"",meBiz?d.owner_avatar:d.business_avatar)}<div><div class="dr-t">Deal ${d.id}${d.terms&&d.terms.offer?" · "+esc(d.terms.offer):""}</div>
      <div class="dr-s">${meBiz?"You buy · "+esc(other):"You deliver · "+esc(other)}</div></div>
      <span class="status-pill ${stCls}">${stLabel}</span>
      <div class="dr-amt"><b>${gbpP(meBiz?d.total_charged:d.net_to_owner)}</b><small>${d.paid?"paid":awaitingPayout?"awaiting payout":d.funded?"protected":cancelledUnfunded?"Not funded":d.source_removed?"not going ahead":"pending"}</small></div></div>`;
  }).join("");
}
function notifRows(){
  const items=S.realNotifs||[];
  if(!items.length) return `<div class="empty">Nothing yet. Updates from your deals appear here.</div>`;
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
//
// Redesigned per Rob's "make it feel as smooth as Stripe's dashboard" note —
// prototyped and approved against real deal data in growth-chart-test.html
// (a standalone comparison file, not part of the shipped app) before landing
// here. Deliberately still a real step function, not a smoothed curve: money
// jumps the instant a deal settles, it doesn't trickle in, so faking a curve
// between points would misrepresent the data. What changed is the visual
// treatment around that honest shape — gradient fill instead of a flat
// tint, softly rounded step corners instead of hard right angles, £
// reference gridlines so a value can be read without dragging, a floating
// tooltip that follows the scrub position instead of a static text line
// above the chart, and a line/fill entrance animation on render instead of
// the chart just snapping into existence.
function niceGrowthStep(max){
  const raw=max/4, mag=Math.pow(10,Math.floor(Math.log10(raw||1))), norm=raw/mag;
  return (norm>=5?5:norm>=2?2:1)*mag||1;
}
function renderGrowthTimeline(hostId, events, cfg){
  const host=document.getElementById(hostId); if(!host) return;
  cfg=cfg||{}; const verb=cfg.verb||"earned";
  events=(events||[]).filter(e=>e.t && !isNaN(+e.t)).sort((a,b)=>a.t-b.t);
  if(!events.length){
    host.innerHTML=`<div class="empty-state small"><div class="es-ico">📈</div><h4>No ${verb==="earned"?"earnings":"purchases"} yet</h4><p>Your account growth appears here once you have a completed deal. Drag along the line to scrub through time.</p></div>`;
    return;
  }
  let cum=0; const pts=events.map(e=>({t:+e.t, v:(cum+=e.amount), amount:e.amount, dealId:e.dealId}));
  const W=640,H=230,padL=54,padR=16,padT=18,padB=26, plotW=W-padL-padR, plotH=H-padT-padB;
  let tStart=pts[0].t, tEnd=Math.max(pts[pts.length-1].t, Date.now());
  if(tEnd<=tStart) tEnd=tStart+864e5;
  const span=tEnd-tStart, rawMax=Math.max(...pts.map(p=>p.v)),
        gridStep=niceGrowthStep(rawMax), yMax=Math.ceil((rawMax*1.15)/gridStep)*gridStep||1;
  const xs=t=>padL+(t-tStart)/span*plotW, ys=v=>(padT+plotH)-(v/yMax)*plotH;

  // Stepped cumulative path with softly rounded corners — still a real step
  // function (value only changes exactly AT each deal date), just visually
  // softened at the elbow rather than a hard right angle.
  const RAD=5;
  let d=`M ${xs(tStart).toFixed(1)} ${ys(0).toFixed(1)}`, prev=0;
  const poly=[`${xs(tStart).toFixed(1)},${ys(0).toFixed(1)}`];
  pts.forEach(p=>{
    const cx=xs(p.t), cyPrev=ys(prev), cyNew=ys(p.v);
    const r=Math.min(RAD, Math.abs(cyNew-cyPrev)/2, plotW*0.03);
    d+=` L ${(cx-r).toFixed(1)} ${cyPrev.toFixed(1)} Q ${cx.toFixed(1)} ${cyPrev.toFixed(1)} ${cx.toFixed(1)} ${(cyPrev+(cyNew>cyPrev?r:-r)).toFixed(1)}`;
    d+=` L ${cx.toFixed(1)} ${(cyNew-(cyNew>cyPrev?r:-r)).toFixed(1)} Q ${cx.toFixed(1)} ${cyNew.toFixed(1)} ${(cx+r).toFixed(1)} ${cyNew.toFixed(1)}`;
    poly.push(`${cx.toFixed(1)},${cyPrev.toFixed(1)}`,`${cx.toFixed(1)},${cyNew.toFixed(1)}`);
    prev=p.v;
  });
  d+=` L ${xs(tEnd).toFixed(1)} ${ys(prev).toFixed(1)}`;
  poly.push(`${xs(tEnd).toFixed(1)},${ys(prev).toFixed(1)}`, `${xs(tEnd).toFixed(1)},${ys(0).toFixed(1)}`);
  const areaPts=poly.join(" ");

  // Reference gridlines at nice round £ values, so a value can be read at a
  // glance without dragging — the old version had no way to judge magnitude
  // except the one scrub readout.
  let gridLines="";
  for(let g=gridStep; g<yMax; g+=gridStep){
    const gy=ys(g);
    gridLines+=`<line class="g-grid" x1="${padL}" y1="${gy.toFixed(1)}" x2="${W-padR}" y2="${gy.toFixed(1)}"/><text class="g-grid-label" x="${padL-8}" y="${(gy+3.5).toFixed(1)}" text-anchor="end">£${g>=1000?(g/1000)+"k":g}</text>`;
  }

  const dots=pts.map(p=>`<circle class="g-dot" cx="${xs(p.t).toFixed(1)}" cy="${ys(p.v).toFixed(1)}" r="3.5"><title>Deal ${p.dealId} · +£${p.amount.toFixed(2)} · ${new Date(p.t).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</title></circle>`).join("");
  const sx0=xs(tEnd), sy0=ys(pts[pts.length-1].v);
  const gradId="g-grad-"+hostId;
  const total=pts[pts.length-1].v;
  const verbLabel = verb==="earned" ? "earned" : "spent";

  host.innerHTML=`<div class="growth">
    <div class="g-headline"><span class="g-amt">£${total.toFixed(2)}</span><span class="g-amt-sub">total ${verbLabel}, ${pts.length} deal${pts.length===1?"":"s"}</span></div>
    <div class="g-tip" id="${hostId}-tip" style="opacity:0;left:0"></div>
    <svg class="growth-svg" viewBox="0 0 ${W} ${H}" role="img">
      <defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--acc)" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="var(--acc)" stop-opacity="0"/>
      </linearGradient></defs>
      ${gridLines}
      <polygon class="g-area drawing" points="${areaPts}" fill="url(#${gradId})" style="opacity:0"/>
      <path class="g-line drawing" d="${d}" style="stroke-dasharray:2000;stroke-dashoffset:2000"/>
      ${dots}
      <circle class="g-scrub-glow" id="${hostId}-glow" cx="${sx0.toFixed(1)}" cy="${sy0.toFixed(1)}" r="12"/>
      <line class="g-scrub-line" x1="${sx0.toFixed(1)}" y1="${padT}" x2="${sx0.toFixed(1)}" y2="${padT+plotH}"/>
      <circle class="g-scrub" id="${hostId}-scrub" cx="${sx0.toFixed(1)}" cy="${sy0.toFixed(1)}" r="6"/>
    </svg>
    <div class="g-scale"><span>${new Date(tStart).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</span><span>drag to scrub ↔</span><span>${new Date(tEnd).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</span></div>
  </div>`;

  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const line=host.querySelector(".g-line"), area=host.querySelector(".g-area");
    if(line) line.style.strokeDashoffset="0";
    if(area) area.style.opacity="1";
  }));

  const svg=host.querySelector(".growth-svg"), scrub=document.getElementById(hostId+"-scrub"),
        glow=document.getElementById(hostId+"-glow"), sline=host.querySelector(".g-scrub-line"),
        tip=document.getElementById(hostId+"-tip");
  const cumAt=tms=>{ let v=0,n=0; pts.forEach(p=>{ if(p.t<=tms){ v=p.v; n++; } }); return {v,n}; };
  const setScrub=(tms, animate)=>{
    if(!isFinite(tms)) return; tms=Math.max(tStart,Math.min(tEnd,tms));
    const {v,n}=cumAt(tms); const sx=xs(tms), sy=ys(v);
    [scrub,glow].forEach(el=>{ el.style.transition = animate ? "cx .35s var(--ease), cy .35s var(--ease)" : "none"; });
    scrub.setAttribute("cx",sx.toFixed(1)); scrub.setAttribute("cy",sy.toFixed(1));
    glow.setAttribute("cx",sx.toFixed(1)); glow.setAttribute("cy",sy.toFixed(1));
    sline.style.transition = animate ? "x1 .35s var(--ease), x2 .35s var(--ease)" : "none";
    sline.setAttribute("x1",sx.toFixed(1)); sline.setAttribute("x2",sx.toFixed(1));
    tip.style.left=(sx/W*100)+"%";
    tip.style.opacity="1";
    tip.innerHTML=`£${v.toFixed(2)} <div class="g-tip-d">${new Date(tms).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})} · ${n} deal${n===1?"":"s"}</div>`;
  };
  const cxToT=cx=>{ const r=svg.getBoundingClientRect(); if(!r.width||!isFinite(cx)) return tEnd; const px=(cx-r.left)/r.width*W; return tStart+Math.max(0,Math.min(1,(px-padL)/plotW))*span; };
  let dragging=false;
  svg.addEventListener("pointerdown",e=>{ dragging=true; try{svg.setPointerCapture(e.pointerId);}catch(_){}; setScrub(cxToT(e.clientX), false); e.preventDefault(); });
  svg.addEventListener("pointermove",e=>{ if(dragging) setScrub(cxToT(e.clientX), false); });
  svg.addEventListener("pointerup",e=>{ dragging=false; try{svg.releasePointerCapture(e.pointerId);}catch(_){} });
  svg.addEventListener("mouseleave",()=>{ if(!dragging) setScrub(tEnd, true); });
  setScrub(tEnd, true);  // start showing "today" (full total), eased in
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
      <div><h2>${esc(b.company)}</h2><div class="sub"><span class="mode-tag">Business</span> ${esc(b.industry)} · ${b.countries.join(", ")}</div></div>
      <div class="dash-actions">
        <button class="btn btn-o" onclick="openMarket('platforms')">Browse platform listings</button>
        <button class="btn btn-p" onclick="openNewCampaign()">＋ New campaign</button></div></div>
    <div class="kpis">${kpi({i:0,to:S.myCampaigns.length,label:"Live campaigns",delta:S.myCampaigns.length?"↑ published today":"none yet, post one",cls:S.myCampaigns.length?"up":"neu",spark:"#4f46e5",act:"scrollToPanel('yourCampaigns')"})}${kpi({i:1,to:applicants,label:"Applicants",delta:applicants?"↑ new applications":"awaiting first applications",cls:applicants?"up":"neu",spark:"#4f46e5",act:"scrollToPanel('yourDeals')"})}${kpi({i:2,val:escrowPence?gbpP(escrowPence):"—",to:escrowPence?escrowPence/100:null,pre:"£",dec:2,label:"Payment Protection",delta:escrowPence?"released on verified delivery":"fund a deal to protect it",cls:"neu",spark:"#4f46e5",act:"scrollToPanel('yourDeals')"})}${kpi({i:3,to:completedCount,label:"Completed deals",delta:completedCount?"fee only on completion":"none yet",cls:"neu",spark:"#4f46e5"})}    </div>
    <div class="panel"><div class="panel-h"><h4>Account growth · spend over time</h4></div><div class="panel-b" id="bizGrowth"></div></div>
    <div class="dash-cols"><div>
      <div class="panel" id="yourCampaigns"><div class="panel-h"><h4>Your campaigns</h4><button class="btn btn-o btn-sm" onclick="openMarket('campaigns')">View in marketplace</button></div>
        <div class="panel-b">${S.myCampaigns.length?`<div class="cards tight">${S.myCampaigns.map((c,i)=>campaignCard(c,i,true)).join("")}</div>`:`<div class="empty-state"><h4>No campaigns yet</h4><p>Publish a campaign describing what you want promoted and what you'll pay. Platform owners apply to you.</p><button class="btn btn-p btn-sm" onclick="openNewCampaign()">＋ Post your first campaign</button></div>`}</div></div>
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
      <div><h2>${esc(brand)}</h2><div class="sub"><span class="mode-tag">Platform owner</span> ${S.myPlatforms.length} listing${S.myPlatforms.length===1?"":"s"} live</div></div>
      <div class="dash-actions">
        <button class="btn btn-o" onclick="openMarket('campaigns')">Browse campaigns</button>
        <button class="btn btn-p" onclick="openRegisterPlatform()">＋ Register ${S.myPlatforms.length?"another":"your first"} platform</button></div></div>
    <div class="kpis">${kpi({i:0,to:S.myPlatforms.length,label:"Live listings",delta:S.myPlatforms.length?"live in the marketplace":"list one to get seen",cls:S.myPlatforms.length?"up":"neu",spark:"#4f46e5",act:"scrollToPanel('yourListings')"})}${kpi({i:1,val:earnedPence?gbpP(earnedPence):"—",to:earnedPence?earnedPence/100:null,pre:"£",dec:2,label:"Earned (after 10% seller fee)",delta:earnedPence?`from ${paidReal.length} completed deal${paidReal.length>1?"s":""}`:"complete a deal to earn",cls:earnedPence?"up":"neu",spark:"#4f46e5"})}${kpi({i:2,to:inEscrow,label:"Protected deals",delta:inEscrow?"funds secured before you work":"none protected yet",cls:"neu",spark:"#4f46e5",act:"scrollToPanel('yourDeals')"})}${kpi({i:3,val:rAvg!=null?"⭐ "+rAvg.toFixed(1):"—",label:"Your rating",delta:rAvg!=null?`${rCount} review${rCount===1?"":"s"}`:"appears after your first completed deal",cls:rAvg!=null?"up":"neu",spark:"#4f46e5"})}    </div>
    <div class="panel"><div class="panel-h"><h4>Account growth · earnings over time</h4></div><div class="panel-b" id="platGrowth"></div></div>
    <div class="dash-cols"><div>
      <div class="panel" id="yourListings"><div class="panel-h"><h4>Your platform listings</h4><button class="btn btn-o btn-sm" onclick="openRegisterPlatform()">＋ Add platform</button></div>
        <div class="panel-b">${S.myPlatforms.length?`<div class="cards tight">${S.myPlatforms.map((l,i)=>listingCard(l,i,true)).join("")}</div>`:`<div class="empty-state"><h4>No listings yet</h4><p>Register each platform you control: its own audience, services and prices.</p><button class="btn btn-p btn-sm" onclick="openRegisterPlatform()">＋ Register a platform</button></div>`}
        ${S.myPlatforms.length&&S.myPlatforms.length<3?`<div class="note blue" style="margin-top:14px">💡 Owners with multiple listings get seen by more campaigns: list each platform you own separately, each with its own audience and prices. <a href="#" onclick="openRegisterPlatform();return false">Register another platform →</a></div>`:""}</div></div>
      <div class="panel" id="yourDeals"><div class="panel-h"><h4>Your deals</h4><button class="btn btn-o btn-sm" onclick="openMarket('campaigns')">Find campaigns</button></div><div class="panel-b">${dealRows()}</div></div>
    </div><div>
      <div class="panel"><div class="panel-h"><h4>Activity</h4></div><div class="panel-b">${notifRows()}</div></div>
      <div class="panel"><div class="panel-h"><h4>Campaigns matching your niches</h4></div><div class="panel-b">
        ${matches.map(c=>`<div class="op-row" style="margin-bottom:8px" onclick="openCampaign('${c.id}')">${pfp(c.company,null,"",c.companyAvatar)}<div><b>${esc(c.title)}</b><small>${esc(c.company)} · ${c.budget?gbp(c.budget)+" budget":"commission"}</small></div><span class="op-go">Apply →</span></div>`).join("")}
      </div></div>
      <div class="panel"><div class="panel-h"><h4>Verification</h4></div><div class="panel-b mini-rows">
        <div><span>Analytics evidence</span><b>${S.platVerified?'<span style="color:var(--money)">Verified ✔</span>':"Self-reported"}</b></div>
        <div><span>Verified listings win more deals</span><button class="btn btn-o btn-sm" onclick="S.platVerified?toast('Your account is already verified ✔',true):openVerify('plat')">${S.platVerified?"Verified ✔":"Get verified ✔"}</button></div>
      </div></div>
      <div class="panel"><div class="panel-h"><h4>Payout settings</h4></div><div class="panel-b mini-rows" id="payoutPanel">
        <div><span>Payout method</span><b class="mut">Checking…</b></div>
        <div><span>Marketplace fee</span><b>10% seller fee (+5% buyer at checkout)</b></div>
      </div></div>
    </div></div>`;
  renderGrowthTimeline("platGrowth", growthEvents, {verb:"earned"});
  requestAnimationFrame(animateKpis);
  refreshPayoutStatus();
}
async function refreshPayoutStatus(){
  const el=$("payoutPanel"); if(!el) return;
  let s;
  try{ s=await PSApi.get("/connect/status"); }
  catch(err){
    el.innerHTML=`<div><span>Payout method</span><b class="mut">Couldn't check status</b></div>
      <div><span>Marketplace fee</span><b>10% seller fee (+5% buyer at checkout)</b></div>
      <div><span>Connect payouts</span><button class="btn btn-o btn-sm" onclick="refreshPayoutStatus()">Retry</button></div>`;
    return;
  }
  const feeRow=`<div><span>Marketplace fee</span><b>10% seller fee (+5% buyer at checkout)</b></div>`;
  if(!s.has_account){
    el.innerHTML=`<div><span>Payout method</span><b class="mut">Not connected yet</b></div>${feeRow}
      <div><span>Connect payouts</span><button class="btn btn-p btn-sm" id="connectPayoutsBtn" onclick="connectPayouts()">Connect with Stripe</button></div>`;
  }else if(!s.onboarding_complete){
    el.innerHTML=`<div><span>Payout method</span><b style="color:var(--amber)">Setup in progress</b></div>${feeRow}
      ${s.requirements_due&&s.requirements_due.length?`<div><span>Stripe still needs</span><b style="text-align:right">${s.requirements_due.length} item${s.requirements_due.length===1?"":"s"}</b></div>`:""}
      <div><span>Continue setup</span><button class="btn btn-p btn-sm" id="connectPayoutsBtn" onclick="connectPayouts()">Continue on Stripe</button></div>
      <p class="mut" style="font-size:12px;margin-top:2px">Stripe sometimes needs one more confirm screen after the main form — this is normal, just click Continue again if it still says in progress.</p>`;
  }else{
    el.innerHTML=`<div><span>Payout method</span><b style="color:var(--money)">Connected ✔</b></div>${feeRow}
      <div><span>Stripe account</span><b class="mut" style="text-align:right;font-size:12px">${esc(s.stripe_account_id||"")}</b></div>
      <div><span>Payout timing</span><b class="mut" style="text-align:right;font-size:12px">Up to 7 days on new accounts</b></div>
      <div id="instantRow"><span>Instant payouts</span><b class="mut">Checking…</b></div>
      <div id="instantExtra"></div>`;
    refreshInstantStatus();
  }
}
async function refreshInstantStatus(){
  const row=$("instantRow"), extra=$("instantExtra");
  if(!row) return;
  let s;
  try{ s=await PSApi.get("/connect/instant-status"); }
  catch(err){ row.innerHTML=`<span>Instant payouts</span><b class="mut">Couldn't check</b>`; return; }
  window._instantPk=s.publishable_key;
  if(s.eligible){
    row.innerHTML=`<span>Get paid instantly (1% fee)</span><label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="instantToggle" ${s.opted_in?"checked":""} onchange="toggleInstantPayout(this)"><b class="mut" style="font-size:12px">${s.opted_in?"On":"Off"}</b></label>`;
    extra.innerHTML=`<p class="mut" style="font-size:12px;margin-top:6px">Applies automatically to future payouts when on. Stripe deducts its instant-payout fee (about 1%) from what you receive. Funds usually land within 30 minutes instead of the standard schedule.</p>`;
  }else{
    row.innerHTML=`<span>Instant payouts</span><b class="mut">Not eligible yet</b>`;
    extra.innerHTML=`<p class="mut" style="font-size:12px;margin-top:6px">Your bank account isn't on Stripe's instant-eligible list yet. Add a debit card to unlock instant payouts (1% fee, deducted automatically).</p>
      <button class="btn btn-o btn-sm" id="addCardBtn" onclick="openAddDebitCard()">＋ Add debit card</button>
      <div id="debitCardForm" style="margin-top:10px"></div>`;
  }
}
async function toggleInstantPayout(cb){
  cb.disabled=true;
  try{
    await PSApi.post("/connect/instant-preference", {enabled: cb.checked});
    toast(cb.checked?"Instant payouts turned on":"Instant payouts turned off",true);
    const label=cb.nextElementSibling; if(label) label.textContent=cb.checked?"On":"Off";
  }catch(err){ toast(err.message||"Could not update preference"); cb.checked=!cb.checked; }
  cb.disabled=false;
}
// Two explicit radio buttons (Off / On) rather than one ambiguous checkbox
// — clearer at a glance which state is active, and which one a click will
// switch to. Both call this with the value THEY represent, not a toggle.
async function setMarketingPreference(enabled){
  const off=$("mktOff"), on=$("mktOn");
  if(off) off.disabled=true;
  if(on) on.disabled=true;
  try{
    const r=await PSApi.post("/me/marketing-preference", {enabled});
    if(S.account) S.account.marketing_opt_in=r.opted_in;
    toast(enabled?"You're opted in to occasional PromoSlot updates.":"Marketing emails turned off",true);
  }catch(err){
    toast(err.message||"Could not update preference");
    // Roll the radios back to whatever the account actually has, not just
    // the opposite of what was clicked — the request may have failed for a
    // reason unrelated to which direction was chosen.
    const actual=!!(S.account&&S.account.marketing_opt_in);
    if(off) off.checked=!actual;
    if(on) on.checked=actual;
  }
  if(off) off.disabled=false;
  if(on) on.disabled=false;
}
async function openAddDebitCard(){
  const btn=$("addCardBtn");
  try{ await ensureStripeJs(); }catch(e){ toast("Stripe.js failed to load"); return; }
  if(typeof Stripe==="undefined"||!window._instantPk){ toast("Stripe.js failed to load"); return; }
  if(btn) btn.style.display="none";
  const form=$("debitCardForm");
  form.innerHTML=`<div id="debit-card-element" style="padding:10px;border:1px solid var(--line,#ddd);border-radius:8px"></div>
    <div class="hint-err hide" id="debit-card-err" style="margin-top:6px"></div>
    <button class="btn btn-p btn-sm" style="margin-top:10px" id="debitCardSubmit" onclick="submitDebitCard()">Add card</button>`;
  const stripe=Stripe(window._instantPk);
  const elements=stripe.elements();
  const card=elements.create("card");
  card.mount("#debit-card-element");
  window._debitCardCtx={stripe,card};
}
async function submitDebitCard(){
  const ctx=window._debitCardCtx; if(!ctx) return;
  const btn=$("debitCardSubmit"); btn.disabled=true; btn.innerHTML=`<span class="spin"></span> Adding…`;
  const errEl=$("debit-card-err"); errEl.classList.add("hide");
  // currency:'gbp' requests the special payout-destination token type, not a
  // charge token — the card number never reaches our backend, only this token id.
  const {token,error}=await ctx.stripe.createToken(ctx.card,{currency:"gbp"});
  if(error){ btn.disabled=false; btn.textContent="Add card"; errEl.textContent=error.message||"Card invalid, check your details."; errEl.classList.remove("hide"); return; }
  try{
    await PSApi.post("/connect/debit-card", {token: token.id});
    toast("Debit card added",true);
    window._debitCardCtx=null;
    refreshInstantStatus();
  }catch(err){
    btn.disabled=false; btn.textContent="Add card";
    errEl.textContent=err.message||"Could not add card"; errEl.classList.remove("hide");
  }
}
async function connectPayouts(){
  const btn=$("connectPayoutsBtn");
  if(btn){ btn.disabled=true; btn.innerHTML=`<span class="spin"></span> Redirecting…`; }
  try{
    await PSApi.post("/connect/account");
    const r=await PSApi.post("/connect/onboarding-link");
    window.location.href=r.url;
  }catch(err){
    toast(err.message||"Could not start payout setup");
    if(btn){ btn.disabled=false; btn.textContent="Connect with Stripe"; }
  }
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
  W.i=0; renderWiz("fwd"); toast("Campaign builder, prefilled from your profile");
}

/* ==================== NOTIFICATIONS ==================== */
const NOTIF_FEED=[
 {ico:"🚀",tag:"Founding cohort",txt:"PromoSlot is now open to its founding cohort. Real listings and campaigns appear here as members join."},
 {ico:"✨",tag:"New offer",txt:"See how a complete platform-owner listing looks, open the Example Creator profile.",ref:"px-ex"},
 {ico:"✨",tag:"New campaign",txt:"See how a complete business campaign looks, open the Example Campaign.",ref:"cx-ex"}
];
let notifOpen=false;
const NOTIF_ICON={deal_funded:"🔒",delivery_checklist_ready:"📋",proof_grace_period_opened:"⏳",proof_grace_period_opened_business:"⏳",deal_verified:"✅",payout_sent:"💸",deal_completed:"🎉",deal_refunded:"↩︎",proof_submitted:"📤",deal_revision:"✏️",message:"💬",campaign_application:"📩",deal_declined:"🚫",deal_approved:"🤝",review_received:"⭐",listing_removed:"🗑️",campaign_removed:"🗑️",account_restored:"👋",
  dispute_opened:"🛡️",dispute_opened_admin:"🛡️",dispute_closed:"✅",dispute_closed_admin:"✅",dispute_info_requested:"❓"};
function setBell(n){ const b=$("bellCnt"); if(!b) return; b.classList.toggle("hide",n<=0); b.textContent=n>9?"9+":n; }
function bellSync(){ if(!S.account) setBell(0); }
function _dot(id,on){ const e=$(id); if(e) e.classList.toggle("hide", !on); }
// Per-user attention dots. Notification unread clears when the bell is viewed.
// Messages/Review queue/Contacted Support/Awaiting payouts all clear the instant
// the admin who's looking has opened them, and relight only when something new
// shows up after that. Admin's overdue-suspension dot is the one exception that
// still persists until fixed, since nothing else ever resolves it.
function updateDots(){
  const a=S.attn||{unread:0,review_pending:0,awaiting_payout:0};
  const dashAttn=(a.unread>0)||(a.review_pending>0)||(a.awaiting_payout>0);
  _dot("userDot", !!S.account && dashAttn);   // avatar / dashboard attention
  _dot("dashDot", !!S.account && dashAttn);
  _dot("dot-review", !!a.review_new);
  _dot("dot-payouts", !!a.payouts_new);
  _dot("dot-support", !!a.support_new);
  _dot("dot-disputes", !!a.disputes_new);
  _dot("dot-msgs", !!a.unread_messages);
  _dot("dot-admin", (a.overdue_suspensions||0)>0);
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
  // Admin-facing dispute alerts open straight into that dispute's detail view.
  if(typeof ref==="string" && ref.indexOf("dispute:")===0){
    openDispute(parseInt(ref.slice(8),10)); return;
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
  $("nl-disputes").classList.toggle("hide", !can("dispute.manage"));
  $("nl-verification").classList.toggle("hide", !can("verification.view"));
  $("nl-completed").classList.toggle("hide", !canReview);
  $("nl-admin").classList.toggle("hide", !can("admin.view"));
  if(a){
    $("userChip").classList.remove("hide");   // avatar shows whenever logged in (incl. reviewer)
    const ui=$("userInit");
    if(a.avatar_url){ ui.textContent=""; ui.classList.add("has-img"); ui.style.backgroundImage=`url('${a.avatar_url}')`; }
    else { ui.classList.remove("has-img"); ui.style.backgroundImage=""; ui.textContent=(a.display_name||a.email||"?").slice(0,1).toUpperCase(); }
    $("userName").textContent=a.display_name||a.email;
    $("userName").title=a.display_name||a.email||""; // full name on hover — see #userName's ellipsis rule in index.html
  }
  updateDots();
}
async function openReviewQueue(){
  if(!can("deal.view_evidence")){ toast("Admin access required"); return; }
  setRoute("review-queue");
  showView("view-deal");
  let q=[]; try{ q=await PSApi.get("/review/queue"); }catch(e){}
  // Mark first, then refresh, so the dot clears in this interaction rather than
  // hanging around until the next 15s poll.
  PSApi.post("/notifications/queue-viewed/review",{}).catch(()=>{}).then(loadNotifications);
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
  PSApi.post("/notifications/queue-viewed/support",{}).catch(()=>{}).then(loadNotifications);
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
      <div class="ad-row"><span class="k">Email</span><span class="v">${esc(t.email||"none given")}</span></div>
      <div class="ad-row"><span class="k">Mobile</span><span class="v">${esc(t.mobile||"—")}</span></div>
      <div class="ad-row"><span class="k">PromoSlot account</span><span class="v">${t.user_id?`yes, they'll also get an in-app notification`:"no, email only"}</span></div>
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

/* ==================== DISPUTES QUEUE (chargebacks) ====================
   Admin-only. A "payment dispute" here is a real Stripe chargeback — never
   to be confused with the delivery-review queue above. Reason codes, the
   Stripe dispute id and the evidence deadline are shown here because this
   whole surface is dispute.manage-gated; deal.js/renderRealDeal never shows
   any of this to the business or platform owner (see payment_dispute_open). */
const DISPUTE_OPEN_STATUSES=new Set(["warning_needs_response","warning_under_review","needs_response","under_review"]);
function _disputeStatusLabel(s){
  return ({warning_needs_response:"Needs response (inquiry)",warning_under_review:"Under review (inquiry)",
    warning_closed:"Closed (inquiry)",needs_response:"Needs response",under_review:"Under review",
    won:"Won",lost:"Lost"})[s] || s;
}
function _disputeStatusCls(s){
  if(s==="won") return "st-done";
  if(s==="lost") return "st-dispute";
  if(DISPUTE_OPEN_STATUSES.has(s)) return "st-review";
  return "st-draft";
}
function _disputeDeadline(iso){
  if(!iso) return "";
  const ms=new Date(iso).getTime()-Date.now();
  const days=ms/86400000;
  const cls=days<0?"mut":days<2?"amber-urgent":"mut";
  const label=days<0?"deadline passed":days<1?"due within 24h":`due in ${Math.ceil(days)}d`;
  return `<span class="${cls}" style="${days<2&&days>=0?'color:var(--red);font-weight:800':''}">${label}</span>`;
}
async function openDisputesQueue(){
  if(!can("dispute.manage")){ toast("Admin access required"); return; }
  setRoute("disputes-queue");
  showView("view-deal");
  let list=[]; try{ list=await PSApi.get("/disputes"); }catch(e){}
  PSApi.post("/notifications/queue-viewed/disputes",{}).catch(()=>{}).then(loadNotifications);
  S._disputesList=list;
  const open=list.filter(d=>DISPUTE_OPEN_STATUSES.has(d.status)).length;
  $("dealWrap").innerHTML=`
    <div class="deal-top"><button class="btn btn-ghost" onclick="goHome()">← Home</button>
      <h2>Disputes</h2>
      <span class="status-pill ${open?"st-dispute":"st-done"}">${open} open</span></div>
    <div class="panel"><div class="panel-b">${list.length?list.map(d=>`
      <div class="deal-row" onclick="openDispute(${d.id})">
        <div class="pfp" style="background:${d.status==='lost'?'var(--red)':d.status==='won'?'var(--money)':'var(--amber)'}">${d.deal_id}</div>
        <div><div class="dr-t">Deal ${d.deal_id} · ${esc((d.business&&d.business.name)||"?")} ⇄ ${esc((d.owner&&d.owner.name)||"?")}</div>
          <div class="dr-s">${esc(d.reason||"unspecified")}${d.payout_already_released?" · payout already released":""}
            ${DISPUTE_OPEN_STATUSES.has(d.status)&&d.evidence_due_by?" · "+_disputeDeadline(d.evidence_due_by):""}</div></div>
        <span class="status-pill ${_disputeStatusCls(d.status)}">${esc(_disputeStatusLabel(d.status))}</span>
        <div class="dr-amt"><b>${gbpP(d.amount)}</b><small>${d.assigned_to?esc(d.assigned_to.name):"unclaimed"}</small></div>
      </div>`).join("")
      :`<div class="empty-state"><div class="es-ico">🛡️</div><h4>No disputes</h4><p>Chargebacks opened on any deal's payment appear here automatically.</p></div>`}</div></div>`;
}
/* ==================== ADMIN: ACCOUNT VERIFICATION QUEUE ====================
   Mirrors openReviewQueue's exact shape deliberately — same list/detail/
   decide pattern as delivery review, so moving between the two admin queues
   feels like one system. See backend/routers/verification.py. */
const VQ_LABELS={business_identity:"Business identity",platform_identity:"Platform identity",platform_ownership:"Platform ownership"};
// Rob, 2026-08-28: "the 'No Stripe check on this request — evidence only'
// can be cleaned up and highlighted to a green highlighted EVIDENCE and
// purple highlighted STRIPE" — lets admins scan the queue at a glance
// instead of reading a full sentence per row.
function vqTypePill(r){
  return r.stripe_legal_name
    ? `<span class="status-pill" style="background:var(--acc-soft);color:var(--acc);border:1px solid var(--acc-border)">STRIPE</span>`
    : `<span class="status-pill" style="background:var(--money-soft);color:var(--money);border:1px solid var(--money-border)">EVIDENCE</span>`;
}
async function openVerificationQueue(){
  if(!can("verification.view")){ toast("Admin access required"); return; }
  setRoute("verification-queue");
  showView("view-deal");
  let list=[]; try{ list=await PSApi.get("/verification/queue"); }catch(e){}
  S._verificationQueue=list;
  $("dealWrap").innerHTML=`
    <div class="deal-top"><button class="btn btn-ghost" onclick="goHome()">← Home</button>
      <h2>Verification queue</h2>
      <span class="status-pill st-review">${list.length} awaiting</span></div>
    <div class="panel"><div class="panel-b">${list.length?list.map(r=>`
      <div class="deal-row" onclick="openVerificationDecision(${r.id})">
        <div class="pfp" style="background:var(--acc)">🛡️</div>
        <div><div class="dr-t">${esc(VQ_LABELS[r.subject_type]||r.subject_type)} · ${esc(r.submitter_name||r.submitter_email||"owner #"+(r.business_id||r.platform_id||r.submitted_by))}</div>
          <div class="dr-s">${vqTypePill(r)} ${r.stripe_legal_name?esc(r.stripe_legal_name):"Submitted evidence"}</div></div>
        <span class="status-pill st-review">Pending</span>
      </div>`).join("")
      :`<div class="empty-state"><div class="es-ico">🛡️</div><h4>Nothing to review</h4><p>Business and platform-owner verification submissions appear here.</p></div>`}</div></div>`;
}
async function openVerificationDecision(id){
  const r=(S._verificationQueue||[]).find(x=>x.id===id);
  if(!r){ toast("Not found — try refreshing the queue"); return; }
  const checklistHtml=(r.evidence_checklist||[]).length
    ? `<div class="det-sec"><h5>What they claim to provide</h5>${r.evidence_checklist.map(t=>`<div class="proof-item"><span class="pi-ico">✓</span>${esc(t)}</div>`).join("")}</div>` : "";
  const evidenceHtml=(r.evidence_files||[]).length
    ? `<div class="det-sec"><h5>Attached evidence</h5>${r.evidence_files.map((u,i)=>`<div class="proof-item got"><span class="pi-ico">📎</span><a href="${esc(u)}" target="_blank" rel="noopener">Evidence file ${i+1} →</a></div>`).join("")}</div>` : "";
  // Rob, 2026-08-28: "how does this prove any authority the user has over
  // the business? all it gives me is the stripe legal name." Right — a
  // Stripe pass alone only proves SOME real identity exists, never that
  // it's THIS PromoSlot account. Showing what they claimed on PromoSlot
  // right next to what Stripe verified is what actually makes "confirm
  // this matches" a checkable thing instead of a rubber stamp.
  const claimedHtml = r.subject_type==="business_identity"
    ? `<div class="det-sec"><h5>Claimed on PromoSlot</h5>
        <div class="proof-item"><span class="pi-ico">🏢</span><div class="vf-body"><b>${esc(r.claimed_company||"— no company name on file —")}</b><small>Business profile's declared company name</small></div></div>
        <div class="proof-item"><span class="pi-ico">👤</span><div class="vf-body"><b>${esc(r.submitter_name||"—")}</b><small>${esc(r.submitter_email||"—")}</small></div></div>
      </div>`
    : r.subject_type==="platform_identity"
    ? `<div class="det-sec"><h5>Claimed on PromoSlot</h5>
        <div class="proof-item"><span class="pi-ico">👤</span><div class="vf-body"><b>${esc(r.submitter_name||"—")}</b><small>${esc(r.submitter_email||"—")}</small></div></div>
        ${(r.claimed_platforms||[]).length?(r.claimed_platforms||[]).map(p=>`<div class="proof-item"><span class="pi-ico">📡</span><div class="vf-body"><b>${esc(p.name)}</b><small>${esc(p.platform_type||"")}${p.handle?" · "+esc(p.handle):""}</small></div></div>`).join(""):`<div class="proof-item"><span class="pi-ico">📡</span><div class="vf-body"><b>No listings yet</b><small>Verifying the account, not tied to a specific listing</small></div></div>`}
      </div>`
    : `<div class="det-sec"><h5>Submitted by</h5>
        <div class="proof-item"><span class="pi-ico">👤</span><div class="vf-body"><b>${esc(r.submitter_name||"—")}</b><small>${esc(r.submitter_email||"—")}</small></div></div>
      </div>`;
  openModal(`<div class="m-pad"><h3 class="m-title">${esc(VQ_LABELS[r.subject_type]||r.subject_type)} ${vqTypePill(r)}</h3>
    <p class="m-sub">${r.stripe_legal_name?`Stripe verified legal name: <b>${esc(r.stripe_legal_name)}</b> — compare this against what's claimed on PromoSlot below before approving. A Stripe pass alone is never enough on its own.`:"No Stripe check on this request — review the evidence below on its own merits."}</p>
    ${claimedHtml}
    ${checklistHtml}${evidenceHtml}
    ${r.evidence_notes?`<div class="det-sec"><h5>Their notes</h5><p class="mut" style="font-size:13px">${esc(r.evidence_notes)}</p></div>`:""}
    <div class="frm" style="margin-top:12px"><div><label>Reason (required to reject, optional to approve)</label><textarea id="vq-reason" placeholder="Why this decision…"></textarea></div></div>
    <div class="m-actions"><button class="btn btn-o" onclick="closeModal()">Close</button>
      <button class="btn btn-danger" onclick="decideVerification(${r.id},false)">Reject</button>
      <button class="btn btn-p" onclick="decideVerification(${r.id},true)">Confirm match — approve</button></div></div>`,"wide");
}
async function decideVerification(id,approve){
  const reason=($("vq-reason")||{}).value||"";
  if(!approve && !reason.trim()){ toast("A reason is required to reject"); return; }
  try{
    await PSApi.post(`/verification/queue/${id}/${approve?"approve":"reject"}`,{reason});
    toast(approve?"Approved ✓":"Rejected",true);
    closeModal(); openVerificationQueue();
  }catch(e){ toast(e.message||"Could not save decision"); }
}
async function openDispute(id){
  if(!can("dispute.manage")){ toast("Admin access required"); return; }
  let d; try{ d=await PSApi.get(`/disputes/${id}`); }catch(e){ toast(e.message||"Could not load that dispute"); return; }
  S._dispute=d;
  const meId=String(S.account&&S.account.id);
  const owner=d.assigned_to;
  const iOwn=owner && String(owner.id)===meId;
  const events=(d.events||[]).map(e=>{
    const who=e.author?esc(e.author.name):"System";
    const when=e.created_at?new Date(e.created_at).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"";
    if(e.kind==="note") return `<div class="proof-item got"><span class="pi-ico">🔒</span>
      <div><b>Internal note · ${who}</b><div class="mut" style="font-size:12px;white-space:pre-wrap">${esc(e.body||"")}</div>
      <div class="mut" style="font-size:11.5px">${when} · never shown to either party</div></div></div>`;
    if(e.kind==="request_info") return `<div class="proof-item got" style="border-left:3px solid var(--acc)">
      <span class="pi-ico">❓</span>
      <div><b>Info requested from ${e.target_party==="business"?"the business":"the platform owner"} · ${who}</b>
      <div class="mut" style="font-size:12px;white-space:pre-wrap">${esc(e.body||"")}</div>
      <div class="mut" style="font-size:11.5px">${when} · sent as a notification</div></div></div>`;
    if(e.kind==="claim") return `<div class="proof-item"><span class="pi-ico">🙋</span>
      <div><b>Claimed · ${who}</b><div class="mut" style="font-size:11.5px">${when}</div></div></div>`;
    return `<div class="proof-item"><span class="pi-ico">🔔</span>
      <div><b>${who==="System"?"":who+" · "}${esc(e.body||"")}</b><div class="mut" style="font-size:11.5px">${when}</div></div></div>`;
  }).join("") || `<p class="mut" style="font-size:12.5px">Nothing yet.</p>`;

  const ownerRow = owner
    ? `<span class="status-pill ${iOwn?"st-done":"st-escrow"}">${iOwn?"You own this":esc(owner.name)+" owns this"}</span>`
    : `<span class="status-pill st-review">Unclaimed</span>`;
  const isOpenCase=DISPUTE_OPEN_STATUSES.has(d.status);

  $("dealWrap").innerHTML=`
    <div class="deal-top"><button class="btn btn-ghost" onclick="openDisputesQueue()">← Disputes</button>
      <h2>Dispute on Deal ${d.deal_id}</h2>${ownerRow}</div>
    <div class="agree-doc">
      <div class="ad-head"><span>🛡️ ${esc(_disputeStatusLabel(d.status))}</span>
        <span><a href="${d.stripe_url}" target="_blank" rel="noopener" class="btn btn-o btn-sm">Open in Stripe ↗</a></span></div>
      <div class="ad-row"><span class="k">Deal</span><span class="v"><a href="#" onclick="showView('view-deal');renderRealDeal(${d.deal_id});return false">Deal ${d.deal_id} →</a></span></div>
      <div class="ad-row"><span class="k">Business</span><span class="v">${esc((d.business&&d.business.name)||"—")}</span></div>
      <div class="ad-row"><span class="k">Platform owner</span><span class="v">${esc((d.owner&&d.owner.name)||"—")}</span></div>
      <div class="ad-row"><span class="k">Amount disputed</span><span class="v"><b>${gbpP(d.amount)}</b></span></div>
      <div class="ad-row"><span class="k">Reason (Stripe)</span><span class="v">${esc(d.reason||"unspecified")}</span></div>
      ${isOpenCase&&d.evidence_due_by?`<div class="ad-row"><span class="k">Evidence deadline</span><span class="v">${_disputeDeadline(d.evidence_due_by)} · ${new Date(d.evidence_due_by).toLocaleString("en-GB")}</span></div>`:""}
      <div class="ad-row"><span class="k">Payout impact</span><span class="v">${d.payout_already_released?`<b style="color:var(--red)">Payout already released</b>: an absorbed loss if this is lost, no automatic clawback`:"Deal frozen, nothing released yet, no extra loss beyond the disputed charge"}</span></div>
      ${d.outcome?`<div class="ad-row"><span class="k">Outcome</span><span class="v"><b>${esc(_disputeStatusLabel(d.outcome))}</b></span></div>`:""}
      <div class="ad-row"><span class="k">Stripe dispute ID</span><span class="v mut" style="font-size:12px">${esc(d.stripe_dispute_id)}</span></div>
    </div>

    ${!owner?`<div class="btn-row" style="margin-top:12px">
        <button class="btn btn-p" id="dq-claim" onclick="claimDispute(${d.id})">Claim this dispute</button></div>`:""}

    <div class="det-sec" style="margin-top:18px"><h5>Activity</h5>${events}</div>

    <div class="det-sec"><h5>Request information</h5>
      <p class="mut" style="font-size:12px;margin-bottom:8px">Ask the business or platform owner for a message, a deliverable or a screenshot before finalising the response in Stripe. Their reply comes back through Messages.</p>
      <div class="frm"><div class="row2">
        <div><label>Ask</label><select id="dq-target"><option value="business">Business: ${esc((d.business&&d.business.name)||"")}</option><option value="owner">Platform owner: ${esc((d.owner&&d.owner.name)||"")}</option></select></div>
      </div>
      <div><textarea id="dq-ask" placeholder="What do you need from them?"></textarea></div>
      <button class="btn btn-o btn-sm" onclick="requestDisputeInfo(${d.id})">Send request</button></div></div>

    <div class="det-sec"><h5>Internal note (dispute managers only)</h5>
      <div class="frm">
        <div><textarea id="dq-note" placeholder="Never shown to either party…"></textarea></div>
        <button class="btn btn-o btn-sm" onclick="addDisputeNote(${d.id})">Add note</button></div></div>

    <p class="mut" style="font-size:12px;margin-top:14px">Accepting or challenging this dispute, and submitting evidence, happens on Stripe's own dashboard (evidence submission is final). This page is for visibility and record-keeping, not for responding to Stripe directly.</p>`;
}
async function claimDispute(id){
  const b=$("dq-claim"); if(b){ b.disabled=true; b.innerHTML=`<span class="spin"></span> Claiming…`; }
  try{ await PSApi.post(`/disputes/${id}/claim`); }
  catch(e){ toast(e.message||"Could not claim"); }
  openDispute(id);
}
async function addDisputeNote(id){
  const ta=$("dq-note"); const body=(ta&&ta.value||"").trim();
  if(!body){ toast("Write the note first"); return; }
  try{ await PSApi.post(`/disputes/${id}/note`,{body}); }
  catch(e){ toast(e.message||"Could not add note"); return; }
  toast("Internal note added");
  openDispute(id);
}
async function requestDisputeInfo(id){
  const target=($("dq-target")||{}).value||"business";
  const ta=$("dq-ask"); const body=(ta&&ta.value||"").trim();
  if(!body){ toast("Write what you need first"); return; }
  try{ await PSApi.post(`/disputes/${id}/request-info`,{target_party:target, body}); }
  catch(e){ toast(e.message||"Could not send"); return; }
  toast("Request sent");
  openDispute(id);
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
  ["Indefinite: until manually restored",null],
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
  else if(tab==="banned" || tab==="upcoming"){
    try{ mods.members=await PSApi.get("/admin/members"); }catch(e){ mods.members={active:[],restricted:[],deactivated:[]}; }
    try{ mods.suspended=await PSApi.get("/admin/suspended"); }catch(e){ mods.suspended={listings:[],campaigns:[]}; }
  }
  else if(tab==="moderation"){
    try{ mods.listings=await PSApi.get("/platforms"); }catch(e){}
    try{ mods.campaigns=await PSApi.get("/campaigns"); }catch(e){}
    try{ mods.suspended=await PSApi.get("/admin/suspended"); }catch(e){ mods.suspended={listings:[],campaigns:[]}; }
    try{ mods.members=await PSApi.get("/admin/members"); }catch(e){ mods.members={active:[],restricted:[],deactivated:[]}; }
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
  } else if(tab==="upcoming"){
    // A filtered, sorted view of the same data as Banned/Suspended — nothing
    // stored separately. Qualifies only if a suspension has an end date:
    // indefinite ones have nothing upcoming about them, and bans never expire.
    const mem=(mods.members||{}).restricted||[];
    const sus=mods.suspended||{listings:[],campaigns:[]};
    const timed=x=>!x.banned && !!x.suspended_until;
    const soonest=(a,b)=>new Date(a.suspended_until)-new Date(b.suspended_until);
    const users=mem.filter(timed).sort(soonest);
    const items={listings:(sus.listings||[]).filter(timed).sort(soonest),
                 campaigns:(sus.campaigns||[]).filter(timed).sort(soonest)};
    const overdue=[...users,...items.listings,...items.campaigns]
                    .filter(x=>overdueDays(x.suspended_until)).length;
    body=`<p class="deal-sub" style="padding:0 2px 8px">Suspensions with an end date, soonest first. Nothing lifts automatically. A suspension ends when you restore it here.${
        overdue?` <b style="color:var(--red)">${overdue} already past its date.</b>`:""}</p>
      <div class="panel"><div class="panel-h"><h4>Users</h4></div><div class="panel-b">
        ${users.length?restrictedUserRowsHtml(users)
          :`<p class="mut" style="font-size:12.5px">No timed account suspensions.</p>`}
      </div></div>
      <div class="panel"><div class="panel-h"><h4>Campaigns/Listings</h4></div><div class="panel-b">
        ${(items.listings.length||items.campaigns.length)?restrictedItemRowsHtml(items)
          :`<p class="mut" style="font-size:12.5px">No timed listing or campaign suspensions.</p>`}
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
          <div class="dr-s">${esc(u.email)}${u.banned?" · <b>banned</b>":u.suspended?" · <b>suspended</b>":u.deactivated?" · <b>deactivated</b>":""}${u.suspended_reason?" · "+esc(u.suspended_reason):""}</div></div>
        <div class="btn-row">${btn}</div></div>`;
    body=`<p class="deal-sub" style="padding:0 2px 8px">What's live right now. Suspending hides an item and blocks new bookings but keeps it intact: it moves to <b>Banned/Suspended</b>, and returns here when restored or when its period runs out. <b>Delete removes it outright and cannot be undone.</b> Both are written to the audit log.</p>
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
          +`<button class="btn btn-danger btn-sm" onclick="adminBan(${u.id})">Ban</button>`
          +`<button class="btn btn-danger btn-sm" onclick="adminDeleteUser(${u.id})">Delete</button>`)).join("")
          :`<p class="mut" style="font-size:12.5px">No active member accounts.</p>`}
        ${mem.truncated?`<p class="mut" style="font-size:12px;margin-top:8px">Showing the ${mem.limit} most recent. Use the Admins tab search to find anyone older.</p>`:""}
      </div></div>
      <div class="panel"><div class="panel-h"><h4>Deactivated users</h4></div><div class="panel-b">
        <p class="mut" style="font-size:12.5px;margin-bottom:10px">Paused by the account holder themselves. Reversible, they just log back in. Their listings/campaigns are hidden below with the rest.</p>
        ${(mem.deactivated||[]).length?(mem.deactivated).map(u=>urow(u,
          `<button class="btn btn-danger btn-sm" onclick="adminDeleteUser(${u.id})">Delete</button>`)).join("")
          :`<p class="mut" style="font-size:12.5px">No deactivated accounts.</p>`}
      </div></div>
`;
  } else {
    body=`<p class="deal-sub" style="padding:0 2px 8px">Append-only. The database itself rejects any update or delete on this table: these entries cannot be edited or removed through any path.</p>
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
    <div class="det-tabs">${[["admins","Admins"],["moderation","Moderation"],["banned","Banned/Suspended"],["upcoming","Upcoming Lifts"],["audit","Audit log"]].map(([k,l])=>`<button class="det-tab ${tab===k?"on":""}" onclick="openAdmin('${k}')">${l}</button>`).join("")}</div>
    ${body}`;
  if(focus) _acpFocus(tab, focus);
}

// Deep-link target from a "View on ACP" link: scroll to and flash the row, or
// for an account, run the member search on their email so the existing
// promote/suspend/ban actions are right there.
// A timed suspension shows when it lifts; an indefinite one says so plainly,
// so "no date" is never mistaken for missing data.
//
// Nothing lifts a suspension automatically — a Super-Admin has to click
// Restore — so a date that has already passed is the thing most worth noticing,
// and must not read the same as one still in the future.
function _dmy(iso){
  return new Date(iso).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});
}
function overdueDays(iso){
  if(!iso) return 0;
  const ms=Date.now()-new Date(iso).getTime();
  return ms>0 ? Math.max(1, Math.floor(ms/86400000)) : 0;
}
function untilHtml(iso){
  if(!iso) return " · indefinitely";
  const d=overdueDays(iso);
  return d
    ? ` · <b style="color:var(--red)">⚠ Overdue by ${d} day${d===1?"":"s"}</b>`
    : " · until "+esc(_dmy(iso));
}
function suspensionSuffix(u){
  if(u.banned) return "";
  if(!u.suspended_at && !u.suspended) return "";
  return untilHtml(u.suspended_until);
}
function restrictedUserRowsHtml(rows){
  if(!rows.length) return `<div class="empty-state small"><div class="es-ico">👤</div><h4>No suspended or banned accounts</h4><p>Accounts you suspend or ban appear here.</p></div>`;
  return rows.map(u=>`<div class="deal-row" style="cursor:default" id="acp-u${u.id}">
      ${pfp(u.display_name||u.email,null)}
      <div><div class="dr-t">${esc(u.display_name||u.email)}</div>
        <div class="dr-s">${esc(u.email)} · <b>${u.banned?"banned":"suspended"}</b>${suspensionSuffix(u)}${u.suspended_reason?" · "+esc(u.suspended_reason):""}</div></div>
      <div class="btn-row">${u.banned
        ? `<button class="btn btn-o btn-sm" onclick="adminUnban(${u.id})">Lift ban</button>`
        : `<button class="btn btn-o btn-sm" onclick="adminUnsuspend(${u.id})">Restore</button>`}
        <button class="btn btn-danger btn-sm" onclick="adminDeleteUser(${u.id})">Delete</button></div>
    </div>`).join("");
}
function adminUnban(id){
  const u=(S._restrictedUsers||[]).find(x=>x.id===id);
  const name=u?(u.display_name||u.email):`user #${id}`;
  const why=u&&u.suspended_reason?u.suspended_reason:"no reason on record";
  if(!confirm(`Are you sure you want to lift the ban on "${name}"? They were banned for the following reason: "${why}"`)) return;
  _modAction(`/admin/users/${id}/unban`, "Ban lifted, account restored", {backTo:"banned"});
}
function _ownerStatusSuffix(o){
  // Extra context on who's actually behind a suspended listing/campaign —
  // most useful for the deactivated/deleted/banned cases, where the reason
  // the item is suspended has nothing to do with the item itself.
  if(!o) return "";
  if(o.status==="deleted") return ` · Owner: ${esc(o.display_name||"Deleted user")}: account deleted${o.last_known_email?" (was "+esc(o.last_known_email)+")":""}`;
  if(o.status==="deactivated") return ` · Owner: ${esc(o.display_name||o.email||"")}: account deactivated`;
  if(o.status==="banned") return ` · Owner: ${esc(o.display_name||o.email||"")}: account banned`;
  return "";
}
function restrictedItemRowsHtml(items){
  const ls=items.listings||[], cs=items.campaigns||[];
  if(!ls.length && !cs.length) return `<div class="empty-state small"><div class="es-ico">🚧</div><h4>Nothing suspended</h4><p>Suspended listings and campaigns appear here.</p></div>`;
  const row=(title,sub,btn,ref)=>`<div class="deal-row" style="cursor:default" id="acp-${esc(ref)}">
      <div class="pfp" style="background:var(--acc)">${esc((title||"?").slice(0,1).toUpperCase())}</div>
      <div><div class="dr-t">${esc(title)}</div><div class="dr-s">${sub}</div></div>
      <div class="btn-row">${btn}</div></div>`;
  const until=x=>untilHtml(x.suspended_until);
  return ls.map(l=>row(l.name,`Listing${until(l)}${l.suspended_reason?" · "+esc(l.suspended_reason):""}${_ownerStatusSuffix(l.owner)}`,
      `<button class="btn btn-o btn-sm" onclick="adminUnsuspendListing(${l.id})">Restore</button>`
      +`<button class="btn btn-danger btn-sm" onclick="adminRemoveListing(${l.id})">Delete</button>`, "p"+l.id)).join("")
   + cs.map(c=>row(c.title,`Campaign${until(c)}${c.suspended_reason?" · "+esc(c.suspended_reason):""}${_ownerStatusSuffix(c.owner)}`,
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
  if(!$("acp-"+ref)) toast("That item isn't listed, it may have been deleted.");
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
  else toast("That account isn't listed under Moderation, try the Admins tab.");
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
    if(isSelf) action=`<span class="mut" style="font-size:12.5px">That's you, you can't change your own role.</span>`;
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
      action+=`<button class="btn btn-danger btn-sm" onclick="adminDeleteUser(${u.id})">Delete</button>`;
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
  let r;
  try{ r=await PSApi.post(path, {...c, ...extra}); }catch(e){ toast(e.message||"Action failed"); return; }
  toast(typeof okMsg==="function"?okMsg(r):okMsg, true); loadMarket(); openAdmin(opts.backTo||"moderation");
}
const adminSuspendListing   = id => _modAction(`/admin/listings/${id}/suspend`,   "Listing suspended, hidden from the marketplace", {withDuration:true, backTo:"banned"});
const adminUnsuspendListing = id => _modAction(`/admin/listings/${id}/unsuspend`, "Listing restored", {backTo:"banned"});
const adminSuspendCampaign  = id => _modAction(`/admin/campaigns/${id}/suspend`,  "Campaign suspended, hidden from the marketplace", {withDuration:true, backTo:"banned"});
const adminUnsuspendCampaign= id => _modAction(`/admin/campaigns/${id}/unsuspend`,"Campaign restored", {backTo:"banned"});
// Always permanent, on the spot — Super-Admin can remove a listing/campaign
// whatever is attached to it. A quick pre-check warns honestly if a deal is
// in process before the (irreversible) confirm flow even starts; any
// attached deal is only ever detached from the listing/campaign, never
// touched otherwise (its status and money are left exactly as they were).
// Distinguished from Suspend in both wording and styling because Suspend can
// be undone and this cannot. The server still demands password + action code.
async function adminRemoveListing(id){
  let status={deals_total:0};
  try{ status=await PSApi.get(`/admin/listings/${id}/deal-status`); }catch(e){}
  if(status.deals_total>0){
    if(!confirm(`Listing currently in process: ${status.deals_total} deal(s) are attached. Removing the listing will not affect those deals or any money, only the listing itself. Continue?`)) return;
  }
  _modAction(`/admin/listings/${id}/remove`,
    r => r.deals_detached ? `Listing permanently deleted (${r.deals_detached} deal(s) detached, untouched otherwise)` : "Listing permanently deleted");
}
async function adminRemoveCampaign(id){
  let status={deals_total:0};
  try{ status=await PSApi.get(`/admin/campaigns/${id}/deal-status`); }catch(e){}
  if(status.deals_total>0){
    if(!confirm(`Campaign currently in process: ${status.deals_total} deal(s) are attached. Removing the campaign will not affect those deals or any money, only the campaign itself. Continue?`)) return;
  }
  _modAction(`/admin/campaigns/${id}/remove`,
    r => r.deals_detached ? `Campaign permanently deleted (${r.deals_detached} deal(s) detached, untouched otherwise)` : "Campaign permanently deleted");
}

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
  toast("Account suspended, sessions revoked",true); openAdmin("banned");
}
async function adminUnsuspend(userId){
  const c=adminCreds(); if(!c) return;
  try{ await PSApi.post(`/admin/users/${userId}/unsuspend`, c); }
  catch(e){ toast(e.message||"Could not unsuspend"); return; }
  // Restored users live on Banned/Suspended, not Admins — leftover redirect
  // from before the tab reorg.
  toast("Account restored",true); openAdmin("banned");
}
// Ban is permanent in effect (sessions revoked, the email can never sign up
// again) — the server still requires password + action code on top of this.
async function adminBan(userId){
  const c=adminCreds(); if(!c) return;
  try{ await PSApi.post(`/admin/users/${userId}/ban`, c); }
  catch(e){ toast(e.message||"Could not ban"); return; }
  toast("Account banned, sessions revoked",true); openAdmin("banned");
}
// Unlike Ban, this actually frees the email address — anonymize_user()
// overwrites it with a placeholder, so the real address is no longer
// attached to any account and can be used to sign up again. Irreversible:
// there is no "undelete" the way unban/unsuspend exist, since the personal
// data itself is gone, not just flagged.
async function adminDeleteUser(userId){
  if(!confirm("Permanently wipe this account's personal data? This cannot be undone. Unlike a ban, there is no way to restore it afterwards. The email address will be freed up and can be used to sign up again.")) return;
  const c=adminCreds(); if(!c) return;
  try{ await PSApi.post(`/admin/users/${userId}/delete`, c); }
  catch(e){ toast(e.message||"Could not delete"); return; }
  toast("Account deleted, email can be reused",true); openAdmin("banned");
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
  PSApi.post("/notifications/queue-viewed/payouts",{}).catch(()=>{}).then(loadNotifications);
  $("dealWrap").innerHTML=`
    <div class="deal-top"><button class="btn btn-ghost" onclick="openReviewQueue()">← Review queue</button><h2>Awaiting Payouts</h2>
      <button class="btn btn-o btn-sm" onclick="openCompleted()">🗂️ Completed Deals →</button>
      <span class="status-pill st-escrow">${q.length} to pay</span></div>
    <p class="deal-sub" style="padding:0 2px 6px">Verified deals waiting for a payout. They stay here until you release the funds (or refund). Nothing is lost after verification.</p>
    <div class="panel"><div class="panel-b">${q.length?q.map(item=>`
      <div class="deal-row" onclick="showView('view-deal');renderRealDeal(${item.deal_id})">
        <div class="pfp" style="background:var(--acc)">${item.deal_id}</div>
        <div><div class="dr-t">Deal ${item.deal_id} · ${esc(item.owner)}</div>
          <div class="dr-s">Verified · ${item.payout_ready?"payout ready":"owner hasn't set up payouts yet"}</div></div>
        <div class="dr-amt"><b>${gbpP(item.net_to_owner)}</b><small>to owner</small></div></div>`).join("")
      :`<div class="empty-state"><div class="es-ico">💸</div><h4>No payouts pending</h4><p>Verified deals awaiting payout appear here until you release the funds.</p></div>`}</div></div>`;
}
async function loadMine(){
  if(!S.account){ S.myPlatforms=[]; S.myCampaigns=[]; S.platVerified=false; return; }
  await Promise.all([
    S.account.is_platform_owner
      ? PSApi.get("/platforms/mine").then(r=>{S.myPlatforms=r;}).catch(()=>{S.myPlatforms=[];})
      : Promise.resolve(S.myPlatforms=[]),
    // Account-level verification status, independent of whether any listing
    // exists yet — see backend/services.py's platform_owner_verified. Drives
    // the "Get verified" buttons below instead of S.myPlatforms.some(verified),
    // which would stay permanently false for an owner with zero listings.
    S.account.is_platform_owner
      ? PSApi.get("/verification/platform/my-requests").then(r=>{S.platVerified=!!(r&&r.verified);}).catch(()=>{S.platVerified=false;})
      : Promise.resolve(S.platVerified=false),
    S.account.is_business
      ? PSApi.get("/campaigns/mine").then(r=>{S.myCampaigns=r;}).catch(()=>{S.myCampaigns=[];})
      : Promise.resolve(S.myCampaigns=[]),
    // Merge real fields (verified, has_stripe_account, id) onto S.biz without
    // clobbering the wizard-only display fields (product/target/intents/...)
    // that have no backing column on Business — see finishBiz(). Defaults go
    // FIRST, not last: renderBizDash() reads fields like b.countries.join()
    // unconditionally, so S.biz must never end up missing them just because
    // a real Business row came back before this session ever ran the wizard
    // (a real bug this exact ordering caused — S.biz went from "always fully
    // shaped" to "only has what the API returned" the moment a Business row
    // existed, and the old fallback below only filled gaps when S.biz was
    // still null, not when it was a partial object).
    S.account.is_business
      ? PSApi.get("/businesses/me").then(r=>{ if(r) S.biz={
          company:S.account.display_name||S.account.email,product:"—",industry:"—",target:"",
          intents:[],countries:[],platforms:[],services:[],sizes:[],budget:0,payMethods:[],duration:"—",
          ...(S.biz||{}),...r}; }).catch(()=>{})
      : Promise.resolve(),
  ]);
}
// Every gated action funnels through here rather than calling authModal()
// directly, for one consistent entry point (defaults to "login" when no mode
// is given). The modal itself is identical every time regardless of how many
// gated actions a guest has hit — no escalating copy (see nudgeCopy()).
function authGate(mode){
  authModal(mode||"login");
}

// Where to go once a session exists. Both login and email-verification land
// here — email verification is a real page navigation (clicking a link),
// which wipes any in-memory wizard state, so WIZARD_RESUME_KEY is the one
// thing that survives that gap. Everything else about "where to go" stays
// the homepage; this only fires when the account came from starting one of
// the listing/campaign wizards as a guest (see wizNext()'s auth gate).
function _resumeAfterAuth(){
  window._afterAuth = null;   // nothing reads this any more; cleared for safety
  closeSignupNudge();         // they signed up, stop asking
  // A deal-notification email link (see DEAL_RESUME_KEY) takes priority over
  // the normal homepage landing: someone who followed "Add proof to Deal
  // #482" into a login gate wants to land on Deal #482, not the homepage.
  let resumeDeal=null;
  try{ resumeDeal=sessionStorage.getItem(DEAL_RESUME_KEY); sessionStorage.removeItem(DEAL_RESUME_KEY); }catch(e){}
  if(resumeDeal && S.account){
    showView("view-deal"); renderRealDeal(parseInt(resumeDeal,10));
  } else {
    goHome();
  }
  // Both login and email-verification land here, so this is the single point
  // where a brand-new account gets offered the tour. maybeOfferTour() no-ops
  // for anyone who has already seen, skipped or finished it.
  maybeOfferTour();
  syncTourResume();
  let resumeKind=null;
  try{ resumeKind=sessionStorage.getItem(WIZARD_RESUME_KEY); sessionStorage.removeItem(WIZARD_RESUME_KEY); }catch(e){}
  if(!resumeKind || !S.account) return;
  // Jump straight to the platform-type/campaign step rather than re-asking
  // the "which of these are you" intent question — signing up already
  // answered that. Guard on the account's actual role rather than trusting
  // resumeKind blindly, in case they ended up choosing a different role at
  // the signup form than the wizard they started from implied.
  if((resumeKind==="plat"||resumeKind==="both") && S.account.is_platform_owner){
    openRegisterPlatform();
  } else if((resumeKind==="biz"||resumeKind==="both") && S.account.is_business){
    openNewCampaign();
  }
}

// The single login/signup entry modal, used everywhere: the nav buttons, every
// gated action, the wizard's step-2 gate and the ambient nudge. The left panel
// is fixed — it never changes with the mode or with how many gates this guest
// has already hit. Escalating copy belongs to the nudge, not here.
function _authSyncNameFields(){
  const biz=$("au-r-biz"), plat=$("au-r-plat"); if(!biz||!plat) return;
  const both = biz.classList.contains("on") && plat.classList.contains("on");
  $("au-name2-wrap").classList.toggle("hide", !both);
  $("au-name-lbl").textContent = both ? "Business name"
    : plat.classList.contains("on") ? "Platform-owner name" : "Display name";
}
function authModal(mode){
  const isSignup = mode==="signup";
  openModal(`<div class="auth-split">
    <div class="auth-hero" style="background-image:url('/img/signup-hero.jpg')">
      <div class="auth-hero-scrim">
        <h2>The future of<br>audience marketing<br><em>starts with you.</em></h2>
        <ul class="auth-bullets">
          <li><b>Monetize your audience instantly</b><span>Turn your communities into real revenue.</span></li>
          <li><b>Connect with platform owners across Discord, Reddit, YouTube, TikTok and more</b><span>Find the right audience and launch campaigns that drive real results.</span></li>
          <li><b>Secure payments. Verified delivery.</b><span>No risk. No guesswork.</span></li>
          <li><b>Funds release only after approval</b><span>Backed by money-back protection.</span></li>
        </ul>
      </div>
    </div>
    <div class="auth-form-side">
      <div class="m-pad">
        <h3 class="m-title">${isSignup?"Create your PromoSlot account":"Log in"}</h3>
        <p class="m-sub">${isSignup?"One account: choose one or both roles.":"Welcome back."}</p>
        <div class="frm">
          ${isSignup?`<div id="au-name-wrap"><label id="au-name-lbl">Display name</label><input type="text" id="au-name" placeholder="Robert Media"></div>
          <div id="au-name2-wrap" class="hide"><label>Platform-owner name</label><input type="text" id="au-name2" placeholder="RobertLifts"></div>`:""}
          <div><label>Email</label><input type="text" id="au-email" placeholder="you@example.com"></div>
          <div><label>Password</label><input type="password" id="au-pass" placeholder="${isSignup?"At least 8 characters":"Your password"}" onkeydown="if(event.key==='Enter'){${isSignup?"doSignup":"doLogin"}()}"></div>
          ${isSignup?`<div><label>I am a…</label><div class="chips-lg">
            <button type="button" class="chip" id="au-r-biz" onclick="this.classList.toggle('on');_authSyncNameFields()">Business</button>
            <button type="button" class="chip" id="au-r-plat" onclick="this.classList.toggle('on');_authSyncNameFields()">Platform owner</button>
          </div></div>`:""}
          ${isSignup?`<label style="display:flex;align-items:flex-start;gap:8px;font-size:12.5px;font-weight:400;cursor:pointer;margin-top:4px">
            <input type="checkbox" id="au-marketing" style="margin-top:2px">
            <span>Send me occasional product updates and tips. Optional, unsubscribe any time.</span>
          </label>`:""}
          ${isSignup?`<div id="au-turnstile" style="margin-top:2px"></div>`:""}
          <div class="hint-err hide" id="au-err"></div>
          ${isSignup?"":`<p class="mut" style="font-size:12.5px;margin-top:2px">Signed up but never got the verification email?
            <a href="#" class="party-link" onclick="event.preventDefault();resendVerification(($('au-email')||{}).value||'')">Send it again</a></p>`}
        </div>
        <div class="m-actions">
          <button class="btn btn-ghost" onclick="authModal('${isSignup?"login":"signup"}')">${isSignup?"Have an account? Log in":"Need an account? Sign up"}</button>
          <button class="btn btn-p" id="au-submit" onclick="${isSignup?"doSignup":"doLogin"}()">${isSignup?"Create account":"Log in"}</button>
        </div>
        <p class="auth-legal">By joining, you agree to PromoSlot's
          <!-- TODO: replace href with the real Terms of Service page once published (see task: publish real ToS/Privacy pages) -->
          <a href="#">Terms of Service</a> and
          <!-- TODO: replace href with the real Privacy Policy page once published -->
          <a href="#">Privacy Policy</a>.</p>
      </div>
    </div>
  </div>`,"wide");
  if(isSignup) _authRenderTurnstile();
}
// PUBLIC_SITE_KEY is safe to hardcode: Turnstile's site key is meant to be
// embedded client-side (only the secret key, held server-side, is sensitive).
const TURNSTILE_SITE_KEY="0x4AAAAAAEXhXW3-WtoKdSE0";
S._turnstileToken=null;
function _authRenderTurnstile(attempt){
  const el=$("au-turnstile"); if(!el) return;
  if(!(window.turnstile && window.turnstile.render)){
    // The script loads async; a modal opened in the first instant of a page
    // load can beat it. Retry briefly rather than leaving the widget blank.
    if((attempt||0) < 20) setTimeout(()=>_authRenderTurnstile((attempt||0)+1), 250);
    return;
  }
  S._turnstileToken=null;
  window.turnstile.render(el, {
    sitekey: TURNSTILE_SITE_KEY,
    callback: (token)=>{ S._turnstileToken=token; },
    "expired-callback": ()=>{ S._turnstileToken=null; },
    "error-callback": ()=>{ S._turnstileToken=null; },
  });
}
function _authErr(msg){ const e=$("au-err"); if(e){ e.textContent=msg; e.classList.remove("hide"); } }
async function doSignup(){
  const email=($("au-email").value||"").trim(), password=$("au-pass").value||"";
  const display_name=($("au-name").value||"").trim();
  const is_business=$("au-r-biz").classList.contains("on");
  const is_platform_owner=$("au-r-plat").classList.contains("on");
  const both = is_business && is_platform_owner;
  const second_display_name = both ? ($("au-name2").value||"").trim() : null;
  const marketing_opt_in = !!($("au-marketing")||{}).checked;
  if(!email||!password){ _authErr("Email and password are required."); return; }
  if(!is_business && !is_platform_owner){ _authErr("Select at least one role."); return; }
  if(both){
    if(!display_name||!second_display_name){ _authErr("Enter a name for both profiles."); return; }
    if(display_name.toLowerCase()===second_display_name.toLowerCase()){
      _authErr("Your business and platform-owner profiles need different names."); return;
    }
  }
  if(TURNSTILE_SITE_KEY && !S._turnstileToken){ _authErr("Please complete the verification check."); return; }
  const btn=$("au-submit"); btn.disabled=true; btn.textContent="Creating…";
  let res;
  try{
    res=await PSApi.signup({email,password,display_name:display_name||null,is_business,is_platform_owner,
      second_display_name,turnstile_token:S._turnstileToken,marketing_opt_in});
  }catch(err){
    btn.disabled=false; btn.textContent="Create account"; _authErr(err.message||"Signup failed");
    // The token is single-use regardless of why signup failed — force a fresh
    // widget rather than letting a retry silently send an already-spent one.
    _authRenderTurnstile();
    return;
  }
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
// Cross-tab verification sync: BroadcastChannel only reaches other tabs in
// the same browser on the same origin. It can't bridge a link opened on a
// different device (checking email on your phone after signing up on
// desktop) — that case lands the phone's tab on its own dashboard, exactly
// as it does today. This just saves a manual refresh for the common case of
// the link being clicked in the same browser as the waiting tab.
const VERIFY_CHANNEL_NAME = "ps-verify";
function _verifyChannel(){
  try{ return new BroadcastChannel(VERIFY_CHANNEL_NAME); }catch(e){ return null; }  // unsupported browser: sync just doesn't happen, the link itself still works
}
function checkYourEmailModal(email){
  if(S._verifyBc){ S._verifyBc.close(); S._verifyBc=null; }
  openModal(`<div class="m-pad"><h3 class="m-title">Check your email</h3>
    <p class="m-sub">We've sent a link to <b>${esc(email||"your inbox")}</b>. Click it to confirm
       your address, you'll be signed in straight away. The link works once and expires in 24 hours.</p>
    <p class="mut" style="font-size:12.5px">Not arrived? Check spam, or send it again below.</p>
    <div class="hint-err hide" id="vr-err"></div>
    <div class="m-actions">
      <button class="btn btn-o" id="vr-resend" onclick="resendVerification('${esc(email||"")}')">Send it again</button>
      <button class="btn btn-p" onclick="closeVerifyWait()">Got it</button></div></div>`,"narrow");
  const bc=_verifyChannel();
  if(!bc) return;
  S._verifyBc=bc;
  bc.onmessage=async (e)=>{
    if(!e.data || e.data.type!=="verified" || S.account) return;   // already signed in here: nothing to do
    closeVerifyWait();
    await restoreSession();
    toast("Email verified, you're signed in ✓",true);
    _resumeAfterAuth();
  };
}
// "Got it" (or any other path away from the waiting screen) stops listening —
// no point reacting to a verification that happened after the person moved on.
function closeVerifyWait(){
  if(S._verifyBc){ S._verifyBc.close(); S._verifyBc=null; }
  closeModal();
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

// A marketing opt-in/unsubscribe link lands as /?optin=<token> or
// /?unsubscribe=<token>: consume it against the API and just say what
// happened. No modal, no sign-in needed — this is a low-stakes preference,
// not an account action, so a toast is enough.
async function marketingTokenFromLink(token, purpose){
  try{
    await PSApi.post(`/marketing/${purpose}`, {token});
    toast(purpose==="optin" ? "You're opted in to occasional PromoSlot updates."
                            : "You've been unsubscribed from PromoSlot marketing emails.", true);
  }catch(e){
    toast(e.message || "That link is invalid or has expired.");
  }
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
  toast("Email verified, you're signed in ✓",true);
  // Tell any other same-browser tab still showing "Check your email" (see
  // checkYourEmailModal) so it updates itself instead of sitting stale.
  const bc=_verifyChannel();
  if(bc){ bc.postMessage({type:"verified"}); bc.close(); }
  _resumeAfterAuth();   // homepage, same as a normal login
}

function forgotPasswordModal(prefill){
  openModal(`<div class="m-pad"><h3 class="m-title">Reset your password</h3>
    <p class="m-sub">Enter the email on your account. We'll send a secure link to set a new password, it expires in 1 hour.</p>
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
  closeModal(); toast("Password updated, please log in",true);
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
function openEditDisplayName(){
  const cur=(S.account&&S.account.display_name)||"";
  openModal(`<div class="m-pad"><h3 class="m-title">Change your display name</h3>
    <p class="m-sub">Shown across PromoSlot: on your profile, listings, and to the other party in a deal.</p>
    <div class="frm"><label>Display name</label>
      <input type="text" id="dn-name" value="${esc(cur)}" placeholder="e.g. Meadow & Moss" onkeydown="if(event.key==='Enter')saveDisplayName()"></div>
    <div class="hint-err hide" id="dn-err"></div>
    <div class="m-actions"><button class="btn btn-o" onclick="closeModal()">Cancel</button>
      <button class="btn btn-p" onclick="saveDisplayName()">Save</button></div></div>`);
}
async function saveDisplayName(){
  const input=$("dn-name"); const e=$("dn-err");
  const v=(input.value||"").trim();
  if(!v){ e.textContent="Enter a name."; e.classList.remove("hide"); return; }
  try{
    const r=await PSApi.post("/me/profile",{display_name:v});
    S.account.display_name=r.display_name;
    closeModal();
    toast("Display name updated",true);
    openAccount();
  }catch(err){ e.textContent=err.message||"Could not update name"; e.classList.remove("hide"); }
}
function openEditPhone(){
  const cur=(S.account&&S.account.phone)||"";
  openModal(`<div class="m-pad"><h3 class="m-title">Emergency contact phone</h3>
    <p class="m-sub">Optional and private, never shown on your public profile or to the other party in a deal. Only used in the rare case PromoSlot needs to reach you urgently, e.g. a time-limited window to add delivery proof before a deal is finalized.</p>
    <div class="frm"><label>Phone number</label>
      <input type="tel" id="ph-num" value="${esc(cur)}" placeholder="e.g. +44 7700 900123" onkeydown="if(event.key==='Enter')savePhone()"></div>
    <div class="hint-err hide" id="ph-err"></div>
    <div class="m-actions"><button class="btn btn-o" onclick="closeModal()">Cancel</button>
      ${cur?`<button class="btn btn-ghost" onclick="clearPhone()">Remove</button>`:""}
      <button class="btn btn-p" onclick="savePhone()">Save</button></div></div>`);
}
async function savePhone(){
  const input=$("ph-num"); const e=$("ph-err");
  const v=(input.value||"").trim();
  try{
    const r=await PSApi.post("/me/profile",{phone:v});
    S.account.phone=r.phone;
    closeModal();
    toast(v?"Phone number saved":"Phone number removed",true);
    openAccount();
  }catch(err){ e.textContent=err.message||"Could not save phone number"; e.classList.remove("hide"); }
}
async function clearPhone(){
  try{ const r=await PSApi.post("/me/profile",{phone:""}); S.account.phone=r.phone; }
  catch(err){ toast(err.message||"Could not remove phone number"); return; }
  closeModal();
  toast("Phone number removed",true);
  openAccount();
}
// Real completeness track for the My Account identity header — every item
// is read from data that actually exists on the account (S.account,
// S._who from /users/{id}/public, S.myPlatforms, S.myCampaigns). Nothing
// here is fabricated, scored, or ranked against other users.
function acctCompletenessSteps(a){
  const isPlat=!!a.is_platform_owner, isBiz=!!a.is_business;
  const bio=((S._who&&S._who.about_text)||"").trim();
  const firstList = isPlat ? (S.myPlatforms||[]) : (isBiz ? (S.myCampaigns||[]) : []);
  const hasFirst = firstList.length>0;
  const firstLabel = isPlat ? "First listing live" : (isBiz ? "First campaign posted" : "Set up a role");
  const firstName = isPlat ? (firstList[0]&&firstList[0].name) : (firstList[0]&&(firstList[0].title||firstList[0].name));
  // Rob, 2026-08-28: drop the video requirement entirely, lead with the
  // product tour instead — a recording shouldn't gate "getting started",
  // and the tour is the thing every new signup should actually do first.
  return [
    {label:"PromoSlot tour", done:!!a.product_tour_completed_at, state:a.product_tour_completed_at?"Complete":"Not started"},
    {label:"Profile photo", done:!!a.avatar_url, state:a.avatar_url?"Added":"Not added yet"},
    {label:"Bio written", done:bio.length>0, state:bio.length>0?"Live on your profile":"Empty"},
    {label:firstLabel, done:hasFirst, state:hasFirst?(firstName||"Live"):(isPlat||isBiz?"None yet":"Business or platform owner")}
  ];
}
function acctTrackHtml(a){
  const steps=acctCompletenessSteps(a);
  const done=steps.filter(s=>s.done).length;
  const headline=done>=steps.length?"Your profile is complete.":`${done} of ${steps.length} things done.`;
  return `<div>
      <div class="acct2-track-label">Your profile, so far</div>
      <p class="acct2-track-headline">${esc(headline)}</p>
    </div>
    <div class="acct2-steps">
      ${steps.map(s=>`<div class="acct2-step${s.done?" done":""}">
          <div class="acct2-step-track"><span class="acct2-step-dot">${s.done?"✓":""}</span><span class="acct2-step-line"></span></div>
          <div class="acct2-step-body"><div class="acct2-step-label">${esc(s.label)}</div><div class="acct2-step-state">${esc(s.state)}</div></div>
        </div>`).join("")}
    </div>`;
}
// Repaints just the identity-header track — called after anything that
// changes what it's measuring (bio saved, asset added) without re-rendering
// the whole account page. No-ops if the account view isn't open.
function updateAcctTrack(){
  const host=$("acct2Track"); if(!host||!S.account) return;
  host.innerHTML=acctTrackHtml(S.account);
}
// Same status + onclick pattern already live on the business/platform
// dashboards (see the "Verification" mini-row in each) — this just puts the
// same entry point in My Account too, so it isn't dashboard-only. Reused
// wholesale rather than re-derived, so both places can never disagree.
function verifyPanelHtml(a){
  const isBiz=!!a.is_business, isPlat=!!a.is_platform_owner;
  const bizVerified = S.biz && S.biz.verified;
  // Account-level, not tied to owning a listing yet — see loadMine()'s
  // S.platVerified fetch and services.platform_owner_verified.
  const platVerified = !!S.platVerified;
  return `<h3>Verification</h3>
    <p>A Verified ✔ badge shows on your listings and profile once a PromoSlot reviewer confirms your identity.</p>
    <div class="mini-rows" style="margin-top:12px">
      ${isBiz?`<div><span>Business</span><button class="btn btn-o btn-sm" onclick="${bizVerified?"toast('Your business is already verified ✔',true)":"openVerify('biz')"}">${bizVerified?"Verified ✔":"Get verified"}</button></div>`:""}
      ${isPlat?`<div><span>Platform owner</span><button class="btn btn-o btn-sm" onclick="${platVerified?"toast('Your account is already verified ✔',true)":"openVerify('plat')"}">${platVerified?"Verified ✔":"Get verified"}</button></div>`:""}
    </div>`;
}
function updateVerifyPanel(){
  const host=$("verifyPanel"); if(host && S.account) host.innerHTML=verifyPanelHtml(S.account);
}
function openAccount(){
  const a=S.account;
  if(!a){ authModal("login"); return; }
  setRoute("account");
  showView("view-account");
  // Drives the homepage checklist's "set up your public profile" step —
  // fire-and-forget, same pattern as tourSave(), and idempotent server-side.
  if(!a.profile_setup_viewed_at){
    a.profile_setup_viewed_at=new Date().toISOString();
    PSApi.post("/auth/profile-viewed").then(acct=>{ if(acct) S.account=acct; }).catch(()=>{});
  }
  const isPlat=!!a.is_platform_owner, isBiz=!!a.is_business, isSuper=S.myRole==="SUPER_ADMIN", isAdmin=S.myRole==="ADMIN";
  const roles=roleLabels(a);
  $("accountWrap").innerHTML=`
    <div class="deal-top">
      <button class="btn btn-ghost" onclick="goHome()">← Home</button>
      <div class="acct2-kicker">Your account</div>
      <button type="button" class="acct2-logout" style="margin-left:auto" onclick="doLogout()">Log out</button>
    </div>
    <div class="acct2">
      <header class="acct2-hero">
        <div class="acct2-hero-bar"></div>
        <div class="acct2-hero-grid">
          <div class="acct2-id-col">
            <div class="acct2-id-row">
              <div class="acct2-avatar-col">
                <div class="acct2-avatar${a.avatar_url?" has-img":""}"${a.avatar_url?` style="background-image:url('${a.avatar_url}')"`:""}>${a.avatar_url?"":esc((a.display_name||a.email||"?").slice(0,1).toUpperCase())}</div>
                <label class="acct2-avatar-btn" for="acct-avatar">${a.avatar_url?"Change photo":"Add photo"}</label>
                <input type="file" id="acct-avatar" accept="image/*" class="pf-file-input" onchange="uploadAvatar()">
              </div>
              <div style="min-width:220px;flex:1">
                <div class="acct2-name-row">
                  <h1 class="acct2-name">${esc(a.display_name||"—")}</h1>
                  <button type="button" class="acct2-name-edit" onclick="openEditDisplayName()">Edit name</button>
                </div>
                <p class="acct2-email">${esc(a.email)}<span class="acct2-email-tag">Sign-in email</span></p>
                <div class="acct2-name-row" style="margin-top:2px">
                  <p class="acct2-email" style="margin:0">${a.phone?esc(a.phone):"No phone on file"}<span class="acct2-email-tag">This number will not be shown publicly</span></p>
                  <button type="button" class="acct2-name-edit" onclick="openEditPhone()">${a.phone?"Edit":"Add"}</button>
                </div>
                <div class="acct2-name-row" style="margin-top:2px">
                  <p class="acct2-email" style="margin:0">Marketing emails<span class="acct2-email-tag">Occasional updates and tips, optional. Opt in only, off by default.</span></p>
                  <div style="display:flex;align-items:center;gap:14px">
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                      <input type="radio" name="mktPref" id="mktOff" ${!a.marketing_opt_in?"checked":""} onchange="if(this.checked)setMarketingPreference(false)">
                      <b class="mut" style="font-size:12px">Off</b>
                    </label>
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                      <input type="radio" name="mktPref" id="mktOn" ${a.marketing_opt_in?"checked":""} onchange="if(this.checked)setMarketingPreference(true)">
                      <b class="mut" style="font-size:12px">On</b>
                    </label>
                  </div>
                </div>
                <div class="acct2-tags">
                  ${isPlat?`<span class="acct2-tag">Platform owner</span>`:""}
                  ${isBiz?`<span class="acct2-tag">Business</span>`:""}
                  ${isSuper?`<span class="acct2-tag super">Super-Admin</span>`:(isAdmin?`<span class="acct2-tag super">Admin</span>`:"")}
                  ${!isPlat&&!isBiz?`<span class="acct2-tag neutral">No role set</span>`:""}
                  <button type="button" class="acct2-tour" onclick="tourRestart()">${a.product_tour_completed_at?"Replay product tour":"Take the product tour"}</button>
                </div>
              </div>
            </div>
          </div>
          <div class="acct2-track" id="acct2Track">${acctTrackHtml(a)}</div>
        </div>
      </header>

      <section class="acct2-zone">
        <div class="acct2-zone-head">
          <div>
            <div class="acct2-zone-kicker">01: Your public presence</div>
            <h2 class="acct2-zone-title">What businesses see <em>before</em> they message you.</h2>
          </div>
          <p class="acct2-zone-sub">Your listings, your intro video and your bio all appear on your public profile. This is the part of the account worth spending time on.</p>
        </div>

        ${isPlat?`
        <div class="acct2-listings-panel">
          <div class="acct2-listings-head">
            <div><h3>Your listings</h3><p>Services, pricing and analytics for each platform you run. Open a listing to change what people see.</p></div>
            <button class="btn btn-p" onclick="openRegisterPlatform()">Register a new platform</button>
          </div>
          <div class="acct2-listings-grid">
            ${(S.myPlatforms||[]).length?(S.myPlatforms||[]).map(l=>`
              <div class="acct2-lcard">
                <div class="acct2-lcard-top">${pfp(l.name,l.platform,"",l.ownerAvatar)}
                  <div style="min-width:0"><div class="acct2-lcard-name">${esc(l.name)}</div><div class="acct2-lcard-kind">${esc(l.platform)}</div></div>
                </div>
                <div class="acct2-lcard-tags">
                  <span class="acct2-lcard-tag">${(l.services||[]).length} service${(l.services||[]).length===1?"":"s"}</span>
                  <span class="acct2-lcard-tag acc">${(l.pricing||[]).length} price${(l.pricing||[]).length===1?"":"s"}</span>
                </div>
                <div class="acct2-lcard-foot">
                  <span class="acct2-lcard-status">${l.suspended?"Suspended":"Visible in marketplace"}</span>
                  <button class="btn btn-o btn-sm" onclick="openListing('${l.id}')">Open</button>
                </div>
              </div>`).join(""):""}
            <button type="button" class="acct2-add-listing" onclick="openRegisterPlatform()">
              <span><span class="t">Add a listing</span><span class="s">Another newsletter, channel, community or stream under this account.</span></span>
              <span class="go">Register →</span>
            </button>
          </div>
        </div>`:""}

        <div class="acct2-cards2">
          <div class="acct2-card" id="whoPanel"></div>
          <div class="acct2-card" id="verifyPanel">${verifyPanelHtml(a)}</div>
          <div class="acct2-card">
            <h3>Intro video</h3>
            <p>A short hello on your public profile, separate from your My Work portfolio.</p>
            <div class="acct2-video-slot">
              ${a.intro_video_url
                ? `<video controls preload="metadata" src="${a.intro_video_url}"></video>`
                : `<span style="font-family:ui-monospace,Menlo,monospace;font-size:11px;font-weight:600;color:var(--faint);text-align:center;line-height:1.5">no intro video yet<br>portrait 9:16 · up to 60s</span>`}
            </div>
            <div style="margin-top:14px">
              <label class="btn btn-o btn-sm" for="acct-intro">${a.intro_video_url?"Replace intro video":"Add intro video"}</label>
              <input type="file" id="acct-intro" accept="video/*" class="pf-file-input" onchange="uploadIntroVideo()">
            </div>
            <div class="hint-err hide" id="intro-err"></div>
          </div>
        </div>
      </section>

      <section class="acct2-zone">
        <div class="acct2-zone-kicker muted">02: Access &amp; security</div>
        <h2 class="acct2-zone-title" style="margin-top:14px">Who can get into this account, and under which profile.</h2>
        <div class="acct2-secondary" style="margin-top:22px">
          <div class="acct2-mini">
            <h4>Change password</h4>
            <p>You'll stay signed in on this device.</p>
            <div class="frm">
              <label>Current password<input type="password" id="pw-cur" autocomplete="current-password"></label>
              <label>New password<input type="password" id="pw-new" placeholder="At least 8 characters" autocomplete="new-password"></label>
              <label>Confirm new password<input type="password" id="pw-conf" autocomplete="new-password" onkeydown="if(event.key==='Enter')doChangePassword()"></label>
              <div class="hint-err hide" id="pw-err"></div>
            </div>
            <div style="margin-top:14px"><button class="btn btn-o btn-sm" style="width:100%" onclick="doChangePassword()">Update password</button></div>
          </div>

          <div class="acct2-mini">
            <h4>Profiles on this login</h4>
            <p>Run a business and a platform-owner identity from the same sign-in, each with its own name.</p>
            ${a.linked_account?`
            <div class="acct2-mini-row">
              <div class="acct2-profile-opt on">
                <span class="acct2-profile-opt-av">${esc((a.display_name||a.email||"?").slice(0,1).toUpperCase())}</span>
                <span><b>${esc(a.display_name||"—")}</b><small>${isBiz?"Business":"Platform owner"} · current</small></span>
                <span class="act">Active</span>
              </div>
              <button type="button" class="acct2-profile-opt" onclick="switchToLinkedAccount('${a.linked_account.is_business?"biz":"plat"}')">
                <span class="acct2-profile-opt-av" style="background:#0f766e">${esc((a.linked_account.display_name||"?").slice(0,1).toUpperCase())}</span>
                <span><b>${esc(a.linked_account.display_name||"—")}</b><small>${a.linked_account.is_business?"Business":"Platform owner"}</small></span>
                <span class="act">Switch</span>
              </button>
            </div>`:`
            <div class="acct2-mini-row">
              ${!isBiz?`<button type="button" class="acct2-add-profile" onclick="switchRole('biz')">＋ Set up a business profile</button>`:""}
              ${!isPlat?`<button type="button" class="acct2-add-profile" onclick="switchRole('plat')">＋ Set up a platform-owner profile</button>`:""}
              ${isBiz&&isPlat?`<p class="mut" style="font-size:12.5px">Both roles are already on this one account (set up before this feature shipped), nothing to add.</p>`:""}
            </div>`}
          </div>

          <div class="acct2-mini">
            <h4>Sign-in details</h4>
            <p>Your email is how you sign in and can't be changed here.</p>
            <div class="acct2-signin-rows">
              <div class="acct2-signin-row"><span class="k">Display name</span><span class="v">${esc(a.display_name||"—")}</span></div>
              <div class="acct2-signin-row"><span class="k">Email</span><span class="v" style="word-break:break-all">${esc(a.email)}</span></div>
              <div class="acct2-signin-row"><span class="k">Account role${roles.length>1?"s":""}</span><span class="v" style="color:var(--acc-ink)">${esc(roles.join(" · "))}</span></div>
            </div>
            <p class="acct2-signin-note">Editing your name in the header above changes it everywhere on PromoSlot.</p>
          </div>
        </div>
      </section>

      <section class="acct2-zone acct2-utility">
        <div class="acct2-zone-kicker muted">03: Help &amp; internal</div>
        <div class="acct2-utility-body">
          <div>
            <h3 class="acct2-utility-title">Something not right? Talk to a person.</h3>
            <p class="acct2-utility-sub">Messages land in the PromoSlot support inbox. We reply to the email on your account unless you tell us otherwise.</p>
            ${isSuper?`<div class="acct2-actioncode" id="actionCodePanel"></div>`:`<div id="actionCodePanel"></div>`}
          </div>
          <div id="supportPanel">${supportFormHtml()}</div>
        </div>
      </section>

      <section class="acct2-zone">
        <div class="acct2-zone-kicker muted">04: Danger zone</div>
        <h2 class="acct2-zone-title" style="margin-top:14px">Deactivate or delete your account.</h2>

        <div class="acct2-mini" style="max-width:520px;margin-top:22px">
          <div style="font-size:14px;font-weight:600;margin-bottom:8px">Deactivate my account</div>
          <p style="font-size:13px;color:var(--mut);margin-bottom:14px">
            Hides your profile and pauses your listings or campaigns. Nobody can find or contact you on
            PromoSlot while deactivated. Signs you out everywhere, but nothing is deleted: log back in with
            your usual email and password any time to pick up exactly where you left off.${a.linked_account?`
            Since your business and platform-owner profiles share this one login, <b>both are paused
            together</b>.`:""} Deals that are funded or in progress aren't cancelled by this, but you
            won't be able to act on them (approve, message, or submit delivery proof) until you log
            back in. Worth wrapping up or checking in on anything active first.
          </p>
          <button class="btn btn-ghost btn-sm" onclick="deactivateAccountModal()">Deactivate my account</button>
        </div>

        <div class="acct2-mini" style="max-width:520px;margin-top:16px;border-color:var(--red-border)">
          <div style="font-size:14px;font-weight:600;margin-bottom:8px">Delete my account</div>
          <p style="font-size:13px;color:var(--mut);margin-bottom:14px">
            This permanently removes your profile (name, bio, photo, intro video) and signs you out
            everywhere. It cannot be undone.${a.linked_account?` Since your business and platform-owner
            profiles share this one login, <b>both are deleted together</b>.`:""}
            Deals, reviews and messages you're already part of stay on record for the other party and for
            accounting/dispute purposes, just no longer linked to your name, and a deal that's currently
            funded isn't cancelled by this; payment still completes normally, including your payout if
            you're the one receiving it. Once deleted, this email address is free again if you ever want
            to sign up fresh.
          </p>
          <button class="btn btn-danger btn-sm" onclick="deleteAccountModal()">Delete my account</button>
        </div>
      </section>
    </div>`;
  renderWhoWeAre();
  renderActionCodePanel();
}
function _reasonChecklistHtml(cls, otherTextareaId, label){
  const opts=["Just taking a break","Switching to a different platform or strategy",
    "Wasn't getting good results","Too complicated to use","Privacy or data concerns"];
  const boxes=opts.map(o=>`<label style="display:flex;gap:8px;align-items:center;font-size:13px;font-weight:400">
      <input type="checkbox" class="${cls}" value="${esc(o)}"> ${esc(o)}</label>`).join("");
  return `<div class="frm" style="margin-top:14px">
    <label style="font-size:12px;color:var(--mut);display:block;margin-bottom:6px">${esc(label)} (optional)</label>
    <div style="display:flex;flex-direction:column;gap:6px">
      ${boxes}
      <label style="display:flex;gap:8px;align-items:center;font-size:13px;font-weight:400">
        <input type="checkbox" class="${cls}" value="Other"
          onchange="document.getElementById('${otherTextareaId}').style.display=this.checked?'block':'none'"> Other</label>
    </div>
    <textarea id="${otherTextareaId}" placeholder="Tell us more (optional)"
      style="display:none;margin-top:8px;width:100%;min-height:56px;padding:8px;border-radius:8px;
        border:1px solid var(--line2);font-family:inherit;font-size:13px;resize:vertical"></textarea>
  </div>`;
}
function _collectAccountActionReason(cls, otherTextareaId){
  const boxes=[...document.querySelectorAll("."+cls+":checked")];
  const parts=[];
  for(const b of boxes){
    if(b.value==="Other"){
      const t=(($(otherTextareaId)||{}).value||"").trim();
      parts.push(t?`Other: ${t}`:"Other");
    } else parts.push(b.value);
  }
  return parts.join("; ");
}
function deactivateAccountModal(){
  openModal(`<div class="m-pad" style="max-width:440px">
    <h3 class="m-title">Deactivate your PromoSlot account?</h3>
    <p class="m-sub">Enter your password to confirm. You can reactivate any time just by logging back in.</p>
    <div class="frm" style="margin-top:16px">
      <div><label>Password</label><input type="password" id="dea-pass" autocomplete="current-password"
        onkeydown="if(event.key==='Enter')doDeactivateAccount()"></div>
      <div class="hint-err hide" id="dea-err"></div>
    </div>
    ${_reasonChecklistHtml("dea-reason-cb","dea-reason-other","Why are you deactivating?")}
    <div class="m-actions" style="margin-top:18px">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn" id="dea-submit" onclick="doDeactivateAccount()">Yes, deactivate my account</button>
    </div>
  </div>`);
}
async function doDeactivateAccount(){
  const password=$("dea-pass").value||"";
  const err=$("dea-err");
  if(err) err.classList.add("hide");
  if(!password){ if(err){ err.textContent="Enter your password to confirm."; err.classList.remove("hide"); } return; }
  const reason=_collectAccountActionReason("dea-reason-cb","dea-reason-other");
  const btn=$("dea-submit"); btn.disabled=true; btn.textContent="Deactivating…";
  try{
    await PSApi.post("/me/deactivate", {password, reason});
  }catch(e){
    btn.disabled=false; btn.textContent="Yes, deactivate my account";
    if(err){ err.textContent=e.message||"Could not deactivate your account"; err.classList.remove("hide"); }
    return;
  }
  closeModal();
  clearRoute();
  S.account=null; S.perms=[]; S.myRole="USER";
  ["dealWrap","accountWrap","msgsWrap","bizDash","platDash"].forEach(id=>{
    const el=$(id); if(el) el.innerHTML="";
  });
  S.convos=[]; S.activeThread=null; S.realDeals=[]; S.realNotifs=[]; S._who=null;
  authReflect(); goHome();
  toast("Your account is deactivated, log back in any time to reactivate it",true);
}
function deleteAccountModal(){
  openModal(`<div class="m-pad" style="max-width:440px">
    <h3 class="m-title">Delete your PromoSlot account?</h3>
    <p class="m-sub">Enter your password to confirm. This cannot be undone.</p>
    <div class="frm" style="margin-top:16px">
      <div><label>Password</label><input type="password" id="da-pass" autocomplete="current-password"
        onkeydown="if(event.key==='Enter')doDeleteAccount()"></div>
      <div class="hint-err hide" id="da-err"></div>
    </div>
    ${_reasonChecklistHtml("da-reason-cb","da-reason-other","Why are you deleting your account?")}
    <div class="m-actions" style="margin-top:18px">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" id="da-submit" onclick="doDeleteAccount()">Yes, delete my account</button>
    </div>
  </div>`);
}
async function doDeleteAccount(){
  const password=$("da-pass").value||"";
  const err=$("da-err");
  if(err) err.classList.add("hide");
  if(!password){ if(err){ err.textContent="Enter your password to confirm."; err.classList.remove("hide"); } return; }
  const reason=_collectAccountActionReason("da-reason-cb","da-reason-other");
  const btn=$("da-submit"); btn.disabled=true; btn.textContent="Deleting…";
  try{
    await PSApi.post("/me/delete", {password, reason});
  }catch(e){
    btn.disabled=false; btn.textContent="Yes, delete my account";
    if(err){ err.textContent=e.message||"Could not delete your account"; err.classList.remove("hide"); }
    return;
  }
  closeModal();
  clearRoute();
  S.account=null; S.perms=[]; S.myRole="USER";
  ["dealWrap","accountWrap","msgsWrap","bizDash","platDash"].forEach(id=>{
    const el=$(id); if(el) el.innerHTML="";
  });
  S.convos=[]; S.activeThread=null; S.realDeals=[]; S.realNotifs=[]; S._who=null;
  authReflect(); goHome(); toast("Your account has been deleted",true);
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
    <div><label>Links (social media, website, no limit)</label>
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
  updateAcctTrack();
}
// Re-render from local state so unsaved text/links survive a file add/delete.
function renderWhoWeArePreserving(){
  const host=$("whoPanel"); if(!host) return;
  paintWho(host, S._who||{about_text:"",links:[],assets:[]});
  updateAcctTrack();
}
function paintWho(host,p){
  host.innerHTML=`<h5 style="margin-bottom:6px">Who we are: public profile</h5>
    <p class="mut" style="font-size:12.5px;margin-bottom:10px">Shown to anyone viewing your profile from a campaign or listing. Add as much as you like, all optional, and editable here or during campaign setup (it's the same profile).</p>
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
  catch(e){ fail(e.message||"Could not submit, please try again."); return; }
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
    // loadDeals()/loadConvos() are added here (not just from the dashboards)
    // so the homepage action centre has real deal/message data on first load.
    await Promise.all([loadPerms(), loadMine(), loadNotifications(), loadDeals(), loadConvos()]);
  }catch(e){
    // Expired, revoked, suspended or never signed in — all land here. Treat every
    // one as logged out: drop client state and forget where they were, so a stale
    // session can never leave the app looking authenticated.
    S.account=null; S.perms=[]; S.myRole="USER";
    clearRoute();
  }
  authReflect();
  // Only now is guest status known, so this is the earliest honest point to arm
  // the browsing timer — doing it on raw page load would race a slow /me.
  if(!S.account) startSignupNudgeTimer();
  // A returning account that started the tour but never finished gets the
  // resume pill; one that never saw it gets the welcome card.
  else { syncTourResume(); maybeOfferTour(); }
  // view-landing is active by default in the static HTML before this resolves,
  // so it needs its own render call rather than relying on a showView() that
  // may never happen this page load.
  renderLandingState();
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
// A guest who starts the "list your platform"/"post a campaign" wizard gets
// bounced into signup partway through (see wizNext()'s auth gate) — and
// signup requires clicking a real emailed verification link, which is a full
// page navigation that wipes the in-memory wizard state (W) no matter what.
// Stashed here (sessionStorage, same per-tab/dies-with-tab reasoning as
// ROUTE_KEY above) so _resumeAfterAuth() can pick the wizard back up once a
// real session exists, instead of stranding the person on the homepage
// having never actually reached the "which platform" step.
const WIZARD_RESUME_KEY="ps_resume_wizard";
// A deal-notification email (e.g. the proof grace-period reminder) links
// straight to /?deal=<id>. A guest hitting that link has to log in first;
// this is where the intended deal id waits until _resumeAfterAuth() can
// pick it back up, same pattern as WIZARD_RESUME_KEY above.
const DEAL_RESUME_KEY="ps_resume_deal";
// Set by vfConnectPayouts() when "Connect payout account" is clicked from
// inside the verify modal rather than the dashboard's own payout panel —
// lets _connectReturn below reopen "Get verified" instead of just the
// dashboard once Stripe sends them back, same resume pattern as above.
const VERIFY_RESUME_KEY="ps_resume_verify";
// Routes anyone may land on. Everything else needs a live session to restore.
const PUBLIC_ROUTES=new Set(["home","market","how","pricing","protect","resources","about","terms","privacy","refund"]);
let _routeReady=false;                 // don't record routes during restore

/* ---------- Real URLs for the public/marketing routes ----------
   Until now setRoute() only ever wrote to sessionStorage — the address bar
   stayed on "/" no matter which view was open, so nothing but the homepage
   was ever a real, bookmarkable, shareable, crawlable URL (the backend
   route for each of these paths, added alongside this, is what actually
   makes them crawlable; this is what keeps the address bar honest once
   someone is already on the site and clicks around in it).

   Deliberately scoped to the same 7 public routes above — authenticated
   app views (dashboard, a deal, account, admin, …) are behind a login
   wall and stay exactly as they were, sessionStorage-only, no URL change.
   "market" always maps to /marketplace regardless of which tab is active;
   the tab itself isn't part of the URL, same as before. */
const ROUTE_PATHS={home:"/",market:"/marketplace",how:"/how-it-works",
                   pricing:"/pricing",protect:"/payment-protection",
                   resources:"/resources",about:"/about",
                   terms:"/terms",privacy:"/privacy",refund:"/refund-policy"};
const PATH_ROUTES=Object.fromEntries(Object.entries(ROUTE_PATHS).map(([k,v])=>[v,k]));
let _fromPopstate=false;               // true while replaying a back/forward nav

function setRoute(name, arg){
  if(!_routeReady) return;
  try{ sessionStorage.setItem(ROUTE_KEY, JSON.stringify(arg==null?{name}:{name,arg})); }
  catch(e){}                            // private mode / storage disabled
  // Keep the address bar honest for the public routes — but never while
  // replaying a browser back/forward (that already changed the URL; pushing
  // again here would break the back button by adding a duplicate entry).
  const path=ROUTE_PATHS[name];
  if(path && !_fromPopstate && location.pathname!==path){
    try{ history.pushState({},"",path); }catch(e){}
  }
}
function clearRoute(){ try{ sessionStorage.removeItem(ROUTE_KEY); }catch(e){} }
// Back/forward between the public routes. Anything else (an authenticated
// view, or a path this app doesn't know) is left alone rather than guessed
// at — a real page navigation is a perfectly fine fallback for those.
window.addEventListener("popstate", ()=>{
  const name=PATH_ROUTES[location.pathname];
  if(!name) return;
  _fromPopstate=true;
  try{
    if(name==="home") goHome();
    else if(name==="market") openMarket();
    else if(name==="how") goHow();
    else if(name==="pricing") goPricingPage();
    else if(name==="protect") goProtect();
    else if(name==="resources") goResources();
    else if(name==="about") goAbout();
    else if(name==="terms") goTerms();
    else if(name==="privacy") goPrivacy();
    else if(name==="refund") goRefundPolicy();
  } finally { _fromPopstate=false; }
});
function readRoute(){
  try{
    const r=JSON.parse(sessionStorage.getItem(ROUTE_KEY)||"null");
    if(!r || typeof r.name!=="string") return null;
    // Every route's arg is either absent, a numeric row id (deal, profile) —
    // or, for market only, one of its two known tab names. Reject anything
    // else outright rather than trust corrupted/tampered storage.
    if(r.arg!=null){
      const validArg = r.name==="market"
        ? (r.arg==="platforms"||r.arg==="campaigns")
        : /^\d+$/.test(String(r.arg));
      if(!validArg) return null;
    }
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
    case "disputes-queue":
      if(!can("dispute.manage")) return false;
      await openDisputesQueue(); return true;
    case "verification-queue":
      if(!can("verification.view")) return false;
      await openVerificationQueue(); return true;
    case "completed":
      if(!can("deal.view_evidence")) return false;
      await openCompleted(); return true;
    case "admin":
      if(!can("admin.view")) return false;
      await openAdmin(); return true;
    case "home":        goHome(); return true;
    case "how":         goHow(); return true;
    case "pricing":     goPricingPage(); return true;
    case "protect":     goProtect(); return true;
    case "resources":   goResources(); return true;
    case "about":       goAbout(); return true;
    case "terms":       goTerms(); return true;
    case "privacy":     goPrivacy(); return true;
    case "refund":      goRefundPolicy(); return true;
  }
  return false;
}

/* ==================== BOOT ==================== */
const NAV_ACTIONS={
  "home":()=>goHome(),
  "nav-menu":()=>toggleNavMenu(),
  "get-started":()=>authModal("signup"),
  "login":()=>authModal("login"),
  "logout":()=>doLogout(),
  "market":()=>openMarket(),
  "market-platforms":()=>openMarket("platforms"),
  "market-campaigns":()=>openMarket("campaigns"),
  "how":()=>goHow(),
  "pricing":()=>goPricingPage(),
  "protect":()=>goProtect(),
  "resources":()=>goResources(),
  "about":()=>goAbout(),
  "messages":()=>openMessages(),
  "notifs":()=>toggleNotifs(),
  "dash":()=>openDash(),
  "account":()=>openAccount(),
  "review-queue":()=>openReviewQueue(),
  "support-queue":()=>openSupportQueue(),
  "payouts":()=>openPayouts(),
  "disputes-queue":()=>openDisputesQueue(),
  "verification-queue":()=>openVerificationQueue(),
  "completed":()=>openCompleted(),
  "admin":()=>openAdmin(),
  "wiz-biz":()=>startWizard("biz"),
  "wiz-plat":()=>startWizard("plat"),
  "wiz-both":()=>startWizard("both"),
  "role-biz":()=>switchRole("biz"),
  "role-plat":()=>switchRole("plat"),
  "market-cta":()=>marketCtaClick(),
  "rail-plat":()=>railSetRole("plat"),
  "rail-biz":()=>railSetRole("biz"),
  "terms":()=>goTerms(),
  "privacy":()=>goPrivacy(),
  "refund-policy":()=>goRefundPolicy(),
  "toast-fees":()=>toast("Fees: 10% seller fee + 5% buyer protection fee, on the agreed price. No listing fees.")
};
function PSBoot(){
  renderMarketRail();
  renderHeroChips();
  renderHeroPreview();
  renderPlatBrowseChips();
  renderFooterSupport();
  wireNavDropdowns();
  djRender();
  djBindControls();
  resRender();
  psRender(true);
  psBindControls();
  syncNav();
  // A direct load of one of the real public URLs (someone followed a link
  // to /pricing, or refreshed while on /about) takes priority over the
  // sessionStorage-remembered route — that's what makes these real,
  // shareable addresses rather than ones that only work if you navigated
  // here from within the app. Home ("/") falls through to the normal
  // sessionStorage-based restore unchanged, same as any authenticated view.
  // Stripe's onboarding return/refresh (backend/routers/connect.py) lands here
  // as /?connect=return — previously a bare "/", which always dropped the
  // platform owner on the homepage regardless of where they'd actually been,
  // even though that's exactly the moment they'd want to land back on their
  // dashboard (see Rob's testing note: "after the stripe connection process
  // ... redirect the user to their dashboard right away, since that is where
  // they would have last been"). Same anti-replay handling as the ?reset=/
  // ?verify= tokens further down: stripped from the address bar immediately
  // so a later refresh of this same tab can't keep re-triggering it.
  const _connectReturn = new URLSearchParams(location.search).get("connect")==="return";
  if(_connectReturn) history.replaceState({}, "", location.pathname);
  // Same landing pattern for Stripe's account-verification onboarding
  // (backend/routers/verification.py) — deliberately its own query param,
  // not ?verify=, which is already a real emailed-token param (see below).
  const _acctVerifyReturn = new URLSearchParams(location.search).get("acctverify")==="return";
  if(_acctVerifyReturn) history.replaceState({}, "", location.pathname);

  // Captured so the ?deal= handling below can wait on whichever branch's
  // restoreSession() actually ran, instead of triggering a second one.
  let _bootAuth;
  const _initialRoute=PATH_ROUTES[location.pathname];
  if(_initialRoute && _initialRoute!=="home"){
    if(_initialRoute==="market") openMarket();
    else if(_initialRoute==="how") goHow();
    else if(_initialRoute==="pricing") goPricingPage();
    else if(_initialRoute==="protect") goProtect();
    else if(_initialRoute==="resources") goResources();
    else if(_initialRoute==="about") goAbout();
    else if(_initialRoute==="terms") goTerms();
    else if(_initialRoute==="privacy") goPrivacy();
    else if(_initialRoute==="refund") goRefundPolicy();
    _bootAuth = restoreSession();          // still establishes real auth state for the nav
  } else if(_connectReturn){
    // Skip the normal remembered-route restore entirely — this is an explicit,
    // one-shot signal that takes priority over whatever was in sessionStorage
    // (which may not even be from this tab: Stripe's hosted onboarding often
    // runs as its own tab/window, and sessionStorage doesn't carry over to a
    // fresh one). Guarded on the ACTUAL restored account/role rather than
    // trusting the redirect blindly — only a platform owner could ever have
    // reached Stripe Connect in the first place (see connect.py's
    // _require_platform_owner), but if the session didn't come back at all,
    // or came back on a linked business identity instead, this quietly
    // does nothing and they land on the homepage same as before this change.
    // VERIFY_RESUME_KEY: set only when this Connect trip started from inside
    // the verify modal (vfConnectPayouts()) rather than the dashboard's own
    // payout panel — reopen that modal instead of just the dashboard, so
    // connecting Stripe and finishing verification reads as one flow, not
    // two things they have to separately remember to do.
    let _verifyResume=null;
    try{ _verifyResume=sessionStorage.getItem(VERIFY_RESUME_KEY); sessionStorage.removeItem(VERIFY_RESUME_KEY); }catch(e){}
    _bootAuth = restoreSession().then(()=>{
      if(!(S.account && S.account.is_platform_owner)) return;
      openDash();
      if(_verifyResume==="plat") openVerify("plat");
    });
  } else if(_acctVerifyReturn){
    // Rob, 2026-08-28: landing on the dashboard and leaving it to them to
    // remember to reopen "Get verified" was a real gap — they'd just
    // finished Stripe's form with no visible confirmation anything
    // happened. Reopen the modal automatically instead: it re-checks Stripe
    // live (see vfRenderBiz), so it always shows truthfully wherever they
    // actually are — mid-onboarding, ready to submit, or already submitted
    // — never a guess. Only business creates a fresh Stripe link from this
    // modal (platform identity reuses the existing payout account, no new
    // redirect), so this only auto-opens for a business account.
    _bootAuth = restoreSession().then(()=>{
      if(!S.account) return;
      openDash();
      if(S.account.is_business) openVerify("biz");
    });
  } else {
    _bootAuth = restoreSession().then(restoreRoute);
  }
  startAttnPolling();
  // A real reset link (emailed) lands as /?reset=<token> — open the set-password step.
  // A real verification link lands as /?verify=<token> - verifyEmailFromLink()
  // consumes it against the API immediately (unlike the reset token, which
  // only gets used once the form is submitted), so it's single-use from the
  // moment this page loads. Bug: neither token was ever stripped from the URL
  // here, so refreshing the page replayed the same (now already-used/expired)
  // token every time - showing "That link didn't work" on every refresh for a
  // signed-in user who'd already verified. Stripping both from the address
  // bar immediately, before either modal opens, means a refresh can never
  // replay them again.
  const _q=new URLSearchParams(location.search);
  const _rt=_q.get("reset");
  const _vt=_q.get("verify");
  const _dt=_q.get("deal");
  // One-click marketing-consent links (opt-in invite in a transactional email,
  // or a future marketing email's unsubscribe link) — public, token-based, no
  // login required, same anti-replay stripping as reset/verify above.
  const _ot=_q.get("optin");
  const _ut=_q.get("unsubscribe");
  if(_rt||_vt||_dt||_ot||_ut) history.replaceState({}, "", location.pathname);
  if(_rt) setTimeout(()=>resetPasswordModal(_rt),300);
  if(_vt) setTimeout(()=>verifyEmailFromLink(_vt),300);
  if(_ot) setTimeout(()=>marketingTokenFromLink(_ot,"optin"),300);
  if(_ut) setTimeout(()=>marketingTokenFromLink(_ut,"unsubscribe"),300);
  // A deal-notification email (the proof grace-period reminder) links straight
  // to /?deal=<id>. Waits on the real restoreSession() promise above rather
  // than a fixed timeout, since whether to open the deal directly or gate on
  // login first depends on knowing S.account for certain, not guessing at it.
  if(_dt){
    const _dealId=parseInt(_dt,10);
    if(Number.isFinite(_dealId)){
      _bootAuth.then(()=>{
        if(S.account){ showView("view-deal"); renderRealDeal(_dealId); }
        else{
          try{ sessionStorage.setItem(DEAL_RESUME_KEY, String(_dealId)); }catch(e){}
          authGate("login");
        }
      });
    }
  }
  loadMarket().then(()=>{renderMarketRail();renderLandingState();});  // refresh the rail with real listings/campaigns, and the returning-user opportunities strip once real data is in
  document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&!modalLock) closeModal(); if(e.key==="Escape") closeNavMenu(); });
  document.addEventListener("click",e=>{
    const el=e.target.closest("[data-act]");
    if(el && NAV_ACTIONS[el.dataset.act]){
      e.preventDefault(); NAV_ACTIONS[el.dataset.act]();
      // A link inside the open mobile menu (not the toggle button itself) should
      // close it — showView() already does this for full page/view switches, but
      // this covers anything routed through NAV_ACTIONS that doesn't call it.
      if(el.closest("#navLinks")) closeNavMenu(); else closeNavDropdowns();
      return;
    }
    if(notifOpen && !e.target.closest("#notifPop") && !e.target.closest("#navBell")) toggleNotifs(false);
    if($("navLinks").classList.contains("open") && !e.target.closest("#navLinks") && !e.target.closest("#navMenuToggle")) closeNavMenu();
    if(!e.target.closest("details.nav-dd")) closeNavDropdowns();
  });
  bellSync();
}
window.PSBoot=PSBoot;

// --- "How deals work" interactive Deal Journey component (view-how page) ---
// Illustrative walkthrough only - not a real deal. Ported from the approved
// Claude Design mockup, wording aligned with real deal-state copy elsewhere in the app.
const DJ_STAGES=[
  {title:"Agree the scope", status:"Agreement ready to review", next:"Next: Fund the deal",
   biz:"Define the content, deadlines and evidence required before funding.",
   own:"Review exactly what must be delivered before accepting the work."},
  {title:"Fund the deal", status:"Funding secured", next:"Next: Track delivery",
   biz:"Fund the agreed deal before promotional work begins.",
   own:"See that funding is secured before starting the promotion."},
  {title:"Deliver the promotion", status:"Promotion in progress", next:"Next: Review evidence",
   biz:"Follow the agreed delivery without relying on informal promises.",
   own:"Complete the promotion against the accepted terms and deadline."},
  {title:"Submit evidence", status:"Evidence submitted for PromoSlot approval", next:"Next: Complete the deal",
   biz:"Review the submitted links and analytics. PromoSlot approves the evidence against the funded agreement.",
   own:"Submit the proof required by the agreement; PromoSlot approves it before payment is released."},
  {title:"Approve and release payment", status:"Deal completed", next:"",
   biz:"Approve delivery once PromoSlot has approved the submitted evidence.",
   own:"Receive payment after PromoSlot has approved the submitted evidence."}
];
let djState={i:0,role:"biz"};

function djSetRole(r){ djState.role=r; djRender(); }
function djGo(i){ if(i>=0&&i<DJ_STAGES.length){ djState.i=i; djRender(); } }
function djNext(){ djGo(djState.i+1); }
function djBack(){ djGo(djState.i-1); }
function djNavKey(e){
  const n=DJ_STAGES.length; let t=null;
  if(e.key==="ArrowDown"||e.key==="ArrowRight") t=(djState.i+1)%n;
  else if(e.key==="ArrowUp"||e.key==="ArrowLeft") t=(djState.i-1+n)%n;
  else if(e.key==="Home") t=0;
  else if(e.key==="End") t=n-1;
  if(t===null) return;
  e.preventDefault();
  djGo(t);
  const btns=document.querySelectorAll("#djNav .dj-nav-btn");
  if(btns[t]) btns[t].focus();
}
function djRenderNav(){
  const el=document.getElementById("djNav");
  if(!el) return;
  el.innerHTML=DJ_STAGES.map((s,n)=>{
    const active=n===djState.i, done=n<djState.i;
    const cls="dj-nav-btn"+(active?" active":"")+(done?" done":"");
    const mark=done?"&#10003;":String(n+1).padStart(2,"0");
    const stateLabel=active?"Current stage":done?"Completed":"Upcoming";
    return `<button type="button" class="${cls}" role="tab" aria-selected="${active}" tabindex="${active?0:-1}" onclick="djGo(${n})">
      <span class="dj-mark">${mark}</span>
      <span><span class="dj-nav-title" style="display:block">${s.title}</span><span class="dj-nav-state">${stateLabel}</span></span>
    </button>`;
  }).join("");
}
function djStagePanel(i){
  if(i===0) return `
    <div class="dj-anim" style="display:flex;flex-direction:column;gap:10px">
      <div class="dj-table">
        <div class="dj-thead">AGREEMENT</div>
        <div class="dj-trow"><div class="dj-tk">Deliverable</div><div class="dj-tv">One TikTok video</div></div>
        <div class="dj-trow"><div class="dj-tk">Live duration</div><div class="dj-tv">30 days</div></div>
        <div class="dj-trow"><div class="dj-tk">Deadline</div><div class="dj-tv">24 August</div></div>
        <div class="dj-trow"><div class="dj-tk">Evidence required</div><div class="dj-tv">Published URL and 14-day analytics</div></div>
        <div class="dj-trow"><div class="dj-tk">Agreed value</div><div class="dj-tv">£500</div></div>
      </div>
      <div class="dj-confirms">
        <span class="dj-confirm">&#10003; Business confirmed</span>
        <span class="dj-confirm">&#10003; Platform owner confirmed</span>
      </div>
    </div>`;
  if(i===1) return `
    <div class="dj-anim dj-funded-grid">
      <div class="dj-funded-icon"><span>
        <svg width="22" height="22" viewBox="0 0 24 24"><rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 10.5V7.6a4 4 0 018 0v2.9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      </span></div>
      <div class="dj-table" style="border-radius:14px">
        <div class="dj-trow" style="border-top:none"><div class="dj-tk">Deal value</div><div class="dj-tv">£500</div></div>
        <div class="dj-trow"><div class="dj-tk">Funding status</div><div class="dj-tv acc">Secured</div></div>
        <div class="dj-trow"><div class="dj-tk">Work status</div><div class="dj-tv">Ready to begin</div></div>
        <div class="dj-trow"><div class="dj-tk">Release condition</div><div class="dj-tv">Delivery evidence approved by PromoSlot</div></div>
      </div>
    </div>`;
  if(i===2) return `
    <div class="dj-anim dj-delivery-grid">
      <div class="dj-table" style="border-radius:14px">
        <div class="dj-trow" style="border-top:none"><div class="dj-tk">Deliverable</div><div class="dj-tv">TikTok video</div></div>
        <div class="dj-trow"><div class="dj-tk">Publish by</div><div class="dj-tv">24 August</div></div>
        <div class="dj-trow"><div class="dj-tk">Required duration</div><div class="dj-tv">30 days</div></div>
        <div class="dj-trow"><div class="dj-tk">Evidence deadline</div><div class="dj-tv">7 September</div></div>
        <div class="dj-liveperiod">
          <div class="dj-liveperiod-head"><span>Live period</span><span>Day 9 of 30</span></div>
          <div class="dj-bar-track"><div class="dj-bar-fill" style="width:30%"></div></div>
        </div>
      </div>
      <div class="dj-placeholder"><span>agreed<br>TikTok<br>deliverable</span></div>
    </div>`;
  if(i===3) return `
    <div class="dj-anim">
      <div class="dj-evidence-grid">
        <div class="dj-ev-card">
          <div class="dj-ev-label">PUBLISHED LINK</div>
          <div class="dj-ev-val">tiktok.com/@example/&hellip;</div>
          <div class="dj-ev-received">&#10003; Received</div>
        </div>
        <div class="dj-ev-card">
          <div class="dj-ev-label">SCREENSHOT</div>
          <div class="dj-ev-screenshot"></div>
          <div class="dj-ev-received">&#10003; Received</div>
        </div>
        <div class="dj-ev-card">
          <div class="dj-ev-label">14-DAY ANALYTICS</div>
          <div class="dj-ev-bars">
            <span style="height:38%"></span><span style="height:56%"></span><span style="height:44%"></span><span style="height:72%"></span><span class="peak" style="height:88%"></span><span style="height:64%"></span>
          </div>
          <div class="dj-ev-received">&#10003; Received</div>
        </div>
      </div>
      <p class="dj-ev-note">Submitted 6 September, 14:02. PromoSlot checks this evidence against the funded agreement and approves it before payment is released.</p>
    </div>`;
  return `
    <div class="dj-anim dj-final">
      <div class="dj-trow" style="border-top:none"><div class="dj-tk">Deliverable</div><div class="dj-tv acc">Approved</div></div>
      <div class="dj-trow"><div class="dj-tk">Evidence</div><div class="dj-tv acc">Approved by PromoSlot</div></div>
      <div class="dj-trow"><div class="dj-tk">Payment status</div><div class="dj-tv">£500 released</div></div>
      <div class="dj-trow"><div class="dj-tk">Deal record</div><div class="dj-tv">Complete</div></div>
    </div>`;
}
function djRender(){
  const nav=document.getElementById("djNav");
  if(!nav) return; // component not present on this view
  djRenderNav();
  const s=DJ_STAGES[djState.i], last=djState.i===DJ_STAGES.length-1;
  document.getElementById("djRoleBiz").classList.toggle("on",djState.role==="biz");
  document.getElementById("djRoleOwn").classList.toggle("on",djState.role!=="biz");
  document.getElementById("djChip").classList.toggle("on",last);
  document.getElementById("djChipLabel").textContent=s.status;
  document.getElementById("djRoleLine").textContent=djState.role==="biz"?s.biz:s.own;
  document.getElementById("djPanel").innerHTML=djStagePanel(djState.i);
  document.getElementById("djProgressBar").style.width=((djState.i+1)/DJ_STAGES.length*100)+"%";
  const backBtn=document.getElementById("djBackBtn");
  backBtn.disabled=djState.i===0;
  const nextBtn=document.getElementById("djNextBtn");
  nextBtn.style.display=last?"none":"inline-flex";
  nextBtn.innerHTML=s.next?(s.next+' <span aria-hidden="true">&rarr;</span>'):"";
}
// Bound once (not on every render) via addEventListener rather than inline
// onclick="fn()" attributes. Several of these buttons share an id with the
// function they call (djBackBtn/djBack, djNextBtn/djNext originally collided
// before the id rename below) - inline handlers resolve bare identifiers
// against the element/document scope before the global scope, so a same-named
// id can shadow the real function and silently no-op the click. Real
// addEventListener bindings run in normal lexical scope and aren't affected.
function djBindControls(){
  document.getElementById("djRoleBiz")?.addEventListener("click",()=>djSetRole("biz"));
  document.getElementById("djRoleOwn")?.addEventListener("click",()=>djSetRole("own"));
  document.getElementById("djBackBtn")?.addEventListener("click",djBack);
  document.getElementById("djNextBtn")?.addEventListener("click",djNext);
}

// --- Pricing calculator (view-pricing page) ---
// Illustrative fee calculator - not wired to real deal creation. Ported from
// the approved Claude Design mockup. Percentages (5% business Payment
// Protection fee, 10% platform-owner service fee) match the real fee
// structure used elsewhere in the app.
const PS_MIN=10, PS_MAX=100000;
const PS_BENEFITS={
  business:[
    {t:"Clear deal terms", b:"Deliverables, deadlines and evidence requirements are agreed before funding."},
    {t:"Funded transaction", b:"The agreed amount is funded before promotional work begins and paid out once delivery evidence is reviewed and verified by the PromoSlot team. Deals can be cancelled by either party before payment is funded."},
    {t:"Documented delivery", b:"Links, screenshots and analytics can be submitted against the agreement."},
    {t:"Money-back protection", b:"If the pre-agreed conditions are not met, PromoSlot reviews the deal record and returns eligible funds to the party that funded it."}
  ],
  owner:[
    {t:"Free to list", b:"Create platform listings and publish services without a subscription or listing fee."},
    {t:"Funding visibility", b:"Know that the agreed deal has been funded before beginning the promotion."},
    {t:"Delivery record", b:"Submit links, screenshots and analytics in one documented place."},
    {t:"Structured payout", b:"See the expected payout and follow the deal through approval and release."}
  ]
};
let psState={role:"business", raw:"500", expanded:false};

function psFmt(n){ return "£"+n.toLocaleString("en-GB",{minimumFractionDigits:n%1?2:0,maximumFractionDigits:2}); }
function psParsed(){ const n=parseFloat(String(psState.raw).replace(/[^0-9.]/g,"")); return isNaN(n)?null:Math.round(n*100)/100; }
// Digits and at most one decimal point - letters/symbols never make it into
// the field at all, rather than just being ignored by the fee math.
function psSanitizeAmount(v){
  let s=String(v).replace(/[^0-9.]/g,"");
  const dot=s.indexOf(".");
  if(dot!==-1) s=s.slice(0,dot+1)+s.slice(dot+1).replace(/\./g,"");
  return s;
}
function psPickRole(r){ psState.role=r; psRender(true); }
// psAmount fires on every keystroke (see psBindControls' "input" listener). The
// browser has already put the typed character in the field by the time this
// runs, so re-render everything EXCEPT the input's own value - previously this
// re-set amountInput.value=psState.raw whenever document.activeElement wasn't
// strictly === the input, and any mismatch there (however it happens) turns
// every keystroke into "type a character, then have it immediately overwritten
// before the next paint", which looks exactly like the field rejecting all
// manual input while presets (a separate, JS-only code path) keep working.
// Simplest fix: typing never needs its own value corrected, so stop trying to.
function psAmount(v){ psState.raw=v; psRender(false); }
function psAmountBlur(v){
  const n=parseFloat(String(v).replace(/[^0-9.]/g,""));
  if(!isNaN(n)&&n>=PS_MIN&&n<=PS_MAX){ psState.raw=String(Math.round(n*100)/100); psRender(true); }
}
function psPresetPick(v){ psState.raw=String(v); psRender(true); }
function psToggleDisclosure(){ psState.expanded=!psState.expanded; psRender(true); }
function psSyncPanelHeight(){
  const panel=document.getElementById("psPanel"), inner=document.getElementById("psPanelInner");
  if(!panel||!inner) return;
  panel.style.maxHeight=psState.expanded?(inner.scrollHeight+"px"):"0px";
}
function psRender(syncInputValue){
  const badge=document.getElementById("psBadge");
  if(!badge) return; // component not present on this view
  const isBusiness=psState.role==="business";
  const n=psParsed();
  const valid=n!==null&&n>=PS_MIN&&n<=PS_MAX;
  const value=valid?n:500;
  const fee=Math.round(value*(isBusiness?0.05:0.10)*100)/100;
  const total=Math.round((isBusiness?value+fee:value-fee)*100)/100;

  document.getElementById("psRoleBiz").classList.toggle("on",isBusiness);
  document.getElementById("psRoleOwn").classList.toggle("on",!isBusiness);
  document.getElementById("psRoleBiz").setAttribute("aria-pressed",String(isBusiness));
  document.getElementById("psRoleOwn").setAttribute("aria-pressed",String(!isBusiness));

  const amountInput=document.getElementById("psAmountInput");
  if(syncInputValue) amountInput.value=psState.raw;
  document.getElementById("psAmountWrap").classList.toggle("invalid",!valid);

  const help=document.getElementById("psAmountHelp");
  let helpText="Type any amount between £10 and £100,000.", isErr=false;
  if(psState.raw.trim()===""||n===null){ helpText="Enter a deal value to see your numbers."; isErr=true; }
  else if(n<PS_MIN){ helpText="Minimum deal value is £10, showing the £500 example."; isErr=true; }
  else if(n>PS_MAX){ helpText="Maximum deal value is £100,000, showing the £500 example."; isErr=true; }
  help.textContent=helpText;
  help.classList.toggle("err",isErr);

  document.getElementById("psPresets").innerHTML=[100,250,500,1000].map(v=>{
    const on=valid&&value===v;
    return `<button type="button" class="ps-preset-btn${on?" on":""}" aria-pressed="${on}" onclick="psPresetPick(${v})">${psFmt(v)}</button>`;
  }).join("");

  document.getElementById("psBadgeLabel").textContent=isBusiness?"YOUR FUNDING SUMMARY":"YOUR PAYOUT SUMMARY";
  document.getElementById("psHeadline").textContent=isBusiness?`You'll fund ${psFmt(total)}`:`You'll receive ${psFmt(total)}`;
  document.getElementById("psSub").textContent=isBusiness
    ?`This includes the ${psFmt(value)} campaign value and ${psFmt(fee)} Payment Protection fee.`
    :`The 10% service fee is deducted from the ${psFmt(value)} agreed deal value.`;
  document.getElementById("psTable").innerHTML=isBusiness?`
    <div class="ps-trow"><span>Campaign value</span><b>${psFmt(value)}</b></div>
    <div class="ps-trow"><span>Payment Protection fee (5%)</span><b>${psFmt(fee)}</b></div>
    <div class="ps-trow"><span>Total funded</span><b>${psFmt(total)}</b></div>`:`
    <div class="ps-trow"><span>Agreed deal value</span><b>${psFmt(value)}</b></div>
    <div class="ps-trow"><span>Service fee (10%)</span><b>${psFmt(fee)}</b></div>
    <div class="ps-trow"><span>You receive</span><b>${psFmt(total)}</b></div>`;
  document.getElementById("psFootNote").textContent=isBusiness
    ?"You'll see this full breakdown again before confirming payment."
    :"Your expected payout is shown before you accept the deal.";

  document.getElementById("psDiscBtn").setAttribute("aria-expanded",String(psState.expanded));
  document.getElementById("psCaret").classList.toggle("open",psState.expanded);
  document.getElementById("psPanel").setAttribute("aria-hidden",String(!psState.expanded));

  const bx=PS_BENEFITS[isBusiness?"business":"owner"];
  document.getElementById("psPanelInner").innerHTML=`
    <div class="ps-cols2">
      <div>
        ${[bx[0],bx[2]].map(x=>`<div class="ps-benefit"><span class="ps-benefit-t">${x.t}</span><span class="ps-benefit-b">${x.b}</span></div>`).join("")}
      </div>
      <div class="ps-vdiv" aria-hidden="true"></div>
      <div>
        ${[bx[1],bx[3]].map(x=>`<div class="ps-benefit"><span class="ps-benefit-t">${x.t}</span><span class="ps-benefit-b">${x.b}</span></div>`).join("")}
      </div>
    </div>
    <div class="ps-terms">
      <span class="ps-terms-t">Want the finer details?</span>
      <span class="ps-terms-b">See how fees, protected payments, refunds and payouts work.</span>
      <a href="#" class="ps-terms-link" data-act="toast-fees">Read the full terms →</a>
    </div>`;

  psSyncPanelHeight();
}
window.addEventListener("resize",()=>{ if(psState.expanded) psSyncPanelHeight(); });
// Bound once via addEventListener for the same reason as djBindControls() above -
// psAmountInput previously shared its id ("psAmount") with the psAmount() function
// it called from an inline oninput attribute, which is the same shadowing hazard.
function psBindControls(){
  document.getElementById("psRoleBiz")?.addEventListener("click",()=>psPickRole("business"));
  document.getElementById("psRoleOwn")?.addEventListener("click",()=>psPickRole("owner"));
  document.getElementById("psDiscBtn")?.addEventListener("click",psToggleDisclosure);
  const amt=document.getElementById("psAmountInput");
  if(amt){
    amt.addEventListener("input",e=>{
      const el=e.target, before=el.value, clean=psSanitizeAmount(before);
      if(clean!==before){
        // A disallowed character (letter, symbol, second decimal point) was
        // typed/pasted - strip it and put the cursor back where it would have
        // ended up, rather than letting it jump to the end.
        const pos=Math.max(0,(el.selectionStart||before.length)-(before.length-clean.length));
        el.value=clean;
        el.setSelectionRange(pos,pos);
      }
      psAmount(el.value);
    });
    amt.addEventListener("blur",e=>psAmountBlur(e.target.value));
  }
}

/* ---------- Resources page ----------
   Two pieces are generated rather than written into index.html: the 14 platform
   playbooks (so the icon and brand colour come straight from PLATFORM_META and
   can never drift from the Marketplace) and the payment-model picker (so the
   model labels and field names come straight from PM_MODELS/PM_ORDER — the same
   definitions the pricing builder and the application form use). Both render
   once at boot; the accordions themselves are native <details>, so opening and
   closing needs no JS at all. */
const RES_PB_ORDER=["TikTok","Instagram","Discord","Newsletter","YouTube","Livestream","Reddit","Quora","X","LinkedIn","Pinterest","Blog/Website","Podcast","Facebook"];
const RES_PLAYBOOKS={
  TikTok:{
    formats:["A dedicated video built around your product","A segment inside a video on the creator's own topic","A Live mention or on-stream demo","Participation in a sound or format you are running","Link-in-bio placement for a campaign window"],
    ask:["Dedicated video or a segment, and if a segment, roughly where it falls","Where the product appears in the first few seconds","How long the video stays up","Whether you get the file to reuse in paid ads, and for how long","Which countries most of the views come from"],
    ex:["A skincare brand buys one dedicated 30-second routine video plus 14 days of link-in-bio placement.","A B2B tool buys a 15-second segment inside a 'day in the job' video, and licences the clip for six months of paid ads."]},
  Instagram:{
    formats:["Sponsored in-feed post or carousel","Reel","A sequence of story frames with a link sticker","Collab post, co-authored so it appears on both accounts","Product tagging on existing content"],
    ask:["Collab post or single-author: the reach is very different","How many story frames, and whether they are saved to a highlight","Whether the link sticker is included","Whether the feed post stays up permanently or is removed after the window","Who supplies the images, and at what crop"],
    ex:["A coffee roaster buys three story frames with a link sticker plus one collab Reel.","A gymwear brand buys a carousel where the first slide is theirs and the rest is the creator's own styling."]},
  Discord:{
    formats:["Announcement post in the server's announcements channel","Pinned message in a topical channel","A dedicated channel or category for your product","Role or emoji giveaway","AMA or voice event","Sponsorship of a recurring server event"],
    ask:["Which channels, and how many members can actually see them","Whether an @everyone or @here ping is included, it changes reach more than anything else here","How long a pin stays before it is rotated out","Whether the mod team answers questions on your behalf or routes them to you","A screenshot of the pin plus the ping timestamp as evidence"],
    ex:["An indie studio buys an announcement with @here plus a pinned playtest signup held for 14 days.","A developer-tools company sponsors a 45-minute voice AMA with a pinned written recap afterwards."]},
  Newsletter:{
    formats:["Dedicated send, your message only","Primary sponsor slot in a regular issue","Short classified or text ad","A sponsored section inside an editorial piece","Footer or 'what I'm using' placement"],
    ask:["List size and recent open rate for the exact segment being sold","How many sponsor slots share the issue","Whether you write the copy or the author writes it in their voice","A tracked link you control","A screenshot of the sent email plus the send report as evidence"],
    ex:["A SaaS buys the primary slot across three consecutive issues so the same readers see it more than once.","A publisher buys one dedicated send timed to pre-order week."]},
  YouTube:{
    formats:["Host-read pre-roll mention","Mid-roll integration","A dedicated review, tutorial or teardown","Unscripted product placement","Description and end-screen placement only","Shorts"],
    ask:["Which slot, and how long the read is","Where the description link sits relative to the fold","Whether the video stays public indefinitely","Whether talking points are approved before filming","Re-use rights if you want to cut the segment into an ad"],
    ex:["A keyboard brand buys a 60-second mid-roll in a productivity channel plus a pinned comment.","A language app buys a dedicated tutorial where the product is the subject rather than a mention."]},
  Livestream:{
    sub:"Twitch, Kick & more",
    formats:["A sponsored segment inside a stream","A full sponsored session, start to finish","Overlay or panel placement for a fixed period","A live, on-air product demo or unboxing","A chat command, bot integration or on-stream giveaway","Clip and VOD retention rights after the stream ends"],
    ask:["Whether the audience actually lives on Twitch, Kick, YouTube Live or elsewhere: each platform pulls a genuinely different crowd","Whether the stream is simulcast across platforms at once, which can multiply your reach from a single session","Which stream slots, by day and hour: the audience at 15:00 is not the audience at 21:00","How long the overlay, panel or chat command stays live","Whether VODs or clips stay available afterwards, and for how long","Average concurrent and peak viewers for that specific slot, not lifetime follower count"],
    ex:["A drinks brand sponsors four streams in a month across Twitch and Kick, with an overlay logo, a chat command and one on-stream taste test the chat reacts to live.","A gaming peripheral brand supplies a keyboard for a two-hour first-playthrough stream and watches chat light up the moment it's unboxed, with the VOD kept live for 60 days.","A software company sponsors a coding stream's entire session, live-demoing the product and fielding viewer questions on air in real time."]},
  Reddit:{
    formats:["A sponsored post where the subreddit's rules allow it","An AMA","A mod-approved announcement or sticky","Inclusion in a sidebar or wiki resources list","Sponsorship of a community event or contest"],
    ask:["Whether the moderators have approved it in writing, on Reddit this is the whole risk","How long a sticky holds","The exact disclosure wording","Whether comments stay open, and who replies","What happens if the post is removed after publication"],
    ex:["A hardware startup runs a founder AMA in a niche subreddit, stickied for 24 hours.","A price-tracking tool is added to a subreddit's sidebar resources list for a quarter."]},
  Quora:{
    formats:["A sponsored answer from a writer with standing in the topic","A post inside a Space","A pinned Space announcement","A long-form Quora blog post"],
    ask:["Which specific questions the answer targets, and whether those questions already get traffic","How the sponsorship is disclosed","Whether the answer stays up indefinitely: search longevity is most of the value","Whether it can be edited later if your product changes"],
    ex:["An accounting tool sponsors an answer on a tax-registration question that already ranks in search.","A training provider sponsors a pinned post in a careers Space for a month."]},
  X:{
    formats:["A single sponsored post","A thread using your product as the worked example","A quote-post amplifying your own announcement","Pinned post for a period","An appearance in an audio Space"],
    ask:["Whether the post is pinned, and for how long","Whether it stays up permanently","If it is a thread, which position your mention occupies","That it will not be quietly deleted after payout","Post analytics as evidence rather than follower count"],
    ex:["A launch announcement quote-posted by three accounts in the same niche within the same hour.","A developer tool sponsors a technical thread where the product solves the problem at step four."]},
  LinkedIn:{
    formats:["A sponsored post from a personal profile","A company-page post","One edition of their newsletter","A document or carousel post","A named appearance at a live event"],
    ask:["Personal profile or company page: the reach is not comparable","How the disclosure is worded for a professional audience","Whether they reply in comments for the first day","Who supplies the document, and in which format","Whether the post will be boosted with paid spend, and who pays for it"],
    ex:["An HR platform sponsors a personal-profile post about redesigning a hiring process, with the product named as the tool used.","A recruitment firm sponsors one edition of a niche industry newsletter."]},
  Pinterest:{
    formats:["Standard pins","A multi-page idea pin","A dedicated board or board section","Pins added to an established board","A seasonal collection"],
    ask:["Which board: you are usually buying that board's own traffic, not the account's","Whether the pins stay live indefinitely","Who supplies the imagery, and at what aspect ratio","Whether the destination domain is claimed and verified"],
    ex:["An interiors retailer buys five pins added to an established small-kitchens board for twelve months.","A stationer buys one idea pin plus a dedicated section for a wedding range."]},
  "Blog/Website":{
    formats:["A sponsored article","Inclusion in an existing comparison or roundup","Banner or sidebar placement for a period","A resource-page listing","A review or teardown","A post plus newsletter bundle"],
    ask:["How the link is marked, and stay inside the site's own policy on that","Where on the page your mention sits","How long it stays up, and whether the post gets updated later","Traffic for that specific URL, not for the whole site","Whether the piece is labelled as sponsored, and how"],
    ex:["A payments provider buys a place in an existing invoicing-tools comparison for twelve months.","A B2B brand commissions a sponsored teardown on a niche industry blog."]},
  Podcast:{
    formats:["Host-read pre-roll, mid-roll or post-roll","A dedicated segment or full interview","Series sponsorship across several episodes","Show-notes placement","A social clip promoting the episode"],
    ask:["Which slot, and how long the read is","Whether the ad is baked in permanently or dynamically inserted, dynamic ads can be removed later","Downloads per episode over the first 30 days","Where the show-notes link sits","A vanity URL or code, since podcast attribution is otherwise guesswork"],
    ex:["A meal-kit brand buys mid-roll reads across six consecutive episodes with a vanity URL.","A recruiter sponsors one interview episode featuring a guest from their own team."]},
  Facebook:{
    formats:["A page post","A Group post or pinned announcement, with admin approval","Event sponsorship","Reels","Local community placement"],
    ask:["For a Group, that an admin has approved it and how many members are actually active","How long the pin holds","Whether the post is boosted with paid spend, and who pays","The geographic reach, if your offer is local","Whether comments are moderated"],
    ex:["A local trades business buys a pinned post in a town community group for a week.","A pet brand sponsors a Group's monthly photo contest, including the prize."]}
};
function resPlaybookHtml(p){
  const m=PLATFORM_META[p], d=RES_PLAYBOOKS[p];
  if(!m||!d) return "";
  return `<details class="faq-item res-plat">
    <summary><span class="res-plat-sum"><span class="res-plat-ico" style="background:${m.color}14;color:${m.color}">${m.ico}</span>${esc(p)}${d.sub?`<span class="res-plat-sub">${esc(d.sub)}</span>`:""}</span></summary>
    <div class="res-plat-body">
      <div class="two-list">
        <div><h4>Formats you can buy</h4><ul class="list-yes">${d.formats.map(x=>`<li>${esc(x)}<button type="button" class="res-vis" data-p="${esc(p)}" data-f="${esc(x)}" aria-haspopup="dialog" aria-label="See a visual example: ${esc(p)}, ${esc(x)}">Visual</button></li>`).join("")}</ul></div>
        <div><h4>Pin down before you fund</h4><ul class="list-ask">${d.ask.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>
      </div>
    </div>
  </details>`;
}
function resRenderPlaybooks(){
  const el=$("resPlaybooks");
  if(!el) return;
  el.innerHTML=RES_PB_ORDER.map(resPlaybookHtml).join("");
  if(!el._visWired){
    el.addEventListener("click",e=>{
      const b=e.target.closest(".res-vis");
      if(b){ e.preventDefault(); resVisOpen(b); }
    });
    el._visWired=true;
  }
}

/* ---------- Visual viewer ----------
   Every "Visual" link in the playbooks is one entry in a single ordered set, so
   prev/next walks the whole page — the rest of a platform's formats first, then
   on into the next platform. The panel itself is created the first time someone
   opens it (nothing ships in the page's initial markup) and the key handler only
   exists while it is open. Frames are labelled placeholders: no invented
   platform UI, and nothing here depicts PromoSlot's own product. */
const RES_VIS_PORTRAIT=new Set(["TikTok","Instagram","Pinterest"]);
// Real example media, keyed "Platform|exact format string". Everything not
// listed here still renders as the clearly-labelled placeholder below — no
// fabricated screenshots stand in for a real platform's UI.
const RES_VIS_MEDIA={
  "TikTok|A dedicated video built around your product":"img/playbooks/tiktok-dedicated-video.jpg",
  "TikTok|A segment inside a video on the creator's own topic":"img/playbooks/tiktok-creator-topic-segment.jpg",
  "TikTok|A Live mention or on-stream demo":"img/playbooks/tiktok-live-mention-demo.jpg",
  "TikTok|Participation in a sound or format you are running":"img/playbooks/tiktok-sound-format-participation.jpg",
  "TikTok|Link-in-bio placement for a campaign window":"img/playbooks/tiktok-link-in-bio.jpg",
  "Instagram|Sponsored in-feed post or carousel":"img/playbooks/instagram-feed-carousel.jpg",
  "Instagram|Reel":"img/playbooks/instagram-reel.jpg",
  "Instagram|A sequence of story frames with a link sticker":"img/playbooks/instagram-story-frames-link.jpg",
  "Instagram|Collab post, co-authored so it appears on both accounts":"img/playbooks/instagram-collab-post.jpg",
  "Instagram|Product tagging on existing content":"img/playbooks/instagram-product-tagging.jpg",
  "Discord|Announcement post in the server's announcements channel":"img/playbooks/discord-announcement-post.jpg",
  "Discord|Pinned message in a topical channel":"img/playbooks/discord-pinned-message.jpg",
  "Discord|A dedicated channel or category for your product":"img/playbooks/discord-dedicated-category.jpg",
  "Discord|Role or emoji giveaway":"img/playbooks/discord-role-emoji-unlock.jpg",
  "Discord|AMA or voice event":"img/playbooks/discord-live-ama.jpg",
  "Discord|Sponsorship of a recurring server event":"img/playbooks/discord-recurring-event.jpg",
  "Newsletter|Dedicated send, your message only":"img/playbooks/newsletter-dedicated-send.jpg",
  "Newsletter|Primary sponsor slot in a regular issue":"img/playbooks/newsletter-primary-sponsor.jpg",
  "Newsletter|Short classified or text ad":"img/playbooks/newsletter-text-ad.jpg",
  "Newsletter|A sponsored section inside an editorial piece":"img/playbooks/newsletter-sponsored-section.jpg",
  "Newsletter|Footer or 'what I'm using' placement":"img/playbooks/newsletter-footer-placement.jpg",
  "YouTube|Host-read pre-roll mention":"img/playbooks/youtube-host-read-preroll.jpg",
  "YouTube|Mid-roll integration":"img/playbooks/youtube-mid-roll-integration.jpg",
  "YouTube|A dedicated review, tutorial or teardown":"img/playbooks/youtube-dedicated-review.jpg",
  "YouTube|Unscripted product placement":"img/playbooks/youtube-unscripted-placement.jpg",
  "YouTube|Description and end-screen placement only":"img/playbooks/youtube-description-endscreen.jpg",
  "YouTube|Shorts":"img/playbooks/youtube-shorts.jpg",
  "Reddit|A sponsored post where the subreddit's rules allow it":"img/playbooks/reddit-sponsored-post.jpg",
  "Reddit|An AMA":"img/playbooks/reddit-ama.jpg",
  "Reddit|A mod-approved announcement or sticky":"img/playbooks/reddit-mod-sticky.jpg",
  "Reddit|Inclusion in a sidebar or wiki resources list":"img/playbooks/reddit-sidebar-wiki.jpg",
  "Reddit|Sponsorship of a community event or contest":"img/playbooks/reddit-community-contest.jpg",
  "Livestream|A sponsored segment inside a stream":"img/playbooks/livestream-sponsored-segment.jpg",
  "Livestream|A full sponsored session, start to finish":"img/playbooks/livestream-full-session.jpg",
  "Livestream|Overlay or panel placement for a fixed period":"img/playbooks/livestream-overlay-panel.jpg",
  "Livestream|A live, on-air product demo or unboxing":"img/playbooks/livestream-product-demo.jpg",
  "Livestream|A chat command, bot integration or on-stream giveaway":"img/playbooks/livestream-chat-command.jpg",
  "Livestream|Clip and VOD retention rights after the stream ends":"img/playbooks/livestream-clip-vod-rights.jpg",
  "Quora|A sponsored answer from a writer with standing in the topic":"img/playbooks/quora-sponsored-answer.jpg",
  "Quora|A post inside a Space":"img/playbooks/quora-space-post.jpg",
  "Quora|A pinned Space announcement":"img/playbooks/quora-pinned-space-announcement.jpg",
  "Quora|A long-form Quora blog post":"img/playbooks/quora-long-form-blog-post.jpg",
  "X|A single sponsored post":"img/playbooks/x-single-sponsored-post.jpg",
  "X|A thread using your product as the worked example":"img/playbooks/x-thread-worked-example.jpg",
  "X|A quote-post amplifying your own announcement":"img/playbooks/x-quote-post-announcement.jpg",
  "X|Pinned post for a period":"img/playbooks/x-pinned-post.jpg",
  "X|An appearance in an audio Space":"img/playbooks/x-audio-space.jpg",
  "LinkedIn|A sponsored post from a personal profile":"img/playbooks/linkedin-personal-post.jpg",
  "LinkedIn|A company-page post":"img/playbooks/linkedin-company-page-post.jpg",
  "LinkedIn|One edition of their newsletter":"img/playbooks/linkedin-newsletter-edition.jpg",
  "LinkedIn|A document or carousel post":"img/playbooks/linkedin-document-carousel.jpg",
  "LinkedIn|A named appearance at a live event":"img/playbooks/linkedin-live-event.jpg",
  "Pinterest|Standard pins":"img/playbooks/pinterest-standard-pins.jpg",
  "Pinterest|A multi-page idea pin":"img/playbooks/pinterest-idea-pin.jpg",
  "Pinterest|A dedicated board or board section":"img/playbooks/pinterest-dedicated-board.jpg",
  "Pinterest|Pins added to an established board":"img/playbooks/pinterest-established-board.jpg",
  "Pinterest|A seasonal collection":"img/playbooks/pinterest-seasonal-collection.jpg",
  "Blog/Website|A sponsored article":"img/playbooks/blog-sponsored-article.jpg",
  "Blog/Website|Inclusion in an existing comparison or roundup":"img/playbooks/blog-comparison-roundup.jpg",
  "Blog/Website|Banner or sidebar placement for a period":"img/playbooks/blog-banner-sidebar.jpg",
  "Blog/Website|A resource-page listing":"img/playbooks/blog-resource-page-listing.jpg",
  "Blog/Website|A review or teardown":"img/playbooks/blog-review-teardown.jpg",
  "Blog/Website|A post plus newsletter bundle":"img/playbooks/blog-post-newsletter-bundle.jpg",
  "Podcast|Host-read pre-roll, mid-roll or post-roll":"img/playbooks/podcast-host-read-roll.jpg",
  "Podcast|A dedicated segment or full interview":"img/playbooks/podcast-dedicated-segment-interview.jpg",
  "Podcast|Series sponsorship across several episodes":"img/playbooks/podcast-series-sponsorship.jpg",
  "Podcast|Show-notes placement":"img/playbooks/podcast-show-notes-placement.jpg",
  "Podcast|A social clip promoting the episode":"img/playbooks/podcast-social-clip.jpg",
  "Facebook|A page post":"img/playbooks/facebook-page-post.jpg",
  "Facebook|A Group post or pinned announcement, with admin approval":"img/playbooks/facebook-group-pinned-announcement.jpg",
  "Facebook|Event sponsorship":"img/playbooks/facebook-event-sponsorship.jpg",
  "Facebook|Reels":"img/playbooks/facebook-reels.jpg",
  "Facebook|Local community placement":"img/playbooks/facebook-local-community-placement.jpg"
};
let _vwI=null, _vwTrigger=null, _vwScroll="";
function resVisItems(){ return [].slice.call(document.querySelectorAll("#resPlaybooks .res-vis")); }
function resVisReduced(){ return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion:reduce)").matches); }
function resVisBuild(){
  if($("resViewer")) return $("resViewer");
  const d=document.createElement("div");
  d.className="vw"; d.id="resViewer";
  d.setAttribute("role","dialog"); d.setAttribute("aria-modal","true"); d.setAttribute("aria-labelledby","vwTitle");
  d.innerHTML=`<div class="vw-panel">
    <div class="vw-grab"></div>
    <button type="button" class="modal-x" id="vwClose" aria-label="Close" onclick="resVisClose()">✕</button>
    <div class="vw-head">
      <span class="res-plat-ico" id="vwIco" aria-hidden="true"></span>
      <div><div class="vw-eyebrow" id="vwPlat"></div><div class="vw-title" id="vwTitle"></div></div>
    </div>
    <div class="vw-body"><div class="vw-frame" id="vwFrame"></div></div>
    <div class="vw-foot">
      <span class="vw-count" id="vwCount" aria-live="polite"></span>
      <div class="vw-nav">
        <button type="button" class="btn btn-o btn-sm" id="vwPrev" onclick="resVisStep(-1)" aria-label="Previous visual">← Prev</button>
        <button type="button" class="btn btn-p btn-sm" id="vwNext" onclick="resVisStep(1)" aria-label="Next visual">Next →</button>
      </div>
    </div>
  </div>`;
  d.addEventListener("click",e=>{ if(e.target===d) resVisClose(); });
  document.body.appendChild(d);
  return d;
}
function resVisPaint(){
  const items=resVisItems(), b=items[_vwI];
  if(!b) return;
  const p=b.dataset.p||"", f=b.dataset.f||"", m=PLATFORM_META[p];
  const ico=$("vwIco");
  if(ico){ ico.innerHTML=m?m.ico:""; ico.style.background=m?m.color+"14":"var(--acc-soft)"; ico.style.color=m?m.color:"var(--acc)"; }
  const pl=$("vwPlat"); if(pl) pl.textContent=p;
  const t=$("vwTitle"); if(t) t.textContent=f;
  const c=$("vwCount"); if(c) c.textContent=(_vwI+1)+" / "+items.length;
  const fr=$("vwFrame");
  if(fr){
    fr.classList.toggle("port", RES_VIS_PORTRAIT.has(p));
    const img=RES_VIS_MEDIA[p+"|"+f];
    fr.classList.toggle("has-img", !!img);
    fr.innerHTML=img
      ? `<img src="${esc(img)}" alt="${esc(p)}, ${esc(f)}, example">`
      : `<span class="vw-frame-ico" style="color:${m?m.color:"var(--acc)"}">${m?m.ico:""}</span>
      <span class="vw-frame-lbl">Placeholder<br>${esc(p)}, ${esc(f)}<br>image or video goes here</span>`;
  }
  // Keep the page underneath in step with the viewer.
  let n=b.parentElement;
  while(n){ if(n.tagName==="DETAILS") n.open=true; n=n.parentElement; }
}
function resVisOpen(btn){
  const items=resVisItems(), i=items.indexOf(btn);
  if(i<0) return;
  resVisBuild();
  _vwI=i; _vwTrigger=btn;
  resVisPaint();
  const vw=$("resViewer");
  vw.classList.add("open");
  _vwScroll=document.body.style.overflow;
  document.body.style.overflow="hidden";
  // Force a reflow before the .in class so the open transition always runs from
  // its start state — a rAF here is not reliable in a backgrounded frame.
  void vw.offsetWidth;
  vw.classList.add("in");
  document.addEventListener("keydown",resVisKey,true);
  setTimeout(()=>{ const f=$("vwClose"); if(f) try{ f.focus(); }catch(e){} },30);
}
function resVisStep(dir){
  const items=resVisItems(), n=items.length;
  if(!n||_vwI===null) return;
  _vwI=(_vwI+dir+n)%n;
  const fr=$("vwFrame");
  if(fr && !resVisReduced()){
    fr.classList.add("swap");
    setTimeout(()=>{ resVisPaint(); fr.classList.remove("swap"); },150);
  } else resVisPaint();
}
function resVisClose(){
  const vw=$("resViewer");
  if(!vw||!vw.classList.contains("open")) return;
  vw.classList.remove("in");
  document.removeEventListener("keydown",resVisKey,true);
  document.body.style.overflow=_vwScroll||"";
  const t=_vwTrigger;
  const finish=()=>vw.classList.remove("open");
  if(resVisReduced()) finish(); else setTimeout(finish,240);
  _vwI=null; _vwTrigger=null;
  if(t) try{ t.focus(); }catch(e){}
}
// Escape, arrows and a tab loop. Capture phase so the app's own global Escape
// handler never sees the key while this panel owns the screen.
function resVisKey(e){
  const vw=$("resViewer");
  if(!vw||!vw.classList.contains("open")) return;
  if(e.key==="Escape"){ e.preventDefault(); e.stopPropagation(); resVisClose(); return; }
  if(e.key==="ArrowRight"||e.key==="ArrowDown"){ e.preventDefault(); e.stopPropagation(); resVisStep(1); return; }
  if(e.key==="ArrowLeft"||e.key==="ArrowUp"){ e.preventDefault(); e.stopPropagation(); resVisStep(-1); return; }
  if(e.key!=="Tab") return;
  const f=[].slice.call(vw.querySelectorAll("button:not([disabled])"));
  if(!f.length) return;
  const first=f[0], last=f[f.length-1];
  if(!vw.contains(document.activeElement)){ e.preventDefault(); first.focus(); return; }
  if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
}
// Guidance per payment model. The label and the field names are read from
// PM_MODELS at render time, so this only carries the editorial part.
const RES_MODELS={
  fixed:{what:"One agreed price for one agreed deliverable. The full amount is held before work starts.",
    best:"A single piece of work you can describe in a sentence: one video, one send, one pinned post. It is also the sensible default the first time you work with a partner.",
    watch:"You are paying for the deliverable, not for a projected audience. If a reach figure matters to you, it belongs in the terms as a named number with named evidence, not as an expectation."},
  "per-view":{what:"A guaranteed minimum plus a rate per thousand views, up to a maximum payout.",
    best:"Short-form video, where the same account can do modest numbers one week and very large numbers the next, and neither side can honestly predict which.",
    watch:"Name the counter and the measurement window before you fund. A platform's creator dashboard, its public counter and a third-party tool rarely agree, and that gap is the most common cause of a dispute."},
  "per-imp":{what:"A rate per thousand impressions, against the impressions the placement is expected to deliver.",
    best:"Placement inventory: newsletter slots, banners, story frames, where the audience is served the placement rather than choosing to watch it.",
    watch:"Impressions are neither views nor clicks. Agree which screen the figure is read from, and remember that an impression count says nothing about whether anyone read it."},
  time:{what:"A price per day, week or month for a placement that stays live for a set duration.",
    best:"Positions you rent rather than content you commission: pinned messages, stream overlays, sidebar and resource-page links, board placements.",
    watch:"A period is only verifiable if it is checked at both ends. Ask for dated evidence at the start and at the end of the window, not just a screenshot on day one."},
  affiliate:{what:"A percentage per sale, with a cookie window and an optional minimum payout.",
    best:"A product with a working checkout, tracking you already trust, and an audience close enough to buying that a recommendation converts on its own.",
    watch:"It can pay nothing through nobody's fault, so experienced partners often decline it on its own. Only the minimum payout is held up front. With no minimum, nothing is escrowed."},
  hybrid:{what:"A guaranteed amount held up front, plus agreed performance terms on top of it.",
    best:"A first campaign together, or any deal where you and the partner genuinely disagree about the likely result and both have a defensible case.",
    watch:"Write the performance half as a formula with one named source and one window: five pounds per thousand views on the post's own analytics, counted 30 days after publication. Never as an adjective like strong performance."},
  custom:{what:"Anything the six above do not describe: staged retainers, product plus fee, revenue splits, barter.",
    best:"Genuinely unusual deals. If a standard model nearly fits, use the standard model: it is easier for both sides and for a reviewer to check.",
    watch:"There are no defaults to fall back on, and only the amount stated up front is held. Spell out how each part is calculated, when it falls due, and what evidence settles it."}
};
const RES_SCENARIOS=[
  {t:"One post, one price",k:"fixed",why:"A single well-defined deliverable is exactly what fixed price is for. Name the thing, agree the number, fund it."},
  {t:"Reach could be huge or nothing",k:"per-view",why:"Per view shares the uncertainty rather than arguing about it: the minimum protects the partner, the rate rewards a hit, the cap protects you."},
  {t:"I'm renting a position for a while",k:"time",why:"Pins, overlays, sidebars and boards are positions rather than posts. Price the period, and evidence both ends of it."},
  {t:"I'm buying newsletter or banner inventory",k:"per-imp",why:"Placement inventory is sold on volume delivered. Agree which figure the platform reports before you fund anything."},
  {t:"I want to pay on sales only",k:"affiliate",why:"Affiliate works when checkout and tracking are already reliable. Expect fewer partners to accept it with no guaranteed element."},
  {t:"First campaign with this partner",k:"hybrid",why:"Hybrid is the honest answer when neither side can predict the result: guarantee enough to be worth their time, and put the rest on numbers you have both named."},
  {t:"None of these describe it",k:"custom",why:"Custom carries no defaults, so anything left out of the terms cannot be checked later. Write more than feels necessary."}
];
let _resModel="fixed", _resScen=null;
function resModelDetailHtml(k){
  const m=PM_MODELS[k], d=RES_MODELS[k];
  if(!m||!d) return "";
  const s=_resScen!=null&&RES_SCENARIOS[_resScen]&&RES_SCENARIOS[_resScen].k===k ? RES_SCENARIOS[_resScen] : null;
  return `<h4>${esc(m.label)}</h4>
    <p class="rm-what">${esc(d.what)}</p>
    ${s?`<div class="rm-why">${esc(s.why)}</div>`:""}
    <div class="rm-row"><div class="rm-l">Best when</div><p>${esc(d.best)}</p></div>
    <div class="rm-row"><div class="rm-l">Watch out for</div><p>${esc(d.watch)}</p></div>
    <div class="rm-row"><div class="rm-l">What the listing asks for</div><div class="rm-fields">${m.fields.map(f=>`<span>${esc(f.l)}</span>`).join("")}</div></div>`;
}
function resSyncModels(){
  const d=$("resModelDetail");
  if(d) d.innerHTML=resModelDetailHtml(_resModel);
  const rec=_resScen!=null&&RES_SCENARIOS[_resScen] ? RES_SCENARIOS[_resScen].k : null;
  document.querySelectorAll("#resModels .rm-nav-btn").forEach(b=>{
    b.classList.toggle("on", b.dataset.mk===_resModel);
    b.classList.toggle("rec", b.dataset.mk===rec);
    b.setAttribute("aria-pressed", b.dataset.mk===_resModel?"true":"false");
  });
  document.querySelectorAll("#resModels .rm-chip").forEach(b=>{
    const on=Number(b.dataset.si)===_resScen;
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on?"true":"false");
  });
}
function resRenderModels(){
  const el=$("resModels");
  if(!el) return;
  el.innerHTML=`<div class="rm-q">Start from what you are actually buying</div>
    <div class="rm-chips">${RES_SCENARIOS.map((s,i)=>`<button type="button" class="dj-chip rm-chip" data-si="${i}" aria-pressed="false" onclick="resScenario(${i})"><span class="dj-chip-dot"></span>${esc(s.t)}</button>`).join("")}</div>
    <div class="rm-cols">
      <div class="rm-nav">${PM_ORDER.map(k=>`<button type="button" class="rm-nav-btn" data-mk="${esc(k)}" aria-pressed="false" onclick="resPickModel('${esc(k)}')">${esc(PM_MODELS[k].label)}<span class="rm-rec">SUGGESTED</span></button>`).join("")}</div>
      <div class="rm-detail" id="resModelDetail"></div>
    </div>`;
  resSyncModels();
}
// Clicking a model reads it directly; clicking a scenario chip jumps to the
// model it implies and explains why. Clicking the same chip again clears it.
function resPickModel(k){ if(!PM_MODELS[k]) return; _resModel=k; resSyncModels(); }
function resScenario(i){
  const s=RES_SCENARIOS[i]; if(!s) return;
  if(_resScen===i){ _resScen=null; } else { _resScen=i; _resModel=s.k; }
  resSyncModels();
}
function resRender(){ resRenderPlaybooks(); resRenderModels(); }

const EXPORTS={PSBoot,overlayClick,renderMarket,setMarketTab,toggleFilters,toggleFilter,resetFilters,buildFilters,openMarket,marketCtaClick,openListing,openCampaign,openChat,sendChat,requestQuote,sendQuoteReq,buyOffer,applyCampaign,submitApplication,renderDeal,showView,dealNext,approveMine,counterOffer,sendCounter,cancelDeal,fundDeal,submitProof,openDispute,leaveReview,startWizard,openRegisterPlatform,renderWiz,wizBack,wizNext,openNewCampaign,openDash,switchRole,confirmLinkProfile,switchToLinkedAccount,requireRole,_roleGateSwitch,_roleGateCreate,goHome,goHow,closeModal,toast,syncNav,openMessages,openConv,renderMessages,sendInboxMsg,toggleNotifs,pushNotif,openNotif,openVerify,vfPick,vfContactSupport,vfStartBizStripe,vfSubmitBiz,vfSubmitPlatIdentity,vfSubmitPlatOwnership,openVerificationQueue,openVerificationDecision,decideVerification,animateKpis,authModal,_authSyncNameFields,doSignup,doLogin,doLogout,renderRealDeal,realApprove,realDecline,realFund,realPay,realSubmitProof,realVerify,realRelease,realRefund,realReviewModal,setReviewStars,realSubmitReview,openReviewQueue,openPayouts,openAccount,doChangePassword,openProfile,addProofSlot,pfDrop,pfFileName,addWorkSlot,wkDrop,wkFileName,uploadWork,uploadMedia,deleteMedia,uploadAvatar,uploadIntroVideo,submitSupport,uploadListingImage,uploadCampaignImage,addPmSlot,pmSlotChange,submitApplication,confirmRemoveListing,confirmRemoveCampaign,
forgotPasswordModal,sendReset,resetPasswordModal,doResetPassword,
checkYourEmailModal,closeVerifyWait,resendVerification,verifyEmailFromLink,scrollToPanel,openCompleted,
renderWhoWeAre,addLinkRow,saveWhoWeAre,uploadAsset,deleteAsset,
openEditListing,saveListingEdits,openEditCampaign,saveCampaignEdits,addEditPriceRow,editPriceTypeChange,wAddCustomChip,eAddCustomChip,
openPoolBuyModal,confirmPoolBuy,
openAdmin,adminSetRole,adminSuspend,adminUnsuspend,adminSearchUsers,can,loadPerms,
renderActionCodePanel,saveActionCode,
adminSuspendListing,adminUnsuspendListing,adminSuspendCampaign,adminUnsuspendCampaign,
askDuration,setRoute,clearRoute,readRoute,restoreRoute,restoreSession,togglePayMethod,useSuggestion,
authGate,closeSignupNudge,
tourBegin,tourDismissWelcome,tourNext,tourBack,tourSkip,tourFinish,
tourResumeClick,tourHideResume,tourRestart,syncTourResume,maybeOfferTour,tourStart,
openSupportQueue,openSupportTicket,claimSupportTicket,sendSupportReply,addSupportNote,transferSupportTicket,
acpLinkHtml,acpAccountLinkHtml,openAcpAccount,openAcpItem,adminBan,adminUnban,adminDeleteUser,
deleteAccountModal,doDeleteAccount,
deactivateAccountModal,doDeactivateAccount,
restrictedUserRowsHtml,restrictedItemRowsHtml,filterRestrictedUsers,filterRestrictedItems,adminRemoveListing,adminRemoveCampaign,
renderMarketRail,railSetRole,heroSearchGo,heroPlatformGo,renderHeroChips,renderPlatBrowseChips,toggleAccRow,setHeroDirection,smoothTo,
djSetRole,djGo,djNext,djBack,djNavKey,
psPickRole,psAmount,psAmountBlur,psPresetPick,psToggleDisclosure,
resRender,resPickModel,resScenario,resVisOpen,resVisClose,resVisStep,
refreshPayoutStatus,connectPayouts,refreshInstantStatus,toggleInstantPayout,openAddDebitCard,submitDebitCard,realInstantPayout,
openDisputesQueue,openDispute,claimDispute,addDisputeNote,requestDisputeInfo,
openEditDisplayName,saveDisplayName,
openEditPhone,savePhone,clearPhone,setMarketingPreference};
Object.assign(window,EXPORTS);
window.S=S;
Object.defineProperty(window,"W",{get:()=>W,set:v=>{W=v}});
})();
