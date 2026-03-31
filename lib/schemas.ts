import { z } from "zod";

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const communitySourcesSchema = z
  .object({
    fangCommunityUrl: z.string().url(),
    fangWeekreportUrl: z.string().url(),
  })
  .strict();

export const communitySchema = z
  .object({
    id: slugSchema,
    name: z.string().min(1),
    city: z.string().min(1),
    district: z.string().min(1),
    sources: communitySourcesSchema,
  })
  .strict();

export const communitiesSchema = z.array(communitySchema).min(1);

export const segmentTemplateSchema = z
  .object({
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

export const segmentsSchema = z.array(segmentTemplateSchema).min(1);
