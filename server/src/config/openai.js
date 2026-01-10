// AI Service Configurations - Claude only
export const claudeConfig = {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4-5-20250929',
    maxTokens: 2048, // Reduced for faster responses
    temperature: 0.7,
    timeout: 60000 // 60 second timeout
};

export const aiConfig = {
    claude: claudeConfig,
    defaultChatModel: 'claude-sonnet-4-5-20250929'
};
