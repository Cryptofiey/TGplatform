/**
 * Layer 2: Pipeline Cascades & Circuit Breaker
 * Manages priority message interceptors. If a plugin crashes or times out (>25ms),
 * the circuit breaker trips for that plugin, isolating it from the core pipeline.
 */

class PipelineCascade {
  constructor(timeoutMs = 25) {
    this.timeoutMs = timeoutMs;
    this.interceptors = []; // Array of { id, pluginId, priority, handler }
    this.brokenCircuits = new Set(); // Set of pluginIds with open circuit
  }

  registerInterceptor(id, pluginId, priority, handler) {
    this.interceptors.push({ id, pluginId, priority: priority || 10, handler });
    // Sort descending by priority (higher priority runs first)
    this.interceptors.sort((a, b) => b.priority - a.priority);
  }

  isCircuitBroken(pluginId) {
    return this.brokenCircuits.has(pluginId);
  }

  resetCircuit(pluginId) {
    this.brokenCircuits.delete(pluginId);
  }

  async processIncoming(event) {
    let currentEvent = { ...event };

    for (const item of this.interceptors) {
      if (this.isCircuitBroken(item.pluginId)) {
        continue; // Skip crashed plugin
      }

      try {
        currentEvent = await this.executeWithTimeout(item, currentEvent);
      } catch (err) {
        console.error(`[CircuitBreaker] Plugin "${item.pluginId}" failed during interceptor execution:`, err.message);
        this.brokenCircuits.add(item.pluginId); // Trip breaker
      }
    }

    return currentEvent;
  }

  executeWithTimeout(item, event) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error(`Interceptor timeout exceeded (${this.timeoutMs}ms)`));
        }
      }, this.timeoutMs);

      try {
        Promise.resolve(item.handler(event))
          .then(res => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              resolve(res || event);
            }
          })
          .catch(err => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              reject(err);
            }
          });
      } catch (err) {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      }
    });
  }
}

module.exports = { PipelineCascade };
