/** 防反跳，延迟执行，如果有新的事件则重置延迟时间，到达延迟时间后，只执行最后一次的事件 */
export class Debouncer {
  tids: Record<string, number>;
  constructor() {
    this.tids = {};
  }
  addEvent(id: string, event: TimerHandler, timeout: number) {
    window.clearTimeout(this.tids[id]);
    this.tids[id] = window.setTimeout(event, timeout);
  }
}
