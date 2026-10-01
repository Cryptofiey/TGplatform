/**
 * Community Plugin: Music Cast Audio Player
 * Aggregates audio streams from Telegram channels into a unified playback queue.
 */

const manifest = {
  id: 'com.granite.music_cast',
  name: 'Music Cast',
  version: '1.1.0',
  description: 'Aggregates audio messages from channels into a native media stream player',
  permissions: ['messages:read', 'ui:slots']
};

function createPlugin(context) {
  const playlist = [];
  let currentIndex = 0;
  let isPlaying = false;

  return {
    manifest,

    onActivate() {
      context.ui.mount('primary_rail', 'rail_music', {
        icon: '🎵',
        label: 'Music Cast',
        targetView: 'music_stage'
      });

      context.ui.mount('bottom_dock', 'mini_player', {
        title: 'ExoPlayer Mini Bar',
        getCurrentTrack: () => playlist[currentIndex] || { title: 'Нет активного трека', performer: 'Ожидание аудиопотока' }
      });

      context.eventBus.subscribe('message:incoming', (event) => {
        if (event.media && event.media.category === 'audio') {
          playlist.push({
            id: event.id || `track_${Date.now()}`,
            title: event.media.title || 'Unknown Track',
            performer: event.media.performer || 'Unknown Artist',
            duration: event.media.duration || 180,
            channelName: event.senderName || 'Telegram Audio Channel',
            receivedAt: event.timestamp || new Date().toISOString()
          });

          if (playlist.length === 1) {
            isPlaying = true;
          }
        }
      });
    },

    getPlaylist() {
      return [...playlist];
    },

    getCurrentTrack() {
      const track = playlist[currentIndex] || null;
      return {
        track,
        isPlaying,
        currentIndex,
        totalTracks: playlist.length
      };
    },

    playTrack(index) {
      if (index >= 0 && index < playlist.length) {
        currentIndex = index;
        isPlaying = true;
        return true;
      }
      return false;
    },

    togglePlay() {
      if (playlist.length > 0) {
        isPlaying = !isPlaying;
      }
      return isPlaying;
    },

    nextTrack() {
      if (playlist.length > 0) {
        currentIndex = (currentIndex + 1) % playlist.length;
        isPlaying = true;
        return playlist[currentIndex];
      }
      return null;
    },

    onDeactivate() {
      context.ui.unmount('primary_rail', 'rail_music');
      context.ui.unmount('bottom_dock', 'mini_player');
    }
  };
}

module.exports = { manifest, createPlugin };
