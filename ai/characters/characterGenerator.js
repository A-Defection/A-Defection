/**
 * Character Generator Service
 * 
 * Generates character templates and recommendations based on narrative context.
 * This service creates character profiles with traits, abilities, and backgrounds
 * that fit within the narrative setting.
 */

const { Configuration, OpenAIApi } = require('openai');
const mongoose = require('mongoose');

// Import models
const Character = require('../../server/models/Character');
const Narrative = require('../../server/models/Narrative');

// Initialize OpenAI configuration
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

/**
 * Character Generator class
 */
class CharacterGenerator {
  constructor() {
    this.modelVersion = process.env.CHARACTER_MODEL_VERSION || '1.0.0';
    this.aiModel = process.env.CHARACTER_AI_MODEL || 'character-forge';
  }

  /**
   * Generate a character template for a specific narrative
   * @param {Object} params - Generation parameters
   * @param {string} params.narrativeId - ID of the narrative
   * @param {string} params.characterType - Type of character to generate (optional)
   * @param {string} params.role - Role in the narrative (optional)
   * @param {string} params.specialtyFocus - Primary specialty to focus on (optional)
   * @returns {Promise<Object>} - Character template
   */
  async generateCharacterTemplate(params) {
    try {
      const { narrativeId, characterType, role, specialtyFocus } = params;
      
      // Fetch narrative details
      const narrative = await Narrative.findById(narrativeId);
      if (!narrative) {
        throw new Error(`Narrative with ID ${narrativeId} not found`);
      }
      
      // Get narrative context
      const narrativeContext = {
        title: narrative.title,
        summary: narrative.summary,
        description: narrative.description,
        category: narrative.category,
        tags: narrative.tags,
        locations: narrative.locations,
        characters: narrative.characters,
      };
      
      // Generate character data
      const characterData = await this.createCharacterProfile(
        narrativeContext,
        characterType,
        role,
        specialtyFocus
      );
      
      return {
        ...characterData,
        narrativeId,
        generatedBy: {
          aiModel: this.aiModel,
          version: this.modelVersion,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Error generating character template:', error.message);
      throw error;
    }
  }

  /**
   * Create a character profile based on narrative context
   * @param {Object} narrativeContext - Narrative context
   * @param {string} requestedType - Requested character type
   * @param {string} requestedRole - Requested character role
   * @param {string} specialtyFocus - Primary specialty to focus on
   * @returns {Promise<Object>} - Character profile
   */
  async createCharacterProfile(narrativeContext, requestedType, requestedRole, specialtyFocus) {
    try {
      // Default to broad prompting if specific type/role not requested
      const typePrompt = requestedType ? 
        `The character should be of type: ${requestedType}.` : 
        'Choose an appropriate character type that would be interesting in this narrative.';
      
      const rolePrompt = requestedRole ? 
        `The character should have the role: ${requestedRole}.` : 
        'Assign an appropriate role for this character in the narrative.';
      
      const specialtyPrompt = specialtyFocus ? 
        `The character should have expertise in: ${specialtyFocus}.` : 
        'Select appropriate specialties for this character based on their background.';
      
      // Create prompt for character generation
      const prompt = `
        Generate a detailed character profile for an interactive narrative based on the following context:
        
        Narrative Title: ${narrativeContext.title}
        Narrative Summary: ${narrativeContext.summary}
        Category: ${narrativeContext.category}
        Tags: ${narrativeContext.tags.join(', ')}
        
        ${typePrompt}
        ${rolePrompt}
        ${specialtyPrompt}
        
        Create a rich character with a complex background, motivations, and traits. The character should fit naturally into the narrative world.
        
        Format the response as a JSON object with the following structure:
        {
          "name": "Character name",
          "type": "One of: politician, journalist, business, activist, diplomat, military, scientist, citizen, artist, other",
          "rarity": "One of: common, rare, epic, legendary",
          "background": {
            "summary": "Brief background summary",
            "history": "More detailed background history",
            "motivation": "Character's core motivation"
          },
          "traits": {
            "rational": 1-10,
            "emotional": 1-10,
            "traditional": 1-10,
            "innovative": 1-10,
            "individual": 1-10,
            "collective": 1-10,
            "intuitive": 1-10,
            "planned": 1-10
          },
          "specialties": [
            {
              "name": "One of the valid specialty fields",
              "level": 1-10
            }
          ],
          "abilities": [
            {
              "name": "Ability name",
              "description": "Ability description",
              "unlocked": false
            }
          ],
          "reputation": {
            "public": -100 to 100,
            "government": -100 to 100,
            "business": -100 to 100,
            "academic": -100 to 100,
            "media": -100 to 100
          }
        }
        
        Valid specialty fields include: politics, economics, technology, environment, culture, military, diplomacy, science, medicine, law, media, intelligence, finance, education, energy, cybersecurity, humanitarian, transportation, agriculture, religion.
        
        Make sure the traits and specialties align with the character's background and the narrative context.
      `;
      
      // Generate character profile using OpenAI
      const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt,
        temperature: 0.8,
        max_tokens: 2000,
        top_p: 1,
        frequency_penalty: 0.2,
        presence_penalty: 0.2,
      });
      
      // Parse the generated character profile
      return JSON.parse(response.data.choices[0].text.trim());
    } catch (error) {
      console.error('Error creating character profile:', error.message);
      
      // Return a basic character profile as fallback
      return {
        name: `Character for ${narrativeContext.title}`,
        type: requestedType || 'citizen',
        rarity: 'common',
        background: {
          summary: `A character involved in the ${narrativeContext.title} narrative.`,
          history: 'Background details unavailable.',
          motivation: 'To navigate the unfolding events successfully.',
        },
        traits: {
          rational: 5,
          emotional: 5,
          traditional: 5,
          innovative: 5,
          individual: 5,
          collective: 5,
          intuitive: 5,
          planned: 5,
        },
        specialties: [
          {
            name: specialtyFocus || 'politics',
            level: 5,
          },
        ],
        abilities: [
          {
            name: 'Basic Influence',
            description: 'Can exert minor influence over events.',
            unlocked: true,
          },
        ],
        reputation: {
          public: 0,
          government: 0,
          business: 0,
          academic: 0,
          media: 0,
        },
      };
    }
  }

