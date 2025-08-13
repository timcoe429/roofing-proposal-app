// OpenAI configuration
const openaiConfig = {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4-vision-preview',
    maxTokens: 4096,
    temperature: 0.2
};

export default openaiConfig;
