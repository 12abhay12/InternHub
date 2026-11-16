import { ID, Query } from "appwrite";
import { databases, DATABASE_ID } from "./appwrite";

const APPLICATIONS_TABLE_ID = "6aae510d0039d324df00";

// Legacy and current database values ko consistent UI values mein map karta hai.
const normalizeApplicationStatus = (status) => {
  const value = String(status ?? "").trim().toLowerCase();

  switch (value) {
    case "applied":
      return "Applied";

    case "under review":
    case "reviewed":
    case "reviwed":
      return "Under Review";

    case "shortlist":
    case "shortlisted":
      return "Shortlisted";

    case "rejected":
      return "Rejected";

    case "selected":
      return "Selected";

    default:
      return typeof status === "string" && status.trim()
        ? status.trim()
        : "Applied";
  }
};

// Appwrite ke status attribute ko exact allowed value chahiye.
const toDatabaseApplicationStatus = (status) => {
  const normalizedStatus = normalizeApplicationStatus(status);

  if (normalizedStatus === "Shortlisted") {
    return "ShortListed";
  }

  return normalizedStatus;
};

const normalizeApplication = (application) => {
  if (!application) return null;

  return {
    ...application,
    status: normalizeApplicationStatus(application.status),
  };
};

// Create application
export const createApplication = async (applicationData = {}) => {
  try {
    const application = await databases.createDocument(
      DATABASE_ID,
      APPLICATIONS_TABLE_ID,
      ID.unique(),
      {
        jobId: applicationData.jobId,
        studentId: applicationData.studentId,
        studentName: applicationData.studentName,
        studentEmail: applicationData.studentEmail,
        resumeId: applicationData.resumeId,
        coverLetter: applicationData.coverLetter || "",
        status: "Applied",
        appliedAt: new Date().toISOString(),
      }
    );

    return normalizeApplication(application);
  } catch (error) {
    console.error("Failed to create application:", error);
    throw error;
  }
};

// Get applications of current student
export const getMyApplications = async (studentId) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      APPLICATIONS_TABLE_ID,
      [
        Query.equal("studentId", studentId),
        Query.orderDesc("$createdAt"),
      ]
    );

    return response.documents.map(normalizeApplication);
  } catch (error) {
    console.error("Failed to fetch my applications:", error);
    throw error;
  }
};

// Get applications for a company's job
export const getJobApplications = async (jobId) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      APPLICATIONS_TABLE_ID,
      [
        Query.equal("jobId", jobId),
        Query.orderDesc("$createdAt"),
      ]
    );

    return response.documents.map(normalizeApplication);
  } catch (error) {
    console.error("Failed to fetch job applications:", error);
    throw error;
  }
};

// Get single application
export const getApplicationById = async (applicationId) => {
  try {
    const application = await databases.getDocument(
      DATABASE_ID,
      APPLICATIONS_TABLE_ID,
      applicationId
    );

    return normalizeApplication(application);
  } catch (error) {
    console.error("Failed to fetch application:", error);
    throw error;
  }
};

// Update application status
export const updateApplicationStatus = async (
  applicationId,
  status
) => {
  try {
    const application = await databases.updateDocument(
      DATABASE_ID,
      APPLICATIONS_TABLE_ID,
      applicationId,
      {
        status: toDatabaseApplicationStatus(status),
      }
    );

    return normalizeApplication(application);
  } catch (error) {
    console.error("Failed to update application status:", error);
    throw error;
  }
};

// Check if student already applied for a job
export const checkExistingApplication = async (
  jobId,
  studentId
) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      APPLICATIONS_TABLE_ID,
      [
        Query.equal("jobId", jobId),
        Query.equal("studentId", studentId),
      ]
    );

    const application = response.documents[0] || null;
    return normalizeApplication(application);
  } catch (error) {
    console.error("Failed to check existing application:", error);
    throw error;
  }
};