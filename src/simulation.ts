import * as d3 from 'd3';
import {Animation, Link, LinkType, Node} from './animation';
import {Event, EventType} from './events';

const DefaultLinkStrength = 0.1;
const DefautlSuffixLinkStregnth = 0.5;
const DefaultChargeStrength = -1000;
const DefaultCollideForceRadius = 40;
const DefaultAlphaTarget = 1;

export class Simulation {
    animation: Animation;

    nodes: Array<Node>;
    links: Array<Link>;
    simulation: d3.Simulation<Node, Link>;

    constructor(animation: Animation) {
        this.animation = animation;

        this.nodes = [];
        this.links = [];

        this.simulation =
            d3.forceSimulation<Node>()
                .alphaTarget(DefaultAlphaTarget)
                .force('x', d3.forceX().strength(this.animation.Width() / 2))
                .force('y', d3.forceY().strength(this.animation.Height() / 2))
                .force(
                    'charge',
                    d3.forceManyBody().strength(DefaultChargeStrength))
                .force('collide', d3.forceCollide(DefaultCollideForceRadius))
                .on('tick', () => {
                    this.animation.Refresh();
                });
    }

    Clean() {
        this.nodes = [];
        this.links = [];
        this.Refresh();
    }

    UpdateXForce() {
        const layers = Math.max(...this.nodes.map(o => o.depth), 0) + 1;
        const force =
            this.simulation.force<d3.ForceX<Node>>('x')?.x((node: Node) => {
                return (this.animation.Width() / (layers + 1)) *
                    (node.depth! + 1);
            });
        this.simulation.force('x', (force as d3.ForceX<Node>));
    }

    UpdateYForce() {
        const force =
            this.simulation.force<d3.ForceY<Node>>('y')?.y((node: Node) => {
                return this.animation.Height() / 2;
            });
        this.simulation.force('y', force!);
    }

    UpdateLinkForce() {
        const force = d3.forceLink(this.links)
                          .strength((link: Link) => {
                              return link.type == LinkType.Transition
                                  ? DefaultLinkStrength
                                  : DefautlSuffixLinkStregnth;
                          })
                          .distance((link: Link) => {  // FIXME
                              const source = link.source as Node;
                              const target = link.target as Node;
                              return Math.abs(source.x! - target.x!);
                          });
        this.simulation.force('link', force);
    }

    UpdateXStrength(strength: number) {
        const force =
            this.simulation.force<d3.ForceX<Node>>('x')?.strength(strength);
        this.simulation.force('x', force!);
    }

    UpdateYStrength(strength: number) {
        const force =
            this.simulation.force<d3.ForceY<Node>>('y')?.strength(strength);
        this.simulation.force('y', force!);
    }

    Refresh() {
        this.animation.UpdateData(this.nodes, this.links);
        this.simulation.nodes(this.nodes);
        this.simulation.force('link', d3.forceLink().links(this.links));

        this.UpdateXForce();
        this.UpdateYForce();
        this.UpdateLinkForce();

        this.simulation.restart();
    }

    Step(event: Event) {
        switch (event.type) {
            case EventType.CreateNewState:
            case EventType.CreateClonedState: {
                this.nodes.push({
                    id: event.attributes.stateID!.toString(),
                    maxWord: event.attributes.maxWord as string,
                    focus: false,
                    depth: event.attributes.depth as number
                });
                break;
            }
            case EventType.CreateLink:
            case EventType.CreateSuffixLink: {
                const id = (event.attributes.source?.toString()) + '-' +
                    (event.attributes.target?.toString());

                const type = event.type == EventType.CreateLink
                    ? LinkType.Transition
                    : LinkType.SuffixLink;

                this.links.push({
                    id: id,
                    source: event.attributes.source as number,
                    target: event.attributes.target as number,
                    type: type,
                    label: event.attributes.label as string
                });
                break;
            }
            case EventType.RemoveLink:
            case EventType.RemoveSuffixLink: {
                const id = (event.attributes.source?.toString()) + '-' +
                    (event.attributes.target?.toString());

                this.links = this.links.filter(obj => {
                    return obj.id !== id;
                });
                break;
            }
            case EventType.Focus: {  // FIXME
                this.nodes[event.attributes.stateID!].focus = true;
                break;
            }
            case EventType.RemoveFocus: {  // FIXME
                this.nodes[event.attributes.stateID!].focus = false;
                break;
            }
        }
        this.Refresh();
    }
}
