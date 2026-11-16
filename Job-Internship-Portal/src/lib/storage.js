import { storage } from "./database";
import { ID } from "appwrite";


const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_ID;

// console.log("BUCKET_ID:", BUCKET_ID);


export const uploadProfilePicture = async (file) => {
    try {
        const uploadedFile = await storage.createFile({
            bucketId: BUCKET_ID,
            fileId: ID.unique(),
            file,
        });

        return uploadedFile;
    } catch (error) {
        console.error("Profile picture upload failed:", error);
        throw error;
    }
};

export const getProfilePictureUrl = (fileId) => {
    if (!fileId) return null;

    return storage.getFileView({
        bucketId: BUCKET_ID,
        fileId,
    });
};