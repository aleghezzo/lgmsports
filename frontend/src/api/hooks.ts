import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { CurrentUser, Game, GameStatus, GenderId, Player } from "./types";

export const queryKeys = {
  user: ["user"] as const,
  events: (status: GameStatus) => ["events", status] as const,
  pastEvents: (params: PastEventsParams) =>
    [
      "events",
      "past",
      params.page,
      params.pageSize,
      params.from ?? null,
      params.to ?? null,
    ] as const,
  event: (id: number | string) => ["event", String(id)] as const,
  immunities: ["immunities"] as const,
};

export interface PastEventsParams {
  page: number;
  pageSize: number;
  from?: string | null;
  to?: string | null;
}

export interface PastEventsResult {
  items: Game[];
  total: number;
  page: number;
  pageSize: number;
}

function bubbleAuthError(err: unknown) {
  if (err instanceof ApiError && err.status === 401) {
    window.dispatchEvent(new Event("auth:unauthorized"));
  }
}

export function useEvents(status: GameStatus, amount?: number) {
  return useQuery({
    queryKey: queryKeys.events(status),
    queryFn: () =>
      api.get<Game[]>("/api/events", { status, amount }).catch((err) => {
        bubbleAuthError(err);
        throw err;
      }),
    refetchOnWindowFocus: true,
  });
}

export function usePastEvents(params: PastEventsParams) {
  return useQuery({
    queryKey: queryKeys.pastEvents(params),
    queryFn: async (): Promise<PastEventsResult> => {
      try {
        const { data, headers } = await api.getWithMeta<Game[]>("/api/events", {
          status: 1,
          page: params.page,
          pageSize: params.pageSize,
          from: params.from || undefined,
          to: params.to || undefined,
        });
        const totalHeader = headers.get("X-Total-Count");
        const total = totalHeader ? Number(totalHeader) : data.length;
        return {
          items: data,
          total: Number.isFinite(total) ? total : data.length,
          page: params.page,
          pageSize: params.pageSize,
        };
      } catch (err) {
        bubbleAuthError(err);
        throw err;
      }
    },
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: true,
  });
}

export function useEvent(id: string | number | undefined | null) {
  return useQuery({
    enabled: id !== undefined && id !== null && id !== "",
    queryKey: queryKeys.event(id ?? ""),
    queryFn: () =>
      api.get<Game>(`/api/events/${id}`).catch((err) => {
        bubbleAuthError(err);
        throw err;
      }),
    refetchOnWindowFocus: true,
  });
}

