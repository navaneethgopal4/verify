import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import nlp from 'compromise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Load Domain Database
let domainsDb = {};
try {
  const domainsData = fs.readFileSync(path.join(__dirname, 'domains.json'), 'utf8');
  domainsDb = JSON.parse(domainsData);
} catch (error) {
  console.error("Failed to load domains database:", error);
}

// Custom lists for analysis
const CLICKBAIT_PATTERNS = [
  /\b(you won'?t believe|shocking|mind-blowing|miraculous|instant cure|secret they don'?t want you to know|exposed|viral|unbelievable|omg|watch before it'?s deleted|gasp|blew my mind)\b/i,
  /\b(\d+ things you didn'?t know|reasons why you should|this is what happens when|why you need to)\b/i,
  /\b(will change your life|heartbreaking|tearjerker|restores faith in humanity|crying)\b/i,
  /\b(proof|100% real|absolutely true|guaranteed|must see|insane|crazy)\b/i
];

const BIAS_WORDS = {
  strong_positive: ['glorious', 'savior', 'miracle', 'absolute truth', 'undeniable', 'flawless', 'triumph', 'heroic', 'visionary', 'magical'],
  strong_negative: ['evil', 'disaster', 'corruption', 'lying', 'propaganda', 'destruction', 'conspiracy', 'scandal', 'horrific', 'disgraceful', 'criminal', 'treason', 'atrocity'],
  sensationalist: ['outrageous', 'terrible', 'monstrous', 'unprecedented', 'shocking', 'devastating', 'catastrophic', 'chaotic', 'furious', 'slams', 'blasts', 'demolishes', 'eviscerates', 'epic']
};

const GRAMMAR_FALLACIES = [
  /\b(obviously|clearly|undoubtedly|everyone knows that|as we all know)\b/i, // Appeal to common belief
  /\b(always|never|completely|totally|entirely|100%|infinite|absolute)\b/i, // Generalization
  /\b(trust me|believe me|mark my words)\b/i // Personal assertion
];

// Helper to extract domain from URL
function getDomainName(urlStr) {
  try {
    const parsed = new URL(urlStr);
    let hostname = parsed.hostname;
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    return hostname.toLowerCase();
  } catch (e) {
    return null;
  }
}

// Scrape URL text content
async function scrapeUrl(targetUrl) {
  try {
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    
    // Remove scripts, styles, navs, headers, footers
    $('script, style, nav, footer, header, noscript, iframe, ads').remove();

    const title = $('title').text() || $('h1').first().text() || '';
    
    // Try to find the main article container
    let bodyText = '';
    const mainSelectors = ['article', '.article-body', '.post-content', '.entry-content', 'main', '.content'];
    let articleEl = null;

    for (const selector of mainSelectors) {
      const el = $(selector);
      if (el.length > 0) {
        articleEl = el;
        break;
      }
    }

    if (articleEl) {
      bodyText = articleEl.find('p').map((i, el) => $(el).text()).get().join('\n\n');
    }

    // Fallback: get all paragraph texts
    if (!bodyText || bodyText.length < 200) {
      bodyText = $('p').map((i, el) => $(el).text()).get().join('\n\n');
    }

    // Fallback 2: just body text
    if (!bodyText || bodyText.length < 200) {
      bodyText = $('body').text().replace(/\s+/g, ' ');
    }

    return {
      title: title.trim(),
      body: bodyText.trim().substring(0, 15000), // Cap length
      domain: getDomainName(targetUrl)
    };
  } catch (error) {
    console.error(`Scraping failed for ${targetUrl}:`, error.message);
    throw new Error(`Failed to access the website. Details: ${error.message}`);
  }
}

// Scrape search results from DuckDuckGo for cross-referencing
async function queryDuckDuckGo(query) {
  try {
    const formattedQuery = encodeURIComponent(query);
    const searchUrl = `https://html.duckduckgo.com/html/?q=${formattedQuery}`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      },
      timeout: 8000
    });
    
    const $ = cheerio.load(response.data);
    const results = [];
    
    $('.result').each((i, element) => {
      if (i >= 8) return; // Limit to top 8
      
      const titleEl = $(element).find('.result__title');
      const snippetEl = $(element).find('.result__snippet');
      const urlEl = $(element).find('.result__url');
      
      const title = titleEl.text().trim();
      const snippet = snippetEl.text().trim();
      const urlText = urlEl.text().trim();
      
      let fullUrl = '';
      const anchor = titleEl.find('a');
      if (anchor.attr('href')) {
        // Handle redirect urls if present
        const href = anchor.attr('href');
        if (href.startsWith('//')) {
          fullUrl = 'https:' + href;
        } else if (href.startsWith('/')) {
          fullUrl = 'https://duckduckgo.com' + href;
        } else {
          fullUrl = href;
        }
      }
      
      const domain = getDomainName(fullUrl || 'https://' + urlText);
      
      if (title && snippet) {
        results.push({ title, snippet, domain, url: fullUrl });
      }
    });
    
    return results;
  } catch (error) {
    console.warn("DuckDuckGo scraping failed or throttled:", error.message);
    return null; // Return null so caller knows it failed
  }
}

