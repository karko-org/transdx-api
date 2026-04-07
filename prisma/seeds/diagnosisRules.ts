import type { PrismaClient } from "@prisma/client";

// The current schema stores only per-question score rules.
// Meta flags like 심화누유=true or Q-L10 global activation/confidence handling
// are intentionally excluded until schema support is added.
const diagnosisRules = [
  {
    questionCode: "Q-L01",
    expectedAnswer: true,
    failureTypeCode: "L-01",
    scoreDelta: 3,
    explanation: "차량 정중앙 하부 누유는 오일팬 가스켓 누유 가능성을 높입니다.",
  },
  {
    questionCode: "Q-L01",
    expectedAnswer: true,
    failureTypeCode: "L-02",
    scoreDelta: 2,
    explanation: "차량 정중앙 하부 누유는 드레인 플러그·와셔 누유 가능성을 높입니다.",
  },
  {
    questionCode: "Q-L01",
    expectedAnswer: true,
    failureTypeCode: "L-05",
    scoreDelta: 1,
    explanation: "차량 정중앙 하부 누유는 케이스 접합부·사이드 커버 누유 가능성을 일부 높입니다.",
  },
  {
    questionCode: "Q-L01",
    expectedAnswer: false,
    failureTypeCode: "L-01",
    scoreDelta: -1,
    explanation: "정중앙 하부 누유가 아니면 오일팬 가스켓 누유 가능성은 낮아집니다.",
  },
  {
    questionCode: "Q-L01",
    expectedAnswer: false,
    failureTypeCode: "L-02",
    scoreDelta: -1,
    explanation: "정중앙 하부 누유가 아니면 드레인 플러그·와셔 누유 가능성은 낮아집니다.",
  },
  {
    questionCode: "Q-L02",
    expectedAnswer: true,
    failureTypeCode: "L-03",
    scoreDelta: 4,
    explanation: "전면 라인 또는 라디에이터 근처 누유는 오일쿨러 라인·호스 누유 가능성을 높입니다.",
  },
  {
    questionCode: "Q-L02",
    expectedAnswer: false,
    failureTypeCode: "L-03",
    scoreDelta: -2,
    explanation: "전면 라인 누유 정황이 없으면 오일쿨러 라인·호스 누유 가능성은 낮아집니다.",
  },
  {
    questionCode: "Q-L03a",
    expectedAnswer: true,
    failureTypeCode: "L-01",
    scoreDelta: 1,
    explanation: "소량 누유는 오일팬 가스켓 누유 가능성을 일부 높입니다.",
  },
  {
    questionCode: "Q-L03a",
    expectedAnswer: true,
    failureTypeCode: "L-02",
    scoreDelta: 2,
    explanation: "소량 누유는 드레인 플러그·와셔 누유 가능성을 높입니다.",
  },
  {
    questionCode: "Q-L03a",
    expectedAnswer: true,
    failureTypeCode: "L-07",
    scoreDelta: 1,
    explanation: "소량 누유는 오버플로우/레벨 점검부 누유 가능성을 일부 높입니다.",
  },
  {
    questionCode: "Q-L03b",
    expectedAnswer: true,
    failureTypeCode: "L-03",
    scoreDelta: 2,
    explanation: "다량 누유는 오일쿨러 라인·호스 누유 가능성을 높입니다.",
  },
  {
    questionCode: "Q-L03b",
    expectedAnswer: true,
    failureTypeCode: "L-04",
    scoreDelta: 2,
    explanation: "다량 누유는 입력축/출력축 오일실 누유 가능성을 높입니다.",
  },
  {
    questionCode: "Q-L03b",
    expectedAnswer: true,
    failureTypeCode: "L-05",
    scoreDelta: 2,
    explanation: "다량 누유는 케이스 접합부·사이드 커버 누유 가능성을 높입니다.",
  },
  {
    questionCode: "Q-L04",
    expectedAnswer: true,
    failureTypeCode: "L-02",
    scoreDelta: 3,
    explanation: "오일 보충 또는 교환 직후 시작된 누유는 드레인 플러그·와셔 누유 가능성을 높입니다.",
  },
  {
    questionCode: "Q-L04",
    expectedAnswer: true,
    failureTypeCode: "L-07",
    scoreDelta: 3,
    explanation: "오일 보충 또는 교환 직후 시작된 누유는 오버플로우/레벨 점검부 누유 가능성을 높입니다.",
  },
  {
    questionCode: "Q-L04",
    expectedAnswer: true,
    failureTypeCode: "L-01",
    scoreDelta: 1,
    explanation: "오일 보충 또는 교환 직후 시작된 누유는 오일팬 가스켓 누유 가능성도 일부 높입니다.",
  },
  {
    questionCode: "Q-L05",
    expectedAnswer: true,
    failureTypeCode: "L-03",
    scoreDelta: 1,
    explanation: "변속 지연·슬립·과열 동반 시 오일쿨러 라인·호스 누유 가능성이 일부 높아집니다.",
  },
  {
    questionCode: "Q-L05",
    expectedAnswer: true,
    failureTypeCode: "L-04",
    scoreDelta: 1,
    explanation: "변속 지연·슬립·과열 동반 시 입력축/출력축 오일실 누유 가능성이 일부 높아집니다.",
  },
  {
    questionCode: "Q-L05",
    expectedAnswer: true,
    failureTypeCode: "L-05",
    scoreDelta: 1,
    explanation: "변속 지연·슬립·과열 동반 시 케이스 접합부·사이드 커버 누유 가능성이 일부 높아집니다.",
  },
  {
    questionCode: "Q-L06",
    expectedAnswer: true,
    failureTypeCode: "L-04",
    scoreDelta: 4,
    explanation: "회전부 주변으로 흩뿌려진 누유는 입력축/출력축 오일실 누유 가능성을 크게 높입니다.",
  },
  {
    questionCode: "Q-L06",
    expectedAnswer: false,
    failureTypeCode: "L-04",
    scoreDelta: -1,
    explanation: "회전부 주변 비산 정황이 없으면 입력축/출력축 오일실 누유 가능성은 낮아집니다.",
  },
  {
    questionCode: "Q-L07",
    expectedAnswer: true,
    failureTypeCode: "L-05",
    scoreDelta: 2,
    explanation: "시작 지점이 불명확한 광범위 젖음은 케이스 접합부·사이드 커버 누유 가능성을 높입니다.",
  },
  {
    questionCode: "Q-L07",
    expectedAnswer: true,
    failureTypeCode: "L-06",
    scoreDelta: 2,
    explanation: "시작 지점이 불명확한 광범위 젖음은 하네스 커넥터 씰 누유 가능성을 높입니다.",
  },
  {
    questionCode: "Q-L07",
    expectedAnswer: true,
    failureTypeCode: "L-01",
    scoreDelta: 1,
    explanation: "시작 지점이 불명확한 광범위 젖음은 오일팬 가스켓 누유 가능성도 일부 높입니다.",
  },
  {
    questionCode: "Q-L08",
    expectedAnswer: true,
    failureTypeCode: "L-01",
    scoreDelta: 1,
    explanation: "연식 또는 장기 미정비 이력은 오일팬 가스켓 열화 가능성을 일부 높입니다.",
  },
  {
    questionCode: "Q-L08",
    expectedAnswer: true,
    failureTypeCode: "L-04",
    scoreDelta: 2,
    explanation: "연식 또는 장기 미정비 이력은 입력축/출력축 오일실 열화 가능성을 높입니다.",
  },
  {
    questionCode: "Q-L08",
    expectedAnswer: true,
    failureTypeCode: "L-05",
    scoreDelta: 2,
    explanation: "연식 또는 장기 미정비 이력은 케이스 접합부·사이드 커버 열화 가능성을 높입니다.",
  },
  {
    questionCode: "Q-L09",
    expectedAnswer: true,
    failureTypeCode: "L-06",
    scoreDelta: 4,
    explanation: "하네스 커넥터 또는 전기 연결부 젖음 정황은 하네스 커넥터 씰 누유 가능성을 크게 높입니다.",
  },
];

