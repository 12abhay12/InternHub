const jsonHeaders = {
  "Content-Type": "application/json",
};

// Appwrite Auth labels allow alphanumeric characters only (max 36 chars).
const COMPANY_APPROVED_LABEL = "internhubcompanyapproved";
const COMPANY_REJECTED_LABEL = "internhubcompanyrejected";
const COMPANY_BOOTSTRAP_LABEL = "internhubverifyinitv1";
const COMPANY_STATUS_LABELS = new Set([
  COMPANY_APPROVED_LABEL,
  COMPANY_REJECTED_LABEL,
]);

// The Admin Function can override this with APPWRITE_RESUMES_TABLE_ID.
const DEFAULT_RESUMES_TABLE_ID = "6aad21230014c2a152be";

const MAX_ROWS = 5000;
const PAGE_SIZE = 100;

function sendJson(res, payload, statusCode = 200) {
  return res.json(payload, statusCode);
}

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function timestamp(value) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseBodyValue(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (typeof value.action === "string" && value.action.trim()) {
      return value;
    }

    // Some Function SDK/runtime combinations expose the execution envelope
    // instead of the inner body. Unwrap it without changing ordinary requests.
    for (const key of ["bodyJson", "bodyText", "body"]) {
      if (value[key] !== undefined) {
        const nested = parseBodyValue(value[key]);
        if (nested) return nested;
      }
    }

    return null;
  }

  if (typeof value === "string" && value.trim()) {
    try {
      return parseBodyValue(JSON.parse(value));
    } catch {
      return null;
    }
  }

  return null;
}

function parseRequestBody(req) {
  for (const candidate of [req.bodyJson, req.bodyText, req.body]) {
    const parsed = parseBodyValue(candidate);
    if (parsed) return parsed;
  }

  return {};
}

function getHeader(req, name) {
  const wanted = String(name).toLowerCase();
  const headers = req.headers ?? {};

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === wanted) {
      return String(value ?? "").trim();
    }
  }

  return "";
}

function getRequestUserId(req) {
  return getHeader(req, "x-appwrite-user-id");
}

function getApiContext(req) {
  const endpoint = String(process.env.APPWRITE_ENDPOINT ?? "").trim();
  const projectId = String(process.env.APPWRITE_PROJECT_ID ?? "").trim();
  const databaseId = String(process.env.APPWRITE_DATABASE_ID ?? "").trim();

  // Prefer the per-execution, scope-limited key from Function settings.
  // Keep APPWRITE_API_KEY as a temporary fallback so the existing stats path
  // does not stop working during the migration to the ephemeral key.
  const apiKey =
    getHeader(req, "x-appwrite-key") ||
    String(process.env.APPWRITE_API_KEY ?? "").trim();

  if (!endpoint || !projectId || !databaseId || !apiKey) {
    throw new Error("One or more Appwrite server settings are missing.");
  }

  return { endpoint: endpoint.replace(/\/+$/, ""), projectId, databaseId, apiKey };
}

function buildUrl(api, path) {
  return `${api.endpoint}/${String(path).replace(/^\/+/, "")}`;
}

async function appwriteRequest(api, path, { method = "GET", body } = {}) {
  const headers = {
    "X-Appwrite-Project": api.projectId,
    "X-Appwrite-Key": api.apiKey,
    ...jsonHeaders,
  };

  const response = await fetch(buildUrl(api, path), {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const text = await response.text();
  let payload = {};

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    const detail = payload?.message || payload?.type || `HTTP ${response.status}`;
    const requestError = new Error(`Appwrite request failed: ${detail}`);
    requestError.statusCode = response.status;
    throw requestError;
  }

  return payload;
}

function rowPath(databaseId, tableId, rowId = "") {
  const base =
    `tablesdb/${encodeURIComponent(databaseId)}/tables/` +
    `${encodeURIComponent(tableId)}/rows`;

  return rowId ? `${base}/${encodeURIComponent(rowId)}` : base;
}

async function getAllRows(api, tableId) {
  if (!tableId) {
    throw new Error("A required table ID is not configured.");
  }

  const rows = [];
  let offset = 0;

  while (rows.length < MAX_ROWS) {
    const query = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });

    const page = await appwriteRequest(
      api,
      `${rowPath(api.databaseId, tableId)}?${query.toString()}`
    );
    const pageRows = Array.isArray(page.rows) ? page.rows : [];
    rows.push(...pageRows);

    const total = Number(page.total);
    if (
      pageRows.length < PAGE_SIZE ||
      (Number.isFinite(total) && total > 0 && rows.length >= total)
    ) {
      break;
    }

    offset += pageRows.length;
  }

  return rows.slice(0, MAX_ROWS);
}

