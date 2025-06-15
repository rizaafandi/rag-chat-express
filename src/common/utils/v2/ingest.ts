import * as fs from "node:fs";
import * as path from "node:path";
import PdfParse from "pdf-parse";
import type { Document } from "../const";
import { Logs } from "../logs";
import { storeDocument } from "./config";
import { geminiEmbedding, localEmbedding } from "./embedding";
import { local as LocalSplitter } from "./splitter";

async function loadPdf(filePath: string): Promise<Document[]> {
	console.log(`Loading PDF: ${filePath}`);

	// const loader = new LlamaParseReader;
	// const docs = await loader.loadData(filePath);
	// console.log(`Loaded ${docs.length} documents from PDF`);

	// return docs;
	try {
		const buffer = fs.readFileSync(filePath);
		const data = await PdfParse(buffer);

		const fullDocs: Document = {
			id: crypto.randomUUID(),
			text: data.text,
			metadata: {
				source: path.basename(filePath),
				page: data.numpages,
				title: path.basename(filePath, ".pdf"),
			},
		};

		return [fullDocs];
	} catch (error) {
		Logs.push({
			level: "error",
			message: `Error loading PDFs: ${error}`,
			time: new Date().toISOString(),
		} as never);
		console.log(`Error loading PDF: ${error}`);
		return [];
	}
}

async function processDocuments(documents: Document[]): Promise<Document[]> {
	console.log(`Processing ${documents.length} documents...`);
	const result: Document[] = await LocalSplitter(documents);

	console.log(`Split into ${result.length} chunks.`);
	return result;
}

export async function ingestPDFs(dir: string): Promise<void> {
	try {
		const files = fs
			.readdirSync(dir)
			.filter((file) => file.endsWith(".pdf"))
			.map((file) => path.join(dir, file));

		if (files.length === 0) {
			console.log("No PDF files found in the directory.");
			return;
		}

		let allDocuments: Document[] = [];
		for (const file of files) {
			const doc = await loadPdf(file);
			allDocuments = allDocuments.concat(doc);
		}

		const processedDocs = await processDocuments(allDocuments);
		console.log(`Processed ${processedDocs.length} chunks from ${allDocuments.length} documents.`);

		for (const doc of processedDocs) {
			const embedding = await geminiEmbedding(doc.text);
			await storeDocument(doc, embedding as number[]);
		}

		console.info("Document ingestion complete!");
	} catch (error) {
		Logs.push({
			level: "error",
			message: `Error ingesting PDFs: ${error}`,
			time: new Date().toISOString(),
		} as never);
		throw new Error(`Error ingesting PDFs: ${error}`);
	}
}
