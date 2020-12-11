export enum EventType {
    CreateNewState,
    CreateClonedState,
    CreateLink,
    RemoveLink,
    CreateSuffixLink,
    RemoveSuffixLink,
    Focus,
    RemoveFocus,
}

interface Attributes {
    stateID?: number;
    maxWord?: string;
    depth?: number;
    source?: number;
    target?: number;
    label?: string;
    info?: string;
}

export interface Event {
    type: EventType;
    attributes: Attributes;
}