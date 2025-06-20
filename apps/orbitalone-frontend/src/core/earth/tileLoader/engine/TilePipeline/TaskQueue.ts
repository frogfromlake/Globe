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

  private static readonly MAX_PARALLEL_TASKS = 6;

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

    // --- Parallel task processing: up to MAX_PARALLEL_TASKS at a time ---
    while (this.queue.length > 0) {
      const tasks = this.queue.splice(0, TaskQueue.MAX_PARALLEL_TASKS);
      await Promise.all(tasks.map((item) => item.task()));
      // Optionally yield to event loop for UI
      await new Promise((res) => setTimeout(res, 0));
    }

    this.busy = false;
  }
}
