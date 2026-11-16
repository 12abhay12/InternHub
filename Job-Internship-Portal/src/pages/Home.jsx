import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Clock3,
  GraduationCap,
  MapPin,
  RefreshCw,
  Search,
  Users,
  XCircle,
} from "lucide-react";

import StudentDashboard from "./StudentDashboard";
import CompanyDashboard from "./CompanyDashboard";
import AdminDashboard from "./AdminDashboard";
import { account } from "../lib/account";
import { getMyProfile } from "../lib/profile";
import { getAllJobs } from "../lib/jobs";
import { AUTH_STATE_CHANGED_EVENT } from "../lib/authEvents";

const HOME_ROLES = ["student", "company", "admin"];

function normalizeRole(role) {
  return String(role ?? "").trim().toLowerCase();
}

function Home() {
  const location = useLocation();
  const [authRevision, setAuthRevision] = useState(0);
  const [view, setView] = useState({ kind: "checking" });

  useEffect(() => {
    const handleAuthChange = () => {
      setAuthRevision((revision) => revision + 1);
    };

    window.addEventListener(AUTH_STATE_CHANGED_EVENT, handleAuthChange);
    return () => window.removeEventListener(AUTH_STATE_CHANGED_EVENT, handleAuthChange);
  }, []);

  useEffect(() => {
    let active = true;
    setView({ kind: "checking" });

    const loadHomeView = async () => {
      let currentUser;

      try {
        currentUser = await account.get();
      } catch {
        if (active) setView({ kind: "guest" });
        return;
      }

      try {
        const profile = await getMyProfile(currentUser.$id);
        if (!active) return;

        const role = normalizeRole(profile?.role);
        setView(HOME_ROLES.includes(role)
          ? { kind: "workspace", role }
          : { kind: "missing-role" });
      } catch (profileError) {
        console.error("Failed to load the home profile:", profileError);
        if (active) setView({ kind: "profile-error" });
      }
    };

    loadHomeView();
    return () => {
      active = false;
    };
  }, [authRevision, location.key]);

  if (view.kind === "checking") return <HomeLoading />;
  if (view.kind === "guest") return <PublicHome />;

  if (view.kind === "profile-error") {
    return (
      <HomeNotice
        title="We couldn’t load your workspace"
        message="Your sign-in is active, but your profile could not be read. Try again or sign in once more."
        actionLabel="Try again"
        onAction={() => setAuthRevision((revision) => revision + 1)}
      />
    );
  }

  if (view.kind === "missing-role") {
    return (
      <HomeNotice
        title="Complete your profile to continue"
        message="Your account is signed in, but a student, company, or admin role was not found on your profile."
        actionLabel="Open profile"
        to="/profile"
      />
    );
  }

  if (view.role === "student") return <StudentDashboard />;
  if (view.role === "company") return <CompanyDashboard />;
  if (view.role === "admin") return <AdminDashboard />;

  return <PublicHome />;
}

