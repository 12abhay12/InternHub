import {
    Bell,
    ChevronRight,
    CircleHelp,
    LockKeyhole,
    SlidersHorizontal,
    UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";

const SETTINGS_SECTIONS = [
    {
        title: "Profile information",
        description: "Review and update the profile details connected to your InternHub account.",
        action: "Open profile",
        to: "/profile",
        icon: UserRound,
        available: true,
    },
    {
        title: "Notifications",
        description: "View your in-app updates and check the latest activity on your account.",
        action: "View notifications",
        to: "/notifications",
        icon: Bell,
        available: true,
    },
    {
        title: "Security and password",
        description: "Password and sign-in preferences can be added here in a future update.",
        icon: LockKeyhole,
        available: false,
    },
    {
        title: "Display preferences",
        description: "Theme, language, and accessibility preferences are not connected yet.",
        icon: SlidersHorizontal,
        available: false,
    },
];

function SettingsCard({ section }) {
    const Icon = section.icon;

    return (
        <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:p-6">
            <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-slate-900">{section.title}</h2>
                    <p className="mt-1.5 text-sm leading-6 text-slate-600">{section.description}</p>
                </div>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4">
                {section.available ? (
                    <Link
                        to={section.to}
                        className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 transition hover:decoration-slate-900"
                    >
                        {section.action}
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                ) : (
                    <span className="inline-flex items-center rounded-full border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        Coming soon
                    </span>
                )}
            </div>
        </article>
    );
}

function SettingsPage() {
    return (
        <main className="min-h-[60vh] bg-slate-50 pb-12">
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
                <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex items-start gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800">
                            <SlidersHorizontal className="h-6 w-6" aria-hidden="true" />
                        </span>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Account</p>
                            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                                Manage your InternHub account options and find the settings available to you.
                            </p>
                        </div>
                    </div>
                </header>

                <div className="mt-6 rounded-2xl border border-slate-300 bg-white p-4 sm:p-5" role="status">
                    <div className="flex items-start gap-3">
                        <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" aria-hidden="true" />
                        <p className="text-sm leading-6 text-slate-700">
                            <span className="font-semibold text-slate-900">Settings preview:</span> this page is a starter layout. Only the profile and notification links are connected; the other preferences are not saved yet.
                        </p>
                    </div>
                </div>

                <section className="mt-7" aria-labelledby="settings-options-title">
                    <div className="mb-4">
                        <h2 id="settings-options-title" className="text-xl font-bold text-slate-900">Account options</h2>
                        <p className="mt-1 text-sm text-slate-600">Choose an available section or see what will be added later.</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        {SETTINGS_SECTIONS.map((section) => (
                            <SettingsCard key={section.title} section={section} />
                        ))}
                    </div>
                </section>

                <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="font-semibold text-slate-900">Need help with your account?</h2>
                        <p className="mt-1 text-sm text-slate-600">Visit the Help Center for quick answers about InternHub.</p>
                    </div>
                    <Link
                        to="/help"
                        className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                        Open Help Center
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                </div>
            </div>
        </main>
    );
}

export default SettingsPage;
