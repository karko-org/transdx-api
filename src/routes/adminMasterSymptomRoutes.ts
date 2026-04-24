import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  createAnswerOption,
  deleteAnswerOption,
  findAnswerOptionById,
  findAnswerOptionByQuestionAndValue,
  listAnswerOptionsByQuestion,
  serializeAnswerOption,
  updateAnswerOption,
} from "../lib/adminMasterAnswerOptions";
import {
  createDiagnosisRule,
  deleteDiagnosisRule,
  findDiagnosisRuleById,
  findDuplicateDiagnosisRule,
  listDiagnosisRulesBySymptom,
  serializeDiagnosisRule,
  updateDiagnosisRule,
} from "../lib/adminMasterDiagnosisRules";
import {
  createEffectRule,
  deleteEffectRule,
  findDuplicateEffectRule,
  findEffectRuleById,
  listEffectRulesBySymptom,
  serializeEffectRule,
  updateEffectRule,
} from "../lib/adminMasterEffectRules";
import { findFailureTypeById } from "../lib/adminMasterFailureTypes";
import {
  createQuestionAndLinkToSymptom,
  deleteQuestion,
  deleteSymptomQuestion,
  findQuestionByCode,
  findQuestionById,
  findSymptomQuestionById,
  findSymptomQuestionBySymptomAndQuestion,
  linkExistingQuestionToSymptom,
  listQuestions,
  listSymptomQuestions,
  serializeQuestion,
  serializeSymptomQuestion,
  updateQuestion,
  updateSymptomQuestion,
} from "../lib/adminMasterQuestions";
import {
  createSymptomCategory,
  deleteSymptomCategory,
  findSymptomCategoryById,
  findSymptomCategoryByName,
  listSymptomCategories,
  serializeSymptomCategory,
  updateSymptomCategory,
} from "../lib/adminMasterSymptomCategories";
import {
  createSymptom,
  deleteSymptom,
  findSymptomByCategoryAndName,
  findSymptomById,
  listSymptomsByCategory,
  serializeSymptom,
  updateSymptom,
} from "../lib/adminMasterSymptoms";

const idSchema = z.coerce.number().int().positive();

const ANSWER_FORMATS = ["yes_no_unknown", "yes_no", "low_high_unknown"] as const;
const EFFECT_TYPES = ["symptom_confidence", "flag"] as const;

const categoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  sort_order: z.number().int().min(0).default(0),
});

const categoryUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

const symptomCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(5000).nullable().optional(),
  sort_order: z.number().int().min(0).default(0),
});

const symptomUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

const createQuestionLinkSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("create_new"),
    code: z.string().trim().min(1).max(20),
    text: z.string().trim().min(1).max(300),
    question_intent: z.string().trim().max(200).nullable().optional(),
    answer_format: z.enum(ANSWER_FORMATS).optional(),
    sort_order: z.number().int().min(0).default(0),
  }),
  z.object({
    mode: z.literal("link_existing"),
    question_id: z.number().int().positive(),
    sort_order: z.number().int().min(0).default(0),
  }),
]);

const symptomQuestionUpdateSchema = z.object({
  sort_order: z.number().int().min(0),
});

const questionUpdateSchema = z.object({
  code: z.string().trim().min(1).max(20).optional(),
  text: z.string().trim().min(1).max(300).optional(),
  question_intent: z.string().trim().max(200).nullable().optional(),
  answer_format: z.enum(ANSWER_FORMATS).optional(),
  is_active: z.boolean().optional(),
});

const answerOptionCreateSchema = z.object({
  value: z.string().trim().min(1).max(30),
  label: z.string().trim().min(1).max(50),
  sort_order: z.number().int().min(0).default(0),
  is_scoring: z.boolean().optional(),
});

const answerOptionUpdateSchema = z.object({
  value: z.string().trim().min(1).max(30).optional(),
  label: z.string().trim().min(1).max(50).optional(),
  sort_order: z.number().int().min(0).optional(),
  is_scoring: z.boolean().optional(),
});

