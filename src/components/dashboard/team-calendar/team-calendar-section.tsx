import { getThaiNow } from "@/lib/thai-date";
import type { SessionUser } from "@/lib/auth";
import {
  getAdminMembers,
  getMyAppointments,
  getMyLeaves,
  getPendingAppointments,
  getPendingLeaves,
  getTeamCalendar,
  getTeamMembers,
  getUpcomingShipments,
} from "@/data/team-calendar";
import { getMyLeaveSummary } from "@/data/leave-balances";
import { TeamCalendar } from "./team-calendar";
import {
  MyAppointmentsCard,
  MyLeavesCard,
  PendingAppointmentsCard,
  PendingLeavesCard,
  UpcomingShipmentsCard,
} from "./side-cards";

/**
 * Shared team calendar (company holidays, leave, China shipments, customer
 * appointments) shown on the dashboard for both ADMIN and STAFF.
 */
export async function TeamCalendarSection({ user }: { user: SessionUser }) {
  const { year, month } = getThaiNow();
  const isAdmin = user.role === "ADMIN";

  const [calendar, upcoming, pending, myLeaves, members, myBalance, admins, pendingAppointments, myAppointments] =
    await Promise.all([
      getTeamCalendar(year, month),
      getUpcomingShipments(),
      isAdmin ? getPendingLeaves() : Promise.resolve([]),
      isAdmin ? Promise.resolve([]) : getMyLeaves(user.id),
      isAdmin ? getTeamMembers() : Promise.resolve([]),
      isAdmin ? Promise.resolve(null) : getMyLeaveSummary(user.id, year).then((r) => r.summary),
      getAdminMembers(),
      isAdmin ? getPendingAppointments() : Promise.resolve([]),
      isAdmin ? Promise.resolve([]) : getMyAppointments(user.id),
    ]);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <TeamCalendar
          initialData={calendar}
          initialYear={year}
          initialMonth={month}
          isAdmin={isAdmin}
          currentUserId={user.id}
          members={members}
          admins={admins}
        />
      </div>
      <div className="flex flex-col gap-4">
        {isAdmin ? (
          <>
            <PendingLeavesCard leaves={pending} currentUserId={user.id} />
            <PendingAppointmentsCard appointments={pendingAppointments} currentUserId={user.id} />
          </>
        ) : (
          <>
            <MyLeavesCard leaves={myLeaves} currentUserId={user.id} balance={myBalance} />
            <MyAppointmentsCard appointments={myAppointments} currentUserId={user.id} />
          </>
        )}
        <UpcomingShipmentsCard shipments={upcoming} />
      </div>
    </div>
  );
}
