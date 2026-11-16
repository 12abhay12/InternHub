import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CircleDollarSign,
  Clock3,
  FileText,
  GraduationCap,
  MapPin,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { account } from "../lib/account";
import { createJob } from "../lib/jobs";
import { getMyProfile } from "../lib/profile";
import { Card } from "../components/ui/card";

const inputClassName =
  "w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 text-sm text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10";

const labelClassName = "mb-2 block text-sm font-semibold text-slate-700";

const PostJob = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    jobType: "",
    location: "",
    salary: "",
    skills: "",
    education: "",
    experience: "",
    deadline: "",
    workMode: "",
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const currentUser = await account.get();
        const currentProfile = await getMyProfile(currentUser.$id);

        if (currentProfile?.role !== "company") {
          navigate("/jobs", { replace: true });
          return;
        }

        setCheckingRole(false);
      } catch (error) {
        console.error("Role check failed:", error);
        navigate("/jobs", { replace: true });
      }
    };

    checkRole();
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const description = formData.description.trim();

    if (description.length < 30) {
      setMessage("Job description must be at least 30 characters.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const currentUser = await account.get();
      const currentProfile = await getMyProfile(currentUser.$id);

      if (currentProfile?.role !== "company") {
        setMessage("Only company accounts can post jobs.");
        setSaving(false);
        return;
      }

      const jobData = {
        companyId: currentUser.$id,
        companyName: currentUser.name || "Company",
        title: formData.title.trim(),
        description,
        jobType: formData.jobType,
        location: formData.location.trim(),
        salary: formData.salary.trim(),
        skills: formData.skills.trim(),
        education: formData.education.trim(),
        workMode: formData.workMode,
        experience: formData.experience.trim(),
        deadline: formData.deadline
          ? new Date(formData.deadline).toISOString()
          : null,
        status: "Active",
      };

      await createJob(jobData);

      setMessage("Job posted successfully");
      setFormData({
        title: "",
        description: "",
        jobType: "",
        location: "",
        salary: "",
        skills: "",
        education: "",
        experience: "",
        deadline: "",
        workMode: "",
      });
    } catch (error) {
      console.error("Failed to post job:", error);
      setMessage("Failed to post job");
    } finally {
      setSaving(false);
    }
  };

  if (checkingRole) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4">
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl" />

        <div className="relative w-full max-w-sm rounded-3xl border border-white/80 bg-white/90 p-8 text-center shadow-xl shadow-slate-200/60 backdrop-blur">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <BriefcaseBusiness size={25} />
          </div>

          <div className="mx-auto mt-5 h-7 w-7 animate-spin rounded-full border-[3px] border-blue-100 border-t-blue-600" />
          <p className="mt-4 text-sm font-semibold text-slate-700">
            Verifying company access
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Just a moment while we prepare your workspace.
          </p>
        </div>
      </div>
    );
  }

  const descriptionLength = formData.description.length;
  const isSuccessMessage = message.includes("successfully");

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f7fb] px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
      {/* Soft background accents */}
      <div className="pointer-events-none absolute -left-40 top-24 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 top-112 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl" />

      <main className="relative mx-auto max-w-7xl">
        {/* Modern page header */}
        <section className="relative isolate overflow-hidden rounded-[2rem] bg-linear-to-br from-blue-600 via-blue-400 to-emerald-400 px-6 py-8 text-white shadow-xl shadow-blue-900/10 sm:px-9 sm:py-10 lg:px-11">
          <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border-36 border-white/10" />
          <div className="pointer-events-none absolute -bottom-36 right-1/3 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-blue-50 backdrop-blur">
                <Sparkles size={14} />
                COMPANY WORKSPACE
              </div>

              <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.75rem]">
                Post a Job or Internship
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-blue-50 sm:text-base">
                Create a clear, compelling opportunity and connect with the
                right students and professionals.
              </p>

              <div className="mt-6 flex flex-wrap gap-2.5">
                <span className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur">
                  <UsersRound size={15} /> Reach qualified candidates
                </span>
                <span className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur">
                  <ArrowUpRight size={15} /> Manage applicants easily
                </span>
              </div>
            </div>

            <div className="hidden w-full max-w-xs rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-md lg:block">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                  <BriefcaseBusiness size={21} />
                </div>
                <div>
                  <p className="text-sm font-bold">Your next great hire</p>
                  <p className="mt-0.5 text-xs text-blue-50">
                    Starts with a great listing.
                  </p>
                </div>
              </div>
              <div className="mt-5 h-px bg-white/20" />
              <div className="mt-4 flex items-start gap-2.5 text-xs leading-5 text-blue-50">
                <Check size={15} className="mt-0.5 shrink-0 text-emerald-200" />
                <span>Share role details, skills and application deadline.</span>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Main form */}
          <Card className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50">
            <form onSubmit={handleSubmit}>
              <div className="border-b border-slate-100 px-6 py-6 sm:px-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <FileText size={22} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
                        Opportunity details
                      </p>
                      <h2 className="mt-1 text-lg font-bold text-slate-900">
                        Create your listing
                      </h2>
                    </div>
                  </div>

                  <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                    Drafting a new post
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-500">
                  Fields marked with <span className="font-bold text-rose-500">*</span> are required.
                </p>
              </div>

              <div className="space-y-9 px-6 py-7 sm:px-8 sm:py-8">
                {/* Section: basic details */}
                <section>
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white shadow-sm shadow-blue-200">
                      01
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Basic information
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Give candidates a quick overview of the role.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label htmlFor="post-job-title" className={labelClassName}>
                        Job / Internship Title <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <BriefcaseBusiness
                          size={17}
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          id="post-job-title"
                          type="text"
                          name="title"
                          value={formData.title}
                          onChange={handleChange}
                          placeholder="Example: Frontend Developer Intern"
                          required
                          className={`${inputClassName} pl-11`}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="post-job-type" className={labelClassName}>
                        Job Type <span className="text-rose-500">*</span>
                      </label>
                      <select
                        id="post-job-type"
                        name="jobType"
                        value={formData.jobType}
                        onChange={handleChange}
                        required
                        className={`${inputClassName} cursor-pointer text-slate-700`}
                      >
                        <option value="">Select job type</option>
                        <option value="Full-time">Full-time</option>
                        <option value="Part-Time">Part-Time</option>
                        <option value="Internship">Internship</option>
                        <option value="Contract">Contract</option>
                        <option value="Freelance">Freelance</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="post-job-location" className={labelClassName}>
                        Location <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <MapPin
                          size={17}
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          id="post-job-location"
                          type="text"
                          name="location"
                          value={formData.location}
                          onChange={handleChange}
                          placeholder="Example: Varanasi / Remote"
                          required
                          className={`${inputClassName} pl-11`}
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="post-job-work-mode" className={labelClassName}>
                        Work Mode <span className="text-rose-500">*</span>
                      </label>
                      <select
                        id="post-job-work-mode"
                        name="workMode"
                        value={formData.workMode}
                        onChange={handleChange}
                        required
                        className={`${inputClassName} cursor-pointer text-slate-700`}
                      >
                        <option value="">Select work mode</option>
                        <option value="Remote">Remote</option>
                        <option value="On-site">On-site</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                    </div>
                  </div>
                </section>

                <div className="h-px bg-slate-100" />

                {/* Section: requirements */}
                <section>
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-xs font-bold text-white shadow-sm shadow-emerald-200">
                      02
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Compensation & requirements
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Help candidates understand what the role offers.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="post-job-salary" className={labelClassName}>
                        Salary / Stipend
                      </label>
                      <div className="relative">
                        <CircleDollarSign
                          size={17}
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          id="post-job-salary"
                          type="text"
                          name="salary"
                          value={formData.salary}
                          onChange={handleChange}
                          placeholder="Example: ₹10,000 - ₹15,000 / month"
                          className={`${inputClassName} pl-11`}
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-400">
                        Mention the currency and pay period for clarity.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="post-job-experience" className={labelClassName}>
                        Experience
                      </label>
                      <div className="relative">
                        <Clock3
                          size={17}
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          id="post-job-experience"
                          type="text"
                          name="experience"
                          value={formData.experience}
                          onChange={handleChange}
                          placeholder="Example: Fresher / 0-1 years"
                          className={`${inputClassName} pl-11`}
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="post-job-skills" className={labelClassName}>
                        Required Skills <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Sparkles
                          size={17}
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          id="post-job-skills"
                          type="text"
                          name="skills"
                          value={formData.skills}
                          onChange={handleChange}
                          placeholder="Example: React, JavaScript, HTML, CSS"
                          required
                          className={`${inputClassName} pl-11`}
                        />
                      </div>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                        <Check size={13} className="text-emerald-500" />
                        Separate multiple skills using commas.
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="post-job-education" className={labelClassName}>
                        Required Education
                      </label>
                      <div className="relative">
                        <GraduationCap
                          size={18}
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          id="post-job-education"
                          type="text"
                          name="education"
                          value={formData.education}
                          onChange={handleChange}
                          placeholder="Example: BCA / B.Tech / Any Graduate"
                          className={`${inputClassName} pl-11`}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <div className="h-px bg-slate-100" />

                {/* Section: description */}
                <section>
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500 text-xs font-bold text-white shadow-sm shadow-violet-200">
                      03
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Role description
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Explain the responsibilities and what success looks like.
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label htmlFor="post-job-description" className={labelClassName}>
                        Job Description <span className="text-rose-500">*</span>
                      </label>

                      <span
                        className={`shrink-0 text-xs font-semibold ${descriptionLength >= 2800
                          ? "text-orange-600"
                          : "text-slate-400"
                          }`}
                      >
                        {descriptionLength} / 3000
                      </span>
                    </div>

                    <textarea
                      id="post-job-description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Describe the role, responsibilities, requirements and other important information..."
                      rows={8}
                      maxLength={3000}
                      required
                      className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 text-sm leading-7 text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-slate-400">
                        Maximum 3000 characters. Keep it clear and easy to scan.
                      </p>
                      <p className="text-xs font-medium text-slate-400">
                        At least 30 characters required
                      </p>
                    </div>
                  </div>
                </section>

                <div className="h-px bg-slate-100" />

                {/* Section: deadline */}
                <section>
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-xs font-bold text-white shadow-sm shadow-amber-200">
                      04
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Application timeline
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Set an optional deadline for applications.
                      </p>
                    </div>
                  </div>

                  <div className="max-w-md">
                    <label htmlFor="post-job-deadline" className={labelClassName}>
                      Application Deadline
                    </label>
                    <div className="relative">
                      <CalendarDays
                        size={17}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        id="post-job-deadline"
                        type="date"
                        name="deadline"
                        value={formData.deadline}
                        onChange={handleChange}
                        className={`${inputClassName} pl-11`}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      Leave this blank if applications have no fixed closing date.
                    </p>
                  </div>
                </section>

                {/* Feedback message */}
                {message && (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`flex items-start gap-3 rounded-2xl px-4 py-4 text-sm font-semibold ${isSuccessMessage
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border border-rose-200 bg-rose-50 text-rose-700"
                      }`}
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/80">
                      {isSuccessMessage ? <Check size={15} /> : <Sparkles size={15} />}
                    </span>
                    <span>{message}</span>
                  </div>
                )}

                {/* Submit */}
                <div className="flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex items-start gap-2 text-xs leading-5 text-slate-400">
                    <Check size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                    Your listing will be published as an active opportunity.
                  </p>

                  <button
                    type="submit"
                    disabled={saving}
                    className="cursor-pointer inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200/70 transition duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto"
                  >
                    {saving ? (
                      <>
                        <span className=" h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Posting...
                      </>
                    ) : (
                      <>
                        <span>Post Opportunity</span>
                        <ArrowUpRight size={17} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </Card>

          {/* Live preview and guidance */}
          <aside className="space-y-5 lg:sticky lg:top-6">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/40">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-600">
                    Live preview
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Updates as you fill the form
                  </p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <BriefcaseBusiness size={17} />
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-emerald-400 text-white shadow-sm">
                    <BriefcaseBusiness size={19} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="wrap-break-word text-sm font-bold text-slate-900">
                      {formData.title.trim() || "Your opportunity title"}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {formData.jobType || "Job type"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin size={14} className="shrink-0 text-blue-500" />
                    <span className="truncate">
                      {formData.location.trim() || "Location"}
                    </span>
                  </p>
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    <CircleDollarSign size={14} className="shrink-0 text-emerald-600" />
                    <span className="truncate">
                      {formData.salary.trim() || "Salary / stipend"}
                    </span>
                  </p>
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    <GraduationCap size={15} className="shrink-0 text-violet-500" />
                    <span className="truncate">
                      {formData.workMode || "Work mode"}
                    </span>
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-blue-100 bg-linear-to-br from-blue-50 via-white to-emerald-50 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Make your post stand out
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Clear details help the right candidates decide quickly.
                  </p>
                </div>
              </div>

              <ul className="mt-4 space-y-3">
                <li className="flex items-start gap-2.5 text-xs leading-5 text-slate-600">
                  <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                  Use a specific role title.
                </li>
                <li className="flex items-start gap-2.5 text-xs leading-5 text-slate-600">
                  <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                  List the skills candidates will use.
                </li>
                <li className="flex items-start gap-2.5 text-xs leading-5 text-slate-600">
                  <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                  Explain responsibilities and expectations.
                </li>
              </ul>
            </section>

            <section className="rounded-3xl bg-slate-900 p-5 text-white shadow-lg shadow-slate-300/40">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-emerald-300">
                  <UsersRound size={19} />
                </div>
                <div>
                  <p className="text-sm font-bold">Ready to meet your next hire?</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">
                    Complete the required details and publish your opportunity.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4 text-xs font-medium text-slate-300">
                <Check size={14} className="text-emerald-300" />
                You can review applicants from your company workspace.
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default PostJob;
