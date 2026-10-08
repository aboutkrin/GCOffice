import { getThaiNow } from "@/lib/thai-date";
import type { SessionUser } from "@/lib/auth";
import {
  getMyLeaves,
  getPendingLeaves,
  getTeamCalendar,
  getTeamMembers,
  getUpcomingShipments,
} from "@/data/team-calendar";
import { TeamCalendar } from "./team-calendar";
import { MyLeavesCard, PendingLeavesCard, UpcomingShipmentsCard } from "./side-cards";

/**
 * Shared team calendar (company holidays, leave, China shipments) shown on the
 * dashboard for both ADMIN and STAFF.
 */
export async function TeamCalendarSection({ user }: { user: SessionUser }) {
  const { year, month } = getThaiNow();
  const isAdmin = user.role === "ADMIN";

  const [calendar, upcoming, pending, myLeaves, members] = await Promise.all([
    getTeamCalendar(year, month),
    getUpcomingShipments(),
    isAdmin ? getPendingLeaves() : Promise.resolve([]),
    isAdmin ? Promise.resolve([]) : getMyLeaves(user.id),
    isAdmin ? getTeamMembers() : Promise.resolve([]),
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
        />
      </div>
      <div className="flex flex-col gap-4">
        {isAdmin ? (
          <PendingLeavesCard leaves={pending} currentUserId={user.id} />
        ) : (
          <MyLeavesCard leaves={myLeaves} currentUserId={user.id} />
        )}
        <UpcomingShipmentsCard shipments={upcoming} />
      </div>
    </div>
  );
}
