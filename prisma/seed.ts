import prisma from "../src/lib/prisma";
import { seedDiagnosisRules } from "./seeds/diagnosisRules";
import { seedFailureTypes } from "./seeds/failureTypes";
import { seedQuestions } from "./seeds/questions";
import { seedSymptomCategories } from "./seeds/symptomCategories";
import { seedSymptoms } from "./seeds/symptoms";

async function main() {
  await seedSymptomCategories(prisma);
  await seedSymptoms(prisma);
  await seedFailureTypes(prisma);
  await seedQuestions(prisma);
  await seedDiagnosisRules(prisma);
  console.log("Seeded symptom categories, symptoms, failure types, questions, and diagnosis rules.");
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
