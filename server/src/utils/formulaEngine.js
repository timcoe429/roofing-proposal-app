// Custom formula engine for evaluating pricing sheet formulas
// Safely evaluates formulas with project variables

export class FormulaEngine {
  constructor(projectVariables = {}) {
    this.vars = { ...projectVariables };
  }

  /**
   * Evaluate a formula string with project variables
   * @param {string} formula - Formula from Qty Formula column (e.g., "roof_sqft/14.3")
   * @returns {number} - Calculated quantity
   */
  evaluate(formula) {
    if (!formula || typeof formula !== 'string') return 0;
    
    const trimmed = formula.trim();
    
    // Handle empty formula
    if (trimmed === '') return 0;
    
    // Handle constants
    if (trimmed === '0') return 0;
    if (trimmed === '1') return 1;
    
    // Handle simple variable references (just a variable name)
    if (this.isSimpleVariable(trimmed)) {
      return this.getVariable(trimmed) || 0;
    }
    
    // Parse and evaluate expression
    return this.parseExpression(trimmed);
  }

  /**
   * Check if formula is just a variable name
   */
  isSimpleVariable(formula) {
    // Match valid variable names: letters, numbers, underscores, starting with letter/underscore
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(formula);
  }

  /**
   * Get variable value from project context
   */
  getVariable(name) {
    const value = this.vars[name];
    if (value === undefined || value === null) return 0;
    return parseFloat(value) || 0;
  }

  /**
   * Parse mathematical expression
   * Handles: numbers, variables, operators (+, -, *, /), parentheses, functions
   */
  parseExpression(formula) {
    try {
      // Replace variables with their values
      let expression = formula;
      
      // Replace variable names with their values
      // Use word boundaries to avoid partial matches
      Object.keys(this.vars).forEach(varName => {
        const regex = new RegExp(`\\b${varName}\\b`, 'g');
        const value = this.getVariable(varName);
        expression = expression.replace(regex, value);
      });
      
      // Replace function calls (ceil, floor, round)
      expression = this.replaceFunctions(expression);
      
      // Sanitize expression to only allow safe math operations
      const sanitized = this.sanitizeExpression(expression);
      
      // Evaluate safely using Function constructor
      // This is safer than eval() because we control the context
      const result = new Function('return ' + sanitized)();
      
      // Ensure result is a number
      if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
        console.warn(`Formula evaluation returned invalid result: ${formula} -> ${result}`);
        return 0;
      }
      
      return result;
    } catch (error) {
      console.error(`Formula evaluation error: ${formula}`, error);
      return 0;
    }
  }

  /**
   * Replace function calls (ceil, floor, round) with JavaScript Math equivalents
   * Note: We replace function names only - the arguments will be evaluated when the whole expression is evaluated
   */
  replaceFunctions(expression) {
    let result = expression;
    
    // Replace function names with Math equivalents (keep arguments as-is)
    result = result.replace(/\bceil\s*\(/g, 'Math.ceil(');
    result = result.replace(/\bfloor\s*\(/g, 'Math.floor(');
    result = result.replace(/\bround\s*\(/g, 'Math.round(');
    
    return result;
  }

  /**
   * Sanitize expression to only allow safe math operations
   * Removes anything that's not: numbers, operators, parentheses, Math functions, dots
   */
  sanitizeExpression(expression) {
    // Allow: numbers, operators (+, -, *, /), parentheses, Math., dots, spaces
    // Remove anything else
    return expression.replace(/[^0-9+\-*/().\sMathceilfloorround]/g, '');
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

export default FormulaEngine;

