import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Plus, UsersRound } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

function Workspaces() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [workspaces, setWorkspaces] = useState([]);
    const [workspaceName, setWorkspaceName] = useState("");
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [inviteCode, setInviteCode] = useState("");
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        loadWorkspaces();
    }, []);

    const joinWithInviteCode = async (e) => {
        e.preventDefault();

        if (!inviteCode.trim()) return;

        setJoining(true);
        setErrorMessage("");

        const { data: workspaceId, error } = await supabase.rpc(
            "accept_workspace_invite",
            {
                invite_code_input: inviteCode.trim().toUpperCase(),
            }
        );

        setJoining(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        navigate(`/workspaces/${workspaceId}/dashboard`);
    };

    const loadWorkspaces = async () => {
        setLoading(true);
        setErrorMessage("");

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            navigate("/login");
            return;
        }

        setUser(user);

        const { data, error } = await supabase
            .from("workspace_members")
            .select(
                `
        role,
        workspaces (
          id,
          name,
          description,
          created_at
        )
      `
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        setLoading(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        const formatted = data
            .filter((item) => item.workspaces)
            .map((item) => ({
                ...item.workspaces,
                role: item.role,
            }));

        setWorkspaces(formatted);
    };

    const createWorkspace = async (e) => {
        e.preventDefault();

        if (!workspaceName.trim()) return;

        setCreating(true);
        setErrorMessage("");

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            setCreating(false);
            setErrorMessage("You must be logged in to create a workspace.");
            return;
        }

        const { data: workspace, error: workspaceError } = await supabase
            .from("workspaces")
            .insert({
                name: workspaceName.trim(),
                owner_id: user.id,
            })
            .select()
            .single();

        if (workspaceError) {
            setCreating(false);
            setErrorMessage(workspaceError.message);
            return;
        }

        const { error: memberError } = await supabase
            .from("workspace_members")
            .insert({
                workspace_id: workspace.id,
                user_id: user.id,
                role: "owner",
            });

        setCreating(false);

        if (memberError) {
            setErrorMessage(memberError.message);
            return;
        }

        navigate(`/workspaces/${workspace.id}/dashboard`);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/login");
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-100">
                <p className="text-sm font-semibold text-slate-500">
                    Loading workspaces...
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 px-6 py-10 text-slate-950">
            <div className="mx-auto max-w-6xl">
                <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
                            JobFlow
                        </p>
                        <h1 className="mt-1 text-4xl font-black">Your Workspaces</h1>
                        <p className="mt-2 text-slate-500">
                            Open an existing workspace or create a new one for your team.
                        </p>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                    >
                        Log out
                    </button>
                </div>

                {errorMessage && (
                    <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                        {errorMessage}
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-black">Existing Workspaces</h2>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
                                {workspaces.length} total
                            </span>
                        </div>

                        {workspaces.length === 0 ? (
                            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
                                <Building2 className="mx-auto mb-4 text-slate-400" size={42} />
                                <h3 className="text-xl font-black">No workspaces yet</h3>
                                <p className="mt-2 text-sm text-slate-500">
                                    Create your first workspace to start tracking jobs.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                                {workspaces.map((workspace) => (
                                    <button
                                        key={workspace.id}
                                        onClick={() =>
                                            navigate(`/workspaces/${workspace.id}/dashboard`)
                                        }
                                        className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                                    >
                                        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                                            <Building2 size={22} />
                                        </div>

                                        <h3 className="text-xl font-black">{workspace.name}</h3>

                                        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                                            <UsersRound size={16} />
                                            Your role:{" "}
                                            <span className="font-bold capitalize text-slate-700">
                                                {workspace.role}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <form
                        onSubmit={createWorkspace}
                        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                    >
                        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                            <Plus size={22} />
                        </div>

                        <h2 className="text-xl font-black">Create Workspace</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Start a blank workspace, then invite your team members by email.
                        </p>

                        <div className="mt-5">
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

                        <button
                            type="submit"
                            disabled={creating}
                            className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {creating ? "Creating..." : "Create Workspace"}
                        </button>
                    </form>
                    <form
                        onSubmit={joinWithInviteCode}
                        className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                    >
                        <h2 className="text-xl font-black">Join Workspace</h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Enter a one-time 6-character invite code from a workspace admin.
                        </p>

                        <input
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                            placeholder="ABC123"
                            maxLength="6"
                            className="mt-5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-center font-mono text-lg font-black uppercase tracking-widest outline-none transition focus:border-slate-400"
                        />

                        <button
                            type="submit"
                            disabled={joining}
                            className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {joining ? "Joining..." : "Join Workspace"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Workspaces;