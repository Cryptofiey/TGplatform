#!/usr/bin/env node

/**
 * Telegram Web Fork Server — The Granite Stack Runtime
 * Orchestrates Layer 0-3, UI Slot Matrix, and Community Plugins.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Layer 0 & Layer 1
const { AntiCorruptionLayer } = require('../src/layer0-acl/acl');
const { ReactiveEventBus } = require('../src/layer1-store/event-bus');
const { PlatformStateStore } = require('../src/layer1-store/state-store');
const { PermissionManager } = require('../src/layer1-store/permissions');

// Layer 2
const { UISlotMatrix } = require('../src/layer2-omnirout/slot-matrix');
const { PipelineCascade } = require('../src/layer2-omnirout/pipeline');
const { PluginManager } = require('../src/layer2-omnirout/plugin-manager');

// Layer 3 Plugins
const invertedAgentPlugin = require('../src/layer3-plugins/inverted-agent/plugin');
const crmPlugin = require('../src/layer3-plugins/crm-pipeline/plugin');
const musicPlugin = require('../src/layer3-plugins/music-cast/plugin');

class TelegramWebPlatformApp {
  constructor(port = 8080) {
    this.port = port;
    this.acl = new AntiCorruptionLayer();
    this.eventBus = new ReactiveEventBus();
    this.stateStore = new PlatformStateStore(this.eventBus);
    this.permissionManager = new PermissionManager();
    this.slotMatrix = new UISlotMatrix();
    this.pipeline = new PipelineCascade(50);
    this.pluginManager = new PluginManager(
      this.eventBus,
      this.stateStore,
      this.slotMatrix,
      this.pipeline,
      this.permissionManager
    );
    this.server = null;
  }

  init() {
    console.log('[PLATFORM] Initializing The Granite Stack (Layers 0-3)...');

    // Register & Activate Plugins
    this.pluginManager.registerPlugin(invertedAgentPlugin.manifest, invertedAgentPlugin.createPlugin);
    this.pluginManager.registerPlugin(crmPlugin.manifest, crmPlugin.createPlugin);
    this.pluginManager.registerPlugin(musicPlugin.manifest, musicPlugin.createPlugin);

    this.pluginManager.activatePlugin('com.granite.inverted_ai_agent');
    this.pluginManager.activatePlugin('com.granite.crm_pipeline');
    this.pluginManager.activatePlugin('com.granite.music_cast');

    console.log('[PLATFORM] Plugins active:', this.pluginManager.getPluginList().map(p => p.name));

    // Seed mock initial data via Layer 0 ACL
    const seedUpdates = [
      {
        _type: 'updateNewMessage',
        message: {
          id: 1001,
          chat_id: 101,
          sender_id: 'user_alex',
          sender_name: 'Алексей (Инвестор)',
          text: 'Привет! Интересует коммерческая недвижимость на Пхукете. #deal 75000'
        }
      },
      {
        _type: 'updateNewMessage',
        message: {
          id: 1002,
          chat_id: 102,
          sender_id: 'user_dev',
          sender_name: 'Архитектурный чат',
          text: 'Плагин Inverted AI Agent смонтирован в Vertical Rail. Для проверки введите /status или /help'
        }
      },
      {
        _type: 'updateNewMessage',
        message: {
          id: 1003,
          chat_id: 103,
          sender_id: 'channel_phuket_chill',
          sender_name: 'Phuket Chill Radio 🌴',
          text: 'Свежий вечерний лаунж-сет для работы над проектом.',
          media: {
            type: 'audio',
            title: 'Andaman Sunset Lounge',
            performer: 'Phuket Sound System',
            duration: 320
          }
        }
      }
    ];

    for (const raw of seedUpdates) {
      const norm = this.acl.normalizeUpdate(raw);
      this.eventBus.publish(norm);
    }

    // Trigger initial worker pool cycle for Inverted AI Director
    const agentEntry = this.pluginManager.installedPlugins.get('com.granite.inverted_ai_agent');
    if (agentEntry && agentEntry.instance.getPool) {
      const pool = agentEntry.instance.getPool();
      pool.runStep(async (n) => ({ executed: true, at: new Date().toISOString() }))
        .then(() => pool.runStep(async (n) => ({ executed: true, at: new Date().toISOString() })))
        .catch(err => console.error('Initial agent step failed:', err));
    }
  }

  start() {
    this.init();
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handleHTTP(req, res));
      this.server.listen(this.port, () => {
        console.log(`[PLATFORM SERVER] Telegram Web Fork live at http://localhost:${this.port}`);
        resolve(this.port);
      });
      this.server.on('error', reject);
    });
  }

  stop() {
    return new Promise(resolve => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  async handleHTTP(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    // Serve UI Shell
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(htmlPath, 'utf8'));
      return;
    }

    // Full Platform State Synchronization
    if (req.method === 'GET' && url.pathname === '/api/platform/state') {
      const agentEntry = this.pluginManager.installedPlugins.get('com.granite.inverted_ai_agent');
      const crmEntry = this.pluginManager.installedPlugins.get('com.granite.crm_pipeline');
      const musicEntry = this.pluginManager.installedPlugins.get('com.granite.music_cast');

      const dag = agentEntry?.instance?.getDAG ? agentEntry.instance.getDAG() : null;
      const pool = agentEntry?.instance?.getPool ? agentEntry.instance.getPool() : null;
      const deals = crmEntry?.instance?.getDeals ? crmEntry.instance.getDeals() : [];
      const playlist = musicEntry?.instance?.getPlaylist ? musicEntry.instance.getPlaylist() : [];
      const currentTrack = musicEntry?.instance?.getCurrentTrack ? musicEntry.instance.getCurrentTrack() : null;

      const rawMessages = {};
      for (const [chatId, msgs] of this.stateStore.messages.entries()) {
        rawMessages[chatId] = msgs;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        chats: this.stateStore.getChatList(),
        messages: rawMessages,
        layout: this.slotMatrix.getLayoutState(),
        crmDeals: deals,
        music: {
          playlist,
          currentTrack
        },
        aiDirector: {
          goal: dag ? dag.goal : 'Idle',
          delta: dag ? dag.calculateDelta() : { progressPercent: 0 },
          nodes: dag ? Array.from(dag.nodes.values()) : [],
          activeHumanCalls: pool ? Array.from(pool.activeHumanCalls.values()) : []
        }
      }, null, 2));
      return;
    }

    // Send Telegram message (Incoming to Pipeline)
    if (req.method === 'POST' && url.pathname === '/api/telegram/send') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const { chatId, text } = JSON.parse(body);

          // Check if message is adding audio via command: /audio Title - Performer
          let media = null;
          if (text.startsWith('/audio ')) {
            const trackParts = text.substring(7).split('-');
            media = {
              type: 'audio',
              category: 'audio',
              title: (trackParts[0] || 'Unknown Track').trim(),
              performer: (trackParts[1] || 'Unknown Artist').trim(),
              duration: 210,
              mimeType: 'audio/mp3'
            };
          }

          let event = {
            type: 'message:incoming',
            id: `msg_${Date.now()}`,
            chatId: String(chatId),
            senderId: 'me',
            senderName: 'Вы (Оператор)',
            text: String(text),
            timestamp: new Date().toISOString(),
            media
          };

          // Process through Pipeline Cascades
          event = await this.pipeline.processIncoming(event);
          this.eventBus.publish(event);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, event }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // Create New Chat
    if (req.method === 'POST' && url.pathname === '/api/chats/create') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const { title } = JSON.parse(body);
          const chatId = `chat_${Date.now()}`;
          this.stateStore.updateChat(chatId, {
            id: chatId,
            title: title || 'Новый чат',
            type: 'group'
          });
          this.stateStore.addMessage(chatId, {
            id: `msg_${Date.now()}`,
            senderId: 'system',
            senderName: 'Система',
            text: `Диалог "${title}" создан. Вы можете использовать теги #deal, команды /status, /help.`,
            timestamp: new Date().toISOString()
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, chatId }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // Update CRM Deal Stage
    if (req.method === 'POST' && url.pathname === '/api/crm/stage') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const { chatId, stage } = JSON.parse(body);
          const crmEntry = this.pluginManager.installedPlugins.get('com.granite.crm_pipeline');
          if (crmEntry && crmEntry.instance.updateStage) {
            const updated = crmEntry.instance.updateStage(chatId, stage);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, deal: updated }));
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'CRM plugin not active' }));
          }
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // Music Player Controls
    if (req.method === 'POST' && url.pathname === '/api/music/play') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const { index } = JSON.parse(body);
          const musicEntry = this.pluginManager.installedPlugins.get('com.granite.music_cast');
          if (musicEntry && musicEntry.instance.playTrack) {
            const ok = musicEntry.instance.playTrack(index);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: ok, currentTrack: musicEntry.instance.getCurrentTrack() }));
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Music plugin not active' }));
          }
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/music/toggle') {
      const musicEntry = this.pluginManager.installedPlugins.get('com.granite.music_cast');
      if (musicEntry && musicEntry.instance.togglePlay) {
        const isPlaying = musicEntry.instance.togglePlay();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, isPlaying }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Music plugin not active' }));
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/music/next') {
      const musicEntry = this.pluginManager.installedPlugins.get('com.granite.music_cast');
      if (musicEntry && musicEntry.instance.nextTrack) {
        const track = musicEntry.instance.nextTrack();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, track }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Music plugin not active' }));
      }
      return;
    }

    // Inverted AI Director HaaT Actions
    if (req.method === 'POST' && url.pathname === '/api/haat/submit') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const { nodeId, input } = JSON.parse(body);
          const agentEntry = this.pluginManager.installedPlugins.get('com.granite.inverted_ai_agent');
          const pool = agentEntry.instance.getPool();
          const result = pool.submitHumanResponse(nodeId, input);
          res.writeHead(result.accepted ? 200 : 422, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/haat/reject') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const { nodeId } = JSON.parse(body);
          const agentEntry = this.pluginManager.installedPlugins.get('com.granite.inverted_ai_agent');
          const pool = agentEntry.instance.getPool();
          const result = pool.rejectPremiseByOperator(nodeId, 'Operator clicked Premise Reject');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
}

if (require.main === module) {
  const app = new TelegramWebPlatformApp(process.env.PORT || 8080);
  app.start().catch(err => {
    console.error('Server startup failed:', err);
    process.exit(1);
  });
}

module.exports = { TelegramWebPlatformApp };