  /**
   * Generate character abilities based on type and specialties
   * @param {string} characterType - Type of character
   * @param {Array} specialties - Character specialties
   * @returns {Promise<Array>} - List of character abilities
   */
  async generateCharacterAbilities(characterType, specialties) {
    try {
      const specialtiesText = specialties.map(s => `${s.name} (Level ${s.level})`).join(', ');
      
      const prompt = `
        Generate 3-5 unique abilities for a character with the following profile:
        
        Character Type: ${characterType}
        Specialties: ${specialtiesText}
        
        Each ability should:
        1. Be thematically appropriate for the character type and specialties
        2. Provide a unique advantage in specific situations
        3. Have a clear and concise description
        
        Format the response as a JSON array with the following structure:
        [
          {
            "name": "Ability name",
            "description": "Detailed description of what the ability does",
            "unlocked": false,
            "cooldown": 72 (hours)
          }
        ]
        
        Make the abilities creative but balanced for an interactive narrative experience.
      `;
      
      const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt,
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 1,
        frequency_penalty: 0.3,
        presence_penalty: 0.3,
      });
      
      // Parse the generated abilities
      return JSON.parse(response.data.choices[0].text.trim());
    } catch (error) {
      console.error('Error generating character abilities:', error.message);
      
      // Return basic abilities as fallback
      return [
        {
          name: 'Network Contact',
          description: 'Call upon contacts in your network for information or assistance.',
          unlocked: false,
          cooldown: 48,
        },
        {
          name: 'Expert Analysis',
          description: `Analyze a situation using your expertise in ${specialties[0]?.name || 'your field'}.`,
          unlocked: false,
          cooldown: 24,
        },
        {
          name: 'Persuasive Argument',
          description: 'Make a compelling case that can sway others to your perspective.',
          unlocked: false,
          cooldown: 72,
        },
      ];
    }
  }

  /**
   * Calculate appropriate starting resources based on character type and rarity
   * @param {string} characterType - Type of character
   * @param {string} rarity - Character rarity
   * @returns {Object} - Starting resources
   */
  calculateStartingResources(characterType, rarity) {
    // Base resources by type
    const baseResources = {
      politician: { money: 2000, connections: 30, information: 15 },
      journalist: { money: 1000, connections: 20, information: 30 },
      business: { money: 5000, connections: 25, information: 15 },
      activist: { money: 500, connections: 15, information: 25 },
      diplomat: { money: 3000, connections: 35, information: 20 },
      military: { money: 1500, connections: 20, information: 15 },
      scientist: { money: 1200, connections: 15, information: 35 },
      citizen: { money: 800, connections: 10, information: 10 },
      artist: { money: 600, connections: 15, information: 10 },
      other: { money: 1000, connections: 15, information: 15 },
    };
    
    // Rarity multipliers
    const rarityMultipliers = {
      common: 1,
      rare: 1.5,
      epic: 2.5,
      legendary: 4,
    };
    
    // Get base resources for this character type, defaulting to 'other' if not found
    const base = baseResources[characterType] || baseResources.other;
    
    // Apply rarity multiplier
    const multiplier = rarityMultipliers[rarity] || rarityMultipliers.common;
    
    return {
      money: Math.round(base.money * multiplier),
      connections: Math.round(base.connections * multiplier),
      information: Math.round(base.information * multiplier),
    };
  }

  /**
   * Calculate starting influence based on character traits and specialties
   * @param {Object} traits - Character traits
   * @param {Array} specialties - Character specialties
   * @param {string} rarity - Character rarity
   * @returns {number} - Starting influence value
   */
  calculateStartingInfluence(traits, specialties, rarity) {
    // Base influence by rarity
    const baseInfluence = {
      common: 10,
      rare: 25,
      epic: 50,
      legendary: 100,
    }[rarity] || 10;
    
    // Calculate average trait value
    const traitValues = Object.values(traits);
    const avgTraitValue = traitValues.reduce((sum, val) => sum + val, 0) / traitValues.length;
    
    // Calculate max specialty level
    const maxSpecialtyLevel = specialties.reduce((max, s) => Math.max(max, s.level), 0);
    
    // Calculate influence
    const influenceFromTraits = avgTraitValue * 2;
    const influenceFromSpecialties = maxSpecialtyLevel * 3;
    
    return Math.round(baseInfluence + influenceFromTraits + influenceFromSpecialties);
  }

  /**
   * Create a character in the database
   * @param {string} userId - User ID
   * @param {Object} characterData - Character data
   * @returns {Promise<Object>} - Created character document
   */
  async saveCharacterToDatabase(userId, characterData) {
    try {
      // Calculate derived values
      const resources = this.calculateStartingResources(characterData.type, characterData.rarity);
      const influence = this.calculateStartingInfluence(
        characterData.traits,
        characterData.specialties,
        characterData.rarity
      );
      
      // Create new character document
      const character = new Character({
        user: userId,
        name: characterData.name,
        type: characterData.type,
        rarity: characterData.rarity,
        background: characterData.background,
        traits: characterData.traits,
        specialties: characterData.specialties,
        abilities: characterData.abilities,
        reputation: characterData.reputation,
        resources,
        influence,
        currentNarrative: characterData.narrativeId,
      });
      
      // Save the character
      const savedCharacter = await character.save();
      
      // If there's a narrativeId, add character to the narrative
      if (characterData.narrativeId) {
        await Narrative.findByIdAndUpdate(
          characterData.narrativeId,
          {
            $push: {
              characters: {
                character: savedCharacter._id,
                role: characterData.role || 'neutral',
                isActive: true,
                joinedAt: new Date(),
              },
            },
          }
        );
      }
      
      return savedCharacter;
    } catch (error) {
      console.error('Error saving character to database:', error.message);
      throw error;
    }
  }

  /**
   * Find suitable narrative recommendations for a character
   * @param {string} characterId - Character ID
   * @param {number} limit - Max number of recommendations to return
   * @returns {Promise<Array>} - List of narrative recommendations
   */
  async recommendNarratives(characterId, limit = 5) {
    try {
      // Fetch character details
      const character = await Character.findById(characterId);
      if (!character) {
        throw new Error(`Character with ID ${characterId} not found`);
      }
      
      // Get character specialties
      const specialties = character.specialties.map(s => s.name);
      
      // Find narratives that match character specialties
      const narratives = await Narrative.find({
        status: 'active',
        visibility: 'public',
        category: { $in: specialties },
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('_id title summary category tags');
      
      // Calculate match score for each narrative
      const recommendations = narratives.map(narrative => {
        // Calculate specialty match score
        const specialtyMatch = specialties.includes(narrative.category) ? 1 : 0;
        
        // Calculate tag match score (if character has related specialties)
        const tagMatch = narrative.tags.filter(tag => specialties.includes(tag)).length / 
                        Math.max(1, narrative.tags.length);
        
        // Calculate final match score
        const matchScore = (specialtyMatch * 0.7) + (tagMatch * 0.3);
        
        return {
          narrativeId: narrative._id,
          title: narrative.title,
          summary: narrative.summary,
          category: narrative.category,
          matchScore: Math.round(matchScore * 100) / 100,
        };
      });
      
      // Sort by match score and return
      return recommendations.sort((a, b) => b.matchScore - a.matchScore);
    } catch (error) {
      console.error('Error finding narrative recommendations:', error.message);
      return [];
    }
  }
}

module.exports = CharacterGenerator; 