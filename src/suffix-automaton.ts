import {Event, EventType} from './events';

interface State {
    index: number;
    maxWord: string;
    maxLength: number;
    suffixLink: number;
    isTerminal: boolean;
    go: Map<string, number>;
}

class SuffixAutomaton {
    states: Array<State>;
    root: number;
    last: number;

    history: Array<Event>;

    constructor() {
        this.history = [];

        this.states = [];
        this.root = this.CreateNewState('');
        this.last = this.root;
    }

    CreateNewState(maxWord: string): number {
        let index: number = this.states.length;

        let state: State = {
            index: index,
            maxWord: maxWord,
            maxLength: maxWord.length,
            suffixLink: -1,
            isTerminal: false,
            go: new Map()
        };

        this.states.push(state);

        this.history.push({
            type: EventType.CreateNewState,
            attributes:
                {stateID: index, maxWord: maxWord, depth: maxWord.length}
        });

        return index;
    }

    CreateClonedState(from: State, maxLength: number): number {
        let index = this.states.length;

        let state: State = {
            index: index,
            maxWord: from.maxWord.substr(from.maxWord.length - maxLength),
            maxLength: maxLength,
            suffixLink: from.suffixLink,
            isTerminal: false,
            go: from.go
        };

        this.states.push(state);

        this.history.push({
            type: EventType.CreateClonedState,
            attributes: {
                stateID: index,
                maxWord: state.maxWord,
                source: from.index,
                depth: maxLength
            }
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
        this.states[source].go.set(label, target);

        this.history.push({
            type: EventType.CreateLink,
            attributes: {source: source, target: target, label: label}
        });
    }

    AddSuffixLink(source: number, target: number) {
        this.states[source].suffixLink = target;

        this.history.push({
            type: EventType.CreateSuffixLink,
            attributes: {source: source, target: target}
        });
    }

    GetMinWord(index: number) {
        if (index === this.root) {
            return '';
        }
        const minLength =
            this.states[this.states[index].suffixLink].maxLength + 1;
        const maxLength = this.states[index].maxLength;
        return this.states[index].maxWord.substr(maxLength - minLength);
    }

    Extend(c: string) {
        const maxWord = this.states[this.last].maxWord + c;
        let newStateIndex = this.CreateNewState(maxWord);

        this.history.push(
            {type: EventType.Focus, attributes: {stateID: newStateIndex}});

        while (this.last != -1 && !this.states[this.last].go.has(c)) {
            this.history.push(
                {type: EventType.Focus, attributes: {stateID: this.last}});

            this.AddLink(this.last, newStateIndex, c);

            this.history.push({
                type: EventType.RemoveFocus,
                attributes: {stateID: this.last}
            });

            this.last = this.states[this.last].suffixLink;
        }

        if (this.last == -1) {
            this.AddSuffixLink(newStateIndex, this.root);
        } else {
            let possibleSuffixLinkIndex = this.states[this.last].go.get(c);

            this.history.push(
                {type: EventType.Focus, attributes: {stateID: this.last}});

            this.history.push({
                type: EventType.RemoveFocus,
                attributes: {stateID: this.last}
            });

            this.history.push({
                type: EventType.Focus,
                attributes: {stateID: possibleSuffixLinkIndex}
            });

            let requiredLength = this.states[this.last].maxLength + 1;

            if (this.states[possibleSuffixLinkIndex!].maxLength ===
                requiredLength) {
                this.AddSuffixLink(newStateIndex, possibleSuffixLinkIndex!);

                this.history.push({
                    type: EventType.RemoveFocus,
                    attributes: {stateID: possibleSuffixLinkIndex}
                });

            } else {
                var suffixLinkIndex = this.CreateClonedState(
                    this.states[possibleSuffixLinkIndex!], requiredLength);

                this.history.push({
                    type: EventType.RemoveSuffixLink,
                    attributes: {
                        source: possibleSuffixLinkIndex,
                        target: this.states[possibleSuffixLinkIndex!].suffixLink
                    }
                });

                this.AddSuffixLink(possibleSuffixLinkIndex!, suffixLinkIndex);

                this.history.push({
                    type: EventType.RemoveFocus,
                    attributes: {stateID: possibleSuffixLinkIndex}
                });

                this.history.push({
                    type: EventType.Focus,
                    attributes: {stateID: suffixLinkIndex}
                });

                while (this.last != -1 &&
                       this.states[this.last].go.get(c) ===
                           possibleSuffixLinkIndex) {
                    this.history.push({
                        type: EventType.RemoveLink,
                        attributes:
                            {source: this.last, target: possibleSuffixLinkIndex}
                    });

                    this.AddLink(this.last, suffixLinkIndex, c);

                    this.last = this.states[this.last].suffixLink;
                }

                this.AddSuffixLink(newStateIndex, suffixLinkIndex);

                this.history.push({
                    type: EventType.RemoveFocus,
                    attributes: {stateID: suffixLinkIndex}
                });
            }
        }

        this.last = newStateIndex;
    }
}

export function BuildSuffixAutomaton(word: string): SuffixAutomaton {
    var automaton = new SuffixAutomaton();

    for (let c of word) {
        automaton.Extend(c);
    }

    return automaton;
}