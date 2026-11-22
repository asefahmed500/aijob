import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../prisma/prisma.service";
import { POLICY_KEY, type PolicyRequirement } from "../auth/abac/policy.decorator";
import { evaluatePolicy } from "../auth/abac/policies";

export const ROLES_KEY = "org_roles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Route-level authorization guard. Runs after JwtAuthGuard and OrgGuard so it
 * can evaluate both explicit org roles and ABAC policy metadata using the
 * authenticated subject, the active tenant and resource attributes.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const policy = this.reflector.getAllAndOverride<PolicyRequirement>(POLICY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length && !policy) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as
      | { userId: string; systemRole?: string }
      | undefined;
    const organizationId = request.orgId as string | undefined;
    if (!user) throw new ForbiddenException("Authentication required");

    if (user.systemRole === "PLATFORM_ADMIN") return true;

    let orgRole: string | null = null;
    if (organizationId) {
      const membership = await this.prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: user.userId,
            organizationId,
          },
        },
        select: { role: true },
      });
      orgRole = membership?.role ?? null;
    }

    if (required?.length && (!orgRole || !required.includes(orgRole))) {
      throw new ForbiddenException("Insufficient role for this action");
    }

    if (policy) {
      const isSelf = Boolean(
        request.params?.userId && request.params.userId === user.userId,
      );
      const allowed = evaluatePolicy({
        systemRole: user.systemRole ?? "USER",
        orgRole,
        resource: policy.resource,
        action: policy.action,
        isSelf,
      });
      if (!allowed) throw new ForbiddenException("Insufficient permissions for this action");
    }

    return true;
  }
}
