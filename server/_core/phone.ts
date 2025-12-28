export function normalizePhone(phone: string): string {
  // Keep leading "+" (E.164) and digits; strip common separators.
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  return hasPlus ? `+${digits}` : digits;
}

export function validatePhone(phone: string): string | null {
  const normalized = normalizePhone(phone);
  const digits = normalized.startsWith("+") ? normalized.slice(1) : normalized;
  if (!digits) return "Phone is required.";
  // Conservative bounds: typical phone numbers are 7-15 digits; allow some extension room.
  if (digits.length < 7 || digits.length > 20) return "Phone must be 7–20 digits.";
  if (!/^\+?\d+$/.test(normalized)) return "Phone format is invalid.";
  return null;
}

