import { PrismaClient, PracticeMode, RelationType } from "@prisma/client";

const prisma = new PrismaClient();

const DATASET_TAG = "dataset:llm-demo";

type NodeSeed = {
  key: string;
  title: string;
  contentMd: string;
  tags: string[];
  difficulty: number;
  sourceUrl: string | null;
};

const nodes: NodeSeed[] = [
  {
    key: "root",
    title: "[LLM] 大模型知识总览",
    contentMd: "面向大语言模型学习的总览节点，包含架构、训练、推理、应用、评测与安全等主题。",
    tags: ["llm", "overview"],
    difficulty: 2,
    sourceUrl: null,
  },
  {
    key: "arch",
    title: "[LLM] 架构与表示",
    contentMd: "理解 Transformer、注意力、位置编码、分词与向量表示。",
    tags: ["llm", "architecture"],
    difficulty: 3,
    sourceUrl: null,
  },
  {
    key: "train",
    title: "[LLM] 训练与对齐",
    contentMd: "从预训练到指令对齐，覆盖 SFT、RLHF、DPO 的核心流程。",
    tags: ["llm", "training"],
    difficulty: 4,
    sourceUrl: null,
  },
  {
    key: "infer",
    title: "[LLM] 推理与系统优化",
    contentMd: "关注在线推理延迟、吞吐与成本，包括 KV Cache、量化和并行。",
    tags: ["llm", "inference"],
    difficulty: 4,
    sourceUrl: null,
  },
  {
    key: "app",
    title: "[LLM] 应用工程",
    contentMd: "围绕 RAG、工具调用、Agent 编排构建可落地应用。",
    tags: ["llm", "application"],
    difficulty: 3,
    sourceUrl: null,
  },
  {
    key: "eval",
    title: "[LLM] 评测与安全",
    contentMd: "建立质量评测、幻觉治理与安全策略，形成可观测闭环。",
    tags: ["llm", "evaluation", "safety"],
    difficulty: 4,
    sourceUrl: null,
  },
  {
    key: "transformer",
    title: "[LLM] Transformer 基础",
    contentMd:
      "核心结构为多头自注意力 + 前馈网络 + 残差连接 + LayerNorm。其优势是并行建模序列依赖。",
    tags: ["llm", "transformer"],
    difficulty: 3,
    sourceUrl: "https://arxiv.org/abs/1706.03762",
  },
  {
    key: "attention",
    title: "[LLM] 自注意力机制",
    contentMd: "通过 Q/K/V 计算 token 间相关性，支持在一个前向中聚合全局上下文信息。",
    tags: ["llm", "attention"],
    difficulty: 3,
    sourceUrl: "https://arxiv.org/abs/1706.03762",
  },
  {
    key: "posenc",
    title: "[LLM] 位置编码（RoPE）",
    contentMd: "RoPE 将位置信息编码到旋转矩阵中，能更好适配长上下文外推。",
    tags: ["llm", "position-encoding"],
    difficulty: 4,
    sourceUrl: "https://arxiv.org/abs/2104.09864",
  },
  {
    key: "tokenizer",
    title: "[LLM] 分词器（BPE/SentencePiece）",
    contentMd: "分词器将文本映射为 token 序列，直接影响上下文利用率和多语种表现。",
    tags: ["llm", "tokenizer"],
    difficulty: 3,
    sourceUrl: null,
  },
  {
    key: "embedding",
    title: "[LLM] 词向量与语义空间",
    contentMd: "Embedding 层将 token 映射到连续向量空间，后续层在该空间中进行语义变换。",
    tags: ["llm", "embedding"],
    difficulty: 2,
    sourceUrl: null,
  },
  {
    key: "pretrain",
    title: "[LLM] 预训练目标（Causal LM）",
    contentMd: "以 next-token prediction 为主，最大化大规模语料上的似然。",
    tags: ["llm", "pretraining"],
    difficulty: 3,
    sourceUrl: null,
  },
  {
    key: "data",
    title: "[LLM] 训练数据治理",
    contentMd: "包括去重、去噪、质量打分、混合采样与版权合规。",
    tags: ["llm", "data"],
    difficulty: 4,
    sourceUrl: null,
  },
  {
    key: "sft",
    title: "[LLM] 监督微调（SFT）",
    contentMd: "用指令-回答数据微调，让模型更符合人类任务形式与输出风格。",
    tags: ["llm", "alignment", "sft"],
    difficulty: 3,
    sourceUrl: null,
  },
  {
    key: "rlhf",
    title: "[LLM] RLHF",
    contentMd: "通过偏好数据训练奖励模型，再使用强化学习优化策略模型以提升人类偏好一致性。",
    tags: ["llm", "alignment", "rlhf"],
    difficulty: 5,
    sourceUrl: "https://arxiv.org/abs/2203.02155",
  },
  {
    key: "dpo",
    title: "[LLM] DPO",
    contentMd: "DPO 直接在偏好对上优化策略，避免显式训练奖励模型和 RL 过程。",
    tags: ["llm", "alignment", "dpo"],
    difficulty: 4,
    sourceUrl: "https://arxiv.org/abs/2305.18290",
  },
  {
    key: "kv",
    title: "[LLM] KV Cache",
    contentMd: "缓存历史 token 的 K/V，增量解码时复用，显著降低每步计算量。",
    tags: ["llm", "inference", "kv-cache"],
    difficulty: 4,
    sourceUrl: null,
  },
  {
    key: "sampling",
    title: "[LLM] 采样策略（Temperature/Top-k/Top-p）",
    contentMd: "采样参数影响输出多样性与稳定性，需要针对任务场景进行平衡。",
    tags: ["llm", "inference", "sampling"],
    difficulty: 2,
    sourceUrl: null,
  },
  {
    key: "quant",
    title: "[LLM] 量化（INT8/INT4）",
    contentMd: "通过降低权重与激活精度减少显存占用和推理成本，需控制精度损失。",
    tags: ["llm", "inference", "quantization"],
    difficulty: 4,
    sourceUrl: null,
  },
  {
    key: "moe",
    title: "[LLM] MoE（混合专家）",
    contentMd: "通过路由激活部分专家参数，在总参数增大的同时维持可控计算开销。",
    tags: ["llm", "architecture", "moe"],
    difficulty: 5,
    sourceUrl: "https://arxiv.org/abs/1701.06538",
  },
  {
    key: "rag",
    title: "[LLM] RAG 检索增强生成",
    contentMd: "将外部知识检索结果注入上下文，降低幻觉并提升事实性回答能力。",
    tags: ["llm", "application", "rag"],
    difficulty: 3,
    sourceUrl: "https://arxiv.org/abs/2005.11401",
  },
  {
    key: "tool",
    title: "[LLM] Tool Calling",
    contentMd: "将模型输出约束为可执行参数，连接搜索、数据库与业务系统。",
    tags: ["llm", "application", "tools"],
    difficulty: 3,
    sourceUrl: null,
  },
  {
    key: "hallucination",
    title: "[LLM] 幻觉与事实性",
    contentMd: "模型可能生成语法正确但事实错误的内容，需结合检索、校验与拒答策略控制风险。",
    tags: ["llm", "evaluation", "hallucination"],
    difficulty: 3,
    sourceUrl: null,
  },
  {
    key: "evalbench",
    title: "[LLM] 评测体系设计",
    contentMd: "评测需覆盖离线基准、线上 A/B、人工评测与安全红队，避免单一指标误导。",
    tags: ["llm", "evaluation"],
    difficulty: 4,
    sourceUrl: null,
  },
];

