import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    AlertCircle,
    ArrowRight,
    CalendarClock,
    CheckCircle2,
    ClipboardList,
    Clock,
    Layers,
    ListChecks,
    Plus,
    Settings,
    Sparkles,
    UserRound,
    UsersRound,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const statusLabels = {
    new_job: "New Job",
    in_design: "In Design",
    ready_for_coding: "Ready for Coding",
    in_development: "In Development",
    review: "Review",
    revisions: "Revisions",
    completed: "Completed",
};

const statusColumns = [
    "new_job",
    "in_design",
    "ready_for_coding",
    "in_development",
    "review",
    "revisions",
    "completed",
];

const statusStyles = {
    new_job: "bg-slate-100 text-slate-700 border-slate-200",
    in_design: "bg-purple-100 text-purple-700 border-purple-200",
    ready_for_coding: "bg-blue-100 text-blue-700 border-blue-200",
    in_development: "bg-orange-100 text-orange-700 border-orange-200",
    review: "bg-yellow-100 text-yellow-800 border-yellow-200",
    revisions: "bg-red-100 text-red-700 border-red-200",
    completed: "bg-green-100 text-green-700 border-green-200",
};

function Dashboard() {
    const { workspaceId } = useParams();

    const [workspace, setWorkspace] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [members, setMembers] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [currentMember, setCurrentMember] = useState(null);

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        loadDashboardData();
    }, [workspaceId]);

    const loadDashboardData = async () => {
        setLoading(true);
        setErrorMessage("");

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            setErrorMessage("You must be logged in to view this dashboard.");
            setLoading(false);
            return;
        }

        setCurrentUser(user);

        const { data: workspaceData, error: workspaceError } = await supabase
            .from("workspaces")
            .select("*")
            .eq("id", workspaceId)
            .single();

        if (workspaceError) {
            setErrorMessage(workspaceError.message);
            setLoading(false);
            return;
        }

        const { data: membersData, error: membersError } = await supabase
            .from("workspace_members")
            .select("id, user_id, role, custom_role_id")
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

        const userIds = (membersData || []).map((member) => member.user_id);

        let profilesData = [];

        if (userIds.length > 0) {
            const { data, error: profilesError } = await supabase
                .from("profiles")
                .select("id, full_name, email")
                .in("id", userIds);

            if (profilesError) {
                setErrorMessage(profilesError.message);
                setLoading(false);
                return;
            }

            profilesData = data || [];
        }

        const { data: jobsData, error: jobsError } = await supabase
            .from("jobs")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("created_at", { ascending: false });

        if (jobsError) {
            setErrorMessage(jobsError.message);
            setLoading(false);
            return;
        }

        setWorkspace(workspaceData);
        setMembers(membersData || []);
        setProfiles(profilesData);
        setCurrentMember(currentMembership || null);
        setJobs(jobsData || []);
        setLoading(false);
    };

    const canManageWorkspace =
        currentMember?.role === "owner" || currentMember?.role === "admin";

    const getProfile = (userId) => {
        return profiles.find((profile) => profile.id === userId);
    };

    const getMemberName = (memberId, fallbackName = "Unassigned") => {
        if (!memberId) return fallbackName || "Unassigned";

        const member = members.find((item) => item.id === memberId);

        if (!member) return fallbackName || "Unassigned";

        const profile = getProfile(member.user_id);

        return profile?.full_name || profile?.email || fallbackName || "Unassigned";
    };

    const updateJobStatus = async (jobId, newStatus) => {
        setErrorMessage("");
        setSuccessMessage("");

        const { error } = await supabase
            .from("jobs")
            .update({
                status: newStatus,
                updated_at: new Date().toISOString(),
            })
            .eq("id", jobId)
            .eq("workspace_id", workspaceId);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setJobs((prevJobs) =>
            prevJobs.map((job) =>
                job.id === jobId
                    ? {
                        ...job,
                        status: newStatus,
                        updated_at: new Date().toISOString(),
                    }
                    : job
            )
        );

        setSuccessMessage("Job status updated.");
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    const activeJobs = jobs.filter((job) => job.status !== "completed");
    const completedJobs = jobs.filter((job) => job.status === "completed");
    const reviewJobs = jobs.filter((job) => job.status === "review");
    const revisionJobs = jobs.filter((job) => job.status === "revisions");

    const overdueJobs = activeJobs.filter((job) => {
        if (!job.due_date) return false;

        const dueDate = new Date(job.due_date + "T00:00:00");
        return dueDate < today;
    });

    const dueSoonJobs = activeJobs.filter((job) => {
        if (!job.due_date) return false;

        const dueDate = new Date(job.due_date + "T00:00:00");
        return dueDate >= today && dueDate <= sevenDaysFromNow;
    });

    const myJobs = currentMember
        ? activeJobs.filter((job) => job.assigned_member_id === currentMember.id)
        : [];

    const highPriorityJobs = activeJobs.filter(
        (job) => job.priority === "High" || job.priority === "Urgent"
    );

    const recentJobs = jobs.slice(0, 6);

    const pipelineCounts = useMemo(() => {
        return statusColumns.map((status) => ({
            status,
            label: statusLabels[status],
            count: jobs.filter((job) => job.status === status).length,
        }));
    }, [jobs]);

    const completionPercent =
        jobs.length === 0 ? 0 : Math.round((completedJobs.length / jobs.length) * 100);

    const nextBestAction = getNextBestAction({
        jobs,
        overdueJobs,
        dueSoonJobs,
        reviewJobs,
        revisionJobs,
        myJobs,
    });

    if (loading) {
        return (
            <div className="mx-auto max-w-7xl">
                <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <p className="text-sm font-bold text-slate-500">
                        Loading dashboard...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1500px]">
            <div className="mb-8 flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
                <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
                        Dashboard
                    </p>

                    <h1 className="mt-1 text-4xl font-black text-slate-950">
                        {workspace?.name || "Workspace"} Overview
                    </h1>

                    <p className="mt-2 max-w-2xl text-slate-500">
                        See what needs attention, what is assigned to you, and
                        how work is moving through the pipeline.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Link
                        to={`/workspaces/${workspaceId}/jobs/new`}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-300 transition hover:bg-slate-800"
                    >
                        <Plus size={18} />
                        Create Job
                    </Link>

                    <Link
                        to={`/workspaces/${workspaceId}/jobs`}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                    >
                        <ClipboardList size={18} />
                        View Jobs
                    </Link>

                    {canManageWorkspace && (
                        <Link
                            to={`/workspaces/${workspaceId}/settings`}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                        >
                            <Settings size={18} />
                            Settings
                        </Link>
                    )}
                </div>
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

            {jobs.length === 0 ? (
                <EmptyDashboard workspaceId={workspaceId} canManageWorkspace={canManageWorkspace} />
            ) : (
                <>
                    <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                                    <Sparkles size={22} />
                                </div>

                                <div>
                                    <h2 className="text-xl font-black text-slate-950">
                                        Recommended Next Step
                                    </h2>
                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        {nextBestAction.message}
                                    </p>
                                </div>
                            </div>

                            <Link
                                to={`/workspaces/${workspaceId}/${nextBestAction.link}`}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                            >
                                {nextBestAction.buttonText}
                                <ArrowRight size={17} />
                            </Link>
                        </div>
                    </div>

                    <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                        <StatCard
                            label="Total Jobs"
                            value={jobs.length}
                            icon={ClipboardList}
                            description="All jobs in this workspace"
                        />

                        <StatCard
                            label="Active"
                            value={activeJobs.length}
                            icon={Clock}
                            description="Not completed yet"
                        />

                        <StatCard
                            label="My Jobs"
                            value={myJobs.length}
                            icon={UserRound}
                            description="Assigned to you"
                        />

                        <StatCard
                            label="Due Soon"
                            value={dueSoonJobs.length}
                            icon={CalendarClock}
                            description="Due within 7 days"
                        />

                        <StatCard
                            label="In Review"
                            value={reviewJobs.length}
                            icon={AlertCircle}
                            description="Waiting for approval"
                        />

                        <StatCard
                            label="Completed"
                            value={`${completionPercent}%`}
                            icon={CheckCircle2}
                            description={`${completedJobs.length} finished`}
                        />
                    </div>

                    <div className="mb-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
                        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-5 flex items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-black text-slate-950">
                                        Pipeline Progress
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        A quick look at where jobs are sitting right now.
                                    </p>
                                </div>

                                <Link
                                    to={`/workspaces/${workspaceId}/progress`}
                                    className="text-sm font-black text-slate-700 hover:underline"
                                >
                                    View list
                                </Link>
                            </div>

                            <div className="space-y-4">
                                {pipelineCounts.map((item) => {
                                    const percent =
                                        jobs.length === 0
                                            ? 0
                                            : Math.round((item.count / jobs.length) * 100);

                                    return (
                                        <div key={item.status}>
                                            <div className="mb-2 flex items-center justify-between text-sm">
                                                <span className="font-bold text-slate-700">
                                                    {item.label}
                                                </span>
                                                <span className="font-black text-slate-950">
                                                    {item.count}
                                                </span>
                                            </div>

                                            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className="h-full rounded-full bg-slate-950 transition-all"
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
                            <div className="mb-5 flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                                    <UsersRound size={22} />
                                </div>

                                <div>
                                    <h2 className="text-xl font-black">
                                        Workspace Team
                                    </h2>
                                    <p className="text-sm text-slate-400">
                                        {members.length} people in this workspace
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {members.slice(0, 5).map((member) => {
                                    const profile = getProfile(member.user_id);

                                    return (
                                        <div
                                            key={member.id}
                                            className="flex items-center justify-between rounded-2xl bg-white/10 p-3"
                                        >
                                            <div>
                                                <p className="text-sm font-black">
                                                    {profile?.full_name ||
                                                        profile?.email ||
                                                        "Unnamed User"}
                                                </p>
                                                <p className="text-xs capitalize text-slate-400">
                                                    {member.role}
                                                </p>
                                            </div>

                                            {member.user_id === currentUser?.id && (
                                                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-950">
                                                    You
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <Link
                                to={`/workspaces/${workspaceId}/team`}
                                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-200"
                            >
                                View Team Members
                                <ArrowRight size={17} />
                            </Link>
                        </div>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-3">
                        <DashboardPanel
                            title="My Assigned Jobs"
                            description="Jobs currently assigned to you."
                            linkText="View all jobs"
                            linkTo={`/workspaces/${workspaceId}/jobs`}
                        >
                            <JobList
                                jobs={myJobs.slice(0, 5)}
                                workspaceId={workspaceId}
                                emptyText="You do not have any active jobs assigned to you."
                                getAssignedName={getMemberName}
                                updateJobStatus={updateJobStatus}
                            />
                        </DashboardPanel>

                        <DashboardPanel
                            title="Needs Attention"
                            description="Overdue, urgent, or waiting on review."
                            linkText="Open progress"
                            linkTo={`/workspaces/${workspaceId}/progress`}
                        >
                            <JobList
                                jobs={[
                                    ...overdueJobs,
                                    ...highPriorityJobs,
                                    ...reviewJobs,
                                    ...revisionJobs,
                                ]
                                    .filter(
                                        (job, index, array) =>
                                            array.findIndex((item) => item.id === job.id) ===
                                            index
                                    )
                                    .slice(0, 5)}
                                workspaceId={workspaceId}
                                emptyText="Nothing urgent right now."
                                getAssignedName={getMemberName}
                                updateJobStatus={updateJobStatus}
                                highlightOverdue
                            />
                        </DashboardPanel>

                        <DashboardPanel
                            title="Recent Jobs"
                            description="Latest jobs added to this workspace."
                            linkText="View all"
                            linkTo={`/workspaces/${workspaceId}/jobs`}
                        >
                            <JobList
                                jobs={recentJobs}
                                workspaceId={workspaceId}
                                emptyText="No recent jobs yet."
                                getAssignedName={getMemberName}
                                updateJobStatus={updateJobStatus}
                            />
                        </DashboardPanel>
                    </div>
                </>
            )}
        </div>
    );
}

function EmptyDashboard({ workspaceId, canManageWorkspace }) {
    return (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-600">
                <ClipboardList size={34} />
            </div>

            <h2 className="text-3xl font-black text-slate-950">
                This workspace is ready
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-slate-500">
                Create the first job or invite your team so everyone can start
                tracking requests, progress, reviews, and completed work.
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                    to={`/workspaces/${workspaceId}/jobs/new`}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                >
                    <Plus size={18} />
                    Create First Job
                </Link>

                {canManageWorkspace && (
                    <Link
                        to={`/workspaces/${workspaceId}/team`}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                    >
                        <UsersRound size={18} />
                        Invite Team
                    </Link>
                )}
            </div>
        </div>
    );
}

function DashboardPanel({ title, description, linkText, linkTo, children }) {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black text-slate-950">
                        {title}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        {description}
                    </p>
                </div>

                <Link
                    to={linkTo}
                    className="shrink-0 text-sm font-black text-slate-700 hover:underline"
                >
                    {linkText}
                </Link>
            </div>

            {children}
        </section>
    );
}

function JobList({
    jobs,
    workspaceId,
    emptyText,
    getAssignedName,
    updateJobStatus,
    highlightOverdue = false,
}) {
    if (jobs.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-400">
                {emptyText}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {jobs.map((job) => {
                const isOverdue = isJobOverdue(job);

                return (
                    <div
                        key={job.id}
                        className={`rounded-2xl border p-4 transition hover:bg-slate-50 ${highlightOverdue && isOverdue
                                ? "border-red-200 bg-red-50"
                                : "border-slate-100 bg-white"
                            }`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <Link
                                    to={`/workspaces/${workspaceId}/jobs/${job.id}`}
                                    className="font-black text-slate-950 hover:underline"
                                >
                                    {job.job_number || "No Job #"} · {job.title}
                                </Link>

                                <p className="mt-1 text-sm text-slate-500">
                                    {job.client || "No client"} ·{" "}
                                    {job.job_resource || "No resource"}
                                </p>

                                <p className="mt-1 text-xs font-semibold text-slate-400">
                                    Assigned to{" "}
                                    {getAssignedName(
                                        job.assigned_member_id,
                                        job.assigned_to || "Unassigned"
                                    )}{" "}
                                    · Due {formatDate(job.due_date)}
                                </p>
                            </div>

                            <StatusBadge status={job.status} />
                        </div>

                        <div className="mt-3">
                            <select
                                value={job.status}
                                onChange={(e) =>
                                    updateJobStatus(job.id, e.target.value)
                                }
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none transition focus:border-slate-400 focus:bg-white"
                            >
                                {statusColumns.map((status) => (
                                    <option key={status} value={status}>
                                        {statusLabels[status]}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function StatCard({ label, value, icon: Icon, description }) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Icon size={22} />
            </div>

            <p className="text-sm font-bold text-slate-500">{label}</p>

            <h2 className="mt-2 text-3xl font-black text-slate-950">
                {value}
            </h2>

            <p className="mt-2 text-xs leading-5 text-slate-400">
                {description}
            </p>
        </div>
    );
}

function StatusBadge({ status }) {
    return (
        <span
            className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-black ${statusStyles[status] || statusStyles.new_job
                }`}
        >
            {statusLabels[status] || "Unknown"}
        </span>
    );
}

function getNextBestAction({
    jobs,
    overdueJobs,
    dueSoonJobs,
    reviewJobs,
    revisionJobs,
    myJobs,
}) {
    if (overdueJobs.length > 0) {
        return {
            message: `${overdueJobs.length} job${overdueJobs.length === 1 ? " is" : "s are"
                } overdue. Open the progress list and update the status or due date.`,
            buttonText: "Review Overdue Jobs",
            link: "progress",
        };
    }

    if (reviewJobs.length > 0) {
        return {
            message: `${reviewJobs.length} job${reviewJobs.length === 1 ? " is" : "s are"
                } waiting for review. Check them so work can keep moving.`,
            buttonText: "Open Review Jobs",
            link: "progress",
        };
    }

    if (revisionJobs.length > 0) {
        return {
            message: `${revisionJobs.length} job${revisionJobs.length === 1 ? " needs" : "s need"
                } revisions. These should be handled before new work piles up.`,
            buttonText: "View Revisions",
            link: "progress",
        };
    }

    if (myJobs.length > 0) {
        return {
            message: `You have ${myJobs.length} active job${myJobs.length === 1 ? "" : "s"
                } assigned to you. Start with the closest due date.`,
            buttonText: "View My Jobs",
            link: "jobs",
        };
    }

    if (dueSoonJobs.length > 0) {
        return {
            message: `${dueSoonJobs.length} job${dueSoonJobs.length === 1 ? " is" : "s are"
                } due soon. Review them before they become overdue.`,
            buttonText: "View Due Soon",
            link: "progress",
        };
    }

    if (jobs.length > 0) {
        return {
            message:
                "Everything looks organized. Check the job board to keep work moving through the pipeline.",
            buttonText: "Open Job Board",
            link: "jobs",
        };
    }

    return {
        message:
            "Create your first job to start building your workspace dashboard.",
        buttonText: "Create Job",
        link: "jobs/new",
    };
}

function isJobOverdue(job) {
    if (!job.due_date || job.status === "completed") return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(job.due_date + "T00:00:00");

    return dueDate < today;
}

function formatDate(value) {
    if (!value) return "No due date";

    return new Date(value + "T00:00:00").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    });
}

export default Dashboard;