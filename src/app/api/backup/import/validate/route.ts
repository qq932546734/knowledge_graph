import { ok, withApiHandler } from "@/server/api/route-handler";
import { payloadHash, validateBackupPayload } from "@/server/backup/schema";
import { issueValidationToken } from "@/server/backup/token-store";
import { SCHEMA_VERSION } from "@/server/backup/types";

export const POST = withApiHandler(
  async ({ requestId, request, userId }) => {
    const body = await request.json();
    const validated = validateBackupPayload(body, SCHEMA_VERSION);

    const token = await issueValidationToken(userId!, payloadHash(validated));

    return ok(
      {
        valid: true,
        validationToken: token,
        expiresInSeconds: 10 * 60,
        summary: {
          knowledgeNodes: validated.knowledgeNodes.length,
          nodeRelations: validated.nodeRelations.length,
          interviewQuestions: validated.interviewQuestions.length,
          reviewEvents: validated.reviewEvents.length,
          practiceEvents: validated.practiceEvents.length,
        },
      },
      requestId,
    );
  },
  { requireAuth: true, requireCsrf: true },
);
