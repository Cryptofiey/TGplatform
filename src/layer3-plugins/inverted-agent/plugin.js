/**
 * First-Class Plugin: Inverted AI Agent Core
 * Integrates our autonomous Inverted Role & State-Delta DAG engine into the Telegram Web Platform.
 * Mounts into Primary Rail, Secondary Column, Stage Area (The Directive Terminal), and processes HaaT interrupts.
 */

// Import the optimized v2 core modules using path.resolve
const path = require('path');
const v2Base = path.resolve(__dirname, '../../../../inverted-ai-agent-v2-dev/src');

const { GoalDecomposer } = require(path.join(v2Base, 'decomposer'));
const { ParallelWorkerPool } = require(path.join(v2Base, 'worker-pool'));
const { HumanWorkerChannel } = require(path.join(v2Base, 'haat'));

const manifest = {
  id: 'com.granite.inverted_ai_agent',
  name: 'Inverted AI Director',
  version: '2.1.0',
  description: 'Proactive autonomous Technical Director implementing The Inverted Drum and HaaT protocols',
  permissions: ['messages:read', 'messages:write', 'ui:slots', 'ai:agent']
};

function createPlugin(context) {
  let dag = null;
  let pool = null;

  return {
    manifest,

    onActivate() {
      // 1. Initialize Autonomous DAG
      dag = GoalDecomposer.createParallelSoftwareDAG('tg_web_platform', 'Autonomous Modular Telegram Web Fork');
      pool = new ParallelWorkerPool(dag, { concurrency: 3 });

      // 2. Mount into UI Slot Matrix
      // Primary Vertical Rail (Dock item)
      context.ui.mount('primary_rail', 'rail_ai_director', {
        icon: '🤖',
        label: 'AI Director',
        targetView: 'ai_director_stage',
        badge: 'ACTIVE'
      });

      // Secondary Master Column
      context.ui.mount('secondary_column', 'column_dag_tasks', {
        title: 'Задачи целевого графа (DAG)',
        getNodes: () => Array.from(dag.nodes.values()),
        getDelta: () => dag.calculateDelta()
      });

      // Stage Area (The Directive Terminal & Kanban Stage)
      context.ui.mount('stage_area', 'ai_director_stage', {
        title: 'Терминал Заказчика & HaaT Directives',
        getDAG: () => dag,
        getPool: () => pool
      });

      // 3. Pipeline Interceptor: Intercept Telegram chat messages to process HaaT replies & in-band commands
      context.pipeline.intercept('haat_chat_resolver', 100, (event) => {
        if (event.type === 'message:incoming') {
          const text = (event.text || '').trim();

          // In-band /status or /ai command
          if (text === '/status' || text === '/ai') {
            const delta = dag.calculateDelta();
            const activeCalls = Array.from(pool.activeHumanCalls.values());
            const blockerInfo = activeCalls.length > 0 
              ? `\n🚨 БЛОКИРОВКА (Ожидает оператора): [${activeCalls[0].nodeId}] "${activeCalls[0].instruction}".\n(Ответьте текстом или отправьте /reject)`
              : '\n🟢 Все воркеры работают автономно.';

            context.eventBus.publish({
              type: 'message:incoming',
              id: `ai_stat_${Date.now()}`,
              chatId: event.chatId,
              senderId: 'ai_director',
              senderName: 'Inverted AI Director',
              text: `🤖 [AI DIRECTOR STATUS]\n🎯 Цель: ${dag.goal}\n📈 Гомеостаз: ${delta.progressPercent}%\n📊 Узлов выполнено: ${delta.completedNodes}/${dag.nodes.size}${blockerInfo}`,
              timestamp: new Date().toISOString()
            });
            return event;
          }

          // In-band /help command
          if (text === '/help') {
            context.eventBus.publish({
              type: 'message:incoming',
              id: `ai_help_${Date.now()}`,
              chatId: event.chatId,
              senderId: 'ai_director',
              senderName: 'Platform Bot',
              text: `ℹ️ [ДОСТУПНЫЕ КОМАНДЫ ПЛАТФОРМЫ]\n• /status — Отчет AI-директора о целевом графе\n• /reject или "бред" — Вето оператора на ошибочную гипотезу воркера\n• #deal <сумма> — Регистрация лида в CRM\n• /audio <название> — Добавить трек в Music Cast`,
              timestamp: new Date().toISOString()
            });
            return event;
          }

          // Check if operator sent rejection command
          if (text.toLowerCase() === 'бред' || text.toLowerCase() === '/reject') {
            if (pool.activeHumanCalls.size > 0) {
              for (const nodeId of pool.activeHumanCalls.keys()) {
                pool.rejectPremiseByOperator(nodeId, 'Operator rejected premise in Telegram chat');
                context.eventBus.publish({
                  type: 'message:incoming',
                  id: `ai_rej_${Date.now()}`,
                  chatId: event.chatId,
                  senderId: 'ai_director',
                  senderName: 'Inverted AI Director',
                  text: `[AI DIRECTOR]: Ветка задачи "${nodeId}" отсечена (PREMISE_REJECTED_BY_OPERATOR). Граф откачен к стабильному состоянию.`,
                  timestamp: new Date().toISOString()
                });
              }
            } else {
              context.eventBus.publish({
                type: 'message:incoming',
                id: `ai_rej_noop_${Date.now()}`,
                chatId: event.chatId,
                senderId: 'ai_director',
                senderName: 'Inverted AI Director',
                text: `[AI DIRECTOR]: Активных HaaT-запросов нет. Отклонять нечего.`,
                timestamp: new Date().toISOString()
              });
            }
            return event;
          }

          // Check if input matches any active human call
          if (pool.activeHumanCalls.size > 0) {
            for (const [nodeId, humanCall] of pool.activeHumanCalls.entries()) {
              const validation = HumanWorkerChannel.validateSubmission(humanCall, text);
              if (validation.valid) {
                pool.submitHumanResponse(nodeId, text);
                context.eventBus.publish({
                  type: 'message:incoming',
                  id: `ai_ack_${Date.now()}`,
                  chatId: event.chatId,
                  senderId: 'ai_director',
                  senderName: 'Inverted AI Director',
                  text: `[AI DIRECTOR]: Входные данные для "${nodeId}" ПРИНЯТЫ. Параллельный пул возобновил выполнение.`,
                  timestamp: new Date().toISOString()
                });
                break;
              }
            }
          }
        }
        return event;
      });
    },

    getPool() {
      return pool;
    },

    getDAG() {
      return dag;
    },

    onDeactivate() {
      context.ui.unmount('primary_rail', 'rail_ai_director');
      context.ui.unmount('secondary_column', 'column_dag_tasks');
      context.ui.unmount('stage_area', 'ai_director_stage');
    }
  };
}

module.exports = { manifest, createPlugin };