async function getRow(api, tableId, rowId) {
  if (!tableId || !rowId) {
    throw new Error("A table ID and row ID are required.");
  }

  return appwriteRequest(api, rowPath(api.databaseId, tableId, rowId));
}

async function updateRow(api, tableId, rowId, { data, permissions }) {
  const body = {};
  if (data !== undefined) body.data = data;
  if (permissions !== undefined) body.permissions = permissions;

  return appwriteRequest(api, rowPath(api.databaseId, tableId, rowId), {
    method: "PATCH",
    body,
  });
}

async function getAllAuthUsers(api) {
  const users = [];
  let offset = 0;

  while (users.length < MAX_ROWS) {
    const query = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });

    const page = await appwriteRequest(api, `users?${query.toString()}`);
    const pageUsers = Array.isArray(page.users) ? page.users : [];
    users.push(...pageUsers);

    const total = Number(page.total);
    if (
      pageUsers.length < PAGE_SIZE ||
      (Number.isFinite(total) && total > 0 && users.length >= total)
    ) {
      break;
    }

    offset += pageUsers.length;
  }

  return users.slice(0, MAX_ROWS);
}

async function getAuthUser(api, userId) {
  if (!userId) throw new Error("A user ID is required.");
  return appwriteRequest(api, `users/${encodeURIComponent(userId)}`);
}

async function getAuthUserOrNull(api, userId) {
  if (!userId) return null;

  try {
    return await getAuthUser(api, userId);
  } catch (requestError) {
    if (Number(requestError?.statusCode) === 404) return null;
    throw requestError;
  }
}

async function updateAuthUserStatus(api, userId, status) {
  return appwriteRequest(api, `users/${encodeURIComponent(userId)}/status`, {
    method: "PATCH",
    body: { status },
  });
}

async function updateAuthUserLabels(api, userId, labels) {
  return appwriteRequest(api, `users/${encodeURIComponent(userId)}/labels`, {
    method: "PUT",
    body: { labels },
  });
}

function countStatus(rows, acceptedStatuses) {
  return rows.filter((row) => acceptedStatuses.includes(normalize(row.status))).length;
}

function permission(action, role) {
  return `${action}("${role}")`;
}

function addPermission(permissions, value) {
  return permissions.includes(value) ? permissions : [...permissions, value];
}

function removePermission(permissions, value) {
  return permissions.filter((item) => item !== value);
}

function getCompanyVerificationStatus(labels, initialized) {
  if (labels.includes(COMPANY_APPROVED_LABEL)) return "Approved";
  if (labels.includes(COMPANY_REJECTED_LABEL)) return "Rejected";
  return initialized ? "Pending" : "Needs setup";
}

function replaceCompanyStatusLabel(labels, status) {
  const next = labels.filter((label) => !COMPANY_STATUS_LABELS.has(label));

  if (status === "Approved") next.push(COMPANY_APPROVED_LABEL);
  if (status === "Rejected") next.push(COMPANY_REJECTED_LABEL);

  return [...new Set(next)];
}

function isInternshipJob(job) {
  const jobType = normalize(job?.jobType);
  if (jobType) return jobType.includes("intern");
  return normalize(job?.title).includes("internship");
}

