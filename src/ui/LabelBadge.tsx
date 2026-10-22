import type { EntryLabel } from '../data/schema';

const TEXT: Record<EntryLabel, string> = {
  evidence: 'Evidence',
  inference: 'Inference',
  'abstract-only': 'Abstract only',
};

export function LabelBadge({ label }: { label: EntryLabel }) {
  return (
    <span className="badge" data-label={label}>
      {TEXT[label]}
    </span>
  );
}
