import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ALL_ROLES, ROLE_LABELS } from "@/lib/roles";
import type { AuthResponse } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(ALL_ROLES, { message: "Select a role" }),
  department: z.string().optional(),
  site: z.string().optional(),
});
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { setSession } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const mutation = useMutation({
    mutationFn: (input: RegisterFormValues) => api.post<AuthResponse>("/auth/register", input, { skipAuth: true }),
    onSuccess: (data) => {
      setSession(data.token, data.user);
      navigate("/", { replace: true });
    },
  });

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>Join InternFlow AI</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" autoComplete="name" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="role" className="w-full">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
            </div>
            {mutation.isError && (
              <p className="text-sm text-destructive">
                {mutation.error instanceof ApiError ? mutation.error.message : "Something went wrong."}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          Already have an account?
          <Link to="/login" className="ml-1 font-medium text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
