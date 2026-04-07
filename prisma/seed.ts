import prisma from "../src/lib/prisma";
import { seedSymptomCategories } from "./seeds/symptomCategories";
import { seedSymptoms } from "./seeds/symptoms";

async function main() {
  await seedSymptomCategories(prisma);
  await seedSymptoms(prisma);
  console.log("Seeded symptom categories and symptoms.");
}

main()
  .catch((error) => {
    console.error("Seeding failed.");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
