import { QdrantClient } from '@qdrant/js-client-rest'
import { QDRANT_API_KEY, QDRANT_COLLECTION, QDRANT_URI, QDRANT_VECTORE_SIZE } from '../const';
import { Logs } from '../logs';

let qdrantClient: QdrantClient | null = null;

export async function getQdrantClient(): Promise<QdrantClient>{
    if(!qdrantClient){
        qdrantClient = new QdrantClient({
            url: QDRANT_URI,
            apiKey: QDRANT_API_KEY
        });

        try {
            await qdrantClient.getCollection(QDRANT_COLLECTION as unknown as string);
            console.log(`Collection ${QDRANT_COLLECTION} exists`);
        }catch(er){
            console.log(`Creating ${QDRANT_COLLECTION} collection`);
            await qdrantClient.createCollection(QDRANT_COLLECTION as unknown as string, {
                vectors: {
                    size: QDRANT_VECTORE_SIZE,
                    distance: 'Cosine'
                },
                optimizers_config: {
                    default_segment_number: 2
                },
                replication_factor: 1
            })
        }
    }

    return qdrantClient;
}

export async function storeDocument(document: any, embedding: number []): Promise<void>{
    const client = await getQdrantClient();

    await client.upsert(QDRANT_COLLECTION as unknown as string, {
        wait: true,
        points: [
            {
                id: document.id || crypto.randomUUID(),
                vector: embedding,
                payload: {
                    text: document.text,
                    metadata: document.metadata,
                }
            }
        ]
    })
}

export async function retrieveRelevantDocuments(queryEmbedding: number[], limit: number = 3): Promise<any[]>{
    try {
        const client = await getQdrantClient();
        if(!client){
            throw new Error('Qdrant client is not initialized');
        }
        console.log(client)

        const searchResult = await client.search(QDRANT_COLLECTION  as unknown as string, {
            vector: queryEmbedding,
            limit: limit,
            with_payload: true,
        });
        console.log(`Found ${searchResult.length} documents for query embedding`);

        return searchResult.map(result => ({
            text: result.payload?.text,
            metadata: result.payload?.metadata,
            score: result.score,
        }))
    }catch (error) {
        console.log(error)
        Logs.push({
            level: 'error',
            message: `Error retrieve Qdrant documents: ${error}`,
            time: new Date().toISOString()
        } as never)
        throw new Error(`Error retrieve Qdrant documents: ${error}`);
    }
}