/**
 * Narrative Generator Service
 * 
 * Generates interactive narratives based on real-world news and events.
 * This service creates complex narrative structures with characters, scenes,
 * decisions, and potential outcomes.
 */

const { Configuration, OpenAIApi } = require('openai');
const mongoose = require('mongoose');
const NewsAnalyzer = require('../news/newsAnalyzer');

// Import models
const Narrative = require('../../server/models/Narrative');
const Character = require('../../server/models/Character');
const Decision = require('../../server/models/Decision');
const Activity = require('../../server/models/Activity');

// Initialize OpenAI configuration
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

/**
 * Narrative Generator class
 */
class NarrativeGenerator {
  constructor() {
    this.newsAnalyzer = new NewsAnalyzer();
    this.modelVersion = process.env.NARRATIVE_MODEL_VERSION || '1.0.0';
    this.aiModel = process.env.NARRATIVE_AI_MODEL || 'narrative-mastermind';
  }

  /**
   * Generate a complete narrative from news analysis
   * @param {Object} params - Generation parameters
   * @param {string} params.topic - Main topic for the narrative
   * @param {string} params.timeframe - Timeframe to consider ('day', 'week', 'month')
   * @param {Array} params.categories - Categories to include
   * @param {string} params.complexity - Narrative complexity ('simple', 'moderate', 'complex')
   * @returns {Promise<Object>} - Generated narrative data
   */
  async generateNarrative(params) {
    try {
      const { topic, timeframe, categories, complexity } = params;
      
      // Convert timeframe to date range
      const dateRange = this.timeframeToDateRange(timeframe);
      
      // Fetch relevant news
      const newsArticles = await this.newsAnalyzer.fetchNews({
        query: topic,
        from: dateRange.from,
        to: dateRange.to,
        pageSize: 30,
      });
      
      // Cluster news by topic
      const newsClusters = this.newsAnalyzer.clusterNewsByTopic(newsArticles);
      
      // Get the most relevant cluster
      const relevantClusters = Array.from(newsClusters.values())
        .filter(cluster => {
          // Filter by requested categories if provided
          if (categories && categories.length > 0) {
            const clusterCategories = cluster.articles.map(a => a.analysis.category);
            return categories.some(cat => clusterCategories.includes(cat));
          }
          return true;
        })
        .sort((a, b) => {
          // Sort by article count and average relevancy
          const aRelevancy = a.articles.reduce((sum, article) => sum + article.analysis.relevancyScore, 0) / a.articles.length;
          const bRelevancy = b.articles.reduce((sum, article) => sum + article.analysis.relevancyScore, 0) / b.articles.length;
          return (b.articles.length * bRelevancy) - (a.articles.length * aRelevancy);
        });
      
      if (relevantClusters.length === 0) {
        throw new Error('No relevant news clusters found for the provided parameters');
      }
      
      // Generate narrative from the top cluster
      const topCluster = relevantClusters[0];
      const narrativeData = await this.createNarrativeStructure(topCluster, complexity);
      
      return {
        ...narrativeData,
        newsSource: {
          clusterSize: topCluster.articles.length,
          mainTitle: topCluster.mainTitle,
          sources: topCluster.metadata.sources,
        },
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error generating narrative:', error.message);
      throw error;
    }
  }

  /**
   * Create a complete narrative structure based on a news cluster
   * @param {Object} newsCluster - News cluster to base narrative on
   * @param {string} complexity - Desired complexity level
   * @returns {Promise<Object>} - Complete narrative structure
   */
  async createNarrativeStructure(newsCluster, complexity = 'moderate') {
    // Generate base narrative from the news cluster
    const baseNarrative = await this.newsAnalyzer.generateNarrativeSuggestion(newsCluster);
    
    // Enhance the narrative with additional elements based on complexity
    const sceneCount = {
      'simple': 3,
      'moderate': 5,
      'complex': 8,
    }[complexity] || 5;
    
    // Generate scenes
    const scenes = await this.generateScenes(baseNarrative, sceneCount);
    
    // Generate potential characters
    const characterTypes = await this.generateCharacterTypes(baseNarrative, newsCluster);
    
    // Generate possible outcomes
    const outcomes = await this.generateOutcomes(baseNarrative, scenes);
    
    // Build the complete narrative structure
    return {
      title: baseNarrative.title,
      summary: baseNarrative.summary,
      description: baseNarrative.description,
      category: this.determineMainCategory(newsCluster.articles),
      tags: this.extractRelevantTags(newsCluster.articles),
      newsReferences: newsCluster.articles.map(article => ({
        title: article.title,
        url: article.url,
        source: article.source.name,
        publishedAt: article.publishedAt,
        relevance: article.analysis.relevancyScore,
      })).slice(0, 5), // Include top 5 references
      timeline: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days later by default
        realWorldStartDate: new Date(newsCluster.articles[0].publishedAt),
      },
      locations: this.extractLocations(newsCluster),
      characters: characterTypes,
      scenes,
      outcomes,
      generatedBy: {
        aiModel: this.aiModel,
        version: this.modelVersion,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Generate narrative scenes
   * @param {Object} baseNarrative - Base narrative data
   * @param {number} count - Number of scenes to generate
   * @returns {Promise<Array>} - Array of scene objects
   */
  async generateScenes(baseNarrative, count) {
    try {
      const prompt = `
        Generate ${count} sequential scenes for a narrative with the following details:
        
        Title: ${baseNarrative.title}
        Summary: ${baseNarrative.summary}
        
        Character types involved:
        ${baseNarrative.characters.map(c => `- ${c.type} (${c.role})`).join('\n')}
        
        Main decisions to be made:
        ${baseNarrative.decisions.map(d => `- ${d.title}`).join('\n')}
        
        Create a sequence of ${count} scenes with the following structure for each:
        {
          "title": "Scene title",
          "description": "Detailed scene description",
          "status": "pending",
          "location": "Scene location",
          "decisions": [
            {
              "title": "Decision title",
              "description": "Decision description",
              "options": [
                {
                  "text": "Option text",
                  "consequences": "Potential consequences"
                }
              ]
            }
          ]
        }
        
        Organize these scenes into a logical narrative arc with rising action, climax, and resolution.
        Format the response as a JSON array of scene objects.
      `;
      
      const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt,
        temperature: 0.7,
        max_tokens: 2000,
        top_p: 1,
        frequency_penalty: 0.2,
        presence_penalty: 0.1,
      });
      
      // Parse the generated scenes
      const scenes = JSON.parse(response.data.choices[0].text.trim());
      
      // Add timing information to scenes
      const now = new Date();
      const dayInterval = Math.floor(30 / count); // Distribute scenes over ~30 days
      
      return scenes.map((scene, index) => {
        const startTime = new Date(now.getTime() + (index * dayInterval * 24 * 60 * 60 * 1000));
        const endTime = new Date(startTime.getTime() + (24 * 60 * 60 * 1000)); // Each scene lasts 1 day
        
        return {
          ...scene,
          startTime,
          endTime,
          // Convert decision format to match our model
          decisions: scene.decisions ? scene.decisions.map(decision => ({
            title: decision.title,
            description: decision.description,
            options: decision.options,
          })) : [],
        };
      });
    } catch (error) {
      console.error('Error generating scenes:', error.message);
      // Return basic scenes as fallback
      return Array(count).fill().map((_, index) => ({
        title: `Scene ${index + 1}`,
        description: `Part ${index + 1} of the narrative "${baseNarrative.title}"`,
        status: 'pending',
        startTime: new Date(Date.now() + (index * 24 * 60 * 60 * 1000)),
        endTime: new Date(Date.now() + ((index + 1) * 24 * 60 * 60 * 1000)),
        decisions: [],
      }));
    }
  }

  /**
   * Generate character types for the narrative
   * @param {Object} baseNarrative - Base narrative data
   * @param {Object} newsCluster - News cluster data
   * @returns {Promise<Array>} - Array of character type objects
   */
  async generateCharacterTypes(baseNarrative, newsCluster) {
    try {
      // Extract entities from news cluster
      const entities = newsCluster.metadata.entities;
      
      // Start with characters from base narrative
      const baseCharacters = baseNarrative.characters || [];
      
      // Create the detailed character prompt
      const prompt = `
        Generate detailed character types for a narrative based on real-world news:
        
        Narrative title: ${baseNarrative.title}
        Real people involved: ${entities.people.join(', ')}
        Organizations involved: ${entities.organizations.join(', ')}
        
        Initial character concepts:
        ${baseCharacters.map(c => `- ${c.type} (${c.role}): ${c.description || 'No description'}`).join('\n')}
        
        For each character type, provide:
        1. A detailed background summary
        2. Key traits (rational/emotional, traditional/innovative, etc.)
        3. Specialties (politics, economics, technology, etc.)
        4. Starting reputation values
        
        Format the response as a JSON array of character objects:
        [
          {
            "role": "protagonist/antagonist/supporter/neutral/observer",
            "type": "politician/journalist/business/activist/diplomat/etc",
            "background": {
              "summary": "Character background",
              "motivation": "Character motivation"
            },
            "traits": {
              "rational": 1-10,
              "emotional": 1-10,
              "traditional": 1-10,
              "innovative": 1-10,
              "individual": 1-10,
              "collective": 1-10
            },
            "specialties": [
              {"name": "specialty name", "level": 1-10}
            ]
          }
        ]
        
        Generate 4-6 diverse character types that would create interesting dynamics in this narrative.
      `;
      
      const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt,
        temperature: 0.8,
        max_tokens: 2000,
        top_p: 1,
        frequency_penalty: 0.3,
        presence_penalty: 0.3,
      });
      
      // Parse the generated characters
      return JSON.parse(response.data.choices[0].text.trim());
    } catch (error) {
      console.error('Error generating character types:', error.message);
      // Return basic character types as fallback
      return baseNarrative.characters || [
        {
          role: 'protagonist',
          type: 'journalist',
          background: {
            summary: 'An investigative journalist seeking the truth',
            motivation: 'To uncover hidden facts and inform the public',
          },
          traits: {
            rational: 8,
            emotional: 6,
            traditional: 4,
            innovative: 8,
            individual: 7,
            collective: 5,
          },
          specialties: [
            { name: 'media', level: 8 },
            { name: 'politics', level: 6 },
          ],
        },
        {
          role: 'antagonist',
          type: 'politician',
          background: {
            summary: 'A powerful politician with secrets to hide',
            motivation: 'To maintain power and influence at any cost',
          },
          traits: {
            rational: 7,
            emotional: 4,
            traditional: 8,
            innovative: 3,
            individual: 9,
            collective: 3,
          },
          specialties: [
            { name: 'politics', level: 9 },
            { name: 'diplomacy', level: 7 },
          ],
        },
      ];
    }
  }

  /**
   * Generate possible narrative outcomes
   * @param {Object} baseNarrative - Base narrative data
   * @param {Array} scenes - Generated scenes
   * @returns {Promise<Array>} - Array of outcome objects
   */
  async generateOutcomes(baseNarrative, scenes) {
    try {
      // Extract key decisions from scenes
      const keyDecisions = scenes
        .flatMap(scene => scene.decisions || [])
        .map(decision => decision.title)
        .slice(0, 5); // Take max 5 key decisions
      
      const prompt = `
        Generate possible outcomes for a narrative based on key decision points:
        
        Narrative title: ${baseNarrative.title}
        Narrative summary: ${baseNarrative.summary}
        
        Key decision points:
        ${keyDecisions.map(d => `- ${d}`).join('\n')}
        
        Generate 3-5 different possible outcomes for this narrative, ranging from best-case to worst-case scenarios.
        For each outcome, specify what triggers or conditions would lead to this outcome.
        
        Format the response as a JSON array of outcome objects:
        [
          {
            "title": "Outcome title",
            "description": "Detailed description of the outcome and its implications",
            "triggerConditions": "What decisions or events would trigger this outcome",
            "isRevealed": false
          }
        ]
      `;
      
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
      // Return basic outcomes as fallback
      return [
        {
          title: 'Positive Resolution',
          description: 'The situation is resolved favorably, with truth prevailing and justice served.',
          triggerConditions: 'Making ethical choices and pursuing truth throughout the narrative.',
          isRevealed: false,
        },
        {
          title: 'Ambiguous Conclusion',
          description: 'The situation reaches a morally complex resolution with both positive and negative elements.',
          triggerConditions: 'Making a mix of pragmatic and principled decisions throughout the narrative.',
          isRevealed: false,
        },
        {
          title: 'Negative Outcome',
          description: 'The situation deteriorates, with cover-ups succeeding and wrongdoers escaping justice.',
          triggerConditions: 'Making compromised choices or failing key challenges throughout the narrative.',
          isRevealed: false,
        },
      ];
    }
  }

  /**
   * Create a new narrative in the database
   * @param {Object} narrativeData - Complete narrative data
   * @returns {Promise<Object>} - Created narrative document
   */
  async saveNarrativeToDatabase(narrativeData) {
    try {
      // Create new narrative document
      const narrative = new Narrative({
        title: narrativeData.title,
        summary: narrativeData.summary,
        description: narrativeData.description,
        category: narrativeData.category,
        tags: narrativeData.tags,
        status: 'draft',
        visibility: 'public',
        newsReferences: narrativeData.newsReferences,
        timeline: narrativeData.timeline,
        locations: narrativeData.locations,
        scenes: narrativeData.scenes,
        outcomes: narrativeData.outcomes,
        generatedBy: narrativeData.generatedBy,
      });
      
      // Save the narrative
      const savedNarrative = await narrative.save();
      
      return savedNarrative;
    } catch (error) {
      console.error('Error saving narrative to database:', error.message);
      throw error;
    }
  }

  /**
   * Determine main category for the narrative based on news articles
   * @param {Array} articles - News articles
   * @returns {string} - Main category
   */
  determineMainCategory(articles) {
    const categoryCounts = articles.reduce((counts, article) => {
      const category = article.analysis.category;
      counts[category] = (counts[category] || 0) + 1;
      return counts;
    }, {});
    
    // Find category with highest count
    return Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0])[0] || 'other';
  }

  /**
   * Extract relevant tags from news articles
   * @param {Array} articles - News articles
   * @returns {Array} - List of relevant tags
   */
  extractRelevantTags(articles) {
    // Collect all tags with their frequency
    const tagCounts = articles.reduce((counts, article) => {
      (article.analysis.tags || []).forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
      return counts;
    }, {});
    
    // Get top 10 tags
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => entry[0]);
  }

  /**
   * Extract locations from news cluster
   * @param {Object} newsCluster - News cluster
   * @returns {Array} - List of location objects
   */
  extractLocations(newsCluster) {
    const locationSet = new Set(newsCluster.metadata.entities.locations);
    return Array.from(locationSet).map(location => ({
      name: location,
      description: `Location mentioned in news related to ${newsCluster.mainTitle}`,
    }));
  }

  /**
   * Convert timeframe string to date range
   * @param {string} timeframe - Timeframe string ('day', 'week', 'month')
   * @returns {Object} - Date range object with from and to dates
   */
  timeframeToDateRange(timeframe) {
    const now = new Date();
    const to = now.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    let from;
    switch (timeframe) {
      case 'day':
        // 1 day ago
        from = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        break;
      case 'week':
        // 7 days ago
        from = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
      case 'month':
        // 30 days ago
        from = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        break;
      default:
        // Default to 7 days ago
        from = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    }
    
    return {
      from: from.toISOString().split('T')[0],
      to,
    };
  }
}

module.exports = NarrativeGenerator; 