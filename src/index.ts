import {select as D3Select} from 'd3'

import {Animation} from './animation'
import {AnimationRunner} from './animation_runner'
import * as ForceSimulation from './simulation'
import {BuildSuffixAutomaton} from './suffix-automaton'

const DefaultWord = 'abba';
const DefaultAnimationWidth = document.body.clientWidth / 2;
const DefaultAnimationHeight = document.body.clientHeight / 2;
const DefaultAnimationBackgroundColor = '#FBFAF0';
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
let simulation = new ForceSimulation.Simulation(animation);
let runner = new AnimationRunner(simulation);

const createRangeControl =
    (id: string, text: string, min: number, max: number, step: number,
     value: number, callback: (value: number) => void) => {
        const div = document.createElement('div');
        div.className = 'range-control';

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

        div.appendChild((() => {
            const label = document.createElement('label');
            label.innerText = text;
            return label;
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
        settingDiv.className = 'settings-panel';

        const title = (() => {
            const title = document.createElement('h4');
            title.innerText = 'Settings';
            return title;
        })();

        const xStrengthRange = createRangeControl(
            'x-force', 'X', 0, 2, 0.1, ForceSimulation.DefaultXStrength,
            (value: number) => {
                simulation.UpdateXStrength(value);
            });
        
        const yStrengthRange = createRangeControl(
            'y-force', 'Y', 0, 2, 0.1, ForceSimulation.DefaultYStrength,
            (value: number) => {
                simulation.UpdateYStrength(value);
            });
        
        const chargeStrengthRange = createRangeControl(
            'charge-force', 'Charge', -2000, 0, 100, ForceSimulation.DefaultChargeStrength,
            (value: number) => {
                simulation.UpdateChargeStrength(value);
            });
        
        const collideRadiusRange = createRangeControl(
            'charge-force', 'Collide radius', 0, 100, 10, ForceSimulation.DefaultCollideRadius,
            (value: number) => {
                simulation.UpdateCollideRadius(value);
            });

        settingDiv.appendChild(title);
        settingDiv.appendChild(xStrengthRange);
        settingDiv.appendChild(yStrengthRange);
        settingDiv.appendChild(chargeStrengthRange);
        settingDiv.appendChild(collideRadiusRange);

        title.addEventListener('click', () => {
            xStrengthRange.style.display = xStrengthRange.style.display === 'none' ? 'block' : 'none';
            yStrengthRange.style.display = yStrengthRange.style.display === 'none' ? 'block' : 'none';
            chargeStrengthRange.style.display = chargeStrengthRange.style.display === 'none' ? 'block' : 'none';
            collideRadiusRange.style.display = collideRadiusRange.style.display === 'none' ? 'block' : 'none';
        });

        return settingDiv;
    })());

    return panelDiv;
})());

window.onload = () => {
    // TODO:
};

window.onresize = () => {
    const width = document.body.clientWidth / 2;
    const height = document.body.clientHeight / 2;
    svg.attr('width', width);
    svg.attr('height', height);
    simulation.Refresh();
};
