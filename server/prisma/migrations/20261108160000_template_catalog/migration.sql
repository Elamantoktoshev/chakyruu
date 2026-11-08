-- Catalog fields for templates: own price, HIT/NEW badge, on/off switch, card description.
ALTER TYPE "TemplateType" ADD VALUE 'KECHE';
ALTER TYPE "TemplateType" ADD VALUE 'OTHER';

CREATE TYPE "TemplateBadge" AS ENUM ('HIT', 'NEW');

ALTER TABLE "Template"
  ADD COLUMN "priceSom" INTEGER,
  ADD COLUMN "badge" "TemplateBadge",
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "description" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "Template" ADD CONSTRAINT "Template_priceSom_check" CHECK ("priceSom" IS NULL OR "priceSom" BETWEEN 0 AND 100000);
