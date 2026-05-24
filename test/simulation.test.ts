import {describe, expect, it} from 'vitest';

import {suffixLinkId, transitionLinkId} from '../src/simulation';

describe('graph link ids', () => {
  it('keeps transition labels distinct', () => {
    expect(transitionLinkId(1, 2, 'a')).not.toBe(transitionLinkId(1, 2, 'b'));
  });

  it('keeps transition and suffix links distinct for the same states', () => {
    expect(transitionLinkId(1, 2, 'a')).not.toBe(suffixLinkId(1, 2));
  });
});
