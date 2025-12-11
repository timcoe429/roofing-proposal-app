// AI Service Configurations - Updated for production
export const openaiConfig = {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4-vision-preview',
    maxTokens: 4096,
    temperature: 0.2
};

export const claudeConfig = {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4-5-20250929',
    maxTokens: 4096,
    temperature: 0.7
};

export const aiConfig = {
    openai: openaiConfig,
    claude: claudeConfig,
    defaultVisionModel: 'gpt-4-vision-preview',
    defaultChatModel: 'claude-sonnet-4-5-20250929'
};
