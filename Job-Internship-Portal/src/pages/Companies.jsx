import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Building2, MapPin, RefreshCw, Search } from "lucide-react";

import { getAllJobs } from "../lib/jobs";

function Companies() {
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState(() => getInitialQuery(searchParams));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    setSearch(getInitialQuery(searchParams));
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    const loadJobs = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await getAllJobs();
        if (active) setJobs(Array.isArray(result) ? result : []);
      } catch (loadError) {
        console.error("Failed to load the company directory:", loadError);
        if (active) setError("We couldn’t load companies right now.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadJobs();
    return () => {
      active = false;
    };
  }, [reloadVersion]);

  const companies = useMemo(() => groupCompanies(jobs), [jobs]);
  const filteredCompanies = useMemo(() => {
    const terms = normalizeText(search).split(" ").filter(Boolean);
    if (terms.length === 0) return companies;
    return companies.filter((company) => {
      const text = normalizeText([
        company.name,
        ...company.jobs.flatMap((job) => [job.title, job.location, job.workMode, job.description, ...getSkills(job.skills)]),
      ]);
      return terms.every((term) => text.includes(term));
    });
  }, [companies, search]);

  return (
    <main className="min-h-[60vh] bg-slate-50 pb-12">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-6 bg-linear-to-r from-blue-50 via-white to-indigo-50 p-6 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Company directory</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Discover companies hiring on InternHub</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                This directory is based on employers with active job or internship postings. Search a company or explore the openings it has listed.
              </p>
            </div>
            <div className="rounded-2xl border border-white bg-white/80 px-5 py-4 shadow-sm">
              <p className="text-2xl font-bold text-slate-900">{loading ? "—" : companies.length}</p>
              <p className="mt-0.5 text-xs font-medium text-slate-500">companies with active openings</p>
            </div>
          </div>

          <div className="border-t border-slate-100 p-5 sm:p-7">
            <label htmlFor="company-search" className="sr-only">Search companies and their active roles</label>
            <div className="relative max-w-2xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="company-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by company, role, location, or skill"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </div>
            <p className="mt-2 text-xs text-slate-400">Results update as you type.</p>
          </div>
        </section>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Companies with active openings</h2>
            <p className="mt-1 text-sm text-slate-500">{loading ? "Loading companies…" : `${filteredCompanies.length} ${filteredCompanies.length === 1 ? "company" : "companies"} found`}</p>
          </div>
          <Link to="/jobs" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800">
            Browse all opportunities <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white" />)}
          </div>
        ) : error ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-600">{error}</p>
            <button type="button" onClick={() => setReloadVersion((value) => value + 1)} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <RefreshCw className="h-4 w-4" />Try again
            </button>
          </div>
        ) : filteredCompanies.length > 0 ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCompanies.map((company) => <CompanyCard key={company.key} company={company} />)}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <Building2 className="mx-auto h-7 w-7 text-slate-400" />
            <h3 className="mt-3 font-semibold text-slate-800">No matching companies found</h3>
            <p className="mt-1 text-sm text-slate-500">Try a different company name, role, or location.</p>
          </div>
        )}
      </div>
    </main>
  );
}

function CompanyCard({ company }) {
  const rolePreview = company.jobs.slice(0, 2);

  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold uppercase text-blue-800">{getInitials(company.name)}</span>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          {company.openings} {company.openings === 1 ? "opening" : "openings"}
        </span>
      </div>
      <h3 className="mt-4 truncate text-lg font-semibold text-slate-900">{company.name}</h3>
      {company.locations.length > 0 && (
        <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" />{company.locations.slice(0, 3).join(" · ")}
        </p>
      )}
      <div className="mt-4 flex-1 space-y-2">
        {rolePreview.map((job) => (
          <p key={job.$id} className="truncate rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
            {getDisplayText(job.title) || "Active opportunity"}
          </p>
        ))}
      </div>
      <Link to={`/jobs?search=${encodeURIComponent(company.name)}`} className="mt-4 inline-flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold text-blue-700 hover:text-blue-800">
        View active opportunities <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

function getInitialQuery(searchParams) {
  return searchParams.get("search") || searchParams.get("category") || "";
}

function groupCompanies(jobs) {
  const map = new Map();
  jobs.forEach((job) => {
    const name = getDisplayText(job.companyName);
    if (!name) return;
    const key = String(job.companyId || name.toLowerCase());
    const company = map.get(key) || { key, name, openings: 0, locations: new Set(), jobs: [] };
    company.openings += 1;
    const location = getDisplayText(job.location);
    if (location) company.locations.add(location);
    company.jobs.push(job);
    map.set(key, company);
  });

  return [...map.values()]
    .map((company) => ({ ...company, locations: [...company.locations] }))
    .sort((a, b) => b.openings - a.openings || a.name.localeCompare(b.name));
}

function getSkills(value) {
  if (Array.isArray(value)) return value.flatMap(getSkills);
  if (value === null || value === undefined) return [];
  if (typeof value === "object") {
    const displayValue = value.name ?? value.label ?? value.value;
    return displayValue === undefined || displayValue === null ? [] : getSkills(displayValue);
  }
  if (typeof value !== "string") return [String(value)];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return getSkills(parsed);
    } catch {
      // Fall back to splitting a delimited text value.
    }
  }
  return trimmed.split(/[,;|•\r\n]+/).map((skill) => skill.trim()).filter(Boolean);
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

function getInitials(value) {
  const words = getDisplayText(value).split(/\s+/).filter(Boolean);
  if (words.length === 0) return "CO";

  return words
    .slice(0, 2)
    .map((word) => Array.from(word)[0] || "")
    .join("")
    .toUpperCase();
}

function normalizeText(value) {
  return getDisplayText(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+#]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default Companies;
