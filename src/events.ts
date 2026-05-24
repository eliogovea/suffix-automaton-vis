export enum EventType {
  CreateNewState = 'create-new-state',
  CreateClonedState = 'create-cloned-state',
  CreateLink = 'create-link',
  RemoveLink = 'remove-link',
  CreateSuffixLink = 'create-suffix-link',
  RemoveSuffixLink = 'remove-suffix-link',
  Focus = 'focus',
  RemoveFocus = 'remove-focus',
}

export type BuildEvent =
  | {
      type: EventType.CreateNewState;
      stateId: number;
      depth: number;
      acceptedExample: string;
    }
  | {
      type: EventType.CreateClonedState;
      stateId: number;
      source: number;
      depth: number;
      acceptedExample: string;
    }
  | {
      type: EventType.CreateLink;
      source: number;
      target: number;
      label: string;
    }
  | {
      type: EventType.RemoveLink;
      source: number;
      target: number;
      label: string;
    }
  | {
      type: EventType.CreateSuffixLink;
      source: number;
      target: number;
    }
  | {
      type: EventType.RemoveSuffixLink;
      source: number;
      target: number;
    }
  | {
      type: EventType.Focus;
      stateId: number;
    }
  | {
      type: EventType.RemoveFocus;
      stateId: number;
    };
