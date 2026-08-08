export function cardKey(keyNo: number): string {
  return `REQ-${String(keyNo).padStart(3, "0")}`
}
