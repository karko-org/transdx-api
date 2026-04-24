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
        description: "플러그 체결부, 와셔 손상 또는 과·약 체결로 인한 누유",
        sort_order: 2,
      },
      {
        code: "L-03",
        display_name: "오일쿨러 라인·호스 / 누유",
        description: "변속기-라디에이터 간 ATF 쿨러 배관·플레어·크림프 피팅부 누유",
        sort_order: 3,
      },
      {
        code: "L-04",
        display_name: "입력축·토크컨버터 프론트 펌프 씰 / 누유",
        description: "엔진-변속기 결합부 전면 씰 열화, 벨하우징 아래로 흘러내림",
        sort_order: 4,
      },
      {
        code: "L-05",
        display_name: "출력축·테일하우징 씰 / 누유",
        description: "후륜·4륜 차량 드라이브샤프트 진입부 후면 씰 열화",
        sort_order: 5,
      },
      {
        code: "L-06",
        display_name: "케이스 접합부·사이드 커버·밸브바디 커버 / 누유",
        description: "케이스 분할면, 솔레노이드·밸브바디 커버 가스켓/RTV 실런트 노후 누유",
        sort_order: 6,
      },
      {
        code: "L-07",
        display_name: "하네스 커넥터 씰(관통부) / 누유",
        description: "변속기 외부 전기 커넥터(솔레노이드·스피드센서) 관통부 O-링 손상",
        sort_order: 7,
      },
      {
        code: "L-08",
        display_name: "오버플로우·레벨 점검부·브리더(벤트) / 누유",
        description: "레벨 플러그·딥스틱 포트·브리더 체크밸브 막힘으로 인한 압력 누유",
        sort_order: 8,
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
