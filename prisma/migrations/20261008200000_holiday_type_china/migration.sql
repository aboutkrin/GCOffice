-- AlterEnum: Chinese holidays (office works, China does not ship)
-- IF NOT EXISTS: the first production attempt failed after the value may already have been added
ALTER TYPE "HolidayType" ADD VALUE IF NOT EXISTS 'CHINA';
