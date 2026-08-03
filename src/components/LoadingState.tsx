export default function LoadingState({ label = 'Gathering the morning light…' }: { label?: string }) {
  return (
    <div className="flex min-h-[45vh] flex-col items-center justify-center gap-4" role="status" style={{ color: 'var(--ink-3)' }}>
      <div className="relative h-10 w-10">
        <span className="absolute inset-0 rounded-full border" style={{ borderColor: 'rgba(217,164,65,.3)' }} />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: 'var(--gold)' }} />
        <span className="absolute inset-[14px] rounded-full" style={{ background: 'var(--moss)' }} />
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em]">{label}</p>
    </div>
  );
}
