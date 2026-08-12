# PromoSlot — Fix "add my other profile" bug + real dual linked accounts

Two things ship together because the bug's root cause and the new feature are the same underlying gap. Confirmed with Rob:

- This is a genuine architecture change, not a UI tweak: today one email = one `User` row = one identity with one `display_name`, and "I'm both" just sets two booleans true on that single row ("one account, two dashboards"). Going forward, a person can have **two separate, linked identities** under one email — a business identity and a platform-owner identity — each with its own name, avatar, bio, listings/campaigns. A person never has more than these two; this is a deliberate ceiling, not a general multi-account system, so don't build anything more general than what's specified below.
- Both signup paths now produce the same shape: choosing "I'm both" at signup, **and** adding the other role later from an existing account, both result in two linked rows sharing an email. (This changes "I'm both"'s current behavior — confirmed intentional.)
- Names: the two linked identities cannot share the same name. Exact match only (case-insensitive, trimmed) — not fuzzy similarity. `"RobFit"` vs `"robfit "` is blocked; `"RobFit"` vs `"Rob Fit"` is allowed.
- Switching between linked identities never re-prompts for a password. It's safe specifically because the link between two rows is only ever created by the backend itself, inside an already-authenticated action — never from anything a client can supply directly.
- Existing accounts that already have both `is_business` and `is_platform_owner` true on one row (today's "both roles, one account" users) are **not migrated or touched**. They keep working exactly as they do today (single identity, nav role-switch just flips which dashboard is shown). The new linked-identity system only applies to signups and role-additions that happen after this ships.
- Do not touch `routers/platforms.py` or `routers/campaigns.py` — their `if not user.is_business` / `if not user.is_platform_owner` 403 checks are already correct. The bug isn't there; it's that nothing ever sets those flags true on the right row after signup. Fixing where the flags get set makes those checks work correctly with zero changes to them.

## Background — the bug, confirmed

`create_platform` (`backend/routers/platforms.py:98-102`) and `create_campaign` (`backend/routers/campaigns.py:98-102`) both 403 unless `user.is_platform_owner` / `user.is_business` is already `True`. Those flags are only ever set once, at signup (`backend/routers/auth.py:79-85`) — there is no endpoint anywhere that flips them on an existing account. So today, a user who signs up as (say) platform-owner only, then later clicks "Set up my business profile too" (`frontend/promoslot-app.js:2816`) or the nav's "Set up your business/platform-owner profile?" prompt (`switchRole()`, `frontend/promoslot-app.js:712-722`), walks through the *entire* business wizard, and only at the final publish step (`finishBiz()`, ~line 2760) discovers the backend rejects it. The wizard doesn't fail visibly until the very last click.

## 1. Data model — `backend/models.py`

In the `User` class (~line 37-118):

```python
# was:
email = Column(String, unique=True, nullable=False, index=True)
# now:
email = Column(String, nullable=False, index=True)
# No longer globally unique at the column level — a person's two linked
# identities share the same email. Real uniqueness is enforced per-role by
# the two partial indexes added in the migration below (at most one business
# identity and one platform-owner identity per email).
```

Add a new column, right after `is_reviewer`:

```python
# Self-referential link to this person's OTHER identity under the same email
# (business <-> platform-owner). NULL for every single-role account, including
# every legacy "both roles on one row" account (never touched, never linked).
# A person has at most two identities — always set symmetrically on both rows
# in the same transaction (see signup() and link_profile() in routers/auth.py).
# Do not build this as a join table; a plain nullable FK is correct for a
# ceiling of exactly two.
linked_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
```

Add the relationship (needs `remote_side` because it's self-referential) near the other relationships at the bottom of the class, and extend the existing import line:

```python
# was:
from sqlalchemy.orm import relationship
# now:
from sqlalchemy.orm import relationship, object_session
```

```python
linked_account = relationship("User", remote_side=[id], foreign_keys=[linked_user_id],
                              uselist=False, post_update=True)
```

Add one computed property, used only to decide whether to keep offering "set up your other profile" after someone has already used it once (see frontend section 6):

```python
@property
def has_published_listing_or_campaign(self) -> bool:
    """Does this specific identity already have real content of its own?
    Used only to stop re-offering the 'set up your other profile' upsell
    once they've actually used it — not a permission check."""
    sess = object_session(self)
    if sess is None:
        return False
    if self.is_platform_owner:
        return sess.query(Platform.id).filter(Platform.owner_id == self.id).first() is not None
    if self.is_business:
        return sess.query(Campaign.id).filter(Campaign.business_id == self.id).first() is not None
    return False
```

(`Platform` and `Campaign` are defined later in the same file — fine, since the names are only resolved when the method actually runs, not at class-definition time.)

## 2. Migration

Run `alembic revision -m "dual linked identities"` from the repo root to create a new revision file with `down_revision` auto-filled to the current head. Fill in:

```python
def upgrade() -> None:
    # Drop the old whole-column unique index — replaced by two partial ones below.
    op.drop_index("ix_users_email", table_name="users")

    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(sa.Column("linked_user_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_users_linked_user_id", "users", ["linked_user_id"], ["id"])

    # At most one business identity and one platform-owner identity per email.
    # A plain boolean column works directly as a partial-index predicate on both
    # Postgres and SQLite (0/1 truthy) — no need for `= true` vs `= 1`.
    op.create_index("ix_users_email_business_uniq", "users", ["email"], unique=True,
                    postgresql_where=sa.text("is_business"),
                    sqlite_where=sa.text("is_business"))
    op.create_index("ix_users_email_platform_uniq", "users", ["email"], unique=True,
                    postgresql_where=sa.text("is_platform_owner"),
                    sqlite_where=sa.text("is_platform_owner"))
    # Recreate the plain (non-unique) lookup index the app still relies on for
    # find_by_email — the column already has index=True in the model, but that
    # only takes effect on a fresh create_all(); on a real migrated DB it needs
    # its own explicit index since we just dropped the unique one that covered it.
    op.create_index("ix_users_email_lookup", "users", ["email"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_users_email_lookup", table_name="users")
    op.drop_index("ix_users_email_platform_uniq", table_name="users")
    op.drop_index("ix_users_email_business_uniq", table_name="users")
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_constraint("fk_users_linked_user_id", type_="foreignkey")
        batch_op.drop_column("linked_user_id")
    op.create_index("ix_users_email", "users", ["email"], unique=True)
```

This is a normal `git push`-triggered deploy — Render runs `alembic upgrade head` automatically on every deploy (see project CLAUDE.md), no manual step.

## 3. Schemas — `backend/schemas.py`

Add near `SignupIn`:

```python
class LinkProfileIn(BaseModel):
    role: Literal["business", "platform_owner"]
    display_name: str = Field(min_length=1, max_length=120)
```

Extend `SignupIn`:

```python
class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)
    display_name: Optional[str] = Field(default=None, max_length=120)
    is_business: bool = False
    is_platform_owner: bool = False
    # Only read when both is_business and is_platform_owner are true — the
    # second identity's own name. display_name is always the business
    # identity's name when both roles are chosen together (see signup()).
    second_display_name: Optional[str] = Field(default=None, max_length=120)
```

Add a small nested schema and extend `UserOut`:

```python
class LinkedAccountBrief(BaseModel):
    id: int
    display_name: Optional[str] = None
    is_business: bool
    is_platform_owner: bool
    has_published_listing_or_campaign: bool = False
    model_config = {"from_attributes": True}


class UserOut(BaseModel):
    id: int
    email: str
    display_name: Optional[str] = None
    is_business: bool
    is_platform_owner: bool
    is_reviewer: bool = False
    avatar_url: Optional[str] = None
    intro_video_url: Optional[str] = None
    linked_account: Optional[LinkedAccountBrief] = None   # NEW
    product_tour_started_at: Optional[datetime] = None
    product_tour_completed_at: Optional[datetime] = None
    product_tour_skipped_at: Optional[datetime] = None
    product_tour_current_step: int = 0
    product_tour_version: Optional[str] = None

    model_config = {"from_attributes": True}
```

## 4. `backend/routers/auth.py`

### 4a. `find_by_email` — deterministic when two rows share an email

```python
def find_by_email(db: Session, email: str):
    e = (email or "").strip().lower()
    return (db.query(User).filter(func.lower(User.email) == e)
            .order_by(User.id.asc()).first())
```

The lowest-`id` row of a linked pair is always the "primary" — the one login/password-reset/resend-verification resolve to, and (per section 4b) always the one created first at signup. The secondary is only ever reachable while already authenticated as the primary, via `/auth/switch-account`.

### 4b. `signup()` — branch on "both roles" instead of always creating one row

Replace the body of `signup()` (~line 62-99):

```python
@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(body: SignupIn, response: Response, background: BackgroundTasks,
           db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    if not body.is_business and not body.is_platform_owner:
        raise HTTPException(status_code=422, detail="Select at least one role")
    existing = find_by_email(db, email)
    if existing is not None:
        if existing.banned_at is not None:
            raise HTTPException(
                status_code=403,
                detail="This email address is banned from PromoSlot and cannot be "
                       "used to create an account. Contact support if you believe "
                       "this is a mistake.")
        raise HTTPException(status_code=409, detail="An account with that email already exists")

    both = body.is_business and body.is_platform_owner
    name1 = (body.display_name or "").strip()
    name2 = (body.second_display_name or "").strip()
    if both:
        if not name1 or not name2:
            raise HTTPException(status_code=422,
                                detail="Enter a name for both your business and platform-owner profiles")
        if name1.lower() == name2.lower():
            raise HTTPException(status_code=422,
                                detail="Your business and platform-owner profiles need different names")

    # The business identity is always created first when both roles are chosen
    # together, making it the "primary" identity (see find_by_email above).
    primary = User(
        email=email, password_hash=hash_password(body.password),
        display_name=name1 or None,
        is_business=True if both else body.is_business,
        is_platform_owner=False if both else body.is_platform_owner,
    )
    db.add(primary)
    db.flush()

    if both:
        secondary = User(
            email=email, password_hash=primary.password_hash,
            display_name=name2, is_business=False, is_platform_owner=True,
            linked_user_id=primary.id,
        )
        db.add(secondary)
        db.flush()
        primary.linked_user_id = secondary.id

    db.commit()
    db.refresh(primary)

    token = _new_verification_token(db, primary)
    background.add_task(_send_welcome, primary.email, primary.display_name,
                        primary.is_business, primary.is_platform_owner, token)
    return {"ok": True, "verification_required": True, "email": primary.email,
            "message": "Account created. Check your email for the link to verify "
                       "your address — you'll be signed in as soon as you use it."}
```

One verification email is sent regardless (it's one inbox); verifying it verifies both linked rows at once (section 4c).

### 4c. `verify_email()` — propagate to the linked row

In `verify_email()` (~line 209-235), where it currently does:

```python
t.used = True
if user.verified_at is None:
    user.verified_at = datetime.utcnow()
db.commit()
```

change to:

```python
t.used = True
if user.verified_at is None:
    user.verified_at = datetime.utcnow()
    if user.linked_user_id:
        linked = db.get(User, user.linked_user_id)
        if linked and linked.verified_at is None:
            linked.verified_at = user.verified_at
db.commit()
```

### 4d. `change_password()` and `reset_password()` — keep linked passwords in sync

They're the same real person's one password. In `change_password()` (~line 310-320):

```python
user.password_hash = hash_password(body.new_password)
if user.linked_user_id:
    linked = db.get(User, user.linked_user_id)
    if linked:
        linked.password_hash = user.password_hash
db.commit()
```

In `reset_password()` (~line 293-307), same idea, and also revoke the linked account's sessions (its password just changed too):

```python
user.password_hash = hash_password(body.new_password)
t.used = True
db.query(AuthSession).filter(AuthSession.user_id == user.id).delete()
if user.linked_user_id:
    linked = db.get(User, user.linked_user_id)
    if linked:
        linked.password_hash = user.password_hash
        db.query(AuthSession).filter(AuthSession.user_id == linked.id).delete()
db.commit()
```

### 4e. New endpoint — `POST /auth/link-profile`

Add after `verify_email()`/near the other account-mutating endpoints:

```python
@router.post("/link-profile", response_model=UserOut)
def link_profile(body: LinkProfileIn, request: Request, response: Response,
                 user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create the caller's second, linked identity (business <-> platform-owner)
    under the same email, and switch the session straight into it.

    A person has at most two identities. If this account already has a
    linked_user_id, both roles already exist somewhere in that pair.
    """
    if user.linked_user_id is not None:
        raise HTTPException(status_code=409,
                            detail="You already have two linked profiles on this email.")
    wants_business = body.role == "business"
    if wants_business and user.is_business:
        raise HTTPException(status_code=409, detail="You already have a business profile.")
    if not wants_business and user.is_platform_owner:
        raise HTTPException(status_code=409, detail="You already have a platform-owner profile.")

    name = body.display_name.strip()
    if user.display_name and name.lower() == user.display_name.strip().lower():
        raise HTTPException(status_code=422,
                            detail="That name is already used by your other PromoSlot "
                                   "profile — choose a different one.")

    secondary = User(
        email=user.email, password_hash=user.password_hash,
        display_name=name, is_business=wants_business,
        is_platform_owner=not wants_business,
        verified_at=user.verified_at,   # same inbox, already proven — no new email
    )
    db.add(secondary)
    db.flush()
    secondary.linked_user_id = user.id
    user.linked_user_id = secondary.id
    db.commit()
    db.refresh(secondary)

    # Retire the old session and switch straight into the new identity — the
    # wizard step right after this call needs to be authenticated AS it.
    old_token = request.cookies.get(COOKIE_NAME)
    if old_token:
        old_sess = db.get(AuthSession, old_token)
        if old_sess:
            db.delete(old_sess)
            db.commit()
    _issue_session(db, secondary, response)
    return secondary
```

### 4f. New endpoint — `POST /auth/switch-account`

```python
@router.post("/switch-account", response_model=UserOut)
def switch_account(request: Request, response: Response,
                   user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Swap the active session to this person's other linked identity. Never
    re-checks a password: linked_user_id is only ever set by the backend
    itself, inside an already-authenticated action (signup or /link-profile) —
    never from anything client-supplied — so this can't be used to hop into
    someone else's account."""
    if user.linked_user_id is None:
        raise HTTPException(status_code=409, detail="No linked profile to switch to.")
    linked = db.get(User, user.linked_user_id)
    if linked is None:
        raise HTTPException(status_code=404, detail="Linked profile not found.")
    assert_active(linked)

    old_token = request.cookies.get(COOKIE_NAME)
    if old_token:
        old_sess = db.get(AuthSession, old_token)
        if old_sess:
            db.delete(old_sess)
            db.commit()
    _issue_session(db, linked, response)
    return linked
```

Both new endpoints need `Literal` imported in `schemas.py` (already imported, used by `TourIn`) and `LinkProfileIn` imported into `auth.py`'s existing schema import line.

## 5. Frontend — `frontend/api.js`

Add two named methods next to the existing auth ones (~line 41-43):

```js
linkProfile: (b) => req("POST", "/auth/link-profile", b),
switchAccount: () => req("POST", "/auth/switch-account"),
```

## 6. Frontend — `frontend/promoslot-app.js`

### 6a. Signup modal — collect a second name when both roles are picked

`authModal()` (~line 3840-3881) currently renders one `#au-name` field. Add a second, initially-hidden field and a small sync function that shows it (and relabels both) only when both role chips are on:

```js
// was, inside the signup-only block:
${isSignup?`<div><label>Display name</label><input type="text" id="au-name" placeholder="Robert Media"></div>`:""}
// now:
${isSignup?`<div id="au-name-wrap"><label id="au-name-lbl">Display name</label><input type="text" id="au-name" placeholder="Robert Media"></div>
  <div id="au-name2-wrap" class="hide"><label>Platform-owner name</label><input type="text" id="au-name2" placeholder="RobertLifts"></div>`:""}
```

Chip buttons (~line 3862-3865) call `_authSyncNameFields()` alongside their existing toggle:

```js
<button type="button" class="chip" id="au-r-biz" onclick="this.classList.toggle('on');_authSyncNameFields()">🏢 Business</button>
<button type="button" class="chip" id="au-r-plat" onclick="this.classList.toggle('on');_authSyncNameFields()">📣 Platform owner</button>
```

New function, placed just above `authModal()`:

```js
function _authSyncNameFields(){
  const biz=$("au-r-biz"), plat=$("au-r-plat"); if(!biz||!plat) return;
  const both = biz.classList.contains("on") && plat.classList.contains("on");
  $("au-name2-wrap").classList.toggle("hide", !both);
  $("au-name-lbl").textContent = both ? "Business name"
    : plat.classList.contains("on") ? "Platform-owner name" : "Display name";
}
```

### 6b. `doSignup()` — send the second name, check the collision client-side too

```js
async function doSignup(){
  const email=($("au-email").value||"").trim(), password=$("au-pass").value||"";
  const display_name=($("au-name").value||"").trim();
  const is_business=$("au-r-biz").classList.contains("on");
  const is_platform_owner=$("au-r-plat").classList.contains("on");
  const both = is_business && is_platform_owner;
  const second_display_name = both ? ($("au-name2").value||"").trim() : null;
  if(!email||!password){ _authErr("Email and password are required."); return; }
  if(!is_business && !is_platform_owner){ _authErr("Select at least one role."); return; }
  if(both){
    if(!display_name||!second_display_name){ _authErr("Enter a name for both profiles."); return; }
    if(display_name.toLowerCase()===second_display_name.toLowerCase()){
      _authErr("Your business and platform-owner profiles need different names."); return;
    }
  }
  const btn=$("au-submit"); btn.disabled=true; btn.textContent="Creating…";
  let res;
  try{
    res=await PSApi.signup({email,password,display_name:display_name||null,is_business,is_platform_owner,second_display_name});
  }catch(err){ btn.disabled=false; btn.textContent="Create account"; _authErr(err.message||"Signup failed"); return; }
  checkYourEmailModal(res && res.email || email);
}
```

### 6c. `switchRole()` — the actual bug fix + the switcher

Replace entirely (~line 712-722). Three cases: already this role (unchanged legacy behavior for blended accounts), a linked identity already exists for that role (switch to it), or no linked identity exists yet (collect a name, create it, then continue into the wizard):

```js
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
    <p class="m-sub">This creates a separate, linked profile with its own name — switch between
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
    if(err){err.textContent="That name is already used by your other PromoSlot profile — choose a different one.";err.classList.remove("hide");}
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
  startWizard(r);
}
async function switchToLinkedAccount(r){
  try{ S.account=await PSApi.switchAccount(); }
  catch(e){ toast(e.message||"Could not switch accounts"); return; }
  await loadPerms(); authReflect();
  S.activeRole=r; setTheme(); syncNav();
  toast(`Switched to your ${r==="biz"?"business":"platform-owner"} profile`,true);
  openDash();
}
```

`confirmLinkProfile` deliberately calls `startWizard(r)` right after linking — that's what makes the "set up your other profile" click end up actually publishing something now: by the time `finishBiz()`/`finishPlat()` call `POST /campaigns`/`POST /platforms` at the end of the wizard, the *active session* is already the new, correctly-flagged identity.

### 6d. `wizSuccess()` offer button — switch first, don't assume flags are already right

`finishBiz()`/`finishPlat()` (~line 2760-2793) compute `isBothFlow` by checking `S.account.is_platform_owner` / `S.account.is_business` on the *current* row — under the new model a single row is never both, so update both to check the linked account instead:

```js
// finishBiz(), was:
const isBothFlow = W.kind==="both" && S.account.is_platform_owner && S.myPlatforms.length===0;
// now:
const linkedP = S.account.linked_account;
const isBothFlow = W.kind==="both" && linkedP && linkedP.is_platform_owner && !linkedP.has_published_listing_or_campaign;
```

```js
// finishPlat(), was:
const isBothFlow = W.kind==="both" && S.account.is_business && S.myCampaigns.length===0;
// now:
const linkedB = S.account.linked_account;
const isBothFlow = W.kind==="both" && linkedB && linkedB.is_business && !linkedB.has_published_listing_or_campaign;
```

And the button itself (`wizSuccess()`, ~line 2811-2817) currently calls `startWizard('${offerOtherRole}')` directly — it must switch into the linked identity first (the content already exists from signup, so this is always case 6c's "switch" branch, never the "create" branch):

```js
// was:
${offerOtherRole?`<button class="btn btn-p btn-lg" onclick="startWizard('${offerOtherRole}')">Set up my ${offerOtherRole==="biz"?"business":"platform-owner"} profile too</button>`:""}
// now:
${offerOtherRole?`<button class="btn btn-p btn-lg" onclick="closeModal();switchToLinkedAccount('${offerOtherRole}').then(()=>startWizard('${offerOtherRole}'))">Set up my ${offerOtherRole==="biz"?"business":"platform-owner"} profile too</button>`:""}
```

### 6e. My Account page — the actual "Switch to X" section Rob asked for

In `openAccount()` (~line 4063-4130), add a new panel right after the identity panel (after the `acct-rows` block, before the intro-video panel):

```js
${a.linked_account ? `
<div class="panel" style="grid-column:1/-1"><div class="panel-b">
  <h5 style="margin-bottom:8px">Linked profiles</h5>
  <p class="mut" style="font-size:12.5px;margin-bottom:10px">One login, two identities — switch anytime, no need to log out.</p>
  <div class="op-row">${avatarBlock(null, a.linked_account.display_name, false)}
    <div><b>${esc(a.linked_account.display_name||"—")}</b>
      <small>${a.linked_account.is_business?"Business":"Platform owner"} profile</small></div>
    <button class="btn btn-p btn-sm" onclick="switchToLinkedAccount('${a.linked_account.is_business?"biz":"plat"}')">Switch to this profile</button></div>
</div></div>` : `
<div class="panel" style="grid-column:1/-1"><div class="panel-b">
  <h5 style="margin-bottom:8px">Add another profile</h5>
  <p class="mut" style="font-size:12.5px;margin-bottom:10px">Run a business and a platform-owner profile from the same login, each with its own name.</p>
  ${!a.is_business?`<button class="btn btn-o btn-sm" onclick="switchRole('biz')">＋ Set up a business profile</button>`:""}
  ${!a.is_platform_owner?`<button class="btn btn-o btn-sm" style="margin-left:8px" onclick="switchRole('plat')">＋ Set up a platform-owner profile</button>`:""}
  ${a.is_business&&a.is_platform_owner?`<p class="mut" style="font-size:12.5px">Both roles are already on this one account (set up before this feature shipped) — nothing to add.</p>`:""}
</div></div>`}
```

That last line covers legacy blended accounts: they have both flags true, no `linked_account`, so they see neither the switcher nor an add button (correct — there's nothing to add, and nothing to switch to, and this is the CTA Rob explicitly asked for on the profile page so it can't silently be missing for anyone).

## Verification

- Sign up as platform-owner only. From My Account, click "Set up a business profile" — enter a name, confirm it differs from your platform name, and check that the business wizard actually publishes at the end (no silent 403) and that `S.account.linked_account` now shows the new identity.
- Try entering the *same* name (case/whitespace variations included, e.g. trailing space, different case) for the second profile — confirm both the client-side and server-side checks reject it with the same clear message.
- From My Account, click "Switch to this profile" — confirm the dashboard, nav name/avatar, and `My Account` page itself all now reflect the other identity, with no login prompt.
- Sign up choosing "I'm both" with two different names — confirm one verification email is sent, and clicking it verifies and logs you into the *business* identity (the primary), with the platform identity showing up immediately in "Linked profiles" without a second signup.
- Complete the business wizard from a fresh "both" signup and confirm the "Set up my platform-owner profile too" button switches you into the already-created platform identity (no name prompt — it already has one) and lands you in that wizard, and that publishing works.
- Change password on one linked identity, log out, log back in on the *other* identity with the new password — confirm it works (propagation).
- Use "Forgot password" on a linked pair's email — confirm it resolves to the primary (earliest-created) identity and that resetting the password there also updates the secondary's password and revokes both accounts' sessions.
- Confirm an existing pre-migration account that already has both `is_business` and `is_platform_owner` true still logs in, still shows both roles on one dashboard-switch nav, and shows neither the "Linked profiles" switcher nor "Add another profile" buttons on My Account.
- Confirm `routers/platforms.py` and `routers/campaigns.py` are unchanged (git diff should show no edits there) and their 403s now simply never trigger for someone who went through either new flow correctly.
