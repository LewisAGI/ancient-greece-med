/** Show historical dates as BCE and CE wherever the pack wrote BC or AD. */
export function withEra(text: string): string {
  return text.replace(/\bB(?:\.?\s*C\.?)(?!\w)/g, 'BCE').replace(/\bA(?:\.?\s*D\.?)(?!\w)/g, 'CE');
}
