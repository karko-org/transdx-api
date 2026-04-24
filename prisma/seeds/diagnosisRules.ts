import type { PrismaClient } from "@prisma/client";

// 노션 1번 중분류 4-1 점수 매핑표 (2026-04-21 확정본) 1:1 복제
// "모름" 답변은 자동 skip되도록 룰을 만들지 않음 (점수 매칭 실패 = 0)
// 플래그·증상 신뢰도 등 점수 외 효과는 diagnosisEffectRules.ts에서 처리
const diagnosisRules = [
  // Q-L01: 차량 정중앙 하부 누유?
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L01",
    answerValue: "yes",
    failureTypeCode: "L-01",
    scoreDelta: 3,
    explanation: "차량 정중앙 하부 누유는 오일팬 가스켓 누유 가능성을 높입니다.",
  },
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L01",
    answerValue: "yes",
    failureTypeCode: "L-02",
    scoreDelta: 2,
    explanation: "차량 정중앙 하부 누유는 드레인 플러그·와셔 누유 가능성을 높입니다.",
  },
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L01",
    answerValue: "yes",
    failureTypeCode: "L-06",
    scoreDelta: 1,
    explanation: "차량 정중앙 하부 누유는 케이스 접합부·사이드 커버 누유 가능성을 일부 높입니다.",
  },
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L01",
    answerValue: "no",
    failureTypeCode: "L-01",
    scoreDelta: -1,
    explanation: "정중앙 하부 누유가 아니면 오일팬 가스켓 누유 가능성은 낮아집니다.",
  },
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L01",
    answerValue: "no",
    failureTypeCode: "L-02",
    scoreDelta: -1,
    explanation: "정중앙 하부 누유가 아니면 드레인 플러그·와셔 누유 가능성은 낮아집니다.",
  },

  // Q-L02: 전면 라인 또는 라디에이터 근처 누유?
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L02",
    answerValue: "yes",
    failureTypeCode: "L-03",
    scoreDelta: 4,
    explanation: "전면 라인 또는 라디에이터 근처 누유는 오일쿨러 라인·호스 누유 가능성을 높입니다.",
  },
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L02",
    answerValue: "no",
    failureTypeCode: "L-03",
    scoreDelta: -2,
    explanation: "전면 라인 누유 정황이 없으면 오일쿨러 라인·호스 누유 가능성은 낮아집니다.",
  },

  // Q-L03: 누유 양 (소량/다량)
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L03",
    answerValue: "low",
    failureTypeCode: "L-01",
    scoreDelta: 1,
    explanation: "소량 누유는 오일팬 가스켓 누유 가능성을 일부 높입니다.",
  },
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L03",
    answerValue: "low",
    failureTypeCode: "L-02",
    scoreDelta: 2,
    explanation: "소량 누유는 드레인 플러그·와셔 누유 가능성을 높입니다.",
  },
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L03",
    answerValue: "low",
    failureTypeCode: "L-07",
    scoreDelta: 1,
    explanation: "소량 누유는 하네스 커넥터 씰 누유 가능성을 일부 높입니다.",
  },
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L03",
    answerValue: "low",
    failureTypeCode: "L-08",
    scoreDelta: 1,
    explanation: "소량 누유는 오버플로우·레벨 점검부·브리더 누유 가능성을 일부 높입니다.",
  },
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L03",
    answerValue: "high",
    failureTypeCode: "L-03",
    scoreDelta: 2,
    explanation: "다량 누유는 오일쿨러 라인·호스 누유 가능성을 높입니다.",
  },
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L03",
    answerValue: "high",
    failureTypeCode: "L-04",
    scoreDelta: 2,
    explanation: "다량 누유는 입력축·토크컨버터 프론트 펌프 씰 누유 가능성을 높입니다.",
  },
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L03",
    answerValue: "high",
    failureTypeCode: "L-05",
    scoreDelta: 2,
    explanation: "다량 누유는 출력축·테일하우징 씰 누유 가능성을 높입니다.",
  },
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L03",
    answerValue: "high",
    failureTypeCode: "L-06",
    scoreDelta: 2,
    explanation: "다량 누유는 케이스 접합부·사이드 커버·밸브바디 커버 누유 가능성을 높입니다.",
  },

  // Q-L04: 최근 오일 보충/교환 직후?
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L04",
    answerValue: "yes",
    failureTypeCode: "L-02",
    scoreDelta: 3,
    explanation: "오일 보충 또는 교환 직후 시작된 누유는 드레인 플러그·와셔 누유 가능성을 높입니다.",
  },
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L04",
    answerValue: "yes",
    failureTypeCode: "L-08",
    scoreDelta: 3,
    explanation: "오일 보충 또는 교환 직후 시작된 누유는 오버플로우·레벨 점검부 누유 가능성을 높입니다.",
  },
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L04",
    answerValue: "yes",
    failureTypeCode: "L-01",
    scoreDelta: 1,
    explanation: "오일 보충 또는 교환 직후 시작된 누유는 오일팬 가스켓 누유 가능성도 일부 높입니다.",
  },

  // Q-L06: 축 회전부 주변 흩뿌려진 누유?
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L06",
    answerValue: "yes",
    failureTypeCode: "L-04",
    scoreDelta: 3,
    explanation: "회전부 주변으로 흩뿌려진 누유는 입력축·토크컨버터 프론트 펌프 씰 누유 가능성을 높입니다.",
  },
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L06",
    answerValue: "yes",
    failureTypeCode: "L-05",
    scoreDelta: 3,
    explanation: "회전부 주변으로 흩뿌려진 누유는 출력축·테일하우징 씰 누유 가능성을 높입니다.",
  },
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L06",
    answerValue: "no",
    failureTypeCode: "L-04",
    scoreDelta: -1,
    explanation: "회전부 주변 비산 정황이 없으면 입력축·토크컨버터 프론트 펌프 씰 누유 가능성은 낮아집니다.",
  },
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L06",
    answerValue: "no",
    failureTypeCode: "L-05",
    scoreDelta: -1,
    explanation: "회전부 주변 비산 정황이 없으면 출력축·테일하우징 씰 누유 가능성은 낮아집니다.",
  },

  // Q-L07: 하부 전체 젖음 (시작 지점 불명확)
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L07",
    answerValue: "yes",
    failureTypeCode: "L-06",
    scoreDelta: 2,
    explanation: "시작 지점이 불명확한 광범위 젖음은 케이스 접합부·사이드 커버 누유 가능성을 높입니다.",
  },
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L07",
    answerValue: "yes",
    failureTypeCode: "L-07",
    scoreDelta: 2,
    explanation: "시작 지점이 불명확한 광범위 젖음은 하네스 커넥터 씰 누유 가능성을 높입니다.",
  },
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L07",
    answerValue: "yes",
    failureTypeCode: "L-01",
    scoreDelta: 1,
    explanation: "시작 지점이 불명확한 광범위 젖음은 오일팬 가스켓 누유 가능성도 일부 높입니다.",
  },
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L07",
    answerValue: "yes",
    failureTypeCode: "L-08",
    scoreDelta: 1,
    explanation: "시작 지점이 불명확한 광범위 젖음은 브리더 과압 누유 가능성도 일부 높입니다.",
  },

  // Q-L08: 연식 또는 장기 미정비 이력?
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L08",
    answerValue: "yes",
    failureTypeCode: "L-01",
    scoreDelta: 1,
    explanation: "연식 또는 장기 미정비 이력은 오일팬 가스켓 열화 가능성을 일부 높입니다.",
  },
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L08",
    answerValue: "yes",
    failureTypeCode: "L-04",
    scoreDelta: 2,
    explanation: "연식 또는 장기 미정비 이력은 입력축·토크컨버터 프론트 펌프 씰 열화 가능성을 높입니다.",
  },
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L08",
    answerValue: "yes",
    failureTypeCode: "L-05",
    scoreDelta: 2,
    explanation: "연식 또는 장기 미정비 이력은 출력축·테일하우징 씰 열화 가능성을 높입니다.",
  },
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L08",
    answerValue: "yes",
    failureTypeCode: "L-06",
    scoreDelta: 1,
    explanation: "연식 또는 장기 미정비 이력은 케이스 접합부 가스켓 열화 가능성을 일부 높입니다.",
  },

  // Q-L09: 하네스 커넥터 또는 전기 연결부 젖음?
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L09",
    answerValue: "yes",
    failureTypeCode: "L-07",
    scoreDelta: 4,
    explanation: "하네스 커넥터 또는 전기 연결부 젖음 정황은 하네스 커넥터 씰 누유 가능성을 크게 높입니다.",
  },

  // Q-L10: 변속기 앞쪽(벨하우징) 누유?
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L10",
    answerValue: "yes",
    failureTypeCode: "L-04",
    scoreDelta: 4,
    explanation: "변속기 앞쪽 벨하우징 근처 누유는 입력축·토크컨버터 프론트 펌프 씰 누유 가능성을 크게 높입니다.",
  },
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L10",
    answerValue: "no",
    failureTypeCode: "L-04",
    scoreDelta: -1,
    explanation: "앞쪽 누유 정황이 없으면 입력축·토크컨버터 프론트 펌프 씰 누유 가능성은 낮아집니다.",
  },

  // Q-L11: 변속기 뒤쪽(프로펠러 샤프트) 누유?
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L11",
    answerValue: "yes",
    failureTypeCode: "L-05",
    scoreDelta: 4,
    explanation: "변속기 뒤쪽 프로펠러 샤프트 근처 누유는 출력축·테일하우징 씰 누유 가능성을 크게 높입니다.",
  },
  {
    symptomName: "변속기 오일 누유",
    questionCode: "Q-L11",
    answerValue: "no",
    failureTypeCode: "L-05",
    scoreDelta: -1,
    explanation: "뒤쪽 누유 정황이 없으면 출력축·테일하우징 씰 누유 가능성은 낮아집니다.",
  },

  // Q-L12 "예"는 누유 증상 확정 (점수 영향 없는 게이트) → 룰 없음 (no-op)
  // Q-L12 "아니오"는 ATF가 아닌 타 계통 가능성 → diagnosisEffectRules.ts에서 신뢰도/플래그로 처리
];

