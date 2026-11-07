-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "heroNumber" INTEGER,
ADD COLUMN     "paletteId" TEXT;

-- AlterTable
ALTER TABLE "Template" ADD COLUMN     "componentKey" TEXT NOT NULL DEFAULT 'classic',
ADD COLUMN     "isUniversal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;


-- The 8 component templates of step 4 replace the earlier palette-only templates.
INSERT INTO "Template" ("id", "name", "type", "componentKey", "isUniversal", "sortOrder", "config", "createdAt", "updatedAt") VALUES
  ('tpl-classic', 'Классика', 'WEDDING', 'classic', false, 10, '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-minimal', 'Минимализм', 'WEDDING', 'minimal', false, 11, '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-alatoo', 'Ала-Тоо', 'WEDDING', 'alatoo', false, 12, '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-nazik', 'Назик', 'KYZ_UZATUU', 'nazik', false, 20, '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-bala', 'Бала', 'BESHIK', 'bala', false, 30, '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-batyr', 'Баатыр', 'SUNNOT', 'batyr', false, 40, '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-yubiley', 'Юбилей', 'MAARAKE', 'yubiley', false, 50, '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('tpl-shyrdak', 'Шырдак', 'WEDDING', 'shyrdak', true, 60, '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET "componentKey" = EXCLUDED."componentKey", "isUniversal" = EXCLUDED."isUniversal", "sortOrder" = EXCLUDED."sortOrder";

-- Existing invitations move to the new template of their toi type.
UPDATE "Invitation" SET "templateId" = CASE "eventType"
    WHEN 'KYZ_UZATUU' THEN 'tpl-nazik'
    WHEN 'BESHIK' THEN 'tpl-bala'
    WHEN 'SUNNOT' THEN 'tpl-batyr'
    WHEN 'MAARAKE' THEN 'tpl-yubiley'
    ELSE 'tpl-classic'
  END
WHERE "templateId" NOT IN ('tpl-classic', 'tpl-minimal', 'tpl-alatoo', 'tpl-nazik', 'tpl-bala', 'tpl-batyr', 'tpl-yubiley', 'tpl-shyrdak');

DELETE FROM "Template"
WHERE "id" NOT IN ('tpl-classic', 'tpl-minimal', 'tpl-alatoo', 'tpl-nazik', 'tpl-bala', 'tpl-batyr', 'tpl-yubiley', 'tpl-shyrdak')
  AND NOT EXISTS (SELECT 1 FROM "Invitation" i WHERE i."templateId" = "Template"."id");
