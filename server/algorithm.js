// algorithm.js — Pure scoring/inference functions extracted from index.js

// ─────────────────────────────────────────────────────────────
// CUISINE COMPATIBILITY GRAPH
// How well does someone who likes [key] enjoy [value] restaurants?
// Scale 0–1. Symmetric pairs are defined in both directions.
// ─────────────────────────────────────────────────────────────
const CUISINE_COMPAT = {
  Italian:       { Mediterranean:0.90, French:0.72, American:0.60, Healthy:0.55, Greek:0.80, Japanese:0.28, Mexican:0.32, Chinese:0.22, Indian:0.28, Thai:0.28, Korean:0.22 },
  Japanese:      { Korean:0.82, Chinese:0.72, Thai:0.68, Healthy:0.72, Mediterranean:0.42, American:0.45, Indian:0.38, Italian:0.28, Mexican:0.28 },
  Mexican:       { American:0.78, Mediterranean:0.50, Indian:0.42, Italian:0.32, Healthy:0.52, Chinese:0.28, Thai:0.35, Korean:0.38, Japanese:0.25 },
  American:      { Italian:0.60, Mexican:0.78, Mediterranean:0.62, Korean:0.50, Healthy:0.52, Japanese:0.45, Chinese:0.48, Indian:0.40, Thai:0.42 },
  Chinese:       { Japanese:0.72, Thai:0.82, Korean:0.78, Healthy:0.50, American:0.48, Indian:0.50, Mediterranean:0.38, Mexican:0.28, Italian:0.22 },
  Indian:        { Mediterranean:0.65, Thai:0.68, Healthy:0.68, Chinese:0.50, Mexican:0.42, American:0.40, Japanese:0.38, Italian:0.28, Korean:0.42 },
  Mediterranean: { Italian:0.90, Healthy:0.78, Indian:0.65, American:0.62, Greek:0.95, Mexican:0.48, Japanese:0.42, Chinese:0.38, Thai:0.45, Korean:0.32 },
  Thai:          { Chinese:0.82, Japanese:0.68, Indian:0.68, Korean:0.62, Healthy:0.68, Mediterranean:0.45, American:0.42, Mexican:0.35, Italian:0.28 },
  Korean:        { Japanese:0.82, Chinese:0.78, American:0.50, Thai:0.62, Healthy:0.52, Indian:0.42, Mexican:0.38, Mediterranean:0.32, Italian:0.22 },
  Healthy:       { Mediterranean:0.78, Japanese:0.72, Thai:0.68, Indian:0.68, Korean:0.52, American:0.48, Italian:0.55, Chinese:0.50, Mexican:0.45 },
};

// Name keywords used to infer cuisine when Google doesn't tell us directly
const CUISINE_NAME_KEYWORDS = {
  Italian:       ['pizza','pasta','trattoria','osteria','ristorante','pizzeria','italian','luigi','bella','nonna','romano','sicilia','napoli','gelato','calzone','bruschetta'],
  Japanese:      ['sushi','ramen','japanese','tokyo','kyoto','sakura','izakaya','hibachi','teriyaki','yakitori','tempura','udon','bento','miso','sake','omakase'],
  Mexican:       ['taco','burrito','mexican','cantina','hacienda','salsa','tortilla','jalapeño','aztec','casa','mexico','enchilada','quesadilla','guacamole','tamale'],
  American:      ['grill','burger','diner','smokehouse','american','steakhouse','tavern','pub','kitchen','bbq','house','chop','roadhouse','brew','wings'],
  Chinese:       ['chinese','dim sum','wok','panda','dragon','golden','mandarin','szechuan','canton','peking','dumpling','noodle','chopstick','beijing','shanghai'],
  Indian:        ['indian','curry','tandoor','masala','spice','biryani','chai','bombay','delhi','mumbai','taj','namaste','dhaba','tikka','basmati'],
  Mediterranean: ['mediterranean','greek','hummus','falafel','gyro','olive','pita','kebab','shawarma','levant','agora','zeus','acropolis','baklava','tzatziki'],
  Thai:          ['thai','bangkok','pad','satay','mango','basil','orchid','lotus','siam','jasmine','phuket','chiang'],
  Korean:        ['korean','kbbq','bibimbap','bulgogi','kimchi','seoul','pocha','banchan','galbi','tofu'],
  Healthy:       ['salad','healthy','organic','green','fresh','vegan','vegetarian','bowl','juice','plant','garden','harvest','clean','fit','wellness','sprout','roots'],
};

