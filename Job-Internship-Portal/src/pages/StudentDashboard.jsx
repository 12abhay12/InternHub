import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
    BriefcaseBusiness,
    GraduationCap,
    FileText,
    UserRound,
    ArrowRight,
    MapPin,
    Clock3,
    IndianRupee,
    ChevronRight,
    Sparkles,
} from "lucide-react";

import { account } from "../lib/account";
import { getAllJobs } from "../lib/jobs";
import { getMyApplications } from "../lib/applications";
import { getMyProfile } from "../lib/profile";

/* =========================================================
   RECOMMENDATION HELPERS
========================================================= */

function normalizeMatchText(value) {
    if (value === null || value === undefined) return "";

    return String(value)
        .normalize("NFKC")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}+#]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getFieldValues(value) {
    if (Array.isArray(value)) {
        return value.flatMap(getFieldValues);
    }

    if (value === null || value === undefined) return [];

    if (typeof value === "object") {
        const namedValue = value.name ?? value.label ?? value.value;
        return namedValue === null || namedValue === undefined
            ? []
            : getFieldValues(namedValue);
    }

    if (typeof value !== "string") {
        const normalizedValue = normalizeMatchText(value);
        return normalizedValue ? [normalizedValue] : [];
    }

    const trimmedValue = value.trim();
    if (!trimmedValue) return [];

    // Skills/preferences may be stored as a JSON-encoded array.
    if (trimmedValue.startsWith("[") && trimmedValue.endsWith("]")) {
        try {
            const parsedValue = JSON.parse(trimmedValue);
            if (Array.isArray(parsedValue)) {
                return getFieldValues(parsedValue);
            }
        } catch {
            // If it is not valid JSON, treat it as a delimited string below.
        }
    }

    return trimmedValue
        .split(/[,;|•\r\n]+/)
        .map(normalizeMatchText)
        .filter(Boolean);
}

function locationMatchesCity(cityValue, jobLocationValue) {
    const city = normalizeMatchText(cityValue);
    const jobLocation = normalizeMatchText(jobLocationValue);

    if (!city || !jobLocation) return false;
    if (city === jobLocation) return true;

    // Supports locations such as "Varanasi, Uttar Pradesh" matching "Varanasi".
    return (
        ` ${jobLocation} `.includes(` ${city} `) ||
        ` ${city} `.includes(` ${jobLocation} `)
    );
}

function getRecommendedJobs(jobs, profile) {
    const availableJobs = Array.isArray(jobs) ? jobs : [];
    const studentSkills = new Set(getFieldValues(profile?.skills));
    const preferredJobTypes = new Set(
        getFieldValues(profile?.preferredJobType)
    );

    const rankedJobs = availableJobs
        .map((job, originalIndex) => {
            const jobSkills = new Set(getFieldValues(job?.skills));
            let matchedSkillCount = 0;

            for (const skill of studentSkills) {
                if (jobSkills.has(skill)) matchedSkillCount += 1;
            }

            const jobType = normalizeMatchText(job?.jobType);
            const preferredTypeMatch =
                Boolean(jobType) && preferredJobTypes.has(jobType);
            const cityMatch = locationMatchesCity(
                profile?.city,
                job?.location
            );

            return {
                job,
                originalIndex,
                matchedSkillCount,
                preferredTypeMatch,
                cityMatch,
            };
        })
        .sort((first, second) => {
            // Skills rank first, followed by preferred job type, then city.
            // getAllJobs() already returns newest jobs first, so original order
            // is the final tie-breaker and also the no-match fallback.
            const skillsDifference =
                second.matchedSkillCount - first.matchedSkillCount;
            if (skillsDifference !== 0) return skillsDifference;

            const typeDifference =
                Number(second.preferredTypeMatch) -
                Number(first.preferredTypeMatch);
            if (typeDifference !== 0) return typeDifference;

            const cityDifference =
                Number(second.cityMatch) - Number(first.cityMatch);
            if (cityDifference !== 0) return cityDifference;

            return first.originalIndex - second.originalIndex;
        });

    const hasPersonalizedMatches = rankedJobs.some(
        ({ matchedSkillCount, preferredTypeMatch, cityMatch }) =>
            matchedSkillCount > 0 || preferredTypeMatch || cityMatch
    );

    return {
        jobs: rankedJobs.slice(0, 3).map(({ job }) => job),
        hasPersonalizedMatches,
    };
}

