// ============================================================================
// MODAL ARCHITECTURE - DEVELOPER GUIDE & BEST PRACTICES
// ============================================================================
//
// Comprehensive guide for understanding, maintaining, and extending the modal
// system. This document is essential reading for anyone working with modals.
//

// ============================================================================
// SECTION 1: MENTAL MODEL - How to Think About the Modal System
// ============================================================================

/*

THE THREE-LAYER ARCHITECTURE:

┌─────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: DATA ADAPTERS (Convert → Normalize)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│ Raw JSON               Adapter Function         StandardItem Schema     │
│ (from APIs)           (normalizeMovie, etc)     (common interface)      │
│                                                                           │
│ TMDB Movie ──────>  normalizeMovie()  ──────>  {                       │
│ TMDB TV     ──────>  normalizeTVShow() ──────>   id, title, rating,    │
│ IGDB Game   ──────>  normalizeGame()   ──────>   ratingMax, genres,    │
│                                                   description,           │
│                                                   metadata: { ... }     │
│                                                 }                        │
│                                                                           │
│ ✓ STRATEGY: Adapter Pattern                                             │
│ ✓ STATUS: Highly effective - don't change this                         │
│ ✓ BENEFIT: Normalizes disparate data sources                           │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ LAYER 2: FORMATTERS (Display Values Consistently)                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│ StandardItem Data                  Formatter               Displayed     │
│ (type-agnostic)                    Functions              Values        │
│                                                                           │
│ rating: 5.7 ────────>  Formatters.ratingDisplay() ────>  "5.7/10"     │
│ ratingMax: 10                                                            │
│                                                                           │
│ rating: 92 ─────────>  Formatters.ratingDisplay() ────>  "92.0/100"   │
│ ratingMax: 100                                                           │
│                                                                           │
│ runtime: 91 ────────>  Formatters.runtimeDisplay() ───>  "1h 31m"     │
│                                                                           │
│ budget: 1400000 ────>  Formatters.currencyDisplay() ──>  "$1.4M"      │
│                                                                           │
│ genres: ['A','B'] ──>  Formatters.arrayDisplay() ─────>  "A, B"       │
│                                                                           │
│ ✓ STRATEGY: Single Source of Truth (no duplication)                    │
│ ✓ STATUS: NEW - Phase 1 implementation                                 │
│ ✓ BENEFIT: Consistent display across grid and modal                    │
│ ✓ LOCATION: js/script.js, lines ~50-155                               │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ LAYER 3: MODAL RENDERERS (Type-Specific Display Logic)                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│ StandardItem              Renderer                Details Array         │
│ (with metadata)          Strategy Pattern         (label/value pairs)   │
│                                                                           │
│ item.metadata.type: 'movie'                                             │
│           ↓                                                              │
│ ModalRenderers['movie']────>  render(item)  ────>  [                   │
│           ↓                                           { label: 'Runtime', │
│ Checks:                                               value: '1h 31m' }, │
│ - runtime exists? ✓                                  { label: 'Budget',  │
│ - budget > 0? ✓                                      value: '$1.4M' },   │
│ - imdbId exists? ✓                                   ...                 │
│           ↓                                         ]                    │
│ Returns details array                                                    │
│ Renders to DOM                                                           │
│                                                                           │
│ ✓ STRATEGY: Strategy Pattern (type dispatch)                           │
│ ✓ STATUS: NEW - Phase 3 implementation                                 │
│ ✓ BENEFIT: Adding new types requires NO changes to showItemDetails()  │
│ ✓ LOCATION: js/script.js, lines ~1090-1310                            │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘


THE DATA FLOW:

  Raw API Data          Adapters           Formatters         Renderers
  (Movies, TV, Games)   (Normalize)        (Format Values)     (Type-Specific)
  
  ┌──────────┐         ┌──────────┐       ┌──────────┐        ┌──────────┐
  │ TMDB API │ ────>   │normalize │ ──>   │Formatters│ ──>   │ Modal    │
  │  Movie   │         │Movie()   │       │rating()  │       │Renderers │
  └──────────┘         └──────────┘       │runtime() │       │.movie    │
                                          │currency()│       │.render() │
  ┌──────────┐         ┌──────────┐       │arrayDisplay()     └──────────┘
  │ TMDB API │ ────>   │normalize │ ──>   │dateDisplay()     
  │TV Show   │         │TVShow()  │       └──────────┘      ┌──────────┐
  └──────────┘         └──────────┘                         │DOM       │
                                                             │Update   │
  ┌──────────┐         ┌──────────┐                         └──────────┘
  │ IGDB API │ ────>   │normalize │ ──>   
  │  Game    │         │Game()    │       
  └──────────┘         └──────────┘       


KEY PRINCIPLES:

1. SINGLE RESPONSIBILITY: Each layer has one job
   - Adapters: convert raw → normalized
   - Formatters: format values consistently
   - Renderers: extract type-specific details

2. NO DUPLICATION: Formatters eliminate format logic duplication
   - Previously: Same format logic in grid AND modal
   - Now: Single Formatters object used everywhere

3. TYPE-SAFE: MetadataSchemas validate data integrity
   - Schemas define required/optional fields
   - Validation catches missing fields early
   - Self-documents expected metadata

4. EXTENSIBLE: Adding new types requires minimal changes
   - Add new normalizer adapter
   - Add new schema definition
   - Add new renderer to registry
   - Everything else works automatically

*/

