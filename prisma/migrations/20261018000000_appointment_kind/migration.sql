-- Customer appointments: kind (go out to meet the customer / customer visits the showroom)
CREATE TYPE "AppointmentKind" AS ENUM ('VISIT_CUSTOMER', 'SHOWROOM');
ALTER TABLE "customer_appointments" ADD COLUMN "kind" "AppointmentKind" NOT NULL DEFAULT 'VISIT_CUSTOMER';
