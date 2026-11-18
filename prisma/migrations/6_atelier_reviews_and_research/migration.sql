-- Atelier Product Reviews & Ratings

CREATE TABLE IF NOT EXISTS "ProductReview" (
  "id" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "rating" INTEGER NOT NULL,
  "title" TEXT,
  "body" TEXT NOT NULL,
  "skinType" "SkinType",
  "verifiedPurchase" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "AtelierProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProductReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductReview_productId_userId_key" ON "ProductReview"("productId", "userId");
CREATE INDEX IF NOT EXISTS "ProductReview_productId_createdAt_idx" ON "ProductReview"("productId", "createdAt");
