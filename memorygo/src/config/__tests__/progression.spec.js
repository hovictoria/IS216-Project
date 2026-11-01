import { describe, test, expect } from 'vitest'
import {
    LEVELS,
    MAX_LEVEL,
    levelFromXp,
    progressToNext,
    xpRequiredForLevel,
} from '../progression'

describe('LEVELS table', () => {
    test('starts at Level 1 with 0 XP', () => {
        expect(LEVELS[0]).toEqual({ level: 1, xp: 0 })
    })

    test('levels are numbered 1, 2, 3 ... with no gaps', () => {
        LEVELS.forEach((item, i) => expect(item.level).toBe(i + 1))
    })

    test('each level needs more XP than the one before', () => {
        for (let i = 1; i < LEVELS.length; i++) {
            expect(LEVELS[i].xp).toBeGreaterThan(LEVELS[i - 1].xp)
        }
    })

    test('MAX_LEVEL is the last level', () => {
        expect(MAX_LEVEL).toBe(LEVELS.length)
        expect(MAX_LEVEL).toBe(10)
    })
})

describe('xpRequiredForLevel(level)', () => {
    test.each([
        [1, 0],
        [2, 100],
        [5, 700],
        [10, 2700],
    ])('Level %i needs %i XP', (level, xp) => {
        expect(xpRequiredForLevel(level)).toBe(xp)
    })

    test('a level that does not exist gives null', () => {
        expect(xpRequiredForLevel(0)).toBeNull()
        expect(xpRequiredForLevel(11)).toBeNull()
    })
})

describe('levelFromXp(xp)', () => {
    test('a new player (0 XP) is Level 1', () => {
        expect(levelFromXp(0)).toBe(1)
    })

    // one XP short stays on the old level, landing exactly on the line reaches the new one
    test.each([
        [99, 1],
        [100, 2],
        [249, 2],
        [250, 3],
        [699, 4],
        [700, 5],
        [999, 5],
        [1000, 6],
        [2699, 9],
        [2700, 10],
    ])('%i XP is Level %i', (xp, level) => {
        expect(levelFromXp(xp)).toBe(level)
    })

    test('XP above the top level stays at the max level', () => {
        expect(levelFromXp(9999)).toBe(MAX_LEVEL)
    })

    test('bad values are treated as 0 XP, so they never crash', () => {
        expect(levelFromXp(-50)).toBe(1)
        expect(levelFromXp(null)).toBe(1)
        expect(levelFromXp(undefined)).toBe(1)
        expect(levelFromXp('abc')).toBe(1)
    })

    test('XP sent as text (e.g. from the server) still works', () => {
        expect(levelFromXp('250')).toBe(3)
    })
})

describe('progressToNext(xp)', () => {
    test('a new player is 0% of the way to Level 2', () => {
        expect(progressToNext(0)).toEqual({
            level: 1,
            currentXp: 0,
            nextLevel: 2,
            nextXp: 100,
            xpIntoLevel: 0,
            xpNeeded: 100,
            percent: 0,
        })
    })

    test('halfway through a level shows 50%', () => {
        // Level 2 runs from 100 to 250 XP (150 XP), so 175 XP is 75 in = 50%
        const progress = progressToNext(175)
        expect(progress.level).toBe(2)
        expect(progress.xpIntoLevel).toBe(75)
        expect(progress.xpNeeded).toBe(150)
        expect(progress.percent).toBe(50)
    })

    test('the percent is rounded down, so the bar never shows 100% before levelling up', () => {
        // 99 of 100 XP to Level 2
        expect(progressToNext(99).percent).toBe(99)
        // Level 9 → 10 is 500 XP; 2699 is 499 in = 99.8%
        expect(progressToNext(2699).percent).toBe(99)
    })

    test('reaching a new level starts its bar again at 0%', () => {
        const progress = progressToNext(1000)
        expect(progress.level).toBe(6)
        expect(progress.xpIntoLevel).toBe(0)
        expect(progress.percent).toBe(0)
    })

    test('the max level has no next level and a full bar', () => {
        const progress = progressToNext(2700)
        expect(progress.level).toBe(10)
        expect(progress.nextLevel).toBeNull()
        expect(progress.nextXp).toBeNull()
        expect(progress.xpNeeded).toBe(0)
        expect(progress.percent).toBe(100)
    })

    test('bad values are treated as 0 XP', () => {
        expect(progressToNext(-20)).toEqual(progressToNext(0))
    })

    test('the percent is always between 0 and 100', () => {
        for (let xp = 0; xp <= 3000; xp += 7) {
            const { percent } = progressToNext(xp)
            expect(percent).toBeGreaterThanOrEqual(0)
            expect(percent).toBeLessThanOrEqual(100)
        }
    })
})

describe('level-up check used by the pop-up (lib/gamereward.js)', () => {
    // level before = levelFromXp(total - earned), level after = levelFromXp(total)
    // and LevelUpNotice shows only when after > before
    const levelledUp = (totalXp, earnedXp) => levelFromXp(totalXp) > levelFromXp(totalXp - earnedXp)

    test('crossing a level line shows the pop-up', () => {
        expect(levelledUp(105, 10)).toBe(true)      // 95 → 105
        expect(levelFromXp(105)).toBe(2)
    })

    test('landing exactly on the line shows the pop-up', () => {
        expect(levelledUp(100, 30)).toBe(true)      // 70 → 100
    })

    test('staying on the same level does not', () => {
        expect(levelledUp(99, 30)).toBe(false)      // 69 → 99
        expect(levelledUp(130, 30)).toBe(false)     // 100 → 130
    })

    test('a practice game (0 XP) never does', () => {
        expect(levelledUp(95, 0)).toBe(false)
    })

    test('already at the max level never does', () => {
        expect(levelledUp(3000, 30)).toBe(false)
    })
})
