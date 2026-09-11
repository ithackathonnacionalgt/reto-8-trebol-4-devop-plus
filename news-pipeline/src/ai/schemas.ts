import { z } from "zod";

import { AIError } from "../errors/AIError.js";
import { categoryIdSchema, localizedNewsContentSchema } from "../validation/newsSchemas.js";

const aiProcessedNewsSchema = z
  .object({
    categoryId: categoryIdSchema,
    tags: z.array(z.string().trim().min(1)),
    urgent: z.boolean(),
    content: z.object({
      es: localizedNewsContentSchema,
      quc: localizedNewsContentSchema,
    }),
  })
  .strict();

export const irrelevantNewsResultSchema = z
  .object({
    relevant: z.literal(false),
    reason: z.string().trim().min(1).optional(),
  })
  .strict();

export const relevantNewsResultSchema = z
  .object({
    relevant: z.literal(true),
    data: aiProcessedNewsSchema,
  })
  .strict();

export const processedNewsResultSchema = z.discriminatedUnion("relevant", [
  irrelevantNewsResultSchema,
  relevantNewsResultSchema,
]);

export type AIProcessedNews = z.infer<typeof aiProcessedNewsSchema>;
export type ProcessedNewsResult = z.infer<typeof processedNewsResultSchema>;

export function parseProcessedNewsResult(value: unknown): ProcessedNewsResult {
  const parsedValue = typeof value === "string" ? parseJson(value) : value;
  const result = processedNewsResultSchema.safeParse(parsedValue);

  if (!result.success) {
    throw new AIError("La respuesta de IA no cumple el contrato esperado", {
      cause: result.error,
    });
  }

  return result.data;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch (error) {
    throw new AIError("La respuesta de IA no contiene JSON válido", { cause: error });
  }
}