// NLP & Heuristic Analysis Core Engine
function analyzeContent(title, body, sourceDomain) {
  const fullText = `${title}\n\n${body}`;
  const doc = nlp(fullText);
  const sentences = doc.sentences().out('array');
  
  // 1. Clickbait Analysis (Title Focus)
  let clickbaitScore = 0;
  let clickbaitReasons = [];
  
  // Title specifics
  const titleCapitals = (title.match(/[A-Z]/g) || []).length;
  const titleChars = title.replace(/\s/g, '').length;
  const capRatio = titleChars > 0 ? titleCapitals / titleChars : 0;
  
  if (capRatio > 0.35 && title.length > 10) {
    clickbaitScore += 25;
    clickbaitReasons.push("Title has high capitalization (ALL CAPS formatting)");
  }
  
  if ((title.match(/!/g) || []).length >= 2) {
    clickbaitScore += 20;
    clickbaitReasons.push("Excessive exclamation points (!) in headline");
  }
  if ((title.match(/\?/g) || []).length >= 2) {
    clickbaitScore += 15;
    clickbaitReasons.push("Multiple question marks (?) in headline");
  }
  
  for (const pattern of CLICKBAIT_PATTERNS) {
    if (pattern.test(title)) {
      clickbaitScore += 30;
      clickbaitReasons.push("Sensational clickbait phrase detected in headline");
      break;
    }
  }
  
  clickbaitScore = Math.min(clickbaitScore, 100);
  
  // 2. Linguistic Bias & Sentiment (Body Focus)
  let totalWords = body.split(/\s+/).length;
  let emotionalWordCount = 0;
  let subjectivePhrasesCount = 0;
  
  let flaggedSentences = []; // Detailed data for visual highlighting
  
  sentences.forEach((sentence) => {
    let sentenceIssues = [];
    let sentenceScore = 0;
    
    // Check clickbait/sensationalism in sentence
    for (const pattern of CLICKBAIT_PATTERNS) {
      if (pattern.test(sentence)) {
        sentenceScore += 35;
        sentenceIssues.push("Sensational clickbait language");
      }
    }
    
    // Check emotional bias words
    let posCount = 0;
    let negCount = 0;
    let sensCount = 0;
    
    BIAS_WORDS.strong_positive.forEach(word => {
      if (new RegExp('\\b' + word + '\\b', 'i').test(sentence)) { posCount++; emotionalWordCount++; }
    });
    BIAS_WORDS.strong_negative.forEach(word => {
      if (new RegExp('\\b' + word + '\\b', 'i').test(sentence)) { negCount++; emotionalWordCount++; }
    });
    BIAS_WORDS.sensationalist.forEach(word => {
      if (new RegExp('\\b' + word + '\\b', 'i').test(sentence)) { sensCount++; emotionalWordCount++; }
    });
    
    if (posCount + negCount + sensCount > 0) {
      sentenceScore += (posCount + negCount + sensCount) * 15;
      sentenceIssues.push("Highly emotional or biased terms");
    }
    
    // Check logical fallacies or assertions
    GRAMMAR_FALLACIES.forEach(regex => {
      if (regex.test(sentence)) {
        subjectivePhrasesCount++;
        sentenceScore += 20;
        sentenceIssues.push("Logical assertion or generalization");
      }
    });
    
    if (sentenceScore > 0) {
      flaggedSentences.push({
        text: sentence,
        score: Math.min(sentenceScore, 100),
        reasons: sentenceIssues
      });
    } else {
      flaggedSentences.push({ text: sentence, score: 0, reasons: [] });
    }
  });

  // Calculate density of emotional words
  const emotionalDensity = totalWords > 0 ? (emotionalWordCount / totalWords) * 100 : 0;
  const biasScore = Math.min(Math.round(emotionalDensity * 12 + subjectivePhrasesCount * 4), 100);
  
  // 3. Domain Trust Score
  let domainInfo = { category: 'unrated', trustScore: 60, description: 'Unknown domain. Heuristics will apply standard validation.', name: 'Independent Source' };
  
  if (sourceDomain) {
    if (domainsDb[sourceDomain]) {
      domainInfo = { ...domainsDb[sourceDomain] };
    } else {
      // Apply sub-domain check (e.g. news.bbc.co.uk -> bbc.co.uk)
      const domainParts = sourceDomain.split('.');
      if (domainParts.length > 2) {
        const rootDomain = domainParts.slice(-2).join('.');
        const parentDomain = domainParts.slice(-3).join('.');
        if (domainsDb[parentDomain]) {
          domainInfo = { ...domainsDb[parentDomain] };
        } else if (domainsDb[rootDomain]) {
          domainInfo = { ...domainsDb[rootDomain] };
        }
      }
      
      // Fallback domain analysis
      if (domainInfo.category === 'unrated') {
        if (sourceDomain.endsWith('.gov') || sourceDomain.endsWith('.edu')) {
          domainInfo.trustScore = 95;
          domainInfo.category = 'trusted';
          domainInfo.description = 'Official government or educational publication.';
          domainInfo.name = sourceDomain;
        } else if (sourceDomain.endsWith('.co') || sourceDomain.endsWith('.xyz') || sourceDomain.endsWith('.info') || sourceDomain.endsWith('.click')) {
          domainInfo.trustScore = 40;
          domainInfo.category = 'clickbait';
          domainInfo.description = 'Domain extension is frequently associated with temporary/unverified outlets.';
          domainInfo.name = sourceDomain;
        } else {
          domainInfo.name = sourceDomain;
        }
      }
    }
  }

  return {
    clickbait: {
      score: clickbaitScore,
      reasons: clickbaitReasons
    },
    bias: {
      score: biasScore,
      emotionalDensity: parseFloat(emotionalDensity.toFixed(2)),
      subjectivePhrases: subjectivePhrasesCount
    },
    domain: domainInfo,
    flaggedSentences
  };
}

