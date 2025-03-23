/**
 * Decision Generator Service
 * 
 * Generates decision points for narratives with various options, consequences,
 * and requirements based on the narrative context and character abilities.
 */

const { Configuration, OpenAIApi } = require('openai');
const mongoose = require('mongoose');

// Import models
const Narrative = require('../../server/models/Narrative');
const Character = require('../../server/models/Character');
const Decision = require('../../server/models/Decision');

// Initialize OpenAI configuration
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

/**
 * Decision Generator class
 */
class DecisionGenerator {
  constructor() {
    this.modelVersion = process.env.DECISION_MODEL_VERSION || '1.0.0';
    this.aiModel = process.env.DECISION_AI_MODEL || 'choice-architect';
  }

  /**
   * Generate a decision for a specific narrative and character
   * @param {Object} params - Generation parameters
   * @param {string} params.narrativeId - ID of the narrative
   * @param {string} params.characterId - ID of the character
   * @param {string} params.sceneId - ID of the scene (optional)
   * @param {string} params.importance - Importance level (low, medium, high, critical)
   * @param {number} params.timeLimit - Time limit in hours (optional)
   * @returns {Promise<Object>} - Generated decision data
   */
  async generateDecision(params) {
    try {
      const { narrativeId, characterId, sceneId, importance = 'medium', timeLimit } = params;
      
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
      
      // Get scene if provided
      let scene = null;
      if (sceneId) {
        scene = narrative.scenes.id(sceneId);
        if (!scene) {
          throw new Error(`Scene with ID ${sceneId} not found in narrative`);
        }
      }
      
      // Get narrative and character context
      const narrativeContext = {
        title: narrative.title,
        summary: narrative.summary,
        category: narrative.category,
        tags: narrative.tags,
        sceneTitle: scene ? scene.title : null,
        sceneDescription: scene ? scene.description : null,
      };
      
      const characterContext = {
        name: character.name,
        type: character.type,
        background: character.background.summary,
        traits: character.traits,
        specialties: character.specialties,
      };
      
      // Generate decision
      const decisionData = await this.createDecision(
        narrativeContext,
        characterContext,
        importance,
      );
      
      // Calculate deadline
      const deadline = new Date();
      deadline.setHours(deadline.getHours() + (timeLimit || this.getDefaultTimeLimit(importance)));
      
      return {
        ...decisionData,
        narrative: narrativeId,
        character: characterId,
        scene: sceneId,
        deadline,
        importance,
        status: 'pending',
        generatedBy: {
          aiModel: this.aiModel,
          version: this.modelVersion,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Error generating decision:', error.message);
      throw error;
    }
  }

  /**
   * Create a decision based on narrative and character context
   * @param {Object} narrativeContext - Narrative context
   * @param {Object} characterContext - Character context
   * @param {string} importance - Importance level
   * @returns {Promise<Object>} - Decision data
   */
  async createDecision(narrativeContext, characterContext, importance) {
    try {
      // Create prompt for decision generation
      const prompt = `
        Generate a compelling decision for an interactive narrative character based on the following context:
        
        Narrative Title: ${narrativeContext.title}
        Narrative Summary: ${narrativeContext.summary}
        Category: ${narrativeContext.category}
        Tags: ${narrativeContext.tags.join(', ')}
        ${narrativeContext.sceneTitle ? `Current Scene: ${narrativeContext.sceneTitle}` : ''}
        ${narrativeContext.sceneDescription ? `Scene Description: ${narrativeContext.sceneDescription}` : ''}
        
        Character Name: ${characterContext.name}
        Character Type: ${characterContext.type}
        Character Background: ${characterContext.background}
        
        Importance Level: ${importance}
        
        The decision should:
        1. Be meaningful and relevant to both the narrative and character
        2. Offer 3-5 distinct options with different approaches and consequences
        3. Include options that leverage the character's strengths
        4. Have requirements tied to the character's traits and specialties
        
        Character Traits:
        ${Object.entries(characterContext.traits).map(([trait, value]) => `- ${trait}: ${value}`).join('\n')}
        
        Character Specialties:
        ${characterContext.specialties.map(s => `- ${s.name} (Level ${s.level})`).join('\n')}
        
        Format the response as a JSON object with the following structure:
        {
          "title": "Decision title",
          "description": "Detailed decision context and situation",
          "options": [
            {
              "text": "Brief option text",
              "description": "Detailed description of the option",
              "consequences": "Description of potential consequences",
              "requiredTraits": {
                "rational": 0,
                "emotional": 0,
                "traditional": 0,
                "innovative": 0,
                "individual": 0,
                "collective": 0,
                "intuitive": 0,
                "planned": 0
              },
              "requiredSpecialties": [
                {"name": "specialty name", "level": 0}
              ],
              "influenceRequired": 0,
              "resourceCost": {
                "money": 0,
                "connections": 0,
                "information": 0
              },
              "reputationImpact": {
                "public": 0,
                "government": 0,
                "business": 0,
                "academic": 0,
                "media": 0
              }
            }
          ]
        }
        
        For each option:
        - Set required trait values only if they are needed (level 5+)
        - Include resource costs appropriate to the action
        - Make reputation impacts range from -20 to +20
        - Make influence requirements proportional to the decision importance (${this.getInfluenceRequirement(importance)} for ${importance} importance)
        - Ensure at least one option has minimal requirements
      `;
      
      // Generate decision using OpenAI
      const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt,
        temperature: 0.7,
        max_tokens: 2000,
        top_p: 1,
        frequency_penalty: 0.2,
        presence_penalty: 0.2,
      });
      
      // Parse the generated decision
      return JSON.parse(response.data.choices[0].text.trim());
    } catch (error) {
      console.error('Error creating decision:', error.message);
      
      // Return a basic decision as fallback
      return {
        title: `Decision for ${characterContext.name} in ${narrativeContext.title}`,
        description: `A decision point has been reached in the narrative.`,
        options: [
          {
            text: 'Take the cautious approach',
            description: 'Proceed with caution, gathering more information before committing.',
            consequences: 'Minimal risk but potentially missed opportunities.',
            requiredTraits: {},
            requiredSpecialties: [],
            influenceRequired: 0,
            resourceCost: {
              money: 0,
              connections: 0,
              information: 0
            },
            reputationImpact: {
              public: 0,
              government: 0,
              business: 0,
              academic: 0,
              media: 0
            }
          },
          {
            text: 'Take decisive action',
            description: 'Act quickly and decisively to address the situation.',
            consequences: 'Could lead to significant advantages but also risks.',
            requiredTraits: {},
            requiredSpecialties: [],
            influenceRequired: this.getInfluenceRequirement(importance),
            resourceCost: {
              money: 100,
              connections: 5,
              information: 0
            },
            reputationImpact: {
              public: 5,
              government: 0,
              business: 0,
              academic: 0,
              media: 0
            }
          }
        ]
      };
    }
  }

