import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Functions } from "appwrite";
import {
    AlertCircle,
    ArrowRight,
    BriefcaseBusiness,
    Building2,
    Check,
    CircleCheck,
    Clock3,
    Eye,
    EyeOff,
    FileText,
    GraduationCap,
    RefreshCw,
    Search,
    ShieldCheck,
    UserRound,
    Users,
    X,
    XCircle,
} from "lucide-react";

import { client } from "../lib/appwrite";

const functions = new Functions(client);
const ADMIN_STATS_FUNCTION_ID = import.meta.env
    .VITE_APPWRITE_ADMIN_STATS_FUNCTION_ID;

const TABS = [
    { id: "overview", label: "Overview", icon: ShieldCheck },
    { id: "users", label: "Users", icon: Users },
    { id: "companies", label: "Companies", icon: Building2 },
    { id: "jobs", label: "Jobs", icon: BriefcaseBusiness },
    { id: "internships", label: "Internships", icon: GraduationCap },
];

async function callAdminFunction(body) {
    if (!ADMIN_STATS_FUNCTION_ID) {
        throw new Error("Admin Function ID is not configured.");
    }

    const execution = await functions.createExecution({
        functionId: ADMIN_STATS_FUNCTION_ID,
        body: JSON.stringify(body),
        async: false,
    });

    if (execution.status !== "completed") {
        throw new Error(`Function execution status: ${execution.status}`);
    }

    let result;
    try {
        result = JSON.parse(execution.responseBody || "{}");
    } catch {
        throw new Error("The Admin Function returned invalid JSON.");
    }

    if (!result.success) {
        throw new Error(result.error || "The admin request could not be completed.");
    }

    return result.data ?? {};
}

function toCount(value) {
    const count = Number(value);
    return Number.isFinite(count) && count >= 0 ? count : 0;
}

function normalize(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");
}

function normalizeStats(data) {
    const users = data?.users || {};
    const jobs = data?.jobs || {};
    const applications = data?.applications || {};

    return {
        users: {
            total: toCount(users.total),
            students: toCount(users.students),
            companies: toCount(users.companies),
        },
        jobs: {
            total: toCount(jobs.total),
            active: toCount(jobs.active),
            closed: toCount(jobs.closed),
            draft: toCount(jobs.draft),
        },
        applications: {
            total: toCount(applications.total),
            applied: toCount(applications.applied),
            underReview: toCount(applications.underReview),
            shortlisted: toCount(applications.shortlisted),
            rejected: toCount(applications.rejected),
            selected: toCount(applications.selected),
        },
        recentJobs: Array.isArray(data?.recentJobs) ? data.recentJobs : [],
        recentApplications: Array.isArray(data?.recentApplications)
            ? data.recentApplications
            : [],
    };
}

function isInternshipListing(job) {
    const type = normalize(job?.jobType);
    if (type) return type.includes("intern");
    return normalize(job?.title).includes("internship");
}