// ============================================================================
// SECTION 2: CODE LOCATIONS & FILE STRUCTURE
// ============================================================================

/*

FILE: /Users/inaco/Desktop/website/js/script.js

Lines ~50-155: FORMATTERS (Phase 1)
  • Formatters.ratingDisplay(rating, max)
  • Formatters.ratingNormalized(rating, max)
  • Formatters.runtimeDisplay(minutes)
  • Formatters.currencyDisplay(amount)
  • Formatters.arrayDisplay(arr, separator)
  • Formatters.dateDisplay(dateString, format)
  • Formatters.cardDateStatus(dateString)
  
  Used by: displayItems(), showItemDetails(), ModalRenderers

Lines ~160-235: METADATA SCHEMAS (Phase 2)
  • MetadataSchemas.movie
  • MetadataSchemas['tv-show']
  • MetadataSchemas.game
  • validateMetadata(metadata, type) - Validation function
  • logValidationResult(title, result) - Debug logging
  
  Used by: normalizeMovie(), normalizeTVShow(), normalizeGame()

Lines ~520-650: ADAPTER FUNCTIONS
  • normalizeMovie(rawMovie)
  • normalizeTVShow(rawShow)
  • normalizeGame(rawGame)
  
  Each adapter now calls validateMetadata() internally
  Updated to use Formatters in examples

Lines ~1090-1310: MODAL RENDERERS (Phase 3)
  • ModalRenderers.movie.render(item)
  • ModalRenderers['tv-show'].render(item)
  • ModalRenderers.game.render(item)
  • populateModalDetails(item, container)
  
  Uses: Formatters (for consistent formatting)
  Called by: showItemDetails()

Lines ~1320-1380: showItemDetails() - MAIN MODAL FUNCTION
  BEFORE: ~250 lines with type-specific conditionals
  AFTER:  ~80 lines, clean and delegating to renderers
  KEY: One line does all type-specific rendering:
       populateModalDetails(item);

*/

// ============================================================================
// SECTION 3: WORKING WITH THE FORMATTERS (Phase 1)
// ============================================================================

