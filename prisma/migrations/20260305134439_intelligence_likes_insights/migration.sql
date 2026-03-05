/*
  Warnings:

  - You are about to drop the column `headline` on the `IntelligenceNode` table. All the data in the column will be lost.
  - Added the required column `insight` to the `IntelligenceNode` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `IntelligenceNode` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "IntelligenceNode" DROP COLUMN "headline",
ADD COLUMN     "dislikes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "insight" TEXT NOT NULL,
ADD COLUMN     "likes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "title" TEXT NOT NULL;