function StudentDashboard() {
    const [user, setUser] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [applications, setApplications] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loadingDashboard, setLoadingDashboard] = useState(true);
    const [dashboardError, setDashboardError] = useState("");

    const loadDashboardData = useCallback(async () => {
        try {
            setLoadingDashboard(true);

            const currentUser = await account.get();
            setUser(currentUser);

            const [allJobs, myApplications, myProfile] =
                await Promise.all([
                    getAllJobs(),
                    getMyApplications(currentUser.$id),
                    getMyProfile(currentUser.$id),
                ]);

            setJobs(allJobs || []);
            setApplications(myApplications || []);
            setProfile(myProfile || null);
            setDashboardError("");
        } catch (error) {
            console.error("Dashboard data fetch failed:", error);

            setDashboardError(
                "We couldn't load your dashboard data. Please check your connection and try again."
            );
        } finally {
            setLoadingDashboard(false);
        }
    }, []);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    const regularJobs = jobs.filter(
        (job) => job?.jobType !== "Internship"
    );

    const internships = jobs.filter(
        (job) => job?.jobType === "Internship"
    );

    const latestJobs = regularJobs.slice(0, 3);

    const {
        jobs: recommendedJobs,
        hasPersonalizedMatches,
    } = useMemo(
        () => getRecommendedJobs(jobs, profile),
        [jobs, profile]
    );

    const appliedCount = applications.filter(
        (app) => app?.status === "Applied"
    ).length;

    const underReviewCount = applications.filter(
        (app) => app?.status === "Under Review"
    ).length;

    const shortlistedCount = applications.filter(
        (app) => app?.status === "Shortlisted"
    ).length;

    const selectedCount = applications.filter(
        (app) => app?.status === "Selected"
    ).length;

    const rejectedCount = applications.filter(
        (app) => app?.status === "Rejected"
    ).length;

    // Same 14 fields and calculation as Profile.jsx
    const profileFields = [
        profile?.profilePictureId,
        profile?.phone,
        profile?.city,
        profile?.dateOfBirth,
        profile?.gender,
        profile?.education,
        profile?.skills,
        profile?.bio,
        profile?.availability,
        profile?.preferredJobType,
        profile?.languages,
        profile?.linkedin,
        profile?.github,
        profile?.portfolio,
    ];

    const completedProfileFields = profileFields.filter(
        (field) => field && field.toString().trim() !== ""
    ).length;

    const profileCompletion = Math.round(
        (completedProfileFields / profileFields.length) * 100
    );

    if (dashboardError) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
                <div
                    role="alert"
                    className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"
                >
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl">
                        ⚠️
                    </div>

                    <h1 className="mt-4 text-xl font-bold text-slate-900">
                        Dashboard couldn&apos;t load
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        {dashboardError}
                    </p>

                    <button
                        type="button"
                        onClick={loadDashboardData}
                        disabled={loadingDashboard}
                        className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loadingDashboard ? "Retrying..." : "Try Again"}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero */}
            <section className="relative isolate overflow-hidden bg-linear-to-br from-blue-500 via-blue-400 to-emerald-300">
                <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-36 left-1/3 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" />

                <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
                    <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur">
                                <Sparkles size={14} />
                                Your career workspace
                            </div>

                            <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                                Hi, {user?.name || "Student"}!
                                <span className="ml-2">👋</span>
                            </h1>

                            <p className="mt-3 max-w-xl text-sm leading-6 text-blue-50 sm:text-base">
                                Find opportunities, track your applications
                                and take the next step in your career.
                            </p>

                            <div className="mt-6 flex flex-wrap gap-3">
                                <Link
                                    to="/jobs"
                                    className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-lg shadow-blue-950/10 transition hover:-translate-y-0.5 hover:bg-blue-50"
                                >
                                    Explore opportunities
                                    <ArrowRight size={16} />
                                </Link>

                                <Link
                                    to="/profile"
                                    className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
                                >
                                    <UserRound size={16} />
                                    Edit profile
                                </Link>
                            </div>
                        </div>

                        <div className="hidden w-full max-w-sm grid-cols-2 gap-3 md:grid">
                            <HeroTile
                                icon={<BriefcaseBusiness size={20} />}
                                title="Find your next role"
                                description="Explore new jobs"
                            />

                            <HeroTile
                                icon={<GraduationCap size={20} />}
                                title="Build experience"
                                description="Discover internships"
                            />

                            <div className="col-span-2">
                                <HeroTile
                                    icon={<FileText size={20} />}
                                    title="Keep your applications on track"
                                    description="Check the latest status from your dashboard."
                                    wide
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Quick stats */}
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <DashboardStat
                        icon={<BriefcaseBusiness size={20} />}
                        title="Available Jobs"
                        value={loadingDashboard ? "—" : regularJobs.length}
                        loading={loadingDashboard}
                        tone="blue"
                    />

                    <DashboardStat
                        icon={<GraduationCap size={20} />}
                        title="Internships"
                        value={loadingDashboard ? "—" : internships.length}
                        loading={loadingDashboard}
                        tone="emerald"
                    />

                    <DashboardStat
                        icon={<FileText size={20} />}
                        title="Applications"
                        value={loadingDashboard ? "—" : applications.length}
                        loading={loadingDashboard}
                        tone="violet"
                    />

                    <DashboardStat
                        icon={<UserRound size={20} />}
                        title="Profile Completion"
                        value={
                            loadingDashboard
                                ? "—"
                                : `${profileCompletion}%`
                        }
                        loading={loadingDashboard}
                        tone="amber"
                    />
                </section>

                {/* Profile completion */}
                <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="grid gap-6 p-5 sm:p-7 md:grid-cols-[auto_1fr_auto] md:items-center">
                        <div
                            className="mx-auto grid h-20 w-20 shrink-0 place-items-center rounded-full p-1 md:mx-0"
                            style={{
                                background: `conic-gradient(#2563eb ${loadingDashboard ? 0 : profileCompletion
                                    }%, #e2e8f0 0)`,
                            }}
                        >
                            <div className="grid h-full w-full place-items-center rounded-full bg-white text-center">
                                <span className="text-sm font-bold text-slate-900">
                                    {loadingDashboard
                                        ? "—"
                                        : `${profileCompletion}%`}
                                </span>
                            </div>
                        </div>

                        <div className="text-center md:text-left">
                            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                                <h2 className="text-lg font-bold text-slate-900">
                                    {profileCompletion === 100
                                        ? "Your profile is complete"
                                        : "Make your profile stand out"}
                                </h2>

                                {!loadingDashboard &&
                                    profileCompletion === 100 && (
                                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                                            Complete
                                        </span>
                                    )}
                            </div>

                            <p className="mt-1.5 text-sm leading-6 text-slate-500">
                                Add your skills, education and preferences
                                to help companies understand what you bring.
                            </p>

                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full rounded-full bg-linear-to-r from-blue-400 to-emerald-400 transition-all duration-500"
                                    style={{
                                        width: `${loadingDashboard
                                            ? 0
                                            : profileCompletion
                                            }%`,
                                    }}
                                />
                            </div>
                        </div>

                        <Link
                            to="/profile"
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-600"
                        >
                            {profileCompletion === 100
                                ? "Edit profile"
                                : "Complete profile"}
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                </section>

                {/* Recommended jobs */}
                <section className="mt-11">
                    <SectionHeading
                        icon={<Sparkles size={19} />}
                        title="Recommended for you"
                        subtitle={
                            loadingDashboard
                                ? "Finding opportunities that match your profile"
                                : jobs.length === 0
                                    ? "New opportunities will appear here when companies post them"
                                    : hasPersonalizedMatches
                                        ? "Ranked using your skills, preferred job type and location"
                                        : "No close profile matches yet — showing the newest opportunities"
                        }
                        linkText="View all"
                        link="/jobs"
                        tone="blue"
                    />

                    <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {loadingDashboard ? (
                            <>
                                <JobCardSkeleton />
                                <JobCardSkeleton />
                                <JobCardSkeleton />
                            </>
                        ) : recommendedJobs.length > 0 ? (
                            recommendedJobs.map((job) => (
                                <JobCard key={job.$id} job={job} />
                            ))
                        ) : (
                            <div className="md:col-span-2 xl:col-span-3">
                                <EmptyState
                                    icon={<BriefcaseBusiness size={22} />}
                                    title="No jobs available"
                                    description="There are no job opportunities available right now."
                                    link="/jobs"
                                    linkText="Browse jobs"
                                />
                            </div>
                        )}
                    </div>
                </section>

                {/* Latest jobs */}
                <section className="mt-11">
                    <SectionHeading
                        icon={<BriefcaseBusiness size={19} />}
                        title="Latest Jobs"
                        subtitle="Recently posted opportunities"
                        linkText="View all jobs"
                        link="/jobs"
                        tone="blue"
                    />

                    <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {loadingDashboard ? (
                            <>
                                <JobCardSkeleton />
                                <JobCardSkeleton />
                                <JobCardSkeleton />
                            </>
                        ) : latestJobs.length > 0 ? (
                            latestJobs.map((job) => (
                                <JobCard key={job.$id} job={job} />
                            ))
                        ) : (
                            <div className="md:col-span-2 xl:col-span-3">
                                <EmptyState
                                    icon={<BriefcaseBusiness size={22} />}
                                    title="No jobs posted yet"
                                    description="New job opportunities will appear here when companies post them."
                                    link="/jobs"
                                    linkText="Browse jobs"
                                />
                            </div>
                        )}
                    </div>
                </section>

                {/* Latest internships */}
                <section className="mt-11">
                    <SectionHeading
                        icon={<GraduationCap size={19} />}
                        title="Latest Internships"
                        subtitle="Find an opportunity to build experience"
                        linkText="View all internships"
                        link="/jobs"
                        tone="emerald"
                    />

                    <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {loadingDashboard ? (
                            <>
                                <JobCardSkeleton />
                                <JobCardSkeleton />
                                <JobCardSkeleton />
                            </>
                        ) : internships.length > 0 ? (
                            internships.slice(0, 3).map((job) => (
                                <InternshipCard
                                    key={job.$id}
                                    internship={{
                                        id: job.$id,
                                        title:
                                            job?.title ||
                                            "Untitled Internship",
                                        company:
                                            job?.companyName || "Company",
                                        location:
                                            job?.location ||
                                            "Location not specified",
                                        stipend:
                                            job?.salary || "Not specified",
                                        duration:
                                            job?.experience ||
                                            "Not specified",
                                    }}
                                />
                            ))
                        ) : (
                            <div className="md:col-span-2 xl:col-span-3">
                                <EmptyState
                                    icon={<GraduationCap size={22} />}
                                    title="No internships available"
                                    description="There are no internship opportunities available right now."
                                    link="/jobs"
                                    linkText="Browse internships"
                                />
                            </div>
                        )}
                    </div>
                </section>

                {/* Applications */}
                <section className="mt-11">
                    <SectionHeading
                        icon={<FileText size={19} />}
                        title="My Applications"
                        subtitle="Follow each application as it moves forward"
                        linkText="View applications"
                        link="/my-applications"
                        tone="violet"
                    />

                    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                        <ApplicationStatus
                            title="Applied"
                            value={loadingDashboard ? "—" : appliedCount}
                        />

                        <ApplicationStatus
                            title="Under Review"
                            value={
                                loadingDashboard ? "—" : underReviewCount
                            }
                        />

                        <ApplicationStatus
                            title="Shortlisted"
                            value={
                                loadingDashboard ? "—" : shortlistedCount
                            }
                        />

                        <ApplicationStatus
                            title="Selected"
                            value={
                                loadingDashboard ? "—" : selectedCount
                            }
                        />

                        <ApplicationStatus
                            title="Rejected"
                            value={loadingDashboard ? "—" : rejectedCount}
                        />
                    </div>

                    {!loadingDashboard && applications.length === 0 && (
                        <div className="mt-4">
                            <EmptyState
                                icon={<FileText size={22} />}
                                title="No applications yet"
                                description="Apply to jobs and internships to start tracking your progress here."
                                link="/jobs"
                                linkText="Find opportunities"
                            />
                        </div>
                    )}
                </section>

                {/* Quick actions */}
                <section className="mt-11 pb-8">
                    <div className="mb-5">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                            Keep moving forward
                        </p>
                        <h2 className="mt-1 text-xl font-bold text-slate-900">
                            Quick Actions
                        </h2>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <QuickAction
                            icon={<BriefcaseBusiness size={20} />}
                            title="Browse Jobs"
                            description="Explore the latest roles"
                            link="/jobs"
                            tone="blue"
                        />

                        <QuickAction
                            icon={<GraduationCap size={20} />}
                            title="Find Internships"
                            description="Discover learning opportunities"
                            link="/jobs"
                            tone="emerald"
                        />

                        <QuickAction
                            icon={<UserRound size={20} />}
                            title="Edit Profile"
                            description="Update your information"
                            link="/profile"
                            tone="violet"
                        />

                        <QuickAction
                            icon={<FileText size={20} />}
                            title="My Applications"
                            description="Track your application status"
                            link="/my-applications"
                            tone="amber"
                        />
                    </div>
                </section>
            </main>
        </div>
    );
}

