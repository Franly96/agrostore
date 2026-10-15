export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** Formats a number as Dominican pesos: formatRD(1200) → "RD$ 1,200". */
export function formatRD(amount: number) {
  const n = Number(amount) || 0;
  const fixed = n % 1 === 0 ? n.toFixed(0) : n.toFixed(2);
  const [int, dec] = fixed.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return "RD$ " + (dec ? `${grouped}.${dec}` : grouped);
}

/** Converts integer DOP centavos (as stored in the database) to pesos. */
export function centsToPesos(cents: number) {
  return cents / 100;
}
