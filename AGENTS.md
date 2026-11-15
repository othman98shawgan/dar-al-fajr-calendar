For all Git, branching, and release operations, strictly follow the rules in `./GIT_WORKFLOW.md`.

Always showcase and align on the complete scope, architecture, and edge cases of any feature or fix before writing any code, especially for big features.

When preparing a Pull Request reminder, always format the PR Description inside a fenced markdown code block (` ```markdown ... ``` `) so it can be easily copied with one click into GitHub.

# Project: Dar al-Fajr Weekly Schedule & Room Management Dashboard

## 1. Tech Stack & Constraints
- **Architecture:** Lightweight Vanilla HTML5, ES6+ JavaScript, and Tailwind CSS (CDN or minimal build). Do NOT introduce React, Vue, or complex backend dependencies.
- **Localization:** Strictly RTL (`dir="rtl"`, `lang="ar"`) using the `Tajawal` Google Font.
- **Git Rules:** Work only on the active feature branch. Never commit directly to `main`, and never open PRs or merge automatically.

## 2. Data Source (Google Sheets CSV + JSONP Fallback)
- Fetch live data directly from Google Sheets CSV export (`https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={GID}`) so mixed numeric + text columns (e.g., `group_name` containing both `"101"` and `"Teachers"`) are preserved without `gviz/tq` type-coercion dropping string values, with Google Visualization API JSONP (`gviz/tq`) as a fallback.
- **Two Tabs:**
  1. `Schedule` (`gid=0`):
     - Col A (0): `track` (`Boys` | `Girls`)
     - Col B (1): `day` (Numbers `1`-`7` where `1=Sunday` ... `7=Saturday`, OR English/Arabic day names)
     - Col C (2): `start_time` (Plain text `HH:mm`, e.g., `09:00`, `16:30`)
     - Col D (3): `end_time` (Plain text `HH:mm`)
     - Col E (4): `group_name` (Must always be coerced to `String`—both numeric names like `"101"` and text names like `"Teachers"` are valid and must not be dropped or crash `.toLowerCase()`)
     - Col F (5): `category` (`Hifz` | `Reading` | `Qaidah Nouraniah` | `Tarbawi`)
     - Col G (6): `room` (Location name, e.g., `قاعة 1`, `المسجد`)
     - Col H (7): `teacher 1` (Primary teacher)
     - Col I (8): `teacher 2` (Optional co-teacher)
     - Col J (9): `teacher 3` (Optional co-teacher; deduplicate and merge with `teacher 1` / `teacher 2` into a comma-separated list)
     - Col K (10): `active` (`TRUE` / `FALSE` — filter out `FALSE` or `NO`)
  2. `Metadata` (`gid=573175636`):
     - Columns: `tracks`, `days`, `categories`, `rooms`, `teachers`. Used to populate filter dropdowns and the Room Matrix even if a room/teacher has 0 active classes.
- **Resilient Parsing:** Map cells using both normalized header labels AND column index fallbacks (`_0` through `_10`) so Google Sheets header quirks never drop valid rows.

## 3. Core Business Logic & Edge Cases
- **Track Toggle:** Prominent top segmented switch for `البنين` (`Boys`), `البنات` (`Girls`), and `الكل` (`All`).
- **All 7 Days Always Rendered:** Display Sunday (`الأحد`) through Saturday (`السبت`) in a 7-column desktop grid even when a day has 0 scheduled groups.
- **Conflict Detection Engine:**
  - Detect overlapping time intervals (`startA < endB && endA > startB`) on the same `day` across **all** tracks (`Boys` + `Girls` combined, since they share physical rooms).
  - **Masjid Exception:** If `room` matches `"المسجد"`, `"مسجد"`, or `"masjid"`, **allow unlimited concurrent bookings** (do NOT trigger a room conflict).
  - **Teacher Double-Booking:** Always flag a conflict if any teacher (checking `teacher 1`, `teacher 2`, and `teacher 3`) is assigned to two overlapping groups at the same time—even at the Masjid.
- **Time-Slot Grouping & "View More" Modal:**
  - Group lessons sharing the exact same `start_time` and `end_time` within a day column.
  - If >2 concurrent groups exist in one slot (e.g., weekend mornings at the Masjid), display the first 2 cards and a `+ عرض X حلقات أخرى` button that opens a searchable modal showing all concurrent groups for that slot.

## 4. Required Views
1. **Weekly Grid (`الجدول الأسبوعي`):** 7-day board with color-coded category cards (`Hifz`=Emerald, `Reading`=Sky, `Qaidah Nouraniah`=Amber, `Tarbawi`=Purple).
2. **Room Occupancy Matrix (`إشغال القاعات`):** Day selector showing every room from `Metadata` + `Schedule` and highlighting completely empty rooms.
3. **Conflicts Inspector (`مركز فحص التعارضات`):** Dedicated alert badge and side-by-side comparison view whenever room or teacher overlaps exist.

## Tasks
<!-- Add upcoming tasks here as `- [ ] <type>: <description>` -->
- [x] fix: fix misplaced await syntax error, add normalizeTimeString, harden parsing, and modularize JS for static hosting
- [x] fix: stack card teacher and location rows and optimize mobile responsive layout
