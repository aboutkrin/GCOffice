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

  // Desktop: the month grid takes two thirds of the width with the
  // "ของจากจีนที่กำลังมา" card beside it on the right; the other three cards
  // sit in a row underneath. Phones and tablets stack the grid, then the
  // shipments card, then the remaining cards one under the other.
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="min-w-0 lg:col-span-2">
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
      <div className="min-w-0">{beforeAppointments}</div>
      {/* items stretch so the นัดพบลูกค้า and รับสินค้าที่โชว์รูม cards are the same height */}
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:col-span-3 lg:grid-cols-3 [&>*]:min-w-0">
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
