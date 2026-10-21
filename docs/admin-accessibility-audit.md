# Administrator accessibility audit

Audit note for issue #110 under parent issue #107. This document evaluates administrator-facing interfaces only. It does not change application behavior. Student-facing work belongs to #109 and related remediation issues.

Reviewed against team `main` at `8424f49` (merge of pull request #161). Issues #107 and #110 have no sponsor comments that name a required standard. Findings below use WCAG 2.2 Level AA language as a practical checklist, not as sponsor-approved scope.

This file separates three kinds of statement:

- **Confirmed findings** are backed by source review, contrast calculation, and/or a local interactive spot-check that was actually performed.
- **Potential issues** need a manual assistive-technology check or a longer keyboard session before they are treated as defects.
- **Out of scope** items are noted so later work does not invent coverage.

## Pages and components audited

### Pages (App Router)

| Route | Primary UI | Critical workflows |
| --- | --- | --- |
| `/admin` | `app/admin/page.tsx` | Instructor landing and quick links |
| `/admin/roster` | `StudentRosterTable`, `AdminRosterTable`, `StudentAvailabilityDialog` | View roster, view availability, promote/demote/remove |
| `/admin/groups` | `AdminGroupsClient` | Generate/regroup, create/edit/delete groups, assign students, room assignment dates |
| `/admin/rooms` | `RoomManager` | Create/edit/delete rooms and weekday availability |
| `/admin/agendas` | `AgendaManager` | Create/edit/reorder/toggle agendas; open agenda detail |
| `/admin/agendas/[id]` | `TaskManager` / related section UI | Manage agenda sections and tasks |
| `/admin/progress` | `AdminProgressClient` | View progress tables, download CSV, semester rollover |
| `/admin/resources` | `ResourceSectionManager` | Manage resource sections and tasks |
| `/admin/resources/[id]` | Resource detail UI | Edit a resource section |
| `/admin/exams` | `ExamManager` | Create/edit/delete exam reminders |

### Shared admin chrome

| Component | Role |
| --- | --- |
| `app/admin/layout.tsx` | Admin shell (`main`, top bar) |
| `components/admin/admin-navbar.tsx` | Primary admin navigation (desktop + mobile menu) |
| `components/layout/app-brand.tsx` | Brand link in the admin header |
| `components/auth/auth-button.tsx` | Account / logout control in the admin header |
| `components/ui/confirm-dialog.tsx` | Shared confirm modal used by roster actions |
| `components/ui/dialog.tsx` | Radix dialog used by student availability |
| `components/ui/button.tsx`, `input.tsx`, `label.tsx`, `table.tsx` | Shared primitives |

### Critical administrator workflows reviewed

1. Navigate between admin sections.
2. Review the student roster and open a student's availability.
3. Generate or manually create groups; edit room and assignment dates.
4. Maintain room inventory.
5. Maintain agendas (including enable toggle and drag reorder).
6. Review progress and open semester rollover confirmation.
7. Maintain exams and resources.

## Testing methodology

| Method | What was run | Status |
| --- | --- | --- |
| Issue and scope review | Read #110 and parent #107 | Done |
| Code review | Static review of admin pages/components for keyboard, labels, dialogs, tables, color, ARIA | Done |
| Contrast calculation | Relative-luminance contrast for theme tokens and selected utility classes against WCAG AA 4.5:1 (normal text) | Done |
| ESLint (`eslint-config-next` / core-web-vitals, includes `jsx-a11y`) | `npx eslint "components/admin/**/*.{ts,tsx}" "app/admin/**/*.{ts,tsx}"` | Done — 0 a11y rule errors; unused-var warnings only |
| Unit tests (regression only; not a11y) | `npm run test:rooms`, `npm run test:assignment-range`, `npm run test:group-management` | Done — rooms 5/5, assignment-range 13/13; group-management 6/7 (pre-existing failure unrelated to a11y; see [Test results](#test-results)) |
| Local app | Dev server on `http://127.0.0.1:43123` was reachable (`/login` HTTP 200; `/admin` redirects when unauthenticated) | Done |
| Interactive keyboard / dialog spot-check | Headless Chromium (Playwright) logged in as `owner@anatwithme.test` and exercised admin routes | Done — see [Interactive spot-check](#interactive-spot-check) |
| Guided browser spot-check | Separate logged-in admin UI pass ([Admin a11y browser audit](bc-5cb9ba1d-fb3f-5034-8f0d-7dfc9aafc7f0)) | Done — corroborates dialog focus/Escape and toast-only room validation |
| Screen reader (VoiceOver / NVDA / JAWS) | Full AT pass | Not performed |
| Automated axe / pa11y suite | No project script or dependency ships these | Not available in-repo |

No axe-core or pa11y project is configured in `package.json`. Playwright was used only as a one-off local spot-check runner for this audit; it was not added to the application dependencies.

## Interactive spot-check

Performed locally against `http://127.0.0.1:43123`. Login used the local development owner account `owner@anatwithme.test`. Two browser passes were run: a scripted Playwright pass and a guided UI pass ([Admin a11y browser audit](bc-5cb9ba1d-fb3f-5034-8f0d-7dfc9aafc7f0)).

### Browser pass log

| Item | Result |
| --- | --- |
| Login as owner | Succeeded; landed on `/admin` (both passes) |
| Pages visited | `/admin`, `/admin/roster`, `/admin/groups`, `/admin/rooms`, `/admin/agendas`, `/admin/progress`, `/admin/resources`, `/admin/exams` |
| Tab focus rings visible | Primary header links and many controls showed a visible focus outline / ring while tabbing |
| Create group dialog | Opened with `role="dialog"` / `aria-modal="true"`; focus stayed on the trigger; Tab moved focus outside the dialog (including to background chrome); Escape did **not** close it. Confirmed in both browser passes. |
| Rollover confirm dialog | Playwright pass: no initial focus move, Tab escaped, Escape did not close |
| Availability dialog | Playwright: opened from roster row actions; 112 slot cells; **0** cells had text or ARIA selected/name attributes |
| Agenda enabled checkbox | Playwright: present with no `aria-label`, `aria-labelledby`, or associated `<label>` |
| Room weekday toggles | Playwright: Monday/Tuesday/Wednesday buttons had `aria-pressed=null` |
| Exam inline edit | Playwright: date inputs had empty `id`, no `aria-label`, and no associated label |
| Toast-only validation | Guided pass: empty Building + Add room showed only a top toast (“Building is required”), not an inline field error |
| Mobile Menu button (390px wide) | Playwright evaluated that specific Menu control: `aria-expanded` and `aria-controls` were both null. The guided pass observed a page-level `aria-expanded` hit in DevTools (other expand controls also use that attribute) and should not be read as proof the Menu button is correctly wired. Source review of `admin-navbar.tsx` still shows no `aria-expanded` / `aria-controls` on Menu. |
| `aria-current` on admin tabs | None on any visited page (Playwright) |
| Roster headings | Both `Students` and `Administrators` exposed as `h1` (Playwright) |
| Icon-only row actions | Guided pass flagged roster `…` and exam edit/delete icons for visual review. Source review shows many already include `sr-only` text (“Open row actions”, “Edit”, “Delete”). Not treated as a confirmed unlabeled-control defect without a screen-reader check. |

## Confirmed findings

Severity guide used for prioritization:

- **Critical** — blocks a critical admin workflow for keyboard or assistive-technology users.
- **High** — major barrier on a common control or workflow.
- **Medium** — clear WCAG-oriented failure with a partial workaround.
- **Low** — best-practice gap or limited impact.

### A-01 — Admin navigation lacks named landmarks and current-page semantics already added for students

| Field | Detail |
| --- | --- |
| Severity | High |
| Pages / components | All admin routes via `app/admin/layout.tsx` and `components/admin/admin-navbar.tsx`; compare `components/student/student-navbar.tsx` (fixed in #158) |
| Expected | Admin section links are exposed in a named navigation landmark, the active page is marked with `aria-current="page"`, and the mobile menu button exposes expanded/collapsed state. |
| Actual | The layout wraps the header in an unlabeled `<nav>`. Section links inside `AdminNavbar` sit in plain `div`s with visual active styling only (no `aria-current`). The mobile `Menu` button has no `aria-expanded` or `aria-controls`. Interactive spot-check confirmed `aria-current` was empty on every visited admin page and the narrow-viewport Menu button had null expanded/controls attributes. |
| Steps to reproduce | 1. Open any `/admin/*` page. 2. Inspect the header nav markup, or use a screen-reader landmark/rotor list. 3. Narrow the viewport until the Menu button appears and inspect it. |
| Recommended fix | Mirror the student navbar pattern: wrap the admin tab list in `<nav aria-label="Administrator navigation">`, set `aria-current={isActive ? "page" : undefined}`, and wire `aria-expanded` / `aria-controls` to the mobile panel. Give the outer header landmark a distinct label or restructure landmarks (see A-11). |

### A-02 — Custom modal dialogs announce as dialogs but do not manage focus or Escape

| Field | Detail |
| --- | --- |
| Severity | Critical |
| Pages / components | Groups create/edit/assign/delete flows: `ManagementDialog` in `components/admin/admin-groups-client.tsx`. Roster promote/demote/remove: `components/ui/confirm-dialog.tsx` used by `student-roster-table.tsx` and `admin-roster-table.tsx`. Semester rollover confirm: `components/admin/admin-progress-client.tsx`. |
| Expected | When `aria-modal="true"` is used, focus moves into the dialog, Tab cycles inside it, Escape closes it, and focus returns to the trigger. |
| Actual | These overlays set `role="dialog"` and `aria-modal="true"` but implement no focus trap, no initial focus, no Escape handler, and no restore-focus logic. Interactive spot-check on Create group and Review rollover confirmed: focus remained on the trigger after open, Tab moved focus outside the dialog, and Escape did not close the dialog. Radix `Dialog` (used by availability) already provides stronger baseline modal behavior. |
| Steps to reproduce | 1. Open Groups → Create group (or Roster → row actions → Promote / Remove, or Progress → Review rollover). 2. Press Tab repeatedly. 3. Press Escape. |
| Recommended fix | Replace custom overlays with `components/ui/dialog.tsx` (Radix), or add focus trap, Escape, and restore-focus behavior that matches it. |

### A-03 — Agenda “Enabled” checkboxes have no accessible name

| Field | Detail |
| --- | --- |
| Severity | High |
| Pages / components | `/admin/agendas` — `components/admin/agenda-manager.tsx` |
| Expected | Each enable/disable checkbox has an accessible name that identifies the agenda (for example “Enable Week 3 …”). |
| Actual | A bare `<input type="checkbox">` is rendered in the Enabled column with no `aria-label`, associated `<label>`, or `aria-labelledby`. The column header text is not programmatically tied to the control. |
| Steps to reproduce | 1. Open `/admin/agendas` with at least one agenda. 2. Inspect the Enabled checkbox or navigate to it with a screen reader. |
| Recommended fix | Add `aria-label={`Enable ${agenda.title}`}` (or a visible label / `aria-labelledby` pairing with the title cell). |

### A-04 — Student availability dialog conveys selection by color alone

| Field | Detail |
| --- | --- |
| Severity | High |
| Pages / components | Roster → View Availability — `components/admin/student-availability-dialog.tsx` |
| Expected | Selected time slots are perceivable without color alone, and each slot has an accessible name/state for assistive tech. |
| Actual | Selected slots are empty `div`s styled with `bg-primary` vs `bg-card`. A note says “Highlighted cells are times…”, but individual cells expose no text, `aria-label`, or selected state. Color is the only per-cell signal. |
| Steps to reproduce | 1. Open `/admin/roster`. 2. Open a student row menu → View Availability. 3. Inspect grid cells or navigate them with a screen reader. |
| Recommended fix | Represent slots as a table or grid with headers, and expose selected state in text or ARIA (`aria-selected` / visually hidden “Available”/“Unavailable”). Do not rely on fill color alone. |

### A-05 — Room weekday toggles do not expose pressed state

| Field | Detail |
| --- | --- |
| Severity | Medium |
| Pages / components | `/admin/rooms` — `components/admin/room-manager.tsx` |
| Expected | Toggle buttons for Mon–Fri expose selected state to assistive tech (`aria-pressed` or checkbox semantics). |
| Actual | Days are `<Button type="button">` controls that only change `variant` visually when active. |
| Steps to reproduce | 1. Open `/admin/rooms`. 2. Toggle “Monday” in Add room. 3. Inspect the button’s accessibility properties. |
| Recommended fix | Set `aria-pressed={active}` on each day button, or switch to a checkbox group inside a `fieldset` / `legend`. |

### A-06 — Exam inline-edit date fields lack labels

| Field | Detail |
| --- | --- |
| Severity | Medium |
| Pages / components | `/admin/exams` — `components/admin/exam-manager.tsx` (edit row) |
| Expected | Every input has a persistent accessible name. |
| Actual | Create form fields use `Label htmlFor=…`. The inline edit row’s title and start/end date `Input`s have no labels, `aria-label`, or table-header association beyond visual placement. |
| Steps to reproduce | 1. Open `/admin/exams`. 2. Click Edit on a row. 3. Inspect the date inputs with a screen reader or accessibility tree. |
| Recommended fix | Add `aria-label` values (for example “Exam start”, “Exam end”, “Title”) or visually hidden labels in the edit row. |

### A-07 — Form validation errors are toast-only and not tied to fields

| Field | Detail |
| --- | --- |
| Severity | Medium |
| Pages / components | Shared toast pattern in `components/admin/room-manager.tsx`, `admin-groups-client.tsx`, `agenda-manager.tsx`, `exam-manager.tsx`, `resource-section-manager.tsx`, and `task-manager.tsx` |
| Expected | Invalid fields are marked (`aria-invalid`), described (`aria-describedby`), and the error remains available without depending only on a transient toast. |
| Actual | Client validation and server errors are shown with Sonner toasts. Fields are not marked invalid and do not reference the error text. Interactive spot-check on Rooms confirmed an empty Building submit produced only a top toast (“Building is required”). |
| Steps to reproduce | 1. Open Rooms and submit with an empty building, or edit a group with only one assignment date. 2. Observe the toast. 3. Inspect the related inputs for `aria-invalid` / described-by links. |
| Recommended fix | Keep toasts if desired, but also render inline errors next to fields and wire `aria-invalid` / `aria-describedby`. Move focus to the first invalid field on failed submit. |

### A-08 — “Promote to Admin” menu text fails AA contrast

| Field | Detail |
| --- | --- |
| Severity | Medium |
| Pages / components | `/admin/roster` — `components/admin/student-roster-table.tsx` (`text-blue-500`) |
| Expected | Normal text contrast ≥ 4.5:1 against the menu background. |
| Actual | Tailwind `text-blue-500` (`#3b82f6`) on white calculates to about **3.68:1**. |
| Steps to reproduce | 1. Open a student row actions menu as an owner. 2. Measure “Promote to Admin” contrast, or compare against `#3b82f6` on `#ffffff`. |
| Recommended fix | Use a darker blue token that meets 4.5:1, or reuse the primary/destructive semantic colors already used elsewhere. |

### A-09 — Progress bars are not exposed as progress widgets

| Field | Detail |
| --- | --- |
| Severity | Medium |
| Pages / components | `/admin/progress` — `ProgressCell` in `components/admin/admin-progress-client.tsx` |
| Expected | A percent bar exposes `role="progressbar"` with `aria-valuemin`, `aria-valuemax`, and `aria-valuenow` (or equivalent text that fully conveys the value — the visible percent helps, but the bar itself is still unnamed). |
| Actual | The bar is a nested `div` with width style only. Visible text shows `percent%` and `completed/total`, so the value is available as text, but the graphical bar has no progress semantics. |
| Steps to reproduce | 1. Open `/admin/progress` with student/group rows. 2. Inspect the bar element in the accessibility tree. |
| Recommended fix | Add progressbar ARIA to the bar (and an accessible name such as “Task completion”), or mark the bar `aria-hidden` and keep the text as the sole name. |

### A-10 — Semester rollover disclosure control lacks `aria-expanded`

| Field | Detail |
| --- | --- |
| Severity | Medium |
| Pages / components | `/admin/progress` — danger-zone header button in `admin-progress-client.tsx` |
| Expected | The control that expands “Semester Rollover” exposes `aria-expanded` and controls the panel id. |
| Actual | A `<button>` toggles `isDangerOpen` visually with chevrons only. |
| Steps to reproduce | 1. Open `/admin/progress`. 2. Tab to “Semester Rollover”. 3. Inspect accessibility properties before/after click. |
| Recommended fix | Add `aria-expanded={isDangerOpen}` and `aria-controls` pointing at the panel. |

### A-11 — Admin shell places the site navigation inside `<main>`

| Field | Detail |
| --- | --- |
| Severity | Medium |
| Pages / components | `app/admin/layout.tsx` |
| Expected | Primary navigation sits outside `main` so landmark navigation can skip chrome. |
| Actual | `<main>` wraps both `<nav>` and page content. |
| Steps to reproduce | Inspect the DOM on any admin page and list landmarks. |
| Recommended fix | Move the header/`nav` outside `main`, leaving only page content inside `main`. |

### A-12 — Brand mark letter “M” fails contrast on white

| Field | Detail |
| --- | --- |
| Severity | Low |
| Pages / components | Admin header via `components/layout/app-brand.tsx` (`text-brand-gray` → `#a7b1b7` on `#ffffff`) |
| Expected | Text used in the UI meets 4.5:1 (or 3:1 if treated as large text / incidental brand decoration with a separate accessible name). |
| Actual | Calculated contrast is about **2.18:1**. The link has `aria-label="AnatWithMe home"`, which mitigates the brand spelling for screen readers, but low-vision users still see a low-contrast letter. |
| Steps to reproduce | View the header brand on a white admin page and measure the gray “M”. |
| Recommended fix | Darken `--brand-gray` for light backgrounds, or keep the decorative letter only if sponsor accepts the limitation and the accessible name remains. |

### A-13 — Roster page exposes two top-level `h1` headings

| Field | Detail |
| --- | --- |
| Severity | Low |
| Pages / components | `/admin/roster` — `app/admin/roster/page.tsx` |
| Expected | One primary `h1` per page; subsection titles use `h2`. |
| Actual | Interactive spot-check found both “Students” and “Administrators” as `h1`. |
| Steps to reproduce | 1. Open `/admin/roster`. 2. Inspect heading levels. |
| Recommended fix | Keep “Students” as `h1` (or a single page title) and demote “Administrators” to `h2`. |

## Potential issues (need manual verification)

These are not filed as confirmed defects yet.

| ID | Topic | Why it is only potential | Suggested check |
| --- | --- | --- | --- |
| P-01 | Agenda drag-and-drop keyboard operability | `@dnd-kit/core` defaults include `KeyboardSensor`, and handles have `aria-label="Drag Agenda"`, but no project test proves Space/Arrow reorder works in this table. | Keyboard-only reorder on `/admin/agendas`. |
| P-02 | Admin landing quick-link focus styling | Quick links use `focus:outline-none` and rely on `group-focus-visible:ring-*` on the card. Header/tab focus rings were visible in the spot-check; the card rings were not separately measured. | Tab through the five quick-link cards on `/admin`. |
| P-03 | Toast contrast / persistence | Sonner toasts use custom red/green classes; contrast and time-to-dismiss were not measured in a browser pass for this audit. | Trigger success/error toasts and measure contrast; confirm they do not disappear too quickly for reading. |
| P-04 | Dense admin tables without captions | Tables generally have header cells but no `<caption>` / `aria-labelledby`. Impact depends on AT verbosity preferences. | Screen-reader pass on roster, groups, agendas, progress. |
| P-05 | Resources / agenda detail task managers | Large forms generally use `Label htmlFor`, but icon-only row actions and nested dialogs need a focused keyboard pass beyond the landing pages. | Full keyboard pass on `/admin/resources` detail and `/admin/agendas/[id]`. |
| P-06 | Live region strategy for matching results | Groups matching banners are inline and usually fine visually; confirm polite/assertive announcement behavior with a screen reader when results appear. | Generate groups with VoiceOver/NVDA running. |

## Outstanding manual checks

1. Full keyboard-only run of every critical workflow in the table above.
2. Screen-reader pass (VoiceOver or NVDA) of navigation, dialogs, tables, and the availability grid.
3. Mobile/narrow viewport pass of the admin Menu button and dialog zoom/reflow at 200%/400%.
4. Sponsor confirmation of the target standard/depth (WCAG 2.2 AA vs a smaller launch subset), as noted on #107.
5. Retest after remediation issues are filed and fixed.

## Recommended remediation order

Ready for prioritization (suggested order, not sponsor-approved):

1. **A-02** custom dialog focus management (Critical; affects groups, roster confirms, rollover).
2. **A-01** admin navbar parity with the student navbar fix.
3. **A-03** agenda enabled checkbox names.
4. **A-04** availability grid semantics / non-color cues.
5. **A-05**, **A-06**, **A-07** form semantics and validation wiring.
6. **A-08**, **A-09**, **A-10**, **A-11**, **A-12**, **A-13** contrast, progress semantics, disclosure, landmarks, brand contrast, roster heading outline.

Create separate GitHub issues for confirmed defects before implementation, per #107 notes. This audit issue (#110) should stay documentation-only.

## What looked relatively solid

- Many admin forms already pair `Label` with `htmlFor` (rooms create/edit, exam create, agenda create, group create/edit core fields, assignment start/end on group edit).
- Shared `Button` styles include `focus-visible` rings.
- Icon-only actions often include `sr-only` text (exam edit/delete/save, row “Open row actions”, dialog Close).
- Expand/collapse controls on groups/agendas commonly set `aria-expanded` and an `aria-label`.
- Rollover domain options use a real `<label>` wrapping each checkbox.
- Student availability uses Radix `Dialog`, which provides stronger baseline modal behavior than the custom overlays.

## Test results

Commands run during this audit:

```text
npx eslint "components/admin/**/*.{ts,tsx}" "app/admin/**/*.{ts,tsx}"
# 0 errors; 7 unused-var warnings (not accessibility findings)

npm run test:rooms
# 5 passed, 0 failed

npm run test:assignment-range
# 13 passed, 0 failed

npm run test:group-management
# 6 passed, 1 failed
# Failure: "accepts valid 1-hour manual group input"
# Cause observed in code: validateManualGroupInput now requires groupName,
# but the test omits groupName. Pre-existing relative to this audit; not an a11y defect.
```

No application functionality was changed for #110.

## Acceptance criteria checklist (#110)

| Criterion | Status |
| --- | --- |
| In-scope administrator interfaces have been audited | Met — pages/components listed above |
| Accessibility findings are documented | Met — confirmed + potential sections |
| Findings include affected pages or components | Met — each finding names files/routes |
| Confirmed issues are ready for prioritization and remediation | Met — severity, repro, expected/actual, recommended fix |

## Files changed for this issue

| File | Change |
| --- | --- |
| `docs/admin-accessibility-audit.md` | Added (this audit) |

No other files should be modified for #110.
