import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Resume from "./pages/Resume";
import PostJob from "./pages/PostJob";
import Jobs from "./pages/Jobs";
import JobDetails from "./pages/JobDetails";
import MyApplications from "./pages/MyApplications";
import StudentDashboard from "./pages/StudentDashboard";
import JobApplicants from "./pages/JobApplicants";
import EditJob from "./pages/EditJob";
import CompanyDashboard from "./pages/CompanyDashboard";
import CompanyJobs from "./pages/CompanyJobs";
import AdminDashboard from "./pages/AdminDashboard";
import Companies from "./pages/Companies";
import Notifications from "./pages/Notifications";
import SettingsPage from "./pages/Settings";
import HelpCenter from "./pages/HelpCenter";
import { account } from "./lib/account";
import { AUTH_STATE_CHANGED_EVENT } from "./lib/authEvents";

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

function AppShell() {
  const [navbarVersion, setNavbarVersion] = useState(0);

  useEffect(() => {
    const handleAuthStateChanged = () => {
      setNavbarVersion((version) => version + 1);
    };

    window.addEventListener(AUTH_STATE_CHANGED_EVENT, handleAuthStateChanged);
    return () => window.removeEventListener(AUTH_STATE_CHANGED_EVENT, handleAuthStateChanged);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar key={navbarVersion} />

      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />

          <Route path="/jobs" element={<RequireLogin><Jobs /></RequireLogin>} />
          <Route path="/job-details/:jobId" element={<RequireLogin><JobDetails /></RequireLogin>} />
          <Route path="/companies" element={<RequireLogin><Companies /></RequireLogin>} />
          <Route path="/my-applications" element={<RequireLogin><MyApplications /></RequireLogin>} />
          <Route path="/notifications" element={<RequireLogin><Notifications /></RequireLogin>} />
          <Route path="/settings" element={<RequireLogin><SettingsPage /></RequireLogin>} />
          <Route path="/help" element={<RequireLogin><HelpCenter /></RequireLogin>} />
          <Route path="/profile" element={<RequireLogin><Profile /></RequireLogin>} />
          <Route path="/resume" element={<RequireLogin><Resume /></RequireLogin>} />

          <Route
            path="/post-job"
            element={
              <RequireLogin>
                <ProtectedRoute allowedRole="company"><PostJob /></ProtectedRoute>
              </RequireLogin>
            }
          />
          <Route
            path="/job-applicants/:jobId"
            element={
              <RequireLogin>
                <ProtectedRoute allowedRole="company"><JobApplicants /></ProtectedRoute>
              </RequireLogin>
            }
          />
          <Route
            path="/student-dashboard"
            element={
              <RequireLogin>
                <ProtectedRoute allowedRole="student"><StudentDashboard /></ProtectedRoute>
              </RequireLogin>
            }
          />
          <Route
            path="/edit-job/:jobId"
            element={
              <RequireLogin>
                <ProtectedRoute allowedRole="company"><EditJob /></ProtectedRoute>
              </RequireLogin>
            }
          />
          <Route
            path="/company-dashboard"
            element={
              <RequireLogin>
                <ProtectedRoute allowedRole="company"><CompanyDashboard /></ProtectedRoute>
              </RequireLogin>
            }
          />
          <Route
            path="/company-jobs"
            element={
              <RequireLogin>
                <ProtectedRoute allowedRole="company"><CompanyJobs /></ProtectedRoute>
              </RequireLogin>
            }
          />
          <Route
            path="/admin-dashboard"
            element={
              <RequireLogin>
                <ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>
              </RequireLogin>
            }
          />
        </Routes>
      </div>

      <Footer />
    </div>
  );
}

function RequireLogin({ children }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let active = true;

    account.get()
      .then(() => {
        if (active) setStatus("authenticated");
      })
      .catch(() => {
        if (active) setStatus("guest");
      });

    return () => {
      active = false;
    };
  }, []);

  if (status === "checking") {
    return (
      <main className="flex min-h-[55vh] items-center justify-center px-4 py-12">
        <p className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600 shadow-sm">
          Checking your sign-in…
        </p>
      </main>
    );
  }

  if (status === "guest") {
    return <Navigate to="/?login=true" replace />;
  }

  return children;
}

export default App;
