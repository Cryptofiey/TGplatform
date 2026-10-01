/**
 * Comprehensive Integration & Verification Suite
 * Verifies that all layers and modules of Telegram Web Platform are 100% functionally operational.
 */

const assert = require('assert');
const { AntiCorruptionLayer } = require('../src/layer0-acl/acl');
const { ReactiveEventBus } = require('../src/layer1-store/event-bus');
const { PlatformStateStore } = require('../src/layer1-store/state-store');
const { PermissionManager } = require('../src/layer1-store/permissions');
const { UISlotMatrix } = require('../src/layer2-omnirout/slot-matrix');
const { PipelineCascade } = require('../src/layer2-omnirout/pipeline');
const { PluginManager } = require('../src/layer2-omnirout/plugin-manager');

const invertedAgentPlugin = require('../src/layer3-plugins/inverted-agent/plugin');
const crmPlugin = require('../src/layer3-plugins/crm-pipeline/plugin');
const musicPlugin = require('../src/layer3-plugins/music-cast/plugin');
const { TelegramWebPlatformApp } = require('../bin/server');

async function runTestSuite() {
  console.log('=== STARTING COMPLETE TELEGRAM WEB PLATFORM AUDIT & VERIFICATION ===\n');

  // 1. Layer 0 ACL
  console.log('[TEST 1] Layer 0: Anti-Corruption Layer (ACL)');
  const acl = new AntiCorruptionLayer();
  const rawTextUpdate = {
    _type: 'updateNewMessage',
    message: { id: 501, chat_id: 201, sender_id: 'user_bob', sender_name: 'Bob', text: 'Hello Granite Platform' }
  };
  const normText = acl.normalizeUpdate(rawTextUpdate);
  assert.strictEqual(normText.type, 'message:incoming');
  assert.strictEqual(normText.chatId, '201');
  assert.strictEqual(normText.text, 'Hello Granite Platform');

  const rawAudioUpdate = {
    _type: 'updateNewMessage',
    message: {
      id: 502,
      chat_id: 202,
      sender_id: 'channel_music',
      sender_name: 'Chill Channel',
      text: 'Track broadcast',
      media: { type: 'audio', title: 'Deep Ocean', performer: 'Ambient Artist', duration: 180 }
    }
  };
  const normAudio = acl.normalizeUpdate(rawAudioUpdate);
  assert.strictEqual(normAudio.media.category, 'audio');
  assert.strictEqual(normAudio.media.title, 'Deep Ocean');
  console.log('  -> Layer 0 ACL: PASS');

  // 2. Layer 1 State Store & Event Bus
  console.log('\n[TEST 2] Layer 1: Reactive Event Bus & Platform State Store');
  const eventBus = new ReactiveEventBus();
  const stateStore = new PlatformStateStore(eventBus);
  const permManager = new PermissionManager();

  eventBus.publish(normText);

  const chats = stateStore.getChatList();
  assert.strictEqual(chats.length, 1, 'Should have registered 1 chat from text update');
  assert.strictEqual(stateStore.getMessages('201').length, 1);
  console.log('  -> Layer 1 Store: PASS');

  // 3. Layer 2 Omnirout & UI Slot Matrix
  console.log('\n[TEST 3] Layer 2: Omnirout Core & UI Slot Matrix');
  const slotMatrix = new UISlotMatrix();
  const pipeline = new PipelineCascade(50);
  const pluginManager = new PluginManager(eventBus, stateStore, slotMatrix, pipeline, permManager);

  // Register & activate all 3 plugins
  pluginManager.registerPlugin(invertedAgentPlugin.manifest, invertedAgentPlugin.createPlugin);
  pluginManager.registerPlugin(crmPlugin.manifest, crmPlugin.createPlugin);
  pluginManager.registerPlugin(musicPlugin.manifest, musicPlugin.createPlugin);

  pluginManager.activatePlugin('com.granite.inverted_ai_agent');
  pluginManager.activatePlugin('com.granite.crm_pipeline');
  pluginManager.activatePlugin('com.granite.music_cast');

  const layout = slotMatrix.getLayoutState();
  assert.ok(layout.slots.primary_rail.length >= 3, 'Primary Rail should have 3 plugin docks');
  assert.ok(layout.slots.stage_area.length >= 2, 'Stage Area should have registered views');
  console.log('  -> Layer 2 Slot Matrix & Plugin Activation: PASS');

  // 4. Inverted AI Agent (First-Class Plugin)
  console.log('\n[TEST 4] Layer 3: Inverted AI Director Plugin');
  const agentEntry = pluginManager.installedPlugins.get('com.granite.inverted_ai_agent');
  const pool = agentEntry.instance.getPool();
  const dag = agentEntry.instance.getDAG();

  assert.ok(dag, 'DAG must be initialized');
  assert.ok(pool, 'ParallelWorkerPool must be initialized');

  // Test in-band /status command
  const statusEvent = {
    type: 'message:incoming',
    id: 'test_cmd_1',
    chatId: '201',
    senderId: 'me',
    senderName: 'Operator',
    text: '/status',
    timestamp: new Date().toISOString()
  };
  await pipeline.processIncoming(statusEvent);
  const msgs201 = stateStore.getMessages('201');
  const statusReply = msgs201.find(m => m.senderId === 'ai_director' && m.text.includes('AI DIRECTOR STATUS'));
  assert.ok(statusReply, 'AI Director should reply to /status in chat');
  console.log('  -> In-Band /status Command: PASS');

  // Test HaaT trigger & submission
  console.log('\n[TEST 5] Human-as-a-Tool (HaaT) Protocol & Premise Rejection');
  await pool.runStep(async () => ({ done: true }));
  await pool.runStep(async () => ({ done: true }));

  assert.ok(pool.activeHumanCalls.size > 0, 'Should have triggered HaaT for human-gated node');
  const activeNodeId = Array.from(pool.activeHumanCalls.keys())[0];
  console.log(`  -> Active HaaT Node: ${activeNodeId}`);

  // Test Operator Veto: "бред"
  const rejectEvent = {
    type: 'message:incoming',
    id: 'test_rej_1',
    chatId: '201',
    senderId: 'me',
    senderName: 'Operator',
    text: 'бред',
    timestamp: new Date().toISOString()
  };
  await pipeline.processIncoming(rejectEvent);
  const rejectReply = stateStore.getMessages('201').find(m => m.text.includes('PREMISE_REJECTED_BY_OPERATOR'));
  assert.ok(rejectReply, 'Should acknowledge operator veto premise rejection');
  console.log('  -> Operator Veto ("бред"): PASS');

  // 5. CRM Lead Pipeline Plugin
  console.log('\n[TEST 6] CRM Lead Pipeline & Stage Progression');
  const crmEntry = pluginManager.installedPlugins.get('com.granite.crm_pipeline');
  const leadEvent = {
    type: 'message:incoming',
    id: 'msg_lead_test',
    chatId: '999',
    senderId: 'client_sergey',
    senderName: 'Сергей',
    text: 'Хотим купить виллу на Bang Tao #deal 120000',
    timestamp: new Date().toISOString()
  };
  await pipeline.processIncoming(leadEvent);
  eventBus.publish(leadEvent);

  const deals = crmEntry.instance.getDeals();
  const sergeyDeal = deals.find(d => d.chatId === '999');
  assert.ok(sergeyDeal, 'Should have parsed lead from chat message');
  assert.strictEqual(sergeyDeal.amount, 120000);
  assert.strictEqual(sergeyDeal.stage, 'Qualified');

  // Advance stage to 'In Progress', then 'Won'
  crmEntry.instance.updateStage('999', 'In Progress');
  assert.strictEqual(sergeyDeal.stage, 'In Progress');
  crmEntry.instance.updateStage('999', 'Won');
  assert.strictEqual(sergeyDeal.stage, 'Won');
  console.log('  -> CRM Lead Pipeline & Stage Progression: PASS');

  // 6. Music Cast Plugin
  console.log('\n[TEST 7] Music Cast Stream Aggregation & Player Controls');
  const musicEntry = pluginManager.installedPlugins.get('com.granite.music_cast');
  // Publish audio update now that music plugin is active
  eventBus.publish(normAudio);

  const playlist = musicEntry.instance.getPlaylist();
  assert.ok(playlist.length >= 1, 'Should have ingested audio from normAudio event');
  assert.strictEqual(playlist[0].title, 'Deep Ocean');

  const currTrackBefore = musicEntry.instance.getCurrentTrack();
  assert.strictEqual(currTrackBefore.track.title, 'Deep Ocean');

  // Test playback controls
  musicEntry.instance.togglePlay();
  const currTrackAfter = musicEntry.instance.getCurrentTrack();
  assert.strictEqual(currTrackAfter.isPlaying, false);
  console.log('  -> Music Cast Aggregation & Controls: PASS');

  // 7. Full-Stack HTTP Server & REST Endpoints
  console.log('\n[TEST 8] HTTP Server & REST API End-to-End Verification');
  const app = new TelegramWebPlatformApp(9876);
  await app.start();

  const http = require('http');
  function getJson(url) {
    return new Promise((resolve, reject) => {
      http.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
      }).on('error', reject);
    });
  }

  const stateRes = await getJson('http://localhost:9876/api/platform/state');
  assert.strictEqual(stateRes.status, 200);
  assert.ok(stateRes.body.chats.length >= 2, 'Should return seeded chats');
  assert.ok(stateRes.body.crmDeals.length >= 1, 'Should return CRM deals');
  assert.ok(stateRes.body.music.playlist.length >= 1, 'Should return Music playlist');
  assert.ok(stateRes.body.aiDirector.nodes.length > 0, 'Should return Inverted AI Director DAG');

  await app.stop();
  console.log('  -> Full-Stack Server & REST Endpoints: PASS');

  console.log('\n=============================================================');
  console.log('🎉 ALL 8 TESTS PASSED! TELEGRAM WEB PLATFORM IS 100% OPERATIONAL!');
  console.log('=============================================================');
}

runTestSuite().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
