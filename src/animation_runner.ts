import * as d3 from 'd3';
import {Event} from './events';
import {Simulation} from './simulation';

export class AnimationRunner {
    runningInterval?: d3.Timer;
    simulation: Simulation;

    constructor(simulation: Simulation) {
        this.simulation = simulation;
        this.runningInterval = undefined;
    }

    Start(events: Array<Event>, timeout: number) {
        var index = 0;
        this.runningInterval = d3.interval(() => {
            if (index >= events.length) {
                this.Stop();
            } else {
                this.simulation.Step(events[index++]);
            }
        }, timeout);
    }

    Stop() {
        if (this.runningInterval !== undefined) {
            this.runningInterval.stop();
        }
    }
}