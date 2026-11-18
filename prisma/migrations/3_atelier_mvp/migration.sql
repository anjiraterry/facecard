-- Atelier MVP Schema Migration + Existing Drift Reconciliation

-- Reconcile existing drift on User.avatarUrl
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

-- Enums
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "RitualStepKind" AS ENUM ('CLEANSE', 'TREAT', 'HYDRATE', 'PROTECT');
CREATE TYPE "InventoryMovementType" AS ENUM ('STOCK_RECEIVED', 'RESERVED', 'RESERVATION_RELEASED', 'SALE', 'RETURN_RESTOCK', 'DAMAGED', 'EXPIRED', 'ADJUSTMENT');
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'RELEASED', 'EXPIRED');
CREATE TYPE "BagStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'ABANDONED');
CREATE TYPE "CheckoutStatus" AS ENUM ('OPEN', 'COMPLETED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');
CREATE TYPE "FulfilmentStatus" AS ENUM ('UNFULFILLED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');
CREATE TYPE "PaymentProvider" AS ENUM ('PAYSTACK');
CREATE TYPE "SkinType" AS ENUM ('NORMAL', 'DRY', 'OILY', 'COMBINATION', 'UNSURE');
CREATE TYPE "SensitivityLevel" AS ENUM ('NOT_REPORTED', 'OCCASIONAL', 'FREQUENT', 'UNSURE');
CREATE TYPE "RoutineExperience" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
CREATE TYPE "RoutinePreference" AS ENUM ('MINIMAL', 'BALANCED', 'ADVANCED');
CREATE TYPE "TimeOfDay" AS ENUM ('AM', 'PM');

