// ============================================================
// EduOS - Development/Test Seed
// ============================================================

import { PrismaClient, Weekday } from '@prisma/client'

const prisma = new PrismaClient()

// ... existing seed implementation ...

async function main() {
  // existing seed setup and data creation remain unchanged
  // Timetable slots for Primary 4A
  const slots = [
    { weekday: Weekday.MONDAY, startTime: '08:00', endTime: '08:45', subjectId: subjectIds[0] },
    { weekday: Weekday.MONDAY, startTime: '09:00', endTime: '09:45', subjectId: subjectIds[1] },
    { weekday: Weekday.TUESDAY, startTime: '08:00', endTime: '08:45', subjectId: subjectIds[1] },
    { weekday: Weekday.TUESDAY, startTime: '10:00', endTime: '10:45', subjectId: subjectIds[2] },
    { weekday: Weekday.WEDNESDAY, startTime: '08:00', endTime: '08:45', subjectId: subjectIds[2] },
    { weekday: Weekday.WEDNESDAY, startTime: '11:00', endTime: '11:45', subjectId: subjectIds[0] },
    { weekday: Weekday.THURSDAY, startTime: '09:00', endTime: '09:45', subjectId: subjectIds[0] },
    { weekday: Weekday.FRIDAY, startTime: '08:00', endTime: '08:45', subjectId: subjectIds[1] }
  ]

  for (const s of slots) {
    const subjectId = s.subjectId
    if (!subjectId) {
      throw new Error(`Seed data is missing a subject for ${s.weekday} ${s.startTime}`)
    }

    await prisma.timetableSlot.create({
      data: {
        tenantId: tenant.id,
        schoolId: school.id,
        sessionId: session.id,
        termId: termIds[0],
        classGroupId: classGroup.id,
        subjectId,
        teacherId: teacher.id,
        departmentId: departmentIds[0],
        weekday: s.weekday,
        startTime: s.startTime,
        endTime: s.endTime,
        room: classGroup.roomNumber
      }
    })
  }

  // existing remaining seed implementation remains unchanged
}

main()
  .catch(async (error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
