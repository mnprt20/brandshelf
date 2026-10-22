export function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
    minimumFractionDigits: 0
  }).format(rupees);
}

export function parseRupeesToPaise(rupeesInput: string | number): number {
  const num = typeof rupeesInput === 'number' ? rupeesInput : parseFloat(rupeesInput);
  if (isNaN(num) || num < 0) return 0;
  return Math.round(num * 100);
}
