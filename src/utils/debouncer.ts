/** 防反跳，延迟执行，如果有新的事件则重置延迟时间，到达延迟时间后，只执行最后一次的事件 */
export class Debouncer {
  tids: Record<string, number>;
  mode: 'debounce' | 'throttle';
  lastExecTime: number;
  constructor(mode?: 'debounce' | 'throttle') {
    this.tids = {};
    this.lastExecTime = Date.now();
    this.mode = mode || 'debounce';
  }
  addEvent(id: string, event: Function, timeout: number) {
    if (this.mode === 'throttle') {
      const now = Date.now();
      if (now - this.lastExecTime >= timeout) {
        this.lastExecTime = now;
        event();
      }
    } else if (this.mode === 'debounce') {
      window.clearTimeout(this.tids[id]);
      this.tids[id] = window.setTimeout(event, timeout);
    }
  }
}
