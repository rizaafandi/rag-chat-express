import { geminiEmbedding, hfEmbedding } from './embedding';
import { retrieveRelevantDocuments as retrieve } from './config';
import { Document, TOP_K } from '../const';
import { Logs } from '../logs';

export async function retrieveDocument(query: string): Promise<Document[]> {
    try {
        const embedding = await geminiEmbedding(query);
        console.log(embedding)

        const result = await retrieve(embedding as number[], TOP_K);
        console.log(`Retrieved ${result.length} documents for query: ${query}`);

        return result.map(res => ({
            id: res.id || crypto.randomUUID(),
            text: res.text,
            metadata: res.metadata
        }))
    }catch(error){
        Logs.push({
            level: 'error',
            message: `Error retrieving documents from Embedding: ${error}`,
            time: new Date().toISOString()
        } as never);
        throw new Error(`Error retrieving documents from Embedding: ${error}`);
    }
}

export function formatDocumentAsContext(docs: Document[]): string {
    return docs.map((doc, id) => {
        const source = doc.metadata?.source || 'Unknown source';
        const page = doc.metadata?.page || 'Unknown page';
        
        return `[Document ${id + 1}] From: ${source}, Page: ${page}\n${doc.text}\n`;
    }).join('\n---\n\n');
}