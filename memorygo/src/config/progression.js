// Define levels and calculate game/area unlocks.

// Define all levels and their unlock requirements.
export const LEVELS = [
  { level: 1, xp: 0,   games: ['memory', 'object-id'], areas: [1] },
  { level: 2, xp: 100, games: ['odd-one-out'],         areas: [2] },
  { level: 3, xp: 250, games: ['pattern'],             areas: [] },
  { level: 4, xp: 450, games: ['whats-missing'],       areas: [] },
  { level: 5, xp: 700, games: ['sequence'],            areas: [] }
];

// Which page each game lives on
export const GAME_ROUTES = {
  'memory': '/games/memory',
  'object-id': '/games/object',
  'odd-one-out': '/games/oddoneout',
  'pattern': '/games/pattern',
  'whats-missing': '/games/missing',
  'sequence': '/games/sequence'
};

// Names for unlock messages
export const GAME_NAMES = {
  'memory': 'Memory Match', 'object-id': 'Object Identification',
  'odd-one-out': 'Odd One Out', 'pattern': 'Pattern', 
  'whats-missing': "What's Missing", 'sequence': 'Sequence Recall'
};

// Pick a random game from the ones this player has unlocked
export function pickRandomGame(xp) {
  //in result, it get the games and area that the user is at
  const { games } = unlockedUpTo(levelFromXp(xp));
  //randomly pick a game for the user to play at the station
  return games[Math.floor(Math.random() * games.length)];
}

// Store the maximum level.
export const MAX_LEVEL = LEVELS.length;

// Get the XP required for a level.
export function xpRequiredForLevel(level) {
  const levelInfo = LEVELS.find(item => item.level === level);

  // Return null if the level does not exist.
  return levelInfo ? levelInfo.xp : null;
}

// Find the user's current level from their XP.
export function levelFromXp(xp) {
    //prevents XP from being negative
  const safeXp = Math.max(0, Number(xp) || 0);

  // Start at Level 1 because everyone begins at Level 1.
  let currentLevel = 1;

  // Check every level's XP requirement.
  for (const item of LEVELS) {
    if (safeXp >= item.xp) {
      currentLevel = item.level;
    }
  }

  // Return the highest level the user has reached.
  return currentLevel;
}

// Calculate progress towards the next level.
export function progressToNext(xp) {
  const safeXp = Math.max(0, Number(xp) || 0);
  const currentLevel = levelFromXp(safeXp);

  // Get the current level's information.
  const currentInfo = LEVELS.find(
    item => item.level === currentLevel
  );

  // Find the next level.
  const nextInfo = LEVELS.find(
    item => item.level === currentLevel + 1
  );

  // The user has reached the maximum level.
  if (!nextInfo) {
    return {
      level: currentLevel,
      currentXp: safeXp,
      nextLevel: null,
      nextXp: null,
      xpIntoLevel: safeXp - currentInfo.xp,
      xpNeeded: 0,
      percent: 100
    };
  }

  // XP earned since reaching the current level.
  const xpIntoLevel = safeXp - currentInfo.xp;

  // Total XP needed to move from this level to the next.
  const xpNeeded = nextInfo.xp - currentInfo.xp;

  // Calculate the percentage completed.
  const percent = Math.floor((xpIntoLevel / xpNeeded) * 100)
 

  return {
    level: currentLevel,
    currentXp: safeXp,
    nextLevel: nextInfo.level,
    nextXp: nextInfo.xp,
    xpIntoLevel,
    xpNeeded,
    percent
  };
}

// Get every game and area unlocked up to a level.
export function unlockedUpTo(level) {
  const unlockedGames = [];
  const unlockedAreas = [];

  // Visit each level that the user has reached.
  for (const item of LEVELS) {
    if (item.level <= level) {
      unlockedGames.push(...item.games);
      unlockedAreas.push(...item.areas);
    }
  }

  // Return both lists.
  return {
    games: [...new Set(unlockedGames)],
    areas: [...new Set(unlockedAreas)]
  };
}

// Check whether a particular game is unlocked.
export function isGameUnlocked(gameId, xp) {
  const level = levelFromXp(xp);
  const unlocked = unlockedUpTo(level);

  // True if the game exists in the unlocked list.
  return unlocked.games.includes(gameId);
}

// Check whether a particular area is unlocked.
export function isAreaUnlocked(areaId, xp) {
  const level = levelFromXp(xp);
  const unlocked = unlockedUpTo(level);

  // True if the area exists in the unlocked list.
  return unlocked.areas.includes(areaId);
}

// Find the level needed to unlock a game.
export function gameUnlockLevel(gameId) {
  const item = LEVELS.find(
    level => level.games.includes(gameId)
  );

  return item ? item.level : null;
}

// Find the level needed to unlock an area.
export function areaUnlockLevel(areaId) {
  const item = LEVELS.find(
    level => level.areas.includes(areaId)
  );

  return item ? item.level : null;
}

// Find newly unlocked games and areas after XP changes.
export function newUnlocks(oldXp, newXp) {
  const oldLevel = levelFromXp(oldXp);
  const newLevel = levelFromXp(newXp);

  const before = unlockedUpTo(oldLevel);
  const after = unlockedUpTo(newLevel);

  return {
    games: after.games.filter(
      game => !before.games.includes(game)
    ),
    areas: after.areas.filter(
      area => !before.areas.includes(area)
    )
  };
}

