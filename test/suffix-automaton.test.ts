import {describe, expect, it} from 'vitest';

import {EventType} from '../src/events';
import {buildSuffixAutomaton} from '../src/suffix-automaton';

function accepts(word: string, candidate: string): boolean {
  const {states} = buildSuffixAutomaton(word);
  let state = 0;

  for (const char of candidate) {
    const next = states[state]?.transitions.get(char);
    if (next === undefined) {
      return false;
    }
    state = next;
  }

  return true;
}

function substrings(word: string): string[] {
  const result = new Set<string>(['']);
  for (let start = 0; start < word.length; start += 1) {
    for (let end = start + 1; end <= word.length; end += 1) {
      result.add(word.slice(start, end));
    }
  }
  return [...result];
}

describe('buildSuffixAutomaton', () => {
  it.each(['', 'a', 'aaaa', 'abba', 'banana', 'abcdef'])(
    'accepts every substring for %s',
    (word) => {
      for (const substring of substrings(word)) {
        expect(accepts(word, substring), substring).toBe(true);
      }
    },
  );

  it('does not accept representative non-substrings', () => {
    expect(accepts('abba', 'bbb')).toBe(false);
    expect(accepts('banana', 'band')).toBe(false);
    expect(accepts('abcdef', 'fed')).toBe(false);
  });

  it('keeps state count within the suffix automaton bound', () => {
    for (const word of ['a', 'aaaa', 'abba', 'banana', 'abcbc']) {
      const {states} = buildSuffixAutomaton(word);
      expect(states.length).toBeLessThanOrEqual(2 * word.length);
    }
  });

  it('creates clones for inputs that need state splitting', () => {
    const candidates = ['abcbc', 'banana', 'abcabxabcd'];
    expect(candidates.some((word) => buildSuffixAutomaton(word).states.some((state) => state.isClone))).toBe(true);
  });
});

describe('build history', () => {
  it('references only existing states as history is applied', () => {
    const {history} = buildSuffixAutomaton('banana');
    const states = new Set<number>();
    const transitionLinks = new Set<string>();
    const suffixLinks = new Set<string>();

    for (const event of history) {
      switch (event.type) {
        case EventType.CreateNewState:
        case EventType.CreateClonedState:
          states.add(event.stateId);
          expect(event.depth).toBeGreaterThanOrEqual(0);
          break;
        case EventType.CreateLink:
          expect(states.has(event.source)).toBe(true);
          expect(states.has(event.target)).toBe(true);
          transitionLinks.add(`${event.source}:${event.label}:${event.target}`);
          break;
        case EventType.RemoveLink:
          expect(transitionLinks.delete(`${event.source}:${event.label}:${event.target}`)).toBe(true);
          break;
        case EventType.CreateSuffixLink:
          expect(states.has(event.source)).toBe(true);
          expect(states.has(event.target)).toBe(true);
          suffixLinks.add(`${event.source}:${event.target}`);
          break;
        case EventType.RemoveSuffixLink:
          expect(suffixLinks.delete(`${event.source}:${event.target}`)).toBe(true);
          break;
        case EventType.Focus:
        case EventType.RemoveFocus:
          expect(states.has(event.stateId)).toBe(true);
          break;
      }
    }
  });
});
