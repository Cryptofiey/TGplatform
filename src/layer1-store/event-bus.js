/**
 * Layer 1: Reactive Event Bus
 * Event Sourcing bus with topic filtering, history playback, and subscriptions.
 */

const EventEmitter = require('events');

class ReactiveEventBus extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxHistory = options.maxHistory || 1000;
    this.history = [];
  }

  publish(event) {
    if (!event || !event.type) {
      throw new Error('Cannot publish event without an event.type');
    }

    const enriched = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      publishedAt: new Date().toISOString(),
      ...event
    };

    this.history.push(enriched);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Emit typed event and wildcard
    this.emit(enriched.type, enriched);
    this.emit('*', enriched);

    return enriched;
  }

  subscribe(eventType, handler) {
    this.on(eventType, handler);
    return () => this.off(eventType, handler);
  }

  getHistory(eventType = null) {
    if (!eventType) return [...this.history];
    return this.history.filter(e => e.type === eventType);
  }
}

module.exports = { ReactiveEventBus };