function buildJobApplicantCounts(applications) {
  const applicantsByJob = new Map();

  for (const application of applications) {
    const jobId = String(application?.jobId ?? "").trim();
    if (!jobId) continue;

    const studentId = String(application?.studentId ?? "").trim();
    // Count distinct students, but don't silently drop an older application row
    // if it has no studentId value.
    const applicantKey = studentId || String(application?.$id ?? "").trim();
    if (!applicantKey) continue;

    if (!applicantsByJob.has(jobId)) {
      applicantsByJob.set(jobId, new Set());
    }
    applicantsByJob.get(jobId).add(applicantKey);
  }

  return applicantsByJob;
}

function buildCompanyPostingCounts(jobs) {
  const counts = new Map();

  for (const job of jobs) {
    const companyId = String(job?.companyId ?? "").trim();
    if (!companyId) continue;

    if (!counts.has(companyId)) {
      counts.set(companyId, { jobs: 0, internships: 0 });
    }

    const companyCounts = counts.get(companyId);
    if (isInternshipJob(job)) companyCounts.internships += 1;
    else companyCounts.jobs += 1;
  }

  return counts;
}

function cleanRow(row) {
  if (!row || typeof row !== "object") return {};

  return Object.fromEntries(
    Object.entries(row).filter(
      ([key]) => !key.startsWith("$") && key !== "permissions"
    )
  );
}

function toAuthUserSummary(user, fallbackUserId = "") {
  if (!user) {
    return {
      userId: fallbackUserId,
      name: "",
      email: "",
      phone: "",
      accountStatus: "Auth account not found",
      createdAt: null,
    };
  }

  return {
    userId: user.$id || fallbackUserId,
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    accountStatus: user.status === false ? "Suspended" : "Active",
    createdAt: user.$createdAt || null,
  };
}

async function runInBatches(items, batchSize, worker) {
  for (let start = 0; start < items.length; start += batchSize) {
    const batch = items.slice(start, start + batchSize);
    await Promise.all(batch.map(worker));
  }
}

async function loadDashboardStats(api) {
  const profilesTableId = process.env.APPWRITE_PROFILES_TABLE_ID;
  const jobsTableId = process.env.APPWRITE_JOBS_TABLE_ID;
  const applicationsTableId = process.env.APPWRITE_APPLICATIONS_TABLE_ID;

  const [profiles, jobs, applications] = await Promise.all([
    getAllRows(api, profilesTableId),
    getAllRows(api, jobsTableId),
    getAllRows(api, applicationsTableId),
  ]);

  const students = profiles.filter(
    (profile) => normalize(profile.role) === "student"
  ).length;
  const companies = profiles.filter(
    (profile) => normalize(profile.role) === "company"
  ).length;

  const recentJobs = [...jobs]
    .sort((first, second) => timestamp(second.$createdAt) - timestamp(first.$createdAt))
    .slice(0, 5)
    .map((job) => ({
      id: job.$id,
      title: job.title || "Untitled job",
      companyName: job.companyName || "",
      status: job.status || "Unknown",
    }));

  const recentApplications = [...applications]
    .sort(
      (first, second) =>
        timestamp(second.appliedAt || second.$createdAt) -
        timestamp(first.appliedAt || first.$createdAt)
    )
    .slice(0, 5)
    .map((application) => ({
      id: application.$id,
      studentName: application.studentName || "",
      studentEmail: application.studentEmail || "",
      jobId: application.jobId || "",
      status: application.status || "Unknown",
    }));

  return {
    users: {
      total: profiles.length,
      students,
      companies,
    },
    jobs: {
      total: jobs.length,
      active: countStatus(jobs, ["active", "published", "open"]),
      closed: countStatus(jobs, ["closed"]),
      draft: countStatus(jobs, ["draft"]),
    },
    applications: {
      total: applications.length,
      applied: countStatus(applications, ["applied"]),
      underReview: countStatus(applications, ["under review", "in review", "review"]),
      shortlisted: countStatus(applications, ["shortlisted", "short listed"]),
      rejected: countStatus(applications, ["rejected"]),
      selected: countStatus(applications, ["selected", "accepted", "hired"]),
    },
    recentJobs,
    recentApplications,
  };
}

