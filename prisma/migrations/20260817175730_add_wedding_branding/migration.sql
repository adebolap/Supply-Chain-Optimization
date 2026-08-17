-- AlterTable
ALTER TABLE "Wedding" ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
