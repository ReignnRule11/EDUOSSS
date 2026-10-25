/* eslint-disable no-console */
import { PrismaClient, TenantStatus, UserStatus, GradeLevel, SchoolType, Gender, SessionStatus, TermStatus, Weekday, AnnouncementAudience } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!'
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@eduos.local'

if (process.env.NODE_ENV === 'production') {
  if (!process.env.SEED_ADMIN_PASSWORD || PASSWORD === 'ChangeMe123!') {
    throw new Error(
      'Refusing to seed production with a default/known admin password. Set SEED_ADMIN_PASSWORD explicitly.'
    )
  }
  if (!process.env.SEED_ADMIN_EMAIL) {
    throw new Error('Refusing to seed production without an explicit SEED_ADMIN_EMAIL.')
  }
}

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(PASSWORD, 12)

  // ---- Tenant 1: Bright Future Academy ----
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'bright-future-academy' },
    update: {},
    create: {
      name: 'Bright Future Academy',
      slug: 'bright-future-academy',
      status: TenantStatus.ACTIVE,
      plan: 'PRO',
      subscriptionStatus: 'ACTIVE',
      seats: 50,
      logoUrl: 'https://cdn.eduos.example/tenants/bfa/logo.png',
      branding: {
        primaryColor: '#2563eb',
        secondaryColor: '#0ea5e9',
        theme: 'light',
        font: 'Inter'
      },
      enabledModules: ['academics', 'attendance', 'grades', 'finance', 'library'],
      storageUsed: BigInt(1258291200), // ~1.17 GiB
      settings: { timezone: 'Africa/Lagos', locale: 'en', academicYear: '2026/2027' }
    }
  })

  // Custom domain for tenant 1
  await prisma.tenantDomain.upsert({
    where: { domain: 'academy.brightfuture.example' },
    update: {},
    create: {
      tenantId: tenant.id,
      domain: 'academy.brightfuture.example',
      isVerified: true,
      isPrimary: true,
      verifiedAt: new Date()
    }
  })

  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: ADMIN_EMAIL } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: ADMIN_EMAIL,
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'TENANT_ADMIN',
      status: UserStatus.ACTIVE
    }
  })

  // Membership record enabling tenant switching
  await prisma.userTenant.upsert({
    where: { userId_tenantId: { userId: admin.id, tenantId: tenant.id } },
    update: {},
    create: { userId: admin.id, tenantId: tenant.id, role: admin.role }
  })

  const school = await prisma.school.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'BFA' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Bright Future Academy',
      code: 'BFA',
      type: SchoolType.K_12,
      address: '12 Education Avenue, Lekki, Lagos',
      phone: '+234-800-000-0000',
      email: 'info@bfa.example',
      establishedYear: 2005,
      motto: 'Knowledge is Light',
      academicYear: '2026/2027'
    }
  })

  const seedStudents = [
    { admissionNumber: 'BFA/2026/0001', firstName: 'Amina', lastName: 'Bello', gender: Gender.FEMALE, gradeLevel: GradeLevel.PRIMARY, guardianName: 'Ibrahim Bello', guardianPhone: '+234-800-000-0001', guardianEmail: 'i.bello@example.com' },
    { admissionNumber: 'BFA/2026/0002', firstName: 'Chidi', lastName: 'Okafor', gender: Gender.MALE, gradeLevel: GradeLevel.PRIMARY, guardianName: 'Ngozi Okafor', guardianPhone: '+234-800-000-0002', guardianEmail: 'n.okafor@example.com' },
    { admissionNumber: 'BFA/2026/0003', firstName: 'Fatima', lastName: 'Suleiman', gender: Gender.FEMALE, gradeLevel: GradeLevel.JUNIOR_SECONDARY, guardianName: 'Musa Suleiman', guardianPhone: '+234-800-000-0003', guardianEmail: 'm.suleiman@example.com' },
    { admissionNumber: 'BFA/2026/0004', firstName: 'Emeka', lastName: 'Nwosu', gender: Gender.MALE, gradeLevel: GradeLevel.SENIOR_SECONDARY, guardianName: 'Ada Nwosu', guardianPhone: '+234-800-000-0004', guardianEmail: 'a.nwosu@example.com' }
  ]

  const studentIds: string[] = []
  for (const s of seedStudents) {
    const student = await prisma.student.upsert({
      where: { tenantId_admissionNumber: { tenantId: tenant.id, admissionNumber: s.admissionNumber } },
      update: {},
      create: {
        tenantId: tenant.id,
        schoolId: school.id,
        admissionNumber: s.admissionNumber,
        firstName: s.firstName,
        lastName: s.lastName,
        gender: s.gender,
        gradeLevel: s.gradeLevel,
        guardianName: s.guardianName,
        guardianPhone: s.guardianPhone,
        guardianEmail: s.guardianEmail
      }
    })
    studentIds.push(student.id)
  }

  const teacher = await prisma.teacher.upsert({
    where: { tenantId_staffNumber: { tenantId: tenant.id, staffNumber: 'BFA-T001' } },
    update: {},
    create: {
      tenantId: tenant.id,
      schoolId: school.id,
      staffNumber: 'BFA-T001',
      firstName: 'Grace',
      lastName: 'Adekunle',
      gender: Gender.FEMALE,
      phone: '+234-800-000-0100',
      email: 'g.adekunle@bfa.example',
      specialization: 'Mathematics',
      joinedAt: new Date('2020-09-01')
    }
  })

  const classGroup = await prisma.classGroup.upsert({
    where: { tenantId_schoolId_name_academicYear: { tenantId: tenant.id, schoolId: school.id, name: 'Primary 4A', academicYear: '2026/2027' } },
    update: {},
    create: {
      tenantId: tenant.id,
      schoolId: school.id,
      name: 'Primary 4A',
      gradeLevel: GradeLevel.PRIMARY,
      roomNumber: 'P4A',
      capacity: 40,
      headTeacherId: teacher.id,
      academicYear: '2026/2027'
    }
  })

  const subjects = [
    { name: 'Mathematics', code: 'MATH' },
    { name: 'English Language', code: 'ENG' },
    { name: 'Basic Science', code: 'SCI' }
  ]

  const subjectIds: string[] = []
  for (const sub of subjects) {
    const subject = await prisma.subject.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: sub.code } },
      update: {},
      create: { tenantId: tenant.id, name: sub.name, code: sub.code, description: `${sub.name} subject`, credits: 1 }
    })
    subjectIds.push(subject.id)
    await prisma.classSubject.upsert({
      where: { tenantId_classGroupId_subjectId: { tenantId: tenant.id, classGroupId: classGroup.id, subjectId: subject.id } },
      update: {},
      create: { tenantId: tenant.id, classGroupId: classGroup.id, subjectId: subject.id, teacherId: teacher.id }
    })
  }

  for (const studentId of studentIds) {
    await prisma.enrollment.upsert({
      where: { tenantId_studentId_academicYear_term: { tenantId: tenant.id, studentId, academicYear: '2026/2027', term: 'FIRST' } },
      update: {},
      create: { tenantId: tenant.id, studentId, classGroupId: classGroup.id, academicYear: '2026/2027', term: 'FIRST' }
    })
  }

  // ---- School Administration domain ----

  // Academic session + terms
  const session = await prisma.academicSession.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: '2026-2027' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: '2026/2027 Academic Year',
      code: '2026-2027',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-07-31'),
      status: SessionStatus.ACTIVE,
      isCurrent: true
    }
  })

  const terms = [
    { name: 'First Term', number: 1, startDate: new Date('2026-09-01'), endDate: new Date('2026-12-18'), status: TermStatus.ACTIVE, isCurrent: true },
    { name: 'Second Term', number: 2, startDate: new Date('2027-01-04'), endDate: new Date('2027-04-02'), status: TermStatus.UPCOMING, isCurrent: false },
    { name: 'Third Term', number: 3, startDate: new Date('2027-04-12'), endDate: new Date('2027-07-31'), status: TermStatus.UPCOMING, isCurrent: false }
  ]

  const termIds: string[] = []
  for (const t of terms) {
    const term = await prisma.academicTerm.upsert({
      where: { tenantId_sessionId_number: { tenantId: tenant.id, sessionId: session.id, number: t.number } },
      update: {},
      create: {
        tenantId: tenant.id,
        sessionId: session.id,
        name: t.name,
        number: t.number,
        startDate: t.startDate,
        endDate: t.endDate,
        status: t.status,
        isCurrent: t.isCurrent
      }
    })
    termIds.push(term.id)
  }

  // Departments
  const departments = [
    { name: 'Science & Technology', code: 'SCI-TECH', description: 'Physics, Chemistry, Biology and ICT' },
    { name: 'Humanities & Languages', code: 'HUM-LANG', description: 'English, Literature and Modern Languages' },
    { name: 'Mathematics', code: 'MATH-DEPT', description: 'Pure and Applied Mathematics' }
  ]

  const departmentIds: string[] = []
  for (const d of departments) {
    const department = await prisma.department.upsert({
      where: { tenantId_schoolId_code: { tenantId: tenant.id, schoolId: school.id, code: d.code } },
      update: {},
      create: {
        tenantId: tenant.id,
        schoolId: school.id,
        name: d.name,
        code: d.code,
        description: d.description,
        headTeacherId: teacher.id
      }
    })
    departmentIds.push(department.id)
  }

  // Assign the teacher to a department
  await prisma.teacher.update({
    where: { id: teacher.id },
    data: { departmentId: departmentIds[0] }
  })

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
    await prisma.timetableSlot.create({
      data: {
        tenantId: tenant.id,
        schoolId: school.id,
        sessionId: session.id,
        termId: termIds[0],
        classGroupId: classGroup.id,
        subjectId: s.subjectId,
        teacherId: teacher.id,
        departmentId: departmentIds[0],
        weekday: s.weekday,
        startTime: s.startTime,
        endTime: s.endTime,
        room: classGroup.roomNumber
      }
    })
  }

  // Announcements
  const announcements = [
    { title: 'Welcome to the 2026/2027 Academic Year', body: 'We are excited to welcome all students and parents to a brand new academic year. Classes resume Monday at 8:00 AM.', audience: AnnouncementAudience.ALL, pinned: true },
    { title: 'Parent-Teacher Conference', body: 'The first parent-teacher conference of the term holds on the third Saturday of November. More details to follow.', audience: AnnouncementAudience.PARENTS, pinned: false },
    { title: 'Staff Professional Development Day', body: 'All teaching staff are required to attend the professional development workshop on the first Friday of each month.', audience: AnnouncementAudience.STAFF, pinned: false }
  ]

  for (const a of announcements) {
    await prisma.announcement.create({
      data: {
        tenantId: tenant.id,
        authorId: admin.id,
        title: a.title,
        body: a.body,
        audience: a.audience,
        pinned: a.pinned
      }
    })
  }

  const audit = await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorId: admin.id,
      actorEmail: admin.email,
      role: admin.role,
      action: 'CREATE',
      resource: 'Seed',
      metadata: {
        tenants: 1,
        users: 1,
        students: studentIds.length,
        subjects: subjectIds.length
      }
    }
  })

  // ---- Tenant 2: Sunrise International School (isolation demo) ----
  const tenant2 = await prisma.tenant.upsert({
    where: { slug: 'sunrise-international' },
    update: {},
    create: {
      name: 'Sunrise International School',
      slug: 'sunrise-international',
      status: TenantStatus.ACTIVE,
      plan: 'FREE',
      subscriptionStatus: 'TRIAL',
      branding: { primaryColor: '#f59e0b', theme: 'light' },
      enabledModules: ['academics', 'attendance'],
      settings: { timezone: 'Africa/Nairobi', locale: 'en', academicYear: '2026/2027' }
    }
  })

  const admin2Email = 'admin@sunrise.example'
  const admin2 = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant2.id, email: admin2Email } },
    update: {},
    create: {
      tenantId: tenant2.id,
      email: admin2Email,
      passwordHash,
      firstName: 'Sunrise',
      lastName: 'Administrator',
      role: 'TENANT_ADMIN',
      status: UserStatus.ACTIVE
    }
  })

  await prisma.userTenant.upsert({
    where: { userId_tenantId: { userId: admin2.id, tenantId: tenant2.id } },
    update: {},
    create: { userId: admin2.id, tenantId: tenant2.id, role: admin2.role }
  })

  await prisma.school.upsert({
    where: { tenantId_code: { tenantId: tenant2.id, code: 'SIS' } },
    update: {},
    create: {
      tenantId: tenant2.id,
      name: 'Sunrise International School',
      code: 'SIS',
      type: SchoolType.INTERNATIONAL,
      academicYear: '2026/2027'
    }
  })

  await prisma.student.upsert({
    where: { tenantId_admissionNumber: { tenantId: tenant2.id, admissionNumber: 'SIS/2026/0001' } },
    update: {},
    create: {
      tenantId: tenant2.id,
      schoolId: (await prisma.school.findFirstOrThrow({ where: { tenantId: tenant2.id } })).id,
      admissionNumber: 'SIS/2026/0001',
      firstName: 'Kwame',
      lastName: 'Otieno',
      gender: Gender.MALE,
      gradeLevel: GradeLevel.PRIMARY
    }
  })

  console.log('Seed completed successfully:')
  console.log(`  Tenant 1     : ${tenant.slug} (${tenant.id})`)
  console.log(`  Tenant 2     : ${tenant2.slug} (${tenant2.id})`)
  console.log(`  Admin email  : ${admin.email} / ${admin2.email}`)
  console.log(`  Admin pass   : ${PASSWORD}`)
  console.log(`  School       : ${school.code} - ${school.name}`)
  console.log(`  Students     : ${studentIds.length}`)
  console.log(`  Teacher      : ${teacher.staffNumber}`)
  console.log(`  Class        : ${classGroup.name}`)
  console.log(`  Session      : ${session.code} (${termIds.length} terms)`)
  console.log(`  Departments  : ${departmentIds.length}`)
  console.log(`  Timetable    : ${slots.length} slots seeded`)
  console.log(`  Announcements: ${announcements.length} seeded`)
  console.log(`  Audit entry  : ${audit.id}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
