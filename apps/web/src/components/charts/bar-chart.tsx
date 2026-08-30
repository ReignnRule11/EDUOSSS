interface SeriesItem {
  label: string;
  value: number;
}

export function BarChart({
  data,
  valueKey,
}: {
  data: SeriesItem[];
  valueKey?: string;
}) {
  if (data.length === 0)
    return <p className="text-sm text-muted-foreground">No data.</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-1">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2 text-xs">
          <span className="w-20 shrink-0 truncate text-muted-foreground">
            {d.label}
          </span>
          <div className="h-4 flex-1 overflow-hidden rounded bg-muted/40">
            <div
              className="h-full rounded bg-primary/70"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="w-14 shrink-0 text-right font-medium">
            {d.value.toLocaleString()}
          </span>
        </div>
      ))}
      {valueKey && <p className="text-xs text-muted-foreground">{valueKey}</p>}
    </div>
  );
}
