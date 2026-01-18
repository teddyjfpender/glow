//! # Glow WASM
//!
//! WebAssembly bindings for Glow, exposing CRDT operations to the browser.

use glow_core::DocumentSync;
use wasm_bindgen::prelude::*;

/// WASM-compatible document sync wrapper.
#[wasm_bindgen]
pub struct WasmDocumentSync {
    inner: DocumentSync,
}

#[wasm_bindgen]
impl WasmDocumentSync {
    /// Creates a new document sync instance.
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self { inner: DocumentSync::new() }
    }

    /// Creates a document sync from existing CRDT state.
    #[wasm_bindgen(js_name = fromState)]
    pub fn from_state(state: &[u8]) -> Result<WasmDocumentSync, JsError> {
        let inner = DocumentSync::from_state(state).map_err(|e| JsError::new(&e.to_string()))?;
        Ok(Self { inner })
    }

    /// Gets the current text content.
    #[wasm_bindgen(js_name = getContent)]
    pub fn get_content(&self) -> String {
        self.inner.get_content()
    }

    /// Sets the text content, replacing all existing content.
    #[wasm_bindgen(js_name = setContent)]
    pub fn set_content(&self, content: &str) {
        self.inner.set_content(content);
    }

    /// Inserts text at the given position.
    pub fn insert(&self, index: u32, content: &str) {
        self.inner.insert(index, content);
    }

    /// Deletes text at the given range.
    pub fn delete(&self, index: u32, length: u32) {
        self.inner.delete(index, length);
    }

    /// Gets the state vector for synchronization.
    #[wasm_bindgen(js_name = getStateVector)]
    pub fn get_state_vector(&self) -> Vec<u8> {
        self.inner.get_state_vector()
    }

    /// Gets the full document state for persistence.
    #[wasm_bindgen(js_name = getState)]
    pub fn get_state(&self) -> Vec<u8> {
        self.inner.get_state()
    }

    /// Computes the update delta from a remote state vector.
    #[wasm_bindgen(js_name = getUpdateFrom)]
    pub fn get_update_from(&self, state_vector: &[u8]) -> Option<Vec<u8>> {
        self.inner.get_update_from(state_vector)
    }

    /// Applies an update from a remote peer.
    #[wasm_bindgen(js_name = applyUpdate)]
    pub fn apply_update(&self, update: &[u8]) -> Result<(), JsError> {
        self.inner.apply_update(update).map_err(|e| JsError::new(&e.to_string()))
    }
}

impl Default for WasmDocumentSync {
    fn default() -> Self {
        Self::new()
    }
}
