import { Link } from "react-router-dom";
import { ArrowUpRight, BriefcaseBusiness } from "lucide-react";

function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="mt-auto border-t border-slate-200 bg-slate-100">
            <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8">
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
                    <div className="max-w-sm">
                        <Link to="/" className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                                <BriefcaseBusiness className="h-5 w-5" />
                            </span>
                            Intern<span className="-ml-2 text-blue-700">Hub</span>
                        </Link>
                        <p className="mt-3 text-sm leading-6 text-slate-500">
                            A shared space for students to find opportunities and for companies to meet future talent.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-sm font-semibold text-slate-800">Explore</h2>
                        <div className="mt-3 flex flex-col items-start gap-2.5">
                            <Link to="/jobs" className="text-sm text-slate-500 transition hover:text-blue-700">
                                Jobs &amp; internships
                            </Link>
                            <Link to="/signup" className="text-sm text-slate-500 transition hover:text-blue-700">
                                Create an account
                            </Link>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-sm font-semibold text-slate-800">For employers</h2>
                        <div className="mt-3 flex flex-col items-start gap-2.5">
                            <Link to="/post-job" className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-blue-700">
                                Post a job
                                <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                            <Link to="/company-dashboard" className="text-sm text-slate-500 transition hover:text-blue-700">
                                Company workspace
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex flex-col gap-2 border-t border-slate-100 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                    <p>© {currentYear} InternHub. All rights reserved.</p>
                    <p>Find your next step, or help someone find theirs.</p>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
