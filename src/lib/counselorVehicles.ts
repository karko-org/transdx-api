import prisma from "./prisma";

function normalizePlateNumber(raw: string): string {
  // trim + 공백 전부 제거 (한글 보존). counselorCases.ts와 동일 로직.
  return raw.replace(/\s+/g, "");
}

export async function lookupVehicleByPlate(plateNumber: string) {
  const normalized = normalizePlateNumber(plateNumber);
  return prisma.vehicle.findUnique({
    where: { plate_number: normalized },
  });
}

type VehicleRecord = NonNullable<
  Awaited<ReturnType<typeof lookupVehicleByPlate>>
>;

export function serializeVehicle(vehicle: VehicleRecord) {
  return {
    id: vehicle.id,
    plate_number: vehicle.plate_number,
    customer_name: vehicle.customer_name,
    customer_phone: vehicle.customer_phone,
    created_at: vehicle.created_at.toISOString(),
    updated_at: vehicle.updated_at.toISOString(),
  };
}
