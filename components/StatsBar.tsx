const STATS = [
  { value: "92%", label: "Resolution Rate" },
  { value: "Under 5s", label: "Avg Response Time" },
  { value: "24/7", label: "Availability" },
  { value: "10 min", label: "Setup Time" },
] as const;

export default function StatsBar() {
  return (
    <section
      className="border-b border-slate-800 bg-slate-900/50"
      aria-label="Key product metrics"
    >
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:flex sm:flex-row sm:items-stretch sm:justify-between sm:divide-x sm:divide-slate-700/60 sm:gap-0">
          {STATS.map((stat) => (
            <li
              key={stat.label}
              className="flex flex-col items-center text-center sm:flex-1 sm:min-w-0 sm:px-4 md:px-8 first:sm:pl-0 last:sm:pr-0"
            >
              <span className="text-2xl font-bold tabular-nums tracking-tight text-slate-100 sm:text-3xl">
                {stat.value}
              </span>
              <span className="mt-1.5 max-w-[11rem] text-xs text-slate-500 sm:max-w-none sm:text-sm">
                {stat.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
