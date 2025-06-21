import { GoogleGenerativeAI } from "@google/generative-ai";
import { HfInference } from "@huggingface/inference";
import { type Completion, CreateMLCEngine, type MLCEngine } from "@mlc-ai/web-llm";
import { GEMINI_API_KEY, HF_TOKEN, LLM_MODEL, whitelistWebsite } from "../const";
import { Logs } from "../logs";

const hf = new HfInference(HF_TOKEN);
const gemini = new GoogleGenerativeAI(GEMINI_API_KEY as unknown as string);

export const Model = {
	local() {
		const initProgressCallback = (progress: unknown) => {
			console.log("Model loading progress:", progress);
		};

		let instance: MLCEngine | null = null;
		const modelName: string = "TinyLlama-1.1B-Chat-v0.4-q4f32_1-MLC-1k";

		async function initialize(): Promise<MLCEngine | null> {
			if (instance === null) {
				console.log("Initializing local LLM...");
				try {
					const engine = await CreateMLCEngine(modelName, { initProgressCallback });
					await engine.reload(modelName, {}); // Ensure reload is awaited
					instance = engine;
					console.log("Local LLM initialized successfully.");
					return instance;
				} catch (error) {
					console.error("Failed to initialize local LLM:", error);
					Logs.push({
						level: "error",
						message: `Failed to initialize local LLM: ${error}`,
						time: new Date().toISOString(),
					} as never);
					throw error;
				}
			}
			return instance;
		}

		async function generate(llm: MLCEngine, prompt: string, context: string): Promise<string | Completion> {
			if (!llm) {
				console.error("LLM engine not provided or not initialized for generation.");
				return "I apologize, but the Language Model is not available.";
			}

			const fullPrompt = `
            <s>[INST] You are a helpful assistant that answers questions based only on the provided context.

            Context: ${context}

            Question:  ${prompt}

            Please answer the question based solely on the provided context.
            If the context doesn't contain the information needed to answer the question, simply state that you don't have enough information. [/INST]</s>`;

			try {
				const response = await llm.completions.create({
					prompt: fullPrompt,
					temperature: 0.7,
					max_tokens: 1024,
				});
				return response;
			} catch (error) {
				console.error("Error generating text with local LLM:", error);
				Logs.push({
					level: "error",
					message: `Error generating text with local LLM: ${error}`,
					time: new Date().toISOString(),
				} as never);
				return "I apologize, but I encountered an error generating a response.";
			}
		}

		async function completion(prompt: string, context: string): Promise<string | Completion> {
			try {
				const currentLlm = await initialize();
				return generate(currentLlm as unknown as MLCEngine, prompt, context);
			} catch (error) {
				Logs.push({
					level: "error",
					message: `Error in local completion: ${error}`,
					time: new Date().toISOString(),
				} as never);
				throw new Error(`Error in local completion: ${error}`);
			}
		}

		return {
			initialize,
			completion,
		};
	},
	hf() {
		async function completion(prompt: string, context: string): Promise<string> {
			let result = "";
			for (let i = 0; i < 3; i++) {
				try {
					const fullPrompt = `
                    <s>[INST] You are a helpful assistant that answers questions based only on the provided context.

                    Context: ${context}

                    Question:  ${prompt}

                    Please answer the question based solely on the provided context.
                    If the context doesn't contain the information needed to answer the question, simply state that you don't have enough information. [/INST]</s>`;

					const response = await hf.textGeneration({
						model: LLM_MODEL,
						inputs: "Hello",
						parameters: {
							max_new_tokens: 200,
							temperature: 0.1,
							top_p: 0.95,
							repetition_penalty: 1.15,
						},
					});

					result = response.generated_text;
				} catch (e) {
					if (i === 2) {
						Logs.push({
							level: "error",
							message: `Error getCompletion: ${e} after ${i} attempts`,
							time: new Date().toISOString(),
						} as never);
						throw new Error(`Error in getCompletion: ${e}`);
					}
					console.error(`Attempt ${i + 1} failed: ${e}`);

					await new Promise((resolve) => setTimeout(resolve, 2 ** i * 1000)); // exponential backoff
				}
			}

			return result;
		}

		return {
			completion,
		};
	},
	gemini() {
		async function completion(prompt: string, context: string, responseType: string): Promise<string> {
			try {
				const fullPrompt = `
                <s>[INST] You are a helpful healtcare assistant with given context and question:

                Context: ${context}

                Question:  ${prompt}

				Following are the instructions for your response:
                1. Please answer the question based solely on the provided context.
                2. If the context doesn't contain the information needed to answer the question, please use ${whitelistWebsite.join(", ")} as source of informations. 
				3. If two above conditions are not met, please try to answer from other websites if possible.
				4. If you are not able to answer, please say that you don't have enough information.
				5. If the question is about a medical condition, please provide a detailed explanation.
				
				
				
				
                And write a response as a ${responseType} text with fully heading formatted.
				[/INST]</s>`;

				const model = gemini.getGenerativeModel({
					model: "gemini-2.5-flash-preview-04-17",
					generationConfig: {
						temperature: 0.7,
						maxOutputTokens: 5024,
					},
				});

				const result = await model.generateContent(fullPrompt);
				const response = result.response.text();

				return response;
			} catch (error) {
				Logs.push({
					level: "error",
					message: `Error in gemini completion: ${error}`,
					time: new Date().toISOString(),
				} as never);
				throw new Error(`Error in gemini completion: ${error}`);
			}
		}

		return {
			completion,
		};
	},
};
