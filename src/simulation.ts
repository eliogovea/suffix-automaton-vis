import {assert} from 'console';
import * as d3 from 'd3';
import {Animation, Link, LinkType, Node} from './animation';
import {Event, EventType} from './events';

const DefaultLinkStrength = 0.1;
const DefaultLinkDistance = 150;
const DefautlSuffixLinkStregnth = 0.5;
const DefaultSuffixLinkDistance = 200;
const DefaultMarginRatio = 20;

export class Simulation {
    nodes: Array<Node>;
    links: Array<Link>;
    simulation: d3.Simulation<
        d3.SimulationNodeDatum, d3.SimulationLinkDatum<d3.SimulationNodeDatum>>;

    animation: Animation;

    constructor(animation: Animation) {
        this.nodes = [];
        this.links = [];

        this.simulation = d3.forceSimulation().nodes(this.nodes);

        this.simulation.force('x', d3.forceX().strength(0));
        this.simulation.force('y', d3.forceY().strength(0));
        this.simulation.force('charge', d3.forceManyBody().strength(-800));

        this.simulation
            .force(
                'link',
                d3.forceLink(this.links)
                    .strength((d: Link) => {
                        return d.type == LinkType.Transition
                            ? DefaultLinkStrength
                            : DefautlSuffixLinkStregnth;
                    })
                    .distance((d: Link) => {
                        return d.type == LinkType.Transition
                            ? DefaultLinkDistance
                            : DefaultSuffixLinkDistance;
                    }))
            .force('collide', d3.forceCollide(40))
            .alphaTarget(1)
            .on('tick', () => {
                this.animation.Refresh();
            });

        this.animation = animation;
    }

    Clean() {
        this.nodes = [];
        this.links = [];
        this.Refresh();
    }

    UpdateXStrength(layerCount: number, strength: number) {
        const margin = this.animation.width / DefaultMarginRatio;
        let force =
            this.simulation.force<d3.ForceX<Node>>('x')?.strength(strength)?.x(
                (d: Node) => {
                    let depth = d.depth as number;
                    return margin + (this.animation.width / (layerCount + 1)) * depth;
                });
        this.simulation.force('x', (force as d3.ForceX<Node>));  // Needed ???
    }

    UpdateYStrength(strength: number) {
        this.simulation.force('y', d3.forceY().strength(strength).y((d) => {
            return this.animation.height / 2;
        }));
    }

    Refresh() {
        this.animation.UpdateData(this.nodes, this.links);
        this.simulation.nodes(this.nodes);
        let force =
            this.simulation.force<d3.ForceLink<Node, Link>>('link')?.links(
                this.links);
        this.simulation.force(
            'link', (force as d3.ForceLink<Node, Link>));  // Needed ???
        this.simulation.alpha(1).restart();
    }

    Step(event: Event) {
        // TODO: how to properly handle optional members in "strict" mode ???
        switch (event.type) {
            case EventType.CreateNewState:
            case EventType.CreateClonedState: {
                this.nodes.push({
                    id: (event.attributes.stateID as number).toString(), 
                    focus: false, 
                    depth: event.attributes.depth as number
                });
                break;
            }
            case EventType.CreateLink:
            case EventType.CreateSuffixLink: {
                const id = (event.attributes.source?.toString()) + '-' + (event.attributes.target?.toString());

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
                const id = (event.attributes.source?.toString()) + '-' + (event.attributes.target?.toString());
                
                this.links = this.links.filter(obj => {
                    return obj.id !== id;
                });
                break;
            }
            case EventType.Focus: {  // FIXME
                if (event.attributes.stateID !== undefined) {
                    this.nodes[event.attributes.stateID].focus = true;
                }
                break;
            }
            case EventType.RemoveFocus: {  // FIXME
                if (event.attributes.stateID !== undefined) {
                    this.nodes[event.attributes.stateID].focus = false;
                }
                break;
            }
        }
        this.Refresh();
    }
}
