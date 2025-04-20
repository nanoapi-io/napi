import z from "zod";

export const extractSymbolPayloadSchema = z.array(
  z.object({
    filePath: z.string(),
    symbols: z.array(z.string()),
  }),
);