async function listAdminJobs(api) {
  const [jobs, applications] = await Promise.all([
    getAllRows(api, process.env.APPWRITE_JOBS_TABLE_ID),
    getAllRows(api, process.env.APPWRITE_APPLICATIONS_TABLE_ID),
  ]);
  const applicantCounts = buildJobApplicantCounts(applications);

  return jobs
    .sort((first, second) => timestamp(second.$createdAt) - timestamp(first.$createdAt))
    .map((job) => ({
      id: job.$id,
      title: job.title || "Untitled job",
      companyId: job.companyId || "",
      companyName: job.companyName || "Company not specified",
      jobType: job.jobType || "Job",
      status: job.status || "Unknown",
      adminVisibility: job.adminVisibility === "Hidden" ? "Hidden" : "Visible",
      createdAt: job.$createdAt || null,
      deadline: job.deadline || null,
      applicantCount: applicantCounts.get(String(job.$id))?.size || 0,
    }));
}

async function getAdminJobDetails(api, jobId) {
  const job = await getRow(api, process.env.APPWRITE_JOBS_TABLE_ID, jobId);
  const applications = await getAllRows(
    api,
    process.env.APPWRITE_APPLICATIONS_TABLE_ID
  );
  const applicantCounts = buildJobApplicantCounts(applications);
  const details = cleanRow(job);

  return {
    job: {
      ...details,
      id: job.$id || jobId,
      createdAt: job.$createdAt || null,
      updatedAt: job.$updatedAt || null,
      adminVisibility: job.adminVisibility === "Hidden" ? "Hidden" : "Visible",
    },
    applicantCount: applicantCounts.get(String(job.$id || jobId))?.size || 0,
  };
}

async function setAdminJobVisibility(api, jobId, visibility) {
  const jobsTableId = process.env.APPWRITE_JOBS_TABLE_ID;
  const job = await getRow(api, jobsTableId, jobId);
  const companyId = String(job.companyId ?? "").trim();

  if (!companyId) {
    throw new Error("This job does not have a company owner ID.");
  }

  const currentPermissions = Array.isArray(job.$permissions)
    ? job.$permissions
    : Array.isArray(job.permissions)
      ? job.permissions
      : [];

  const publicRead = permission("read", "any");
  const companyRead = permission("read", `user:${companyId}`);
  const companyUpdate = permission("update", `user:${companyId}`);
  const companyDelete = permission("delete", `user:${companyId}`);

  let nextPermissions = [...currentPermissions];

  if (visibility === "Hidden") {
    // Keep the job visible to its owner, but block public reads and prevent the
    // owner from un-hiding it or deleting the moderated record themselves.
    nextPermissions = removePermission(nextPermissions, publicRead);
    nextPermissions = removePermission(nextPermissions, companyUpdate);
    nextPermissions = removePermission(nextPermissions, companyDelete);
    nextPermissions = addPermission(nextPermissions, companyRead);
  } else {
    nextPermissions = addPermission(nextPermissions, publicRead);
    nextPermissions = addPermission(nextPermissions, companyRead);
    nextPermissions = addPermission(nextPermissions, companyUpdate);
    nextPermissions = addPermission(nextPermissions, companyDelete);
  }

  const updated = await updateRow(api, jobsTableId, jobId, {
    data: { adminVisibility: visibility },
    permissions: nextPermissions,
  });

  return {
    id: updated.$id || jobId,
    adminVisibility: visibility,
    status: updated.status || job.status || "Unknown",
  };
}

