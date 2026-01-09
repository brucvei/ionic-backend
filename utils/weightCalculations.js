/**
 * Utility functions for weight calculations based on exercise equipment
 */

/**
 * Calculate the actual weight based on exercise configuration
 * @param {number} inputWeight - The weight entered by the user
 * @param {object} exercise - Exercise configuration
 * @param {boolean} exercise.has_pulley - If exercise uses a pulley system
 * @param {boolean} exercise.is_unilateral - If exercise is unilateral (one side)
 * @param {number|null} exercise.bar_weight - Weight of the bar (6, 8, 10, 12, or 20 kg)
 * @returns {number} - The calculated actual weight
 */
function calculateActualWeight(inputWeight, exercise) {
  let actualWeight = inputWeight;

  // If exercise has a pulley, divide the weight by 2
  if (exercise.has_pulley) {
    actualWeight = actualWeight / 2;
  }

  // If exercise is unilateral but user enters weight for one side,
  // and they're doing bilateral, multiply by 2
  // Note: This logic might need adjustment based on UI behavior
  if (exercise.is_unilateral === false && !exercise.has_pulley) {
    // For bilateral exercises without pulley, assume user enters total weight
    // actualWeight remains as entered
  }

  // If exercise uses a bar, add the bar weight
  if (exercise.bar_weight) {
    // User enters weight on one side, multiply by 2 and add bar weight
    actualWeight = (inputWeight * 2) + exercise.bar_weight;
  }

  return actualWeight;
}

/**
 * Calculate the input weight from actual weight (reverse calculation)
 * @param {number} actualWeight - The actual weight lifted
 * @param {object} exercise - Exercise configuration
 * @returns {number} - The weight that should be displayed to user
 */
function calculateInputWeight(actualWeight, exercise) {
  let inputWeight = actualWeight;

  // If exercise uses a bar, subtract bar weight and divide by 2
  if (exercise.bar_weight) {
    inputWeight = (actualWeight - exercise.bar_weight) / 2;
  }

  // If exercise has a pulley, multiply by 2
  if (exercise.has_pulley) {
    inputWeight = inputWeight * 2;
  }

  return inputWeight;
}

/**
 * Get a human-readable description of how weight is calculated for an exercise
 * @param {object} exercise - Exercise configuration
 * @returns {string} - Description of weight calculation
 */
function getWeightCalculationDescription(exercise) {
  const descriptions = [];

  if (exercise.bar_weight) {
    descriptions.push(`Bar weight: ${exercise.bar_weight}kg`);
    descriptions.push('Enter weight per side, total = (weight × 2) + bar');
  }

  if (exercise.has_pulley) {
    descriptions.push('Has pulley: displayed weight ÷ 2');
  }

  if (exercise.is_unilateral) {
    descriptions.push('Unilateral exercise: weight per side');
  } else {
    descriptions.push('Bilateral exercise: total weight');
  }

  return descriptions.length > 0 ? descriptions.join('; ') : 'Direct weight entry';
}

/**
 * Validate exercise configuration
 * @param {object} exercise - Exercise configuration
 * @returns {object} - Validation result
 */
function validateExerciseConfig(exercise) {
  const errors = [];

  if (exercise.bar_weight && ![6, 8, 10, 12, 20].includes(exercise.bar_weight)) {
    errors.push('Bar weight must be 6, 8, 10, 12, or 20 kg');
  }

  if (exercise.has_pulley && exercise.bar_weight) {
    errors.push('Exercise cannot have both pulley and bar weight');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  calculateActualWeight,
  calculateInputWeight,
  getWeightCalculationDescription,
  validateExerciseConfig
};
