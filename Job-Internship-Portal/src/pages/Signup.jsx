import { useState } from "react";
import { ID } from "appwrite";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  GraduationCap,
  Sparkles,
} from "lucide-react";

import { account } from "../lib/account";
import { createProfile } from "../lib/profile";
import { notifyAuthStateChanged } from "../lib/authEvents";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (event) => {
    event.preventDefault();
    if (isSubmitting || isComplete) return;

    setFeedback({ type: "", text: "" });
    setIsSubmitting(true);
    let sessionCreated = false;

    try {
      const cleanName = name.trim();
      const cleanEmail = email.trim();

      const user = await account.create(
        ID.unique(),
        cleanEmail,
        password,
        cleanName
      );

      await account.createEmailPasswordSession(cleanEmail, password);
      sessionCreated = true;

      await createProfile({
        userId: user.$id,
        role,
      });

      // Refresh the persistent Navbar after the new session and role exist.
      notifyAuthStateChanged();
      setIsComplete(true);
      setFeedback({
        type: "success",
        text: "Your account is ready. Taking you to your InternHub home…",
      });

      window.setTimeout(() => {
        navigate("/", { replace: true });
      }, 900);
    } catch (error) {
      console.error("Signup failed:", error);
      // A session may exist even if profile creation failed; keep the shell in sync.
      if (sessionCreated) notifyAuthStateChanged();
      setFeedback({
        type: "error",
        text: error?.message || "Could not create your account. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative isolate flex min-h-[72vh] items-center overflow-hidden bg-linear-to-br from-slate-50 via-blue-50/70 to-indigo-50/80 px-4 py-10 sm:px-6 sm:py-14">
      {/* Soft, self-contained background accents to echo the guest landing page. */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-28 top-8 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-violet-200/40 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.18] bg-[radial-gradient(#64748b_0.7px,transparent_0.7px)] bg-size-[22px_22px]" />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(390px,0.86fr)] lg:gap-12">
        {/* Welcome panel */}
        <section className="mx-auto w-full max-w-xl lg:mx-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1.5 text-xs font-semibold text-blue-800 shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Welcome to InternHub
          </div>

          <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl lg:text-[2.8rem]">
            One account. A clearer path to your next opportunity.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-7 text-slate-600 sm:text-base">
            Join a community where students can discover active opportunities and companies can connect with emerging talent.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <SignupBenefit
              icon={<BriefcaseBusiness className="h-5 w-5" />}
              title="Explore real openings"
              text="See active jobs and internships posted on InternHub."
            />
            <SignupBenefit
              icon={<GraduationCap className="h-5 w-5" />}
              title="Build your next step"
              text="Set up a student profile and manage your applications."
            />
            <SignupBenefit
              icon={<Building2 className="h-5 w-5" />}
              title="Hiring as a company?"
              text="Choose a company account to post roles and review applicants."
            />
          </div>

          <div className="mt-7 hidden items-center gap-3 rounded-2xl border border-white/80 bg-white/60 p-4 text-sm text-slate-600 shadow-sm backdrop-blur sm:flex">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white">
              <Check className="h-5 w-5" />
            </span>
            <p className="leading-6">
              <span className="font-semibold text-slate-800">A simple place to start.</span>{" "}
              Choose your account type and create your profile in a few steps.
            </p>
          </div>
        </section>

        {/* Signup form card */}
        <section className="mx-auto w-full max-w-md">
          <Card className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl shadow-slate-900/10">
            {/* <div className="h-1.5 bg-linear-to-r from-blue-600 via-indigo-500 to-violet-500" /> */}
            <CardHeader className="px-6 pb-2 pt-6 sm:px-8 sm:pt-8">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
                Create your account
              </CardTitle>
              <CardDescription className="mt-1 text-sm leading-6 text-slate-500">
                Choose how you’ll use InternHub and get started.
              </CardDescription>
            </CardHeader>

            <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-name" className="text-sm font-medium text-slate-700">Full name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    disabled={isSubmitting || isComplete}
                    className="h-11 rounded-xl border-slate-200 focus-visible:ring-blue-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-sm font-medium text-slate-700">Email address</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    disabled={isSubmitting || isComplete}
                    className="h-11 rounded-xl border-slate-200 focus-visible:ring-blue-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-sm font-medium text-slate-700">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    disabled={isSubmitting || isComplete}
                    className="h-11 rounded-xl border-slate-200 focus-visible:ring-blue-100"
                  />
                  <p className="text-xs text-slate-400">Use a password that you haven’t used elsewhere.</p>
                </div>

                <fieldset className=" space-y-2.5 pt-1" disabled={isSubmitting || isComplete}>
                  <legend className="text-sm font-medium text-slate-700">I’m joining as a</legend>
                  <div className=" grid grid-cols-2 gap-3">
                    <RoleCard
                      selected={role === "student"}
                      onClick={() => setRole("student")}
                      icon={<GraduationCap className="h-5 w-5 " />}
                      title="Student"
                      description="Find jobs & internships"
                      
                    />
                    <RoleCard
                      selected={role === "company"}
                      onClick={() => setRole("company")}
                      icon={<Building2 className="h-5 w-5" />}
                      title="Company"
                      description="Post & manage roles"
                    />
                  </div>
                </fieldset>

                {feedback.text && (
                  <p
                    role={feedback.type === "error" ? "alert" : "status"}
                    className={`rounded-xl border px-3.5 py-3 text-sm leading-5 ${feedback.type === "error"
                      ? "border-rose-100 bg-rose-50 text-rose-700"
                      : "border-emerald-100 bg-emerald-50 text-emerald-700"
                      }`}
                  >
                    {feedback.text}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting || isComplete}
                  className="cursor-pointer h-11 w-full rounded-xl bg-blue-600 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Creating your account…" : isComplete ? "Account created" : "Create account"}
                  {!isSubmitting && !isComplete && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>

                <p className="pt-1 text-center text-sm text-slate-500">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/?login=true")}
                    className="cursor-pointer font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Log in
                  </button>
                </p>
              </form>
            </CardContent>
          </Card>
          <p className="mt-4 text-center text-xs text-slate-400">
            Your account opens the InternHub workspace for the role you choose.
          </p>
        </section>
      </div>
    </main>
  );
}

function SignupBenefit({ icon, title, text }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/80 bg-white/65 p-4 shadow-sm backdrop-blur">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">{icon}</span>
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function RoleCard({ selected, onClick, icon, title, description }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-xl border p-3.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${selected
        ? "border-blue-500 bg-blue-50/80 shadow-sm ring-1 ring-blue-100"
        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
        }`}
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${selected ? "bg-white text-blue-700" : "bg-slate-100 text-slate-500"}`}>{icon}</span>
      <span className="mt-2 block text-sm font-semibold text-slate-900">{title}</span>
      <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{description}</span>
    </button>
  );
}

export default Signup;
