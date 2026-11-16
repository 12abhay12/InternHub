import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    BriefcaseBusiness,
    CheckCircle2,
    Clock3,
    FileText,
    Plus,
    ArrowRight,
    Users,
    XCircle,
    UserRound,
    CalendarDays,
} from "lucide-react";

import { account } from "../lib/account";
import { getMyProfile } from "../lib/profile";
import { getCompanyJobs } from "../lib/jobs";
import { getJobApplications } from "../lib/applications";

function CompanyDashboard() {
    const [company, setCompany] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [jobApplicationCounts, setJobApplicationCounts] = useState({});
    const [recentApplications, setRecentApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const loadDashboard = async () => {
            try {
                setLoading(true);
                setError("");

                // Get logged-in company
                const currentUser = await account.get();

                // Get company profile
                const currentProfile = await getMyProfile(currentUser.$id);

                console.log("Company Dashboard User:", currentUser);
                console.log("Company Dashboard Profile:", currentProfile);

                // Security check
                if (currentProfile?.role !== "company") {
                    setError(
                        "You do not have permission to access this dashboard."
                    );
                    return;
                }

                setCompany({
                    id: currentUser.$id,
                    name: currentUser.name || "Company",
                    email: currentUser.email || "",
                });

                // Get jobs posted by this company
                const companyJobs = await getCompanyJobs(currentUser.$id);
                setJobs(companyJobs);

                // Get applications for every job
                const applicationResults = await Promise.all(
                    companyJobs.map(async (job) => {
                        try {
                            const applications = await getJobApplications(
                                job.$id
                            );

                            return {
                                jobId: job.$id,
                                jobTitle: job.title,
                                applications,
                                count: applications.length,
                            };
                        } catch (error) {
                            console.error(
                                `Failed to fetch applications for job ${job.$id}:`,
                                error
                            );

                            return {
                                jobId: job.$id,
                                jobTitle: job.title,
                                applications: [],
                                count: 0,
                            };
                        }
                    })
                );

                // Application counts
                const counts = {};

                applicationResults.forEach((item) => {
                    counts[item.jobId] = item.count;
                });

                setJobApplicationCounts(counts);

                // -----------------------------------------
                // Recent Applications
                // -----------------------------------------

                const allApplications = [];

                applicationResults.forEach((item) => {
                    item.applications.forEach((application) => {
                        allApplications.push({
                            ...application,
                            jobTitle: item.jobTitle,
                            jobId: item.jobId,
                        });
                    });
                });

                // Latest applications first
                allApplications.sort((a, b) => {
                    const dateA = new Date(
                        a.appliedAt || a.$createdAt || 0
                    ).getTime();

                    const dateB = new Date(
                        b.appliedAt || b.$createdAt || 0
                    ).getTime();

                    return dateB - dateA;
                });

                // Show latest 5 applications
                setRecentApplications(allApplications.slice(0, 5));
            } catch (error) {
                console.error("Company dashboard load failed:", error);

                setError(
                    "Unable to load company dashboard. Please try again."
                );
            } finally {
                setLoading(false);
            }
        };

        loadDashboard();
    }, []);

    // -----------------------------------------
    // Loading
    // -----------------------------------------

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />

                    <p className="mt-4 text-sm font-medium text-slate-600">
                        Loading company dashboard...
                    </p>
                </div>
            </div>
        );
    }

    // -----------------------------------------
    // Error
    // -----------------------------------------

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
                        onClick={() => window.location.reload()}
                        className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // -----------------------------------------
    // Statistics
    // -----------------------------------------

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

    const totalApplications = Object.values(
        jobApplicationCounts
    ).reduce((total, count) => total + count, 0);

    // Recent jobs
    const recentJobs = jobs.slice(0, 5);

    return (
        <div className="min-h-screen bg-slate-50">
                <section className="overflow-hidden  h-55 w-full bg-linear-to-r from-blue-500 via-blue-400 to-indigo-400 shadow-sm">
                    <div className="p-8 sm:p-8">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-100">
                                    Company Dashboard
                                </p>

                                <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                                    Welcome, {company?.name || "Company"}! 👋
                                </h1>

                                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
                                    Manage your jobs, internships and applications
                                    from one place.
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
                    </div>
                </section>
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

                {/* =========================================
                    HEADER / WELCOME
                ========================================== */}


                {/* =========================================
                    STATISTICS
                ========================================== */}

                <section className="mt-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <DashboardStat
                            title="Total Jobs"
                            value={totalJobs}
                            icon={BriefcaseBusiness}
                            description="All jobs posted"
                        />

                        <DashboardStat
                            title="Active Jobs"
                            value={activeJobs}
                            icon={CheckCircle2}
                            description="Currently active"
                        />

                        <DashboardStat
                            title="Closed Jobs"
                            value={closedJobs}
                            icon={Clock3}
                            description="Closed positions"
                        />

                        <DashboardStat
                            title="Applications"
                            value={totalApplications}
                            icon={Users}
                            description="Total applications"
                        />
                    </div>
                </section>

                {/* =========================================
                    RECENT APPLICATIONS
                ========================================== */}

                <section className="mt-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">
                                Recent Applications
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Latest applications received for your jobs.
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        {recentApplications.length === 0 ? (
                            <EmptyApplications />
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {recentApplications.map((application) => (
                                    <RecentApplicationCard
                                        key={application.$id}
                                        application={application}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {recentApplications.length > 0 && (
                        <div className="mt-4 flex justify-end">
                            <Link
                                to="/company-jobs"
                                className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 transition hover:text-blue-700"
                            >
                                Manage Jobs
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    )}
                </section>

                {/* =========================================
                    MAIN CONTENT
                ========================================== */}

                <div className="mt-8 grid gap-6 lg:grid-cols-3">

                    {/* =======================================
                        RECENT JOBS
                    ======================================== */}

                    <section className="min-w-0 lg:col-span-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">
                                    Recent Jobs
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Manage your recently posted jobs.
                                </p>
                            </div>

                            {jobs.length > 0 && (
                                <Link
                                    to="/company-jobs"
                                    className="hidden items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 sm:flex"
                                >
                                    View All
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            )}
                        </div>

                        <div className="mt-5 space-y-4">
                            {recentJobs.length === 0 ? (
                                <EmptyJobs />
                            ) : (
                                recentJobs.map((job) => (
                                    <CompanyJobCard
                                        key={job.$id}
                                        job={job}
                                        applicationCount={
                                            jobApplicationCounts[job.$id] || 0
                                        }
                                    />
                                ))
                            )}
                        </div>

                        {jobs.length > 0 && (
                            <Link
                                to="/company-jobs"
                                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 sm:hidden"
                            >
                                View All Jobs
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        )}
                    </section>

                    {/* =======================================
                        QUICK ACTIONS
                    ======================================== */}

                    <section>
                        <h2 className="text-xl font-bold text-slate-900">
                            Quick Actions
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Frequently used company actions.
                        </p>

                        <div className="mt-5 space-y-3">
                            <QuickAction
                                to="/post-job"
                                icon={Plus}
                                title="Post a Job"
                                description="Create a new job or internship"
                            />

                            <QuickAction
                                to="/company-jobs"
                                icon={BriefcaseBusiness}
                                title="Manage Jobs"
                                description="View and manage your jobs"
                            />

                            <QuickAction
                                to="/jobs"
                                icon={FileText}
                                title="Browse Jobs"
                                description="View all active jobs"
                            />

                            <QuickAction
                                to="/profile"
                                icon={Users}
                                title="Company Profile"
                                description="Update your profile information"
                            />
                        </div>

                        {/* Job summary */}

                        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h3 className="font-semibold text-slate-900">
                                Job Summary
                            </h3>

                            <div className="mt-4 space-y-3">
                                <SummaryRow
                                    label="Active"
                                    value={activeJobs}
                                    valueClass="text-green-600"
                                />

                                <SummaryRow
                                    label="Closed"
                                    value={closedJobs}
                                    valueClass="text-slate-600"
                                />

                                <SummaryRow
                                    label="Draft"
                                    value={draftJobs}
                                    valueClass="text-amber-600"
                                />

                                <SummaryRow
                                    label="Applications"
                                    value={totalApplications}
                                    valueClass="text-blue-600"
                                />
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

/* =========================================================
   DASHBOARD STAT
========================================================= */

function DashboardStat({
    title,
    value,
    icon: Icon,
    description,
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">
                        {title}
                    </p>

                    <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                        {value}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                        {description}
                    </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                    <Icon className="h-5 w-5 text-blue-600" />
                </div>
            </div>
        </div>
    );
}

/* =========================================================
   RECENT APPLICATION CARD
========================================================= */

function RecentApplicationCard({ application }) {
    const statusStyles = {
        Applied: "bg-blue-50 text-blue-700",
        "Under Review": "bg-amber-50 text-amber-700",
        Reviewed: "bg-amber-50 text-amber-700",
        Shortlisted: "bg-emerald-50 text-emerald-700",
        Shortlist: "bg-emerald-50 text-emerald-700",
        Selected: "bg-green-50 text-green-700",
        Rejected: "bg-red-50 text-red-700",
    };

    const statusClass =
        statusStyles[application.status] ||
        "bg-slate-100 text-slate-600";

    const applicationDate =
        application.appliedAt || application.$createdAt;

    const formattedDate = applicationDate
        ? new Date(applicationDate).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        })
        : "N/A";

    return (
        <div className="p-5 transition hover:bg-slate-50">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                {/* Student */}

                <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        <UserRound className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                        <h3 className="truncate font-semibold text-slate-900">
                            {application.studentName || "Student"}
                        </h3>

                        <p className="mt-0.5 truncate text-sm text-slate-500">
                            {application.studentEmail ||
                                "No email available"}
                        </p>
                    </div>
                </div>

                {/* Job */}

                <div className="min-w-0 lg:w-64">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Applied For
                    </p>

                    <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                        {application.jobTitle || "Job"}
                    </p>
                </div>

                {/* Date */}

                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <CalendarDays className="h-4 w-4 shrink-0" />

                    <span>{formattedDate}</span>
                </div>

                {/* Status */}

                <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
                >
                    {application.status || "Applied"}
                </span>

                {/* Action */}

                <Link
                    to={`/job-applicants/${application.jobId}`}
                    className="inline-flex w-fit items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                    View Application
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
        </div>
    );
}

/* =========================================================
   COMPANY JOB CARD
========================================================= */

function CompanyJobCard({
    job,
    applicationCount,
}) {
    const statusStyles = {
        Active: "bg-green-50 text-green-700",
        Closed: "bg-slate-100 text-slate-600",
        Draft: "bg-amber-50 text-amber-700",
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="wrap-break-word text-base font-bold text-slate-900">
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

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                        <span>{job.jobType}</span>
                        <span>{job.location}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Users className="h-4 w-4" />

                    <span>
                        {applicationCount}{" "}
                        {applicationCount === 1
                            ? "Application"
                            : "Applications"}
                    </span>
                </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
                <Link
                    to={`/job-details/${job.$id}`}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                    View Job
                </Link>

                <Link
                    to={`/edit-job/${job.$id}`}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                    Edit Job
                </Link>

                <Link
                    to={`/job-applicants/${job.$id}`}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                    View Applications
                </Link>
            </div>
        </div>
    );
}

/* =========================================================
   QUICK ACTION
========================================================= */

function QuickAction({
    to,
    icon: Icon,
    title,
    description,
}) {
    return (
        <Link
            to={to}
            className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
        >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 transition group-hover:bg-blue-100">
                <Icon className="h-5 w-5 text-blue-600" />
            </div>

            <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-slate-900">
                    {title}
                </h3>

                <p className="mt-0.5 text-xs text-slate-500">
                    {description}
                </p>
            </div>

            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-600" />
        </Link>
    );
}

/* =========================================================
   SUMMARY ROW
========================================================= */

function SummaryRow({
    label,
    value,
    valueClass,
}) {
    return (
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
            <span className="text-sm text-slate-500">
                {label}
            </span>

            <span className={`text-sm font-bold ${valueClass}`}>
                {value}
            </span>
        </div>
    );
}

/* =========================================================
   EMPTY JOBS
========================================================= */

function EmptyJobs() {
    return (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <BriefcaseBusiness className="h-6 w-6 text-slate-400" />
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
                No jobs posted yet
            </h3>

            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                Create your first job or internship to start receiving
                applications.
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

/* =========================================================
   EMPTY APPLICATIONS
========================================================= */

function EmptyApplications() {
    return (
        <div className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <FileText className="h-6 w-6 text-slate-400" />
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
                No applications yet
            </h3>

            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                Applications from students will appear here when they apply
                for your jobs.
            </p>

            <Link
                to="/company-jobs"
                className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
                Manage Jobs
                <ArrowRight className="h-4 w-4" />
            </Link>
        </div>
    );
}

export default CompanyDashboard;

