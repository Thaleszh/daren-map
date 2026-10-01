/** Green when it helped, red when it hurt, faint when it changed nothing. */
export function effectColor(n: number): string {
  return n > 0 ? "#4fb477" : n < 0 ? "#d05a5a" : "#6b7488";
}

/** Signed with a real minus sign: "+2", "−1", "0". */
export function formatEffect(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0";
}
