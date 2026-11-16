import React, { useEffect, useState } from "react";
import { account } from "../lib/account";
import { getMyProfile, updateMyProfile } from "../lib/profile";
import {
    uploadProfilePicture,
    getProfilePictureUrl,
} from "../lib/storage";

import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function normalizeLanguages(value) {
    const languageValues = Array.isArray(value)
        ? value
        : String(value ?? "").split(",");

    return languageValues
        .map((language) => String(language ?? "").trim())
        .filter(Boolean)
        .join(", ");
}

function StudentProfile() {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [errors, setErrors] = useState({});

    // Profile fields
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [city, setCity] = useState("");
    const [dateOfBirth, setDateOfBirth] = useState("");
    const [gender, setGender] = useState("");
    const [education, setEducation] = useState("");
    const [skills, setSkills] = useState("");
    const [bio, setBio] = useState("");
    const [availability, setAvailability] = useState("");
    const [preferredJobType, setPreferredJobType] = useState("");
    const [languages, setLanguages] = useState("");
    const [linkedin, setLinkedin] = useState("");
    const [github, setGithub] = useState("");
    const [portfolio, setPortfolio] = useState("");

    // Profile image
    const [profileImage, setProfileImage] = useState(null);
    const [profileImagePreview, setProfileImagePreview] = useState("");

    // Profile completion
    const [profileCompletion, setProfileCompletion] = useState(0);

    // Validation
    const normalizeUrl = (value) => {
        const trimmedValue = value.trim();

        if (!trimmedValue) {
            return "";
        }

        // If protocol is missing, add https://
        if (!/^https?:\/\//i.test(trimmedValue)) {
            return `https://${trimmedValue}`;
        }

        return trimmedValue;
    };

    const validateField = (field, value) => {
        const trimmedValue = value?.toString().trim() || "";

        switch (field) {
            case "phone":
                if (!trimmedValue) {
                    return "Phone number is required.";
                }

                if (!/^[6-9]\d{9}$/.test(trimmedValue)) {
                    return "Please enter a valid 10-digit Indian mobile number.";
                }

                return "";

            case "name":
                if (!trimmedValue) {
                    return "Full name is required.";
                }

                if (trimmedValue.length < 2) {
                    return "Full name must contain at least 2 characters.";
                }

                if (trimmedValue.length > 60) {
                    return "Full name cannot exceed 60 characters.";
                }

                if (!/^[a-zA-Z\s.'-]+$/.test(trimmedValue)) {
                    return "Full name can contain only letters, spaces, dots and hyphens.";
                }

                return "";

            case "city":
                if (!trimmedValue) {
                    return "City is required.";
                }

                if (trimmedValue.length < 2) {
                    return "City name must contain at least 2 characters.";
                }

                if (trimmedValue.length > 50) {
                    return "City name cannot exceed 50 characters.";
                }

                return "";

            case "dateOfBirth":
                if (!trimmedValue) {
                    return "Date of birth is required.";
                }

                const selectedDate = new Date(trimmedValue);
                const today = new Date();

                if (selectedDate > today) {
                    return "Date of birth cannot be in the future.";
                }

                return "";

            case "gender":
                if (!trimmedValue) {
                    return "Please select your gender.";
                }

                return "";

            case "education":
                if (!trimmedValue) {
                    return "Education is required.";
                }

                if (trimmedValue.length < 2) {
                    return "Education must contain at least 2 characters.";
                }

                if (trimmedValue.length > 100) {
                    return "Education cannot exceed 100 characters.";
                }

                return "";

            case "skills":
                if (!trimmedValue) {
                    return "Please enter at least one skill.";
                }

                if (trimmedValue.length > 300) {
                    return "Skills cannot exceed 300 characters.";
                }

                return "";

            case "bio":
                if (!trimmedValue) {
                    return "Bio is required.";
                }

                if (trimmedValue.length < 20) {
                    return "Bio should contain at least 20 characters.";
                }

                if (trimmedValue.length > 500) {
                    return "Bio cannot exceed 500 characters.";
                }

                return "";

            case "availability":
                if (!trimmedValue) {
                    return "Please select your availability.";
                }

                return "";

            case "preferredJobType":
                if (!trimmedValue) {
                    return "Please select your preferred job type.";
                }

                return "";

            case "languages":
                if (!trimmedValue) {
                    return "Please enter at least one language.";
                }

                if (trimmedValue.length > 200) {
                    return "Languages cannot exceed 200 characters.";
                }

                return "";

            case "linkedin":
                if (!trimmedValue) {
                    return "";
                }

                if (
                    !/^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/i.test(
                        trimmedValue
                    )
                ) {
                    return "Please enter a valid LinkedIn profile URL.";
                }

                return "";

            case "github":
                if (!trimmedValue) {
                    return "";
                }

                if (
                    !/^(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9-]+\/?$/i.test(
                        trimmedValue
                    )
                ) {
                    return "Please enter a valid GitHub profile URL.";
                }

                return "";

            case "portfolio":
                if (!trimmedValue) {
                    return "";
                }

                try {
                    const normalizedPortfolio = normalizeUrl(trimmedValue);
                    const url = new URL(normalizedPortfolio);

                    if (!["http:", "https:"].includes(url.protocol)) {
                        return "Please enter a valid portfolio URL.";
                    }

                    if (!url.hostname.includes(".")) {
                        return "Please enter a valid portfolio URL.";
                    }
                } catch {
                    return "Please enter a valid portfolio URL.";
                }

                return "";

            default:
                return "";
        }
    };

    // Validate all fields
    const validateForm = () => {
        const fieldsToValidate = {
            name,
            phone,
            city,
            dateOfBirth,
            gender,
            education,
            skills,
            bio,
            availability,
            preferredJobType,
            languages,
            linkedin,
            github,
            portfolio,
        };

        const newErrors = {};

        Object.entries(fieldsToValidate).forEach(([field, value]) => {
            const error = validateField(field, value);

            if (error) {
                newErrors[field] = error;
            }
        });

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    };

    // Handle individual field validation
    const handleFieldBlur = (field, value) => {
        const error = validateField(field, value);

        setErrors((previousErrors) => {
            const updatedErrors = { ...previousErrors };

            if (error) {
                updatedErrors[field] = error;
            } else {
                delete updatedErrors[field];
            }

            return updatedErrors;
        });
    };

    // Profile completion
    const calculateProfileCompletion = () => {
        const fields = [
            profile?.profilePictureId,
            phone,
            city,
            dateOfBirth,
            gender,
            education,
            skills,
            bio,
            availability,
            preferredJobType,
            languages,
            linkedin,
            github,
            portfolio,
        ];

        const completedFields = fields.filter(
            (field) => field && field.toString().trim() !== ""
        ).length;

        return Math.round((completedFields / fields.length) * 100);
    };

    useEffect(() => {
        setProfileCompletion(calculateProfileCompletion());
    }, [
        profile,
        phone,
        city,
        dateOfBirth,
        gender,
        education,
        skills,
        bio,
        availability,
        preferredJobType,
        languages,
        linkedin,
        github,
        portfolio,
    ]);

    // Profile image selection
    const handleProfileImageChange = (event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setMessage("Please select a valid image file.");
            return;
        }

        if (file.size > 30 * 1024 * 1024) {
            setMessage("Profile image must be smaller than 30 MB.");
            return;
        }

        setProfileImage(file);
        setProfileImagePreview(URL.createObjectURL(file));
        setMessage("");
    };

    // Load profile
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const currentUser = await account.get();

                setUser(currentUser);

                const currentProfile = await getMyProfile(currentUser.$id);
                setProfile(currentProfile);

                setName(currentUser.name || "");
                setEmail(currentUser.email || "");

                setPhone(currentProfile?.phone || "");
                setCity(currentProfile?.city || "");
                setDateOfBirth(
                    currentProfile?.dateOfBirth
                        ? currentProfile.dateOfBirth.slice(0, 10)
                        : ""
                );
                setGender(currentProfile?.gender || "");
                setEducation(currentProfile?.education || "");
                setSkills(currentProfile?.skills || "");
                setBio(currentProfile?.bio || "");
                setAvailability(currentProfile?.availability || "");
                setPreferredJobType(currentProfile?.preferredJobType || "");

                // The Appwrite `languages` column is Text. Normalize legacy
                // arrays to the comma-separated string used by the form.
                setLanguages(normalizeLanguages(currentProfile?.languages));

                setLinkedin(currentProfile?.linkedin || "");
                setGithub(currentProfile?.github || "");
                setPortfolio(currentProfile?.portfolio || "");

                if (currentProfile?.profilePictureId) {
                    const imageUrl = getProfilePictureUrl(
                        currentProfile.profilePictureId
                    );
                    setProfileImagePreview(imageUrl);
                }

                console.log("Current User:", currentUser);
                console.log("Current Profile:", currentProfile);
            } catch (error) {
                console.error("Profile loading failed:", error);
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, []);

    // Save profile
    const handleSaveProfile = async () => {
        setMessage("");

        const isValid = validateForm();

        if (!isValid) {
            setMessage("Please fix the highlighted fields before saving.");
            return;
        }

        try {
            setSaving(true);

            // Update Full Name in Appwrite Account
            if (name.trim() !== user.name) {
                await account.updateName(name.trim());

                setUser((previousUser) => ({
                    ...previousUser,
                    name: name.trim(),
                }));
            }

            let uploadedImage = null;

            if (profileImage) {
                uploadedImage = await uploadProfilePicture(profileImage);

                setProfileImagePreview(
                    getProfilePictureUrl(uploadedImage.$id)
                );
            }

            const storedLanguages = normalizeLanguages(languages);

            const updatedProfileData = {
                phone: phone.trim(),
                city: city.trim(),
                dateOfBirth,
                gender,
                education: education.trim(),
                skills: skills.trim(),
                bio: bio.trim(),
                availability,
                preferredJobType,
                // Appwrite column type is Text: save a string, not an array.
                languages: storedLanguages,
                linkedin: normalizeUrl(linkedin),
                github: normalizeUrl(github),
                portfolio: normalizeUrl(portfolio),
                profilePictureId:
                    uploadedImage?.$id || profile?.profilePictureId || "",
            };

            await updateMyProfile(profile.$id, updatedProfileData);

            setProfile((previousProfile) => ({
                ...previousProfile,
                ...updatedProfileData,
            }));
            setLanguages(storedLanguages);
            setProfileImage(null);

            setMessage("Profile saved successfully ✅");

            window.scrollTo({
                top: 0,
                behavior: "smooth",
            });
        } catch (error) {
            console.error("Profile save failed:", error);
            setMessage("Failed to save profile ❌");
        } finally {
            setSaving(false);
        }
    };

    // Loading UI
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

    // Reusable error component
    const FieldError = ({ field }) => {
        if (!errors[field]) return null;

        return (
            <p className="mt-1.5 text-xs font-medium text-red-600">
                ⚠ {errors[field]}
            </p>
        );
    };

    // Reusable field classes
    const getInputClass = (field) => {
        if (errors[field]) {
            return "border-red-400 focus-visible:ring-red-200";
        }

        return "";
    };

    // UI
    return (
        <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-red-700">
                                My Profile
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                                Complete your profile to help companies
                                understand your skills and find relevant
                                opportunities.
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                            <p className="text-xs font-medium text-slate-500">
                                Profile completion
                            </p>
                            <p className="mt-1 text-2xl font-bold text-slate-900">
                                {profileCompletion}%
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                    {/* Main Form */}
                    <div className="space-y-6">
                        {/* Personal Information */}
                        <Card className="overflow-hidden border-slate-200 shadow-sm">
                            <CardHeader className="border-b border-slate-100 bg-white">
                                <CardTitle className="text-xl">
                                    Personal Information
                                </CardTitle>
                                <CardDescription>
                                    Basic information about you.
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-6 p-5 sm:p-6">
                                {/* Profile Picture */}
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                                    <div className="flex flex-col items-center gap-5 sm:flex-row">
                                        <div className="relative">
                                            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-200 text-3xl font-bold text-slate-500 shadow-md">
                                                {profileImagePreview ? (
                                                    <img
                                                        src={profileImagePreview}
                                                        alt="Profile"
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    name
                                                        ? name.charAt(0).toUpperCase()
                                                        : "A"
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-center sm:text-left">
                                            <h3 className="font-semibold text-slate-900">
                                                Profile Picture
                                            </h3>
                                            <label className="mt-3 inline-flex cursor-pointer items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
                                                Choose Image
                                                <input
                                                    type="file"
                                                    accept="image/png,image/jpeg"
                                                    className="hidden"
                                                    onChange={handleProfileImageChange}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Name + Email */}
                                <div className="grid gap-5 md:grid-cols-2">
                                    <div>
                                        <Label htmlFor="name">Full Name</Label>
                                        <Input
                                            value={name}
                                            id="name"
                                            type="text"
                                            onChange={(event) => setName(event.target.value)}
                                            onBlur={() => handleFieldBlur("name", name)}
                                            placeholder="Enter your Full name"
                                            className="mt-2 bg-slate-50"
                                        />
                                        <FieldError field="name" />
                                    </div>

                                    <div>
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input
                                            id="email"
                                            value={email}
                                            disabled
                                            className="mt-2 bg-slate-50"
                                        />
                                        <p className="mt-1.5 text-xs text-slate-400">
                                            Email cannot be changed here.
                                        </p>
                                    </div>
                                </div>

                                {/* Phone + City */}
                                <div className="grid gap-5 md:grid-cols-2">
                                    <div>
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input
                                            id="phone"
                                            value={phone}
                                            onChange={(event) => setPhone(event.target.value)}
                                            onBlur={() => handleFieldBlur("phone", phone)}
                                            placeholder="9876543210"
                                            maxLength={10}
                                            className={`mt-2 ${getInputClass("phone")}`}
                                        />
                                        <FieldError field="phone" />
                                    </div>

                                    <div>
                                        <Label htmlFor="city">City</Label>
                                        <Input
                                            id="city"
                                            value={city}
                                            onChange={(event) => setCity(event.target.value)}
                                            onBlur={() => handleFieldBlur("city", city)}
                                            placeholder="Varanasi"
                                            className={`mt-2 ${getInputClass("city")}`}
                                        />
                                        <FieldError field="city" />
                                    </div>
                                </div>

                                {/* DOB + Gender */}
                                <div className="grid gap-5 md:grid-cols-2">
                                    <div>
                                        <Label htmlFor="dateOfBirth">Date of Birth</Label>
                                        <Input
                                            id="dateOfBirth"
                                            type="date"
                                            value={dateOfBirth}
                                            onChange={(event) => setDateOfBirth(event.target.value)}
                                            onBlur={() => handleFieldBlur("dateOfBirth", dateOfBirth)}
                                            className={`mt-2 ${getInputClass("dateOfBirth")}`}
                                        />
                                        <FieldError field="dateOfBirth" />
                                    </div>

                                    <div>
                                        <Label htmlFor="gender">Gender</Label>
                                        <select
                                            id="gender"
                                            value={gender}
                                            onChange={(event) => {
                                                setGender(event.target.value);
                                                handleFieldBlur("gender", event.target.value);
                                            }}
                                            className={`mt-2 flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ${errors.gender
                                                ? "border-red-400 focus:ring-2 focus:ring-red-200"
                                                : "border-input focus:ring-2 focus:ring-slate-200"
                                                }`}
                                        >
                                            <option value="">Select gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                            <option value="Prefer not to say">Prefer not to say</option>
                                        </select>
                                        <FieldError field="gender" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Professional Information */}
                        <Card className="overflow-hidden border-slate-200 shadow-sm">
                            <CardHeader className="border-b border-slate-100 bg-white">
                                <CardTitle className="text-xl">
                                    Professional Information
                                </CardTitle>
                                <CardDescription>
                                    Tell companies about your education,
                                    skills and job preferences.
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-6 p-5 sm:p-6">
                                {/* Education */}
                                <div>
                                    <Label htmlFor="education">Education</Label>
                                    <Input
                                        id="education"
                                        value={education}
                                        onChange={(event) => setEducation(event.target.value)}
                                        onBlur={() => handleFieldBlur("education", education)}
                                        placeholder="BCA - Semester 5"
                                        className={`mt-2 ${getInputClass("education")}`}
                                    />
                                    <FieldError field="education" />
                                </div>

                                {/* Skills */}
                                <div>
                                    <Label htmlFor="skills">Skills</Label>
                                    <Input
                                        id="skills"
                                        value={skills}
                                        onChange={(event) => setSkills(event.target.value)}
                                        onBlur={() => handleFieldBlur("skills", skills)}
                                        placeholder="HTML, CSS, JavaScript, React, C++"
                                        className={`mt-2 ${getInputClass("skills")}`}
                                    />
                                    <p className="mt-1.5 text-xs text-slate-400">
                                        Separate multiple skills with commas.
                                    </p>
                                    <FieldError field="skills" />
                                </div>

                                {/* Availability + Job Type */}
                                <div className="grid gap-5 md:grid-cols-2">
                                    <div>
                                        <Label htmlFor="availability">Availability</Label>
                                        <select
                                            id="availability"
                                            value={availability}
                                            onChange={(event) => {
                                                setAvailability(event.target.value);
                                                handleFieldBlur("availability", event.target.value);
                                            }}
                                            className={`mt-2 flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ${errors.availability
                                                ? "border-red-400 focus:ring-2 focus:ring-red-200"
                                                : "border-input focus:ring-2 focus:ring-slate-200"
                                                }`}
                                        >
                                            <option value="">Select availability</option>
                                            <option value="Immediately">Immediately</option>
                                            <option value="Within 7 days">Within 7 days</option>
                                            <option value="Within 15 days">Within 15 days</option>
                                            <option value="Within 30 days">Within 30 days</option>
                                        </select>
                                        <FieldError field="availability" />
                                    </div>

                                    <div>
                                        <Label htmlFor="preferredJobType">Preferred Job Type</Label>
                                        <select
                                            id="preferredJobType"
                                            value={preferredJobType}
                                            onChange={(event) => {
                                                setPreferredJobType(event.target.value);
                                                handleFieldBlur("preferredJobType", event.target.value);
                                            }}
                                            className={`mt-2 flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ${errors.preferredJobType
                                                ? "border-red-400 focus:ring-2 focus:ring-red-200"
                                                : "border-input focus:ring-2 focus:ring-slate-200"
                                                }`}
                                        >
                                            <option value="">Select job type</option>
                                            <option value="Full-time">Full-time</option>
                                            <option value="Part-Time">Part-Time</option>
                                            <option value="Internship">Internship</option>
                                            <option value="Contract">Contract</option>
                                            <option value="Freelance">Freelance</option>
                                        </select>
                                        <FieldError field="preferredJobType" />
                                    </div>
                                </div>

                                {/* Languages */}
                                <div>
                                    <Label htmlFor="languages">Languages</Label>
                                    <Input
                                        id="languages"
                                        value={languages}
                                        onChange={(event) => setLanguages(event.target.value)}
                                        onBlur={() => handleFieldBlur("languages", languages)}
                                        placeholder="Hindi, English"
                                        className={`mt-2 ${getInputClass("languages")}`}
                                    />
                                    <p className="mt-1.5 text-xs text-slate-400">
                                        Separate multiple languages with commas.
                                    </p>
                                    <FieldError field="languages" />
                                </div>

                                {/* Bio */}
                                <div>
                                    <Label htmlFor="bio">About Me</Label>
                                    <Textarea
                                        id="bio"
                                        value={bio}
                                        onChange={(event) => setBio(event.target.value)}
                                        onBlur={() => handleFieldBlur("bio", bio)}
                                        placeholder="Write a short introduction about yourself, your interests and career goals..."
                                        rows={5}
                                        className={`mt-2 resize-none ${getInputClass("bio")}`}
                                    />
                                    <div className="mt-1.5 flex justify-between">
                                        <FieldError field="bio" />
                                        <span className="ml-auto text-xs text-slate-400">
                                            {bio.length}/500
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Online Profiles */}
                        <Card className="overflow-hidden border-slate-200 shadow-sm">
                            <CardHeader className="border-b border-slate-100 bg-white">
                                <CardTitle className="text-xl">Online Profiles</CardTitle>
                                <CardDescription>
                                    Add your professional profiles so
                                    recruiters can learn more about you.
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-5 p-5 sm:p-6">
                                <div>
                                    <Label htmlFor="linkedin">LinkedIn URL</Label>
                                    <Input
                                        id="linkedin"
                                        value={linkedin}
                                        onChange={(event) => setLinkedin(event.target.value)}
                                        onBlur={() => handleFieldBlur("linkedin", linkedin)}
                                        placeholder="https://linkedin.com/in/your-name"
                                        className={`mt-2 ${getInputClass("linkedin")}`}
                                    />
                                    <FieldError field="linkedin" />
                                </div>

                                <div>
                                    <Label htmlFor="github">GitHub URL</Label>
                                    <Input
                                        id="github"
                                        value={github}
                                        onChange={(event) => setGithub(event.target.value)}
                                        onBlur={() => handleFieldBlur("github", github)}
                                        placeholder="https://github.com/username"
                                        className={`mt-2 ${getInputClass("github")}`}
                                    />
                                    <FieldError field="github" />
                                </div>

                                <div>
                                    <Label htmlFor="portfolio">Portfolio URL</Label>
                                    <Input
                                        id="portfolio"
                                        value={portfolio}
                                        onChange={(event) => setPortfolio(event.target.value)}
                                        onBlur={() => handleFieldBlur("portfolio", portfolio)}
                                        placeholder="https://yourportfolio.com"
                                        className={`mt-2 ${getInputClass("portfolio")}`}
                                    />
                                    <FieldError field="portfolio" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Save Action */}
                        <div className="flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-end">
                            {message && (
                                <div
                                    className={`text-sm font-medium sm:mr-auto ${message.includes("successfully")
                                        ? "text-green-600"
                                        : "text-red-600"
                                        }`}
                                >
                                    {message}
                                </div>
                            )}

                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => window.location.reload()}
                                className="cursor-pointer"
                            >
                                Cancel
                            </Button>

                            <Button
                                type="button"
                                onClick={handleSaveProfile}
                                disabled={saving}
                                className="cursor-pointer min-w-32 bg-blue-600"
                            >
                                {saving ? "Saving..." : "Save Profile"}
                            </Button>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
                        {/* Profile Preview */}
                        <Card className="overflow-hidden border-slate-200 text-blue-600 shadow-sm">
                            <CardHeader>
                                <CardTitle>Profile Preview</CardTitle>
                                <CardDescription>
                                    How your profile currently looks.
                                </CardDescription>
                            </CardHeader>

                            <CardContent>
                                <div className="flex items-center gap-4">
                                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-xl font-bold text-white">
                                        {profileImagePreview ? (
                                            <img
                                                src={profileImagePreview}
                                                alt="Profile"
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            name ? name.charAt(0).toUpperCase() : "A"
                                        )}
                                    </div>

                                    <div className="min-w-0">
                                        <h3 className="truncate font-semibold text-slate-900">
                                            {name || "Your Name"}
                                        </h3>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Student
                                        </p>
                                        {education && (
                                            <p className="mt-1 truncate text-xs text-slate-400">
                                                {education}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {skills && (
                                    <div className="mt-5">
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Skills
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {skills
                                                .split(",")
                                                .map((skill, index) => (
                                                    <span
                                                        key={index}
                                                        className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                                                    >
                                                        {skill.trim()}
                                                    </span>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Completion */}
                        <Card className="border-slate-200 text-blue-600 shadow-sm">
                            <CardHeader>
                                <CardTitle>Profile Completion</CardTitle>
                            </CardHeader>

                            <CardContent>
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="text-sm text-slate-500">
                                        Completed
                                    </span>
                                    <span className="font-bold text-blue-600">
                                        {profileCompletion}%
                                    </span>
                                </div>

                                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className="h-full rounded-full bg-blue-600 transition-all duration-500"
                                        style={{ width: `${profileCompletion}%` }}
                                    />
                                </div>

                                <p className="mt-3 text-xs leading-5 text-slate-400">
                                    Complete more sections to make your
                                    profile more useful for job and
                                    internship recommendations.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Tips */}
                        <Card className="border-slate-200 text-blue-600 shadow-sm">
                            <CardHeader>
                                <CardTitle>Profile Tips</CardTitle>
                            </CardHeader>

                            <CardContent>
                                <ul className="space-y-3 text-sm text-slate-600">
                                    <li className="flex gap-2">
                                        <span>✓</span>
                                        <span>Use a clear profile picture.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span>✓</span>
                                        <span>Keep your skills updated.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span>✓</span>
                                        <span>Add your GitHub and LinkedIn.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span>✓</span>
                                        <span>Write a short professional bio.</span>
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default StudentProfile;