const parentChildEdges: Array<[string, string]> = [
  ["root", "arch"],
  ["root", "train"],
  ["root", "infer"],
  ["root", "app"],
  ["root", "eval"],
  ["arch", "transformer"],
  ["arch", "attention"],
  ["arch", "posenc"],
  ["arch", "tokenizer"],
  ["arch", "embedding"],
  ["arch", "moe"],
  ["train", "pretrain"],
  ["train", "data"],
  ["train", "sft"],
  ["train", "rlhf"],
  ["train", "dpo"],
  ["infer", "kv"],
  ["infer", "sampling"],
  ["infer", "quant"],
  ["app", "rag"],
  ["app", "tool"],
  ["eval", "hallucination"],
  ["eval", "evalbench"],
];

const relatedEdges: Array<[string, string]> = [
  ["attention", "kv"],
  ["posenc", "transformer"],
  ["pretrain", "sft"],
  ["sft", "rlhf"],
  ["rlhf", "dpo"],
  ["rag", "hallucination"],
  ["tool", "rag"],
  ["quant", "moe"],
  ["evalbench", "hallucination"],
];

const questionSeeds: Array<{ nodeKey: string; question: string; answer: string }> = [
  {
    nodeKey: "transformer",
    question: "为什么 Transformer 在序列建模上通常比 RNN 更高效？",
    answer: "因为自注意力可并行处理序列位置，并通过全局依赖建模减少长程信息衰减。",
  },
  {
    nodeKey: "attention",
    question: "Q/K/V 在注意力计算中的作用分别是什么？",
    answer: "Q 表示查询，K 表示被匹配键，V 为被聚合值；注意力权重由 Q 与 K 相似度得到。",
  },
  {
    nodeKey: "posenc",
    question: "RoPE 对长上下文有什么潜在好处？",
    answer: "RoPE 通过相对位置旋转编码，通常在上下文扩展时比绝对位置编码更稳健。",
  },
  {
    nodeKey: "tokenizer",
    question: "分词粒度为什么会影响模型成本？",
    answer: "粒度越细 token 数越多，推理长度和训练算力成本通常越高。",
  },
  {
    nodeKey: "pretrain",
    question: "Causal LM 的训练目标是什么？",
    answer: "在给定前缀条件下预测下一个 token，最大化训练语料的对数似然。",
  },
  {
    nodeKey: "rlhf",
    question: "RLHF 的三段式流程是什么？",
    answer: "先做 SFT，再训练奖励模型，最后用强化学习优化策略模型。",
  },
  {
    nodeKey: "dpo",
    question: "DPO 相比 RLHF 的主要简化点是什么？",
    answer: "DPO 直接优化偏好对目标，不需要显式奖励模型与 PPO 训练环节。",
  },
  {
    nodeKey: "kv",
    question: "KV Cache 为什么能减少推理延迟？",
    answer: "因为历史 token 的 K/V 被缓存，后续解码步无需重复计算历史部分。",
  },
  {
    nodeKey: "sampling",
    question: "Top-p 与 Top-k 在控制生成上有什么差异？",
    answer: "Top-k 固定候选数，Top-p 固定累计概率阈值，后者对分布形状更自适应。",
  },
  {
    nodeKey: "quant",
    question: "量化部署最常见的收益和代价是什么？",
    answer: "收益是显存与吞吐改进，代价是可能出现精度下降与校准复杂度增加。",
  },
  {
    nodeKey: "rag",
    question: "RAG 为什么能缓解幻觉问题？",
    answer: "通过将检索到的外部证据放入上下文，让生成过程更受事实约束。",
  },
  {
    nodeKey: "evalbench",
    question: "为什么 LLM 评测不能只看单一 benchmark 分数？",
    answer: "单一基准易被过拟合或失真，需要结合线上任务指标与人工评测。",
  },
];

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(`Seed admin not found: ${email}. Run npm run db:seed first.`);
  }

  const existing = await prisma.knowledgeNode.findMany({
    where: { userId: user.id, tags: { has: DATASET_TAG } },
    select: { id: true },
  });
  const existingNodeIds = existing.map((n) => n.id);

  if (existingNodeIds.length > 0) {
    await prisma.$transaction([
      prisma.practiceEvent.deleteMany({
        where: {
          userId: user.id,
          OR: [
            { nodeId: { in: existingNodeIds } },
            { question: { nodeId: { in: existingNodeIds } } },
          ],
        },
      }),
      prisma.reviewEvent.deleteMany({
        where: { userId: user.id, nodeId: { in: existingNodeIds } },
      }),
      prisma.nodeRelation.deleteMany({
        where: {
          userId: user.id,
          OR: [{ fromNodeId: { in: existingNodeIds } }, { toNodeId: { in: existingNodeIds } }],
        },
      }),
      prisma.interviewQuestion.deleteMany({
        where: { userId: user.id, nodeId: { in: existingNodeIds } },
      }),
      prisma.knowledgeNode.deleteMany({ where: { userId: user.id, id: { in: existingNodeIds } } }),
    ]);
  }

  const now = new Date();
  const createdNodeMap = new Map<string, string>();

  for (const node of nodes) {
    const created = await prisma.knowledgeNode.create({
      data: {
        userId: user.id,
        title: node.title,
        contentMd: node.contentMd,
        tags: [...node.tags, DATASET_TAG],
        difficulty: node.difficulty,
        sourceUrl: node.sourceUrl,
        nextReviewAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      },
      select: { id: true },
    });
    createdNodeMap.set(node.key, created.id);
  }

  await prisma.nodeRelation.createMany({
    data: parentChildEdges.map(([fromKey, toKey]) => ({
      userId: user.id,
      fromNodeId: createdNodeMap.get(fromKey)!,
      toNodeId: createdNodeMap.get(toKey)!,
      relationType: RelationType.PARENT_CHILD,
    })),
  });

  await prisma.nodeRelation.createMany({
    data: relatedEdges
      .map(([a, b]) => {
        const aId = createdNodeMap.get(a)!;
        const bId = createdNodeMap.get(b)!;
        return aId < bId ? [aId, bId] : [bId, aId];
      })
      .map(([fromNodeId, toNodeId]) => ({
        userId: user.id,
        fromNodeId,
        toNodeId,
        relationType: RelationType.RELATED,
      })),
  });

  const questionMap = new Map<string, string>();
  for (const seed of questionSeeds) {
    const question = await prisma.interviewQuestion.create({
      data: {
        userId: user.id,
        nodeId: createdNodeMap.get(seed.nodeKey)!,
        question: seed.question,
        referenceAnswerMd: seed.answer,
      },
      select: { id: true, nodeId: true },
    });
    questionMap.set(question.nodeId, question.id);
  }

  const reviewNodeKeys = [
    "transformer",
    "attention",
    "sft",
    "rlhf",
    "kv",
    "quant",
    "rag",
    "hallucination",
  ];
  await prisma.reviewEvent.createMany({
    data: reviewNodeKeys.map((key, index) => {
      const quality = (index % 3) + 3;
      const efBefore = 2.5;
      const efAfter = Math.max(
        1.3,
        efBefore + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
      );
      const intervalBefore = 1;
      const intervalAfter = quality >= 3 ? (index % 2 === 0 ? 6 : 3) : 1;
      const reviewedAt = new Date(now.getTime() - (index + 1) * 12 * 60 * 60 * 1000);
      const nextReviewAt = new Date(reviewedAt.getTime() + intervalAfter * 24 * 60 * 60 * 1000);
      return {
        userId: user.id,
        nodeId: createdNodeMap.get(key)!,
        reviewedAt,
        quality,
        efBefore,
        efAfter,
        intervalBefore,
        intervalAfter,
        nextReviewAt,
      };
    }),
  });

  await prisma.practiceEvent.createMany({
    data: ["rag", "tool", "quant", "dpo", "sampling", "tokenizer"].map((key, index) => {
      const nodeId = createdNodeMap.get(key)!;
      return {
        userId: user.id,
        mode: index % 2 === 0 ? PracticeMode.QUESTION_ANSWER : PracticeMode.NODE_RECALL,
        nodeId,
        questionId: questionMap.get(nodeId) ?? null,
        answeredAt: new Date(now.getTime() - (index + 1) * 8 * 60 * 60 * 1000),
        selfScore: ((index + 2) % 5) + 1,
        note: "LLM 测试数据导入样例",
      };
    }),
  });

  const [nodeCount, relationCount, questionCount, reviewCount, practiceCount] = await Promise.all([
    prisma.knowledgeNode.count({ where: { userId: user.id, tags: { has: DATASET_TAG } } }),
    prisma.nodeRelation.count({
      where: {
        userId: user.id,
        OR: [
          { fromNode: { tags: { has: DATASET_TAG } } },
          { toNode: { tags: { has: DATASET_TAG } } },
        ],
      },
    }),
    prisma.interviewQuestion.count({
      where: { userId: user.id, node: { tags: { has: DATASET_TAG } } },
    }),
    prisma.reviewEvent.count({ where: { userId: user.id, node: { tags: { has: DATASET_TAG } } } }),
    prisma.practiceEvent.count({
      where: { userId: user.id, node: { tags: { has: DATASET_TAG } } },
    }),
  ]);

  console.info(
    JSON.stringify(
      {
        importedFor: email,
        datasetTag: DATASET_TAG,
        counts: {
          knowledgeNodes: nodeCount,
          nodeRelations: relationCount,
          interviewQuestions: questionCount,
          reviewEvents: reviewCount,
          practiceEvents: practiceCount,
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