-- Catalogue
CREATE TABLE "Brand" (
  "id" UUID NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "country" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

CREATE TABLE "ProductCategory" (
  "id" UUID NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "parentId" UUID,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ProductCategory_slug_key" ON "ProductCategory"("slug");

CREATE TABLE "AtelierProduct" (
  "id" UUID NOT NULL,
  "slug" TEXT NOT NULL,
  "brandId" UUID NOT NULL,
  "categoryId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "subtitle" TEXT,
  "description" TEXT NOT NULL,
  "benefits" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "howToUse" TEXT,
  "warnings" TEXT,
  "ingredientList" TEXT,
  "countryOfOrigin" TEXT,
  "ritualStep" "RitualStepKind" NOT NULL DEFAULT 'TREAT',
  "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "AtelierProduct_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AtelierProduct_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AtelierProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AtelierProduct_slug_key" ON "AtelierProduct"("slug");
CREATE INDEX "AtelierProduct_status_featured_idx" ON "AtelierProduct"("status", "featured");
CREATE INDEX "AtelierProduct_categoryId_idx" ON "AtelierProduct"("categoryId");
CREATE INDEX "AtelierProduct_brandId_idx" ON "AtelierProduct"("brandId");

CREATE TABLE "ProductVariant" (
  "id" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "sku" TEXT NOT NULL,
  "barcode" TEXT,
  "name" TEXT NOT NULL,
  "sizeLabel" TEXT,
  "volumeMl" DECIMAL(10,2),
  "weightGrams" DECIMAL(10,2),
  "priceMinor" BIGINT NOT NULL CHECK ("priceMinor" >= 0),
  "compareAtPriceMinor" BIGINT,
  "costPriceMinor" BIGINT,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "AtelierProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");
CREATE UNIQUE INDEX "ProductVariant_barcode_key" ON "ProductVariant"("barcode");
CREATE INDEX "ProductVariant_productId_isActive_idx" ON "ProductVariant"("productId", "isActive");

CREATE TABLE "ProductImage" (
  "id" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "objectKey" TEXT NOT NULL,
  "altText" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "AtelierProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ProductImage_productId_sortOrder_idx" ON "ProductImage"("productId", "sortOrder");

CREATE TABLE "Ingredient" (
  "id" UUID NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "inciName" TEXT,
  "summary" TEXT,
  "isPotentialIrritant" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Ingredient_slug_key" ON "Ingredient"("slug");

CREATE TABLE "ProductIngredient" (
  "productId" UUID NOT NULL,
  "ingredientId" UUID NOT NULL,
  "isKeyActive" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "ProductIngredient_pkey" PRIMARY KEY ("productId", "ingredientId"),
  CONSTRAINT "ProductIngredient_productId_fkey" FOREIGN KEY ("productId") REFERENCES "AtelierProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProductIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "SkinConcern" (
  "id" UUID NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  CONSTRAINT "SkinConcern_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SkinConcern_slug_key" ON "SkinConcern"("slug");

CREATE TABLE "ProductConcern" (
  "productId" UUID NOT NULL,
  "concernId" UUID NOT NULL,
  "strength" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "ProductConcern_pkey" PRIMARY KEY ("productId", "concernId"),
  CONSTRAINT "ProductConcern_productId_fkey" FOREIGN KEY ("productId") REFERENCES "AtelierProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProductConcern_concernId_fkey" FOREIGN KEY ("concernId") REFERENCES "SkinConcern"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ProductSkinType" (
  "productId" UUID NOT NULL,
  "skinType" "SkinType" NOT NULL,
  CONSTRAINT "ProductSkinType_pkey" PRIMARY KEY ("productId", "skinType"),
  CONSTRAINT "ProductSkinType_productId_fkey" FOREIGN KEY ("productId") REFERENCES "AtelierProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Collection" (
  "id" UUID NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");

CREATE TABLE "CollectionProduct" (
  "collectionId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "CollectionProduct_pkey" PRIMARY KEY ("collectionId", "productId"),
  CONSTRAINT "CollectionProduct_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CollectionProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "AtelierProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Inventory
CREATE TABLE "InventoryLocation" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "city" TEXT,
  "state" TEXT,
  "country" TEXT NOT NULL DEFAULT 'NG',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryLocation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InventoryLocation_code_key" ON "InventoryLocation"("code");

CREATE TABLE "InventoryLevel" (
  "id" UUID NOT NULL,
  "variantId" UUID NOT NULL,
  "locationId" UUID NOT NULL,
  "onHand" INTEGER NOT NULL DEFAULT 0,
  "reserved" INTEGER NOT NULL DEFAULT 0,
  "reorderLevel" INTEGER NOT NULL DEFAULT 5,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryLevel_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryLevel_onHand_nonneg" CHECK ("onHand" >= 0),
  CONSTRAINT "InventoryLevel_reserved_nonneg" CHECK ("reserved" >= 0),
  CONSTRAINT "InventoryLevel_reserved_le_onHand" CHECK ("reserved" <= "onHand"),
  CONSTRAINT "InventoryLevel_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InventoryLevel_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "InventoryLevel_variantId_locationId_key" ON "InventoryLevel"("variantId", "locationId");

CREATE TABLE "InventoryMovement" (
  "id" UUID NOT NULL,
  "variantId" UUID NOT NULL,
  "locationId" UUID NOT NULL,
  "type" "InventoryMovementType" NOT NULL,
  "onHandDelta" INTEGER NOT NULL,
  "reservedDelta" INTEGER NOT NULL,
  "referenceType" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL,
  "operationKey" TEXT NOT NULL,
  "performedById" UUID,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryMovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryMovement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "InventoryMovement_operationKey_key" ON "InventoryMovement"("operationKey");
CREATE INDEX "InventoryMovement_variantId_createdAt_idx" ON "InventoryMovement"("variantId", "createdAt");

CREATE OR REPLACE FUNCTION forbid_inventory_movement_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'InventoryMovement is append-only (% blocked)', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "InventoryMovement_append_only"
BEFORE UPDATE OR DELETE ON "InventoryMovement"
FOR EACH ROW EXECUTE FUNCTION forbid_inventory_movement_mutation();

-- Bag, Wishlist, Addresses, Delivery
CREATE TABLE "ShoppingBag" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "status" "BagStatus" NOT NULL DEFAULT 'ACTIVE',
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShoppingBag_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ShoppingBag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ShoppingBag_userId_status_idx" ON "ShoppingBag"("userId", "status");

CREATE TABLE "BagItem" (
  "id" UUID NOT NULL,
  "bagId" UUID NOT NULL,
  "variantId" UUID NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1 CHECK ("quantity" > 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BagItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BagItem_bagId_fkey" FOREIGN KEY ("bagId") REFERENCES "ShoppingBag"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BagItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "BagItem_bagId_variantId_key" ON "BagItem"("bagId", "variantId");

CREATE TABLE "WishlistItem" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "AtelierProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WishlistItem_userId_productId_key" ON "WishlistItem"("userId", "productId");

CREATE TABLE "Address" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "label" TEXT,
  "recipientName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "line1" TEXT NOT NULL,
  "line2" TEXT,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "country" TEXT NOT NULL DEFAULT 'NG',
  "postalCode" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Address_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Address_userId_idx" ON "Address"("userId");

CREATE TABLE "DeliveryZone" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "states" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DeliveryZone_code_key" ON "DeliveryZone"("code");

CREATE TABLE "ShippingRate" (
  "id" UUID NOT NULL,
  "zoneId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "amountMinor" BIGINT NOT NULL CHECK ("amountMinor" >= 0),
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "estimatedDays" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "ShippingRate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ShippingRate_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "DeliveryZone"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Checkout, Reservations, Orders, Payments
CREATE TABLE "CheckoutSession" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "bagId" UUID,
  "status" "CheckoutStatus" NOT NULL DEFAULT 'OPEN',
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "subtotalMinor" BIGINT NOT NULL CHECK ("subtotalMinor" >= 0),
  "discountMinor" BIGINT NOT NULL DEFAULT 0 CHECK ("discountMinor" >= 0),
  "shippingMinor" BIGINT NOT NULL DEFAULT 0 CHECK ("shippingMinor" >= 0),
  "taxMinor" BIGINT NOT NULL DEFAULT 0 CHECK ("taxMinor" >= 0),
  "totalMinor" BIGINT NOT NULL CHECK ("totalMinor" >= 0),
  "addressSnapshot" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CheckoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CheckoutSession_userId_status_idx" ON "CheckoutSession"("userId", "status");
CREATE INDEX "CheckoutSession_expiresAt_idx" ON "CheckoutSession"("expiresAt");

CREATE TABLE "InventoryReservation" (
  "id" UUID NOT NULL,
  "checkoutSessionId" UUID NOT NULL,
  "variantId" UUID NOT NULL,
  "locationId" UUID NOT NULL,
  "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
  "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "releasedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryReservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryReservation_checkoutSessionId_fkey" FOREIGN KEY ("checkoutSessionId") REFERENCES "CheckoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InventoryReservation_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryReservation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "InventoryReservation_status_expiresAt_idx" ON "InventoryReservation"("status", "expiresAt");
CREATE INDEX "InventoryReservation_checkoutSessionId_idx" ON "InventoryReservation"("checkoutSessionId");

CREATE TABLE "Order" (
  "id" UUID NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "userId" UUID NOT NULL,
  "checkoutSessionId" UUID NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "subtotalMinor" BIGINT NOT NULL CHECK ("subtotalMinor" >= 0),
  "discountMinor" BIGINT NOT NULL DEFAULT 0 CHECK ("discountMinor" >= 0),
  "shippingMinor" BIGINT NOT NULL DEFAULT 0 CHECK ("shippingMinor" >= 0),
  "taxMinor" BIGINT NOT NULL DEFAULT 0 CHECK ("taxMinor" >= 0),
  "totalMinor" BIGINT NOT NULL CHECK ("totalMinor" >= 0),
  "orderStatus" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "fulfilmentStatus" "FulfilmentStatus" NOT NULL DEFAULT 'UNFULFILLED',
  "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Order_checkoutSessionId_fkey" FOREIGN KEY ("checkoutSessionId") REFERENCES "CheckoutSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE UNIQUE INDEX "Order_checkoutSessionId_key" ON "Order"("checkoutSessionId");
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");

CREATE TABLE "OrderItem" (
  "id" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "variantId" UUID NOT NULL,
  "productNameSnapshot" TEXT NOT NULL,
  "brandNameSnapshot" TEXT NOT NULL,
  "variantNameSnapshot" TEXT NOT NULL,
  "skuSnapshot" TEXT NOT NULL,
  "imageKeySnapshot" TEXT,
  "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
  "unitPriceMinor" BIGINT NOT NULL CHECK ("unitPriceMinor" >= 0),
  "discountMinor" BIGINT NOT NULL DEFAULT 0,
  "taxMinor" BIGINT NOT NULL DEFAULT 0,
  "lineTotalMinor" BIGINT NOT NULL CHECK ("lineTotalMinor" >= 0),
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

CREATE TABLE "OrderAddress" (
  "id" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "recipientName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "line1" TEXT NOT NULL,
  "line2" TEXT,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "postalCode" TEXT,
  CONSTRAINT "OrderAddress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderAddress_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OrderAddress_orderId_key" ON "OrderAddress"("orderId");

CREATE TABLE "OrderStatusEvent" (
  "id" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "note" TEXT,
  "actorId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderStatusEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderStatusEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "OrderStatusEvent_orderId_createdAt_idx" ON "OrderStatusEvent"("orderId", "createdAt");

CREATE TABLE "PaymentTransaction" (
  "id" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "provider" "PaymentProvider" NOT NULL DEFAULT 'PAYSTACK',
  "reference" TEXT NOT NULL,
  "providerTransactionId" TEXT,
  "amountMinor" BIGINT NOT NULL CHECK ("amountMinor" >= 0),
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "failureReason" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PaymentTransaction_reference_key" ON "PaymentTransaction"("reference");
CREATE INDEX "PaymentTransaction_orderId_idx" ON "PaymentTransaction"("orderId");

CREATE TABLE "PaymentWebhookEvent" (
  "id" UUID NOT NULL,
  "provider" "PaymentProvider" NOT NULL DEFAULT 'PAYSTACK',
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "reference" TEXT,
  "payload" JSONB NOT NULL,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaymentWebhookEvent_eventId_key" ON "PaymentWebhookEvent"("eventId");
CREATE INDEX "PaymentWebhookEvent_reference_idx" ON "PaymentWebhookEvent"("reference");

-- Skincare Intelligence
CREATE TABLE "SkinProfile" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "skinType" "SkinType" NOT NULL DEFAULT 'UNSURE',
  "sensitivityLevel" "SensitivityLevel",
  "experienceLevel" "RoutineExperience",
  "routinePreference" "RoutinePreference",
  "budgetMinMinor" BIGINT,
  "budgetMaxMinor" BIGINT,
  "preferredCurrency" TEXT NOT NULL DEFAULT 'NGN',
  "questionnaireVersion" INTEGER NOT NULL DEFAULT 1,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SkinProfile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SkinProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SkinProfile_userId_key" ON "SkinProfile"("userId");

CREATE TABLE "SkinProfileConcern" (
  "skinProfileId" UUID NOT NULL,
  "concernId" UUID NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "SkinProfileConcern_pkey" PRIMARY KEY ("skinProfileId", "concernId"),
  CONSTRAINT "SkinProfileConcern_skinProfileId_fkey" FOREIGN KEY ("skinProfileId") REFERENCES "SkinProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SkinProfileConcern_concernId_fkey" FOREIGN KEY ("concernId") REFERENCES "SkinConcern"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "SkinProfileSensitivity" (
  "id" UUID NOT NULL,
  "skinProfileId" UUID NOT NULL,
  "label" TEXT NOT NULL,
  CONSTRAINT "SkinProfileSensitivity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SkinProfileSensitivity_skinProfileId_fkey" FOREIGN KEY ("skinProfileId") REFERENCES "SkinProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SkinProfileSensitivity_skinProfileId_label_key" ON "SkinProfileSensitivity"("skinProfileId", "label");

CREATE TABLE "SkinConsent" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "version" TEXT NOT NULL,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "withdrawnAt" TIMESTAMP(3),
  CONSTRAINT "SkinConsent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SkinConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SkinConsent_userId_grantedAt_idx" ON "SkinConsent"("userId", "grantedAt");

CREATE TABLE "SkincareRoutine" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "name" TEXT NOT NULL DEFAULT 'My Daily Ritual',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SkincareRoutine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SkincareRoutine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SkincareRoutine_userId_isActive_idx" ON "SkincareRoutine"("userId", "isActive");

CREATE TABLE "RoutineStep" (
  "id" UUID NOT NULL,
  "routineId" UUID NOT NULL,
  "timeOfDay" "TimeOfDay" NOT NULL,
  "stepNumber" INTEGER NOT NULL,
  "stepTitle" TEXT NOT NULL,
  "guidance" TEXT,
  CONSTRAINT "RoutineStep_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RoutineStep_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "SkincareRoutine"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RoutineStep_routineId_timeOfDay_stepNumber_key" ON "RoutineStep"("routineId", "timeOfDay", "stepNumber");

CREATE TABLE "RoutineStepProduct" (
  "stepId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  CONSTRAINT "RoutineStepProduct_pkey" PRIMARY KEY ("stepId", "productId"),
  CONSTRAINT "RoutineStepProduct_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "RoutineStep"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RoutineStepProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "AtelierProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
