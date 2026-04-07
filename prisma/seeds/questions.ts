import type { PrismaClient } from "@prisma/client";

const questionsBySymptom = [
  {
    symptomName: "변속기 오일 누유",
    questions: [
      {
        code: "Q-L01",
        text: "오일 자국이 차량 정중앙 하부에 주로 맺히나요?",
        question_intent: "팬/하부 접합부 가능성 확인",
      },
      {
        code: "Q-L02",
        text: "오일이 차량 전면 쪽 라인 또는 라디에이터 근처에서 보이나요?",
        question_intent: "쿨러 라인 누유 판별",
      },
      {
        code: "Q-L03a",
        text: "누유가 소량 (한 방울씩 맺히는 수준)인가요?",
        question_intent: "누유 심도 추정",
      },
      {
        code: "Q-L03b",
        text: "누유가 다량 (바닥에 번질 정도)인가요?",
        question_intent: "누유 심도 추정",
      },
      {
        code: "Q-L04",
        text: "최근 변속기 오일 보충 또는 교환 직후부터 새기 시작했나요?",
        question_intent: "플러그/체결부/레벨부 가능성 확인",
      },
      {
        code: "Q-L05",
        text: "누유와 함께 변속 지연·슬립·과열 증상이 있나요?",
        question_intent: "누유 심화 여부 및 우선순위 조정",
      },
      {
        code: "Q-L06",
        text: "오일이 축 회전부 주변에서 흩뿌려진 듯 보인다고 하나요?",
        question_intent: "입력축/출력축 오일실 가능성 확인",
      },
      {
        code: "Q-L07",
        text: "변속기 하부 전체가 젖어 있어 정확한 시작 지점이 불명확한가요?",
        question_intent: "케이스/커넥터/복합 누유 가능성",
      },
      {
        code: "Q-L08",
        text: "차량 연식이 오래됐거나 장기간 미정비 이력이 있나요?",
        question_intent: "씰·가스켓 열화 가중치",
      },
      {
        code: "Q-L09",
        text: "하네스 커넥터 또는 전기 연결부 근처가 젖어 있다고 정비 이력이 있나요?",
        question_intent: "커넥터 씰 후보 보강",
      },
      {
        code: "Q-L10",
        text: "바닥 액체 색이 붉은색~적갈색으로 보이나요?",
        question_intent: "ATF 가능성 확인",
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
          is_active: true,
        },
        create: {
          code: question.code,
          text: question.text,
          question_intent: question.question_intent,
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

  for (const entry of questionsBySymptom) {
    const symptom = symptomByName.get(entry.symptomName);

    if (!symptom) {
      throw new Error(`Missing symptom: ${entry.symptomName}`);
    }

    await prisma.$transaction(
      entry.questions.map((question) => {
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
          update: {},
          create: {
            symptom_id: symptom.id,
            question_id: seededQuestion.id,
          },
        });
      }),
    );
  }
}
