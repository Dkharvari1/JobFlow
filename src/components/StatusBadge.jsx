import { statusLabels } from "../data/mockJobs";

const statusStyles = {
    new_job: "bg-slate-100 text-slate-700 border-slate-200",
    in_design: "bg-purple-100 text-purple-700 border-purple-200",
    ready_for_coding: "bg-blue-100 text-blue-700 border-blue-200",
    in_development: "bg-orange-100 text-orange-700 border-orange-200",
    review: "bg-yellow-100 text-yellow-800 border-yellow-200",
    revisions: "bg-red-100 text-red-700 border-red-200",
    completed: "bg-green-100 text-green-700 border-green-200",
};

function StatusBadge({ status }) {
    return (
        <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[status] || statusStyles.new_job
                }`}
        >
            {statusLabels[status] || "Unknown"}
        </span>
    );
}

export default StatusBadge;