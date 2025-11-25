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

// Menu click handlers
// Menu click handlers
document.addEventListener('DOMContentLoaded', () => {
  const navLinks = document.querySelectorAll('.nav-link');
  const categoryText = document.querySelector('.category-text');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const category = link.getAttribute('data-category');
      const categoryName = categoryNames[category];

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
          // Remove active class from all links
          navLinks.forEach(l => l.classList.remove('active'));

          // Add active class to clicked link
          link.classList.add('active');

          if (categoryName) {
            scrambleText(categoryText, categoryName, 350);
          }

          loadContent(category);
        }, 500); // 500ms delay to allow smooth scroll to complete
      } else {
        // Already near the top, change immediately
        // Remove active class from all links
        navLinks.forEach(l => l.classList.remove('active'));

        // Add active class to clicked link
        link.classList.add('active');

        if (categoryName) {
          scrambleText(categoryText, categoryName, 350);
        }

        loadContent(category);
      }
    });
  });

  // Initial load
  loadContent('movies');

  // Modal functionality
  setupModal();
});

function loadContent(category) {
  let dataFile = '';
  if (category === 'movies') {
    dataFile = 'shared-data/data.json';
  } else if (category === 'tv-shows') {
    dataFile = 'shared-data/data_tv_shows.json';
  } else {
    const container = document.getElementById('movies-container');
    // Fade out, change content, fade in
    container.style.transition = 'opacity 0.3s ease';
    container.style.opacity = '0';
    setTimeout(() => {
      container.innerHTML = '\u003cp class=\"error\" style=\"text-align: center; padding: 2rem; color: var(--text-color);\"\u003eComing Soon...\u003c/p\u003e';
      container.style.opacity = '1';
    }, 300);
    return;
  }

  const container = document.getElementById('movies-container');

  // Fade out current content
  container.style.transition = 'opacity 0.3s ease';
  container.style.opacity = '0';

  // Wait for fade out, then fetch and display new content
  setTimeout(() => {
    fetch(dataFile)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        displayMovies(data);
        // Fade in new content
        setTimeout(() => {
          container.style.opacity = '1';
        }, 50);
      })
      .catch(error => {
        console.error('Error loading data:', error);
        container.innerHTML = '\u003cp class=\"error\"\u003eError loading content. Please try again later.\u003c/p\u003e';
        container.style.opacity = '1';
      });
  }, 300);
}

