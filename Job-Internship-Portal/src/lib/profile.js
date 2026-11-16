import { ID, Permission, Role, Query } from "appwrite";
import { tablesDB } from "./database";

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const PROFILES_TABLE_ID = "6aa8fac7000e06b69db6";

export const createProfile = async ({ userId, role }) => {
    try {
        const profile = await tablesDB.createRow({
            databaseId: DATABASE_ID,
            tableId: PROFILES_TABLE_ID,
            rowId: ID.unique(),

            permissions: [
                Permission.read(Role.user(userId)),
                Permission.update(Role.user(userId)),
                Permission.delete(Role.user(userId)),
            ],

            data: {
                userId,
                role,
            },
        });

        return profile;
    } catch (error) {
        console.error("Profile creation failed:", error);
        throw error;
    }
};

export const getMyProfile = async (userId) => {
  try {
    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: PROFILES_TABLE_ID,
      queries: [
        Query.equal("userId", userId),
      ],
    });

    return response.rows[0] || null;
  } catch (error) {
    console.error("Profile fetch failed:", error);
    throw error;
  }
};


export const updateMyProfile = async (rowId, data) => {
    try {
        const response = await tablesDB.updateRow({
            databaseId: DATABASE_ID,
            tableId: PROFILES_TABLE_ID,
            rowId,
            data,
        });

        return response;
    } catch (error) {
        console.error("Profile update failed:", error);
        throw error;
    }
};