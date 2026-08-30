-- CreateTable
CREATE TABLE "parent_messages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "parent_messages_tenantId_studentId_createdAt_idx" ON "parent_messages"("tenantId", "studentId", "createdAt");

-- CreateIndex
CREATE INDEX "parent_messages_tenantId_receiverId_readAt_idx" ON "parent_messages"("tenantId", "receiverId", "readAt");

-- AddForeignKey
ALTER TABLE "parent_messages" ADD CONSTRAINT "parent_messages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_messages" ADD CONSTRAINT "parent_messages_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_messages" ADD CONSTRAINT "parent_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_messages" ADD CONSTRAINT "parent_messages_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
