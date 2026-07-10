import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    BriefcaseBusiness,
    Check,
    ClipboardList,
    Layers,
    Pencil,
    Plus,
    RotateCcw,
    Save,
    Settings,
    Star,
    Trash2,
    X,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const STATUS_DEFAULTS = [
    "New Job",
    "In Progress",
    "Review",
    "Revisions",
    "Completed",
];

function WorkspaceSettings() {
    const { workspaceId } = useParams();
    const navigate = useNavigate();

    const [currentUser, setCurrentUser] = useState(null);
    const [membership, setMembership] = useState(null);
    const [workspace, setWorkspace] = useState(null);

    const [workspaceName, setWorkspaceName] = useState("");
    const [workspaceDescription, setWorkspaceDescription] = useState("");

    const [statuses, setStatuses] = useState([]);
    const [resources, setResources] = useState([]);
    const [jobTypes, setJobTypes] = useState([]);

    const [newStatusName, setNewStatusName] = useState("");
    const [newResourceName, setNewResourceName] = useState("");
    const [newTypeName, setNewTypeName] = useState("");

    const [editingItem, setEditingItem] = useState(null);
    const [editingName, setEditingName] = useState("");

    const [loading, setLoading] = useState(true);
    const [savingWorkspace, setSavingWorkspace] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmName, setDeleteConfirmName] = useState("");
    const [deletingWorkspace, setDeletingWorkspace] = useState(false);

    useEffect(() => {
        loadSettings();
    }, [workspaceId]);

    const loadSettings = async () => {
        setLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            setErrorMessage("You must be logged in to view workspace settings.");
            setLoading(false);
            return;
        }

        setCurrentUser(user);

        const { data: memberData, error: memberError } = await supabase
            .from("workspace_members")
            .select("*")
            .eq("workspace_id", workspaceId)
            .eq("user_id", user.id)
            .single();

        if (memberError) {
            setErrorMessage(memberError.message);
            setLoading(false);
            return;
        }

        setMembership(memberData);

        const canManage =
            memberData?.role === "owner" || memberData?.role === "admin";

        if (!canManage) {
            setLoading(false);
            return;
        }

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

        const [statusesResponse, resourcesResponse, jobTypesResponse] =
            await Promise.all([
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

        setWorkspace(workspaceData);
        setWorkspaceName(workspaceData.name || "");
        setWorkspaceDescription(workspaceData.description || "");
        setStatuses(statusesResponse.data || []);
        setResources(resourcesResponse.data || []);
        setJobTypes(jobTypesResponse.data || []);
        setLoading(false);
    };

    const canManageWorkspace =
        membership?.role === "owner" || membership?.role === "admin";

    const canDeleteWorkspace = membership?.role === "owner";

    const saveWorkspaceDetails = async (e) => {
        e.preventDefault();

        if (!workspaceName.trim()) {
            setErrorMessage("Workspace name is required.");
            return;
        }

        setSavingWorkspace(true);
        setErrorMessage("");
        setSuccessMessage("");

        const { data, error } = await supabase
            .from("workspaces")
            .update({
                name: workspaceName.trim(),
                description: workspaceDescription.trim() || null,
            })
            .eq("id", workspaceId)
            .select()
            .single();

        setSavingWorkspace(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setWorkspace(data);
        setSuccessMessage("Workspace details saved.");
    };

    const deleteWorkspace = async () => {
        if (!workspace || !currentUser) return;

        if (deleteConfirmName.trim() !== workspace.name) {
            setErrorMessage(
                `Please type "${workspace.name}" exactly to confirm deletion.`
            );
            return;
        }

        setDeletingWorkspace(true);
        setErrorMessage("");
        setSuccessMessage("");

        const { error } = await supabase
            .from("workspaces")
            .delete()
            .eq("id", workspaceId)
            .eq("owner_id", currentUser.id);

        setDeletingWorkspace(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setShowDeleteModal(false);
        navigate("/workspaces");
    };

    const addItem = async ({ table, name, items, isStatus = false }) => {
        const cleanName = name.trim();

        if (!cleanName || !currentUser) return;

        setErrorMessage("");
        setSuccessMessage("");

        const nextPosition =
            items.length === 0
                ? 1
                : Math.max(...items.map((item) => item.position || 0)) + 1;

        const insertData = {
            workspace_id: workspaceId,
            name: cleanName,
            position: nextPosition,
            created_by: currentUser.id,
        };

        if (isStatus && items.length === 0) {
            insertData.is_default = true;
        }

        const { error } = await supabase.from(table).insert(insertData);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setSuccessMessage("Item added.");
        setNewStatusName("");
        setNewResourceName("");
        setNewTypeName("");
        await loadSettings();
    };

    const startEditing = (table, item) => {
        setEditingItem({
            table,
            id: item.id,
        });
        setEditingName(item.name);
        setErrorMessage("");
        setSuccessMessage("");
    };

    const cancelEditing = () => {
        setEditingItem(null);
        setEditingName("");
    };

    const saveEditing = async () => {
        if (!editingItem || !editingName.trim()) return;

        setErrorMessage("");
        setSuccessMessage("");

        const { error } = await supabase
            .from(editingItem.table)
            .update({
                name: editingName.trim(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", editingItem.id)
            .eq("workspace_id", workspaceId);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setEditingItem(null);
        setEditingName("");
        setSuccessMessage("Item updated.");
        await loadSettings();
    };

    const deleteItem = async ({ table, item }) => {
        if (table === "workspace_job_statuses" && item.is_default) {
            setErrorMessage(
                "You cannot delete the default status. Choose another default status first."
            );
            return;
        }

        const confirmed = window.confirm(
            `Are you sure you want to delete "${item.name}"? Existing jobs using this option will keep their saved text, but the option will be removed from future dropdowns.`
        );

        if (!confirmed) return;

        setErrorMessage("");
        setSuccessMessage("");

        const { error } = await supabase
            .from(table)
            .delete()
            .eq("id", item.id)
            .eq("workspace_id", workspaceId);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setSuccessMessage("Item deleted.");
        await loadSettings();
    };

    const moveItem = async ({ table, items, item, direction }) => {
        const currentIndex = items.findIndex((entry) => entry.id === item.id);
        const swapIndex =
            direction === "up" ? currentIndex - 1 : currentIndex + 1;

        if (swapIndex < 0 || swapIndex >= items.length) return;

        const swapItem = items[swapIndex];

        setErrorMessage("");
        setSuccessMessage("");

        const [firstResponse, secondResponse] = await Promise.all([
            supabase
                .from(table)
                .update({
                    position: swapItem.position,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", item.id)
                .eq("workspace_id", workspaceId),
            supabase
                .from(table)
                .update({
                    position: item.position,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", swapItem.id)
                .eq("workspace_id", workspaceId),
        ]);

        if (firstResponse.error) {
            setErrorMessage(firstResponse.error.message);
            return;
        }

        if (secondResponse.error) {
            setErrorMessage(secondResponse.error.message);
            return;
        }

        await loadSettings();
    };

    const setDefaultStatus = async (status) => {
        setErrorMessage("");
        setSuccessMessage("");

        const reorderedStatuses = [
            status,
            ...statuses.filter((item) => item.id !== status.id),
        ];

        const clearResponse = await supabase
            .from("workspace_job_statuses")
            .update({
                is_default: false,
                updated_at: new Date().toISOString(),
            })
            .eq("workspace_id", workspaceId);

        if (clearResponse.error) {
            setErrorMessage(clearResponse.error.message);
            return;
        }

        const positionUpdates = reorderedStatuses.map((item, index) =>
            supabase
                .from("workspace_job_statuses")
                .update({
                    position: index + 1,
                    is_default: item.id === status.id,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", item.id)
                .eq("workspace_id", workspaceId)
        );

        const responses = await Promise.all(positionUpdates);
        const failedResponse = responses.find((response) => response.error);

        if (failedResponse) {
            setErrorMessage(failedResponse.error.message);
            return;
        }

        setSuccessMessage(
            `"${status.name}" is now the default status and Step 1 of the workflow.`
        );

        await loadSettings();
    };

    const seedDefaults = async ({ table, defaults, items, isStatus = false }) => {
        setErrorMessage("");
        setSuccessMessage("");

        const existingNames = items.map((item) => item.name.toLowerCase());

        const rows = defaults
            .filter((name) => !existingNames.includes(name.toLowerCase()))
            .map((name, index) => ({
                workspace_id: workspaceId,
                name,
                position: items.length + index + 1,
                created_by: currentUser.id,
                ...(isStatus && items.length === 0 && index === 0
                    ? { is_default: true }
                    : {}),
            }));

        if (rows.length === 0) {
            setSuccessMessage("Those defaults are already added.");
            return;
        }

        const { error } = await supabase.from(table).insert(rows);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setSuccessMessage("Default options added.");
        await loadSettings();
    };

    if (loading) {
        return (
            <div className="mx-auto max-w-7xl">
                <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <p className="text-sm font-bold text-slate-500">
                        Loading settings...
                    </p>
                </div>
            </div>
        );
    }

    if (!canManageWorkspace) {
        return (
            <div className="mx-auto max-w-4xl rounded-3xl border border-red-200 bg-red-50 p-8">
                <h1 className="text-2xl font-black text-red-700">
                    Access denied
                </h1>
                <p className="mt-2 text-sm text-red-600">
                    Only workspace owners and admins can view workspace settings.
                </p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
                <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
                        Workspace Settings
                    </p>

                    <h1 className="mt-1 text-4xl font-black text-slate-950">
                        Customize {workspace?.name || "Workspace"}
                    </h1>

                    <p className="mt-2 max-w-3xl text-slate-500">
                        Make this workspace fit any business. Customize workflow
                        statuses, job resources, and job types used when creating
                        and tracking jobs.
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm">
                    Your permission:{" "}
                    <span className="capitalize text-slate-950">
                        {membership?.role}
                    </span>
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

            <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                        <Settings size={22} />
                    </div>

                    <div>
                        <h2 className="text-xl font-black text-slate-950">
                            Workspace Details
                        </h2>

                        <p className="text-sm text-slate-500">
                            Rename this workspace and add an optional description.
                        </p>
                    </div>
                </div>

                <form
                    onSubmit={saveWorkspaceDetails}
                    className="grid gap-5 md:grid-cols-2"
                >
                    <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                            Workspace Name
                        </label>

                        <input
                            value={workspaceName}
                            onChange={(e) => setWorkspaceName(e.target.value)}
                            placeholder="Example: Marketing Team"
                            required
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                            Description
                        </label>

                        <input
                            value={workspaceDescription}
                            onChange={(e) =>
                                setWorkspaceDescription(e.target.value)
                            }
                            placeholder="Optional workspace description"
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <button
                            type="submit"
                            disabled={savingWorkspace}
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Save size={18} />
                            {savingWorkspace
                                ? "Saving..."
                                : "Save Workspace Details"}
                        </button>
                    </div>
                </form>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                <StatusWorkflowSection
                    statuses={statuses}
                    newStatusName={newStatusName}
                    setNewStatusName={setNewStatusName}
                    editingItem={editingItem}
                    editingName={editingName}
                    setEditingName={setEditingName}
                    startEditing={startEditing}
                    cancelEditing={cancelEditing}
                    saveEditing={saveEditing}
                    onAdd={() =>
                        addItem({
                            table: "workspace_job_statuses",
                            name: newStatusName,
                            items: statuses,
                            isStatus: true,
                        })
                    }
                    onDelete={(item) =>
                        deleteItem({
                            table: "workspace_job_statuses",
                            item,
                        })
                    }
                    onMove={(item, direction) =>
                        moveItem({
                            table: "workspace_job_statuses",
                            items: statuses,
                            item,
                            direction,
                        })
                    }
                    onSeedDefaults={() =>
                        seedDefaults({
                            table: "workspace_job_statuses",
                            defaults: STATUS_DEFAULTS,
                            items: statuses,
                            isStatus: true,
                        })
                    }
                    onSetDefault={setDefaultStatus}
                />

                <div className="grid gap-6">
                    <CustomizationSection
                        icon={Layers}
                        title="Job Resources"
                        description="Create the tools, programs, platforms, or systems used to complete jobs."
                        helperText="These appear in the Job Resource dropdown."
                        items={resources}
                        newValue={newResourceName}
                        setNewValue={setNewResourceName}
                        placeholder="Example: Salesforce"
                        table="workspace_job_resources"
                        editingItem={editingItem}
                        editingName={editingName}
                        setEditingName={setEditingName}
                        startEditing={startEditing}
                        cancelEditing={cancelEditing}
                        saveEditing={saveEditing}
                        onAdd={() =>
                            addItem({
                                table: "workspace_job_resources",
                                name: newResourceName,
                                items: resources,
                            })
                        }
                        onDelete={(item) =>
                            deleteItem({
                                table: "workspace_job_resources",
                                item,
                            })
                        }
                        onMove={(item, direction) =>
                            moveItem({
                                table: "workspace_job_resources",
                                items: resources,
                                item,
                                direction,
                            })
                        }
                    />

                    <CustomizationSection
                        icon={BriefcaseBusiness}
                        title="Job Types"
                        description="Create the categories of work this business tracks."
                        helperText="These appear in the Job Type dropdown."
                        items={jobTypes}
                        newValue={newTypeName}
                        setNewValue={setNewTypeName}
                        placeholder="Example: Print Project"
                        table="workspace_job_types"
                        editingItem={editingItem}
                        editingName={editingName}
                        setEditingName={setEditingName}
                        startEditing={startEditing}
                        cancelEditing={cancelEditing}
                        saveEditing={saveEditing}
                        onAdd={() =>
                            addItem({
                                table: "workspace_job_types",
                                name: newTypeName,
                                items: jobTypes,
                            })
                        }
                        onDelete={(item) =>
                            deleteItem({
                                table: "workspace_job_types",
                                item,
                            })
                        }
                        onMove={(item, direction) =>
                            moveItem({
                                table: "workspace_job_types",
                                items: jobTypes,
                                item,
                                direction,
                            })
                        }
                    />
                </div>
            </div>

            <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                            <AlertTriangle size={24} />
                        </div>

                        <div>
                            <h2 className="text-xl font-black text-red-700">
                                Danger Zone
                            </h2>

                            <p className="mt-1 max-w-2xl text-sm leading-6 text-red-600">
                                Deleting this workspace will permanently remove
                                the workspace, jobs, team members, invitations,
                                statuses, resources, job types, and workspace
                                settings. This cannot be undone.
                            </p>

                            {!canDeleteWorkspace && (
                                <p className="mt-3 text-sm font-bold text-red-700">
                                    Only the workspace owner can delete this
                                    workspace.
                                </p>
                            )}
                        </div>
                    </div>

                    <button
                        type="button"
                        disabled={!canDeleteWorkspace}
                        onClick={() => {
                            setDeleteConfirmName("");
                            setErrorMessage("");
                            setSuccessMessage("");
                            setShowDeleteModal(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Trash2 size={18} />
                        Delete Workspace
                    </button>
                </div>
            </div>

            {showDeleteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                                    <AlertTriangle size={24} />
                                </div>

                                <div>
                                    <h2 className="text-2xl font-black text-slate-950">
                                        Delete Workspace?
                                    </h2>

                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        This will permanently delete{" "}
                                        <span className="font-black text-slate-950">
                                            {workspace?.name}
                                        </span>
                                        , including all jobs, members, invites,
                                        and settings. This action cannot be
                                        undone.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowDeleteModal(false)}
                                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                            <p className="text-sm font-bold text-red-700">
                                Type the workspace name to confirm:
                            </p>

                            <p className="mt-1 font-mono text-sm font-black text-red-900">
                                {workspace?.name}
                            </p>
                        </div>

                        <input
                            value={deleteConfirmName}
                            onChange={(e) =>
                                setDeleteConfirmName(e.target.value)
                            }
                            placeholder="Type workspace name here"
                            className="mt-5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-red-400"
                        />

                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setShowDeleteModal(false)}
                                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={deleteWorkspace}
                                disabled={
                                    deletingWorkspace ||
                                    deleteConfirmName.trim() !== workspace?.name
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Trash2 size={18} />
                                {deletingWorkspace
                                    ? "Deleting..."
                                    : "Yes, Delete Workspace"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatusWorkflowSection({
    statuses,
    newStatusName,
    setNewStatusName,
    editingItem,
    editingName,
    setEditingName,
    startEditing,
    cancelEditing,
    saveEditing,
    onAdd,
    onDelete,
    onMove,
    onSeedDefaults,
    onSetDefault,
}) {
    const defaultStatus = statuses.find((status) => status.is_default);
    const orderedSteps = defaultStatus
        ? [
            defaultStatus,
            ...statuses.filter((status) => status.id !== defaultStatus.id),
        ]
        : statuses;

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <ClipboardList size={21} />
                </div>

                <div>
                    <h2 className="text-xl font-black text-slate-950">
                        Job Status Workflow
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                        Choose the default status for new jobs, then order the
                        statuses as the steps jobs should move through.
                    </p>
                </div>
            </div>

            <div className="mb-5 rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-700">
                    Default Status
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                    This is the first step used when a new job is created.
                    Choosing a new default will move it to Step 1.
                </p>

                <select
                    value={defaultStatus?.id || ""}
                    onChange={(e) => {
                        const selectedStatus = statuses.find(
                            (status) => status.id === e.target.value
                        );

                        if (selectedStatus) {
                            onSetDefault(selectedStatus);
                        }
                    }}
                    className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-slate-400"
                >
                    <option value="">No default selected</option>

                    {statuses.map((status) => (
                        <option key={status.id} value={status.id}>
                            {status.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="mb-5 flex gap-2">
                <input
                    value={newStatusName}
                    onChange={(e) => setNewStatusName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            onAdd();
                        }
                    }}
                    placeholder="Example: Waiting on Client"
                    className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                />

                <button
                    type="button"
                    onClick={onAdd}
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-white transition hover:bg-slate-800"
                >
                    <Plus size={18} />
                </button>
            </div>

            <button
                type="button"
                onClick={onSeedDefaults}
                className="mb-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
                <RotateCcw size={17} />
                Add Starter Statuses
            </button>

            <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-black text-slate-700">
                    Workflow Step Order
                </p>

                {orderedSteps.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-400">
                        No statuses yet. Add one above or use starter statuses.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {orderedSteps.map((item, index) => {
                            const isEditing =
                                editingItem?.table === "workspace_job_statuses" &&
                                editingItem?.id === item.id;

                            return (
                                <div
                                    key={item.id}
                                    className="rounded-2xl border border-slate-200 bg-white p-3"
                                >
                                    {isEditing ? (
                                        <div className="flex gap-2">
                                            <input
                                                value={editingName}
                                                onChange={(e) =>
                                                    setEditingName(e.target.value)
                                                }
                                                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-slate-400"
                                            />

                                            <button
                                                type="button"
                                                onClick={saveEditing}
                                                className="rounded-xl bg-slate-950 p-2 text-white"
                                            >
                                                <Check size={17} />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={cancelEditing}
                                                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500"
                                            >
                                                <X size={17} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                                                    {item.is_default
                                                        ? "Default · Step 1"
                                                        : `Step ${index + 1}`}
                                                </p>

                                                <p className="mt-1 truncate text-sm font-black text-slate-950">
                                                    {item.name}
                                                </p>

                                                {item.is_default && (
                                                    <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-950 px-2 py-0.5 text-xs font-black text-white">
                                                        <Star size={11} />
                                                        New jobs start here
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex shrink-0 items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onMove(item, "up")
                                                    }
                                                    disabled={index === 0}
                                                    className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                                                >
                                                    <ArrowUp size={15} />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onMove(item, "down")
                                                    }
                                                    disabled={
                                                        index === orderedSteps.length - 1
                                                    }
                                                    className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                                                >
                                                    <ArrowDown size={15} />
                                                </button>

                                                {!item.is_default && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            onSetDefault(item)
                                                        }
                                                        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                                                        title="Make default"
                                                    >
                                                        <Star size={15} />
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        startEditing(
                                                            "workspace_job_statuses",
                                                            item
                                                        )
                                                    }
                                                    className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                                                >
                                                    <Pencil size={15} />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => onDelete(item)}
                                                    className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-black text-slate-700">
                    Workflow Preview
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                    {orderedSteps.length === 0 ? (
                        <span className="text-sm font-semibold text-slate-400">
                            No workflow created yet.
                        </span>
                    ) : (
                        orderedSteps.map((status, index) => (
                            <span
                                key={status.id}
                                className={`rounded-full px-3 py-1 text-xs font-black ${status.is_default
                                        ? "bg-slate-950 text-white"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                            >
                                {index + 1}. {status.name}
                            </span>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}

function CustomizationSection({
    icon: Icon,
    title,
    description,
    helperText,
    items,
    newValue,
    setNewValue,
    placeholder,
    table,
    editingItem,
    editingName,
    setEditingName,
    startEditing,
    cancelEditing,
    saveEditing,
    onAdd,
    onDelete,
    onMove,
    onSeedDefaults,
}) {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <Icon size={21} />
                </div>

                <div>
                    <h2 className="text-xl font-black text-slate-950">
                        {title}
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                        {description}
                    </p>
                </div>
            </div>

            <div className="mb-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                {helperText}
            </div>

            <div className="mb-5 flex gap-2">
                <input
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            onAdd();
                        }
                    }}
                    placeholder={placeholder}
                    className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                />

                <button
                    type="button"
                    onClick={onAdd}
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-white transition hover:bg-slate-800"
                >
                    <Plus size={18} />
                </button>
            </div>

            {onSeedDefaults && (
                <button
                    type="button"
                    onClick={onSeedDefaults}
                    className="mb-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                    <RotateCcw size={17} />
                    Add Starter Options
                </button>
            )}

            <div className="space-y-3">
                {items.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-400">
                        No options yet. Add one above or use starter options.
                    </div>
                ) : (
                    items.map((item, index) => {
                        const isEditing =
                            editingItem?.table === table &&
                            editingItem?.id === item.id;

                        return (
                            <div
                                key={item.id}
                                className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                            >
                                {isEditing ? (
                                    <div className="flex gap-2">
                                        <input
                                            value={editingName}
                                            onChange={(e) =>
                                                setEditingName(e.target.value)
                                            }
                                            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-slate-400"
                                        />

                                        <button
                                            type="button"
                                            onClick={saveEditing}
                                            className="rounded-xl bg-slate-950 p-2 text-white"
                                        >
                                            <Check size={17} />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={cancelEditing}
                                            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500"
                                        >
                                            <X size={17} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-black text-slate-950">
                                                {item.name}
                                            </p>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onMove(item, "up")
                                                }
                                                disabled={index === 0}
                                                className="rounded-lg p-2 text-slate-500 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
                                            >
                                                <ArrowUp size={15} />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onMove(item, "down")
                                                }
                                                disabled={
                                                    index === items.length - 1
                                                }
                                                className="rounded-lg p-2 text-slate-500 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
                                            >
                                                <ArrowDown size={15} />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    startEditing(table, item)
                                                }
                                                className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-slate-950"
                                            >
                                                <Pencil size={15} />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => onDelete(item)}
                                                className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </section>
    );
}

export default WorkspaceSettings;