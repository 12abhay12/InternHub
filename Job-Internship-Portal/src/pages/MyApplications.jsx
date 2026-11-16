import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { account } from "../lib/account";
import { getMyApplications } from "../lib/applications";
import { getJobById } from "../lib/jobs";

const MyApplications = () => {
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadApplications = async () => {
    try {
      setLoading(true);
      setError("");

      const currentUser = await account.get();

      const applicationData = await getMyApplications(
        currentUser.$id
      );

      // Fetch related job details
      const applicationsWithJobs = await Promise.all(
        applicationData.map(async (application) => {
          try {
            const job = await getJobById(application.jobId);

            return {
              ...application,
              job,
            };
          } catch (error) {
            console.error(
              "Failed to load job:",
              error
            );

            return {
              ...application,
              job: null,
            };
          }
        })
      );

      setApplications(applicationsWithJobs);
    } catch (error) {
      console.error(
        "Failed to load applications:",
        error
      );

      setError(
        "Unable to load your applications. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const formatDate = (date) => {
    if (!date) return "Unknown";

    try {
      return new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Unknown";
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "Applied":
        return "bg-blue-50 text-blue-700 border-blue-100";

      case "Under Review":
        return "bg-amber-50 text-amber-700 border-amber-100";

      case "Shortlisted":
        return "bg-purple-50 text-purple-700 border-purple-100";

      case "Selected":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";

      case "Rejected":
        return "bg-red-50 text-red-700 border-red-100";

      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-6 rounded-3xl border border-blue-100 bg-linear-to-r from-sky-50 via-blue-50 to-indigo-50 px-6 py-7 shadow-sm sm:px-8">
          <div className="flex items-center gap-4">

            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
              📋
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                My Applications
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Track all the jobs and internships you have applied for.
              </p>
            </div>

          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-4">

            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex gap-4">
                  <div className="h-14 w-14 rounded-xl bg-slate-200" />

                  <div className="flex-1">
                    <div className="h-5 w-1/2 rounded bg-slate-200" />
                    <div className="mt-3 h-4 w-1/3 rounded bg-slate-200" />
                    <div className="mt-5 h-4 w-1/4 rounded bg-slate-200" />
                  </div>
                </div>
              </div>
            ))}

          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">

            <div className="text-4xl">⚠️</div>

            <h2 className="mt-3 font-bold text-red-800">
              Something went wrong
            </h2>

            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={loadApplications}
              className="mt-5 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Try Again
            </button>

          </div>
        )}

        {/* Empty State */}
        {!loading &&
          !error &&
          applications.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">

              <div className="text-5xl">📭</div>

              <h2 className="mt-4 text-xl font-bold text-slate-900">
                No Applications Yet
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                You haven't applied for any job or internship yet.
                Explore available opportunities and start applying.
              </p>

              <button
                type="button"
                onClick={() => navigate("/jobs")}
                className="mt-6 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                Browse Jobs →
              </button>

            </div>
          )}

        {/* Applications */}
        {!loading &&
          !error &&
          applications.length > 0 && (
            <div className="space-y-4">

              {/* Result count */}
              <div className="flex items-center justify-between">

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Your Applications
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {applications.length}{" "}
                    {applications.length === 1
                      ? "application"
                      : "applications"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/jobs")}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-blue-600 transition hover:bg-blue-50"
                >
                  + Find Jobs
                </button>

              </div>

              {/* Application Cards */}
              {applications.map((application) => {
                const job = application.job;

                return (
                  <div
                    key={application.$id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-100 hover:shadow-md sm:p-6"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                      {/* Job Info */}
                      <div className="flex min-w-0 items-start gap-4">

                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-indigo-500 text-xl text-white shadow-sm">
                          🏢
                        </div>

                        <div className="min-w-0">

                          <h3 className="truncate text-lg font-bold text-slate-900">
                            {job?.title || "Job Opportunity"}
                          </h3>

                          <p className="mt-1 text-sm font-semibold text-blue-600">
                            {job?.companyName || "Company"}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">

                            {job?.location && (
                              <span>
                                📍 {job.location}
                              </span>
                            )}

                            {job?.jobType && (
                              <span>
                                💼 {job.jobType}
                              </span>
                            )}

                            <span>
                              📅 Applied{" "}
                              {formatDate(
                                application.appliedAt
                              )}
                            </span>

                          </div>

                        </div>
                      </div>

                      {/* Status + Button */}
                      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">

                        <span
                          className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-bold ${getStatusStyle(
                            application.status
                          )}`}
                        >
                          {application.status === "Applied" && "● "}
                          {application.status}
                        </span>

                        {job && (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/job-details/${job.$id}`
                              )
                            }
                            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                          >
                            View Job →
                          </button>
                        )}

                      </div>

                    </div>
                  </div>
                );
              })}

            </div>
          )}

      </div>
    </div>
  );
};

export default MyApplications;