/* =========================================================
   HERO TILE
========================================================= */

function HeroTile({ icon, title, description, wide = false }) {
    return (
        <div
            className={`rounded-2xl border border-white/15 bg-white/10 p-4 text-white shadow-sm backdrop-blur-sm ${wide ? "flex items-center gap-4" : ""
                }`}
        >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
                {icon}
            </div>

            <div className={wide ? "" : "mt-4"}>
                <p className="text-sm font-bold">{title}</p>
                <p className="mt-1 text-xs text-blue-50">{description}</p>
            </div>
        </div>
    );
}

/* =========================================================
   DASHBOARD STAT
========================================================= */

function DashboardStat({ icon, title, value, loading, tone = "blue" }) {
    const tones = {
        blue: {
            icon: "bg-blue-50 text-blue-700",
            line: "from-blue-500 to-blue-600",
        },
        emerald: {
            icon: "bg-emerald-50 text-emerald-700",
            line: "from-emerald-400 to-emerald-600",
        },
        violet: {
            icon: "bg-violet-50 text-violet-700",
            line: "from-violet-400 to-violet-600",
        },
        amber: {
            icon: "bg-amber-50 text-amber-700",
            line: "from-amber-400 to-orange-500",
        },
    };

    const style = tones[tone] || tones.blue;

    return (
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div
                className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r ${style.line}`}
            />

            <div className="flex items-start justify-between gap-3">
                <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${style.icon}`}
                >
                    {icon}
                </div>

                <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Live
                </span>
            </div>

            <p className="mt-5 text-sm font-medium text-slate-500">
                {title}
            </p>

            {loading ? (
                <div className="mt-2 h-8 w-16 animate-pulse rounded-lg bg-slate-100" />
            ) : (
                <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                    {value}
                </p>
            )}
        </div>
    );
}