// Compute consensus based on search coverage
function calculateConsensus(searchQuery, searchResults, sourceDomain) {
  if (!searchResults) {
    return {
      score: 55, // Neutral fallback
      unverified: true,
      reason: "Could not fetch web consensus (offline or connection throttled). Using local heuristic assessment.",
      references: []
    };
  }

  if (searchResults.length === 0) {
    return {
      score: 30,
      unverified: false,
      reason: "No web coverage found for this topic. Low consensus indicating unverified viral claim.",
      references: []
    };
  }

  let trustMatchCount = 0;
  let debunkCount = 0;
  let neutralCount = 0;
  const references = [];

  const debunkRegex = /\b(debunked|hoax|fake news|fake|false claim|misleading|untrue|myth|not real|fact check|snopes|politifact)\b/i;

  searchResults.forEach(result => {
    let status = 'neutral';
    
    // Check if result matches a known trusted domain
    let isTrustedDomain = false;
    if (result.domain) {
      const dbInfo = domainsDb[result.domain];
      if (dbInfo && dbInfo.category === 'trusted') {
        isTrustedDomain = true;
        trustMatchCount++;
        status = 'trusted';
      }
    }

    // Check if result contains debunk phrases
    const fullText = `${result.title} ${result.snippet}`.toLowerCase();
    if (debunkRegex.test(fullText)) {
      debunkCount++;
      status = 'debunk';
    }

    // Don't count the original source as external consensus
    if (result.domain && sourceDomain && result.domain === sourceDomain) {
      return; 
    }

    references.push({
      title: result.title,
      url: result.url,
      domain: result.domain || 'web',
      snippet: result.snippet,
      status
    });
  });

  // Score algorithm for consensus:
  // - Start at neutral (50)
  // - Adding trusted sources boosts score: +15 per trusted source (max 40)
  // - Debunking phrases heavily lowers score: -25 per match (max -50)
  // - If trusted sources confirm but also debunk matches are high, it gets classified as a debated hoax.
  let consensusScore = 50 + (trustMatchCount * 15) - (debunkCount * 25);
  consensusScore = Math.max(0, Math.min(consensusScore, 100));

  let reason = "Moderate web coverage. Mixed consensus.";
  if (debunkCount > 0) {
    reason = `Critical: Multiple search reports flag this statement as a ${debunkCount > 1 ? 'debunked hoax or false claim' : 'unverified claim'}.`;
  } else if (trustMatchCount >= 2) {
    reason = `High coverage: Verified by multiple reputable media agencies (${trustMatchCount} trusted sources found).`;
  } else if (trustMatchCount === 0 && searchResults.length > 3) {
    reason = "Widespread reporting found, but primarily from low-trust or unverified domains.";
  }

  return {
    score: consensusScore,
    reason,
    references: references.slice(0, 5) // Return top 5
  };
}

