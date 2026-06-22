export type UserRole = "SUPER_ADMIN" | "ADMIN" | "SCANNER";

export const USER_ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN", "SCANNER"];

export function formatRole(role: UserRole): string {
  return role
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
