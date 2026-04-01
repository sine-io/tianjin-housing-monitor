import { z } from "zod";

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

function withUniqueIds<T extends { id: string }>(
  schema: z.ZodArray<z.ZodType<T>>,
  entityName: string,
) {
  return schema.superRefine((items, context) => {
    const seenIds = new Map<string, number>();

    items.forEach((item, index) => {
      if (!seenIds.has(item.id)) {
        seenIds.set(item.id, index);
        return;
      }

      context.addIssue({
        code: "custom",
        message: `Duplicate ${entityName} id: ${item.id}`,
        path: [index, "id"],
      });
    });
  });
}

export const communitySourcesSchema = z
  .object({
    fangCommunityUrl: z.string().url().nullable(),
    fangWeekreportUrl: z.string().url().nullable(),
  })
  .strict();

export const communityStatusSchema = z.enum(["active", "pending_verification"]);

export const communitySchema = z
  .object({
    id: slugSchema,
    name: z.string().min(1),
    city: z.string().min(1),
    district: z.string().min(1),
    status: communityStatusSchema,
    sources: communitySourcesSchema,
  })
  .strict()
  .superRefine((community, context) => {
    if (community.status !== "active") {
      return;
    }

    if (community.sources.fangCommunityUrl === null) {
      context.addIssue({
        code: "custom",
        message:
          "Active communities must define a non-null fangCommunityUrl",
        path: ["sources", "fangCommunityUrl"],
      });
    }

    if (community.sources.fangWeekreportUrl === null) {
      context.addIssue({
        code: "custom",
        message:
          "Active communities must define a non-null fangWeekreportUrl",
        path: ["sources", "fangWeekreportUrl"],
      });
    }
  });

export const communitiesSchema = withUniqueIds(
  z.array(communitySchema).min(1),
  "community",
);

export const segmentTemplateSchema = z
  .object({
    communityId: slugSchema,
    id: slugSchema,
    label: z.string().min(1),
    rooms: z.number().int().positive(),
    areaMin: z.number().positive(),
    areaMax: z.number().positive(),
  })
  .strict()
  .refine((segment) => segment.areaMin <= segment.areaMax, {
    message: "areaMin must be less than or equal to areaMax",
  });

export const segmentsSchema = withUniqueIds(
  z.array(segmentTemplateSchema).min(1),
  "segment",
);
