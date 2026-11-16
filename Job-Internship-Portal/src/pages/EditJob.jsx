import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { account } from "../lib/account";
import { getMyProfile } from "../lib/profile";
import { getJobById, updateJob, deleteJob } from "../lib/jobs";

const COMPANY_JOBS_PATH = "/company-jobs";

const EditJob = () => {
    const { jobId } = useParams();
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
        status: "Active",
        workMode: "",
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        const loadJob = async () => {
            try {
                setLoading(true);
                setError("");

                const currentUser = await account.get();
                const currentProfile = await getMyProfile(currentUser.$id);

                if (currentProfile?.role !== "company") {
                    navigate("/jobs", { replace: true });
                    return;
                }

                const currentJob = await getJobById(jobId);

                if (currentJob.companyId !== currentUser.$id) {
                    setError("You are not authorized to edit this job.");
                    return;
                }

                setFormData({
                    title: currentJob.title || "",
                    description: currentJob.description || "",
                    jobType: currentJob.jobType || "",
                    location: currentJob.location || "",
                    workMode: currentJob.workMode || "",
                    salary: currentJob.salary || "",
                    skills: currentJob.skills || "",
                    education: currentJob.education || "",
                    experience: currentJob.experience || "",
                    deadline: currentJob.deadline
                        ? currentJob.deadline.slice(0, 10)
                        : "",
                    status: currentJob.status || "Active",
                });
            } catch (error) {
                console.error("Failed to load job:", error);
                setError("Unable to load this job.");
            } finally {
                setLoading(false);
            }
        };

        if (jobId) {
            loadJob();
        } else {
            setError("This job link is invalid.");
            setLoading(false);
        }
    }, [jobId, navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));

        if (message) {
            setMessage("");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const description = formData.description.trim();

        if (description.length < 30) {
            setMessage("Job description must be at least 30 characters.");
            return;
        }

        try {
            setSaving(true);
            setMessage("");

            const currentUser = await account.get();
            const currentJob = await getJobById(jobId);

            if (currentJob.companyId !== currentUser.$id) {
                setMessage("You are not authorized to edit this job.");
                return;
            }

            await updateJob(jobId, {
                companyName: currentJob.companyName || currentUser.name || "Company",
                title: formData.title.trim(),
                description,
                jobType: formData.jobType,
                location: formData.location.trim(),
                salary: formData.salary.trim(),
                skills: formData.skills.trim(),
                workMode: formData.workMode,
                education: formData.education.trim(),
                experience: formData.experience.trim(),
                deadline: formData.deadline
                    ? new Date(formData.deadline).toISOString()
                    : null,
                status: formData.status,
            });

            setMessage("Job updated successfully ✓");

            // Return the company to its own listings after saving.
            setTimeout(() => {
                navigate(COMPANY_JOBS_PATH, { replace: true });
            }, 1000);
        } catch (error) {
            console.error("Failed to update job:", error);
            setMessage("Failed to update job. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this job? This action cannot be undone."
        );

        if (!confirmed) return;

        try {
            setDeleting(true);
            setMessage("");

            const currentUser = await account.get();
            const currentJob = await getJobById(jobId);

            if (currentJob.companyId !== currentUser.$id) {
                setMessage("You are not authorized to delete this job.");
                return;
            }

            await deleteJob(jobId);
            navigate(COMPANY_JOBS_PATH, { replace: true });
        } catch (error) {
            console.error("Failed to delete job:", error);
            setMessage("Failed to delete job. Please try again.");
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-6xl animate-pulse">
                    <div className="h-5 w-28 rounded bg-slate-200" />

                    <div className="mt-5 h-32 rounded-3xl bg-slate-200" />

                    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
                        <div className="rounded-3xl bg-white p-7">
                            <div className="h-6 w-48 rounded bg-slate-200" />
                            <div className="mt-6 grid gap-5 sm:grid-cols-2">
                                <div className="h-12 rounded-xl bg-slate-200" />
                                <div className="h-12 rounded-xl bg-slate-200" />
                                <div className="h-12 rounded-xl bg-slate-200" />
                                <div className="h-12 rounded-xl bg-slate-200" />
                            </div>
                            <div className="mt-6 h-36 rounded-xl bg-slate-200" />
                        </div>

                        <div className="h-72 rounded-3xl bg-white" />
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
                <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-3xl">
                        🔒
                    </div>

                    <h1 className="mt-5 text-xl font-bold text-slate-900">
                        Unable to Edit Job
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        {error}
                    </p>

                    <button
                        type="button"
                        onClick={() => navigate(COMPANY_JOBS_PATH, { replace: true })}
                        className="mt-6 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                    >
                        ← Back to My Jobs
                    </button>
                </div>
            </div>
        );
    }

    const skillCount = formData.skills
        ? formData.skills.split(",").filter(Boolean).length
        : 0;

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
                {/* Back */}
                <button
                    type="button"
                    onClick={() => navigate(COMPANY_JOBS_PATH, { replace: true })}
                    disabled={saving || deleting}
                    className="mb-5 inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-white hover:text-blue-600 disabled:opacity-50"
                >
                    ← Back to My Jobs
                </button>

                {/* Modern Header */}
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="bg-linear-to-r from-blue-500 via-indigo-400 to-violet-500 px-6 py-7 sm:px-8">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl text-white ring-1 ring-white/20 backdrop-blur">
                                    ✏️
                                </div>

                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-blue-100">
                                        Company Workspace
                                    </p>

                                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                                        Edit Opportunity
                                    </h1>

                                    <p className="mt-1 text-sm text-blue-100">
                                        Update your job or internship details.
                                    </p>
                                </div>
                            </div>

                            <div
                                className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs font-bold ${formData.status === "Active"
                                    ? "bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-300/30"
                                    : "bg-white/20 text-white ring-1 ring-white/20"
                                    }`}
                            >
                                <span
                                    className={`h-2 w-2 rounded-full ${formData.status === "Active"
                                        ? "bg-emerald-300"
                                        : "bg-slate-300"
                                        }`}
                                />
                                {formData.status === "Active" ? "Active Job" : "Closed Job"}
                            </div>
                        </div>
                    </div>

                    <div className="grid border-t border-slate-100 sm:grid-cols-3">
                        <div className="border-b border-slate-100 px-5 py-4 sm:border-b-0 sm:border-r">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Job Type
                            </p>
                            <p className="mt-1 text-sm font-bold text-slate-800">
                                {formData.jobType || "Not specified"}
                            </p>
                        </div>

                        <div className="border-b border-slate-100 px-5 py-4 sm:border-b-0 sm:border-r">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Location
                            </p>
                            <p className="mt-1 truncate text-sm font-bold text-slate-800">
                                {formData.location || "Not specified"}
                            </p>
                        </div>

                        <div className="px-5 py-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Skills
                            </p>
                            <p className="mt-1 text-sm font-bold text-slate-800">
                                {skillCount} skill{skillCount === 1 ? "" : "s"}
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="mt-6">
                    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_310px]">
                        {/* Main Form */}
                        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                            <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
                                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                                    Opportunity Details
                                </p>

                                <h2 className="mt-1 text-xl font-bold text-slate-900">
                                    Job Information
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Keep the information accurate and easy for applicants to understand.
                                </p>
                            </div>

                            <div className="space-y-6 p-6 sm:p-8">
                                {/* Title */}
                                <div>
                                    <label className="mb-2 block text-sm font-bold text-slate-700">
                                        Job / Internship Title
                                    </label>

                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleChange}
                                        required
                                        placeholder="e.g. Frontend Developer Intern"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                                    />
                                </div>

                                {/* Job Type + Location */}
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-bold text-slate-700">
                                            Job Type
                                        </label>

                                        <select
                                            name="jobType"
                                            value={formData.jobType}
                                            onChange={handleChange}
                                            required
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
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
                                        <label className="mb-2 block text-sm font-bold text-slate-700">
                                            Location
                                        </label>

                                        <input
                                            type="text"
                                            name="location"
                                            value={formData.location}
                                            onChange={handleChange}
                                            required
                                            placeholder="e.g. Varanasi / Remote"
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                                        Work Mode
                                    </label>

                                    <select
                                        name="workMode"
                                        value={formData.workMode}
                                        onChange={handleChange}
                                        required
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                                    >
                                        <option value="">Select work mode</option>
                                        <option value="Remote">Remote</option>
                                        <option value="On-site">On-site</option>
                                        <option value="Hybrid">Hybrid</option>
                                    </select>
                                </div>

                                {/* Salary + Experience */}
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-bold text-slate-700">
                                            Salary / Stipend
                                        </label>

                                        <input
                                            type="text"
                                            name="salary"
                                            value={formData.salary}
                                            onChange={handleChange}
                                            placeholder="e.g. ₹10,000 - ₹15,000 / month"
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-bold text-slate-700">
                                            Experience
                                        </label>

                                        <input
                                            type="text"
                                            name="experience"
                                            value={formData.experience}
                                            onChange={handleChange}
                                            placeholder="e.g. Fresher / 0-1 years"
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                                        />
                                    </div>
                                </div>

                                {/* Skills + Education */}
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-bold text-slate-700">
                                            Required Skills
                                        </label>

                                        <input
                                            type="text"
                                            name="skills"
                                            value={formData.skills}
                                            onChange={handleChange}
                                            required
                                            placeholder="React, JavaScript, HTML, CSS"
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                                        />

                                        <p className="mt-1.5 text-xs text-slate-400">
                                            Separate skills using commas.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-bold text-slate-700">
                                            Required Education
                                        </label>

                                        <input
                                            type="text"
                                            name="education"
                                            value={formData.education}
                                            onChange={handleChange}
                                            placeholder="BCA / B.Tech / Any Graduate"
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <label className="text-sm font-bold text-slate-700">
                                            Job Description
                                        </label>

                                        <span
                                            className={`text-xs font-bold ${formData.description.length >= 2800
                                                ? "text-orange-600"
                                                : "text-slate-400"
                                                }`}
                                        >
                                            {formData.description.length} / 3000
                                        </span>
                                    </div>

                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        rows={9}
                                        maxLength={3000}
                                        required
                                        placeholder="Describe the role, responsibilities, requirements and other important information..."
                                        className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                                    />

                                    <p className="mt-1.5 text-xs text-slate-400">
                                        Maximum 3000 characters. Use short paragraphs or bullet-style lines for better readability.
                                    </p>
                                </div>

                                {/* Deadline */}
                                <div>
                                    <label className="mb-2 block text-sm font-bold text-slate-700">
                                        Application Deadline
                                    </label>

                                    <input
                                        type="date"
                                        name="deadline"
                                        value={formData.deadline}
                                        onChange={handleChange}
                                        className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50 sm:w-auto sm:min-w-57.5"
                                    />
                                </div>

                                {/* Message */}
                                {message && (
                                    <div
                                        className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm font-semibold ${message.includes("successfully")
                                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                            : "border-red-200 bg-red-50 text-red-700"
                                            }`}
                                    >
                                        <span className="text-lg">
                                            {message.includes("successfully") ? "✓" : "!"}
                                        </span>
                                        <span>{message}</span>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-end">
                                    <button
                                        type="button"
                                        onClick={() => navigate(COMPANY_JOBS_PATH, { replace: true })}
                                        disabled={saving || deleting}
                                        className="cursor-pointer rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={saving || deleting}
                                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-100 transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                                    >
                                        {saving ? (
                                            <>
                                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                                Saving Changes...
                                            </>
                                        ) : (
                                            <>
                                                <span>✓</span>
                                                Save Changes
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right Sidebar */}
                        <aside className="space-y-5 lg:sticky lg:top-6">
                            {/* Status Card */}
                            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                            Visibility
                                        </p>

                                        <h3 className="mt-1 text-lg font-bold text-slate-900">
                                            Job Status
                                        </h3>
                                    </div>

                                    <div
                                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${formData.status === "Active"
                                            ? "bg-emerald-50 text-emerald-600"
                                            : "bg-slate-100 text-slate-500"
                                            }`}
                                    >
                                        {formData.status === "Active" ? "✓" : "—"}
                                    </div>
                                </div>

                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="mt-5 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Closed">Closed</option>
                                </select>

                                <div
                                    className={`mt-4 rounded-2xl p-4 ${formData.status === "Active"
                                        ? "bg-emerald-50"
                                        : "bg-slate-50"
                                        }`}
                                >
                                    <p
                                        className={`text-sm font-bold ${formData.status === "Active"
                                            ? "text-emerald-700"
                                            : "text-slate-700"
                                            }`}
                                    >
                                        {formData.status === "Active"
                                            ? "This job is visible to students."
                                            : "This job is currently closed."}
                                    </p>

                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                        You can change the status anytime while editing.
                                    </p>
                                </div>
                            </div>

                            {/* Quick Info */}
                            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Quick Overview
                                </p>

                                <div className="mt-5 space-y-4">
                                    <div className="flex items-start gap-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                                            💼
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-xs text-slate-400">Job Type</p>
                                            <p className="mt-0.5 truncate text-sm font-bold text-slate-700">
                                                {formData.jobType || "Not specified"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50">
                                            📍
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-xs text-slate-400">Location</p>
                                            <p className="mt-0.5 truncate text-sm font-bold text-slate-700">
                                                {formData.location || "Not specified"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                                            💰
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-xs text-slate-400">Salary / Stipend</p>
                                            <p className="mt-0.5 truncate text-sm font-bold text-slate-700">
                                                {formData.salary || "Not specified"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                                            🎓
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-xs text-slate-400">Education</p>
                                            <p className="mt-0.5 truncate text-sm font-bold text-slate-700">
                                                {formData.education || "Not specified"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Danger Zone */}
                            <div className="rounded-3xl border border-red-100 bg-red-50/50 p-6">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                                        ⚠️
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-bold text-red-800">
                                            Delete Opportunity
                                        </h3>
                                        <p className="mt-1 text-xs leading-5 text-red-600/80">
                                            This action permanently removes this job from the platform.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={saving || deleting}
                                    className="mt-4 w-full cursor-pointer rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {deleting ? "Deleting..." : "Delete Job"}
                                </button>
                            </div>
                        </aside>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditJob;