async function listAdminProfiles(api) {
  const [profiles, authUsers, jobs, adminUser] = await Promise.all([
    getAllRows(api, process.env.APPWRITE_PROFILES_TABLE_ID),
    getAllAuthUsers(api),
    getAllRows(api, process.env.APPWRITE_JOBS_TABLE_ID),
    getAuthUser(api, process.env.APPWRITE_ADMIN_USER_ID),
  ]);

  const userById = new Map(authUsers.map((user) => [user.$id, user]));
  const postingCountsByCompany = buildCompanyPostingCounts(jobs);
  const verificationInitialized = Array.isArray(adminUser.labels)
    ? adminUser.labels.includes(COMPANY_BOOTSTRAP_LABEL)
    : false;

  const people = profiles.map((profile) => {
    const userId = String(profile.userId ?? "").trim();
    const user = userById.get(userId);
    const role = normalize(profile.role);
    const labels = Array.isArray(user?.labels) ? user.labels : [];
    const postingCounts = postingCountsByCompany.get(userId) || {
      jobs: 0,
      internships: 0,
    };

    return {
      profileId: profile.$id,
      userId,
      role,
      name: user?.name || profile.name || profile.companyName || "Unnamed user",
      email: user?.email || profile.email || "",
      accountStatus: user
        ? user.status === false
          ? "Suspended"
          : "Active"
        : "Auth account not found",
      companyVerificationStatus:
        role === "company"
          ? getCompanyVerificationStatus(labels, verificationInitialized)
          : null,
      createdAt: profile.$createdAt || user?.$createdAt || null,
      phone: profile.companyPhone || profile.phone || user?.phone || "",
      city: profile.city || "",
      state: profile.state || "",
      companyName: profile.companyName || "",
      companyWebsite: profile.companyWebsite || profile.website || "",
      industry: profile.industry || "",
      companySize: profile.companySize || "",
      jobCount: role === "company" ? postingCounts.jobs : 0,
      internshipCount: role === "company" ? postingCounts.internships : 0,
    };
  });

  people.sort((first, second) => timestamp(second.createdAt) - timestamp(first.createdAt));

  const companies = people.filter((person) => person.role === "company");
  const users = people.filter((person) => person.role !== "company");

  return {
    people,
    users,
    companies,
    verificationInitialized,
  };
}

async function getAdminProfileDetails(api, userId) {
  if (!userId) throw new Error("A user ID is required.");

  const profiles = await getAllRows(api, process.env.APPWRITE_PROFILES_TABLE_ID);
  const profile = profiles.find(
    (item) => String(item.userId ?? "").trim() === userId
  );

  if (!profile) {
    throw new Error("The selected profile could not be found.");
  }

  const role = normalize(profile.role);
  const [authUser, resumeRows, jobs] = await Promise.all([
    getAuthUserOrNull(api, userId),
    role === "student"
      ? getAllRows(
        api,
        process.env.APPWRITE_RESUMES_TABLE_ID || DEFAULT_RESUMES_TABLE_ID
      )
      : Promise.resolve([]),
    role === "company"
      ? getAllRows(api, process.env.APPWRITE_JOBS_TABLE_ID)
      : Promise.resolve([]),
  ]);

  const resume = resumeRows.find(
    (item) => String(item.userId ?? "").trim() === userId
  );
  const companyPostingCounts = buildCompanyPostingCounts(jobs).get(userId) || {
    jobs: 0,
    internships: 0,
  };

  return {
    user: toAuthUserSummary(authUser, userId),
    profile: {
      ...cleanRow(profile),
      profileId: profile.$id || "",
      createdAt: profile.$createdAt || null,
      updatedAt: profile.$updatedAt || null,
    },
    resume: resume
      ? {
        ...cleanRow(resume),
        resumeId: resume.$id || "",
        createdAt: resume.$createdAt || null,
        updatedAt: resume.$updatedAt || null,
      }
      : null,
    jobCounts:
      role === "company"
        ? {
          jobs: companyPostingCounts.jobs,
          internships: companyPostingCounts.internships,
        }
        : null,
  };
}

