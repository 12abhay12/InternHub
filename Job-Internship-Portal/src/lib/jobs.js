import { ID, Query, Permission, Role } from "appwrite";

import { databases, DATABASE_ID } from "./appwrite";

const JOBS_TABLE_ID = "6aae45fb00231e9316d0";
const PUBLIC_VISIBILITY = "Visible";
const HIDDEN_VISIBILITY = "Hidden";

// Create a new job / internship. Admin visibility is initialized by the service
// but is never accepted from caller-provided jobData.
export const createJob = async (jobData = {}) => {
  try {
    const companyId = String(jobData.companyId ?? "").trim();

    if (!companyId) {
      throw new Error("Company ID is required to create a job.");
    }

    return await databases.createDocument(
      DATABASE_ID,
      JOBS_TABLE_ID,
      ID.unique(),
      {
        companyId,
        companyName: jobData.companyName || "",
        title: jobData.title || "",
        description: jobData.description || "",
        jobType: jobData.jobType,
        location: jobData.location || "",
        workMode: normalizeWorkMode(jobData.workMode),
        salary: jobData.salary || "",
        skills: jobData.skills || "",
        education: jobData.education || "",
        experience: jobData.experience || "",
        deadline: jobData.deadline || null,
        status: normalizeJobStatus(jobData.status),
        adminVisibility: PUBLIC_VISIBILITY,
      },
      [
        // Visible jobs are publicly readable. The trusted Admin Function removes
        // public-read permission when a job is hidden.
        Permission.read(Role.any()),
        Permission.update(Role.user(companyId)),
        Permission.delete(Role.user(companyId)),
      ]
    );
  } catch (error) {
    console.error("Failed to create job:", error);
    throw error;
  }
};

// Get active jobs for public listings. Older rows without the new visibility
// column are treated as Visible; hidden rows are filtered out as a second guard.
export const getAllJobs = async () => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      JOBS_TABLE_ID,
      [
        Query.equal("status", "Active"),
        Query.orderDesc("$createdAt"),
      ]
    );

    return (Array.isArray(response.documents) ? response.documents : []).filter(
      (job) => job.adminVisibility !== HIDDEN_VISIBILITY
    );
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
    throw error;
  }
};

// Companies can continue to see their own hidden jobs in their workspace.
export const getCompanyJobs = async (companyId) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      JOBS_TABLE_ID,
      [
        Query.equal("companyId", companyId),
        Query.orderDesc("$createdAt"),
      ]
    );

    return Array.isArray(response.documents) ? response.documents : [];
  } catch (error) {
    console.error("Failed to fetch company jobs:", error);
    throw error;
  }
};

// Get a single job. When hidden, row permissions allow the owner to inspect it,
// while public users cannot read the row after the Admin Function removes
// Role.any() read access.
export const getJobById = async (jobId) => {
  try {
    return await databases.getDocument(
      DATABASE_ID,
      JOBS_TABLE_ID,
      jobId
    );
  } catch (error) {
    console.error("Failed to fetch job:", error);
    throw error;
  }
};

// Update job details. Admin-only moderation fields are intentionally omitted.
export const updateJob = async (jobId, jobData = {}) => {
  try {
    return await databases.updateDocument(
      DATABASE_ID,
      JOBS_TABLE_ID,
      jobId,
      {
        companyName: jobData.companyName || "",
        title: jobData.title || "",
        description: jobData.description || "",
        jobType: jobData.jobType,
        location: jobData.location || "",
        workMode: normalizeWorkMode(jobData.workMode),
        salary: jobData.salary || "",
        skills: jobData.skills || "",
        education: jobData.education || "",
        experience: jobData.experience || "",
        deadline: jobData.deadline || null,
        status: normalizeJobStatus(jobData.status),
      }
    );
  } catch (error) {
    console.error("Failed to update job:", error);
    throw error;
  }
};

// Update ONLY the company's own job lifecycle status.
export const updateJobStatus = async (jobId, status) => {
  try {
    return await databases.updateDocument(
      DATABASE_ID,
      JOBS_TABLE_ID,
      jobId,
      { status: normalizeJobStatus(status) }
    );
  } catch (error) {
    console.error("Failed to update job status:", error);
    throw error;
  }
};

// Delete job (company-owned operation; the admin's hide action is reversible).
export const deleteJob = async (jobId) => {
  try {
    return await databases.deleteDocument(
      DATABASE_ID,
      JOBS_TABLE_ID,
      jobId
    );
  } catch (error) {
    console.error("Failed to delete job:", error);
    throw error;
  }
};

function normalizeJobStatus(value) {
  const statuses = ["Active", "Closed", "Draft"];
  const requested = String(value || "Active").trim().toLowerCase();
  return statuses.find((status) => status.toLowerCase() === requested) || "Active";
}

function normalizeWorkMode(value) {
  const workModes = ["Remote", "Hybrid", "On-site"];
  const requested = String(value || "Remote").trim().toLowerCase();
  return workModes.find((mode) => mode.toLowerCase() === requested) || "Remote";
}
