export interface PolicyAttributes {
  /** Platform-level role stored on the user record. */
  systemRole: string;
  /** Role in the active organization, resolved by OrgGuard. */
  orgRole: string | null;
  resource: string;
  action: string;
  /** Subject attribute: the actor is the target of a member-management action. */
  isSelf: boolean;
}

/**
 * Attribute-based policy evaluation. Roles alone are not enough: the decision
 * also uses the active tenant, the resource type/action and subject attributes.
 */
export function evaluatePolicy(attributes: PolicyAttributes): boolean {
  const { systemRole, orgRole, resource, action, isSelf } = attributes;

  // Platform admins can operate across all tenants.
  if (systemRole === "PLATFORM_ADMIN") return true;

  // No platform admin may reach admin resources without the platform role.
  if (resource === "admin") return false;

  // Organization listing/creation/switching only require an authenticated
  // account; membership scoping is enforced in the organization service.
  if (resource === "organization") return true;

  if (!orgRole) return false;

  // Read access is granted to every member of the active organization.
  if (action === "read") return true;

  // Viewers are read-only inside the organization.
  if (orgRole === "VIEWER") return false;

  // A user must never remove or demote themselves from their own team.
  if (resource === "team" && isSelf && action !== "create") return false;

  if (action === "delete" || action === "manage") return orgRole === "OWNER";

  return orgRole === "OWNER" || orgRole === "RECRUITER";
}
