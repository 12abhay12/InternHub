import { useCallback, useEffect, useState } from "react";
import {
    Award,
    ArrowRight,
    BriefcaseBusiness,
    CalendarDays,
    Check,
    CheckCircle2,
    ExternalLink,
    FileText,
    GraduationCap,
    Languages,
    Link2,
    LoaderCircle,
    MapPin,
    Phone,
    Save,
    Sparkles,
    UserRound,
} from "lucide-react";

import { account } from "../lib/account";
import {
    getMyResume,
    createResume,
    updateResume,
} from "../lib/resume";
import { getMyProfile } from "../lib/profile";
import { getProfilePictureUrl } from "../lib/storage";
import { Card } from "../components/ui/card";

function splitList(value) {
    if (Array.isArray(value)) {
        return value.flatMap(splitList);
    }

    if (value === null || value === undefined) return [];

    if (typeof value === "object") {
        const displayValue = value.name ?? value.label ?? value.value;
        return displayValue === null || displayValue === undefined
            ? []
            : splitList(displayValue);
    }

    return String(value)
        .split(/[,;|•\r\n]+/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function formatDate(dateValue) {
    if (!dateValue) return "Not added";

    const [year, month, day] = String(dateValue)
        .split("T")[0]
        .split("-");
    const localDate = new Date(
        Number(year),
        Number(month) - 1,
        Number(day)
    );

    if (Number.isNaN(localDate.getTime())) return "Not added";

    return localDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

function ProfileInfoRow({ icon, label, value }) {
    return (
        <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-100">
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
                    {label}
                </p>
                <p className="mt-1 wrap-break-word text-sm font-semibold leading-5 text-slate-700">
                    {value || "Not added"}
                </p>
            </div>
        </div>
    );
}

function ResumeSection({ number, icon, title, description, tone, children }) {
    const themes = {
        blue: {
            icon: "bg-blue-50 text-blue-700",
            number: "bg-blue-600",
        },
        violet: {
            icon: "bg-violet-50 text-violet-700",
            number: "bg-violet-600",
        },
        orange: {
            icon: "bg-orange-50 text-orange-700",
            number: "bg-orange-500",
        },
        emerald: {
            icon: "bg-emerald-50 text-emerald-700",
            number: "bg-emerald-600",
        },
        amber: {
            icon: "bg-amber-50 text-amber-700",
            number: "bg-amber-500",
        },
    };

    const theme = themes[tone] || themes.blue;

    return (
        <Card className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
            <div className="flex items-center gap-3.5 border-b border-slate-100 px-5 py-5 sm:px-6">
                <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold text-white ${theme.number}`}
                >
                    {number}
                </span>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme.icon}`}>
                    {icon}
                </div>
                <div className="min-w-0">
                    <h2 className="font-bold text-slate-900">{title}</h2>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">
                        {description}
                    </p>
                </div>
            </div>
            <div className="p-5 sm:p-6">{children}</div>
        </Card>
    );
}

const Resume = () => {
    const [user, setUser] = useState(null);
    const [resume, setResume] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    const [summary, setSummary] = useState("");
    const [education, setEducation] = useState("");
    const [projects, setProjects] = useState("");
    const [certifications, setCertifications] = useState("");
    const [experience, setExperience] = useState("");
    const [achievements, setAchievements] = useState("");

    const loadResume = useCallback(async () => {
        try {
            setLoading(true);

            const currentUser = await account.get();
            setUser(currentUser);

            const currentProfile = await getMyProfile(currentUser.$id);
            setProfile(currentProfile);
            setEducation(currentProfile?.education || "");

            const currentResume = await getMyResume(currentUser.$id);

            if (currentResume) {
                setResume(currentResume);
                setSummary(currentResume.summary || "");
                setProjects(currentResume.projects || "");
                setCertifications(currentResume.certifications || "");
                setExperience(currentResume.experience || "");
                setAchievements(currentResume.achievements || "");
            }
        } catch (error) {
            console.error("Failed to load resume:", error);
            setMessage("Failed to load resume ✕");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadResume();
    }, [loadResume]);

    const handleSaveResume = async () => {
        if (!user) return;

        try {
            setSaving(true);
            setMessage("");

            const resumeData = {
                summary: summary.trim(),
                education: education.trim(),
                projects: projects.trim(),
                certifications: certifications.trim(),
                experience: experience.trim(),
                achievements: achievements.trim(),
            };

            let savedResume;

            if (resume?.$id) {
                savedResume = await updateResume(resume.$id, resumeData);
            } else {
                savedResume = await createResume(user.$id, resumeData);
            }

            setResume(savedResume);
            setMessage("Resume saved successfully");
        } catch (error) {
            console.error("Failed to save resume:", error);
            setMessage("Failed to save resume ✕");
        } finally {
            setSaving(false);
        }
    };

    const skills = splitList(profile?.skills);
    // Support the Appwrite Text value as well as older array-shaped data.
    const languages = splitList(profile?.languages);
    const profileImageUrl = profile?.profilePictureId
        ? getProfilePictureUrl(profile.profilePictureId)
        : "";

    const resumeSections = [summary, projects, certifications, experience, achievements];
    const completedSections = resumeSections.filter(
        (section) => section.trim() !== ""
    ).length;
    const completionPercent = Math.round(
        (completedSections / resumeSections.length) * 100
    );
    const isSuccessMessage = message.includes("successfully");

    if (loading) {
        return (
            <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f9fd] px-4">
                <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-blue-200/30 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-emerald-200/30 blur-3xl" />
                <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/50">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                        <FileText size={24} />
                    </div>
                    <LoaderCircle size={26} className="mx-auto mt-5 animate-spin text-blue-600" />
                    <p className="mt-3 text-sm font-semibold text-slate-700">
                        Loading your resume...
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                        Getting your profile and saved resume ready.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#f7f9fd] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-blue-200/20 blur-3xl" />
            <div className="pointer-events-none absolute -right-40 top-136 h-96 w-96 rounded-full bg-emerald-200/20 blur-3xl" />

            <main className="relative mx-auto max-w-7xl">
                {/* Page header */}
                <section className="relative isolate overflow-hidden rounded-[2rem] border border-blue-100 bg-linear-to-br from-blue-50 via-white to-emerald-50 p-6 shadow-lg shadow-blue-100/40 sm:p-8 lg:p-10">
                    <div className="pointer-events-none absolute -right-14 -top-24 h-64 w-64 rounded-full border-28 border-blue-100/50" />
                    <div className="pointer-events-none absolute -bottom-24 right-1/3 h-56 w-56 rounded-full bg-emerald-100/60 blur-3xl" />

                    <div className="relative flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/90 px-3.5 py-2 text-xs font-bold text-blue-700 shadow-sm">
                                <Sparkles size={14} />
                                RESUME BUILDER
                            </div>

                            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                                Your experience, clearly presented.
                            </h1>

                            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                                Build a stronger resume with your profile details,
                                projects and achievements—all in one place.
                            </p>
                        </div>

                        <div className="flex w-full items-center gap-4 rounded-2xl border border-white/90 bg-white/75 p-4 shadow-sm backdrop-blur sm:w-auto sm:min-w-64">
                            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100">
                                <svg className="h-14 w-14 -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
                                    <circle cx="24" cy="24" r="20" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                                    <circle
                                        cx="24"
                                        cy="24"
                                        r="20"
                                        fill="none"
                                        stroke="#2563eb"
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                        strokeDasharray={`${(completionPercent / 100) * 125.66} 125.66`}
                                    />
                                </svg>
                                <span className="absolute text-xs font-extrabold text-slate-800">
                                    {completionPercent}%
                                </span>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-900">
                                    Resume progress
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    {completedSections} of {resumeSections.length} sections filled
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Main content */}
                <div className="mt-6 grid items-start gap-6 xl:grid-cols-[350px_minmax(0,1fr)]">
                    {/* Profile sidebar */}
                    <aside className="space-y-5 xl:sticky xl:top-6">
                        <Card className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/40">
                            <div className="bg-linear-to-r from-blue-50 via-indigo-50 to-emerald-50 px-5 py-5 sm:px-6">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-blue-100">
                                        <UserRound size={19} />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-900">
                                            Profile snapshot
                                        </h2>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            Details connected to your account
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 sm:p-6">
                                <div className="flex flex-col items-center text-center">
                                    {profileImageUrl ? (
                                        <img
                                            src={profileImageUrl}
                                            alt={user?.name || "Profile"}
                                            className="h-24 w-24 rounded-3xl object-cover shadow-md ring-4 ring-blue-50"
                                        />
                                    ) : (
                                        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-linear-to-br from-blue-100 to-emerald-100 text-3xl font-extrabold text-blue-700 ring-4 ring-blue-50">
                                            {user?.name?.charAt(0)?.toUpperCase() || "U"}
                                        </div>
                                    )}

                                    <h3 className="mt-4 text-xl font-extrabold text-slate-900">
                                        {user?.name || "Your Name"}
                                    </h3>
                                    <p className="mt-1 break-all text-sm text-slate-500">
                                        {user?.email || "Email not available"}
                                    </p>
                                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                                        <CheckCircle2 size={13} />
                                        Profile connected
                                    </span>
                                </div>

                                <div className="mt-6 space-y-2.5">
                                    <ProfileInfoRow
                                        icon={<Phone size={16} />}
                                        label="Phone"
                                        value={profile?.phone}
                                    />
                                    <ProfileInfoRow
                                        icon={<MapPin size={16} />}
                                        label="City"
                                        value={profile?.city}
                                    />
                                    <ProfileInfoRow
                                        icon={<CalendarDays size={16} />}
                                        label="Date of birth"
                                        value={formatDate(profile?.dateOfBirth)}
                                    />
                                    <ProfileInfoRow
                                        icon={<GraduationCap size={17} />}
                                        label="Education"
                                        value={profile?.education}
                                    />
                                </div>
                            </div>
                        </Card>

                        <Card className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                    <Sparkles size={17} />
                                </div>
                                <h3 className="font-bold text-slate-900">Skills</h3>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {skills.length > 0 ? (
                                    skills.map((skill, index) => (
                                        <span
                                            key={`${skill}-${index}`}
                                            className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                                        >
                                            {skill}
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-400">No skills added yet.</p>
                                )}
                            </div>
                        </Card>

                        <Card className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                    <Languages size={17} />
                                </div>
                                <h3 className="font-bold text-slate-900">Languages</h3>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {languages.length > 0 ? (
                                    languages.map((language, index) => (
                                        <span
                                            key={`${language}-${index}`}
                                            className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700"
                                        >
                                            {language}
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-400">No languages added yet.</p>
                                )}
                            </div>
                        </Card>

                        <Card className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                                    <Link2 size={17} />
                                </div>
                                <h3 className="font-bold text-slate-900">Professional links</h3>
                            </div>

                            <div className="mt-4 space-y-2">
                                {profile?.linkedin && (
                                    <a
                                        href={profile.linkedin}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                                    >
                                        LinkedIn <ExternalLink size={15} />
                                    </a>
                                )}
                                {profile?.github && (
                                    <a
                                        href={profile.github}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                                    >
                                        GitHub <ExternalLink size={15} />
                                    </a>
                                )}
                                {profile?.portfolio && (
                                    <a
                                        href={profile.portfolio}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between rounded-xl border border-violet-100 bg-violet-50/70 px-4 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
                                    >
                                        Portfolio <ExternalLink size={15} />
                                    </a>
                                )}
                                {!profile?.linkedin && !profile?.github && !profile?.portfolio && (
                                    <p className="text-sm text-slate-400">
                                        No professional links added.
                                    </p>
                                )}
                            </div>
                        </Card>
                    </aside>

                    {/* Resume editor */}
                    <div className="min-w-0 space-y-5">
                        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-3.5">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.13em] text-blue-600">
                                            Resume content
                                        </p>
                                        <h2 className="mt-0.5 text-lg font-bold text-slate-900">
                                            Add your experience
                                        </h2>
                                    </div>
                                </div>

                                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                    {resume?.$id ? "Saved resume" : "New resume"}
                                </span>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-slate-500">
                                Your education is linked to your profile. Add a summary,
                                projects and other highlights to complete your resume.
                            </p>
                        </div>

                        <ResumeSection
                            number="01"
                            icon={<Sparkles size={19} />}
                            title="Professional Summary"
                            description="A short introduction to your strengths and goals."
                            tone="amber"
                        >
                            <textarea
                                value={summary}
                                onChange={(event) => setSummary(event.target.value)}
                                placeholder="Example: BCA student passionate about web development and building modern web applications..."
                                rows={5}
                                className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                            />
                        </ResumeSection>

                        <ResumeSection
                            number="02"
                            icon={<BriefcaseBusiness size={19} />}
                            title="Projects"
                            description="Showcase projects that demonstrate your skills."
                            tone="violet"
                        >
                            <textarea
                                value={projects}
                                onChange={(event) => setProjects(event.target.value)}
                                placeholder="Example: Job & Internship Portal — React, Tailwind CSS, Appwrite..."
                                rows={6}
                                className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-50"
                            />
                        </ResumeSection>

                        <ResumeSection
                            number="03"
                            icon={<GraduationCap size={20} />}
                            title="Education"
                            description="This information is managed from your Profile page."
                            tone="emerald"
                        >
                            <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                                    <GraduationCap size={19} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-emerald-900">
                                        {education || "No education information added."}
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-emerald-700">
                                        Update your profile to change your education details.
                                    </p>
                                </div>
                            </div>
                        </ResumeSection>

                        <div className="grid gap-5 lg:grid-cols-2">
                            <ResumeSection
                                number="04"
                                icon={<Award size={19} />}
                                title="Certifications"
                                description="Courses, certificates and credentials."
                                tone="orange"
                            >
                                <textarea
                                    value={certifications}
                                    onChange={(event) => setCertifications(event.target.value)}
                                    placeholder="Example: Web Development Certificate — 2026"
                                    rows={6}
                                    className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-50"
                                />
                            </ResumeSection>

                            <ResumeSection
                                number="05"
                                icon={<BriefcaseBusiness size={19} />}
                                title="Experience / Internship"
                                description="Include relevant practical experience."
                                tone="blue"
                            >
                                <textarea
                                    value={experience}
                                    onChange={(event) => setExperience(event.target.value)}
                                    placeholder="Example: Frontend Developer Intern — Company Name — 2026"
                                    rows={6}
                                    className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                                />
                            </ResumeSection>
                        </div>

                        <ResumeSection
                            number="06"
                            icon={<Award size={19} />}
                            title="Achievements"
                            description="Awards, competitions and accomplishments."
                            tone="amber"
                        >
                            <textarea
                                value={achievements}
                                onChange={(event) => setAchievements(event.target.value)}
                                placeholder="Example: Participated in a college hackathon and built a finalist project..."
                                rows={5}
                                className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-50"
                            />
                        </ResumeSection>

                        {/* Sticky save bar */}
                        <div className="sticky bottom-4 z-20 pt-1">
                            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl shadow-slate-300/30 backdrop-blur-md">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-h-10 flex-1">
                                        {message ? (
                                            <div
                                                role="status"
                                                aria-live="polite"
                                                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold ${isSuccessMessage
                                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                    : "border-rose-200 bg-rose-50 text-rose-700"
                                                    }`}
                                            >
                                                {isSuccessMessage ? <Check size={15} /> : <FileText size={15} />}
                                                {message}
                                            </div>
                                        ) : (
                                            <p className="text-xs leading-5 text-slate-400">
                                                Save your changes to keep your resume up to date.
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleSaveResume}
                                        disabled={saving}
                                        className="cursor-pointer inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-200/60 transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto"
                                    >
                                        {saving ? (
                                            <>
                                                <LoaderCircle size={16} className="animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save size={16} />
                                                Save Resume
                                                <ArrowRight size={15} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Resume;
