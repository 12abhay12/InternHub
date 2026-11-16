import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { account } from "@/lib/account";
import { getMyProfile } from "@/lib/profile";
const ADMIN_USER_ID = "6aca104d0031661718d6";

function ProtectedRoute({ allowedRole, children }) {
  const [checking, setChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    let active = true;

    const checkAccess = async () => {
      try {
        const currentUser = await account.get();
        const currentProfile = await getMyProfile(
          currentUser.$id
        );

        if (active) {
          const isCorrectRole = currentProfile?.role === allowedRole;

          const isAuthorizedAdmin =
            allowedRole !== "admin" ||
            currentUser.$id === ADMIN_USER_ID;

          setHasAccess(isCorrectRole && isAuthorizedAdmin);
        }
      } catch (error) {
        console.error("Access check failed:", error);

        if (active) {
          setHasAccess(false);
        }
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    };

    checkAccess();

    return () => {
      active = false;
    };
  }, [allowedRole]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="mt-3 text-sm text-slate-500">
            Checking access...
          </p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return <Navigate to="/jobs" replace />;
  }

  return children;
}

export default ProtectedRoute;

