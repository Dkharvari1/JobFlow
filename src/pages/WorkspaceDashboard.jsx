import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    AlertCircle,
    ArrowRight,
    CalendarClock,
    CheckCircle2,
    ClipboardList,
    Clock,
    Plus,
    Settings,
    Sparkles,
    UserRound,
    UsersRound,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

function WorkspaceDashboard() {
    const { workspaceId } = useParams();

    const [workspace, setWorkspace] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [members, setMembers] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [currentMember, setCurrentMember] = useState(null);

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        loadDashboardData();

        const dashboardChannel = supabase
            .channel(`workspace-dashboard-${workspaceId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "jobs",
                    filter: `workspace_id=eq.${workspaceId}`,
                },
                () => {
                    loadDashboardData({ showLoading: false });
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "workspace_job_statuses",
                    filter: `workspace_id=eq.${workspaceId}`,
                },
                () => {
                    loadDashboardData({ showLoading: false });
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "workspace_members",
                    filter: `workspace_id=eq.${workspaceId}`,
                },
                () => {
                    loadDashboardData({ showLoading: false });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(dashboardChannel);
        };
    }, [workspaceId]);

    const loadDashboardData = async (options = {}) => {
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
            setErrorMessage("You must be logged in to view this workspace.");
            setLoading(false);
            return;
        }

        setCurrentUser(user);

        const [
            workspaceResponse,
            membersResponse,
            jobsResponse,
            statusesResponse,
        ] = await Promise.all([
            supabase
                .from("workspaces")
                .select("*")
                .eq("id", workspaceId)
                .single(),
            supabase
                .from("workspace_members")
                .select("id, user_id, role, custom_role_id, created_at")
                .eq("workspace_id", workspaceId)
                .order("created_at", { ascending: true }),
            supabase
                .from("jobs")
                .select("*")
                .eq("workspace_id", workspaceId)
                .order("created_at", { ascending: false }),
            supabase
                .from("workspace_job_statuses")
                .select("*")
                .eq("workspace_id", workspaceId)
                .order("position", { ascending: true }),
        ]);

        if (workspaceResponse.error) {
            setErrorMessage(workspaceResponse.error.message);
            setLoading(false);
            return;
        }

        if (membersResponse.error) {
            setErrorMessage(membersResponse.error.message);
            setLoading(false);
            return;
        }

        if (jobsResponse.error) {
            setErrorMessage(jobsResponse.error.message);
            setLoading(false);
            return;
        }

        if (statusesResponse.error) {
            setErrorMessage(statusesResponse.error.message);
            setLoading(false);
            return;
        }

        const membersData = membersResponse.data || [];
        const currentMembership = membersData.find(
            (member) => member.user_id === user.id
        );

        const userIds = membersData.map((member) => member.user_id);

        let profilesData = [];

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

        setWorkspace(workspaceResponse.data);
        setMembers(membersData);
        setProfiles(profilesData);
        setCurrentMember(currentMembership || null);
        setJobs(jobsResponse.data || []);
        setStatuses(statusesResponse.data || []);
        setLoading(false);
    };

    const canManageWorkspace =
        currentMember?.role === "owner" || currentMember?.role === "admin";

    const isOwnerOrAdmin =
        currentMember?.role === "owner" || currentMember?.role === "admin";

    const canManageJob = (job) => {
        if (!job || !currentMember) return false;

        return isOwnerOrAdmin || job.assigned_member_id === currentMember.id;
    };

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

    const getJobStatus = (job) => {
        const status =
            statuses.find((item) => item.id === job.status_id) ||
            statuses.find(
                (item) =>
                    job.status &&
                    item.name.toLowerCase() === job.status.toLowerCase()
            );

        return {
            id: status?.id || job.status_id || job.status || "",
            name: status?.name || job.status || "No Status",
            is_default: status?.is_default || false,
            position: status?.position || 999,
        };
    };

    const pipelineStatuses = useMemo(() => {
        if (statuses.length > 0) return statuses;

        const savedStatusNames = [];

        jobs.forEach((job) => {
            const savedName = job.status || "No Status";

            if (!savedStatusNames.includes(savedName)) {
                savedStatusNames.push(savedName);
            }
        });

        return savedStatusNames.map((name, index) => ({
            id: name,
            name,
            position: index + 1,
            is_default: index === 0,
        }));
    }, [statuses, jobs]);

    const completedStatus = pipelineStatuses[pipelineStatuses.length - 1] || null;

    const isCompletedJob = (job) => {
        const status = getJobStatus(job);

        if (completedStatus && status.id === completedStatus.id) return true;
        if (completedStatus && status.name === completedStatus.name) return true;

        return ["complete", "completed", "done", "finished"].some((word) =>
            status.name.toLowerCase().includes(word)
        );
    };

    const getDefaultStatus = () => {
        return (
            pipelineStatuses.find((status) => status.is_default) ||
            pipelineStatuses[0] ||
            null
        );
    };

    const updateJobStatus = async (jobId, newStatusId) => {
        setErrorMessage("");
        setSuccessMessage("");

        const jobToUpdate = jobs.find((job) => job.id === jobId);

        if (!canManageJob(jobToUpdate)) {
            setErrorMessage(
                "Only the assigned person, an admin, or the owner can update this job."
            );
            return;
        }

        const selectedStatus = statuses.find((status) => status.id === newStatusId);

        if (!selectedStatus) {
            setErrorMessage("That status no longer exists.");
            return;
        }

        const activityAt = new Date().toISOString();

        const { error } = await supabase
            .from("jobs")
            .update({
                status_id: selectedStatus.id,
                status: selectedStatus.name,
                updated_at: activityAt,
                last_activity_at: activityAt,
                last_activity_type: "status",
                last_activity_summary: `Status changed to ${selectedStatus.name}`,
                last_activity_by_member_id: currentMember?.id || null,
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
                        status_id: selectedStatus.id,
                        status: selectedStatus.name,
                        updated_at: activityAt,
                        last_activity_at: activityAt,
                        last_activity_type: "status",
                        last_activity_summary: `Status changed to ${selectedStatus.name}`,
                        last_activity_by_member_id: currentMember?.id || null,
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

    const activeJobs = jobs.filter((job) => !isCompletedJob(job));
    const completedJobs = jobs.filter((job) => isCompletedJob(job));
    const defaultStatus = getDefaultStatus();

    const highPriorityJobs = activeJobs.filter(
        (job) => job.priority === "High" || job.priority === "Urgent"
    );

    const jobsPastFirstStep = activeJobs.filter((job) => {
        const status = getJobStatus(job);

        if (!defaultStatus) return false;

        return status.id !== defaultStatus.id && status.name !== defaultStatus.name;
    });

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

    const recentJobs = jobs.slice(0, 6);

    const pipelineCounts = useMemo(() => {
        return pipelineStatuses.map((status) => ({
            status,
            label: status.name,
            count: jobs.filter((job) => {
                const jobStatus = getJobStatus(job);

                return (
                    jobStatus.id === status.id ||
                    jobStatus.name.toLowerCase() === status.name.toLowerCase()
                );
            }).length,
        }));
    }, [jobs, pipelineStatuses]);

    const completionPercent =
        jobs.length === 0 ? 0 : Math.round((completedJobs.length / jobs.length) * 100);

    const nextBestAction = getNextBestAction({
        jobs,
        overdueJobs,
        dueSoonJobs,
        highPriorityJobs,
        jobsPastFirstStep,
        myJobs,
        defaultStatus,
    });

    const attentionJobs = [
        ...overdueJobs,
        ...highPriorityJobs,
        ...dueSoonJobs,
        ...jobsPastFirstStep,
    ]
        .filter(
            (job, index, array) =>
                array.findIndex((item) => item.id === job.id) === index
        )
        .slice(0, 5);

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
                        Workspace Dashboard
                    </p>

                    <h1 className="mt-1 text-4xl font-black text-slate-950">
                        {workspace?.name || "Workspace"} Overview
                    </h1>

                    <p className="mt-2 max-w-2xl text-slate-500">
                        See what needs attention, what is assigned to you, and
                        how jobs are moving through your custom workflow.
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

                    <Link
                        to={`/workspaces/${workspaceId}/team`}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                    >
                        <UsersRound size={18} />
                        Team Members
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
                <EmptyDashboard
                    workspaceId={workspaceId}
                    canManageWorkspace={canManageWorkspace}
                />
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
                            description="All jobs in workspace"
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
                                label="High Priority"
                                value={highPriorityJobs.length}
                                icon={AlertCircle}
                                description="High or urgent active jobs"
                            />

                        <StatCard
                            label="Completed"
                            value={`${completionPercent}%`}
                            icon={CheckCircle2}
                            description={`${completedJobs.length} finished`}
                        />
                    </div>

                    <div className="mb-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
                        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-5 flex items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-black text-slate-950">
                                        Pipeline Progress
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        A quick look at where jobs are sitting
                                        in your custom workflow.
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
                                {pipelineCounts.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-400">
                                            Add statuses in Workspace Settings to see your custom workflow here.
                                    </div>
                                ) : (
                                    pipelineCounts.map((item) => {
                                        const percent =
                                            jobs.length === 0
                                                ? 0
                                                : Math.round(
                                                    (item.count / jobs.length) * 100
                                                );

                                        return (
                                            <div key={item.status.id}>
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
                                                        style={{
                                                            width: `${percent}%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </section>

                        <section className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
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
                        </section>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-3">
                        <DashboardPanel
                            title="My Assigned Jobs"
                            description="Jobs currently assigned to you."
                            linkText="View jobs"
                            linkTo={`/workspaces/${workspaceId}/jobs`}
                        >
                            <JobList
                                jobs={myJobs.slice(0, 5)}
                                workspaceId={workspaceId}
                                emptyText="You do not have any active jobs assigned to you."
                                getMemberName={getMemberName}
                                getJobStatus={getJobStatus}
                                statuses={statuses}
                                pipelineStatuses={pipelineStatuses}
                                updateJobStatus={updateJobStatus}
                                canManageJob={canManageJob}
                            />
                        </DashboardPanel>

                        <DashboardPanel
                            title="Needs Attention"
                            description="Overdue, urgent, in review, or needing revisions."
                            linkText="Open progress"
                            linkTo={`/workspaces/${workspaceId}/progress`}
                        >
                            <JobList
                                jobs={attentionJobs}
                                workspaceId={workspaceId}
                                emptyText="Nothing urgent right now."
                                getMemberName={getMemberName}
                                getJobStatus={getJobStatus}
                                statuses={statuses}
                                pipelineStatuses={pipelineStatuses}
                                updateJobStatus={updateJobStatus}
                                highlightOverdue
                                canManageJob={canManageJob}
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
                                getMemberName={getMemberName}
                                getJobStatus={getJobStatus}
                                statuses={statuses}
                                pipelineStatuses={pipelineStatuses}
                                updateJobStatus={updateJobStatus}
                                canManageJob={canManageJob}
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
    getMemberName,
    getJobStatus,
    statuses,
    pipelineStatuses,
    updateJobStatus,
    canManageJob,
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
                const status = getJobStatus(job);

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
                                    {getMemberName(
                                        job.assigned_member_id,
                                        job.assigned_to || "Unassigned"
                                    )}{" "}
                                    · Due {formatDate(job.due_date)}
                                </p>
                            </div>

                            <StatusBadge status={status} statuses={pipelineStatuses} />
                        </div>

                        <div className="mt-3">
                            <select
                                value={status.id}
                                disabled={!canManageJob(job) || statuses.length === 0}
                                onChange={(e) =>
                                    updateJobStatus(job.id, e.target.value)
                                }
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none transition focus:border-slate-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <option value="" disabled>
                                    Missing status
                                </option>

                                {statuses.map((statusOption) => (
                                    <option
                                        key={statusOption.id}
                                        value={statusOption.id}
                                    >
                                        {statusOption.name}
                                    </option>
                                ))}
                            </select>
                            {!canManageJob(job) && (
                                <p className="mt-2 text-xs font-semibold text-slate-400">
                                    Only the assigned person, an admin, or the owner can update this job.
                                </p>
                            )}
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

function StatusBadge({ status, statuses }) {
    const completedStatus = statuses[statuses.length - 1];
    const isCompleted = completedStatus && status?.id === completedStatus.id;
    const isDefault = status?.is_default;

    let classes = "border-slate-200 bg-slate-100 text-slate-700";

    if (isDefault) {
        classes = "border-slate-900 bg-slate-950 text-white";
    }

    if (isCompleted) {
        classes = "border-green-200 bg-green-100 text-green-700";
    }

    return (
        <span
            className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-black ${classes}`}
        >
            {status?.name || "Missing Status"}
        </span>
    );
}

function getNextBestAction({
    jobs,
    overdueJobs,
    dueSoonJobs,
    highPriorityJobs,
    jobsPastFirstStep,
    myJobs,
    defaultStatus,
}) {
    if (overdueJobs.length > 0) {
        return {
            message: `${overdueJobs.length} job${overdueJobs.length === 1 ? " is" : "s are"
                } overdue. Open the progress list and update the status or due date.`,
            buttonText: "Review Overdue Jobs",
            link: "progress",
        };
    }

    if (highPriorityJobs.length > 0) {
        return {
            message: `${highPriorityJobs.length} high-priority job${highPriorityJobs.length === 1 ? " needs" : "s need"
                } attention. Check these before lower-priority work.`,
            buttonText: "View Priority Jobs",
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

    if (jobsPastFirstStep.length > 0) {
        return {
            message: `${jobsPastFirstStep.length} active job${jobsPastFirstStep.length === 1 ? " has" : "s have"
                } moved beyond ${defaultStatus?.name || "the first step"
                }. Check the workflow and keep them moving.`,
            buttonText: "Open Workflow",
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
    if (!job.due_date) return false;

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

export default WorkspaceDashboard;