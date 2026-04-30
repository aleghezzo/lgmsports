import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GAME_TYPE_OPTIONS } from "@/api/types";
import { useCreateEvent } from "@/api/hooks";
import { nextWednesdayISO } from "@/lib/format";

const schema = z.object({
  typeId: z.string(),
  date: z.string().min(1, "Requerido"),
  time: z.string().min(1, "Requerido"),
});

type FormValues = z.infer<typeof schema>;

export function EventCreateDialog({
  trigger,
}: {
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const create = useCreateEvent();

  const { register, handleSubmit, control, reset, formState } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        typeId: String(GAME_TYPE_OPTIONS[0].id),
        date: nextWednesdayISO(),
        time: "19:00",
      },
    });

  async function onSubmit(values: FormValues) {
    try {
      const game = await create.mutateAsync({
        date: values.date,
        time: values.time,
        typeId: Number(values.typeId),
      });
      setOpen(false);
      reset({
        typeId: String(GAME_TYPE_OPTIONS[0].id),
        date: nextWednesdayISO(),
        time: "19:00",
      });
      navigate(`/event/${game.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="h-4 w-4" /> Crear nuevo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo evento</DialogTitle>
          <DialogDescription>
            Elegí el tipo de partido y la fecha.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="grid gap-2">
            <Label>Tipo</Label>
            <Controller
              control={control}
              name="typeId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GAME_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="date">Día</Label>
              <Input id="date" type="date" {...register("date")} />
              {formState.errors.date && (
                <p className="text-xs text-destructive">
                  {formState.errors.date.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="time">Horario</Label>
              <Input id="time" type="time" {...register("time")} />
              {formState.errors.time && (
                <p className="text-xs text-destructive">
                  {formState.errors.time.message}
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creando…" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
