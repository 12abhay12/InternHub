import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowUpRight,
    Bell,
    BellRing,
    BriefcaseBusiness,
    Check,
    CheckCheck,
    CircleCheck,
    Clock3,
    FileText,
    Inbox,
    RotateCw,
    UserRound,
} from "lucide-react";

import { account } from "../lib/account";
import {
    getMyNotifications,
    markAllNotificationsRead,
    markNotificationRead,
} from "../lib/notifications";

function formatNotificationDate(value) {
    if (!value) return "Just now";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Just now";

    return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
}

function getNotificationStyle(type) {
    const normalizedType = String(type ?? "").trim().toLowerCase();

    if (normalizedType.includes("application_status") || normalizedType.includes("status")) {
        return {
            label: "Application update",
            icon: <CheckCheck className="h-5 w-5" />,
            iconStyle: "bg-violet-50 text-violet-700 ring-violet-100",
            labelStyle: "bg-violet-50 text-violet-700",
        };
    }

    if (normalizedType.includes("application")) {
        return {
            label: "Application",
            icon: <FileText className="h-5 w-5" />,
            iconStyle: "bg-indigo-50 text-indigo-700 ring-indigo-100",
            labelStyle: "bg-indigo-50 text-indigo-700",
        };
    }

    if (normalizedType.includes("job")) {
        return {
            label: "Job update",
            icon: <BriefcaseBusiness className="h-5 w-5" />,
            iconStyle: "bg-blue-50 text-blue-700 ring-blue-100",
            labelStyle: "bg-blue-50 text-blue-700",
        };
    }

    if (normalizedType.includes("registration") || normalizedType.includes("user")) {
        return {
            label: "Account activity",
            icon: <UserRound className="h-5 w-5" />,
            iconStyle: "bg-emerald-50 text-emerald-700 ring-emerald-100",
            labelStyle: "bg-emerald-50 text-emerald-700",
        };
    }

    return {
        label: "Update",
        icon: <Bell className="h-5 w-5" />,
        iconStyle: "bg-amber-50 text-amber-700 ring-amber-100",
        labelStyle: "bg-amber-50 text-amber-700",
    };
}

function getSafeInternalLink(link) {
    const value = String(link ?? "").trim();
    return value.startsWith("/") && !value.startsWith("//") ? value : "";
}

function LoadingCard() {
    return (
        <div className="flex animate-pulse gap-4 rounded-2xl border border-slate-100 bg-white p-4 sm:p-5">
            <div className="h-12 w-12 shrink-0 rounded-2xl bg-slate-100" />
            <div className="min-w-0 flex-1 space-y-3 py-1">
                <div className="h-3 w-28 rounded-full bg-slate-100" />
                <div className="h-4 w-2/5 rounded-full bg-slate-100" />
                <div className="h-3 w-4/5 rounded-full bg-slate-100" />
            </div>
        </div>
    );
}

