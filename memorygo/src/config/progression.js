export const LEVELS = [
  { level: 1,  xp: 0 },
  { level: 2,  xp: 100 },
  { level: 3,  xp: 250 },
  { level: 4,  xp: 450 },
  { level: 5,  xp: 700 },
  { level: 6,  xp: 1000 },
  { level: 7,  xp: 1350 },
  { level: 8,  xp: 1750 },
  { level: 9,  xp: 2200 },
  { level: 10, xp: 2700 }
];

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
