-- CreateTable
CREATE TABLE "public"."gamification_levels" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "minPoints" INTEGER NOT NULL,
    "maxPoints" INTEGER,
    "order" INTEGER NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "badgeImage" TEXT,

    CONSTRAINT "gamification_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gamification_themes" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL,
    "secondaryColor" TEXT NOT NULL,
    "gradient" TEXT,
    "requiredLevelId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "gamification_themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gamification_frames" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "cssClass" TEXT NOT NULL,
    "animation" TEXT,
    "requiredLevelId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "gamification_frames_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gamification_effects" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "cssClass" TEXT NOT NULL,
    "animation" TEXT,
    "requiredLevelId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "gamification_effects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gamification_titles" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "requiredLevelId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "gamification_titles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."achievement_categories" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "achievement_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."achievement_rarities" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "glowEffect" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "achievement_rarities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_gamification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "levelId" INTEGER NOT NULL DEFAULT 1,
    "selectedThemeId" INTEGER NOT NULL DEFAULT 1,
    "selectedFrameId" INTEGER NOT NULL DEFAULT 1,
    "selectedEffectId" INTEGER NOT NULL DEFAULT 1,
    "selectedTitleId" INTEGER,
    "customTitleText" TEXT,
    "reservationsCompleted" INTEGER NOT NULL DEFAULT 0,
    "reservationsCancelled" INTEGER NOT NULL DEFAULT 0,
    "ratingsGiven" INTEGER NOT NULL DEFAULT 0,
    "claimsCreated" INTEGER NOT NULL DEFAULT 0,
    "claimsResolved" INTEGER NOT NULL DEFAULT 0,
    "claimsRejected" INTEGER NOT NULL DEFAULT 0,
    "adhesionsGiven" INTEGER NOT NULL DEFAULT 0,
    "adhesionsReceived" INTEGER NOT NULL DEFAULT 0,
    "negativeAdhesions" INTEGER NOT NULL DEFAULT 0,
    "consecutiveDays" INTEGER NOT NULL DEFAULT 0,
    "lastLoginDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_gamification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."point_transactions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reservationId" INTEGER,
    "claimId" INTEGER,
    "ratingId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."achievements" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "pointsReward" INTEGER NOT NULL DEFAULT 0,
    "rarityId" INTEGER NOT NULL DEFAULT 1,
    "requiredCount" INTEGER,
    "requiredAction" TEXT,
    "isRepeatable" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_achievements" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "achievementId" INTEGER NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timesEarned" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."favorite_badges" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "achievementId" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "favorite_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."monthly_leaderboards" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "levelId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_leaderboards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gamification_levels_key_key" ON "public"."gamification_levels"("key");

-- CreateIndex
CREATE INDEX "gamification_levels_key_idx" ON "public"."gamification_levels"("key");

-- CreateIndex
CREATE INDEX "gamification_levels_order_idx" ON "public"."gamification_levels"("order");

-- CreateIndex
CREATE UNIQUE INDEX "gamification_themes_key_key" ON "public"."gamification_themes"("key");

-- CreateIndex
CREATE INDEX "gamification_themes_key_idx" ON "public"."gamification_themes"("key");

-- CreateIndex
CREATE INDEX "gamification_themes_requiredLevelId_idx" ON "public"."gamification_themes"("requiredLevelId");

-- CreateIndex
CREATE UNIQUE INDEX "gamification_frames_key_key" ON "public"."gamification_frames"("key");

-- CreateIndex
CREATE INDEX "gamification_frames_key_idx" ON "public"."gamification_frames"("key");

-- CreateIndex
CREATE INDEX "gamification_frames_requiredLevelId_idx" ON "public"."gamification_frames"("requiredLevelId");

-- CreateIndex
CREATE UNIQUE INDEX "gamification_effects_key_key" ON "public"."gamification_effects"("key");

-- CreateIndex
CREATE INDEX "gamification_effects_key_idx" ON "public"."gamification_effects"("key");

-- CreateIndex
CREATE INDEX "gamification_effects_requiredLevelId_idx" ON "public"."gamification_effects"("requiredLevelId");

-- CreateIndex
CREATE UNIQUE INDEX "gamification_titles_key_key" ON "public"."gamification_titles"("key");

-- CreateIndex
CREATE INDEX "gamification_titles_key_idx" ON "public"."gamification_titles"("key");

-- CreateIndex
CREATE INDEX "gamification_titles_requiredLevelId_idx" ON "public"."gamification_titles"("requiredLevelId");

-- CreateIndex
CREATE UNIQUE INDEX "achievement_categories_key_key" ON "public"."achievement_categories"("key");

-- CreateIndex
CREATE INDEX "achievement_categories_key_idx" ON "public"."achievement_categories"("key");

-- CreateIndex
CREATE UNIQUE INDEX "achievement_rarities_key_key" ON "public"."achievement_rarities"("key");

