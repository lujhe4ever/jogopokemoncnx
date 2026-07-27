ALTER TABLE "Profile"
ADD COLUMN "starterDefinitionId" TEXT;

ALTER TABLE "Profile"
ADD CONSTRAINT "Profile_starter_definition_check"
CHECK (
  "starterDefinitionId" IS NULL
  OR "starterDefinitionId" IN (
    'creature:emberbud',
    'creature:mosscalf',
    'creature:tidefin'
  )
);
