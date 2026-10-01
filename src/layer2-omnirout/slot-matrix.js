/**
 * Layer 2: UI Slot Matrix & Layout Scheme Manager
 * Manages mounting slots (Primary Rail, Secondary Column, Stage Area, Header Badges)
 * and the 3 display modes: Classic, Split Rail, and Headless Domain Projection.
 */

const DISPLAY_SCHEMES = {
  CLASSIC: 'CLASSIC_PASS_THROUGH',
  SPLIT_RAIL: 'SPLIT_RAIL_MATRIX',
  HEADLESS: 'HEADLESS_DOMAIN_PROJECTION'
};

class UISlotMatrix {
  constructor() {
    this.currentScheme = DISPLAY_SCHEMES.SPLIT_RAIL;
    this.slots = {
      primary_rail: new Map(),     // Vertical dock items (id -> { icon, label, pluginId, targetView })
      secondary_column: new Map(), // Master list components (id -> { pluginId, renderer })
      stage_area: new Map(),       // Main stage panels (id -> { pluginId, title, component })
      chat_header_badge: new Map(),// Message/Chat header badges (id -> { pluginId, resolveBadge })
      bottom_dock: new Map()       // Floating or bottom docked items (id -> { pluginId, component })
    };
    this.activeStageId = null;
    this.activeRailId = 'telegram';
  }

  setScheme(scheme) {
    if (!Object.values(DISPLAY_SCHEMES).includes(scheme)) {
      throw new Error(`Invalid layout scheme: ${scheme}`);
    }
    this.currentScheme = scheme;
    return this.currentScheme;
  }

  mountSlot(slotName, itemId, payload) {
    if (!this.slots[slotName]) {
      throw new Error(`Unknown UI slot: ${slotName}`);
    }
    this.slots[slotName].set(itemId, {
      id: itemId,
      mountedAt: new Date().toISOString(),
      ...payload
    });

    if (slotName === 'stage_area' && !this.activeStageId) {
      this.activeStageId = itemId;
    }
    return true;
  }

  unmountSlot(slotName, itemId) {
    if (this.slots[slotName]) {
      this.slots[slotName].delete(itemId);
      if (this.activeStageId === itemId) {
        this.activeStageId = null;
      }
      return true;
    }
    return false;
  }

  getMountedSlotItems(slotName) {
    if (!this.slots[slotName]) return [];
    return Array.from(this.slots[slotName].values());
  }

  getLayoutState() {
    return {
      scheme: this.currentScheme,
      activeRailId: this.activeRailId,
      activeStageId: this.activeStageId,
      slots: {
        primary_rail: Array.from(this.slots.primary_rail.values()),
        secondary_column: Array.from(this.slots.secondary_column.values()),
        stage_area: Array.from(this.slots.stage_area.values()),
        chat_header_badge: Array.from(this.slots.chat_header_badge.values()),
        bottom_dock: Array.from(this.slots.bottom_dock.values())
      }
    };
  }
}

module.exports = { UISlotMatrix, DISPLAY_SCHEMES };
