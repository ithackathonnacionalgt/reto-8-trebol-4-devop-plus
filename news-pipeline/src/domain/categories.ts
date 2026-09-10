export const CATEGORY_IDS = [
  "education_scholarships",
  "health_wellbeing",
  "social_programs",
  "procedures_services",
  "security_alerts",
  "employment_development",
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface Category {
  id: CategoryId;
  name: string;
}

export const CATEGORIES: readonly Category[] = [
  { id: "education_scholarships", name: "Educación y Becas" },
  { id: "health_wellbeing", name: "Salud y Prevención" },
  { id: "social_programs", name: "Apoyo Social" },
  { id: "procedures_services", name: "Trámites y Documentos" },
  { id: "security_alerts", name: "Alertas y Emergencias" },
  { id: "employment_development", name: "Empleo y Emprendimiento" },
] as const;
