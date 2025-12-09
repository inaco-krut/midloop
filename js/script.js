/*
 * Very quick, very rough recreation of the JamHot 'Uncover Edinburgh' effect
 * https://www.thisisjamhot.com/work/uncover-edinburgh
 * 
 * Copyright (c) 2025 by LawrieCape (https://codepen.io/Lawrie/pen/xbZdEWK)
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// TMDB Image Base URL
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/original';


// Security: HTML sanitization function to prevent XSS attacks
function sanitizeHTML(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Security: Validate and sanitize URL to prevent javascript: protocol injection
function sanitizeURL(url) {
  if (typeof url !== 'string') return '';
  // Remove any potential javascript: or data: protocols
  const trimmed = url.trim();
  if (trimmed.toLowerCase().startsWith('javascript:') ||
    trimmed.toLowerCase().startsWith('data:')) {
    return '';
  }
  return trimmed;
}

// ============================================================================
// PHASE 1: FORMATTERS - Unified formatting logic for consistency
// ============================================================================
// Single source of truth for all data formatting across grid and modal.
// This eliminates duplication and ensures consistent display.
const Formatters = {
  /**
   * Format rating display with scale indicator
   * @param {number} rating - The rating value
   * @param {number} ratingMax - Maximum rating scale (10 or 100)
   * @returns {string} Formatted rating string (e.g., "5.7/10" or "78/100")
   */
  ratingDisplay(rating, ratingMax = 10) {
    if (rating === null || rating === undefined || isNaN(rating)) {
      return 'N/A';
    }
    const numRating = parseFloat(rating);
    return `${numRating.toFixed(1)}/${ratingMax}`;
  },

  /**
   * Normalize rating to 0-10 scale for visual representation
   * @param {number} rating - The rating value
   * @param {number} ratingMax - Maximum rating scale (10 or 100)
   * @returns {number} Normalized rating on 0-10 scale
   */
  ratingNormalized(rating, ratingMax = 10) {
    if (rating === null || rating === undefined || isNaN(rating)) {
      return 0;
    }
    const numRating = parseFloat(rating);
    if (ratingMax === 100) {
      return numRating / 10;
    }
    return numRating;
  },

  /**
   * Format runtime from minutes to human-readable format
   * @param {number} minutes - Duration in minutes
   * @returns {string} Formatted runtime (e.g., "1h 31m" or "45m")
   */
  runtimeDisplay(minutes) {
    if (!minutes || isNaN(minutes)) {
      return 'N/A';
    }
    const numMinutes = parseInt(minutes);
    const hours = Math.floor(numMinutes / 60);
    const mins = numMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  },

  /**
   * Format currency value to human-readable format
   * @param {number} amount - Dollar amount
   * @returns {string} Formatted currency (e.g., "$1.4M" or "$5K")
   */
  currencyDisplay(amount) {
    if (!amount || isNaN(amount)) {
      return 'N/A';
    }
    const num = parseInt(amount);
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(0)}K`;
    }
    return `$${num}`;
  },

  /**
   * Format array/list values for display
   * @param {Array} arr - Array to format
   * @param {string} separator - Separator between items (default: ", ")
   * @returns {string} Formatted list (e.g., "HBO, HBO Max")
   */
  arrayDisplay(arr, separator = ', ') {
    if (!Array.isArray(arr) || arr.length === 0) {
      return 'N/A';
    }
    return arr
      .filter(item => item) // Remove null/undefined
      .map(item => sanitizeHTML(String(item)))
      .join(separator);
  },

  /**
   * Format date to human-readable format
   * @param {string|Date} dateString - ISO date string or Date object
   * @param {string} format - 'short' (Jan 1), 'long' (January 1, 2025), 'full'
   * @returns {string} Formatted date
   */
  dateDisplay(dateString, format = 'long') {
    if (!dateString) {
      return 'Coming soon';
    }
    try {
      const dateObj = new Date(dateString);
      if (isNaN(dateObj.getTime())) {
        return 'Coming soon';
      }

      if (format === 'short') {
        return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (format === 'full') {
        return dateObj.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      // 'long' (default)
      return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return 'Coming soon';
    }
  },

  /**
   * Format card date with badge info
   * @param {string} dateString - ISO date string
   * @returns {object} { displayDate, isToday, isAlreadyOut }
   */
  cardDateStatus(dateString) {
    if (!dateString) {
      return {
        displayDate: 'Release Date: TBA',
        isToday: false,
        isAlreadyOut: false
      };
    }

    const dateObj = new Date(dateString);
    const displayDate = dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    // Check status
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(dateObj);
    checkDate.setHours(0, 0, 0, 0);

    const isToday = checkDate.getTime() === today.getTime();
    const isAlreadyOut = checkDate < today;

    return { displayDate, isToday, isAlreadyOut };
  },

  /**
   * Generate badge text based on content type and release status
   * Delegates type-specific logic from UI layer to formatter layer
   * @param {string} itemType - The content type ('tv-show', 'movie', etc.)
   * @param {boolean} isToday - Whether the release is today
   * @returns {string} Badge text to display (e.g., "New<br>Episode<br>Today!")
   */
  releaseBadgeText(itemType, isToday) {
    if (!isToday) {
      return '';
    }

    switch (itemType) {
      case 'tv-show':
        return 'New<br>Episode<br>Today!';
      case 'movie':
        return 'Digital<br>Release<br>Today!';
      default:
        return '';
    }
  }
};

// ============================================================================
// ADAPTER UTILITIES - Shared normalization helpers
// ============================================================================
// Single source of truth for data normalization across all adapters.
// Eliminates duplication and ensures consistency.
const AdapterUtils = {
  /**
   * Normalize poster URL from various sources
   * @param {string|null} posterPath - Path to poster image
   * @param {object} options - Configuration options
   * @param {string} options.baseURL - Base URL for relative paths (default: TMDB_IMAGE_BASE)
   * @param {string} options.placeholder - Placeholder image path
   * @param {boolean} options.isFullURL - Whether posterPath is already a full URL
   * @returns {string} Normalized poster URL
   * 
   * @example
   * // TMDB path
   * normalizePosterURL('/abc123.jpg')
   * // Returns: 'https://image.tmdb.org/t/p/w500/abc123.jpg'
   * 
   * // Full URL (IGDB)
   * normalizePosterURL('https://images.igdb.com/abc.jpg', { isFullURL: true })
   * // Returns: 'https://images.igdb.com/abc.jpg'
   * 
   * // Missing/placeholder
   * normalizePosterURL(null)
   * // Returns: 'shared-data/placeholder_poster.jpg'
   */
  normalizePosterURL(posterPath, options = {}) {
    const {
      baseURL = TMDB_IMAGE_BASE,
      placeholder = 'shared-data/placeholder_poster.jpg',
      isFullURL = false
    } = options;

    // Handle null, undefined, or placeholder values
    if (!posterPath || posterPath === 'placeholder_poster.jpg') {
      return placeholder;
    }

    // Handle full URLs (IGDB, external sources)
    if (isFullURL || posterPath.startsWith('http://') || posterPath.startsWith('https://')) {
      return posterPath;
    }

    // Handle relative paths (TMDB)
    return baseURL + posterPath;
  },

  /**
   * Normalize store URL (Steam, Epic, etc.)
   * @param {string|null} url - Store URL
   * @param {string} platform - Platform name ('steam', 'epic', etc.)
   * @returns {string|null} Validated URL or null
   * 
   * @example
   * normalizeStoreURL('https://store.steampowered.com/app/123', 'steam')
   * // Returns: 'https://store.steampowered.com/app/123'
   * 
   * normalizeStoreURL('invalid-url', 'steam')
   * // Returns: null
   */
  normalizeStoreURL(url, platform) {
    if (!url || typeof url !== 'string') {
      return null;
    }

    // Validate URL format
    try {
      new URL(url);
      return url;
    } catch (e) {
      console.warn(`Invalid ${platform} URL:`, url);
      return null;
    }
  },

  /**
   * Normalize genres from various formats
   * @param {Array|null} genresInput - Genres in various formats
   * @param {Object|null} genreMap - Optional genre ID to name mapping
   * @returns {Array<string>} Array of genre names
   * 
   * @example
   * // TMDB: Array of IDs
   * normalizeGenres([28, 12], genreMap)
   * // Returns: ['Action', 'Adventure']
   * 
   * // IGDB: Array of strings
   * normalizeGenres(['Action', 'Adventure'])
   * // Returns: ['Action', 'Adventure']
   * 
   * // TMDB: Array of objects
   * normalizeGenres([{ id: 28, name: 'Action' }])
   * // Returns: ['Action']
   * 
   * // Empty/null
   * normalizeGenres(null)
   * // Returns: []
   */
  normalizeGenres(genresInput, genreMap = null) {
    // Handle null/undefined
    if (!genresInput || !Array.isArray(genresInput)) {
      return [];
    }

    // Empty array
    if (genresInput.length === 0) {
      return [];
    }

    // Determine format and normalize
    const firstItem = genresInput[0];

    // Format 1: Array of IDs (TMDB) - requires genreMap
    if (typeof firstItem === 'number' && genreMap) {
      return genresInput
        .map(id => genreMap[id])
        .filter(Boolean); // Remove undefined values
    }

    // Format 2: Array of strings (IGDB)
    if (typeof firstItem === 'string') {
      return genresInput.filter(Boolean); // Remove empty strings
    }

    // Format 3: Array of objects with 'name' property (TMDB detailed)
    if (typeof firstItem === 'object' && firstItem !== null && 'name' in firstItem) {
      return genresInput
        .map(genre => genre.name)
        .filter(Boolean);
    }

    // Unknown format
    console.warn('Unknown genre format:', genresInput);
    return [];
  },

  /**
   * Normalize release date from various formats
   * @param {string|number|Date|null} dateInput - Date in various formats
   * @param {string} format - Output format ('iso' or 'date')
   * @returns {string|null} ISO date string or null
   * 
   * @example
   * // ISO string (TMDB)
   * normalizeReleaseDate('2025-01-15')
   * // Returns: '2025-01-15T00:00:00.000Z'
   * 
   * // Unix timestamp (IGDB)
   * normalizeReleaseDate(1705276800)
   * // Returns: '2025-01-15T00:00:00.000Z'
   * 
   * // Date object
   * normalizeReleaseDate(new Date('2025-01-15'))
   * // Returns: '2025-01-15T00:00:00.000Z'
   * 
   * // Null/invalid
   * normalizeReleaseDate(null)
   * // Returns: null
   */
  normalizeReleaseDate(dateInput, format = 'iso') {
    if (!dateInput) {
      return null;
    }

    try {
      let dateObj;

      // Unix timestamp (IGDB) - seconds since epoch
      if (typeof dateInput === 'number') {
        dateObj = new Date(dateInput * 1000);
      }
      // ISO string (TMDB) or Date object
      else if (typeof dateInput === 'string' || dateInput instanceof Date) {
        dateObj = new Date(dateInput);
      }
      // Unknown format
      else {
        console.warn('Unknown date format:', dateInput);
        return null;
      }

      // Validate date
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date:', dateInput);
        return null;
      }

      // Return ISO string
      return dateObj.toISOString();

    } catch (e) {
      console.warn('Error normalizing date:', dateInput, e);
      return null;
    }
  },

  /**
   * Determine display date for TV shows
   * Logic: If show already aired, use next episode date if available
   * @param {string|null} firstAirDate - First air date (ISO string)
   * @param {string|null} nextEpisodeDate - Next episode date (ISO string)
   * @returns {string|null} Display date (ISO string)
   * 
   * @example
   * // Show hasn't aired yet
   * getTVShowDisplayDate('2025-06-01', null)
   * // Returns: '2025-06-01'
   * 
   * // Show already aired, has next episode
   * getTVShowDisplayDate('2024-01-01', '2025-01-15')
   * // Returns: '2025-01-15'
   * 
   * // Show already aired, no next episode
   * getTVShowDisplayDate('2024-01-01', null)
   * // Returns: '2024-01-01'
   */
  getTVShowDisplayDate(firstAirDate, nextEpisodeDate) {
    // No first air date, use next episode if available
    if (!firstAirDate) {
      return nextEpisodeDate || null;
    }

    // Parse dates
    const firstAir = new Date(firstAirDate);
    const today = new Date();

    // Normalize to midnight for comparison
    today.setHours(0, 0, 0, 0);
    firstAir.setHours(0, 0, 0, 0);

    // If show already aired and has next episode, use next episode date
    if (firstAir < today && nextEpisodeDate) {
      return nextEpisodeDate;
    }

    // Otherwise use first air date
    return firstAirDate;
  },

  /**
   * Normalize rating to consistent scale
   * @param {number|null} rating - Rating value
   * @param {number} scale - Current scale (10 or 100)
   * @returns {number|null} Normalized rating
   * 
   * @example
   * // Already on 0-10 scale
   * normalizeRating(7.5, 10)
   * // Returns: 7.5
   * 
   * // Convert from 0-100 scale
   * normalizeRating(75, 100)
   * // Returns: 75 (kept as-is, conversion happens in Formatters)
   * 
   * // Null/invalid
   * normalizeRating(null, 10)
   * // Returns: null
   */
  normalizeRating(rating, scale = 10) {
    if (rating === null || rating === undefined || isNaN(rating)) {
      return null;
    }

    const numRating = parseFloat(rating);

    // Validate range
    if (numRating < 0 || numRating > scale) {
      console.warn(`Rating ${numRating} out of range for scale ${scale}`);
      return null;
    }

    return numRating;
  },

  /**
   * Normalize array data (platforms, developers, networks, etc.)
   * @param {Array|null} input - Array input in various formats
   * @param {string|null} extractProperty - Property to extract from objects
   * @returns {Array<string>} Array of strings
   * 
   * @example
   * // Array of strings
   * normalizeArray(['PC', 'Xbox'])
   * // Returns: ['PC', 'Xbox']
   * 
   * // Array of objects
   * normalizeArray([{ name: 'PC' }, { name: 'Xbox' }], 'name')
   * // Returns: ['PC', 'Xbox']
   * 
   * // Mixed array (objects and strings)
   * normalizeArray([{ name: 'PC' }, 'Xbox'], 'name')
   * // Returns: ['PC', 'Xbox']
   * 
   * // Null/empty
   * normalizeArray(null)
   * // Returns: []
   */
  normalizeArray(input, extractProperty = null) {
    if (!input || !Array.isArray(input)) {
      return [];
    }

    if (input.length === 0) {
      return [];
    }

    // If no property specified, assume array of strings
    if (!extractProperty) {
      return input.filter(item => item && typeof item === 'string');
    }

    // Extract property from objects, handle mixed arrays
    return input
      .map(item => {
        // Already a string
        if (typeof item === 'string') {
          return item;
        }
        // Object with property
        if (typeof item === 'object' && item !== null && extractProperty in item) {
          return item[extractProperty];
        }
        // Unknown format
        return null;
      })
      .filter(Boolean); // Remove null/undefined
  },

  /**
   * Calculate countdown status for upcoming releases
   * Returns countdown information for items releasing within 7 days
   * @param {string|null} releaseDate - Release date (ISO string)
   * @returns {object} Countdown info: { daysUntil: number|null, isCountdown: boolean }
   * 
   * @example
   * // 3 days until release
   * getCountdownStatus('2025-12-07T23:00:00.000Z')
   * // Returns: { daysUntil: 3, isCountdown: true }
   * 
   * // 1 day until release
   * getCountdownStatus('2025-12-06T23:00:00.000Z')
   * // Returns: { daysUntil: 1, isCountdown: true }
   * 
   * // Release today (not countdown)
   * getCountdownStatus('2025-12-04T23:00:00.000Z')
   * // Returns: { daysUntil: 0, isCountdown: false }
   * 
   * // Past date or far future
   * getCountdownStatus('2025-12-01T23:00:00.000Z')
   * // Returns: { daysUntil: null, isCountdown: false }
   */
  getCountdownStatus(releaseDate) {
    if (!releaseDate) {
      return { daysUntil: null, isCountdown: false };
    }

    try {
      const releaseObj = new Date(releaseDate);
      const today = new Date();

      // Normalize to midnight for comparison
      today.setHours(0, 0, 0, 0);
      releaseObj.setHours(0, 0, 0, 0);

      // Calculate days until release
      const diffTime = releaseObj.getTime() - today.getTime();
      const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Check if within countdown range (1-7 days)
      const isCountdown = daysUntil >= 1 && daysUntil <= 7;

      return { daysUntil, isCountdown };
    } catch (e) {
      console.warn('Error calculating countdown status:', releaseDate, e);
      return { daysUntil: null, isCountdown: false };
    }
  },

  /**
   * Validate metadata and log results
   * @param {object} metadata - Metadata object to validate
   * @param {string} type - Content type ('movie', 'tv-show', 'game')
   * @param {string} title - Item title (for logging)
   * @returns {object} Validation result
   * 
   * @example
   * validateAndLog(item.metadata, 'movie', item.title)
```
   * // Logs validation warnings/errors if any
   * // Returns: { isValid: true, errors: [], warnings: [] }
   */
  validateAndLog(metadata, type, title) {
    const validation = validateMetadata(metadata, type);

    // Log validation issues for debugging
    if (!validation.isValid) {
      console.error(`❌ ${type} "${title}" validation failed:`, validation.errors);
    }
    if (validation.warnings.length > 0) {
      console.warn(`⚠️  ${type} "${title}" validation warnings:`, validation.warnings);
    }

    return validation;
  },

  /**
   * Extract common fields from raw data
   * Reduces boilerplate in adapters
   * @param {object} rawData - Raw data from API
   * @param {object} config - Configuration for extraction
   * @returns {object} Extracted common fields
   * 
   * @example
   * const common = extractCommonFields(rawMovie, {
   *   idField: 'id',
   *   titleField: 'title',
   *   descriptionField: 'overview',
   *   posterField: 'poster_path',
   *   posterOptions: { baseURL: TMDB_IMAGE_BASE }
   * });
   * // Returns: { id, title, description, poster }
   */
  extractCommonFields(rawData, config) {
    const {
      idField = 'id',
      titleField = 'title',
      descriptionField = 'overview',
      posterField = 'poster_path',
      posterOptions = {},
      defaultDescription = 'No overview available.'
    } = config;

    return {
      id: rawData[idField],
      title: rawData[titleField] || 'Untitled',
      description: rawData[descriptionField] || defaultDescription,
      poster: this.normalizePosterURL(rawData[posterField], posterOptions)
    };
  }
};

