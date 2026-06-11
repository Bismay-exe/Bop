import { QueueTask } from '../../types/media';

class TaskQueue {
  private queue: QueueTask[] = [];
  private activeCount = 0;
  private maxConcurrency: number;

  constructor(maxConcurrency: number) {
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * Adds a task to the queue and re-sorts by priority.
   * Priority: 0 is highest, 100 is lowest.
   */
  enqueue(task: QueueTask) {
    // If a task for this ID already exists, we might want to update its priority instead,
    // but for simplicity, we just add it or replace it.
    const existingIndex = this.queue.findIndex((t) => t.id === task.id);
    if (existingIndex !== -1) {
      // Update priority if it's higher (lower number)
      if (task.priority < this.queue[existingIndex].priority) {
         this.queue[existingIndex].priority = task.priority;
         this.queue.sort((a, b) => a.priority - b.priority);
      }
      return; // Already in queue
    }

    this.queue.push(task);
    this.queue.sort((a, b) => a.priority - b.priority);
    this.processNext();
  }

  /**
   * Cancels a task if it hasn't started yet.
   */
  cancel(id: string) {
    const index = this.queue.findIndex((t) => t.id === id);
    if (index !== -1) {
      this.queue[index].cancel();
      this.queue.splice(index, 1);
    }
  }

  /**
   * Clears all pending tasks (useful when completely leaving a screen).
   */
  clear() {
    this.queue.forEach(task => task.cancel());
    this.queue = [];
  }

  private async processNext() {
    if (this.activeCount >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    this.activeCount++;
    const task = this.queue.shift();

    if (task) {
      try {
        await task.execute();
      } catch (error) {
        console.error(`[TaskQueue] Task failed: ${task.id}`, error);
      } finally {
        this.activeCount--;
        // Use setTimeout to yield to the JS event loop, preventing CPU starvation
        setTimeout(() => this.processNext(), 0);
      }
    } else {
      this.activeCount--;
    }
  }
}

/**
 * Global separated queues for different resource types.
 * 
 * - metadata: Higher concurrency (3) because ID3 parsing only reads small chunks.
 * - artwork: Lower concurrency (1-2) because writing large files and triggering
 *   native image decoders spikes memory and CPU heavily.
 */
export const MediaConcurrency = {
  metadata: new TaskQueue(3),
  artwork: new TaskQueue(2),
};
