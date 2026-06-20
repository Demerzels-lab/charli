// components/AgentToolBadge.tsx
'use client';

const TOOL_LABELS: Record<string, string> = {
  intent_classifier: 'Classifying intent',
  lookup_wallet: 'Investigating wallet',
  'lookup_x-account': 'Investigating X account',
  lookup_project: 'Investigating project',
};

type Props = {
  name: string;
  status: 'running' | 'done' | 'failed';
};

export function AgentToolBadge({ name, status }: Props) {
  const label = TOOL_LABELS[name] ?? name;
  const icon = status === 'running' ? '⟳' : status === 'done' ? '✓' : '✗';
  const style =
    status === 'running' ? 'text-[#A07E4A] border-[#A07E4A]/30 bg-[#A07E4A]/5' :
    status === 'done' ? 'text-green-600 border-green-200 bg-green-50' :
    'text-red-600 border-red-200 bg-red-50';

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 border rounded-sm ${style}`}>
      <span>{icon}</span>
      {label}…
    </span>
  );
}
