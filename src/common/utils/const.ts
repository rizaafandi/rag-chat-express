import { env } from "@/common/utils/envConfig";

export const HF_TOKEN = env.HUGGINGFACE_API_KEY;
export const PDF_URI = env.PDF_URL;
export const QDRANT_URI = env.QDRANT_URL;
export const QDRANT_API_KEY = env.QDRANT_API_KEY;
export const QDRANT_COLLECTION = env.QDRANT_COLLECTION;
export const QDRANT_VECTORE_SIZE = 768; // for all-MiniLM-L6-v2
export const GEMINI_API_KEY = env.GEMINI_API_KEY;

export const HF_EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
export const LOCAL_EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
export const LOCAL_PIPELINE = "feature-extraction";
export const LLM_MODEL = "mistralai/Mistral-Small-3.1-24B-Instruct-2503";
export const TOP_K = 3;

export interface Document {
	id: string;
	text: string;
	metadata: {
		source: string;
		page?: number;
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		[key: string]: any;
	};
}

export const whitelistWebsite = [
	"https://www.ncbi.nlm.nih.gov/books/NBK554776/",
	"https://opencovidjournal.com/VOLUME/4/ELOCATOR/e26669587296962/FULLTEXT/",
];
