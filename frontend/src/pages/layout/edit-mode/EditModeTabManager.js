/**
 * Manages edit mode state across browser tabs to prevent multiple tabs
 * from editing the same file simultaneously.
 */

class EditModeTabManager {
  constructor() {
    this.channel = null;
    this.currentFileInEditMode = null;
    this.onConflictCallback = null;
    this.heartbeatInterval = null;
    this.HEARTBEAT_INTERVAL_MS = 3000;
    this.STALE_THRESHOLD_MS = 10000;
  }

  /**
   * Initializes the BroadcastChannel and sets up listeners.
   * @param {function} onConflictCallback - Called when edit mode conflict is detected.
   */
  initialize(onConflictCallback) {
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('BroadcastChannel not supported in this browser');
      return;
    }

    this.onConflictCallback = onConflictCallback;
    this.channel = new BroadcastChannel('edit_mode_channel');

    this.channel.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    // Listen for tab close/navigation
    window.addEventListener('beforeunload', () => {
      this.releaseFile();
    });

    // Start heartbeat to detect stale locks
    this.startHeartbeat();
  }

  /**
   * Handles incoming messages from other tabs.
   */
  handleMessage(data) {
    const { type, fileId, timestamp } = data;

    switch (type) {
      case 'CLAIM_EDIT':
        // Another tab is claiming edit mode for a file
        if (this.currentFileInEditMode === fileId) {
          // Conflict: we have the same file open
          this.notifyConflict(fileId);
        }
        break;

      case 'RELEASE_EDIT':
        // Another tab released edit mode
        // We don't need to do anything here
        break;

      case 'HEARTBEAT':
        // Another tab is still alive with this file
        this.updateFileTimestamp(fileId, timestamp);
        break;

      case 'QUERY_EDIT':
        // Another tab is asking who has edit mode
        if (this.currentFileInEditMode === fileId) {
          this.sendHeartbeat();
        }
        break;
    }
  }

  /**
   * Attempts to claim edit mode for a file.
   * @param {string} fileId - The file ID to claim.
   * @returns {Promise<boolean>} True if claim successful, false if conflict.
   */
  async claimFile(fileId) {
    if (!this.channel) {
      // No BroadcastChannel support, allow edit mode
      this.currentFileInEditMode = fileId;
      return true;
    }

    // Query if anyone else has this file
    return new Promise((resolve) => {
      let hasConflict = false;

      const checkListener = (event) => {
        const { type, fileId: otherFileId } = event.data;
        if (type === 'HEARTBEAT' && otherFileId === fileId) {
          hasConflict = true;
        }
      };

      this.channel.addEventListener('message', checkListener);

      // Send query
      this.broadcast({
        type: 'QUERY_EDIT',
        fileId,
        timestamp: Date.now(),
      });

      // Wait 100ms for responses
      setTimeout(() => {
        this.channel.removeEventListener('message', checkListener);

        if (hasConflict) {
          resolve(false);
        } else {
          // No conflict, claim the file
          this.currentFileInEditMode = fileId;
          this.broadcast({
            type: 'CLAIM_EDIT',
            fileId,
            timestamp: Date.now(),
          });
          resolve(true);
        }
      }, 100);
    });
  }

  /**
   * Releases the current file from edit mode.
   */
  releaseFile() {
    if (!this.currentFileInEditMode || !this.channel) return;

    this.broadcast({
      type: 'RELEASE_EDIT',
      fileId: this.currentFileInEditMode,
      timestamp: Date.now(),
    });

    this.currentFileInEditMode = null;
    this.stopHeartbeat();
  }

  /**
   * Sends a message to all other tabs.
   */
  broadcast(message) {
    if (!this.channel) return;
    try {
      this.channel.postMessage(message);
    } catch (err) {
      console.error('Failed to broadcast message:', err);
    }
  }

  /**
   * Sends periodic heartbeat to indicate this tab is still alive.
   */
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.currentFileInEditMode) {
        this.sendHeartbeat();
      }
    }, this.HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Sends a single heartbeat message.
   */
  sendHeartbeat() {
    if (!this.currentFileInEditMode) return;
    this.broadcast({
      type: 'HEARTBEAT',
      fileId: this.currentFileInEditMode,
      timestamp: Date.now(),
    });
  }

  /**
   * Stops the heartbeat interval.
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Updates the last seen timestamp for a file (for stale lock detection).
   */
  updateFileTimestamp(fileId, timestamp) {
    // Store in memory or localStorage if needed
    // For now, we rely on real-time heartbeats
  }

  /**
   * Notifies the callback that a conflict was detected.
   */
  notifyConflict(fileId) {
    if (this.onConflictCallback) {
      this.onConflictCallback(fileId);
    }
  }

  /**
   * Cleans up resources.
   */
  destroy() {
    this.releaseFile();
    this.stopHeartbeat();
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}

// Singleton instance
const tabManager = new EditModeTabManager();

export default tabManager;