// ============================================================================
// PHASE 2: METADATA SCHEMAS - Type-safe metadata definitions with validation
// ============================================================================
// Formal schema definitions for each content type to ensure data integrity,
// enable validation, and self-document the expected fields.
const MetadataSchemas = {
  /**
   * Movie metadata schema
   * All fields returned from normalizeMovie adapter
   */
  movie: {
    type: 'movie',
    required: ['type'],
    optional: [
      'runtime',           // int: minutes (91)
      'imdbId',           // string: IMDb identifier
      'budget',           // int: dollars (1400000)
      'revenue',          // int: dollars
      'productionCompanies', // array: production company objects
      'originalTitle',    // string: original language title
      'originalLanguage', // string: ISO 639-1 code (en, es, etc)
      'theatricalReleaseDate' // string: ISO date of theatrical release
    ],
    description: 'Movie metadata from TMDB API, emphasizing runtime and financial data'
  },

  /**
   * TV Show metadata schema
   */
  'tv-show': {
    type: 'tv-show',
    required: ['type'],
    optional: [
      'seasons',          // int: number of seasons (1)
      'episodes',         // int: total episodes (6)
      'networks',         // array: network names ['HBO', 'HBO Max']
      'creators',         // array: creator names
      'status',           // string: In Production, Ended, etc
      'nextEpisodeDate',  // string: ISO date of next episode or null
      'imdbId'            // string: IMDb identifier
    ],
    description: 'TV Show metadata from TMDB API, emphasizing season/episode counts and networks'
  },

  /**
   * Game metadata schema
   */
  game: {
    type: 'game',
    required: ['type'],
    optional: [
      'platforms',        // array: platform names ['PC', 'Xbox Series X']
      'developers',       // array: developer names ['Playground Games']
      'publishers',       // array: publisher names
      'gameModes',        // array: game mode names ['Single player', 'Multiplayer']
      'steamUrl',         // string: Steam store URL or null
      'epicUrl'           // string: Epic Games store URL or null
    ],
    description: 'Game metadata from IGDB API, emphasizing platforms and distribution channels'
  }
};

/**
 * Validate metadata against its schema
 * @param {object} metadata - Metadata object to validate
 * @param {string} type - Content type ('movie', 'tv-show', 'game')
 * @returns {object} { isValid: boolean, errors: array, warnings: array }
 */
function validateMetadata(metadata, type) {
  const schema = MetadataSchemas[type];
  const result = { isValid: true, errors: [], warnings: [] };

  if (!schema) {
    result.errors.push(`Unknown type: ${type}`);
    result.isValid = false;
    return result;
  }

  if (!metadata || typeof metadata !== 'object') {
    result.errors.push('Metadata must be an object');
    result.isValid = false;
    return result;
  }

  // Check required fields
  schema.required.forEach(field => {
    if (!(field in metadata)) {
      result.errors.push(`Missing required field: ${field}`);
      result.isValid = false;
    }
  });

  // Check for unexpected fields (warnings, not errors)
  const allAllowedFields = [...schema.required, ...schema.optional];
  Object.keys(metadata).forEach(field => {
    if (!allAllowedFields.includes(field)) {
      result.warnings.push(`Unexpected field in ${type} metadata: ${field}`);
    }
  });

  return result;
}

/**
 * Log validation results (development helper)
 * @param {string} title - Title for logging
 * @param {object} validationResult - Result from validateMetadata()
 */
function logValidationResult(title, validationResult) {
  if (!validationResult.isValid) {
    console.error(`❌ ${title}`, validationResult.errors);
  }
  if (validationResult.warnings.length > 0) {
    console.warn(`⚠️  ${title}`, validationResult.warnings);
  }
  if (validationResult.isValid && validationResult.warnings.length === 0) {
    console.log(`✓ ${title} - Valid`);
  }
}

// ============================================================================
// PHASE 3: CARD COMPONENTS - Modular card rendering system
// ============================================================================
// Separates card creation, HTML generation, and event handling.
// Follows the same component pattern as ModalRenderers.

