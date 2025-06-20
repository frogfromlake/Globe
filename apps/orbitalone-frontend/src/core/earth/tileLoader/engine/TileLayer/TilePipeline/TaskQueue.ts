// engine/TileLayer/TilePipeline/TaskQueue.ts
export type TaskFn = () => Promise<void>;

export interface TaskQueueItem {
  key: string;
  task: TaskFn;
  zoom: number;
  revision: number;
}

export class TaskQueue {
  private queue: TaskQueueItem[] = [];
  private busy = false;

  enqueue(item: TaskQueueItem): void {
    // Only enqueue if not already queued!
    if (!this.queue.find((q) => q.key === item.key)) {
      this.queue.push(item);
    }
  }

  clear(): void {
    this.queue.length = 0;
  }

  prune(predicate: (item: TaskQueueItem) => boolean): void {
    this.queue = this.queue.filter((item) => !predicate(item));
  }

  filterCurrentZoomAndRevision(zoom: number, revision: number): void {
    this.queue = this.queue.filter(
      (item) => item.zoom === zoom && item.revision === revision
    );
  }

  isBusy(): boolean {
    return this.busy;
  }
  length(): number {
    return this.queue.length;
  }

  async process(limitMs = 10): Promise<void> {
    if (this.busy) return;
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
        await new Promise((res) => requestAnimationFrame(res));
      }
    }
    this.busy = false;
  }
}
