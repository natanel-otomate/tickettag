export function formatId(
  prefix: string,
  sequence: number,
  paddingWidth: number
): string {
  const padded = String(sequence).padStart(paddingWidth, "0");
  return `${prefix}-${padded}`;
}