const CardComponents = {
  /**
   * Create a complete content card element
   * @param {object} item - Normalized item (StandardItem)
   * @param {number} index - Item index in array
   * @returns {HTMLElement} Complete card element
   */
  createCard(item, index) {
    // Create card element
    const card = document.createElement('div');
    card.className = 'content-card'; // Keeping existing class name for CSS compatibility
    card.dataset.itemId = item.id; // Add ID for reliable lookup

    // Set accessibility attributes
    this.setAccessibilityAttributes(card, item);

    // Build HTML structure
    card.innerHTML = this.buildCardHTML(item);

    // Attach event handlers
    this.attachCardEvents(card, item, index);

    return card;
  },

  /**
   * Set accessibility attributes on card
   * @param {HTMLElement} card - Card element
   * @param {object} item - Item data
   */
  setAccessibilityAttributes(card, item) {
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `View details for ${item.title}`);
  },

  /**
   * Build complete card HTML structure
   * @param {object} item - Normalized item
   * @returns {string} HTML string
   */
  buildCardHTML(item) {
    return `
      <div class="content-poster">
        ${this.createPosterImage(item)}
        ${this.createDateBadge(item.releaseDate, item)}
        ${this.createTBAText(item)}
        ${this.createBookmarkButton(item)}
        ${this.createOverlay(item)}
      </div>
    `;
  },

  /**
   * Create poster image HTML
   * @param {object} item - Normalized item
   * @returns {string} HTML string
   */
  createPosterImage(item) {
    return `
      <img 
        class="content-poster-image" 
        src="${sanitizeURL(item.poster)}" 
        alt="${sanitizeHTML(item.title)}" 
        loading="lazy"
      >
    `;
  },

  /**
   * Create date badge HTML
   * @param {string} dateString - ISO date string
   * @param {object} item - Item data (for badge type detection)
   * @returns {string} HTML string
   */
  createDateBadge(dateString, item) {
    if (!dateString) return '';

    const dateObj = new Date(dateString);
    const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
    const day = dateObj.getDate();

    // Check if today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(dateObj);
    checkDate.setHours(0, 0, 0, 0);
    const isToday = checkDate.getTime() === today.getTime();

    // Determine badge text using Formatters layer
    let badgeText = '';
    let showSpecialBadge = false;
    let countdownText = '';
    let showCountdownBadge = false;

    // Use Formatters to get type-specific badge text (delegates type logic to formatter layer)
    if (isToday && item.metadata) {
      badgeText = Formatters.releaseBadgeText(item.metadata.type, isToday);
      showSpecialBadge = badgeText !== '';
    }

    // Check for countdown badge (only if not today)
    if (!isToday && item.metadata) {
      const countdownStatus = AdapterUtils.getCountdownStatus(dateString);

      if (countdownStatus.isCountdown && countdownStatus.daysUntil) {
        showCountdownBadge = true;
        countdownText = `${countdownStatus.daysUntil} days<br>left`;
      }
    }

    // Return appropriate badge
    if (showSpecialBadge) {
      return `
        <div class="content-date-stacked ${showSpecialBadge ? 'has-special-release' : ''}">
          <span class="date-month">${month}</span>
          <span class="date-day">${day}</span>
          ${showSpecialBadge ? `<span class="special-release-text">${badgeText}</span>` : ''}
        </div>
      `;
    } else if (showCountdownBadge) {
      return `
        <div class="content-date-stacked has-countdown-release">
          <span class="date-month">${month}</span>
          <span class="date-day">${day}</span>
          <span class="countdown-release-text">${countdownText}</span>
        </div>
      `;
    } else {
      return `
        <div class="content-date-stacked">
          <span class="date-month">${month}</span>
          <span class="date-day">${day}</span>
        </div>
      `;
    }
  },

  /**
   * Create bookmark button HTML
   * @param {object} item - Normalized item
   * @returns {string} HTML string
   */
  createBookmarkButton(item) {
    const isBookmarked = bookmarkManager.isBookmarked(item.id);
    const activeClass = isBookmarked ? 'active' : '';

    return `
      <button 
        class="bookmark-btn-card ${activeClass}" 
        aria-label="Bookmark ${sanitizeHTML(item.title)}"
        data-item-id="${item.id}"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>
    `;
  },

  /**
   * Create TBA text HTML
   * @param {object} item - Normalized item
   * @returns {string} HTML string
   */
  createTBAText(item) {
    if (item.releaseDate) return '';

    return `
      <div class="tba-text">DIGITAL<br>RELEASE<br>DATE: TBA</div>
    `;
  },

  /**
   * Create overlay HTML
   * @param {object} item - Normalized item
   * @returns {string} HTML string
   */
  createOverlay(item) {
    const primaryGenre = item.genres && item.genres.length > 0 ? item.genres[0] : '';
    const secondaryGenre = item.genres && item.genres.length > 1 ? item.genres[1] : '';
    const genreDisplay = secondaryGenre ? `${primaryGenre}, ${secondaryGenre}` : primaryGenre;
    const normalizedRating = Formatters.ratingNormalized(item.rating, item.ratingMax);

    const ratingHTML = `<div class="content-rating">Score ${parseFloat(normalizedRating.toFixed(1))}/10</div>`;

    return `
      <div class="content-details-overlay">
        <div class="content-header">
          <h3 class="content-title">${sanitizeHTML(item.title)}</h3>
          <div class="content-metadata">
            <div class="content-genre">${sanitizeHTML(genreDisplay)}</div>
            ${ratingHTML}
          </div>
        </div>
        <div class="content-body">
          <p class="content-synopsis">${sanitizeHTML(item.description)}</p>
        </div>
      </div>
    `;
  },

  /**
   * Attach all event handlers to card
   * @param {HTMLElement} card - Card element
   * @param {object} item - Item data
   * @param {number} index - Item index
   */
  attachCardEvents(card, item, index) {
    // Bookmark button
    const bookmarkBtn = card.querySelector('.bookmark-btn-card');
    if (bookmarkBtn) {
      bookmarkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleBookmarkClick(item, bookmarkBtn);
      });
    }

    // Card click
    card.addEventListener('click', () => {
      this.handleCardClick(item, index);
    });

    // Keyboard navigation
    card.addEventListener('keydown', (e) => {
      this.handleCardKeydown(e, item, index);
    });
  },

  /**
   * Handle bookmark button click
   * @param {object} item - Item data
   * @param {HTMLElement} button - Bookmark button element
   */
  handleBookmarkClick(item, button) {
    // Prevent multiple rapid clicks
    if (button.dataset.processing === 'true') {
      return;
    }

    const isAdded = bookmarkManager.toggle(item);
    button.classList.toggle('active', isAdded);

    // Flash the bookmarks nav link when a bookmark is added
    if (isAdded) {
      const bookmarkNavLink = document.querySelector('a[data-category="bookmarks"]');
      if (bookmarkNavLink) {
        bookmarkNavLink.classList.add('flashing');
        setTimeout(() => {
          bookmarkNavLink.classList.remove('flashing');
        }, 600);
      }
    }

    // If on bookmarks page and removed, animate removal and update navigation array
    // Use Router to check current route
    const currentRoute = typeof Router !== 'undefined' ? Router.getCurrentRoute() : 'movies';

    if (currentRoute === 'bookmarks' && !isAdded) {
      // Mark as processing to prevent double-clicks
      button.dataset.processing = 'true';

      // Remove from currentMoviesArray so modal navigation stays in sync
      const itemIndex = currentMoviesArray.findIndex(m => m.id === item.id);
      if (itemIndex !== -1) {
        currentMoviesArray.splice(itemIndex, 1);
      }

      const card = button.closest('.content-card');
      if (card) {
        // Disable pointer events on the card to prevent any further interaction
        card.style.pointerEvents = 'none';
        this.removeCardWithAnimation(card);
      }
    }
  },

  /**
   * Handle card click
   * @param {object} item - Item data
   * @param {number} index - Item index
   */
  handleCardClick(item, index) {
    showItemDetails(item, index);
  },

  /**
   * Handle card keydown
   * @param {KeyboardEvent} event - Keyboard event
   * @param {object} item - Item data
   * @param {number} index - Item index
   */
  handleCardKeydown(event, item, index) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      showItemDetails(item, index);
    }
  },

  /**
   * Remove card with animation
   * @param {HTMLElement} card - Card element to remove
   */
  removeCardWithAnimation(card) {
    card.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    card.style.transform = 'scale(0.9)';
    card.style.opacity = '0';

    setTimeout(() => {
      card.remove();
      this.checkEmptyBookmarks();
    }, 300);
  },

  /**
   * Check if bookmarks are empty and show message
   */
  checkEmptyBookmarks() {
    const container = document.getElementById('movies-container');
    if (container.children.length === 0) {
      container.style.display = 'none';
      container.innerHTML = '';
    }
  },

  /**
   * Get empty bookmarks message HTML
   * @returns {string} HTML string
   */
  getEmptyBookmarksHTML() {
    return '';
  }
};

// Category text scrambling animation


const scrambleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ*#@$%&!?';

function scrambleText(element, targetText, duration = 350) {
  const startTime = Date.now();
  const originalText = element.textContent;
  const maxLength = Math.max(targetText.length, originalText.length);

  function update() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    let newText = '';
    for (let i = 0; i < targetText.length; i++) {
      if (progress * targetText.length > i) {
        // Character is revealed - increased probability for faster reveal
        if (Math.random() < (progress * 2.0)) {
          newText += targetText[i];
        } else {
          // Still scrambling - reduced intensity
          newText += scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
        }
      } else {
        // Not yet reached
        newText += scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
      }
    }

    element.textContent = newText;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = targetText;
    }
  }

  update();
}



// ============================================================================
// PHASE 4: ROUTER - Client-side routing abstraction
// ============================================================================
// Centralizes navigation logic, scroll behavior, and UI updates.
// Provides clean separation between routing and content loading.