// MAIN API: /api/verify
app.post('/api/verify', async (req, res) => {
  const { url, text } = req.body;
  
  if (!url && !text) {
    return res.status(400).json({ error: "Please provide either a URL or raw text to verify." });
  }

  try {
    let title = '';
    let body = '';
    let sourceDomain = null;
    let isUrlSearch = false;

    if (url) {
      isUrlSearch = true;
      const scraped = await scrapeUrl(url);
      title = scraped.title;
      body = scraped.body;
      sourceDomain = scraped.domain;
    } else {
      // Parse raw text
      const lines = text.trim().split('\n');
      title = lines[0].substring(0, 200); // Take first line as title
      body = lines.length > 1 ? lines.slice(1).join('\n') : text;
    }

    if (!title || (!body && body.length < 5)) {
      return res.status(400).json({ error: "Incomplete content extracted. Please input longer text or a valid news page." });
    }

    // 1. Run local heuristics
    const analysis = analyzeContent(title, body, sourceDomain);
    
    // 2. Run web search consensus check
    // We clean the search query by removing small filler words to focus on key claims
    const cleanQuery = title
      .replace(/[^\w\s]/gi, '')
      .split(/\s+/)
      .slice(0, 10) // First 10 words
      .join(' ');
      
    const searchResults = await queryDuckDuckGo(cleanQuery);
    const consensus = calculateConsensus(cleanQuery, searchResults, sourceDomain);

    // 3. Compute overall composite score
    // Weights:
    // - Domain trust: 35%
    // - Clickbait level: 20% (lower clickbait is better: (100 - score))
    // - Bias level: 20% (lower bias is better: (100 - score))
    // - Web Consensus: 25%
    const domainWeight = 0.35;
    const clickbaitWeight = 0.20;
    const biasWeight = 0.20;
    const consensusWeight = 0.25;

    const domainTrustFactor = analysis.domain.trustScore;
    const clickbaitFactor = 100 - analysis.clickbait.score;
    const biasFactor = 100 - analysis.bias.score;
    const consensusFactor = consensus.score;

    // Satire override
    let finalScore = 0;
    let ratingTier = 'neutral';
    
    if (analysis.domain.isSatire) {
      finalScore = 15; // Set low factual score for satire
      ratingTier = 'satire';
    } else {
      finalScore = Math.round(
        (domainTrustFactor * domainWeight) +
        (clickbaitFactor * clickbaitWeight) +
        (biasFactor * biasWeight) +
        (consensusFactor * consensusWeight)
      );
      
      if (finalScore >= 75) {
        ratingTier = 'verified';
      } else if (finalScore >= 45) {
        ratingTier = 'mixed';
      } else {
        ratingTier = 'unreliable';
      }
    }

    // Assemble payload
    return res.json({
      title,
      body: body.substring(0, 2000), // Return sample body
      sourceDomain,
      isUrlSearch,
      finalScore,
      ratingTier,
      analysis: {
        domain: {
          name: analysis.domain.name,
          category: analysis.domain.category,
          score: domainTrustFactor,
          description: analysis.domain.description,
          isSatire: !!analysis.domain.isSatire
        },
        clickbait: {
          score: analysis.clickbait.score,
          reasons: analysis.clickbait.reasons
        },
        bias: {
          score: analysis.bias.score,
          emotionalDensity: analysis.bias.emotionalDensity,
          subjectivePhrases: analysis.bias.subjectivePhrases
        },
        consensus: {
          score: consensus.score,
          reason: consensus.reason,
          references: consensus.references
        },
        flaggedSentences: analysis.flaggedSentences
      }
    });

  } catch (error) {
    console.error("Verification processing error:", error);
    return res.status(500).json({ error: error.message || "An internal error occurred while analyzing the content." });
  }
});

// GET general fact-checks via search
app.get('/api/search-factchecks', async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: "Query parameter 'q' is required." });
  }

  try {
    const query = `${q} fact check`;
    const results = await queryDuckDuckGo(query);
    if (!results) {
      return res.status(503).json({ error: "Search service temporarily unavailable." });
    }
    
    return res.json({ query: q, results });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Verify API backend running at http://localhost:${PORT}`);
});
