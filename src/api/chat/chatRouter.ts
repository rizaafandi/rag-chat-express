import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Request, type Response, type Router } from "express";
import { z } from "zod";

import { join } from "node:path";
import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { Logs } from "@/common/utils/logs";
import { ingestPDFs } from "@/common/utils/v2/ingest";
import { Model } from "@/common/utils/v2/model";
import { formatDocumentAsContext, retrieveDocument } from "@/common/utils/v2/retriever";
import { ChatSchema, GetChatSchema } from "./chatModels";

export const chatRegistry = new OpenAPIRegistry();
export const chatRouter: Router = express.Router();

chatRegistry.registerPath({
	method: "get",
	path: "/api/chat/ingest",
	description: "Ingest PDFs from the assets directory",
	tags: ["Chatbot"],
	responses: createApiResponse(z.null(), "Success"),
});

chatRouter.get("/ingest", async (_req: Request, res: Response) => {
	try {
		const pdfDirectory = join(process.cwd(), "src/assets/pdfs/new");
		console.log(`PDF Directory: ${pdfDirectory}`);
		await ingestPDFs(pdfDirectory).catch(console.error);

		const serviceResponse = ServiceResponse.success("Success ingesting PDFs", null, 200);

		res.status(serviceResponse.statusCode).send(serviceResponse);
	} catch (error) {
		const serviceResponse = ServiceResponse.success(
			error as string,
			{
				data: null,
				logs: Logs,
			},
			500,
		);
		res.status(serviceResponse.statusCode).send(serviceResponse);
	}
});

chatRegistry.registerPath({
	method: "post",
	path: "/api/chat/query",
	tags: ["Chatbot"],
	description: "Query the chatbot with a question and get a response",
	request: {
		body: {
			content: {
				"application/json": {
					schema: GetChatSchema,
				},
			},
		},
	},
	responses: createApiResponse(ChatSchema, "Success"),
});

chatRouter.post("/query", async (_req: Request, res: Response) => {
	try {
		const { query, responseType } = _req.body;
		const documents = await retrieveDocument(query);
		const context = formatDocumentAsContext(documents);

		const response = await Model.gemini()
			.completion(query, context, responseType)
			.catch((er) => {
				throw new Error(`Error in completion: ${er}`);
			});

		const sources = documents.map((doc) => ({
			text: `${doc.text.substring(0, 150)}...`,
			source: doc.metadata?.source || "Unknown source",
			page: doc.metadata?.page,
		}));

		const serviceResponse = ServiceResponse.success(
			"Response",
			{
				data: {
					message: response,
					source: sources,
				},
			},
			200,
		);

		res.status(serviceResponse.statusCode).send(serviceResponse);
	} catch (error) {
		const serviceResponse = ServiceResponse.failure(
			error as string,
			{
				data: null,
				logs: Logs,
			},
			500,
		);
		res.status(serviceResponse.statusCode).send(serviceResponse);
	}
});
