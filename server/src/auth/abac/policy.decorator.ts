import { SetMetadata } from "@nestjs/common";

export const POLICY_KEY = "abac_policy";

export type PolicyAction = "read" | "create" | "update" | "delete" | "manage" | "switch";

export interface PolicyRequirement {
  resource: string;
  action: PolicyAction;
}

/** Declares the resource/action an endpoint needs. The AbacGuard evaluates it. */
export const Policy = (resource: string, action: PolicyAction) =>
  SetMetadata(POLICY_KEY, { resource, action } satisfies PolicyRequirement);
