import { useState } from "react";
import { Link } from "react-router-dom";
import { account } from "@/lib/account";
import { getMyProfile } from "@/lib/profile";

import {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function LoginForm({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      // 1. Login
      await account.createEmailPasswordSession(
        email,
        password
      );

      // 2. Get current user
      const currentUser = await account.get();

      console.log("Current User:", currentUser);

      // 3. Get user's profile
      const profile = await getMyProfile(
        currentUser.$id
      );

      console.log("User Profile:", profile);

      // 4. Get role
      const userRole = profile?.role;

      console.log("User Role:", userRole);

      if (!userRole) {
        setMessage("User role not found.");
        return;
      }

      setMessage(
        `Login successful ✅ Role: ${userRole}`
      );

      // Close login dialog
      setTimeout(() => {
        onLoginSuccess();
      }, 1500);

    } catch (error) {
      console.error(error);
      setMessage(error.message);
    }
  };

  return (
    <>
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-2xl">
          Welcome Back 👋
        </CardTitle>

        <CardDescription>
          Login to continue to Job & Internship Portal.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        <form onSubmit={handleLogin} className="space-y-5">

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="login-email">
              Email
            </Label>

            <Input
              id="login-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="login-password">
              Password
            </Label>

            <Input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Login button */}
          <Button
            type="submit"
            className="w-full cursor-pointer bg-blue-600"
          >
            Login
          </Button>

          {/* Message */}
          {message && (
            <p className="text-center text-sm">
              {message}
            </p>
          )}

          {/* Register */}
          <p className="text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-medium text-blue-600 hover:underline"
            >
              Register
            </Link>
          </p>

        </form>
      </CardContent>
    </>
  );
}

export default LoginForm;