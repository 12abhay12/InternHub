import { databases, DATABASE_ID } from "./appwrite";
import { ID, Query } from "appwrite";

const RESUME_TABLE_ID = "6aad21230014c2a152be";

// Get current user's resume
export const getMyResume = async (userId) => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      RESUME_TABLE_ID,
      [Query.equal("userId", userId)]
    );

    return response.documents[0] || null;
  } catch (error) {
    console.error("Failed to fetch resume:", error);
    throw error;
  }
};

// Create a new resume
export const createResume = async (userId, resumeData = {}) => {
  try {
    return await databases.createDocument(
      DATABASE_ID,
      RESUME_TABLE_ID,
      ID.unique(),
      {
        userId,
        summary: resumeData.summary || "",
        education: resumeData.education || "",
        projects: resumeData.projects || "",
        certifications: resumeData.certifications || "",
        experience: resumeData.experience || "",
        achievements: resumeData.achievements || "",
      }
    );
  } catch (error) {
    console.error("Failed to create resume:", error);
    throw error;
  }
};

// Update existing resume
export const updateResume = async (resumeId, resumeData = {}) => {
  try {
    return await databases.updateDocument(
      DATABASE_ID,
      RESUME_TABLE_ID,
      resumeId,
      {
        summary: resumeData.summary || "",
        education: resumeData.education || "",
        projects: resumeData.projects || "",
        certifications: resumeData.certifications || "",
        experience: resumeData.experience || "",
        achievements: resumeData.achievements || "",
      }
    );
  } catch (error) {
    console.error("Failed to update resume:", error);
    throw error;
  }
};

// Delete resume
export const deleteResume = async (resumeId) => {
  try {
    return await databases.deleteDocument(
      DATABASE_ID,
      RESUME_TABLE_ID,
      resumeId
    );
  } catch (error) {
    console.error("Failed to delete resume:", error);
    throw error;
  }
};