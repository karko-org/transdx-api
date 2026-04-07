import type { PrismaClient } from "@prisma/client";

const symptomCategories = [
  { name: "윤활 및 냉각 문제", sort_order: 1 },
  { name: "전자 제어 및 센서", sort_order: 2 },
  { name: "동력 전달 (토크 컨버터 중심)", sort_order: 3 },
  { name: "유압 제어 및 기계적 마모", sort_order: 4 },
];

export async function seedSymptomCategories(prisma: PrismaClient) {
  const existingCategories = await prisma.symptomCategory.findMany({
    where: {
      name: {
        in: symptomCategories.map((category) => category.name),
      },
    },
  });

  const existingByName = new Map(
    existingCategories.map((category) => [category.name, category]),
  );

  await prisma.$transaction(
    symptomCategories.map((category) => {
      const existing = existingByName.get(category.name);

      if (existing) {
        return prisma.symptomCategory.update({
          where: { id: existing.id },
          data: {
            sort_order: category.sort_order,
            is_active: true,
          },
        });
      }

      return prisma.symptomCategory.create({
        data: {
          name: category.name,
          sort_order: category.sort_order,
        },
      });
    }),
  );
}
