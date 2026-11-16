import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  IndianRupee,
  Laptop,
  MapPin,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";

import { account } from "../lib/account";
import { getMyResume } from "../lib/resume";
import { getJobById } from "../lib/jobs";
import { getMyProfile } from "../lib/profile";
import {
  checkExistingApplication,
  createApplication,
} from "../lib/applications";

function normalizeRole(role) {
  return String(role ?? "").trim().toLowerCase();
}

function toDisplayText(value) {
  if (value === null || value === undefined) return "";

  if (Array.isArray(value)) {
    return value.map(toDisplayText).filter(Boolean).join(", ");
  }

  if (typeof value === "object") {
    const displayValue = value.name ?? value.label ?? value.value;
    return displayValue === null || displayValue === undefined
      ? ""
      : toDisplayText(displayValue);
  }

  return String(value);
}

function getSkillList(value) {
  if (Array.isArray(value)) {
    return value.flatMap(getSkillList);
  }

  if (value === null || value === undefined) return [];

  if (typeof value === "object") {
    const displayValue = value.name ?? value.label ?? value.value;
    return displayValue === null || displayValue === undefined
      ? []
      : getSkillList(displayValue);
  }

  if (typeof value !== "string") {
    const skill = toDisplayText(value).trim();
    return skill ? [skill] : [];
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) return [];

  // Skills may be stored as a JSON-encoded array.
  if (trimmedValue.startsWith("[") && trimmedValue.endsWith("]")) {
    try {
      const parsedValue = JSON.parse(trimmedValue);
      if (Array.isArray(parsedValue)) return getSkillList(parsedValue);
    } catch {
      // If it is not JSON, parse it as a delimited string below.
    }
  }

  return trimmedValue
    .split(/[,;|•\r\n]+/)
    .map((skill) => skill.trim())
    .filter(Boolean);
}

