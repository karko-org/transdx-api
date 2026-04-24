import type { PrismaClient } from "@prisma/client";

// 노션 1번 중분류 4-1 매핑표 중 점수 외 효과 (플래그 / 증상 신뢰도)
// - Q-L03 "다량" → 심화누유 플래그 set
// - Q-L12 "아니오" → 변속기 오일 누유 증상 자체 신뢰도 -3 + 타 계통 누유 확인 플래그
type EffectRuleDef = {
  symptomName: string;
  questionCode: string;
  answerValue: string;
  effectType: "symptom_confidence" | "flag";
  symptomConfidenceDelta?: number;
  flagKey?: string;
  flagValue?: boolean;
  explanation: string;
};

const effectRules: EffectRuleDef[] = [
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L03",
    answerValue: "high",
    effectType: "flag",
    flagKey: "deep_leak",
    flagValue: true,
    explanation: "다량 누유 시 심화누유 플래그를 설정합니다.",
  },
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L12",
    answerValue: "no",
    effectType: "symptom_confidence",
    symptomConfidenceDelta: -3,
    explanation: "ATF가 아닌 색이면 변속기 오일 누유 증상 자체 신뢰도를 차감합니다.",
  },
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L12",
    answerValue: "no",
    effectType: "flag",
    flagKey: "non_atf_leak_check",
    flagValue: true,
    explanation: "ATF가 아닌 색이면 타 계통 누유 확인이 필요함을 표시합니다.",
  },
];

export async function seedDiagnosisEffectRules(prisma: PrismaClient) {
  const symptomNames = [...new Set(effectRules.map((rule) => rule.symptomName))];
  const questionCodes = [...new Set(effectRules.map((rule) => rule.questionCode))];

  const symptomQuestions = await prisma.symptomQuestion.findMany({
    where: {
      symptom: {
        name: {
          in: symptomNames,
        },
      },
      question: {
        code: {
          in: questionCodes,
        },
      },
    },
    include: {
      symptom: true,
      question: {
        include: {
          answer_options: true,
        },
      },
    },
  });

  const symptomQuestionByKey = new Map(
    symptomQuestions.map((symptomQuestion) => [
      `${symptomQuestion.symptom.name}:${symptomQuestion.question.code}`,
      symptomQuestion,
    ]),
  );

  for (const rule of effectRules) {
    const key = `${rule.symptomName}:${rule.questionCode}`;
    const symptomQuestion = symptomQuestionByKey.get(key);

    if (!symptomQuestion) {
      throw new Error(`Missing symptom question: ${key}`);
    }

    const answerOption = symptomQuestion.question.answer_options.find(
      (option) => option.value === rule.answerValue,
    );

    if (!answerOption) {
      throw new Error(
        `Missing answer option "${rule.answerValue}" for question ${rule.questionCode}`,
      );
    }
  }

  const symptomQuestionIds = symptomQuestions.map((symptomQuestion) => symptomQuestion.id);

  await prisma.$transaction([
    prisma.diagnosisEffectRule.deleteMany({
      where: {
        symptom_question_id: {
          in: symptomQuestionIds,
        },
      },
    }),
    prisma.diagnosisEffectRule.createMany({
      data: effectRules.map((rule) => {
        const symptomQuestion = symptomQuestionByKey.get(
          `${rule.symptomName}:${rule.questionCode}`,
        )!;
        const answerOption = symptomQuestion.question.answer_options.find(
          (option) => option.value === rule.answerValue,
        )!;

        return {
          symptom_question_id: symptomQuestion.id,
          answer_option_id: answerOption.id,
          effect_type: rule.effectType,
          symptom_confidence_delta: rule.symptomConfidenceDelta ?? null,
          flag_key: rule.flagKey ?? null,
          flag_value: rule.flagValue ?? null,
          explanation: rule.explanation,
        };
      }),
    }),
  ]);
}
