import {type BuildEvent, EventType} from './events';

export interface AutomatonState {
  id: number;
  maxLength: number;
  suffixLink: number;
  transitions: Map<string, number>;
  isClone: boolean;
  isTerminal: boolean;
  acceptedExample: string;
  cloneSource?: number;
}

export interface AutomatonBuildResult {
  states: AutomatonState[];
  history: BuildEvent[];
}

class SuffixAutomatonBuilder {
  private readonly states: AutomatonState[] = [];
  private readonly history: BuildEvent[] = [];
  private readonly root: number;
  private last: number;

  constructor() {
    this.root = this.createState(0);
    this.last = this.root;
  }

  build(word: string): AutomatonBuildResult {
    for (const char of word) {
      this.extend(char);
    }
    this.markTerminalStates();

    return {
      states: this.states.map((state) => ({
        ...state,
        transitions: new Map(state.transitions),
      })),
      history: [...this.history],
    };
  }

  private createState(maxLength: number): number {
    const id = this.states.length;
    this.states.push({
      id,
      maxLength,
      suffixLink: -1,
      transitions: new Map<string, number>(),
      isClone: false,
      isTerminal: false,
      acceptedExample: '',
    });
    this.history.push({type: EventType.CreateNewState, stateId: id, depth: maxLength, acceptedExample: ''});
    return id;
  }

  private createClone(source: AutomatonState, maxLength: number): number {
    const id = this.states.length;
    const acceptedExample = source.acceptedExample.slice(0, maxLength);
    this.states.push({
      id,
      maxLength,
      suffixLink: source.suffixLink,
      transitions: new Map(source.transitions),
      isClone: true,
      isTerminal: false,
      acceptedExample,
      cloneSource: source.id,
    });

    this.history.push({
      type: EventType.CreateClonedState,
      stateId: id,
      source: source.id,
      depth: maxLength,
      acceptedExample,
    });

    for (const [label, target] of source.transitions) {
      this.history.push({type: EventType.CreateLink, source: id, target, label});
    }
    if (source.suffixLink >= 0) {
      this.history.push({
        type: EventType.CreateSuffixLink,
        source: id,
        target: source.suffixLink,
      });
    }

    return id;
  }

  private createTransition(source: number, target: number, label: string): void {
    this.states[source]!.transitions.set(label, target);
    this.history.push({type: EventType.CreateLink, source, target, label});
  }

  private createSuffixLink(source: number, target: number): void {
    this.states[source]!.suffixLink = target;
    this.history.push({type: EventType.CreateSuffixLink, source, target});
  }

  private createEventFocusAdd(stateId: number): void {
    this.history.push({type: EventType.Focus, stateId});
  }

  private createEventFocusRemove(stateId: number): void {
    this.history.push({type: EventType.RemoveFocus, stateId});
  }

  private extend(char: string): void {
    const current = this.createState(this.states[this.last]!.maxLength + 1);
    this.states[current]!.acceptedExample = this.states[this.last]!.acceptedExample + char;
    const createEvent = this.history[this.history.length - 1];
    if (createEvent?.type === EventType.CreateNewState) {
      createEvent.acceptedExample = this.states[current]!.acceptedExample;
    }
    this.createEventFocusAdd(current);

    let previous = this.last;
    while (previous !== -1 && !this.states[previous]!.transitions.has(char)) {
      this.createEventFocusAdd(previous);
      this.createTransition(previous, current, char);
      this.createEventFocusRemove(previous);
      previous = this.states[previous]!.suffixLink;
    }

    if (previous === -1) {
      this.createSuffixLink(current, this.root);
    } else {
      this.createEventFocusAdd(previous);
      this.createEventFocusRemove(previous);

      const next = this.states[previous]!.transitions.get(char);
      if (next === undefined) {
        throw new Error(`Missing transition for "${char}" from state ${previous}`);
      }
      this.createEventFocusAdd(next);

      const requiredLength = this.states[previous]!.maxLength + 1;
      if (this.states[next]!.maxLength === requiredLength) {
        this.createSuffixLink(current, next);
        this.createEventFocusRemove(next);
      } else {
        const clone = this.createClone(this.states[next]!, requiredLength);

        if (this.states[next]!.suffixLink >= 0) {
          this.history.push({
            type: EventType.RemoveSuffixLink,
            source: next,
            target: this.states[next]!.suffixLink,
          });
        }
        this.createSuffixLink(next, clone);
        this.createEventFocusRemove(next);
        this.createEventFocusAdd(clone);

        while (previous !== -1 && this.states[previous]!.transitions.get(char) === next) {
          this.history.push({
            type: EventType.RemoveLink,
            source: previous,
            target: next,
            label: char,
          });
          this.createTransition(previous, clone, char);
          previous = this.states[previous]!.suffixLink;
        }

        this.createSuffixLink(current, clone);
        this.createEventFocusRemove(clone);
      }
    }

    this.createEventFocusRemove(current);
    this.last = current;
  }

  private markTerminalStates(): void {
    let state = this.last;
    while (state !== -1) {
      this.states[state]!.isTerminal = true;
      state = this.states[state]!.suffixLink;
    }
  }
}

export function buildSuffixAutomaton(word: string): AutomatonBuildResult {
  return new SuffixAutomatonBuilder().build(word);
}
