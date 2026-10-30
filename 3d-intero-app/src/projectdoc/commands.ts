import { z } from 'zod';
import { countertopSchema, itemConfigSchema, itemKindSchema, ledSchema, materialSchema, partSchema } from './schema';

const ids = z.array(z.string().min(1)).min(1);

const addItemBody = z.object({
  type: itemKindSchema,
  subtype: z.string().min(1).optional(),
  wallId: z.string().nullable(),
  parentId: z.string().nullable().optional(),
  offsetCm: z.number().optional(),
  elevationCm: z.number().optional(),
  positionCm: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
  rotationY: z.number().optional(),
  dims: z.object({ w: z.number().positive(), h: z.number().positive(), d: z.number().positive() }),
  label: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  locked: z.boolean().optional(),
  visible: z.boolean().optional(),
  colorLabel: z.string().nullable().optional(),
  parts: z.object({
    door: partSchema.optional(),
    body: partSchema.optional(),
    side: partSchema.optional(),
    toe: partSchema.optional(),
    handle: partSchema.optional(),
  }).optional(),
  config: itemConfigSchema.optional(),
  led: ledSchema.partial().optional(),
});

export const commandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('add_item'), targetIds: ids, item: addItemBody }),
  z.object({
    type: z.literal('update_item'),
    targetIds: ids,
    patch: z.object({
      label: z.string().min(1).optional(),
      tags: z.array(z.string()).optional(),
      locked: z.boolean().optional(),
      visible: z.boolean().optional(),
      colorLabel: z.string().nullable().optional(),
      rotationY: z.number().optional(),
      subtype: z.string().min(1).optional(),
      elevationCm: z.number().optional(),
      dims: z.object({
        w: z.number().positive().optional(),
        h: z.number().positive().optional(),
        d: z.number().positive().optional(),
      }).optional(),
      parts: z.object({
        door: partSchema.optional(),
        body: partSchema.optional(),
        side: partSchema.optional(),
        toe: partSchema.optional(),
        handle: partSchema.optional(),
      }).optional(),
      config: itemConfigSchema.optional(),
      led: ledSchema.partial().optional(),
    }),
  }),
  z.object({
    type: z.literal('move_item'),
    targetIds: ids,
    wallId: z.string().nullable().optional(),
    offsetCm: z.number().optional(),
    positionCm: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
  }),
  z.object({ type: z.literal('remove_item'), targetIds: ids }),
  z.object({ type: z.literal('duplicate_item'), targetIds: ids }),
  z.object({
    type: z.literal('set_global'),
    targetIds: ids,
    globals: z.object({
      tinggiTotalCm: z.number().positive().optional(),
      tinggiBaseCm: z.number().positive().optional(),
      gapBaseWallCm: z.number().nonnegative().optional(),
      kedalamanWallCm: z.number().positive().optional(),
      toeKickCm: z.number().nonnegative().optional(),
      snapGizmoCm: z.number().positive().optional(),
    }),
    countertop: countertopSchema.partial().optional(),
  }),
  z.object({
    type: z.literal('set_material'),
    targetIds: ids,
    part: z.enum(['door', 'body', 'side', 'toe', 'handle', 'countertop']).optional(),
    material: materialSchema,
  }),
  z.object({
    type: z.literal('add_wall'),
    targetIds: ids,
    wall: z.object({
      nama: z.string().min(1),
      panjangCm: z.number().positive(),
      start: z.object({ x: z.number(), z: z.number() }),
      end: z.object({ x: z.number(), z: z.number() }),
    }),
  }),
  z.object({
    type: z.literal('update_room'),
    targetIds: ids,
    room: z.object({
      bentuk: z.enum(['I', 'L', 'U', 'island', 'custom']).optional(),
      lebarCm: z.number().nonnegative().optional(),
      dalamCm: z.number().nonnegative().optional(),
      tinggiPlafonCm: z.number().positive().optional(),
    }),
  }),
  z.object({
    type: z.literal('group_items'),
    targetIds: ids,
    parentId: z.string().nullable(),
  }),
  z.object({
    type: z.literal('apply_template'),
    targetIds: ids,
    templateId: z.string().min(1),
    wallId: z.string().nullable(),
    offsetCm: z.number(),
  }),
]);

export type Command = z.infer<typeof commandSchema>;

export function commandErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join('.') : 'akar';
    return `Perintah tidak valid (${path}): ${issue.message}`;
  });
}
