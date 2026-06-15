# UX audit rubric — docs.page vs Mintlify

Compare the **reader experience** of two sites serving the same Agent Skills content. This rubric is the source of truth for scoring, screenshots, enhancement log entries, and **feature completeness** checks.

## Scope

| In scope | Out of scope |
|---|---|
| Published doc site UI/UX (navigation, reading, search, components, mobile, a11y, performance) | Mintlify web editor / dashboard |
| Agent-ready surfaces (llms.txt, MCP, in-docs chat if present) | Authoring workflow, CLI, GitHub bot |
| Theme, branding, header/footer chrome | docs.page marketing homepage |
| Redirect behaviour for legacy URLs | Pricing, analytics dashboards |
| Feature completeness inventory (Appendix A) | Backend infra, hosting SLA |

## Comparison targets

| Role | URL | Notes |
|---|---|---|
| **Mintlify (baseline)** | https://agentskills.io | Production reference |
| **docs.page (candidate)** | https://docspage-production.up.railway.app/BenInvertase/docs-page-ux-test | Pre-release build from [`invertase/docs.page` `ai` branch](https://github.com/invertase/docs.page/tree/ai) |

Content fixture: [BenInvertase/docs-page-ux-test](https://github.com/BenInvertase/docs-page-ux-test), ported from [agentskills/agentskills/docs](https://github.com/agentskills/agentskills/tree/main/docs).

## Known content adaptations

Do **not** score these as platform UX gaps unless docs.page could render the original Mintlify source without changes. **Do** record them in the [Feature completeness matrix](#appendix-a--feature-completeness-matrix) with owner tag **Content** or **Config**.

| Area | Mintlify source | Fixture adaptation |
|---|---|---|
| Overview logo strip | Animated `LogoCarousel` (custom React) | Static linked logo row |
| Client Showcase | `ClientShowcase` with shuffle/sort | `CardGroup` cards |
| Callouts | `<Note>`, `<Tip>` | `<Info>` |
| Tabs | `<Tab title="…">` | `<TabItem label="…" value="…">` |
| Banner | Discord dismissible banner in `docs.json` | Not configured |
| Section numbers | `style.css` + `#enable-section-numbers` on Specification | CSS not ported |
| Redirects | Central `redirects` array in `docs.json` | Per-page `redirect` frontmatter stubs |

When a gap stems from an adaptation, log it under **Component / content fidelity** and note whether a platform feature (custom components, global CSS, banner config) would be needed to match Mintlify.

---

## Test matrix

Run every applicable criterion across this matrix. Record the **worst** score if results differ across dimensions.

| Dimension | Values |
|---|---|
| **Viewport** | Desktop 1440×900 · Tablet 834×1194 · Mobile 390×844 |
| **Theme** | Light · Dark |
| **Navigation type** | Direct URL load (cold) · In-app link (warm) |
| **Input** | Pointer · Keyboard-only (Tab, Enter, Escape) |

### Viewport definitions

| Viewport | Size | Role |
|---|---|---|
| **Desktop** | 1440×900 | Full three-column layout: sidebar + main + outline (when page has headings) |
| **Tablet** | 834×1194 | Transitional breakpoint — highest risk of awkward in-between layouts |
| **Mobile** | 390×844 | Single-column reading; sidebar and outline typically behind drawers or omitted |

### Layout chrome checklist

Before scoring layout-related criteria, record what each platform shows on **P2** and **P6**. Copy this table into results.

| Viewport | Platform | Sidebar | Outline / TOC | Main body width |
|---|---|---|---|---|
| Desktop | Mintlify | | | |
| Desktop | docs.page | | | |
| Tablet | Mintlify | | | |
| Tablet | docs.page | | | |
| Mobile | Mintlify | | | |
| Mobile | docs.page | | | |

**Sidebar values:** `persistent` · `drawer` · `hidden` · `broken`  
**Outline values:** `right-rail` · `inline` · `drawer` · `hidden` · `broken`

### Fixture pages

| ID | Path | Why it matters |
|---|---|---|
| P1 | `/` | Overview, logo strip, CardGroup CTAs, header controls |
| P2 | `/specification` | Long reference, tables, nested `<Card>`, heading depth |
| P3 | `/clients` | Dense component grid, 41 cards, images |
| P4 | `/skill-creation/quickstart` | Tutorial flow, callouts, fenced code with filename |
| P5 | `/skill-creation/using-scripts` | Multi-tab code examples (6+ tabs) |
| P6 | `/client-implementation/adding-skills-support` | Deep sidebar nesting, long page, breadcrumbs |
| P7 | `/integrate-skills` | Redirect to nested path |
| P8 | `/what-are-skills` | Redirect to `/` |
| P404 | `/this-page-does-not-exist-ux-audit` | 404 handling (synthetic) |

---

## Scoring scale

Score each **weighted** criterion for **docs.page relative to Mintlify**:

| Score | Label | Meaning |
|---|---|---|
| **3** | **Better** | Clearly superior on this criterion |
| **2** | **Parity** | Equivalent; differences are neutral |
| **1** | **Gap** | Noticeably worse; hurts reading or wayfinding |
| **0** | **Blocker** | Broken, missing, or unusable |
| **N/A** | **Skip** | Not applicable (document why) |

### Weighted total

Each category has a weight (sums to **100**). Category score = average of criterion scores in that category (excluding N/A).

**Overall** = Σ (category score / 3 × weight).

| Range | Interpretation |
|---|---|
| ≥ 90% | At or above Mintlify; polish pass only |
| 75–89% | Competitive; targeted enhancements |
| 60–74% | Meaningful gaps; prioritise navigation, readability, discoverability |
| < 60% | Not competitive for this content profile |

**Feature completeness** (Appendix A) is recorded separately — it does **not** change the weighted overall score.

---

## Categories and criteria

Each criterion includes a **Verification** method. Prefer automated checks from `scripts/run-full-audit.mjs` (`.docs/audit-data.json`) where noted; supplement with paired screenshots and human spot-checks for subjective items.

### 1. Navigation and wayfinding (18%)

| ID | Criterion | Verification | Test | Pages |
|---|---|---|---|---|
| N1 | **Sidebar information scent** — Group labels, page titles, hierarchy scannable | Compare sidebar DOM text; group count ≥ Mintlify | Visual scan; expand/collapse groups | All |
| N2 | **Active page indication** — Current page obvious in sidebar | `[aria-current="page"]`, `[data-active]`, or `.text-primary` on active link | Navigate P1 → P5 → P2 | P1, P2, P5 |
| N3 | **Collapsible groups** — Nested groups open/close predictably | Toggle "For skill creators"; child pages reachable | Manual toggle | P4, P5 |
| N4 | **Off-canvas navigation (mobile)** — Menu opens, closes, shows full tree | `mobileNav.hasTrigger && mobileNav.opens`; screenshot open state | Mobile P6; Escape closes | P6 |
| N9 | **Tablet sidebar** — Nav usable; no clipped labels or overlap | Chrome checklist: sidebar `drawer` not `persistent` at 834px | Tablet P4 → P6 | P4, P6 |
| N5 | **Breadcrumbs / context** — Reader knows where they are on deep pages | Breadcrumb nav or sub-header text on P6 mobile | Compare P6 | P6 |
| N6 | **Previous / next** — Sequential navigation at page bottom | `prevNext` links in audit data | Compare P2 ↔ P4 | P2, P4 |
| N7 | **Header identity** — Site name and repo link discoverable | `<header>` contains site title + GitHub/external link | Compare header | P1 |
| N8 | **Redirect correctness** — Legacy URLs reach right destination | `redirects` in audit data: final URL matches target | Cold load P7, P8 | P7, P8 |

### 2. Readability and typography (18%)

| ID | Criterion | Verification | Test | Pages |
|---|---|---|---|---|
| R1 | **Prose measure (line length)** — Comfortable characters-per-line | `typography.charsPerLine` on main `p`; target 65–85 CPL desktop | Compare P1, P4 desktop | P1, P4 |
| R9 | **Vertical rhythm** — Paragraph and heading spacing breathe | `typography` margins: `p.marginBlock`, `h2.marginTop` within ±4px of Mintlify OR subjectively even | P2 § body | P2, P4 |
| R10 | **List and table density** — Lists/tables not cramped against borders | Inspect `li` padding, `td` padding at all viewports | P2 tables, P4 lists | P2, P4 |
| R2 | **Heading hierarchy** — h2/h3/h4 visually distinct; TOC matches | TOC heading list vs `main h2–h4` count | Scan P2 | P2 |
| R3 | **Table rendering** — Spec tables align, scroll on small screens | `tables` count > 0; no horizontal page scroll | All viewports | P2 |
| R4 | **Inline code and emphasis** — `code`, **bold**, links distinguishable | Visual: inline code background/border differs from body | P4 body | P4 |
| R5 | **Code blocks** — Syntax highlight, padding, scroll, copy affordance | `copyButtonsPerBlock` ≥ 1 per `pre` (figcaption `button` OR `aria-label*="Copy"`) | Compare blocks | P4, P5 |
| R6 | **Code block titles** — Filename labels (e.g. `SKILL.md`) visible | Figcaption / title row text on fenced blocks | P4 quickstart | P4 |
| R7 | **Dark mode readability** — Contrast and code colours legible | Dark screenshots P2; body bg ≠ white | Toggle theme P2, P5 | P2, P5 |
| R11 | **Body text size & line-height** — Minimum readable defaults | `typography.body.fontSize` ≥ 16px; `lineHeight` ≥ 1.5 | Computed styles P2 | P2 |
| R12 | **Link affordance** — Links distinguishable without hover | `typography.link` underline or ΔL contrast ≥ 3:1 vs body | P2 prose links | P2 |
| R8 | **Font pairing** — Headings vs body vs code cohesive | Paired screenshot + 2–3 observation bullets | Subjective side-by-side | P1 |

### 3. Rich components (14%)

| ID | Criterion | Verification | Test | Pages |
|---|---|---|---|---|
| C1 | **Callouts** — Note/Tip/Info visually distinct and scannable | Distinct callout class count; visual diff | P4, P5 | P4, P5 |
| C2 | **Cards** — Padding, borders, nested code inside cards | Card count + nested `pre` inside cards | P2 | P2 |
| C3 | **Card groups** — Overview CTAs: equal height, alignment, hover | CardGroup grid on P1 | P1 | P1 |
| C4 | **Tabs** — Wrap at tablet/mobile; many tabs usable | `tabCount` ≥ 6 at desktop, tablet, mobile | P5 all viewports | P5 |
| C5 | **Client showcase layout** — Grid density, logo sizing, scanability | 2-column grid; card count ~41 | P3 | P3 |
| C6 | **Logo strip / carousel** — Motion, dark-mode logos (acknowledge adaptation) | F13 in completeness matrix | P1 | P1 |
| C7 | **Images in cards** — Logos scale; no broken assets | `brokenImages.length === 0` | Network + visual | P3 |
| C8 | **Invalid component handling** — MDX errors helpful not silent | N/A unless breakage found | — | — |

### 4. On-page aids (9%)

| ID | Criterion | Verification | Test | Pages |
|---|---|---|---|---|
| O1 | **Table of contents (desktop)** — Right-rail TOC visible, links work | Chrome checklist: outline `right-rail` desktop P2 | Desktop P2, P6 | P2, P6 |
| O2 | **TOC depth** — Appropriate h2–h4 coverage | Compare TOC item count to heading count | P2 | P2 |
| O3 | **Anchor links** — Heading permalinks work and discoverable | `headingAnchors` > 0 on P2; hover reveals link icon | Click h2 anchor | P2 |
| O4 | **Page title and description** — Tab title and h1 match content | `document.title` + h1 text | P1, P3 | P1, P3 |
| O5 | **Banner / announcement** — Site-wide notice dismissible if configured | F6 in completeness matrix | P1 | P1 |
| O6 | **TOC at tablet** — Outline available or acceptably replaced | Chrome checklist tablet P2 | Tablet P2 | P2 |
| O7 | **TOC at mobile** — See L5 (same issue) | Chrome checklist mobile P2; score once, reference L5 | Mobile P2 | P2 |

> **O7 / L5 dedup:** Mobile TOC without sidebar access is one issue. Score under **L5**; reference the same enhancement log entry from O7.

### 5. Search (7%)

| ID | Criterion | Verification | Test | Pages |
|---|---|---|---|---|
| S1 | **Search prominence** — Trigger visible; shortcut hinted on desktop | `searchBtn` visible; ⌘K hint text OR F2 pass | All viewports | P1 |
| S2 | **Search speed** — Results within ~1s of typing | Time from fill to first `[cmdk-item]` | Queries below | P1 |
| S3 | **Result relevance** — Top hits match intent | `search.queries` top result contains query term | `SKILL.md`, `description`, `uvx` | P1 |
| S4 | **Keyboard navigation** — Arrow/Enter/Escape in dialog | Keyboard-only from P1 | P1 | P1 |
| S5 | **Empty state** — Clear message when no matches | `search.queries.zzzznotfound` non-empty on Mintlify | Query: `zzzznotfound` | P1 |

If search is not configured, score **N/A** and log separately.

### 6. Global controls & discoverability (10%)

Task-based criteria. Record **time-to-complete** (seconds) and **clicks** in results notes.

| ID | Criterion | Verification | Pass threshold | Test |
|---|---|---|---|---|
| D1 | **Search — find & open** | `discoverability.search.openMs` ≤ 5000ms desktop | ≤ 5s, ≤ 2 clicks from P1 | Desktop P1 cold |
| D2 | **Search — mobile** | Search trigger visible at 390px without scrolling header off-screen | Visible + opens dialog | Mobile P1 |
| D3 | **Theme toggle — find & switch** | `discoverability.theme.toggled` + persists after navigation | Light→dark→light on P2 | All viewports P1 |
| D4 | **AI assistant — find & open** | `discoverability.assistant.found` + panel/dialog opens | ≤ 5s desktop; visible mobile | P1 |
| D5 | **GitHub / external links** | Repo link in header; not obscured | Link present, opens correct repo | P1 |
| D6 | **Control hierarchy** | Primary (search, nav) visually dominant over secondary (theme, GitHub) | Paired screenshot + size/contrast notes | P1 desktop + mobile |

> **N7 vs D*:** N7 covers site identity only. Search, theme, and AI discoverability score under **D1–D4**, not N7.

### 7. Performance and responsiveness (9%)

| ID | Criterion | Verification | Test | Pages |
|---|---|---|---|---|
| PF1 | **Cold load** — Main content visible quickly | `perf.domContentLoaded` ms; compare platforms | P1, P3 | P1, P3 |
| PF2 | **In-app navigation** — Transitions feel instant | `warmNav.toScriptsMs` | P1 → P3 → P5 | P3 |
| PF3 | **Layout shift** — Chrome doesn't jump after load | Visual cold load; CLS if measured | P3 | P3 |
| PF4 | **Scroll performance** — Long pages scroll smoothly | Manual scroll P6 | P6 | P6 |
| PF5 | **Image loading** — Logos don't block reading | `brokenImages`; lazy load acceptable | P3 | P3 |

### 8. Accessibility (9%)

| ID | Criterion | Verification | Test | Pages |
|---|---|---|---|---|
| A1 | **Skip to content** | `skipLink` > 0 OR F8 pass | Tab from top | P1 |
| A2 | **Focus visibility** — Focus ring on interactive elements | Tab through tabs/buttons | P5 | P5 |
| A3 | **Landmarks** — `main`, `nav` present | Accessibility tree | P1 | P1 |
| A4 | **Colour contrast (measured)** | `contrast.bodyAA` and `contrast.linkAA` true (4.5:1) | Light + dark P2 | P2, P3 |
| A5 | **Reduced motion** | `prefers-reduced-motion` respected on animated areas | P1 logo/carousel | P1 |
| A6 | **Image alt text** | Sample card images have non-empty `alt` | P3 cards | P3 |

### 9. Agent-ready surfaces (6%)

| ID | Criterion | Verification | Test | Pages |
|---|---|---|---|---|
| G1 | **llms.txt** — Present, lists fixture pages | F11: `llms.ok` && pageCount ≥ 8 | `/llms.txt` | — |
| G2 | **llms.txt quality** — Useful titles/descriptions | Manual compare entries | `/llms.txt` | — |
| G3 | **MCP / API** — Agent integration exposed | F20 in completeness matrix | MCP endpoint if advertised | — |
| G4 | **In-docs AI chat** — Discoverable, non-obstructive | F5 + D4 | P1 overlay | P1 |
| G5 | **Copy / view page actions** | F10 in completeness matrix | Contextual toolbar P2 | P2 |

### 10. Responsive layout chrome

Scored within **Navigation** and **On-page aids** (not a separate weight).

| ID | Criterion | Verification | Test | Pages |
|---|---|---|---|---|
| L1 | **Desktop three-column** — Sidebar + main + outline without crowding | `mainWidth` desktop P2 within 80% of Mintlify | Desktop P2 | P2 |
| L2 | **Tablet layout balance** | Sidebar `drawer`; main width ≥ 700px | Tablet P2, P3 | P2, P3 |
| L3 | **Mobile single-column** | `horizontalScroll === false` | Mobile P1, P3 | P1, P3 |
| L4 | **Breakpoint transitions** | Resize desktop → tablet → mobile without overlap | P2 | P2 |
| L5 | **Sidebar ↔ outline tradeoff** | No TOC + hidden sidebar on mobile (score worst case) | Tablet/mobile P2, P6 | P2, P6 |
| L6 | **Consistent chrome** | Same sidebar/outline pattern P1 vs P6 per viewport | Tablet | P1, P6 |

---

## Appendix A — Feature completeness matrix

Record in [`.docs/feature-completeness.md`](./feature-completeness.md) (generated/updated from audit script). **Not weighted** in overall UX score.

Each feature has: **Mintlify** (y/n/partial) · **docs.page** · **Owner** · **Verification** · **Notes**

| Owner | Meaning |
|---|---|
| **Platform** | Requires docs.page product change |
| **Config** | Fixture or `docs.json` / site config |
| **Content** | MDX/CSS adaptation in fixture |
| **Out of scope** | Deliberately excluded from parity target |

| ID | Feature | Verification (automated where noted) | Owner |
|---|---|---|---|
| F1 | Full-text search | Search dialog opens; returns results for `SKILL.md` | Platform |
| F2 | ⌘K / Ctrl+K shortcut | `Meta+k` / `Control+k` opens search without click | Platform |
| F3 | Dark mode toggle | Theme control visible at desktop, tablet, mobile | Platform |
| F4 | Dark mode persistence | Theme survives P1 → P2 navigation | Platform |
| F5 | Mobile nav drawer | `mobileNav.hasTrigger && opens` | Platform |
| F6 | Dismissible announcement banner | Banner visible + dismiss control | Config |
| F7 | Heading anchor links | `headingAnchors > 0` on P2 | Platform |
| F8 | Skip to content link | Skip link in first Tab stop | Platform |
| F9 | Previous / next page links | Footer nav links on content pages | Platform |
| F10 | Copy page / view as markdown | Copy-page button or menu item visible | Platform |
| F11 | llms.txt index | GET `/llms.txt` → 200; lists pages | Platform |
| F12 | URL redirects | P7 → integrate path; P8 → `/` | Config |
| F13 | Logo carousel / animated strip | Carousel component or CSS motion on P1 | Content |
| F14 | Client showcase (shuffle/sort) | Custom showcase vs static CardGroup | Content |
| F15 | Section numbers (Specification) | Numbered headings in P2 main content | Content |
| F16 | Note / Tip callout variants | Distinct Note + Tip styles (not only Info) | Content |
| F17 | Edit on GitHub / view source | Header or footer link to edit MDX on GitHub | Platform |
| F18 | Custom 404 page | GET P404 → 404 with helpful message + nav | Platform |
| F19 | Open Graph meta | `og:title` and `og:description` in `<head>` | Platform |
| F20 | Twitter / social card meta | `twitter:card` or `og:image` present | Platform |
| F21 | MCP / agent API endpoint | MCP route or documented agent URL responds | Platform |
| F22 | In-docs AI assistant | Assistant trigger visible (header or floating) | Platform |
| F23 | Breadcrumbs on nested pages | Breadcrumb trail on P6 | Platform |
| F24 | Desktop right-rail TOC | TOC visible desktop P2 | Platform |
| F25 | Tablet TOC | TOC or acceptable substitute at 834px | Platform |
| F26 | Favicon | `<link rel="icon">` present | Platform |
| F27 | robots.txt | GET `/robots.txt` → 200 | Platform |
| F28 | sitemap.xml | GET `/sitemap.xml` → 200 with URLs | Platform |
| F29 | Per-code-block copy button | Each `pre` has copy control in figcaption | Platform |
| F30 | Code block filename labels | Titled fences on P4 | Platform |
| F31 | Tabbed code examples | ≥ 6 tabs on P5 | Content |
| F32 | Card / CardGroup components | Cards render on P1, P2, P3 | Content |
| F33 | Client logo images | No broken images on P3 | Content |
| F34 | Search empty-state messaging | Non-zero UI for `zzzznotfound` query | Platform |
| F35 | Analytics / feedback widget | Feedback or analytics entry (if Mintlify has) | Out of scope |

**Completeness score (informational):** Count features where docs.page matches Mintlify (y) / total applicable (exclude **Out of scope** and **Content** adaptations if tracking platform-only parity).

---

## Recording results

### Per-criterion row (weighted UX)

Store in [`.docs/ux-audit-results.md`](./ux-audit-results.md):

```markdown
| ID | Score | Matrix | Verification summary | Notes | Screenshot |
|---|---|---|---|---|---|
| R5 | 2 | Desktop/P2 | 19/19 blocks have figcaption copy btn | Parity | `screenshots/docspage/P2-desktop-light.png` |
```

### Feature completeness row

Store in [`.docs/feature-completeness.md`](./feature-completeness.md):

```markdown
| ID | Mintlify | docs.page | Owner | Notes |
|---|---|---|---|---|
| F5 | y | n | Platform | No SidebarTrigger without tabs config |
```

Raw automated output: [`.docs/audit-data.json`](./audit-data.json) (`featureCompleteness`, `discoverability`, `typography`, `contrast`).

### Screenshot naming

```
screenshots/{platform}/{page}-{viewport}-{theme}.png
screenshots/{platform}/{criterion-id}-{page}-{viewport}-{theme}.png
```

Capture **paired** shots: `mintlify/` and `docspage/` for the same criterion.

---

## Enhancement log

Maintain [`.docs/enhancement-log.md`](./enhancement-log.md) with **outstanding gaps only** (score ≤ 1, deduplicated). Do **not** keep withdrawn, resolved, parity, or win entries — those belong in git history or the full scorecard.

Create or update an entry when a gap is open:

```markdown
### [N4] Mobile nav drawer — incomplete doc tree

- **Also:** F5
- **Verification:** `mobileNav.links.length: 4` (Mintlify: 10)
- **Fix:** …
- **Effort:** S | M | L
```

Remove entries when re-audit scores ≥ 2. Merge duplicate criterion IDs (e.g. D4 + G4 + D6 → one fix).

Priority guide:

- **P1** — Blockers; N*, R1, L*, D1–D4 on core pages
- **P2** — Component fidelity, search polish, mobile edge cases
- **P3** — Banner, carousel, OG meta, nice-to-have motion

---

## Audit procedure

1. **Setup** — Same browser, disable extensions, clear cache once per session.
2. **Automated pass** — `AUDIT_ROOT=/path/to/repo node scripts/run-full-audit.mjs` → `.docs/audit-data.json`, `.docs/feature-completeness.md`.
3. **Chrome checklist** — P2 and P6 at desktop, tablet, mobile (both platforms).
4. **Baseline pass** — Mintlify P1–P8; reference screenshots.
5. **Candidate pass** — docs.page pre-release; complete checklist.
6. **Discoverability tasks** — D1–D6: record time/clicks; confirm against thresholds.
7. **Score weighted criteria** — Fill results table; worst score across matrix unless viewport-specific.
8. **Feature completeness** — Review Appendix A table; tag owner (Platform/Config/Content).
9. **Log** — Enhancement entries for scores 0–1; link F* IDs where relevant.
10. **Summarise** — Weighted overall %, completeness %, top 5 P1 items.

---

## Version

| Field | Value |
|---|---|
| Rubric version | **1.2** |
| Created | 2026-06-15 |
| Updated | 2026-06-15 |
| Changes in 1.2 | Split R1/R9–R12; added D1–D6 discoverability; Appendix A feature matrix (F1–F35); verification column; rebalanced weights; O7/L5 dedup; R5 copy verification fix |
| Fixture commit | `main` @ BenInvertase/docs-page-ux-test |
| docs.page build | `ai` branch @ Railway pre-release |