export async function seedDiagnosisRules(prisma: PrismaClient) {
  const questionCodes = [...new Set(diagnosisRules.map((rule) => rule.questionCode))];
  const failureTypeCodes = [
    ...new Set(diagnosisRules.map((rule) => rule.failureTypeCode)),
  ];
  const symptomNames = [...new Set(diagnosisRules.map((rule) => rule.symptomName))];

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

  const failureTypes = await prisma.failureType.findMany({
    where: {
      code: {
        in: failureTypeCodes,
      },
    },
  });

  const symptomQuestionByKey = new Map(
    symptomQuestions.map((symptomQuestion) => [
      `${symptomQuestion.symptom.name}:${symptomQuestion.question.code}`,
      symptomQuestion,
    ]),
  );
  const failureTypeByCode = new Map(
    failureTypes.map((failureType) => [failureType.code, failureType]),
  );

  for (const rule of diagnosisRules) {
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

  for (const failureTypeCode of failureTypeCodes) {
    if (!failureTypeByCode.has(failureTypeCode)) {
      throw new Error(`Missing failure type: ${failureTypeCode}`);
    }
  }

  const symptomQuestionIds = symptomQuestions.map((symptomQuestion) => symptomQuestion.id);
  const failureTypeIds = failureTypes.map((failureType) => failureType.id);

  await prisma.$transaction([
    prisma.diagnosisRule.deleteMany({
      where: {
        symptom_question_id: {
          in: symptomQuestionIds,
        },
        failure_type_id: {
          in: failureTypeIds,
        },
      },
    }),
    prisma.diagnosisRule.createMany({
      data: diagnosisRules.map((rule) => {
        const symptomQuestion = symptomQuestionByKey.get(
          `${rule.symptomName}:${rule.questionCode}`,
        )!;
        const answerOption = symptomQuestion.question.answer_options.find(
          (option) => option.value === rule.answerValue,
        )!;

        return {
          symptom_question_id: symptomQuestion.id,
          failure_type_id: failureTypeByCode.get(rule.failureTypeCode)!.id,
          answer_option_id: answerOption.id,
          score_delta: rule.scoreDelta,
          explanation: rule.explanation,
        };
      }),
    }),
  ]);
}
