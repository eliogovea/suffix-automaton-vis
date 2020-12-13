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

const createRangeControl =
    (id: string, text: string, min: number, max: number, step: number,
     value: number, callback: (value: number) => void) => {
        const div = document.createElement('div');
        div.className = 'range-control';

        div.appendChild((() => {
            const label = document.createElement('label');
            label.innerText = text;
            return label;
        })());

        div.appendChild((() => {
            const input = document.createElement('input');
            input.type = 'range';
            input.id = id;
            input.min = min.toString();
            input.max = max.toString();
            input.step = step.toString();
            input.value = value.toString();
            input.addEventListener('change', () => {
                callback(+input.value);
            });
            return input;
        })());

        return div;
    }

const controlPanel = document.body.appendChild((() => {
    const panelDiv = document.createElement('div');
    panelDiv.className = 'control-panel';

    const wordBox = (() => {
        const input = document.createElement('input');
        input.className = 'input-word';
        input.value = DefaultWord;
        return input;
    })();

    panelDiv.appendChild(wordBox);

    panelDiv.appendChild((() => {
        const button = document.createElement('button')
        button.innerText = 'Build';
        button.className = 'build';

        button.addEventListener('click', () => {
            runner.Stop();
            simulation.Clean();
            const automaton = BuildSuffixAutomaton(wordBox.value);
            runner.Start(automaton.history, DefaultAnimationInterval);
        });

        return button;
    })());

    panelDiv.appendChild((() => {
        const settingDiv = document.createElement('div');

        settingDiv.appendChild((() => {
            const title = document.createElement('h4');
            title.innerText = 'Settings';
            return title;
        })());

        settingDiv.appendChild(createRangeControl(
            'x-force', 'X', 0, 2, 0.1, DefaultSimulationXStrength,
            (value: number) => {
                simulation.UpdateXStrength(value);
            }));

        settingDiv.appendChild(createRangeControl(
            'y-force', 'Y', 0, 2, 0.1, DefaultSimulationYStrength,
            (value: number) => {
                simulation.UpdateYStrength(value);
            }));

        return settingDiv;
    })());

    return panelDiv;
})());

window.onload =
    () => {
        simulation.UpdateXStrength(DefaultSimulationXStrength);
        simulation.UpdateYStrength(DefaultSimulationYStrength);
    }

          window.onresize = () => {
        const width = document.body.clientWidth / 2;
        const height = document.body.clientHeight / 2;
        svg.attr('width', width);
        svg.attr('height', height);
        simulation.Refresh();
    };
