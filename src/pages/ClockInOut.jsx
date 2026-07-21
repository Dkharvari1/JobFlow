import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    ArrowLeft,
    BriefcaseBusiness,
    Coffee,
    LogIn,
    LogOut,
    RefreshCcw,
    Save,
    Timer,
    UserRound,
    UsersRound,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

function ClockInOut() {
    const { workspaceId } = useParams();

    const [currentUser, setCurrentUser] = useState(null);
    const [currentMember, setCurrentMember] = useState(null);
    const [members, setMembers] = useState([]);
    const [profiles, setProfiles] = useState([]);

    const [todayEntry, setTodayEntry] = useState(null);
    const [todayBreaks, setTodayBreaks] = useState([]);
    const [teamEntries, setTeamEntries] = useState([]);

    const [beginningStatus, setBeginningStatus] = useState("");
    const [endStatus, setEndStatus] = useState("");

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState("");
    const [savingNotes, setSavingNotes] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const todayDate = getTodayDateValue();

    useEffect(() => {
        loadTimeData();

        const timeChannel = supabase
            .channel(`clock-page-${workspaceId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "workspace_time_entries",
                    filter: `workspace_id=eq.${workspaceId}`,
                },
                () => {
                    loadTimeData({ showLoading: false });
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "workspace_time_breaks",
                    filter: `workspace_id=eq.${workspaceId}`,
                },
                () => {
                    loadTimeData({ showLoading: false });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(timeChannel);
        };
    }, [workspaceId]);

    const loadTimeData = async (options = {}) => {
        const showLoading = options?.showLoading !== false;

        if (showLoading) {
            setLoading(true);
        }

        setErrorMessage("");

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            setErrorMessage("You must be logged in.");
            setLoading(false);
            return;
        }

        setCurrentUser(user);

        const { data: membersData, error: membersError } = await supabase
            .from("workspace_members")
            .select("id, user_id, role, custom_role_id, created_at")
            .eq("workspace_id", workspaceId)
            .order("created_at", { ascending: true });

        if (membersError) {
            setErrorMessage(membersError.message);
            setLoading(false);
            return;
        }

        const currentMembership = (membersData || []).find(
            (member) => member.user_id === user.id
        );

        if (!currentMembership) {
            setErrorMessage("You are not a member of this workspace.");
            setLoading(false);
            return;
        }

        let profilesData = [];
        const userIds = (membersData || []).map((member) => member.user_id);

        if (userIds.length > 0) {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, full_name, email")
                .in("id", userIds);

            if (error) {
                setErrorMessage(error.message);
                setLoading(false);
                return;
            }

            profilesData = data || [];
        }

        const { data: entriesData, error: entriesError } = await supabase
            .from("workspace_time_entries")
            .select("*")
            .eq("workspace_id", workspaceId)
            .eq("work_date", todayDate)
            .order("created_at", { ascending: true });

        if (entriesError) {
            setErrorMessage(entriesError.message);
            setLoading(false);
            return;
        }

        const myEntry =
            (entriesData || []).find(
                (entry) => entry.member_id === currentMembership.id
            ) || null;

        let breaksData = [];

        if (myEntry) {
            const { data, error } = await supabase
                .from("workspace_time_breaks")
                .select("*")
                .eq("workspace_id", workspaceId)
                .eq("time_entry_id", myEntry.id)
                .order("break_start_at", { ascending: true });

            if (error) {
                setErrorMessage(error.message);
                setLoading(false);
                return;
            }

            breaksData = data || [];
        }

        setMembers(membersData || []);
        setProfiles(profilesData);
        setCurrentMember(currentMembership);
        setTeamEntries(entriesData || []);
        setTodayEntry(myEntry);
        setTodayBreaks(breaksData);
        setBeginningStatus(myEntry?.beginning_status || "");
        setEndStatus(myEntry?.end_status || "");
        setLoading(false);
    };

    const canViewTeamEntries =
        currentMember?.role === "owner" || currentMember?.role === "admin";

    const activeBreak = todayBreaks.find((item) => !item.break_end_at);

    const isClockedIn = Boolean(todayEntry?.clock_in_at && !todayEntry?.clock_out_at);
    const isClockedOut = Boolean(todayEntry?.clock_out_at);
    const isOnBreak = Boolean(activeBreak);

    const totalBreakSeconds = useMemo(() => {
        return todayBreaks.reduce((total, item) => {
            const start = item.break_start_at
                ? new Date(item.break_start_at).getTime()
                : null;

            const end = item.break_end_at
                ? new Date(item.break_end_at).getTime()
                : Date.now();

            if (!start || !end) return total;

            return total + Math.max(0, Math.floor((end - start) / 1000));
        }, 0);
    }, [todayBreaks]);

    const totalWorkedSeconds = useMemo(() => {
        if (!todayEntry?.clock_in_at) return 0;

        const start = new Date(todayEntry.clock_in_at).getTime();
        const end = todayEntry.clock_out_at
            ? new Date(todayEntry.clock_out_at).getTime()
            : Date.now();

        const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));

        return Math.max(0, totalSeconds - totalBreakSeconds);
    }, [todayEntry, totalBreakSeconds]);

    const getProfile = (userId) => {
        return profiles.find((profile) => profile.id === userId);
    };

    const getMemberName = (memberId) => {
        const member = members.find((item) => item.id === memberId);

        if (!member) return "Unknown User";

        const profile = getProfile(member.user_id);

        return profile?.full_name || profile?.email || "Unnamed User";
    };

    const runClockAction = async (actionName, rpcName) => {
        setActionLoading(actionName);
        setErrorMessage("");
        setSuccessMessage("");

        const { error } = await supabase.rpc(rpcName, {
            workspace_id_input: workspaceId,
            work_date_input: todayDate,
        });

        setActionLoading("");

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setSuccessMessage(`${actionName} saved.`);
        await loadTimeData({ showLoading: false });
    };

    const saveDailyNotes = async () => {
        setSavingNotes(true);
        setErrorMessage("");
        setSuccessMessage("");

        const { error } = await supabase.rpc("update_daily_job_status", {
            workspace_id_input: workspaceId,
            work_date_input: todayDate,
            beginning_status_input: beginningStatus.trim() || null,
            end_status_input: endStatus.trim() || null,
        });

        setSavingNotes(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setSuccessMessage("Daily job status saved.");
        await loadTimeData({ showLoading: false });
    };

    if (loading) {
        return (
            <div className="mx-auto max-w-6xl">
                <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <p className="text-sm font-bold text-slate-500">
                        Loading clock in/out page...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl">
            <div className="mb-6">
                <Link
                    to={`/workspaces/${workspaceId}/dashboard`}
                    className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-950"
                >
                    <ArrowLeft size={17} />
                    Back to dashboard
                </Link>
            </div>

            <div className="mb-8 flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
                <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
                        Time Clock
                    </p>

                    <h1 className="mt-1 text-4xl font-black text-slate-950">
                        Clock In / Clock Out
                    </h1>

                    <p className="mt-2 max-w-2xl text-slate-500">
                        Track your work day, breaks, and beginning/end of day job
                        status notes.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => loadTimeData({ showLoading: false })}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                    <RefreshCcw size={18} />
                    Refresh
                </button>
            </div>

            {errorMessage && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                    {errorMessage}
                </div>
            )}

            {successMessage && (
                <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700">
                    {successMessage}
                </div>
            )}

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-6 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                            <Timer size={24} />
                        </div>

                        <div>
                            <h2 className="text-xl font-black text-slate-950">
                                Today
                            </h2>

                            <p className="text-sm font-semibold text-slate-500">
                                {formatFullDate(todayDate)}
                            </p>
                        </div>
                    </div>

                    <div className="mb-6 grid gap-4 md:grid-cols-3">
                        <StatusCard
                            label="Status"
                            value={getClockStatusLabel({
                                isClockedIn,
                                isClockedOut,
                                isOnBreak,
                            })}
                        />

                        <StatusCard
                            label="Worked Time"
                            value={formatDuration(totalWorkedSeconds)}
                        />

                        <StatusCard
                            label="Break Time"
                            value={formatDuration(totalBreakSeconds)}
                        />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => runClockAction("Clock in", "clock_in")}
                            disabled={
                                actionLoading ||
                                isClockedIn ||
                                isClockedOut
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 py-4 text-sm font-black text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <LogIn size={18} />
                            {actionLoading === "Clock in"
                                ? "Saving..."
                                : "Clock In"}
                        </button>

                        {isOnBreak ? (
                            <button
                                type="button"
                                onClick={() =>
                                    runClockAction("End break", "end_break")
                                }
                                disabled={actionLoading || !isClockedIn}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Coffee size={18} />
                                {actionLoading === "End break"
                                    ? "Saving..."
                                    : "End Break"}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() =>
                                    runClockAction("Start break", "start_break")
                                }
                                disabled={
                                    actionLoading ||
                                    !isClockedIn ||
                                    isClockedOut
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-4 text-sm font-black text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Coffee size={18} />
                                {actionLoading === "Start break"
                                    ? "Saving..."
                                    : "Start Break"}
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => runClockAction("Clock out", "clock_out")}
                            disabled={
                                actionLoading ||
                                !isClockedIn ||
                                isClockedOut
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-4 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2"
                        >
                            <LogOut size={18} />
                            {actionLoading === "Clock out"
                                ? "Saving..."
                                : "Clock Out"}
                        </button>
                    </div>

                    <div className="mt-6 grid gap-4 rounded-3xl bg-slate-50 p-5 md:grid-cols-2">
                        <TimeInfo
                            label="Clock In"
                            value={formatDateTime(todayEntry?.clock_in_at)}
                        />

                        <TimeInfo
                            label="Clock Out"
                            value={formatDateTime(todayEntry?.clock_out_at)}
                        />

                        <TimeInfo
                            label="Breaks Taken"
                            value={todayBreaks.length}
                        />

                        <TimeInfo
                            label="Current Break"
                            value={
                                isOnBreak
                                    ? `Started ${formatDateTime(
                                        activeBreak.break_start_at
                                    )}`
                                    : "Not on break"
                            }
                        />
                    </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                            <BriefcaseBusiness size={23} />
                        </div>

                        <div>
                            <h2 className="text-xl font-black text-slate-950">
                                Daily Job Status
                            </h2>

                            <p className="text-sm text-slate-500">
                                Use these notes for your boss’s morning and end
                                of day updates.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <label className="mb-2 block text-sm font-black text-slate-700">
                                Beginning of Day Job Status
                            </label>

                            <textarea
                                value={beginningStatus}
                                onChange={(e) =>
                                    setBeginningStatus(e.target.value)
                                }
                                rows="6"
                                placeholder="Example: Today I am working on the Zebra email, HubSpot campaign setup, and website edits for the client..."
                                className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 outline-none transition focus:border-slate-400"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-black text-slate-700">
                                End of Day Job Status
                            </label>

                            <textarea
                                value={endStatus}
                                onChange={(e) => setEndStatus(e.target.value)}
                                rows="6"
                                placeholder="Example: Completed the email layout, fixed mobile responsiveness, waiting on final client approval..."
                                className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 outline-none transition focus:border-slate-400"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={saveDailyNotes}
                            disabled={savingNotes}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Save size={18} />
                            {savingNotes ? "Saving..." : "Save Daily Status"}
                        </button>
                    </div>
                </section>
            </div>

            {canViewTeamEntries && (
                <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                            <UsersRound size={23} />
                        </div>

                        <div>
                            <h2 className="text-xl font-black text-slate-950">
                                Today’s Team Statuses
                            </h2>

                            <p className="text-sm text-slate-500">
                                Owners and admins can see everyone’s clock status
                                and daily job status notes.
                            </p>
                        </div>
                    </div>

                    {teamEntries.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-400">
                            No one has added a time entry today.
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {teamEntries.map((entry) => (
                                <TeamEntryCard
                                    key={entry.id}
                                    entry={entry}
                                    memberName={getMemberName(entry.member_id)}
                                />
                            ))}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}

function StatusCard({ label, value }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                {label}
            </p>

            <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
        </div>
    );
}

function TimeInfo({ label, value }) {
    return (
        <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                {label}
            </p>

            <p className="mt-1 text-sm font-bold text-slate-800">
                {value || "N/A"}
            </p>
        </div>
    );
}

function TeamEntryCard({ entry, memberName }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-600">
                    <UserRound size={19} />
                </div>

                <div>
                    <p className="font-black text-slate-950">{memberName}</p>
                    <p className="text-xs font-bold text-slate-400">
                        Clock in: {formatDateTime(entry.clock_in_at)} · Clock
                        out: {formatDateTime(entry.clock_out_at)}
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-white p-4">
                    <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">
                        Beginning of Day
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {entry.beginning_status || "No beginning status added."}
                    </p>
                </div>

                <div className="rounded-2xl bg-white p-4">
                    <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-400">
                        End of Day
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {entry.end_status || "No end of day status added."}
                    </p>
                </div>
            </div>
        </div>
    );
}

function getClockStatusLabel({ isClockedIn, isClockedOut, isOnBreak }) {
    if (isClockedOut) return "Clocked Out";
    if (isOnBreak) return "On Break";
    if (isClockedIn) return "Clocked In";
    return "Not Clocked In";
}

function getTodayDateValue() {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localDate = new Date(now.getTime() - offset * 60 * 1000);

    return localDate.toISOString().split("T")[0];
}

function formatFullDate(value) {
    return new Date(value + "T00:00:00").toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

function formatDateTime(value) {
    if (!value) return "N/A";

    return new Date(value).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function formatDuration(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours === 0 && minutes === 0) return "0m";
    if (hours === 0) return `${minutes}m`;

    return `${hours}h ${minutes}m`;
}

export default ClockInOut;