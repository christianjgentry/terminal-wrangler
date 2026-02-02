import { z } from 'zod'

const healthCheckSchema = z.object({
  command: z.string(),
  interval: z.number().positive().default(5000),
  retries: z.number().positive().default(3),
  startDelay: z.number().nonnegative().optional()
})

const serviceSchema = z.object({
  name: z.string().optional(),
  command: z.string(),
  workingDirectory: z.string().default('.'),
  dependsOn: z.array(z.string()).default([]),
  docs: z.string().optional(),
  healthCheck: healthCheckSchema.optional(),
  env: z.record(z.string()).optional(),
  tags: z.array(z.string()).default([])
})

export const configSchema = z.object({
  project: z.object({
    name: z.string(),
    description: z.string().optional()
  }),
  services: z.record(serviceSchema)
})

export type RawConfig = z.infer<typeof configSchema>
