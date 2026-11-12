/**
 * ============================================================================
 * 1. ARCHITECTURE OVERVIEW:
 *    Encapsulates all Google Cloud Firestore operations for real-time chat 
 *    messages, per-user read receipts, last-seen cursors, and message mutations.
 * 
 * 2. HIERARCHY & PRIORITY:
 *    1. `chats/{chatId}`: Root room metadata & denormalized `lastMessage` preview.
 *    2. `chats/{chatId}/messages/{messageId}`: Ordered message stream & `readBy` map.
 *    3. `chats/{chatId}/lastSeen/{userId}`: Per-user read cursor tracking.
 * 
 * 3. IMPLEMENTATION EXAMPLES:
 *    - Send: `await FirestoreChatService.sendMessage(12, 5, "Hello!");`
 *    - Read: `await FirestoreChatService.markMessageRead(12, "msg_abc", 8);`
 * ============================================================================
 */

import {
  firestoreDb,
  FirestoreFieldValue,
  FirestoreTimestamp,
} from "../../config/firebase/firebase.config.js";

export interface FirestoreMessageDTO {
  messageId: string;
  chatId: number;
  senderId: number;
  text: string;
  timestamp: string | null;
  isEdited: boolean;
  editedAt: string | null;
  isDeleted: boolean;
  readBy: Record<string, string>;
}

class FirestoreChatService {
  private readonly chatsCollection = firestoreDb.collection("chats");

  /**
   * 1. Stores a new message in `chats/{chatId}/messages` with server timestamp
   *    and updates the parent chat's `lastMessage` summary atomically.
   */
  public async sendMessage(
    chatId: number,
    senderId: number,
    text: string
  ): Promise<{ messageId: string; chatId: number; senderId: number; text: string }> {
    const chatDocRef = this.chatsCollection.doc(String(chatId));
    const messageDocRef = chatDocRef.collection("messages").doc();
    const now = FirestoreFieldValue.serverTimestamp();

    const batch = firestoreDb.batch();

    // 1. Create message document (sender implicitly has read their own message)
    batch.set(messageDocRef, {
      senderId: Number(senderId),
      text: text.trim(),
      timestamp: now,
      isEdited: false,
      editedAt: null,
      isDeleted: false,
      deletedAt: null,
      readBy: {
        [String(senderId)]: now,
      },
    });

    // 2. Upsert parent chat document with latest message preview
    batch.set(
      chatDocRef,
      {
        chatId: Number(chatId),
        lastMessage: {
          messageId: messageDocRef.id,
          senderId: Number(senderId),
          text: text.trim(),
          timestamp: now,
        },
        updatedAt: now,
      },
      { merge: true }
    );

    await batch.commit();

    return {
      messageId: messageDocRef.id,
      chatId: Number(chatId),
      senderId: Number(senderId),
      text: text.trim(),
    };
  }

  /**
   * 2. Retrieves messages ordered chronologically by timestamp (ascending for UI).
   */
  public async getMessages(
    chatId: number,
    limit: number = 50
  ): Promise<FirestoreMessageDTO[]> {
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);

    // 1. Fetch newest `safeLimit` messages descending, then reverse to chronological ASC
    const snapshot = await this.chatsCollection
      .doc(String(chatId))
      .collection("messages")
      .orderBy("timestamp", "desc")
      .limit(safeLimit)
      .get();

    const messages: FirestoreMessageDTO[] = snapshot.docs.reverse().map((doc) => {
      const data = doc.data();
      const rawReadBy = (data.readBy || {}) as Record<string, FirebaseFirestore.Timestamp>;
      const formattedReadBy: Record<string, string> = {};

      for (const [uid, ts] of Object.entries(rawReadBy)) {
        formattedReadBy[uid] = ts?.toDate ? ts.toDate().toISOString() : new Date().toISOString();
      }

      return {
        messageId: doc.id,
        chatId: Number(chatId),
        senderId: Number(data.senderId),
        text: data.isDeleted ? "This message was deleted" : String(data.text),
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : null,
        isEdited: Boolean(data.isEdited),
        editedAt: data.editedAt?.toDate ? data.editedAt.toDate().toISOString() : null,
        isDeleted: Boolean(data.isDeleted),
        readBy: formattedReadBy,
      };
    });

    return messages;
  }

  /**
   * 3. Updates the read receipt map on a specific message (`readBy.{userId}`).
   */
  public async markMessageRead(
    chatId: number,
    messageId: string,
    userId: number
  ): Promise<void> {
    const messageRef = this.chatsCollection
      .doc(String(chatId))
      .collection("messages")
      .doc(messageId);

    const docSnap = await messageRef.get();
    if (!docSnap.exists) {
      throw new Error(`Message '${messageId}' not found in chat '${chatId}'.`);
    }

    // 1. Dot-notation update sets only this user's timestamp without overwriting others
    await messageRef.update({
      [`readBy.${String(userId)}`]: FirestoreFieldValue.serverTimestamp(),
    });
  }

  /**
   * 4. Updates the per-user last seen message cursor in `chats/{chatId}/lastSeen/{userId}`.
   */
  public async updateLastSeen(
    chatId: number,
    userId: number,
    messageId: string
  ): Promise<void> {
    const lastSeenRef = this.chatsCollection
      .doc(String(chatId))
      .collection("lastSeen")
      .doc(String(userId));

    await lastSeenRef.set(
      {
        userId: Number(userId),
        lastSeenMessageId: messageId,
        seenAt: FirestoreFieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  /**
   * 5. [BONUS] Edits an existing message (enforces sender ownership & non-deleted state).
   */
  public async editMessage(
    chatId: number,
    messageId: string,
    senderId: number,
    newText: string
  ): Promise<void> {
    const messageRef = this.chatsCollection
      .doc(String(chatId))
      .collection("messages")
      .doc(messageId);

    const docSnap = await messageRef.get();
    if (!docSnap.exists) {
      throw new Error(`Message '${messageId}' not found.`);
    }

    const data = docSnap.data()!;
    if (Number(data.senderId) !== Number(senderId)) {
      throw new Error("Unauthorized: Only the original sender can edit this message.");
    }
    if (data.isDeleted) {
      throw new Error("Cannot edit a deleted message.");
    }

    await messageRef.update({
      text: newText.trim(),
      isEdited: true,
      editedAt: FirestoreFieldValue.serverTimestamp(),
    });
  }

  /**
   * 6. [BONUS] Soft-deletes a message in Firestore (enforces sender ownership).
   */
  public async deleteMessage(
    chatId: number,
    messageId: string,
    senderId: number
  ): Promise<void> {
    const messageRef = this.chatsCollection
      .doc(String(chatId))
      .collection("messages")
      .doc(messageId);

    const docSnap = await messageRef.get();
    if (!docSnap.exists) {
      throw new Error(`Message '${messageId}' not found.`);
    }

    const data = docSnap.data()!;
    if (Number(data.senderId) !== Number(senderId)) {
      throw new Error("Unauthorized: Only the original sender can delete this message.");
    }

    await messageRef.update({
      text: "",
      isDeleted: true,
      deletedAt: FirestoreFieldValue.serverTimestamp(),
    });
  }
}

export default new FirestoreChatService();