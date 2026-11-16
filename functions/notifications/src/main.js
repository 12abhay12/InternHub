import { createHash } from "node:crypto";

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const NOTIFICATIONS_TABLE_ID = process.env.APPWRITE_NOTIFICATIONS_TABLE_ID;
const JOBS_TABLE_ID = process.env.APPWRITE_JOBS_TABLE_ID;
const APPLICATIONS_TABLE_ID = process.env.APPWRITE_APPLICATIONS_TABLE_ID;

function jsonResponse(res, payload, statusCode = 200) {
  return res.text(JSON.stringify(payload), statusCode, {
    "Content-Type": "application/json",
  });
}

function parseBody(req) {
  const body = req.bodyJson ?? req.bodyText ?? req.body;

  if (body && typeof body === "object") return body;
  if (typeof body === "string") {
    try {
      return JSON.parse(body || "{}");
    } catch {
      return {};
    }
  }

  return {};
}

function appwriteConfig(req) {
  const endpoint = String(
    process.env.APPWRITE_FUNCTION_API_ENDPOINT ?? ""
  ).trim().replace(/\/+$/, "");
  const projectId = String(
    process.env.APPWRITE_FUNCTION_PROJECT_ID ?? ""
  ).trim();
  const apiKey = String(
    req.headers?.["x-appwrite-key"] ?? process.env.APPWRITE_FUNCTION_API_KEY ?? ""
  ).trim();

  if (!endpoint || !projectId || !apiKey) {
    throw new Error("Appwrite Function API configuration is missing.");
  }

  return {
    apiRoot: endpoint.endsWith("/v1") ? endpoint : `${endpoint}/v1`,
    projectId,
    apiKey,
  };
}

function escapePathPart(value) {
  return encodeURIComponent(String(value ?? ""));
}

