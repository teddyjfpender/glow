//! SQLite storage for the desktop application.

use glow_core::{Document, DocumentId, Error, Result};
use rusqlite::Connection;

/// SQLite-based document storage.
pub struct SqliteStorage {
    conn: Connection,
}

impl SqliteStorage {
    /// Creates a new SQLite storage at the given path.
    ///
    /// # Errors
    ///
    /// Returns an error if the database cannot be opened or initialized.
    pub fn new(path: &str) -> Result<Self> {
        let conn = Connection::open(path)?;
        let storage = Self { conn };
        storage.init_schema()?;
        Ok(storage)
    }

    /// Creates an in-memory SQLite storage (for testing).
    ///
    /// # Errors
    ///
    /// Returns an error if the database cannot be created.
    pub fn in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        let storage = Self { conn };
        storage.init_schema()?;
        Ok(storage)
    }

    /// Initializes the database schema.
    fn init_schema(&self) -> Result<()> {
        self.conn.execute_batch(
            r"
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                crdt_state BLOB,
                created_at TEXT NOT NULL,
                modified_at TEXT NOT NULL,
                version INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_documents_modified_at
            ON documents(modified_at DESC);
            ",
        )?;
        Ok(())
    }

    /// Gets all documents.
    ///
    /// # Errors
    ///
    /// Returns an error if the query fails.
    pub fn list_documents(&self) -> Result<Vec<Document>> {
        // TODO: Implement query
        Ok(vec![])
    }

    /// Gets a document by ID.
    ///
    /// # Errors
    ///
    /// Returns an error if the document is not found.
    pub fn get_document(&self, id: &DocumentId) -> Result<Document> {
        // TODO: Implement query
        Err(Error::DocumentNotFound(id.to_string()))
    }

    /// Saves a document.
    ///
    /// # Errors
    ///
    /// Returns an error if the save fails.
    pub fn save_document(&self, doc: &Document) -> Result<()> {
        // TODO: Implement insert/update
        Ok(())
    }

    /// Deletes a document.
    ///
    /// # Errors
    ///
    /// Returns an error if the delete fails.
    pub fn delete_document(&self, id: &DocumentId) -> Result<()> {
        // TODO: Implement delete
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_storage() {
        let storage = SqliteStorage::in_memory().expect("should create storage");
        let docs = storage.list_documents().expect("should list documents");
        assert!(docs.is_empty());
    }
}
