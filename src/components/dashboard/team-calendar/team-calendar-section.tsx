import { getThaiNow } from "@/lib/thai-date";
import type { SessionUser } from "@/lib/auth";
import {
  getAppointmentAttendees,
  getMyLeaves,
  getPendingLeaves,
  getTeamCalendar,
  getTeamMembers,
  getUpcomingShipments,
} from "@/data/team-calendar";
import { getMyLeaveSummary } from "@/data/leave-balances";
import { TeamCalendarBoard } from "./team-calendar-board";
import { MyLeavesCard, PendingLeavesCard, UpcomingShipmentsCard } from "./side-cards";

/**
 * Shared team calendar (company holidays, leave, China shipments, customer
 * appointments) shown on the dashboard for both ADMIN and STAFF.
 */
export async function TeamCalendarSection({ user }: { user: SessionUser }) {
  const { year, month } = getThaiNow();
  const isAdmin = user.role === "ADMIN";

  const [calendar, upcoming, pending, myLeaves, members, myBalance, attendees] = await Promise.all([
    getTeamCalendar(year, month),
    getUpcomingShipments(),
    isAdmin ? getPendingLeaves() : Promise.resolve([]),
    isAdmin ? Promise.resolve([]) : getMyLeaves(user.id),
    isAdmin ? getTeamMembers() : Promise.resolve([]),
    isAdmin ? Promise.resolve(null) : getMyLeaveSummary(user.id, year).then((r) => r.summary),
    getAppointmentAttendees(),
  ]);

  return (
    <TeamCalendarBoard
      initialData={calendar}
      initialYear={year}
      initialMonth={month}
      isAdmin={isAdmin}
      currentUserId={user.id}
      members={members}
      attendees={attendees}
      beforeAppointments={<UpcomingShipmentsCard shipments={upcoming} />}
      afterAppointments={
        isAdmin ? (
          <PendingLeavesCard leaves={pending} currentUserId={user.id} />
        ) : (
          <MyLeavesCard leaves={myLeaves} currentUserId={user.id} balance={myBalance} />
        )
      }
    />
  );
}
