-- CreateTable
CREATE TABLE "payment_term_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_term_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_term_template_items" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PaymentTermType" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_term_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_term_template_items_template_id_idx" ON "payment_term_template_items"("template_id");

-- AddForeignKey
ALTER TABLE "payment_term_template_items" ADD CONSTRAINT "payment_term_template_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "payment_term_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
