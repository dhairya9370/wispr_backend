/**
 * Multi-socket aware user manager.
 * Supports multiple tabs / devices per user while providing O(1) lookups.
 */
class UserManager {
    constructor() {
        // Map<userId, Set<socketId>>
        this.userToSockets = new Map();
        // Map<socketId, userId>
        this.socketToUser = new Map();
    }

    addUser(socketId, rawUserId) {
        if (!rawUserId) return { isFirstSocket: false };
        const userId = rawUserId.toString();

        this.socketToUser.set(socketId, userId);

        if (!this.userToSockets.has(userId)) {
            this.userToSockets.set(userId, new Set());
        }

        const socketSet = this.userToSockets.get(userId);
        const isFirstSocket = socketSet.size === 0;
        socketSet.add(socketId);

        return { isFirstSocket, userId };
    }

    removeUser(socketId) {
        const userId = this.socketToUser.get(socketId);
        if (!userId) {
            return { userId: null, isLastSocket: false };
        }

        this.socketToUser.delete(socketId);

        const socketSet = this.userToSockets.get(userId);
        if (socketSet) {
            socketSet.delete(socketId);
            if (socketSet.size === 0) {
                this.userToSockets.delete(userId);
                return { userId, isLastSocket: true };
            }
        }

        return { userId, isLastSocket: false };
    }

    getUserId(socketId) {
        return this.socketToUser.get(socketId);
    }

    getSockets(rawUserId) {
        if (!rawUserId) return [];
        const userId = rawUserId.toString();
        const socketSet = this.userToSockets.get(userId);
        return socketSet ? Array.from(socketSet) : [];
    }

    isUserOnline(rawUserId) {
        if (!rawUserId) return false;
        const userId = rawUserId.toString();
        const socketSet = this.userToSockets.get(userId);
        return Boolean(socketSet && socketSet.size > 0);
    }

    // Direct access to entries for compatibility
    entries() {
        return this.socketToUser.entries();
    }

    get size() {
        return this.socketToUser.size;
    }
}

module.exports = new UserManager();
