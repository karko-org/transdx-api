import type { PrismaClient } from "@prisma/client";

const removedQuestionCodes = ["Q-L03a", "Q-L03b", "Q-L05"];

const questionsBySymptom = [
  {
    symptomName: "변속기 오일 누유",
    questions: [
      {
        code: "Q-L01",
        text: "오일 자국이 차량 정중앙 하부(변속기 바로 밑바닥)에 주로 맺히나요?",
        question_intent: "팬/하부 접합부 누유 가능성 확인",
        answer_format: "yes_no_unknown",
        sort_order: 1,
      },
      {
        code: "Q-L02",
        text: "오일이 차량 전면 쪽 라인 또는 라디에이터 근처에서 보이나요?",
        question_intent: "쿨러 라인 누유 판별",
        answer_format: "yes_no_unknown",
        sort_order: 2,
      },
      {
        code: "Q-L03",
        text: "누유 양은 어느 정도인가요?",
        question_intent: "누유 심도 및 긴급도 추정",
        answer_format: "low_high_unknown",
        sort_order: 3,
      },
      {
        code: "Q-L04",
        text: "최근 변속기 오일 보충 또는 교환 직후부터 새기 시작했나요?",
        question_intent: "드레인 플러그·체결부·레벨부 가능성 확인",
        answer_format: "yes_no_unknown",
        sort_order: 4,
      },
      {
        code: "Q-L06",
        text: "오일이 축 회전부 주변(변속기 앞·뒤 회전축 근처)에서 흩뿌려진 듯 보인다고 하나요?",
        question_intent: "입력축·출력축 오일실 가능성 확인",
        answer_format: "yes_no_unknown",
        sort_order: 5,
      },
      {
        code: "Q-L07",
        text: "변속기 하부 전체가 젖어 있어 정확한 시작 지점이 불명확한가요?",
        question_intent: "케이스/커넥터/복합 누유 가능성, 브리더 과압 누유 포함",
        answer_format: "yes_no",
        sort_order: 6,
      },
      {
        code: "Q-L08",
        text: "차량 연식이 오래됐거나(10년 이상) 장기간 ATF 무교환·미정비 이력이 있나요?",
        question_intent: "씰·가스켓 노후 열화 가중치",
        answer_format: "yes_no_unknown",
        sort_order: 7,
      },
      {
        code: "Q-L09",
        text: "변속기 옆면의 전기 커넥터·하네스 근처가 젖어 있거나, 하네스를 타고 오일이 올라온 흔적이 있나요?",
        question_intent: "관통부 커넥터 씰 누유 확인",
        answer_format: "yes_no_unknown",
        sort_order: 8,
      },
      {
        code: "Q-L10",
        text: "누유 위치가 변속기 앞쪽(엔진과의 결합부, 벨하우징) 근처인가요?",
        question_intent: "토크컨버터·프론트 펌프 씰 가능성 확인",
        answer_format: "yes_no_unknown",
        sort_order: 9,
      },
      {
        code: "Q-L11",
        text: "누유 위치가 변속기 뒤쪽(프로펠러 샤프트 연결부, 후륜·4WD 차량) 근처인가요?",
        question_intent: "테일하우징 씰 가능성 확인",
        answer_format: "yes_no_unknown",
        sort_order: 10,
      },
      {
        code: "Q-L12",
        text: "바닥 액체 색이 붉은색~적갈색으로 보이나요?",
        question_intent: "ATF 확정 여부(아니오면 타 계통 우선 검토)",
        answer_format: "yes_no_unknown",
        sort_order: 11,
      },
    ],
  },
];

export async function seedQuestions(prisma: PrismaClient) {
  const questions = questionsBySymptom.flatMap((entry) => entry.questions);

  await prisma.$transaction(
    questions.map((question) =>
      prisma.question.upsert({
        where: { code: question.code },
        update: {
          text: question.text,
          question_intent: question.question_intent,
          answer_format: question.answer_format,
          is_active: true,
        },
        create: {
          code: question.code,
          text: question.text,
          question_intent: question.question_intent,
          answer_format: question.answer_format,
        },
      }),
    ),
  );

  const symptoms = await prisma.symptom.findMany({
    where: {
      name: {
        in: questionsBySymptom.map((entry) => entry.symptomName),
      },
    },
  });

  const symptomByName = new Map(symptoms.map((symptom) => [symptom.name, symptom]));

  const seededQuestions = await prisma.question.findMany({
    where: {
      code: {
        in: questions.map((question) => question.code),
      },
    },
  });

  const questionByCode = new Map(
    seededQuestions.map((question) => [question.code, question]),
  );

  const removedQuestions =
    removedQuestionCodes.length === 0
      ? []
      : await prisma.question.findMany({
          where: {
            code: {
              in: removedQuestionCodes,
            },
          },
        });

  const removedQuestionIds = removedQuestions.map((question) => question.id);

  for (const entry of questionsBySymptom) {
    const symptom = symptomByName.get(entry.symptomName);

    if (!symptom) {
      throw new Error(`Missing symptom: ${entry.symptomName}`);
    }

    const desiredQuestionIds = entry.questions.map((question) => {
      const seededQuestion = questionByCode.get(question.code);

      if (!seededQuestion) {
        throw new Error(`Missing question: ${question.code}`);
      }

      return seededQuestion.id;
    });

    await prisma.$transaction([
      prisma.symptomQuestion.deleteMany({
        where: {
          symptom_id: symptom.id,
          OR: [
            {
              question_id: {
                in: removedQuestionIds,
              },
            },
            {
              question_id: {
                notIn: desiredQuestionIds,
              },
            },
          ],
        },
      }),
      ...entry.questions.map((question) => {
        const seededQuestion = questionByCode.get(question.code);

        if (!seededQuestion) {
          throw new Error(`Missing question: ${question.code}`);
        }

        return prisma.symptomQuestion.upsert({
          where: {
            symptom_id_question_id: {
              symptom_id: symptom.id,
              question_id: seededQuestion.id,
            },
          },
          update: {
            sort_order: question.sort_order,
          },
          create: {
            symptom_id: symptom.id,
            question_id: seededQuestion.id,
            sort_order: question.sort_order,
          },
        });
      }),
    ]);
  }

  if (removedQuestionCodes.length > 0) {
    await prisma.$transaction([
      prisma.symptomQuestion.deleteMany({
        where: {
          question_id: {
            in: removedQuestionIds,
          },
        },
      }),
      prisma.question.deleteMany({
        where: {
          code: {
            in: removedQuestionCodes,
          },
        },
      }),
    ]);
  }
}
