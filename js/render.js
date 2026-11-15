import { CATEGORY_STYLES, DAYS_ORDER, MAX_VISIBLE_PER_SLOT } from "./config.js";
import { isMasjid } from "./conflicts.js";

/**
 * Escapes HTML special characters to prevent broken attributes or markup injection
 * from spreadsheet values.
 */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Renders a single schedule group card.
 */
export function renderCard(item, { track, conflicts }) {
  const style = CATEGORY_STYLES[item.category] || {
    label: item.category,
    card: "bg-slate-50 border-slate-400 text-slate-900",
    badge: "bg-slate-600 text-white"
  };

  const itemConflicts = conflicts.get(item.id) || [];
  const hasConflict = itemConflicts.length > 0;
  const roomIsMasjid = isMasjid(item.room);

  const trackBadge = track === "All"
    ? `<span class="text-[10px] font-extrabold px-1.5 py-0.5 rounded ${item.track === "Boys" ? "bg-blue-100 text-blue-800" : "bg-pink-100 text-pink-800"}">
         ${item.track === "Boys" ? "بنين" : "بنات"}
       </span>`
    : "";

  const teacherDisplay = item.teacher
    ? escapeHtml(item.teacher.replace(/,/g, " • "))
    : "بدون معلم";
  const roomDisplay = item.room ? escapeHtml(item.room) : "غير محدد";
  const timeRange = `${escapeHtml(item.start_time || "--:--")} - ${escapeHtml(item.end_time || "--:--")}`;

  return `
    <div class="min-w-0 rounded-xl border-r-4 p-2.5 shadow-sm transition hover:shadow-md ${style.card} ${hasConflict ? "ring-2 ring-red-500 bg-red-50/60" : "border border-slate-200/80"}">
      <div class="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
        <span class="text-[11px] font-extrabold bg-white/90 px-2 py-0.5 rounded border border-slate-200 text-slate-800 shrink-0" dir="ltr">
          ${timeRange}
        </span>
        <div class="flex flex-wrap items-center gap-1">
          ${trackBadge}
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${style.badge}">
            ${escapeHtml(style.label)}
          </span>
        </div>
      </div>

      <h3 class="font-extrabold text-sm text-slate-900 mb-2 leading-snug break-words" dir="auto">
        ${escapeHtml(item.group_name)}
      </h3>

      <div class="flex flex-col gap-1.5 text-xs font-bold text-slate-700 pt-2 border-t border-black/5 min-w-0">
        <div class="flex items-start gap-1.5 min-w-0 leading-snug" title="${escapeHtml(item.teacher)}">
          <span class="shrink-0">👤</span>
          <span class="min-w-0 break-words" dir="auto">${teacherDisplay}</span>
        </div>
        <div class="flex items-center justify-start min-w-0">
          <span class="inline-flex items-center gap-1 max-w-full ${roomIsMasjid ? "bg-emerald-700 text-white" : "bg-white/85 text-slate-800"} px-2 py-0.5 rounded border border-black/10">
            <span class="shrink-0">${roomIsMasjid ? "🕌" : "📍"}</span>
            <span class="truncate" dir="auto">${roomDisplay}</span>
          </span>
        </div>
      </div>

      ${hasConflict ? `
        <div class="mt-2 pt-1.5 border-t border-red-200 text-[11px] font-bold text-red-700 space-y-0.5 break-words">
          ${itemConflicts.map((c) => `<div>⚠️ ${escapeHtml(c)}</div>`).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function renderTimeCluster(dayObj, cluster, state) {
  const items = cluster.items;
  if (items.length <= MAX_VISIBLE_PER_SLOT) {
    return items.map((item) => renderCard(item, state)).join("");
  }

  const slotId = `${dayObj.key}_${cluster.timeKey}`;
  state.slotGroups.set(slotId, {
    dayLabel: dayObj.label,
    start: cluster.start,
    end: cluster.end,
    items
  });

  const visibleItems = items.slice(0, MAX_VISIBLE_PER_SLOT);
  const hiddenCount = items.length - MAX_VISIBLE_PER_SLOT;

  return `
    <div class="p-2 rounded-xl bg-slate-200/60 border border-slate-300/80 space-y-2">
      <div class="flex items-center justify-between px-1 text-[11px] font-extrabold text-slate-700">
        <span dir="ltr">⏰ ${escapeHtml(cluster.start)} - ${escapeHtml(cluster.end)}</span>
        <span class="bg-slate-800 text-white px-2 py-0.5 rounded-full">${items.length} حلقات متزامنة</span>
      </div>
      ${visibleItems.map((item) => renderCard(item, state)).join("")}
      <button
        type="button"
        data-slot-id="${escapeHtml(slotId)}"
        class="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm transition flex items-center justify-center gap-1.5"
      >
        <span>+ عرض ${hiddenCount} حلقات أخرى</span>
        <span>(${items.length} إجمالاً) ←</span>
      </button>
    </div>
  `;
}

/**
 * View 1: Always renders all 7 days (Sunday through Saturday) with time-slot grouping.
 */
export function renderWeeklyGrid(data, state) {
  state.slotGroups.clear();

  const dayCounts = DAYS_ORDER.map((dayObj) => ({
    ...dayObj,
    count: data.filter((d) => d.day === dayObj.key).length
  }));

  return `
    <!-- Quick Day Jump Bar (Mobile / Tablet) -->
    <nav aria-label="الانتقال السريع للأيام" class="xl:hidden mb-3 -mx-1 px-1 flex items-center gap-1.5 overflow-x-auto pb-1">
      ${dayCounts.map((d) => `
        <button
          type="button"
          data-jump-day="${escapeHtml(d.key)}"
          class="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition ${d.count ? "bg-white border-slate-300 text-slate-800 hover:border-emerald-500" : "bg-slate-100 border-slate-200 text-slate-400"}"
        >
          <span>${escapeHtml(d.label)}</span>
          <span class="px-1.5 py-0.5 rounded-full text-[10px] ${d.count ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-500"}">${d.count}</span>
        </button>
      `).join("")}
    </nav>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
      ${DAYS_ORDER.map((dayObj) => {
        const dayClasses = data.filter((d) => d.day === dayObj.key);
        const timeClusters = [];
        const clusterMap = new Map();

        dayClasses.forEach((item) => {
          const timeKey = `${item.start_time}-${item.end_time}`;
          if (!clusterMap.has(timeKey)) {
            const group = { timeKey, start: item.start_time, end: item.end_time, items: [] };
            clusterMap.set(timeKey, group);
            timeClusters.push(group);
          }
          clusterMap.get(timeKey).items.push(item);
        });

        return `
          <div id="day-${escapeHtml(dayObj.key)}" class="min-w-0 scroll-mt-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-[120px] xl:min-h-[320px]">
            <div class="bg-slate-800 text-white px-3.5 py-2.5 flex items-center justify-between">
              <span class="font-extrabold text-sm">${escapeHtml(dayObj.label)}</span>
              <span class="text-xs ${dayClasses.length ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-400"} px-2 py-0.5 rounded-full font-bold">
                ${dayClasses.length}
              </span>
            </div>

            <div class="p-2.5 space-y-2.5 flex-1 bg-slate-50/40 flex flex-col min-w-0">
              ${timeClusters.length === 0
                ? `<div class="m-auto text-center py-6 xl:py-10 text-xs text-slate-400 font-medium">
                     لا توجد حلقات مجدولة
                   </div>`
                : timeClusters.map((cluster) => renderTimeCluster(dayObj, cluster, state)).join("")
              }
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

/**
 * View 2: Room Occupancy Matrix showing every room from Metadata + Schedule and highlighting empty rooms.
 */
export function renderRoomsMatrix(data, state, selectedDay) {
  const dayLabel = DAYS_ORDER.find((d) => d.key === selectedDay)?.label || selectedDay;
  const rooms = [...new Set([
    ...(state.metadata.rooms || []),
    ...state.rawSchedule.map((d) => d.room)
  ])].filter(Boolean);

  const dayData = data.filter((d) => d.day === selectedDay);

  return `
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="bg-slate-800 text-white px-5 py-3 flex items-center justify-between">
        <div>
          <h2 class="font-extrabold text-base">مصفوفة إشغال القاعات — يوم ${escapeHtml(dayLabel)}</h2>
          <p class="text-xs text-slate-300">لمعرفة القاعات الفارغة والمشغولة خلال اليوم</p>
        </div>
      </div>

      ${rooms.length === 0
        ? `<div class="p-8 text-center text-slate-400 font-bold text-sm">لا توجد قاعات معرفة في البيانات</div>`
        : `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50">
            ${rooms.map((room) => {
              const roomClasses = dayData.filter((d) => d.room === room);
              const roomIsMasjid = isMasjid(room);
              return `
                <div class="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
                  <div class="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
                    <span class="font-extrabold text-slate-800 text-sm">${roomIsMasjid ? "🕌" : "📍"} ${escapeHtml(room)}</span>
                    <span class="text-xs font-bold px-2 py-0.5 rounded-full ${roomClasses.length ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}">
                      ${roomClasses.length ? `${roomClasses.length} حلقات` : "قاعة متاحة بالكامل"}
                    </span>
                  </div>
                  <div class="p-3 space-y-2.5 flex-1 max-h-[500px] overflow-y-auto">
                    ${roomClasses.length === 0
                      ? `<div class="py-10 text-center text-xs text-emerald-600 font-bold bg-emerald-50/40 rounded-lg border border-dashed border-emerald-200">
                           ✓ القاعة فارغة طوال اليوم
                         </div>`
                      : roomClasses.map((item) => renderCard(item, state)).join("")
                    }
                  </div>
                </div>
              `;
            }).join("")}
          </div>`
      }
    </div>
  `;
}

/**
 * View 3: Conflicts Inspector with side-by-side comparison cards.
 */
export function renderConflictsInspector(state) {
  return `
    <div class="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
      <div class="bg-red-600 text-white px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="font-extrabold text-sm sm:text-base">⚠️ مركز فحص التعارضات (${state.conflictPairs.length})</h2>
          <p class="text-xs text-red-100">يفحص هذا القسم التداخلات الزمنية في القاعات (باستثناء المسجد) أو المعلمين</p>
        </div>
        <button type="button" data-action="back-weekly" class="bg-white text-red-700 px-3 py-1.5 rounded-lg text-xs font-extrabold shrink-0">
          العودة للجدول
        </button>
      </div>

      <div class="p-3 sm:p-4 space-y-3">
        ${state.conflictPairs.length === 0
          ? `<div class="p-8 text-center text-emerald-700 font-bold">لا توجد أي تعارضات في الجدول حالياً!</div>`
          : state.conflictPairs.map((pair) => {
              const dayLabel = DAYS_ORDER.find((d) => d.key === pair.itemA.day)?.label || pair.itemA.day;
              return `
                <div class="p-4 rounded-xl bg-red-50 border border-red-200 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div class="space-y-1">
                    <span class="inline-block bg-red-600 text-white text-xs font-extrabold px-2.5 py-0.5 rounded-full">
                      ${escapeHtml(pair.type)}: ${escapeHtml(pair.resource)} — يوم ${escapeHtml(dayLabel)}
                    </span>
                    <p class="text-xs text-slate-600 font-medium pt-1">
                      يوجد تداخل في الوقت بين هاتين المجموعتين في Google Sheets:
                    </p>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:w-2/3">
                    ${renderCard(pair.itemA, state)}
                    ${renderCard(pair.itemB, state)}
                  </div>
                </div>
              `;
            }).join("")
        }
      </div>
    </div>
  `;
}
