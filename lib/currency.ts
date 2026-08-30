const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function formatNaira(value: number) {
  return nairaFormatter.format(Number.isFinite(value) ? value : 0);
}

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function formatUsd(value: number) {
  return usdFormatter.format(Number.isFinite(value) ? value : 0);
}
