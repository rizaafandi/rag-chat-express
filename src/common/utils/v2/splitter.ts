import { Language, SentenceSplitter } from "@chax-at/simple-sentence-splitter";
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { AutoTokenizer } from "@xenova/transformers";
import { Document } from "../const";
import { Logs } from "../logs";

export async function langchain(documents: Document[]) {
    try {
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 200,
            chunkOverlap: 20,
            separators: ["\n\n", "\n", ". ", " ", ""],
        });
        const document = await splitter.createDocuments(documents.map(doc => doc.text));
        const result: Document[] = document.map((doc, i) => ({
            id: crypto.randomUUID(),
            text: doc.pageContent,
            metadata: {
                ...documents[i].metadata,
                chunk_id: i,
                parent_id: documents[i].id
            }
        }));
        return result;
    } catch (error) {
        Logs.push({
            level: 'error',
            message: `Error splitting with langchain: ${error}`,
            time: new Date().toISOString()
        } as never);
        throw new Error(`Error splitting with langchain: ${error}`);
    }
}

export async function local(documents: Document[]) {
    try {
        const result: Document[] = [];
    
        for (const doc of documents) {
            const splitter = new SentenceSplitter(doc.text, Language.EN);
            const chunks = await splitter.process();
    
            chunks.forEach((text, i) => {
                result.push({
                    id: crypto.randomUUID(),
                    text: text,
                    metadata: {
                        ...doc.metadata,
                        chunk_id: i,
                        parent_id: doc.id
                    }
                });
            });
        }
        return result;
    } catch (error) {
        Logs.push({
            level: 'error',
            message: `Error splitting locally: ${error}`,
            time: new Date().toISOString()
        } as never);
        throw new Error(`Error splitting locally: ${error}`);
    }
}