# PromoSlot — Illegal Content Risk Assessment (Internal, Online Safety Act 2023)

**⚠️ Internal working document, not published on the site.** This is a starting self-assessment reflecting how PromoSlot actually works today, written to satisfy the baseline duty under the UK Online Safety Act for a small user-to-user service (direct messaging + user-uploaded profile/listing content brings PromoSlot in scope — see the note in `terms_of_service_draft.md` Section 11A). Get this reviewed by a solicitor before treating it as a finished compliance record, and re-do it whenever the product changes in a way that affects who can post what to whom.

*Last updated: 4 September 2026*

## 1. What PromoSlot actually is, for this purpose

PromoSlot is a small UK marketplace connecting businesses and platform owners (content creators) for promotional deals. The only ways a user's content reaches another user are:

- **Direct 1:1 messaging** between two matched parties to a deal — never public, never visible to a third user.
- **Profile, listing and campaign pages** — visible to any visitor, but limited to a business/platform name, description, services, pricing, and images the account owner chooses to upload.
- **Proof-of-delivery files** submitted for a specific deal — visible only to the other party to that deal and to a PromoSlot reviewer, never public.

There is no public comment section, forum, feed, or way for one user to broadcast content to users generally. Reach per piece of content is inherently small: one counterparty, or whoever visits a single profile page.

## 2. Illegal content risks, realistically

- **CSAM / child sexual exploitation material** — low likelihood given the platform's B2B/creator-economy purpose and 18+ eligibility requirement, but treated as zero-tolerance regardless (see Section 3).
- **Harassment, threats, defamation** — possible in direct messages between a business and a platform owner, most likely arising from a soured deal rather than targeted abuse.
- **Fraud / scam content** — the main realistic risk given real money moves through the platform: fake listings, misrepresented audiences, attempts to move payment off-platform to dodge fees or protections.
- **IP infringement** — possible in uploaded profile images or promotional content, lower severity, standard takedown process now covers it (Terms Section 12).
- **Impersonation** — a business or platform owner claiming to be someone/something they're not, already addressed operationally via Stripe-backed verification (Verified badge) and the Terms' prohibited-conduct list.

## 3. Mitigations already in place

- **Verification pipeline** (Stripe-based, dual-gate) — reduces the risk of an unverified or fraudulent account acting with a false identity.
- **Manual, human review** of every deal's evidence before funds are released — no automated payout, so a reviewer sees the actual submitted content on every completed deal.
- **Admin ban/suspend capability** — an account can be suspended or terminated for violating the Terms (Section 14), including immediately for CSAM or similarly severe content, without the normal review steps.
- **Report mechanism** — Terms Section 11A: any user can report a listing, message, or piece of content to support@usepromoslot.com, reviewed by a person, target response within 2 business days.
- **IP takedown process** — Terms Section 12: a defined notice-and-response process for infringement claims.
- **CSAM standing exception** — Terms Section 11: immediate removal, immediate ban, and a commitment to report to the Internet Watch Foundation and/or the National Crime Agency, independent of the normal process.

## 4. Accountable person

**Robert McKenzie**, Director, PromoSlot Ltd — accountable for illegal-content reports and complaints handling under Terms Section 11A. At current scale, this is a one-person responsibility; revisit this section if/when PromoSlot hires or the volume of reports makes that unrealistic for one person to handle within the 2-business-day target.

## 5. Residual risk and next steps

- The report mechanism is new (added 4 September 2026) and untested in practice — worth revisiting once it's actually been used a few times, to confirm the 2-business-day target is realistic at whatever volume actually shows up.
- No automated content scanning exists (e.g. image hashing against known CSAM databases). Proportionate to skip at current scale and volume, but worth reconsidering if user-uploaded image volume grows materially.
- This assessment has not been reviewed by a solicitor or a compliance professional. Treat it as a documented starting point, not a finished legal record.

## 6. Contact

Questions about this assessment: support@usepromoslot.com.
