import {Event, EventType} from './events';

interface State {
    index: number;
    maxLength: number;
    suffixLink: number;
    go: Map<string, number>;
    isTerminal: boolean;
}

class SuffixAutomaton {
    states: Array<State>;
    root: number;
    last: number;

    constructor() {
        this.states = [];
        this.root = 0;
        this.last = 0;
    }

    GetState(index: number) {
        return this.states[index];
    }

    GetLastState() {
        return this.states[this.last];
    }

    GetNextState(from: number, label: string): number {
        let index = this.states[from].go.get(label);
        return index === undefined ? -1 : index;
    }
}

class SuffixAutomatonBuilder {
    automaton: SuffixAutomaton;
    history: Array<Event>;

    constructor() {
        this.history = [];

        this.automaton = new SuffixAutomaton();
        this.automaton.root = this.CreateNewState(0);
    }

    CreateNewState(maxLength: number): number {
        let index: number = this.automaton.states.length;

        let state: State = {
            index: index,
            maxLength: maxLength,
            suffixLink: -1,
            go: new Map(),
            isTerminal: false
        };

        this.automaton.states.push(state);

        this.history.push({
            type: EventType.CreateNewState,
            attributes: {stateID: index, depth: maxLength}
        });

        return index;
    }

    CreateClonedState(from: State, maxLength: number): number {
        let index = this.automaton.states.length;

        let state: State = {
            index: index,
            maxLength: maxLength,
            suffixLink: from.suffixLink,
            go: from.go,
            isTerminal: false
        };

        this.automaton.states.push(state);

        this.history.push({
            type: EventType.CreateClonedState,
            attributes: {stateID: index, source: from.index, depth: maxLength}
        });

        state.go.forEach((nextState: number, label: string) => {
            this.history.push({
                type: EventType.CreateLink,
                attributes: {source: index, target: nextState, label: label}
            });
        });

        this.history.push({
            type: EventType.CreateSuffixLink,
            attributes: {source: index, target: from.suffixLink}
        });

        return index;
    }

    AddLink(source: number, target: number, label: string) {
        this.automaton.states[source].go.set(label, target);

        this.history.push({
            type: EventType.CreateLink,
            attributes: {source: source, target: target, label: label}
        });
    }

    AddSuffixLink(source: number, target: number) {
        this.automaton.states[source].suffixLink = target;

        this.history.push({
            type: EventType.CreateSuffixLink,
            attributes: {source: source, target: target}
        });
    }

    Extend(c: string) {
        let newStateLength = this.automaton.GetLastState().maxLength + 1;
        let newStateIndex = this.CreateNewState(newStateLength);

        this.history.push(
            {type: EventType.Focus, attributes: {stateID: newStateIndex}});

        while (this.automaton.last != -1 &&
               !this.automaton.GetLastState().go.has(c)) {
            this.history.push({
                type: EventType.Focus,
                attributes: {stateID: this.automaton.last}
            });

            this.AddLink(this.automaton.last, newStateIndex, c);

            this.history.push({
                type: EventType.RemoveFocus,
                attributes: {stateID: this.automaton.last}
            });

            this.automaton.last = this.automaton.GetLastState().suffixLink;
        }

        if (this.automaton.last == -1) {
            this.AddSuffixLink(newStateIndex, this.automaton.root);
        } else {
            let possibleSuffixLinkIndex =
                this.automaton.GetNextState(this.automaton.last, c);

            this.history.push({
                type: EventType.Focus,
                attributes: {stateID: this.automaton.last}
            });

            this.history.push({
                type: EventType.RemoveFocus,
                attributes: {stateID: this.automaton.last}
            });

            this.history.push({
                type: EventType.Focus,
                attributes: {stateID: possibleSuffixLinkIndex}
            });

            let requiredLength = this.automaton.GetLastState().maxLength + 1;

            if (this.automaton.GetState(possibleSuffixLinkIndex).maxLength ===
                requiredLength) {
                this.AddSuffixLink(newStateIndex, possibleSuffixLinkIndex);

                this.history.push({
                    type: EventType.RemoveFocus,
                    attributes: {stateID: possibleSuffixLinkIndex}
                });

            } else {
                var suffixLinkIndex = this.CreateClonedState(
                    this.automaton.GetState(possibleSuffixLinkIndex),
                    requiredLength);

                this.history.push({
                    type: EventType.RemoveSuffixLink,
                    attributes: {
                        source: possibleSuffixLinkIndex,
                        target: this.automaton.states[possibleSuffixLinkIndex]
                                    .suffixLink
                    }
                });

                this.AddSuffixLink(possibleSuffixLinkIndex, suffixLinkIndex);

                this.history.push({
                    type: EventType.RemoveFocus,
                    attributes: {stateID: possibleSuffixLinkIndex}
                });

                this.history.push({
                    type: EventType.Focus,
                    attributes: {stateID: suffixLinkIndex}
                });

                while (this.automaton.last != -1 &&
                       this.automaton.GetLastState().go.get(c) ===
                           possibleSuffixLinkIndex) {
                    this.history.push({
                        type: EventType.RemoveLink,
                        attributes: {
                            source: this.automaton.last,
                            target: possibleSuffixLinkIndex
                        }
                    });

                    this.AddLink(this.automaton.last, suffixLinkIndex, c);

                    this.automaton.last =
                        this.automaton.GetLastState().suffixLink;
                }

                this.AddSuffixLink(newStateIndex, suffixLinkIndex);

                this.history.push({
                    type: EventType.RemoveFocus,
                    attributes: {stateID: suffixLinkIndex}
                });
            }
        }

        this.automaton.last = newStateIndex;
    }
}

export function SuffixAutomatomBuildHistory(word: string): Array<Event> {
    var builder = new SuffixAutomatonBuilder();

    for (let c of word) {
        builder.Extend(c);
    }

    return builder.history;
}