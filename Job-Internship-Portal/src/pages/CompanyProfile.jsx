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

function CompanyProfile() {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    const [errors, setErrors] = useState({});

    // =========================
    // Company fields
    // =========================

    const [companyName, setCompanyName] = useState("");
    const [email, setEmail] = useState("");
    const [companyPhone, setCompanyPhone] = useState("");
    const [companyWebsite, setCompanyWebsite] = useState("");
    const [industry, setIndustry] = useState("");
    const [companySize, setCompanySize] = useState("");
    const [foundedYear, setFoundedYear] = useState("");

    // Location
    const [companyAddress, setCompanyAddress] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [country, setCountry] = useState("");
    const [pincode, setPincode] = useState("");

    // About
    const [companyDescription, setCompanyDescription] = useState("");

    // Social
    const [linkedin, setLinkedin] = useState("");

    // Logo
    const [companyLogo, setCompanyLogo] = useState(null);
    const [companyLogoPreview, setCompanyLogoPreview] = useState("");

    // Completion
    const [profileCompletion, setProfileCompletion] = useState(0);

    // =========================
    // URL helper
    // =========================

    const normalizeUrl = (value) => {
        const trimmedValue = value.trim();

        if (!trimmedValue) {
            return "";
        }

        if (!/^https?:\/\//i.test(trimmedValue)) {
            return `https://${trimmedValue}`;
        }

        return trimmedValue;
    };

    // =========================
    // Validation
    // =========================

    const validateField = (field, value) => {
        const trimmedValue = value?.toString().trim() || "";

        switch (field) {
            case "companyName":
                if (!trimmedValue) {
                    return "Company name is required.";
                }

                if (trimmedValue.length < 2) {
                    return "Company name must contain at least 2 characters.";
                }

                if (trimmedValue.length > 100) {
                    return "Company name cannot exceed 100 characters.";
                }

                return "";

            case "companyPhone":
                if (!trimmedValue) {
                    return "Company phone number is required.";
                }

                if (!/^[6-9]\d{9}$/.test(trimmedValue)) {
                    return "Please enter a valid 10-digit Indian mobile number.";
                }

                return "";

            case "industry":
                if (!trimmedValue) {
                    return "Industry is required.";
                }

                return "";

            case "companySize":
                if (!trimmedValue) {
                    return "Please select company size.";
                }

                return "";

            case "foundedYear":
                if (!trimmedValue) {
                    return "Founded year is required.";
                }

                const year = Number(trimmedValue);
                const currentYear = new Date().getFullYear();

                if (
                    !Number.isInteger(year) ||
                    year < 1800 ||
                    year > currentYear
                ) {
                    return `Please enter a valid year between 1800 and ${currentYear}.`;
                }

                return "";

            case "companyAddress":
                if (!trimmedValue) {
                    return "Company address is required.";
                }

                if (trimmedValue.length < 5) {
                    return "Please enter a complete company address.";
                }

                return "";

            case "city":
                if (!trimmedValue) {
                    return "City is required.";
                }

                return "";

            case "state":
                if (!trimmedValue) {
                    return "State is required.";
                }

                return "";

            case "country":
                if (!trimmedValue) {
                    return "Country is required.";
                }

                return "";

            case "pincode":
                if (!trimmedValue) {
                    return "Pincode is required.";
                }

                if (!/^\d{6}$/.test(trimmedValue)) {
                    return "Please enter a valid 6-digit pincode.";
                }

                return "";

            case "companyDescription":
                if (!trimmedValue) {
                    return "Company description is required.";
                }

                if (trimmedValue.length < 30) {
                    return "Company description should contain at least 30 characters.";
                }

                if (trimmedValue.length > 1000) {
                    return "Company description cannot exceed 1000 characters.";
                }

                return "";

            case "companyWebsite":
                if (!trimmedValue) {
                    return "";
                }

                try {
                    const url = new URL(normalizeUrl(trimmedValue));

                    if (!["http:", "https:"].includes(url.protocol)) {
                        return "Please enter a valid website URL.";
                    }
                } catch {
                    return "Please enter a valid website URL.";
                }

                return "";

            case "linkedin":
                if (!trimmedValue) {
                    return "";
                }

                if (
                    !/^(https?:\/\/)?(www\.)?linkedin\.com\/(company|in)\/[a-zA-Z0-9_-]+\/?$/i.test(
                        trimmedValue
                    )
                ) {
                    return "Please enter a valid LinkedIn URL.";
                }

                return "";

            default:
                return "";
        }
    };

    // =========================
    // Validate form
    // =========================

    const validateForm = () => {
        const fieldsToValidate = {
            companyName,
            companyPhone,
            industry,
            companySize,
            foundedYear,
            companyAddress,
            city,
            state,
            country,
            pincode,
            companyDescription,
            companyWebsite,
            linkedin,
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

    // =========================
    // Individual field validation
    // =========================

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

    // =========================
    // Error component
    // =========================

    const FieldError = ({ field }) => {
        if (!errors[field]) return null;

        return (
            <p className="mt-1.5 text-xs font-medium text-red-600">
                ⚠ {errors[field]}
            </p>
        );
    };

    const getInputClass = (field) => {
        if (errors[field]) {
            return "border-red-400 focus-visible:ring-red-200";
        }

        return "";
    };

    // =========================
    // Profile completion
    // =========================

    const calculateProfileCompletion = () => {
        const fields = [
            profile?.companyLogoId,
            companyName,
            companyPhone,
            companyWebsite,
            industry,
            companySize,
            foundedYear,
            companyAddress,
            city,
            state,
            country,
            pincode,
            companyDescription,
            linkedin,
        ];

        const completedFields = fields.filter(
            (field) =>
                field &&
                field.toString().trim() !== ""
        ).length;

        return Math.round(
            (completedFields / fields.length) * 100
        );
    };

    useEffect(() => {
        setProfileCompletion(calculateProfileCompletion());
    }, [
        profile,
        companyName,
        companyPhone,
        companyWebsite,
        industry,
        companySize,
        foundedYear,
        companyAddress,
        city,
        state,
        country,
        pincode,
        companyDescription,
        linkedin,
    ]);

    // =========================
    // Load company profile
    // =========================

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const currentUser = await account.get();

                setUser(currentUser);

                const currentProfile = await getMyProfile(
                    currentUser.$id
                );

                setProfile(currentProfile);

                setEmail(currentUser.email || "");

                setCompanyName(
                    currentProfile?.companyName || ""
                );

                setCompanyPhone(
                    currentProfile?.companyPhone || ""
                );

                setCompanyWebsite(
                    currentProfile?.companyWebsite || ""
                );

                setIndustry(
                    currentProfile?.industry || ""
                );

                setCompanySize(
                    currentProfile?.companySize || ""
                );

                setFoundedYear(
                    currentProfile?.foundedYear
                        ? String(currentProfile.foundedYear)
                        : ""
                );

                setCompanyAddress(
                    currentProfile?.companyAddress || ""
                );

                setCity(
                    currentProfile?.city || ""
                );

                setState(
                    currentProfile?.state || ""
                );

                setCountry(
                    currentProfile?.country || ""
                );

                setPincode(
                    currentProfile?.pincode || ""
                );

                setCompanyDescription(
                    currentProfile?.companyDescription || ""
                );

                setLinkedin(
                    currentProfile?.linkedin || ""
                );

                if (currentProfile?.companyLogoId) {
                    const imageUrl =
                        getProfilePictureUrl(
                            currentProfile.companyLogoId
                        );

                    setCompanyLogoPreview(imageUrl);
                }
            } catch (error) {
                console.error(
                    "Company profile loading failed:",
                    error
                );
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, []);

    // =========================
    // Logo selection
    // =========================

    const handleCompanyLogoChange = (event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setMessage("Please select a valid image file.");
            return;
        }

        if (file.size > 30 * 1024 * 1024) {
            setMessage(
                "Company logo must be smaller than 30 MB."
            );
            return;
        }

        setCompanyLogo(file);

        setCompanyLogoPreview(
            URL.createObjectURL(file)
        );

        setMessage("");
    };

    // =========================
    // Save company profile
    // =========================

    const handleSaveProfile = async () => {
        setMessage("");

        const isValid = validateForm();

        if (!isValid) {
            setMessage(
                "Please fix the highlighted fields before saving."
            );

            window.scrollTo({
                top: 0,
                behavior: "smooth",
            });

            return;
        }

        try {
            setSaving(true);

            let uploadedLogo = null;

            if (companyLogo) {
                uploadedLogo =
                    await uploadProfilePicture(companyLogo);

                setCompanyLogoPreview(
                    getProfilePictureUrl(
                        uploadedLogo.$id
                    )
                );
            }

            const updatedData = {
                companyName: companyName.trim(),
                companyPhone: companyPhone.trim(),
                companyWebsite:
                    normalizeUrl(companyWebsite),
                industry: industry.trim(),
                companySize,
                foundedYear: Number(foundedYear),
                companyAddress:
                    companyAddress.trim(),
                city: city.trim(),
                state: state.trim(),
                country: country.trim(),
                pincode: pincode.trim(),
                companyDescription:
                    companyDescription.trim(),
                linkedin: normalizeUrl(linkedin),
                companyLogoId:
                    uploadedLogo?.$id ||
                    profile?.companyLogoId ||
                    "",
            };

            await updateMyProfile(
                profile.$id,
                updatedData
            );

            setProfile((previousProfile) => ({
                ...previousProfile,
                ...updatedData,
            }));

            setCompanyLogo(null);

            setMessage(
                "Company profile saved successfully ✅"
            );

            window.scrollTo({
                top: 0,
                behavior: "smooth",
            });
        } catch (error) {
            console.error(
                "Company profile save failed:",
                error
            );

            setMessage(
                "Failed to save company profile ❌"
            );
        } finally {
            setSaving(false);
        }
    };

    // =========================
    // Loading
    // =========================

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

                    <p className="text-sm text-slate-500">
                        Loading company profile...
                    </p>
                </div>
            </div>
        );
    }

    // =========================
    // UI
    // =========================

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">

                {/* Header */}

                <div className="mb-8">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-blue-700">
                                Company Profile
                            </h1>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                                Complete your company profile so
                                students can learn more about your
                                organization and opportunities.
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

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">

                    {/* Main */}

                    <div className="space-y-6">

                        {/* Company Information */}

                        <Card className="overflow-hidden border-slate-200 shadow-sm">

                            <CardHeader className="border-b border-slate-100 bg-white">
                                <CardTitle className="text-xl">
                                    Company Information
                                </CardTitle>

                                <CardDescription>
                                    Basic information about your company.
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-6 p-5 sm:p-6">

                                {/* Logo */}

                                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">

                                    <div className="flex flex-col items-center gap-5 sm:flex-row">

                                        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border-4 border-white bg-slate-200 text-3xl font-bold text-slate-500 shadow-md">

                                            {companyLogoPreview ? (
                                                <img
                                                    src={companyLogoPreview}
                                                    alt="Company Logo"
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                companyName
                                                    ? companyName
                                                        .charAt(0)
                                                        .toUpperCase()
                                                    : "C"
                                            )}

                                        </div>

                                        <div className="text-center sm:text-left">

                                            <h3 className="font-semibold text-slate-900">
                                                Company Logo
                                            </h3>

                                            <p className="mt-1 text-sm text-slate-500">
                                                Upload a professional
                                                company logo.
                                            </p>

                                            <label className="mt-3 inline-flex cursor-pointer items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700">

                                                Choose Logo

                                                <input
                                                    type="file"
                                                    accept="image/png,image/jpeg"
                                                    className="hidden"
                                                    onChange={
                                                        handleCompanyLogoChange
                                                    }
                                                />

                                            </label>

                                        </div>

                                    </div>

                                </div>

                                {/* Name + Email */}

                                <div className="grid gap-5 md:grid-cols-2">

                                    <div>
                                        <Label htmlFor="companyName">
                                            Company Name
                                        </Label>

                                        <Input
                                            id="companyName"
                                            value={companyName}
                                            onChange={(e) =>
                                                setCompanyName(
                                                    e.target.value
                                                )
                                            }
                                            onBlur={() =>
                                                handleFieldBlur(
                                                    "companyName",
                                                    companyName
                                                )
                                            }
                                            placeholder="ABC Technologies Pvt. Ltd."
                                            className={`mt-2 ${getInputClass(
                                                "companyName"
                                            )}`}
                                        />

                                        <FieldError field="companyName" />
                                    </div>

                                    <div>
                                        <Label>
                                            Company Email
                                        </Label>

                                        <Input
                                            value={email}
                                            disabled
                                            className="mt-2 bg-slate-50"
                                        />

                                        <p className="mt-1.5 text-xs text-slate-400">
                                            Email is linked to your
                                            Appwrite account.
                                        </p>
                                    </div>

                                </div>

                                {/* Phone + Website */}

                                <div className="grid gap-5 md:grid-cols-2">

                                    <div>
                                        <Label htmlFor="companyPhone">
                                            Company Phone
                                        </Label>

                                        <Input
                                            id="companyPhone"
                                            value={companyPhone}
                                            onChange={(e) =>
                                                setCompanyPhone(
                                                    e.target.value
                                                )
                                            }
                                            onBlur={() =>
                                                handleFieldBlur(
                                                    "companyPhone",
                                                    companyPhone
                                                )
                                            }
                                            placeholder="9876543210"
                                            maxLength={10}
                                            className={`mt-2 ${getInputClass(
                                                "companyPhone"
                                            )}`}
                                        />

                                        <FieldError field="companyPhone" />
                                    </div>

                                    <div>
                                        <Label htmlFor="companyWebsite">
                                            Company Website
                                        </Label>

                                        <Input
                                            id="companyWebsite"
                                            value={companyWebsite}
                                            onChange={(e) =>
                                                setCompanyWebsite(
                                                    e.target.value
                                                )
                                            }
                                            onBlur={() =>
                                                handleFieldBlur(
                                                    "companyWebsite",
                                                    companyWebsite
                                                )
                                            }
                                            placeholder="https://company.com"
                                            className={`mt-2 ${getInputClass(
                                                "companyWebsite"
                                            )}`}
                                        />

                                        <FieldError field="companyWebsite" />
                                    </div>

                                </div>

                                {/* Industry + Size */}

                                <div className="grid gap-5 md:grid-cols-2">

                                    <div>
                                        <Label htmlFor="industry">
                                            Industry
                                        </Label>

                                        <Input
                                            id="industry"
                                            value={industry}
                                            onChange={(e) =>
                                                setIndustry(
                                                    e.target.value
                                                )
                                            }
                                            onBlur={() =>
                                                handleFieldBlur(
                                                    "industry",
                                                    industry
                                                )
                                            }
                                            placeholder="Information Technology"
                                            className={`mt-2 ${getInputClass(
                                                "industry"
                                            )}`}
                                        />

                                        <FieldError field="industry" />
                                    </div>

                                    <div>
                                        <Label htmlFor="companySize">
                                            Company Size
                                        </Label>

                                        <select
                                            id="companySize"
                                            value={companySize}
                                            onChange={(e) => {
                                                setCompanySize(
                                                    e.target.value
                                                );

                                                handleFieldBlur(
                                                    "companySize",
                                                    e.target.value
                                                );
                                            }}
                                            className={`mt-2 flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ${errors.companySize
                                                    ? "border-red-400"
                                                    : "border-input"
                                                }`}
                                        >
                                            <option value="">
                                                Select company size
                                            </option>

                                            <option value="1-10">
                                                1-10 employees
                                            </option>

                                            <option value="11-50">
                                                11-50 employees
                                            </option>

                                            <option value="51-200">
                                                51-200 employees
                                            </option>

                                            <option value="201-500">
                                                201-500 employees
                                            </option>

                                            <option value="501-1000">
                                                501-1000 employees
                                            </option>

                                            <option value="1001-5000">
                                                1001-5000 employees
                                            </option>

                                            <option value="5000+">
                                                5000+ employees
                                            </option>
                                        </select>

                                        <FieldError field="companySize" />
                                    </div>

                                </div>

                                {/* Founded Year */}

                                <div className="md:w-1/2">

                                    <Label htmlFor="foundedYear">
                                        Founded Year
                                    </Label>

                                    <Input
                                        id="foundedYear"
                                        type="number"
                                        value={foundedYear}
                                        onChange={(e) =>
                                            setFoundedYear(
                                                e.target.value
                                            )
                                        }
                                        onBlur={() =>
                                            handleFieldBlur(
                                                "foundedYear",
                                                foundedYear
                                            )
                                        }
                                        placeholder="2020"
                                        min="1800"
                                        max={new Date().getFullYear()}
                                        className={`mt-2 ${getInputClass(
                                            "foundedYear"
                                        )}`}
                                    />

                                    <FieldError field="foundedYear" />

                                </div>

                            </CardContent>
                        </Card>

                        {/* Location */}

                        <Card className="overflow-hidden border-slate-200 shadow-sm">

                            <CardHeader className="border-b border-slate-100 bg-white">

                                <CardTitle className="text-xl">
                                    Company Location
                                </CardTitle>

                                <CardDescription>
                                    Where your company is located.
                                </CardDescription>

                            </CardHeader>

                            <CardContent className="space-y-6 p-5 sm:p-6">

                                <div>
                                    <Label htmlFor="companyAddress">
                                        Company Address
                                    </Label>

                                    <Textarea
                                        id="companyAddress"
                                        value={companyAddress}
                                        onChange={(e) =>
                                            setCompanyAddress(
                                                e.target.value
                                            )
                                        }
                                        onBlur={() =>
                                            handleFieldBlur(
                                                "companyAddress",
                                                companyAddress
                                            )
                                        }
                                        placeholder="Enter complete company address"
                                        rows={3}
                                        className={`mt-2 resize-none ${getInputClass(
                                            "companyAddress"
                                        )}`}
                                    />

                                    <FieldError field="companyAddress" />
                                </div>

                                <div className="grid gap-5 md:grid-cols-2">

                                    <div>
                                        <Label htmlFor="city">
                                            City
                                        </Label>

                                        <Input
                                            id="city"
                                            value={city}
                                            onChange={(e) =>
                                                setCity(
                                                    e.target.value
                                                )
                                            }
                                            onBlur={() =>
                                                handleFieldBlur(
                                                    "city",
                                                    city
                                                )
                                            }
                                            placeholder="Varanasi"
                                            className={`mt-2 ${getInputClass(
                                                "city"
                                            )}`}
                                        />

                                        <FieldError field="city" />
                                    </div>

                                    <div>
                                        <Label htmlFor="state">
                                            State
                                        </Label>

                                        <Input
                                            id="state"
                                            value={state}
                                            onChange={(e) =>
                                                setState(
                                                    e.target.value
                                                )
                                            }
                                            onBlur={() =>
                                                handleFieldBlur(
                                                    "state",
                                                    state
                                                )
                                            }
                                            placeholder="Uttar Pradesh"
                                            className={`mt-2 ${getInputClass(
                                                "state"
                                            )}`}
                                        />

                                        <FieldError field="state" />
                                    </div>

                                </div>

                                <div className="grid gap-5 md:grid-cols-2">

                                    <div>
                                        <Label htmlFor="country">
                                            Country
                                        </Label>

                                        <Input
                                            id="country"
                                            value={country}
                                            onChange={(e) =>
                                                setCountry(
                                                    e.target.value
                                                )
                                            }
                                            onBlur={() =>
                                                handleFieldBlur(
                                                    "country",
                                                    country
                                                )
                                            }
                                            placeholder="India"
                                            className={`mt-2 ${getInputClass(
                                                "country"
                                            )}`}
                                        />

                                        <FieldError field="country" />
                                    </div>

                                    <div>
                                        <Label htmlFor="pincode">
                                            Pincode
                                        </Label>

                                        <Input
                                            id="pincode"
                                            value={pincode}
                                            onChange={(e) =>
                                                setPincode(
                                                    e.target.value
                                                )
                                            }
                                            onBlur={() =>
                                                handleFieldBlur(
                                                    "pincode",
                                                    pincode
                                                )
                                            }
                                            placeholder="221001"
                                            maxLength={6}
                                            className={`mt-2 ${getInputClass(
                                                "pincode"
                                            )}`}
                                        />

                                        <FieldError field="pincode" />
                                    </div>

                                </div>

                            </CardContent>
                        </Card>

                        {/* About Company */}

                        <Card className="overflow-hidden border-slate-200 shadow-sm">

                            <CardHeader className="border-b border-slate-100 bg-white">

                                <CardTitle className="text-xl">
                                    About Company
                                </CardTitle>

                                <CardDescription>
                                    Tell students about your company,
                                    work culture and opportunities.
                                </CardDescription>

                            </CardHeader>

                            <CardContent className="space-y-6 p-5 sm:p-6">

                                <div>

                                    <Label htmlFor="companyDescription">
                                        Company Description
                                    </Label>

                                    <Textarea
                                        id="companyDescription"
                                        value={companyDescription}
                                        onChange={(e) =>
                                            setCompanyDescription(
                                                e.target.value
                                            )
                                        }
                                        onBlur={() =>
                                            handleFieldBlur(
                                                "companyDescription",
                                                companyDescription
                                            )
                                        }
                                        placeholder="Tell students about your company, products, services, work culture and career opportunities..."
                                        rows={7}
                                        maxLength={1000}
                                        className={`mt-2 resize-none ${getInputClass(
                                            "companyDescription"
                                        )}`}
                                    />

                                    <div className="mt-1.5 flex justify-between">

                                        <FieldError field="companyDescription" />

                                        <span className="ml-auto text-xs text-slate-400">
                                            {companyDescription.length}/1000
                                        </span>

                                    </div>

                                </div>

                            </CardContent>
                        </Card>

                        {/* Online Profile */}

                        <Card className="overflow-hidden border-slate-200 shadow-sm">

                            <CardHeader className="border-b border-slate-100 bg-white">

                                <CardTitle className="text-xl">
                                    Professional Links
                                </CardTitle>

                                <CardDescription>
                                    Add your company's professional
                                    online presence.
                                </CardDescription>

                            </CardHeader>

                            <CardContent className="space-y-5 p-5 sm:p-6">

                                <div>

                                    <Label htmlFor="linkedin">
                                        LinkedIn Company URL
                                    </Label>

                                    <Input
                                        id="linkedin"
                                        value={linkedin}
                                        onChange={(e) =>
                                            setLinkedin(
                                                e.target.value
                                            )
                                        }
                                        onBlur={() =>
                                            handleFieldBlur(
                                                "linkedin",
                                                linkedin
                                            )
                                        }
                                        placeholder="https://linkedin.com/company/your-company"
                                        className={`mt-2 ${getInputClass(
                                            "linkedin"
                                        )}`}
                                    />

                                    <FieldError field="linkedin" />

                                </div>

                            </CardContent>
                        </Card>

                        {/* Save */}

                        <div className="flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-end">

                            {message && (
                                <div
                                    className={`text-sm font-medium sm:mr-auto ${message.includes(
                                        "successfully"
                                    )
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
                                onClick={() =>
                                    window.location.reload()
                                }
                                className="cursor-pointer"
                            >
                                Cancel
                            </Button>

                            <Button
                                type="button"
                                onClick={handleSaveProfile}
                                disabled={saving}
                                className="cursor-pointer min-w-32 bg-blue-600 hover:bg-blue-700"
                            >
                                {saving
                                    ? "Saving..."
                                    : "Save Profile"}
                            </Button>

                        </div>
                    </div>

                    {/* Sidebar */}

                    <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">

                        {/* Preview */}

                        <Card className="overflow-hidden border-slate-200 shadow-sm">

                            <CardHeader>
                                <CardTitle>
                                    Company Preview
                                </CardTitle>

                                <CardDescription>
                                    How your company profile currently
                                    looks.
                                </CardDescription>
                            </CardHeader>

                            <CardContent>

                                <div className="flex items-center gap-4">

                                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-900 text-xl font-bold text-white">

                                        {companyLogoPreview ? (
                                            <img
                                                src={companyLogoPreview}
                                                alt="Company Logo"
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            companyName
                                                ? companyName
                                                    .charAt(0)
                                                    .toUpperCase()
                                                : "C"
                                        )}

                                    </div>

                                    <div className="min-w-0">

                                        <h3 className="truncate font-semibold text-slate-900">
                                            {companyName ||
                                                "Your Company"}
                                        </h3>

                                        <p className="mt-1 text-sm text-slate-500">
                                            {industry ||
                                                "Industry"}
                                        </p>

                                        {city && (
                                            <p className="mt-1 truncate text-xs text-slate-400">
                                                {city}
                                                {state
                                                    ? `, ${state}`
                                                    : ""}
                                            </p>
                                        )}

                                    </div>

                                </div>

                                {companyDescription && (
                                    <p className="mt-5 line-clamp-4 text-sm leading-6 text-slate-600">
                                        {companyDescription}
                                    </p>
                                )}

                                {companySize && (
                                    <div className="mt-5">

                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Company Size
                                        </p>

                                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                                            {companySize}
                                        </span>

                                    </div>
                                )}

                            </CardContent>
                        </Card>

                        {/* Completion */}

                        <Card className="border-slate-200 shadow-sm">

                            <CardHeader>
                                <CardTitle>
                                    Profile Completion
                                </CardTitle>
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
                                        style={{
                                            width: `${profileCompletion}%`,
                                        }}
                                    />

                                </div>

                                <p className="mt-3 text-xs leading-5 text-slate-400">
                                    Complete your company profile to
                                    build trust with students and
                                    attract better applicants.
                                </p>

                            </CardContent>
                        </Card>

                        {/* Tips */}

                        <Card className="border-slate-200 shadow-sm">

                            <CardHeader>
                                <CardTitle>
                                    Company Profile Tips
                                </CardTitle>
                            </CardHeader>

                            <CardContent>

                                <ul className="space-y-3 text-sm text-slate-600">

                                    <li className="flex gap-2">
                                        <span>✓</span>
                                        <span>
                                            Upload a clear company logo.
                                        </span>
                                    </li>

                                    <li className="flex gap-2">
                                        <span>✓</span>
                                        <span>
                                            Keep company information
                                            accurate.
                                        </span>
                                    </li>

                                    <li className="flex gap-2">
                                        <span>✓</span>
                                        <span>
                                            Add your website and
                                            LinkedIn page.
                                        </span>
                                    </li>

                                    <li className="flex gap-2">
                                        <span>✓</span>
                                        <span>
                                            Write a clear company
                                            description.
                                        </span>
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

export default CompanyProfile;