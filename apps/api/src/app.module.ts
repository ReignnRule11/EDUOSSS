import {
  Module,
  type NestModule,
  type MiddlewareConsumer,
} from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { TenantGuard } from "./common/guards/tenant.guard";
import { AuditInterceptor } from "./common/interceptors/audit.interceptor";
import { CacheInterceptor } from "./common/interceptors/cache.interceptor";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { RequestLoggingMiddleware } from "./common/middleware/request-logging.middleware";
import { TenantContextMiddleware } from "./common/middleware/tenant-context.middleware";
import configuration from "./config/configuration";
import { envValidationSchema } from "./config/env.validation";
import { PrismaModule } from "./database/prisma.module";
import { RedisModule } from "./database/redis.module";
import { AcademicSessionsModule } from "./modules/academic-sessions/academic-sessions.module";
import { AiModule } from "./modules/ai/ai.module";
import { AnnouncementsModule } from "./modules/announcements/announcements.module";
import { AttendanceModule } from "./modules/attendance/attendance.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CbtAttemptsModule } from "./modules/cbt-attempts/cbt-attempts.module";
import { CbtExamsModule } from "./modules/cbt-exams/cbt-exams.module";
import { CbtQuestionsModule } from "./modules/cbt-questions/cbt-questions.module";
import { ClassesModule } from "./modules/classes/classes.module";
import { CourseAssignmentsModule } from "./modules/course-assignments/course-assignments.module";
import { CourseCertificatesModule } from "./modules/course-certificates/course-certificates.module";
import { CourseEnrollmentsModule } from "./modules/course-enrollments/course-enrollments.module";
import { CourseForumModule } from "./modules/course-forum/course-forum.module";
import { CourseHomeworkModule } from "./modules/course-homework/course-homework.module";
import { CourseLessonsModule } from "./modules/course-lessons/course-lessons.module";
import { CourseLiveClassesModule } from "./modules/course-live-classes/course-live-classes.module";
import { CourseRecordedSessionsModule } from "./modules/course-recorded-sessions/course-recorded-sessions.module";
import { CoursesModule } from "./modules/courses/courses.module";
import { DepartmentsModule } from "./modules/departments/departments.module";
import { DisciplineRecordsModule } from "./modules/discipline-records/discipline-records.module";
import { EnrollmentsModule } from "./modules/enrollments/enrollments.module";
import { EnterpriseDashboardsModule } from "./modules/enterprise-dashboards/enterprise-dashboards.module";
import { FilesModule } from "./modules/files/files.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { GradesModule } from "./modules/grades/grades.module";
import { GuardiansModule } from "./modules/guardians/guardians.module";
import { HealthModule } from "./modules/health/health.module";
import { MailModule } from "./modules/mail/mail.module";
import { MedicalRecordsModule } from "./modules/medical-records/medical-records.module";
import { ParentPortalModule } from "./modules/parent-portal/parent-portal.module";
import { PushModule } from "./modules/push/push.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { ResultProcessingModule } from "./modules/result-processing/result-processing.module";
import { SchoolsModule } from "./modules/schools/schools.module";
import { StudentDocumentsModule } from "./modules/student-documents/student-documents.module";
import { StudentPromotionsModule } from "./modules/student-promotions/student-promotions.module";
import { StudentTransfersModule } from "./modules/student-transfers/student-transfers.module";
import { StudentsModule } from "./modules/students/students.module";
import { SubjectsModule } from "./modules/subjects/subjects.module";
import { TeacherAttendanceModule } from "./modules/teacher-attendance/teacher-attendance.module";
import { TeacherDocumentsModule } from "./modules/teacher-documents/teacher-documents.module";
import { TeacherEmploymentHistoryModule } from "./modules/teacher-employment-history/teacher-employment-history.module";
import { TeacherLeaveRequestsModule } from "./modules/teacher-leave-requests/teacher-leave-requests.module";
import { TeacherPerformanceReviewsModule } from "./modules/teacher-performance-reviews/teacher-reviews.module";
import { TeacherQualificationsModule } from "./modules/teacher-qualifications/teacher-qualifications.module";
import { TeacherSalariesModule } from "./modules/teacher-salaries/teacher-salaries.module";
import { TeachersModule } from "./modules/teachers/teachers.module";
import { TenantsModule } from "./modules/tenants/tenants.module";
import { TermsModule } from "./modules/terms/terms.module";
import { TimelineModule } from "./modules/timeline/timeline.module";
import { TimetableModule } from "./modules/timetable/timetable.module";
import { UsersModule } from "./modules/users/users.module";
import { StorageModule } from "./storage/storage.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>("throttle.ttlMs") ?? 60_000,
          limit: config.get<number>("throttle.limit") ?? 100,
        },
      ],
    }),
    PrismaModule,
    RedisModule,
    StorageModule,
    MailModule,
    AuthModule,
    AiModule,
    TenantsModule,
    UsersModule,
    SchoolsModule,
    StudentsModule,
    TeachersModule,
    ClassesModule,
    SubjectsModule,
    EnrollmentsModule,
    EnterpriseDashboardsModule,
    AttendanceModule,
    GradesModule,
    AuditModule,
    FilesModule,
    FinanceModule,
    CoursesModule,
    CbtQuestionsModule,
    CbtExamsModule,
    CbtAttemptsModule,
    CourseLessonsModule,
    CourseEnrollmentsModule,
    CourseForumModule,
    CourseAssignmentsModule,
    CourseHomeworkModule,
    CourseLiveClassesModule,
    CourseRecordedSessionsModule,
    CourseCertificatesModule,
    AcademicSessionsModule,
    TermsModule,
    DepartmentsModule,
    TimetableModule,
    AnnouncementsModule,
    ReportsModule,
    ResultProcessingModule,
    TimelineModule,
    GuardiansModule,
    MedicalRecordsModule,
    DisciplineRecordsModule,
    StudentDocumentsModule,
    StudentTransfersModule,
    StudentPromotionsModule,
    ParentPortalModule,
    PushModule,
    HealthModule,
    TeacherQualificationsModule,
    TeacherEmploymentHistoryModule,
    TeacherAttendanceModule,
    TeacherPerformanceReviewsModule,
    TeacherLeaveRequestsModule,
    TeacherSalariesModule,
    TeacherDocumentsModule,
  ],
  providers: [
    // Guard order matters: authentication -> tenant isolation -> roles -> permissions
    // Throttler runs first so abuse-sensitive public endpoints are rate limited.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    // Interceptors: envelope -> caching -> audit
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: CacheInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestLoggingMiddleware)
      .forRoutes("*")
      .apply(TenantContextMiddleware)
      .forRoutes("*");
  }
}
