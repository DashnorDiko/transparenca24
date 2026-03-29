import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format amount in Albanian Lek, with locale-aware suffix */
export function formatLek(amount: number, locale: "sq" | "en" = "sq"): string {
  const formatted = new Intl.NumberFormat(locale === "sq" ? "sq-AL" : "en-GB", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return locale === "sq" ? `${formatted} Lek` : `${formatted} ALL`;
}