/*

WHEN TO USE FORMATTERS:
  - Always when displaying user-facing values
  - Both in grid cards AND modal details
  - When formatting values for HTML output

EXAMPLE 1: Rating Display
─────────────────────────

  OLD CODE (Grid):
    let normalizedRating = parseFloat(item.rating);
    if (item.ratingMax === 100) {
      normalizedRating = normalizedRating / 10;
    }
    const val = parseFloat(normalizedRating.toFixed(1));
    const ratingHtml = `<div>Score ${val}/10</div>`;

  OLD CODE (Modal):
    let ratingText = 'N/A';
    if (item.rating) {
      if (item.ratingMax === 100) {
        ratingText = `${parseFloat(item.rating).toFixed(1)}/100`;
      } else {
        ratingText = `${item.rating}/10`;
      }
    }

  NEW CODE (Both):
    const ratingText = Formatters.ratingDisplay(item.rating, item.ratingMax);
    const normalizedRating = Formatters.ratingNormalized(item.rating, item.ratingMax);

  BENEFITS:
    ✓ Single source of truth
    ✓ No duplication
    ✓ Easy to change formatting globally
    ✓ Consistent across grid and modal


EXAMPLE 2: Currency Display
──────────────────────────

  Need to show a movie's budget in modal:

  OLD CODE:
    const budgetText = `$${(item.metadata.budget / 1000000).toFixed(1)}M`;

  NEW CODE:
    const budgetText = Formatters.currencyDisplay(item.metadata.budget);
    // Returns: "$1.4M"

  BENEFITS:
    ✓ Handles all cases (millions, thousands, dollars)
    ✓ Handles null values
    ✓ Can be changed once for entire app


EXAMPLE 3: Array Display
────────────────────────

  Need to show networks for a TV show:

  OLD CODE:
    const networkText = item.metadata.networks.join(', ');

  NEW CODE:
    const networkText = Formatters.arrayDisplay(item.metadata.networks);
    // Returns: "HBO, HBO Max" or "N/A" if empty

  BENEFITS:
    ✓ Handles empty arrays
    ✓ Handles null/undefined
    ✓ Uses sanitizeHTML internally


EXAMPLE 4: Date Display
──────────────────────

  Need to show release date in different formats:

  CARD (SHORT):
    const shortDate = Formatters.dateDisplay(item.releaseDate, 'short');
    // Returns: "Jan 24"

  MODAL (LONG):
    const longDate = Formatters.dateDisplay(item.releaseDate, 'long');
    // Returns: "January 24, 2025"

  BENEFITS:
    ✓ Consistent date handling
    ✓ Multiple format options
    ✓ Handles null/invalid dates


HOW TO ADD A NEW FORMATTER:

  1. Identify the pattern needing formatting
  2. Add method to Formatters object
  3. Update JSDoc comments
  4. Test edge cases (null, empty, invalid)
  5. Use in code instead of inline logic

  TEMPLATE:
    /**
     * Format [description]
     * @param {type} paramName - Description
     * @returns {string} Formatted output
     */
    formatName(paramName) {
      if (!paramName) return 'N/A';
      // Logic here
      return formattedValue;
    }

*/

// ============================================================================
// SECTION 4: METADATA SCHEMAS & VALIDATION (Phase 2)
// ============================================================================

/*

WHY SCHEMAS MATTER:

  Problem: Which fields should a movie have?
  ├─ runtime? Yes
  ├─ budget? Yes (but could be null)
  ├─ actors? No (not in our data)
  └─ ???

  Solution: Formal schema definitions
  └─ MetadataSchemas.movie documents ALL valid fields
     
  Benefit: Self-documenting code
  └─ New developers know exactly what fields to expect


SCHEMA STRUCTURE:

  const schema = {
    type: 'movie',                    // Type identifier
    required: ['type'],               // Must always be present
    optional: [                       // May or may not be present
      'runtime',
      'budget',
      'imdbId',
      // ...
    ],
    description: '...'               // Human-readable description
  }


VALIDATION IN ACTION:

  // In adapter functions:
  const normalizedItem = { ... };
  const validation = validateMetadata(normalizedItem.metadata, 'movie');
  
  if (!validation.isValid) {
    console.error('❌ Validation failed:', validation.errors);
  }
  if (validation.warnings.length > 0) {
    console.warn('⚠️  Warnings:', validation.warnings);
  }

  Result:
    {
      isValid: true,
      errors: [],
      warnings: []
    }


ADDING A NEW METADATA FIELD:

  1. Update the schema:

    MetadataSchemas.movie.optional.push('directorName');

  2. Update the adapter:

    metadata: {
      type: 'movie',
      runtime: rawMovie.runtime,
      directorName: rawMovie.director,  // NEW
      // ...
    }

  3. Schema validation will now check for it
  4. Renderers can use it safely


COMMON SCHEMA PATTERNS:

  // Optional field with fallback:
  if (meta.budget && meta.budget > 0) {
    // Show budget
  }

  // Optional array field:
  if (meta.networks && meta.networks.length > 0) {
    // Show networks
  }

  // Conditional field (TV shows only):
  if (meta.type === 'tv-show' && meta.seasons) {
    // Show seasons
  }

*/

// ============================================================================
// SECTION 5: MODAL RENDERERS & STRATEGY PATTERN (Phase 3)
// ============================================================================

