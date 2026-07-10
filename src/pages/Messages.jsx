import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    ArrowLeft,
    MessageCircle,
    RefreshCcw,
    Send,
    Trash2,
    UserRound,
    UsersRound,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

function Messages() {
    const { workspaceId } = useParams();
    const bottomRef = useRef(null);

    const [currentUser, setCurrentUser] = useState(null);
    const [currentMember, setCurrentMember] = useState(null);
    const [members, setMembers] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [messages, setMessages] = useState([]);
    const [reads, setReads] = useState([]);

    const [selectedTarget, setSelectedTarget] = useState("all");
    const [messageBody, setMessageBody] = useState("");
    const [visibleUnreadMessageIds, setVisibleUnreadMessageIds] = useState(
        new Set()
    );

    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        loadMessagesPage();
    }, [workspaceId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [selectedTarget, messages]);

    useEffect(() => {
        if (!loading && currentMember) {
            const unreadIds = getUnreadMessageIdsForTarget(selectedTarget);

            setVisibleUnreadMessageIds(new Set(unreadIds));

            if (unreadIds.length > 0) {
                const timer = setTimeout(() => {
                    markThreadAsRead(selectedTarget);
                }, 900);

                return () => clearTimeout(timer);
            }
        }
    }, [selectedTarget, currentMember?.id, messages.length, loading]);

    const loadMessagesPage = async () => {
        setLoading(true);
        setErrorMessage("");

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            setErrorMessage("You must be logged in to view messages.");
            setLoading(false);
            return;
        }

        setCurrentUser(user);

        const { data: membersData, error: membersError } = await supabase
            .from("workspace_members")
            .select("id, user_id, role, custom_role_id, created_at")
            .eq("workspace_id", workspaceId)
            .order("created_at", { ascending: true });

        if (membersError) {
            setErrorMessage(membersError.message);
            setLoading(false);
            return;
        }

        const currentMembership = (membersData || []).find(
            (member) => member.user_id === user.id
        );

        if (!currentMembership) {
            setErrorMessage("You are not a member of this workspace.");
            setLoading(false);
            return;
        }

        const userIds = (membersData || []).map((member) => member.user_id);

        let profilesData = [];

        if (userIds.length > 0) {
            const { data, error: profilesError } = await supabase
                .from("profiles")
                .select("id, full_name, email")
                .in("id", userIds);

            if (profilesError) {
                setErrorMessage(profilesError.message);
                setLoading(false);
                return;
            }

            profilesData = data || [];
        }

        const { data: messagesData, error: messagesError } = await supabase
            .from("workspace_messages")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("created_at", { ascending: true });

        if (messagesError) {
            setErrorMessage(messagesError.message);
            setLoading(false);
            return;
        }

        const { data: readsData, error: readsError } = await supabase
            .from("workspace_message_reads")
            .select("*")
            .eq("workspace_id", workspaceId)
            .eq("member_id", currentMembership.id);

        if (readsError) {
            setErrorMessage(readsError.message);
            setLoading(false);
            return;
        }

        setMembers(membersData || []);
        setProfiles(profilesData);
        setCurrentMember(currentMembership);
        setMessages(messagesData || []);
        setReads(readsData || []);
        setLoading(false);
    };

    const readMap = useMemo(() => {
        return new Map(
            reads.map((read) => [read.thread_key, new Date(read.last_read_at)])
        );
    }, [reads]);

    function getThreadKey(target = selectedTarget) {
        return target === "all" ? "all" : `dm:${target}`;
    }

    async function markThreadAsRead(target = selectedTarget) {
        if (!currentMember) return;

        const threadKey = getThreadKey(target);
        const now = new Date().toISOString();

        const { error } = await supabase.from("workspace_message_reads").upsert(
            {
                workspace_id: workspaceId,
                member_id: currentMember.id,
                thread_key: threadKey,
                last_read_at: now,
                updated_at: now,
            },
            {
                onConflict: "workspace_id,member_id,thread_key",
            }
        );

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setReads((prevReads) => {
            const existingRead = prevReads.find(
                (read) => read.thread_key === threadKey
            );

            if (existingRead) {
                return prevReads.map((read) =>
                    read.thread_key === threadKey
                        ? {
                            ...read,
                            last_read_at: now,
                            updated_at: now,
                        }
                        : read
                );
            }

            return [
                ...prevReads,
                {
                    id: `local-${threadKey}`,
                    workspace_id: workspaceId,
                    member_id: currentMember.id,
                    thread_key: threadKey,
                    last_read_at: now,
                    updated_at: now,
                },
            ];
        });
    }

    const getProfile = (userId) => {
        return profiles.find((profile) => profile.id === userId);
    };

    const getMember = (memberId) => {
        return members.find((member) => member.id === memberId);
    };

    const getMemberName = (member) => {
        if (!member) return "Unknown User";

        const profile = getProfile(member.user_id);

        return profile?.full_name || profile?.email || "Unnamed User";
    };

    const getMemberEmail = (member) => {
        if (!member) return "";

        const profile = getProfile(member.user_id);

        return profile?.email || "";
    };

    const getInitials = (name) => {
        return name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((word) => word[0])
            .join("")
            .toUpperCase();
    };

    const directMembers = members.filter(
        (member) => member.id !== currentMember?.id
    );

    const selectedMember =
        selectedTarget === "all" ? null : getMember(selectedTarget);

    const filteredMessages = useMemo(() => {
        if (!currentMember) return [];

        if (selectedTarget === "all") {
            return messages.filter((message) => !message.recipient_member_id);
        }

        return messages.filter((message) => {
            const isSentByMeToThem =
                message.sender_member_id === currentMember.id &&
                message.recipient_member_id === selectedTarget;

            const isSentByThemToMe =
                message.sender_member_id === selectedTarget &&
                message.recipient_member_id === currentMember.id;

            return isSentByMeToThem || isSentByThemToMe;
        });
    }, [messages, selectedTarget, currentMember]);

    function getUnreadMessageIdsForTarget(target) {
        if (!currentMember) return [];

        const threadKey = getThreadKey(target);
        const lastReadAt = readMap.get(threadKey);

        return messages
            .filter((message) => {
                if (message.sender_member_id === currentMember.id) {
                    return false;
                }

                if (target === "all") {
                    if (message.recipient_member_id) return false;
                } else {
                    const isIncomingDirectMessage =
                        message.sender_member_id === target &&
                        message.recipient_member_id === currentMember.id;

                    if (!isIncomingDirectMessage) return false;
                }

                if (!lastReadAt) return true;

                return new Date(message.created_at) > lastReadAt;
            })
            .map((message) => message.id);
    }

    function getUnreadCountForTarget(target) {
        return getUnreadMessageIdsForTarget(target).length;
    }

    const selectedUnreadCount = visibleUnreadMessageIds.size;

    const firstUnreadMessageId =
        selectedUnreadCount > 0
            ? filteredMessages.find((message) =>
                visibleUnreadMessageIds.has(message.id)
            )?.id
            : null;

    const sendMessage = async (e) => {
        e.preventDefault();

        const cleanBody = messageBody.trim();

        if (!cleanBody || !currentMember) return;

        setSending(true);
        setErrorMessage("");

        const { data, error } = await supabase
            .from("workspace_messages")
            .insert({
                workspace_id: workspaceId,
                sender_member_id: currentMember.id,
                recipient_member_id:
                    selectedTarget === "all" ? null : selectedTarget,
                body: cleanBody,
            })
            .select()
            .single();

        setSending(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setMessages((prevMessages) => [...prevMessages, data]);
        setMessageBody("");
        markThreadAsRead(selectedTarget);
    };

    const deleteMessage = async (messageId) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this message?"
        );

        if (!confirmed) return;

        setErrorMessage("");

        const { error } = await supabase
            .from("workspace_messages")
            .delete()
            .eq("id", messageId)
            .eq("workspace_id", workspaceId);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setMessages((prevMessages) =>
            prevMessages.filter((message) => message.id !== messageId)
        );

        setVisibleUnreadMessageIds((prevIds) => {
            const nextIds = new Set(prevIds);
            nextIds.delete(messageId);
            return nextIds;
        });
    };

    const getConversationPreview = (targetId) => {
        if (!currentMember) return "No messages yet.";

        let conversationMessages = [];

        if (targetId === "all") {
            conversationMessages = messages.filter(
                (message) => !message.recipient_member_id
            );
        } else {
            conversationMessages = messages.filter((message) => {
                const isSentByMeToThem =
                    message.sender_member_id === currentMember.id &&
                    message.recipient_member_id === targetId;

                const isSentByThemToMe =
                    message.sender_member_id === targetId &&
                    message.recipient_member_id === currentMember.id;

                return isSentByMeToThem || isSentByThemToMe;
            });
        }

        if (conversationMessages.length === 0) return "No messages yet.";

        return conversationMessages[conversationMessages.length - 1].body;
    };

    if (loading) {
        return (
            <div className="mx-auto max-w-7xl">
                <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <p className="text-sm font-bold text-slate-500">
                        Loading messages...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                <div>
                    <Link
                        to={`/workspaces/${workspaceId}/dashboard`}
                        className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-950"
                    >
                        <ArrowLeft size={17} />
                        Back to dashboard
                    </Link>

                    <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
                        Messages
                    </p>

                    <h1 className="mt-1 text-4xl font-black text-slate-950">
                        Team Messages
                    </h1>

                    <p className="mt-2 max-w-2xl text-slate-500">
                        Message the whole team or talk directly with one team member.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={loadMessagesPage}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                    <RefreshCcw size={17} />
                    Refresh
                </button>
            </div>

            {errorMessage && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                    {errorMessage}
                </div>
            )}

            <div className="grid min-h-[680px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm xl:grid-cols-[360px_1fr]">
                <aside className="border-b border-slate-200 bg-slate-50 p-4 xl:border-b-0 xl:border-r">
                    <div className="mb-4">
                        <h2 className="text-lg font-black text-slate-950">
                            Conversations
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Unread chats are marked with a red badge.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <ConversationButton
                            active={selectedTarget === "all"}
                            icon={UsersRound}
                            title="All Team Members"
                            subtitle={getConversationPreview("all")}
                            unreadCount={getUnreadCountForTarget("all")}
                            onClick={() => setSelectedTarget("all")}
                        />

                        {directMembers.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm font-semibold text-slate-400">
                                No other team members yet.
                            </div>
                        ) : (
                            directMembers.map((member) => {
                                const name = getMemberName(member);
                                const email = getMemberEmail(member);

                                return (
                                    <ConversationButton
                                        key={member.id}
                                        active={selectedTarget === member.id}
                                        initials={getInitials(name)}
                                        title={name}
                                        subtitle={
                                            getConversationPreview(member.id) ||
                                            email ||
                                            "No messages yet."
                                        }
                                        unreadCount={getUnreadCountForTarget(
                                            member.id
                                        )}
                                        onClick={() => setSelectedTarget(member.id)}
                                    />
                                );
                            })
                        )}
                    </div>
                </aside>

                <section className="flex min-h-[680px] flex-col">
                    <div className="border-b border-slate-200 p-5">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                                    {selectedTarget === "all" ? (
                                        <UsersRound size={22} />
                                    ) : (
                                        <UserRound size={22} />
                                    )}
                                </div>

                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-xl font-black text-slate-950">
                                            {selectedTarget === "all"
                                                ? "All Team Members"
                                                : getMemberName(selectedMember)}
                                        </h2>

                                        {selectedUnreadCount > 0 && (
                                            <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-black text-white">
                                                {selectedUnreadCount} unread
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-sm text-slate-500">
                                        {selectedTarget === "all"
                                            ? "Everyone in this workspace can see these messages."
                                            : "Private conversation between you and this team member."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-slate-50 p-5">
                        {filteredMessages.length === 0 ? (
                            <div className="flex h-full min-h-[360px] items-center justify-center">
                                <div className="max-w-md text-center">
                                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-slate-400 shadow-sm">
                                        <MessageCircle size={34} />
                                    </div>

                                    <h3 className="text-2xl font-black text-slate-950">
                                        No messages yet
                                    </h3>

                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        Send the first message to start the conversation.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredMessages.map((message) => {
                                    const sender = getMember(
                                        message.sender_member_id
                                    );
                                    const senderName = getMemberName(sender);
                                    const isMine =
                                        message.sender_member_id ===
                                        currentMember?.id;
                                    const isUnread =
                                        visibleUnreadMessageIds.has(message.id);

                                    return (
                                        <div key={message.id}>
                                            {message.id === firstUnreadMessageId && (
                                                <div className="my-5 flex items-center gap-3">
                                                    <div className="h-px flex-1 bg-red-200" />
                                                    <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white">
                                                        New messages
                                                    </span>
                                                    <div className="h-px flex-1 bg-red-200" />
                                                </div>
                                            )}

                                            <div
                                                className={`flex ${isMine
                                                        ? "justify-end"
                                                        : "justify-start"
                                                    }`}
                                            >
                                                <div
                                                    className={`relative max-w-[85%] rounded-3xl p-4 shadow-sm md:max-w-[65%] ${isMine
                                                            ? "bg-slate-950 text-white"
                                                            : isUnread
                                                                ? "border-2 border-red-200 bg-white text-slate-800"
                                                                : "border border-slate-200 bg-white text-slate-800"
                                                        }`}
                                                >
                                                    {isUnread && !isMine && (
                                                        <span className="absolute -left-2 top-5 h-3 w-3 rounded-full bg-red-600 ring-4 ring-red-100" />
                                                    )}

                                                    <div className="mb-2 flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <p
                                                                className={`text-xs font-black ${isMine
                                                                        ? "text-slate-300"
                                                                        : "text-slate-400"
                                                                    }`}
                                                            >
                                                                {isMine
                                                                    ? "You"
                                                                    : senderName}
                                                            </p>

                                                            {isUnread && !isMine && (
                                                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-red-700">
                                                                    Unread
                                                                </span>
                                                            )}
                                                        </div>

                                                        {isMine && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    deleteMessage(
                                                                        message.id
                                                                    )
                                                                }
                                                                className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>

                                                    <p className="whitespace-pre-wrap text-sm leading-6">
                                                        {message.body}
                                                    </p>

                                                    <p
                                                        className={`mt-2 text-xs ${isMine
                                                                ? "text-slate-400"
                                                                : "text-slate-400"
                                                            }`}
                                                    >
                                                        {formatDateTime(
                                                            message.created_at
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                <div ref={bottomRef} />
                            </div>
                        )}
                    </div>

                    <form
                        onSubmit={sendMessage}
                        className="border-t border-slate-200 bg-white p-4"
                    >
                        <div className="flex flex-col gap-3 md:flex-row md:items-end">
                            <textarea
                                value={messageBody}
                                onChange={(e) => setMessageBody(e.target.value)}
                                placeholder={
                                    selectedTarget === "all"
                                        ? "Message the whole team..."
                                        : "Write a private message..."
                                }
                                rows="3"
                                className="min-h-[90px] flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                            />

                            <button
                                type="submit"
                                disabled={sending || !messageBody.trim()}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Send size={18} />
                                {sending ? "Sending..." : "Send"}
                            </button>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    );
}

function ConversationButton({
    active,
    icon: Icon,
    initials,
    title,
    subtitle,
    unreadCount = 0,
    onClick,
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full rounded-2xl border p-4 text-left transition ${active
                    ? "border-slate-950 bg-white shadow-sm"
                    : unreadCount > 0
                        ? "border-red-200 bg-red-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                }`}
        >
            <div className="flex items-center gap-3">
                <div
                    className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${active
                            ? "bg-slate-950 text-white"
                            : unreadCount > 0
                                ? "bg-red-600 text-white"
                                : "bg-slate-100 text-slate-600"
                        }`}
                >
                    {Icon ? <Icon size={21} /> : initials}

                    {unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-600 ring-2 ring-white" />
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <p
                            className={`truncate text-sm ${unreadCount > 0
                                    ? "font-black text-slate-950"
                                    : "font-black text-slate-950"
                                }`}
                        >
                            {title}
                        </p>

                        {unreadCount > 0 && (
                            <span className="flex min-w-6 items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-xs font-black text-white">
                                {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                        )}
                    </div>

                    <p
                        className={`mt-1 truncate text-xs ${unreadCount > 0
                                ? "font-black text-red-700"
                                : "font-semibold text-slate-400"
                            }`}
                    >
                        {subtitle}
                    </p>
                </div>
            </div>
        </button>
    );
}

function formatDateTime(value) {
    if (!value) return "";

    return new Date(value).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

export default Messages;