export async function seedDiagnosisRules(prisma: PrismaClient) {
  const questionCodes = [...new Set(diagnosisRules.map((rule) => rule.questionCode))];
  const failureTypeCodes = [
    ...new Set(diagnosisRules.map((rule) => rule.failureTypeCode)),
  ];

  const questions = await prisma.question.findMany({
    where: {
      code: {
        in: questionCodes,
      },
    },
  });

  const failureTypes = await prisma.failureType.findMany({
    where: {
      code: {
        in: failureTypeCodes,
      },
    },
  });

  const questionByCode = new Map(questions.map((question) => [question.code, question]));
  const failureTypeByCode = new Map(
    failureTypes.map((failureType) => [failureType.code, failureType]),
  );

  for (const questionCode of questionCodes) {
    if (!questionByCode.has(questionCode)) {
      throw new Error(`Missing question: ${questionCode}`);
    }
  }

  for (const failureTypeCode of failureTypeCodes) {
    if (!failureTypeByCode.has(failureTypeCode)) {
      throw new Error(`Missing failure type: ${failureTypeCode}`);
    }
  }

  const questionIds = questions.map((question) => question.id);
  const failureTypeIds = failureTypes.map((failureType) => failureType.id);

  await prisma.$transaction([
    prisma.diagnosisRule.deleteMany({
      where: {
        question_id: {
          in: questionIds,
        },
        failure_type_id: {
          in: failureTypeIds,
        },
      },
    }),
    prisma.diagnosisRule.createMany({
      data: diagnosisRules.map((rule) => ({
        question_id: questionByCode.get(rule.questionCode)!.id,
        failure_type_id: failureTypeByCode.get(rule.failureTypeCode)!.id,
        expected_answer: rule.expectedAnswer,
        score_delta: rule.scoreDelta,
        explanation: rule.explanation,
      })),
    }),
  ]);
}