/*

THE STRATEGY PATTERN:

  Problem: showItemDetails() needs to handle Movies, TV Shows, Games
  Old solution: 200+ lines of nested if/else type checking
  ├─ if (meta.runtime) { ... }  // Movies only
  ├─ if (meta.seasons) { ... }  // TV only
  ├─ if (meta.platforms) { ... } // Games only
  └─ Impossible to maintain or extend

  New solution: Strategy Pattern
  └─ Each type has its own "renderer" strategy
     ├─ ModalRenderers.movie.render()
     ├─ ModalRenderers['tv-show'].render()
     └─ ModalRenderers.game.render()

  Benefits:
    ✓ showItemDetails() is now clean (~10 lines of type logic)
    ✓ Adding new types requires NO changes to showItemDetails()
    ✓ Each renderer is independently testable
    ✓ Clear separation of concerns


HOW IT WORKS:

  OLD CODE (~250 lines):
    function showItemDetails(item, index) {
      const meta = item.metadata;
      
      if (meta.runtime) {
        // Movie-specific logic
        const hours = Math.floor(meta.runtime / 60);
        const minutes = meta.runtime % 60;
        // Set DOM elements
      }
      
      if (meta.seasons) {
        // TV-specific logic
        // Set different DOM elements
      }
      
      if (meta.platforms) {
        // Game-specific logic
        // Set yet more DOM elements
      }
      
      // ... 200 more lines ...
    }

  NEW CODE (~10 lines):
    function showItemDetails(item, index) {
      const meta = item.metadata;
      
      // Delegate to type-specific renderer
      populateModalDetails(item);  // ONE LINE!
      
      // ... rest of function unchanged ...
    }

  Where populateModalDetails does:
    const renderer = ModalRenderers[meta.type];
    const details = renderer.render(item);
    // Populate DOM with formatted details


RENDERER STRUCTURE:

  ModalRenderers.TYPE = {
    render(item) {
      const details = [];
      const meta = item.metadata;
      
      // Extract and format type-specific fields
      if (meta.fieldName) {
        details.push({
          label: 'Display Name',
          value: Formatters.formatValue(meta.fieldName)
        });
      }
      
      return details;  // Array of {label, value} pairs
    }
  }


ADDING A NEW RENDERER (for a new content type):

  // Step 1: Add to ModalRenderers
  ModalRenderers.book = {
    render(item) {
      const details = [];
      const meta = item.metadata;
      
      if (meta.author) {
        details.push({
          label: 'Author',
          value: Formatters.arrayDisplay(meta.author)
        });
      }
      
      if (meta.pages) {
        details.push({
          label: 'Pages',
          value: String(meta.pages)
        });
      }
      
      // ...
      
      return details;
    }
  };

  // Step 2: That's it!
  // Everything else works automatically:
  // - displayItems() works (no changes needed)
  // - showItemDetails() works (uses strategy pattern)
  // - Formatters apply automatically

  // Step 3: Test it
  // - Tests in js/tests.js will validate the renderer
  // - No need to modify showItemDetails()


WHEN A RENDERER IS CALLED:

  1. User clicks modal item
  2. showItemDetails(item, index) called
  3. populateModalDetails(item) called
  4. const type = item.metadata.type  // 'movie', 'tv-show', 'game', 'book'
  5. const renderer = ModalRenderers[type]  // Gets right renderer
  6. const details = renderer.render(item)  // Type-specific logic runs
  7. Details rendered to DOM
  8. Modal displays

  Result: Clean, modular, extensible

*/

// ============================================================================
// SECTION 6: COMPLETE WORKFLOW - Adding a New Content Type
// ============================================================================

