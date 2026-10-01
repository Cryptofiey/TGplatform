/**
 * Layer 1: Permission & Scope Engine
 * Enforces least-privilege sandboxing for community plugins.
 */

const VALID_SCOPES = [
  'messages:read',
  'messages:write',
  'contacts:read',
  'storage:blobs',
  'ui:slots',
  'ai:agent'
];

class PermissionManager {
  constructor() {
    this.pluginScopes = new Map();
  }

  registerPluginScopes(pluginId, requestedScopes = []) {
    const verified = requestedScopes.filter(s => VALID_SCOPES.includes(s));
    this.pluginScopes.set(pluginId, new Set(verified));
    return Array.from(this.pluginScopes.get(pluginId));
  }

  hasPermission(pluginId, scope) {
    const scopes = this.pluginScopes.get(pluginId);
    return Boolean(scopes && scopes.has(scope));
  }

  assertPermission(pluginId, scope) {
    if (!this.hasPermission(pluginId, scope)) {
      throw new Error(`Permission Denied: Plugin "${pluginId}" lacks required scope "${scope}".`);
    }
    return true;
  }
}

module.exports = { PermissionManager, VALID_SCOPES };
