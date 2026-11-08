-- Launch price for publishing an invitation: 499 som (was 700).
-- Only touches the row while it still has the old default, so a price set in /admin is kept.
UPDATE "Price" SET "amountSom" = 499, "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'INVITATION_PUBLISH' AND "amountSom" = 700;
