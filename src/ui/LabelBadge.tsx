import { labelBadges, type EntryLabel } from '../data/schema';

const TEXT: Record<EntryLabel, string> = {
  evidence: 'Evidence',
  inference: 'Inference',
  'abstract-only': 'Abstract',
};

/** Myth entries are tradition even when the pack also marks them as evidence. */
export function showsTradition(id: string): boolean {
  return /^m\d+$/.test(id);
}

/** One short badge per claim the label names. Evidence and inference can both show. */
export function LabelBadge({ label, tradition = false }: { label: string; tradition?: boolean }) {
  return (
    <>
      {tradition ? (
        <span className="badge" data-label="tradition">
          Tradition
        </span>
      ) : null}
      {labelBadges(label).map((badge) => (
        <span key={badge} className="badge" data-label={badge}>
          {TEXT[badge]}
        </span>
      ))}
    </>
  );
}
