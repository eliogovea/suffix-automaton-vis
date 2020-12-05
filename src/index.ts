import {select as D3Select} from 'd3'

import {Animation} from './animation'
import {AnimationRunner} from './animation_runner'
import {Simulation} from './simulation'
import {SuffixAutomatomBuildHistory} from './suffix-automaton'

const DefaultWord = 'abba';
const DefaultAnimationWidth = 60 * 16;
const DefaultAnimationHeight = 60 * 9;
const DefaultAnimationBackgroundColor = "#FBFAF0";
const DefaultSimulationXStrength = 1;
const DefaultSimulationYStrength = 0.2;
const DefaultAnimationInterval = 300;

interface Configuration {
    word: string;
    xStrength: number,
    yStrength: number,
    animationInterval: number
};

const body = document.getElementsByTagName('body')[0];

const wordBox = document.createElement('input');
wordBox.value = DefaultWord;

const buildButton = document.createElement('button')
buildButton.innerText = 'Build';

const graph = document.createElement('svg');

body.appendChild(wordBox);
body.appendChild(buildButton);

const svg = D3Select('body')
                .append('svg')
                .attr('width', DefaultAnimationWidth)
                .attr('height', DefaultAnimationHeight)
                .attr('style', `background-color: ${DefaultAnimationBackgroundColor}`);

let animation =
    new Animation(DefaultAnimationWidth, DefaultAnimationHeight, svg);

let simulation = new Simulation(animation);

let runner = new AnimationRunner(simulation);

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
    simulation.UpdateXStrength(config.word.length, config.xStrength);
    simulation.UpdateYStrength(config.yStrength);
    
    const buildHistory = SuffixAutomatomBuildHistory(config.word);
    runner.Start(buildHistory, DefaultAnimationInterval);
});