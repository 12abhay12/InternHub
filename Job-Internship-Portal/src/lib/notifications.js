import { Query } from "appwrite";

import { DATABASE_ID } from "./appwrite";
import { tablesDB } from "./database";

export const NOTIFICATIONS_TABLE_ID = "6ad4d904000c1f6232f6";
export const NOTIFICATIONS_CHANGED_EVENT = "internhub:notifications-changed";

function emitNotificationsChanged() {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
    }
}

function getRows(response) {
    return Array.isArray(response?.rows) ? response.rows : [];
}

/** Fetch the signed-in user's notifications. Row Security + row permissions
 *  on the Notifications table enforce access; this userId filter is additional.
 */
export const getMyNotifications = async (
    userId,
    { limit = 50, offset = 0 } = {}
) => {
    if (!userId) return [];

    const queries = [
        Query.equal("userId", userId),
        Query.orderDesc("createdAt"),
        Query.limit(Math.max(1, Math.min(Number(limit) || 50, 100))),
    ];

    if (Number(offset) > 0) {
        queries.push(Query.offset(Number(offset)));
    }

    const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: NOTIFICATIONS_TABLE_ID,
        queries,
    });

    return getRows(response);
};

/** Uses the server-provided total so the Navbar can show an exact unread count
 *  without downloading every notification row.
 */
export const getUnreadNotificationCount = async (userId) => {
    if (!userId) return 0;

    const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: NOTIFICATIONS_TABLE_ID,
        queries: [
            Query.equal("userId", userId),
            Query.equal("isRead", false),
            Query.limit(1),
        ],
    });

    const total = Number(response?.total);
    return Number.isFinite(total) ? total : getRows(response).filter((row) => !row.isRead).length;
};

/** Mark one row read. The Function-created row permission limits updates to
 *  that notification's recipient; this check provides an additional guard.
 */
export const markNotificationRead = async (userId, notification) => {
    if (!userId || !notification?.$id) {
        throw new Error("A user and notification row are required.");
    }

    if (notification.userId !== userId) {
        throw new Error("You can only update your own notifications.");
    }

    if (notification.isRead) return notification;

    const updated = await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: NOTIFICATIONS_TABLE_ID,
        rowId: notification.$id,
        data: { isRead: true },
    });

    emitNotificationsChanged();
    return updated;
};

/** Mark all currently unread notifications read, in bounded batches. */
export const markAllNotificationsRead = async (userId) => {
    if (!userId) return 0;

    const batchSize = 100;
    let updatedCount = 0;

    while (true) {
        const response = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: NOTIFICATIONS_TABLE_ID,
            queries: [
                Query.equal("userId", userId),
                Query.equal("isRead", false),
                Query.limit(batchSize),
            ],
        });

        const rows = getRows(response);
        if (rows.length === 0) break;

        await Promise.all(
            rows.map((row) =>
                tablesDB.updateRow({
                    databaseId: DATABASE_ID,
                    tableId: NOTIFICATIONS_TABLE_ID,
                    rowId: row.$id,
                    data: { isRead: true },
                })
            )
        );

        updatedCount += rows.length;

        // Because each updated row leaves the `isRead = false` result set, keep
        // fetching from offset 0; advancing an offset would skip remaining rows.
        if (rows.length < batchSize) break;
    }

    if (updatedCount > 0) emitNotificationsChanged();
    return updatedCount;
};
