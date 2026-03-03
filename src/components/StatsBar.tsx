type StatsBarProps = {
  total: number;
  checkedIn: number;
  pending: number;
  checkInRate: number;
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function StatsBar({
  total,
  checkedIn,
  pending,
  checkInRate,
}: StatsBarProps) {
  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total Registered" value={String(total)} />
      <StatCard label="Checked In" value={String(checkedIn)} />
      <StatCard label="Pending" value={String(pending)} />
      <StatCard label="Check-In Rate" value={`${checkInRate}%`} />
    </section>
  );
}