function createHttpError(message, statusCode) {
  const requestError = new Error(message);
  requestError.statusCode = statusCode;
  return requestError;
}

// Return only the resume attached to an application for a company-owned job.
// The browser supplies an application ID, but ownership and resume ownership
// are checked here using trusted server-side data before any resume is returned.
async function getCompanyApplicantResume(api, companyUserId, applicationId) {
  const requestedApplicationId = String(applicationId ?? "").trim();
  if (!requestedApplicationId) {
    throw createHttpError("An application ID is required.", 400);
  }

  const profilesTableId = process.env.APPWRITE_PROFILES_TABLE_ID;
  const applicationsTableId = process.env.APPWRITE_APPLICATIONS_TABLE_ID;
  const jobsTableId = process.env.APPWRITE_JOBS_TABLE_ID;
  const resumesTableId =
    process.env.APPWRITE_RESUMES_TABLE_ID || DEFAULT_RESUMES_TABLE_ID;

  const profiles = await getAllRows(api, profilesTableId);
  const companyProfile = profiles.find(
    (profile) => String(profile.userId ?? "").trim() === companyUserId
  );

  if (!companyProfile || normalize(companyProfile.role) !== "company") {
    throw createHttpError("Company access is required.", 403);
  }

  const application = await getRow(
    api,
    applicationsTableId,
    requestedApplicationId
  );
  const jobId = String(application.jobId ?? "").trim();
  const studentId = String(application.studentId ?? "").trim();

  if (!jobId || !studentId) {
    throw createHttpError("This application does not have a valid resume link.", 404);
  }

  const studentProfile = profiles.find(
    (profile) => String(profile.userId ?? "").trim() === studentId
  );
  if (!studentProfile || normalize(studentProfile.role) !== "student") {
    throw createHttpError("The applicant profile could not be found.", 404);
  }

  const job = await getRow(api, jobsTableId, jobId);
  if (String(job.companyId ?? "").trim() !== companyUserId) {
    throw createHttpError("You are not authorized to view this applicant's resume.", 403);
  }

  const resumeId = String(application.resumeId ?? "").trim();
  if (!resumeId) {
    throw createHttpError("No resume was attached to this application.", 404);
  }

  const resume = await getRow(api, resumesTableId, resumeId);
  if (String(resume.userId ?? "").trim() !== studentId) {
    // Do not disclose a resume that does not belong to the applicant on this row.
    throw createHttpError("The resume linked to this application could not be found.", 404);
  }

  return {
    profile: {
      city: studentProfile.city || "",
      education: studentProfile.education || "",
      skills: studentProfile.skills || "",
      languages: studentProfile.languages || "",
      linkedin: studentProfile.linkedin || "",
      github: studentProfile.github || "",
      portfolio: studentProfile.portfolio || "",
    },
    resume: {
      summary: resume.summary || "",
      education: resume.education || studentProfile.education || "",
      projects: resume.projects || "",
      certifications: resume.certifications || "",
      experience: resume.experience || "",
      achievements: resume.achievements || "",
    },
  };
}

async function setAdminAccountStatus(api, adminUserId, userId, accountStatus) {
  if (!userId) throw new Error("A target user ID is required.");
  if (userId === adminUserId && accountStatus === "Suspended") {
    throw new Error("The admin account cannot suspend itself.");
  }

  const desiredStatus = accountStatus === "Active";
  await updateAuthUserStatus(api, userId, desiredStatus);

  return {
    userId,
    accountStatus: desiredStatus ? "Active" : "Suspended",
  };
}

