import type { Role } from "@prisma/client";

type PermissionSession = {
  role?: Role;
  canVerifyTrades?: boolean;
  canManageRates?: boolean;
} | null | undefined;

export function isFullAdmin(user: PermissionSession) {
  return user?.role === "ADMIN";
}

export function canVerifyTrades(user: PermissionSession) {
  return isFullAdmin(user) || (user?.role === "SUB_ADMIN" && Boolean(user.canVerifyTrades));
}

export function canManageRates(user: PermissionSession) {
  return isFullAdmin(user) || (user?.role === "SUB_ADMIN" && Boolean(user.canManageRates));
}

export function canEnterAdminArea(user: PermissionSession) {
  return isFullAdmin(user) || user?.role === "SUB_ADMIN";
}
