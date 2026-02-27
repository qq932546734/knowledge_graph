import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();

interface MockNode {
  id: string;
  userId: string;
  title: string;
  contentMd: string;
  tags: string[];
  difficulty: number;
  nextReviewAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  lastReviewedAt: Date | null;
  sm2EF: number;
  sm2Repetition: number;
  sm2IntervalDays: number;
}

interface MockQuestion {
  id: string;
  userId: string;
  nodeId: string;
  question: string;
  referenceAnswerMd: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const state = {
  nodes: [] as MockNode[],
  questions: [] as MockQuestion[],
};

function matchesDeletedAtFilter(
  value: Date | null,
  filter: null | { not: null } | undefined,
): boolean {
  if (typeof filter === "undefined") {
    return true;
  }

  if (filter === null) {
    return value === null;
  }

  if ("not" in filter && filter.not === null) {
    return value !== null;
  }

  return true;
}

const prismaMock = {
  knowledgeNode: {
    create: vi.fn(async ({ data }) => {
      const created = {
        id: `n_${state.nodes.length + 1}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        lastReviewedAt: null,
        sm2EF: 2.5,
        sm2Repetition: 0,
        sm2IntervalDays: 0,
        ...data,
      };
      state.nodes.push(created);
      return created;
    }),
    findMany: vi.fn(async ({ where }) =>
      state.nodes.filter((node) => node.userId === where.userId),
    ),
    count: vi.fn(
      async ({ where }) => state.nodes.filter((node) => node.userId === where.userId).length,
    ),
    findFirst: vi.fn(async ({ where }) =>
      state.nodes.find(
        (node) =>
          node.id === where.id &&
          node.userId === where.userId &&
          matchesDeletedAtFilter(node.deletedAt, where.deletedAt),
      ),
    ),
    update: vi.fn(async ({ where, data }) => {
      const found = state.nodes.find((item) => item.id === where.id)!;
      Object.assign(found, data, { updatedAt: new Date() });
      return found;
    }),
  },
  interviewQuestion: {
    create: vi.fn(async ({ data }) => {
      const created = {
        id: `q_${state.questions.length + 1}`,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      state.questions.push(created);
      return created;
    }),
    findFirst: vi.fn(async ({ where }) =>
      state.questions.find(
        (question) =>
          question.id === where.id &&
          question.userId === where.userId &&
          question.deletedAt === where.deletedAt,
      ),
    ),
    update: vi.fn(async ({ where, data }) => {
      const found = state.questions.find((item) => item.id === where.id)!;
      Object.assign(found, data, { updatedAt: new Date() });
      return found;
    }),
  },
};

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/server/db", () => ({
  prisma: prismaMock,
}));

describe("node/question api integration", () => {
  beforeEach(() => {
    state.nodes = [];
    state.questions = [];
    authMock.mockReset();
    authMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
  });

  it("creates node and fetches with user isolation", async () => {
    const { POST, GET } = await import("@/app/api/nodes/route");

    const postRequest = new NextRequest("http://localhost/api/nodes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": "t1",
        cookie: "kg_csrf_token=t1",
      },
      body: JSON.stringify({
        title: "Two Pointers",
        contentMd: "content",
        tags: ["array"],
        difficulty: 3,
      }),
    });

    const postResponse = await POST(postRequest, undefined as never);
    expect(postResponse.status).toBe(201);

    const getResponse = await GET(
      new NextRequest("http://localhost/api/nodes"),
      undefined as never,
    );
    const payload = await getResponse.json();

    expect(payload.success).toBe(true);
    expect(payload.data.items.length).toBe(1);
    expect(payload.data.items[0].title).toBe("Two Pointers");
  });

  it("rejects unauthorized writes", async () => {
    authMock.mockResolvedValue(null);

    const { POST } = await import("@/app/api/nodes/route");

    const request = new NextRequest("http://localhost/api/nodes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": "t1",
        cookie: "kg_csrf_token=t1",
      },
      body: JSON.stringify({
        title: "Node",
        contentMd: "content",
        tags: [],
        difficulty: 2,
      }),
    });

    const response = await POST(request, undefined as never);
    expect(response.status).toBe(401);
  });

  it("creates and soft deletes question", async () => {
    const { POST: createNode } = await import("@/app/api/nodes/route");
    const nodeRequest = new NextRequest("http://localhost/api/nodes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": "t1",
        cookie: "kg_csrf_token=t1",
      },
      body: JSON.stringify({
        title: "DP",
        contentMd: "content",
        tags: ["dp"],
        difficulty: 4,
      }),
    });

    await createNode(nodeRequest, undefined as never);
    const nodeId = state.nodes[0].id;

    const { POST: createQuestion } = await import("@/app/api/nodes/[id]/questions/route");
    const questionRequest = new NextRequest(`http://localhost/api/nodes/${nodeId}/questions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": "t1",
        cookie: "kg_csrf_token=t1",
      },
      body: JSON.stringify({
        question: "状态定义是什么？",
        referenceAnswerMd: "...",
      }),
    });

    const createQuestionResponse = await createQuestion(questionRequest, {
      params: Promise.resolve({ id: nodeId }),
    });
    expect(createQuestionResponse.status).toBe(201);

    const questionId = state.questions[0].id;
    const { DELETE: deleteQuestion } = await import("@/app/api/questions/[id]/route");

    const deleteResponse = await deleteQuestion(
      new NextRequest(`http://localhost/api/questions/${questionId}`, {
        method: "DELETE",
        headers: {
          "x-csrf-token": "t1",
          cookie: "kg_csrf_token=t1",
        },
      }),
      {
        params: Promise.resolve({ id: questionId }),
      },
    );

    expect(deleteResponse.status).toBe(200);
    expect(state.questions[0].deletedAt).toBeInstanceOf(Date);
  });

  it("rejects updating a soft-deleted node", async () => {
    const { POST: createNode } = await import("@/app/api/nodes/route");
    const nodeRequest = new NextRequest("http://localhost/api/nodes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": "t1",
        cookie: "kg_csrf_token=t1",
      },
      body: JSON.stringify({
        title: "Graph",
        contentMd: "content",
        tags: ["graph"],
        difficulty: 3,
      }),
    });

    await createNode(nodeRequest, undefined as never);
    const nodeId = state.nodes[0].id;
    state.nodes[0].deletedAt = new Date();

    const { PUT } = await import("@/app/api/nodes/[id]/route");
    const response = await PUT(
      new NextRequest(`http://localhost/api/nodes/${nodeId}`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": "t1",
          cookie: "kg_csrf_token=t1",
        },
        body: JSON.stringify({
          title: "Updated title",
        }),
      }),
      {
        params: Promise.resolve({ id: nodeId }),
      },
    );

    expect(response.status).toBe(404);
  });
});
