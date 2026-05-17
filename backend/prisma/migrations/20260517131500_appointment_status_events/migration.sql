-- CreateTable
CREATE TABLE "AppointmentStatusEvent" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "fromStatus" "AppointmentStatus",
    "toStatus" "AppointmentStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppointmentStatusEvent_appointmentId_changedAt_idx" ON "AppointmentStatusEvent"("appointmentId", "changedAt");

-- CreateIndex
CREATE INDEX "AppointmentStatusEvent_toStatus_idx" ON "AppointmentStatusEvent"("toStatus");

-- AddForeignKey
ALTER TABLE "AppointmentStatusEvent" ADD CONSTRAINT "AppointmentStatusEvent_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
