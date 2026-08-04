import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { AuthResponse } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const mutation = useMutation({
    mutationFn: (input: LoginFormValues) => api.post<AuthResponse>("/auth/login", input, { skipAuth: true }),
    onSuccess: (data) => {
      setSession(data.token, data.user);
      const redirectTo = (location.state as { from?: string } | null)?.from ?? "/";
      navigate(redirectTo, { replace: true });
    },
  });

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">InternFlow AI</CardTitle>
          <CardDescription>Intelligent Internship Platform — sign in to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            {mutation.isError && (
              <p className="text-sm text-destructive">
                {mutation.error instanceof ApiError ? mutation.error.message : "Something went wrong."}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          Don&apos;t have an account?
          <Link to="/register" className="ml-1 font-medium text-foreground underline underline-offset-4">
            Register
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