const Router = {
  /**
   * Route configuration
   * Each route has a handler function and display title
   */
  routes: {
    'movies': {
      handler: () => loadContent('movies'),
      title: 'MOVIES',
      description: 'Browse upcoming movie releases'
    },
    'movies/past-week': {
      handler: () => loadContent('movies', 'past-week'),
      title: 'MOVIES / PAST WEEK',
      description: 'Browse movies from the past week'
    },
    'tv-shows': {
      handler: () => loadContent('tv-shows'),
      title: 'TV SHOWS',
      description: 'Browse upcoming TV show episodes'
    },
    'games': {
      handler: () => loadContent('games'),
      title: 'GAMES',
      description: 'Browse upcoming game releases'
    },
    'books': {
      handler: () => loadContent('books'),
      title: 'BOOKS',
      description: 'Browse upcoming book releases'
    },
    'music': {
      handler: () => loadContent('music'),
      title: 'MUSIC',
      description: 'Browse upcoming music releases'
    },
    'bookmarks': {
      handler: () => loadContent('bookmarks'),
      title: 'BOOKMARKS',
      description: 'View your bookmarked content'
    }
  },

  /**
   * Default route when path is empty or invalid
   */
  defaultRoute: 'movies',

  /**
   * Scroll threshold for auto-scroll behavior
   */
  scrollThreshold: 300, // pixels

  /**
   * Scroll animation duration
   */
  scrollDuration: 500, // milliseconds

  /**
   * Navigate to a route
   * @param {string} path - Route path (e.g., 'movies', 'tv-shows')
   * @param {object} options - Navigation options
   * @param {boolean} options.skipHistory - Don't update browser history
   * @param {boolean} options.scrollToTop - Force scroll to top
   * @param {boolean} options.skipScroll - Don't scroll at all
   */
  navigate(path, options = {}) {
    const {
      skipHistory = false,
      scrollToTop = false,
      skipScroll = false
    } = options;

    // Validate route
    if (!this.isValidRoute(path)) {
      console.warn(`Invalid route: ${path}, using default`);
      path = this.defaultRoute;
    }

    const route = this.getRoute(path);

    // Update browser history
    if (!skipHistory) {
      window.location.hash = `#/${path}`;
    }

    // Handle scroll behavior
    if (skipScroll) {
      this.executeRoute(route, path);
    } else if (scrollToTop || this.shouldScrollToTop()) {
      this.scrollToTop(() => {
        this.executeRoute(route, path);
      });
    } else {
      this.executeRoute(route, path);
    }
  },

  /**
   * Execute a route (update UI and run handler)
   * @param {object} route - Route configuration
   * @param {string} path - Route path
   */
  executeRoute(route, path) {
    // Update UI state
    this.updateActiveLink(path);
    this.updateCategoryText(route.title);

    // Reset date filter to "all" when changing categories
    if (currentDateFilter !== 'all') {
      currentDateFilter = 'all';
      document.querySelectorAll('.date-filter-btn').forEach(btn => {
        if (btn.dataset.filter === 'all') {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    // Execute route handler (loads content)
    route.handler();

    // Update document title
    document.title = `${route.title} - MIDLOOP`;
  },

  /**
   * Get route configuration by path
   * @param {string} path - Route path
   * @returns {object} Route configuration
   */
  getRoute(path) {
    return this.routes[path] || this.routes[this.defaultRoute];
  },

  /**
   * Get current route from URL
   * @returns {string} Current route path
   */
  getCurrentRoute() {
    const path = window.location.pathname.replace(/^\/+/, '');
    return path || this.defaultRoute;
  },

  /**
   * Check if route is valid
   * @param {string} path - Route path
   * @returns {boolean} True if valid
   */
  isValidRoute(path) {
    return path in this.routes;
  },

  /**
   * Update active navigation link
   * @param {string} path - Active route path
   */
  updateActiveLink(path) {
    const navLinks = document.querySelectorAll('.nav-link, .nav-sublink, .bookmarks-icon-link');

    // Remove active from all
    navLinks.forEach(link => {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    });

    // Parse path to extract category and subcategory
    const pathParts = path.split('/');
    const category = pathParts[0];
    const subcategory = pathParts[1] || null;

    // Find and highlight the appropriate link
    let activeLink = null;
    if (subcategory) {
      // For subcategory routes like 'movies/past-week', find the sublink with matching data attributes
      activeLink = document.querySelector(`.nav-sublink[data-category="${category}"][data-subcategory="${subcategory}"]`);
      if (activeLink) {
        activeLink.classList.add('active');
        activeLink.setAttribute('aria-current', 'page');
        
        // Also highlight the parent category link to indicate submenu is active
        const parentLink = document.querySelector(`.nav-link[data-category="${category}"]`);
        if (parentLink) {
          parentLink.classList.add('active');
          const parentSubmenuId = parentLink.getAttribute('data-toggle-submenu');
          if (parentSubmenuId) {
            const parentSubmenu = document.getElementById(parentSubmenuId);
            if (parentSubmenu) {
              parentSubmenu.removeAttribute('hidden');
              parentLink.setAttribute('aria-expanded', 'true');
            }
          }
        }
      }
    } else {
      // For main category routes, find the nav-link with matching data-category
      activeLink = document.querySelector(`.nav-link[data-category="${category}"], .bookmarks-icon-link[data-category="${category}"]`);
      if (activeLink) {
        activeLink.classList.add('active');
        activeLink.setAttribute('aria-current', 'page');
      }
    }
  },

  /**
   * Update category text with animation
   * @param {string} title - Category title to display
   */
  updateCategoryText(title) {
    const categoryText = document.querySelector('.category-text');
    if (categoryText) {
      scrambleText(categoryText, title, 350);
    }
  },

  /**
   * Check if should scroll to top
   * @returns {boolean} True if should scroll
   */
  shouldScrollToTop() {
    const currentScrollY = window.scrollY || window.pageYOffset;
    return currentScrollY > this.scrollThreshold;
  },

  /**
   * Scroll to top with callback
   * @param {Function} callback - Function to call after scroll
   */
  scrollToTop(callback) {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    // Wait for scroll animation to complete
    setTimeout(callback, this.scrollDuration);
  },

  /**
   * Initialize router
   * Sets up event listeners and handles initial load
   */
  init() {
    this.setupEventListeners();
    this.handleInitialLoad();
  },

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Utility: close all submenus except optional exempt id
    const closeAllSubmenus = (exceptId = null) => {
      const submenuLinks = document.querySelectorAll('[data-toggle-submenu]');
      submenuLinks.forEach(link => {
        const id = link.getAttribute('data-toggle-submenu');
        if (!id || (exceptId && id === exceptId)) return;
        const submenu = document.getElementById(id);
        if (submenu) {
          submenu.setAttribute('hidden', '');
          link.setAttribute('aria-expanded', 'false');
        }
      });
    };

    // Browser back/forward buttons
    window.addEventListener('hashchange', () => {
      const route = this.getCurrentRoute();
      this.navigate(route, { skipHistory: true });
    });

    // Navigation link clicks (main links and sub-links)
    const navLinks = document.querySelectorAll('.nav-link, .nav-sublink, .bookmarks-icon-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const layoutContainer = document.querySelector('.layout-container');
        const isSidebarCollapsed = layoutContainer ? layoutContainer.classList.contains('sidebar-collapsed') : false;
        const category = link.getAttribute('data-category');
        const subcategory = link.getAttribute('data-subcategory');
        const submenuId = link.dataset.toggleSubmenu;
        const submenu = submenuId ? document.getElementById(submenuId) : null;
        const parentSubmenu = !submenuId ? link.closest('.sidebar-submenu') : null;
        const parentSubmenuId = parentSubmenu && parentSubmenu.id ? parentSubmenu.id : null;
        const exemptSubmenuId = submenuId || parentSubmenuId || null;
        const canExpandSubmenu = submenu && !isSidebarCollapsed && category !== 'movies';

        // Close any other open submenus when selecting a navigation choice
        closeAllSubmenus(exemptSubmenuId);
        
        // Build the route path
        const routePath = subcategory ? `${category}/${subcategory}` : category;

        // Get current route
        const currentRoute = this.getCurrentRoute();
        
        // Ensure submenu stays open when clicking a nav link that owns one (no close-on-reclick) and sidebar is not collapsed
        if (canExpandSubmenu) {
          submenu.removeAttribute('hidden');
          link.setAttribute('aria-expanded', 'true');
        } else if (submenu) {
          // Keep aria state collapsed when sidebar is collapsed
          submenu.setAttribute('hidden', '');
          link.setAttribute('aria-expanded', 'false');
        }

        // If clicking a sub navigation link, ensure its parent submenu remains open/expanded
        if (parentSubmenuId && !isSidebarCollapsed) {
          parentSubmenu.removeAttribute('hidden');
          const parentToggleLink = document.querySelector(`[data-toggle-submenu="${parentSubmenuId}"]`);
          if (parentToggleLink) {
            parentToggleLink.setAttribute('aria-expanded', 'true');
          }
        }

        // If clicking the same main category (no subcategory) keep submenu open and skip navigation (only when sidebar allows expand)
        if (!subcategory && routePath === currentRoute && canExpandSubmenu) {
          return;
        }

        // If clicking a subcategory link while already on that subcategory, just scroll to top
        if (routePath === currentRoute && link.classList.contains('active') && subcategory) {
          this.scrollToTop(() => { });
          return;
        }

        // Navigate to new route
        this.navigate(routePath);
      });
    });

    // Close all submenus on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllSubmenus();
      }
    });
  },

  /**
   * Handle initial page load
   */
  handleInitialLoad() {
    const initialRoute = this.getCurrentRoute();

    // Normalize URL (ensure it has hash)
    if (!window.location.hash || window.location.hash === '#/' || window.location.hash === '#') {
      window.location.hash = `#/${initialRoute}`;
    }

    // Load initial route
    this.navigate(initialRoute, { skipHistory: true });
  }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  Router.init();
  setupModal();
  

});

// Adapter Pattern Implementation

// Standardize Genre Map
const movieGenreMap = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western"
};

const tvGenreMap = {
  10759: "Action",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  10762: "Kids",
  9648: "Mystery",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi",
  10766: "Soap",
  10767: "Talk",
  10768: "War",
  37: "Western"
};

// Adapters
function normalizeMovie(rawMovie) {
  // Extract common fields using utility
  const common = AdapterUtils.extractCommonFields(rawMovie, {
    idField: 'id',
    titleField: 'title',
    descriptionField: 'overview',
    posterField: 'poster_path',
    posterOptions: { baseURL: TMDB_IMAGE_BASE }
  });

  const normalizedItem = {
    ...common,
    releaseDate: AdapterUtils.normalizeReleaseDate(rawMovie.digital_release_date),
    rating: AdapterUtils.normalizeRating(rawMovie.vote_average, 10),
    ratingMax: 10,
    genres: AdapterUtils.normalizeGenres(rawMovie.genre_ids, movieGenreMap),
    metadata: {
      type: 'movie',
      imdbId: rawMovie.imdb_id,
      runtime: rawMovie.runtime,
      originalTitle: rawMovie.original_title,
      originalLanguage: rawMovie.original_language,
      productionCompanies: rawMovie.production_companies, // Already a string in JSON
      budget: rawMovie.budget,
      revenue: rawMovie.revenue,
      theatricalReleaseDate: AdapterUtils.normalizeReleaseDate(rawMovie.release_date)
    }
  };

  // Validate and log
  AdapterUtils.validateAndLog(normalizedItem.metadata, 'movie', normalizedItem.title);

  return normalizedItem;
}

function normalizeTVShow(rawShow) {
  // Extract common fields using utility
  const common = AdapterUtils.extractCommonFields(rawShow, {
    idField: 'id',
    titleField: 'title',
    descriptionField: 'overview',
    posterField: 'poster_path',
    posterOptions: { baseURL: TMDB_IMAGE_BASE }
  });

  // Use utility for complex date logic
  const displayDate = AdapterUtils.getTVShowDisplayDate(
    rawShow.first_air_date || rawShow.digital_release_date,
    rawShow.next_episode_date
  );

  const normalizedItem = {
    ...common,
    title: rawShow.title || rawShow.name, // TV shows use 'title' in our data, but 'name' in TMDB usually
    releaseDate: displayDate,
    rating: AdapterUtils.normalizeRating(rawShow.vote_average, 10),
    ratingMax: 10,
    genres: AdapterUtils.normalizeGenres(rawShow.genre_ids, tvGenreMap),
    metadata: {
      type: 'tv-show',
      imdbId: rawShow.imdb_id,
      seasons: rawShow.number_of_seasons,
      episodes: rawShow.number_of_episodes,
      networks: AdapterUtils.normalizeArray(rawShow.networks), // Already string array
      status: rawShow.release_status,
      nextEpisodeDate: AdapterUtils.normalizeReleaseDate(rawShow.next_episode_date),
      creators: AdapterUtils.normalizeArray(rawShow.created_by) // Already string array
    }
  };

  // Validate and log
  AdapterUtils.validateAndLog(normalizedItem.metadata, 'tv-show', normalizedItem.title);

  return normalizedItem;
}

