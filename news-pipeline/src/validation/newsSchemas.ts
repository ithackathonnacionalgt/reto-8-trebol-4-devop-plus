import { z } from "zod";

import { CATEGORIES, CATEGORY_IDS } from "../domain/categories.js";

const nonEmptyText = z.string().trim().min(1);
const isoDateTimeSchema = z.string().datetime({ offset: true });

export const categoryIdSchema = z.enum(CATEGORY_IDS);

export const categorySchema = z.object({
  id: categoryIdSchema,
  name: nonEmptyText,
});

export const localizedNewsContentSchema = z.object({
  title: nonEmptyText,
  summary: nonEmptyText,
  citizenAction: nonEmptyText,
});

export const newsItemSchema = z.object({
  id: nonEmptyText,
  originalUrl: z.string().url(),
  imageUrl: z.string().url().optional(),
  source: nonEmptyText,
  sourceType: nonEmptyText,
  categoryId: categoryIdSchema,
  tags: z.array(nonEmptyText),
  publishedAt: isoDateTimeSchema.nullable(),
  extractedAt: isoDateTimeSchema,
  urgent: z.boolean(),
  content: z.object({
    es: localizedNewsContentSchema,
    quc: localizedNewsContentSchema,
  }),
});

const hasExpectedCategories = (categories: ReadonlyArray<{ id: string; name: string }>): boolean =>
  categories.length === CATEGORIES.length &&
  categories.every(
    (category, index) =>
      category.id === CATEGORIES[index]?.id && category.name === CATEGORIES[index]?.name,
  );

export const newsFileSchema = z
  .object({
    lastUpdatedAt: isoDateTimeSchema,
    totalNews: z.number().int().nonnegative(),
    availableCategories: z.array(categorySchema),
    news: z.array(newsItemSchema),
  })
  .superRefine((newsFile, context) => {
    if (newsFile.totalNews !== newsFile.news.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "totalNews debe coincidir con la cantidad de noticias",
        path: ["totalNews"],
      });
    }

    if (!hasExpectedCategories(newsFile.availableCategories)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "availableCategories debe contener la taxonomía cerrada en el orden definido",
        path: ["availableCategories"],
      });
    }

    const ids = new Set<string>();
    for (const [index, newsItem] of newsFile.news.entries()) {
      if (ids.has(newsItem.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cada noticia debe tener un id único",
          path: ["news", index, "id"],
        });
      }
      ids.add(newsItem.id);
    }
  });
