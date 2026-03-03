import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminEvent,
  AdminUser,
  DashboardUser,
  consumeCheckInByReference,
  exportUsersCsv,
  fetchOverview,
  fetchUsers,
} from "../lib/api";
import StatsBar from "./StatsBar";
import UsersTable from "./UsersTable";

type DashboardProps = {
  apiBaseUrl: string;
  token: string;
  user: AdminUser;
  events: AdminEvent[];
  selectedEventId: string;
  onSelectEvent: (eventId: string) => void;
  onLogout: () => void;
};

const LIMIT = 10;

function selectedEventName(
  events: AdminEvent[],
  selectedEventId: string,
): string {
  return (
    events.find((event) => event.id === selectedEventId)?.name ||
    "No Event Selected"
  );
}

function toCheckInRate(total: number, checkedIn: number): number {
  if (total <= 0) return 0;
  return Math.round((checkedIn / total) * 100);
}

export default function Dashboard({
  apiBaseUrl,
  token,
  user,
  events,
  selectedEventId,
  onSelectEvent,
  onLogout,
}: DashboardProps) {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [checkedIn, setCheckedIn] = useState(0);
  const [error, setError] = useState("");
  const [checkInInProgressUserId, setCheckInInProgressUserId] = useState<
    string | null
  >(null);
  const [exporting, setExporting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const loadData = useCallback(async () => {
    if (!selectedEventId) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [usersResponse, overviewResponse] = await Promise.all([
        fetchUsers(apiBaseUrl, token, {
          eventId: selectedEventId,
          page,
          limit: LIMIT,
          search: searchQuery,
        }),
        fetchOverview(apiBaseUrl, token, selectedEventId),
      ]);

      setUsers(usersResponse.data.items);
      setTotal(usersResponse.data.pagination.total);
      setTotalPages(usersResponse.data.pagination.totalPages);
      setCheckedIn(overviewResponse.data.users.checkedIn);
      setLastUpdated(new Date());
    } catch (loadError: unknown) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Failed to load dashboard data";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, token, selectedEventId, page, searchQuery]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedEventId) return;

    const interval = window.setInterval(() => {
      void loadData();
    }, 20000);

    return () => window.clearInterval(interval);
  }, [loadData, selectedEventId]);

  const pending = Math.max(total - checkedIn, 0);
  const checkInRate = useMemo(
    () => toCheckInRate(total, checkedIn),
    [total, checkedIn],
  );

  const handleManualCheckIn = useCallback(
    async (userId: string) => {
      if (!selectedEventId) return;

      setCheckInInProgressUserId(userId);
      setError("");

      try {
        const reference = `user-${userId}-event-${selectedEventId}`;
        await consumeCheckInByReference(apiBaseUrl, reference);
        await loadData();
      } catch (checkInError: unknown) {
        const message =
          checkInError instanceof Error
            ? checkInError.message
            : "Failed to check attendee in";
        setError(message);
      } finally {
        setCheckInInProgressUserId(null);
      }
    },
    [apiBaseUrl, selectedEventId, loadData],
  );

  const handleExportCsv = useCallback(async () => {
    if (!selectedEventId) return;

    setExporting(true);
    setError("");

    try {
      const blob = await exportUsersCsv(apiBaseUrl, token, selectedEventId);
      const now = new Date();
      const filenameDate = now.toISOString().split("T")[0];
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `black-demo-users-${filenameDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (exportError: unknown) {
      const message =
        exportError instanceof Error
          ? exportError.message
          : "CSV export failed";
      setError(message);
    } finally {
      setExporting(false);
    }
  }, [apiBaseUrl, token, selectedEventId]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1240px] flex-col gap-4 px-4 py-6 lg:px-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Client Dashboard
            </p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">
              {selectedEventName(events, selectedEventId)}
            </h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="text-sm text-slate-600">
              Event
              <select
                value={selectedEventId}
                onChange={(event) => {
                  onSelectEvent(event.target.value);
                  setPage(1);
                }}
                className="mt-1 block min-w-[230px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={exporting || loading}
              className="rounded-lg border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? "Exporting..." : "Export CSV"}
            </button>

            <div className="text-right text-sm text-slate-600">
              <p>
                {user.firstName} {user.lastName}
              </p>
              <button
                type="button"
                onClick={onLogout}
                className="text-xs font-medium uppercase tracking-[0.1em] text-slate-500 hover:text-slate-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <StatsBar
        total={total}
        checkedIn={checkedIn}
        pending={pending}
        checkInRate={checkInRate}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <label className="w-full max-w-md text-sm font-medium text-slate-700">
            Search attendees
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by first name, last name, or email"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
            />
          </label>

          <p className="text-xs text-slate-500">
            Last updated:{" "}
            <span className="font-medium text-slate-700">
              {lastUpdated ? lastUpdated.toLocaleTimeString() : "—"}
            </span>
          </p>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <UsersTable
        users={users}
        currentPage={page}
        totalPages={totalPages}
        totalUsers={total}
        loading={loading}
        checkInInProgressUserId={checkInInProgressUserId}
        onCheckIn={handleManualCheckIn}
        onPrevPage={() => setPage((current) => Math.max(current - 1, 1))}
        onNextPage={() =>
          setPage((current) => Math.min(current + 1, Math.max(totalPages, 1)))
        }
      />

      <footer className="pb-6 pt-1 text-center text-xs text-slate-500">
        Powered by Savvio Concorde
      </footer>
    </div>
  );
}
