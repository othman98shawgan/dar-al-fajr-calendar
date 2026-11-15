import { CATEGORY_STYLES, METADATA_GID, SCHEDULE_GID, SHEET_ID } from "./config.js";
import { detectConflicts, timeToMinutes } from "./conflicts.js";
import { fetchSheetRows, parseMetadataRows, parseScheduleRows } from "./data.js";
import {
  escapeHtml,
  renderCard,
  renderConflictsInspector,
  renderRoomsMatrix,
  renderWeeklyGrid
} from "./render.js";

const state = {
  rawSchedule: [],
  metadata: { tracks: [], days: [], categories: [], rooms: [], teachers: [] },
  conflicts: new Map(),
  conflictPairs: [],
  slotGroups: new Map(),
  activeModalItems: [],
  track: "Boys",
  view: "weekly",
  filters: {
    search: "",
    category: "All",
    teacher: "All",
    room: "All"
  }
};

function fillSelect(elementId, values, defaultLabel, formatter = (v) => v) {
  const select = document.getElementById(elementId);
  const currentVal = select.value;

  select.innerHTML =
    `<option value="All">${escapeHtml(defaultLabel)}</option>` +
    values.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(formatter(v))}</option>`).join("");

  select.value = values.includes(currentVal) ? currentVal : "All";
}

function populateFilterDropdowns() {
  const rawTeachers = state.rawSchedule.map((d) => d.teacher).filter(Boolean);
  const splitTeachers = rawTeachers.flatMap((t) => t.split(",").map((s) => s.trim()));

  const teachers = [...new Set([...(state.metadata.teachers || []), ...splitTeachers])].filter(Boolean);
  const categories = [...new Set([...(state.metadata.categories || []), ...state.rawSchedule.map((d) => d.category)])].filter(Boolean);
  const rooms = [...new Set([...(state.metadata.rooms || []), ...state.rawSchedule.map((d) => d.room)])].filter(Boolean);

  fillSelect(
    "filter-category",
    categories,
    "كل التصنيفات",
    (val) => (CATEGORY_STYLES[val]?.label ? `${CATEGORY_STYLES[val].label} (${val})` : val)
  );
  fillSelect("filter-teacher", teachers, "كل المعلمين");
  fillSelect("filter-room", rooms, "كل القاعات");
}

function getFilteredData() {
  return state.rawSchedule
    .filter((item) => {
      if (state.track !== "All" && item.track !== state.track) return false;
      if (state.filters.category !== "All" && item.category !== state.filters.category) return false;

      if (state.filters.teacher !== "All") {
        const itemTeachers = String(item.teacher || "").split(",").map((t) => t.trim());
        if (!itemTeachers.includes(state.filters.teacher)) return false;
      }

      if (state.filters.room !== "All" && item.room !== state.filters.room) return false;

      if (state.filters.search) {
        const q = state.filters.search.toLowerCase();
        const matchName = String(item.group_name ?? "").toLowerCase().includes(q);
        const matchTeacher = String(item.teacher ?? "").toLowerCase().includes(q);
        const matchRoom = String(item.room ?? "").toLowerCase().includes(q);
        if (!matchName && !matchTeacher && !matchRoom) return false;
      }

      return true;
    })
    .sort((a, b) => (timeToMinutes(a.start_time) ?? 0) - (timeToMinutes(b.start_time) ?? 0));
}

function updateConflictBadge() {
  const badge = document.getElementById("conflict-badge");
  const countEl = document.getElementById("conflict-count");

  if (state.conflictPairs.length > 0) {
    badge.classList.remove("hidden");
    badge.classList.add("flex");
    countEl.textContent = `${state.conflictPairs.length} تعارضات في الجدول`;
  } else {
    badge.classList.add("hidden");
    badge.classList.remove("flex");
  }
}

function render() {
  ["Boys", "Girls", "All"].forEach((t) => {
    const btn = document.getElementById(`track-${t}`);
    btn.className =
      state.track === t
        ? "track-btn px-5 py-1.5 rounded-lg text-sm font-extrabold bg-emerald-600 text-white shadow-sm transition-all"
        : "track-btn px-5 py-1.5 rounded-lg text-sm font-bold text-slate-600 hover:text-slate-900 transition-all";
  });

  ["weekly", "rooms"].forEach((v) => {
    const btn = document.getElementById(`view-${v}`);
    btn.className =
      state.view === v
        ? "view-btn px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-white text-slate-900 shadow-sm transition-all"
        : "view-btn px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 transition-all";
  });

  const filtered = getFilteredData();
  document.getElementById("stats-counter").textContent = `${filtered.length} حلقات معروضة`;

  const canvas = document.getElementById("app-Canvas");
  if (state.view === "weekly") {
    canvas.innerHTML = renderWeeklyGrid(filtered, state);
  } else if (state.view === "rooms") {
    const selectedDay = document.getElementById("filter-matrix-day").value;
    canvas.innerHTML = renderRoomsMatrix(filtered, state, selectedDay);
  } else if (state.view === "conflicts") {
    canvas.innerHTML = renderConflictsInspector(state);
  }
}

function setTrack(track) {
  state.track = track;
  populateFilterDropdowns();
  updateFilters();
}

function setView(view) {
  state.view = view;
  const daySelect = document.getElementById("filter-matrix-day");
  if (view === "rooms") daySelect.classList.remove("hidden");
  else daySelect.classList.add("hidden");
  render();
}

function updateFilters() {
  state.filters.search = document.getElementById("filter-search").value.trim();
  state.filters.category = document.getElementById("filter-category").value;
  state.filters.teacher = document.getElementById("filter-teacher").value;
  state.filters.room = document.getElementById("filter-room").value;
  render();
}

function resetFilters() {
  document.getElementById("filter-search").value = "";
  document.getElementById("filter-category").value = "All";
  document.getElementById("filter-teacher").value = "All";
  document.getElementById("filter-room").value = "All";
  updateFilters();
}

function renderModalCards(items) {
  const container = document.getElementById("modal-body");
  if (items.length === 0) {
    container.innerHTML = `<div class="col-span-full py-10 text-center text-slate-400 font-bold text-sm">لا توجد نتائج مطابقة للبحث</div>`;
    return;
  }
  container.innerHTML = items.map((item) => renderCard(item, state)).join("");
}

function openSlotModal(slotId) {
  const slotData = state.slotGroups.get(slotId);
  if (!slotData) return;

  state.activeModalItems = slotData.items;

  document.getElementById("modal-title").textContent =
    `حلقات يوم ${slotData.dayLabel} — الفترة (${slotData.start} - ${slotData.end})`;
  document.getElementById("modal-subtitle").textContent =
    `إجمالي ${slotData.items.length} حلقات منعقدة في نفس الفترة الزمنية`;
  document.getElementById("modal-search").value = "";

  renderModalCards(state.activeModalItems);

  const modal = document.getElementById("slot-modal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function filterModalCards() {
  const q = document.getElementById("modal-search").value.trim().toLowerCase();
  if (!q) {
    renderModalCards(state.activeModalItems);
    return;
  }

  const filtered = state.activeModalItems.filter(
    (item) =>
      String(item.group_name ?? "").toLowerCase().includes(q) ||
      String(item.teacher ?? "").toLowerCase().includes(q) ||
      String(item.room ?? "").toLowerCase().includes(q)
  );
  renderModalCards(filtered);
}

function closeSlotModal() {
  const modal = document.getElementById("slot-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

async function fetchSchedule() {
  const statusEl = document.getElementById("sync-status");
  statusEl.textContent = "جاري جلب البيانات من Google Sheets...";

  try {
    const [scheduleRows, metadataRows] = await Promise.all([
      fetchSheetRows(SHEET_ID, SCHEDULE_GID),
      fetchSheetRows(SHEET_ID, METADATA_GID).catch(() => [])
    ]);

    state.metadata = parseMetadataRows(metadataRows);
    state.rawSchedule = parseScheduleRows(scheduleRows);

    const time = new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    statusEl.textContent = `متصل بقاعدة البيانات (${state.rawSchedule.length} حلقة) • آخر تحديث: ${time}`;
  } catch (err) {
    console.error("Fetch Error:", err);
    statusEl.textContent = "⚠️ خطأ في قراءة البيانات من Google Sheets";
  }

  const result = detectConflicts(state.rawSchedule);
  state.conflicts = result.conflicts;
  state.conflictPairs = result.conflictPairs;

  updateConflictBadge();
  populateFilterDropdowns();
  render();
}

function bindEvents() {
  ["Boys", "Girls", "All"].forEach((track) => {
    document.getElementById(`track-${track}`).addEventListener("click", () => setTrack(track));
  });

  document.getElementById("view-weekly").addEventListener("click", () => setView("weekly"));
  document.getElementById("view-rooms").addEventListener("click", () => setView("rooms"));
  document.getElementById("conflict-badge").addEventListener("click", () => setView("conflicts"));
  document.getElementById("refresh-btn").addEventListener("click", fetchSchedule);

  document.getElementById("filter-search").addEventListener("input", updateFilters);
  document.getElementById("filter-category").addEventListener("change", updateFilters);
  document.getElementById("filter-teacher").addEventListener("change", updateFilters);
  document.getElementById("filter-room").addEventListener("change", updateFilters);
  document.getElementById("filter-matrix-day").addEventListener("change", render);
  document.getElementById("reset-filters-btn").addEventListener("click", resetFilters);

  document.getElementById("modal-close-btn").addEventListener("click", closeSlotModal);
  document.getElementById("modal-search").addEventListener("input", filterModalCards);
  document.getElementById("slot-modal").addEventListener("click", (event) => {
    if (event.target.id === "slot-modal") closeSlotModal();
  });

  document.getElementById("app-Canvas").addEventListener("click", (event) => {
    const slotBtn = event.target.closest("[data-slot-id]");
    if (slotBtn) {
      openSlotModal(slotBtn.dataset.slotId);
      return;
    }

    const backBtn = event.target.closest('[data-action="back-weekly"]');
    if (backBtn) {
      setView("weekly");
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSlotModal();
  });
}

bindEvents();
fetchSchedule();
