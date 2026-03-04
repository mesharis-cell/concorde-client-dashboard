import CheckInButton from "./CheckInButton";
import { DashboardUser, extractFormValue } from "../lib/api";

type UsersTableProps = {
  users: DashboardUser[];
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  loading: boolean;
  checkInInProgressUserId: string | null;
  onEdit: (user: DashboardUser) => void;
  onCheckIn: (userId: string) => Promise<void>;
  onPrevPage: () => void;
  onNextPage: () => void;
};

function formatTimestamp(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
}

function buildDisplayName(user: DashboardUser): string {
  const firstName = extractFormValue(user.formResponses, ["firstName"]);
  const lastName = extractFormValue(user.formResponses, ["lastName"]);
  const fallback = user.email.split("@")[0] || "Attendee";

  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || fallback;
}

function companyName(user: DashboardUser): string {
  return extractFormValue(user.formResponses, ["company"]) || "-";
}

export default function UsersTable({
  users,
  currentPage,
  totalPages,
  totalUsers,
  loading,
  checkInInProgressUserId,
  onEdit,
  onCheckIn,
  onPrevPage,
  onNextPage,
}: UsersTableProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Attendees</h2>
        <span className="text-sm text-slate-500">Total: {totalUsers}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr>
              <th className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-700">
                Name
              </th>
              <th className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-700">
                Email
              </th>
              <th className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-700">
                Company
              </th>
              <th className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-700">
                Registered At
              </th>
              <th className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-700">
                Check-In Status
              </th>
              <th className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isPending = !user.checkedIn;
              return (
                <tr key={user.id}>
                  <td className="border-b border-slate-100 px-3 py-3 text-slate-900">
                    {buildDisplayName(user)}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3 text-slate-700">
                    {user.email}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3 text-slate-700">
                    {companyName(user)}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3 text-slate-700">
                    {formatTimestamp(user.registeredAt)}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    {user.checkedIn ? (
                      <div className="inline-flex flex-col gap-1">
                        <span className="inline-flex w-fit rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                          Checked In
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatTimestamp(user.checkedInAt)}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(user)}
                        disabled={loading}
                        className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Edit
                      </button>

                      {isPending ? (
                        <CheckInButton
                          onClick={() => {
                            void onCheckIn(user.id);
                          }}
                          loading={checkInInProgressUserId === user.id}
                          disabled={loading}
                        />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {users.length === 0 ? (
              <tr>
                <td
                  className="px-3 py-8 text-center text-slate-500"
                  colSpan={6}
                >
                  {loading
                    ? "Loading attendees..."
                    : "No attendees found for this filter."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevPage}
          disabled={currentPage <= 1 || loading}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>

        <span className="text-sm text-slate-600">
          Page {currentPage} of {Math.max(totalPages, 1)}
        </span>

        <button
          type="button"
          onClick={onNextPage}
          disabled={currentPage >= totalPages || loading || totalPages === 0}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </section>
  );
}
