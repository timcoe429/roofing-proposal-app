// Condition evaluator for "Applies When" conditions from pricing sheet
// Evaluates conditions to determine if items should be included

export class ConditionEvaluator {
  constructor(projectVariables = {}) {
    this.vars = { ...projectVariables };
  }

  /**
   * Evaluate a condition string
   * @param {string} condition - Condition from "Applies When" column
   * @returns {boolean} - Whether condition is true
   */
  evaluate(condition) {
    if (!condition || typeof condition !== 'string') return true;
    
    const trimmed = condition.trim();
    
    // Empty condition means always applies
    if (trimmed === '') return true;
    
    // Handle manual_only special case
    if (trimmed === 'manual_only') return false; // Only if explicitly requested
    
    // Handle simple boolean variables (e.g., "ice_water" assumes true if exists and truthy)
    if (this.isSimpleVariable(trimmed)) {
      const value = this.vars[trimmed];
      return !!value; // Return true if variable exists and is truthy
    }
    
    // Handle equality: "roof_system = BRAVA_SHAKE"
    const equalityMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
    if (equalityMatch) {
      const [, varName, value] = equalityMatch;
      const varValue = this.vars[varName];
      const trimmedValue = value.trim();
      
      // Handle boolean strings
      if (trimmedValue === 'true') return !!varValue;
      if (trimmedValue === 'false') return !varValue;
      
      // Handle string/number comparison
      return String(varValue) === String(trimmedValue);
    }
    
    // Handle comparisons: "low_slope_sq > 0", "penetrations >= 3"
    const comparisonMatch = trimmed.match(/^(\w+)\s*(>=|<=|>|<)\s*(.+)$/);
    if (comparisonMatch) {
      const [, varName, operator, value] = comparisonMatch;
      const varValue = parseFloat(this.vars[varName]) || 0;
      const compareValue = parseFloat(value) || 0;
      
      switch (operator) {
        case '>':
          return varValue > compareValue;
        case '<':
          return varValue < compareValue;
        case '>=':
          return varValue >= compareValue;
        case '<=':
          return varValue <= compareValue;
        default:
          return false;
      }
    }
    
    // Handle multiple conditions with AND/OR (basic support)
    if (trimmed.includes(' AND ')) {
      const parts = trimmed.split(' AND ').map(p => p.trim());
      return parts.every(part => this.evaluate(part));
    }
    
    if (trimmed.includes(' OR ')) {
      const parts = trimmed.split(' OR ').map(p => p.trim());
      return parts.some(part => this.evaluate(part));
    }
    
    // Default: if we can't parse, assume true (include item)
    // This is safer than excluding items we don't understand
    console.warn(`Could not parse condition: ${condition}, defaulting to true`);
    return true;
  }

  /**
   * Check if condition is just a variable name
   */
  isSimpleVariable(condition) {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(condition);
  }

  /**
   * Set project variables
   */
  setVariables(variables) {
    this.vars = { ...this.vars, ...variables };
  }

  /**
   * Get current variables
   */
  getVariables() {
    return { ...this.vars };
  }
}

export default ConditionEvaluator;