async function setAdminCompanyVerification(api, userId, verificationStatus) {
  const profiles = await getAllRows(api, process.env.APPWRITE_PROFILES_TABLE_ID);
  const profile = profiles.find(
    (item) => String(item.userId ?? "").trim() === userId
  );

  if (!profile || normalize(profile.role) !== "company") {
    throw new Error("The selected user is not a company profile.");
  }

  const user = await getAuthUser(api, userId);
  const currentLabels = Array.isArray(user.labels) ? user.labels : [];
  const nextLabels = replaceCompanyStatusLabel(currentLabels, verificationStatus);
  const updated = await updateAuthUserLabels(api, userId, nextLabels);

  return {
    userId,
    verificationStatus: getCompanyVerificationStatus(
      Array.isArray(updated.labels) ? updated.labels : nextLabels,
      true
    ),
  };
}

async function bootstrapExistingCompanies(api, adminUserId) {
  const adminUser = await getAuthUser(api, adminUserId);
  const adminLabels = Array.isArray(adminUser.labels) ? adminUser.labels : [];

  if (adminLabels.includes(COMPANY_BOOTSTRAP_LABEL)) {
    return {
      alreadyInitialized: true,
      companiesApproved: 0,
    };
  }

  const [profiles, authUsers] = await Promise.all([
    getAllRows(api, process.env.APPWRITE_PROFILES_TABLE_ID),
    getAllAuthUsers(api),
  ]);
  const authUserById = new Map(authUsers.map((user) => [user.$id, user]));
  const companies = profiles.filter((profile) => normalize(profile.role) === "company");

  let approvedCount = 0;
  const eligibleCompanies = companies
    .map((profile) => ({
      profile,
      user: authUserById.get(String(profile.userId ?? "").trim()),
    }))
    .filter(({ user }) => Boolean(user));

  await runInBatches(eligibleCompanies, 8, async ({ user }) => {
    const labels = Array.isArray(user.labels) ? user.labels : [];
    const hasExistingDecision = labels.some((label) => COMPANY_STATUS_LABELS.has(label));

    if (hasExistingDecision) return;

    const nextLabels = [...new Set([...labels, COMPANY_APPROVED_LABEL])];
    await updateAuthUserLabels(api, user.$id, nextLabels);
    approvedCount += 1;
  });

  await updateAuthUserLabels(api, adminUserId, [
    ...new Set([...adminLabels, COMPANY_BOOTSTRAP_LABEL]),
  ]);

  return {
    alreadyInitialized: false,
    companiesApproved: approvedCount,
  };
}

