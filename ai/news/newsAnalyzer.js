/**
 * News Analyzer Service
 * 
 * Processes and analyzes news articles to extract relevant information
 * for narrative generation and event correlation.
 */

const axios = require('axios');
const natural = require('natural');
const { Configuration, OpenAIApi } = require('openai');

// Initialize sentiment analyzer
const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');

// Initialize OpenAI configuration
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

/**
 * News Analyzer class
 */
class NewsAnalyzer {
  constructor() {
    this.newsApiKey = process.env.NEWS_API_KEY;
    this.tokenizer = new natural.WordTokenizer();
    this.tfidf = new natural.TfIdf();
    this.newsCache = new Map(); // For caching news results
    this.topicClusters = new Map(); // For tracking topic clusters
  }

  /**
   * Fetch news articles from multiple sources
   * @param {Object} params - Search parameters
   * @param {string} params.query - Search query
   * @param {string} params.language - Language of news (default: 'en')
   * @param {string} params.from - Start date (format: YYYY-MM-DD)
   * @param {string} params.to - End date (format: YYYY-MM-DD)
   * @param {number} params.pageSize - Number of articles to fetch (default: 20)
   * @returns {Promise<Array>} - Array of news articles
   */
  async fetchNews(params) {
    try {
      const { query, language = 'en', from, to, pageSize = 20 } = params;
      
      // Create cache key from parameters
      const cacheKey = JSON.stringify(params);
      
      // Check if results are cached and not older than 1 hour
      if (this.newsCache.has(cacheKey)) {
        const cachedData = this.newsCache.get(cacheKey);
        const cacheAge = Date.now() - cachedData.timestamp;
        
        // Return cached data if less than 1 hour old
        if (cacheAge < 3600000) {
          return cachedData.articles;
        }
      }
      
      // Fetch from NewsAPI
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: query,
          language,
          from,
          to,
          pageSize,
          apiKey: this.newsApiKey,
          sortBy: 'relevancy'
        }
      });
      
      // Check for successful response
      if (response.status !== 200 || !response.data || !response.data.articles) {
        throw new Error('Failed to fetch news data');
      }
      
      // Process and enrich articles
      const articles = await this.processArticles(response.data.articles);
      
      // Cache the results
      this.newsCache.set(cacheKey, {
        articles,
        timestamp: Date.now()
      });
      
      return articles;
    } catch (error) {
      console.error('Error fetching news:', error.message);
      throw error;
    }
  }

  /**
   * Process and enrich articles with analysis
   * @param {Array} articles - Raw news articles
   * @returns {Promise<Array>} - Processed and enriched articles
   */
  async processArticles(articles) {
    // Add articles to TF-IDF for relevancy scoring
    articles.forEach((article, index) => {
      const content = `${article.title} ${article.description || ''} ${article.content || ''}`;
      this.tfidf.addDocument(content, index.toString());
    });
    
    // Process each article with enriched data
    return Promise.all(articles.map(async (article, index) => {
      // Extract entities
      const entities = await this.extractEntities(article);
      
      // Analyze sentiment
      const content = `${article.title} ${article.description || ''} ${article.content || ''}`;
      const tokens = this.tokenizer.tokenize(content);
      const sentiment = analyzer.getSentiment(tokens);
      
      // Calculate relevancy score based on TF-IDF
      const relevancyScore = this.calculateRelevancy(index);
      
      // Categorize article
      const category = await this.categorizeArticle(article);
      
      // Generate tags
      const tags = await this.generateTags(article);
      
      return {
        ...article,
        analysis: {
          entities,
          sentiment,
          relevancyScore,
          category,
          tags,
          wordCount: tokens.length,
          processedAt: new Date().toISOString(),
        }
      };
    }));
  }

  /**
   * Extract named entities from article
   * @param {Object} article - News article
   * @returns {Promise<Object>} - Extracted entities
   */
  async extractEntities(article) {
    try {
      const content = `${article.title} ${article.description || ''} ${article.content || ''}`;
      
      // Use OpenAI to extract entities
      const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `Extract the named entities (people, organizations, locations, events) from this news text. Format the response as a JSON object with the following structure: {"people": [], "organizations": [], "locations": [], "events": []}\n\nNews text:\n${content}`,
        temperature: 0.3,
        max_tokens: 150,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });
      
      const jsonStr = response.data.choices[0].text.trim();
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('Error extracting entities:', error.message);
      // Return empty structure on error
      return {
        people: [],
        organizations: [],
        locations: [],
        events: []
      };
    }
  }

  /**
   * Calculate relevancy score for an article
   * @param {number} docIndex - Index of document in TF-IDF
   * @returns {number} - Relevancy score (0-1)
   */
  calculateRelevancy(docIndex) {
    let totalScore = 0;
    let maxTerms = 10;
    let count = 0;
    
    // Get terms with highest TF-IDF scores for this document
    this.tfidf.listTerms(docIndex.toString()).forEach(term => {
      if (count < maxTerms) {
        totalScore += term.tfidf;
        count++;
      }
    });
    
    // Normalize score to 0-1 range
    return count > 0 ? totalScore / (count * 10) : 0;
  }

  /**
   * Categorize article into predefined categories
   * @param {Object} article - News article
   * @returns {Promise<string>} - Category
   */
  async categorizeArticle(article) {
    try {
      const content = `${article.title} ${article.description || ''}`;
      
      // Use OpenAI to categorize
      const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `Categorize this news article into ONE of the following categories: politics, economics, technology, environment, culture, military, diplomacy, science, healthcare, education, crime, disaster, entertainment, sports, other.\n\nNews text:\n${content}\n\nCategory:`,
        temperature: 0.3,
        max_tokens: 10,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });
      
      return response.data.choices[0].text.trim().toLowerCase();
    } catch (error) {
      console.error('Error categorizing article:', error.message);
      return 'other';
    }
  }

  /**
   * Generate tags for an article
   * @param {Object} article - News article
   * @returns {Promise<Array>} - Array of tags
   */
  async generateTags(article) {
    try {
      const content = `${article.title} ${article.description || ''}`;
      
      // Use OpenAI to generate tags
      const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: `Generate 5 relevant tags for this news article. Format as a JSON array of strings.\n\nNews text:\n${content}\n\nTags:`,
        temperature: 0.5,
        max_tokens: 100,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });
      
      const jsonStr = response.data.choices[0].text.trim();
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('Error generating tags:', error.message);
      // Extract simple keywords as fallback
      const content = `${article.title} ${article.description || ''}`;
      const tokens = this.tokenizer.tokenize(content);
      const keywords = tokens.filter(token => token.length > 4).slice(0, 5);
      return [...new Set(keywords)]; // Unique keywords
    }
  }

  /**
   * Cluster news articles into related topics
   * @param {Array} articles - Processed news articles
   * @returns {Map} - Map of topic clusters
   */
  clusterNewsByTopic(articles) {
    // Reset topic clusters
    this.topicClusters = new Map();
    
    // Simple clustering based on common entities and tags
    articles.forEach(article => {
      let assigned = false;
      
      // Try to find existing cluster
      for (const [topicId, cluster] of this.topicClusters.entries()) {
        const similarity = this.calculateTopicSimilarity(article, cluster.articles[0]);
        
        if (similarity > 0.5) { // Threshold for similarity
          cluster.articles.push(article);
          assigned = true;
          break;
        }
      }
      
      // Create new cluster if not assigned to existing one
      if (!assigned) {
        const topicId = `topic_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        this.topicClusters.set(topicId, {
          id: topicId,
          mainTitle: article.title,
          articles: [article],
          createdAt: new Date().toISOString(),
        });
      }
    });
    
    // Update cluster metadata
    for (const cluster of this.topicClusters.values()) {
      // Calculate average sentiment
      const avgSentiment = cluster.articles.reduce((sum, article) => {
        return sum + article.analysis.sentiment;
      }, 0) / cluster.articles.length;
      
      // Collect all entities
      const allEntities = {
        people: new Set(),
        organizations: new Set(),
        locations: new Set(),
        events: new Set(),
      };
      
      cluster.articles.forEach(article => {
        const entities = article.analysis.entities;
        entities.people.forEach(person => allEntities.people.add(person));
        entities.organizations.forEach(org => allEntities.organizations.add(org));
        entities.locations.forEach(loc => allEntities.locations.add(loc));
        entities.events.forEach(event => allEntities.events.add(event));
      });
      
      // Convert Sets to Arrays
      const entities = {
        people: Array.from(allEntities.people),
        organizations: Array.from(allEntities.organizations),
        locations: Array.from(allEntities.locations),
        events: Array.from(allEntities.events),
      };
      
      // Update cluster metadata
      cluster.metadata = {
        articleCount: cluster.articles.length,
        sentiment: avgSentiment,
        entities,
        sources: [...new Set(cluster.articles.map(article => article.source.name))],
        updatedAt: new Date().toISOString(),
      };
    }
    
    return this.topicClusters;
  }

  /**
   * Calculate similarity between articles for topic clustering
   * @param {Object} article1 - First article
   * @param {Object} article2 - Second article
   * @returns {number} - Similarity score (0-1)
   */
  calculateTopicSimilarity(article1, article2) {
    let score = 0;
    
    // Compare entities
    const entities1 = article1.analysis.entities;
    const entities2 = article2.analysis.entities;
    
    // Check people overlap
    const peopleOverlap = entities1.people.filter(person => 
      entities2.people.includes(person)).length;
    score += peopleOverlap * 0.2;
    
    // Check organizations overlap
    const orgsOverlap = entities1.organizations.filter(org => 
      entities2.organizations.includes(org)).length;
    score += orgsOverlap * 0.2;
    
    // Check locations overlap
    const locsOverlap = entities1.locations.filter(loc => 
      entities2.locations.includes(loc)).length;
    score += locsOverlap * 0.1;
    
    // Check events overlap
    const eventsOverlap = entities1.events.filter(event => 
      entities2.events.includes(event)).length;
    score += eventsOverlap * 0.3;
    
    // Compare tags
    const tagsOverlap = article1.analysis.tags.filter(tag => 
      article2.analysis.tags.includes(tag)).length;
    score += (tagsOverlap / Math.max(article1.analysis.tags.length, 1)) * 0.2;
    
    return Math.min(score, 1); // Cap at 1.0
  }

  /**
   * Generate narrative suggestion based on news cluster
   * @param {Object} cluster - News topic cluster
   * @returns {Promise<Object>} - Narrative suggestion
   */
  async generateNarrativeSuggestion(cluster) {
    try {
      // Combine key information from the cluster
      const mainArticle = cluster.articles[0];
      const entitySummary = JSON.stringify(cluster.metadata.entities);
      const articleSources = cluster.metadata.sources.join(', ');
      
      const prompt = `
        Generate a narrative scenario for an interactive story based on this news cluster.
        
        News Cluster Information:
        - Main Title: ${cluster.mainTitle}
        - Number of Articles: ${cluster.metadata.articleCount}
        - Sources: ${articleSources}
        - Key Entities: ${entitySummary}
        - Overall Sentiment: ${cluster.metadata.sentiment > 0 ? 'Positive' : cluster.metadata.sentiment < 0 ? 'Negative' : 'Neutral'}
        
        Main Article:
        ${mainArticle.title}
        ${mainArticle.description || ''}
        
        Generate a narrative in JSON format with the following structure:
        {
          "title": "Narrative title",
          "summary": "Brief narrative summary",
          "description": "Detailed narrative description",
          "characters": [
            {
              "type": "politician/journalist/business/etc",
              "role": "protagonist/antagonist/supporter/etc",
              "description": "Character description"
            }
          ],
          "decisions": [
            {
              "title": "Decision point title",
              "description": "Decision point description",
              "options": [
                {
                  "text": "Option text",
                  "consequences": "Potential consequences"
                }
              ]
            }
          ],
          "predictableEvents": [
            {
              "description": "Potentially predictable event",
              "timeframe": "short-term/medium-term/long-term"
            }
          ]
        }
      `;
      
      // Use OpenAI to generate narrative suggestion
      const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt,
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });
      
      // Parse and return the narrative suggestion
      const narrative = JSON.parse(response.data.choices[0].text.trim());
      
      return {
        ...narrative,
        newsCluster: {
          id: cluster.id,
          mainTitle: cluster.mainTitle,
          articleCount: cluster.metadata.articleCount,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Error generating narrative suggestion:', error.message);
      throw error;
    }
  }
}

module.exports = NewsAnalyzer; 