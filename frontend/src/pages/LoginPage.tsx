import { zodResolver } from "@hookform/resolvers/zod";
import { Activity, LogIn } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { getErrorMessage } from "../api/client";
import { useAuth } from "../auth/useAuth";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "reception@clinic.com",
      password: "password123",
    },
  });

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function onSubmit(values: LoginFormValues): Promise<void> {
    setError("");
    setSuccessMessage("");

    try {
      await login(values.email, values.password);
      setSuccessMessage("Login successful. Redirecting...");
      toast.success("Welcome back", { description: "You are now signed in." });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      const msg = getErrorMessage(error, "Please verify email and password.");
      setError("Login failed. Please check credentials.");
      toast.error("Login failed", { description: msg });
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <section className="animate-soft-in hidden px-10 py-14 lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
              Clinic OS
            </p>
            <h1 className="max-w-xl text-5xl font-semibold leading-tight text-slate-900">
              A calm, precise workspace for busy reception teams.
            </h1>
            <p className="max-w-lg text-base text-slate-600">
              Coordinate schedules, manage patient records, and keep every shift
              in control with a focused operations dashboard.
            </p>
          </div>

          <div className="grid max-w-xl grid-cols-3 gap-3">
            <div className="rounded-md border border-slate-300 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Average wait
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">12m</p>
            </div>
            <div className="rounded-md border border-slate-300 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Today visits
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">43</p>
            </div>
            <div className="rounded-md border border-slate-300 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Desk status
              </p>
              <p className="mt-1 text-2xl font-semibold text-emerald-700">
                Live
              </p>
            </div>
          </div>
        </section>

        <section className="grid place-items-center px-4 py-10">
          <Card className="animate-fade-up w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Activity className="h-6 w-6 text-blue-700" />
                Clinic Management
              </CardTitle>
              <CardDescription>Reception console login</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...register("email")} />
                  {errors.email ? (
                    <p className="text-xs text-rose-600">
                      {errors.email.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    {...register("password")}
                  />
                  {errors.password ? (
                    <p className="text-xs text-rose-600">
                      {errors.password.message}
                    </p>
                  ) : null}
                </div>

                {error ? (
                  <p className="text-sm text-rose-600">{error}</p>
                ) : null}
                {successMessage ? (
                  <p className="text-sm text-emerald-600">{successMessage}</p>
                ) : null}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </Button>

                <p className="text-xs text-slate-500">
                  Demo: reception@clinic.com / password123
                </p>

                <p className="text-xs text-slate-500">
                  Admin Demo: admin@clinic.com / password123
                </p>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
