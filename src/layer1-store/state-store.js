/**
 * Layer 1: Platform State Store
 * Deterministic local store for chats, messages, and BLOB references.
 */

class PlatformStateStore {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.chats = new Map();
    this.messages = new Map(); // chatId -> Array of messages
    this.blobs = new Map(); // fileId -> BLOB meta
    this.contacts = new Map();

    if (this.eventBus) {
      this.attachListeners();
    }
  }

  attachListeners() {
    this.eventBus.subscribe('message:incoming', (evt) => {
      this.addMessage(evt.chatId, {
        id: evt.id,
        senderId: evt.senderId,
        senderName: evt.senderName,
        text: evt.text,
        timestamp: evt.timestamp,
        media: evt.media
      });
    });

    this.eventBus.subscribe('channel:update', (evt) => {
      this.updateChat(evt.channelId, {
        title: evt.title,
        memberCount: evt.memberCount
      });
    });

    this.eventBus.subscribe('storage:chunk', (evt) => {
      if (!this.blobs.has(evt.fileId)) {
        this.blobs.set(evt.fileId, {
          fileId: evt.fileId,
          totalChunks: evt.totalChunks,
          receivedChunks: 0,
          mimeType: evt.mimeType
        });
      }
      const blob = this.blobs.get(evt.fileId);
      blob.receivedChunks++;
    });
  }

  updateChat(chatId, chatData) {
    const existing = this.chats.get(chatId) || { id: chatId, title: 'Chat ' + chatId, type: 'group' };
    this.chats.set(chatId, { ...existing, ...chatData });
    return this.chats.get(chatId);
  }

  addMessage(chatId, message) {
    if (!this.chats.has(chatId)) {
      this.updateChat(chatId, { title: message.senderName || 'Chat ' + chatId });
    }
    if (!this.messages.has(chatId)) {
      this.messages.set(chatId, []);
    }
    const list = this.messages.get(chatId);
    list.push(message);
    return message;
  }

  getChatList() {
    const result = [];
    for (const [id, chat] of this.chats.entries()) {
      const msgs = this.messages.get(id) || [];
      const lastMessage = msgs.length > 0 ? msgs[msgs.length - 1] : null;
      result.push({
        ...chat,
        lastMessage
      });
    }
    return result;
  }

  getMessages(chatId) {
    return this.messages.get(chatId) || [];
  }
}

module.exports = { PlatformStateStore };
