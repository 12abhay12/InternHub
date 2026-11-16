import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  MapPin,
  BriefcaseBusiness,
  IndianRupee,
  Clock3,
  SlidersHorizontal,
  ArrowRight,
  X,
} from "lucide-react";

import { getAllJobs } from "../lib/jobs";

function toPlainText(value) {
  if (value === null || value === undefined) return "";

  if (Array.isArray(value)) {
    return value.map(toPlainText).filter(Boolean).join(", ");
  }

  if (typeof value === "object") {
    const displayValue = value.name ?? value.label ?? value.value;
    return displayValue === null || displayValue === undefined
      ? ""
      : toPlainText(displayValue);
  }

  return String(value);
}

function normalizeText(value) {
  return toPlainText(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+#]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
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
    const skill = toPlainText(value).trim();
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

function getUniqueFieldValues(jobs, fieldName) {
  const valuesByNormalizedText = new Map();

  jobs.forEach((job) => {
    const value = toPlainText(job?.[fieldName]).trim();
    const normalizedValue = normalizeText(value);

    if (value && normalizedValue && !valuesByNormalizedText.has(normalizedValue)) {
      valuesByNormalizedText.set(normalizedValue, value);
    }
  });

  return [...valuesByNormalizedText.values()].sort((first, second) =>
    first.localeCompare(second)
  );
}

function parseSalaryNumbers(salary) {
  const salaryText = toPlainText(salary).replace(/,/g, "");
  const matches = salaryText.match(/\d+(?:\.\d+)?/g);

  return matches
    ? matches.map(Number).filter((value) => Number.isFinite(value))
    : [];
}

function matchesSalaryRange(salary, salaryRange) {
  if (salaryRange === "All") return true;

  const salaryValues = parseSalaryNumbers(salary);

  // Unknown or non-numeric salaries should not be treated as ₹0.
  if (salaryValues.length === 0) return false;

  const salaryMin = Math.min(...salaryValues);
  const salaryMax = Math.max(...salaryValues);

  if (salaryRange === "0-10000") {
    return salaryMax >= 0 && salaryMin <= 10000;
  }

  if (salaryRange === "10000-20000") {
    return salaryMax >= 10000 && salaryMin <= 20000;
  }

  if (salaryRange === "20000-30000") {
    return salaryMax >= 20000 && salaryMin <= 30000;
  }

  if (salaryRange === "30000-50000") {
    return salaryMax >= 30000 && salaryMin <= 50000;
  }

  if (salaryRange === "50000+") {
    return salaryMax >= 50000;
  }

  return true;
}

function Jobs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState(() =>
    [
      searchParams.get("search"),
      searchParams.get("category"),
      searchParams.get("experience"),
    ]
      .filter(Boolean)
      .join(" ")
  );
  const [jobType, setJobType] = useState(() => searchParams.get("jobType") || "All");
  const [location, setLocation] = useState(() => searchParams.get("location") || "All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workMode, setWorkMode] = useState(() => searchParams.get("workMode") || "All");
  const [salaryRange, setSalaryRange] = useState(() => searchParams.get("salaryRange") || "All");

  const loadJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getAllJobs();
      setJobs(Array.isArray(data) ? data : []);
    } catch (loadError) {
      console.error("Failed to load jobs:", loadError);
      setError("Unable to load jobs. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Initialize filters from links such as /jobs?search=design or
  // /jobs?jobType=Internship, and keep them in sync with later navigation.
  useEffect(() => {
    const queryText = [
      searchParams.get("search"),
      searchParams.get("category"),
      searchParams.get("experience"),
    ]
      .filter(Boolean)
      .join(" ");

    setSearch(queryText);
    setJobType(searchParams.get("jobType") || "All");
    setLocation(searchParams.get("location") || "All");
    setWorkMode(searchParams.get("workMode") || "All");
    setSalaryRange(searchParams.get("salaryRange") || "All");
  }, [searchParams]);

  const locations = useMemo(
    () => getUniqueFieldValues(jobs, "location"),
    [jobs]
  );

  const jobTypes = useMemo(
    () => getUniqueFieldValues(jobs, "jobType"),
    [jobs]
  );

  const workModes = useMemo(
    () => getUniqueFieldValues(jobs, "workMode"),
    [jobs]
  );

  const filteredJobs = useMemo(() => {
    const searchTerms = normalizeText(search)
      .split(" ")
      .filter(Boolean);

    return jobs.filter((job) => {
      const searchableText = normalizeText([
        job?.title,
        job?.companyName,
        job?.description,
        job?.category,
        job?.experience,
        job?.education,
        ...getSkillList(job?.skills),
        job?.location,
        job?.jobType,
        job?.workMode,
      ]);

      const matchesSearch =
        searchTerms.length === 0 ||
        searchTerms.every((term) => searchableText.includes(term));

      const matchesWorkMode =
        workMode === "All" ||
        normalizeText(job?.workMode) === normalizeText(workMode);

      const matchesType =
        jobType === "All" ||
        normalizeText(job?.jobType) === normalizeText(jobType);

      const selectedLocation = normalizeText(location);
      const jobLocation = normalizeText(job?.location);
      const matchesLocation =
        location === "All" ||
        jobLocation === selectedLocation ||
        jobLocation.includes(selectedLocation) ||
        (selectedLocation === "remote" &&
          normalizeText(job?.workMode).includes("remote"));

      const matchesSalary = matchesSalaryRange(job?.salary, salaryRange);

      return (
        matchesSearch &&
        matchesType &&
        matchesLocation &&
        matchesWorkMode &&
        matchesSalary
      );
    });
  }, [jobs, search, jobType, location, workMode, salaryRange]);

  const clearFilters = () => {
    setSearch("");
    setJobType("All");
    setLocation("All");
    setWorkMode("All");
    setSalaryRange("All");
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters =
    Boolean(search.trim()) ||
    jobType !== "All" ||
    location !== "All" ||
    workMode !== "All" ||
    salaryRange !== "All";

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-8 w-56 rounded bg-slate-200" />
          <div className="mt-3 h-5 w-96 max-w-full rounded bg-slate-200" />
          <div className="mt-8 h-14 rounded-xl bg-slate-200" />

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="h-72 rounded-2xl bg-white shadow-sm"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="text-4xl">😕</div>

          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Something went wrong
          </h1>

          <p className="mt-2 text-sm text-slate-500">{error}</p>

          <button
            type="button"
            onClick={loadJobs}
            disabled={loading}
            className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Retrying..." : "Try Again"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      {/* Page header */}
      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold text-blue-600">
            Explore Opportunities
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Browse Jobs &amp; Internships
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Discover the latest jobs and internships from companies looking
            for talented students and professionals.
          </p>

          {/* Live search: results update as the user types. */}
          <div className="mt-7 max-w-4xl">
            <div className="relative">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search jobs, internships, skills or companies..."
                aria-label="Search jobs and internships"
                className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Results update as you type.
            </p>
          </div>
        </div>
      </section>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-7 lg:flex-row">
          {/* Filter sidebar */}
          <aside className="w-full shrink-0 lg:w-64">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={18} className="text-blue-600" />
                  <h2 className="font-bold text-slate-900">Filters</h2>
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Job type */}
              <div className="mt-6">
                <label
                  htmlFor="job-type-filter"
                  className="text-sm font-semibold text-slate-700"
                >
                  Job Type
                </label>

                <select
                  id="job-type-filter"
                  value={jobType}
                  onChange={(event) => setJobType(event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="All">All Types</option>
                  {jobTypes.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div className="mt-5">
                <label
                  htmlFor="location-filter"
                  className="text-sm font-semibold text-slate-700"
                >
                  Location
                </label>

                <select
                  id="location-filter"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="All">All Locations</option>
                  {locations.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              {/* Work mode */}
              <div className="mt-5">
                <label
                  htmlFor="work-mode-filter"
                  className="text-sm font-semibold text-slate-700"
                >
                  Work Mode
                </label>

                <select
                  id="work-mode-filter"
                  value={workMode}
                  onChange={(event) => setWorkMode(event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="All">All Work Modes</option>
                  {workModes.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              {/* Salary */}
              <div className="mt-5">
                <label
                  htmlFor="salary-filter"
                  className="text-sm font-semibold text-slate-700"
                >
                  Salary / Stipend
                </label>

                <select
                  id="salary-filter"
                  value={salaryRange}
                  onChange={(event) => setSalaryRange(event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="All">Any Salary</option>
                  <option value="0-10000">₹0 – ₹10,000</option>
                  <option value="10000-20000">₹10,000 – ₹20,000</option>
                  <option value="20000-30000">₹20,000 – ₹30,000</option>
                  <option value="30000-50000">₹30,000 – ₹50,000</option>
                  <option value="50000+">₹50,000+</option>
                </select>
              </div>
            </div>
          </aside>

          {/* Job results */}
          <section className="min-w-0 flex-1">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Available Opportunities
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {filteredJobs.length}{" "}
                  {filteredJobs.length === 1
                    ? "opportunity"
                    : "opportunities"}{" "}
                  found
                </p>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  <X size={15} />
                  Clear filters
                </button>
              )}
            </div>

            {filteredJobs.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <Search size={24} className="text-slate-400" />
                </div>

                <h3 className="mt-5 text-lg font-bold text-slate-900">
                  No opportunities found
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Try changing your search or filters to find more jobs
                  and internships.
                </p>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-2">
                {filteredJobs.map((job) => (
                  <JobCard key={job.$id} job={job} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

/* =========================================================
   JOB / INTERNSHIP CARD
========================================================= */

function JobCard({ job }) {
  const companyName = toPlainText(job?.companyName).trim() || "Company";
  const title = toPlainText(job?.title).trim() || "Untitled opportunity";
  const jobType = toPlainText(job?.jobType).trim() || "Job";
  const location = toPlainText(job?.location).trim() || "Location not specified";
  const workMode = toPlainText(job?.workMode).trim();
  const salary = toPlainText(job?.salary).trim();
  const experience = toPlainText(job?.experience).trim();
  const skills = getSkillList(job?.skills).slice(0, 4);
  const isInternship = normalizeText(jobType) === "internship";

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      {/* Top */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-blue-600">
            {companyName.charAt(0).toUpperCase() || "C"}
          </div>

          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-500">
              {companyName}
            </p>

            <h3 className="mt-0.5 truncate text-base font-bold text-slate-900 group-hover:text-blue-600">
              {title}
            </h3>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${isInternship
            ? "bg-emerald-50 text-emerald-700"
            : "bg-blue-50 text-blue-700"
            }`}
        >
          {jobType}
        </span>
      </div>

      {/* Details */}
      <div className="mt-5 space-y-2.5">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <MapPin size={15} className="shrink-0" />
          <span>{location}</span>
        </div>

        {workMode && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <BriefcaseBusiness size={15} className="shrink-0" />
            <span>{workMode}</span>
          </div>
        )}

        {salary && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <IndianRupee size={15} className="shrink-0" />
            <span>{salary}</span>
          </div>
        )}

        {experience && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock3 size={15} className="shrink-0" />
            <span>{experience}</span>
          </div>
        )}
      </div>

      {/* Skills */}
      {skills.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {skills.map((skill, index) => (
            <span
              key={`${skill}-${index}`}
              className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Bottom */}
      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <BriefcaseBusiness size={14} />
          Active opportunity
        </div>

        <Link
          to={`/job-details/${job.$id}`}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 transition hover:text-blue-700"
        >
          View Details
          <ArrowRight
            size={15}
            className="transition group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </article>
  );
}

export default Jobs;