import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLogin } from "@/api/hooks";
import { useAuth } from "@/auth/AuthContext";

const schema = z.object({
  userName: z.string().min(1, "Requerido"),
  password: z.string().min(1, "Requerido"),
  rememberMe: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, refresh } = useAuth();
  const next = params.get("next") || "/";
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState, setValue, watch } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: { userName: "", password: "", rememberMe: false },
    });

  const login = useLogin();

  useEffect(() => {
    if (user) navigate(next, { replace: true });
  }, [user, next, navigate]);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      await login.mutateAsync(values);
      await refresh();
      navigate(next, { replace: true });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "No se pudo iniciar sesión",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const rememberMe = watch("rememberMe");

  return (
    <div className="grid min-h-full place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_40px_-6px_color-mix(in_oklch,var(--primary)_70%,transparent)]">
            <span className="text-sm font-black">LGM</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bienvenido de vuelta
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Iniciá sesión para reservar tu lugar.
          </p>
        </div>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Iniciar sesión</CardTitle>
            <CardDescription>Usá tu cuenta de LGM Sports.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
              noValidate
            >
              <div className="grid gap-2">
                <Label htmlFor="userName">Usuario</Label>
                <Input
                  id="userName"
                  autoComplete="username"
                  autoFocus
                  {...register("userName")}
                />
                {formState.errors.userName && (
                  <p className="text-xs text-destructive">
                    {formState.errors.userName.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register("password")}
                />
                {formState.errors.password && (
                  <p className="text-xs text-destructive">
                    {formState.errors.password.message}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={(checked) =>
                    setValue("rememberMe", checked === true, {
                      shouldDirty: true,
                    })
                  }
                />
                <Label
                  htmlFor="rememberMe"
                  className="cursor-pointer text-sm font-normal text-muted-foreground"
                >
                  Recordarme
                </Label>
              </div>
              <Button type="submit" disabled={submitting} className="mt-2">
                {submitting ? "Ingresando…" : "Ingresar"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                ¿No tenés una cuenta?{" "}
                <Link
                  to="/register"
                  className="font-medium text-primary hover:underline"
                >
                  Registrate
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