async function appwriteRequest(req, path, options = {}) {
  const { apiRoot, projectId, apiKey } = appwriteConfig(req);
  const response = await fetch(`${apiRoot}${path}`, {
    ...options,
    headers: {
      "X-Appwrite-Project": projectId,
      "X-Appwrite-Key": apiKey,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();
  let result = {};

  if (text) {
    try {
      result = JSON.parse(text);
    } catch {
      result = { message: text };
    }
  }

  if (!response.ok) {
    const error = new Error(
      result.message || `Appwrite request failed with HTTP ${response.status}.`
    );
    error.status = response.status;
    error.response = result;
    throw error;
  }

  return result;
}

async function getRow(req, tableId, rowId) {
  if (!tableId || !rowId) return null;

  try {
    return await appwriteRequest(
      req,
      `/tablesdb/${escapePathPart(DATABASE_ID)}/tables/${escapePathPart(tableId)}/rows/${escapePathPart(rowId)}`
    );
  } catch (requestError) {
    if (requestError.status === 404) return null;
    throw requestError;
  }
}

function getAdminUserIds() {
  const configured = [
    process.env.APPWRITE_ADMIN_USER_IDS ?? "",
    process.env.APPWRITE_ADMIN_USER_ID ?? "",
  ].join(",");

  return [...new Set(configured.split(",").map((value) => value.trim()).filter(Boolean))];
}

function makeNotificationRowId(eventKey, recipientUserId) {
  const digest = createHash("sha256")
    .update(`${eventKey}:${recipientUserId}`)
    .digest("hex")
    .slice(0, 32);

  // Appwrite row IDs permit up to 36 characters.
  return `n_${digest}`;
}

async function createNotification(req, notification) {
  const recipientUserId = String(notification.userId ?? "").trim();
  if (!recipientUserId) return false;

  const rowId = makeNotificationRowId(notification.eventKey, recipientUserId);
  const permissionUser = `user:${recipientUserId}`;
  const data = {
    userId: recipientUserId,
    title: String(notification.title ?? "Update").slice(0, 255),
    message: String(notification.message ?? "").slice(0, 10000),
    type: String(notification.type ?? "system").slice(0, 100),
    link: String(notification.link ?? "").slice(0, 255),
    createdAt: new Date().toISOString(),
    isRead: false,
  };

  try {
    await appwriteRequest(
      req,
      `/tablesdb/${escapePathPart(DATABASE_ID)}/tables/${escapePathPart(NOTIFICATIONS_TABLE_ID)}/rows`,
      {
        method: "POST",
        body: JSON.stringify({
          rowId,
          data,
          permissions: [
            `read("${permissionUser}")`,
            `update("${permissionUser}")`,
          ],
        }),
      }
    );
    return true;
  } catch (requestError) {
    // Deterministic IDs make event retries idempotent.
    if (requestError.status === 409) return false;
    throw requestError;
  }
}

async function notifyAdmins(req, details, eventKey, log) {
  const adminIds = getAdminUserIds();
  if (adminIds.length === 0) {
    log("Admin notification skipped: configure APPWRITE_ADMIN_USER_ID or APPWRITE_ADMIN_USER_IDS.");
    return;
  }

  await Promise.all(
    adminIds.map((userId) =>
      createNotification(req, {
        ...details,
        userId,
        eventKey,
      })
    )
  );
}

function displayStatus(status) {
  const value = String(status ?? "").trim();
  if (!value) return "updated";
  if (value.toLowerCase() === "shortlisted" || value.toLowerCase() === "short listed") {
    return "Shortlisted";
  }
  if (value.toLowerCase() === "under review") return "Under Review";
  return value;
}

function getResourceId(resource) {
  return String(resource?.$id ?? resource?.id ?? "").trim();
}

function getEventAction(eventName) {
  if (eventName.endsWith(".create")) return "create";
  if (eventName.endsWith(".update")) return "update";
  return "";
}

export default async ({ req, res, log, error }) => {
  try {
    if (
      !DATABASE_ID ||
      !NOTIFICATIONS_TABLE_ID ||
      !JOBS_TABLE_ID ||
      !APPLICATIONS_TABLE_ID
    ) {
      throw new Error("One or more APPWRITE_* table ID variables are missing.");
    }

    const eventName = String(req.headers?.["x-appwrite-event"] ?? "").toLowerCase();
    const action = getEventAction(eventName);
    const resource = parseBody(req);
    const resourceId = getResourceId(resource);

    // Appwrite Auth event: notify configured administrator(s) about signups.
    if (eventName.startsWith("users.") && action === "create") {
      const newUserId = resourceId;
      const identity = String(resource.name || resource.email || "A new user").trim();
      const eventKey = `signup:${newUserId || resource.email || identity}`;

      await notifyAdmins(
        req,
        {
          title: "New account registered",
          message: `${identity} created a new account.`,
          type: "registration",
          link: "/admin-dashboard",
        },
        eventKey,
        log
      );

      return jsonResponse(res, { success: true, processed: "user-created" });
    }

    const isApplicationEvent =
      eventName.includes(APPLICATIONS_TABLE_ID) ||
      String(resource.$tableId ?? resource.$collectionId ?? "") === APPLICATIONS_TABLE_ID;
    const isJobEvent =
      eventName.includes(JOBS_TABLE_ID) ||
      String(resource.$tableId ?? resource.$collectionId ?? "") === JOBS_TABLE_ID;

    // New application: tell the company that owns the job.
    if (isApplicationEvent && action === "create") {
      const applicationId = resourceId;
      const jobId = String(resource.jobId ?? "").trim();
      const job = await getRow(req, JOBS_TABLE_ID, jobId);
      const companyId = String(job?.companyId ?? "").trim();

      if (!applicationId || !jobId || !companyId) {
        log("Application-created event skipped: application or company/job data is missing.");
        return jsonResponse(res, { success: true, skipped: "missing-application-job-or-company" });
      }

      const studentName = String(resource.studentName ?? "A student").trim();
      const jobTitle = String(job.title ?? "your job").trim();

      await createNotification(req, {
        userId: companyId,
        title: "New application received",
        message: `${studentName} applied for ${jobTitle}.`,
        type: "application",
        link: `/job-applicants/${jobId}`,
        eventKey: `application-created:${applicationId}`,
      });

      return jsonResponse(res, { success: true, processed: "application-created" });
    }

    // Application status change: tell the student who owns the application.
    if (isApplicationEvent && action === "update") {
      const applicationId = resourceId;
      const studentId = String(resource.studentId ?? "").trim();
      const jobId = String(resource.jobId ?? "").trim();
      const status = displayStatus(resource.status);
      const job = await getRow(req, JOBS_TABLE_ID, jobId);

      if (!applicationId || !studentId || !jobId) {
        log("Application-updated event skipped: application/student/job data is missing.");
        return jsonResponse(res, { success: true, skipped: "missing-application-student-or-job" });
      }

      const jobTitle = String(job?.title ?? "the job").trim();
      const eventKey = `application-status:${applicationId}:${resource.$updatedAt ?? resource.updatedAt ?? status}`;

      await createNotification(req, {
        userId: studentId,
        title: "Application status updated",
        message: `Your application for ${jobTitle} is now ${status}.`,
        type: "application_status",
        link: "/my-applications",
        eventKey,
      });

      return jsonResponse(res, { success: true, processed: "application-updated" });
    }

    // New job post: notify administrator(s).
    if (isJobEvent && action === "create") {
      const jobId = resourceId;
      const job = resourceId ? resource : {};
      const companyName = String(job.companyName ?? "A company").trim();
      const jobTitle = String(job.title ?? "a new opportunity").trim();
      const eventKey = `job-created:${jobId || jobTitle}`;

      await notifyAdmins(
        req,
        {
          title: "New job posted",
          message: `${companyName} posted ${jobTitle}.`,
          type: "job",
          link: "/admin-dashboard",
        },
        eventKey,
        log
      );

      return jsonResponse(res, { success: true, processed: "job-created" });
    }

    log(`Ignored notification event: ${eventName || "unknown event"}`);
    return jsonResponse(res, { success: true, ignored: true });
  } catch (functionError) {
    error(`Notification function failed: ${functionError?.message || String(functionError)}`);
    return jsonResponse(
      res,
      {
        success: false,
        error: "Notification processing failed.",
      },
      500
    );
  }
};
