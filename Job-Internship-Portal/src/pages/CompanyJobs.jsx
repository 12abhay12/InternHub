import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    BriefcaseBusiness,
    Search,
    Plus,
    Eye,
    Pencil,
    Trash2,
    Users,
    MapPin,
    Clock3,
    XCircle,
    RefreshCw,
} from "lucide-react";

import { account } from "../lib/account";
import { getMyProfile } from "../lib/profile";
import {getCompanyJobs,updateJob,deleteJob,} from "../lib/jobs";
import { getJobApplications } from "../lib/applications";

const CompanyJobs = () => {
    const [jobs, setJobs] = useState([]);
    const [applicationCounts, setApplicationCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState("");
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [company, setCompany] = useState(null);

    const loadJobs = async () => {
        try {
            setLoading(true);
            setError("");

            const currentUser = await account.get();
            const currentProfile = await getMyProfile(currentUser.$id);

            if (currentProfile?.role !== "company") {
                setError("You do not have permission to access this page.");
                return;
            }

            setCompany({
                id: currentUser.$id,
                name: currentUser.name || "Company",
            });

            const companyJobs = await getCompanyJobs(currentUser.$id);

            setJobs(companyJobs);

            const results = await Promise.all(
                companyJobs.map(async (job) => {
                    try {
                        const applications = await getJobApplications(job.$id);

                        return {
                            jobId: job.$id,
                            count: applications.length,
                        };
                    } catch (error) {
                        console.error(
                            `Failed to get applications for ${job.$id}:`,
                            error
                        );

                        return {
                            jobId: job.$id,
                            count: 0,
                        };
                    }
                })
            );

            const counts = {};

            results.forEach((item) => {
                counts[item.jobId] = item.count;
            });

            setApplicationCounts(counts);
        } catch (error) {
            console.error("Failed to load company jobs:", error);
            setError("Unable to load your jobs. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadJobs();
    }, []);

    const filteredJobs = useMemo(() => {
        return jobs.filter((job) => {
            const searchText = search.trim().toLowerCase();

            const matchesSearch =
                !searchText ||
                job.title?.toLowerCase().includes(searchText) ||
                job.location?.toLowerCase().includes(searchText) ||
                job.jobType?.toLowerCase().includes(searchText);

            const matchesStatus =
                statusFilter === "All" ||
                job.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [jobs, search, statusFilter]);

    const handleToggleStatus = async (job) => {
        const nextStatus =
            job.status === "Active" ? "Closed" : "Active";

        const confirmMessage =
            nextStatus === "Closed"
                ? "Are you sure you want to close this job?"
                : "Are you sure you want to reopen this job?";

        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            setActionLoading(`status-${job.$id}`);

            // IMPORTANT:
            // Status change ke time sirf status update karo.
            // Isse workMode, skills, deadline etc. dobara validate nahi honge.
            const updatedJob = await updateJob(job.$id, {
                status: nextStatus,
            });

            setJobs((previousJobs) =>
                previousJobs.map((item) =>
                    item.$id === job.$id ? { ...item, ...updatedJob } : item
                )
            );
        } catch (error) {
            console.error("Failed to update job status:", error);

            alert(
                error?.message ||
                "Failed to update job status. Please try again."
            );
        } finally {
            setActionLoading("");
        }
    };

    const handleDelete = async (job) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${job.title}"?\n\nThis action cannot be undone.`
        );

        if (!confirmed) {
            return;
        }

        try {
            setActionLoading(`delete-${job.$id}`);

            await deleteJob(job.$id);

            setJobs((previousJobs) =>
                previousJobs.filter((item) => item.$id !== job.$id)
            );

            setApplicationCounts((previousCounts) => {
                const updated = { ...previousCounts };
                delete updated[job.$id];
                return updated;
            });
        } catch (error) {
            console.error("Failed to delete job:", error);
            alert("Failed to delete job. Please try again.");
        } finally {
            setActionLoading("");
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />

                    <p className="mt-4 text-sm font-medium text-slate-600">
                        Loading your jobs...
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
                <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-6 text-center shadow-sm">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                        <XCircle className="h-6 w-6 text-red-600" />
                    </div>

                    <h2 className="mt-4 text-lg font-bold text-slate-900">
                        Something went wrong
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                        {error}
                    </p>

                    <button
                        onClick={loadJobs}
                        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const totalJobs = jobs.length;

    const activeJobs = jobs.filter(
        (job) => job.status === "Active"
    ).length;

    const closedJobs = jobs.filter(
        (job) => job.status === "Closed"
    ).length;

    const draftJobs = jobs.filter(
        (job) => job.status === "Draft"
    ).length;

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <section className="rounded-2xl bg-linear-to-r from-blue-500 via-blue-500 to-indigo-400 p-6 shadow-sm sm:p-8">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-medium text-blue-100">
                                Company
                            </p>

                            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                                Manage Jobs
                            </h1>

                            <p className="mt-2 text-sm text-blue-100">
                                Manage all jobs and internships posted by{" "}
                                {company?.name || "your company"}.
                            </p>
                        </div>

                        <Link
                            to="/post-job"
                            className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50"
                        >
                            <Plus className="h-4 w-4" />
                            Post New Job
                        </Link>
                    </div>
                </section>

                {/* Header */}

                {/* Stats */}
                <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Total Jobs"
                        value={totalJobs}
                    />

                    <StatCard
                        title="Active"
                        value={activeJobs}
                        valueClass="text-green-600"
                    />

                    <StatCard
                        title="Closed"
                        value={closedJobs}
                        valueClass="text-slate-600"
                    />

                    <StatCard
                        title="Draft"
                        value={draftJobs}
                        valueClass="text-amber-600"
                    />
                </section>

                {/* Search + Filters */}
                <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                        <div className="relative w-full lg:max-w-md">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by job title, location or type..."
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                            />
                        </div>

                        <div className=" flex flex-wrap gap-2">
                            {["All", "Active", "Closed", "Draft"].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`cursor-pointer rounded-lg px-4 py-2.5 text-sm font-semibold transition ${statusFilter === status
                                        ? "bg-blue-600 text-white"
                                        : "border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                        }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Jobs */}
                <section className="mt-6">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">
                                Your Jobs
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                {filteredJobs.length}{" "}
                                {filteredJobs.length === 1 ? "job" : "jobs"} found
                            </p>
                        </div>
                    </div>

                    {filteredJobs.length === 0 ? (
                        <EmptyState
                            hasJobs={jobs.length > 0}
                            onReset={() => {
                                setSearch("");
                                setStatusFilter("All");
                            }}
                        />
                    ) : (
                        <div className="space-y-4">
                            {filteredJobs.map((job) => (
                                <JobManageCard
                                    key={job.$id}
                                    job={job}
                                    applicationCount={
                                        applicationCounts[job.$id] || 0
                                    }
                                    actionLoading={actionLoading}
                                    onToggleStatus={handleToggleStatus}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};


/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
    title,
    value,
    valueClass = "text-slate-900",
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
                {title}
            </p>

            <p
                className={`mt-2 text-3xl font-bold tracking-tight ${valueClass}`}
            >
                {value}
            </p>
        </div>
    );
}


/* =========================================================
   JOB MANAGE CARD
========================================================= */

function JobManageCard({
    job,
    applicationCount,
    actionLoading,
    onToggleStatus,
    onDelete,
}) {
    const statusStyles = {
        Active: "bg-green-50 text-green-700",
        Closed: "bg-slate-100 text-slate-600",
        Draft: "bg-amber-50 text-amber-700",
    };

    const isStatusLoading =
        actionLoading === `status-${job.$id}`;

    const isDeleteLoading =
        actionLoading === `delete-${job.$id}`;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6">

            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                {/* Job Info */}
                <div className="min-w-0 flex-1">

                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="wrap-break-word text-lg font-bold text-slate-900">
                            {job.title}
                        </h3>

                        <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[job.status] ||
                                "bg-slate-100 text-slate-600"
                                }`}
                        >
                            {job.status || "Unknown"}
                        </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">

                        {job.location && (
                            <span className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4" />
                                {job.location}
                            </span>
                        )}

                        {job.jobType && (
                            <span className="flex items-center gap-1.5">
                                <BriefcaseBusiness className="h-4 w-4" />
                                {job.jobType}
                            </span>
                        )}

                        {job.$createdAt && (
                            <span className="flex items-center gap-1.5">
                                <Clock3 className="h-4 w-4" />
                                {new Date(job.$createdAt).toLocaleDateString()}
                            </span>
                        )}
                    </div>

                    {job.salary && (
                        <p className="mt-3 text-sm font-medium text-slate-600">
                            Salary / Stipend: {job.salary}
                        </p>
                    )}
                </div>

                {/* Applications */}
                <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-blue-700">
                    <Users className="h-5 w-5" />

                    <div>
                        <p className="text-lg font-bold leading-none">
                            {applicationCount}
                        </p>

                        <p className="mt-1 text-xs font-medium">
                            {applicationCount === 1
                                ? "Application"
                                : "Applications"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5">

                <Link
                    to={`/job-details/${job.$id}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                    <Eye className="h-4 w-4" />
                    View Job
                </Link>

                <Link
                    to={`/edit-job/${job.$id}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                    <Pencil className="h-4 w-4" />
                    Edit Job
                </Link>

                <Link
                    to={`/job-applicants/${job.$id}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                    <Users className="h-4 w-4" />
                    View Applications
                </Link>

                {job.status !== "Draft" && (
                    <button
                        onClick={() => onToggleStatus(job)}
                        disabled={isStatusLoading || isDeleteLoading}
                        className={`cursor-pointer rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${job.status === "Active"
                            ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                            }`}
                    >
                        {isStatusLoading
                            ? "Updating..."
                            : job.status === "Active"
                                ? "Close Job"
                                : "Reopen Job"}
                    </button>
                )}

                <button
                    onClick={() => onDelete(job)}
                    disabled={isDeleteLoading || isStatusLoading}
                    className=" cursor-pointer inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <Trash2 className="h-4 w-4" />

                    {isDeleteLoading ? "Deleting..." : "Delete"}
                </button>
            </div>
        </div>
    );
}


/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({ hasJobs, onReset }) {
    if (hasJobs) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <Search className="mx-auto h-10 w-10 text-slate-300" />

                <h3 className="mt-4 font-semibold text-slate-900">
                    No matching jobs
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                    Try changing your search or status filter.
                </p>

                <button
                    onClick={onReset}
                    className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                    Clear Filters
                </button>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <BriefcaseBusiness className="h-6 w-6 text-slate-400" />
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
                No jobs posted yet
            </h3>

            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                Create your first job or internship to start receiving applications.
            </p>

            <Link
                to="/post-job"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
                <Plus className="h-4 w-4" />
                Post Your First Job
            </Link>
        </div>
    );
}

export default CompanyJobs;

