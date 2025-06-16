import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export type Chat = z.infer<typeof ChatSchema>;
export const ChatSchema = z.object({
	query: z.string(),
	responseType: z.string(),
});

export const GetChatSchema = z.object({
	query: z.string().min(1, "Query cannot be empty"),
	responseType: z.string().min(1, "Response Type cannot be empty"),
});
