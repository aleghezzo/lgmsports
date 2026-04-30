import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  CalendarDays,
  EyeOff,
  Flag,
  Mars,
  Plus,
  RefreshCcw,
  Search,
  Shuffle,
  Trash2,
  UserMinus,
  UserPlus,
  Venus,
  X,
} from "lucide-react";

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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

import { useAuth } from "@/auth/AuthContext";
import {
  useAddImmunity,
  useAddPlayer,
  useDeleteEvent,
  useEvent,
  useRemoveImmunity,
  useRemovePlayer,
  useSearchPlayers,
  useTransferPlayer,
  useUpdateEventStatus,
} from "@/api/hooks";
import { useDebounce } from "@/lib/use-debounce";
import {
  GENDERS,
  type Game,
  type GenderId,
  type Player,
  type Team,
} from "@/api/types";
import { getTotalsByGender, playersByPredicate } from "@/lib/event-utils";
import { formatGameDate } from "@/lib/format";

const TEAM_LOSERS_ID = 5;

const STATUS_LABEL: Record<number, { label: string; variant: "success" | "muted" | "secondary" }> = {
  0: { label: "Inscripción abierta", variant: "success" },
  1: { label: "Finalizado", variant: "muted" },
  3: { label: "Oculto", variant: "secondary" },
};

export function EventPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ? Number(params.id) : NaN;
  const event = useEvent(Number.isNaN(id) ? null : id);
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  if (event.isLoading) {
    return (
      <p className="rounded-xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
        Cargando evento…
      </p>
    );
  }

  if (!event.data) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No encontramos ese evento.{" "}
          <button
            className="text-primary hover:underline"
            onClick={() => navigate("/")}
          >
            Volver al inicio
          </button>
        </CardContent>
      </Card>
    );
  }

  const game = event.data;
  const status = STATUS_LABEL[game.status] ?? STATUS_LABEL[0];

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">{game.type.name}</CardTitle>
              <CardDescription className="mt-1">
                {formatGameDate(game.date)}
              </CardDescription>
            </div>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <ActionsCard
          game={game}
          isAdmin={isAdmin}
          playerId={user?.playerId}
        />
        <ParticipantsCard game={game} isAdmin={isAdmin} />
        {isAdmin && <AddExtraCard game={game} />}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <BankCard game={game} isAdmin={isAdmin} />
        <TeamsCard game={game} isAdmin={isAdmin} />
      </div>
    </div>
  );
}

