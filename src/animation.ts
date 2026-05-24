import {drag, type D3DragEvent} from 'd3-drag';
import {select, type Selection} from 'd3-selection';
import 'd3-transition';

import type {BuildEvent} from './events';

export interface GraphNode {
  id: number;
  depth: number;
  focused: boolean;
  selected: boolean;
  highlighted: boolean;
  isClone: boolean;
  isTerminal: boolean;
  acceptedExample: string;
  cloneSource?: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export enum LinkType {
  Transition = 'transition',
  SuffixLink = 'suffix-link',
}

export interface GraphLink {
  id: string;
  source: number | GraphNode;
  target: number | GraphNode;
  type: LinkType;
  label?: string;
}

export interface GraphSnapshot {
  nodes: GraphNode[];
  links: GraphLink[];
  currentEvent?: BuildEvent;
}

export interface AnimationInteractions {
  onSelectNode: (nodeId: number) => void;
  onHoverNode: (node: GraphNode, position: {x: number; y: number}) => void;
  onLeaveNode: () => void;
  onDragStart: (node: GraphNode) => void;
  onDrag: (node: GraphNode, x: number, y: number) => void;
  onDragEnd: (node: GraphNode) => void;
}

function linkPath(link: GraphLink): string {
  const source = link.source as GraphNode;
  const target = link.target as GraphNode;
  const sx = source.x ?? 0;
  const sy = source.y ?? 0;
  const tx = target.x ?? 0;
  const ty = target.y ?? 0;
  const dx = tx - sx;
  const dy = ty - sy;
  const distance = Math.max(Math.hypot(dx, dy), 1);
  const curve = 0.5;
  const cx = (sx + tx) / 2 + (-dy / distance) * distance * curve;
  const cy = (sy + ty) / 2 + (dx / distance) * distance * curve;
  return `M${sx},${sy} Q${cx},${cy} ${tx},${ty}`;
}

export class Animation {
  private readonly svg: Selection<SVGSVGElement, unknown, null, undefined>;
  private readonly viewport: Selection<SVGGElement, unknown, null, undefined>;
  private readonly linkLayer: Selection<SVGGElement, unknown, null, undefined>;
  private readonly labelLayer: Selection<SVGGElement, unknown, null, undefined>;
  private readonly nodeLayer: Selection<SVGGElement, unknown, null, undefined>;
  private selectedNodeId?: number;
  private highlightedNodeId?: number;

  constructor(
    host: HTMLElement,
    private readonly width: number,
    private readonly height: number,
    private readonly interactions: AnimationInteractions,
  ) {
    this.svg = select(host)
      .append('svg')
      .attr('class', 'graph-svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('role', 'img')
      .attr('aria-label', 'Suffix automaton graph');

    const defs = this.svg.append('defs');
    defs
      .append('marker')
      .attr('id', 'arrow-transition')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 15)
      .attr('refY', 5)
      .attr('markerWidth', 7)
      .attr('markerHeight', 7)
      .attr('orient', 'auto-start-reverse')
      .append('path')
      .attr('d', 'M 0 0 L 10 5 L 0 10 z');

    defs
      .append('marker')
      .attr('id', 'arrow-suffix')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 15)
      .attr('refY', 5)
      .attr('markerWidth', 7)
      .attr('markerHeight', 7)
      .attr('orient', 'auto-start-reverse')
      .append('path')
      .attr('d', 'M 0 0 L 10 5 L 0 10 z');

    this.viewport = this.svg.append('g').attr('class', 'graph-viewport');
    this.linkLayer = this.viewport.append('g').attr('class', 'link-layer');
    this.labelLayer = this.viewport.append('g').attr('class', 'label-layer');
    this.nodeLayer = this.viewport.append('g').attr('class', 'node-layer');
  }

  setSelectedNode(nodeId?: number): void {
    this.selectedNodeId = nodeId;
  }

  setHighlightedNode(nodeId?: number): void {
    this.highlightedNodeId = nodeId;
  }

  updateData(snapshot: GraphSnapshot): void {
    this.setSelectedNode(snapshot.nodes.find((node) => node.selected)?.id);
    this.updateLinks(snapshot.links);
    this.updateLinkLabels(snapshot.links);
    this.updateNodes(snapshot.nodes);
  }

  refresh(): void {
    this.linkLayer.selectAll<SVGPathElement, GraphLink>('path.link').attr('d', linkPath);
    this.labelLayer.selectAll<SVGTextPathElement, GraphLink>('textPath').attr('startOffset', '50%');
    this.nodeLayer
      .selectAll<SVGGElement, GraphNode>('g.node')
      .attr('transform', (node) => `translate(${node.x ?? 0},${node.y ?? 0})`);
  }

