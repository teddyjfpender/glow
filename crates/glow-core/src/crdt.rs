//! CRDT operations for real-time collaborative editing.
//!
//! Uses Yrs (Rust port of Yjs) for conflict-free replicated data types.

use yrs::updates::decoder::Decode;
use yrs::updates::encoder::Encode;
use yrs::{Doc, GetString, ReadTxn, Text, TextRef, Transact, Update};

use crate::error::{Error, Result};

/// Manages CRDT synchronization for a document.
#[derive(Debug)]
pub struct DocumentSync {
    doc: Doc,
}

impl DocumentSync {
    /// Creates a new document sync instance.
    #[must_use]
    pub fn new() -> Self {
        let doc = Doc::new();
        // Pre-create the text field
        let _ = doc.get_or_insert_text("content");
        Self { doc }
    }

    /// Creates a document sync from existing CRDT state.
    ///
    /// # Errors
    ///
    /// Returns an error if the state cannot be decoded.
    pub fn from_state(state: &[u8]) -> Result<Self> {
        let doc = Doc::new();
        let _ = doc.get_or_insert_text("content");

        let update = Update::decode_v1(state).map_err(|e| Error::Crdt(e.to_string()))?;

        let mut txn = doc.transact_mut();
        txn.apply_update(update).map_err(|e| Error::Crdt(e.to_string()))?;
        drop(txn);

        Ok(Self { doc })
    }

    /// Gets the text reference for operations.
    fn text(&self) -> TextRef {
        self.doc.get_or_insert_text("content")
    }

    /// Gets the current text content.
    #[must_use]
    pub fn get_content(&self) -> String {
        let txn = self.doc.transact();
        self.text().get_string(&txn)
    }

    /// Sets the text content, replacing all existing content.
    pub fn set_content(&self, content: &str) {
        let text = self.text();
        let mut txn = self.doc.transact_mut();
        let len = text.len(&txn);
        if len > 0 {
            text.remove_range(&mut txn, 0, len);
        }
        text.insert(&mut txn, 0, content);
    }

    /// Inserts text at the given position.
    pub fn insert(&self, index: u32, content: &str) {
        let text = self.text();
        let mut txn = self.doc.transact_mut();
        text.insert(&mut txn, index, content);
    }

    /// Deletes text at the given range.
    pub fn delete(&self, index: u32, length: u32) {
        let text = self.text();
        let mut txn = self.doc.transact_mut();
        text.remove_range(&mut txn, index, length);
    }

    /// Gets the state vector for synchronization.
    #[must_use]
    pub fn get_state_vector(&self) -> Vec<u8> {
        let txn = self.doc.transact();
        txn.state_vector().encode_v1()
    }

    /// Gets the full document state for persistence.
    #[must_use]
    pub fn get_state(&self) -> Vec<u8> {
        let txn = self.doc.transact();
        txn.encode_state_as_update_v1(&yrs::StateVector::default())
    }

    /// Computes the update delta from a remote state vector.
    #[must_use]
    pub fn get_update_from(&self, state_vector: &[u8]) -> Option<Vec<u8>> {
        let sv = yrs::StateVector::decode_v1(state_vector).ok()?;
        let txn = self.doc.transact();
        Some(txn.encode_state_as_update_v1(&sv))
    }

    /// Applies an update from a remote peer.
    ///
    /// # Errors
    ///
    /// Returns an error if the update cannot be applied.
    pub fn apply_update(&self, update: &[u8]) -> Result<()> {
        let update = Update::decode_v1(update).map_err(|e| Error::Crdt(e.to_string()))?;

        let mut txn = self.doc.transact_mut();
        txn.apply_update(update).map_err(|e| Error::Crdt(e.to_string()))?;

        Ok(())
    }
}

impl Default for DocumentSync {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_document_sync() {
        let sync = DocumentSync::new();
        assert!(sync.get_content().is_empty());
    }

    #[test]
    fn test_set_and_get_content() {
        let sync = DocumentSync::new();
        sync.set_content("Hello, world!");
        assert_eq!(sync.get_content(), "Hello, world!");
    }

    #[test]
    fn test_insert_text() {
        let sync = DocumentSync::new();
        sync.set_content("Hello!");
        sync.insert(5, ", world");
        assert_eq!(sync.get_content(), "Hello, world!");
    }

    #[test]
    fn test_delete_text() {
        let sync = DocumentSync::new();
        sync.set_content("Hello, world!");
        sync.delete(5, 7);
        assert_eq!(sync.get_content(), "Hello!");
    }

    #[test]
    fn test_state_roundtrip() {
        let sync1 = DocumentSync::new();
        sync1.set_content("Test content");

        let state = sync1.get_state();
        let sync2 = DocumentSync::from_state(&state).expect("should decode state");

        assert_eq!(sync2.get_content(), "Test content");
    }

    #[test]
    fn test_sync_between_peers() {
        let peer1 = DocumentSync::new();
        let peer2 = DocumentSync::new();

        // Peer 1 makes changes
        peer1.set_content("Hello from peer 1");

        // Get update for peer 2
        let sv = peer2.get_state_vector();
        let update = peer1.get_update_from(&sv).expect("should get update");

        // Apply to peer 2
        peer2.apply_update(&update).expect("should apply update");

        assert_eq!(peer2.get_content(), "Hello from peer 1");
    }
}
