import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import {
    BriefcaseBusiness,
    ClipboardList,
    LayoutDashboard,
    LogOut,
    Menu,
    MessageCircle,
    PlusCircle,
    Settings,
    UsersRound,
    X,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

function Sidebar() {
    const { workspaceId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [isOpen, setIsOpen] = useState(false);
    const [membership, setMembership] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!workspaceId) return;

        loadSidebarData();

        const channel = supabase
            .channel(`workspace-messages-sidebar-${workspaceId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "workspace_messages",
                    filter: `workspace_id=eq.${workspaceId}`,
                },
                () => {
                    loadSidebarData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [workspaceId, location.pathname]);

    const loadSidebarData = async () => {
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user || !workspaceId) return;

        const { data: memberData, error: memberError } = await supabase
            .from("workspace_members")
            .select("id, user_id, role")
            .eq("workspace_id", workspaceId)
            .eq("user_id", user.id)
            .single();

        if (memberError || !memberData) return;

        setMembership(memberData);

        const { data: messagesData, error: messagesError } = await supabase
            .from("workspace_messages")
            .select("id, sender_member_id, recipient_member_id, created_at")
            .eq("workspace_id", workspaceId)
            .order("created_at", { ascending: false });

        if (messagesError) return;

        const { data: readsData, error: readsError } = await supabase
            .from("workspace_message_reads")
            .select("thread_key, last_read_at")
            .eq("workspace_id", workspaceId)
            .eq("member_id", memberData.id);

        if (readsError) return;

        const readMap = new Map(
            (readsData || []).map((read) => [
                read.thread_key,
                new Date(read.last_read_at),
            ])
        );

        const unreadMessages = (messagesData || []).filter((message) => {
            if (message.sender_member_id === memberData.id) return false;

            let threadKey = null;

            if (!message.recipient_member_id) {
                threadKey = "all";
            } else if (message.recipient_member_id === memberData.id) {
                threadKey = `dm:${message.sender_member_id}`;
            }

            if (!threadKey) return false;

            const lastReadAt = readMap.get(threadKey);

            if (!lastReadAt) return true;

            return new Date(message.created_at) > lastReadAt;
        });

        setUnreadCount(unreadMessages.length);
    };

    const canManageWorkspace =
        membership?.role === "owner" || membership?.role === "admin";

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/login");
    };

    const closeSidebar = () => setIsOpen(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="fixed left-5 top-5 z-50 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-300 transition hover:bg-slate-800"
            >
                <Menu size={22} />
            </button>

            {isOpen && (
                <button
                    type="button"
                    onClick={closeSidebar}
                    className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm"
                    aria-label="Close sidebar overlay"
                />
            )}

            <aside
                className={`fixed left-0 top-0 z-50 flex h-screen w-80 flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <div className="flex items-center justify-between border-b border-slate-100 p-5">
                    <div>
                        <p className="text-xl font-black text-slate-950">
                            JobFlow
                        </p>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                            Workspace Menu
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={closeSidebar}
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                        <X size={22} />
                    </button>
                </div>

                <nav className="flex-1 space-y-2 overflow-y-auto p-4">
                    <SidebarLink
                        to={`/workspaces/${workspaceId}/dashboard`}
                        icon={LayoutDashboard}
                        label="Dashboard"
                        onClick={closeSidebar}
                    />

                    <SidebarLink
                        to={`/workspaces/${workspaceId}/team`}
                        icon={UsersRound}
                        label="Team Members"
                        onClick={closeSidebar}
                    />

                    <SidebarLink
                        to={`/workspaces/${workspaceId}/messages`}
                        icon={MessageCircle}
                        label="Messages"
                        badgeCount={unreadCount}
                        onClick={closeSidebar}
                    />

                    <SidebarLink
                        to={`/workspaces/${workspaceId}/jobs`}
                        icon={ClipboardList}
                        label="Jobs"
                        onClick={closeSidebar}
                    />

                    <SidebarLink
                        to={`/workspaces/${workspaceId}/progress`}
                        icon={BriefcaseBusiness}
                        label="Job Progress"
                        onClick={closeSidebar}
                    />

                    <SidebarLink
                        to={`/workspaces/${workspaceId}/jobs/new`}
                        icon={PlusCircle}
                        label="Create Job"
                        onClick={closeSidebar}
                    />

                    {canManageWorkspace && (
                        <SidebarLink
                            to={`/workspaces/${workspaceId}/settings`}
                            icon={Settings}
                            label="Workspace Settings"
                            onClick={closeSidebar}
                        />
                    )}
                </nav>

                <div className="border-t border-slate-100 p-4">
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                    >
                        <LogOut size={18} />
                        Log Out
                    </button>
                </div>
            </aside>
        </>
    );
}

function SidebarLink({ to, icon: Icon, label, badgeCount = 0, onClick }) {
    return (
        <NavLink
            to={to}
            onClick={onClick}
            className={({ isActive }) =>
                `flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${isActive
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`
            }
        >
            <span className="flex items-center gap-3">
                <Icon size={18} />
                {label}
            </span>

            {badgeCount > 0 && (
                <span className="flex min-w-6 items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-xs font-black text-white">
                    {badgeCount > 99 ? "99+" : badgeCount}
                </span>
            )}
        </NavLink>
    );
}

export default Sidebar;