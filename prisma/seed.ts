import prisma from "../src/lib/prisma";
import { seedAnswerOptions } from "./seeds/answerOptions";
import { seedDiagnosisEffectRules } from "./seeds/diagnosisEffectRules";
import { seedDiagnosisRules } from "./seeds/diagnosisRules";
import { seedFailureTypes } from "./seeds/failureTypes";
import { seedQuestions } from "./seeds/questions";
import { seedSymptomCategories } from "./seeds/symptomCategories";
import { seedSymptoms } from "./seeds/symptoms";
import { seedAdminUser } from "./seeds/users";

async function main() {
  await seedSymptomCategories(prisma);
  await seedSymptoms(prisma);
  await seedFailureTypes(prisma);
  await seedQuestions(prisma);
  await seedAnswerOptions(prisma);
  await seedDiagnosisRules(prisma);
  await seedDiagnosisEffectRules(prisma);
  await seedAdminUser(prisma);
  console.log(
    "Seeded symptom categories, symptoms, failure types, questions, answer options, diagnosis rules, diagnosis effect rules, and admin user.",
  );
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
