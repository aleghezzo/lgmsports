import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSignup } from "@/api/hooks";
import { useAuth } from "@/auth/AuthContext";
import { GENDERS, SKILL_OPTIONS } from "@/api/types";

const schema = z.object({
  userName: z.string().min(1, "Requerido"),
  password: z.string().min(1, "Requerido"),
  nickName: z.string().min(1, "Requerido"),
  genderId: z.enum(["1", "2"]),
  skillId: z.enum(["1", "2", "3", "4"]),
  code: z.string().min(1, "Requerido"),
});

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState, control } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      userName: "",
      password: "",
      nickName: "",
      genderId: "2",
      skillId: "1",
      code: "",
    },
  });

  const signup = useSignup();

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      await signup.mutateAsync({
        userName: values.userName,
        password: values.password,
        nickName: values.nickName,
        genderId: Number(values.genderId) as 1 | 2,
        skillId: Number(values.skillId),
        code: values.code,
      });
      await refresh();
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-full place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Crear una cuenta
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sumate a la comunidad de LGM Sports.
          </p>
        </div>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Registrarse</CardTitle>
            <CardDescription>
              Completá tus datos para participar de los eventos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
              noValidate
            >
              <div className="grid gap-2">
                <Label htmlFor="userName">Usuario</Label>
                <Input id="userName" {...register("userName")} />
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
                  {...register("password")}
                />
                {formState.errors.password && (
                  <p className="text-xs text-destructive">
                    {formState.errors.password.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nickName">Apodo</Label>
                <Input id="nickName" {...register("nickName")} />
                {formState.errors.nickName && (
                  <p className="text-xs text-destructive">
                    {formState.errors.nickName.message}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Género</Label>
                  <Controller
                    control={control}
                    name="genderId"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GENDERS.map((g) => (
                            <SelectItem key={g.id} value={String(g.id)}>
                              {g.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Nivel</Label>
                  <Controller
                    control={control}
                    name="skillId"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SKILL_OPTIONS.map((o) => (
                            <SelectItem key={o.id} value={String(o.id)}>
                              {o.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="code">Código</Label>
                <Input id="code" {...register("code")} />
                {formState.errors.code && (
                  <p className="text-xs text-destructive">
                    {formState.errors.code.message}
                  </p>
                )}
              </div>
              <Button type="submit" disabled={submitting} className="mt-2">
                {submitting ? "Creando cuenta…" : "Crear cuenta"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                ¿Ya tenés una cuenta?{" "}
                <Link
                  to="/login"
                  className="font-medium text-primary hover:underline"
                >
                  Iniciá sesión
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
