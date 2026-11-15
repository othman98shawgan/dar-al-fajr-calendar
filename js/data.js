import { ARABIC_DAY_MAP, DAY_MAP, DAYS_ORDER } from "./config.js";

const VALID_DAY_NAMES = DAYS_ORDER.map((d) => d.key);

/**
 * Normalizes a day cell value (1-7, numeric string like "1.0", English day name, or Arabic day name)
 * into a canonical English day key ("Sunday".."Saturday"), or "" if blank/invalid.
 */
export function normalizeDay(dayVal) {
  if (dayVal === undefined || dayVal === null) return "";
  const clean = String(dayVal).trim();
  if (!clean) return "";

  if (DAY_MAP[clean]) return DAY_MAP[clean];

  const asNum = Number(clean);
  if (Number.isInteger(asNum) && asNum >= 1 && asNum <= 7) {
    return DAY_MAP[String(asNum)];
  }

  const capitalized = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  if (VALID_DAY_NAMES.includes(capitalized)) return capitalized;

  if (ARABIC_DAY_MAP[clean]) return ARABIC_DAY_MAP[clean];

  return clean;
}

/**
 * Normalizes a time cell value into 24-hour "HH:mm" format.
 * Handles plain text ("9:00", "09:00", "16:30:00"), 12-hour strings ("4:30 PM", "4:30 م"),
 * and Google Visualization Date(...) literals ("Date(1899,11,30,16,30,0)").
 */
export function normalizeTimeString(timeVal) {
  if (timeVal === undefined || timeVal === null) return "";
  const raw = String(timeVal).trim();
  if (!raw) return "";

  // Handle Google Visualization Date(y, m, d, h, min, s) format
  const gvizDateMatch = raw.match(/^Date\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (gvizDateMatch) {
    const h = String(Number(gvizDateMatch[1])).padStart(2, "0");
    const m = String(Number(gvizDateMatch[2])).padStart(2, "0");
    return `${h}:${m}`;
  }

  // Handle HH:mm or H:mm (with optional :ss and optional AM/PM or Arabic ص/م)
  const timeMatch = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|ص|م)?$/i);
  if (timeMatch) {
    let hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    const meridiem = (timeMatch[3] || "").toUpperCase();

    if (hours > 23 || minutes > 59) return raw;

    if ((meridiem === "PM" || meridiem === "م") && hours < 12) {
      hours += 12;
    } else if ((meridiem === "AM" || meridiem === "ص") && hours === 12) {
      hours = 0;
    }

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  return raw;
}

/**
 * Normalizes track values while preserving standard "Boys" / "Girls" keys.
 */
export function normalizeTrack(trackVal) {
  const clean = String(trackVal ?? "").trim();
  if (!clean) return "Boys";

  const lower = clean.toLowerCase();
  if (lower === "boys" || clean === "بنين" || clean === "البنين") return "Boys";
  if (lower === "girls" || clean === "بنات" || clean === "البنات") return "Girls";
  return clean;
}

/**
 * Fetches a Google Sheet tab via Google Visualization API JSONP (CORS-free on static hosts).
 */
export function fetchSheetJSONP(sheetId, gid, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const callbackName = `gvizCallback_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    const script = document.createElement("script");
    let settled = false;

    const cleanup = () => {
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Timed out loading Google Sheet"));
    }, timeoutMs);

    window[callbackName] = function (json) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();

      if (!json || !json.table) {
        reject(new Error("Invalid response from Google Sheets"));
        return;
      }

      const cols = (json.table.cols || []).map((c) =>
        String(c?.label || "").trim().toLowerCase().replace(/\s+/g, "_")
      );

      const rows = (json.table.rows || []).map((r) => {
        const rowObj = {};
        if (r && Array.isArray(r.c)) {
          r.c.forEach((cell, i) => {
            const rawVal = cell ? (cell.f ?? cell.v ?? "") : "";
            const val = String(rawVal).trim();

            // Store both column index fallback and normalized header label
            rowObj[`_${i}`] = val;
            const headerKey = cols[i];
            if (headerKey) rowObj[headerKey] = val;
          });
        }
        return rowObj;
      });

      resolve(rows);
    };

    script.src = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?tqx=responseHandler:${callbackName}&gid=${encodeURIComponent(gid)}&headers=1&t=${Date.now()}`;

    script.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();
      reject(new Error("Network error loading Google Sheet"));
    };

    document.body.appendChild(script);
  });
}

/**
 * Reads a cell using normalized header labels first, then column index fallback (_0.._9).
 * Always coerces values to trimmed String so numeric values like "101" or "0" never break string ops.
 */
export function getCell(row, fallbackIdx, ...names) {
  if (!row) return "";
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null && String(row[name]).trim() !== "") {
      return String(row[name]).trim();
    }
  }
  if (fallbackIdx !== null && fallbackIdx !== undefined) {
    const fallbackVal = row[`_${fallbackIdx}`];
    if (fallbackVal !== undefined && fallbackVal !== null) {
      return String(fallbackVal).trim();
    }
  }
  return "";
}

/**
 * Parses Metadata tab rows into unique filter/matrix lists.
 */
export function parseMetadataRows(metadataRows) {
  if (!Array.isArray(metadataRows) || metadataRows.length === 0) {
    return { tracks: [], days: [], categories: [], rooms: [], teachers: [] };
  }

  return {
    tracks: [...new Set(metadataRows.map((r) => getCell(r, 0, "tracks", "track")).filter(Boolean))],
    days: [...new Set(metadataRows.map((r) => normalizeDay(getCell(r, 1, "days", "day"))).filter(Boolean))],
    categories: [...new Set(metadataRows.map((r) => getCell(r, 2, "categories", "category")).filter(Boolean))],
    rooms: [...new Set(metadataRows.map((r) => getCell(r, 3, "rooms", "room")).filter(Boolean))],
    teachers: [...new Set(metadataRows.map((r) => getCell(r, 4, "teachers", "teacher")).filter(Boolean))]
  };
}

/**
 * Parses Schedule tab rows into normalized active schedule entries.
 */
export function parseScheduleRows(scheduleRows) {
  if (!Array.isArray(scheduleRows)) return [];

  return scheduleRows
    .filter((row) => {
      const name = getCell(row, 4, "group_name", "group", "name");
      const active = getCell(row, 9, "active", "is_active").toUpperCase();
      return name !== "" && active !== "FALSE" && active !== "NO";
    })
    .map((row, idx) => {
      const t1 = getCell(row, 6, "teacher_1", "teacher1", "teacher");
      const t2 = getCell(row, 7, "teacher_2", "teacher2");
      const combinedTeacher = [...new Set([t1, t2].filter(Boolean))].join(", ");

      return {
        id: idx + 1,
        track: normalizeTrack(getCell(row, 0, "track")),
        day: normalizeDay(getCell(row, 1, "day", "day_of_week", "اليوم")),
        start_time: normalizeTimeString(getCell(row, 2, "start_time", "start")),
        end_time: normalizeTimeString(getCell(row, 3, "end_time", "end")),
        group_name: String(getCell(row, 4, "group_name", "group", "name")),
        category: getCell(row, 5, "category") || "Hifz",
        teacher: combinedTeacher,
        room: getCell(row, 8, "room", "place")
      };
    });
}
