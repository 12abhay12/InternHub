import { useMemo, useState } from "react";
import {
    ArrowRight,
    Bell,
    BookOpen,
    BriefcaseBusiness,
    Building2,
    ChevronDown,
    FileText,
    LifeBuoy,
    Search,
    UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";

const HELP_LINKS = [
    {
        title: "Browse jobs",
        description: "Search and filter current opportunities.",
        to: "/jobs",
        icon: BriefcaseBusiness,
    },
    {
        title: "Explore companies",
        description: "See employers with active openings.",
        to: "/companies",
        icon: Building2,
    },
    {
        title: "Profile and resume",
        description: "Review the information on your account.",
        to: "/profile",
        icon: UserRound,
    },
    {
        title: "Notifications",
        description: "Check your latest in-app updates.",
        to: "/notifications",
        icon: Bell,
    },
];

const FAQ_ITEMS = [
    {
        question: "How do I find jobs or internships?",
        answer: "Open Jobs from the navigation bar. Use the search field and available filters to narrow the list, then open an opportunity to read its details.",
        keywords: "search browse filter opportunity listing",
    },
    {
        question: "How can a student apply for an opportunity?",
        answer: "Sign in with a student account, review your profile and resume, open the opportunity details, and use the application action there. Submitted applications can be checked from My Applications.",
        keywords: "student resume apply application my applications status",
    },
    {
        question: "How does a company review applicants?",
        answer: "Sign in with the company account and open Manage Jobs & Applications from the profile menu. Select a listing to review its applicants and update supported application statuses.",
        keywords: "company employer applicants dashboard manage jobs status",
    },
    {
        question: "Why can’t I see a particular company?",
        answer: "The company directory is based on employers that have active, publicly visible openings. A company without an active visible listing may not appear in that directory.",
        keywords: "company directory missing active visible jobs opening",
    },
    {
        question: "Where can I read my notifications?",
        answer: "Use the bell icon in the navigation bar or open Notifications from your account menu. Unread updates are shown there.",
        keywords: "notifications bell unread navbar account",
    },
    {
        question: "Are the settings on the Settings page saved?",
        answer: "The Settings page is currently a starter layout. Profile and Notifications open existing pages; password, display, and language preferences are placeholders and are not saved.",
        keywords: "settings save password display language preferences",
    },
    {
        question: "What should I do if a page does not load?",
        answer: "Refresh the page and try again. If the problem continues, share the page name and any console error with the project team through the support channel provided by your college. This Help Center does not yet submit support tickets.",
        keywords: "blank error page load refresh support contact ticket",
    },
];

function HelpCenter() {
    const [search, setSearch] = useState("");

    const filteredFaqs = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return FAQ_ITEMS;

        return FAQ_ITEMS.filter((item) =>
            `${item.question} ${item.answer} ${item.keywords}`.toLowerCase().includes(query)
        );
    }, [search]);

    return (
        <main className="min-h-[60vh] bg-slate-50 pb-12">
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
                    <div className="mx-auto max-w-3xl text-center">
                        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800">
                            <LifeBuoy className="h-7 w-7" aria-hidden="true" />
                        </span>
                        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">InternHub support</p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Help Center</h1>
                        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                            Find quick answers about finding opportunities, applying, company accounts, and notifications.
                        </p>

                        <label htmlFor="help-search" className="sr-only">Search Help Center questions</label>
                        <div className="relative mx-auto mt-6 max-w-2xl">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                            <input
                                id="help-search"
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search help topics"
                                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
                            />
                        </div>
                    </div>
                </section>

                <section className="mt-8" aria-labelledby="quick-links-title">
                    <div className="mb-4 flex items-end justify-between gap-4">
                        <div>
                            <h2 id="quick-links-title" className="text-xl font-bold text-slate-900">Quick links</h2>
                            <p className="mt-1 text-sm text-slate-600">Go directly to a common InternHub area.</p>
                        </div>
                        <BookOpen className="hidden h-5 w-5 text-slate-500 sm:block" aria-hidden="true" />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {HELP_LINKS.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    className="group flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-400 hover:shadow-md"
                                >
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
                                        <Icon className="h-5 w-5" aria-hidden="true" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block font-semibold text-slate-900">{item.title}</span>
                                        <span className="mt-1 block text-xs leading-5 text-slate-600">{item.description}</span>
                                    </span>
                                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-800" aria-hidden="true" />
                                </Link>
                            );
                        })}
                    </div>
                </section>

                <section className="mt-9" aria-labelledby="faq-title">
                    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 id="faq-title" className="text-xl font-bold text-slate-900">Frequently asked questions</h2>
                            <p className="mt-1 text-sm text-slate-600">
                                {filteredFaqs.length} {filteredFaqs.length === 1 ? "answer" : "answers"} found
                            </p>
                        </div>
                    </div>

                    {filteredFaqs.length > 0 ? (
                        <div className="space-y-3">
                            {filteredFaqs.map((item) => (
                                <details key={item.question} className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 marker:hidden">
                                        <span>{item.question}</span>
                                        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition group-open:rotate-180" aria-hidden="true" />
                                    </summary>
                                    <p className="border-t border-slate-100 px-5 py-4 text-sm leading-6 text-slate-700">{item.answer}</p>
                                </details>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                            <p className="font-semibold text-slate-900">No matching help topics</p>
                            <p className="mt-1 text-sm text-slate-600">Try another word, such as “apply”, “company”, or “notifications”.</p>
                        </div>
                    )}
                </section>

                <section className="mt-8 rounded-2xl border border-slate-300 bg-white p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
                    <div className="flex items-start gap-3">
                        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" aria-hidden="true" />
                        <div>
                            <h2 className="font-semibold text-slate-900">Need more help?</h2>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                                This starter Help Center does not submit support tickets yet. If an issue continues, share the page name and error with your project team through the support channel provided by your college.
                            </p>
                        </div>
                    </div>
                    <Link
                        to="/settings"
                        className="mt-4 inline-flex w-fit shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 sm:mt-0"
                    >
                        Open Settings
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                </section>
            </div>
        </main>
    );
}

export default HelpCenter;
