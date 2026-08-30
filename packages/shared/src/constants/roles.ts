export const enum Role {
  SUPER_ADMIN = "SUPER_ADMIN",
  TENANT_ADMIN = "TENANT_ADMIN",
  SCHOOL_ADMIN = "SCHOOL_ADMIN",
  PRINCIPAL = "PRINCIPAL",
  VICE_PRINCIPAL = "VICE_PRINCIPAL",
  ADMIN_STAFF = "ADMIN_STAFF",
  TEACHER = "TEACHER",
  BURSAR = "BURSAR",
  LIBRARIAN = "LIBRARIAN",
  STUDENT = "STUDENT",
  PARENT = "PARENT",
}

export const SYSTEM_ROLES: ReadonlyArray<Role> = [
  Role.SUPER_ADMIN,
  Role.TENANT_ADMIN,
  Role.SCHOOL_ADMIN,
  Role.PRINCIPAL,
  Role.VICE_PRINCIPAL,
  Role.ADMIN_STAFF,
  Role.TEACHER,
  Role.BURSAR,
  Role.LIBRARIAN,
  Role.STUDENT,
  Role.PARENT,
] as const;

export const ROLE_PRIORITY: Record<Role, number> = {
  SUPER_ADMIN: 0,
  TENANT_ADMIN: 10,
  SCHOOL_ADMIN: 10,
  PRINCIPAL: 20,
  VICE_PRINCIPAL: 30,
  ADMIN_STAFF: 40,
  TEACHER: 50,
  BURSAR: 50,
  LIBRARIAN: 55,
  STUDENT: 60,
  PARENT: 70,
};

export const ROLE_LABELS: Record<string, string> = {
  [Role.SUPER_ADMIN]: "Super Admin",
  [Role.TENANT_ADMIN]: "Tenant Admin",
  [Role.SCHOOL_ADMIN]: "School Admin",
  [Role.PRINCIPAL]: "Principal",
  [Role.VICE_PRINCIPAL]: "Vice Principal",
  [Role.ADMIN_STAFF]: "Admin Staff",
  [Role.TEACHER]: "Teacher",
  [Role.BURSAR]: "Bursar",
  [Role.LIBRARIAN]: "Librarian",
  [Role.STUDENT]: "Student",
  [Role.PARENT]: "Parent",
};
