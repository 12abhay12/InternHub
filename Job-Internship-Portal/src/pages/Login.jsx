import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { account } from "../lib/account";
import { notifyAuthStateChanged } from "../lib/authEvents";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      await account.createEmailPasswordSession(email.trim(), password);
      notifyAuthStateChanged();

      // Home loads the signed-in user's profile and opens the matching
      // student, company, or admin workspace at the root URL.
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Login failed:", error);
      setMessage(error?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Login</Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">Welcome back</DialogTitle>
            <DialogDescription>
              Sign in to open your InternHub workspace.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </Button>

            {message && (
              <p role="alert" className="text-center text-sm text-rose-700">
                {message}
              </p>
            )}

            <p className="text-center text-sm text-slate-500">
              Don’t have an account?{" "}
              <Link
                to="/signup"
                className="font-medium text-blue-700 hover:underline"
              >
                Register
              </Link>
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Login;
