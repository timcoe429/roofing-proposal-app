/**
 * Check for missing required and recommended fields in proposal data
 * and generate natural language questions for the AI to ask
 */

/**
 * Check required fields - these must be present before generating a quote
 */
export const checkRequiredFields = (proposalData) => {
  const missing = [];

  // Client information
  if (!proposalData.clientName || proposalData.clientName.trim() === '') {
    missing.push({
      field: 'clientName',
      category: 'client',
      question: "What's the client's name?",
      priority: 'required'
    });
  }

  // Property address (at least city/state needed for location context)
  if (!proposalData.propertyAddress || proposalData.propertyAddress.trim() === '') {
    missing.push({
      field: 'propertyAddress',
      category: 'property',
      question: "What's the property address?",
      priority: 'required'
    });
  }

  // At least some measurement data needed
  const hasMeasurements = proposalData.measurements && (
    proposalData.measurements.totalSquares > 0 ||
    proposalData.measurements.roofArea > 0 ||
    (proposalData.materials && proposalData.materials.length > 0)
  );

  if (!hasMeasurements) {
    missing.push({
      field: 'measurements',
      category: 'measurements',
      question: "I need the roof measurements. Do you have the square footage, number of squares, or can I analyze photos?",
      priority: 'required'
    });
  }

  return missing;
};

/**
 * Check recommended fields - these improve quote accuracy but aren't strictly required
 */
export const checkRecommendedFields = (proposalData) => {
  const missing = [];

  // Client contact info
  if (!proposalData.clientEmail || proposalData.clientEmail.trim() === '') {
    missing.push({
      field: 'clientEmail',
      category: 'client',
      question: "What's the client's email address? (optional but recommended)",
      priority: 'recommended'
    });
  }

  if (!proposalData.clientPhone || proposalData.clientPhone.trim() === '') {
    missing.push({
      field: 'clientPhone',
      category: 'client',
      question: "What's the client's phone number? (optional but recommended)",
      priority: 'recommended'
    });
  }

  // Project details
  if (!proposalData.projectType || proposalData.projectType.trim() === '') {
    missing.push({
      field: 'projectType',
      category: 'project',
      question: "What type of project is this? (replacement, repair, new construction, etc.)",
      priority: 'recommended'
    });
  }

  if (!proposalData.materialType || proposalData.materialType.trim() === '') {
    missing.push({
      field: 'materialType',
      category: 'project',
      question: "What material are you planning to use? (asphalt shingles, metal, tile, etc.)",
      priority: 'recommended'
    });
  }

  // Measurement details
  const measurements = proposalData.measurements || {};
  
  if (!measurements.pitch || measurements.pitch.trim() === '') {
    missing.push({
      field: 'pitch',
      category: 'measurements',
      question: "What's the roof pitch? (e.g., 6/12, 8/12)",
      priority: 'recommended'
    });
  }

  if (!measurements.layers && measurements.layers !== 0) {
    missing.push({
      field: 'layers',
      category: 'measurements',
      question: "How many layers of existing roofing need to be removed? (1, 2, or more)",
      priority: 'recommended'
    });
  }

  return missing;
};

/**
 * Generate natural language questions from missing fields
 * @param {Array} missingFields - Array of missing field objects
 * @returns {String} - Natural language questions
 */
export const generateQuestions = (missingFields) => {
  if (missingFields.length === 0) {
    return null;
  }

  const required = missingFields.filter(f => f.priority === 'required');
  const recommended = missingFields.filter(f => f.priority === 'recommended');

  let questions = [];

  if (required.length > 0) {
    questions.push("I need a few details before I can generate a complete quote:");
    required.forEach(field => {
      questions.push(`• ${field.question}`);
    });
  }

  if (recommended.length > 0 && required.length === 0) {
    questions.push("To make this quote more accurate, could you provide:");
    recommended.forEach(field => {
      questions.push(`• ${field.question}`);
    });
  } else if (recommended.length > 0) {
    questions.push("\nAdditionally, these details would help:");
    recommended.forEach(field => {
      questions.push(`• ${field.question}`);
    });
  }

  return questions.join('\n');
};

/**
 * Check if proposal has enough info to generate a quote
 * @param {Object} proposalData - Proposal data
 * @returns {Object} - Check result with canGenerate, missing, and questions
 */
export const checkProposalCompleteness = (proposalData) => {
  const requiredMissing = checkRequiredFields(proposalData);
  const recommendedMissing = checkRecommendedFields(proposalData);
  const allMissing = [...requiredMissing, ...recommendedMissing];

  const canGenerate = requiredMissing.length === 0;
  const questions = generateQuestions(allMissing);

  return {
    canGenerate,
    hasRequiredInfo: requiredMissing.length === 0,
    hasRecommendedInfo: recommendedMissing.length === 0,
    missingRequired: requiredMissing,
    missingRecommended: recommendedMissing,
    allMissing: allMissing,
    questions: questions
  };
};

export default {
  checkRequiredFields,
  checkRecommendedFields,
  generateQuestions,
  checkProposalCompleteness
};

