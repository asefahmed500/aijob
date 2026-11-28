import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto, RegisterDto } from "./dto/auth.dto";

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        name: dto.name ?? null,
        passwordHash,
      },
    });
    return this.buildSession(user.id, user.email, user.name, user.systemRole);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }
    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException("Invalid email or password");
    }
    return this.buildSession(user.id, user.email, user.name, user.systemRole);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, systemRole: true, createdAt: true },
    });
    if (!user) {
      throw new UnauthorizedException("Account no longer exists");
    }
    return user;
  }

  /**
   * Requests a password reset. In production the token must be delivered by
   * email; locally the token is returned so the flow is fully testable without
   * sending real mail. Existing-account enumeration is avoided by the generic
   * response for unknown emails.
   */
  async requestPasswordReset(email: string): Promise<{ ok: boolean; devToken?: string }> {
    if (process.env.NODE_ENV === "production" && !process.env.SMTP_HOST) {
      throw new ServiceUnavailableException("Password reset email is not configured");
    }
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) return { ok: true };

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    return process.env.NODE_ENV === "production"
      ? { ok: true }
      : { ok: true, devToken: token };
  }

  async resetPassword(token: string, password: string): Promise<{ ok: boolean }> {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException("This password reset link is invalid or has expired");
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
    return { ok: true };
  }

  private buildSession(
    id: string,
    email: string,
    name: string | null,
    systemRole: string,
  ) {
    const token = this.jwt.sign({ sub: id, email, systemRole });
    return {
      accessToken: token,
      user: { id, email, name, systemRole },
    };
  }
}
