import prisma from "../src/lib/prisma";
import { seedSymptomCategories } from "./seeds/symptomCategories";

async function main() {
  await seedSymptomCategories(prisma);
  console.log("Seeded symptom categories.");
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
