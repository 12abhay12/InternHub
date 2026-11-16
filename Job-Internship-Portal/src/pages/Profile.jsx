import React, { useEffect, useState } from "react";

import { account } from "../lib/account";
import { getMyProfile } from "../lib/profile";

import StudentProfile from "./StudentProfile";
import CompanyProfile from "./CompanyProfile";

function Profile() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const currentUser = await account.get();

                const currentProfile = await getMyProfile(
                    currentUser.$id
                );

                if (!currentProfile) {
                    setError(
                        "Profile not found. Please contact support."
                    );
                    return;
                }

                setProfile(currentProfile);
            } catch (error) {
                console.error(
                    "Profile role loading failed:",
                    error
                );

                setError(
                    "Unable to load your profile."
                );
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
                <div className="text-center">

                    <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

                    <p className="text-sm text-slate-500">
                        Loading your profile...
                    </p>

                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">

                <div className="rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm">

                    <h2 className="text-lg font-semibold text-red-600">
                        Profile Error
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                        {error}
                    </p>

                </div>

            </div>
        );
    }

    if (profile?.role === "company") {
        return <CompanyProfile />;
    }

    if (profile?.role === "student") {
        return <StudentProfile />;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <div className="rounded-xl border bg-white p-6 text-center shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                    Profile Access Error
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                    Your account role is missing or invalid. Please contact support.
                </p>
            </div>
        </div>
    );
}

export default Profile;