const diagnosisRuleCreateSchema = z.object({
  symptom_question_id: z.number().int().positive(),
  failure_type_id: z.number().int().positive(),
  answer_option_id: z.number().int().positive(),
  score_delta: z.number().int(),
  explanation: z.string().trim().max(5000).nullable().optional(),
  is_active: z.boolean().optional(),
});

const diagnosisRuleUpdateSchema = z.object({
  symptom_question_id: z.number().int().positive().optional(),
  failure_type_id: z.number().int().positive().optional(),
  answer_option_id: z.number().int().positive().optional(),
  score_delta: z.number().int().optional(),
  explanation: z.string().trim().max(5000).nullable().optional(),
  is_active: z.boolean().optional(),
});

const effectRuleCreateSchema = z
  .object({
    symptom_question_id: z.number().int().positive(),
    answer_option_id: z.number().int().positive(),
    effect_type: z.enum(EFFECT_TYPES),
    symptom_confidence_delta: z.number().int().nullable().optional(),
    flag_key: z.string().trim().min(1).max(50).nullable().optional(),
    flag_value: z.boolean().nullable().optional(),
    explanation: z.string().trim().max(5000).nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.effect_type === "symptom_confidence") {
      if (
        data.symptom_confidence_delta === undefined ||
        data.symptom_confidence_delta === null
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "symptom_confidence 효과는 symptom_confidence_delta가 필요합니다.",
          path: ["symptom_confidence_delta"],
        });
      }
    } else if (data.effect_type === "flag") {
      if (!data.flag_key) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "flag 효과는 flag_key가 필요합니다.",
          path: ["flag_key"],
        });
      }
      if (data.flag_value === undefined || data.flag_value === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "flag 효과는 flag_value가 필요합니다.",
          path: ["flag_value"],
        });
      }
    }
  });

const effectRuleUpdateSchema = z.object({
  symptom_question_id: z.number().int().positive().optional(),
  answer_option_id: z.number().int().positive().optional(),
  effect_type: z.enum(EFFECT_TYPES).optional(),
  symptom_confidence_delta: z.number().int().nullable().optional(),
  flag_key: z.string().trim().min(1).max(50).nullable().optional(),
  flag_value: z.boolean().nullable().optional(),
  explanation: z.string().trim().max(5000).nullable().optional(),
  is_active: z.boolean().optional(),
});

function parseId(value: unknown) {
  return idSchema.safeParse(value);
}

