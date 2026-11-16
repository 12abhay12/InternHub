import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Functions } from "appwrite";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  ExternalLink,
  RefreshCw,
  Search,
  Users,
  X,
  XCircle,
} from "lucide-react";

import { account } from "../lib/account";
import { client } from "../lib/appwrite";
import { getMyProfile } from "../lib/profile";
import { getJobById } from "../lib/jobs";
import { getJobApplications, updateApplicationStatus } from "../lib/applications";

const functions = new Functions(client);
const ADMIN_STATS_FUNCTION_ID = import.meta.env.VITE_APPWRITE_ADMIN_STATS_FUNCTION_ID;

async function fetchApplicantResume(applicationId) {
  if (!ADMIN_STATS_FUNCTION_ID) {
    throw new Error("Admin Function ID is not configured.");
  }

  const execution = await functions.createExecution({
    functionId: ADMIN_STATS_FUNCTION_ID,
    body: JSON.stringify({
      action: "companyGetApplicantResume",
      applicationId,
    }),
    async: false,
  });

  if (execution.status !== "completed") {
    throw new Error(`Function execution status: ${execution.status}`);
  }

  let result;
  try {
    result = JSON.parse(execution.responseBody || "{}");
  } catch {
    throw new Error("The resume service returned an invalid response.");
  }

  if (!result.success) {
    throw new Error(result.error || "Could not load this applicant’s resume.");
  }

  return result.data || {};
}

const EXTERNAL_PROFILE_LINK_LABELS = new Set(["LinkedIn", "GitHub", "Portfolio"]);

const APPLICATION_STATUSES = [
  "Applied",
  "Under Review",
  "Shortlisted",
  "Selected",
  "Rejected",
];

