CREATE TYPE "CareerConnectionProvider" AS ENUM ('mail', 'linkedin');
CREATE TYPE "CareerConnectionStatus" AS ENUM ('idle', 'connecting', 'connected', 'limited', 'error', 'revoked');

CREATE TABLE "CareerConnection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "CareerConnectionProvider" NOT NULL,
  "status" "CareerConnectionStatus" NOT NULL DEFAULT 'idle',
  "connected" BOOLEAN NOT NULL DEFAULT false,
  "meta" JSONB,
  "scopes" TEXT[] NOT NULL,
  "lastSyncAt" TIMESTAMP(3),
  "tokenExpiresAt" TIMESTAMP(3),
  "providerAccountId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CareerConnection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CareerConnection_userId_provider_idx" ON "CareerConnection"("userId", "provider");
ALTER TABLE "CareerConnection" ADD CONSTRAINT "CareerConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