/* =========================================================
   SECTION HEADING
========================================================= */

function SectionHeading({
    icon,
    title,
    subtitle,
    linkText,
    link,
    tone = "blue",
}) {
    const tones = {
        blue: "bg-blue-50 text-blue-700",
        emerald: "bg-emerald-50 text-emerald-700",
        violet: "bg-violet-50 text-violet-700",
        amber: "bg-amber-50 text-amber-700",
    };

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-3">
                <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone] || tones.blue
                        }`}
                >
                    {icon}
                </div>

                <div>
                    <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                        {title}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        {subtitle}
                    </p>
                </div>
            </div>

            <Link
                to={link}
                className="inline-flex w-fit items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
            >
                {linkText}
                <ChevronRight size={16} />
            </Link>
        </div>
    );
}

/* =========================================================
   JOB CARD
========================================================= */

function JobCard({ job }) {
    const companyName = job?.companyName || "Company";
    const jobType = job?.jobType || "Job";
    const isInternship = job?.jobType === "Internship";

    return (
        <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg">
            <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-blue-500 to-emerald-400 opacity-0 transition group-hover:opacity-100" />

            <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-50 to-emerald-50 text-lg font-bold text-blue-700 ring-1 ring-blue-100">
                        {companyName.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-slate-500">
                            {companyName}
                        </p>
                        <h3 className="mt-0.5 line-clamp-2 font-bold text-slate-900 transition group-hover:text-blue-700">
                            {job?.title || "Untitled Job"}
                        </h3>
                    </div>
                </div>

                <span
                    className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${isInternship
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-blue-50 text-blue-700"
                        }`}
                >
                    {jobType}
                </span>
            </div>

            <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm text-slate-500">
                <div className="flex min-w-0 items-center gap-2.5">
                    <MapPin size={16} className="shrink-0 text-blue-500" />
                    <span className="truncate">
                        {job?.location || "Location not specified"}
                    </span>
                </div>

                <div className="flex min-w-0 items-center gap-2.5">
                    <IndianRupee
                        size={16}
                        className="shrink-0 text-emerald-600"
                    />
                    <span className="truncate">
                        {job?.salary || "Salary not specified"}
                    </span>
                </div>
            </div>

            <Link
                to={`/job-details/${job.$id}`}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
                View Details
                <ArrowRight
                    size={15}
                    className="transition group-hover:translate-x-0.5"
                />
            </Link>
        </article>
    );
}

