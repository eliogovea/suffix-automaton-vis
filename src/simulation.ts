import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type ForceLink,
  type Simulation as D3Simulation,
} from 'd3-force';

import type {Animation, GraphLink, GraphNode, GraphSnapshot} from './animation';
import {LinkType} from './animation';
import {type BuildEvent, EventType} from './events';
import type {AutomatonState} from './suffix-automaton';

const defaultLinkStrength = 0.12;
const defaultLinkDistance = 145;
const defaultSuffixLinkStrength = 0.42;
const defaultSuffixLinkDistance = 190;
const defaultMarginRatio = 18;

export interface LayoutConfiguration {
  layerCount: number;
  xStrength: number;
  yStrength: number;
  chargeStrength: number;
  collideRadius: number;
}

export function transitionLinkId(source: number, target: number, label: string): string {
  return `transition-${source}-${label}-${target}`;
}

export function suffixLinkId(source: number, target: number): string {
  return `suffix-${source}-${target}`;
}

export class Simulation {
  readonly nodes: GraphNode[] = [];
  readonly links: GraphLink[] = [];
  private readonly simulation: D3Simulation<GraphNode, GraphLink>;
  private currentEvent?: BuildEvent;
  private selectedNodeId?: number;
  private readonly stateMetadata = new Map<number, AutomatonState>();

  constructor(private readonly animation: Animation) {
    this.simulation = forceSimulation<GraphNode>(this.nodes)
      .force('x', forceX<GraphNode>().strength(0))
      .force('y', forceY<GraphNode>().strength(0))
      .force('charge', forceManyBody<GraphNode>().strength(-1100))
      .force(
        'link',
        forceLink<GraphNode, GraphLink>(this.links)
          .id((node) => node.id)
          .strength((link) =>
            link.type === LinkType.Transition ? defaultLinkStrength : defaultSuffixLinkStrength,
          )
          .distance((link) =>
            link.type === LinkType.Transition ? defaultLinkDistance : defaultSuffixLinkDistance,
          ),
      )
      .force('collide', forceCollide<GraphNode>(48))
      .alphaTarget(0.08)
      .on('tick', () => {
        this.animation.refresh();
      });
  }

  clean(): void {
    this.nodes.length = 0;
    this.links.length = 0;
    this.currentEvent = undefined;
    this.selectedNodeId = undefined;
    this.refresh();
  }

  configureLayout(config: LayoutConfiguration): void {
    const {width, height} = this.animation.getBounds();
    const margin = width / defaultMarginRatio;
    this.simulation.force(
      'x',
      forceX<GraphNode>()
        .strength(config.xStrength)
        .x((node) => margin + (width / (config.layerCount + 1)) * node.depth),
    );
    this.simulation.force(
      'y',
      forceY<GraphNode>()
        .strength(config.yStrength)
        .y(height / 2),
    );
    this.simulation.force('charge', forceManyBody<GraphNode>().strength(-config.chargeStrength));
    this.simulation.force('collide', forceCollide<GraphNode>(config.collideRadius));
    this.simulation.alpha(0.9).restart();
  }

  setStateMetadata(states: AutomatonState[]): void {
    this.stateMetadata.clear();
    for (const state of states) {
      this.stateMetadata.set(state.id, state);
    }
  }

  selectNode(nodeId?: number): void {
    this.selectedNodeId = nodeId;
    for (const node of this.nodes) {
      node.selected = node.id === nodeId;
    }
    this.refresh();
  }

  step(event: BuildEvent): void {
    this.currentEvent = event;

    switch (event.type) {
      case EventType.CreateNewState:
        this.nodes.push(this.createNode(event.stateId, event.depth, false));
        break;
      case EventType.CreateClonedState:
        this.nodes.push(this.createNode(event.stateId, event.depth, true, event.source));
        break;
      case EventType.CreateLink:
        this.upsertLink({
          id: transitionLinkId(event.source, event.target, event.label),
          source: event.source,
          target: event.target,
          type: LinkType.Transition,
          label: event.label,
        });
        break;
      case EventType.CreateSuffixLink:
        this.upsertLink({
          id: suffixLinkId(event.source, event.target),
          source: event.source,
          target: event.target,
          type: LinkType.SuffixLink,
        });
        break;
      case EventType.RemoveLink:
        this.removeLink(transitionLinkId(event.source, event.target, event.label));
        break;
      case EventType.RemoveSuffixLink:
        this.removeLink(suffixLinkId(event.source, event.target));
        break;
      case EventType.Focus:
        this.setFocus(event.stateId, true);
        break;
      case EventType.RemoveFocus:
        this.setFocus(event.stateId, false);
        break;
    }

    this.refresh();
  }

  getSnapshot(): GraphSnapshot {
    return {
      nodes: this.nodes,
      links: this.links,
      currentEvent: this.currentEvent,
    };
  }

  private upsertLink(link: GraphLink): void {
    const index = this.links.findIndex((existing) => existing.id === link.id);
    if (index >= 0) {
      this.links[index] = link;
    } else {
      this.links.push(link);
    }
  }

  private removeLink(linkId: string): void {
    const index = this.links.findIndex((link) => link.id === linkId);
    if (index >= 0) {
      this.links.splice(index, 1);
    }
  }

  private createNode(stateId: number, depth: number, isClone: boolean, cloneSource?: number): GraphNode {
    const metadata = this.stateMetadata.get(stateId);
    return {
      id: stateId,
      focused: false,
      selected: false,
      highlighted: false,
      depth,
      isClone,
      isTerminal: metadata?.isTerminal ?? false,
      acceptedExample: metadata?.acceptedExample ?? '',
      cloneSource,
    };
  }

  dragStarted(node: GraphNode): void {
    node.fx = node.x ?? null;
    node.fy = node.y ?? null;
    this.simulation.alphaTarget(0.25).restart();
  }

  dragged(node: GraphNode, x: number, y: number): void {
    node.fx = x;
    node.fy = y;
  }

  dragEnded(node: GraphNode): void {
    node.fx = node.x ?? null;
    node.fy = node.y ?? null;
    this.simulation.alphaTarget(0.08);
  }

  highlightNode(nodeId?: number): void {
    for (const node of this.nodes) {
      node.highlighted = node.id === nodeId;
    }
    this.refresh();
  }

  private setFocus(nodeId: number, focused: boolean): void {
    const node = this.nodes.find((candidate) => candidate.id === nodeId);
    if (node) {
      node.focused = focused;
    }
  }

  private refresh(): void {
    this.animation.setSelectedNode(this.selectedNodeId);
    this.animation.updateData(this.getSnapshot());
    this.simulation.nodes(this.nodes);
    const linkForce = this.simulation.force<ForceLink<GraphNode, GraphLink>>('link');
    linkForce?.links(this.links);
    this.simulation.alpha(0.9).restart();
  }
}
