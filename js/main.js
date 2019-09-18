// needed for stopping the building interval
var buildingInterval;

// suffix automaton
var states = [];
var size = 0;
var last = 0;
var root = 0;

// suffix automaton building history
var hist = [];

// graphics
var nodes = [];
var links = [];

function createNew(maxLength) {
  states.push({
    maxLength: maxLength,
    suffixLink: -1,
    go: new Map(),
    isTerminal: false
  });
  return size++;
}
  
function createClone(from, maxLength) {
  states.push({
    maxLength: maxLength,
    suffixLink: states[from].suffixLink,
    go: states[from].go,
    isTerminal: false
  });
  return size++;
}
  
function init() { // suffix automaton
  states = [];
  hist = [];
  size = 0;
  root = createNew(0);
  hist.push({
    type: "create-node",
    stateID: root
  });
  last = root;
  return last;
}
  
function add(c) {
  var p = last;
  var n = createNew(states[p].maxLength + 1);
  hist.push({type: "create-node", stateID: n});
  hist.push({type: "focus", stateID: n});
  while (p != -1 && !states[p].go.has(c)) {
    hist.push({type: "focus", stateID: p});
    states[p].go.set(c, n);
    hist.push({type: "create-link", source: p, target: n, label: c});
    hist.push({type: "remove-focus", stateID: p});
    p = states[p].suffixLink;
  }
  if (p == -1) {
    hist.push({type: "focus", stateID: root});
    hist.push({
      type: "create-suffix-link",
      source: n,
      target: root,
      info: "suffix link to the root"
    });
    states[n].suffixLink = root;
    hist.push({type: "remove-focus", stateID: root});
  } else {
    hist.push({type: "focus", stateID: p});
    hist.push({type: "remove-focus", stateID: p});
    var q = states[p].go.get(c);
    hist.push({type: "focus", stateID: q});
    if (states[p].maxLength + 1 === states[q].maxLength) {
      states[n].suffixLink = q;
      hist.push({
        type: "create-suffix-link",
        source: n,
        target: q,
        info: "found"
      });
      hist.push({type: "remove-focus", stateID: q});
    } else {
      hist.push({type: "remove-focus", stateID: q});
      var q_cloned = createClone(q, states[p].maxLength + 1);
      hist.push({
        type: "create-clone",
        stateID: q_cloned,
        source: q
      });
      hist.push({
        type: "create-suffix-link",
        source: q_cloned,
        target: states[q_cloned].suffixLink
      });
      for (const [k, v] of states[q_cloned].go) {
        hist.push({
          type: "create-link",
          source: q_cloned,
          target: v,
          label: k
        });
      }
      hist.push({
        type: "focus",
        stateID: q_cloned
      });
      while (p != -1 && (states[p].go.has(c) && states[p].go.get(c) === q)) {
        hist.push({
          type: "remove-link",
          source: p,
          target: q
        });
        states[p].go.set(c, q_cloned);
        hist.push({
          type: "create-link",
          source: p,
          target: q_cloned,
          label: c
        });
      }
      hist.push({
        type: "remove-suffix-link",
        source: q,
        target: states[q].suffixLink
      });
      states[q].suffixLink = q_cloned;
      hist.push({
        type: "create-suffix-link",
        source: q,
        target: q_cloned,
        info: "clone needed"
      });
      states[n].suffixLink = q_cloned;
      hist.push({
        type: "create-suffix-link",
        source: n,
        target: q_cloned,
        info: "clone needed"
      });
      hist.push({
        type: "remove-focus",
        stateID: q_cloned
      });
    }
  }
  hist.push({
    type: "remove-focus",
    stateID: n
  });
  last = n;
  return last;
}

function build(s) {
  init();
  for (var c of s) {
    add(c);
  }
}