/*

SCENARIO: Add "Books" content type to the website

STEP 1: Create Raw Data File (shared-data/data_books.json)
────────────────────────────────────────────────────────
  [
    {
      "id": 1,
      "name": "The Great Gatsby",
      "author": ["F. Scott Fitzgerald"],
      "published_date": "1925-04-10",
      "rating": 4.2,
      "pages": 180,
      "isbn": "978-0-7432-7356-5",
      "genres": ["Fiction", "Classics"],
      "summary": "A novel of the Jazz Age..."
    },
    // ...
  ]


STEP 2: Create Adapter Function (normalizeBook)
─────────────────────────────────────────────
  function normalizeBook(rawBook) {
    const genres = rawBook.genres || [];
    const poster = rawBook.cover_image || 'shared-data/placeholder_book.jpg';
    
    const normalizedItem = {
      id: rawBook.id,
      title: rawBook.name,
      poster: poster,
      releaseDate: rawBook.published_date,
      rating: rawBook.rating,        // 0-5 scale typically
      ratingMax: 5,                   // ← Different from movies/TV!
      genres: genres,
      description: rawBook.summary || 'No summary available.',
      metadata: {
        type: 'book',
        author: rawBook.author,       // Array
        pages: rawBook.pages,
        isbn: rawBook.isbn,
        publisher: rawBook.publisher
      }
    };
    
    // Validate metadata
    const validation = validateMetadata(normalizedItem.metadata, 'book');
    if (!validation.isValid || validation.warnings.length > 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`Book "${normalizedItem.title}" metadata validation:`, validation);
      }
    }
    
    return normalizedItem;
  }

  ✓ Adapter created
  ✓ Now books are normalized to same StandardItem schema
  ✓ displayItems() automatically works (type-agnostic)


STEP 3: Add MetadataSchema (Type Definition)
────────────────────────────────────────────
  MetadataSchemas.book = {
    type: 'book',
    required: ['type'],
    optional: [
      'author',              // Array of author names
      'pages',               // Integer: page count
      'isbn',                // String: ISBN identifier
      'publisher',           // String: publisher name
      'isbn'                 // String: ISBN-13
    ],
    description: 'Book metadata, emphasizing author and publication details'
  };

  ✓ Schema added
  ✓ validateMetadata() now checks book fields


STEP 4: Add ModalRenderer (Type-Specific Display)
──────────────────────────────────────────────
  ModalRenderers.book = {
    render(item) {
      const details = [];
      const meta = item.metadata;
      
      // Author (required, array)
      if (meta.author && meta.author.length > 0) {
        details.push({
          label: 'Author',
          value: Formatters.arrayDisplay(meta.author)
        });
      }
      
      // Publisher (if available)
      if (meta.publisher) {
        details.push({
          label: 'Publisher',
          value: sanitizeHTML(meta.publisher)
        });
      }
      
      // Pages (if available)
      if (meta.pages) {
        details.push({
          label: 'Pages',
          value: String(meta.pages)
        });
      }
      
      // ISBN (if available)
      if (meta.isbn) {
        details.push({
          label: 'ISBN',
          value: sanitizeHTML(meta.isbn)
        });
      }
      
      return details;
    }
  };

  ✓ Renderer added
  ✓ showItemDetails() automatically uses it (no changes!)
  ✓ Type-specific fields display in modal


STEP 5: Update CATEGORY_CONFIG
──────────────────────────────
  const CATEGORY_CONFIG = {
    // ... existing config ...
    books: {
      dataFile: 'shared-data/data_books.json',
      adapter: normalizeBook,
      displayName: 'Books'
    }
  };

  ✓ Category registered
  ✓ loadContent('books') now works


STEP 6: Test Everything
───────────────────────
  // Add test cases to js/tests.js
  
  // Test adapter
  const bookMeta = {
    type: 'book',
    author: ['F. Scott Fitzgerald'],
    pages: 180,
    isbn: '978-0-7432-7356-5'
  };
  const validation = validateMetadata(bookMeta, 'book');
  // Should pass
  
  // Test renderer
  const bookItem = { metadata: bookMeta, ... };
  const details = ModalRenderers.book.render(bookItem);
  // Should contain author, pages, etc.

  ✓ All tests pass
  ✓ Type works end-to-end


STEP 7: No Changes Needed To:
─────────────────────────────
  ✗ showItemDetails() - Uses strategy pattern automatically
  ✗ displayItems() - Type-agnostic already
  ✗ grid rendering - Works with StandardItem schema
  ✗ formatters - Reusable for any type
  ✗ caching - Works with any data type

  Result: Adding a type requires only:
  ✓ Adapter function
  ✓ Metadata schema
  ✓ Modal renderer
  ✓ Category config
  ✓ Tests

  Everything else works automatically!


TOTAL WORK: ~1 hour
BEFORE (monolithic): Would need to modify showItemDetails() ~50 lines
AFTER (modular):     Just add three functions + schema


THIS IS THE POWER OF GOOD ARCHITECTURE.

*/

