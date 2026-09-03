export interface Governorate {
  ar: string;
  en: string;
}

export const EGYPT_GOVERNORATES: Governorate[] = [
  { ar: "القاهرة", en: "Cairo" },
  { ar: "الإسكندرية", en: "Alexandria" },
  { ar: "الجيزة", en: "Giza" },
  { ar: "الشرقية", en: "Sharqia" },
  { ar: "الدقهلية", en: "Dakahlia" },
  { ar: "البحيرة", en: "Beheira" },
  { ar: "المنوفية", en: "Monufia" },
  { ar: "القليوبية", en: "Qalyubia" },
  { ar: "الغربية", en: "Gharbia" },
  { ar: "كفر الشيخ", en: "Kafr El Sheikh" },
  { ar: "دمياط", en: "Damietta" },
  { ar: "بورسعيد", en: "Port Said" },
  { ar: "الإسماعيلية", en: "Ismailia" },
  { ar: "السويس", en: "Suez" },
  { ar: "شمال سيناء", en: "North Sinai" },
  { ar: "جنوب سيناء", en: "South Sinai" },
  { ar: "الفيوم", en: "Faiyum" },
  { ar: "بني سويف", en: "Beni Suef" },
  { ar: "المنيا", en: "Minya" },
  { ar: "أسيوط", en: "Asyut" },
  { ar: "سوهاج", en: "Sohag" },
  { ar: "قنا", en: "Qena" },
  { ar: "الأقصر", en: "Luxor" },
  { ar: "أسوان", en: "Aswan" },
  { ar: "البحر الأحمر", en: "Red Sea" },
  { ar: "الوادي الجديد", en: "New Valley" },
  { ar: "مطروح", en: "Matruh" },
];

/**
 * Returns the localized governorate name (Arabic or English)
 * matching either "القاهرة" or "Cairo".
 */
export function formatGovernorate(govName: string | null | undefined, isArabic: boolean): string {
  if (!govName) return isArabic ? "غير محدد" : "Not specified";

  const trimmed = govName.trim();
  const found = EGYPT_GOVERNORATES.find(
    (g) =>
      g.ar === trimmed ||
      g.en.toLowerCase() === trimmed.toLowerCase()
  );

  if (!found) return govName;
  return isArabic ? found.ar : found.en;
}

/**
 * Finds matching pair for a governorate string.
 */
export function findGovernoratePair(val: string | null | undefined): Governorate | undefined {
  if (!val) return undefined;
  const trimmed = val.trim();
  return EGYPT_GOVERNORATES.find(
    (g) => g.ar === trimmed || g.en.toLowerCase() === trimmed.toLowerCase()
  );
}
