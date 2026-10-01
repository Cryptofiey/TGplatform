/**
 * Layer 2: Omnirout Plugin Manager
 * Orchestrates plugin lifecycles, sandboxed contexts, and slot registrations.
 */

class PluginManager {
  constructor(eventBus, stateStore, slotMatrix, pipeline, permissionManager) {
    this.eventBus = eventBus;
    this.stateStore = stateStore;
    this.slotMatrix = slotMatrix;
    this.pipeline = pipeline;
    this.permissionManager = permissionManager;
    this.installedPlugins = new Map(); // id -> { manifest, instance, status }
  }

  registerPlugin(manifest, pluginFactory) {
    if (!manifest || !manifest.id || !manifest.name) {
      throw new Error('Plugin manifest must contain "id" and "name".');
    }

    const grantedScopes = this.permissionManager.registerPluginScopes(manifest.id, manifest.permissions || []);

    const context = {
      pluginId: manifest.id,
      grantedScopes,
      eventBus: {
        publish: (evt) => {
          this.permissionManager.assertPermission(manifest.id, 'messages:write');
          return this.eventBus.publish(evt);
        },
        subscribe: (type, handler) => {
          this.permissionManager.assertPermission(manifest.id, 'messages:read');
          return this.eventBus.subscribe(type, handler);
        }
      },
      stateStore: {
        getChatList: () => {
          this.permissionManager.assertPermission(manifest.id, 'messages:read');
          return this.stateStore.getChatList();
        },
        getMessages: (chatId) => {
          this.permissionManager.assertPermission(manifest.id, 'messages:read');
          return this.stateStore.getMessages(chatId);
        }
      },
      ui: {
        mount: (slotName, itemId, payload) => {
          this.permissionManager.assertPermission(manifest.id, 'ui:slots');
          return this.slotMatrix.mountSlot(slotName, itemId, { pluginId: manifest.id, ...payload });
        },
        unmount: (slotName, itemId) => {
          return this.slotMatrix.unmountSlot(slotName, itemId);
        }
      },
      pipeline: {
        intercept: (interceptorId, priority, handler) => {
          this.permissionManager.assertPermission(manifest.id, 'messages:read');
          return this.pipeline.registerInterceptor(interceptorId, manifest.id, priority, handler);
        }
      }
    };

    const instance = pluginFactory(context);

    this.installedPlugins.set(manifest.id, {
      manifest,
      instance,
      status: 'INSTALLED',
      context
    });

    return this.installedPlugins.get(manifest.id);
  }

  activatePlugin(pluginId) {
    const entry = this.installedPlugins.get(pluginId);
    if (!entry) throw new Error(`Plugin not found: ${pluginId}`);

    if (typeof entry.instance.onActivate === 'function') {
      entry.instance.onActivate();
    }
    entry.status = 'ACTIVE';
    return entry;
  }

  deactivatePlugin(pluginId) {
    const entry = this.installedPlugins.get(pluginId);
    if (!entry) throw new Error(`Plugin not found: ${pluginId}`);

    if (typeof entry.instance.onDeactivate === 'function') {
      entry.instance.onDeactivate();
    }
    entry.status = 'INACTIVE';
    return entry;
  }

  getPluginList() {
    return Array.from(this.installedPlugins.values()).map(p => ({
      id: p.manifest.id,
      name: p.manifest.name,
      version: p.manifest.version,
      description: p.manifest.description,
      status: p.status,
      permissions: p.manifest.permissions
    }));
  }
}

module.exports = { PluginManager };