function formatDeadline(deadline) {
  if (!deadline) return "No deadline specified";

  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return "No deadline specified";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getMessageClassName(messageType) {
  if (messageType === "success") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (messageType === "warning") {
    return "border border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border border-rose-200 bg-rose-50 text-rose-700";
}

function FactCard({ icon, label, value, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/30">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone] || tones.blue}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="mt-1 truncate text-sm font-bold text-slate-800">
          {value || "Not specified"}
        </p>
      </div>
    </div>
  );
}

const JobDetails = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [showApplyForm, setShowApplyForm] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");

  const [user, setUser] = useState(null);
  const [resume, setResume] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [loadingUserRole, setLoadingUserRole] = useState(true);

  const [checkingApplication, setCheckingApplication] = useState(false);
  const [submittingApplication, setSubmittingApplication] = useState(false);

  const [applicationMessage, setApplicationMessage] = useState("");
  const [applicationMessageType, setApplicationMessageType] = useState("");

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadJob = useCallback(async () => {
    if (!jobId) {
      setJob(null);
      setError("This job link is invalid.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await getJobById(jobId);
      setJob(data || null);

      if (!data) {
        setError("This job may have been removed or is no longer available.");
      }
    } catch (loadError) {
      console.error("Failed to load job details:", loadError);
      setJob(null);
      setError("Unable to load this job. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  useEffect(() => {
    let cancelled = false;

    const loadUserRole = async () => {
      try {
        const currentUser = await account.get();
        if (cancelled) return;

        setUser(currentUser);

        try {
          const currentProfile = await getMyProfile(currentUser.$id);
          if (cancelled) return;
          setUserRole(normalizeRole(currentProfile?.role));
        } catch (profileError) {
          console.error("Failed to load the current user's profile:", profileError);
          if (!cancelled) setUserRole("");
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setUserRole("");
        }
      } finally {
        if (!cancelled) setLoadingUserRole(false);
      }
    };

    loadUserRole();

    return () => {
      cancelled = true;
    };
  }, []);

  const goBackToJobs = () => navigate("/jobs");

  if (loading) {
    return (
      <div className="min-h-screen overflow-hidden bg-[#f7f9fd] px-4 py-7 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-9 w-32 rounded-xl bg-slate-200/80" />

          <div className="mt-5 rounded-[2rem] border border-blue-100 bg-white p-6 shadow-sm sm:p-9">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-2xl bg-slate-200" />
              <div className="flex-1">
                <div className="h-4 w-32 rounded bg-slate-200" />
                <div className="mt-3 h-8 w-2/3 rounded bg-slate-200" />
                <div className="mt-3 h-4 w-1/3 rounded bg-slate-200" />
              </div>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="h-20 rounded-2xl bg-slate-100" />
              <div className="h-20 rounded-2xl bg-slate-100" />
              <div className="h-20 rounded-2xl bg-slate-100" />
            </div>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-5">
              <div className="h-52 rounded-3xl bg-white shadow-sm" />
              <div className="h-36 rounded-3xl bg-white shadow-sm" />
            </div>
            <div className="h-80 rounded-3xl bg-white shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f9fd] px-4 py-10">
        <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/50 sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            {error && error.includes("Unable to load") ? (
              <AlertCircle size={28} />
            ) : (
              <BriefcaseBusiness size={28} />
            )}
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
            {error && error.includes("Unable to load")
              ? "Job details couldn’t load"
              : "Job Not Found"}
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error || "This job may have been removed or is no longer available."}
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            {error && error.includes("Unable to load") && (
              <button
                type="button"
                onClick={loadJob}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
              >
                Try Again
                <ArrowRight size={16} />
              </button>
            )}

            <button
              type="button"
              onClick={goBackToJobs}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              <ArrowLeft size={16} />
              Back to Jobs
            </button>
          </div>
        </div>
      </div>
    );
  }

  const companyName = toDisplayText(job.companyName).trim() || "Company";
  const jobTitle = toDisplayText(job.title).trim() || "Untitled opportunity";
  const jobType = toDisplayText(job.jobType).trim() || "Job";
  const jobLocation = toDisplayText(job.location).trim() || "Location not specified";
  const jobSalary = toDisplayText(job.salary).trim();
  const jobExperience = toDisplayText(job.experience).trim();
  const jobEducation = toDisplayText(job.education).trim();
  const jobDescription = toDisplayText(job.description).trim();
  const jobWorkMode = toDisplayText(job.workMode).trim();
  const jobSkills = getSkillList(job.skills);
  const jobStatus = toDisplayText(job.status).trim() || "Active";
  const isJobActive = normalizeRole(jobStatus) === "active";
  const isCompany = userRole === "company";
  const isStudent = userRole === "student" && Boolean(user);
  const companyInitial = companyName.charAt(0).toUpperCase() || "C";

  const setMessage = (message, type = "warning") => {
    setApplicationMessage(message);
    setApplicationMessageType(type);
  };

  const handlePrepareApplication = async () => {
    try {
      setCheckingApplication(true);
      setApplicationMessage("");
      setApplicationMessageType("");

      if (!user || userRole !== "student") {
        setMessage("Please sign in with a student account to apply.", "warning");
        return;
      }

      if (!isJobActive) {
        setMessage("This opportunity is no longer accepting applications.", "warning");
        return;
      }

      // Re-check the current session and role before starting an application.
      const currentUser = await account.get();
      const currentProfile = await getMyProfile(currentUser.$id);
      const currentRole = normalizeRole(currentProfile?.role);

      setUser(currentUser);
      setUserRole(currentRole);

      if (currentRole !== "student") {
        setMessage("Only student accounts can apply for this opportunity.", "warning");
        return;
      }

      const currentResume = await getMyResume(currentUser.$id);
      setResume(currentResume || null);

      if (!currentResume) {
        setMessage("Please create your resume before applying.", "warning");
        return;
      }

      const existingApplication = await checkExistingApplication(
        job.$id,
        currentUser.$id
      );

      if (existingApplication) {
        setMessage("You have already applied for this opportunity.", "warning");
        return;
      }

      setShowApplyForm(true);

      window.setTimeout(() => {
        document.getElementById("application-form")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch (prepareError) {
      console.error("Failed to prepare application:", prepareError);
      setMessage("Unable to start application. Please try again.", "error");
    } finally {
      setCheckingApplication(false);
    }
  };

  const handleSubmitApplication = async () => {
    try {
      setSubmittingApplication(true);
      setApplicationMessage("");
      setApplicationMessageType("");

      if (!user || !resume || userRole !== "student") {
        setMessage(
          "Please make sure you are signed in with a student account and have a resume.",
          "error"
        );
        return;
      }

      if (!isJobActive) {
        setMessage("This opportunity is no longer accepting applications.", "warning");
        return;
      }

      // Re-check to prevent duplicate submissions if an application was
      // created in another tab after the form was opened.
      const existingApplication = await checkExistingApplication(
        job.$id,
        user.$id
      );

      if (existingApplication) {
        setMessage("You have already applied for this opportunity.", "warning");
        return;
      }

      await createApplication({
        jobId: job.$id,
        studentId: user.$id,
        studentName: user.name || "Student",
        studentEmail: user.email,
        resumeId: resume.$id,
        coverLetter: coverLetter.trim(),
      });

      setMessage("Application submitted successfully ✓", "success");
      setCoverLetter("");

      window.setTimeout(() => {
        setShowApplyForm(false);
      }, 1800);
    } catch (submitError) {
      console.error("Failed to submit application:", submitError);

      if (submitError?.code === 409) {
        setMessage("You have already applied for this opportunity.", "warning");
      } else {
        setMessage("Failed to submit application. Please try again.", "error");
      }
    } finally {
      setSubmittingApplication(false);
    }
  };

  const closeApplicationForm = () => {
    setShowApplyForm(false);
    setApplicationMessage("");
    setApplicationMessageType("");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f9fd] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Soft, light background accents */}
      <div className="pointer-events-none absolute -left-40 top-16 h-96 w-96 rounded-full bg-blue-200/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-128 h-96 w-96 rounded-full bg-emerald-200/25 blur-3xl" />

      <main className="relative mx-auto max-w-7xl">
        {/* Back */}
        <button
          type="button"
          onClick={goBackToJobs}
          className="mb-5 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-200 hover:bg-white hover:text-blue-700"
        >
          <ArrowLeft size={16} />
          Back to Jobs
        </button>

        {/* Opportunity hero */}
        <section className="relative isolate overflow-hidden rounded-[2rem] border border-blue-100 bg-linear-to-br from-blue-50 via-white to-emerald-50 shadow-lg shadow-blue-100/40">
          <div className="pointer-events-none absolute -right-14 -top-24 h-72 w-72 rounded-full border-30 border-blue-100/60" />
          <div className="pointer-events-none absolute -bottom-32 right-1/3 h-64 w-64 rounded-full bg-emerald-100/60 blur-3xl" />

          <div className="relative p-6 sm:p-9 lg:p-10">
            <div className="flex flex-col gap-7 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-4 sm:gap-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-blue-700 shadow-md shadow-blue-100 ring-1 ring-blue-100 sm:h-18 sm:w-18">
                  {companyInitial}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-xs font-bold text-blue-700">
                      <Building2 size={13} />
                      {companyName}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${isJobActive
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border border-rose-200 bg-rose-50 text-rose-700"
                        }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${isJobActive ? "bg-emerald-500" : "bg-rose-500"}`}
                      />
                      {jobStatus}
                    </span>
                  </div>

                  <h1 className="mt-4 wrap-break-word text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
                    {jobTitle}
                  </h1>

                  <p className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-600">
                    <MapPin size={17} className="shrink-0 text-blue-600" />
                    {jobLocation}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-blue-100 bg-white/90 px-3 py-2 text-xs font-bold text-blue-700 shadow-sm shadow-blue-100/40">
                      <BriefcaseBusiness size={14} />
                      {jobType}
                    </span>

                    {jobWorkMode && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-violet-100 bg-white/90 px-3 py-2 text-xs font-semibold text-violet-700 shadow-sm shadow-violet-100/40">
                        <Laptop size={14} />
                        {jobWorkMode}
                      </span>
                    )}

                    {jobExperience && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-100 bg-white/90 px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm shadow-emerald-100/40">
                        <Clock3 size={14} />
                        {jobExperience}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/90 bg-white/75 px-4 py-3 shadow-sm backdrop-blur sm:min-w-44">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <ShieldCheck size={19} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400">Opportunity</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-800">
                    {isJobActive ? "Open for applications" : "Applications closed"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key facts */}
        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <FactCard
            icon={<IndianRupee size={18} />}
            label="Salary / Stipend"
            value={jobSalary || "Not specified"}
            tone="emerald"
          />
          <FactCard
            icon={<GraduationCap size={19} />}
            label="Education"
            value={jobEducation || "Not specified"}
            tone="violet"
          />
          <FactCard
            icon={<CalendarDays size={18} />}
            label="Application Deadline"
            value={formatDeadline(job.deadline)}
            tone="amber"
          />
        </section>

        {/* Main content */}
        <div className="mt-6 grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
          {/* Details column */}
          <div className="min-w-0 space-y-5">
            {/* Description */}
            <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/40 sm:p-8">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <FileText size={19} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    About this opportunity
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Role overview and responsibilities
                  </p>
                </div>
              </div>

              <div className="mt-5 whitespace-pre-line wrap-break-word text-sm leading-7 text-slate-600 [overflow-wrap:anywhere]">
                {jobDescription || "No description provided."}
              </div>
            </section>

            {/* Skills */}
            {jobSkills.length > 0 && (
              <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/40 sm:p-8">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <Sparkles size={19} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Skills you’ll use
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                      Core skills mentioned by the company
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2.5">
                  {jobSkills.map((skill, index) => (
                    <span
                      key={`${skill}-${index}`}
                      className="rounded-xl border border-blue-100 bg-blue-50/70 px-3.5 py-2 text-xs font-semibold text-blue-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Requirements */}
            <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/40 sm:p-8">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Role requirements
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Important details to review before applying
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Education
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    {jobEducation || "Not specified"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Experience
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    {jobExperience || "Not specified"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:col-span-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Work mode & location
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    {[jobWorkMode, jobLocation].filter(Boolean).join(" · ") || "Not specified"}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Application / management sidebar */}
          <aside className="space-y-5 lg:sticky lg:top-6">
            <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/40">
              <div className="border-b border-slate-100 bg-linear-to-r from-blue-50 via-white to-emerald-50 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-blue-100">
                    {isCompany ? <Building2 size={20} /> : <Sparkles size={19} />}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                      {isCompany ? "Company workspace" : "Next step"}
                    </p>
                    <h2 className="mt-0.5 text-lg font-bold text-slate-900">
                      {isCompany ? "Manage this opportunity" : "Interested in this role?"}
                    </h2>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {isCompany
                    ? "Manage your posting or review its applicants."
                    : "Review the key details, then apply with your profile and resume."}
                </p>
              </div>

              <div className="p-6">
                <div className="space-y-3 rounded-2xl bg-slate-50/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
                      <CalendarDays size={15} className="text-amber-500" />
                      Deadline
                    </span>
                    <span className="text-right text-xs font-bold text-slate-700">
                      {formatDeadline(job.deadline)}
                    </span>
                  </div>

                  <div className="h-px bg-slate-200/80" />

                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
                      <BriefcaseBusiness size={15} className="text-blue-500" />
                      Job type
                    </span>
                    <span className="text-right text-xs font-bold text-slate-700">
                      {jobType}
                    </span>
                  </div>

                  {jobSalary && (
                    <>
                      <div className="h-px bg-slate-200/80" />
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
                          <IndianRupee size={15} className="text-emerald-600" />
                          Compensation
                        </span>
                        <span className="max-w-[58%] text-right text-xs font-bold text-slate-700">
                          {jobSalary}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Role-specific actions */}
                {loadingUserRole ? (
                  <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-500">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-100 border-t-blue-600" />
                    Checking your account...
                  </div>
                ) : isCompany ? (
                  job.companyId === user?.$id ? (
                    <div className="mt-5 space-y-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/edit-job/${job.$id}`)}
                        className="cursor-pointer inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-200/60 transition hover:-translate-y-0.5 hover:bg-blue-700"
                      >
                        Edit Job
                        <ArrowRight size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/job-applicants/${job.$id}`)}
                        className="cursor-pointer inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <UsersRound size={16} />
                        View Applicants
                      </button>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-bold text-amber-800">
                        This opportunity belongs to another company.
                      </p>
                      <p className="mt-1 text-xs leading-5 text-amber-700/80">
                        You can view the listing, but only its owner can manage it.
                      </p>
                    </div>
                  )
                ) : isStudent ? (
                  isJobActive ? (
                    <button
                      type="button"
                      disabled={checkingApplication}
                      onClick={handlePrepareApplication}
                      className="cursor-pointer mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-200/60 transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                    >
                      {checkingApplication ? "Checking..." : "Apply Now"}
                      {!checkingApplication && <ArrowRight size={17} />}
                    </button>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-sm font-semibold text-rose-700">
                      This opportunity is no longer accepting applications.
                    </div>
                  )
                ) : (
                  <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-center">
                    <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                      <UserRound size={17} />
                    </div>
                    <p className="mt-2 text-sm font-bold text-slate-800">
                      A student account is required to apply.
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Sign in with a student account and make sure your resume is ready.
                    </p>
                  </div>
                )}

                {applicationMessage && !showApplyForm && (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${getMessageClassName(applicationMessageType)}`}
                  >
                    {applicationMessage}
                  </div>
                )}

                <p className="mt-4 flex items-start justify-center gap-1.5 text-center text-[11px] leading-5 text-slate-400">
                  <ShieldCheck size={13} className="mt-0.5 shrink-0" />
                  {isCompany
                    ? "Only your company account can manage this posting."
                    : "Your application will use the profile and resume linked to your account."}
                </p>
              </div>
            </section>

            {/* Helpful note */}
            <section className="rounded-3xl border border-emerald-100 bg-linear-to-br from-emerald-50 via-white to-blue-50 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Before you apply
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Make sure your resume is up to date. A short, relevant cover letter is optional.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>

        {/* Application Form */}
        {isStudent && isJobActive && showApplyForm && (
          <section
            id="application-form"
            className="mt-7 scroll-mt-6 overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-xl shadow-blue-100/40"
          >
            <div className="border-b border-blue-100 bg-linear-to-r from-blue-50 via-white to-emerald-50 px-6 py-6 sm:px-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-blue-100">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                      Your application
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
                      Apply for this opportunity
                    </h2>
                    <p className="mt-1.5 text-sm leading-6 text-slate-500">
                      Review your details and add an optional note for the company.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeApplicationForm}
                  className="rounded-xl border border-slate-200 bg-white p-2 text-sm font-semibold text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                  aria-label="Close application form"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <UserRound size={14} className="text-blue-500" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={user?.name || ""}
                    disabled
                    className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none disabled:opacity-100"
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <Building2 size={14} className="text-blue-500" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none disabled:opacity-100"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                  <FileText size={19} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                    Resume attached
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-emerald-800">
                    Your saved resume will be shared with the company.
                  </p>
                </div>
                <CheckCircle2 size={20} className="ml-auto shrink-0 text-emerald-600" />
              </div>

              <div className="mt-6">
                <label
                  htmlFor="cover-letter"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Cover Letter <span className="font-medium text-slate-400">(Optional)</span>
                </label>
                <textarea
                  id="cover-letter"
                  value={coverLetter}
                  onChange={(event) => setCoverLetter(event.target.value)}
                  rows={6}
                  placeholder="Write a short message explaining why you’re interested in this opportunity..."
                  className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
                <p className="mt-2 text-xs text-slate-400">
                  Keep it brief and specific to this role.
                </p>
              </div>

              {applicationMessage && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${getMessageClassName(applicationMessageType)}`}
                >
                  {applicationMessage}
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeApplicationForm}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={submittingApplication}
                  onClick={handleSubmitApplication}
                  className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submittingApplication ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Application
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default JobDetails;
