import type { PrismaClient } from "@prisma/client";

const symptomsByCategory = [
  {
    categoryName: "윤활 및 냉각 문제",
    symptoms: [
      { name: "변속기 오일 누유", sort_order: 1 },
      { name: "변속기 과열", sort_order: 2 },
      { name: "오일 상태 이상(탄 냄새/변색)", sort_order: 3 },
    ],
  },
  {
    categoryName: "전자 제어 및 센서",
    symptoms: [
      { name: "보호모드 진입(주행 제한)", sort_order: 1 },
      { name: "계기판 경고등 점등", sort_order: 2 },
      { name: "속도계 이상 또는 변속 시점 불규칙", sort_order: 3 },
    ],
  },
  {
    categoryName: "동력 전달 (토크 컨버터 중심)",
    symptoms: [
      { name: "주행 중 이음·진동(전 구간)", sort_order: 1 },
      { name: "저속·정속 구간 잔 떨림", sort_order: 2 },
      { name: "감속·정차 시 시동 꺼짐", sort_order: 3 },
    ],
  },
  {
    categoryName: "유압 제어 및 기계적 마모",
    symptoms: [
      { name: "주행 중 기어 변경 시 충격", sort_order: 1 },
      { name: "가속 시 미끄러짐(슬립)", sort_order: 2 },
      { name: "D/R 넣은 뒤 출발 지연", sort_order: 3 },
    ],
  },
];

export async function seedSymptoms(prisma: PrismaClient) {
  const categories = await prisma.symptomCategory.findMany({
    where: {
      name: {
        in: symptomsByCategory.map((entry) => entry.categoryName),
      },
    },
  });

  const categoryByName = new Map(
    categories.map((category) => [category.name, category]),
  );

  for (const entry of symptomsByCategory) {
    const category = categoryByName.get(entry.categoryName);

    if (!category) {
      throw new Error(`Missing symptom category: ${entry.categoryName}`);
    }

    const existingSymptoms = await prisma.symptom.findMany({
      where: {
        category_id: category.id,
        name: {
          in: entry.symptoms.map((symptom) => symptom.name),
        },
      },
      orderBy: { id: "asc" },
    });

    const existingByName = new Map<string, (typeof existingSymptoms)[number]>();

    for (const symptom of existingSymptoms) {
      if (!existingByName.has(symptom.name)) {
        existingByName.set(symptom.name, symptom);
      }
    }

    await prisma.$transaction(
      entry.symptoms.map((symptom) => {
        const existing = existingByName.get(symptom.name);

        if (existing) {
          return prisma.symptom.update({
            where: { id: existing.id },
            data: {
              sort_order: symptom.sort_order,
              is_active: true,
            },
          });
        }

        return prisma.symptom.create({
          data: {
            category_id: category.id,
            name: symptom.name,
            sort_order: symptom.sort_order,
          },
        });
      }),
    );
  }
}