// ============================================================================
// SECTION 7: COMMON PATTERNS & TROUBLESHOOTING
// ============================================================================

/*

PATTERN 1: Optional Field with Fallback
─────────────────────────────────────────

  if (meta.fieldName) {
    details.push({
      label: 'Field Label',
      value: Formatters.someFormatter(meta.fieldName)
    });
  }
  // If fieldName is null/undefined, it won't be shown


PATTERN 2: Array Field Display
──────────────────────────────

  if (meta.arrayField && meta.arrayField.length > 0) {
    details.push({
      label: 'Field Label',
      value: Formatters.arrayDisplay(meta.arrayField)
    });
  }
  // Empty arrays won't create empty detail cards


PATTERN 3: Conditional Display Based on Type
──────────────────────────────────────────

  // In a renderer:
  if (meta.type === 'movie' && meta.budget > 0) {
    // Only show budget for movies with budget data
    details.push({...});
  }


PATTERN 4: Format Before Rendering
──────────────────────────────────

  // Wrong:
  value: meta.budget  // Raw number: 1400000

  // Right:
  value: Formatters.currencyDisplay(meta.budget)  // Formatted: "$1.4M"


TROUBLESHOOTING GUIDE
─────────────────────

PROBLEM: Modal shows "N/A" for a field that should have data
SOLUTION: 
  1. Check metadata schema - is field included?
  2. Check adapter - is field being set?
  3. Check renderer - is it calling Formatters correctly?
  4. Log the raw item: console.log(item.metadata)

PROBLEM: Adding new type breaks modal
SOLUTION:
  1. Make sure normalizer is registered in CATEGORY_CONFIG
  2. Make sure metadata.type is set correctly
  3. Make sure renderer exists in ModalRenderers
  4. Check console for errors

PROBLEM: Formatting looks inconsistent between grid and modal
SOLUTION:
  1. Grid should use Formatters (check displayItems)
  2. Modal should use Formatters (check renderers)
  3. Both should use same Formatters functions
  4. If different, that's a bug - make consistent

PROBLEM: Performance issues with large datasets
SOLUTION:
  1. Check caching is working (CACHE_DURATION: 5 min)
  2. Check if renderers are efficient
  3. Profile with DevTools Performance tab
  4. Consider lazy-loading for large arrays

*/

// ============================================================================
// SECTION 8: FOR OTHER LLMs - EXPLICIT INSTRUCTIONS
// ============================================================================

/*

IF YOU ARE AN LLM BEING ASKED TO MODIFY THIS MODAL SYSTEM:

1. READ THIS ENTIRE DOCUMENT FIRST
   └─ Understand the 3-layer architecture before making changes

2. UNDERSTAND THE ARCHITECTURE LAYERS:
   ├─ Layer 1: Adapters (normalize raw data) - DON'T CHANGE unless adding new type
   ├─ Layer 2: Formatters (format values) - ADD HERE for new formatting needs
   ├─ Layer 3: Renderers (type-specific display) - ADD HERE for new content type
   └─ These layers are intentionally separated for maintainability

3. COMMON REQUESTS & CORRECT APPROACHES:

   REQUEST: "Add budget field to movie modal"
   CORRECT: Add to ModalRenderers.movie renderer, use Formatters.currencyDisplay()
   WRONG:   Modify showItemDetails() directly

   REQUEST: "Change rating display format"
   CORRECT: Update Formatters.ratingDisplay() function
   WRONG:   Find and replace rating format in multiple places

   REQUEST: "Add new content type (Books, Music, etc)"
   CORRECT: Add normalizer, schema, and renderer (see SECTION 6)
   WRONG:   Modify showItemDetails() with new conditionals

   REQUEST: "Fix modal not showing data"
   CORRECT: Check renderer for that type, check metadata schema
   WRONG:   Add more code to showItemDetails()

4. BEFORE MAKING CHANGES:
   ☐ Read the review documents (MODAL_ARCHITECTURE_REVIEW.md, etc)
   ☐ Understand current code structure
   ☐ Check if change fits existing patterns
   ☐ Look for similar existing code
   ☐ Run tests after changes

5. CODE REVIEW CHECKLIST:
   ☐ Does change follow existing patterns?
   ☐ Are Formatters used for all display values?
   ☐ Is metadata validated?
   ☐ Is new code testable?
   ☐ Did you avoid adding to showItemDetails()?
   ☐ Are comments explaining WHY (not just WHAT)?
   ☐ Are there appropriate console logs for debugging?

6. WHEN YOU'RE STUCK:
   Step 1: Check the relevant review document
   Step 2: Look at similar working code
   Step 3: Check the test file (js/tests.js)
   Step 4: Run tests to verify changes
   Step 5: Check browser console for errors

7. PROHIBITED PATTERNS (Will break architecture):
   ☒ DO NOT add type checking to showItemDetails()
   ☒ DO NOT duplicate formatting logic
   ☒ DO NOT bypass Formatters
   ☒ DO NOT modify adapters without schema updates
   ☒ DO NOT add fields to metadata without schema

8. ENCOURAGED PATTERNS (Will maintain architecture):
   ✓ Add new Formatter functions
   ✓ Add new MetadataSchema entries
   ✓ Add new ModalRenderer entries
   ✓ Add comprehensive comments and JSDoc
   ✓ Add tests for new code
   ✓ Update documentation after changes

*/

