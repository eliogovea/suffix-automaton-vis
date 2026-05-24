import {interval, type Timer} from 'd3-timer';

import type {BuildEvent} from './events';
import type {Simulation} from './simulation';

export class AnimationRunner {
  private runningInterval?: Timer;
  private events: BuildEvent[] = [];
  private index = 0;

  constructor(
    private readonly simulation: Simulation,
    private readonly onChange: () => void,
  ) {}

  start(events: BuildEvent[], timeout: number): void {
    this.stop();
    this.events = events;
    if (!this.step()) {
      this.stop();
      this.onChange();
      return;
    }
    this.runningInterval = interval(() => {
      if (!this.step()) {
        this.stop();
        this.onChange();
      }
    }, timeout);
  }

  step(): boolean {
    const event = this.events[this.index];
    if (!event) {
      return false;
    }
    this.simulation.step(event);
    this.index += 1;
    this.onChange();
    return this.index < this.events.length;
  }

  load(events: BuildEvent[]): void {
    this.stop();
    this.events = events;
    this.index = 0;
  }

  stop(): void {
    if (this.runningInterval) {
      this.runningInterval.stop();
      this.runningInterval = undefined;
    }
  }

  reset(): void {
    this.stop();
    this.index = 0;
  }

  isRunning(): boolean {
    return this.runningInterval !== undefined;
  }

  getProgress(): {index: number; total: number} {
    return {index: this.index, total: this.events.length};
  }
}
