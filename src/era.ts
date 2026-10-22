/**
 * Show historical dates as BCE and CE wherever the pack wrote BC or AD.
 * `B.C.` and `A.D.` lose their abbreviation dots. A sentence stop after `BC` or `AD` stays.
 */
export function withEra(text: string): string {
  return text
    .replace(/\bB\.\s*C\.?(?!\w)/g, 'BCE')
    .replace(/\bBC(?!\w)/g, 'BCE')
    .replace(/\bA\.\s*D\.?(?!\w)/g, 'CE')
    .replace(/\bAD(?!\w)/g, 'CE');
}
