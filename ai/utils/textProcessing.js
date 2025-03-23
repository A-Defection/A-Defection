/**
 * Text Processing Utilities
 * 
 * Common text processing functions used by AI services.
 */

const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;
const TfIdf = natural.TfIdf;

/**
 * Process text by tokenizing, stemming and removing stopwords
 * @param {string} text - Input text to process
 * @returns {string[]} - Array of processed tokens
 */
function processText(text) {
  if (!text) return [];
  
  // Convert to lowercase
  const lowercaseText = text.toLowerCase();
  
  // Tokenize
  const tokens = tokenizer.tokenize(lowercaseText);
  
  // Remove stopwords and stem
  const stopwords = getStopwords();
  const processedTokens = tokens
    .filter(token => !stopwords.includes(token))
    .map(token => stemmer.stem(token));
  
  return processedTokens;
}

/**
 * Calculate similarity score between two texts
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @returns {number} - Similarity score (0-1)
 */
function calculateSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;
  
  const tokens1 = processText(text1);
  const tokens2 = processText(text2);
  
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  
  // Calculate Jaccard similarity
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

/**
 * Extract keywords from text
 * @param {string} text - Input text
 * @param {number} count - Number of keywords to extract
 * @returns {string[]} - Array of keywords
 */
function extractKeywords(text, count = 5) {
  if (!text) return [];
  
  const tfidf = new TfIdf();
  tfidf.addDocument(text);
  
  const keywords = [];
  tfidf.listTerms(0)
    .slice(0, count)
    .forEach(item => {
      keywords.push(item.term);
    });
  
  return keywords;
}

/**
 * Summarize text to a specified length
 * @param {string} text - Input text to summarize
 * @param {number} sentenceCount - Number of sentences in summary
 * @returns {string} - Summarized text
 */
function summarizeText(text, sentenceCount = 3) {
  if (!text) return '';
  
  // Split into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  
  if (sentences.length <= sentenceCount) {
    return text;
  }
  
  // Calculate sentence scores based on keyword frequency
  const keywords = extractKeywords(text, 10);
  const sentenceScores = sentences.map(sentence => {
    let score = 0;
    const processedSentence = sentence.toLowerCase();
    
    keywords.forEach(keyword => {
      if (processedSentence.includes(keyword)) {
        score += 1;
      }
    });
    
    return { sentence, score };
  });
  
  // Sort by score and take top sentences
  const topSentences = sentenceScores
    .sort((a, b) => b.score - a.score)
    .slice(0, sentenceCount)
    .map(item => item.sentence);
  
  // Reorder sentences to maintain original flow
  const orderedSentences = [];
  sentences.forEach(sentence => {
    if (topSentences.includes(sentence)) {
      orderedSentences.push(sentence);
    }
  });
  
  return orderedSentences.join(' ');
}

/**
 * Get list of English stopwords
 * @returns {string[]} - Array of stopwords
 */
function getStopwords() {
  return [
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
    'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
    'between', 'both', 'but', 'by', 'can', 'did', 'do', 'does', 'doing', 'down',
    'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having',
    'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i',
    'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most',
    'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only',
    'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 's', 'same',
    'she', 'should', 'so', 'some', 'such', 't', 'than', 'that', 'the', 'their',
    'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those',
    'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were',
    'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with',
    'would', 'you', 'your', 'yours', 'yourself', 'yourselves'
  ];
}

module.exports = {
  processText,
  calculateSimilarity,
  extractKeywords,
  summarizeText
}; 