function normalizeGame(rawGame) {
  // Extract common fields using utility
  const common = AdapterUtils.extractCommonFields(rawGame, {
    idField: 'slug',
    titleField: 'name',
    descriptionField: 'summary',
    posterField: 'poster_path',
    posterOptions: { isFullURL: true }, // IGDB uses full URLs
    defaultDescription: 'No summary available.'
  });

  const normalizedItem = {
    ...common,
    id: rawGame.slug, // Games use slug as ID
    releaseDate: AdapterUtils.normalizeReleaseDate(rawGame.first_release_date),
    rating: AdapterUtils.normalizeRating(rawGame.total_rating, 100),
    ratingMax: 100,
    genres: AdapterUtils.normalizeGenres(rawGame.genres), // Already strings
    metadata: {
      type: 'game',
      steamUrl: AdapterUtils.normalizeStoreURL(rawGame.steam_url, 'steam'),
      epicUrl: AdapterUtils.normalizeStoreURL(rawGame.epic_url, 'epic'),
      platforms: AdapterUtils.normalizeArray(rawGame.platforms), // Already string array
      developers: AdapterUtils.normalizeArray(rawGame.developers), // Already string array
      publishers: AdapterUtils.normalizeArray(rawGame.publishers), // Already string array
      gameModes: AdapterUtils.normalizeArray(rawGame.game_modes) // Already string array
    }
  };

  // Validate and log
  AdapterUtils.validateAndLog(normalizedItem.metadata, 'game', normalizedItem.title);

  return normalizedItem;
}

// Category Configuration
const CATEGORY_CONFIG = {
  movies: {
    dataFile: './shared-data/data_movies.json',
    adapter: normalizeMovie,
    displayName: 'Movies',
    subcategories: {
      'past-week': {
        dataFile: './shared-data/data_movies_past_week.json',
        displayName: 'Past Week'
      }
    }
  },
  'tv-shows': {
    dataFile: './shared-data/data_tv_shows.json',
    adapter: normalizeTVShow,
    displayName: 'TV Shows'
  },
  games: {
    dataFile: './shared-data/data_games.json',
    adapter: normalizeGame,
    displayName: 'Games'
  },
  // INCOMPLETE CATEGORIES: To activate books/music categories, implement:
  // 1. Create data file: shared-data/data_books.json (or data_music.json)
  // 2. Create adapter function: normalizeBooks(data) with same schema as movies/tv-shows
  // 3. Add navigation link: <a href="/books" class="nav-link">Books</a> in index.html
  // 4. Modal renderer: Create ModalRenderers.renderBook(item) in the renderer switch
  // Schema fields required: title, poster, rating, genres, release_date, overview, metadata.type
  books: {
    dataFile: './shared-data/data_books.json', // Placeholder
    adapter: (data) => data, // Placeholder
    displayName: 'Books'
  },
  music: {
    dataFile: './shared-data/data_music.json', // Placeholder
    adapter: (data) => data, // Placeholder
    displayName: 'Music'
  },
  bookmarks: {
    dataFile: null, // No external file
    adapter: (data) => data, // No adapter needed as data is already normalized
    displayName: 'Bookmarks'
  }
};

// In-memory cache with Time-To-Live (TTL)
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const dataCache = {
  data: {},
  timestamps: {},

  get(key) {
    return this.data[key] || null;
  },

  set(key, value) {
    this.data[key] = value;
    this.timestamps[key] = Date.now();
  },

  has(key) {
    return key in this.data;
  },

  isValid(key) {
    if (!this.has(key)) return false;
    const age = Date.now() - this.timestamps[key];
    return age < CACHE_DURATION;
  },

  clear(key) {
    if (key) {
      delete this.data[key];
      delete this.timestamps[key];
    } else {
      this.data = {};
      this.timestamps = {};
    }
  }
};

// Bookmark Manager
const bookmarkManager = {
  STORAGE_KEY: 'midloop_bookmarks',

  getAll() {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  isBookmarked(id) {
    const bookmarks = this.getAll();
    return bookmarks.some(item => item.id === id);
  },

  toggle(item) {
    let bookmarks = this.getAll();
    const index = bookmarks.findIndex(b => b.id === item.id);

    if (index === -1) {
      // Add
      bookmarks.push(item);
    } else {
      // Remove
      bookmarks.splice(index, 1);
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(bookmarks));
    return index === -1; // Returns true if added, false if removed
  },

  save(bookmarks) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(bookmarks));
  }
};

async function refreshBookmarks(bookmarks) {
  if (!bookmarks || bookmarks.length === 0) return bookmarks;

  // Identify which categories we need to fetch based on what's bookmarked
  // To be safe and simple, we'll fetch all main categories: movies, tv-shows, games, books, music
  const categoriesToFetch = ['movies', 'tv-shows', 'games', 'books', 'music'];

  try {
    const fetchPromises = categoriesToFetch.map(async (catKey) => {
      const config = CATEGORY_CONFIG[catKey];
      if (!config || !config.dataFile) return [];

      try {
        const response = await fetch(`${config.dataFile}?t = ${Date.now()} `);
        if (!response.ok) return [];
        const data = await response.json();
        return data.map(config.adapter);
      } catch (e) {
        console.warn(`Failed to refresh data for ${catKey}`, e);
        return [];
      }
    });

    const results = await Promise.all(fetchPromises);
    const allFreshItems = results.flat();

    // Create a map for faster lookup: id -> item
    const freshItemMap = new Map(allFreshItems.map(item => [item.id, item]));

    // Update bookmarks
    let hasUpdates = false;
    const updatedBookmarks = bookmarks.map(bookmark => {
      const freshItem = freshItemMap.get(bookmark.id);
      if (freshItem) {
        // Check for changes (simple check or just overwrite)
        // We'll overwrite to ensure we have the latest data
        // We preserve the 'bookmarked' status implicitly since it's in the bookmark list
        if (JSON.stringify(bookmark) !== JSON.stringify(freshItem)) {
          hasUpdates = true;
          return freshItem;
        }
      }
      return bookmark;
    });

    if (hasUpdates) {
      bookmarkManager.save(updatedBookmarks);
      console.log('Bookmarks updated with fresh data');
    }

    return updatedBookmarks;

  } catch (error) {
    console.error('Error refreshing bookmarks:', error);
    return bookmarks; // Return original if something goes wrong
  }
}

function loadContent(category, subcategory = null) {
  const config = CATEGORY_CONFIG[category];
  let dataFile = config?.dataFile;
  
  // If subcategory is provided and exists, use its data file
  if (subcategory && config?.subcategories && config.subcategories[subcategory]) {
    dataFile = config.subcategories[subcategory].dataFile;
  }
  
  const container = document.getElementById('movies-container');

  if (!config) {
    console.error(`Unknown category: ${category} `);
    return;
  }

  // Create cache key that includes subcategory
  const cacheKey = subcategory ? `${category}/${subcategory}` : category;

  // CHECK CACHE FIRST (Respect TTL)
  // For bookmarks, we don't use the standard cache logic in the same way, or we bypass it
  if (category === 'bookmarks') {
    // Load directly from local storage
    container.style.transition = 'opacity 0.2s ease';
    container.style.opacity = '0';

    setTimeout(async () => {
      let bookmarks = bookmarkManager.getAll();

      // Attempt to refresh data
      if (bookmarks.length > 0) {
        // Show loading state if needed, or just update after fetch
        // For now, we'll fetch then render to ensure no flicker of old data
        bookmarks = await refreshBookmarks(bookmarks);

        // Sort bookmarks by release date (earliest first)
        bookmarks.sort((a, b) => {
          const dateA = a.releaseDate ? new Date(a.releaseDate) : new Date('9999-12-31');
          const dateB = b.releaseDate ? new Date(b.releaseDate) : new Date('9999-12-31');
          return dateA - dateB;
        });
      }

      if (bookmarks.length === 0) {
        container.innerHTML = CardComponents.getEmptyBookmarksHTML();
        container.style.display = 'none';
        container.style.opacity = '1';
      } else {
        unfilteredItemsArray = bookmarks;
        const filteredBookmarks = filterItemsByDate(bookmarks, currentDateFilter);
        displayItems(filteredBookmarks);
        container.style.opacity = '1';
      }
    }, 200);
    return;
  }

  if (dataCache.isValid(cacheKey)) {
    // Fade out current content
    container.style.transition = 'opacity 0.2s ease';
    container.style.opacity = '0';

    setTimeout(() => {
      const cachedData = dataCache.get(cacheKey);
      unfilteredItemsArray = cachedData;
      const filteredData = filterItemsByDate(cachedData, currentDateFilter);
      displayItems(filteredData);
      // Fade in instantly
      container.style.opacity = '1';
    }, 200);
    return;
  }

  // Fade out current content
  container.style.transition = 'opacity 0.3s ease';
  container.style.opacity = '0';

  // Wait for fade out
  setTimeout(() => {
    // Add cache-busting timestamp to URL
    fetch(`${dataFile}?t=${Date.now()}`)
      .then(response => {
        if (!response.ok) {
          // If file doesn't exist (e.g. books/music), show coming soon
          throw new Error('Content not found');
        }
        return response.json();
      })
      .then(data => {
        // Normalize Data with error handling
        const normalizedData = data.map((item, index) => {
          try {
            return config.adapter(item);
          } catch (error) {
            console.error(`Error normalizing ${category} item at index ${index}: `, error);
            console.error('Raw item data:', item);
            throw error; // Re-throw to trigger catch block
          }
        });

        // STORE IN CACHE
        dataCache.set(cacheKey, normalizedData);

        unfilteredItemsArray = normalizedData;
        const filteredData = filterItemsByDate(normalizedData, currentDateFilter);
        displayItems(filteredData);

        // Fade in
        setTimeout(() => {
          container.style.opacity = '1';
        }, 50);
      })
      .catch(error => {
        console.log('Load error:', error);
        const container = document.getElementById('movies-container');
        container.innerHTML = '';
        container.style.display = 'none';
        container.style.opacity = '1';
      });
  }, 300);
}

function displayItems(items) {
  const container = document.getElementById('movies-container');
  container.innerHTML = '';

  // Store globally for modal navigation
  currentMoviesArray = items;

  // Show/hide the bordered grid box based on whether items exist
  if (items.length === 0) {
    container.style.display = 'none';
  } else {
    container.style.display = 'grid';
  }

  // Render cards using component system
  items.forEach((item, index) => {
    const card = CardComponents.createCard(item, index);
    container.appendChild(card);
  });
}

// ============================================================================
// DATE FILTER FUNCTIONALITY
// ============================================================================

/**
 * Filter items by release date
 * @param {array} items - Array of normalized items
 * @param {string} filter - Filter type: 'all', 'month', 'week'
 * @returns {array} Filtered items
 */
