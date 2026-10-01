/**
 * Community Plugin: CRM Lead Pipeline
 * Mounts into Primary Rail, Stage Area (Kanban), and Chat Header Badges.
 */

const manifest = {
  id: 'com.granite.crm_pipeline',
  name: 'CRM Lead Pipeline',
  version: '1.1.0',
  description: 'Converts Telegram chats into lead deals with Kanban board stages',
  permissions: ['messages:read', 'messages:write', 'ui:slots']
};

function createPlugin(context) {
  const deals = new Map(); // chatId -> { chatId, leadName, stage, amount, updatedAt }

  const parseDeal = (event, announce = false) => {
    if (event.type === 'message:incoming') {
      const text = event.text || '';
      if (text.includes('#deal') || text.includes('#lead')) {
        const amountMatch = text.match(/#(?:deal|lead)\s*(\d+)/i);
        const amount = amountMatch ? parseInt(amountMatch[1], 10) : 5000;

        const existing = deals.get(event.chatId);
        deals.set(event.chatId, {
          chatId: event.chatId,
          leadName: event.senderName || 'Anonymous',
          stage: existing ? existing.stage : 'Qualified',
          amount: amount || (existing ? existing.amount : 5000),
          updatedAt: new Date().toISOString()
        });

        if (announce && event.senderId !== 'crm_bot') {
          context.eventBus.publish({
            type: 'message:incoming',
            id: `crm_ack_${Date.now()}`,
            chatId: event.chatId,
            senderId: 'crm_bot',
            senderName: 'CRM Bot',
            text: `[CRM]: Зафиксирован лид "${event.senderName}" на сумму $${amount}. Стадия: ${existing ? existing.stage : 'Qualified'}.`,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  };

  return {
    manifest,

    onActivate() {
      // Mount into Primary Rail
      context.ui.mount('primary_rail', 'rail_crm', {
        icon: '📊',
        label: 'CRM Leads',
        targetView: 'crm_kanban_stage',
        badge: 'CRM'
      });

      // Mount into Stage Area
      context.ui.mount('stage_area', 'crm_kanban_stage', {
        title: 'Воронка Лидов (CRM Kanban)',
        getDeals: () => Array.from(deals.values())
      });

      // Mount dynamic Chat Header Badge
      context.ui.mount('chat_header_badge', 'badge_deal_status', {
        resolveBadge: (chatId) => {
          const deal = deals.get(chatId);
          return deal ? `Deal: ${deal.stage} ($${deal.amount})` : null;
        }
      });

      // Pipeline interceptor: detect "#deal" or "#lead" in incoming messages
      context.pipeline.intercept('crm_deal_parser', 50, (event) => {
        parseDeal(event, true);
        return event;
      });

      // Also listen on eventBus for direct/seeded updates
      context.eventBus.subscribe('message:incoming', (event) => {
        if (!deals.has(event.chatId)) {
          parseDeal(event, false);
        }
      });
    },

    updateStage(chatId, newStage) {
      const deal = deals.get(String(chatId));
      if (!deal) return false;
      deal.stage = newStage;
      deal.updatedAt = new Date().toISOString();
      return deal;
    },

    getDeals() {
      return Array.from(deals.values());
    },

    onDeactivate() {
      context.ui.unmount('primary_rail', 'rail_crm');
      context.ui.unmount('stage_area', 'crm_kanban_stage');
      context.ui.unmount('chat_header_badge', 'badge_deal_status');
    }
  };
}

module.exports = { manifest, createPlugin };
