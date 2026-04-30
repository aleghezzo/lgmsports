import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  GitMerge,
  Mars,
  Pencil,
  Save,
  Search,
  Shield,
  ShieldCheck,
  ShieldOff,
  ShieldUser,
  Trash2,
  UserCircle,
  Users,
  Venus,
} from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/auth/AuthContext";
import {
  useAdminPlayersList,
  useAdminUsersList,
  useDeletePlayer,
  useDeleteUser,
  useMergePlayers,
  useMergeUsers,
  useUpdatePlayerNickName,
  useUpdateUserRole,
  type AdminPlayerRow,
  type AdminUserRow,
  type DeleteSummary,
  type MergeSummary,
} from "@/api/hooks";
import { GENDERS } from "@/api/types";

function genderLabel(genderId: number | null): string {
  const g = GENDERS.find((opt) => opt.id === genderId);
  return g ? g.name : "sin género";
}

function GenderBadge({ genderId }: { genderId: number | null }) {
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
  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <CircleHelp className="h-3 w-3" />
      sin género
    </Badge>
  );
}

export function AdminPage() {
  const { isAdmin, loading } = useAuth();

  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Admin
        </CardTitle>
        <CardDescription>
          Listado y administración de usuarios y jugadores.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="players">
              <UserCircle className="h-4 w-4" />
              Players
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UsersTab />
          </TabsContent>
          <TabsContent value="players">
            <PlayersTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Users tab.
// ---------------------------------------------------------------------------

function UsersTab() {
  const { user } = useAuth();
  const { data, isLoading, error } = useAdminUsersList();
  const merge = useMergeUsers();
  const del = useDeleteUser();
  const rename = useUpdatePlayerNickName();
  const setRole = useUpdateUserRole();
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const list = data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (u) =>
        u.userName.toLowerCase().includes(q) ||
        u.nickName.toLowerCase().includes(q),
    );
  }, [data, search]);

  async function toggleRole(u: AdminUserRow) {
    const next: 1 | 2 = u.roleId === 2 ? 1 : 2;
    try {
      const res = await setRole.mutateAsync({ userId: u.id, roleId: next });
      if (res.changed) {
        toast.success(
          next === 2
            ? `${u.userName} ahora es admin`
            : `${u.userName} ya no es admin`,
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <MergeListLayout
      isLoading={isLoading}
      error={error}
      total={data?.length ?? 0}
      filteredCount={rows.length}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Buscar por usuario o jugador"
      rows={rows}
      getId={(u) => u.id}
      getKey={(u) => u.id}
      renderRow={(u) => (
        <div className="flex min-w-0 items-center gap-3">
          <Badge variant="secondary" className="shrink-0">
            #{u.id}
          </Badge>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-medium">{u.userName}</span>
              <GenderBadge genderId={u.genderId} />
              {u.roleId === 2 && (
                <Badge variant="default" className="gap-1">
                  <ShieldUser className="h-3 w-3" />
                  admin
                </Badge>
              )}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              jugador: {u.nickName}
            </div>
          </div>
          <Button
            type="button"
            variant={u.roleId === 2 ? "ghost" : "outline"}
            size="sm"
            className="ml-2 h-7 shrink-0"
            disabled={
              setRole.isPending ||
              // Don't let admins demote themselves from this UI; the
              // backend rejects this anyway, but disabling avoids the
              // round-trip + error toast.
              (user !== null && user.id === u.id && u.roleId === 2)
            }
            title={
              user !== null && user.id === u.id && u.roleId === 2
                ? "No podés quitarte el rol de admin a vos mismo"
                : u.roleId === 2
                  ? "Quitar admin (vuelve a player)"
                  : "Hacer admin"
            }
            onClick={() => toggleRole(u)}
          >
            {u.roleId === 2 ? (
              <>
                <ShieldOff className="h-3.5 w-3.5" />
                Quitar admin
              </>
            ) : (
              <>
                <ShieldCheck className="h-3.5 w-3.5" />
                Hacer admin
              </>
            )}
          </Button>
        </div>
      )}
      mergeKind="users"
      mergeFn={(args) => merge.mutateAsync(args)}
      mergePending={merge.isPending}
      describeTarget={(u) =>
        `${u.userName} (jugador ${u.nickName} · ${genderLabel(u.genderId)}, #${u.id})`
      }
      mergeWarning={
        <>
          Borrá los <strong>users</strong> y los <strong>players</strong>{" "}
          asociados de las filas marcadas como source. Sus picks se mueven al
          player del user target.
        </>
      }
      getPicksCount={(u) => u.picksCount}
      deleteFn={(id) => del.mutateAsync(id)}
      deletePending={del.isPending}
      deleteWarning={
        <>
          Se eliminará el <strong>user</strong> y su <strong>player</strong>{" "}
          asociado. Solo está habilitado para registros sin picks en juegos.
        </>
      }
      getPlayerId={(u) => u.playerId}
      getNickName={(u) => u.nickName}
      renameFn={(args) => rename.mutateAsync(args)}
      renamePending={rename.isPending}
    />
  );
}

// ---------------------------------------------------------------------------
// Players tab.
// ---------------------------------------------------------------------------

function PlayersTab() {
  const { data, isLoading, error } = useAdminPlayersList();
  const merge = useMergePlayers();
  const del = useDeletePlayer();
  const rename = useUpdatePlayerNickName();
  const [search, setSearch] = useState("");
  const [orphansOnly, setOrphansOnly] = useState(false);

  const rows = useMemo(() => {
    const list = data ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((p) => {
      if (orphansOnly && p.userId !== null) return false;
      if (!q) return true;
      return (
        p.nickName.toLowerCase().includes(q) ||
        (p.userName ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, search, orphansOnly]);

  // Targets in the player merge: when several selected players have user
  // accounts, the target *must* be one of them. We compute eligibility from
  // the actual selection inside MergeListLayout via canBeTarget.
  function canBeTarget(p: AdminPlayerRow, allSelected: AdminPlayerRow[]) {
    const linkedSelected = allSelected.filter((row) => row.userId !== null);
    if (linkedSelected.length <= 1) return true;
    return p.userId !== null;
  }

  return (
    <MergeListLayout
      isLoading={isLoading}
      error={error}
      total={data?.length ?? 0}
      filteredCount={rows.length}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Buscar por nick o usuario asociado"
      headerExtras={
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox
            checked={orphansOnly}
            onCheckedChange={(v) => setOrphansOnly(v === true)}
          />
          Solo sin user
        </label>
      }
      rows={rows}
      getId={(p) => p.id}
      getKey={(p) => p.id}
      renderRow={(p) => (
        <div className="flex min-w-0 items-center gap-3">
          <Badge variant="secondary" className="shrink-0">
            #{p.id}
          </Badge>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-medium">{p.nickName}</span>
              <GenderBadge genderId={p.genderId} />
              {p.userId !== null && (
                <Badge variant="default" className="gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  {p.userName}
                </Badge>
              )}
              {p.hasInmunity === 1 && (
                <Badge variant="outline" className="gap-1">
                  <Shield className="h-3 w-3" />
                  inmune
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {p.userId === null ? "sin user" : `user #${p.userId}`}
            </div>
          </div>
        </div>
      )}
      mergeKind="players"
      mergeFn={(args) => merge.mutateAsync(args)}
      mergePending={merge.isPending}
      describeTarget={(p) =>
        p.userId !== null
          ? `${p.nickName} (#${p.id} · ${genderLabel(p.genderId)} · user ${p.userName})`
          : `${p.nickName} (#${p.id} · ${genderLabel(p.genderId)} · sin user)`
      }
      canBeTarget={canBeTarget}
      mergeWarning={
        <>
          Las picks de los <strong>sources</strong> se migran al{" "}
          <strong>target</strong>. Si algún source tiene un user, ese user se
          borra junto con su player.
        </>
      }
      getPicksCount={(p) => p.picksCount}
      deleteFn={(id) => del.mutateAsync(id)}
      deletePending={del.isPending}
      deleteWarning={
        <>
          Se eliminará el <strong>player</strong>. Si tiene un{" "}
          <strong>user</strong> asociado, también se borra. Solo habilitado
          cuando el player no participó en ningún juego.
        </>
      }
      getPlayerId={(p) => p.id}
      getNickName={(p) => p.nickName}
      renameFn={(args) => rename.mutateAsync(args)}
      renamePending={rename.isPending}
    />
  );
}

// ---------------------------------------------------------------------------
// Reusable list + merge UI shared by both tabs.
// ---------------------------------------------------------------------------

interface MergeListLayoutProps<T> {
  isLoading: boolean;
  error: Error | null;
  total: number;
  filteredCount: number;
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder: string;
  headerExtras?: React.ReactNode;
  rows: T[];
  getId: (row: T) => number;
  getKey: (row: T) => number | string;
  renderRow: (row: T) => React.ReactNode;
  mergeKind: "users" | "players";
  mergeFn: (args: {
    targetId: number;
    sourceIds: number[];
  }) => Promise<MergeSummary>;
  mergePending: boolean;
  describeTarget: (row: T) => string;
  canBeTarget?: (row: T, allSelected: T[]) => boolean;
  mergeWarning?: React.ReactNode;
  /** Number of pickPlayer rows for this row's player. */
  getPicksCount: (row: T) => number;
  /** Calls DELETE /api/admins/{kind}/{id}. */
  deleteFn: (id: number) => Promise<DeleteSummary>;
  deletePending: boolean;
  deleteWarning?: React.ReactNode;
  /** Player id behind the row (the row's id for Players tab; userId.playerId for Users tab). */
  getPlayerId: (row: T) => number;
  /** Current nickName behind the row (always the player's nickName). */
  getNickName: (row: T) => string;
  /** Calls PUT /api/admins/players/{id}. */
  renameFn: (args: { playerId: number; nickName: string }) => Promise<unknown>;
  renamePending: boolean;
}

function MergeListLayout<T>({
  isLoading,
  error,
  total,
  filteredCount,
  search,
  onSearchChange,
  searchPlaceholder,
  headerExtras,
  rows,
  getId,
  getKey,
  renderRow,
  mergeKind,
  mergeFn,
  mergePending,
  describeTarget,
  canBeTarget,
  mergeWarning,
  getPicksCount,
  deleteFn,
  deletePending,
  deleteWarning,
  getPlayerId,
  getNickName,
  renameFn,
  renamePending,
}: MergeListLayoutProps<T>) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [targetId, setTargetId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<T | null>(null);
  const [editCandidate, setEditCandidate] = useState<T | null>(null);
  const [editValue, setEditValue] = useState("");

  const selectedRows = useMemo(
    () => rows.filter((r) => selected.has(getId(r))),
    [rows, selected, getId],
  );

  const eligibleTargets = useMemo(() => {
    if (!canBeTarget) return selectedRows;
    return selectedRows.filter((r) => canBeTarget(r, selectedRows));
  }, [selectedRows, canBeTarget]);

  // Keep target valid as selection changes.
  useEffect(() => {
    if (targetId === null) {
      if (eligibleTargets.length > 0) {
        setTargetId(getId(eligibleTargets[0]));
      }
      return;
    }
    if (!eligibleTargets.some((r) => getId(r) === targetId)) {
      setTargetId(eligibleTargets.length > 0 ? getId(eligibleTargets[0]) : null);
    }
  }, [eligibleTargets, targetId, getId]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clear() {
    setSelected(new Set());
    setTargetId(null);
  }

  async function performMerge() {
    if (targetId === null) return;
    const sourceIds = [...selected].filter((id) => id !== targetId);
    if (sourceIds.length === 0) return;
    try {
      const summary = await mergeFn({ targetId, sourceIds });
      const noun = mergeKind === "users" ? "users" : "players";
      toast.success(
        `Merge OK · ${summary.playersDeleted} players deleted, ${summary.usersDeleted} users deleted, ${summary.picksMoved} picks moved (${summary.picksDropped} dropped)`,
        { description: `${sourceIds.length} ${noun} merged into target #${summary.targetId}` },
      );
      clear();
      setConfirmOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Merge failed");
    }
  }

  async function performDelete() {
    if (!deleteCandidate) return;
    const id = getId(deleteCandidate);
    try {
      const summary = await deleteFn(id);
      toast.success(
        `Eliminado · ${summary.playersDeleted} player(s), ${summary.usersDeleted} user(s)`,
        { description: describeTarget(deleteCandidate) },
      );
      // If the deleted row was selected, drop it from the selection.
      setSelected((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setDeleteCandidate(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  function openEditFor(row: T) {
    setEditCandidate(row);
    setEditValue(getNickName(row));
  }

  async function performEdit() {
    if (!editCandidate) return;
    const playerId = getPlayerId(editCandidate);
    const nickName = editValue.trim();
    if (nickName === "" || nickName === getNickName(editCandidate)) {
      setEditCandidate(null);
      return;
    }
    try {
      await renameFn({ playerId, nickName });
      toast.success(
        `NickName actualizado a "${nickName}"`,
        { description: `player #${playerId}` },
      );
      setEditCandidate(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  const targetRow =
    targetId !== null ? rows.find((r) => getId(r) === targetId) : undefined;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
        {headerExtras}
        <span className="text-xs text-muted-foreground">
          {filteredCount === total
            ? `${total} ${mergeKind}`
            : `${filteredCount} / ${total} ${mergeKind}`}
        </span>
      </div>

      {selected.size >= 2 && (
        <SelectionBar
          mergeKind={mergeKind}
          selectedCount={selected.size}
          eligibleTargets={eligibleTargets}
          targetId={targetId}
          setTargetId={setTargetId}
          getId={getId}
          describeTarget={describeTarget}
          onClear={clear}
          onMerge={() => setConfirmOpen(true)}
          mergeWarning={
            eligibleTargets.length === 0
              ? "Ningún seleccionado puede ser target. Si hay varios users en la selección, el target debe ser uno de ellos."
              : null
          }
        />
      )}

      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Error: {error.message}
        </p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          {filteredCount === 0 && total > 0
            ? "No hay resultados para esa búsqueda."
            : "No hay registros."}
        </p>
      ) : (
        <ul className="max-h-[60vh] divide-y divide-border/60 overflow-y-auto rounded-lg border border-border/60">
          {rows.map((row) => {
            const id = getId(row);
            const isSelected = selected.has(id);
            const isTarget = id === targetId;
            const picks = getPicksCount(row);
            const canDelete = picks === 0;
            return (
              <li
                key={getKey(row)}
                className={
                  "flex items-center gap-3 px-3 py-2 transition-colors " +
                  (isTarget
                    ? "bg-primary/10"
                    : isSelected
                      ? "bg-secondary/30"
                      : "hover:bg-secondary/20")
                }
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggle(id)}
                  aria-label={`Seleccionar #${id}`}
                />
                {renderRow(row)}
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <span
                    className={
                      "text-xs tabular-nums " +
                      (canDelete
                        ? "text-muted-foreground/70"
                        : "text-muted-foreground")
                    }
                    title={`${picks} pick(s) en juegos`}
                  >
                    {picks} {picks === 1 ? "pick" : "picks"}
                  </span>
                  {isTarget && (
                    <Badge className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      target
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    disabled={renamePending}
                    onClick={() => openEditFor(row)}
                    title="Editar nickName"
                    aria-label="Editar nickName"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    disabled={!canDelete || deletePending}
                    onClick={() => setDeleteCandidate(row)}
                    title={
                      canDelete
                        ? "Eliminar"
                        : `No se puede borrar: tiene ${picks} pick(s). Mergea primero.`
                    }
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitMerge className="h-5 w-5" />
              Confirmar merge
            </DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-muted-foreground">Target: </span>
              <strong>{targetRow ? describeTarget(targetRow) : "—"}</strong>
            </p>
            <p>
              <span className="text-muted-foreground">Sources: </span>
              {selectedRows
                .filter((r) => getId(r) !== targetId)
                .map((r) => describeTarget(r))
                .join(", ") || "—"}
            </p>
            {mergeWarning && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="text-xs leading-relaxed">{mergeWarning}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancelar</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={performMerge}
              disabled={mergePending || targetId === null}
            >
              <GitMerge className="h-4 w-4" />
              {mergePending ? "Merging…" : "Merge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteCandidate !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteCandidate(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Eliminar registro
            </DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-muted-foreground">Registro: </span>
              <strong>
                {deleteCandidate ? describeTarget(deleteCandidate) : "—"}
              </strong>
            </p>
            {deleteWarning && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="text-xs leading-relaxed">{deleteWarning}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancelar</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={performDelete}
              disabled={deletePending}
            >
              <Trash2 className="h-4 w-4" />
              {deletePending ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editCandidate !== null}
        onOpenChange={(open) => {
          if (!open) setEditCandidate(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Editar nickName
            </DialogTitle>
            <DialogDescription>
              {editCandidate
                ? `player #${getPlayerId(editCandidate)} · actual: "${getNickName(editCandidate)}"`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              performEdit();
            }}
            className="space-y-3"
          >
            <Input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              maxLength={191}
              placeholder="Nuevo nickName"
              aria-label="Nuevo nickName"
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={
                  renamePending ||
                  editValue.trim() === "" ||
                  (editCandidate !== null &&
                    editValue.trim() === getNickName(editCandidate))
                }
              >
                <Save className="h-4 w-4" />
                {renamePending ? "Guardando…" : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface SelectionBarProps<T> {
  mergeKind: "users" | "players";
  selectedCount: number;
  eligibleTargets: T[];
  targetId: number | null;
  setTargetId: (id: number) => void;
  getId: (row: T) => number;
  describeTarget: (row: T) => string;
  onClear: () => void;
  onMerge: () => void;
  mergeWarning: string | null;
}

function SelectionBar<T>({
  mergeKind,
  selectedCount,
  eligibleTargets,
  targetId,
  setTargetId,
  getId,
  describeTarget,
  onClear,
  onMerge,
  mergeWarning,
}: SelectionBarProps<T>) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3 sm:flex-row sm:items-center">
      <div className="text-sm">
        <strong>{selectedCount}</strong> {mergeKind} seleccionados
      </div>
      <div className="flex-1 sm:max-w-md">
        <Select
          value={targetId !== null ? String(targetId) : ""}
          onValueChange={(v) => setTargetId(Number(v))}
          disabled={eligibleTargets.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Target…" />
          </SelectTrigger>
          <SelectContent>
            {eligibleTargets.map((row) => {
              const id = getId(row);
              return (
                <SelectItem key={id} value={String(id)}>
                  {describeTarget(row)}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {mergeWarning && (
          <p className="mt-1 text-xs text-amber-300">{mergeWarning}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onClear}>
          Limpiar
        </Button>
        <Button
          size="sm"
          onClick={onMerge}
          disabled={targetId === null || eligibleTargets.length === 0}
        >
          <GitMerge className="h-4 w-4" />
          Merge
        </Button>
      </div>
    </div>
  );
}

// Used to satisfy the generic constraint in shared rendering helpers.
export type _AdminRow = AdminUserRow | AdminPlayerRow;
