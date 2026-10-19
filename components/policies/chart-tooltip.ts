export const TOOLTIP_STYLE = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  color: "var(--popover-foreground)",
  fontSize: 13,
} as const

export function formatRupees(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

/** Compact Indian units for axis ticks: ₹5L, ₹1.2Cr. */
export function formatRupeesShort(n: number): string {
  if (n >= 1e7) return `₹${+(n / 1e7).toFixed(1)}Cr`
  if (n >= 1e5) return `₹${+(n / 1e5).toFixed(1)}L`
  if (n >= 1e3) return `₹${+(n / 1e3).toFixed(0)}k`
  return `₹${n}`
}