function AdminDashboard() {
    const [activeTab, setActiveTab] = useState("overview");
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [verificationInitialized, setVerificationInitialized] = useState(false);

    const [loadingStats, setLoadingStats] = useState(true);
    const [loadingProfiles, setLoadingProfiles] = useState(false);
    const [loadingJobs, setLoadingJobs] = useState(false);
    const [profilesLoaded, setProfilesLoaded] = useState(false);
    const [jobsLoaded, setJobsLoaded] = useState(false);
    const [busyAction, setBusyAction] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const [userSearch, setUserSearch] = useState("");
    const [userStatusFilter, setUserStatusFilter] = useState("all");
    const [companySearch, setCompanySearch] = useState("");
    const [companyAccountFilter, setCompanyAccountFilter] = useState("all");
    const [companyVerificationFilter, setCompanyVerificationFilter] = useState("all");
    const [jobSearch, setJobSearch] = useState("");
    const [jobStatusFilter, setJobStatusFilter] = useState("all");
    const [jobVisibilityFilter, setJobVisibilityFilter] = useState("all");

    const [detailModal, setDetailModal] = useState(null);
    const detailRequestId = useRef(0);

    const loadStats = useCallback(async () => {
        setLoadingStats(true);
        setError("");

        try {
            const data = await callAdminFunction({ action: "adminDashboardStats" });
            setStats(normalizeStats(data));
        } catch (loadError) {
            console.error("Admin dashboard error:", loadError);
            setError(loadError?.message || "Failed to load dashboard statistics.");
        } finally {
            setLoadingStats(false);
        }
    }, []);

    const loadProfiles = useCallback(async () => {
        setLoadingProfiles(true);
        setError("");

        try {
            const data = await callAdminFunction({ action: "adminListProfiles" });
            const fallbackPeople = Array.isArray(data.people) ? data.people : [];
            const nextCompanies = Array.isArray(data.companies)
                ? data.companies
                : fallbackPeople.filter((person) => normalize(person.role) === "company");
            const nextUsers = Array.isArray(data.users)
                ? data.users
                : fallbackPeople.filter((person) => normalize(person.role) !== "company");

            setUsers(nextUsers);
            setCompanies(nextCompanies);
            setVerificationInitialized(Boolean(data.verificationInitialized));
            setProfilesLoaded(true);
        } catch (loadError) {
            console.error("Admin profile load error:", loadError);
            setError(loadError?.message || "Could not load users and companies.");
        } finally {
            setLoadingProfiles(false);
        }
    }, []);

    const loadJobs = useCallback(async () => {
        setLoadingJobs(true);
        setError("");

        try {
            const data = await callAdminFunction({ action: "adminListJobs" });
            setJobs(Array.isArray(data.jobs) ? data.jobs : []);
            setJobsLoaded(true);
        } catch (loadError) {
            console.error("Admin listings load error:", loadError);
            setError(loadError?.message || "Could not load job and internship listings.");
        } finally {
            setLoadingJobs(false);
        }
    }, []);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    useEffect(() => {
        if ((activeTab === "users" || activeTab === "companies") && !profilesLoaded) {
            loadProfiles();
        }
        if ((activeTab === "jobs" || activeTab === "internships") && !jobsLoaded) {
            loadJobs();
        }
    }, [activeTab, profilesLoaded, jobsLoaded, loadProfiles, loadJobs]);

    const handleRefresh = () => {
        setNotice("");
        if (activeTab === "users" || activeTab === "companies") return loadProfiles();
        if (activeTab === "jobs" || activeTab === "internships") return loadJobs();
        return loadStats();
    };

    const handleJobVisibility = async (job) => {
        const nextVisibility = job.adminVisibility === "Hidden" ? "Visible" : "Hidden";
        const prompt = nextVisibility === "Hidden"
            ? `Hide “${job.title}” from public listings? The company's Active/Closed/Draft status will not change.`
            : `Restore “${job.title}” to public listings?`;

        if (!window.confirm(prompt)) return;

        const actionKey = `job:${job.id}`;
        setBusyAction(actionKey);
        setError("");
        setNotice("");

        try {
            await callAdminFunction({
                action: "adminSetJobVisibility",
                jobId: job.id,
                visibility: nextVisibility,
            });
            setNotice(nextVisibility === "Hidden"
                ? "Listing hidden from public listings."
                : "Listing restored to public listings.");
            await Promise.all([loadJobs(), loadStats()]);
        } catch (actionError) {
            console.error("Listing moderation failed:", actionError);
            setError(actionError?.message || "Could not update this listing.");
        } finally {
            setBusyAction("");
        }
    };

    const handleAccountStatus = async (person) => {
        const nextStatus = person.accountStatus === "Suspended" ? "Active" : "Suspended";
        const prompt = nextStatus === "Suspended"
            ? `Suspend ${person.name || person.email || "this account"}? They will not be able to sign in.`
            : `Reactivate ${person.name || person.email || "this account"}?`;

        if (!window.confirm(prompt)) return;

        const actionKey = `account:${person.userId}`;
        setBusyAction(actionKey);
        setError("");
        setNotice("");

        try {
            await callAdminFunction({
                action: "adminSetAccountStatus",
                userId: person.userId,
                accountStatus: nextStatus,
            });
            setNotice(nextStatus === "Suspended" ? "Account suspended." : "Account reactivated.");
            await Promise.all([loadProfiles(), loadStats()]);
        } catch (actionError) {
            console.error("Account status update failed:", actionError);
            setError(actionError?.message || "Could not update this account.");
        } finally {
            setBusyAction("");
        }
    };

    const handleCompanyVerification = async (person, verificationStatus) => {
        const actionKey = `verification:${person.userId}`;
        setBusyAction(actionKey);
        setError("");
        setNotice("");

        try {
            await callAdminFunction({
                action: "adminSetCompanyVerification",
                userId: person.userId,
                verificationStatus,
            });
            setNotice(`${person.companyName || person.name || "Company"} marked ${verificationStatus.toLowerCase()}.`);
            await loadProfiles();
        } catch (actionError) {
            console.error("Company verification update failed:", actionError);
            setError(actionError?.message || "Could not update company verification.");
        } finally {
            setBusyAction("");
        }
    };

    const handleBootstrapCompanies = async () => {
        const confirmed = window.confirm(
            "This one-time action will mark current company profiles as approved. New company profiles created afterward will start as pending. Continue?"
        );
        if (!confirmed) return;

        setBusyAction("company-bootstrap");
        setError("");
        setNotice("");

        try {
            const data = await callAdminFunction({
                action: "adminBootstrapExistingCompanies",
            });
            const approved = toCount(data.companiesApproved);
            setNotice(
                data.alreadyInitialized
                    ? "Existing-company verification was already initialized."
                    : `${approved} existing compan${approved === 1 ? "y" : "ies"} marked approved. New companies will start pending.`
            );
            await loadProfiles();
        } catch (actionError) {
            console.error("Company verification setup failed:", actionError);
            setError(actionError?.message || "Could not initialize company verification.");
        } finally {
            setBusyAction("");
        }
    };

    const openDetails = async (kind, item) => {
        const requestId = detailRequestId.current + 1;
        detailRequestId.current = requestId;
        setDetailModal({ kind, item, loading: true, data: null, error: "" });

        try {
            const action = kind === "listing" ? "adminGetJobDetails" : "adminGetProfileDetails";
            const request = kind === "listing"
                ? { action, jobId: item.id }
                : { action, userId: item.userId };
            const data = await callAdminFunction(request);

            if (detailRequestId.current === requestId) {
                setDetailModal({ kind, item, loading: false, data, error: "" });
            }
        } catch (detailError) {
            console.error("Could not load admin details:", detailError);
            if (detailRequestId.current === requestId) {
                setDetailModal({
                    kind,
                    item,
                    loading: false,
                    data: null,
                    error: detailError?.message || "Could not load these details.",
                });
            }
        }
    };

    const closeDetails = useCallback(() => {
        detailRequestId.current += 1;
        setDetailModal(null);
    }, []);

    const filteredUsers = useMemo(() => {
        const query = userSearch.trim().toLowerCase();

        return users.filter((person) => {
            const matchesStatus = userStatusFilter === "all" || person.accountStatus === userStatusFilter;
            const haystack = [
                person.name,
                person.email,
                person.userId,
                person.phone,
                person.city,
                person.state,
                person.role,
            ].join(" ").toLowerCase();
            return matchesStatus && (!query || haystack.includes(query));
        });
    }, [users, userSearch, userStatusFilter]);

    const filteredCompanies = useMemo(() => {
        const query = companySearch.trim().toLowerCase();

        return companies.filter((company) => {
            const matchesAccount = companyAccountFilter === "all" || company.accountStatus === companyAccountFilter;
            const matchesVerification = companyVerificationFilter === "all" || company.companyVerificationStatus === companyVerificationFilter;
            const haystack = [
                company.name,
                company.companyName,
                company.email,
                company.userId,
                company.phone,
                company.city,
                company.state,
                company.industry,
                company.companyWebsite,
            ].join(" ").toLowerCase();
            return matchesAccount && matchesVerification && (!query || haystack.includes(query));
        });
    }, [companies, companySearch, companyAccountFilter, companyVerificationFilter]);

    const currentListingCategory = activeTab === "internships" ? "internship" : "job";
    const listingsForTab = useMemo(() => {
        return jobs.filter((job) => isInternshipListing(job) === (currentListingCategory === "internship"));
    }, [jobs, currentListingCategory]);

    const filteredListings = useMemo(() => {
        const query = jobSearch.trim().toLowerCase();

        return listingsForTab.filter((job) => {
            const matchesStatus = jobStatusFilter === "all" || normalize(job.status) === jobStatusFilter;
            const matchesVisibility = jobVisibilityFilter === "all" || normalize(job.adminVisibility) === jobVisibilityFilter;
            const haystack = [job.title, job.companyName, job.companyId, job.id, job.jobType].join(" ").toLowerCase();
            return matchesStatus && matchesVisibility && (!query || haystack.includes(query));
        });
    }, [listingsForTab, jobSearch, jobStatusFilter, jobVisibilityFilter]);

    if (loadingStats && !stats) return <DashboardLoading />;
    if (error && !stats) return <DashboardError message={error} onRetry={loadStats} />;

    const summaryCards = [
        {
            title: "Total profiles",
            value: stats.users.total,
            description: "Student and company profiles",
            icon: Users,
            tone: "blue",
        },
        {
            title: "Students",
            value: stats.users.students,
            description: "Student profiles",
            icon: GraduationCap,
            tone: "violet",
        },
        {
            title: "Companies",
            value: stats.users.companies,
            description: "Company profiles",
            icon: Building2,
            tone: "amber",
        },
        {
            title: "Total listings",
            value: stats.jobs.total,
            description: "Jobs and internships posted",
            icon: BriefcaseBusiness,
            tone: "emerald",
        },
        {
            title: "Applications",
            value: stats.applications.total,
            description: "Applications submitted",
            icon: FileText,
            tone: "cyan",
        },
    ];

    const getTabCount = (tabId) => {
        if (tabId === "users") return profilesLoaded ? users.length : stats.users.students;
        if (tabId === "companies") return profilesLoaded ? companies.length : stats.users.companies;
        if (tabId === "jobs") {
            return jobsLoaded
                ? jobs.filter((job) => !isInternshipListing(job)).length
                : stats.jobs.total;
        }
        if (tabId === "internships") {
            return jobsLoaded ? jobs.filter(isInternshipListing).length : null;
        }
        return null;
    };

    return (
        <main className="min-h-screen bg-slate-50 pb-12">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                <header className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div className="flex min-w-0 items-start gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                            <ShieldCheck className="h-6 w-6" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Administration</p>
                            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Platform control center</h1>
                            <p className="mt-2 text-sm leading-6 text-slate-500">Review platform activity and manage users, companies, and listing visibility.</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Link to="/jobs" className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900">
                            Browse jobs <ArrowRight className="h-4 w-4" />
                        </Link>
                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={loadingStats || loadingProfiles || loadingJobs}
                            className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <RefreshCw className={`h-4 w-4 ${(loadingStats || loadingProfiles || loadingJobs) ? "animate-spin" : ""}`} />
                            Refresh {activeTab === "overview" ? "data" : activeTab === "users" || activeTab === "companies" ? "profiles" : "listings"}
                        </button>
                    </div>
                </header>

                <div className="mt-6 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm" role="tablist" aria-label="Admin sections">
                    {TABS.map(({ id, label, icon: Icon }) => {
                        const count = getTabCount(id);
                        const selected = activeTab === id;
                        return (
                            <button
                                key={id}
                                type="button"
                                role="tab"
                                aria-selected={selected}
                                onClick={() => { setActiveTab(id); setError(""); setNotice(""); }}
                                className={`inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${selected ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
                            >
                                <Icon className="h-4 w-4" />
                                {label}
                                {count !== null && count !== undefined && (
                                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${selected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                                        {toCount(count)}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {error && stats && activeTab !== "overview" && (
                    <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                        <div><p className="text-sm font-semibold">Action could not be completed</p><p className="mt-0.5 text-sm text-rose-800">{error}</p></div>
                    </div>
                )}
                {notice && (
                    <div role="status" aria-live="polite" className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
                        <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                        <p className="text-sm font-medium">{notice}</p>
                    </div>
                )}

                {activeTab === "overview" && (
                    <OverviewTab stats={stats} summaryCards={summaryCards} loadingStats={loadingStats} error={error} onRetry={loadStats} />
                )}

                {activeTab === "users" && (
                    <UsersTab
                        users={filteredUsers}
                        total={users.length}
                        loading={loadingProfiles}
                        loaded={profilesLoaded}
                        search={userSearch}
                        onSearch={setUserSearch}
                        statusFilter={userStatusFilter}
                        onStatusFilter={setUserStatusFilter}
                        busyAction={busyAction}
                        onDetails={(person) => openDetails("profile", person)}
                        onAccountStatus={handleAccountStatus}
                    />
                )}

                {activeTab === "companies" && (
                    <CompaniesTab
                        companies={filteredCompanies}
                        total={companies.length}
                        loading={loadingProfiles}
                        loaded={profilesLoaded}
                        verificationInitialized={verificationInitialized}
                        search={companySearch}
                        onSearch={setCompanySearch}
                        accountFilter={companyAccountFilter}
                        onAccountFilter={setCompanyAccountFilter}
                        verificationFilter={companyVerificationFilter}
                        onVerificationFilter={setCompanyVerificationFilter}
                        busyAction={busyAction}
                        onDetails={(company) => openDetails("company", company)}
                        onAccountStatus={handleAccountStatus}
                        onVerification={handleCompanyVerification}
                        onBootstrap={handleBootstrapCompanies}
                    />
                )}

                {(activeTab === "jobs" || activeTab === "internships") && (
                    <ListingsTab
                        listingType={activeTab}
                        jobs={filteredListings}
                        total={listingsForTab.length}
                        loading={loadingJobs}
                        loaded={jobsLoaded}
                        search={jobSearch}
                        onSearch={setJobSearch}
                        statusFilter={jobStatusFilter}
                        onStatusFilter={setJobStatusFilter}
                        visibilityFilter={jobVisibilityFilter}
                        onVisibilityFilter={setJobVisibilityFilter}
                        busyAction={busyAction}
                        onDetails={(job) => openDetails("listing", job)}
                        onVisibility={handleJobVisibility}
                    />
                )}
            </div>

            <DetailsModal detail={detailModal} onClose={closeDetails} />
        </main>
    );
}

function OverviewTab({ stats, summaryCards, loadingStats, error, onRetry }) {
    return (
        <>
            {error && stats && (
                <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                    <div><p className="text-sm font-semibold">Could not refresh the latest data</p><p className="mt-0.5 text-sm text-amber-800">Showing the last successfully loaded snapshot. {error}</p></div>
                    <button type="button" onClick={onRetry} className="ml-auto cursor-pointer text-sm font-semibold underline">Retry</button>
                </div>
            )}

            <section className="mt-7" aria-labelledby="platform-stats-heading">
                <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 id="platform-stats-heading" className="text-lg font-bold tracking-tight text-slate-900">Platform statistics</h2>
                        <p className="mt-1 text-sm text-slate-500">Key totals across the current platform data.</p>
                    </div>
                    <span className="text-xs font-medium text-slate-400">Snapshot updates when you refresh</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {summaryCards.map((card) => <SummaryCard key={card.title} {...card} />)}
                </div>
            </section>

            <section className="mt-7 grid gap-5 lg:grid-cols-2" aria-label="Status summaries">
                <StatusSummaryPanel title="Listings overview" subtitle="Job and internship postings grouped by current status" total={stats.jobs.total} items={[
                    { label: "Active listings", value: stats.jobs.active, tone: "emerald" },
                    { label: "Closed listings", value: stats.jobs.closed, tone: "slate" },
                    { label: "Draft listings", value: stats.jobs.draft, tone: "amber" },
                ]} />
                <StatusSummaryPanel title="Application overview" subtitle="Candidate progress across all listings" total={stats.applications.total} items={[
                    { label: "Applied", value: stats.applications.applied, tone: "blue" },
                    { label: "Under review", value: stats.applications.underReview, tone: "amber" },
                    { label: "Shortlisted", value: stats.applications.shortlisted, tone: "emerald" },
                    { label: "Selected", value: stats.applications.selected, tone: "violet" },
                    { label: "Rejected", value: stats.applications.rejected, tone: "rose" },
                ]} />
            </section>

            <section className="mt-7 grid gap-5 lg:grid-cols-2" aria-label="Recent platform activity">
                <RecentJobsPanel jobs={stats.recentJobs} />
                <RecentApplicationsPanel applications={stats.recentApplications} />
            </section>
            {loadingStats && <p className="mt-4 text-right text-xs text-slate-400">Refreshing snapshot…</p>}
        </>
    );
}

function UsersTab({
    users,
    total,
    loading,
    loaded,
    search,
    onSearch,
    statusFilter,
    onStatusFilter,
    busyAction,
    onDetails,
    onAccountStatus,
}) {
    return (
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Users className="h-4 w-4" /></span>
                            <h2 className="text-lg font-bold text-slate-900">Users</h2>
                        </div>
                        <p className="mt-2 text-sm text-slate-500">Student and other non-company accounts. Open a profile/resume or suspend and reactivate account access.</p>
                    </div>
                    <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{total.toLocaleString("en-IN")} users</span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(220px,1fr)_190px]">
                    <SearchInput value={search} onChange={onSearch} placeholder="Search name, email, user ID…" label="Search users" />
                    <select value={statusFilter} onChange={(event) => onStatusFilter(event.target.value)} className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10">
                        <option value="all">All account states</option>
                        <option value="Active">Active</option>
                        <option value="Suspended">Suspended</option>
                        <option value="Auth account not found">Auth account not found</option>
                    </select>
                </div>
            </div>

            {loading ? <TableLoading label="Loading users…" /> : !loaded ? <EmptyPanelMessage message="The user list has not loaded yet." /> : users.length === 0 ? <EmptyPanelMessage message="No users match these filters." /> : (
                <div className="overflow-x-auto">
                    <table className="min-w-232.5 w-full text-left">
                        <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="px-5 py-3.5">User</th>
                                <th className="px-5 py-3.5">Role</th>
                                <th className="px-5 py-3.5">Account</th>
                                <th className="px-5 py-3.5">Joined</th>
                                <th className="px-5 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map((person) => {
                                const busy = busyAction === `account:${person.userId}`;
                                const accountExists = person.accountStatus !== "Auth account not found";
                                return (
                                    <tr key={person.profileId || person.userId} className="align-middle transition hover:bg-slate-50/70">
                                        <td className="px-5 py-4">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><UserRound className="h-4 w-4" /></span>
                                                <div className="min-w-0">
                                                    <p className="max-w-65 truncate text-sm font-semibold text-slate-900">{person.name || "Unnamed user"}</p>
                                                    <p className="mt-0.5 max-w-70 truncate text-xs text-slate-500">{person.email || "No email available"}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4"><RoleBadge role={person.role} /></td>
                                        <td className="px-5 py-4"><StateBadge label={person.accountStatus} kind={person.accountStatus === "Suspended" ? "rose" : person.accountStatus === "Active" ? "emerald" : "slate"} /></td>
                                        <td className="px-5 py-4 text-xs text-slate-500">{person.createdAt ? formatDate(person.createdAt) : "Date unavailable"}</td>
                                        <td className="px-5 py-4">
                                            <div className="flex justify-end gap-2">
                                                <button type="button" onClick={() => onDetails(person)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 transition hover:bg-blue-100">
                                                    <FileText className="h-3.5 w-3.5" />{person.role === "student" ? "Profile & resume" : "View profile"}
                                                </button>
                                                {accountExists && (
                                                    <button type="button" onClick={() => onAccountStatus(person)} disabled={busy} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${person.accountStatus === "Suspended" ? "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"}`}>
                                                        {busy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : person.accountStatus === "Suspended" ? <CircleCheck className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                                                        {person.accountStatus === "Suspended" ? "Reactivate" : "Suspend"}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            <ListFooter shown={users.length} total={total} label="users" />
        </section>
    );
}

function CompaniesTab({
    companies,
    total,
    loading,
    loaded,
    verificationInitialized,
    search,
    onSearch,
    accountFilter,
    onAccountFilter,
    verificationFilter,
    onVerificationFilter,
    busyAction,
    onDetails,
    onAccountStatus,
    onVerification,
    onBootstrap,
}) {
    return (
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Building2 className="h-4 w-4" /></span>
                            <h2 className="text-lg font-bold text-slate-900">Companies</h2>
                        </div>
                        <p className="mt-2 text-sm text-slate-500">Review company profiles and separate job and internship posting totals. Approve, reject, suspend, or reactivate.</p>
                    </div>
                    <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{total.toLocaleString("en-IN")} companies</span>
                </div>

                {!verificationInitialized && loaded && (
                    <div className="mt-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                            <div>
                                <p className="text-sm font-semibold text-amber-950">Initialize company verification</p>
                                <p className="mt-1 text-xs leading-5 text-amber-800">One-time setup: current companies without a previous decision will be marked approved. New companies will then show as pending.</p>
                            </div>
                        </div>
                        <button type="button" onClick={onBootstrap} disabled={busyAction === "company-bootstrap"} className="inline-flex cursor-pointer shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-700 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60">
                            {busyAction === "company-bootstrap" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            Mark existing companies approved
                        </button>
                    </div>
                )}

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_180px_190px]">
                    <SearchInput value={search} onChange={onSearch} placeholder="Search company, email, industry…" label="Search companies" />
                    <select value={accountFilter} onChange={(event) => onAccountFilter(event.target.value)} className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10">
                        <option value="all">All account states</option>
                        <option value="Active">Active</option>
                        <option value="Suspended">Suspended</option>
                        <option value="Auth account not found">Auth account not found</option>
                    </select>
                    <select value={verificationFilter} onChange={(event) => onVerificationFilter(event.target.value)} className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10">
                        <option value="all">All verification states</option>
                        <option value="Approved">Approved</option>
                        <option value="Pending">Pending</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Needs setup">Needs setup</option>
                    </select>
                </div>
            </div>

            {loading ? <TableLoading label="Loading companies…" /> : !loaded ? <EmptyPanelMessage message="The company list has not loaded yet." /> : companies.length === 0 ? <EmptyPanelMessage message="No companies match these filters." /> : (
                <div className="overflow-x-auto">
                    <table className="min-w-312.5 w-full text-left">
                        <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="px-5 py-3.5">Company</th>
                                <th className="px-5 py-3.5">Jobs</th>
                                <th className="px-5 py-3.5">Internships</th>
                                <th className="px-5 py-3.5">Account</th>
                                <th className="px-5 py-3.5">Verification</th>
                                <th className="px-5 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {companies.map((company) => {
                                const accountBusy = busyAction === `account:${company.userId}`;
                                const verificationBusy = busyAction === `verification:${company.userId}`;
                                const accountExists = company.accountStatus !== "Auth account not found";
                                const verification = company.companyVerificationStatus || "Pending";

                                return (
                                    <tr key={company.profileId || company.userId} className="align-middle transition hover:bg-slate-50/70">
                                        <td className="px-5 py-4">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Building2 className="h-4 w-4" /></span>
                                                <div className="min-w-0">
                                                    <p className="max-w-62.5 truncate text-sm font-semibold text-slate-900">{company.companyName || company.name || "Unnamed company"}</p>
                                                    <p className="mt-0.5 max-w-70 truncate text-xs text-slate-500">{company.email || company.companyWebsite || "No contact email"}</p>
                                                    {(company.industry || company.city || company.state) && <p className="mt-1 max-w-70 truncate text-xs text-slate-400">{[company.industry, company.city, company.state].filter(Boolean).join(" · ")}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4"><CountPill value={toCount(company.jobCount)} label="jobs" tone="blue" /></td>
                                        <td className="px-5 py-4"><CountPill value={toCount(company.internshipCount)} label="internships" tone="violet" /></td>
                                        <td className="px-5 py-4"><StateBadge label={company.accountStatus} kind={company.accountStatus === "Suspended" ? "rose" : company.accountStatus === "Active" ? "emerald" : "slate"} /></td>
                                        <td className="px-5 py-4"><StateBadge label={verification} kind={verification === "Approved" ? "emerald" : verification === "Rejected" ? "rose" : verification === "Needs setup" ? "amber" : "slate"} /></td>
                                        <td className="px-5 py-4">
                                            <div className="flex justify-end gap-2">
                                                <button type="button" onClick={() => onDetails(company)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2 text-xs font-semibold text-blue-800 transition hover:bg-blue-100">
                                                    <Building2 className="h-3.5 w-3.5" />Details
                                                </button>
                                                {verification !== "Approved" && (
                                                    <button type="button" onClick={() => onVerification(company, "Approved")} disabled={verificationBusy || !accountExists} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50">
                                                        <Check className="h-3.5 w-3.5" />Approve
                                                    </button>
                                                )}
                                                {verification !== "Rejected" && (
                                                    <button type="button" onClick={() => onVerification(company, "Rejected")} disabled={verificationBusy || !accountExists} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50">
                                                        <XCircle className="h-3.5 w-3.5" />Reject
                                                    </button>
                                                )}
                                                {accountExists && (
                                                    <button type="button" onClick={() => onAccountStatus(company)} disabled={accountBusy} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${company.accountStatus === "Suspended" ? "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"}`}>
                                                        {accountBusy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : company.accountStatus === "Suspended" ? <CircleCheck className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                                                        {company.accountStatus === "Suspended" ? "Reactivate" : "Suspend"}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            <ListFooter shown={companies.length} total={total} label="companies" />
        </section>
    );
}

function ListingsTab({
    listingType,
    jobs,
    total,
    loading,
    loaded,
    search,
    onSearch,
    statusFilter,
    onStatusFilter,
    visibilityFilter,
    onVisibilityFilter,
    busyAction,
    onDetails,
    onVisibility,
}) {
    const isInternship = listingType === "internships";
    const heading = isInternship ? "Internship moderation" : "Job moderation";
    const noun = isInternship ? "internships" : "jobs";

    return (
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">{isInternship ? <GraduationCap className="h-4 w-4" /> : <BriefcaseBusiness className="h-4 w-4" />}</span><h2 className="text-lg font-bold text-slate-900">{heading}</h2></div>
                        <p className="mt-2 text-sm text-slate-500">Review applicant totals and listing details. Hide or restore a listing without changing the company’s Active/Closed/Draft status.</p>
                    </div>
                    <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{total.toLocaleString("en-IN")} {noun}</span>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_170px_180px]">
                    <SearchInput value={search} onChange={onSearch} placeholder="Search title, company, ID…" label={`Search ${noun}`} />
                    <select value={statusFilter} onChange={(event) => onStatusFilter(event.target.value)} className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10">
                        <option value="all">All listing states</option>
                        <option value="active">Active</option>
                        <option value="closed">Closed</option>
                        <option value="draft">Draft</option>
                    </select>
                    <select value={visibilityFilter} onChange={(event) => onVisibilityFilter(event.target.value)} className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10">
                        <option value="all">All visibility</option>
                        <option value="visible">Visible</option>
                        <option value="hidden">Hidden</option>
                    </select>
                </div>
            </div>

            {loading ? <TableLoading label={`Loading ${noun}…`} /> : !loaded ? <EmptyPanelMessage message={`${isInternship ? "Internships" : "Jobs"} have not loaded yet.`} /> : jobs.length === 0 ? <EmptyPanelMessage message={`No ${noun} match these filters.`} /> : (
                <div className="overflow-x-auto">
                    <table className="min-w-275 w-full text-left">
                        <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="px-5 py-3.5">Listing</th>
                                <th className="px-5 py-3.5">Company</th>
                                <th className="px-5 py-3.5">Applicants</th>
                                <th className="px-5 py-3.5">Company-set status</th>
                                <th className="px-5 py-3.5">Admin visibility</th>
                                <th className="px-5 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {jobs.map((job) => {
                                const hidden = job.adminVisibility === "Hidden";
                                const isBusy = busyAction === `job:${job.id}`;
                                return (
                                    <tr key={job.id} className="transition hover:bg-slate-50/70">
                                        <td className="px-5 py-4">
                                            <p className="max-w-[320px] truncate text-sm font-semibold text-slate-900">{job.title || "Untitled listing"}</p>
                                            <p className="mt-1 text-xs text-slate-500">{job.jobType || (isInternship ? "Internship" : "Job")}</p>
                                            <p className="mt-1 text-[11px] text-slate-400">ID: {job.id}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="max-w-52.5 truncate text-sm text-slate-700">{job.companyName || "Company not specified"}</p>
                                            <p className="mt-1 text-xs text-slate-400">{job.createdAt ? formatDate(job.createdAt) : "Date unavailable"}</p>
                                        </td>
                                        <td className="px-5 py-4"><CountPill value={toCount(job.applicantCount)} label={toCount(job.applicantCount) === 1 ? "applicant" : "applicants"} tone="blue" /></td>
                                        <td className="px-5 py-4"><JobStatusBadge status={job.status} /></td>
                                        <td className="px-5 py-4"><StateBadge label={hidden ? "Hidden" : "Visible"} kind={hidden ? "rose" : "emerald"} /></td>
                                        <td className="px-5 py-4">
                                            <div className="flex justify-end gap-2">
                                                <button type="button" onClick={() => onDetails(job)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 transition hover:bg-blue-100">
                                                    <FileText className="h-3.5 w-3.5" />Details
                                                </button>
                                                <button type="button" onClick={() => onVisibility(job)} disabled={isBusy} className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${hidden ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"}`}>
                                                    {isBusy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                                    {hidden ? "Restore" : "Hide"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            <ListFooter shown={jobs.length} total={total} label={noun} />
        </section>
    );
}

function DetailsModal({ detail, onClose }) {
    useEffect(() => {
        if (!detail) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [detail, onClose]);

    if (!detail) return null;

    const title = detail.kind === "listing"
        ? detail.item?.title || "Listing details"
        : detail.kind === "company"
            ? detail.item?.companyName || detail.item?.name || "Company details"
            : detail.item?.name || "User profile";
    const subtitle = detail.kind === "listing"
        ? "Listing information and applicant total"
        : detail.kind === "company"
            ? "Company profile and posting totals"
            : "Account profile and saved resume";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6" onClick={onClose}>
            <section
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onClick={(event) => event.stopPropagation()}
                className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
                <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">Admin details</p>
                        <h2 className="mt-1 truncate text-xl font-bold text-slate-900">{title}</h2>
                        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
                    </div>
                    <button type="button" aria-label="Close details" onClick={onClose} className="inline-flex h-9 w-9 cursor-pointer shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
                        <X className="h-4 w-4" />
                    </button>
                </header>

                <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
                    {detail.loading ? (
                        <div className="flex min-h-48 items-center justify-center gap-3 text-sm font-medium text-slate-500"><RefreshCw className="h-5 w-5 animate-spin text-blue-600" />Loading details…</div>
                    ) : detail.error ? (
                        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><p className="font-semibold">Details could not be loaded</p><p className="mt-1">{detail.error}</p></div>
                    ) : detail.kind === "listing" ? (
                        <ListingDetails data={detail.data || {}} fallback={detail.item || {}} />
                    ) : (
                        <ProfileDetails kind={detail.kind} data={detail.data || {}} fallback={detail.item || {}} />
                    )}
                </div>
            </section>
        </div>
    );
}

function ProfileDetails({ kind, data, fallback }) {
    const profile = data.profile || {};
    const user = data.user || {};
    const role = normalize(profile.role || fallback.role);
    const company = kind === "company" || role === "company";
    const displayName = company
        ? profile.companyName || fallback.companyName || user.name || fallback.name || "Company"
        : user.name || fallback.name || "User";
    const accountFields = [
        { label: "Name", value: user.name || fallback.name },
        { label: "Email", value: user.email || fallback.email },
        { label: "Phone", value: user.phone || profile.phone || profile.companyPhone || fallback.phone },
        { label: "Account status", value: user.accountStatus || fallback.accountStatus },
        { label: "User ID", value: user.userId || fallback.userId },
        { label: "Created", value: formatDate(user.createdAt || profile.createdAt || fallback.createdAt) },
    ];
    const omittedProfileKeys = new Set([
        "userId",
        "role",
        "profileId",
        "resumeId",
        "createdAt",
        "updatedAt",
        "profilePictureId",
    ]);
    const profileFields = objectDetailFields(profile, omittedProfileKeys);
    const resume = data.resume;
    const jobCounts = data.jobCounts || {};

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${company ? "bg-amber-50 text-amber-700" : "bg-violet-50 text-violet-700"}`}>
                    {company ? <Building2 className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
                </span>
                <div className="min-w-0">
                    <h3 className="truncate text-lg font-bold text-slate-900">{displayName}</h3>
                    <p className="mt-0.5 text-sm text-slate-500">{company ? "Company account" : role ? role.charAt(0).toUpperCase() + role.slice(1) : "User account"}</p>
                </div>
            </div>

            {company && (
                <section>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Posting totals</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <CountPill value={toCount(jobCounts.jobs ?? fallback.jobCount)} label="jobs posted" tone="blue" large />
                        <CountPill value={toCount(jobCounts.internships ?? fallback.internshipCount)} label="internships posted" tone="violet" large />
                    </div>
                </section>
            )}

            <DetailSection title="Account">
                <DetailGrid fields={accountFields} />
            </DetailSection>

            <DetailSection title={company ? "Company profile" : "User profile"}>
                {profileFields.length ? <DetailGrid fields={profileFields} /> : <EmptyDetailText message="No additional profile details are available." />}
            </DetailSection>

            {!company && role === "student" && (
                <DetailSection title="Resume">
                    {resume ? (
                        <div className="space-y-3">
                            <DetailField label="Summary" value={resume.summary} wide />
                            <DetailField label="Education" value={resume.education} wide />
                            <DetailField label="Projects" value={resume.projects} wide />
                            <DetailField label="Certifications" value={resume.certifications} wide />
                            <DetailField label="Experience" value={resume.experience} wide />
                            <DetailField label="Achievements" value={resume.achievements} wide />
                        </div>
                    ) : (
                        <EmptyDetailText message="This user has not created a resume yet." />
                    )}
                </DetailSection>
            )}
        </div>
    );
}

function ListingDetails({ data, fallback }) {
    const job = data.job || fallback;
    const applicantCount = toCount(data.applicantCount ?? job.applicantCount);
    const fields = [
        { label: "Listing ID", value: job.id || fallback.id },
        { label: "Type", value: job.jobType || "Job" },
        { label: "Company", value: job.companyName },
        { label: "Company ID", value: job.companyId },
        { label: "Location", value: job.location },
        { label: "Work mode", value: job.workMode },
        { label: "Salary / stipend", value: job.salary },
        { label: "Experience", value: job.experience },
        { label: "Education", value: job.education },
        { label: "Required skills", value: job.skills },
        { label: "Deadline", value: job.deadline ? formatDate(job.deadline) : "Not specified" },
        { label: "Posted", value: job.createdAt ? formatDate(job.createdAt) : "Date unavailable" },
        { label: "Company-set status", value: job.status || "Unknown" },
        { label: "Admin visibility", value: job.adminVisibility || "Visible" },
        { label: "Applicants", value: applicantCount },
    ];

    return (
        <div className="space-y-5">
            <DetailSection title="Listing information">
                <DetailGrid fields={fields} />
            </DetailSection>
            <DetailSection title="Description">
                <DetailField label="Job / internship description" value={job.description} wide />
            </DetailSection>
        </div>
    );
}

function DetailSection({ title, children }) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h3>
            {children}
        </section>
    );
}

function DetailGrid({ fields }) {
    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) => (
                <DetailField key={field.label} label={field.label} value={field.value} wide={field.wide} />
            ))}
        </div>
    );
}

function DetailField({ label, value, wide = false }) {
    const text = displayValue(value);
    return (
        <div className={`min-w-0 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 ${wide ? "sm:col-span-2" : ""}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
            <p className="mt-1.5 whitespace-pre-line wrap-break-word text-sm leading-6 text-slate-700">{text || "Not provided"}</p>
        </div>
    );
}

function EmptyDetailText({ message }) {
    return <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">{message}</p>;
}

function objectDetailFields(object, omittedKeys = new Set()) {
    return Object.entries(object || {})
        .filter(([key, value]) => !omittedKeys.has(key) && displayValue(value).trim() !== "")
        .map(([key, value]) => ({ label: humanizeKey(key), value }));
}

function humanizeKey(key) {
    const labels = {
        companyWebsite: "Company website",
        companyName: "Company name",
        companySize: "Company size",
        companyPhone: "Company phone",
        dateOfBirth: "Date of birth",
        preferredJobType: "Preferred job type",
        profilePictureId: "Profile picture",
        linkedin: "LinkedIn",
        github: "GitHub",
    };
    if (labels[key]) return labels[key];
    return String(key)
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .replace(/^./, (character) => character.toUpperCase());
}

function displayValue(value) {
    if (value === null || value === undefined) return "";
    if (Array.isArray(value)) return value.map(displayValue).filter(Boolean).join(", ");
    if (typeof value === "object") {
        const namedValue = value.name ?? value.label ?? value.value;
        if (namedValue !== null && namedValue !== undefined) return displayValue(namedValue);
        try {
            return JSON.stringify(value);
        } catch {
            return "";
        }
    }
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value).trim();
}

function SearchInput({ value, onChange, placeholder, label }) {
    return (
        <label className="relative block">
            <span className="sr-only">{label}</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" />
        </label>
    );
}

function SummaryCard({ title, value, description, icon: Icon, tone = "blue" }) {
    const tones = {
        blue: "bg-blue-50 text-blue-700",
        violet: "bg-violet-50 text-violet-700",
        amber: "bg-amber-50 text-amber-700",
        emerald: "bg-emerald-50 text-emerald-700",
        cyan: "bg-cyan-50 text-cyan-700",
    };

    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-medium text-slate-500">{title}</p><p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value.toLocaleString("en-IN")}</p></div><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone] || tones.blue}`}><Icon className="h-5 w-5" /></span></div>
            <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">{description}</p>
        </article>
    );
}

function StatusSummaryPanel({ title, subtitle, total, items }) {
    const tones = {
        blue: { dot: "bg-blue-400", bar: "bg-blue-400" },
        emerald: { dot: "bg-emerald-400", bar: "bg-emerald-400" },
        amber: { dot: "bg-amber-400", bar: "bg-amber-400" },
        violet: { dot: "bg-violet-400", bar: "bg-violet-400" },
        rose: { dot: "bg-rose-400", bar: "bg-rose-400" },
        slate: { dot: "bg-slate-400", bar: "bg-slate-400" },
    };

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-4"><div><h2 className="font-bold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div><span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">{total.toLocaleString("en-IN")} total</span></div>
            <div className="mt-5 space-y-4">
                {items.map((item) => {
                    const percentage = total > 0 ? Math.min(100, Math.round((item.value / total) * 100)) : 0;
                    const tone = tones[item.tone] || tones.slate;
                    return <div key={item.label}><div className="mb-2 flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm text-slate-600"><span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />{item.label}</span><span className="text-sm font-semibold text-slate-800">{item.value.toLocaleString("en-IN")}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`${item.label} share`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}><div className={`h-full rounded-full transition-all ${tone.bar}`} style={{ width: `${percentage}%` }} /></div></div>;
                })}
            </div>
        </section>
    );
}

function RecentJobsPanel({ jobs = [] }) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <PanelHeading icon={BriefcaseBusiness} iconTone="blue" title="Recent listings" subtitle="Latest jobs and internships added to the platform." count={jobs.length} />
            {jobs.length ? <div className="mt-4 divide-y divide-slate-100">{jobs.map((job) => <div key={job.id} className="flex items-center justify-between gap-3 py-3.5"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{job.title || "Untitled listing"}</p><p className="mt-1 truncate text-xs text-slate-500">{job.companyName || "Company not specified"}</p></div><JobStatusBadge status={job.status} /></div>)}</div> : <EmptyPanelMessage message="No listings found yet." />}
            <Link to="/jobs" className="mt-4 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-blue-700 transition hover:text-blue-800">Browse listings <ArrowRight className="h-4 w-4" /></Link>
        </section>
    );
}

function RecentApplicationsPanel({ applications = [] }) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <PanelHeading icon={FileText} iconTone="violet" title="Recent applications" subtitle="Latest candidate activity across listings." count={applications.length} />
            {applications.length ? <div className="mt-4 divide-y divide-slate-100">{applications.map((application) => <div key={application.id} className="flex items-center justify-between gap-3 py-3.5"><div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold uppercase text-slate-600">{getInitials(application.studentName)}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{application.studentName || "Student"}</p><p className="mt-1 truncate text-xs text-slate-500">{application.studentEmail || `Listing ID: ${application.jobId || "—"}`}</p></div></div><ApplicationStatusBadge status={application.status} /></div>)}</div> : <EmptyPanelMessage message="No applications found yet." />}
        </section>
    );
}

function PanelHeading({ icon: Icon, iconTone = "blue", title, subtitle, count }) {
    const tones = { blue: "bg-blue-50 text-blue-700", violet: "bg-violet-50 text-violet-700" };
    return <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[iconTone]}`}><Icon className="h-4 w-4" /></span><h2 className="font-bold text-slate-900">{title}</h2></div><p className="mt-2 text-sm text-slate-500">{subtitle}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{count}</span></div>;
}

function JobStatusBadge({ status }) {
    const key = normalize(status);
    const styles = { active: "bg-emerald-50 text-emerald-700", open: "bg-emerald-50 text-emerald-700", published: "bg-emerald-50 text-emerald-700", closed: "bg-slate-100 text-slate-600", draft: "bg-amber-50 text-amber-700" };
    return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${styles[key] || "bg-slate-100 text-slate-600"}`}>{status || "Unknown"}</span>;
}

function ApplicationStatusBadge({ status }) {
    const key = String(status || "").trim().toLowerCase().replace(/[\s_-]/g, "");
    const entries = { applied: ["Applied", "bg-blue-50 text-blue-700"], underreview: ["Under review", "bg-amber-50 text-amber-700"], inreview: ["Under review", "bg-amber-50 text-amber-700"], review: ["Under review", "bg-amber-50 text-amber-700"], shortlisted: ["Shortlisted", "bg-emerald-50 text-emerald-700"], shortlist: ["Shortlisted", "bg-emerald-50 text-emerald-700"], selected: ["Selected", "bg-violet-50 text-violet-700"], accepted: ["Selected", "bg-violet-50 text-violet-700"], hired: ["Selected", "bg-violet-50 text-violet-700"], rejected: ["Rejected", "bg-rose-50 text-rose-700"] };
    const [label, className] = entries[key] || [status || "Unknown", "bg-slate-100 text-slate-600"];
    return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>{label}</span>;
}

function RoleBadge({ role }) {
    const normalizedRole = normalize(role);
    const isCompany = normalizedRole === "company";
    return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${isCompany ? "bg-amber-50 text-amber-800" : normalizedRole === "student" ? "bg-violet-50 text-violet-800" : "bg-slate-100 text-slate-700"}`}>
        {isCompany ? <Building2 className="h-3 w-3" /> : <UserRound className="h-3 w-3" />}{role || "unknown"}
    </span>;
}

function StateBadge({ label, kind = "slate" }) {
    const tones = { emerald: "bg-emerald-50 text-emerald-700", rose: "bg-rose-50 text-rose-700", amber: "bg-amber-50 text-amber-800", slate: "bg-slate-100 text-slate-600" };
    return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${tones[kind] || tones.slate}`}>{label || "Unknown"}</span>;
}

function CountPill({ value, label, tone = "blue", large = false }) {
    const tones = {
        blue: "border-blue-100 bg-blue-50 text-blue-800",
        violet: "border-violet-100 bg-violet-50 text-violet-800",
        emerald: "border-emerald-100 bg-emerald-50 text-emerald-800",
    };
    return (
        <span className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl border ${tones[tone] || tones.blue} ${large ? "px-4 py-3" : "px-3 py-2"}`}>
            <span className={`${large ? "text-xl" : "text-sm"} font-bold`}>{toCount(value).toLocaleString("en-IN")}</span>
            <span className={`${large ? "text-sm" : "text-xs"} font-medium`}>{label}</span>
        </span>
    );
}

function TableLoading({ label }) {
    return <div className="flex items-center justify-center gap-3 px-6 py-14 text-sm font-medium text-slate-500"><RefreshCw className="h-5 w-5 animate-spin text-blue-500" />{label}</div>;
}

function EmptyPanelMessage({ message }) {
    return <p className="mx-5 my-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">{message}</p>;
}

function ListFooter({ shown, total, label }) {
    return <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">Showing {shown.toLocaleString("en-IN")} filtered {label} from {total.toLocaleString("en-IN")} total.</div>;
}

function DashboardLoading() {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12"><div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><ShieldCheck className="h-6 w-6" /></span><RefreshCw className="mx-auto mt-5 h-7 w-7 animate-spin text-slate-400" /><p className="mt-4 text-sm font-semibold text-slate-800">Loading platform overview</p><p className="mt-1 text-xs text-slate-500">Fetching the latest dashboard statistics…</p></div></main>;
}

function DashboardError({ message, onRetry }) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12"><div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><AlertCircle className="h-5 w-5" /></span><h1 className="mt-4 text-lg font-bold text-slate-900">Dashboard data unavailable</h1><p className="mt-2 text-sm leading-6 text-slate-500">{message}</p><button type="button" onClick={onRetry} className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"><RefreshCw className="h-4 w-4" />Try again</button></div></main>;
}

function formatDate(value) {
    if (!value) return "Date unavailable";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "Date unavailable";
    return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function getInitials(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default AdminDashboard;
