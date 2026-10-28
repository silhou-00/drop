// Shared class-name helper used by shadcn components: joins conditional classes with
// clsx, then merges Tailwind classes so a later class wins over an earlier conflicting one.
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
