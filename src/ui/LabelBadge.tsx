import { labelBadges, type EntryLabel } from '../data/schema';

const TEXT: Record<EntryLabel, string> = {
  evidence: 'Evidence',
  inference: 'Inference',
  'abstract-only': 'Abstract',
};

/** One short badge per claim the label names. Evidence and inference can both show. */
export function LabelBadge({ label }: { label: string }) {
  return (
    <>
      {labelBadges(label).map((badge) => (
        <span key={badge} className="badge" data-label={badge}>
          {TEXT[badge]}
        </span>
      ))}
    </>
  );
}