function filterItemsByDate(items, filter) {
  if (filter === 'all') {
    return items;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return items.filter(item => {
    if (!item.releaseDate) return false;

    const releaseDate = new Date(item.releaseDate);
    const releaseDateOnly = new Date(releaseDate.getFullYear(), releaseDate.getMonth(), releaseDate.getDate());

    if (filter === 'week') {
      // Past 7 days from today
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return releaseDateOnly >= weekAgo && releaseDateOnly <= today;
    }

    if (filter === 'month') {
      // Same month and year as current date
      return releaseDate.getMonth() === now.getMonth() && 
             releaseDate.getFullYear() === now.getFullYear();
    }

    return true;
  });
}

/**
 * Apply date filter and update display
 * @param {string} filter - Filter type: 'all', 'month', 'week'
 */
function applyDateFilter(filter) {
  currentDateFilter = filter;
  
  // Update button states
  document.querySelectorAll('.date-filter-btn').forEach(btn => {
    if (btn.dataset.filter === filter) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Filter and display items
  const filteredItems = filterItemsByDate(unfilteredItemsArray, filter);
  displayItems(filteredItems);
}

// ============================================================================
// PHASE 3: MODAL RENDERERS - Strategy pattern for type-specific rendering
// ============================================================================
// Each renderer is responsible for extracting and formatting its type's
// specific metadata. This eliminates all type-checking conditionals from
// showItemDetails() and makes adding new types trivial.

const ModalRenderers = {
  /**
   * Movie renderer - handles runtime, budget, revenue display
   */
  movie: {
    /**
     * Extract and format movie-specific details
     * @param {object} item - Normalized item with metadata
     * @returns {array} Array of {label, value} detail pairs
     */
    render(item) {
      const details = [];
      const meta = item.metadata;

      // Runtime (only show if available)
      if (meta.runtime) {
        details.push({
          label: 'Runtime',
          value: Formatters.runtimeDisplay(meta.runtime)
        });
      }

      // Budget (only show if available and non-zero)
      if (meta.budget && meta.budget > 0) {
        details.push({
          label: 'Budget',
          value: Formatters.currencyDisplay(meta.budget)
        });
      }

      // Revenue (only show if available and non-zero)
      if (meta.revenue && meta.revenue > 0) {
        details.push({
          label: 'Revenue',
          value: Formatters.currencyDisplay(meta.revenue)
        });
      }

      // Original Language (only show if not English)
      if (meta.originalLanguage && meta.originalLanguage !== 'en') {
        details.push({
          label: 'Original Language',
          value: new Intl.DisplayNames(['en'], { type: 'language' }).of(meta.originalLanguage) || meta.originalLanguage
        });
      }

      // IMDB Link (if available)
      if (meta.imdbId) {
        details.push({
          label: 'IMDb',
          value: `< a href = "https://www.imdb.com/title/${meta.imdbId}/" target = "_blank" rel = "noopener" > View on IMDb</a > `,
          isHtml: true
        });
      }

      return details;
    }
  },

  /**
   * TV Show renderer - handles seasons, episodes, networks, next episode
   */
  'tv-show': {
    /**
     * Extract and format TV show-specific details
     * @param {object} item - Normalized item with metadata
     * @returns {array} Array of {label, value} detail pairs
     */
    render(item) {
      const details = [];
      const meta = item.metadata;

      // Seasons (only show if available)
      if (meta.seasons) {
        details.push({
          label: 'Seasons',
          value: String(meta.seasons)
        });
      }

      // Episodes (only show if available)
      if (meta.episodes) {
        details.push({
          label: 'Episodes',
          value: String(meta.episodes)
        });
      }

      // Networks (array display)
      if (meta.networks && meta.networks.length > 0) {
        details.push({
          label: 'Networks',
          value: Formatters.arrayDisplay(meta.networks)
        });
      }

      // Status (if available)
      if (meta.status) {
        details.push({
          label: 'Status',
          value: meta.status
        });
      }

      // Next Episode Date (if available)
      if (meta.nextEpisodeDate) {
        const nextEpisodeDate = Formatters.dateDisplay(meta.nextEpisodeDate, 'long');
        details.push({
          label: 'Next Episode',
          value: nextEpisodeDate
        });
      }

      // Creators (if available)
      if (meta.creators && meta.creators.length > 0) {
        details.push({
          label: 'Created By',
          value: Formatters.arrayDisplay(meta.creators)
        });
      }

      // IMDB Link (if available)
      if (meta.imdbId) {
        details.push({
          label: 'IMDb',
          value: `< a href = "https://www.imdb.com/title/${meta.imdbId}/" target = "_blank" rel = "noopener" > View on IMDb</a > `,
          isHtml: true
        });
      }

      return details;
    }
  },

  /**
   * Game renderer - handles platforms, developers, store links
   */
  game: {
    /**
     * Extract and format game-specific details
     * @param {object} item - Normalized item with metadata
     * @returns {array} Array of {label, value} detail pairs
     */
    render(item) {
      const details = [];
      const meta = item.metadata;

      // Platforms (array display)
      if (meta.platforms && meta.platforms.length > 0) {
        // Platforms are objects with name property
        const platformNames = meta.platforms
          .map(p => (typeof p === 'string' ? p : p.name))
          .filter(Boolean);
        if (platformNames.length > 0) {
          details.push({
            label: 'Platforms',
            value: Formatters.arrayDisplay(platformNames)
          });
        }
      }

      // Developers (array display)
      if (meta.developers && meta.developers.length > 0) {
        const devNames = meta.developers
          .map(d => (typeof d === 'string' ? d : d.name))
          .filter(Boolean);
        if (devNames.length > 0) {
          details.push({
            label: 'Developers',
            value: Formatters.arrayDisplay(devNames)
          });
        }
      }

      // Publishers (if available)
      if (meta.publishers && meta.publishers.length > 0) {
        const pubNames = meta.publishers
          .map(p => (typeof p === 'string' ? p : p.name))
          .filter(Boolean);
        if (pubNames.length > 0) {
          details.push({
            label: 'Publishers',
            value: Formatters.arrayDisplay(pubNames)
          });
        }
      }

      // Game Modes (if available)
      if (meta.gameModes && meta.gameModes.length > 0) {
        const modeNames = meta.gameModes
          .map(m => (typeof m === 'string' ? m : m.name))
          .filter(Boolean);
        if (modeNames.length > 0) {
          details.push({
            label: 'Game Modes',
            value: Formatters.arrayDisplay(modeNames)
          });
        }
      }

      // Steam Link (if available)
      if (meta.steamUrl) {
        details.push({
          label: 'Steam',
          value: `< a href = "${sanitizeURL(meta.steamUrl)}" target = "_blank" rel = "noopener" > View on Steam</a > `,
          isHtml: true
        });
      }

      // Epic Games Link (if available)
      if (meta.epicUrl) {
        details.push({
          label: 'Epic Games',
          value: `< a href = "${sanitizeURL(meta.epicUrl)}" target = "_blank" rel = "noopener" > View on Epic</a > `,
          isHtml: true
        });
      }

      return details;
    }
  }
};

/**
 * Populate modal details section using renderer strategy
 * @param {object} item - Normalized item with metadata
 * @param {HTMLElement} detailsContainer - Container element to populate (optional)
 */
function populateModalDetails(item, detailsContainer = null) {
  const meta = item.metadata;
  const type = meta.type;

  // Get the renderer for this type
  const renderer = ModalRenderers[type];
  if (!renderer) {
    console.warn(`No renderer found for type: ${type} `);
    return;
  }

  // Render type-specific details
  const details = renderer.render(item);

  // Populate the flexible details section if it exists
  const flexibleSection = detailsContainer || document.querySelector('#modal-flexible-details .modal-details-grid');
  if (flexibleSection) {
    let html = '';
    details.forEach(detail => {
      const displayValue = detail.isHtml ? detail.value : sanitizeHTML(detail.value);
      html += `
      < div class="modal-detail-card" >
          <span class="detail-card-label">${sanitizeHTML(detail.label)}</span>
          <span class="detail-card-value">${displayValue}</span>
        </div >
      `;
    });
    flexibleSection.innerHTML = html;
  }
}

function showItemDetails(item, index = 0) {
  // Capture focus
  if (document.activeElement && document.activeElement !== document.body) {
    lastFocusedElement = document.activeElement;
  }

  const modal = document.getElementById('content-modal');
  const meta = item.metadata;

  // Bookmark Logic for Modal
  const modalBookmarkBtn = document.getElementById('modal-bookmark-btn');

  // Update initial state
  const updateModalBookmarkState = () => {
    const isBookmarked = bookmarkManager.isBookmarked(item.id);
    modalBookmarkBtn.classList.toggle('active', isBookmarked);
  };
  updateModalBookmarkState();

  // Remove old event listeners (clone node trick)
  const newBtn = modalBookmarkBtn.cloneNode(true);
  modalBookmarkBtn.parentNode.replaceChild(newBtn, modalBookmarkBtn);

  newBtn.addEventListener('click', () => {
    const isAdded = bookmarkManager.toggle(item);
    newBtn.classList.toggle('active', isAdded);

    // Find the card by item ID (more reliable than index which can become stale)
    const gridCard = document.querySelector(`.content-card[data-item-id="${item.id}"]`);

    // Update the card bookmark icon if it exists
    if (gridCard) {
      const cardIcon = gridCard.querySelector('.bookmark-btn-card');
      if (cardIcon) {
        cardIcon.classList.toggle('active', isAdded);
      }
    }

    // If on bookmarks page and removed, close modal and remove from grid
    if (Router.getCurrentRoute() === 'bookmarks' && !isAdded) {
      // Fade out the modal
      modal.style.transition = 'opacity 0.3s ease';
      modal.style.opacity = '0';

      // Remove the item from currentMoviesArray
      const itemIndex = currentMoviesArray.findIndex(m => m.id === item.id);
      if (itemIndex !== -1) {
        currentMoviesArray.splice(itemIndex, 1);
      }

      // After fade out, hide modal and remove card
      setTimeout(() => {
        modal.style.display = 'none';
        modal.style.opacity = '1'; // Reset for next time
        modal.style.transition = '';

        // Remove the card from the grid with animation
        if (gridCard) {
          gridCard.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          gridCard.style.transform = 'scale(0.9)';
          gridCard.style.opacity = '0';
          setTimeout(() => {
            gridCard.remove();
            // Check if all bookmarks are gone
            if (currentMoviesArray.length === 0) {
              const container = document.getElementById('movies-container');
              if (container) {
                container.innerHTML = CardComponents.getEmptyBookmarksHTML();
              }
            }
          }, 300);
        }
      }, 300);
    }
  });

  // Populate Basic Info
  const modalPoster = document.getElementById('modal-poster');
  modalPoster.src = sanitizeURL(item.poster);
  modalPoster.alt = item.title;
  document.getElementById('modal-title').textContent = item.title;

  // Genres - Use Formatters for array display (limit to 3)
  const displayGenres = item.genres.slice(0, 3);
  document.getElementById('modal-genres').innerHTML =
    `<span class="detail-label">Genres</span><span class="detail-value">${Formatters.arrayDisplay(displayGenres)}</span>`;

  // Date - Use Formatters for date display
  const dateText = Formatters.dateDisplay(item.releaseDate, 'long');
  document.getElementById('modal-year').innerHTML =
    `<span class="detail-label">Release Date</span><span class="detail-value">${dateText}</span>`;

  // Rating - Use Formatters for rating display
  const ratingText = Formatters.ratingDisplay(item.rating, item.ratingMax);
  document.getElementById('modal-rating').innerHTML =
    `<span class="detail-label">Rating</span><span class="detail-value">${ratingText}</span>`;

  // Runtime - Use Formatters for runtime display
  const runtimeElem = document.getElementById('modal-runtime');
  if (meta.runtime) {
    const runtimeText = Formatters.runtimeDisplay(meta.runtime);
    runtimeElem.innerHTML = `<span class="detail-label">Runtime</span><span class="detail-value">${runtimeText}</span>`;
    runtimeElem.style.display = 'flex';
  } else {
    runtimeElem.style.display = 'none';
  }

  // Populate Overview Section
  const overviewText = document.getElementById('modal-overview-text');
  if (overviewText) {
    overviewText.textContent = item.description || 'No overview available.';
  }

  // PHASE 3: Populate flexible details section using type-specific renderer
  // This single line replaces ~200 lines of type-checking conditionals!
  populateModalDetails(item);

  // Store index
  modal.dataset.currentIndex = index;
  modal.style.display = 'flex';

  // Move focus to close button
  const closeBtn = modal.querySelector('.close-modal');
  if (closeBtn) {
    // Small timeout to ensure visibility
    setTimeout(() => closeBtn.focus(), 50);
  }
}

// Global variable to store movies array
let currentMoviesArray = [];
let unfilteredItemsArray = []; // Store all items before filtering
let currentDateFilter = 'all'; // Current active filter: 'all', 'month', 'week'

// Focus Management
let lastFocusedElement = null;

function setupModal() {
  const modal = document.getElementById('content-modal');
  const closeBtn = document.querySelector('.close-modal');
  const prevBtn = document.getElementById('modal-prev');
  const nextBtn = document.getElementById('modal-next');

  function closeModal() {
    modal.style.display = 'none';

    // Return focus
    if (lastFocusedElement) {
      lastFocusedElement.focus();
      lastFocusedElement = null;
    }
  }

  closeBtn.addEventListener('click', closeModal);

  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Previous button
  prevBtn.addEventListener('click', () => {
    const currentIndex = parseInt(modal.dataset.currentIndex || 0);
    const newIndex = currentIndex > 0 ? currentIndex - 1 : currentMoviesArray.length - 1;
    showItemDetails(currentMoviesArray[newIndex], newIndex);
  });

  // Next button
  nextBtn.addEventListener('click', () => {
    const currentIndex = parseInt(modal.dataset.currentIndex || 0);
    const newIndex = currentIndex < currentMoviesArray.length - 1 ? currentIndex + 1 : 0;
    showItemDetails(currentMoviesArray[newIndex], newIndex);
  });

  // Keyboard navigation & Focus Trap
  document.addEventListener('keydown', (e) => {
    if (modal.style.display === 'flex') {
      if (e.key === 'Escape') {
        closeModal();
      } else if (e.key === 'ArrowLeft') {
        prevBtn.click();
      } else if (e.key === 'ArrowRight') {
        nextBtn.click();
      } else if (e.key === 'Tab') {
        // Focus Trap
        const focusableElements = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    }
  });
}





// Sidebar toggle functionality
document.addEventListener('DOMContentLoaded', () => {
  const sidebarToggleBtn = document.getElementById('sidebar-toggle');
  const layoutContainer = document.querySelector('.layout-container');
  
  if (sidebarToggleBtn && layoutContainer) {
    // Check if sidebar is collapsed in localStorage
    const isSidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (isSidebarCollapsed) {
      layoutContainer.classList.add('sidebar-collapsed');
      sidebarToggleBtn.textContent = '→';
    }
    
    sidebarToggleBtn.addEventListener('click', () => {
      layoutContainer.classList.toggle('sidebar-collapsed');
      const isNowCollapsed = layoutContainer.classList.contains('sidebar-collapsed');
      localStorage.setItem('sidebarCollapsed', isNowCollapsed);
      sidebarToggleBtn.textContent = isNowCollapsed ? '→' : '←';
      
      // IMPORTANT: Recalculate grid when sidebar toggles
      // Available width changes significantly (260px vs 60px), so column count may change
      // Use delay to allow CSS transitions to complete
      setTimeout(() => {
        checkAndAdjustColumns();
      }, GridConfig.SIDEBAR_TRANSITION_DURATION);
      
      // Close any open submenus when sidebar collapses
      if (isNowCollapsed) {
        const submenuButtons = document.querySelectorAll('[data-toggle-submenu]');
        submenuButtons.forEach(btn => {
          const submenuId = btn.getAttribute('data-toggle-submenu');
          const submenu = document.getElementById(submenuId);
          if (submenu) {
            submenu.setAttribute('hidden', '');
            btn.setAttribute('aria-expanded', 'false');
          }
        });
      }
    });
    
    // Also watch for class changes (in case sidebar is toggled programmatically)
    const sidebarObserver = new MutationObserver(() => {
      // Debounce to avoid multiple rapid recalculations
      clearTimeout(window.sidebarCalcTimeout);
      window.sidebarCalcTimeout = setTimeout(() => {
        checkAndAdjustColumns();
      }, GridConfig.SIDEBAR_TRANSITION_DURATION);
    });
    
    sidebarObserver.observe(layoutContainer, {
      attributes: true,
      attributeFilter: ['class']
    });
  }

  // Date filter event listeners
  const dateFilterButtons = document.querySelectorAll('.date-filter-btn');
  dateFilterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      applyDateFilter(filter);
    });
  });

  // Grid Responsive Column Detection - Optimized Configuration System
  const contentGrid = document.getElementById('movies-container');
  
  // Centralized grid configuration - sync these with CSS values for futureproofing
  const GridConfig = {
    BREATHING_ROOM: 0, // px - right edge gap
    SIDEBAR_COLLAPSE_THRESHOLD: 1024, // px
    SIDEBAR_TRANSITION_DURATION: 300, // ms - match CSS transition duration
    MIN_COLUMNS: 2,
    MAX_COLUMNS: 10,
    RESIZE_DEBOUNCE: 250, // ms - wait this long after resize stops before final check
    RESIZE_THROTTLE: 50, // ms - during resize, check at most this often (0 = no throttle, maximum responsiveness)
    REM_BASE: 16,
    
    // Get CSS token values dynamically instead of hardcoding
    getCardWidth() {
      const cardElem = document.querySelector('.content-card');
      if (cardElem) {
        return parseFloat(getComputedStyle(cardElem).width) / this.REM_BASE;
      }
      return 12.5; // fallback
    },
    
    getGap() {
      const styles = getComputedStyle(document.documentElement);
      const spaceXl = styles.getPropertyValue('--space-xl').trim();
      return parseFloat(spaceXl) / this.REM_BASE || 2;
    },
    
    getPadding() {
      const styles = getComputedStyle(document.documentElement);
      const spaceLg = styles.getPropertyValue('--space-lg').trim();
      return parseFloat(spaceLg) / this.REM_BASE || 1.5;
    },
    
    getLeftMargin() {
      const styles = getComputedStyle(contentGrid);
      return parseFloat(styles.marginLeft) / this.REM_BASE || 8.875;
    },
    
    getSidebarWidth() {
      const sidebar = document.querySelector('.sidebar');
      return sidebar ? parseFloat(getComputedStyle(sidebar).width) / this.REM_BASE : 16.25;
    },
    
    getCollapsedSidebarWidth() {
      return 3.75; // 60px
    }
  };

  // User-adjustable max columns (persisted)
  const storedMaxCols = parseInt(localStorage.getItem('gridMaxColumns'), 10);
  const initialMaxCols = Number.isInteger(storedMaxCols)
    ? Math.min(10, Math.max(GridConfig.MIN_COLUMNS, storedMaxCols))
    : GridConfig.MAX_COLUMNS;
  GridConfig.MAX_COLUMNS = initialMaxCols;

  // Max column selector UI (stepper)
  const maxColValue = document.querySelector('.grid-max-value');
  const maxColStepperButtons = document.querySelectorAll('.grid-step-btn');

  function updateMaxColDisplay(value) {
    if (maxColValue) {
      maxColValue.textContent = String(value);
      maxColValue.setAttribute('aria-label', `Max columns ${value}`);
    }
  }

  function handleMaxColSelection(value, shouldRecalc = true) {
    if (!Number.isInteger(value)) return;
    const clampedValue = Math.min(10, Math.max(GridConfig.MIN_COLUMNS, value));
    GridConfig.MAX_COLUMNS = clampedValue;
    localStorage.setItem('gridMaxColumns', String(clampedValue));
    updateMaxColDisplay(clampedValue);
    if (columnCount > clampedValue) {
      updateGridColumns(clampedValue);
    } else if (shouldRecalc) {
      checkAndAdjustColumns();
    }
  }

  updateMaxColDisplay(GridConfig.MAX_COLUMNS);

  if (maxColStepperButtons.length > 0) {
    maxColStepperButtons.forEach(btn => {
      const step = parseInt(btn.dataset.step, 10);
      if (!Number.isInteger(step)) return;
      btn.addEventListener('click', () => {
        handleMaxColSelection(GridConfig.MAX_COLUMNS + step, true);
      });
    });
  }
  
  let columnCount = 5; // Start with default number of columns
  let lastCalculatedWidth = 0; // Cache for error recovery
  
  function getAvailableWidth() {
    try {
      const windowWidthPx = window.innerWidth;
      const windowWidthRem = windowWidthPx / GridConfig.REM_BASE;
      
      const layoutContainer = document.querySelector('.layout-container');
      const isSidebarCollapsed = windowWidthPx <= GridConfig.SIDEBAR_COLLAPSE_THRESHOLD || 
                                 (layoutContainer && layoutContainer.classList.contains('sidebar-collapsed'));
      
      const activeSidebarWidth = isSidebarCollapsed ? GridConfig.getCollapsedSidebarWidth() : GridConfig.getSidebarWidth();
      const leftMargin = GridConfig.getLeftMargin();
      const breathingRoom = GridConfig.BREATHING_ROOM / GridConfig.REM_BASE;
      
      const availableRem = windowWidthRem - activeSidebarWidth - leftMargin - breathingRoom;
      return Math.max(0, availableRem);
    } catch (error) {
      console.error('Error calculating available width:', error);
      return lastCalculatedWidth || 60; // Fallback
    }
  }
  
  function calculateOptimalColumns() {
    try {
      const availableRem = getAvailableWidth();
      lastCalculatedWidth = availableRem; // Cache for fallback
      
      const cardWidth = GridConfig.getCardWidth();
      const gap = GridConfig.getGap();
      const spacePerColumn = (cardWidth + gap) * 0.94; // Slightly reduce for adding breathing room
      
      const optimalCols = Math.floor(availableRem / spacePerColumn);
      return Math.max(GridConfig.MIN_COLUMNS, Math.min(optimalCols, GridConfig.MAX_COLUMNS));
    } catch (error) {
      console.error('Error calculating optimal columns:', error);
      return columnCount; // Fallback to current count
    }
  }
  
  function calculateBorderWidth() {
    try {
      const cards = contentGrid.querySelectorAll('.content-card');
      const cardCount = cards.length;
      
      if (cardCount === 0) return;
      
      const cardsInFirstRow = Math.min(cardCount, columnCount);
      const cardWidth = GridConfig.getCardWidth();
      const gap = GridConfig.getGap();
      const padding = GridConfig.getPadding();
      
      const totalWidth = (cardsInFirstRow * cardWidth) + ((cardsInFirstRow - 1) * gap) + (padding * 2);
      contentGrid.style.maxWidth = `${totalWidth}rem`;
    } catch (error) {
      console.error('Error calculating border width:', error);
    }
  }
  
  function updateGridColumns(colCount) {
    try {
      const clampedCount = Math.max(GridConfig.MIN_COLUMNS, Math.min(colCount, GridConfig.MAX_COLUMNS));
      
      if (clampedCount === columnCount) return;
      
      columnCount = clampedCount;
      const cardWidth = GridConfig.getCardWidth();
      
      contentGrid.style.gridTemplateColumns = `repeat(${columnCount}, minmax(${cardWidth}rem, 1fr))`;
      localStorage.setItem('gridColumnCount', columnCount);
      
      // Force border reflow
      contentGrid.style.width = 'auto';
      contentGrid.offsetHeight;
      contentGrid.style.width = '';
      
      calculateBorderWidth();
    } catch (error) {
      console.error('Error updating grid columns:', error);
    }
  }
  
  function checkAndAdjustColumns() {
    const optimalCols = calculateOptimalColumns();
    if (optimalCols !== columnCount) {
      updateGridColumns(optimalCols);
    }
  }
  
  // Initialize grid - try multiple hooks for robustness
  function initializeGrid() {
    // CRITICAL: Reset columnCount to force updateGridColumns to actually set the style
    // Otherwise if columnCount === optimalCols, the early return prevents setting the style
    columnCount = -1;
    
    const optimalCols = calculateOptimalColumns();
    updateGridColumns(optimalCols);
  }
  
  // Try multiple initialization hooks
  // 1. DOMContentLoaded already fired since we're in its callback
  // 2. Use window.load for full page load
  // 3. Use requestAnimationFrame for next paint
  // 4. Use setTimeout as fallback
  
  if (document.readyState === 'loading') {
    // Document still loading, use setTimeout
    setTimeout(initializeGrid, 500);
  } else if (document.readyState === 'interactive') {
    // DOM ready but resources loading, use requestAnimationFrame
    requestAnimationFrame(() => {
      setTimeout(initializeGrid, 100);
    });
  } else {
    // Everything loaded, run immediately but still async
    requestAnimationFrame(initializeGrid);
  }
  
  // Also try on window load as final fallback
  window.addEventListener('load', () => {
    initializeGrid();
  }, { once: true });
  
  // Listen for window resize events - combined debounce + throttle for optimal responsiveness
  // Debounce: Wait until resize finishes (RESIZE_DEBOUNCE)
  // Throttle: Check for changes frequently while resizing (RESIZE_THROTTLE)
  let resizeTimeout;
  let lastResizeCheck = 0;
  let lastCheckedWidth = getAvailableWidth();
  
  window.addEventListener('resize', () => {
    const now = Date.now();
    const timeSinceLastCheck = now - lastResizeCheck;
    
    // Clear the debounce timer
    clearTimeout(resizeTimeout);
    
    // If throttle time has passed, check dimensions immediately
    if (GridConfig.RESIZE_THROTTLE === 0 || timeSinceLastCheck >= GridConfig.RESIZE_THROTTLE) {
      lastResizeCheck = now;
      const currentWidth = getAvailableWidth();
      
      // Only recalculate if width changed significantly (>0.5rem difference to avoid jitter)
      if (Math.abs(currentWidth - lastCheckedWidth) > 0.5) {
        lastCheckedWidth = currentWidth;
        requestAnimationFrame(() => {
          checkAndAdjustColumns();
        });
      }
    }
    
    // Always set debounce timer for final check when resize stops
    resizeTimeout = setTimeout(() => {
      const finalWidth = getAvailableWidth();
      if (Math.abs(finalWidth - lastCheckedWidth) > 0.1) {
        lastCheckedWidth = finalWidth;
        checkAndAdjustColumns();
      }
    }, GridConfig.RESIZE_DEBOUNCE);
  });
  
  // Use ResizeObserver for more efficient grid content tracking
  // Watches for actual grid/content area changes, not just window resize
  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(() => {
      calculateBorderWidth();
    });
    resizeObserver.observe(contentGrid);
  }
  
  // Watch for changes to the grid content (cards added/removed)
  const mutationObserver = new MutationObserver(() => {
    calculateBorderWidth();
  });
  
  mutationObserver.observe(contentGrid, {
    childList: true,
    subtree: false
  });

});