function PublicHome() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let active = true;

    const loadJobs = async () => {
      setLoading(true);
      setError("");

      try {
        const result = await getAllJobs();
        if (active) setJobs(Array.isArray(result) ? result : []);
      } catch (loadError) {
        console.error("Failed to load public home jobs:", loadError);
        if (active) setError("We couldn’t load the latest openings right now.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadJobs();
    return () => {
      active = false;
    };
  }, [reloadVersion]);

  const internships = useMemo(
    () => jobs.filter((job) => isInternship(job.jobType)),
    [jobs]
  );

  const featuredJobs = useMemo(() => {
    const nonInternships = jobs.filter((job) => !isInternship(job.jobType));
    return (nonInternships.length > 0 ? nonInternships : jobs).slice(0, 4);
  }, [jobs]);

  const companies = useMemo(() => getCompaniesFromJobs(jobs), [jobs]);
  const popularSkills = useMemo(() => getPopularSkills(jobs), [jobs]);
  const featuredCompanies = companies.slice(0, 6);

  const handleSearch = (event) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/jobs?search=${encodeURIComponent(query)}` : "/jobs");
  };

  const retry = () => setReloadVersion((version) => version + 1);

  return (
    <main className="bg-slate-50 pb-14">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        {/* Hero / campaign banner */}
        <section className="relative isolate overflow-hidden rounded-[2rem] border border-blue-100 bg-linear-to-br from-blue-50 via-white to-indigo-50 shadow-sm">
          <div aria-hidden="true" className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl" />
          <div aria-hidden="true" className="absolute bottom-0 left-1/3 h-40 w-64 rounded-full bg-violet-100/60 blur-3xl" />

          <div className="relative grid lg:grid-cols-[minmax(0,1.12fr)_minmax(330px,0.88fr)]">
            <div className="p-6 sm:p-9 lg:p-12">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1.5 text-xs font-semibold text-blue-800 shadow-sm">
                <BriefcaseBusiness className="h-3.5 w-3.5" />
                Your next opportunity starts here
              </span>

              <h1 className="mt-5 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl lg:text-[3.25rem]">
                Find work that moves your future forward.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                Explore active jobs and internships posted on InternHub, discover the employers behind them, and take your next career step.
              </p>

              <form onSubmit={handleSearch} className="mt-7 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:flex-row">
                <label htmlFor="public-home-search" className="sr-only">
                  Search jobs, internships, companies, or skills
                </label>
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="public-home-search"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Job title, skill, company, or location"
                    className="h-11 w-full rounded-xl border border-transparent bg-transparent pl-10 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-200 focus:bg-white focus:ring-2 focus:ring-blue-50"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  <Search className="h-4 w-4" />
                  Search jobs
                </button>
              </form>

              <p className="mt-2 text-xs text-slate-500">
                Guest preview is available here. Sign in to browse full listings and apply.
              </p>

              {popularSkills.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Skills appearing in active listings
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {popularSkills.map((skill) => (
                      <Link
                        key={skill.key}
                        to={`/jobs?search=${encodeURIComponent(skill.name)}`}
                        className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-800"
                      >
                        {skill.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <Link to="/jobs" className="inline-flex items-center gap-1.5 font-semibold text-blue-800 hover:text-blue-900">
                  Browse all opportunities <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/signup" className="font-medium text-slate-600 hover:text-slate-900">
                  Create an account
                </Link>
              </div>
            </div>

            {/* Poster-style live opportunities banner */}
            <div className="relative flex items-center border-t border-blue-100/80 p-5 sm:p-8 lg:border-l lg:border-t-0 lg:p-9">
              <div aria-hidden="true" className="absolute right-8 top-8 h-36 w-36 rounded-full border-22 border-white/60" />
              <div className="relative w-full overflow-hidden rounded-[1.6rem] bg-slate-950 p-5 text-white shadow-xl sm:p-7">
                <div aria-hidden="true" className="absolute -right-16 -top-12 h-48 w-48 rounded-full bg-blue-600/30 blur-2xl" />
                <div aria-hidden="true" className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-violet-600/20 blur-2xl" />

                <div className="relative">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-100">
                      InternHub · Live board
                    </span>
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/15" aria-label="Live listings" />
                  </div>

                  <h2 className="mt-5 max-w-sm text-2xl font-bold leading-tight sm:text-3xl">
                    Make your next move count.
                  </h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300">
                    A fresh look at the real opportunities employers have posted on InternHub.
                  </p>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Recent active openings
                      </p>
                      <span className="text-xs text-slate-400">
                        {loading ? "Loading" : `${jobs.length} active`}
                      </span>
                    </div>

                    {loading ? (
                      <div className="mt-3 space-y-2" aria-label="Loading recent openings">
                        <div className="h-14 animate-pulse rounded-xl bg-white/10" />
                        <div className="h-14 animate-pulse rounded-xl bg-white/10" />
                      </div>
                    ) : jobs.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {jobs.slice(0, 2).map((job) => (
                          <PosterJobLink key={job.$id} job={job} />
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 rounded-xl bg-white/10 p-3 text-sm text-slate-300">
                        {error ? "Openings will show here when the listings service is available." : "No active openings have been posted yet."}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Live data snapshot */}
        <section className="mt-5 grid gap-3 sm:grid-cols-3" aria-label="Active listings snapshot">
          <StatCard
            icon={<BriefcaseBusiness className="h-5 w-5" />}
            label="Active opportunities"
            value={loading ? "—" : jobs.length}
          />
          <StatCard
            icon={<GraduationCap className="h-5 w-5" />}
            label="Active internships"
            value={loading ? "—" : internships.length}
          />
          <StatCard
            icon={<Building2 className="h-5 w-5" />}
            label="Companies with openings"
            value={loading ? "—" : companies.length}
          />
        </section>

        {/* Latest jobs */}
        <section className="mt-10" aria-labelledby="latest-jobs-heading">
          <SectionHeading
            eyebrow="Real active listings"
            title="Latest opportunities"
            description="A preview of current openings. Sign in to explore the full listing and apply."
            linkTo="/jobs"
            linkLabel="View all jobs"
            id="latest-jobs-heading"
          />
          {error ? (
            <HomeDataNotice message={error} onRetry={retry} />
          ) : loading ? (
            <JobCardSkeletons />
          ) : featuredJobs.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {featuredJobs.map((job) => <JobCard key={job.$id} job={job} />)}
            </div>
          ) : (
            <EmptyListings title="No active jobs to feature yet" />
          )}
        </section>

        {/* Student poster / banner */}
        <section className="relative mt-10 isolate overflow-hidden rounded-[1.8rem] bg-linear-to-r from-blue-800 via-indigo-800 to-violet-800 text-white shadow-sm">
          <div aria-hidden="true" className="absolute -right-12 -top-24 h-72 w-72 rounded-full border-36 border-white/10" />
          <div aria-hidden="true" className="absolute bottom-0 right-1/3 h-36 w-36 rounded-full bg-fuchsia-400/20 blur-3xl" />
          <div className="relative grid gap-7 p-6 sm:p-8 lg:grid-cols-[1fr_0.72fr] lg:items-center lg:p-10">
            <div>
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-100">
                Student career spotlight
              </span>
              <h2 className="mt-4 max-w-2xl text-2xl font-bold leading-tight sm:text-3xl">
                Turn your next step into a real opportunity.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100/90">
                Create your InternHub account to explore full job details, prepare your profile, and apply to opportunities that fit your goals.
              </p>
              <Link to="/signup" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-800 transition hover:bg-blue-50">
                Join as a student <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-100">Your path on InternHub</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <PosterStep number="01" title="Build your profile" />
                <PosterStep number="02" title="Explore openings" />
                <PosterStep number="03" title="Apply with confidence" />
              </div>
            </div>
          </div>
        </section>

        {/* Internship listings */}
        <section className="mt-10" aria-labelledby="internships-heading">
          <SectionHeading
            eyebrow="Learn while you work"
            title="Internships"
            description="Internship opportunities from active InternHub postings."
            linkTo="/jobs?jobType=Internship"
            linkLabel="Explore internships"
            id="internships-heading"
          />
          {error ? (
            <HomeDataNotice message="Internship listings could not be loaded right now." onRetry={retry} />
          ) : loading ? (
            <JobCardSkeletons count={2} />
          ) : internships.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {internships.slice(0, 4).map((job) => <JobCard key={job.$id} job={job} />)}
            </div>
          ) : (
            <EmptyListings title="No active internships to feature right now" />
          )}
        </section>

        {/* Companies from active postings */}
        <section className="mt-10" aria-labelledby="companies-heading">
          <SectionHeading
            eyebrow="Employers with active listings"
            title="Companies hiring now"
            description="Company names and opening counts come directly from active job postings."
            linkTo="/companies"
            linkLabel="Explore companies"
            id="companies-heading"
          />
          {error ? (
            <HomeDataNotice message="Company listings could not be loaded right now." onRetry={retry} />
          ) : loading ? (
            <CompanyCardSkeletons />
          ) : featuredCompanies.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredCompanies.map((company) => <CompanyCard key={company.key} company={company} />)}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center">
              <Building2 className="mx-auto h-6 w-6 text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-700">No companies have active openings yet.</p>
            </div>
          )}
        </section>

        {/* Popular skills sourced from real job documents */}
        {popularSkills.length > 0 && (
          <section className="mt-10" aria-labelledby="skills-heading">
            <SectionHeading
              eyebrow="Based on active listings"
              title="Explore by skill"
              description="These skills are taken from the skills employers included in current postings."
              linkTo="/jobs"
              linkLabel="Browse all skills"
              id="skills-heading"
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {popularSkills.slice(0, 6).map((skill) => (
                <Link
                  key={skill.key}
                  to={`/jobs?search=${encodeURIComponent(skill.name)}`}
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  <span>
                    <span className="block font-semibold text-slate-800 group-hover:text-blue-800">{skill.name}</span>
                    <span className="mt-1 block text-xs text-slate-500">Appears in {skill.count} active {skill.count === 1 ? "listing" : "listings"}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-700" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* How it works */}
        <section className="mt-10 rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="how-it-works-heading">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">A clearer way to get started</p>
            <h2 id="how-it-works-heading" className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Your next step, made simple</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Sign in to move from previewing opportunities to exploring details and applying.</p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <HowItWorksCard number="01" title="Create your account" text="Choose a student or company account and set up your InternHub profile." icon={<Users className="h-5 w-5" />} />
            <HowItWorksCard number="02" title="Explore real openings" text="Browse active jobs and internships posted by companies on the platform." icon={<Search className="h-5 w-5" />} />
            <HowItWorksCard number="03" title="Take the next step" text="Students can review opportunities and apply after signing in." icon={<ArrowRight className="h-5 w-5" />} />
          </div>
        </section>

        {/* Employer banner */}
        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <CalloutCard
            icon={<GraduationCap className="h-5 w-5" />}
            eyebrow="For students"
            title="Ready to find your next opportunity?"
            text="Sign in or create a student account to explore full listings and apply."
            linkTo="/signup"
            linkLabel="Get started"
            tone="blue"
          />
          <CalloutCard
            icon={<Building2 className="h-5 w-5" />}
            eyebrow="For employers"
            title="Looking for your next great hire?"
            text="Create a company account to post jobs and manage applicants on InternHub."
            linkTo="/signup"
            linkLabel="Create a company account"
            tone="slate"
          />
        </section>
      </div>
    </main>
  );
}

function SectionHeading({ eyebrow, title, description, linkTo, linkLabel, id }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{eyebrow}</p>
        <h2 id={id} className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <Link to={linkTo} className="inline-flex w-fit shrink-0 items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800">
        {linkLabel}<ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">{icon}</span>
      <span>
        <span className="block text-xl font-bold leading-tight text-slate-900">{value}</span>
        <span className="mt-0.5 block text-xs font-medium text-slate-500">{label}</span>
      </span>
    </div>
  );
}

function PosterJobLink({ job }) {
  return (
    <Link to={`/job-details/${job.$id}`} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.07] p-3 transition hover:bg-white/12">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-blue-100">
        <BriefcaseBusiness className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-white">{getDisplayText(job.title) || "Opportunity"}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-300">{getDisplayText(job.companyName) || "Company"}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
    </Link>
  );
}

function JobCard({ job }) {
  const title = getDisplayText(job.title) || "Untitled opportunity";
  const companyName = getDisplayText(job.companyName) || "Company";
  const jobType = getDisplayText(job.jobType) || "Job";
  const location = getDisplayText(job.location);
  const workMode = getDisplayText(job.workMode);
  const salary = getDisplayText(job.salary);

  return (
    <Link to={`/job-details/${job.$id}`} className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <BriefcaseBusiness className="h-5 w-5" />
        </span>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800">{jobType}</span>
      </div>
      <h3 className="mt-4 line-clamp-2 font-semibold leading-5 text-slate-900 group-hover:text-blue-800">{title}</h3>
      <p className="mt-1 truncate text-sm text-slate-500">{companyName}</p>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
        {location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{location}</span>}
        {workMode && <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{workMode}</span>}
      </div>
      {salary && <p className="mt-3 text-sm font-semibold text-slate-700">{salary}</p>}

      <span className="mt-auto inline-flex items-center justify-between gap-2 border-t border-slate-100 pt-4 text-sm font-semibold text-blue-700">
        <span>Sign in to view details</span><ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function CompanyCard({ company }) {
  return (
    <Link to={`/jobs?search=${encodeURIComponent(company.name)}`} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-blue-50 to-indigo-100 text-sm font-bold uppercase text-blue-800">
          {getInitials(company.name)}
        </span>
        <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-700" />
      </div>
      <h3 className="mt-4 truncate font-semibold text-slate-900">{company.name}</h3>
      <p className="mt-1 text-sm text-slate-500">{company.openings} {company.openings === 1 ? "active opening" : "active openings"}</p>
      {company.locations.length > 0 && (
        <p className="mt-3 flex items-center gap-1.5 truncate text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" />{company.locations.slice(0, 2).join(" · ")}
        </p>
      )}
      <p className="mt-4 border-t border-slate-100 pt-3 text-xs font-semibold text-blue-700">Sign in to explore openings</p>
    </Link>
  );
}

function PosterStep({ number, title }) {
  return (
    <div className="rounded-xl border border-white/15 bg-slate-950/20 p-3">
      <span className="text-[10px] font-bold tracking-widest text-blue-200">{number}</span>
      <p className="mt-1 text-xs font-semibold text-white">{title}</p>
    </div>
  );
}

function HowItWorksCard({ number, title, text, icon }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-widest text-blue-700">{number}</span>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">{icon}</span>
      </div>
      <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-6 text-slate-500">{text}</p>
    </article>
  );
}

function CalloutCard({ icon, eyebrow, title, text, linkTo, linkLabel, tone }) {
  const style = tone === "blue"
    ? "border-blue-100 bg-blue-50/70 text-blue-800"
    : "border-slate-200 bg-white text-slate-700";

  return (
    <article className={`rounded-2xl border p-6 sm:p-7 ${style}`}>
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm">{icon}</span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-70">{eyebrow}</p>
          <h2 className="mt-1 font-bold text-slate-900">{title}</h2>
          <p className="mt-1.5 text-sm leading-6 text-slate-600">{text}</p>
          <Link to={linkTo} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-800 hover:text-blue-900">
            {linkLabel}<ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function JobCardSkeletons({ count = 4 }) {
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading active listings">
      {Array.from({ length: count }, (_, index) => <div key={index} className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white" />)}
    </div>
  );
}

function CompanyCardSkeletons() {
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading companies">
      {[1, 2, 3].map((item) => <div key={item} className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white" />)}
    </div>
  );
}

function EmptyListings({ title }) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-9 text-center">
      <BriefcaseBusiness className="mx-auto h-6 w-6 text-slate-400" />
      <p className="mt-2 font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">Check back soon for new active listings.</p>
    </div>
  );
}

function HomeDataNotice({ message, onRetry }) {
  return (
    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
        <p className="text-sm text-slate-600">{message}</p>
      </div>
      <button type="button" onClick={onRetry} className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
        <RefreshCw className="h-4 w-4" />Retry
      </button>
    </div>
  );
}

function HomeLoading() {
  return (
    <main className="flex min-h-[55vh] items-center justify-center px-4 py-12">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
        <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />Loading your InternHub home...
      </div>
    </main>
  );
}

function HomeNotice({ title, message, actionLabel, onAction, to }) {
  return (
    <main className="flex min-h-[55vh] items-center justify-center px-4 py-12">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Users className="h-5 w-5" /></span>
        <h1 className="mt-4 text-xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>
        {to ? (
          <Link to={to} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-100">{actionLabel}<ArrowRight className="h-4 w-4" /></Link>
        ) : (
          <button type="button" onClick={onAction} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-100">{actionLabel}<RefreshCw className="h-4 w-4" /></button>
        )}
      </section>
    </main>
  );
}

function isInternship(jobType) {
  return getDisplayText(jobType).toLowerCase().includes("intern");
}

function getDisplayText(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(getDisplayText).filter(Boolean).join(", ");
  if (typeof value === "object") {
    const displayValue = value.name ?? value.label ?? value.value;
    return displayValue === undefined || displayValue === null ? "" : getDisplayText(displayValue);
  }
  return String(value).trim();
}

function getSkillList(value) {
  if (Array.isArray(value)) return value.flatMap(getSkillList);
  if (value === null || value === undefined) return [];
  if (typeof value === "object") {
    const displayValue = value.name ?? value.label ?? value.value;
    return displayValue === undefined || displayValue === null ? [] : getSkillList(displayValue);
  }
  if (typeof value !== "string") {
    const text = getDisplayText(value);
    return text ? [text] : [];
  }

  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return getSkillList(parsed);
    } catch {
      // Fall back to splitting a regular delimited skills string.
    }
  }
  return trimmed.split(/[,;|•\r\n]+/).map((skill) => skill.trim()).filter(Boolean);
}

function getPopularSkills(jobs) {
  const counts = new Map();
  jobs.forEach((job) => {
    getSkillList(job.skills).forEach((skill) => {
      const name = skill.trim();
      if (!name) return;
      const key = name.toLowerCase();
      const current = counts.get(key) || { key, name, count: 0 };
      current.count += 1;
      counts.set(key, current);
    });
  });
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 6);
}

function getCompaniesFromJobs(jobs) {
  const companies = new Map();
  jobs.forEach((job) => {
    const name = getDisplayText(job.companyName);
    if (!name) return;
    const key = String(job.companyId || name.toLowerCase());
    const current = companies.get(key) || { key, name, openings: 0, locations: new Set() };
    current.openings += 1;
    const location = getDisplayText(job.location);
    if (location) current.locations.add(location);
    companies.set(key, current);
  });
  return [...companies.values()]
    .map((company) => ({ ...company, locations: [...company.locations] }))
    .sort((a, b) => b.openings - a.openings || a.name.localeCompare(b.name));
}

function getInitials(name) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default Home;