export function useSearchPlayers(search: string, enabled = true) {
  const trimmed = search.trim();
  return useQuery({
    enabled: enabled && trimmed.length > 0,
    queryKey: ["players", "search", trimmed] as const,
    queryFn: () =>
      api
        .get<Player[]>("/api/players", { search: trimmed, limit: 10 })
        .catch((err) => {
          bubbleAuthError(err);
          throw err;
        }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useImmunities(enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.immunities,
    queryFn: () =>
      api.get<Player[]>("/api/players/inmunity").catch((err) => {
        bubbleAuthError(err);
        throw err;
      }),
  });
}

interface InvalidateOpts {
  events?: boolean;
  event?: number | string;
  immunities?: boolean;
}

function useInvalidator() {
  const qc = useQueryClient();
  return ({ events, event, immunities }: InvalidateOpts) => {
    if (events) {
      qc.invalidateQueries({ queryKey: ["events"] });
    }
    if (event !== undefined) {
      qc.invalidateQueries({ queryKey: queryKeys.event(event) });
    }
    if (immunities) {
      qc.invalidateQueries({ queryKey: queryKeys.immunities });
    }
  };
}

type Mut<TInput, TOutput> = Omit<
  UseMutationOptions<TOutput, Error, TInput>,
  "mutationFn"
>;

export function useLogin(opts?: Mut<{ userName: string; password: string; rememberMe: boolean }, { status: string }>) {
  return useMutation({
    mutationFn: (vars) =>
      api.post<{ status: string }>("/api/login", {
        userName: vars.userName,
        password: vars.password,
        rememberMe: vars.rememberMe ? 1 : "",
      }),
    ...opts,
  });
}

export function useSignup(
  opts?: Mut<
    {
      userName: string;
      password: string;
      nickName: string;
      genderId: GenderId;
      skillId: number;
      code: string;
    },
    CurrentUser
  >,
) {
  return useMutation({
    mutationFn: (vars) => api.post<CurrentUser>("/api/signup", vars),
    ...opts,
  });
}

export function useCreateEvent() {
  const invalidate = useInvalidator();
  return useMutation({
    mutationFn: (vars: { date: string; time: string; typeId: number }) =>
      api.post<Game>("/api/events", vars),
    onSuccess: () => invalidate({ events: true }),
    onError: bubbleAuthError,
  });
}

export function useUpdateEventStatus(eventId: number) {
  const invalidate = useInvalidator();
  return useMutation({
    mutationFn: (vars: { status: GameStatus }) =>
      api.put<Game>(`/api/events/${eventId}`, { status: vars.status }),
    onSuccess: () => invalidate({ events: true, event: eventId }),
    onError: bubbleAuthError,
  });
}

export function useDeleteEvent() {
  const invalidate = useInvalidator();
  return useMutation({
    mutationFn: (eventId: number) => api.delete(`/api/events/${eventId}`),
    onSuccess: () => invalidate({ events: true }),
    onError: bubbleAuthError,
  });
}

export function useAddPlayer(eventId: number) {
  const invalidate = useInvalidator();
  return useMutation({
    mutationFn: (vars: { id?: number; nickName?: string; genderId?: GenderId }) =>
      api.post<Game>(`/api/events/${eventId}/players`, vars),
    onSuccess: () => invalidate({ events: true, event: eventId }),
    onError: bubbleAuthError,
  });
}

export function useRemovePlayer(eventId: number) {
  const invalidate = useInvalidator();
  return useMutation({
    mutationFn: (playerId: number) =>
      api.delete<Game>(`/api/events/${eventId}/players/${playerId}`),
    onSuccess: () => invalidate({ events: true, event: eventId }),
    onError: bubbleAuthError,
  });
}

export function useTransferPlayer(eventId: number) {
  const invalidate = useInvalidator();
  return useMutation({
    mutationFn: (vars: { playerId: number; teamId: number | null }) =>
      api.put<Game>(`/api/events/${eventId}/players/${vars.playerId}`, {
        teamId: vars.teamId ?? "",
      }),
    onSuccess: () => invalidate({ event: eventId }),
    onError: bubbleAuthError,
  });
}

export function useAddImmunity() {
  const invalidate = useInvalidator();
  return useMutation({
    mutationFn: (playerId: number) =>
      api.post<Player>(`/api/players/${playerId}/inmunity`),
    onSuccess: () => invalidate({ immunities: true }),
    onError: bubbleAuthError,
  });
}

export function useAddImmunityByNickName() {
  const invalidate = useInvalidator();
  return useMutation({
    mutationFn: (nickName: string) =>
      api.post<Player>("/api/players/inmunity", { nickName }),
    onSuccess: () => invalidate({ immunities: true }),
    onError: bubbleAuthError,
  });
}

export function useRemoveImmunity() {
  const invalidate = useInvalidator();
  return useMutation({
    mutationFn: (playerId: number) =>
      api.delete<Player>(`/api/players/${playerId}/inmunity`),
    onSuccess: () => invalidate({ immunities: true }),
    onError: bubbleAuthError,
  });
}

export interface UpdateUserRoleResult {
  id: number;
  userName: string;
  roleId: number;
  changed: boolean;
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      roleId,
    }: {
      userId: number;
      roleId: 1 | 2;
    }) => {
      const res = await api.put<{
        status: string;
        message: UpdateUserRoleResult;
      }>(`/api/admins/users/${userId}/role`, { roleId });
      return res.message;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      // The current user's own role might have changed too.
      qc.invalidateQueries({ queryKey: queryKeys.user });
    },
    onError: bubbleAuthError,
  });
}

