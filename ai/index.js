/**
 * AI Services Index
 * 
 * Central export point for all AI services used in the application.
 * This file simplifies importing services in other parts of the codebase.
 */

// News services
const NewsAnalyzer = require('./news/newsAnalyzer');

// Narrative services
const NarrativeGenerator = require('./narrative/narrativeGenerator');

// Character services
const CharacterGenerator = require('./characters/characterGenerator');

// Decision services
const DecisionGenerator = require('./decisions/decisionGenerator');

// Prediction services
const PredictionGenerator = require('./predictions/predictionGenerator');

/**
 * Initialize and configure all AI services
 * @param {Object} config - Configuration options
 * @returns {Object} - Object containing all initialized services
 */
function initializeAIServices(config = {}) {
  // Initialize services with config options
  const newsAnalyzer = new NewsAnalyzer();
  const narrativeGenerator = new NarrativeGenerator();
  const characterGenerator = new CharacterGenerator();
  const decisionGenerator = new DecisionGenerator();
  const predictionGenerator = new PredictionGenerator();
  
  return {
    newsAnalyzer,
    narrativeGenerator,
    characterGenerator,
    decisionGenerator,
    predictionGenerator
  };
}

module.exports = {
  // Export individual services
  NewsAnalyzer,
  NarrativeGenerator,
  CharacterGenerator,
  DecisionGenerator,
  PredictionGenerator,
  
  // Export initializer function
  initializeAIServices
}; 