function ActionsCard({
  game,
  isAdmin,
  playerId,
}: {
  game: Game;
  isAdmin: boolean;
  playerId: number | undefined;
}) {
  const navigate = useNavigate();
  const add = useAddPlayer(game.id);
  const remove = useRemovePlayer(game.id);
  const updateStatus = useUpdateEventStatus(game.id);
  const del = useDeleteEvent();
  const removeImmunity = useRemoveImmunity();
  const transfer = useTransferPlayer(game.id);
  const addImmunity = useAddImmunity();

  const playing = playerId
    ? playersByPredicate(game, (p) => p.id === playerId).length > 0
    : false;

  async function toggleSelf() {
    if (!playerId) return;
    try {
      if (playing) await remove.mutateAsync(playerId);
      else await add.mutateAsync({ id: playerId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  async function endGame() {
    try {
      // Clear immunities for everyone in teams
      for (const team of game.teams) {
        for (const p of team.players) {
          await removeImmunity.mutateAsync(p.id).catch(() => undefined);
        }
      }
      await updateStatus.mutateAsync({ status: 1 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  async function preselect() {
    try {
      const totals = getTotalsByGender(
        game,
        GENDERS.map((g) => g.id),
      );
      for (const g of GENDERS) {
        const t = totals[g.id];
        if (t.count > t.max) {
          const eligible = playersByPredicate(
            game,
            (p) => p.genderId === g.id && p.hasInmunity === 0,
          );
          const drop = randomPick(eligible, t.count - t.max);
          for (const p of drop) {
            await transfer.mutateAsync({
              playerId: p.id,
              teamId: TEAM_LOSERS_ID,
            });
            await addImmunity.mutateAsync(p.id);
          }
        }
      }
      toast.success("Preselección realizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acciones</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {game.status === 0 ? (
          <Button
            size="lg"
            variant={playing ? "outline" : "default"}
            onClick={toggleSelf}
            disabled={!playerId || add.isPending || remove.isPending}
          >
            {playing ? (
              <>
                <UserMinus className="h-4 w-4" /> Abandonar
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" /> Participar
              </>
            )}
          </Button>
        ) : (
          !isAdmin && (
            <p className="rounded-lg border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
              Sin acciones disponibles
            </p>
          )
        )}

        {isAdmin && (
          <div className="grid gap-2 pt-2">
            {game.status === 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={() => preselect()}
                >
                  <Shuffle className="h-4 w-4" /> Preseleccionar
                </Button>
                <Button variant="accent" onClick={endGame}>
                  <Flag className="h-4 w-4" /> Finalizar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => updateStatus.mutate({ status: 3 })}
                >
                  <EyeOff className="h-4 w-4" /> Ocultar
                </Button>
              </>
            )}
            {game.status !== 0 && (
              <Button
                variant="outline"
                onClick={() => updateStatus.mutate({ status: 0 })}
              >
                <RefreshCcw className="h-4 w-4" /> Reiniciar
              </Button>
            )}
            {game.status === 1 && (
              <Button
                variant="outline"
                onClick={() => updateStatus.mutate({ status: 3 })}
              >
                <EyeOff className="h-4 w-4" /> Ocultar
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={async () => {
                try {
                  await del.mutateAsync(game.id);
                  navigate("/", { replace: true });
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Error");
                }
              }}
            >
              <Trash2 className="h-4 w-4" /> Eliminar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ParticipantsCard({ game, isAdmin }: { game: Game; isAdmin: boolean }) {
  const totals = getTotalsByGender(
    game,
    GENDERS.map((g) => g.id),
  );
  return (
    <Card className={isAdmin ? "" : "lg:col-span-2"}>
      <CardHeader>
        <CardTitle>Participantes</CardTitle>
        <CardDescription>Cupos por género.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {GENDERS.map((g) => {
          const t = totals[g.id];
          return (
            <div key={g.id} className="grid gap-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{g.pluralName}</span>
                <span className="text-muted-foreground">
                  {t.count} / {t.max}
                </span>
              </div>
              <Progress value={t.percentage} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function AddExtraCard({ game }: { game: Game }) {
  const add = useAddPlayer(game.id);
  const [nickName, setNickName] = useState("");
  const [genderId, setGenderId] = useState<"1" | "2">("2");
  const debouncedSearch = useDebounce(nickName, 200);

  const search = useSearchPlayers(debouncedSearch, game.status === 0);

  // Players already in this event — hide them from the suggestion list and
  // mark them clearly if they happen to surface (search races, edge cases).
  const alreadyInEvent = new Set<number>();
  for (const p of game.teamless) alreadyInEvent.add(p.id);
  for (const t of game.teams) for (const p of t.players) alreadyInEvent.add(p.id);

  const trimmed = nickName.trim();
  const exactExists = (search.data ?? []).some(
    (p) =>
      p.nickName.toLowerCase() === trimmed.toLowerCase() &&
      String(p.genderId) === genderId,
  );
  const disabledByStatus = game.status !== 0;

  async function addExisting(p: Player) {
    try {
      await add.mutateAsync({ id: p.id });
      setNickName("");
      toast.success(`Agregaste a ${p.nickName}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  async function addNew() {
    if (!trimmed) return;
    try {
      await add.mutateAsync({
        nickName: trimmed,
        genderId: Number(genderId) as GenderId,
      });
      setNickName("");
      toast.success(`Agregaste a ${trimmed}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agregar externo</CardTitle>
        <CardDescription>
          Buscá un player existente o creá uno nuevo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="extra-nick">Apodo</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="extra-nick"
              autoComplete="off"
              placeholder="Buscar o escribir un nuevo apodo"
              className="pl-9"
              disabled={disabledByStatus}
              value={nickName}
              onChange={(e) => setNickName(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="extra-gender">Género (para crear nuevo)</Label>
          <Select
            value={genderId}
            onValueChange={(v) => setGenderId(v as "1" | "2")}
            disabled={disabledByStatus}
          >
            <SelectTrigger id="extra-gender">
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
        </div>

        <SearchResults
          search={trimmed}
          loading={search.isFetching}
          rows={(search.data ?? []).filter((p) => !alreadyInEvent.has(p.id))}
          alreadyHits={(search.data ?? []).filter((p) =>
            alreadyInEvent.has(p.id),
          )}
          onPick={addExisting}
          disabled={disabledByStatus || add.isPending}
        />

        <Button
          type="button"
          variant={exactExists ? "outline" : "default"}
          className="w-full"
          onClick={addNew}
          disabled={disabledByStatus || add.isPending || trimmed === ""}
          title={
            exactExists
              ? "Ya existe ese apodo con ese género: usá el resultado de la búsqueda."
              : undefined
          }
        >
          <Plus className="h-4 w-4" />
          {trimmed === ""
            ? "Crear nuevo"
            : `Crear nuevo "${trimmed}" (${
                GENDERS.find((g) => String(g.id) === genderId)?.name ?? ""
              })`}
        </Button>
      </CardContent>
    </Card>
  );
}

function SearchResults({
  search,
  loading,
  rows,
  alreadyHits,
  onPick,
  disabled,
}: {
  search: string;
  loading: boolean;
  rows: Player[];
  alreadyHits: Player[];
  onPick: (p: Player) => void;
  disabled: boolean;
}) {
  if (search === "") {
    return (
      <p className="rounded-lg border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground">
        Escribí para buscar.
      </p>
    );
  }
  if (loading && rows.length === 0 && alreadyHits.length === 0) {
    return <p className="text-xs text-muted-foreground">Buscando…</p>;
  }
  if (rows.length === 0 && alreadyHits.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground">
        Sin coincidencias. Podés crear uno nuevo abajo.
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <ul className="max-h-56 divide-y divide-border/60 overflow-y-auto">
        {rows.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-2 px-3 py-2 hover:bg-secondary/30"
          >
            <span className="truncate text-sm font-medium">{p.nickName}</span>
            <PlayerGenderTag genderId={p.genderId} />
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto h-7 px-2"
              onClick={() => onPick(p)}
              disabled={disabled}
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar
            </Button>
          </li>
        ))}
        {alreadyHits.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-2 px-3 py-2 text-muted-foreground"
          >
            <span className="truncate text-sm">{p.nickName}</span>
            <PlayerGenderTag genderId={p.genderId} />
            <Badge variant="outline" className="ml-auto">
              ya está en el evento
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlayerGenderTag({ genderId }: { genderId: number | null }) {
  if (genderId === 1) {
    return (
      <Badge variant="outline" className="gap-1 text-pink-300">
        <Venus className="h-3 w-3" />
        Mujer
      </Badge>
    );
  }
  if (genderId === 2) {
    return (
      <Badge variant="outline" className="gap-1 text-sky-300">
        <Mars className="h-3 w-3" />
        Hombre
      </Badge>
    );
  }
  return null;
}

function BankCard({ game, isAdmin }: { game: Game; isAdmin: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Banco</CardTitle>
        <CardDescription>Jugadores sin equipo asignado.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {GENDERS.map((g) => (
          <BankSection
            key={g.id}
            game={game}
            label={g.pluralName}
            isAdmin={isAdmin}
            filter={(p) => p.genderId === g.id}
          />
        ))}
        <BankSection
          game={game}
          label="Seguí participando"
          isAdmin={isAdmin}
          filter={(p) => !p.genderId}
          mode="immunity"
        />
      </CardContent>
    </Card>
  );
}

function BankSection({
  game,
  label,
  isAdmin,
  filter,
  mode = "transfer",
}: {
  game: Game;
  label: string;
  isAdmin: boolean;
  filter: (p: Player) => boolean;
  mode?: "transfer" | "immunity";
}) {
  const transfer = useTransferPlayer(game.id);
  const remove = useRemovePlayer(game.id);
  const removeImmunity = useRemoveImmunity();

  const players = game.teamless.filter(filter);
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {players.length === 0 ? (
        <p className="text-xs text-muted-foreground/80">—</p>
      ) : (
        <ul className="grid gap-1.5">
          {players.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-secondary/30 px-3 py-2"
            >
              <span className="truncate text-sm font-medium">
                {p.nickName}
              </span>
              {game.status === 0 && isAdmin && (
                <div className="flex shrink-0 items-center gap-1">
                  {mode === "transfer" ? (
                    <>
                      {game.teams.map((team, i) => (
                        <Button
                          key={team.id}
                          size="icon"
                          variant="outline"
                          onClick={() =>
                            transfer.mutate({
                              playerId: p.id,
                              teamId: team.id,
                            })
                          }
                          aria-label={`Asignar al equipo ${i + 1}`}
                          className="h-7 w-7 text-xs"
                        >
                          {i + 1}
                        </Button>
                      ))}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => remove.mutate(p.id)}
                        aria-label="Eliminar"
                        className="h-7 w-7"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          await transfer.mutateAsync({
                            playerId: p.id,
                            teamId: null,
                          });
                          await removeImmunity.mutateAsync(p.id);
                        } catch (err) {
                          toast.error(
                            err instanceof Error ? err.message : "Error",
                          );
                        }
                      }}
                      aria-label="Quitar inmunidad"
                      className="h-7 w-7"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TeamsCard({ game, isAdmin }: { game: Game; isAdmin: boolean }) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Equipos</CardTitle>
        <CardDescription>Distribución actual.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {game.teams.map((team, i) => (
            <TeamPanel
              key={team.id}
              team={team}
              index={i}
              game={game}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TeamPanel({
  team,
  index,
  game,
  isAdmin,
}: {
  team: Team;
  index: number;
  game: Game;
  isAdmin: boolean;
}) {
  const transfer = useTransferPlayer(game.id);
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/20">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <span className="text-sm font-semibold">Equipo {index + 1}</span>
        <Badge variant="muted">{team.players.length}</Badge>
      </div>
      {team.players.length === 0 ? (
        <p className="px-3 py-4 text-xs text-muted-foreground">Sin jugadores</p>
      ) : (
        <ul className="divide-y divide-border/40">
          {team.players.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 px-3 py-2"
            >
              <span className="truncate text-sm">{p.nickName}</span>
              {game.status === 0 && isAdmin && (
                <div className="flex shrink-0 items-center gap-1">
                  {game.teams.map((t, i) => (
                    <Button
                      key={t.id}
                      size="icon"
                      variant={t.id === team.id ? "default" : "outline"}
                      className="h-7 w-7 text-xs"
                      onClick={() =>
                        transfer.mutate({
                          playerId: p.id,
                          teamId: t.id,
                        })
                      }
                      aria-label={`Mover al equipo ${i + 1}`}
                    >
                      {i + 1}
                    </Button>
                  ))}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() =>
                      transfer.mutate({ playerId: p.id, teamId: null })
                    }
                    aria-label="Sacar del equipo"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function randomPick<T>(arr: T[], n: number): T[] {
  const items = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && items.length > 0; i++) {
    const idx = Math.floor(Math.random() * items.length);
    out.push(items.splice(idx, 1)[0]);
  }
  return out;
}