function run() {
  let s = document.getElementById("input-string").value;
  build(s);
  nodes = [];
  links = [];
  var idx = 0;
  buildingInterval = d3.interval(function () {
    if (idx >= hist.length) {
      buildingInterval.stop();
    } else {
      let d = hist[idx];
      idx++;
      if (d.type == "create-node") {
        // console.log(d);
        nodes.push({
          id: d.stateID,
          depth: states[d.stateID].maxLength,
          focus: false
        });
        restart();
      }
      if (d.type == "create-clone") {
        // console.log(d);
        nodes.push({
          id: d.stateID, 
          depth: states[d.stateID].maxLength,
          focus: false
        });
        restart();
      }
      if (d.type == "create-link") {
        // console.log(d);
        links.push({
          source: d.source, 
          target: d.target,
          type: "transition",
          label: d.label
        });
        restart();
      }
      if (d.type == "remove-link" || d.type == "remove-suffix-link") {
        // console.log(d);
        var clinks = [];
        for (var i = 0; i < links.length; i++) {
          if (links[i].source.index == d.source && links[i].target.index == d.target) {
            continue;
          }
          clinks.push(links[i]);
        }
        links = clinks;
        restart();
      }
      if (d.type == "create-suffix-link") {
        // console.log(d);
        links.push({
          source: d.source,
          target: d.target,
          type: "suffixLink"
        });
        restart();
      }
      if (d.type == "focus") {
        // console.log(d);
        let i = d.stateID;
        nodes[i].focus = true;
      }
      if (d.type == "remove-focus") {
        // console.log(d);
        let i = d.stateID;
        nodes[i].focus = false;
      }
    }
  }, 300);
}

color = d3.scaleOrdinal(d3.schemeCategory10);

let width = 900; 
let height = 600;

var svg = d3.select("#graph")
  .append("svg")
    .attr("class", "graph-div")
    .attr("width", width)
    .attr("height", height);

d3.select("#build-button")
  .on("click", function () {
    if (buildingInterval) {
      buildingInterval.stop();
    }
    run();
  });


var marker = svg.append("defs")
  .append("marker")
    .attr("id", "triangle")
    .attr("refX", 30)
    .attr("refY", 6)
    .attr("markerUnits", 'userSpaceOnUse')
    .attr("markerWidth", 12)
    .attr("markerHeight", 18)
    .attr("orient", 'auto')
    .append('path')
      .attr("d", 'M 0 0 12 6 0 12 3 6');


var simulation = d3.forceSimulation(nodes)
    .force("charge", d3.forceManyBody()
      .strength(-800)
    )
    .force("link", d3.forceLink(links)
      .strength(function (d) {
        if (d.type == "transition") {
          return 0.1;
        }
        return 0.8;
      })
      .distance(function (d) {
        if (d.type == "transition") {
          return 150;
        }
        return 200;
      }))
    .force("collide", d3.forceCollide(40))
    .alphaTarget(1)
    .on("tick", ticked);

function updateXStrength(v) {
  simulation
    .force("x", d3.forceX()
      .strength(v)
      .x(function (d) {
        let l = document.getElementById("input-string").value.length;
        return width / 20 + (width / (l + 1)) * d.depth;
      })   
    );
}

updateXStrength(0.9);

d3.select("#x-strength")
  .on("input", function () {
    updateXStrength(+this.value);
  });

function updateYStrength(v) {
  simulation
    .force("y", d3.forceY()
      .strength(v)
      .y(function (d) {
        return height / 2;
      })
    );
}

updateYStrength(0.2);

d3.select("#y-strength")
  .on("input", function () {
    updateYStrength(+this.value);
  });


var link = svg.append("g")
  .attr("id", "links")
  .attr("stroke", "#000")
  .attr("stroke-width", 1.5)
  .selectAll(".link");

var linkLabel = svg.append("g")
  .attr("id", "labels")
  .selectAll(".linkLabel");

var node = svg.append("g")
  .attr("id", "nodes")
  .attr("stroke", "#fff")
  .attr("stroke-width", 1.5)
    .selectAll(".node");