export default async ({ req, res, log, error }) => {
  try {
    const requestUserId = getRequestUserId(req);

    if (!requestUserId) {
      return sendJson(
        res,
        { success: false, error: "Authentication is required." },
        401
      );
    }

    let body;
    try {
      body = parseRequestBody(req);
    } catch {
      return sendJson(
        res,
        { success: false, error: "Request body must be valid JSON." },
        400
      );
    }

    const action = String(body.action ?? "").trim();

    // Company users may request only an applicant resume for one of their own
    // jobs. The helper verifies the company role, job owner, and resume owner.
    if (action === "companyGetApplicantResume") {
      const api = getApiContext(req);
      const data = await getCompanyApplicantResume(
        api,
        requestUserId,
        body.applicationId
      );
      log("A company opened a resume for an application on its own job.");
      return sendJson(res, { success: true, data });
    }

    const adminUserId = String(process.env.APPWRITE_ADMIN_USER_ID ?? "").trim();

    if (!adminUserId) {
      error("APPWRITE_ADMIN_USER_ID is not configured.");
      return sendJson(
        res,
        { success: false, error: "Admin authorization is not configured." },
        500
      );
    }

    if (requestUserId !== adminUserId) {
      log("Blocked an admin-function request from a non-admin user.");
      return sendJson(
        res,
        { success: false, error: "Admin access is required." },
        403
      );
    }

    const api = getApiContext(req);
    log(`Admin Function received action: ${JSON.stringify(action)}.`);

    switch (action) {
      case "adminDashboardStats": {
        const data = await loadDashboardStats(api);
        log("Admin dashboard statistics loaded successfully.");
        return sendJson(res, { success: true, data });
      }

      case "adminListJobs": {
        const jobs = await listAdminJobs(api);
        return sendJson(res, { success: true, data: { jobs } });
      }

      case "adminGetJobDetails": {
        const jobId = String(body.jobId ?? "").trim();
        if (!jobId) {
          return sendJson(
            res,
            { success: false, error: "A job ID is required." },
            400
          );
        }

        const details = await getAdminJobDetails(api, jobId);
        return sendJson(res, { success: true, data: details });
      }

      case "adminSetJobVisibility": {
        const jobId = String(body.jobId ?? "").trim();
        const visibility = String(body.visibility ?? "").trim();

        if (!jobId || !["Visible", "Hidden"].includes(visibility)) {
          return sendJson(
            res,
            {
              success: false,
              error: "A job ID and visibility of Visible or Hidden are required.",
            },
            400
          );
        }

        const job = await setAdminJobVisibility(api, jobId, visibility);
        log(`Admin changed job ${jobId} visibility to ${visibility}.`);
        return sendJson(res, { success: true, data: { job } });
      }

      case "adminListProfiles": {
        const data = await listAdminProfiles(api);
        return sendJson(res, { success: true, data });
      }

      case "adminGetProfileDetails": {
        const userId = String(body.userId ?? "").trim();
        if (!userId) {
          return sendJson(
            res,
            { success: false, error: "A user ID is required." },
            400
          );
        }

        const details = await getAdminProfileDetails(api, userId);
        return sendJson(res, { success: true, data: details });
      }

      case "adminSetAccountStatus": {
        const userId = String(body.userId ?? "").trim();
        const accountStatus = String(body.accountStatus ?? "").trim();

        if (!userId || !["Active", "Suspended"].includes(accountStatus)) {
          return sendJson(
            res,
            {
              success: false,
              error: "A user ID and account status of Active or Suspended are required.",
            },
            400
          );
        }

        const user = await setAdminAccountStatus(
          api,
          adminUserId,
          userId,
          accountStatus
        );
        log(`Admin changed account ${userId} status to ${accountStatus}.`);
        return sendJson(res, { success: true, data: { user } });
      }

      case "adminSetCompanyVerification": {
        const userId = String(body.userId ?? "").trim();
        const verificationStatus = String(body.verificationStatus ?? "").trim();

        if (
          !userId ||
          !["Approved", "Rejected", "Pending"].includes(verificationStatus)
        ) {
          return sendJson(
            res,
            {
              success: false,
              error:
                "A company user ID and verification status of Approved, Rejected, or Pending are required.",
            },
            400
          );
        }

        const company = await setAdminCompanyVerification(
          api,
          userId,
          verificationStatus
        );
        log(`Admin changed company ${userId} verification to ${verificationStatus}.`);
        return sendJson(res, { success: true, data: { company } });
      }

      case "adminBootstrapExistingCompanies": {
        const result = await bootstrapExistingCompanies(api, adminUserId);
        log(
          result.alreadyInitialized
            ? "Existing-company verification was already initialized."
            : `Existing-company verification initialized; ${result.companiesApproved} companies marked approved.`
        );
        return sendJson(res, { success: true, data: result });
      }

      default:
        log(
          `Invalid admin action ${JSON.stringify(action)}; parsed body keys: ${Object.keys(body).join(", ")}.`
        );
        return sendJson(
          res,
          { success: false, error: "Invalid action." },
          400
        );
    }
  } catch (err) {
    error(`Admin function failed: ${err?.message || String(err)}`);

    const statusCode = Number(err?.statusCode);
    const safeStatus = statusCode >= 400 && statusCode < 500 ? statusCode : 500;

    return sendJson(
      res,
      {
        success: false,
        error:
          safeStatus === 500
            ? "The admin request could not be completed. Check the Function logs and required scopes."
            : err?.message || "The admin request is invalid.",
      },
      safeStatus
    );
  }
};
