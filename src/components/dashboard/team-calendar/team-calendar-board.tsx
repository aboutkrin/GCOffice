"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { fetchTeamCalendarAction } from "@/actions/dashboard-actions";
import type {
  AppointmentAttendeeOption,
  TeamCalendarData,
  TeamMemberOption,
} from "@/data/team-calendar";
import { TeamCalendar } from "./team-calendar";
import { AppointmentsCard, PickupCard } from "./side-cards";

interface TeamCalendarBoardProps {
  initialData: TeamCalendarData;
  initialYear: number;
  initialMonth: number;
  isAdmin: boolean;
  currentUserId: string;
  members: TeamMemberOption[];
  /** Active users who can take an appointment (admins, plus staff for showroom visits). */
  attendees: AppointmentAttendeeOption[];
  /** Side cards that do not depend on the month shown (shipments, leave). */
  beforeAppointments?: ReactNode;
  afterAppointments?: ReactNode;
}

/**
 * Owns the month being shown so both the calendar grid and the "นัดพบลูกค้า"
 * side card follow it: the card lists only that month's appointments and
 * changes together with the ‹ › month navigation.
 */
export function TeamCalendarBoard({
  initialData,
  initialYear,
  initialMonth,
  isAdmin,
  currentUserId,
  members,
  attendees,
  beforeAppointments,
  afterAppointments,
}: TeamCalendarBoardProps) {
  const [data, setData] = useState(initialData);
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [isPending, startTransition] = useTransition();

  // Keep the displayed month in sync after router.refresh() (any mutation on
  // the dashboard re-renders the server page and hands us new initialData).
  // Same month as the server: adopt its data right away (state adjusted during
  // render). Another month: refetch it in the effect below.
  const [seenInitial, setSeenInitial] = useState(initialData);
  if (seenInitial !== initialData) {
    setSeenInitial(initialData);
    if (year === initialYear && month === initialMonth) setData(initialData);
  }
  const viewRef = useRef({ year, month });
  useEffect(() => {
    viewRef.current = { year, month };
  }, [year, month]);
  useEffect(() => {
    const { year: y, month: m } = viewRef.current;
    if (y === initialYear && m === initialMonth) return;
    startTransition(async () => setData(await fetchTeamCalendarAction(y, m)));
  }, [initialData, initialYear, initialMonth]);

  function load(newYear: number, newMonth: number) {
    setYear(newYear);
    setMonth(newMonth);
    startTransition(async () => {
      setData(await fetchTeamCalendarAction(newYear, newMonth));
    });
  }

  // Desktop: the month grid takes the full width (its labels need the room),
  // and the four side cards sit in a row underneath, so nothing is left as a
  // tall single column beside an empty area. Narrow screens stack everything.
  return (
    <div className="flex flex-col gap-4">
      <div className="min-w-0">
        <TeamCalendar
          data={data}
          year={year}
          month={month}
          isPending={isPending}
          onLoad={load}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          members={members}
          attendees={attendees}
        />
      </div>
      <div className="grid min-w-0 grid-cols-1 items-start gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {beforeAppointments}
        <AppointmentsCard
          appointments={data.appointments}
          year={year}
          month={month}
          isPending={isPending}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
        />
        <PickupCard
          appointments={data.appointments}
          year={year}
          month={month}
          isPending={isPending}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
        />
        {afterAppointments}
      </div>
    </div>
  );
}
