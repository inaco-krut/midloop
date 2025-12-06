/**
 * Modal Architecture - Unit Tests
 * 
 * Tests for Formatters (Phase 1), MetadataSchemas (Phase 2), 
 * and ModalRenderers (Phase 3)
 * 
 * Run in browser console or with a test runner like Jest
 * Example: node js/tests.js (requires Node.js environment)
 */

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Simple test assertion framework
 */
const TestRunner = {
  passed: 0,
  failed: 0,
  tests: [],

  assert(condition, message) {
    if (condition) {
      this.passed++;
      console.log(`✓ ${message}`);
    } else {
      this.failed++;
      console.error(`✗ ${message}`);
      this.tests.push({ result: 'FAILED', message });
    }
  },

  assertEquals(actual, expected, message) {
    this.assert(actual === expected, `${message} (expected: ${expected}, got: ${actual})`);
  },

  assertIncludes(haystack, needle, message) {
    this.assert(haystack.includes(needle), `${message} (expected to include: ${needle})`);
  },

  summary() {
    const total = this.passed + this.failed;
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Test Results: ${this.passed}/${total} passed`);
    if (this.failed > 0) {
      console.log(`⚠️  ${this.failed} tests failed`);
    } else {
      console.log(`✅ All tests passed!`);
    }
    console.log(`${'='.repeat(70)}\n`);
  }
};

// ============================================================================
// PHASE 1: FORMATTERS TESTS
// ============================================================================

console.log('\n🧪 PHASE 1: FORMATTERS TESTS\n');

console.log('Testing Formatters.ratingDisplay()');
TestRunner.assertEquals(Formatters.ratingDisplay(5.7, 10), '5.7/10', 'Movies (0-10 scale)');
TestRunner.assertEquals(Formatters.ratingDisplay(78, 100), '78.0/100', 'Games (0-100 scale)');
TestRunner.assertEquals(Formatters.ratingDisplay(null, 10), 'N/A', 'Null rating');
TestRunner.assertEquals(Formatters.ratingDisplay(undefined, 10), 'N/A', 'Undefined rating');

console.log('\nTesting Formatters.ratingNormalized()');
TestRunner.assertEquals(Formatters.ratingNormalized(5.7, 10), 5.7, 'Movies normalized (10-scale)');
TestRunner.assertEquals(Formatters.ratingNormalized(80, 100), 8, 'Games normalized (100->10)');
TestRunner.assertEquals(Formatters.ratingNormalized(null, 10), 0, 'Null rating normalizes to 0');

console.log('\nTesting Formatters.runtimeDisplay()');
TestRunner.assertEquals(Formatters.runtimeDisplay(91), '1h 31m', 'Minutes to hours and minutes');
TestRunner.assertEquals(Formatters.runtimeDisplay(45), '45m', 'Less than 60 minutes');
TestRunner.assertEquals(Formatters.runtimeDisplay(120), '2h 0m', 'Exactly 2 hours');
TestRunner.assertEquals(Formatters.runtimeDisplay(null), 'N/A', 'Null runtime');

console.log('\nTesting Formatters.currencyDisplay()');
TestRunner.assertEquals(Formatters.currencyDisplay(1400000), '$1.4M', 'Millions');
TestRunner.assertEquals(Formatters.currencyDisplay(500000), '$0.5M', 'Half million');
TestRunner.assertEquals(Formatters.currencyDisplay(50000), '$50K', 'Thousands');
TestRunner.assertEquals(Formatters.currencyDisplay(null), 'N/A', 'Null currency');

console.log('\nTesting Formatters.arrayDisplay()');
TestRunner.assertEquals(Formatters.arrayDisplay(['HBO', 'HBO Max']), 'HBO, HBO Max', 'Array display');
TestRunner.assertEquals(Formatters.arrayDisplay(['Drama']), 'Drama', 'Single item');
TestRunner.assertEquals(Formatters.arrayDisplay([]), 'N/A', 'Empty array');
TestRunner.assertEquals(Formatters.arrayDisplay(null), 'N/A', 'Null array');

console.log('\nTesting Formatters.dateDisplay()');
const testDate = '2025-01-24T00:00:00Z';
const result = Formatters.dateDisplay(testDate, 'long');
TestRunner.assert(result.includes('January'), `Date display includes month: ${result}`);
TestRunner.assert(result.includes('24'), `Date display includes day: ${result}`);
TestRunner.assertEquals(Formatters.dateDisplay(null), 'Coming soon', 'Null date');

console.log('\nTesting Formatters.cardDateStatus()');
const now = new Date();
const tomorrow = new Date(now.getTime() + 86400000);
const yesterday = new Date(now.getTime() - 86400000);

const status1 = Formatters.cardDateStatus(tomorrow.toISOString());
TestRunner.assertEquals(status1.isToday, false, 'Future date is not today');
TestRunner.assertEquals(status1.isAlreadyOut, false, 'Future date is not already out');

const status2 = Formatters.cardDateStatus(yesterday.toISOString());
TestRunner.assertEquals(status2.isAlreadyOut, true, 'Past date is already out');

// ============================================================================
// PHASE 2: METADATA SCHEMAS TESTS
// ============================================================================

console.log('\n\n🧪 PHASE 2: METADATA SCHEMAS TESTS\n');

console.log('Testing MetadataSchemas definitions');
TestRunner.assert(MetadataSchemas.movie, 'Movie schema exists');
TestRunner.assert(MetadataSchemas['tv-show'], 'TV Show schema exists');
TestRunner.assert(MetadataSchemas.game, 'Game schema exists');

console.log('\nTesting validateMetadata() - Movie');
const movieMeta = {
  type: 'movie',
  runtime: 91,
  imdbId: 'tt14999684',
  budget: 1400000
};
const movieValidation = validateMetadata(movieMeta, 'movie');
TestRunner.assertEquals(movieValidation.isValid, true, 'Valid movie metadata passes');

console.log('\nTesting validateMetadata() - TV Show');
const tvMeta = {
  type: 'tv-show',
  seasons: 1,
  episodes: 6,
  networks: ['HBO']
};
const tvValidation = validateMetadata(tvMeta, 'tv-show');
TestRunner.assertEquals(tvValidation.isValid, true, 'Valid TV show metadata passes');

console.log('\nTesting validateMetadata() - Game');
const gameMeta = {
  type: 'game',
  platforms: ['PC', 'Xbox Series X'],
  developers: ['Playground Games']
};
const gameValidation = validateMetadata(gameMeta, 'game');
TestRunner.assertEquals(gameValidation.isValid, true, 'Valid game metadata passes');

console.log('\nTesting validateMetadata() - Missing type');
const invalidMeta = { runtime: 91 };
const invalidValidation = validateMetadata(invalidMeta, 'movie');
TestRunner.assertEquals(invalidValidation.isValid, false, 'Missing required field detected');
TestRunner.assert(invalidValidation.errors.length > 0, 'Error logged for missing field');

console.log('\nTesting validateMetadata() - Unknown type');
const unknownValidation = validateMetadata({}, 'unknown');
TestRunner.assertEquals(unknownValidation.isValid, false, 'Unknown type fails validation');

// ============================================================================
// PHASE 3: MODAL RENDERERS TESTS
// ============================================================================

console.log('\n\n🧪 PHASE 3: MODAL RENDERERS TESTS\n');

console.log('Testing ModalRenderers exist for all types');
TestRunner.assert(ModalRenderers.movie, 'Movie renderer exists');
TestRunner.assert(ModalRenderers['tv-show'], 'TV Show renderer exists');
TestRunner.assert(ModalRenderers.game, 'Game renderer exists');

console.log('\nTesting ModalRenderers.movie.render()');
const movieItem = {
  id: 258,
  title: 'Shelby Oaks',
  rating: 5.7,
  ratingMax: 10,
  genres: ['Horror', 'Mystery'],
  description: 'Test movie',
  poster: 'test.jpg',
  releaseDate: '2024-01-01',
  metadata: {
    type: 'movie',
    runtime: 91,
    budget: 1400000,
    revenue: 2350523,
    imdbId: 'tt14999684',
    originalLanguage: 'en'
  }
};

const movieDetails = ModalRenderers.movie.render(movieItem);
TestRunner.assert(movieDetails.length > 0, 'Movie renderer returns details');
TestRunner.assert(movieDetails.some(d => d.label === 'Runtime'), 'Runtime included');
TestRunner.assert(movieDetails.some(d => d.label === 'Budget'), 'Budget included');
TestRunner.assert(movieDetails.some(d => d.label === 'Revenue'), 'Revenue included');

console.log('\nTesting ModalRenderers["tv-show"].render()');
const tvItem = {
  id: 1396,
  title: 'Breaking Bad',
  rating: 9.5,
  ratingMax: 10,
  genres: ['Crime', 'Drama'],
  description: 'Test series',
  poster: 'test.jpg',
  releaseDate: '2024-01-01',
  metadata: {
    type: 'tv-show',
    seasons: 5,
    episodes: 62,
    networks: ['AMC'],
    creators: ['Vince Gilligan'],
    imdbId: 'tt0903747',
    nextEpisodeDate: null,
    status: 'Ended'
  }
};

const tvDetails = ModalRenderers['tv-show'].render(tvItem);
TestRunner.assert(tvDetails.length > 0, 'TV renderer returns details');
TestRunner.assert(tvDetails.some(d => d.label === 'Seasons'), 'Seasons included');
TestRunner.assert(tvDetails.some(d => d.label === 'Episodes'), 'Episodes included');
TestRunner.assert(tvDetails.some(d => d.label === 'Networks'), 'Networks included');

console.log('\nTesting ModalRenderers.game.render()');
const gameItem = {
  id: 'forza-horizon-5',
  title: 'Forza Horizon 5',
  rating: 92,
  ratingMax: 100,
  genres: ['Racing'],
  description: 'Test game',
  poster: 'test.jpg',
  releaseDate: '2024-01-01',
  metadata: {
    type: 'game',
    platforms: [{ name: 'PC' }, { name: 'Xbox Series X' }],
    developers: [{ name: 'Playground Games' }],
    steamUrl: 'https://store.steampowered.com/app/1551360',
    gameModes: ['Single player', 'Multiplayer']
  }
};

const gameDetails = ModalRenderers.game.render(gameItem);
TestRunner.assert(gameDetails.length > 0, 'Game renderer returns details');
TestRunner.assert(gameDetails.some(d => d.label === 'Platforms'), 'Platforms included');
TestRunner.assert(gameDetails.some(d => d.label === 'Developers'), 'Developers included');
TestRunner.assert(gameDetails.some(d => d.label === 'Steam'), 'Steam link included');

console.log('\nTesting renderer with missing fields');
const minimalItem = {
  metadata: { type: 'movie' }
};
const minimalDetails = ModalRenderers.movie.render(minimalItem);
TestRunner.assert(minimalDetails.length === 0, 'No details for minimal metadata');

// ============================================================================
// ADAPTER UTILITIES COUNTDOWN TESTS
// ============================================================================

console.log('\n\n🧪 ADAPTER UTILITIES - COUNTDOWN TESTS\n');

console.log('Testing AdapterUtils.getCountdownStatus()');

// Test 1 day until release
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowISO = tomorrow.toISOString();
const countdownTomorrow = AdapterUtils.getCountdownStatus(tomorrowISO);
TestRunner.assertEquals(countdownTomorrow.daysUntil, 1, '1 day until release');
TestRunner.assertEquals(countdownTomorrow.isCountdown, true, '1 day is counted as countdown');

// Test 3 days until release
const inThreeDays = new Date();
inThreeDays.setDate(inThreeDays.getDate() + 3);
const inThreeDaysISO = inThreeDays.toISOString();
const countdownThree = AdapterUtils.getCountdownStatus(inThreeDaysISO);
TestRunner.assertEquals(countdownThree.daysUntil, 3, '3 days until release');
TestRunner.assertEquals(countdownThree.isCountdown, true, '3 days is counted as countdown');

// Test 7 days until release (max for countdown)
const inSevenDays = new Date();
inSevenDays.setDate(inSevenDays.getDate() + 7);
const inSevenDaysISO = inSevenDays.toISOString();
const countdownSeven = AdapterUtils.getCountdownStatus(inSevenDaysISO);
TestRunner.assertEquals(countdownSeven.daysUntil, 7, '7 days until release');
TestRunner.assertEquals(countdownSeven.isCountdown, true, '7 days is counted as countdown');

// Test 8 days until release (outside countdown range)
const inEightDays = new Date();
inEightDays.setDate(inEightDays.getDate() + 8);
const inEightDaysISO = inEightDays.toISOString();
const countdownEight = AdapterUtils.getCountdownStatus(inEightDaysISO);
TestRunner.assertEquals(countdownEight.daysUntil, 8, '8 days until release');
TestRunner.assertEquals(countdownEight.isCountdown, false, '8 days is NOT counted as countdown');

// Test today (not countdown)
const today = new Date();
today.toISOString();
const countdownToday = AdapterUtils.getCountdownStatus(today.toISOString());
TestRunner.assertEquals(countdownToday.isCountdown, false, 'Today is NOT counted as countdown');

// Test past date (not countdown)
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayISO = yesterday.toISOString();
const countdownYesterday = AdapterUtils.getCountdownStatus(yesterdayISO);
TestRunner.assertEquals(countdownYesterday.isCountdown, false, 'Past date is NOT counted as countdown');

// Test null/undefined
const countdownNull = AdapterUtils.getCountdownStatus(null);
TestRunner.assertEquals(countdownNull.isCountdown, false, 'Null returns no countdown');
TestRunner.assertEquals(countdownNull.daysUntil, null, 'Null daysUntil is null');

const countdownUndefined = AdapterUtils.getCountdownStatus(undefined);
TestRunner.assertEquals(countdownUndefined.isCountdown, false, 'Undefined returns no countdown');

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

console.log('\n\n🧪 INTEGRATION TESTS\n');

console.log('Testing Formatters used with renderer output');
// Simulate a renderer returning data that needs formatting
const runtimeValue = Formatters.runtimeDisplay(125);
TestRunner.assertEquals(runtimeValue, '2h 5m', 'Formatters work with renderer');

const currencyValue = Formatters.currencyDisplay(5000000);
TestRunner.assertEquals(currencyValue, '$5.0M', 'Currency formatting works');

const arrayValue = Formatters.arrayDisplay(['PC', 'PlayStation 5', 'Xbox Series X']);
TestRunner.assertIncludes(arrayValue, 'PC', 'Array display works');

console.log('\nTesting data flow: Raw → Validate → Render → Format');
TestRunner.assert(movieDetails.every(d => typeof d.label === 'string'), 'All details have string labels');
TestRunner.assert(movieDetails.every(d => typeof d.value === 'string'), 'All details have string values');

// ============================================================================
// TEST SUMMARY
// ============================================================================

TestRunner.summary();

// ============================================================================
// EXPORT FOR TESTING FRAMEWORKS
// ============================================================================

// If using Node.js or a test framework, export the TestRunner
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TestRunner, Formatters, MetadataSchemas, ModalRenderers, validateMetadata };
}