-- CreateIndex
CREATE INDEX "achievement_rarities_key_idx" ON "public"."achievement_rarities"("key");

-- CreateIndex
CREATE UNIQUE INDEX "user_gamification_userId_key" ON "public"."user_gamification"("userId");

-- CreateIndex
CREATE INDEX "user_gamification_userId_idx" ON "public"."user_gamification"("userId");

-- CreateIndex
CREATE INDEX "user_gamification_totalPoints_idx" ON "public"."user_gamification"("totalPoints");

-- CreateIndex
CREATE INDEX "user_gamification_levelId_idx" ON "public"."user_gamification"("levelId");

-- CreateIndex
CREATE INDEX "point_transactions_userId_idx" ON "public"."point_transactions"("userId");

-- CreateIndex
CREATE INDEX "point_transactions_createdAt_idx" ON "public"."point_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "point_transactions_action_idx" ON "public"."point_transactions"("action");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_key_key" ON "public"."achievements"("key");

-- CreateIndex
CREATE INDEX "achievements_key_idx" ON "public"."achievements"("key");

-- CreateIndex
CREATE INDEX "achievements_categoryId_idx" ON "public"."achievements"("categoryId");

-- CreateIndex
CREATE INDEX "achievements_rarityId_idx" ON "public"."achievements"("rarityId");

-- CreateIndex
CREATE INDEX "achievements_isActive_idx" ON "public"."achievements"("isActive");

-- CreateIndex
CREATE INDEX "user_achievements_userId_idx" ON "public"."user_achievements"("userId");

-- CreateIndex
CREATE INDEX "user_achievements_achievementId_idx" ON "public"."user_achievements"("achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_userId_achievementId_key" ON "public"."user_achievements"("userId", "achievementId");

-- CreateIndex
CREATE INDEX "favorite_badges_userId_displayOrder_idx" ON "public"."favorite_badges"("userId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_badges_userId_achievementId_key" ON "public"."favorite_badges"("userId", "achievementId");

-- CreateIndex
CREATE INDEX "monthly_leaderboards_month_rank_idx" ON "public"."monthly_leaderboards"("month", "rank");

-- CreateIndex
CREATE INDEX "monthly_leaderboards_userId_idx" ON "public"."monthly_leaderboards"("userId");

-- CreateIndex
CREATE INDEX "monthly_leaderboards_levelId_idx" ON "public"."monthly_leaderboards"("levelId");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_leaderboards_userId_month_key" ON "public"."monthly_leaderboards"("userId", "month");

-- AddForeignKey
ALTER TABLE "public"."gamification_themes" ADD CONSTRAINT "gamification_themes_requiredLevelId_fkey" FOREIGN KEY ("requiredLevelId") REFERENCES "public"."gamification_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gamification_frames" ADD CONSTRAINT "gamification_frames_requiredLevelId_fkey" FOREIGN KEY ("requiredLevelId") REFERENCES "public"."gamification_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gamification_effects" ADD CONSTRAINT "gamification_effects_requiredLevelId_fkey" FOREIGN KEY ("requiredLevelId") REFERENCES "public"."gamification_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gamification_titles" ADD CONSTRAINT "gamification_titles_requiredLevelId_fkey" FOREIGN KEY ("requiredLevelId") REFERENCES "public"."gamification_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_gamification" ADD CONSTRAINT "user_gamification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_gamification" ADD CONSTRAINT "user_gamification_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "public"."gamification_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_gamification" ADD CONSTRAINT "user_gamification_selectedThemeId_fkey" FOREIGN KEY ("selectedThemeId") REFERENCES "public"."gamification_themes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_gamification" ADD CONSTRAINT "user_gamification_selectedFrameId_fkey" FOREIGN KEY ("selectedFrameId") REFERENCES "public"."gamification_frames"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_gamification" ADD CONSTRAINT "user_gamification_selectedEffectId_fkey" FOREIGN KEY ("selectedEffectId") REFERENCES "public"."gamification_effects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_gamification" ADD CONSTRAINT "user_gamification_selectedTitleId_fkey" FOREIGN KEY ("selectedTitleId") REFERENCES "public"."gamification_titles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."point_transactions" ADD CONSTRAINT "point_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user_gamification"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."achievements" ADD CONSTRAINT "achievements_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."achievement_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."achievements" ADD CONSTRAINT "achievements_rarityId_fkey" FOREIGN KEY ("rarityId") REFERENCES "public"."achievement_rarities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_achievements" ADD CONSTRAINT "user_achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user_gamification"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_achievements" ADD CONSTRAINT "user_achievements_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "public"."achievements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."favorite_badges" ADD CONSTRAINT "favorite_badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user_gamification"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."monthly_leaderboards" ADD CONSTRAINT "monthly_leaderboards_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "public"."gamification_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
