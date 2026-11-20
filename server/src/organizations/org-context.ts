import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class OrgGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId as string | undefined;
    if (!userId) throw new ForbiddenException("Authentication required");

    const requestedOrgId = request.cookies?.active_org as string | undefined;
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    if (memberships.length === 0) {
      throw new ForbiddenException("Create or join an organization first");
    }

    const orgId =
      (requestedOrgId &&
        memberships.some((item) => item.organizationId === requestedOrgId)
          ? requestedOrgId
          : null) ?? memberships[0].organizationId;

    request.orgId = orgId;
    return true;
  }
}

export const OrgId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string =>
    context.switchToHttp().getRequest().orgId as string,
);
