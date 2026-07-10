import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    ArrowRight,
    Bell,
    Building2,
    Calendar,
    ClipboardList,
    Edit3,
    History,
    Layers,
    MessageSquare,
    Save,
    Send,
    Trash2,
    UserRound,
    X,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const priorityOptions = ["Low", "Medium", "High", "Urgent"];

function JobDetails() {
    const { workspaceId, id } = useParams();
    const navigate = useNavigate();

    const [currentUser, setCurrentUser] = useState(null);
    const [currentMember, setCurrentMember] = useState(null);

    const [job, setJob] = useState(null);
    const [members, setMembers] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [resources, setResources] = useState([]);
    const [jobTypes, setJobTypes] = useState([]);
    const [handoffs, setHandoffs] = useState([]);
    const [comments, setComments] = useState([]);

    const [newComment, setNewComment] = useState("");

    const [formData, setFormData] = useState({
        job_number: "",
        title: "",
        client: "",
        client_contact: "",
        description: "",
        status_id: "",
        job_type_id: "",
        job_resource_id: "",
        priority: "Medium",
        assigned_member_id: "",
        due_date: "",
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [postingComment, setPostingComment] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [showPassModal, setShowPassModal] = useState(false);
    const [handoffTargetMemberId, setHandoffTargetMemberId] = useState("");
    const [handoffStatusId, setHandoffStatusId] = useState("");
    const [handoffNote, setHandoffNote] = useState("");
    const [passingJob, setPassingJob] = useState(false);

    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        loadJobDetails();
    }, [workspaceId, id]);

    const loadJobDetails = async () => {
        setLoading(true);
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

        const [
            jobResponse,
            membersResponse,
            statusesResponse,
            resourcesResponse,
            jobTypesResponse,
            handoffsResponse,
            commentsResponse,
        ] = await Promise.all([
            supabase
                .from("jobs")
                .select("*")
                .eq("id", id)
                .eq("workspace_id", workspaceId)
                .single(),
            supabase
                .from("workspace_members")
                .select("id, user_id, role, custom_role_id")
                .eq("workspace_id", workspaceId)
                .order("created_at", { ascending: true }),
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
            supabase
                .from("job_handoffs")
                .select("*")
                .eq("workspace_id", workspaceId)
                .eq("job_id", id)
                .order("created_at", { ascending: false }),
            supabase
                .from("job_comments")
                .select("*")
                .eq("workspace_id", workspaceId)
                .eq("job_id", id)
                .order("created_at", { ascending: true }),
        ]);

        if (jobResponse.error) {
            setErrorMessage(jobResponse.error.message);
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

        if (handoffsResponse.error) {
            setErrorMessage(handoffsResponse.error.message);
            setLoading(false);
            return;
        }

        if (commentsResponse.error) {
            setErrorMessage(commentsResponse.error.message);
            setLoading(false);
            return;
        }

        const jobData = jobResponse.data;
        const membersData = membersResponse.data || [];
        const statusesData = statusesResponse.data || [];
        const resourcesData = resourcesResponse.data || [];
        const jobTypesData = jobTypesResponse.data || [];

        const currentMembership = membersData.find(
            (member) => member.user_id === user.id
        );

        let profilesData = [];

        const userIds = membersData.map((member) => member.user_id);

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

        const matchedStatus = findOption(
            statusesData,
            jobData.status_id,
            jobData.status
        );
        const matchedResource = findOption(
            resourcesData,
            jobData.job_resource_id,
            jobData.job_resource
        );
        const matchedType = findOption(
            jobTypesData,
            jobData.job_type_id,
            jobData.type
        );

        setJob(jobData);
        setMembers(membersData);
        setProfiles(profilesData);
        setStatuses(statusesData);
        setResources(resourcesData);
        setJobTypes(jobTypesData);
        setHandoffs(handoffsResponse.data || []);
        setComments(commentsResponse.data || []);
        setCurrentMember(currentMembership || null);

        setFormData({
            job_number: jobData.job_number || "",
            title: jobData.title || "",
            client: jobData.client || "",
            client_contact: jobData.client_contact || "",
            description: jobData.description || "",
            status_id: matchedStatus?.id || "",
            job_type_id: matchedType?.id || "",
            job_resource_id: matchedResource?.id || "",
            priority: jobData.priority || "Medium",
            assigned_member_id: jobData.assigned_member_id || "",
            due_date: jobData.due_date || "",
        });

        setLoading(false);
    };

    const getProfile = (userId) => {
        return profiles.find((profile) => profile.id === userId);
    };

    const getMemberName = (member) => {
        if (!member) return "Unassigned";

        const profile = getProfile(member.user_id);

        return profile?.full_name || profile?.email || "Unnamed User";
    };

    const assignedMember = useMemo(() => {
        if (!formData.assigned_member_id) return null;

        return members.find(
            (member) => member.id === formData.assigned_member_id
        );
    }, [members, formData.assigned_member_id]);

    const assignedName = assignedMember
        ? getMemberName(assignedMember)
        : job?.assigned_to || "Unassigned";

    const currentStatus =
        statuses.find((status) => status.id === formData.status_id) ||
        findOption(statuses, job?.status_id, job?.status);

    const currentResource =
        resources.find((resource) => resource.id === formData.job_resource_id) ||
        findOption(resources, job?.job_resource_id, job?.job_resource);

    const currentType =
        jobTypes.find((type) => type.id === formData.job_type_id) ||
        findOption(jobTypes, job?.job_type_id, job?.type);

    const canPassJob =
        currentMember?.role === "owner" ||
        currentMember?.role === "admin" ||
        job?.assigned_member_id === currentMember?.id;

    const availablePassMembers = members.filter(
        (member) => member.id !== job?.assigned_member_id
    );

    const handoffNotes = useMemo(() => {
        return handoffs.filter(
            (handoff) => handoff.note && handoff.note.trim()
        );
    }, [handoffs]);

    const canDeleteComment = (comment) => {
        return (
            currentMember?.role === "owner" ||
            currentMember?.role === "admin" ||
            comment.member_id === currentMember?.id
        );
    };

    const addComment = async () => {
        const cleanComment = newComment.trim();

        if (!cleanComment || !currentMember) return;

        setPostingComment(true);
        setErrorMessage("");
        setSuccessMessage("");

        const memberName = getMemberName(currentMember);

        const { data, error } = await supabase
            .from("job_comments")
            .insert({
                workspace_id: workspaceId,
                job_id: id,
                member_id: currentMember.id,
                member_name: memberName,
                body: cleanComment,
            })
            .select()
            .single();

        setPostingComment(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setComments((prevComments) => [...prevComments, data]);
        setNewComment("");

        setJob((prevJob) => ({
            ...prevJob,
            last_activity_at: data.created_at || new Date().toISOString(),
            last_activity_type: "comment",
            last_activity_summary: `${memberName} added a comment`,
            last_activity_by_member_id: currentMember.id,
            updated_at: new Date().toISOString(),
        }));
    };

    const deleteComment = async (commentId) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this comment?"
        );

        if (!confirmed) return;

        setErrorMessage("");
        setSuccessMessage("");

        const { error } = await supabase
            .from("job_comments")
            .delete()
            .eq("id", commentId)
            .eq("workspace_id", workspaceId)
            .eq("job_id", id);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setComments((prevComments) =>
            prevComments.filter((comment) => comment.id !== commentId)
        );
    };

    const openPassModal = () => {
        setHandoffTargetMemberId("");
        setHandoffStatusId(currentStatus?.id || "");
        setHandoffNote("");
        setShowPassModal(true);
        setErrorMessage("");
        setSuccessMessage("");
    };

    const closePassModal = () => {
        if (passingJob) return;

        setShowPassModal(false);
        setHandoffTargetMemberId("");
        setHandoffStatusId("");
        setHandoffNote("");
    };

    const passJobToMember = async (e) => {
        e.preventDefault();

        if (!handoffTargetMemberId) {
            setErrorMessage("Choose a team member to pass this job to.");
            return;
        }

        setPassingJob(true);
        setErrorMessage("");
        setSuccessMessage("");

        const { data, error } = await supabase.rpc("pass_job_to_member", {
            workspace_id_input: workspaceId,
            job_id_input: id,
            target_member_id_input: handoffTargetMemberId,
            handoff_note_input: handoffNote.trim() || null,
            new_status_id_input: handoffStatusId || null,
        });

        setPassingJob(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        const updatedJob = Array.isArray(data) ? data[0] : data;

        if (updatedJob) {
            setJob(updatedJob);

            const matchedStatus = findOption(
                statuses,
                updatedJob.status_id,
                updatedJob.status
            );
            const matchedResource = findOption(
                resources,
                updatedJob.job_resource_id,
                updatedJob.job_resource
            );
            const matchedType = findOption(
                jobTypes,
                updatedJob.job_type_id,
                updatedJob.type
            );

            setFormData((prevData) => ({
                ...prevData,
                assigned_member_id: updatedJob.assigned_member_id || "",
                status_id: matchedStatus?.id || "",
                job_type_id: matchedType?.id || "",
                job_resource_id: matchedResource?.id || "",
            }));
        }

        setShowPassModal(false);
        setHandoffTargetMemberId("");
        setHandoffStatusId("");
        setHandoffNote("");
        setSuccessMessage("Job passed to the selected team member.");

        await loadJobDetails();
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const updateStatusOnly = async (newStatusId) => {
        setErrorMessage("");
        setSuccessMessage("");

        const selectedStatus = statuses.find(
            (status) => status.id === newStatusId
        );

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
            .eq("id", id)
            .eq("workspace_id", workspaceId);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setJob((prevJob) => ({
            ...prevJob,
            status_id: selectedStatus.id,
            status: selectedStatus.name,
            updated_at: activityAt,
            last_activity_at: activityAt,
            last_activity_type: "status",
            last_activity_summary: `Status changed to ${selectedStatus.name}`,
            last_activity_by_member_id: currentMember?.id || null,
        }));

        setFormData((prevData) => ({
            ...prevData,
            status_id: selectedStatus.id,
        }));

        setSuccessMessage("Status updated.");
    };

    const handleSave = async (e) => {
        e.preventDefault();

        setSaving(true);
        setErrorMessage("");
        setSuccessMessage("");

        const selectedStatus = statuses.find(
            (status) => status.id === formData.status_id
        );
        const selectedResource = resources.find(
            (resource) => resource.id === formData.job_resource_id
        );
        const selectedType = jobTypes.find(
            (type) => type.id === formData.job_type_id
        );
        const selectedMember = members.find(
            (member) => member.id === formData.assigned_member_id
        );
        const activityAt = new Date().toISOString();

        if (!selectedStatus) {
            setSaving(false);
            setErrorMessage("Please select a valid job status.");
            return;
        }

        const { data, error } = await supabase
            .from("jobs")
            .update({
                job_number: formData.job_number.trim(),
                title: formData.title.trim(),
                client: formData.client.trim(),
                client_contact: formData.client_contact.trim() || null,
                description: formData.description.trim(),
                status_id: selectedStatus.id,
                status: selectedStatus.name,
                job_type_id: selectedType?.id || null,
                type: selectedType?.name || null,
                job_resource_id: selectedResource?.id || null,
                job_resource: selectedResource?.name || null,
                priority: formData.priority,
                assigned_member_id: formData.assigned_member_id || null,
                assigned_to: selectedMember ? getMemberName(selectedMember) : null,
                due_date: formData.due_date || null,
                updated_at: activityAt,
                last_activity_at: activityAt,
                last_activity_type: "edit",
                last_activity_summary: "Job details updated",
                last_activity_by_member_id: currentMember?.id || null,
            })
            .eq("id", id)
            .eq("workspace_id", workspaceId)
            .select()
            .single();

        setSaving(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setJob(data);
        setIsEditing(false);
        setSuccessMessage("Job details saved.");
    };

    const handleCancelEdit = () => {
        if (!job) return;

        const matchedStatus = findOption(statuses, job.status_id, job.status);
        const matchedResource = findOption(
            resources,
            job.job_resource_id,
            job.job_resource
        );
        const matchedType = findOption(jobTypes, job.job_type_id, job.type);

        setFormData({
            job_number: job.job_number || "",
            title: job.title || "",
            client: job.client || "",
            client_contact: job.client_contact || "",
            description: job.description || "",
            status_id: matchedStatus?.id || "",
            job_type_id: matchedType?.id || "",
            job_resource_id: matchedResource?.id || "",
            priority: job.priority || "Medium",
            assigned_member_id: job.assigned_member_id || "",
            due_date: job.due_date || "",
        });

        setIsEditing(false);
        setErrorMessage("");
        setSuccessMessage("");
    };

    const handleDelete = async () => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this job? This cannot be undone."
        );

        if (!confirmed) return;

        setDeleting(true);
        setErrorMessage("");

        const { error } = await supabase
            .from("jobs")
            .delete()
            .eq("id", id)
            .eq("workspace_id", workspaceId);

        setDeleting(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        navigate(`/workspaces/${workspaceId}/jobs`);
    };

    if (loading) {
        return (
            <div className="mx-auto max-w-6xl">
                <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <p className="text-sm font-bold text-slate-500">
                        Loading job details...
                    </p>
                </div>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="mx-auto max-w-6xl">
                <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <h1 className="text-2xl font-black text-slate-950">
                        Job not found
                    </h1>

                    <Link
                        to={`/workspaces/${workspaceId}/jobs`}
                        className="mt-4 inline-block text-sm font-bold text-slate-700 hover:underline"
                    >
                        Back to jobs
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <Link
                    to={`/workspaces/${workspaceId}/jobs`}
                    className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-950"
                >
                    <ArrowLeft size={17} />
                    Back to jobs
                </Link>

                <div className="flex flex-wrap gap-3">
                    {canPassJob && (
                        <button
                            type="button"
                            onClick={openPassModal}
                            className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-100"
                        >
                            <Send size={17} />
                            Pass Job
                        </button>
                    )}

                    {isEditing ? (
                        <>
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                            >
                                <X size={17} />
                                Cancel
                            </button>

                            <button
                                type="submit"
                                form="job-details-form"
                                disabled={saving}
                                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Save size={17} />
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                        >
                            <Edit3 size={17} />
                            Edit Job
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Trash2 size={17} />
                        {deleting ? "Deleting..." : "Delete"}
                    </button>
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

            {job.last_activity_at && (
                <div className="mb-5 rounded-3xl border border-blue-200 bg-blue-50 p-5">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
                            <Bell size={20} />
                        </div>

                        <div>
                            <p className="text-sm font-black uppercase tracking-wide text-blue-700">
                                Latest Job Update
                            </p>

                            <h2 className="mt-1 text-xl font-black text-slate-950">
                                {getActivityLabel(job)}
                            </h2>

                            <p className="mt-1 text-sm font-semibold text-blue-700">
                                {formatDateTime(job.last_activity_at)}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <form
                id="job-details-form"
                onSubmit={handleSave}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
            >
                <div className="mb-8 flex flex-col justify-between gap-5 border-b border-slate-100 pb-8 xl:flex-row xl:items-start">
                    <div>
                        <p className="text-sm font-black uppercase tracking-wide text-slate-500">
                            {formData.job_number || "No Job Number"}
                        </p>

                        {isEditing ? (
                            <div className="mt-3 grid gap-4 md:grid-cols-2">
                                <InputField
                                    label="Job Number"
                                    name="job_number"
                                    value={formData.job_number}
                                    onChange={handleChange}
                                    required
                                />

                                <InputField
                                    label="Job Title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        ) : (
                            <>
                                <h1 className="mt-2 text-4xl font-black text-slate-950">
                                    {job.title}
                                </h1>

                                <p className="mt-3 text-slate-500">
                                    {job.client || "No client added"}
                                </p>
                            </>
                        )}

                        <div className="mt-5 flex flex-wrap gap-3">
                            <StatusBadge
                                status={currentStatus}
                                statuses={statuses}
                            />
                            <PriorityBadge priority={formData.priority} />
                        </div>
                    </div>

                    <div className="w-full xl:w-80">
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                            Update Status
                        </label>

                        <select
                            value={formData.status_id}
                            onChange={(e) => {
                                if (isEditing) {
                                    handleChange(e);
                                } else {
                                    updateStatusOnly(e.target.value);
                                }
                            }}
                            name="status_id"
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-slate-400 focus:bg-white"
                        >
                            <option value="" disabled>
                                Missing status
                            </option>

                            {statuses.map((status) => (
                                <option key={status.id} value={status.id}>
                                    {status.name}
                                </option>
                            ))}
                        </select>

                        <p className="mt-2 text-xs text-slate-500">
                            You can update status without entering edit mode.
                        </p>
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-3">
                    <div className="xl:col-span-2">
                        <SectionTitle
                            title="Job Description"
                            text="Main details about what needs to be completed."
                        />

                        {isEditing ? (
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows="7"
                                required
                                className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 outline-none transition focus:border-slate-400"
                            />
                        ) : (
                            <div className="rounded-3xl bg-slate-50 p-5 text-sm leading-7 text-slate-600">
                                {job.description || "No description added yet."}
                            </div>
                        )}

                        <div className="mt-8">
                            <SectionTitle
                                title="Handoff Notes"
                                text="Notes added when this job was passed from one teammate to another."
                            />

                            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                                {handoffNotes.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-400">
                                        No handoff notes yet.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {handoffNotes.map((handoff) => (
                                            <div
                                                key={`handoff-note-${handoff.id}`}
                                                className="rounded-2xl bg-white p-4 shadow-sm"
                                            >
                                                <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-black text-slate-950">
                                                    <span>{handoff.from_member_name || "Someone"}</span>
                                                    <ArrowRight size={15} className="text-slate-400" />
                                                    <span>{handoff.to_member_name || "Someone"}</span>
                                                </div>

                                                <p className="mb-3 text-xs font-bold text-slate-400">
                                                    {formatDateTime(handoff.created_at)}
                                                    {handoff.status_name_after
                                                        ? ` · Status: ${handoff.status_name_after}`
                                                        : ""}
                                                </p>

                                                <p className="whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                                                    {handoff.note}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-8">
                            <SectionTitle
                                title="Comments"
                                text="Anyone in this workspace can comment on this job, even if it is not assigned to them."
                            />

                            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                                <div className="mb-5">
                                    <textarea
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        rows="4"
                                        placeholder="Add a comment, question, update, or note for the team..."
                                        className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 outline-none transition focus:border-slate-400"
                                    />

                                    <div className="mt-3 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={addComment}
                                            disabled={postingComment || !newComment.trim()}
                                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <MessageSquare size={17} />
                                            {postingComment ? "Posting..." : "Post Comment"}
                                        </button>
                                    </div>
                                </div>

                                {comments.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-400">
                                        No comments yet. Start the conversation.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {comments.map((comment) => (
                                            <div
                                                key={comment.id}
                                                className="rounded-2xl bg-white p-4 shadow-sm"
                                            >
                                                <div className="mb-2 flex items-start justify-between gap-4">
                                                    <div>
                                                        <p className="text-sm font-black text-slate-950">
                                                            {comment.member_name ||
                                                                "Unknown User"}
                                                        </p>

                                                        <p className="text-xs font-bold text-slate-400">
                                                            {formatDateTime(
                                                                comment.created_at
                                                            )}
                                                        </p>
                                                    </div>

                                                    {canDeleteComment(comment) && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                deleteComment(
                                                                    comment.id
                                                                )
                                                            }
                                                            className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    )}
                                                </div>

                                                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">
                                                    {comment.body}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-8">
                            <SectionTitle
                                title="Handoff History"
                                text="See when this job was passed from one person to another."
                            />

                            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                                {handoffs.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-400">
                                        No handoffs yet.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {handoffs.map((handoff) => (
                                            <div
                                                key={handoff.id}
                                                className="rounded-2xl bg-white p-4 shadow-sm"
                                            >
                                                <div className="flex flex-wrap items-center gap-2 text-sm font-black text-slate-950">
                                                    <span>
                                                        {handoff.from_member_name ||
                                                            "Someone"}
                                                    </span>
                                                    <ArrowRight
                                                        size={15}
                                                        className="text-slate-400"
                                                    />
                                                    <span>
                                                        {handoff.to_member_name ||
                                                            "Someone"}
                                                    </span>
                                                </div>

                                                <p className="mt-1 text-xs font-bold text-slate-400">
                                                    {formatDateTime(
                                                        handoff.created_at
                                                    )}
                                                    {handoff.status_name_after
                                                        ? ` · Status: ${handoff.status_name_after}`
                                                        : ""}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <aside className="space-y-5">
                        <div className="rounded-3xl bg-slate-50 p-5">
                            <h2 className="mb-4 text-lg font-black text-slate-950">
                                Job Info
                            </h2>

                            <div className="space-y-5 text-sm">
                                {isEditing ? (
                                    <>
                                        <InputField
                                            label="Client"
                                            name="client"
                                            value={formData.client}
                                            onChange={handleChange}
                                            required
                                        />

                                        <InputField
                                            label="Client Contact"
                                            name="client_contact"
                                            value={formData.client_contact}
                                            onChange={handleChange}
                                        />

                                        <SelectField
                                            label="Job Type"
                                            name="job_type_id"
                                            value={formData.job_type_id}
                                            onChange={handleChange}
                                            options={jobTypes}
                                            emptyText="No job type"
                                        />

                                        <SelectField
                                            label="Job Resource"
                                            name="job_resource_id"
                                            value={formData.job_resource_id}
                                            onChange={handleChange}
                                            options={resources}
                                            emptyText="No resource"
                                        />

                                        <SelectTextField
                                            label="Priority"
                                            name="priority"
                                            value={formData.priority}
                                            onChange={handleChange}
                                            options={priorityOptions}
                                        />

                                        <div>
                                            <label className="mb-2 block text-sm font-bold text-slate-700">
                                                Assign To
                                            </label>

                                            <select
                                                name="assigned_member_id"
                                                value={formData.assigned_member_id}
                                                onChange={handleChange}
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                            >
                                                <option value="">Unassigned</option>

                                                {members.map((member) => (
                                                    <option
                                                        key={member.id}
                                                        value={member.id}
                                                    >
                                                        {getMemberName(member)} ·{" "}
                                                        {member.role}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-bold text-slate-700">
                                                Due Date
                                            </label>

                                            <input
                                                type="date"
                                                name="due_date"
                                                value={formData.due_date}
                                                onChange={handleChange}
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <InfoRow
                                            icon={Building2}
                                            label="Client"
                                            value={job.client || "N/A"}
                                        />

                                        <InfoRow
                                            icon={UserRound}
                                            label="Client Contact"
                                            value={job.client_contact || "N/A"}
                                        />

                                        <InfoRow
                                            icon={ClipboardList}
                                            label="Status"
                                            value={
                                                currentStatus?.name ||
                                                job.status ||
                                                "N/A"
                                            }
                                        />

                                        <InfoRow
                                            icon={ClipboardList}
                                            label="Job Type"
                                            value={
                                                currentType?.name ||
                                                job.type ||
                                                "N/A"
                                            }
                                        />

                                        <InfoRow
                                            icon={Layers}
                                            label="Job Resource"
                                            value={
                                                currentResource?.name ||
                                                job.job_resource ||
                                                "N/A"
                                            }
                                        />

                                        <InfoRow
                                            icon={UserRound}
                                            label="Assigned To"
                                            value={assignedName}
                                        />

                                        <InfoRow
                                            icon={Calendar}
                                            label="Due Date"
                                            value={formatDate(job.due_date)}
                                        />

                                        <InfoRow
                                            icon={MessageSquare}
                                            label="Comments"
                                            value={comments.length}
                                        />

                                        <InfoRow
                                            icon={History}
                                            label="Handoffs"
                                            value={handoffs.length}
                                        />

                                        <InfoRow
                                            label="Created"
                                            value={formatDateTime(job.created_at)}
                                        />

                                        <InfoRow
                                            label="Last Updated"
                                            value={formatDateTime(job.updated_at)}
                                        />

                                        <InfoRow
                                            icon={Bell}
                                            label="Latest Update"
                                            value={
                                                job.last_activity_at
                                                    ? `${getActivityLabel(job)} · ${formatDateTime(job.last_activity_at)}`
                                                    : "No updates yet"
                                            }
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            </form>

            {showPassModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
                    <form
                        onSubmit={passJobToMember}
                        className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl"
                    >
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-black text-slate-950">
                                    Pass Job
                                </h2>

                                <p className="mt-2 text-sm leading-6 text-slate-500">
                                    Pass this job to another team member when
                                    your part is complete. This changes the
                                    assigned person and saves a handoff record.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closePassModal}
                                disabled={passingJob}
                                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="mb-2 block text-sm font-bold text-slate-700">
                                    Pass To
                                </label>

                                <select
                                    value={handoffTargetMemberId}
                                    onChange={(e) =>
                                        setHandoffTargetMemberId(e.target.value)
                                    }
                                    required
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                >
                                    <option value="">Choose a team member</option>

                                    {availablePassMembers.map((member) => (
                                        <option key={member.id} value={member.id}>
                                            {getMemberName(member)} · {member.role}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-bold text-slate-700">
                                    Status After Passing
                                </label>

                                <select
                                    value={handoffStatusId}
                                    onChange={(e) =>
                                        setHandoffStatusId(e.target.value)
                                    }
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                >
                                    <option value="">Keep current status</option>

                                    {statuses.map((status) => (
                                        <option key={status.id} value={status.id}>
                                            {status.name}
                                        </option>
                                    ))}
                                </select>

                                <p className="mt-2 text-xs text-slate-500">
                                    Choose the next workflow step if this handoff
                                    should move the job forward.
                                </p>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-bold text-slate-700">
                                    Handoff Note
                                </label>

                                <textarea
                                    value={handoffNote}
                                    onChange={(e) =>
                                        setHandoffNote(e.target.value)
                                    }
                                    rows="5"
                                    placeholder="Example: I finished the design. Passing to Dev for coding. Files are in the client Google Drive folder."
                                    className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={closePassModal}
                                disabled={passingJob}
                                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={passingJob || !handoffTargetMemberId}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Send size={18} />
                                {passingJob ? "Passing..." : "Pass Job"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

function findOption(items, id, savedName) {
    return (
        items.find((item) => item.id === id) ||
        items.find(
            (item) =>
                savedName && item.name.toLowerCase() === savedName.toLowerCase()
        ) ||
        null
    );
}

function SectionTitle({ title, text }) {
    return (
        <div className="mb-3">
            <h2 className="text-lg font-black text-slate-950">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{text}</p>
        </div>
    );
}

function InputField({ label, name, value, onChange, required = false }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
                {label}
            </label>

            <input
                name={name}
                value={value}
                onChange={onChange}
                required={required}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            />
        </div>
    );
}

function SelectField({ label, name, value, onChange, options, emptyText }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
                {label}
            </label>

            <select
                name={name}
                value={value}
                onChange={onChange}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            >
                <option value="">{emptyText}</option>

                {options.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.name}
                    </option>
                ))}
            </select>
        </div>
    );
}

function SelectTextField({ label, name, value, onChange, options }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
                {label}
            </label>

            <select
                name={name}
                value={value}
                onChange={onChange}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            >
                {options.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>
        </div>
    );
}

function InfoRow({ icon: Icon, label, value }) {
    return (
        <div>
            <p className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
                {Icon && <Icon size={14} />}
                {label}
            </p>

            <p className="font-bold text-slate-800">{value}</p>
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
            className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${priorityStyles[priority] || priorityStyles.Medium
                }`}
        >
            {priority || "Medium"}
        </span>
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

function formatDate(value) {
    if (!value) return "No date";

    return new Date(value + "T00:00:00").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function formatDateTime(value) {
    if (!value) return "N/A";

    return new Date(value).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

export default JobDetails;