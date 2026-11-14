export function formatCurrency(value, currency = "CAD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(value) || 0);
}