// --- Admin list / merge ----------------------------------------------------

export interface AdminUserRow {
  id: number;
  userName: string;
  roleId: number;
  roleName: string;
  playerId: number;
  nickName: string;
  genderId: number | null;
  lastLogin: string;
  /** Number of pickPlayer rows tied to this user's player. */
  picksCount: number;
}

export interface AdminPlayerRow {
  id: number;
  nickName: string;
  genderId: number | null;
  hasInmunity: 0 | 1;
  levelId: number | null;
  userId: number | null;
  userName: string | null;
  /** Number of pickPlayer rows tied to this player. */
  picksCount: number;
}

export function useAdminUsersList(enabled = true) {
  return useQuery({
    enabled,
    queryKey: ["admin", "users"] as const,
    queryFn: () =>
      api.get<AdminUserRow[]>("/api/admins/users").catch((err) => {
        bubbleAuthError(err);
        throw err;
      }),
  });
}

export function useAdminPlayersList(enabled = true) {
  return useQuery({
    enabled,
    queryKey: ["admin", "players"] as const,
    queryFn: () =>
      api.get<AdminPlayerRow[]>("/api/admins/players").catch((err) => {
        bubbleAuthError(err);
        throw err;
      }),
  });
}

export interface MergeSummary {
  targetId: number;
  sourceIds: number[];
  picksMoved: number;
  picksDropped: number;
  usersDeleted: number;
  playersDeleted: number;
}

interface MergeArgs {
  targetId: number;
  sourceIds: number[];
}

export function useMergePlayers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ targetId, sourceIds }: MergeArgs) => {
      const res = await api.post<{ status: string; message: MergeSummary }>(
        "/api/admins/players/merge",
        { targetId, sourceIds },
      );
      return res.message;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "players"] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: queryKeys.immunities });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
    onError: bubbleAuthError,
  });
}

export function useMergeUsers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ targetId, sourceIds }: MergeArgs) => {
      const res = await api.post<{ status: string; message: MergeSummary }>(
        "/api/admins/users/merge",
        { targetId, sourceIds },
      );
      return res.message;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "players"] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: queryKeys.immunities });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
    onError: bubbleAuthError,
  });
}

export interface DeleteSummary {
  playerId: number;
  usersDeleted: number;
  playersDeleted: number;
}

function invalidateAdminLists(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["admin", "players"] });
  qc.invalidateQueries({ queryKey: ["admin", "users"] });
  qc.invalidateQueries({ queryKey: queryKeys.immunities });
}

export function useDeletePlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (playerId: number) => {
      const res = await api.delete<{ status: string; message: DeleteSummary }>(
        `/api/admins/players/${playerId}`,
      );
      return res.message;
    },
    onSuccess: () => invalidateAdminLists(qc),
    onError: bubbleAuthError,
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: number) => {
      const res = await api.delete<{ status: string; message: DeleteSummary }>(
        `/api/admins/users/${userId}`,
      );
      return res.message;
    },
    onSuccess: () => invalidateAdminLists(qc),
    onError: bubbleAuthError,
  });
}

export interface PlayerNickNameUpdate {
  id: number;
  nickName: string;
  genderId: number | null;
}

export function useUpdatePlayerNickName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      playerId,
      nickName,
    }: {
      playerId: number;
      nickName: string;
    }) => {
      const res = await api.put<{
        status: string;
        message: PlayerNickNameUpdate;
      }>(`/api/admins/players/${playerId}`, { nickName });
      return res.message;
    },
    onSuccess: () => {
      invalidateAdminLists(qc);
      // Player nicknames flow into event payloads too — keep them in sync.
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["event"] });
    },
    onError: bubbleAuthError,
  });
}
