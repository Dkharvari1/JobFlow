import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    Bell,
    ClipboardList,
    LayoutGrid,
    List,
    Plus,
    Search,
    SlidersHorizontal,
} from "lucide-react";
import JobCard from "../components/JobCard";
import { supabase } from "../lib/supabaseClient";

const priorityOptions = ["All Priorities", "Low", "Medium", "High", "Urgent"];

function Jobs({
    defaultView = "board",
    pageTitle = "Jobs",
    pageDescription = "Track, filter, and update every job in this workspace.",
}) {
    const { workspaceId } = useParams();

    const [jobs, setJobs] = useState([]);
    const [members, setMembers] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [resources, setResources] = useState([]);
    const [jobTypes, setJobTypes] = useState([]);
    const [currentMember, setCurrentMember] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [priorityFilter, setPriorityFilter] = useState("All Priorities");
    const [viewMode, setViewMode] = useState(defaultView);

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        loadJobsPageData();

        const jobsChannel = supabase
            .channel(`jobs-page-${workspaceId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "jobs",
                    filter: `workspace_id=eq.${workspaceId}`,
                },
                () => {
                    loadJobsPageData();
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "job_comments",
                    filter: `workspace_id=eq.${workspaceId}`,
                },
                () => {
                    loadJobsPageData();
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "job_handoffs",
                    filter: `workspace_id=eq.${workspaceId}`,
                },
                () => {
                    loadJobsPageData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(jobsChannel);
        };
    }, [workspaceId]);

    const loadJobsPageData = async () => {
        setLoading(true);
        setErrorMessage("");
        const {
            data: { user },
        } = await supabase.auth.getUser();

        const [
            jobsResponse,
            membersResponse,
            statusesResponse,
            resourcesResponse,
            jobTypesResponse,
        ] = await Promise.all([
            supabase
                .from("jobs")
                .select("*")
                .eq("workspace_id", workspaceId)
                .order("created_at", { ascending: false }),
            supabase
                .from("workspace_members")
                .select("id, user_id, role, custom_role_id")
                .eq("workspace_id", workspaceId),
            supabase
                .from("workspace_job_statuses")
                .select("*")
                .eq("workspace_id", workspaceId)
                .order("position", { ascending: true }),
            supabase
                .from("workspace_job_resources")
                .select("*")
                .eq("workspace_id", workspaceId)
                .order("position", { ascending: true }),
            supabase
                .from("workspace_job_types")
                .select("*")
                .eq("workspace_id", workspaceId)
                .order("position", { ascending: true }),
        ]);

        if (jobsResponse.error) {
            setErrorMessage(jobsResponse.error.message);
            setLoading(false);
            return;
        }

        if (membersResponse.error) {
            setErrorMessage(membersResponse.error.message);
            setLoading(false);
            return;
        }

        if (statusesResponse.error) {
            setErrorMessage(statusesResponse.error.message);
            setLoading(false);
            return;
        }

        if (resourcesResponse.error) {
            setErrorMessage(resourcesResponse.error.message);
            setLoading(false);
            return;
        }

        if (jobTypesResponse.error) {
            setErrorMessage(jobTypesResponse.error.message);
            setLoading(false);
            return;
        }

        const membersData = membersResponse.data || [];
        const userIds = membersData.map((member) => member.user_id);

        setCurrentMember(
            user ? membersData.find((member) => member.user_id === user.id) || null : null
        );

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

        setJobs(jobsResponse.data || []);
        setMembers(membersData);
        setProfiles(profilesData);
        setStatuses(statusesResponse.data || []);
        setResources(resourcesResponse.data || []);
        setJobTypes(jobTypesResponse.data || []);
        setLoading(false);
    };

    const getProfile = (userId) => {
        return profiles.find((profile) => profile.id === userId);
    };

    const getAssignedName = (job) => {
        if (!job.assigned_member_id) return job.assigned_to || "Unassigned";

        const member = members.find(
            (item) => item.id === job.assigned_member_id
        );

        if (!member) return job.assigned_to || "Unassigned";

        const profile = getProfile(member.user_id);

        return profile?.full_name || profile?.email || job.assigned_to || "Unassigned";
    };

    const getOptionByIdOrName = (items, id, savedName) => {
        return (
            items.find((item) => item.id === id) ||
            items.find(
                (item) =>
                    savedName &&
                    item.name.toLowerCase() === savedName.toLowerCase()
            ) ||
            null
        );
    };

    const getJobStatus = (job) => {
        const status = getOptionByIdOrName(statuses, job.status_id, job.status);

        return {
            id: status?.id || job.status_id || job.status || "",
            name: status?.name || job.status || "No Status",
            is_default: status?.is_default || false,
            position: status?.position || 999,
        };
    };

    const getJobResource = (job) => {
        const resource = getOptionByIdOrName(
            resources,
            job.job_resource_id,
            job.job_resource
        );

        return resource?.name || job.job_resource || "No resource";
    };

    const getJobType = (job) => {
        const type = getOptionByIdOrName(jobTypes, job.job_type_id, job.type);

        return type?.name || job.type || "No type";
    };

    const completedStatus = statuses[statuses.length - 1] || null;

    const isCompletedJob = (job) => {
        const status = getJobStatus(job);

        if (completedStatus && status.id === completedStatus.id) return true;

        return ["complete", "completed", "done", "finished"].some((word) =>
            status.name.toLowerCase().includes(word)
        );
    };

    const updateJobStatus = async (jobId, newStatusId) => {
        setErrorMessage("");
        setSuccessMessage("");

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

    const filteredJobs = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();

        return jobs.filter((job) => {
            const assignedName = getAssignedName(job).toLowerCase();
            const status = getJobStatus(job);
            const resource = getJobResource(job);
            const type = getJobType(job);

            const matchesSearch =
                !term ||
                job.job_number?.toLowerCase().includes(term) ||
                job.title?.toLowerCase().includes(term) ||
                job.client?.toLowerCase().includes(term) ||
                job.client_contact?.toLowerCase().includes(term) ||
                job.description?.toLowerCase().includes(term) ||
                status.name.toLowerCase().includes(term) ||
                type.toLowerCase().includes(term) ||
                resource.toLowerCase().includes(term) ||
                assignedName.includes(term);

            const matchesStatus =
                statusFilter === "all" || status.id === statusFilter;

            const matchesPriority =
                priorityFilter === "All Priorities" ||
                job.priority === priorityFilter;

            return matchesSearch && matchesStatus && matchesPriority;
        });
    }, [
        jobs,
        searchTerm,
        statusFilter,
        priorityFilter,
        members,
        profiles,
        statuses,
        resources,
        jobTypes,
    ]);

    const totalJobs = jobs.length;
    const activeJobs = jobs.filter((job) => !isCompletedJob(job)).length;
    const reviewJobs = jobs.filter((job) =>
        getJobStatus(job).name.toLowerCase().includes("review")
    ).length;
    const completedJobs = jobs.filter((job) => isCompletedJob(job)).length;

    const jobsWithUnknownStatus = filteredJobs.filter((job) => {
        const status = getJobStatus(job);
        return !statuses.some((item) => item.id === status.id);
    });

    if (loading) {
        return (
            <div className="mx-auto max-w-7xl">
                <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <p className="text-sm font-bold text-slate-500">
                        Loading jobs...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1600px]">
            <div className="mb-8 flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
                <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
                        Workspace Jobs
                    </p>

                    <h1 className="mt-1 text-4xl font-black text-slate-950">
                        {pageTitle}
                    </h1>

                    <p className="mt-2 max-w-2xl text-slate-500">
                        {pageDescription}
                    </p>
                </div>

                <Link
                    to={`/workspaces/${workspaceId}/jobs/new`}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-300 transition hover:bg-slate-800"
                >
                    <Plus size={18} />
                    Create Job
                </Link>
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

            {statuses.length === 0 && (
                <div className="mb-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm font-bold text-yellow-800">
                    Add job statuses in Workspace Settings so the board can use
                    your custom workflow.
                </div>
            )}

            <div className="mb-6 grid gap-4 md:grid-cols-4">
                <StatCard label="Total Jobs" value={totalJobs} />
                <StatCard label="Active" value={activeJobs} />
                <StatCard label="In Review" value={reviewJobs} />
                <StatCard label="Completed" value={completedJobs} />
            </div>

            <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr_1fr_auto] xl:items-center">
                    <div className="relative">
                        <Search
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            type="text"
                            placeholder="Search by job number, title, client, status, resource, assignee..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                        />
                    </div>

                    <div className="relative">
                        <SlidersHorizontal
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                        >
                            <option value="all">All Statuses</option>

                            {statuses.map((status) => (
                                <option key={status.id} value={status.id}>
                                    {status.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                    >
                        {priorityOptions.map((priority) => (
                            <option key={priority} value={priority}>
                                {priority}
                            </option>
                        ))}
                    </select>

                    <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                        <button
                            type="button"
                            onClick={() => setViewMode("board")}
                            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${viewMode === "board"
                                    ? "bg-slate-950 text-white"
                                    : "text-slate-500 hover:bg-white"
                                }`}
                        >
                            <LayoutGrid size={17} />
                            Board
                        </button>

                        <button
                            type="button"
                            onClick={() => setViewMode("list")}
                            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${viewMode === "list"
                                    ? "bg-slate-950 text-white"
                                    : "text-slate-500 hover:bg-white"
                                }`}
                        >
                            <List size={17} />
                            List
                        </button>
                    </div>
                </div>
            </div>

            {jobs.length === 0 ? (
                <EmptyJobsState workspaceId={workspaceId} />
            ) : filteredJobs.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
                    <Search className="mx-auto mb-4 text-slate-400" size={44} />

                    <h2 className="text-2xl font-black text-slate-950">
                        No matching jobs
                    </h2>

                    <p className="mx-auto mt-2 max-w-lg text-slate-500">
                        Try changing your search, status filter, or priority filter.
                    </p>
                </div>
            ) : viewMode === "board" ? (
                <JobsBoard
                    jobs={filteredJobs}
                    statuses={statuses}
                    unknownStatusJobs={jobsWithUnknownStatus}
                    getAssignedName={getAssignedName}
                    getJobStatus={getJobStatus}
                    getJobResource={getJobResource}
                    getJobType={getJobType}
                    updateJobStatus={updateJobStatus}
                    workspaceId={workspaceId}
                />
            ) : (
                <JobsList
                    jobs={filteredJobs}
                    statuses={statuses}
                    getAssignedName={getAssignedName}
                    getJobStatus={getJobStatus}
                    getJobResource={getJobResource}
                    getJobType={getJobType}
                    updateJobStatus={updateJobStatus}
                    workspaceId={workspaceId}
                />
            )}
        </div>
    );
}

function JobsBoard({
    jobs,
    statuses,
    unknownStatusJobs,
    getAssignedName,
    getJobStatus,
    getJobResource,
    getJobType,
    updateJobStatus,
    workspaceId,
}) {
    return (
        <div className="overflow-x-auto pb-3">
            <div
                className="grid min-w-[1200px] gap-5"
                style={{
                    gridTemplateColumns: `repeat(${Math.max(
                        statuses.length + (unknownStatusJobs.length > 0 ? 1 : 0),
                        1
                    )}, minmax(220px, 1fr))`,
                }}
            >
                {statuses.map((status) => {
                    const columnJobs = jobs.filter(
                        (job) => getJobStatus(job).id === status.id
                    );

                    return (
                        <section
                            key={status.id}
                            className="min-h-[520px] rounded-3xl border border-slate-200 bg-slate-50 p-4"
                        >
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-sm font-black text-slate-800">
                                        {status.name}
                                    </h2>
                                    {status.is_default && (
                                        <p className="mt-1 text-xs font-bold text-slate-400">
                                            Default
                                        </p>
                                    )}
                                </div>

                                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-500">
                                    {columnJobs.length}
                                </span>
                            </div>

                            <div className="space-y-4">
                                {columnJobs.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm font-semibold text-slate-400">
                                        No jobs
                                    </div>
                                ) : (
                                        columnJobs.map((job) => (
                                            <div
                                                key={job.id}
                                                className={
                                                    job.last_activity_at
                                                        ? "rounded-3xl ring-2 ring-blue-100"
                                                        : ""
                                                }
                                            >
                                                <JobUpdateBadge job={job} />

                                                <JobCard
                                                    job={job}
                                                    statuses={statuses}
                                                    status={getJobStatus(job)}
                                                    assignedName={getAssignedName(job)}
                                                    jobResource={getJobResource(job)}
                                                    jobType={getJobType(job)}
                                                    updateJobStatus={updateJobStatus}
                                                    workspaceId={workspaceId}
                                                />
                                            </div>
                                        ))
                                )}
                            </div>
                        </section>
                    );
                })}

                {unknownStatusJobs.length > 0 && (
                    <section className="min-h-[520px] rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-sm font-black text-slate-800">
                                Missing Status
                            </h2>

                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-500">
                                {unknownStatusJobs.length}
                            </span>
                        </div>

                        <div className="space-y-4">
                            {unknownStatusJobs.map((job) => (
                                <JobCard
                                    job={job}
                                    statuses={statuses}
                                    status={getJobStatus(job)}
                                    assignedName={getAssignedName(job)}
                                    jobResource={getJobResource(job)}
                                    jobType={getJobType(job)}
                                    updateJobStatus={updateJobStatus}
                                    workspaceId={workspaceId}
                                />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

function JobsList({
    jobs,
    statuses,
    getAssignedName,
    getJobStatus,
    getJobResource,
    getJobType,
    updateJobStatus,
    workspaceId,
}) {
    return (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-500 md:grid">
                <div>Job</div>
                <div>Client</div>
                <div>Assigned To</div>
                <div>Due Date</div>
                <div>Status</div>
            </div>

            <div className="divide-y divide-slate-100">
                {jobs.map((job) => {
                    const status = getJobStatus(job);

                    return (
                        <div
                            key={job.id}
                            className={`grid gap-4 px-5 py-4 transition hover:bg-slate-50 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] md:items-center ${job.last_activity_at ? "bg-blue-50/40" : ""
                                }`}
                        >
                            <div>
                                <Link
                                    to={`/workspaces/${workspaceId}/jobs/${job.id}`}
                                    className="font-black text-slate-950 hover:underline"
                                >
                                    {job.job_number || "No Job #"} · {job.title}
                                </Link>

                                <p className="mt-1 text-sm text-slate-500">
                                    {getJobType(job)} · {getJobResource(job)}
                                </p>
                                <JobUpdateBadge job={job} compact />
                            </div>

                            <p className="text-sm font-semibold text-slate-700">
                                {job.client || "No client"}
                            </p>

                            <p className="text-sm font-semibold text-slate-700">
                                {getAssignedName(job)}
                            </p>

                            <p className="text-sm font-semibold text-slate-700">
                                {formatDate(job.due_date)}
                            </p>

                            <select
                                value={status.id}
                                onChange={(e) =>
                                    updateJobStatus(job.id, e.target.value)
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-slate-400"
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
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function EmptyJobsState({ workspaceId }) {
    return (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <ClipboardList className="mx-auto mb-4 text-slate-400" size={48} />

            <h2 className="text-2xl font-black text-slate-950">
                No jobs created yet
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-slate-500">
                Start by creating your first job. Once jobs are added, they will
                appear here in a board or list view using your custom workflow.
            </p>

            <Link
                to={`/workspaces/${workspaceId}/jobs/new`}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
                <Plus size={18} />
                Create First Job
            </Link>
        </div>
    );
}

function StatCard({ label, value }) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
        </div>
    );
}

function JobUpdateBadge({ job, compact = false }) {
    if (!job.last_activity_at) return null;

    const label = getActivityLabel(job);

    if (compact) {
        return (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-black text-blue-700">
                <Bell size={12} />
                {label} · {formatActivityTime(job.last_activity_at)}
            </div>
        );
    }

    return (
        <div className="mb-2 flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">
            <Bell size={13} />
            <span>{label}</span>
            <span className="text-blue-400">·</span>
            <span>{formatActivityTime(job.last_activity_at)}</span>
        </div>
    );
}

function getActivityLabel(job) {
    if (job.last_activity_summary) return job.last_activity_summary;

    const typeLabels = {
        comment: "New comment",
        handoff: "Job handed off",
        edit: "Job updated",
        status: "Status updated",
    };

    return typeLabels[job.last_activity_type] || "Job updated";
}

function formatActivityTime(value) {
    if (!value) return "";

    const date = new Date(value);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    });
}

function formatDate(value) {
    if (!value) return "No due date";

    return new Date(value + "T00:00:00").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

export default Jobs;