/**
 * Static configuration and domain constants for the Dar al-Fajr dashboard.
 */

export const SHEET_ID = "1QHtA0q8rXp064QoK9TrZWGzoq8i9vrzfUQBerWXFvYk";
export const SCHEDULE_GID = "0";
export const METADATA_GID = "573175636";

export const MAX_VISIBLE_PER_SLOT = 2;

export const DAYS_ORDER = [
  { key: "Sunday", label: "الأحد" },
  { key: "Monday", label: "الإثنين" },
  { key: "Tuesday", label: "الثلاثاء" },
  { key: "Wednesday", label: "الأربعاء" },
  { key: "Thursday", label: "الخميس" },
  { key: "Friday", label: "الجمعة" },
  { key: "Saturday", label: "السبت" }
];

export const DAY_MAP = {
  "1": "Sunday",
  "2": "Monday",
  "3": "Tuesday",
  "4": "Wednesday",
  "5": "Thursday",
  "6": "Friday",
  "7": "Saturday"
};

export const ARABIC_DAY_MAP = {
  "الأحد": "Sunday",
  "الاحد": "Sunday",
  "أحد": "Sunday",
  "احد": "Sunday",
  "الإثنين": "Monday",
  "الاثنين": "Monday",
  "إثنين": "Monday",
  "اثنين": "Monday",
  "الثلاثاء": "Tuesday",
  "ثلاثاء": "Tuesday",
  "الأربعاء": "Wednesday",
  "الاربعاء": "Wednesday",
  "أربعاء": "Wednesday",
  "اربعاء": "Wednesday",
  "الخميس": "Thursday",
  "خميس": "Thursday",
  "الجمعة": "Friday",
  "جمعة": "Friday",
  "السبت": "Saturday",
  "سبت": "Saturday"
};

export const CATEGORY_STYLES = {
  "Hifz": {
    label: "حفظ",
    card: "bg-emerald-50/90 border-emerald-500 text-emerald-950",
    badge: "bg-emerald-600 text-white"
  },
  "Reading": {
    label: "قراءة",
    card: "bg-sky-50/90 border-sky-500 text-sky-950",
    badge: "bg-sky-600 text-white"
  },
  "Qaidah Nouraniah": {
    label: "قاعدة نورانية",
    card: "bg-amber-50/90 border-amber-500 text-amber-950",
    badge: "bg-amber-500 text-white"
  },
  "Tarbawi": {
    label: "تربوي",
    card: "bg-purple-50/90 border-purple-500 text-purple-950",
    badge: "bg-purple-600 text-white"
  }
};