  private updateLinks(links: GraphLink[]): void {
    const selection = this.linkLayer
      .selectAll<SVGPathElement, GraphLink>('path.link')
      .data(links, (link) => link.id);

    selection.exit().transition().duration(160).style('opacity', 0).remove();

    const entered = selection
      .enter()
      .append('path')
      .attr('id', (link) => link.id)
      .attr('class', (link) => `link link--${link.type}`)
      .attr('marker-end', (link) =>
        link.type === LinkType.Transition ? 'url(#arrow-transition)' : 'url(#arrow-suffix)',
      )
      .style('opacity', 0);

    entered.transition().duration(180).style('opacity', 1);

    selection
      .merge(entered)
      .attr('class', (link) => {
        const classes = ['link', `link--${link.type}`];
        if (this.highlightedNodeId !== undefined && this.isConnectedToHighlight(link)) {
          classes.push('link--highlighted');
        }
        return classes.join(' ');
      });
  }

  private updateLinkLabels(links: GraphLink[]): void {
    const transitionLinks = links.filter((link) => link.type === LinkType.Transition);
    const selection = this.labelLayer
      .selectAll<SVGTextElement, GraphLink>('text.link-label')
      .data(transitionLinks, (link) => link.id);

    selection.exit().remove();

    const entered = selection
      .enter()
      .append('text')
      .attr('class', 'link-label')
      .append('textPath')
      .attr('href', (link) => `#${link.id}`)
      .attr('text-anchor', 'middle')
      .text((link) => link.label ?? '');

    entered.attr('startOffset', '50%');
  }

  private updateNodes(nodes: GraphNode[]): void {
    const selection = this.nodeLayer
      .selectAll<SVGGElement, GraphNode>('g.node')
      .data(nodes, (node) => String(node.id));

    selection.exit().transition().duration(160).style('opacity', 0).remove();

    const entered = selection
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('tabindex', 0)
      .attr('role', 'button')
      .on('click', (_event, node) => this.interactions.onSelectNode(node.id))
      .on('pointerenter', (event, node) => {
        this.highlightedNodeId = node.id;
        this.interactions.onHoverNode(node, {x: event.clientX, y: event.clientY});
      })
      .on('pointermove', (event, node) => {
        this.interactions.onHoverNode(node, {x: event.clientX, y: event.clientY});
      })
      .on('pointerleave', () => {
        this.highlightedNodeId = undefined;
        this.interactions.onLeaveNode();
      })
      .on('keydown', (event, node) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.interactions.onSelectNode(node.id);
        }
      })
      .call(
        drag<SVGGElement, GraphNode>()
          .on('start', (_event: D3DragEvent<SVGGElement, GraphNode, GraphNode>, node) => {
            this.interactions.onDragStart(node);
          })
          .on('drag', (event: D3DragEvent<SVGGElement, GraphNode, GraphNode>, node) => {
            this.interactions.onDrag(node, event.x, event.y);
          })
          .on('end', (_event: D3DragEvent<SVGGElement, GraphNode, GraphNode>, node) => {
            this.interactions.onDragEnd(node);
          }),
      );

    entered.append('circle').attr('r', 16);
    entered.append('text').attr('class', 'node-label').attr('dy', '0.34em');

    selection
      .merge(entered)
      .attr('class', (node) => {
        const classes = ['node'];
        if (node.focused) classes.push('node--focused');
        if (node.isClone) classes.push('node--clone');
        if (node.isTerminal) classes.push('node--terminal');
        if (node.highlighted || node.id === this.highlightedNodeId) classes.push('node--highlighted');
        if (node.id === this.selectedNodeId) classes.push('node--selected');
        return classes.join(' ');
      })
      .attr('aria-label', (node) => `State ${node.id}, depth ${node.depth}`)
      .select('text.node-label')
      .text((node) => node.id);
  }

  getBounds(): {width: number; height: number} {
    return {width: this.width, height: this.height};
  }

  getSelectedNodeId(): number | undefined {
    return this.selectedNodeId;
  }

  private isConnectedToHighlight(link: GraphLink): boolean {
    const source = typeof link.source === 'number' ? link.source : link.source.id;
    const target = typeof link.target === 'number' ? link.target : link.target.id;
    return source === this.highlightedNodeId || target === this.highlightedNodeId;
  }
}

export function createGraphHost(container: HTMLElement): HTMLElement {
  const host = document.createElement('div');
  host.className = 'graph-host';
  container.append(host);
  return host;
}
