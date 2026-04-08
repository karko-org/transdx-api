import type { PrismaClient } from "@prisma/client";

const failureTypesBySymptom = [
  {
    symptomName: "변속기 오일 누유",
    failureTypes: [
      {
        code: "L-01",
        display_name: "오일팬 가스켓 / 누유",
        description: "하부 팬 접합면 누유",
        sort_order: 1,
      },
      {
        code: "L-02",
        display_name: "드레인 플러그·와셔 / 누유",
        description: "플러그 체결부 누유",
        sort_order: 2,
      },
      {
        code: "L-03",
        display_name: "오일쿨러 라인·호스 / 누유",
        description: "쿨러 배관, 호스, 크림프 부위 누유",
        sort_order: 3,
      },
      {
        code: "L-04",
        display_name: "입력축/출력축 오일실 / 누유",
        description: "회전축 씰 열화로 인한 누유",
        sort_order: 4,
      },
      {
        code: "L-05",
        display_name: "케이스 접합부·사이드 커버 / 누유",
        description: "케이스 분할면, 커버 가스켓 누유",
        sort_order: 5,
      },
      {
        code: "L-06",
        display_name: "하네스 커넥터 씰 / 누유",
        description: "전기 커넥터 또는 관통부 씰 누유",
        sort_order: 6,
      },
      {
        code: "L-07",
        display_name: "오버플로우/레벨 점검부 / 누유",
        description: "레벨 플러그, 점검 포트 주변 누유",
        sort_order: 7,
      },
    ],
  },
];

export async function seedFailureTypes(prisma: PrismaClient) {
  const failureTypes = failureTypesBySymptom.flatMap((entry) => entry.failureTypes);

  await prisma.$transaction(
    failureTypes.map((failureType) =>
      prisma.failureType.upsert({
        where: { code: failureType.code },
        update: {
          display_name: failureType.display_name,
          description: failureType.description,
          sort_order: failureType.sort_order,
          is_active: true,
        },
        create: {
          code: failureType.code,
          display_name: failureType.display_name,
          description: failureType.description,
          sort_order: failureType.sort_order,
        },
      }),
    ),
  );
}
