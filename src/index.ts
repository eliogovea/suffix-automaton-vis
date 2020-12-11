import {select as D3Select} from 'd3'

import {Animation} from './animation'
import {AnimationRunner} from './animation_runner'
import {Simulation} from './simulation'
import {BuildSuffixAutomaton} from './suffix-automaton'

const DefaultWord = 'abba';
const DefaultAnimationWidth = document.body.clientWidth / 2;
const DefaultAnimationHeight = document.body.clientHeight / 2;
const DefaultAnimationBackgroundColor = '#FBFAF0';
const DefaultSimulationXStrength = 0.5;
const DefaultSimulationYStrength = 0.2;
const DefaultAnimationInterval = 300;

interface Configuration {
    word: string;
    xStrength: number;
    yStrength: number;
    animationInterval: number;
}

const svg =
    D3Select('body')
        .append('svg')
        .attr('width', DefaultAnimationWidth)
        .attr('height', DefaultAnimationHeight)
        .attr('style', `background-color: ${DefaultAnimationBackgroundColor}`);

let animation = new Animation(svg);
let simulation = new Simulation(animation);
let runner = new AnimationRunner(simulation);

const wordBox = function() {
    const wordBox = document.createElement('input');
    wordBox.value = DefaultWord;
    return wordBox;
}();

document.body.appendChild(wordBox);

document.body.appendChild(function() {
    const buildButton = document.createElement('button')
    buildButton.innerText = 'Build';

    // TODO: add controls
    function GetConfiguration(): Configuration {
        return {
            word: wordBox.value,
            xStrength: DefaultSimulationXStrength,
            yStrength: DefaultSimulationYStrength,
            animationInterval: DefaultAnimationInterval
        };
    }

    buildButton.addEventListener('click', () => {
        runner.Stop();

        const config = GetConfiguration();

        simulation.Clean();
        simulation.UpdateXStrength(config.xStrength);
        simulation.UpdateYStrength(config.yStrength);

        const automaton = BuildSuffixAutomaton(config.word);
        runner.Start(automaton.history, DefaultAnimationInterval);
    });
    return buildButton;
}());

window.onresize = () => {
    const width = document.body.clientWidth / 2;
    const height = document.body.clientHeight / 2;
    svg.attr('width', width);
    svg.attr('height', height);
};

// document.body.appendChild(function() {
//     const saveButton = document.createElement('button');
//     saveButton.innerText = 'Save';

//     // TODO: add click listener

//     return saveButton;
// }());