/* =========================================================
   INTERNSHIP CARD
========================================================= */

function InternshipCard({ internship }) {
    const companyName = internship?.company || "Company";

    return (
        <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg">
            <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-emerald-400 to-teal-500 opacity-0 transition group-hover:opacity-100" />

            <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-emerald-50 to-teal-50 text-lg font-bold text-emerald-700 ring-1 ring-emerald-100">
                        {companyName.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-slate-500">
                            {companyName}
                        </p>
                        <h3 className="mt-0.5 line-clamp-2 font-bold text-slate-900 transition group-hover:text-emerald-700">
                            {internship?.title || "Untitled Internship"}
                        </h3>
                    </div>
                </div>

                <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                    Internship
                </span>
            </div>

            <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm text-slate-500">
                <div className="flex min-w-0 items-center gap-2.5">
                    <MapPin size={16} className="shrink-0 text-blue-500" />
                    <span className="truncate">
                        {internship?.location || "Location not specified"}
                    </span>
                </div>

                <div className="flex min-w-0 items-center gap-2.5">
                    <IndianRupee
                        size={16}
                        className="shrink-0 text-emerald-600"
                    />
                    <span className="truncate">
                        {internship?.stipend || "Not specified"}
                    </span>
                </div>

                <div className="flex min-w-0 items-center gap-2.5">
                    <Clock3 size={16} className="shrink-0 text-violet-500" />
                    <span className="truncate">
                        {internship?.duration || "Not specified"}
                    </span>
                </div>
            </div>

            <Link
                to={`/job-details/${internship.id}`}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
            >
                View Details
                <ArrowRight
                    size={15}
                    className="transition group-hover:translate-x-0.5"
                />
            </Link>
        </article>
    );
}

/* =========================================================
   JOB CARD SKELETON
========================================================= */

function JobCardSkeleton() {
    return (
        <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-slate-100" />
                    <div>
                        <div className="h-3 w-24 rounded bg-slate-100" />
                        <div className="mt-2 h-4 w-36 rounded bg-slate-100" />
                    </div>
                </div>
                <div className="h-6 w-20 rounded-full bg-slate-100" />
            </div>

            <div className="mt-6 space-y-3">
                <div className="h-4 w-2/3 rounded bg-slate-100" />
                <div className="h-4 w-3/4 rounded bg-slate-100" />
            </div>

            <div className="mt-6 h-10 rounded-xl bg-slate-100" />
        </div>
    );
}

/* =========================================================
   APPLICATION STATUS
========================================================= */

function ApplicationStatus({ title, value }) {
    const styles = {
        Applied: {
            dot: "bg-blue-500",
            icon: "bg-blue-50 text-blue-700",
        },
        "Under Review": {
            dot: "bg-amber-500",
            icon: "bg-amber-50 text-amber-700",
        },
        Shortlisted: {
            dot: "bg-violet-500",
            icon: "bg-violet-50 text-violet-700",
        },
        Selected: {
            dot: "bg-emerald-500",
            icon: "bg-emerald-50 text-emerald-700",
        },
        Rejected: {
            dot: "bg-rose-500",
            icon: "bg-rose-50 text-rose-700",
        },
    };

    const style = styles[title] || styles.Applied;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500 sm:text-sm">
                    {title}
                </span>

                <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${style.icon}`}
                >
                    <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                </span>
            </div>

            <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                {value}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
                Applications
            </p>
        </div>
    );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
    icon,
    title,
    description,
    link,
    linkText,
}) {
    return (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                {icon}
            </div>

            <h3 className="mt-4 text-base font-bold text-slate-900">
                {title}
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {description}
            </p>

            {link && (
                <Link
                    to={link}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                    {linkText}
                    <ArrowRight size={15} />
                </Link>
            )}
        </div>
    );
}

/* =========================================================
   QUICK ACTION
========================================================= */

function QuickAction({
    icon,
    title,
    description,
    link,
    tone = "blue",
}) {
    const tones = {
        blue: "bg-blue-50 text-blue-700 group-hover:bg-blue-600",
        emerald:
            "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600",
        violet: "bg-violet-50 text-violet-700 group-hover:bg-violet-600",
        amber: "bg-amber-50 text-amber-700 group-hover:bg-amber-500",
    };

    return (
        <Link
            to={link}
            className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
        >
            <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition group-hover:text-white ${tones[tone] || tones.blue
                    }`}
            >
                {icon}
            </div>

            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900">
                    {title}
                </p>

                <p className="mt-1 truncate text-xs text-slate-500">
                    {description}
                </p>
            </div>

            <ArrowRight
                size={17}
                className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600"
            />
        </Link>
    );
}

export default StudentDashboard;