// ============================================================================
// SECTION 9: FILES & REFERENCES
// ============================================================================

/*

KEY FILES:
  /js/script.js
  ├─ Formatters object (lines ~50-155)
  ├─ MetadataSchemas (lines ~160-235)
  ├─ Adapters (lines ~520-650)
  ├─ ModalRenderers (lines ~1090-1310)
  └─ showItemDetails() (lines ~1320-1380)

  /js/tests.js
  ├─ Formatter tests
  ├─ Schema validation tests
  ├─ Renderer tests
  └─ Integration tests

  /project_meta/MODAL_ARCHITECTURE_REVIEW.md
  ├─ Complete technical analysis
  ├─ Current state assessment
  ├─ Detailed recommendations
  └─ Implementation roadmap

  /project_meta/MODAL_IMPLEMENTATION_GUIDE.md
  ├─ Step-by-step implementation
  ├─ Code examples
  ├─ Common patterns
  └─ Adding new types tutorial

DOCUMENTATION HIERARCHY:
  1. This file (DEVELOPER_GUIDE.md) - START HERE
  2. MODAL_ARCHITECTURE_REVIEW.md - Deep technical understanding
  3. MODAL_IMPLEMENTATION_GUIDE.md - Step-by-step instructions
  4. Code comments and JSDoc - Implementation details
  5. Tests (js/tests.js) - Working examples

*/

// ============================================================================
// SECTION 10: SUMMARY & KEY TAKEAWAYS
// ============================================================================

/*

🎯 CORE PRINCIPLES:

1. THE THREE LAYERS ARE INTENTIONAL
   └─ Adapters, Formatters, Renderers each have clear jobs

2. showItemDetails() SHOULD NEVER CONTAIN TYPE-SPECIFIC CODE
   └─ That's what ModalRenderers are for

3. FORMATTERS ARE YOUR FRIEND
   └─ Use them everywhere, duplicate formatting nowhere

4. ADDING NEW TYPES IS TRIVIAL
   └─ Adapter + Schema + Renderer = Done
   └─ No changes to core functions needed

5. TESTS ARE ESSENTIAL
   └─ Write them when adding features
   └─ They document expected behavior
   └─ They catch bugs early

6. DOCUMENTATION MATTERS
   └─ Comments explain WHY, not WHAT
   └─ JSDoc documents function contracts
   └─ Code should be self-documenting

7. CONSISTENCY > CLEVERNESS
   └─ Predictable code is maintainable code
   └─ Follow existing patterns
   └─ Avoid cute shortcuts

✨ DONE WELL: This system is extensible, testable, and maintainable
✨ ADD YOUR OWN CONTENT TYPES WITHOUT TOUCHING CORE FUNCTIONS
✨ FORMATTERS GUARANTEE CONSISTENCY ACROSS UI
✨ RENDERERS KEEP TYPE-SPECIFIC CODE ISOLATED

THIS IS GOOD ARCHITECTURE. RESPECT IT.

*/
