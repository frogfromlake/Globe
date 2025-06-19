/**
 * @file engine/TileLayer/TileQueueProcessor.ts
 * @description Manages a prioritized queue of tile loading tasks, 
 * allowing controlled, time-bounded execution to maintain frame rate.
 */

import type { PerspectiveCamera } from "three";

export interface TileQueueItem {
  key: string;
  zoom: number;
  revision: number;
  task: () => Promise<void>;
}

export class TileQueueProcessor {
  private queue: TileQueueItem[] = [];
  private busy = false;

  constructor(private camera: PerspectiveCamera) {}

  /**
   * Adds a new tile load task if not already queued.
   */
  enqueue(item: TileQueueItem): void {
    if (!this.queue.find((entry) => entry.key === item.key)) {
      this.queue.push(item);
    }
  }

  /**
   * Clears all pending tile tasks from the queue.
   */
  clear(): void {
    this.queue.length = 0;
  }

  /**
   * Removes tile tasks that match the given predicate.
   */
  prune(predicate: (entry: TileQueueItem) => boolean): void {
    this.queue = this.queue.filter((entry) => !predicate(entry));
  }

  /**
   * Keeps only tasks for the specified zoom level and camera revision.
   */
  filterCurrentZoomAndRevision(zoom: number, revision: number): void {
    this.queue = this.queue.filter(
      (entry) => entry.zoom === zoom && entry.revision === revision
    );
  }

  /**
   * Processes tile tasks with frame-time budgeting to avoid frame drops.
   * Yields back to the browser if the time limit is exceeded.
   */
  async process(limitMs = 12): Promise<void> {
    this.busy = true;

    while (this.queue.length > 0) {
      const start = performance.now();
      let didYield = false;

      while (this.queue.length > 0) {
        const { task } = this.queue.shift()!;
        await task();

        if (performance.now() - start > limitMs) {
          didYield = true;
          break;
        }
      }

      if (didYield) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }

    this.busy = false;
  }

  /**
   * Returns true if the processor is currently running tasks.
   */
  isBusy(): boolean {
    return this.busy;
  }

  /**
   * Returns the number of pending tasks in the queue.
   */
  length(): number {
    return this.queue.length;
  }
}
