import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | null | undefined) {
  if (!dateString) return "N/A";
  try {
    return format(parseISO(dateString), "MMM d, yyyy");
  } catch (e) {
    return dateString;
  }
}

export function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
