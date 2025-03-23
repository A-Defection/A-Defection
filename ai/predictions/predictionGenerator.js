/**
 * Prediction Generator Service
 * 
 * Generates predictions based on narrative context and real-world events.
 * This service creates various types of predictions (binary, multiple choice,
 * range, time-based, and compound) that connect narrative elements to real events.
 */

const { Configuration, OpenAIApi } = require('openai');
const mongoose = require('mongoose');
const axios = require('axios');

// Import models
const Narrative = require('../../server/models/Narrative');
const Character = require('../../server/models/Character');
const Decision = require('../../server/models/Decision');
const Prediction = require('../../server/models/Prediction');
const NewsAnalyzer = require('../news/newsAnalyzer');

// Initialize OpenAI configuration
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

/**
 * Prediction Generator class
 */
class PredictionGenerator {
  constructor() {
    this.modelVersion = process.env.PREDICTION_MODEL_VERSION || '1.0.0';
    this.aiModel = process.env.PREDICTION_AI_MODEL || 'oracle-lens';
    this.newsAnalyzer = new NewsAnalyzer();
  }

  /**
   * Generate a prediction based on narrative and character context
   * @param {Object} params - Generation parameters
   * @param {string} params.narrativeId - ID of the narrative
   * @param {string} params.characterId - ID of the character
   * @param {string} params.decisionId - ID of the related decision (optional)
   * @param {string} params.type - Type of prediction (binary, multiple, range, time, compound)
   * @param {string} params.category - Category of prediction
   * @param {string} params.difficulty - Difficulty level (easy, medium, hard, extreme)
   * @param {number} params.daysToResolve - Days until resolution (optional)
   * @returns {Promise<Object>} - Generated prediction data
   */
  async generatePrediction(params) {
    try {
      const { 
        narrativeId, 
        characterId, 
        decisionId, 
        type = 'binary', 
        category, 
        difficulty = 'medium',
        daysToResolve = 14 
      } = params;
      
      // Fetch narrative details
      const narrative = await Narrative.findById(narrativeId);
      if (!narrative) {
        throw new Error(`Narrative with ID ${narrativeId} not found`);
      }
      
      // Fetch character details
      const character = await Character.findById(characterId);
      if (!character) {
        throw new Error(`Character with ID ${characterId} not found`);
      }
      
      // Fetch decision if provided
      let decision = null;
      if (decisionId) {
        decision = await Decision.findById(decisionId);
        if (!decision) {
          throw new Error(`Decision with ID ${decisionId} not found`);
        }
      }
      
      // Get related news for context
      const newsQuery = category || narrative.category;
      const newsArticles = await this.newsAnalyzer.fetchNews({
        query: newsQuery,
        from: this.getDaysAgo(7), // Last 7 days
        to: this.getCurrentDate(),
        pageSize: 10,
      });
      
      // Create context for prediction generation
      const context = {
        narrative: {
          title: narrative.title,
          summary: narrative.summary,
          category: narrative.category,
          tags: narrative.tags,
        },
        character: {
          name: character.name,
          type: character.type,
          specialties: character.specialties,
        },
        decision: decision ? {
          title: decision.title,
          description: decision.description,
          selectedOption: decision.selectedOption !== undefined ? 
            decision.options[decision.selectedOption].text : null,
        } : null,
        newsArticles: newsArticles.slice(0, 3).map(article => ({
          title: article.title,
          description: article.description || '',
          source: article.source.name,
          publishedAt: article.publishedAt,
        })),
      };
      
      // Generate prediction based on type
      const predictionData = await this.createPredictionByType(
        context,
        type,
        category || narrative.category,
        difficulty
      );
      
      // Calculate deadline
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + daysToResolve);
      
      return {
        ...predictionData,
        user: character.user,
        character: characterId,
        narrative: narrativeId,
        decision: decisionId,
        timeline: {
          createdAt: new Date(),
          deadline,
        },
        difficulty,
        isPublic: true,
        status: 'pending',
        generatedBy: {
          aiModel: this.aiModel,
          version: this.modelVersion,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Error generating prediction:', error.message);
      throw error;
    }
  }

  /**
   * Create a prediction based on context and type
   * @param {Object} context - Prediction context
   * @param {string} type - Prediction type
   * @param {string} category - Prediction category
   * @param {string} difficulty - Difficulty level
   * @returns {Promise<Object>} - Prediction data
   */
  async createPredictionByType(context, type, category, difficulty) {
    try {
      // Generate prompt based on prediction type
      let prompt;
      
      const difficultyContext = `The prediction should be of ${difficulty} difficulty.`;
      
      switch (type) {
        case 'binary':
          prompt = `
            Generate a binary (yes/no) prediction based on the following context:
            
            Narrative: ${context.narrative.title}
            Narrative Summary: ${context.narrative.summary}
            Character: ${context.character.name} (${context.character.type})
            Category: ${category}
            ${context.decision ? `Related Decision: ${context.decision.title}` : ''}
            
            Recent News:
            ${context.newsArticles.map(article => `- ${article.title} (${article.source})`).join('\n')}
            
            ${difficultyContext}
            
            Create a binary prediction that:
            1. Is related to both the narrative world and real-world events
            2. Is specific enough to be verifiably true or false
            3. Is challenging but not impossible to predict
            4. Has meaningful stakes and consequences
            
            Format the response as a JSON object:
            {
              "title": "Prediction title",
              "description": "Detailed prediction description",
              "type": "binary",
              "options": {
                "binary": {
                  "statement": "The statement to be proven true or false"
                }
              },
              "tags": ["tag1", "tag2", "tag3"],
              "confidence": 0-100 percentage reflecting default confidence level
            }
          `;
          break;
          
        case 'multiple':
          prompt = `
            Generate a multiple-choice prediction based on the following context:
            
            Narrative: ${context.narrative.title}
            Narrative Summary: ${context.narrative.summary}
            Character: ${context.character.name} (${context.character.type})
            Category: ${category}
            ${context.decision ? `Related Decision: ${context.decision.title}` : ''}
            
            Recent News:
            ${context.newsArticles.map(article => `- ${article.title} (${article.source})`).join('\n')}
            
            ${difficultyContext}
            
            Create a multiple-choice prediction that:
            1. Is related to both the narrative world and real-world events
            2. Has 3-5 distinct possible outcomes
            3. Includes probability estimates for each outcome
            
            Format the response as a JSON object:
            {
              "title": "Prediction title",
              "description": "Detailed prediction description",
              "type": "multiple",
              "options": {
                "multiple": {
                  "choices": [
                    {
                      "text": "Option 1 text",
                      "probability": 0.X
                    },
                    {
                      "text": "Option 2 text",
                      "probability": 0.Y
                    }
                  ]
                }
              },
              "tags": ["tag1", "tag2", "tag3"],
              "confidence": 0-100 percentage reflecting default confidence level
            }
            
            Note: The probabilities should add up to approximately 1.0.
          `;
          break;
          
        case 'range':
          prompt = `
            Generate a numeric range prediction based on the following context:
            
            Narrative: ${context.narrative.title}
            Narrative Summary: ${context.narrative.summary}
            Character: ${context.character.name} (${context.character.type})
            Category: ${category}
            ${context.decision ? `Related Decision: ${context.decision.title}` : ''}
            
            Recent News:
            ${context.newsArticles.map(article => `- ${article.title} (${article.source})`).join('\n')}
            
            ${difficultyContext}
            
            Create a numeric range prediction that:
            1. Is related to both the narrative world and real-world events
            2. Involves predicting a specific number or percentage
            3. Has a reasonable min/max range based on difficulty
            
            Format the response as a JSON object:
            {
              "title": "Prediction title",
              "description": "Detailed prediction description",
              "type": "range",
              "options": {
                "range": {
                  "min": minimum value,
                  "max": maximum value,
                  "unit": "unit of measurement (e.g., dollars, percent, points)"
                }
              },
              "tags": ["tag1", "tag2", "tag3"],
              "confidence": 0-100 percentage reflecting default confidence level
            }
          `;
          break;
          
        case 'time':
          prompt = `
            Generate a time-based prediction based on the following context:
            
            Narrative: ${context.narrative.title}
            Narrative Summary: ${context.narrative.summary}
            Character: ${context.character.name} (${context.character.type})
            Category: ${category}
            ${context.decision ? `Related Decision: ${context.decision.title}` : ''}
            
            Recent News:
            ${context.newsArticles.map(article => `- ${article.title} (${article.source})`).join('\n')}
            
            ${difficultyContext}
            
            Create a time-based prediction that:
            1. Is related to both the narrative world and real-world events
            2. Involves predicting when a specific event will occur
            3. Has a reasonable time range based on difficulty
            
            Format the response as a JSON object:
            {
              "title": "Prediction title",
              "description": "Detailed prediction description",
              "type": "time",
              "options": {
                "time": {
                  "earliestDate": "YYYY-MM-DD",
                  "latestDate": "YYYY-MM-DD"
                }
              },
              "tags": ["tag1", "tag2", "tag3"],
              "confidence": 0-100 percentage reflecting default confidence level
            }
            
            Note: The date range should be within the next 30 days.
          `;
          break;
          
        case 'compound':
          prompt = `
            Generate a compound prediction based on the following context:
            
            Narrative: ${context.narrative.title}
            Narrative Summary: ${context.narrative.summary}
            Character: ${context.character.name} (${context.character.type})
            Category: ${category}
            ${context.decision ? `Related Decision: ${context.decision.title}` : ''}
            
            Recent News:
            ${context.newsArticles.map(article => `- ${article.title} (${article.source})`).join('\n')}
            
            ${difficultyContext}
            
            Create a compound prediction that:
            1. Is related to both the narrative world and real-world events
            2. Involves multiple conditions that must be satisfied
            3. Has 3-5 distinct conditions with varying likelihoods
            
            Format the response as a JSON object:
            {
              "title": "Prediction title",
              "description": "Detailed prediction description",
              "type": "compound",
              "options": {
                "compound": {
                  "conditions": [
                    {
                      "description": "Condition 1 description",
                      "required": true/false
                    },
                    {
                      "description": "Condition 2 description",
                      "required": true/false
                    }
                  ]
                }
              },
              "tags": ["tag1", "tag2", "tag3"],
              "confidence": 0-100 percentage reflecting default confidence level
            }
            
            Note: At least one condition should be marked as required.
          `;
          break;
          
        default:
          throw new Error(`Unsupported prediction type: ${type}`);
      }
      
      // Generate prediction using OpenAI
      const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt,
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 1,
        frequency_penalty: 0.2,
        presence_penalty: 0.2,
      });
      
      // Parse the generated prediction
      const predictionData = JSON.parse(response.data.choices[0].text.trim());
      
      // Add category if not included
      predictionData.category = category;
      
      return predictionData;
    } catch (error) {
      console.error('Error creating prediction:', error.message);
      
      // Return a basic prediction as fallback based on type
      return this.createBasicPrediction(context, type, category, difficulty);
    }
  }

  /**
   * Create a basic prediction as fallback
   * @param {Object} context - Prediction context
   * @param {string} type - Prediction type
   * @param {string} category - Prediction category
   * @param {string} difficulty - Difficulty level
   * @returns {Object} - Basic prediction data
   */
  createBasicPrediction(context, type, category, difficulty) {
    const title = `Prediction about ${category} in ${context.narrative.title}`;
    const description = `A prediction related to ${context.character.name}'s role in the evolving narrative.`;
    
    const basicPredictions = {
      'binary': {
        title,
        description,
        type: 'binary',
        options: {
          binary: {
            statement: `A significant event related to ${category} will occur within the next two weeks.`,
          },
        },
        category,
        tags: [category, context.narrative.tags[0] || 'prediction'],
        confidence: 50,
      },
      
      'multiple': {
        title,
        description,
        type: 'multiple',
        options: {
          multiple: {
            choices: [
              { text: 'Outcome A will occur', probability: 0.5 },
              { text: 'Outcome B will occur', probability: 0.3 },
              { text: 'Outcome C will occur', probability: 0.2 },
            ],
          },
        },
        category,
        tags: [category, context.narrative.tags[0] || 'prediction'],
        confidence: 50,
      },
      
      'range': {
        title,
        description,
        type: 'range',
        options: {
          range: {
            min: 10,
            max: 30,
            unit: 'percent',
          },
        },
        category,
        tags: [category, context.narrative.tags[0] || 'prediction'],
        confidence: 50,
      },
      
      'time': {
        title,
        description,
        type: 'time',
        options: {
          time: {
            earliestDate: this.getDaysFromNow(3),
            latestDate: this.getDaysFromNow(14),
          },
        },
        category,
        tags: [category, context.narrative.tags[0] || 'prediction'],
        confidence: 50,
      },
      
      'compound': {
        title,
        description,
        type: 'compound',
        options: {
          compound: {
            conditions: [
              { description: 'Condition 1 will be met', required: true },
              { description: 'Condition 2 will be met', required: false },
              { description: 'Condition 3 will be met', required: false },
            ],
          },
        },
        category,
        tags: [category, context.narrative.tags[0] || 'prediction'],
        confidence: 50,
      },
    };
    
    return basicPredictions[type] || basicPredictions.binary;
  }

  /**
   * Resolve a prediction based on real-world events
   * @param {string} predictionId - Prediction ID
   * @returns {Promise<Object>} - Resolution data
   */
  async resolvePrediction(predictionId) {
    try {
      // Fetch prediction details
      const prediction = await Prediction.findById(predictionId);
      if (!prediction) {
        throw new Error(`Prediction with ID ${predictionId} not found`);
      }
      
      // Check if prediction is already resolved
      if (prediction.status === 'resolved') {
        return {
          success: false,
          message: 'Prediction is already resolved',
          prediction,
        };
      }
      
      // Check if prediction is expired
      const now = new Date();
      if (prediction.timeline.deadline < now) {
        prediction.status = 'expired';
        await prediction.save();
        
        return {
          success: false,
          message: 'Prediction has expired without resolution',
          prediction,
        };
      }
      
      // Fetch relevant news to help with resolution
      const newsArticles = await this.newsAnalyzer.fetchNews({
        query: `${prediction.title} ${prediction.category}`,
        from: this.getDaysAgo(7),
        to: this.getCurrentDate(),
        pageSize: 10,
      });
      
      // Analyze news for prediction resolution
      const resolutionData = await this.determineResolution(prediction, newsArticles);
      
      // Update prediction with resolution data
      prediction.status = 'resolved';
      prediction.outcome = {
        isCorrect: resolutionData.isCorrect,
        accuracy: resolutionData.accuracy,
        reward: this.calculateReward(prediction, resolutionData.accuracy),
        explanation: resolutionData.explanation,
        resolvedAt: now,
      };
      prediction.resolvedBy = 'system';
      prediction.realWorldEvents = resolutionData.events;
      
      // Save the updated prediction
      const updatedPrediction = await prediction.save();
      
      return {
        success: true,
        message: 'Prediction resolved successfully',
        prediction: updatedPrediction,
        resolution: resolutionData,
      };
    } catch (error) {
      console.error('Error resolving prediction:', error.message);
      throw error;
    }
  }

  /**
   * Determine resolution of a prediction based on real-world events
   * @param {Object} prediction - Prediction document
   * @param {Array} newsArticles - Relevant news articles
   * @returns {Promise<Object>} - Resolution data
   */
  async determineResolution(prediction, newsArticles) {
    try {
      // Format news articles for prompt
      const newsContext = newsArticles.slice(0, 5).map(article => {
        return `Title: ${article.title}
Source: ${article.source.name}
Date: ${new Date(article.publishedAt).toISOString().split('T')[0]}
Description: ${article.description || 'No description'}
`;
      }).join('\n');
      
      // Create prompt for resolution determination
      const prompt = `
        Determine if the following prediction has been fulfilled based on recent news:
        
        Prediction: ${prediction.title}
        Description: ${prediction.description}
        Type: ${prediction.type}
        
        ${this.formatPredictionOptionsForPrompt(prediction)}
        
        Recent relevant news:
        ${newsContext}
        
        Based on the news above, determine:
        1. If the prediction is correct
        2. The accuracy of the prediction (0.0 to 1.0)
        3. A detailed explanation of your reasoning
        4. The most relevant real-world events that support your conclusion
        
        Format the response as a JSON object:
        {
          "isCorrect": true/false,
          "accuracy": 0.0-1.0,
          "explanation": "Detailed explanation",
          "events": [
            {
              "title": "Event title",
              "description": "Event description",
              "source": "Source name",
              "date": "YYYY-MM-DD",
              "relevanceScore": 0.0-1.0
            }
          ]
        }
      `;
      
      // Generate resolution using OpenAI
      const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt,
        temperature: 0.3,
        max_tokens: 1500,
        top_p: 1,
        frequency_penalty: 0.2,
        presence_penalty: 0.2,
      });
      
      // Parse the generated resolution
      return JSON.parse(response.data.choices[0].text.trim());
    } catch (error) {
      console.error('Error determining resolution:', error.message);
      
      // Return a default resolution as fallback
      return {
        isCorrect: false,
        accuracy: 0,
        explanation: 'Unable to determine resolution due to insufficient data.',
        events: newsArticles.slice(0, 3).map(article => ({
          title: article.title,
          description: article.description || 'No description',
          source: article.source.name,
          date: new Date(article.publishedAt).toISOString().split('T')[0],
          relevanceScore: 0.5,
        })),
      };
    }
  }

  /**
   * Format prediction options for use in resolution prompt
   * @param {Object} prediction - Prediction document
   * @returns {string} - Formatted options
   */
  formatPredictionOptionsForPrompt(prediction) {
    const { type, options } = prediction;
    
    switch (type) {
      case 'binary':
        return `Prediction statement: ${options.binary.statement}
Selected answer: ${prediction.selectedOption && prediction.selectedOption.binary ? 
          (prediction.selectedOption.binary.answer ? 'Yes' : 'No') : 'Not selected'}`;
        
      case 'multiple':
        return `Possible outcomes:
${options.multiple.choices.map((choice, i) => `${i+1}. ${choice.text} (Probability: ${choice.probability})`).join('\n')}
Selected outcome: ${prediction.selectedOption && prediction.selectedOption.multiple ? 
          options.multiple.choices[prediction.selectedOption.multiple.choiceIndex].text : 'Not selected'}`;
        
      case 'range':
        return `Range prediction: Between ${options.range.min} and ${options.range.max} ${options.range.unit}
Selected value: ${prediction.selectedOption && prediction.selectedOption.range ? 
          prediction.selectedOption.range.value : 'Not selected'}`;
        
      case 'time':
        return `Time prediction: Event will occur between ${new Date(options.time.earliestDate).toISOString().split('T')[0]} and ${new Date(options.time.latestDate).toISOString().split('T')[0]}
Selected date: ${prediction.selectedOption && prediction.selectedOption.time ? 
          new Date(prediction.selectedOption.time.date).toISOString().split('T')[0] : 'Not selected'}`;
        
      case 'compound':
        return `Compound conditions:
${options.compound.conditions.map((condition, i) => `${i+1}. ${condition.description} (${condition.required ? 'Required' : 'Optional'})`).join('\n')}
Selected conditions: ${prediction.selectedOption && prediction.selectedOption.compound ? 
          prediction.selectedOption.compound.satisfiedConditions.map(i => i+1).join(', ') : 'Not selected'}`;
        
      default:
        return 'Prediction details not available in a structured format.';
    }
  }

  /**
   * Calculate reward for a prediction based on accuracy
   * @param {Object} prediction - Prediction document
   * @param {number} accuracy - Accuracy of prediction (0.0-1.0)
   * @returns {number} - Calculated reward
   */
  calculateReward(prediction, accuracy) {
    // Base reward factors
    const difficultyMultiplier = {
      'easy': 1,
      'medium': 2,
      'hard': 5,
      'extreme': 10
    };
    
    // Calculate base reward
    const baseReward = prediction.stakeAmount * 2;
    
    // Apply difficulty multiplier
    const difficultyBonus = prediction.stakeAmount * (difficultyMultiplier[prediction.difficulty] - 1);
    
    // Calculate confidence-based modifier (higher confidence = higher risk/reward)
    const confidenceModifier = (prediction.confidence / 50); // 0.0-2.0 range
    
    // Apply accuracy
    const accuracyMultiplier = accuracy;
    
    // Calculate total reward
    return Math.floor((baseReward + difficultyBonus) * confidenceModifier * accuracyMultiplier);
  }

  /**
   * Create a new prediction in the database
   * @param {Object} predictionData - Prediction data
   * @returns {Promise<Object>} - Created prediction document
   */
  async savePredictionToDatabase(predictionData) {
    try {
      // Create new prediction document
      const prediction = new Prediction({
        user: predictionData.user,
        character: predictionData.character,
        narrative: predictionData.narrative,
        decision: predictionData.decision,
        title: predictionData.title,
        description: predictionData.description,
        type: predictionData.type,
        options: predictionData.options,
        confidence: predictionData.confidence,
        status: predictionData.status || 'pending',
        timeline: predictionData.timeline,
        category: predictionData.category,
        tags: predictionData.tags,
        difficulty: predictionData.difficulty,
        isPublic: predictionData.isPublic !== undefined ? predictionData.isPublic : true,
        stakeAmount: predictionData.stakeAmount || 0,
        generatedBy: predictionData.generatedBy,
      });
      
      // Save the prediction
      const savedPrediction = await prediction.save();
      
      // Add prediction to narrative's predictions array
      if (predictionData.narrative) {
        await Narrative.findByIdAndUpdate(
          predictionData.narrative,
          {
            $push: { predictions: savedPrediction._id }
          }
        );
      }
      
      // Add prediction to character's predictions array
      if (predictionData.character) {
        await Character.findByIdAndUpdate(
          predictionData.character,
          {
            $push: { predictions: savedPrediction._id }
          }
        );
      }
      
      return savedPrediction;
    } catch (error) {
      console.error('Error saving prediction to database:', error.message);
      throw error;
    }
  }

  /**
   * Get current date in YYYY-MM-DD format
   * @returns {string} - Current date
   */
  getCurrentDate() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Get date from n days ago in YYYY-MM-DD format
   * @param {number} days - Number of days ago
   * @returns {string} - Date from n days ago
   */
  getDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  /**
   * Get date n days from now in YYYY-MM-DD format
   * @param {number} days - Number of days from now
   * @returns {string} - Date n days from now
   */
  getDaysFromNow(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }
}

module.exports = PredictionGenerator; 