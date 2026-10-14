export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatPoints(points: number): string {
  return new Intl.NumberFormat('en-US').format(points);
}

export function maskCardNumber(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length >= 16) {
    return `${digits.slice(0, 4)} •••• •••• ${digits.slice(-4)}`;
  }
  return cardNumber;
}
