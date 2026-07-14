import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    AlertTriangle,
    ArrowLeft,
    Copy,
    KeyRound,
    Plus,
    ShieldCheck,
    Trash2,
    UserRound,
    UsersRound,
    X,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

function TeamMembers() {
    const { workspaceId } = useParams();

    const [currentUser, setCurrentUser] = useState(null);
    const [currentMember, setCurrentMember] = useState(null);
    const [members, setMembers] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [workspaceRoles, setWorkspaceRoles] = useState([]);

    const [newRoleName, setNewRoleName] = useState("");

    const [invitePermission, setInvitePermission] = useState("member");
    const [inviteCustomRoleId, setInviteCustomRoleId] = useState("");

    const [inviteResult, setInviteResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState(null);
    const [removingMember, setRemovingMember] = useState(false);

    const canManageTeam = useMemo(() => {
        return currentMember?.role === "owner" || currentMember?.role === "admin";
    }, [currentMember]);

    useEffect(() => {
        loadTeamData();
    }, [workspaceId]);

    const loadTeamData = async () => {
        setLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

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

        const { data: currentMembership, error: currentMemberError } =
            await supabase
                .from("workspace_members")
                .select("*")
                .eq("workspace_id", workspaceId)
                .eq("user_id", user.id)
                .single();

        if (currentMemberError) {
            setErrorMessage(currentMemberError.message);
            setLoading(false);
            return;
        }

        setCurrentMember(currentMembership);

        const { data: membersData, error: membersError } = await supabase
            .from("workspace_members")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("created_at", { ascending: true });

        if (membersError) {
            setErrorMessage(membersError.message);
            setLoading(false);
            return;
        }

        setMembers(membersData || []);

        const memberUserIds = (membersData || []).map((member) => member.user_id);

        if (memberUserIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
                .from("profiles")
                .select("id, full_name, email")
                .in("id", memberUserIds);

            if (profilesError) {
                setErrorMessage(profilesError.message);
                setLoading(false);
                return;
            }

            setProfiles(profilesData || []);
        } else {
            setProfiles([]);
        }

        const { data: rolesData, error: rolesError } = await supabase
            .from("workspace_roles")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("name", { ascending: true });

        if (rolesError) {
            setErrorMessage(rolesError.message);
            setLoading(false);
            return;
        }

        setWorkspaceRoles(rolesData || []);
        setLoading(false);
    };

    const getProfile = (userId) => {
        return profiles.find((profile) => profile.id === userId);
    };

    const getCustomRole = (roleId) => {
        return workspaceRoles.find((role) => role.id === roleId);
    };

    const getMemberDisplayName = (member) => {
        if (!member) return "this user";

        const profile = getProfile(member.user_id);

        return profile?.full_name || profile?.email || "Unnamed User";
    };

    const getMemberEmail = (member) => {
        if (!member) return "";

        const profile = getProfile(member.user_id);

        return profile?.email || member.user_id;
    };

    const canRemoveMember = (member) => {
        if (!canManageTeam || !member || !currentUser || !currentMember) {
            return false;
        }

        const isCurrentUser = member.user_id === currentUser.id;

        if (isCurrentUser) return false;

        if (currentMember.role === "owner") {
            return true;
        }

        if (currentMember.role === "admin") {
            return member.role !== "owner";
        }

        return false;
    };

    const openRemoveModal = (member) => {
        setMemberToRemove(member);
        setShowRemoveModal(true);
        setErrorMessage("");
        setSuccessMessage("");
    };

    const closeRemoveModal = () => {
        if (removingMember) return;

        setShowRemoveModal(false);
        setMemberToRemove(null);
    };

    const removeMember = async () => {
        if (!memberToRemove) return;

        setRemovingMember(true);
        setErrorMessage("");
        setSuccessMessage("");

        const displayName = getMemberDisplayName(memberToRemove);

        const { error } = await supabase.rpc("remove_workspace_member", {
            workspace_id_input: workspaceId,
            target_member_id: memberToRemove.id,
        });

        setRemovingMember(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setShowRemoveModal(false);
        setMemberToRemove(null);
        setSuccessMessage(`${displayName} was removed from the workspace.`);
        await loadTeamData();
    };

    const createWorkspaceRole = async (e) => {
        e.preventDefault();

        if (!newRoleName.trim() || !currentUser) return;

        setErrorMessage("");
        setSuccessMessage("");

        const { error } = await supabase.from("workspace_roles").insert({
            workspace_id: workspaceId,
            name: newRoleName.trim(),
            created_by: currentUser.id,
        });

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setNewRoleName("");
        setSuccessMessage("Role created.");
        loadTeamData();
    };

    const transferOwnership = async (member) => {
        const displayName = getMemberDisplayName(member);

        const confirmed = window.confirm(
            `Are you sure you want to make ${displayName} the owner of this workspace?\n\nYou will become an admin and they will become the only owner.`
        );

        if (!confirmed) return;

        setErrorMessage("");
        setSuccessMessage("");

        const { error } = await supabase.rpc("transfer_workspace_ownership", {
            workspace_id_input: workspaceId,
            new_owner_member_id: member.id,
        });

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setSuccessMessage(
            `${displayName} is now the workspace owner. You are now an admin.`
        );

        await loadTeamData();
    };

    const updateMemberPermission = async (memberId, newPermission) => {
        setErrorMessage("");
        setSuccessMessage("");

        const member = members.find((item) => item.id === memberId);

        if (!member) {
            setErrorMessage("Team member not found.");
            return;
        }

        if (member.user_id === currentUser?.id) {
            setErrorMessage("You cannot edit your own permission.");
            return;
        }

        if (newPermission === "owner") {
            if (currentMember?.role !== "owner") {
                setErrorMessage("Only the current owner can transfer ownership.");
                return;
            }

            await transferOwnership(member);
            return;
        }

        const { error } = await supabase.rpc("update_workspace_member_permission", {
            workspace_id_input: workspaceId,
            target_member_id: memberId,
            new_permission: newPermission,
        });

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setSuccessMessage("Permission updated.");
        await loadTeamData();
    };

    const updateMemberCustomRole = async (memberId, customRoleId) => {
        setErrorMessage("");
        setSuccessMessage("");

        const { error } = await supabase.rpc("update_workspace_member_custom_role", {
            workspace_id_input: workspaceId,
            target_member_id: memberId,
            custom_role_id_input: customRoleId || null,
        });

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setSuccessMessage("Workspace role updated.");
        await loadTeamData();
    };

    const createInvite = async (e) => {
        e.preventDefault();

        if (!currentUser) return;

        setErrorMessage("");
        setSuccessMessage("");
        setInviteResult(null);

        const { data, error } = await supabase
            .from("workspace_invitations")
            .insert({
                workspace_id: workspaceId,
                email: null,
                role: invitePermission,
                custom_role_id: inviteCustomRoleId || null,
                invited_by: currentUser.id,
            })
            .select()
            .single();

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setInviteResult({
            code: data.invite_code,
        });

        setInvitePermission("member");
        setInviteCustomRoleId("");
        setSuccessMessage("Invite code created.");
    };

    const copyToClipboard = async (value) => {
        await navigator.clipboard.writeText(value);
        setSuccessMessage("Copied to clipboard.");
    };

    if (loading) {
        return (
            <p className="text-sm font-semibold text-slate-500">
                Loading team members...
            </p>
        );
    }

    return (
        <div>
            <div className="mb-6">
                <Link
                    to={`/workspaces/${workspaceId}/dashboard`}
                    className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-950"
                >
                    <ArrowLeft size={17} />
                    Back to dashboard
                </Link>
            </div>

            <div className="mb-8 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
                        Team Members
                    </p>

                    <h1 className="mt-1 text-3xl font-black text-slate-950">
                        Workspace Team
                    </h1>

                    <p className="mt-2 text-slate-500">
                        View everyone in this workspace, manage roles, and remove
                        members when needed.
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm">
                    Your permission:{" "}
                    <span className="capitalize text-slate-950">
                        {currentMember?.role}
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

            <div className="grid gap-6 xl:grid-cols-3">
                <div className="xl:col-span-2">
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 p-5">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                                    <UsersRound size={21} />
                                </div>

                                <div>
                                    <h2 className="text-xl font-black text-slate-950">
                                        Members
                                    </h2>
                                    <p className="text-sm text-slate-500">
                                        Everyone can view this list. Only owners
                                        and admins can edit or remove members.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {members.map((member) => {
                                const profile = getProfile(member.user_id);
                                const customRole = getCustomRole(member.custom_role_id);

                                const isCurrentUser =
                                    member.user_id === currentUser?.id;
                                const isOwner = member.role === "owner";
                                const isAdmin = member.role === "admin";
                                const currentUserIsOwner =
                                    currentMember?.role === "owner";
                                const currentUserIsAdmin =
                                    currentMember?.role === "admin";

                                const canEditThisPermission =
                                    !isCurrentUser &&
                                    !isOwner &&
                                    (
                                        currentUserIsOwner ||
                                        (currentUserIsAdmin && !isAdmin)
                                    );

                                return (
                                    <div
                                        key={member.id}
                                        className="grid gap-4 p-5 md:grid-cols-[1.3fr_1fr_1fr_auto] md:items-center"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                                                <UserRound size={20} />
                                            </div>

                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="font-black text-slate-950">
                                                        {profile?.full_name ||
                                                            "Unnamed User"}
                                                    </p>

                                                    {isCurrentUser && (
                                                        <span className="rounded-full bg-slate-950 px-2 py-0.5 text-xs font-black text-white">
                                                            You
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-sm text-slate-500">
                                                    {profile?.email || member.user_id}
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                                                Permission
                                            </p>

                                            {!canEditThisPermission ? (
                                                <p className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-bold capitalize text-slate-700">
                                                    {member.role}
                                                </p>
                                            ) : (
                                                <select
                                                    value={member.role}
                                                    onChange={(e) =>
                                                        updateMemberPermission(
                                                            member.id,
                                                            e.target.value
                                                        )
                                                    }
                                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold capitalize outline-none focus:border-slate-400"
                                                >
                                                    {currentUserIsOwner && (
                                                        <option value="owner">
                                                            Owner
                                                        </option>
                                                    )}

                                                    {(currentUserIsOwner ||
                                                        currentUserIsAdmin) && (
                                                            <>
                                                                <option value="admin">
                                                                    Admin
                                                                </option>
                                                                <option value="member">
                                                                    Member
                                                                </option>
                                                            </>
                                                        )}
                                                </select>
                                            )}
                                        </div>

                                        <div>
                                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                                                Workspace Role
                                            </p>

                                            {canEditThisPermission ? (
                                                <select
                                                    value={
                                                        member.custom_role_id || ""
                                                    }
                                                    onChange={(e) =>
                                                        updateMemberCustomRole(
                                                            member.id,
                                                            e.target.value
                                                        )
                                                    }
                                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-slate-400"
                                                >
                                                    <option value="">
                                                        No role assigned
                                                    </option>

                                                    {workspaceRoles.map((role) => (
                                                        <option
                                                            key={role.id}
                                                            value={role.id}
                                                        >
                                                            {role.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <p className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
                                                    {customRole?.name ||
                                                        "No role assigned"}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                                                Actions
                                            </p>

                                            {canRemoveMember(member) ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        openRemoveModal(member)
                                                    }
                                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-black text-red-600 transition hover:bg-red-100"
                                                >
                                                    <Trash2 size={15} />
                                                    Remove
                                                </button>
                                            ) : (
                                                <span className="text-sm font-semibold text-slate-400">
                                                    —
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {members.length === 0 && (
                                <div className="p-10 text-center text-slate-500">
                                    No team members found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <aside className="space-y-6">
                    {canManageTeam && (
                        <>
                            <form
                                onSubmit={createWorkspaceRole}
                                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                                    <ShieldCheck size={21} />
                                </div>

                                <h2 className="text-xl font-black text-slate-950">
                                    Create Role
                                </h2>

                                <p className="mt-2 text-sm leading-6 text-slate-500">
                                    Create workspace roles like Designer,
                                    Developer, Manager, Editor, or Reviewer.
                                </p>

                                <input
                                    value={newRoleName}
                                    onChange={(e) =>
                                        setNewRoleName(e.target.value)
                                    }
                                    placeholder="Example: Designer"
                                    className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                                />

                                <button
                                    type="submit"
                                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                                >
                                    <Plus size={18} />
                                    Create Role
                                </button>
                            </form>

                            <form
                                onSubmit={createInvite}
                                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                                    <KeyRound size={21} />
                                </div>

                                <h2 className="text-xl font-black text-slate-950">
                                    Generate Team Code
                                </h2>

                                <p className="mt-2 text-sm leading-6 text-slate-500">
                                    Generate a one-time code that a team member can
                                    enter after signing up to join this workspace.
                                </p>

                                <div className="mt-4 space-y-4">
                                    <select
                                        value={invitePermission}
                                        onChange={(e) =>
                                            setInvitePermission(e.target.value)
                                        }
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                                    >
                                        <option value="member">Member</option>
                                        <option value="admin">Admin</option>
                                    </select>

                                    <select
                                        value={inviteCustomRoleId}
                                        onChange={(e) =>
                                            setInviteCustomRoleId(e.target.value)
                                        }
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                                    >
                                        <option value="">No workspace role</option>

                                        {workspaceRoles.map((role) => (
                                            <option key={role.id} value={role.id}>
                                                {role.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    className="mt-4 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                                >
                                    Generate Code
                                </button>

                                {inviteResult && (
                                    <div className="mt-5 rounded-2xl bg-slate-100 p-4">
                                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                            One-time Team Code
                                        </p>

                                        <div className="mt-2 flex items-center gap-2">
                                            <input
                                                readOnly
                                                value={inviteResult.code}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-lg font-black tracking-widest text-slate-950"
                                            />

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    copyToClipboard(
                                                        inviteResult.code
                                                    )
                                                }
                                                className="rounded-xl bg-white p-3 text-slate-700 shadow-sm hover:bg-slate-50"
                                            >
                                                <Copy size={18} />
                                            </button>
                                        </div>

                                        <p className="mt-3 text-xs leading-5 text-slate-500">
                                            Give this code to the team member.
                                            They can enter it from their Workspaces
                                            page after signing up.
                                        </p>
                                    </div>
                                )}
                            </form>
                        </>
                    )}

                    {!canManageTeam && (
                        <div className="rounded-3xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-500 shadow-sm">
                            You can view team members, but only workspace owners
                            and admins can generate invite codes, edit roles, or
                            remove members.
                        </div>
                    )}
                </aside>
            </div>

            {showRemoveModal && memberToRemove && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                                    <AlertTriangle size={24} />
                                </div>

                                <div>
                                    <h2 className="text-2xl font-black text-slate-950">
                                        Remove Team Member?
                                    </h2>

                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        Are you sure you want to remove{" "}
                                        <span className="font-black text-slate-950">
                                            {getMemberDisplayName(memberToRemove)}
                                        </span>{" "}
                                        from this workspace?
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={closeRemoveModal}
                                disabled={removingMember}
                                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                            <p className="text-sm font-bold text-red-700">
                                This will remove their workspace access.
                            </p>

                            <p className="mt-2 text-sm leading-6 text-red-600">
                                They will no longer be able to view this workspace,
                                jobs, messages, team members, or settings. Jobs
                                assigned to them may become unassigned depending on
                                your database relationship settings.
                            </p>

                            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-red-500">
                                {getMemberEmail(memberToRemove)}
                            </p>
                        </div>

                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={closeRemoveModal}
                                disabled={removingMember}
                                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={removeMember}
                                disabled={removingMember}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Trash2 size={18} />
                                {removingMember
                                    ? "Removing..."
                                    : "Yes, Remove Member"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TeamMembers;