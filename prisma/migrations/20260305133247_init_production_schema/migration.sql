-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "industry" TEXT,
    "businessDetail" TEXT,
    "hours" INTEGER,
    "workflow" TEXT,
    "auditName" TEXT,
    "auditEmail" TEXT,
    "auditPhone" TEXT,
    "companyName" TEXT,
    "coolingMethod" TEXT,
    "monthlyBill" DOUBLE PRECISION,
    "annualDowntime" DOUBLE PRECISION,
    "serverDensity" TEXT,
    "thermalTax" DOUBLE PRECISION,
    "maintenanceCost" DOUBLE PRECISION,
    "totalLeak" DOUBLE PRECISION,
    "whatsappContact" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'NEW',

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseStudy" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "metricValue" TEXT NOT NULL,
    "metricLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseStudy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntelligenceNode" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sector" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "marketEvent" TEXT NOT NULL,
    "logicAnalysis" TEXT NOT NULL,
    "conversionStep" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "IntelligenceNode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CaseStudy_slug_key" ON "CaseStudy"("slug");
