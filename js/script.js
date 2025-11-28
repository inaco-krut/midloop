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
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280';

let wrappers, tl;
let config = {
  isDebug: false,
  speed: 10
};

function init() {
  const split = Splitting({
    target: ".featured-text",
    by: "chars"
  });
  split.forEach(splitInstance => {
    wrappers = duplicateChars(splitInstance.chars);
    anim(wrappers);
  });
}

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

// Category text scrambling animation
const categoryNames = {
  'movies': 'MOVIES',
  'tv-shows': 'TV SHOWS',
  'books': 'BOOKS',
  'games': 'GAMES',
  'music': 'MUSIC'
};

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

// Menu click handlers and History API logic
document.addEventListener('DOMContentLoaded', () => {
  const navLinks = document.querySelectorAll('.nav-link');
  const categoryText = document.querySelector('.category-text');

  // Helper to get category from URL
  function getCategoryFromUrl() {
    const path = window.location.pathname.replace(/^\/+/, ''); // Remove leading slash
    // Default to 'movies' if root or empty
    if (!path) return 'movies';
    // Check if path is a valid category
    if (Object.keys(categoryNames).includes(path)) return path;
    // Fallback to movies for unknown paths
    return 'movies';
  }

  // Helper to update UI state
  function updateUI(category) {
    const categoryName = categoryNames[category];

    // Remove active class from all links
    navLinks.forEach(l => {
      l.classList.remove('active');
      l.removeAttribute('aria-current');
    });

    // Add active class to current category link
    const activeLink = document.querySelector(`.nav-link[data-category="${category}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
      activeLink.setAttribute('aria-current', 'page');
    }

    if (categoryName) {
      scrambleText(categoryText, categoryName, 350);
    }

    loadContent(category);
  }

  // Handle Back/Forward buttons
  window.addEventListener('popstate', (e) => {
    const category = getCategoryFromUrl();
    updateUI(category);
  });

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const category = link.getAttribute('data-category');

      // Check if this link is already active
      const isAlreadyActive = link.classList.contains('active');

      if (isAlreadyActive) {
        // Scroll to top if clicking the already-active item
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
        return;
      }

      // Push state to history
      history.pushState(null, '', `/${category}`);

      // Check current scroll position
      const scrollThreshold = 300; // Only scroll to top if scrolled more than 300px
      const currentScrollY = window.scrollY || window.pageYOffset;

      if (currentScrollY > scrollThreshold) {
        // Scroll to top first, then change category
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });

        // Wait for scroll to complete before changing content
        setTimeout(() => {
          updateUI(category);
        }, 500); // 500ms delay to allow smooth scroll to complete
      } else {
        // Already near the top, change immediately
        updateUI(category);
      }
    });
  });

  // Initial load based on URL
  const initialCategory = getCategoryFromUrl();

  // Update history state for initial load to ensure consistency
  // If we are at root /, this will rewrite it to /movies which might be desired or not.
  // If user wants to keep / as alias for /movies, we can skip replaceState if path is empty.
  // But for clean canonical URLs, let's stick to the category name.
  if (window.location.pathname === '/' || window.location.pathname === '') {
    history.replaceState(null, '', `/${initialCategory}`);
  }

  updateUI(initialCategory);

  // Modal functionality
  setupModal();
});

// Adapter Pattern Implementation

// Standardize Genre Map
const genreMap = {
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
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western"
};

// Adapters
function normalizeMovie(rawMovie) {
  // Handle genres: rawMovie.genre_ids (array of IDs) -> array of strings
  let genres = [];
  if (rawMovie.genre_ids && rawMovie.genre_ids.length > 0) {
    genres = rawMovie.genre_ids.map(id => genreMap[id]).filter(Boolean);
  }

  // Handle poster URL
  const poster = (!rawMovie.poster_path || rawMovie.poster_path === 'placeholder_poster.jpg')
    ? 'shared-data/placeholder_poster.jpg'
    : TMDB_IMAGE_BASE + rawMovie.poster_path;

  // Handle release date
  const releaseDate = rawMovie.digital_release_date;

  return {
    id: rawMovie.id,
    title: rawMovie.title,
    poster: poster,
    releaseDate: releaseDate,
    rating: rawMovie.vote_average, // 0-10 scale
    ratingMax: 10,
    genres: genres,
    description: rawMovie.overview || 'No overview available.',
    metadata: {
      imdbId: rawMovie.imdb_id,
      runtime: rawMovie.runtime,
      type: 'movie'
    }
  };
}

function normalizeTVShow(rawShow) {
  // Similar to movie but with TV specific fields
  let genres = [];
  if (rawShow.genre_ids && rawShow.genre_ids.length > 0) {
    genres = rawShow.genre_ids.map(id => genreMap[id]).filter(Boolean);
  }

  const poster = (!rawShow.poster_path || rawShow.poster_path === 'placeholder_poster.jpg')
    ? 'shared-data/placeholder_poster.jpg'
    : TMDB_IMAGE_BASE + rawShow.poster_path;

  return {
    id: rawShow.id,
    title: rawShow.title || rawShow.name, // TV shows use 'title' in our data, but 'name' in TMDB usually
    poster: poster,
    releaseDate: (() => {
      const firstAirDate = rawShow.first_air_date || rawShow.digital_release_date;
      if (!firstAirDate) return null;

      const firstAir = new Date(firstAirDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      firstAir.setHours(0, 0, 0, 0);

      // If first air date is in the past (older than today), use next episode date
      if (firstAir < today && rawShow.next_episode_date) {
        return rawShow.next_episode_date;
      }
      return firstAirDate;
    })(),
    rating: rawShow.vote_average,
    ratingMax: 10,
    genres: genres,
    description: rawShow.overview || 'No overview available.',
    metadata: {
      imdbId: rawShow.imdb_id,
      seasons: rawShow.number_of_seasons,
      episodes: rawShow.number_of_episodes,
      networks: rawShow.networks,
      status: rawShow.release_status,
      nextEpisodeDate: rawShow.next_episode_date,
      creators: rawShow.created_by,
      type: 'tv-show'
    }
  };
}

function normalizeGame(rawGame) {
  // Games have genres as array of strings already
  const genres = rawGame.genres || [];

  // Games use direct URLs or relative paths
  const poster = rawGame.poster_path || 'shared-data/placeholder_poster.jpg';

  // Handle date (Unix timestamp)
  let releaseDate = null;
  if (rawGame.first_release_date) {
    // Convert timestamp to ISO string for consistency
    const date = new Date(parseInt(rawGame.first_release_date) * 1000);
    releaseDate = date.toISOString();
  }

  return {
    id: rawGame.id,
    title: rawGame.name,
    poster: poster,
    releaseDate: releaseDate,
    rating: rawGame.total_rating, // 0-100 scale
    ratingMax: 100,
    genres: genres,
    description: rawGame.summary || 'No summary available.',
    metadata: {
      steamUrl: rawGame.steam_url,
      platforms: rawGame.platforms,
      developers: rawGame.developers,
      publishers: rawGame.publishers,
      gameModes: rawGame.game_modes,
      type: 'game'
    }
  };
}

// Category Configuration
const CATEGORY_CONFIG = {
  movies: {
    dataFile: 'shared-data/data.json',
    adapter: normalizeMovie,
    displayName: 'Movies'
  },
  'tv-shows': {
    dataFile: 'shared-data/data_tv_shows.json',
    adapter: normalizeTVShow,
    displayName: 'TV Shows'
  },
  games: {
    dataFile: 'shared-data/data_games.json',
    adapter: normalizeGame,
    displayName: 'Games'
  },
  books: {
    dataFile: 'shared-data/data_books.json', // Placeholder
    adapter: (data) => data, // Placeholder
    displayName: 'Books'
  },
  music: {
    dataFile: 'shared-data/data_music.json', // Placeholder
    adapter: (data) => data, // Placeholder
    displayName: 'Music'
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

function loadContent(category) {
  const config = CATEGORY_CONFIG[category];
  const container = document.getElementById('movies-container');

  if (!config) {
    console.error(`Unknown category: ${category}`);
    return;
  }

  // CHECK CACHE FIRST (Respect TTL)
  if (dataCache.isValid(category)) {
    // Fade out current content
    container.style.transition = 'opacity 0.2s ease';
    container.style.opacity = '0';

    setTimeout(() => {
      const cachedData = dataCache.get(category);
      displayItems(cachedData);
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
    fetch(`${config.dataFile}?t=${Date.now()}`)
      .then(response => {
        if (!response.ok) {
          // If file doesn't exist (e.g. books/music), show coming soon
          throw new Error('Content not found');
        }
        return response.json();
      })
      .then(data => {
        // Normalize Data
        const normalizedData = data.map(config.adapter);

        // STORE IN CACHE
        dataCache.set(category, normalizedData);

        displayItems(normalizedData);

        // Fade in
        setTimeout(() => {
          container.style.opacity = '1';
        }, 50);
      })
      .catch(error => {
        console.log('Load error:', error);
        container.innerHTML = '<p class="error" style="text-align: center; padding: 2rem; color: var(--color-text-primary);">Coming Soon...</p>';
        container.style.opacity = '1';
      });
  }, 300);
}

function displayItems(items) {
  const container = document.getElementById('movies-container');
  container.innerHTML = '';

  // Store globally for modal navigation
  currentMoviesArray = items;

  items.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'movie-card';

    // Accessibility
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `View details for ${item.title}`);

    // Date Formatting
    let displayDate = 'TBA';
    let isReleasedToday = false;
    let isAlreadyOut = false;

    if (item.releaseDate) {
      const dateObj = new Date(item.releaseDate);
      displayDate = dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      // Check status
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkDate = new Date(dateObj);
      checkDate.setHours(0, 0, 0, 0);

      isReleasedToday = checkDate.getTime() === today.getTime();
      isAlreadyOut = checkDate < today;
    }

    // Status Badge
    let releaseBadge = '';

    // Check for "Returning Series" status in metadata
    const isReturningSeries = item.metadata && item.metadata.status === 'Returning Series';

    if (isReleasedToday) {
      card.classList.add('released-today');
      releaseBadge = '<div class="movie-status-badge status-new">Released Today</div>';
    } else if (isAlreadyOut || isReturningSeries) {
      releaseBadge = '<div class="movie-status-badge status-out">Available</div>';
    }

    // Genre Tag (Primary Genre)
    const primaryGenre = item.genres.length > 0 ? item.genres[0] : '';
    const genreTag = primaryGenre
      ? `<div class="movie-genre-tag">${sanitizeHTML(primaryGenre)}</div>`
      : '';

    // Rating
    // Normalize to 0-10 for score icon if max is 100
    let normalizedRating = item.rating;
    if (item.ratingMax === 100) {
      normalizedRating = item.rating / 10;
    }

    card.innerHTML = `
      <div class="movie-poster">
        <img src="${sanitizeURL(item.poster)}" alt="${sanitizeHTML(item.title)}" loading="lazy">
        ${releaseBadge}
        ${genreTag}
        <div class="movie-overlay">
          ${getScoreIconHtml(normalizedRating)}
          <button class="view-details">VIEW DETAILS</button>
        </div>
      </div>
      <div class="movie-info">
        <div class="movie-text-content">
          <h3 class="movie-title">${sanitizeHTML(item.title)}</h3>
        </div>
      </div>
      <div class="movie-date-floating">
        ${sanitizeHTML(displayDate)}
      </div>
    `;

    // Click Handler
    card.addEventListener('click', () => {
      showItemDetails(item, index);
    });

    // Keyboard Handler
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        showItemDetails(item, index);
      }
    });

    container.appendChild(card);
  });
}

function showItemDetails(item, index = 0) {
  // Capture focus
  if (document.activeElement && document.activeElement !== document.body) {
    lastFocusedElement = document.activeElement;
  }

  const modal = document.getElementById('movie-modal');
  const meta = item.metadata;

  // Populate Basic Info
  const modalPoster = document.getElementById('modal-poster');
  modalPoster.src = sanitizeURL(item.poster);
  modalPoster.alt = item.title;
  document.getElementById('modal-title').textContent = item.title;
  document.getElementById('modal-overview').textContent = item.description;

  // Genres
  document.getElementById('modal-genres').textContent = item.genres.length > 0
    ? item.genres.join(', ')
    : 'Genres: N/A';

  // Date
  let dateText = 'Release date coming soon';
  if (item.releaseDate) {
    const dateObj = new Date(item.releaseDate);
    dateText = `Release date: ${dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
  }
  document.getElementById('modal-year').textContent = dateText;

  // Rating
  let ratingText = 'Rating: N/A';
  if (item.rating) {
    if (item.ratingMax === 100) {
      ratingText = `Rating: ${parseFloat(item.rating).toFixed(1)}/100`;
    } else {
      ratingText = `${item.rating}/10`;
    }
  }
  document.getElementById('modal-rating').textContent = ratingText;

  // Runtime
  const runtimeElem = document.getElementById('modal-runtime');
  if (meta.runtime) {
    const hours = Math.floor(meta.runtime / 60);
    const minutes = meta.runtime % 60;
    runtimeElem.textContent = `Runtime: ${hours > 0 ? `${hours}h ` : ''}${minutes}m`;
    runtimeElem.style.display = 'inline-block';
  } else {
    runtimeElem.style.display = 'none';
  }

  // Buttons (IMDb / Steam)
  const actionButton = document.getElementById('modal-imdb-link');

  // Reset classes
  actionButton.className = '';

  if (meta.type === 'game') {
    actionButton.textContent = 'STEAM';
    actionButton.classList.add('steam-button');
    if (meta.steamUrl) {
      actionButton.href = sanitizeURL(meta.steamUrl);
    } else {
      actionButton.removeAttribute('href');
      actionButton.classList.add('disabled');
    }
  } else {
    // Movies / TV
    actionButton.textContent = 'IMDb';
    actionButton.classList.add('imdb-button');
    if (meta.imdbId) {
      actionButton.href = `https://www.imdb.com/title/${meta.imdbId}/`;
    } else {
      actionButton.removeAttribute('href');
      actionButton.classList.add('disabled');
    }
  }

  // Extra Details Section (TV Seasons / Game Platforms)
  const detailsSection = document.getElementById('modal-series-details-section');
  const detailsHeading = document.getElementById('modal-series-details-heading');
  const info1 = document.getElementById('modal-series-info-1');
  const info2 = document.getElementById('modal-series-info-2');
  const info3 = document.getElementById('modal-series-networks');
  const nextEpisodeElem = document.getElementById('modal-series-next-episode');

  // Hide specific list items that are now in details section
  document.getElementById('modal-seasons').style.display = 'none';
  document.getElementById('modal-episodes').style.display = 'none';
  document.getElementById('modal-type').style.display = 'none';
  document.getElementById('modal-networks').style.display = 'none';

  if (meta.type === 'tv-show') {
    detailsHeading.textContent = 'Series Details';
    info1.textContent = `${meta.seasons || 0} Seasons • ${meta.episodes || 0} Episodes`;
    info2.textContent = `Status: ${meta.status || 'Unknown'}`;

    const networks = meta.networks ? meta.networks.join(', ') : 'N/A';
    const creators = meta.creators && meta.creators.length > 0 ? meta.creators.join(', ') : '';

    info3.innerHTML = `Network: ${networks}${creators ? `<br>Created by: ${creators}` : ''}`;

    if (meta.nextEpisodeDate) {
      const nextEpDate = new Date(meta.nextEpisodeDate);
      const formattedDate = nextEpDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      nextEpisodeElem.textContent = `Next Episode: ${formattedDate}`;
      nextEpisodeElem.style.display = 'block';
    } else {
      nextEpisodeElem.style.display = 'none';
    }

    detailsSection.style.display = 'block';
  } else if (meta.type === 'game') {
    detailsHeading.textContent = 'Game Details';

    const platforms = meta.platforms ? meta.platforms.join(', ') : '';
    info1.textContent = platforms ? `Platforms: ${platforms}` : '';

    const modes = meta.gameModes ? meta.gameModes.join(', ') : '';
    info2.textContent = modes ? `Modes: ${modes}` : '';

    let devPub = [];
    if (meta.developers) devPub.push(`Dev: ${meta.developers.join(', ')}`);
    if (meta.publishers) devPub.push(`Pub: ${meta.publishers.join(', ')}`);
    info3.textContent = devPub.join(' • ');

    detailsSection.style.display = 'block';
    if (nextEpisodeElem) nextEpisodeElem.style.display = 'none';
  } else {
    // Movie
    detailsSection.style.display = 'none';

    // For movies, we need to move the button out or show the section but hide details?
    // Actually, since the button is NOW INSIDE the details section, we must show the section for movies too
    // BUT hide the text details.

    // Let's just create a "Movie Details" view or simply show the section with just the button.
    // However, the prompt asked for TV shows specifically.
    // If we hide detailsSection, the button is hidden for movies.
    // We need to append the button back to card_right__details or handle it differently.

    // Simpler fix: If it's a movie, we can't use the button inside that section if the section is hidden.
    // So we should make the section visible but hide the text content?
    // Or better, dynamically move the button?

    // Let's try showing the section but hiding the text parts.
    detailsHeading.style.display = 'none';
    info1.style.display = 'none';
    info2.style.display = 'none';
    info3.style.display = 'none';
    if (nextEpisodeElem) nextEpisodeElem.style.display = 'none';

    // Ensure container is flex
    const container = detailsSection.querySelector('.episode-details-container');
    if (container) {
      container.style.justifyContent = 'flex-start'; // Align button to left for Movies
    }

    detailsSection.style.display = 'block';
    // Remove border/background for movies if desired, or keep it as a container for the button.
    // To keep it clean for movies (just the button), let's remove the styling of the section temporarily?
    // Or just let it be a box with a button.
    detailsSection.style.background = 'transparent';
    detailsSection.style.border = 'none';
    detailsSection.style.padding = '0';
  }

  // Reset section styling for TV/Games
  if (meta.type !== 'movie') {
    detailsHeading.style.display = 'block';
    info1.style.display = 'block';
    info2.style.display = 'block';
    info3.style.display = 'block';
    detailsSection.style.background = ''; // Reset to CSS default
    detailsSection.style.border = ''; // Reset to CSS default
    detailsSection.style.padding = ''; // Reset to CSS default

    const container = detailsSection.querySelector('.episode-details-container');
    if (container) {
      container.style.justifyContent = 'space-between'; // Align button to far right for TV/Games
    }
  }

  // Store index
  modal.dataset.currentIndex = index;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  // Move focus to close button
  const closeBtn = modal.querySelector('.close-modal');
  if (closeBtn) {
    // Small timeout to ensure visibility
    setTimeout(() => closeBtn.focus(), 50);
  }
}

// Global variable to store movies array
let currentMoviesArray = [];

// Focus Management
let lastFocusedElement = null;

function setupModal() {
  const modal = document.getElementById('movie-modal');
  const closeBtn = document.querySelector('.close-modal');
  const prevBtn = document.getElementById('modal-prev');
  const nextBtn = document.getElementById('modal-next');

  function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';

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

function randRange(min, max) {
  return Math.round(Math.random() * (max - min) + min);
}

function duplicateChars(chars) {
  let wrappers = [];
  chars.forEach(el => {
    const wrapper = document.createElement("span");
    wrapper.setAttribute("class", "char-wrapper");
    el.parentNode.insertBefore(wrapper, el);
    wrapper.appendChild(el);
    let clone = el.cloneNode(true);
    clone.setAttribute("class", "char char--clone");
    wrapper.appendChild(clone);
    wrappers.push(wrapper);
  });
  return wrappers;
}

function anim(letters) {
  if (tl) {
    tl.kill();
  }
  tl = new TimelineMax({
    paused: true,
    onComplete: anim,
    onCompleteParams: [letters]
  });
  letters.forEach((letter, index) => {
    const gotoY = `-${randRange(0, 5) * 1}0vw`;
    const speed = config.speed + Math.random();
    tl.to(
      letter,
      speed,
      {
        y: gotoY,
        ease: "power1.inOut",
        onComplete: () => {
          TweenMax.to(letter, 0, { y: "0" });
        }
      },
      0
    );
  });
  tl.play();
}

function getScoreIconHtml(voteAverage) {
  if (!voteAverage) return '';

  const score = parseFloat(voteAverage);

  // Determine color based on score
  let color = '#39FF14'; // Neon Green
  let displayText = score.toFixed(1);
  let fontSize = '22px';

  if (score === 0) {
    color = '#888888'; // Grey for no score
    displayText = 'No<br>Score';
    fontSize = '12px';
  } else if (score < 4) {
    color = '#FF0055'; // Neon Red
  } else if (score < 7) {
    color = '#F3C623'; // Theme Yellow
  }

  // Security: Validate color is from our whitelist
  const validColors = ['#39FF14', '#888888', '#FF0055', '#F3C623'];
  if (!validColors.includes(color)) {
    color = '#888888'; // Default to grey if invalid
  }

  // Security: Validate fontSize
  const validFontSizes = ['22px', '12px'];
  if (!validFontSizes.includes(fontSize)) {
    fontSize = '22px';
  }

  // Security: Sanitize displayText (though it's controlled, extra safety)
  const sanitizedDisplayText = displayText.includes('<br>')
    ? 'No<br>Score'
    : sanitizeHTML(displayText);

  return `
    <div class="score-icon" style="--score-color: ${color}">
      <span class="score-value" style="color: ${color}; font-size: ${fontSize}; text-align: center;">${sanitizedDisplayText}</span>
    </div>
  `;
}

// Scroll to top functionality
document.addEventListener('DOMContentLoaded', () => {
  const scrollToTopBtn = document.getElementById('scrollToTop');
  const futurusBtn = document.getElementById('futurusBtn');

  if (scrollToTopBtn) {
    scrollToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // FUTURUS button with floating heart
  if (futurusBtn) {
    futurusBtn.addEventListener('click', (e) => {
      // Create heart element
      const heart = document.createElement('div');
      heart.className = 'floating-heart';
      heart.textContent = '❤️';

      const rect = futurusBtn.getBoundingClientRect();
      heart.style.left = `${rect.left + rect.width / 2 - 16}px`;
      heart.style.top = `${rect.top + rect.height / 2 - 16 + 60}px`;

      // Add to body
      document.body.appendChild(heart);

      // Remove heart after animation completes
      setTimeout(() => {
        heart.remove();
      }, 2500);
    });
  }


});

init();