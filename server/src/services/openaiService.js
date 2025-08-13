// OpenAI service
export const processImageWithVision = async (imageBase64, prompt) => {
    // This function is referenced in visionController.js
    // For now, return a placeholder response
    return {
        analysis: 'Vision processing not yet implemented',
        confidence: 0
    };
};

const openaiService = {
    processImageWithVision
};

export default openaiService;
