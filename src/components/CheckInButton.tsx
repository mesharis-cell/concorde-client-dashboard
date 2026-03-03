type CheckInButtonProps = {
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
};

export default function CheckInButton({
  disabled,
  loading,
  onClick,
}: CheckInButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="inline-flex items-center justify-center rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Checking In..." : "Check In"}
    </button>
  );
}
