import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    BriefcaseBusiness,
    ClipboardList,
    Layers,
    Settings,
    UserRound,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

function CreateJob() {
    const navigate = useNavigate();
    const { workspaceId } = useParams();

    const [members, setMembers] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [resources, setResources] = useState([]);
    const [jobTypes, setJobTypes] = useState([]);

    const [formData, setFormData] = useState({
        jobNumber: "",
        title: "",
        client: "",
        clientContact: "",
        description: "",
        statusId: "",
        jobTypeId: "",
        jobResourceId: "",
        priority: "Medium",
        assignedMemberId: "",
        dueDate: "",
    });

    const [workLink, setWorkLink] = useState({
        url: "",
        notes: "",
    });

    const [generatingJobNumber, setGeneratingJobNumber] = useState(false);

    const [loading, setLoading] = useState(false);
    const [loadingPage, setLoadingPage] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        loadCreateJobData();
    }, [workspaceId]);

    const loadCreateJobData = async () => {
        setLoadingPage(true);
        setErrorMessage("");

        const [
            membersResponse,
            statusesResponse,
            resourcesResponse,
            jobTypesResponse,
        ] = await Promise.all([
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
        ]);

        if (membersResponse.error) {
            setErrorMessage(membersResponse.error.message);
            setLoadingPage(false);
            return;
        }

        if (statusesResponse.error) {
            setErrorMessage(statusesResponse.error.message);
            setLoadingPage(false);
            return;
        }

        if (resourcesResponse.error) {
            setErrorMessage(resourcesResponse.error.message);
            setLoadingPage(false);
            return;
        }

        if (jobTypesResponse.error) {
            setErrorMessage(jobTypesResponse.error.message);
            setLoadingPage(false);
            return;
        }

        const membersData = membersResponse.data || [];
        const statusesData = statusesResponse.data || [];
        const resourcesData = resourcesResponse.data || [];
        const jobTypesData = jobTypesResponse.data || [];

        let profilesData = [];

        const userIds = membersData.map((member) => member.user_id);

        if (userIds.length > 0) {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, full_name, email")
                .in("id", userIds);

            if (error) {
                setErrorMessage(error.message);
                setLoadingPage(false);
                return;
            }

            profilesData = data || [];
        }

        const defaultStatus =
            statusesData.find((status) => status.is_default) || statusesData[0];

        setMembers(membersData);
        setProfiles(profilesData);
        setStatuses(statusesData);
        setResources(resourcesData);
        setJobTypes(jobTypesData);

        setFormData((prevData) => ({
            ...prevData,
            statusId: defaultStatus?.id || "",
            jobResourceId: resourcesData[0]?.id || "",
            jobTypeId: jobTypesData[0]?.id || "",
        }));

        setLoadingPage(false);
    };

    const getProfile = (userId) => {
        return profiles.find((profile) => profile.id === userId);
    };

    const getMemberName = (member) => {
        const profile = getProfile(member.user_id);
        return profile?.full_name || profile?.email || "Unnamed User";
    };

    const getSelectedOption = (items, id) => {
        return items.find((item) => item.id === id);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleWorkLinkChange = (e) => {
        const { name, value } = e.target;

        setWorkLink((prevLink) => ({
            ...prevLink,
            [name]: value,
        }));
    };

    const generateJobNumber = async () => {
        setGeneratingJobNumber(true);
        setErrorMessage("");

        const { data, error } = await supabase
            .from("jobs")
            .select("job_number")
            .eq("workspace_id", workspaceId);

        setGeneratingJobNumber(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        const usedNumbers = new Set(
            (data || [])
                .map((job) => String(job.job_number || "").trim())
                .filter(Boolean)
        );

        let highestNumber = 1000;

        usedNumbers.forEach((jobNumber) => {
            const matches = jobNumber.match(/\d+/g);

            if (!matches || matches.length === 0) return;

            const lastNumber = Number(matches[matches.length - 1]);

            if (!Number.isNaN(lastNumber)) {
                highestNumber = Math.max(highestNumber, lastNumber);
            }
        });

        let nextNumber = highestNumber + 1;

        while (usedNumbers.has(String(nextNumber))) {
            nextNumber += 1;
        }

        setFormData((prevData) => ({
            ...prevData,
            jobNumber: String(nextNumber),
        }));
    };

    function normalizeUrl(value) {
        const cleanValue = value.trim();

        if (!cleanValue) return "";

        if (cleanValue.startsWith("http://") || cleanValue.startsWith("https://")) {
            return cleanValue;
        }

        return `https://${cleanValue}`;
    }

    function getFallbackLinkPreview(value) {
        const normalizedUrl = normalizeUrl(value);

        try {
            const url = new URL(normalizedUrl);
            const domain = url.hostname.replace("www.", "");

            return {
                url: normalizedUrl,
                title: domain,
                description: "",
                image_url: "",
                site_name: domain,
                favicon_url: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
            };
        } catch {
            return {
                url: normalizedUrl,
                title: normalizedUrl,
                description: "",
                image_url: "",
                site_name: "Link",
                favicon_url: "",
            };
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        setLoading(true);
        setErrorMessage("");

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            setLoading(false);
            setErrorMessage("You must be logged in to create a job.");
            return;
        }

        const cleanJobNumber = formData.jobNumber.trim();

        const { data: existingJob, error: existingJobError } = await supabase
            .from("jobs")
            .select("id")
            .eq("workspace_id", workspaceId)
            .eq("job_number", cleanJobNumber)
            .maybeSingle();

        if (existingJobError) {
            setLoading(false);
            setErrorMessage(existingJobError.message);
            return;
        }

        if (existingJob) {
            setLoading(false);
            setErrorMessage(
                "That job number is already being used. Generate a new one or enter a different number."
            );
            return;
        }

        const selectedStatus = getSelectedOption(statuses, formData.statusId);
        const selectedResource = getSelectedOption(
            resources,
            formData.jobResourceId
        );
        const selectedType = getSelectedOption(jobTypes, formData.jobTypeId);

        if (!selectedStatus) {
            setLoading(false);
            setErrorMessage(
                "Add at least one job status in Workspace Settings before creating jobs."
            );
            return;
        }

        const selectedMember = members.find(
            (member) => member.id === formData.assignedMemberId
        );

        const currentMember = members.find((member) => member.user_id === user.id);

        if (!currentMember) {
            setLoading(false);
            setErrorMessage("You are not a member of this workspace.");
            return;
        }

        const { data: createdJob, error } = await supabase
            .from("jobs")
            .insert({
                workspace_id: workspaceId,
                job_number: cleanJobNumber,
                title: formData.title.trim(),
                client: formData.client.trim(),
                client_contact: formData.clientContact.trim() || null,
                description: formData.description.trim(),
                status_id: selectedStatus.id,
                status: selectedStatus.name,
                job_type_id: selectedType?.id || null,
                type: selectedType?.name || null,
                job_resource_id: selectedResource?.id || null,
                job_resource: selectedResource?.name || null,
                priority: formData.priority,
                assigned_member_id: formData.assignedMemberId || null,
                assigned_to: selectedMember ? getMemberName(selectedMember) : null,
                due_date: formData.dueDate || null,
                created_by: user.id,
            })
            .select()
            .single();

        if (error) {
            setLoading(false);
            setErrorMessage(error.message);
            return;
        }

        const cleanLinkUrl = normalizeUrl(workLink.url);

        if (cleanLinkUrl) {
            let previewData = getFallbackLinkPreview(cleanLinkUrl);

            const { data: preview, error: previewError } =
                await supabase.functions.invoke("link-preview", {
                    body: {
                        url: cleanLinkUrl,
                    },
                });

            if (!previewError && preview && !preview.error) {
                previewData = preview;
            }

            const { error: linkError } = await supabase.from("job_links").insert({
                workspace_id: workspaceId,
                job_id: createdJob.id,
                added_by_member_id: currentMember.id,
                title: previewData.title || null,
                description: previewData.description || null,
                image_url: previewData.image_url || null,
                site_name: previewData.site_name || null,
                favicon_url: previewData.favicon_url || null,
                url: previewData.url || cleanLinkUrl,
                notes: workLink.notes.trim() || null,
            });

            if (linkError) {
                setLoading(false);
                setErrorMessage(
                    `Job was created, but the work link could not be added: ${linkError.message}`
                );
                return;
            }
        }

        setLoading(false);

        navigate(`/workspaces/${workspaceId}/jobs/${createdJob.id}`);
    };

    if (loadingPage) {
        return (
            <div className="mx-auto max-w-5xl">
                <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <p className="text-sm font-bold text-slate-500">
                        Loading create job page...
                    </p>
                </div>
            </div>
        );
    }

    const missingSettings =
        statuses.length === 0 || resources.length === 0 || jobTypes.length === 0;

    return (
        <div className="mx-auto max-w-5xl">
            <button
                type="button"
                onClick={() => navigate(`/workspaces/${workspaceId}/jobs`)}
                className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-950"
            >
                <ArrowLeft size={17} />
                Back to jobs
            </button>

            <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-300">
                    <ClipboardList size={26} />
                </div>

                <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
                    Create Job
                </p>

                <h1 className="mt-2 text-4xl font-black text-slate-950">
                    Add a New Job
                </h1>

                <p className="mx-auto mt-3 max-w-2xl text-slate-500">
                    Enter the job details, choose the workspace-specific status,
                    type, resource, and assign it to one team member.
                </p>
            </div>

            {errorMessage && (
                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                    {errorMessage}
                </div>
            )}

            {missingSettings && (
                <div className="mb-6 rounded-3xl border border-yellow-200 bg-yellow-50 p-5">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
                            <Settings size={21} />
                        </div>

                        <div>
                            <h2 className="text-lg font-black text-yellow-900">
                                Finish Workspace Setup
                            </h2>

                            <p className="mt-1 text-sm leading-6 text-yellow-800">
                                This workspace needs at least one job status, one
                                job type, and one job resource for the cleanest
                                job creation flow.
                            </p>

                            <Link
                                to={`/workspaces/${workspaceId}/settings`}
                                className="mt-4 inline-flex rounded-2xl bg-yellow-900 px-4 py-3 text-sm font-black text-white transition hover:bg-yellow-800"
                            >
                                Open Workspace Settings
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            <form
                onSubmit={handleSubmit}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
            >
                <div className="mb-8">
                    <h2 className="text-xl font-black text-slate-950">
                        Job Details
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Basic information about the job or request.
                    </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                            Job Number
                        </label>

                        <div className="flex gap-2">
                            <input
                                name="jobNumber"
                                value={formData.jobNumber}
                                onChange={handleChange}
                                placeholder="1001"
                                required
                                className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                            />

                            <button
                                type="button"
                                onClick={generateJobNumber}
                                disabled={generatingJobNumber}
                                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {generatingJobNumber ? "Generating..." : "Generate"}
                            </button>
                        </div>

                        <p className="mt-2 text-xs font-semibold text-slate-400">
                            Generates the next unused number in this workspace.
                        </p>
                    </div>

                    <InputField
                        label="Job Title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="Create a new website"
                        required
                    />

                    <InputField
                        label="Client"
                        name="client"
                        value={formData.client}
                        onChange={handleChange}
                        placeholder="Company name"
                        required
                    />

                    <InputField
                        label="Client Contact Name"
                        name="clientContact"
                        value={formData.clientContact}
                        onChange={handleChange}
                        placeholder="John Smith"
                    />

                    <SelectField
                        label="Starting Status"
                        name="statusId"
                        value={formData.statusId}
                        onChange={handleChange}
                        icon={ClipboardList}
                        options={statuses}
                        emptyText="No statuses created"
                        required
                    />

                    <SelectField
                        label="Job Type"
                        name="jobTypeId"
                        value={formData.jobTypeId}
                        onChange={handleChange}
                        icon={BriefcaseBusiness}
                        options={jobTypes}
                        emptyText="No job types created"
                    />

                    <SelectField
                        label="Job Resource"
                        name="jobResourceId"
                        value={formData.jobResourceId}
                        onChange={handleChange}
                        icon={Layers}
                        options={resources}
                        emptyText="No resources created"
                    />

                    <SelectTextField
                        label="Priority"
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        options={["Low", "Medium", "High", "Urgent"]}
                    />

                    <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                            Due Date
                        </label>

                        <input
                            type="date"
                            name="dueDate"
                            value={formData.dueDate}
                            onChange={handleChange}
                            required
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                            Assign To
                        </label>

                        <div className="relative">
                            <UserRound
                                size={18}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                            />

                            <select
                                name="assignedMemberId"
                                value={formData.assignedMemberId}
                                onChange={handleChange}
                                className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-12 py-3 text-sm outline-none transition focus:border-slate-400"
                            >
                                <option value="">Unassigned</option>

                                {members.map((member) => (
                                    <option key={member.id} value={member.id}>
                                        {getMemberName(member)} · {member.role}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="mt-6">
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                        Job Description
                    </label>

                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Describe what needs to be created, updated, reviewed, or completed..."
                        rows="6"
                        required
                        className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                    />
                </div>

                <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="mb-5">
                        <h2 className="text-xl font-black text-slate-950">
                            Work Link
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Optional. Paste a link for files, folders, designs, docs, websites,
                            or anything needed for this job. JobFlow will pull the title,
                            description, and preview image automatically when available.
                        </p>
                    </div>

                    <div className="grid gap-4">
                        <div>
                            <label className="mb-2 block text-sm font-bold text-slate-700">
                                Link
                            </label>

                            <input
                                name="url"
                                value={workLink.url}
                                onChange={handleWorkLinkChange}
                                placeholder="Paste link here..."
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-bold text-slate-700">
                                Link Notes
                            </label>

                            <textarea
                                name="notes"
                                value={workLink.notes}
                                onChange={handleWorkLinkChange}
                                placeholder="Optional notes about this link..."
                                rows="4"
                                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-slate-400"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-end">
                    <button
                        type="button"
                        onClick={() => navigate(`/workspaces/${workspaceId}/jobs`)}
                        className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        disabled={loading || statuses.length === 0}
                        className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "Creating..." : "Create Job"}
                    </button>
                </div>
            </form>
        </div>
    );
}

function InputField({
    label,
    name,
    value,
    onChange,
    placeholder,
    required = false,
}) {
    return (
        <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
                {label}
            </label>

            <input
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            />
        </div>
    );
}

function SelectField({
    label,
    name,
    value,
    onChange,
    options,
    emptyText,
    required = false,
    icon: Icon,
}) {
    return (
        <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
                {label}
            </label>

            <div className="relative">
                {Icon && (
                    <Icon
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                )}

                <select
                    name={name}
                    value={value}
                    onChange={onChange}
                    required={required}
                    disabled={options.length === 0}
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-12 py-3 text-sm outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                    <option value="">{emptyText}</option>

                    {options.map((option) => (
                        <option key={option.id} value={option.id}>
                            {option.name}
                            {option.is_default ? " · Default" : ""}
                        </option>
                    ))}
                </select>
            </div>
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

export default CreateJob;