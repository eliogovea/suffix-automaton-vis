import * as d3 from 'd3';

export interface Node extends d3.SimulationNodeDatum {
    id: string;
    focus: boolean;
    depth: number;
}

export enum LinkType {
    Transition,
    SuffixLink
}

export interface Link extends d3.SimulationLinkDatum<Node> {
    id: string;
    type: LinkType;
    label?: string;
}

export class Animation {
    width: number;
    height: number;
    svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    nodesGroup: d3.Selection<SVGCircleElement, Node, SVGGElement, any>;
    linksGroup: d3.Selection<SVGPathElement, Link, SVGGElement, any>;
    linkLabelsGroup: d3.Selection<SVGTextPathElement, any, SVGGElement, any>;

    constructor(
        width: number, height: number,
        svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>) {
        this.width = width;
        this.height = height;

        this.svg = svg;

        this.svg.append('defs')
            .append('marker')
            .attr('id', 'arrowMarker')
            .attr('refX', 30)
            .attr('refY', 6)
            .attr('markerUnits', 'userSpaceOnUse')
            .attr('markerWidth', 12)
            .attr('markerHeight', 18)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M 0 0 12 6 0 12 3 6');

        this.nodesGroup = svg.append('g')
                              .attr('id', 'nodes')
                              .attr('stroke', '#fff')
                              .attr('stroke-width', 1.5)
                              .selectAll('.node');

        this.linksGroup = svg.append('g')
                              .attr('id', 'links')
                              .attr('stroke', '#000')
                              .attr('stroke-width', 1.5)
                              .selectAll('.link');

        this.linkLabelsGroup =
            svg.append('g').attr('id', 'labels').selectAll('.linkLabel');
    }

    UpdateData(nodes: Array<Node>, links: Array<Link>) {
        this.UpdateNodesData(nodes);
        this.UpdateLinksData(links);
        this.UpdateLinkLabelsData(links);
    }

    UpdateNodesData(nodes: Array<Node>) {
        this.nodesGroup = this.nodesGroup.data(nodes, (d: Node) => {
            return d.id;
        });

        this.nodesGroup.exit().transition().attr('r', 0).remove();

        let nodeEnter =
            this.nodesGroup.enter()
                .append('circle')
                .attr('fill', 'black')
                .attr('class', 'node')
                .on('mouseover', function(d) {
                    // TODO: show tooltip with state information
                    d3.select(this).attr('r', '30').attr('stroke', '#F00');
                })
                .on('mouseout', function(d) {
                    // TODO: hide tooltip with state information
                    d3.select(this).attr('r', '15').attr('stroke', '#000');
                });


        nodeEnter.transition().duration(1000).attr('r', 15);

        this.nodesGroup = this.nodesGroup.merge(nodeEnter);
    }

    UpdateLinksData(links: Array<Link>) {
        this.linksGroup = this.linksGroup.data(links, function(d: Link) {
            return d.id;
        });

        this.linksGroup.exit()
            .transition()
            .attr('stroke-opacity', 0)
            .attrTween(
                'x1',
                function(d) {
                    let link = d as Link;
                    return (): string => {
                        let source = link.source as Node;
                        return (source.x as number).toString();
                    };
                })
            .attrTween(
                'x2',
                function(d) {
                    let link = d as Link;
                    return (): string => {
                        let target = link.source as Node;
                        return (target.x as number).toString();
                    };
                })
            .attrTween(
                'y1',
                function(d) {
                    let link = d as Link;
                    return (): string => {
                        let source = link.source as Node;
                        return (source.y as number).toString();
                    };
                })
            .attrTween(
                'y2',
                function(d) {
                    let link = d as Link;
                    return (): string => {
                        let target = link.source as Node;
                        return (target.y as number).toString();
                    };
                })
            .remove();

        let linkEnter = this.linksGroup.enter()
                            .append('path')
                            .attr(
                                'id',
                                (d: Link) => {
                                    return d.id;
                                })
                            .attr('marker-end', 'url(#arrowMarker)')
                            .attr('class', 'link')
                            .call((link) => {
                                link.transition().attr('stroke-opacity', 1);
                            });

        this.linksGroup = this.linksGroup.merge(linkEnter);
    }

    UpdateLinkLabelsData(links: Array<Link>) {
        this.linkLabelsGroup = this.linkLabelsGroup.data(links, (d: Link) => {
            return d.id;
        });

        this.linkLabelsGroup.exit().remove();

        let linkLabelEnter = this.linkLabelsGroup.enter()
                                 .append('text')
                                 .attr('class', 'linklabel')
                                 .style('font-size', '17px')
                                 .attr('dy', '-1')
                                 .attr('text-anchor', 'middle')
                                 .style('fill', '#000')
                                 .append('textPath')
                                 .attr(
                                     'xlink:href',
                                     (d: Link) => {
                                         return '#' + d.id;
                                     })
                                 .attr('startOffset', '50%')
                                 .text((d) => {
                                     return d.label;
                                 });

        this.linkLabelsGroup = this.linkLabelsGroup.merge(linkLabelEnter);
    }

    Refresh() {
        this.RefreshNodesGroup();
        this.RefreshLinksGroup();
    }

    RefreshNodesGroup() {
        this.nodesGroup
            .attr(
                'transform',
                (d: Node) => {
                    return 'translate(' + d.x + ',' + d.y + ')';
                })
            .attr('fill', (d: Node) => {
                return d.focus ? '#E00' : '#000';
            });
    }

    RefreshLinksGroup() {
        this.linksGroup
            .attr(
                'd',
                (link) => {
                    let source = link.source as Node;
                    let target = link.target as Node;

                    let dx = (target.x as number) - (source.x as number);
                    let dy = (target.y as number) - (source.y as number);

                    // rotate 90 ccw
                    let ndx = -dy;
                    let ndy = dx;

                    let middleX =
                        0.5 * ((target.x as number) + (source.x as number));
                    let middleY =
                        0.5 * ((target.y as number) + (source.y as number));

                    let px = middleX + 0.5 * ndx;
                    let py = middleY + 0.5 * ndy;

                    return 'M' + source.x?.toString() + ',' +
                        source.y?.toString() + 'Q' + px + ',' + py + ' ' +
                        target.x?.toString() + ',' + target.y?.toString();
                })
            .attr(
                'stroke',
                (d) => {
                    return d.type == LinkType.Transition ? '#800' : '#008';
                })
            .attr('stroke-dasharray', (d) => {
                return d.type == LinkType.Transition ? '' : '10 5';
            });
    }
}