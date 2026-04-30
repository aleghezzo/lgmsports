import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  CalendarDays,
  ShieldOff,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { useAuth } from "@/auth/AuthContext";
import {
  useAddImmunityByNickName,
  useAddPlayer,
  useEvents,
  useImmunities,
  useRemoveImmunity,
  useRemovePlayer,
} from "@/api/hooks";
import { isPlayerAttending } from "@/lib/event-utils";
import { formatGameDate } from "@/lib/format";
import { EventCreateDialog } from "@/components/EventCreateDialog";

const immunitySchema = z.object({
  nickName: z.string().min(1, "Requerido"),
});

type ImmunityForm = z.infer<typeof immunitySchema>;

function ImmunityDialog() {
  const [open, setOpen] = useState(false);
  const add = useAddImmunityByNickName();
  const { register, handleSubmit, reset, formState } = useForm<ImmunityForm>({
    resolver: zodResolver(immunitySchema),
    defaultValues: { nickName: "" },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="h-4 w-4" />
          Agregar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva inmunidad</DialogTitle>
          <DialogDescription>Apodo del jugador.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(async (values) => {
            try {
              await add.mutateAsync(values.nickName);
              reset();
              setOpen(false);
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : "Error al agregar",
              );
            }
          })}
          className="flex flex-col gap-4"
        >
          <Input placeholder="Apodo" autoFocus {...register("nickName")} />
          {formState.errors.nickName && (
            <p className="text-xs text-destructive">
              {formState.errors.nickName.message}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={add.isPending}>
              {add.isPending ? "Agregando…" : "Agregar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const events = useEvents(0);
  const immunities = useImmunities(isAdmin);

  return (
    <div className="grid gap-6">
      <Hero />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="grid gap-6 lg:col-span-3">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Próximos eventos
                </CardTitle>
                <CardDescription>
                  Inscribite o creá uno nuevo.
                </CardDescription>
              </div>
              <EventCreateDialog />
            </CardHeader>
            <CardContent>
              {events.isLoading ? (
                <p className="text-sm text-muted-foreground">Cargando…</p>
              ) : events.data && events.data.length > 0 ? (
                <ul className="flex flex-col divide-y divide-border/60">
                  {events.data.map((event) => {
                    const playing = user
                      ? isPlayerAttending(user.playerId, event)
                      : false;
                    return (
                      <EventListItem
                        key={event.id}
                        eventId={event.id}
                        title={event.type.name}
                        date={event.date}
                        playing={playing}
                        playerId={user?.playerId}
                        onClick={() => navigate(`/event/${event.id}`)}
                      />
                    );
                  })}
                </ul>
              ) : (
                <p className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                  No hay eventos por ahora :(
                </p>
              )}
            </CardContent>
          </Card>

          {isAdmin && (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldOff className="h-5 w-5 text-accent" />
                    Inmunidades
                  </CardTitle>
                  <CardDescription>
                    Jugadores con inmunidad activa.
                  </CardDescription>
                </div>
                <ImmunityDialog />
              </CardHeader>
              <CardContent>
                <ImmunityList />
                {immunities.isLoading && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Cargando…
                  </p>
                )}
              </CardContent>
            </Card>
          )}

        </div>

        <div className="grid gap-6 lg:col-span-2">
          <RulesCard />
        </div>
      </div>
    </div>
  );
}

function Hero() {
  const { user } = useAuth();
  return (
    <Card className="overflow-hidden border-primary/20">
      <CardContent className="flex flex-col items-start gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <Badge variant="success" className="mb-3">
            Hola{user ? `, ${user.username}` : ""}
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
            Anotate al próximo partido y reservá tu lugar.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Mirá los eventos disponibles, sumate con un click y revisá las
            reglas de los sorteos.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <EventCreateDialog
            trigger={
              <Button size="lg" className="font-semibold">
                Crear evento
              </Button>
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

function EventListItem({
  eventId,
  title,
  date,
  playing,
  playerId,
  onClick,
}: {
  eventId: number;
  title: string;
  date: string;
  playing: boolean;
  playerId: number | undefined;
  onClick: () => void;
}) {
  const add = useAddPlayer(eventId);
  const remove = useRemovePlayer(eventId);

  async function toggle() {
    if (!playerId) return;
    try {
      if (playing) {
        await remove.mutateAsync(playerId);
      } else {
        await add.mutateAsync({ id: playerId });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 flex-col items-start text-left"
      >
        <span className="truncate text-sm font-medium text-foreground hover:text-primary">
          {title}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatGameDate(date)}
        </span>
      </button>
      <Button
        size="sm"
        variant={playing ? "outline" : "default"}
        onClick={toggle}
        disabled={!playerId || add.isPending || remove.isPending}
      >
        {playing ? (
          <>
            <UserMinus className="h-4 w-4" />
            Abandonar
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            Participar
          </>
        )}
      </Button>
    </li>
  );
}

function ImmunityList() {
  const immunities = useImmunities();
  const remove = useRemoveImmunity();
  if (!immunities.data || immunities.data.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
        No hay jugadores con inmunidad.
      </p>
    );
  }
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {immunities.data.map((p) => (
        <li
          key={p.id}
          className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-secondary/40 px-3 py-2 text-sm"
        >
          <span className="truncate font-medium">{p.nickName}</span>
          <Button
            size="icon"
            variant="ghost"
            onClick={async () => {
              try {
                await remove.mutateAsync(p.id);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Error");
              }
            }}
            aria-label="Remover"
          >
            <X className="h-4 w-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}

function RulesCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reglas</CardTitle>
        <CardDescription>Cómo funcionan los sorteos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <div>
          <p className="font-semibold text-foreground">Horario</p>
          <p>Miércoles 19:00.</p>
        </div>
        <div>
          <p className="font-semibold text-foreground">Inscripción</p>
          <p>
            Todos los jueves se crea un evento. Según la cantidad de canchas se
            buscan 10 o 20 jugadores con la siguiente distribución:
          </p>
          <ul className="ml-5 mt-1 list-disc">
            <li>6 o 12 mujeres</li>
            <li>4 u 8 hombres</li>
          </ul>
          <p>
            Si se supera el cupo se realiza un sorteo. Quienes no quedan
            seleccionados reciben inmunidad para el siguiente evento.
          </p>
        </div>
        <div>
          <p className="font-semibold text-foreground">Sorteo</p>
          <p>
            Se realiza por la página, eligiendo al azar entre quienes no tienen
            inmunidad.
          </p>
        </div>
        <div>
          <p className="font-semibold text-foreground">Inmunidad</p>
          <p>
            Quien pierde un sorteo recibe inmunidad para el siguiente partido
            que se inscriba. La inmunidad se consume al inscribirse, sin
            importar la cantidad de jugadores. Si hay sorteo, la persona con
            inmunidad no entra al pool de descarte.
          </p>
        </div>
        <div>
          <p className="font-semibold text-foreground">Prioridades</p>
          <p>
            El jueves tiene prioridad la gente del grupo de WhatsApp. Si el
            viernes faltan jugadores, se invita gente externa.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
