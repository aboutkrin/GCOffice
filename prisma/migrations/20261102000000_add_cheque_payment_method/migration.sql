-- AlterEnum: add cheque as a customer payment channel
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'CHEQUE';
