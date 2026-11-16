import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  UserRound,
  Users,
  X,
} from "lucide-react";

import LoginDialog from "../LoginDialog/LoginDialog";
import { account } from "@/lib/account";
import { getMyProfile } from "@/lib/profile";
import { getProfilePictureUrl } from "@/lib/storage";
import { notifyAuthStateChanged } from "../../lib/authEvents";
import {
  getUnreadNotificationCount,
  NOTIFICATIONS_CHANGED_EVENT,
} from "@/lib/notifications";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function normalizeRole(role) {
  return String(role ?? "").trim().toLowerCase();
}

function Navbar() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState("");
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const [profileOpen, setProfileOpen] = useState(false);
  const [jobsOpen, setJobsOpen] = useState(false);
  const [internshipsOpen, setInternshipsOpen] = useState(false);
  const [companiesOpen, setCompaniesOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const mobileMenuRef = useRef(null);
  const profileMenuRef = useRef(null);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
      notifyAuthStateChanged();

      setUser(null);
      setUserRole("");
      setProfileDisplayName("");
      setProfilePictureUrl("");
      setUnreadNotificationCount(0);
      setProfileOpen(false);
      setMobileMenuOpen(false);

      navigate("/");
      console.log("User logged out successfully");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleSearch = (event) => {
    event.preventDefault();

    const query = searchQuery.trim();

    if (!query) {
      navigate("/jobs");
      setMobileMenuOpen(false);
      return;
    }

    navigate(`/jobs?search=${encodeURIComponent(query)}`);
    setMobileMenuOpen(false);
  };

  // Close the hamburger menu when clicking outside it.
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        mobileMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target)
      ) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [mobileMenuOpen]);

  // Close the account dropdown when clicking outside it (also supports touch).
  useEffect(() => {
    const handleOutsideProfileClick = (event) => {
      if (
        profileOpen &&
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideProfileClick);
    return () => document.removeEventListener("mousedown", handleOutsideProfileClick);
  }, [profileOpen]);

  // Load the logged-in user, role and role-appropriate profile image/name.
  useEffect(() => {
    let cancelled = false;

    const getCurrentUser = async () => {
      try {
        const currentUser = await account.get();
        if (cancelled) return;

        setUser(currentUser);

        const currentProfile = await getMyProfile(currentUser.$id);
        if (cancelled) return;

        const role = normalizeRole(currentProfile?.role);
        setUserRole(role);

        const displayName =
          role === "company"
            ? currentProfile?.companyName || currentUser.name || "Company"
            : currentUser.name || "User";
        setProfileDisplayName(displayName);

        const pictureId =
          role === "company"
            ? currentProfile?.companyLogoId || currentProfile?.profilePictureId
            : currentProfile?.profilePictureId;

        setProfilePictureUrl(
          pictureId ? getProfilePictureUrl(pictureId) : ""
        );
      } catch (error) {
        if (!cancelled) {
          setUser(null);
          setUserRole("");
          setProfileDisplayName("");
          setProfilePictureUrl("");
        }
      }
    };

    getCurrentUser();

    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the real unread count in sync after navigation, focus, and mark-read actions.
  useEffect(() => {
    const userId = user?.$id;

    if (!userId) {
      setUnreadNotificationCount(0);
      return undefined;
    }

    let cancelled = false;

    const refreshUnreadCount = async () => {
      try {
        const count = await getUnreadNotificationCount(userId);
        if (!cancelled) setUnreadNotificationCount(count);
      } catch (error) {
        // Keep the navbar usable if notifications are temporarily unavailable.
        console.error("Failed to load unread notification count:", error);
      }
    };

    const handleFocus = () => {
      if (document.visibilityState === "visible") refreshUnreadCount();
    };

    refreshUnreadCount();
    const intervalId = window.setInterval(refreshUnreadCount, 30000);
    window.addEventListener("focus", handleFocus);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, refreshUnreadCount);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, refreshUnreadCount);
    };
  }, [user?.$id]);

  const jobsMenu = {
    "Top Locations": [
      { label: "Work from Home", path: "/jobs?location=Remote" },
      { label: "Jobs in Bangalore", path: "/jobs?location=Bangalore" },
      { label: "Jobs in Delhi", path: "/jobs?location=Delhi" },
      { label: "Jobs in Hyderabad", path: "/jobs?location=Hyderabad" },
      { label: "Jobs in Mumbai", path: "/jobs?location=Mumbai" },
      { label: "Jobs in Pune", path: "/jobs?location=Pune" },
      { label: "Jobs in Chennai", path: "/jobs?location=Chennai" },
    ],
    "Top Categories": [
      { label: "Software Development", path: "/jobs?category=Software%20Development" },
      { label: "Marketing", path: "/jobs?category=Marketing" },
      { label: "Sales", path: "/jobs?category=Sales" },
      { label: "Data Science", path: "/jobs?category=Data%20Science" },
      { label: "HR", path: "/jobs?category=HR" },
    ],
    "Fresher Jobs": [
      { label: "Freshers Jobs", path: "/jobs?experience=Fresher" },
      { label: "Part-time Jobs", path: "/jobs?jobType=Part-Time" },
      { label: "Remote Jobs", path: "/jobs?location=Remote" },
      { label: "View all jobs...", path: "/jobs" },
    ],
  };

  const internshipsMenu = {
    "Top Locations": [
      { label: "Work from Home", path: "/jobs?jobType=Internship&location=Remote" },
      { label: "Internship in Bangalore", path: "/jobs?jobType=Internship&location=Bangalore" },
      { label: "Internship in Delhi", path: "/jobs?jobType=Internship&location=Delhi" },
      { label: "Internship in Hyderabad", path: "/jobs?jobType=Internship&location=Hyderabad" },
      { label: "Internship in Mumbai", path: "/jobs?jobType=Internship&location=Mumbai" },
      { label: "Internship in Pune", path: "/jobs?jobType=Internship&location=Pune" },
      { label: "Internship in Chennai", path: "/jobs?jobType=Internship&location=Chennai" },
    ],
    "Top Categories": [
      { label: "Software Development", path: "/jobs?jobType=Internship&category=Software%20Development" },
      { label: "Marketing", path: "/jobs?jobType=Internship&category=Marketing" },
      { label: "Sales", path: "/jobs?jobType=Internship&category=Sales" },
      { label: "Data Science", path: "/jobs?jobType=Internship&category=Data%20Science" },
      { label: "HR", path: "/jobs?jobType=Internship&category=HR" },
    ],
    "Fresher Internships": [
      { label: "Student Internships", path: "/jobs?jobType=Internship" },
      { label: "Part-time Internships", path: "/jobs?jobType=Internship&jobTypeFilter=Part-Time" },
      { label: "Remote Internships", path: "/jobs?jobType=Internship&location=Remote" },
      { label: "View all internships...", path: "/jobs?jobType=Internship" },
    ],
  };

  const companiesMenu = {
    "Top Companies": [
      { label: "IT Companies", path: "/companies?category=IT" },
      { label: "MNCs", path: "/companies?category=MNC" },
      { label: "Startups", path: "/companies?category=Startup" },
      { label: "Companies Hiring Freshers", path: "/companies?category=Freshers" },
      { label: "View All Companies...", path: "/companies" },
    ],
  };

  const isCompany = userRole === "company";
  const isStudent = userRole === "student";
  const isAdmin = userRole === "admin";
  const displayName =
    profileDisplayName || user?.name || user?.email || "User";
  const avatarInitial = displayName.charAt(0).toUpperCase() || "U";

  // Applications are per job in the current app. Manage Jobs opens the
  // company's job list, where each listing has its own View Applications link.
  const accountMenuItems = isCompany
    ? [
      {
        label: "Dashboard",
        path: "/company-dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      {
        label: "Post a Job",
        path: "/post-job",
        icon: <Plus className="h-4 w-4" />,
      },
      {
        label: "Manage Jobs & Applications",
        path: "/company-jobs",
        icon: <BriefcaseBusiness className="h-4 w-4" />,
      },
      {
        label: "Edit Company Profile",
        path: "/profile",
        icon: <Building2 className="h-4 w-4" />,
      },
    ]
    : isStudent
      ? [
        {
          label: "Dashboard",
          path: "/student-dashboard",
          icon: <LayoutDashboard className="h-4 w-4" />,
        },
        {
          label: "My Applications",
          path: "/my-applications",
          icon: <Users className="h-4 w-4" />,
        },
        {
          label: "Edit Profile",
          path: "/profile",
          icon: <UserRound className="h-4 w-4" />,
        },
        {
          label: "Edit Resume",
          path: "/resume",
          icon: <FileText className="h-4 w-4" />,
        },
      ]
      : isAdmin
        ? [
          {
            label: "Dashboard",
            path: "/admin-dashboard",
            icon: <LayoutDashboard className="h-4 w-4" />,
          },
        ]
        : [];

  const closeAllMenus = () => {
    setJobsOpen(false);
    setInternshipsOpen(false);
    setCompaniesOpen(false);
    setMobileMenuOpen(false);
    setProfileOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
        {/* Mobile menu + logo */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((previous) => !previous)}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-gray-700 transition hover:bg-gray-100 lg:hidden"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          <Link to="/" className="shrink-0" onClick={closeAllMenus}>
            <div className="text-[28px] font-bold tracking-tight">
              Intern<span className="text-blue-600">Hub</span>
            </div>
          </Link>
        </div>

        {/* Desktop navigation */}
        <div className="ml-10 hidden items-center gap-7 lg:flex">
          {/* Jobs */}
          <div
            className="relative h-full"
            onMouseEnter={() => setJobsOpen(true)}
            onMouseLeave={() => setJobsOpen(false)}
          >
            <div className="flex items-center">
              <Link
                to="/jobs"
                onClick={closeAllMenus}
                className="flex h-full items-center px-2 text-md font-medium text-gray-700 transition hover:text-blue-600"
              >
                Jobs
              </Link>
              <button
                type="button"
                onClick={() => setJobsOpen((previous) => !previous)}
                aria-label="Toggle jobs menu"
                aria-expanded={jobsOpen}
                className="flex h-full cursor-pointer items-center px-1 text-gray-600 hover:text-blue-600"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${jobsOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            {jobsOpen && (
              <div className="absolute left-0 top-full z-50 pt-2">
                <div className="w-130 rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
                  <div className="grid grid-cols-3 gap-6">
                    {Object.entries(jobsMenu).map(([section, items]) => (
                      <div key={section}>
                        <h3 className="mb-3 text-sm font-semibold text-gray-900">{section}</h3>
                        <div className="space-y-1">
                          {items.map((item) => (
                            <Link
                              key={item.label}
                              to={item.path}
                              onClick={closeAllMenus}
                              className="block rounded-md px-2 py-1.5 text-sm text-gray-600 transition hover:bg-blue-50 hover:text-blue-600"
                            >
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Internships */}
          <div
            className="relative h-full"
            onMouseEnter={() => setInternshipsOpen(true)}
            onMouseLeave={() => setInternshipsOpen(false)}
          >
            <div className="flex items-center">
              <Link
                to="/jobs?jobType=Internship"
                onClick={closeAllMenus}
                className="flex h-full items-center px-2 text-md font-medium text-gray-700 transition hover:text-blue-600"
              >
                Internships
              </Link>
              <button
                type="button"
                onClick={() => setInternshipsOpen((previous) => !previous)}
                aria-label="Toggle internships menu"
                aria-expanded={internshipsOpen}
                className="flex h-full cursor-pointer items-center px-1 text-gray-600 hover:text-blue-600"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${internshipsOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            {internshipsOpen && (
              <div className="absolute left-0 top-full z-50 pt-2">
                <div className="w-140 rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
                  <div className="grid grid-cols-3 gap-6">
                    {Object.entries(internshipsMenu).map(([section, items]) => (
                      <div key={section}>
                        <h3 className="mb-3 text-sm font-semibold text-gray-900">{section}</h3>
                        <div className="space-y-1">
                          {items.map((item) => (
                            <Link
                              key={item.label}
                              to={item.path}
                              onClick={closeAllMenus}
                              className="block rounded-md px-2 py-1.5 text-sm text-gray-600 transition hover:bg-blue-50 hover:text-blue-600"
                            >
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Companies */}
          <div
            className="relative h-full"
            onMouseEnter={() => setCompaniesOpen(true)}
            onMouseLeave={() => setCompaniesOpen(false)}
          >
            <div className="flex items-center">
              <Link
                to="/companies"
                onClick={closeAllMenus}
                className="flex h-full items-center px-2 text-md font-medium text-gray-700 transition hover:text-blue-600"
              >
                Companies
              </Link>
              <button
                type="button"
                onClick={() => setCompaniesOpen((previous) => !previous)}
                aria-label="Toggle companies menu"
                aria-expanded={companiesOpen}
                className="flex h-full cursor-pointer items-center px-1 text-gray-600 hover:text-blue-600"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${companiesOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            {companiesOpen && (
              <div className="absolute left-0 top-full z-50 pt-2">
                <div className="w-90 rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
                  {Object.entries(companiesMenu).map(([section, items]) => (
                    <div key={section}>
                      <h3 className="mb-3 text-sm font-semibold text-gray-900">{section}</h3>
                      <div className="space-y-1">
                        {items.map((item) => (
                          <Link
                            key={item.label}
                            to={item.path}
                            onClick={closeAllMenus}
                            className="block rounded-md px-2 py-1.5 text-sm text-gray-600 transition hover:bg-blue-50 hover:text-blue-600"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="ml-auto hidden w-full max-w-sm md:block">
          <div className="relative">
            <Input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search jobs, internships..."
              className="h-10 pr-12"
            />
            <Button
              type="submit"
              size="icon"
              aria-label="Search"
              className="absolute right-1 top-1 h-8 w-8"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </form>

        {/* Login / user menu */}
        <div className="flex shrink-0 items-center gap-3">
          {user ? (
            <>
              <button
                type="button"
                onClick={() => navigate("/notifications")}
                aria-label={
                  unreadNotificationCount > 0
                    ? `Notifications, ${unreadNotificationCount} unread`
                    : "Notifications"
                }
                className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100 hover:text-blue-600"
              >
                <Bell className="h-5 w-5" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                  </span>
                )}
              </button>

              <div
                className="relative"
                ref={profileMenuRef}
                onMouseEnter={() => setProfileOpen(true)}
                onMouseLeave={() => setProfileOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setProfileOpen(true)}
                  aria-label="Open account menu"
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full p-1 transition hover:bg-gray-100"
                >
                  <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-blue-500 text-md font-bold uppercase text-gray-500">
                    {profilePictureUrl ? (
                      <img src={profilePictureUrl} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      avatarInitial
                    )}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform ${profileOpen ? "rotate-180" : ""}`} />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-full z-50 w-72 pt-2">
                    <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-xl shadow-slate-200/60" role="menu">
                      {/* Account identity */}
                      <div className="mb-1 border-b border-gray-100 px-3 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-blue-100 bg-blue-50 text-sm font-bold uppercase text-blue-700">
                            {profilePictureUrl ? (
                              <img src={profilePictureUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              avatarInitial
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-gray-900">
                              {displayName}
                            </p>
                            <p className="truncate text-xs text-gray-500">{user.email}</p>
                            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-blue-600">
                              {isCompany ? "" : isStudent ? "" : isAdmin ? "" : "Account"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Role-specific account links */}
                      <div className="space-y-0.5 py-1">
                        {accountMenuItems.map((item) => (
                          <Link
                            key={item.path}
                            to={item.path}
                            role="menuitem"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-blue-50 hover:text-blue-700"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 transition group-hover:bg-white group-hover:text-blue-600">
                              {item.icon}
                            </span>
                            <span>{item.label}</span>
                          </Link>
                        ))}
                        {accountMenuItems.length === 0 && (
                          <p className="px-3 py-2 text-xs text-slate-400">
                            Account options are unavailable because the profile role could not be loaded.
                          </p>
                        )}
                      </div>

                      <div className="my-1 border-t border-gray-100" />

                      {/* Common links */}
                      <Link
                        to="/settings"
                        role="menuitem"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:text-blue-700"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                          <Settings className="h-4 w-4" />
                        </span>
                        Settings
                      </Link>
                      <Link
                        to="/help"
                        role="menuitem"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:text-blue-700"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                          <LifeBuoy className="h-4 w-4" />
                        </span>
                        Help Center
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        className="mt-1 flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500">
                          <LogOut className="h-4 w-4" />
                        </span>
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <LoginDialog />
              <Button
                type="button"
                className="h-11 bg-blue-600 px-6 font-bold hover:bg-blue-700"
              >
                <Link to="/signup">Register</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="border-t border-gray-200 bg-white shadow-md lg:hidden"
        >
          <div className="space-y-1 px-4 py-3">
            <form onSubmit={handleSearch} className="mb-3">
              <div className="relative">
                <Input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search jobs, internships..."
                  className="h-11 pr-12"
                />
                <Button
                  type="submit"
                  size="icon"
                  aria-label="Search"
                  className="absolute right-1 top-1 h-9 w-9"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </form>

            <Link
              to="/jobs"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              Jobs
            </Link>
            <Link
              to="/jobs?jobType=Internship"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              Internships
            </Link>
            <Link
              to="/companies"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              Companies
            </Link>
            <Link
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              About
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;