function displayMovies(movies) {
  const container = document.getElementById('movies-container');
  container.innerHTML = ''; // Clear loading message

  // Store movies globally for modal navigation
  currentMoviesArray = movies;

  movies.forEach((movie, index) => {
    const card = document.createElement('div');
    card.className = 'movie-card';

    // Security: Sanitize poster URL
    const rawPosterUrl = (!movie.poster_path || movie.poster_path === 'placeholder_poster.jpg')
      ? 'shared-data/placeholder_poster.jpg'
      : TMDB_IMAGE_BASE + movie.poster_path;
    const posterUrl = sanitizeURL(rawPosterUrl);

    const releaseDate = movie.digital_release_date
      ? new Date(movie.digital_release_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
      : 'Release Date: TBA';

    // Check if released today or already out
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to midnight for accurate date comparison
    let isReleasedToday = false;
    let isAlreadyOut = false;

    if (movie.digital_release_date) {
      const parts = movie.digital_release_date.split('-');
      if (parts.length === 3) {
        const movieYear = parseInt(parts[0]);
        const movieMonth = parseInt(parts[1]) - 1; // Months are 0-indexed
        const movieDay = parseInt(parts[2]);

        const movieDate = new Date(movieYear, movieMonth, movieDay);
        movieDate.setHours(0, 0, 0, 0);

        isReleasedToday =
          today.getFullYear() === movieYear &&
          today.getMonth() === movieMonth &&
          today.getDate() === movieDay;

        isAlreadyOut = movieDate < today;
      }
    }

    if (isReleasedToday) {
      card.classList.add('released-today');
    }

    const releaseBadge = isReleasedToday
      ? '<div class="movie-status-badge status-new">Released Today</div>'
      : isAlreadyOut
        ? '<div class="movie-status-badge status-out">Available</div>'
        : '';

    // Security: Sanitize all user-controlled data before inserting into HTML
    const sanitizedTitle = sanitizeHTML(movie.title || 'Untitled');
    const sanitizedReleaseDate = sanitizeHTML(releaseDate);

    const primaryGenre = movie.genre_ids && movie.genre_ids.length > 0 && genreMap[movie.genre_ids[0]]
      ? genreMap[movie.genre_ids[0]]
      : '';

    const genreTag = primaryGenre
      ? `<div class="movie-genre-tag">${primaryGenre}</div>`
      : '';

    card.innerHTML = `
      <div class="movie-poster">
        <img src="${posterUrl}" alt="${sanitizedTitle}" loading="lazy">
        ${releaseBadge}
        ${genreTag}
        <div class="movie-overlay">
          ${getScoreIconHtml(movie.vote_average)}
          <button class="view-details">VIEW DETAILS</button>
        </div>
      </div>
      <div class="movie-info">
        <div class="movie-text-content">
          <h3 class="movie-title">${sanitizedTitle}</h3>
        </div>
      </div>
      <div class="movie-date-floating">
        ${sanitizedReleaseDate}
      </div>
    `;

    card.addEventListener('click', () => {
      showMovieDetails(movie, index);
    });

    container.appendChild(card);
  });
}

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

function showMovieDetails(movie, movieIndex = 0) {
  const modal = document.getElementById('movie-modal');

  // Security: Sanitize poster URL
  const rawPosterUrl = (!movie.poster_path || movie.poster_path === 'placeholder_poster.jpg')
    ? 'shared-data/placeholder_poster.jpg'
    : TMDB_IMAGE_BASE + movie.poster_path;
  const posterUrl = sanitizeURL(rawPosterUrl);

  const releaseText = movie.digital_release_date
    ? `Digital release date: ${new Date(movie.digital_release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
    : 'Digital release date coming soon';

  const ratingText = movie.vote_count > 0
    ? `Rating: ${movie.vote_average}/10`
    : 'Rating: N/A';

  const genres = movie.genre_ids && movie.genre_ids.length > 0
    ? movie.genre_ids.map(id => genreMap[id]).filter(Boolean).join(', ')
    : 'Genres: N/A';

  let runtimeText = 'Runtime: N/A';
  if (movie.runtime) {
    const hours = Math.floor(movie.runtime / 60);
    const minutes = movie.runtime % 60;
    runtimeText = `Runtime: ${hours > 0 ? `${hours}h ` : ''}${minutes}m`;
  }

  // Security: Using textContent prevents XSS, sanitizeURL validates the image source
  document.getElementById('modal-poster').src = posterUrl;
  document.getElementById('modal-title').textContent = movie.title || 'Untitled';
  document.getElementById('modal-year').textContent = releaseText;
  document.getElementById('modal-rating').textContent = ratingText;
  document.getElementById('modal-genres').textContent = genres;
  document.getElementById('modal-runtime').textContent = runtimeText;
  document.getElementById('modal-overview').textContent = movie.overview || 'No overview available.';

  // IMDb Button Logic
  const imdbButton = document.getElementById('modal-imdb-link');
  // TV Show Specific Fields
  const seasonsElem = document.getElementById('modal-seasons');
  const episodesElem = document.getElementById('modal-episodes');
  const typeElem = document.getElementById('modal-type');
  const networksElem = document.getElementById('modal-networks');
  const seriesDetailsSection = document.getElementById('modal-series-details-section');
  const seriesInfo1 = document.getElementById('modal-series-info-1');
  const seriesInfo2 = document.getElementById('modal-series-info-2');
  const seriesNetworksElem = document.getElementById('modal-series-networks');

  if (movie.number_of_seasons) {
    // TV Show
    // Hide list items for seasons/episodes as they are now in the details section
    seasonsElem.style.display = 'none';
    episodesElem.style.display = 'none';

    typeElem.textContent = `Status: ${movie.release_status || 'N/A'}`;
    typeElem.style.display = 'inline-block';

    const networks = movie.networks ? movie.networks.join(', ') : 'N/A';
    networksElem.style.display = 'none';
    seriesNetworksElem.textContent = `Network: ${networks}`;

    // Series Details Section
    const seasonsCount = movie.number_of_seasons || 0;
    const episodesCount = movie.number_of_episodes || 0;
    const firstAirDate = movie.digital_release_date
      ? new Date(movie.digital_release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'TBA';

    seriesInfo1.textContent = `${seasonsCount} Season${seasonsCount !== 1 ? 's' : ''} • ${episodesCount} Episode${episodesCount !== 1 ? 's' : ''}`;
    seriesInfo2.textContent = `First Episode Airs: ${firstAirDate}`;
    seriesDetailsSection.style.display = 'block';

    // Hide runtime if N/A for TV shows
    if (runtimeText === 'Runtime: N/A') {
      document.getElementById('modal-runtime').style.display = 'none';
    } else {
      document.getElementById('modal-runtime').style.display = 'inline-block';
    }

  } else {
    // Movie - Hide TV fields
    seasonsElem.style.display = 'none';
    episodesElem.style.display = 'none';
    typeElem.style.display = 'none';
    networksElem.style.display = 'none';
    seriesDetailsSection.style.display = 'none';

    document.getElementById('modal-runtime').style.display = 'inline-block';
  }
  if (movie.imdb_id) {
    imdbButton.href = `https://www.imdb.com/title/${movie.imdb_id}/`;
    imdbButton.classList.remove('disabled');
    imdbButton.textContent = 'IMDb';
  } else {
    imdbButton.removeAttribute('href');
    imdbButton.classList.add('disabled');
    imdbButton.textContent = 'IMDb';
  }

  // Store current movie index
  modal.dataset.currentIndex = movieIndex;

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

// Global variable to store movies array
let currentMoviesArray = [];

function setupModal() {
  const modal = document.getElementById('movie-modal');
  const closeBtn = document.querySelector('.close-modal');
  const prevBtn = document.getElementById('modal-prev');
  const nextBtn = document.getElementById('modal-next');

  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  });

  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  });

  // Previous button
  prevBtn.addEventListener('click', () => {
    const currentIndex = parseInt(modal.dataset.currentIndex || 0);
    const newIndex = currentIndex > 0 ? currentIndex - 1 : currentMoviesArray.length - 1;
    showMovieDetails(currentMoviesArray[newIndex], newIndex);
  });

  // Next button
  nextBtn.addEventListener('click', () => {
    const currentIndex = parseInt(modal.dataset.currentIndex || 0);
    const newIndex = currentIndex < currentMoviesArray.length - 1 ? currentIndex + 1 : 0;
    showMovieDetails(currentMoviesArray[newIndex], newIndex);
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (modal.style.display === 'flex') {
      if (e.key === 'Escape') {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
      } else if (e.key === 'ArrowLeft') {
        prevBtn.click();
      } else if (e.key === 'ArrowRight') {
        nextBtn.click();
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