function JobApplicants() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [resumeModal, setResumeModal] = useState(null);

  const closeResumeModal = useCallback(() => setResumeModal(null), []);

  useEffect(() => {
    let active = true;

    const loadApplicants = async () => {
      setLoading(true);
      setError("");

      try {
        const currentUser = await account.get();
        const currentProfile = await getMyProfile(currentUser.$id);

        if (String(currentProfile?.role ?? "").toLowerCase() !== "company") {
          navigate("/jobs", { replace: true });
          return;
        }

        const currentJob = await getJobById(jobId);
        if (!active) return;

        if (currentJob.companyId !== currentUser.$id) {
          setError("You are not authorized to view these applications.");
          return;
        }

        const jobApplications = await getJobApplications(jobId);
        if (!active) return;

        setJob(currentJob);
        setApplications(Array.isArray(jobApplications) ? jobApplications : []);
      } catch (loadError) {
        console.error("Failed to load applicants:", loadError);
        if (active) setError("Unable to load applicants. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    };

    if (jobId) {
      loadApplicants();
    } else {
      setError("A job ID was not provided.");
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [jobId, navigate]);

  const statusCounts = useMemo(() => {
    const count = (status) => applications.filter(
      (application) => getApplicationStatus(application) === status
    ).length;

    return {
      total: applications.length,
      needsReview: count("Applied") + count("Under Review"),
      shortlisted: count("Shortlisted"),
      selected: count("Selected"),
    };
  }, [applications]);

  const filteredApplications = useMemo(() => {
    const searchText = normalizeText(search);

    return [...applications]
      .filter((application) => {
        const status = getApplicationStatus(application);
        const matchesStatus = statusFilter === "All" || status === statusFilter;
        const searchable = normalizeText([
          application.studentName,
          application.studentEmail,
          application.coverLetter,
          status,
        ]);
        const matchesSearch = !searchText || searchable.includes(searchText);
        return matchesStatus && matchesSearch;
      })
      .sort((first, second) => getAppliedTimestamp(second) - getAppliedTimestamp(first));
  }, [applications, search, statusFilter]);

  const handleStatusChange = async (applicationId, status) => {
    setUpdatingId(applicationId);
    setActionError("");

    try {
      const updatedApplication = await updateApplicationStatus(applicationId, status);
      setApplications((previousApplications) =>
        previousApplications.map((application) =>
          application.$id === applicationId
            ? { ...application, status: updatedApplication?.status || status }
            : application
        )
      );
    } catch (updateError) {
      console.error("Failed to update application status:", updateError);
      setActionError("Status could not be updated. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleViewResume = async (application) => {
    setResumeModal({ application, loading: true, resume: null, profile: null, error: "" });

    try {
      const data = await fetchApplicantResume(application.$id);
      setResumeModal((current) => {
        if (current?.application?.$id !== application.$id) return current;
        return {
          ...current,
          loading: false,
          resume: data.resume || null,
          profile: data.profile || null,
          error: "",
        };
      });
    } catch (resumeError) {
      console.error("Failed to load applicant resume:", resumeError);
      setResumeModal((current) => {
        if (current?.application?.$id !== application.$id) return current;
        return {
          ...current,
          loading: false,
          resume: null,
          profile: null,
          error: resumeError?.message || "Could not load this applicant’s resume.",
        };
      });
    }
  };

  if (loading) return <ApplicantsLoading />;

  if (error) {
    return (
      <main className="flex min-h-[55vh] items-center justify-center bg-linear-to-b from-sky-50/70 via-white to-violet-50/40 px-4 py-10 sm:px-6">
        <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-9">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
            <XCircle className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-slate-900">Applicants aren’t available</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/company-jobs")}
            className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-semibold text-blue-800 transition hover:bg-blue-100"
          >
            <ArrowLeft className="h-4 w-4" />Back to company jobs
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[60vh] bg-linear-to-b from-sky-50/70 via-slate-50 to-white pb-12">
      <div className="mx-auto max-w-[1680px] px-3 py-5 sm:px-5 sm:py-7 lg:px-6 2xl:px-8">
        <button
          type="button"
          onClick={() => navigate("/company-jobs")}
          className="mb-5 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-blue-100 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-blue-50 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4" />Back to company jobs
        </button>

        {/* Job header */}
        <section className="relative isolate overflow-hidden rounded-3xl border border-blue-100 bg-linear-to-br from-sky-50 via-white to-violet-50 shadow-sm shadow-blue-100/60">
          <div className="pointer-events-none absolute -right-14 -top-24 h-64 w-64 rounded-full border-26 border-blue-100/50" />
          <div className="pointer-events-none absolute -bottom-24 right-1/3 h-44 w-44 rounded-full bg-violet-100/50 blur-3xl" />
          <div className="relative p-5 sm:p-7 lg:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/90 text-blue-700 shadow-sm ring-1 ring-blue-100">
                  <BriefcaseBusiness className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-blue-700">{job?.companyName || "Company"}</p>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    {job?.title || "Job applicants"}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    Open each applicant’s resume and cover letter, then update the application’s status.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-blue-100 bg-white/90 px-4 py-3 shadow-sm ring-4 ring-white/70">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100/70 text-blue-700">
                  <Users className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-xl font-bold leading-tight text-blue-900">{applications.length}</span>
                  <span className="block text-xs font-medium text-slate-500">total applicants</span>
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 border-t border-blue-100/80 pt-5">
              {job?.jobType && <JobMeta icon={<BriefcaseBusiness className="h-3.5 w-3.5" />} text={job.jobType} />}
              {job?.location && <JobMeta icon={<MapPin className="h-3.5 w-3.5" />} text={job.location} />}
              {job?.workMode && <JobMeta icon={<Clock3 className="h-3.5 w-3.5" />} text={job.workMode} />}
            </div>
          </div>
        </section>

        {/* Summary cards */}
        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Application status summary">
          <SummaryCard label="Total applicants" value={statusCounts.total} tone="blue" icon={<Users className="h-5 w-5" />} />
          <SummaryCard label="Needs review" value={statusCounts.needsReview} tone="amber" icon={<Clock3 className="h-5 w-5" />} />
          <SummaryCard label="Shortlisted" value={statusCounts.shortlisted} tone="emerald" icon={<CheckCircle2 className="h-5 w-5" />} />
          <SummaryCard label="Selected" value={statusCounts.selected} tone="violet" icon={<CheckCircle2 className="h-5 w-5" />} />
        </section>

        {/* Search and status filters */}
        <section className="mt-7 rounded-2xl border border-blue-100 bg-linear-to-br from-white via-white to-sky-50/70 p-4 shadow-sm shadow-blue-100/50 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Applicants</h2>
              <p className="mt-1 text-sm text-slate-500">
                Showing {filteredApplications.length} of {applications.length} applications
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(240px,1fr)_190px] lg:w-140">
              <div>
                <label htmlFor="applicant-search" className="sr-only">Search applicants</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="applicant-search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name, email, or cover letter"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="application-status-filter" className="sr-only">Filter by status</label>
                <select
                  id="application-status-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="All">All statuses</option>
                  {APPLICATION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
            </div>
          </div>
        </section>

        {actionError && (
          <div role="alert" className="mt-4 flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />{actionError}
          </div>
        )}

        {applications.length === 0 ? (
          <EmptyApplicants
            title="No applications yet"
            message="When students apply for this opportunity, their applications will appear here."
          />
        ) : filteredApplications.length === 0 ? (
          <EmptyApplicants
            title="No matching applicants"
            message="Try another search term or choose a different status filter."
          />
        ) : (
          <div className="mt-5 space-y-4">
            {filteredApplications.map((application) => (
              <ApplicantCard
                key={application.$id}
                application={application}
                updating={updatingId === application.$id}
                onStatusChange={handleStatusChange}
                onViewResume={handleViewResume}
              />
            ))}
          </div>
        )}

        {resumeModal && (
          <ApplicantResumeModal
            modal={resumeModal}
            onClose={closeResumeModal}
            jobTitle={job?.title}
          />
        )}
      </div>
    </main>
  );
}

function ApplicantCard({ application, updating, onStatusChange, onViewResume }) {
  const name = application.studentName || "Student";
  const status = getApplicationStatus(application);
  const hasResume = Boolean(String(application.resumeId ?? "").trim());

  return (
    <article className={`rounded-2xl border border-slate-200 border-l-4 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:p-6 ${getApplicantCardAccent(status)}`}>
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-50 to-violet-50 text-sm font-bold uppercase text-blue-700 ring-1 ring-blue-100">
            {getInitials(name)}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-slate-900">{name}</h3>
            <p className="mt-0.5 break-all text-sm text-slate-500">{application.studentEmail || "Email not available"}</p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-400">
              <Clock3 className="h-3.5 w-3.5" />Applied {formatDate(application.appliedAt || application.$createdAt)}
            </p>
          </div>
        </div>

        <div className="sm:min-w-48 sm:text-right">
          <label htmlFor={`status-${application.$id}`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Application status
          </label>
          <div className="relative inline-flex w-full sm:w-auto">
            <select
              id={`status-${application.$id}`}
              aria-label={`Change application status for ${name}`}
              value={status}
              disabled={updating}
              onChange={(event) => onStatusChange(application.$id, event.target.value)}
              className={`w-full cursor-pointer rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none transition focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${getStatusStyle(status)}`}
            >
              {APPLICATION_STATUSES.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          {updating && <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-slate-400"><RefreshCw className="h-3 w-3 animate-spin" />Saving status…</p>}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(220px,0.72fr)]">
        <div className="rounded-xl border border-blue-100 bg-linear-to-br from-sky-50/80 via-white to-indigo-50/70 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm ring-1 ring-blue-100">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Resume</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800">
                  {hasResume ? "Saved resume linked to this application" : "No resume linked to this application"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onViewResume(application)}
              disabled={!hasResume}
              aria-label={hasResume ? `View resume for ${name}` : `No resume attached for ${name}`}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-800 transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              {hasResume ? "View resume" : "Resume unavailable"}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Application reference</p>
          <p className="mt-1.5 break-all text-sm font-medium text-slate-700">{application.$id}</p>
        </div>
      </div>

      {application.coverLetter && (
        <section className="mt-5" aria-label={`Cover letter from ${name}`}>
          <h4 className="text-sm font-bold text-slate-900">Cover letter</h4>
          <p className="mt-2 whitespace-pre-line wrap-break-word rounded-xl border border-amber-100 bg-linear-to-br from-amber-50/70 to-white p-4 text-sm leading-6 text-slate-700">
            {application.coverLetter}
          </p>
        </section>
      )}
    </article>
  );
}

function ApplicantResumeModal({ modal, onClose, jobTitle }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const application = modal.application || {};
  const name = application.studentName || "Student";
  const resume = modal.resume || {};
  const profile = modal.profile || {};
  const profileDetails = [
    { label: "Location", value: profile.city },
    { label: "Skills", value: profile.skills },
    { label: "Languages", value: profile.languages },
    { label: "LinkedIn", value: profile.linkedin },
    { label: "GitHub", value: profile.github },
    { label: "Portfolio", value: profile.portfolio },
  ].map((item) => {
    const text = formatResumeValue(item.value);
    const href = EXTERNAL_PROFILE_LINK_LABELS.has(item.label)
      ? getSafeExternalUrl(text)
      : "";
    return { ...item, text, href };
  }).filter((item) => item.text);
  const sections = [
    { label: "Professional Summary", value: resume.summary },
    { label: "Education", value: resume.education },
    { label: "Projects", value: resume.projects },
    { label: "Certifications", value: resume.certifications },
    { label: "Experience / Internship", value: resume.experience },
    { label: "Achievements", value: resume.achievements },
  ].map((section) => ({ ...section, text: formatResumeValue(section.value) }))
    .filter((section) => section.text);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="applicant-resume-title"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-blue-100 bg-linear-to-r from-sky-50/80 via-white to-violet-50/60 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Applicant resume</p>
            <h2 id="applicant-resume-title" className="mt-1 truncate text-xl font-bold text-slate-900">{name}</h2>
            <p className="mt-1 break-all text-sm text-slate-600">{application.studentEmail || "Email not available"}</p>
            <p className="mt-1 text-xs text-slate-500">
              {jobTitle ? `Application for ${jobTitle} · ` : ""}
              Applied {formatDate(application.appliedAt || application.$createdAt)}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close applicant resume"
            onClick={onClose}
            className="inline-flex h-9 w-9 cursor-pointer shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-white/80 text-blue-700 transition hover:bg-blue-50 hover:text-blue-900"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-linear-to-r from-blue-50/80 via-white to-violet-50/60 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Position</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{jobTitle || "Current opportunity"}</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusStyle(getApplicationStatus(application))}`}>
              {getApplicationStatus(application)}
            </span>
          </div>

          {!modal.loading && !modal.error && profileDetails.length > 0 && (
            <section className="mb-5 rounded-xl border border-blue-100 bg-linear-to-br from-sky-50/60 to-white p-4 sm:p-5" aria-labelledby="applicant-profile-highlights">
              <h3 id="applicant-profile-highlights" className="text-sm font-bold text-slate-900">Profile highlights</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {profileDetails.map((item) => (
                  <div key={item.label} className="rounded-lg border border-blue-100 bg-white/80 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                    {item.href ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${item.label} in a new tab`}
                        className="mt-1 inline-flex max-w-full cursor-pointer items-center gap-1.5 break-all text-sm font-semibold leading-5 text-blue-700 underline decoration-blue-200 underline-offset-2 transition hover:text-blue-900 hover:decoration-blue-500"
                      >
                        <span className="break-all">{item.text}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      </a>
                    ) : (
                      <p className="mt-1 wrap-break-word whitespace-pre-wrap text-sm leading-5 text-slate-700">{item.text}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {modal.loading ? (
            <div className="flex min-h-48 items-center justify-center gap-3 text-sm font-medium text-slate-600">
              <RefreshCw className="h-5 w-5 animate-spin text-slate-700" />
              Loading resume…
            </div>
          ) : modal.error ? (
            <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{modal.error}</span>
            </div>
          ) : sections.length > 0 ? (
            <div className="space-y-4">
              {sections.map((section) => (
                <section key={section.label} className="rounded-xl border border-blue-100 bg-linear-to-br from-white to-sky-50/40 p-4 sm:p-5">
                  <h3 className="text-sm font-bold text-slate-900">{section.label}</h3>
                  <p className="mt-2 whitespace-pre-wrap wrap-break-word text-sm leading-6 text-slate-700">{section.text}</p>
                </section>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-blue-200 bg-linear-to-br from-sky-50/70 via-white to-violet-50/50 p-8 text-center">
              <FileText className="mx-auto h-7 w-7 text-blue-600" />
              <h3 className="mt-3 font-semibold text-slate-900">No resume details yet</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">This applicant has a resume record, but hasn’t added any resume content yet.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function formatResumeValue(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(formatResumeValue).filter(Boolean).join("\n");
  if (typeof value === "object") {
    const displayValue = value.name ?? value.label ?? value.value;
    return displayValue === undefined || displayValue === null
      ? ""
      : formatResumeValue(displayValue);
  }
  return String(value).trim();
}

function getSafeExternalUrl(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";

  const candidate = /^[a-z][a-z\d+.-]*:/i.test(text) ? text : `https://${text}`;

  try {
    const url = new URL(candidate);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      !url.hostname.includes(".") ||
      url.username ||
      url.password
    ) {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
}

function JobMeta({ icon, text }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
      {icon}{text}
    </span>
  );
}

function SummaryCard({ label, value, tone, icon }) {
  const tones = {
    blue: {
      card: "border-blue-100 bg-gradient-to-br from-white to-blue-50/80",
      icon: "bg-blue-100/80 text-blue-700",
    },
    amber: {
      card: "border-amber-100 bg-gradient-to-br from-white to-amber-50/80",
      icon: "bg-amber-100/80 text-amber-700",
    },
    emerald: {
      card: "border-emerald-100 bg-gradient-to-br from-white to-emerald-50/80",
      icon: "bg-emerald-100/80 text-emerald-700",
    },
    violet: {
      card: "border-violet-100 bg-gradient-to-br from-white to-violet-50/80",
      icon: "bg-violet-100/80 text-violet-700",
    },
  };
  const colors = tones[tone] || tones.blue;

  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${colors.card}`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors.icon}`}>{icon}</span>
      <span>
        <span className="block text-xl font-bold leading-tight text-slate-900">{value}</span>
        <span className="mt-0.5 block text-xs font-medium text-slate-600">{label}</span>
      </span>
    </div>
  );
}

function EmptyApplicants({ title, message }) {
  return (
    <section className="mt-5 rounded-2xl border border-dashed border-blue-200 bg-linear-to-br from-sky-50 via-white to-violet-50 px-6 py-12 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100/80 text-blue-700">
        <Users className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-lg font-bold text-slate-900">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-600">{message}</p>
    </section>
  );
}

function ApplicantsLoading() {
  return (
    <main className="min-h-[60vh] bg-linear-to-b from-sky-50/70 via-slate-50 to-white px-3 py-5 sm:px-5 sm:py-7 lg:px-6 2xl:px-8">
      <div className="mx-auto max-w-[1680px] animate-pulse">
        <div className="h-4 w-36 rounded bg-blue-100" />
        <div className="mt-5 h-48 rounded-3xl border border-blue-100 bg-linear-to-r from-white to-sky-50" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-20 rounded-2xl border border-blue-50 bg-white" />)}
        </div>
        <div className="mt-5 h-20 rounded-2xl border border-blue-50 bg-white" />
        <div className="mt-4 space-y-4">
          {[1, 2].map((item) => <div key={item} className="h-56 rounded-2xl border border-blue-50 bg-white" />)}
        </div>
      </div>
    </main>
  );
}

function getApplicationStatus(application) {
  return application?.status || "Applied";
}

function getStatusStyle(status) {
  switch (status) {
    case "Shortlisted":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Under Review":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "Selected":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "Rejected":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "Applied":
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function getApplicantCardAccent(status) {
  switch (status) {
    case "Shortlisted":
      return "border-l-emerald-300";
    case "Under Review":
      return "border-l-sky-300";
    case "Selected":
      return "border-l-violet-300";
    case "Rejected":
      return "border-l-rose-300";
    case "Applied":
    default:
      return "border-l-amber-300";
  }
}

function formatDate(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getAppliedTimestamp(application) {
  const timestamp = Date.parse(application.appliedAt || application.$createdAt || "");
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function normalizeText(value) {
  const text = Array.isArray(value) ? value.filter(Boolean).join(" ") : String(value ?? "");
  return text.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

function getInitials(name) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default JobApplicants;
