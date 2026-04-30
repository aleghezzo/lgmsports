import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  History,
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
import { Label } from "@/components/ui/label";
import { useEvents, usePastEvents } from "@/api/hooks";
import { formatGameDate } from "@/lib/format";
import type { Game } from "@/api/types";

const PAST_PAGE_SIZE = 10;

export function EventsPage() {
  const upcoming = useEvents(0);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <UpcomingEventsCard
        events={upcoming.data}
        loading={upcoming.isLoading}
      />
      <PastEventsCard />
    </div>
  );
}

function UpcomingEventsCard({
  events,
  loading,
}: {
  events: Game[] | undefined;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          Próximos eventos
        </CardTitle>
        <CardDescription>Lo que viene esta semana.</CardDescription>
      </CardHeader>
      <CardContent>
        <EventList
          events={events}
          loading={loading}
          empty="No hay eventos próximos."
        />
      </CardContent>
    </Card>
  );
}

function PastEventsCard() {
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // The query is keyed on the *applied* filters; the inputs above are bound
  // directly so changes apply on every keystroke (cheap + keeps query cached).
  const { data, isLoading, isFetching } = usePastEvents({
    page,
    pageSize: PAST_PAGE_SIZE,
    from: from || null,
    to: to || null,
  });

  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil(total / PAST_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rangeStart = total === 0 ? 0 : (safePage - 1) * PAST_PAGE_SIZE + 1;
  const rangeEnd = Math.min(total, safePage * PAST_PAGE_SIZE);
  const hasFilters = Boolean(from || to);

  // If a date filter shrinks the result set below the current page, snap back.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-accent" />
          Eventos pasados
        </CardTitle>
        <CardDescription>Historial de los partidos jugados.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1">
            <Label htmlFor="past-from" className="text-xs">
              Desde
            </Label>
            <Input
              id="past-from"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="past-to" className="text-xs">
              Hasta
            </Label>
            <Input
              id="past-to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-self-start sm:justify-self-end"
              onClick={() => {
                setFrom("");
                setTo("");
                setPage(1);
              }}
            >
              <X className="h-4 w-4" />
              Limpiar
            </Button>
          )}
        </div>

        <EventList
          events={items}
          loading={isLoading}
          empty={
            hasFilters
              ? "No hay eventos en el rango seleccionado."
              : "Todavía no hay historial."
          }
        />

        <div className="flex flex-col items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground sm:flex-row">
          <span>
            {total === 0
              ? "Sin resultados"
              : `Mostrando ${rangeStart}–${rangeEnd} de ${total}`}
            {isFetching && total > 0 ? " · actualizando…" : ""}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={safePage <= 1 || total === 0}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 tabular-nums">
              {safePage} / {totalPages}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={safePage >= totalPages || total === 0}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EventList({
  events,
  loading,
  empty,
}: {
  events: Game[] | undefined;
  loading: boolean;
  empty: string;
}) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }
  if (!events || events.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
        {empty}
      </p>
    );
  }
  return (
    <ul className="flex flex-col divide-y divide-border/60">
      {events.map((event) => (
        <li
          key={event.id}
          className="flex items-center justify-between py-3"
        >
          <div className="min-w-0">
            <Link
              to={`/event/${event.id}`}
              className="block truncate text-sm font-medium text-foreground hover:text-primary"
            >
              {event.type.name}
            </Link>
            <span className="text-xs text-muted-foreground">
              {formatGameDate(event.date)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
