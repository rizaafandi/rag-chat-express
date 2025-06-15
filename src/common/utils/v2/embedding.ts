import { type FeatureExtractionOutput, HfInference } from '@huggingface/inference'
import { GEMINI_API_KEY, HF_EMBEDDING_MODEL, HF_TOKEN, LLM_MODEL, LOCAL_EMBEDDING_MODEL, LOCAL_PIPELINE } from '../const'
import { type FeatureExtractionPipeline, pipeline } from '@xenova/transformers'
import { Completion, CreateMLCEngine, MLCEngine } from '@mlc-ai/web-llm'
import { Logs } from '../logs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ZodNull } from 'zod';

const hf = new HfInference(HF_TOKEN);
const gemini = new GoogleGenerativeAI(GEMINI_API_KEY as unknown as string);
export async function localEmbedding(text: string): Promise<number[]>{
    try {
        let embeddingPipeline: FeatureExtractionPipeline | number | null = null;
        if(!embeddingPipeline){
            embeddingPipeline = await pipeline(LOCAL_PIPELINE, LOCAL_EMBEDDING_MODEL)
        }

        const response = await embeddingPipeline(text, {
            pooling: 'mean',
            normalize: true,
        });
        
        return Array.from(response.data)
    }catch(error){
        Logs.push({
            level: 'error',
            message: `Error initializing local embedding pipeline: ${error}`,
            time: new Date().toISOString()
        } as never);
        throw new Error(`Error initializing local embedding pipeline: ${error}`);
    }
}


export async function hfEmbedding(text: string): Promise<FeatureExtractionOutput>{
    try {
        const response = await hf.featureExtraction({
            model: HF_EMBEDDING_MODEL,
            inputs: text,
        });
        console.log('Success with external embedding:', response);

        return Array.isArray(response)? response: [];
    }catch (error) {
        Logs.push({
            level: 'error',
            message: `Error initializing Hugging Face embedding: ${error}`,
            time: new Date().toISOString()
        } as never);
        throw new Error(`Error initializing Hugging Face embedding: ${error}`);
    }
}

export async function geminiEmbedding(text: string): Promise<number[]>{
    try {
        const model = await gemini.getGenerativeModel({
            model: 'embedding-001'
        });
        const result = await model.embedContent(text);
        return result.embedding.values;

    }catch(error){
        Logs.push({
            level: 'error',
            message: `Error initializing Gemini embedding: ${error}`,
            time: new Date().toISOString()
        } as never);
        throw new Error(`Error initializing Gemini embedding: ${error}`);
    }
}