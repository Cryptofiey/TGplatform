/**
 * Layer 0: Telegram Stream Ingestion & Anti-Corruption Layer (ACL)
 * Translates upstream raw MTProto/TDLib updates into immutable PlatformEvent<T>.
 */

class AntiCorruptionLayer {
  constructor() {
    this.streamStatus = {
      text: 'ACTIVE',
      audio: 'ACTIVE',
      files: 'ACTIVE'
    };
  }

  normalizeUpdate(rawUpdate) {
    if (!rawUpdate || !rawUpdate._type) {
      throw new Error('Invalid raw update: missing _type attribute.');
    }

    switch (rawUpdate._type) {
      case 'updateNewMessage': {
        const msg = rawUpdate.message || {};
        return {
          type: 'message:incoming',
          id: `msg_${msg.id || Date.now()}`,
          chatId: String(msg.chat_id || '0'),
          senderId: String(msg.sender_id || '0'),
          senderName: msg.sender_name || 'Anonymous',
          text: String(msg.text || ''),
          timestamp: new Date().toISOString(),
          media: msg.media ? this.normalizeMedia(msg.media) : null
        };
      }

      case 'updateChannelMetadata': {
        return {
          type: 'channel:update',
          channelId: String(rawUpdate.channel_id),
          title: rawUpdate.title || 'Untitled Channel',
          memberCount: rawUpdate.member_count || 0,
          timestamp: new Date().toISOString()
        };
      }

      case 'updateFileChunk': {
        return {
          type: 'storage:chunk',
          fileId: rawUpdate.file_id,
          chunkIndex: rawUpdate.chunk_index,
          totalChunks: rawUpdate.total_chunks,
          mimeType: rawUpdate.mime_type || 'application/octet-stream',
          timestamp: new Date().toISOString()
        };
      }

      default: {
        return {
          type: 'system:raw_unmapped',
          rawType: rawUpdate._type,
          payload: rawUpdate,
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  normalizeMedia(rawMedia) {
    try {
      if (rawMedia.type === 'audio' || rawMedia.mime_type?.startsWith('audio/')) {
        return {
          category: 'audio',
          duration: rawMedia.duration || 0,
          title: rawMedia.title || 'Unknown Track',
          performer: rawMedia.performer || 'Unknown Artist',
          mimeType: rawMedia.mime_type || 'audio/mp3'
        };
      }
      return {
        category: rawMedia.type || 'file',
        mimeType: rawMedia.mime_type || 'application/octet-stream'
      };
    } catch (err) {
      // Graceful stream degradation
      this.streamStatus.audio = 'DEGRADED';
      return {
        category: 'degraded',
        error: err.message
      };
    }
  }
}

module.exports = { AntiCorruptionLayer };