// Cuisine types that are generally crowd-pleasing / catch-all
const BRIDGE_CUISINES = new Set(['American', 'Mediterranean', 'Healthy']);

// Map cuisine names to more specific search terms for Google Places
const CUISINE_SEARCH_MAP = {
  Korean: 'Korean BBQ',
  Healthy: 'healthy salad bowl',
  Chinese: 'Chinese dim sum',
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

// Infer cuisine from restaurant name keywords
function inferCuisineFromName(name) {
  var nameLower = (name || '').toLowerCase();
  var best = null, bestCount = 0;
  for (var cuisine in CUISINE_NAME_KEYWORDS) {
    if (!CUISINE_NAME_KEYWORDS.hasOwnProperty(cuisine)) continue;
    var keywords = CUISINE_NAME_KEYWORDS[cuisine];
    var count = keywords.filter(function(k) { return nameLower.includes(k); }).length;
    if (count > bestCount) { bestCount = count; best = cuisine; }
  }
  return bestCount > 0 ? best : null;
}

// How compatible is this restaurant's cuisine(s) with a person's preference list?
// Returns a 0–1 score.
function getCuisineCompat(restaurantCuisines, personCuisines, mood) {
  if (!restaurantCuisines || restaurantCuisines.length === 0) {
    // Unknown cuisine — adventurous people are more open, comfort people want familiar
    if (mood === 'adventurous') return 0.55;
    if (mood === 'comfort') return 0.38;
    return 0.45;
  }
  if (!personCuisines || personCuisines.length === 0) return 0.55;

  var maxScore = 0;
  for (var i = 0; i < restaurantCuisines.length; i++) {
    var rc = restaurantCuisines[i];
    // Is this a bridge/catch-all cuisine? Gives a decent baseline for everyone.
    var baseBridgeScore = BRIDGE_CUISINES.has(rc) ? 0.55 : 0;

    for (var j = 0; j < personCuisines.length; j++) {
      var pc = personCuisines[j];
      if (rc === pc) {
        maxScore = 1.0;
        break; // perfect match
      }
      var compat = Math.max(
        (CUISINE_COMPAT[pc] && CUISINE_COMPAT[pc][rc]) || 0,
        (CUISINE_COMPAT[rc] && CUISINE_COMPAT[rc][pc]) || 0,
        baseBridgeScore
      );
      maxScore = Math.max(maxScore, compat);
    }
    if (maxScore === 1.0) break;
  }
  return maxScore;
}

// Harmonic mean — rewards mutual fit, heavily penalizes one-sided matches
function harmonicMean(a, b) {
  if (a <= 0 || b <= 0) return 0;
  return (2 * a * b) / (a + b);
}

// ─────────────────────────────────────────────────────────────
// MAIN SCORING FUNCTION
// Max score ≈ 100 points
// ─────────────────────────────────────────────────────────────
function scorePlace(place, a1, a2) {
  var total = 0;

  // Determine restaurant's likely cuisines from which searches found it + name inference
  var foundBy = (place.foundBy || []).filter(function(c) { return c !== 'restaurant'; });
  var nameInferred = inferCuisineFromName(place.name);
  var restaurantCuisines = foundBy.length > 0 ? foundBy : (nameInferred ? [nameInferred] : []);

  var mood1 = a1.mood;
  var mood2 = a2.mood;

  // ── 1. CUISINE HARMONY (0–30 pts) ──────────────────────────
  // Harmonic mean rewards "works decently for both" over "perfect for one, bad for the other"
  var fit1 = getCuisineCompat(restaurantCuisines, a1.cuisines, mood1);
  var fit2 = getCuisineCompat(restaurantCuisines, a2.cuisines, mood2);
  var harmony = harmonicMean(fit1, fit2); // 0–1
  total += harmony * 30;

  // Bonus if the restaurant was found in BOTH people's cuisine searches (strong signal it spans both)
  var foundInP1 = (a1.cuisines || []).some(function(c) { return (place.foundBy || []).includes(c); });
  var foundInP2 = (a2.cuisines || []).some(function(c) { return (place.foundBy || []).includes(c); });
  if (foundInP1 && foundInP2) total += 5;

  // ── 2. PRICE SCORE (0–20 pts) ──────────────────────────────
  var p1Budget = parseInt(a1.priceRange) || 2;
  var p2Budget = parseInt(a2.priceRange) || 2;
  var minBudget = Math.min(p1Budget, p2Budget);
  var maxBudget = Math.max(p1Budget, p2Budget);
  var placePrice = place.price_level; // 0–4 or undefined

  if (placePrice == null) {
    total += 10; // unknown price — neutral
  } else if (placePrice >= minBudget && placePrice <= maxBudget) {
    total += 20; // within both budgets
  } else if (placePrice === minBudget - 1 || placePrice === maxBudget + 1) {
    total += 12; // one level off
  } else if (placePrice === minBudget - 2 || placePrice === maxBudget + 2) {
    total += 5;  // two levels off
  } else {
    total += 0;  // way off budget
  }

  // ── 3. QUALITY SCORE (0–15 pts) ────────────────────────────
  // Bayesian-adjusted rating prevents small-sample high scores from dominating
  if (place.rating) {
    var reviews = place.user_ratings_total || 0;
    var bayesian = (place.rating * reviews + 4.0 * 50) / (reviews + 50);
    // Maps 3.0→0, 4.0→7.5, 4.5→11.25, 5.0→15
    var qualScore = Math.max(0, (bayesian - 3.0) / 2.0) * 15;
    total += qualScore;
  } else {
    total += 5; // no rating data — slight neutral
  }

  // ── 4. DIETARY & DEALBREAKER SAFETY (0–15 pts) ─────────────
  var name = (place.name || '').toLowerCase();
  var types = (place.types || []).join(' ').toLowerCase();

  var dietary = [].concat(a1.dietary || [], a2.dietary || []).filter(function(d) { return d !== 'none'; });
  // Deduplicate
  dietary = dietary.filter(function(d, idx) { return dietary.indexOf(d) === idx; });

  var dealbreakers = [].concat(a1.dealbreakers || [], a2.dealbreakers || []).filter(function(d) { return d !== 'none'; });
  // Deduplicate
  dealbreakers = dealbreakers.filter(function(d, idx) { return dealbreakers.indexOf(d) === idx; });

  var safetyScore = 15;

  // Vegan: penalize clearly meat-heavy spots
  if (dietary.includes('vegan')) {
    var isHeavilyMeat = ['steakhouse','smokehouse','bbq','chop house','prime rib'].some(function(k) { return name.includes(k) || types.includes(k); });
    if (isHeavilyMeat) safetyScore -= 12;
    // Korean BBQ is also problematic for vegans
    if (restaurantCuisines.includes('Korean') && (name.includes('bbq') || name.includes('grill'))) safetyScore -= 6;
  }

  // Vegetarian: softer penalty for steakhouses
  if (dietary.includes('vegetarian') && !dietary.includes('vegan')) {
    var isPureMeat = ['steakhouse','chop house'].some(function(k) { return name.includes(k) || types.includes(k); });
    if (isPureMeat) safetyScore -= 5;
  }

  // Dealbreakers
  if (dealbreakers.includes('no-seafood')) {
    var isSeafood = ['seafood','fish','oyster','crab','shrimp','lobster','clam','sushi','poke'].some(function(k) { return name.includes(k) || types.includes(k); });
    if (isSeafood) safetyScore -= 12;
  }
  if (dealbreakers.includes('no-red-meat')) {
    var isRedMeat = ['steakhouse','steak house','chophouse','prime rib','bbq'].some(function(k) { return name.includes(k) || types.includes(k); });
    if (isRedMeat) safetyScore -= 8;
  }
  if (dealbreakers.includes('no-spicy')) {
    // Thai, Indian, Korean, Mexican are potentially spicy — small penalty, not a full disqualifier
    var spicyCuisines = ['Thai', 'Indian', 'Korean', 'Mexican'];
    if (restaurantCuisines.some(function(c) { return spicyCuisines.includes(c); })) safetyScore -= 4;
  }
  if (dealbreakers.includes('no-dairy')) {
    // Italian (pizza/pasta) and Indian (butter/cream) are heavy dairy — soft penalty
    var dairyCuisines = ['Italian', 'Indian'];
    if (restaurantCuisines.some(function(c) { return dairyCuisines.includes(c); })) safetyScore -= 3;
  }

  total += Math.max(0, safetyScore);

  // ── 5. OPEN NOW BONUS (0–5 pts) ────────────────────────────
  if (place.opening_hours && place.opening_hours.open_now) total += 5;

  // ── 6. VIBE MATCH (0–5 pts) ────────────────────────────────
  var v1 = a1.vibe;
  var v2 = a2.vibe;

  if (v1 === v2) {
    // Same vibe — score directly
    if (v1 === 'fast' && (types.includes('fast_food') || types.includes('meal_takeaway'))) total += 5;
    else if (v1 === 'romantic' && placePrice >= 3) total += 5;
    else if (v1 === 'casual' && (placePrice <= 2 || types.includes('bar'))) total += 5;
    else if (v1 === 'trendy' && (place.user_ratings_total > 300)) total += 5;
    else total += 2; // vibe wanted but place is ambiguous
  } else {
    // Different vibes — look for middle ground (upscale-casual, $$ range)
    if (placePrice === 2 || placePrice === 3) total += 3;
    if (place.rating >= 4.2) total += 2; // quality bridges vibe gaps
  }

  // ── 7. PRIORITY ALIGNMENT (0–5 pts) ────────────────────────
  // One bonus applied based on EITHER person's top priority
  var priorities = new Set([a1.priority, a2.priority]);

  if (priorities.has('rating')) {
    if (place.rating >= 4.4) total += 5;
    else if (place.rating >= 4.0) total += 3;
  } else if (priorities.has('value')) {
    // Good rating relative to price
    if (placePrice != null && placePrice <= minBudget && place.rating >= 4.0) total += 5;
    else if (place.rating >= 3.8) total += 2;
  } else if (priorities.has('ambiance')) {
    // Higher price level or high review count signals good ambiance
    if (placePrice >= 3 || (place.user_ratings_total > 500 && place.rating >= 4.2)) total += 5;
    else if (placePrice === 2 && place.rating >= 4.3) total += 3;
  } else if (priorities.has('distance')) {
    // Can't get distance data from nearby search, so give everyone baseline
    total += 3;
  }

  // ── 8. MOOD / ADVENTURE MODIFIER (0–5 pts) ─────────────────
  var bothAdventurous = mood1 === 'adventurous' && mood2 === 'adventurous';
  var bothComfort     = mood1 === 'comfort'      && mood2 === 'comfort';
  var mainstreamCuisines = new Set(['American', 'Italian', 'Mexican']);

  if (bothAdventurous) {
    // Reward exotic choices that neither person might have tried before
    var isExotic = restaurantCuisines.length > 0 && restaurantCuisines.every(function(c) { return !mainstreamCuisines.has(c); });
    if (isExotic) total += 5;
  } else if (bothComfort) {
    // Reward familiar, well-reviewed classics
    var isComforting = restaurantCuisines.some(function(c) { return mainstreamCuisines.has(c); }) || restaurantCuisines.length === 0;
    if (isComforting && place.rating >= 4.0) total += 5;
    else if (isComforting) total += 3;
  } else {
    // Mixed moods — slight bonus for versatile/balanced options
    if (placePrice === 2 || placePrice === 3) total += 3;
  }

  // ── 9. WAIT TIME COMPATIBILITY (0–3 pts) ───────────────────
  var waits = [a1.waitTime, a2.waitTime];
  var mostImpatient = waits.includes('none') ? 'none' : (waits.includes('short') ? 'short' : 'long');

  if (mostImpatient === 'none') {
    // Starving — fast food or takeout-friendly places win
    if (types.includes('fast_food') || types.includes('meal_takeaway')) total += 3;
    else if (placePrice <= 1) total += 2;
  } else if (mostImpatient === 'long') {
    // Happy to wait — upscale or popular spots
    if (placePrice >= 3 || place.user_ratings_total > 200) total += 3;
  } else {
    total += 1; // moderate — neutral
  }

  // ── 10. POPULARITY SIGNAL (0–2 pts) ────────────────────────
  if (place.user_ratings_total > 1000) total += 2;
  else if (place.user_ratings_total > 200) total += 1;

  return Math.round(total);
}

module.exports = { inferCuisineFromName, getCuisineCompat, harmonicMean, scorePlace, CUISINE_COMPAT, CUISINE_SEARCH_MAP, CUISINE_NAME_KEYWORDS, BRIDGE_CUISINES };
