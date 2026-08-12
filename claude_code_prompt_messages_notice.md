# PromoSlot — Messages inbox: refined policy notice, footer-styled

Small, self-contained, no backend changes. Confirmed with Rob:

- Copy (approved as written):

  > **Welcome to Messages.** You're free to discuss anything here — pricing, timelines, ideas, whatever's useful. If you do reach an agreement, make sure it's reflected in your listing or campaign, with the other party buying or applying to it. That's what allows PromoSlot to verify delivery and release the correct payout.

- Style: match the footer's actual look — white/`--card` background, thin `--line` top border, muted `--mut` slate-gray text — not a bold colored callout like the amber/blue `.note` boxes used elsewhere.
- Shown at the top of every conversation thread (i.e. for every person the user is messaging), not just once at the inbox level.

## 1. CSS — `frontend/index.html`

Add a grey modifier next to the existing `.note`/`.note.blue` rules (~line 608-609):

```css
.note.grey{background:var(--card);border-color:var(--line);color:var(--mut)}
```

Reuses `.note`'s existing shape (padding, radius, font-size) — just swaps the three colors to match `.footer`/`.footer-in`'s palette (`--card`, `--line`, `--mut`).

## 2. `frontend/promoslot-app.js` — `renderMessages()` (~line 1685-1690)

This replaces the existing blue delivery-mechanics note with the new policy notice — one box, not two stacked. The old note ("💬 Messages are delivered to X's account…") is being intentionally dropped in favor of Rob's copy above; flag it if you think that mechanical detail is worth keeping elsewhere.

```js
// was:
thread=`<div class="chat-head">
  <button class="btn btn-ghost conv-back" onclick="renderMessages(false)">←</button>
  ${pfp(t.other_name,null)}<div><b>${esc(t.other_name)}</b><small class="mut" style="color:var(--mut)">Direct message</small></div>${viewBtn}</div>
<div style="padding:12px 16px 0"><div class="note blue" style="margin:0">💬 Messages are delivered to <b>${esc(t.other_name)}</b>'s account. Replies appear here only when they actually respond.</div></div>
<div class="chat-msgs" id="ibMsgs">${threadMsgsHtml(t.messages)}</div>
<div class="chat-input"><input id="ibInput" autocomplete="off" placeholder="Type a message…" onkeydown="if(event.key==='Enter')sendInboxMsg()"><button class="btn btn-p" onclick="sendInboxMsg()">Send</button></div>`;

// now:
thread=`<div class="chat-head">
  <button class="btn btn-ghost conv-back" onclick="renderMessages(false)">←</button>
  ${pfp(t.other_name,null)}<div><b>${esc(t.other_name)}</b><small class="mut" style="color:var(--mut)">Direct message</small></div>${viewBtn}</div>
<div style="padding:12px 16px 0"><div class="note grey" style="margin:0"><b>Welcome to Messages.</b> You're free to discuss anything here — pricing, timelines, ideas, whatever's useful. If you do reach an agreement, make sure it's reflected in your listing or campaign, with the other party buying or applying to it. That's what allows PromoSlot to verify delivery and release the correct payout.</div></div>
<div class="chat-msgs" id="ibMsgs">${threadMsgsHtml(t.messages)}</div>
<div class="chat-input"><input id="ibInput" autocomplete="off" placeholder="Type a message…" onkeydown="if(event.key==='Enter')sendInboxMsg()"><button class="btn btn-p" onclick="sendInboxMsg()">Send</button></div>`;
```

Nothing else in `renderMessages()` changes — the conversation list, the inbox-level header (`head`, ~line 1668), and `msgSuggestHtml()` are all untouched.

## Verification

- Open any conversation thread — confirm the notice renders in a light grey/white card with a thin border and muted text (visually consistent with the site footer), not the previous blue box.
- Open a second, different conversation thread — confirm the same notice appears there too (it's per-thread, not a one-time dismissible banner).
- Confirm the inbox list view (before opening any thread) is unchanged, and the existing "Negotiate freely…" tagline at the top of the Messages page is untouched.
- Confirm no backend/API changes were needed and nothing else on the page shifted layout unexpectedly.