function restart() {

  // Apply the general update pattern to the nodes.
  node = node.data(nodes, function(d) { return d.id; });

  node.exit().transition()
      .attr("r", 0)
      .remove();

  nodeEnter = node.enter()
    .append("circle")
      .attr("fill", function (d) { return color(d.id) })
    .call(d3.drag()
      .on("start", dragStarted)
      .on("drag", dragged)
      .on("end", dragEnded))
    .on("click", function (d) {
      console.log(d);
      alert("TODO");
    })
    .on("mouseover", function (d) {
      console.log("mouseover", d);
      d3.select(this)
        .attr("r", "30")
        .attr("stroke", "#F00");
    })
    .on("mouseout", function (d) {
      console.log("mouseout", d);
      d3.select(this)
        .attr("r", "15")
        .attr("stroke", "#000");
    });


  nodeEnter.transition()
    .duration(1000)
    .attr("r", 15);

  node = node.merge(nodeEnter);

  // Apply the general update pattern to the links.
  link = link.data(links, function(d) { return d.source.id + "-" + d.target.id; });

  // Keep the exiting links connected to the moving remaining nodes.
  link.exit().transition()
      .attr("stroke-opacity", 0)
      .attrTween("x1", function(d) { return function() { return d.source.x; }; })
      .attrTween("x2", function(d) { return function() { return d.target.x; }; })
      .attrTween("y1", function(d) { return function() { return d.source.y; }; })
      .attrTween("y2", function(d) { return function() { return d.target.y; }; })
      .remove();

  linkEnter = link.enter()
    .append("path")
      .attr("id", function (d) {
        return d.source + "-" + d.target;
      })
      .attr('marker-end','url(#triangle)')
      .attr("class", "link")
      .call(function(link) { link.transition().attr("stroke-opacity", 1); })
      .on("mouseover", function (d) {
        // TODO
      })
      .on("mouseout", function (d) {
        // TODO
      });

  link = link.merge(linkEnter);

  linkLabel = linkLabel.data(links, function (d) {return d.source.id + "-" + d.target.id;});

  linkLabel.exit().remove();

  linkLabelEnter = linkLabel.enter()
    .append("text")
      .attr("class", "linklabel")
      .style("font-size", "17px")
      .attr("x", "50")
      .attr("y", "-20")
      .attr("text-anchor", "start")
      .style("fill","#000")
      .append("textPath")
        .attr("xlink:href", function (d) {
          return "#" + d.source + "-" + d.target;
        })
        .text(function (d) {return d.label;});
  linkLabel = linkLabel.merge(linkLabelEnter);

  // Update and restart the simulation.
  simulation.nodes(nodes);
  simulation.force("link").links(links);
  simulation.alpha(1).restart();
}

function ticked() {
  node
    .attr("transform", function (d) {
      return "translate(" + d.x + "," + d.y + ")";
    })
    .attr("fill", function (d) {
      if (d.focus) {
        return "#E00";
      }
      return "#000";
    });

  link
    .attr("d", function (d) {
    let dx = d.target.x - d.source.x;
    let dy = d.target.y - d.source.y;

    // rotate 90 ccw
    let ndx = -dy;
    let ndy = dx;

    let middleX = 0.5 * (d.source.x + d.target.x);
    let middleY = 0.5 * (d.source.y + d.target.y);

    let px = middleX + 0.5 * ndx;
    let py = middleY + 0.5 * ndy;

    return "M" + d.source.x + "," + d.source.y +
           "Q" + px + "," + py +
           " " + d.target.x + "," + d.target.y;
    }).attr("stroke", function (d) {
      if (d.type == "transition") {
        return "#800";
      }
      return "#008"; // suffix-link
    }).attr("stroke-dasharray", function (d) {
      if (d.type == "transition") {
        return "";
      }
      return "10 5";
    });
}

function dragStarted(d) {
  if (!d3.event.active) {
    simulation.alphaTarget(0.3).restart();
  }
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(d) {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
}

function dragEnded(d) {
  if (!d3.event.active) {
    simulation.alphaTarget(0);
  }
  d.fx = undefined;
  d.fy = undefined;
}


