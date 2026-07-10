import { Link } from "react-router-dom";
import {
    Calendar,
    ClipboardList,
    Layers,
    UserRound,
    Building2,
} from "lucide-react";

function JobCard({
    job,
    statuses,
    status,
    assignedName,
    jobResource,
    jobType,
    updateJobStatus,
    workspaceId,
}) {
    return (
        <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <Link
                        to={`/workspaces/${workspaceId}/jobs/${job.id}`}
                        className="text-sm font-black text-slate-950 hover:underline"
                    >
                        {job.job_number || "No Job #"}
                    </Link>

                    <h3 className="mt-1 line-clamp-2 text-base font-black leading-6 text-slate-900">
                        {job.title}
                    </h3>
                </div>

                <PriorityBadge priority={job.priority} />
            </div>

            <p className="mb-4 line-clamp-3 text-sm leading-6 text-slate-500">
                {job.description || "No description added yet."}
            </p>

            <div className="mb-4 space-y-2 text-sm text-slate-600">
                <InfoLine icon={Building2} text={job.client || "No client"} />
                <InfoLine icon={UserRound} text={assignedName || "Unassigned"} />
                <InfoLine icon={ClipboardList} text={jobType || "No type"} />
                <InfoLine icon={Layers} text={jobResource || "No resource"} />
                <InfoLine icon={Calendar} text={formatDate(job.due_date)} />
            </div>

            <div className="mb-4">
                <StatusBadge status={status} statuses={statuses} />
            </div>

            <select
                value={status?.id || ""}
                onChange={(e) => updateJobStatus(job.id, e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none transition focus:border-slate-400 focus:bg-white"
            >
                <option value="" disabled>
                    Missing status
                </option>

                {statuses.map((statusOption) => (
                    <option key={statusOption.id} value={statusOption.id}>
                        {statusOption.name}
                    </option>
                ))}
            </select>
        </article>
    );
}

function InfoLine({ icon: Icon, text }) {
    return (
        <div className="flex items-center gap-2">
            <Icon size={15} className="shrink-0 text-slate-400" />
            <span className="truncate">{text}</span>
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
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${classes}`}
        >
            {status?.name || "Missing Status"}
        </span>
    );
}

function PriorityBadge({ priority }) {
    const priorityStyles = {
        Low: "bg-slate-100 text-slate-600",
        Medium: "bg-blue-100 text-blue-700",
        High: "bg-orange-100 text-orange-700",
        Urgent: "bg-red-100 text-red-700",
    };

    return (
        <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${priorityStyles[priority] || priorityStyles.Medium
                }`}
        >
            {priority || "Medium"}
        </span>
    );
}

function formatDate(value) {
    if (!value) return "No due date";

    return new Date(value + "T00:00:00").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    });
}

export default JobCard;