  /**
   * Generate decision outcomes based on the selected option
   * @param {string} decisionId - Decision ID
   * @param {number} selectedOptionIndex - Index of the selected option
   * @param {string} customResponse - Custom response (optional)
   * @returns {Promise<Array>} - Generated outcomes
   */
  async generateOutcomes(decisionId, selectedOptionIndex, customResponse = '') {
    try {
      // Fetch decision details
      const decision = await Decision.findById(decisionId)
        .populate('narrative')
        .populate('character');
      
      if (!decision) {
        throw new Error(`Decision with ID ${decisionId} not found`);
      }
      
      // Get selected option
      const selectedOption = decision.options[selectedOptionIndex];
      if (!selectedOption) {
        throw new Error(`Option with index ${selectedOptionIndex} not found in decision`);
      }
      
      // Create prompt for outcome generation
      const prompt = `
        Generate detailed outcomes for a character's decision in an interactive narrative:
        
        Narrative: ${decision.narrative.title}
        Character: ${decision.character.name} (${decision.character.type})
        Decision: ${decision.title}
        Description: ${decision.description}
        
        Selected Option: ${selectedOption.text}
        Option Description: ${selectedOption.description}
        Potential Consequences: ${selectedOption.consequences}
        ${customResponse ? `Character's Custom Response: ${customResponse}` : ''}
        
        Generate 1-3 specific outcomes that result from this decision, including:
        1. Immediate effects on the character's resources, influence, and reputation
        2. Relationship changes with other characters or factions
        3. Potential narrative developments or unlocks
        
        Format the response as a JSON array of outcome objects:
        [
          {
            "description": "Detailed outcome description",
            "effects": {
              "influence": Change in influence value (positive or negative),
              "experience": Experience points gained (usually positive),
              "resources": {
                "money": Change in money,
                "connections": Change in connections,
                "information": Change in information
              },
              "reputation": {
                "public": Change in public reputation,
                "government": Change in government reputation,
                "business": Change in business reputation,
                "academic": Change in academic reputation,
                "media": Change in media reputation
              },
              "relationships": [
                {
                  "character": "Character name or archetype",
                  "change": {
                    "trust": Change in trust level (-20 to +20),
                    "influence": Change in influence level (-20 to +20)
                  }
                }
              ]
            },
            "unlocks": [
              {
                "type": "ability/narrative/scene/character/item",
                "description": "Description of what was unlocked"
              }
            ]
          }
        ]
        
        Make sure the outcomes are logical consequences of the decision and selected option.
        Include at least one outcome with substantial effects.
      `;
      
      // Generate outcomes using OpenAI
      const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt,
        temperature: 0.7,
        max_tokens: 1500,
        top_p: 1,
        frequency_penalty: 0.2,
        presence_penalty: 0.2,
      });
      
      // Parse the generated outcomes
      return JSON.parse(response.data.choices[0].text.trim());
    } catch (error) {
      console.error('Error generating outcomes:', error.message);
      
      // Return a basic outcome as fallback
      return [{
        description: 'Your decision has consequences that affect your standing in the narrative.',
        effects: {
          influence: 5,
          experience: 20,
          resources: {
            money: 0,
            connections: 2,
            information: 5
          },
          reputation: {
            public: 3,
            government: 0,
            business: 0,
            academic: 0,
            media: 2
          },
          relationships: []
        },
        unlocks: []
      }];
    }
  }

  /**
   * Apply decision outcomes to character and narrative
   * @param {string} decisionId - Decision ID
   * @param {Array} outcomes - Outcome objects
   * @returns {Promise<Object>} - Updated character and decision
   */
  async applyOutcomes(decisionId, outcomes) {
    try {
      // Fetch decision with character
      const decision = await Decision.findById(decisionId);
      if (!decision) {
        throw new Error(`Decision with ID ${decisionId} not found`);
      }
      
      // Update decision status and add outcomes
      decision.status = 'made';
      decision.outcomes = outcomes.map(outcome => ({
        ...outcome,
        appliedAt: new Date()
      }));
      
      // Save updated decision
      const updatedDecision = await decision.save();
      
      // Apply effects to character
      let character = await Character.findById(decision.character);
      
      // Aggregate all effects across outcomes
      const aggregatedEffects = this.aggregateOutcomeEffects(outcomes);
      
      // Apply influence and experience
      character.influence += aggregatedEffects.influence;
      character.experience += aggregatedEffects.experience;
      
      // Apply resources
      character.resources.money += aggregatedEffects.resources.money;
      character.resources.connections += aggregatedEffects.resources.connections;
      character.resources.information += aggregatedEffects.resources.information;
      
      // Apply reputation
      character.reputation.public += aggregatedEffects.reputation.public;
      character.reputation.government += aggregatedEffects.reputation.government;
      character.reputation.business += aggregatedEffects.reputation.business;
      character.reputation.academic += aggregatedEffects.reputation.academic;
      character.reputation.media += aggregatedEffects.reputation.media;
      
      // Add decision to character's decisions array
      character.decisions.push(decisionId);
      
      // Update last activity
      character.lastActivity = new Date();
      
      // Save updated character
      const updatedCharacter = await character.save();
      
      return {
        decision: updatedDecision,
        character: updatedCharacter
      };
    } catch (error) {
      console.error('Error applying outcomes:', error.message);
      throw error;
    }
  }

  /**
   * Aggregate effects from multiple outcomes into a single effect object
   * @param {Array} outcomes - Array of outcome objects
   * @returns {Object} - Aggregated effects
   */
  aggregateOutcomeEffects(outcomes) {
    // Initialize aggregated effects
    const aggregated = {
      influence: 0,
      experience: 0,
      resources: {
        money: 0,
        connections: 0,
        information: 0
      },
      reputation: {
        public: 0,
        government: 0,
        business: 0,
        academic: 0,
        media: 0
      }
    };
    
    // Sum effects from all outcomes
    outcomes.forEach(outcome => {
      const effects = outcome.effects || {};
      
      // Add influence and experience
      aggregated.influence += effects.influence || 0;
      aggregated.experience += effects.experience || 0;
      
      // Add resources
      if (effects.resources) {
        aggregated.resources.money += effects.resources.money || 0;
        aggregated.resources.connections += effects.resources.connections || 0;
        aggregated.resources.information += effects.resources.information || 0;
      }
      
      // Add reputation
      if (effects.reputation) {
        aggregated.reputation.public += effects.reputation.public || 0;
        aggregated.reputation.government += effects.reputation.government || 0;
        aggregated.reputation.business += effects.reputation.business || 0;
        aggregated.reputation.academic += effects.reputation.academic || 0;
        aggregated.reputation.media += effects.reputation.media || 0;
      }
    });
    
    return aggregated;
  }

  /**
   * Create a new decision in the database
   * @param {string} userId - User ID
   * @param {Object} decisionData - Decision data
   * @returns {Promise<Object>} - Created decision document
   */
  async saveDecisionToDatabase(userId, decisionData) {
    try {
      // Create new decision document
      const decision = new Decision({
        user: userId,
        narrative: decisionData.narrative,
        character: decisionData.character,
        scene: decisionData.scene,
        title: decisionData.title,
        description: decisionData.description,
        options: decisionData.options,
        status: decisionData.status || 'pending',
        deadline: decisionData.deadline,
        importance: decisionData.importance || 'medium',
        generatedBy: decisionData.generatedBy,
      });
      
      // Save the decision
      const savedDecision = await decision.save();
      
      // If there's a scene, add decision to the scene
      if (decisionData.scene) {
        await Narrative.findOneAndUpdate(
          { _id: decisionData.narrative, 'scenes._id': decisionData.scene },
          {
            $push: {
              'scenes.$.decisions': savedDecision._id
            }
          }
        );
      }
      
      return savedDecision;
    } catch (error) {
      console.error('Error saving decision to database:', error.message);
      throw error;
    }
  }

  /**
   * Get default time limit for decisions based on importance
   * @param {string} importance - Importance level
   * @returns {number} - Time limit in hours
   */
  getDefaultTimeLimit(importance) {
    const timeLimits = {
      low: 72,     // 3 days
      medium: 48,  // 2 days
      high: 24,    // 1 day
      critical: 6  // 6 hours
    };
    
    return timeLimits[importance] || 48;
  }

  /**
   * Get influence requirement based on decision importance
   * @param {string} importance - Importance level
   * @returns {number} - Influence requirement
   */
  getInfluenceRequirement(importance) {
    const influenceRequirements = {
      low: 10,
      medium: 25,
      high: 50,
      critical: 100
    };
    
    return influenceRequirements[importance] || 25;
  }

  /**
   * Check if a character meets requirements for a decision option
   * @param {Object} character - Character document
   * @param {Object} option - Decision option
   * @returns {Object} - Eligibility result
   */
  checkOptionEligibility(character, option) {
    const result = {
      eligible: true,
      reasons: []
    };
    
    // Check traits
    if (option.requiredTraits) {
      Object.entries(option.requiredTraits).forEach(([trait, value]) => {
        if (value > 0 && character.traits[trait] < value) {
          result.eligible = false;
          result.reasons.push(`Requires ${trait} level ${value}`);
        }
      });
    }
    
    // Check specialties
    if (option.requiredSpecialties && option.requiredSpecialties.length > 0) {
      option.requiredSpecialties.forEach(req => {
        const characterSpecialty = character.specialties.find(s => s.name === req.name);
        if (!characterSpecialty || characterSpecialty.level < req.level) {
          result.eligible = false;
          result.reasons.push(`Requires ${req.name} specialty level ${req.level}`);
        }
      });
    }
    
    // Check influence
    if (option.influenceRequired > 0 && character.influence < option.influenceRequired) {
      result.eligible = false;
      result.reasons.push(`Requires ${option.influenceRequired} influence`);
    }
    
    // Check resources
    if (option.resourceCost) {
      Object.entries(option.resourceCost).forEach(([resource, cost]) => {
        if (cost > 0 && character.resources[resource] < cost) {
          result.eligible = false;
          result.reasons.push(`Requires ${cost} ${resource}`);
        }
      });
    }
    
    return result;
  }
}

module.exports = DecisionGenerator; 