export const adminMasterSymptomRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/api/admin/master/symptom-categories",
    { preHandler: [app.requireAdmin] },
    async () => {
      const categories = await listSymptomCategories();
      return { categories: categories.map(serializeSymptomCategory) };
    },
  );

  app.get(
    "/api/admin/master/symptom-categories/:id",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsedId = parseId((request.params as { id: string }).id);
      if (!parsedId.success) {
        return reply.status(400).send({ message: "잘못된 카테고리 ID입니다." });
      }

      const category = await findSymptomCategoryById(parsedId.data);
      if (!category) {
        return reply.status(404).send({ message: "카테고리를 찾을 수 없습니다." });
      }

      return { category: serializeSymptomCategory(category) };
    },
  );

  app.post(
    "/api/admin/master/symptom-categories",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsed = categoryCreateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ message: "입력값을 확인해주세요." });
      }

      const duplicated = await findSymptomCategoryByName(parsed.data.name);
      if (duplicated) {
        return reply.status(409).send({ message: "이미 존재하는 카테고리명입니다." });
      }

      const category = await createSymptomCategory(parsed.data);
      return reply.status(201).send({
        category: serializeSymptomCategory({
          ...category,
          _count: { symptoms: 0 },
        }),
      });
    },
  );

  app.put(
    "/api/admin/master/symptom-categories/:id",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsedId = parseId((request.params as { id: string }).id);
      if (!parsedId.success) {
        return reply.status(400).send({ message: "잘못된 카테고리 ID입니다." });
      }

      const parsed = categoryUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ message: "입력값을 확인해주세요." });
      }

      const existing = await findSymptomCategoryById(parsedId.data);
      if (!existing) {
        return reply.status(404).send({ message: "카테고리를 찾을 수 없습니다." });
      }

      if (parsed.data.name && parsed.data.name !== existing.name) {
        const duplicated = await findSymptomCategoryByName(parsed.data.name);
        if (duplicated) {
          return reply.status(409).send({ message: "이미 존재하는 카테고리명입니다." });
        }
      }

      const category = await updateSymptomCategory(parsedId.data, parsed.data);
      return {
        category: serializeSymptomCategory({
          ...category,
          _count: existing._count,
        }),
      };
    },
  );

  app.delete(
    "/api/admin/master/symptom-categories/:id",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsedId = parseId((request.params as { id: string }).id);
      if (!parsedId.success) {
        return reply.status(400).send({ message: "잘못된 카테고리 ID입니다." });
      }

      const existing = await findSymptomCategoryById(parsedId.data);
      if (!existing) {
        return reply.status(404).send({ message: "카테고리를 찾을 수 없습니다." });
      }

      if (existing._count.symptoms > 0) {
        return reply.status(409).send({
          message: "하위 증상이 있는 카테고리는 삭제할 수 없습니다. 비활성화로 관리해주세요.",
        });
      }

      await deleteSymptomCategory(parsedId.data);
      return reply.status(204).send();
    },
  );

  app.get(
    "/api/admin/master/symptom-categories/:id/symptoms",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsedId = parseId((request.params as { id: string }).id);
      if (!parsedId.success) {
        return reply.status(400).send({ message: "잘못된 카테고리 ID입니다." });
      }

      const category = await findSymptomCategoryById(parsedId.data);
      if (!category) {
        return reply.status(404).send({ message: "카테고리를 찾을 수 없습니다." });
      }

      const symptoms = await listSymptomsByCategory(parsedId.data);
      return { symptoms: symptoms.map(serializeSymptom) };
    },
  );

  app.get(
    "/api/admin/master/symptoms/:id",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsedId = parseId((request.params as { id: string }).id);
      if (!parsedId.success) {
        return reply.status(400).send({ message: "잘못된 증상 ID입니다." });
      }

      const symptom = await findSymptomById(parsedId.data);
      if (!symptom) {
        return reply.status(404).send({ message: "증상을 찾을 수 없습니다." });
      }

      return { symptom: serializeSymptom(symptom) };
    },
  );

  app.post(
    "/api/admin/master/symptom-categories/:id/symptoms",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsedCategoryId = parseId((request.params as { id: string }).id);
      if (!parsedCategoryId.success) {
        return reply.status(400).send({ message: "잘못된 카테고리 ID입니다." });
      }

      const parsed = symptomCreateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ message: "입력값을 확인해주세요." });
      }

      const category = await findSymptomCategoryById(parsedCategoryId.data);
      if (!category) {
        return reply.status(404).send({ message: "카테고리를 찾을 수 없습니다." });
      }

      const duplicated = await findSymptomByCategoryAndName(
        parsedCategoryId.data,
        parsed.data.name,
      );
      if (duplicated) {
        return reply.status(409).send({ message: "같은 카테고리에 동일한 증상이 이미 있습니다." });
      }

      const symptom = await createSymptom({
        category_id: parsedCategoryId.data,
        ...parsed.data,
      });

      return reply.status(201).send({
        symptom: serializeSymptom({
          ...symptom,
          category,
          _count: {
            symptom_questions: 0,
            case_symptoms: 0,
          },
        }),
      });
    },
  );

  app.put(
    "/api/admin/master/symptoms/:id",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsedId = parseId((request.params as { id: string }).id);
      if (!parsedId.success) {
        return reply.status(400).send({ message: "잘못된 증상 ID입니다." });
      }

      const parsed = symptomUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ message: "입력값을 확인해주세요." });
      }

      const existing = await findSymptomById(parsedId.data);
      if (!existing) {
        return reply.status(404).send({ message: "증상을 찾을 수 없습니다." });
      }

      if (parsed.data.name && parsed.data.name !== existing.name) {
        const duplicated = await findSymptomByCategoryAndName(
          existing.category_id,
          parsed.data.name,
        );
        if (duplicated) {
          return reply.status(409).send({ message: "같은 카테고리에 동일한 증상이 이미 있습니다." });
        }
      }

      const symptom = await updateSymptom(parsedId.data, parsed.data);
      return {
        symptom: serializeSymptom({
          ...symptom,
          category: existing.category,
          _count: existing._count,
        }),
      };
    },
  );

  app.delete(
    "/api/admin/master/symptoms/:id",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsedId = parseId((request.params as { id: string }).id);
      if (!parsedId.success) {
        return reply.status(400).send({ message: "잘못된 증상 ID입니다." });
      }

      const existing = await findSymptomById(parsedId.data);
      if (!existing) {
        return reply.status(404).send({ message: "증상을 찾을 수 없습니다." });
      }

      if (existing._count.symptom_questions > 0 || existing._count.case_symptoms > 0) {
        return reply.status(409).send({
          message: "연결된 질문 또는 운영 데이터가 있는 증상은 삭제할 수 없습니다. 비활성화로 관리해주세요.",
        });
      }

      await deleteSymptom(parsedId.data);
      return reply.status(204).send();
    },
  );

  app.get(
    "/api/admin/master/questions",
    { preHandler: [app.requireAdmin] },
    async (request) => {
      const search = z
        .object({
          q: z.string().trim().optional(),
        })
        .parse(request.query ?? {});

      const questions = await listQuestions(search.q);
      return { questions: questions.map(serializeQuestion) };
    },
  );

  app.get(
    "/api/admin/master/questions/:id",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsedId = parseId((request.params as { id: string }).id);
      if (!parsedId.success) {
        return reply.status(400).send({ message: "잘못된 질문 ID입니다." });
      }

      const question = await findQuestionById(parsedId.data);
      if (!question) {
        return reply.status(404).send({ message: "질문을 찾을 수 없습니다." });
      }

      return { question: serializeQuestion(question) };
    },
  );

  app.get(
    "/api/admin/master/symptoms/:id/questions",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsedId = parseId((request.params as { id: string }).id);
      if (!parsedId.success) {
        return reply.status(400).send({ message: "잘못된 증상 ID입니다." });
      }

      const symptom = await findSymptomById(parsedId.data);
      if (!symptom) {
        return reply.status(404).send({ message: "증상을 찾을 수 없습니다." });
      }

      const symptomQuestions = await listSymptomQuestions(parsedId.data);
      return { symptom_questions: symptomQuestions.map(serializeSymptomQuestion) };
    },
  );

  app.post(
    "/api/admin/master/symptoms/:id/questions",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsedId = parseId((request.params as { id: string }).id);
      if (!parsedId.success) {
        return reply.status(400).send({ message: "잘못된 증상 ID입니다." });
      }

      const parsed = createQuestionLinkSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ message: "입력값을 확인해주세요." });
      }

      const symptom = await findSymptomById(parsedId.data);
      if (!symptom) {
        return reply.status(404).send({ message: "증상을 찾을 수 없습니다." });
      }

      if (parsed.data.mode === "create_new") {
        const duplicatedCode = await findQuestionByCode(parsed.data.code);
        if (duplicatedCode) {
          return reply.status(409).send({ message: "이미 사용 중인 질문 코드입니다." });
        }

        const symptomQuestion = await createQuestionAndLinkToSymptom({
          symptom_id: parsedId.data,
          code: parsed.data.code,
          text: parsed.data.text,
          question_intent: parsed.data.question_intent,
          answer_format: parsed.data.answer_format,
          sort_order: parsed.data.sort_order,
        });

        return reply.status(201).send({
          symptom_question: serializeSymptomQuestion(symptomQuestion),
        });
      }

      const question = await findQuestionById(parsed.data.question_id);
      if (!question) {
        return reply.status(404).send({ message: "질문을 찾을 수 없습니다." });
      }

      const existingLink = await findSymptomQuestionBySymptomAndQuestion(
        parsedId.data,
        parsed.data.question_id,
      );
      if (existingLink) {
        return reply.status(409).send({ message: "이미 연결된 질문입니다." });
      }

      const symptomQuestion = await linkExistingQuestionToSymptom({
        symptom_id: parsedId.data,
        question_id: parsed.data.question_id,
        sort_order: parsed.data.sort_order,
      });

      return reply.status(201).send({
        symptom_question: serializeSymptomQuestion(symptomQuestion),
      });
    },
  );

  app.put(
    "/api/admin/master/symptom-questions/:id",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsedId = parseId((request.params as { id: string }).id);
      if (!parsedId.success) {
        return reply.status(400).send({ message: "잘못된 질문 연결 ID입니다." });
      }

      const parsed = symptomQuestionUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ message: "입력값을 확인해주세요." });
      }

      const existing = await findSymptomQuestionById(parsedId.data);
      if (!existing) {
        return reply.status(404).send({ message: "질문 연결을 찾을 수 없습니다." });
      }

      const symptomQuestion = await updateSymptomQuestion(parsedId.data, parsed.data);
      return { symptom_question: serializeSymptomQuestion(symptomQuestion) };
    },
  );

  app.delete(
    "/api/admin/master/symptom-questions/:id",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsedId = parseId((request.params as { id: string }).id);
      if (!parsedId.success) {
        return reply.status(400).send({ message: "잘못된 질문 연결 ID입니다." });
      }

      const existing = await findSymptomQuestionById(parsedId.data);
      if (!existing) {
        return reply.status(404).send({ message: "질문 연결을 찾을 수 없습니다." });
      }

      if (
        existing._count.diagnosis_rules > 0 ||
        existing._count.diagnosis_effect_rules > 0
      ) {
        return reply.status(409).send({
          message: "진단 룰 또는 효과 룰이 연결된 질문은 먼저 룰을 정리한 뒤 연결 해제할 수 있습니다.",
        });
      }

      await deleteSymptomQuestion(parsedId.data);
      return reply.status(204).send();
    },
  );

  app.put(
    "/api/admin/master/questions/:id",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsedId = parseId((request.params as { id: string }).id);
      if (!parsedId.success) {
        return reply.status(400).send({ message: "잘못된 질문 ID입니다." });
      }

      const parsed = questionUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ message: "입력값을 확인해주세요." });
      }

      const existing = await findQuestionById(parsedId.data);
      if (!existing) {
        return reply.status(404).send({ message: "질문을 찾을 수 없습니다." });
      }

      if (parsed.data.code && parsed.data.code !== existing.code) {
        const duplicated = await findQuestionByCode(parsed.data.code);
        if (duplicated) {
          return reply.status(409).send({ message: "이미 사용 중인 질문 코드입니다." });
        }
      }

      const question = await updateQuestion(parsedId.data, parsed.data);
      return { question: serializeQuestion(question) };
    },
  );

  app.delete(
    "/api/admin/master/questions/:id",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsedId = parseId((request.params as { id: string }).id);
      if (!parsedId.success) {
        return reply.status(400).send({ message: "잘못된 질문 ID입니다." });
      }

      const existing = await findQuestionById(parsedId.data);
      if (!existing) {
        return reply.status(404).send({ message: "질문을 찾을 수 없습니다." });
      }

      if (existing._count.symptom_questions > 0 || existing._count.case_question_answers > 0) {
        return reply.status(409).send({
          message: "연결된 증상 또는 운영 답변이 있는 질문은 삭제할 수 없습니다. 비활성화로 관리해주세요.",
        });
      }

      await deleteQuestion(parsedId.data);
      return reply.status(204).send();
    },
  );

  app.get(
    "/api/admin/master/questions/:id/answer-options",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsedId = parseId((request.params as { id: string }).id);
      if (!parsedId.success) {
        return reply.status(400).send({ message: "잘못된 질문 ID입니다." });
      }

      const question = await findQuestionById(parsedId.data);
      if (!question) {
        return reply.status(404).send({ message: "질문을 찾을 수 없습니다." });
      }

      const options = await listAnswerOptionsByQuestion(parsedId.data);
      return { answer_options: options.map(serializeAnswerOption) };
    },
  );

  app.post(
    "/api/admin/master/questions/:id/answer-options",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsedId = parseId((request.params as { id: string }).id);
      if (!parsedId.success) {
        return reply.status(400).send({ message: "잘못된 질문 ID입니다." });
      }

      const parsed = answerOptionCreateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ message: "입력값을 확인해주세요." });
      }

      const question = await findQuestionById(parsedId.data);
      if (!question) {
        return reply.status(404).send({ message: "질문을 찾을 수 없습니다." });
      }

      const duplicated = await findAnswerOptionByQuestionAndValue(
        parsedId.data,
        parsed.data.value,
      );
      if (duplicated) {
        return reply.status(409).send({ message: "같은 질문에 동일한 옵션 값이 이미 있습니다." });
      }

      const option = await createAnswerOption({
        question_id: parsedId.data,
        ...parsed.data,
      });

      return reply.status(201).send({
        answer_option: serializeAnswerOption(option),
      });
    },
  );

  app.put(
    "/api/admin/master/answer-options/:id",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsedId = parseId((request.params as { id: string }).id);
      if (!parsedId.success) {
        return reply.status(400).send({ message: "잘못된 답변 옵션 ID입니다." });
      }

      const parsed = answerOptionUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ message: "입력값을 확인해주세요." });
      }

      const existing = await findAnswerOptionById(parsedId.data);
      if (!existing) {
        return reply.status(404).send({ message: "답변 옵션을 찾을 수 없습니다." });
      }

      if (parsed.data.value && parsed.data.value !== existing.value) {
        const duplicated = await findAnswerOptionByQuestionAndValue(
          existing.question_id,
          parsed.data.value,
        );
        if (duplicated) {
          return reply.status(409).send({ message: "같은 질문에 동일한 옵션 값이 이미 있습니다." });
        }
      }

      const option = await updateAnswerOption(parsedId.data, parsed.data);
      return { answer_option: serializeAnswerOption(option) };
    },
  );

  app.delete(
    "/api/admin/master/answer-options/:id",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsedId = parseId((request.params as { id: string }).id);
      if (!parsedId.success) {
        return reply.status(400).send({ message: "잘못된 답변 옵션 ID입니다." });
      }

      const existing = await findAnswerOptionById(parsedId.data);
      if (!existing) {
        return reply.status(404).send({ message: "답변 옵션을 찾을 수 없습니다." });
      }

      if (
        existing._count.diagnosis_rules > 0 ||
        existing._count.diagnosis_effect_rules > 0 ||
        existing._count.case_question_answers > 0
      ) {
        return reply.status(409).send({
          message: "연결된 룰 또는 운영 답변이 있는 옵션은 삭제할 수 없습니다.",
        });
      }

      await deleteAnswerOption(parsedId.data);
      return reply.status(204).send();
    },
  );

  app.get(
    "/api/admin/master/symptoms/:id/diagnosis-rules",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsedId = parseId((request.params as { id: string }).id);
      if (!parsedId.success) {
        return reply.status(400).send({ message: "잘못된 증상 ID입니다." });
      }

      const symptom = await findSymptomById(parsedId.data);
      if (!symptom) {
        return reply.status(404).send({ message: "증상을 찾을 수 없습니다." });
      }

      const rules = await listDiagnosisRulesBySymptom(parsedId.data);
      return { diagnosis_rules: rules.map(serializeDiagnosisRule) };
    },
  );

  app.post(
    "/api/admin/master/diagnosis-rules",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsed = diagnosisRuleCreateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ message: "입력값을 확인해주세요." });
      }

      const symptomQuestion = await findSymptomQuestionById(parsed.data.symptom_question_id);
      if (!symptomQuestion) {
        return reply.status(404).send({ message: "질문 연결을 찾을 수 없습니다." });
      }

      const failureType = await findFailureTypeById(parsed.data.failure_type_id);
      if (!failureType) {
        return reply.status(404).send({ message: "고장유형을 찾을 수 없습니다." });
      }

      const answerOption = await findAnswerOptionById(parsed.data.answer_option_id);
      if (!answerOption) {
        return reply.status(404).send({ message: "답변 옵션을 찾을 수 없습니다." });
      }

      if (answerOption.question_id !== symptomQuestion.question_id) {
        return reply.status(400).send({
          message: "답변 옵션이 질문 연결의 질문과 일치하지 않습니다.",
        });
      }

      const duplicated = await findDuplicateDiagnosisRule({
        symptom_question_id: parsed.data.symptom_question_id,
        failure_type_id: parsed.data.failure_type_id,
        answer_option_id: parsed.data.answer_option_id,
      });
      if (duplicated) {
        return reply.status(409).send({ message: "같은 질문/고장유형/답변 조합의 룰이 이미 있습니다." });
      }

      const rule = await createDiagnosisRule(parsed.data);
      return reply.status(201).send({
        diagnosis_rule: serializeDiagnosisRule(rule),
      });
    },
  );

  app.put(
    "/api/admin/master/diagnosis-rules/:id",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsedId = parseId((request.params as { id: string }).id);
      if (!parsedId.success) {
        return reply.status(400).send({ message: "잘못된 진단 룰 ID입니다." });
      }

      const parsed = diagnosisRuleUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ message: "입력값을 확인해주세요." });
      }

      const existing = await findDiagnosisRuleById(parsedId.data);
      if (!existing) {
        return reply.status(404).send({ message: "진단 룰을 찾을 수 없습니다." });
      }

      const nextSymptomQuestionId =
        parsed.data.symptom_question_id ?? existing.symptom_question_id;
      const nextFailureTypeId = parsed.data.failure_type_id ?? existing.failure_type_id;
      const nextAnswerOptionId = parsed.data.answer_option_id ?? existing.answer_option_id;

      let nextSymptomQuestion = null as Awaited<ReturnType<typeof findSymptomQuestionById>>;
      if (parsed.data.symptom_question_id) {
        nextSymptomQuestion = await findSymptomQuestionById(parsed.data.symptom_question_id);
        if (!nextSymptomQuestion) {
          return reply.status(404).send({ message: "질문 연결을 찾을 수 없습니다." });
        }
      }

      if (parsed.data.failure_type_id) {
        const failureType = await findFailureTypeById(parsed.data.failure_type_id);
        if (!failureType) {
          return reply.status(404).send({ message: "고장유형을 찾을 수 없습니다." });
        }
      }

      let nextAnswerOption = null as Awaited<ReturnType<typeof findAnswerOptionById>>;
      if (parsed.data.answer_option_id) {
        nextAnswerOption = await findAnswerOptionById(parsed.data.answer_option_id);
        if (!nextAnswerOption) {
          return reply.status(404).send({ message: "답변 옵션을 찾을 수 없습니다." });
        }
      }

      const expectedQuestionId =
        nextSymptomQuestion?.question_id ??
        existing.symptom_question.question.id;
      const candidateAnswerOption =
        nextAnswerOption ??
        (await findAnswerOptionById(nextAnswerOptionId));
      if (
        candidateAnswerOption &&
        candidateAnswerOption.question_id !== expectedQuestionId
      ) {
        return reply.status(400).send({
          message: "답변 옵션이 질문 연결의 질문과 일치하지 않습니다.",
        });
      }

      if (
        nextSymptomQuestionId !== existing.symptom_question_id ||
        nextFailureTypeId !== existing.failure_type_id ||
        nextAnswerOptionId !== existing.answer_option_id
      ) {
        const duplicated = await findDuplicateDiagnosisRule({
          symptom_question_id: nextSymptomQuestionId,
          failure_type_id: nextFailureTypeId,
          answer_option_id: nextAnswerOptionId,
        });

        if (duplicated && duplicated.id !== existing.id) {
          return reply.status(409).send({ message: "같은 질문/고장유형/답변 조합의 룰이 이미 있습니다." });
        }
      }

      const rule = await updateDiagnosisRule(parsedId.data, parsed.data);
      return { diagnosis_rule: serializeDiagnosisRule(rule) };
    },
  );

  app.delete(
    "/api/admin/master/diagnosis-rules/:id",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsedId = parseId((request.params as { id: string }).id);
      if (!parsedId.success) {
        return reply.status(400).send({ message: "잘못된 진단 룰 ID입니다." });
      }

      const existing = await findDiagnosisRuleById(parsedId.data);
      if (!existing) {
        return reply.status(404).send({ message: "진단 룰을 찾을 수 없습니다." });
      }

      await deleteDiagnosisRule(parsedId.data);
      return reply.status(204).send();
    },
  );

  app.get(
    "/api/admin/master/symptoms/:id/effect-rules",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsedId = parseId((request.params as { id: string }).id);
      if (!parsedId.success) {
        return reply.status(400).send({ message: "잘못된 증상 ID입니다." });
      }

      const symptom = await findSymptomById(parsedId.data);
      if (!symptom) {
        return reply.status(404).send({ message: "증상을 찾을 수 없습니다." });
      }

      const rules = await listEffectRulesBySymptom(parsedId.data);
      return { effect_rules: rules.map(serializeEffectRule) };
    },
  );

  app.post(
    "/api/admin/master/effect-rules",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsed = effectRuleCreateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ message: "입력값을 확인해주세요." });
      }

      const symptomQuestion = await findSymptomQuestionById(parsed.data.symptom_question_id);
      if (!symptomQuestion) {
        return reply.status(404).send({ message: "질문 연결을 찾을 수 없습니다." });
      }

      const answerOption = await findAnswerOptionById(parsed.data.answer_option_id);
      if (!answerOption) {
        return reply.status(404).send({ message: "답변 옵션을 찾을 수 없습니다." });
      }

      if (answerOption.question_id !== symptomQuestion.question_id) {
        return reply.status(400).send({
          message: "답변 옵션이 질문 연결의 질문과 일치하지 않습니다.",
        });
      }

      const duplicated = await findDuplicateEffectRule({
        symptom_question_id: parsed.data.symptom_question_id,
        answer_option_id: parsed.data.answer_option_id,
        effect_type: parsed.data.effect_type,
        flag_key: parsed.data.flag_key ?? null,
      });
      if (duplicated) {
        return reply.status(409).send({
          message: "같은 질문/답변/효과 종류 조합의 룰이 이미 있습니다.",
        });
      }

      const rule = await createEffectRule(parsed.data);
      return reply.status(201).send({
        effect_rule: serializeEffectRule(rule),
      });
    },
  );

  app.put(
    "/api/admin/master/effect-rules/:id",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsedId = parseId((request.params as { id: string }).id);
      if (!parsedId.success) {
        return reply.status(400).send({ message: "잘못된 효과 룰 ID입니다." });
      }

      const parsed = effectRuleUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ message: "입력값을 확인해주세요." });
      }

      const existing = await findEffectRuleById(parsedId.data);
      if (!existing) {
        return reply.status(404).send({ message: "효과 룰을 찾을 수 없습니다." });
      }

      if (parsed.data.symptom_question_id) {
        const symptomQuestion = await findSymptomQuestionById(parsed.data.symptom_question_id);
        if (!symptomQuestion) {
          return reply.status(404).send({ message: "질문 연결을 찾을 수 없습니다." });
        }
      }

      if (parsed.data.answer_option_id) {
        const answerOption = await findAnswerOptionById(parsed.data.answer_option_id);
        if (!answerOption) {
          return reply.status(404).send({ message: "답변 옵션을 찾을 수 없습니다." });
        }
      }

      const rule = await updateEffectRule(parsedId.data, parsed.data);
      return { effect_rule: serializeEffectRule(rule) };
    },
  );

  app.delete(
    "/api/admin/master/effect-rules/:id",
    { preHandler: [app.requireAdmin] },
    async (request, reply) => {
      const parsedId = parseId((request.params as { id: string }).id);
      if (!parsedId.success) {
        return reply.status(400).send({ message: "잘못된 효과 룰 ID입니다." });
      }

      const existing = await findEffectRuleById(parsedId.data);
      if (!existing) {
        return reply.status(404).send({ message: "효과 룰을 찾을 수 없습니다." });
      }

      await deleteEffectRule(parsedId.data);
      return reply.status(204).send();
    },
  );
};
