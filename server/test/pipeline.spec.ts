import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  DecisionDto,
  PIPELINE_STAGES,
  UpdateStageDto,
} from "../src/pipeline/dto/pipeline.dto";
import { InviteDto, ORGANIZATION_ROLES } from "../src/teams/dto/team.dto";

describe("pipeline and team validation", () => {
  it("defines the hiring stages in order", () => {
    expect(PIPELINE_STAGES).toEqual([
      "new",
      "screening",
      "interview",
      "offer",
      "hired",
      "rejected",
    ]);
  });

  it("accepts a valid stage update and rating", async () => {
    const dto = plainToInstance(UpdateStageDto, { stage: "interview", rating: 5 });
    expect(await validate(dto)).toHaveLength(0);
  });

  it("accepts hire decisions and rejects unknown ones", async () => {
    expect(await validate(plainToInstance(DecisionDto, { decision: "hire" }))).toHaveLength(0);
    expect(
      (await validate(plainToInstance(DecisionDto, { decision: "promote" }))).length,
    ).toBeGreaterThan(0);
  });

  it("rejects an out-of-range rating", async () => {
    const dto = plainToInstance(UpdateStageDto, { stage: "interview", rating: 9 });
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });

  it("rejects an unknown role in an invitation", async () => {
    const dto = plainToInstance(InviteDto, { email: "person@example.com", role: "ADMIN" });
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });

  it("allows only the three organization roles", () => {
    expect(ORGANIZATION_ROLES).toEqual(["OWNER", "RECRUITER", "VIEWER"]);
  });
});
