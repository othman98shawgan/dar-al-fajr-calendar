/**
 * Time interval helpers, Masjid exemption, and cross-track conflict detection engine.
 */

/**
 * Converts "HH:mm" into minutes since midnight. Returns null if malformed.
 */
export function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== "string" || !timeStr.includes(":")) return null;
  const parts = timeStr.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return null;
  }
  return h * 60 + m;
}

/**
 * Masjid rooms allow unlimited concurrent bookings without triggering room conflicts.
 */
export function isMasjid(roomName) {
  if (!roomName) return false;
  const normalized = String(roomName).trim().toLowerCase();
  return normalized === "المسجد" || normalized === "مسجد" || normalized.includes("masjid");
}

function addConflictFlag(conflictsMap, id, msg) {
  if (!conflictsMap.has(id)) conflictsMap.set(id, []);
  conflictsMap.get(id).push(msg);
}

/**
 * Detects overlapping intervals on the same day across ALL tracks (Boys + Girls combined).
 * - Room conflicts ignore Masjid rooms.
 * - Teacher double-bookings always trigger conflicts (even at the Masjid).
 */
export function detectConflicts(data) {
  const conflicts = new Map();
  const conflictPairs = [];

  for (let i = 0; i < data.length; i++) {
    for (let j = i + 1; j < data.length; j++) {
      const a = data[i];
      const b = data[j];

      if (!a.day || a.day !== b.day) continue;

      const startA = timeToMinutes(a.start_time);
      const endA = timeToMinutes(a.end_time);
      const startB = timeToMinutes(b.start_time);
      const endB = timeToMinutes(b.end_time);

      if (
        startA === null ||
        endA === null ||
        startB === null ||
        endB === null ||
        endA <= startA ||
        endB <= startB
      ) {
        continue;
      }

      if (startA < endB && endA > startB) {
        // 1. Room Conflict (Masjid exempt)
        const roomA = String(a.room || "").trim();
        const roomB = String(b.room || "").trim();
        if (roomA !== "" && roomA.toLowerCase() === roomB.toLowerCase() && !isMasjid(roomA)) {
          addConflictFlag(conflicts, a.id, `تعارض في القاعة (${roomA}) مع "${b.group_name}"`);
          addConflictFlag(conflicts, b.id, `تعارض في القاعة (${roomB}) مع "${a.group_name}"`);
          conflictPairs.push({ type: "قاعة مزدوجة", itemA: a, itemB: b, resource: roomA });
        }

        // 2. Teacher Double-Booking (applies everywhere, including Masjid)
        const teachersA = [...new Set(String(a.teacher || "").split(",").map((t) => t.trim()).filter(Boolean))];
        const teachersB = [...new Set(String(b.teacher || "").split(",").map((t) => t.trim()).filter(Boolean))];
        const sharedTeachers = teachersA.filter((t) => teachersB.includes(t));

        sharedTeachers.forEach((tName) => {
          addConflictFlag(conflicts, a.id, `تعارض للمعلم (${tName}) مع "${b.group_name}"`);
          addConflictFlag(conflicts, b.id, `تعارض للمعلم (${tName}) مع "${a.group_name}"`);
          conflictPairs.push({ type: "معلم في مجموعتين بنفس الوقت", itemA: a, itemB: b, resource: tName });
        });
      }
    }
  }

  return { conflicts, conflictPairs };
}