// ============================================================================
// SEARCH FUNCTIONALITY - Unified search across all loaded content
// ============================================================================

const SearchModule = {
  /**
   * All loaded items from all categories
   */
  allItems: [],

  /**
   * Initialize search module
   */
  init() {
    this.setupEventListeners();
    this.loadAllContent();
    this.updateDropdownPosition();
    
    // Update dropdown position when sidebar toggles
    window.addEventListener('resize', () => {
      this.updateDropdownPosition();
    });
    
    // Watch for sidebar collapse
    const layoutContainer = document.querySelector('.layout-container');
    if (layoutContainer) {
      const sidebarObserver = new MutationObserver(() => {
        this.updateDropdownPosition();
      });
      
      sidebarObserver.observe(layoutContainer, {
        attributes: true,
        attributeFilter: ['class']
      });
    }
  },

  /**
   * Update dropdown position based on sidebar state
   */
  updateDropdownPosition() {
    const searchResults = document.getElementById('search-results');
    if (!searchResults) return;
    
    const layoutContainer = document.querySelector('.layout-container');
    const isSidebarCollapsed = layoutContainer && layoutContainer.classList.contains('sidebar-collapsed');
    
    // Sidebar width: 260px when expanded, 60px when collapsed
    const sidebarWidth = isSidebarCollapsed ? 60 : 260;
    const headerCenterWidth = 350;
    
    // Calculate position: sidebar width + half of remaining space + offset to center on search bar
    const leftPosition = sidebarWidth + (window.innerWidth - sidebarWidth) / 2 + 140;
    
    searchResults.style.left = leftPosition + 'px';
  },

  /**
   * Load all content from all categories for search
   */
  async loadAllContent() {
    try {
      const promises = [];

      // Load top-level categories and their subcategories (e.g., movies/past-week)
      Object.entries(CATEGORY_CONFIG).forEach(([category, config]) => {
        if (config && config.dataFile && config.adapter) {
          promises.push(this.loadDataFile(config.dataFile, config.adapter));
        }

        if (config && config.subcategories && config.adapter) {
          Object.values(config.subcategories).forEach(subCfg => {
            const subAdapter = subCfg && (subCfg.adapter || config.adapter);
            if (subCfg && subCfg.dataFile && subAdapter) {
              promises.push(this.loadDataFile(subCfg.dataFile, subAdapter));
            }
          });
        }
      });

      const results = await Promise.all(promises);
      this.allItems = this.dedupeItems(results.flat());
      console.log(`Search: Loaded ${this.allItems.length} items for searching (deduped)`);
    } catch (error) {
      console.error('Error loading content for search:', error);
    }
  },

  /**
   * Load a single category's data (top-level)
   */
  async loadCategory(category) {
    const config = CATEGORY_CONFIG[category];
    if (!config || !config.dataFile) return [];

    try {
      return this.loadDataFile(config.dataFile, config.adapter);
    } catch (error) {
      console.warn(`Failed to load ${category} for search:`, error);
      return [];
    }
  },

  /**
   * Load and normalize a data file with the given adapter
   */
  async loadDataFile(dataFile, adapter) {
    if (!dataFile || !adapter) return [];
    try {
      const response = await fetch(`${dataFile}?t=${Date.now()}`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.map(adapter);
    } catch (error) {
      console.warn(`Failed to load data file ${dataFile} for search:`, error);
      return [];
    }
  },

  /**
   * Deduplicate items by metadata type + id to avoid duplicates across subcategories
   */
  dedupeItems(items) {
    const seen = new Set();
    const unique = [];
    items.forEach(item => {
      if (!item || !item.id) return;
      const key = `${item.metadata && item.metadata.type ? item.metadata.type : 'item'}-${item.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      unique.push(item);
    });
    return unique;
  },

  /**
   * Search items by title and genres
   * @param {string} query - Search query
   * @returns {array} Matching items
   */
  search(query) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const lowerQuery = query.toLowerCase().trim();
    
    return this.allItems.filter(item => {
      // Search in title
      if (item.title && item.title.toLowerCase().includes(lowerQuery)) {
        return true;
      }

      // Search in genres
      if (item.genres && Array.isArray(item.genres)) {
        const genreMatch = item.genres.some(genre =>
          genre.toLowerCase().includes(lowerQuery)
        );
        if (genreMatch) return true;
      }

      return false;
    }).slice(0, 8); // Limit to 8 results
  },

  /**
   * Set up event listeners for search input
   */
  setupEventListeners() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const searchResultsList = document.getElementById('search-results-list');

    if (!searchInput) return;

    // Debounce search input
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value;

      searchTimeout = setTimeout(() => {
        this.displayResults(query, searchResultsList, searchResults);
      }, 300); // 300ms debounce
    });

    // Close results when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.header-center')) {
        searchResults.classList.remove('active');
      }
    });

    // Close results on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchResults.classList.remove('active');
        searchInput.value = '';
      }
    });
  },

  /**
   * Display search results
   * @param {string} query - Search query
   * @param {HTMLElement} listContainer - Results list container
   * @param {HTMLElement} resultsContainer - Results dropdown container
   */
  displayResults(query, listContainer, resultsContainer) {
    if (!query || query.trim().length === 0) {
      resultsContainer.classList.remove('active');
      return;
    }

    const results = this.search(query);

    if (results.length === 0) {
      listContainer.innerHTML = '<div class="search-no-results">No results found</div>';
      resultsContainer.classList.add('active');
      return;
    }

    // Build results HTML
    listContainer.innerHTML = results.map((item, index) => {
      const genres = item.genres && item.genres.length > 0
        ? item.genres.slice(0, 2).join(', ')
        : 'No genres';
      
      const releaseDate = item.releaseDate 
        ? new Date(item.releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : 'TBA';

      return `
        <li>
          <button class="search-result-item" data-item-id="${item.id}" data-item-index="${index}">
            <img 
              src="${sanitizeURL(item.poster)}" 
              alt="${sanitizeHTML(item.title)}" 
              class="search-result-thumbnail"
            >
            <div class="search-result-info">
              <h4 class="search-result-title">${sanitizeHTML(item.title)}</h4>
              <div class="search-result-genres">${sanitizeHTML(genres)}</div>
              <div class="search-result-date">${releaseDate}</div>
            </div>
          </button>
        </li>
      `;
    }).join('');

    // Add click handlers to results
    listContainer.querySelectorAll('.search-result-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemId = btn.getAttribute('data-item-id');
        const item = this.allItems.find(i => i.id == itemId);

        if (item) {
          // Find the item's index in currentMoviesArray (or use the search result's position)
          const itemIndex = currentMoviesArray.findIndex(i => i.id == itemId);
          showItemDetails(item, itemIndex >= 0 ? itemIndex : 0);

          // Close search results
          resultsContainer.classList.remove('active');
          document.getElementById('search-input').value = '';
        }
      });
    });

    resultsContainer.classList.add('active');
  }
};

// Initialize search when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  SearchModule.init();
});
