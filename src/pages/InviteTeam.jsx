import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

function InviteTeam() {
    const { workspaceId } = useParams();

    const [email, setEmail] = useState("");
    const [role, setRole] = useState("member");
    const [inviteLink, setInviteLink] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const sendInvite = async (e) => {
        e.preventDefault();

        setLoading(true);
        setMessage("");
        setErrorMessage("");
        setInviteLink("");

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setLoading(false);
            setErrorMessage("You must be logged in to invite team members.");
            return;
        }

        const { data, error } = await supabase
            .from("workspace_invitations")
            .insert({
                workspace_id: workspaceId,
                email: email.trim().toLowerCase(),
                role,
                invited_by: user.id,
            })
            .select()
            .single();

        setLoading(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        const link = `${window.location.origin}/join/${data.token}`;
        setInviteLink(link);
        setMessage(
            "Invite created. For now, copy this link and send it to your teammate."
        );
        setEmail("");
        setRole("member");
    };

    return (
        <div>
            <div className="mb-6">
                <Link
                    to={`/workspaces/${workspaceId}/dashboard`}
                    className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-950"
                >
                    <ArrowLeft size={17} />
                    Back to workspace
                </Link>
            </div>

            <div className="max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <Mail size={22} />
                </div>

                <h1 className="text-3xl font-black text-slate-950">
                    Invite Team Members
                </h1>

                <p className="mt-2 text-slate-500">
                    Invite people to join this workspace and choose their starting role.
                </p>

                {errorMessage && (
                    <div className="mt-5 rounded-2xl border border-red-200 bg-red          Invite people to join this workspace and choose their starting role.
        </p>

-50 p-4 text-sm font-bold text-red-700">
                        {errorMessage}
                    </div>
                )}

                {message && (
                    <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700">
                        {message}
                    </div>
                )}

                {inviteLink && (
                    <div className="mt-5 rounded-2xl bg-slate-100 p-4">
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                            Invite Link
                        </p>

                        <input
                            readOnly
                            value={inviteLink}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                        />
                    </div>
                )}

                <form onSubmit={sendInvite} className="mt-6 space-y-5">
                    <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                            Email Address
                        </label>

                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="teammate@company.com"
                            required
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                            Role
                        </label>

                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                        >
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "Creating invite..." : "Create Invite"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default InviteTeam;