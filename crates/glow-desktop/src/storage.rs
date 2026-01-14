//! SQLite storage for the desktop application.

use chrono::{DateTime, Utc};
use glow_core::{Document, DocumentId, DocumentMetadata};
use rusqlite::{params, Connection, OptionalExtension};
use uuid::Uuid;

use crate::{Error, Result};

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

    /// Gets all documents, ordered by modification date.
    ///
    /// # Errors
    ///
    /// Returns an error if the query fails.
    pub fn list_documents(&self) -> Result<Vec<Document>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, title, content, crdt_state, created_at, modified_at, version
             FROM documents
             ORDER BY modified_at DESC",
        )?;

        let docs = stmt
            .query_map([], |row| {
                let id_str: String = row.get(0)?;
                let title: String = row.get(1)?;
                let content: String = row.get(2)?;
                let crdt_state: Option<Vec<u8>> = row.get(3)?;
                let created_at: String = row.get(4)?;
                let modified_at: String = row.get(5)?;
                let version: u64 = row.get(6)?;

                Ok((
                    id_str,
                    title,
                    content,
                    crdt_state,
                    created_at,
                    modified_at,
                    version,
                ))
            })?
            .filter_map(|r| r.ok())
            .filter_map(
                |(id_str, title, content, crdt_state, created_at, modified_at, version)| {
                    let uuid = Uuid::parse_str(&id_str).ok()?;
                    let created_at = DateTime::parse_from_rfc3339(&created_at)
                        .ok()?
                        .with_timezone(&Utc);
                    let modified_at = DateTime::parse_from_rfc3339(&modified_at)
                        .ok()?
                        .with_timezone(&Utc);

                    Some(Document {
                        id: DocumentId::from_uuid(uuid),
                        metadata: DocumentMetadata {
                            title,
                            created_at,
                            modified_at,
                            version,
                        },
                        content,
                        crdt_state,
                    })
                },
            )
            .collect();

        Ok(docs)
    }

    /// Gets a document by ID.
    ///
    /// # Errors
    ///
    /// Returns an error if the document is not found.
    pub fn get_document(&self, id: &DocumentId) -> Result<Document> {
        let mut stmt = self.conn.prepare(
            "SELECT id, title, content, crdt_state, created_at, modified_at, version
             FROM documents
             WHERE id = ?",
        )?;

        let result = stmt
            .query_row([id.to_string()], |row| {
                let id_str: String = row.get(0)?;
                let title: String = row.get(1)?;
                let content: String = row.get(2)?;
                let crdt_state: Option<Vec<u8>> = row.get(3)?;
                let created_at: String = row.get(4)?;
                let modified_at: String = row.get(5)?;
                let version: u64 = row.get(6)?;

                Ok((
                    id_str,
                    title,
                    content,
                    crdt_state,
                    created_at,
                    modified_at,
                    version,
                ))
            })
            .optional()?;

        match result {
            Some((id_str, title, content, crdt_state, created_at, modified_at, version)) => {
                let uuid = Uuid::parse_str(&id_str)
                    .map_err(|e| Error::Database(format!("invalid UUID: {e}")))?;
                let created_at = DateTime::parse_from_rfc3339(&created_at)
                    .map_err(|e| Error::Database(format!("invalid date: {e}")))?
                    .with_timezone(&Utc);
                let modified_at = DateTime::parse_from_rfc3339(&modified_at)
                    .map_err(|e| Error::Database(format!("invalid date: {e}")))?
                    .with_timezone(&Utc);

                Ok(Document {
                    id: DocumentId::from_uuid(uuid),
                    metadata: DocumentMetadata {
                        title,
                        created_at,
                        modified_at,
                        version,
                    },
                    content,
                    crdt_state,
                })
            }
            None => Err(Error::NotFound(id.to_string())),
        }
    }

    /// Saves a document (insert or update).
    ///
    /// # Errors
    ///
    /// Returns an error if the save fails.
    pub fn save_document(&self, doc: &Document) -> Result<()> {
        self.conn.execute(
            "INSERT INTO documents (id, title, content, crdt_state, created_at, modified_at, version)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                content = excluded.content,
                crdt_state = excluded.crdt_state,
                modified_at = excluded.modified_at,
                version = excluded.version",
            params![
                doc.id.to_string(),
                doc.metadata.title,
                doc.content,
                doc.crdt_state,
                doc.metadata.created_at.to_rfc3339(),
                doc.metadata.modified_at.to_rfc3339(),
                doc.metadata.version,
            ],
        )?;
        Ok(())
    }

    /// Deletes a document.
    ///
    /// # Errors
    ///
    /// Returns an error if the delete fails.
    pub fn delete_document(&self, id: &DocumentId) -> Result<()> {
        let rows = self
            .conn
            .execute("DELETE FROM documents WHERE id = ?", [id.to_string()])?;

        if rows == 0 {
            return Err(Error::NotFound(id.to_string()));
        }

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

    #[test]
    fn test_save_and_get_document() {
        let storage = SqliteStorage::in_memory().expect("should create storage");

        let doc = Document::with_title("Test Document");
        storage.save_document(&doc).expect("should save document");

        let retrieved = storage.get_document(&doc.id).expect("should get document");
        assert_eq!(retrieved.metadata.title, "Test Document");
    }

    #[test]
    fn test_list_documents() {
        let storage = SqliteStorage::in_memory().expect("should create storage");

        let doc1 = Document::with_title("First");
        let doc2 = Document::with_title("Second");

        storage.save_document(&doc1).expect("should save doc1");
        storage.save_document(&doc2).expect("should save doc2");

        let docs = storage.list_documents().expect("should list documents");
        assert_eq!(docs.len(), 2);
    }

    #[test]
    fn test_delete_document() {
        let storage = SqliteStorage::in_memory().expect("should create storage");

        let doc = Document::with_title("To Delete");
        storage.save_document(&doc).expect("should save document");

        storage
            .delete_document(&doc.id)
            .expect("should delete document");

        let result = storage.get_document(&doc.id);
        assert!(result.is_err());
    }
}
