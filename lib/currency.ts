const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function formatNaira(value: number) {
  return nairaFormatter.format(Number.isFinite(value) ? value : 0);
}