export default function Notifications() {
    const navigate = useNavigate();
    const [userId, setUserId] = useState("");
    const [notifications, setNotifications] = useState([]);
    const [filter, setFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);
    const [markingId, setMarkingId] = useState("");
    const [error, setError] = useState("");
    const [actionError, setActionError] = useState("");

    const loadNotifications = useCallback(async (currentUserId, isRefresh = false) => {
        if (!currentUserId) {
            setLoading(false);
            return;
        }

        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        setError("");

        try {
            const rows = await getMyNotifications(currentUserId, { limit: 100 });
            setNotifications(rows);
        } catch (loadError) {
            console.error("Failed to load notifications:", loadError);
            setError("We couldn’t load your notifications. Please try again.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        let active = true;

        const loadCurrentUser = async () => {
            try {
                const currentUser = await account.get();
                if (!active) return;
                setUserId(currentUser.$id);
                await loadNotifications(currentUser.$id);
            } catch (userError) {
                console.error("Failed to load the signed-in user:", userError);
                if (active) {
                    setError("Please sign in again to view your notifications.");
                    setLoading(false);
                }
            }
        };

        loadCurrentUser();
        return () => {
            active = false;
        };
    }, [loadNotifications]);

    useEffect(() => {
        if (!userId) return undefined;

        const refreshOnFocus = () => {
            if (document.visibilityState === "visible") {
                loadNotifications(userId, true);
            }
        };

        window.addEventListener("focus", refreshOnFocus);
        return () => window.removeEventListener("focus", refreshOnFocus);
    }, [loadNotifications, userId]);

    const unreadCount = useMemo(
        () => notifications.reduce((count, item) => count + (item.isRead ? 0 : 1), 0),
        [notifications]
    );
    const readCount = notifications.length - unreadCount;
    const visibleNotifications = useMemo(
        () =>
            filter === "unread"
                ? notifications.filter((notification) => !notification.isRead)
                : notifications,
        [filter, notifications]
    );

    const handleMarkRead = async (notification) => {
        if (!userId || !notification?.$id) return false;
        if (notification.isRead) return true;

        setMarkingId(notification.$id);
        setActionError("");

        try {
            const updated = await markNotificationRead(userId, notification);
            setNotifications((current) =>
                current.map((row) =>
                    row.$id === notification.$id
                        ? { ...row, ...updated, isRead: true }
                        : row
                )
            );
            return true;
        } catch (updateError) {
            console.error("Failed to mark notification as read:", updateError);
            setActionError("Couldn’t update that notification. Please try again.");
            return false;
        } finally {
            setMarkingId("");
        }
    };

    const handleMarkAllRead = async () => {
        if (!userId || markingAll || unreadCount === 0) return;

        setMarkingAll(true);
        setActionError("");

        try {
            await markAllNotificationsRead(userId);
            setNotifications((current) =>
                current.map((row) => ({ ...row, isRead: true }))
            );
        } catch (updateError) {
            console.error("Failed to mark all notifications as read:", updateError);
            setActionError("Couldn’t mark all notifications as read. Please try again.");
        } finally {
            setMarkingAll(false);
        }
    };

    const handleOpenNotification = async (notification) => {
        if (!notification.isRead) {
            const marked = await handleMarkRead(notification);
            if (!marked) return;
        }

        const internalLink = getSafeInternalLink(notification.link);
        if (internalLink) navigate(internalLink);
    };

    const totalCount = notifications.length;

    return (
        <main className="relative min-h-[70vh] overflow-hidden bg-[#f5f8fe]">
            <div className="pointer-events-none absolute -left-40 top-12 h-80 w-80 rounded-full bg-blue-200/25 blur-3xl" />
            <div className="pointer-events-none absolute -right-40 top-72 h-96 w-96 rounded-full bg-emerald-200/20 blur-3xl" />

            <div className="relative mx-auto w-full max-w-375 px-3 py-6 sm:px-5 sm:py-8 lg:px-8 lg:py-10">
                <header className="overflow-hidden rounded-[1.75rem] border border-blue-100 bg-linear-to-br from-white via-white to-blue-50 shadow-sm shadow-blue-100/50">
                    <div className="flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between lg:p-8">
                        <div className="flex min-w-0 items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200/70">
                                <BellRing className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-blue-600">
                                    Your activity center
                                </p>
                                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                                    Notifications
                                </h1>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                                    Keep track of applications, job activity, and important account updates.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:justify-end">
                            <div className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-3.5 py-2.5 text-sm shadow-sm shadow-blue-100/30">
                                <span className="h-2 w-2 rounded-full bg-blue-500" />
                                <span className="font-bold text-slate-800">{unreadCount}</span>
                                <span className="text-slate-500">unread</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => loadNotifications(userId, true)}
                                disabled={refreshing || loading}
                                aria-label="Refresh notifications"
                                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <RotateCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                            </button>
                            <button
                                type="button"
                                onClick={handleMarkAllRead}
                                disabled={unreadCount === 0 || markingAll || loading}
                                className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                            >
                                <CheckCheck className="h-4 w-4" />
                                {markingAll ? "Updating…" : "Mark all read"}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 border-t border-blue-100 bg-white/70 sm:grid-cols-3">
                        <div className="flex items-center gap-3 px-5 py-3.5 sm:px-7">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                <Inbox className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-lg font-extrabold leading-none text-slate-900">{totalCount}</p>
                                <p className="mt-1 text-xs font-medium text-slate-500">Total notifications</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-3.5 sm:border-l sm:border-t-0 sm:px-7">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                                <Bell className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-lg font-extrabold leading-none text-slate-900">{unreadCount}</p>
                                <p className="mt-1 text-xs font-medium text-slate-500">Waiting for you</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-3.5 sm:border-l sm:px-7">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                <CircleCheck className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-lg font-extrabold leading-none text-slate-900">{readCount}</p>
                                <p className="mt-1 text-xs font-medium text-slate-500">Already read</p>
                            </div>
                        </div>
                    </div>
                </header>

                {actionError && (
                    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                        <Bell className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>{actionError}</p>
                    </div>
                )}

                <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
                    <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-7">
                        <div>
                            <h2 className="text-base font-extrabold text-slate-900">Recent activity</h2>
                            <p className="mt-1 text-xs text-slate-500">
                                {visibleNotifications.length} shown · {totalCount} total
                            </p>
                        </div>

                        <div className="inline-flex w-fit rounded-xl bg-slate-100 p-1">
                            <button
                                type="button"
                                onClick={() => setFilter("all")}
                                aria-pressed={filter === "all"}
                                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition ${filter === "all"
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-500 hover:text-slate-800"
                                    }`}
                            >
                                All
                                <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${filter === "all" ? "bg-blue-50 text-blue-700" : "bg-slate-200 text-slate-500"}`}>
                                    {totalCount}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilter("unread")}
                                aria-pressed={filter === "unread"}
                                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition ${filter === "unread"
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-500 hover:text-slate-800"
                                    }`}
                            >
                                Unread
                                <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${filter === "unread" ? "bg-blue-50 text-blue-700" : "bg-slate-200 text-slate-500"}`}>
                                    {unreadCount}
                                </span>
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="space-y-3 p-4 sm:p-6">
                            <LoadingCard />
                            <LoadingCard />
                            <LoadingCard />
                        </div>
                    ) : error ? (
                        <div className="px-5 py-14 text-center sm:px-8">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                                <Bell className="h-5 w-5" />
                            </div>
                            <p className="mt-4 text-sm font-semibold text-slate-700">{error}</p>
                            <button
                                type="button"
                                onClick={() => loadNotifications(userId)}
                                className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                            >
                                <RotateCw className="h-4 w-4" />
                                Try again
                            </button>
                        </div>
                    ) : visibleNotifications.length === 0 ? (
                        <div className="px-5 py-14 text-center sm:px-8 sm:py-16">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                                {filter === "unread" ? (
                                    <Check className="h-6 w-6" />
                                ) : (
                                    <Inbox className="h-6 w-6" />
                                )}
                            </div>
                            <h3 className="mt-4 text-lg font-extrabold text-slate-900">
                                {filter === "unread" ? "You’re all caught up" : "No notifications yet"}
                            </h3>
                            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                                {filter === "unread"
                                    ? "There are no unread updates right now. You can switch back to all activity to review older notifications."
                                    : "When there’s new activity on your account, you’ll find it here."}
                            </p>
                            {filter === "unread" && (
                                <button
                                    type="button"
                                    onClick={() => setFilter("all")}
                                    className="mt-5 cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                >
                                    View all notifications
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3 p-3 sm:p-5 lg:p-6">
                            {visibleNotifications.map((notification) => {
                                const internalLink = getSafeInternalLink(notification.link);
                                const isMarking = markingId === notification.$id;
                                const style = getNotificationStyle(notification.type);

                                return (
                                    <article
                                        key={notification.$id}
                                        className={`relative overflow-hidden rounded-2xl border transition duration-200 hover:-translate-y-px hover:shadow-md ${notification.isRead
                                                ? "border-slate-200 bg-white hover:border-slate-300"
                                                : "border-blue-200 bg-linear-to-r from-blue-50/70 to-white shadow-sm shadow-blue-100/40 hover:border-blue-300"
                                            }`}
                                    >
                                        {!notification.isRead && (
                                            <span className="absolute inset-y-0 left-0 w-1 bg-blue-500" />
                                        )}
                                        <div className="flex gap-3 p-4 sm:gap-4 sm:p-5">
                                            <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${style.iconStyle}`}>
                                                {style.icon}
                                                {!notification.isRead && (
                                                    <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-blue-500" />
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className={`rounded-md px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide ${style.labelStyle}`}>
                                                                {style.label}
                                                            </span>
                                                            {!notification.isRead && (
                                                                <span className="rounded-md bg-blue-600 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white">
                                                                    New
                                                                </span>
                                                            )}
                                                        </div>

                                                        <h3 className={`mt-2 wrap-break-word text-sm sm:text-base ${notification.isRead ? "font-bold text-slate-800" : "font-extrabold text-slate-950"}`}>
                                                            {notification.title || "Notification"}
                                                        </h3>
                                                        <p className="mt-1.5 whitespace-pre-wrap wrap-break-word text-sm leading-6 text-slate-600">
                                                            {notification.message || "You have a new update."}
                                                        </p>

                                                        <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                                                            <Clock3 className="h-3.5 w-3.5" />
                                                            {formatNotificationDate(notification.createdAt || notification.$createdAt)}
                                                        </p>
                                                    </div>

                                                    <div className="flex shrink-0 items-center gap-2 self-start sm:pl-3">
                                                        {!notification.isRead && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleMarkRead(notification)}
                                                                disabled={isMarking}
                                                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-wait disabled:opacity-60"
                                                            >
                                                                <Check className="h-3.5 w-3.5" />
                                                                {isMarking ? "Saving…" : "Mark read"}
                                                            </button>
                                                        )}
                                                        {internalLink && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenNotification(notification)}
                                                                aria-label={`Open ${notification.title || "notification"}`}
                                                                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                                            >
                                                                <ArrowUpRight className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>

                {!loading && !error && totalCount > 0 && (
                    <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs font-medium text-slate-400">
                        <Clock3 className="h-3.5 w-3.5" />
                        Showing your latest {totalCount} notifications
                    </p>
                )}
            </div>
        </main>
    );
}
