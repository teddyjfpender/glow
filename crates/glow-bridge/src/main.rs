//! Glow Bridge - Local server for AI-powered document feedback.
//!
//! This binary provides a bridge between static web apps (like GitHub Pages)
//! and local AI executors (Claude Code, Codex, etc.).
//!
//! # Usage
//!
//! ```bash
//! # Start the bridge server
//! glow-bridge serve
//!
//! # Start on a specific port
//! glow-bridge serve --port 3847
//!
//! # Check available executors
//! glow-bridge check
//! ```

use clap::{Parser, Subcommand};
use tracing::info;
use tracing_subscriber::EnvFilter;

mod api;
mod server;
mod state;

/// Glow Bridge - Local server for AI document feedback.
#[derive(Parser)]
#[command(name = "glow-bridge")]
#[command(about = "Local bridge server for Glow AI features")]
#[command(version)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Start the bridge server.
    Serve {
        /// Port to listen on.
        #[arg(short, long, default_value = "3847")]
        port: u16,

        /// Host to bind to.
        #[arg(long, default_value = "127.0.0.1")]
        host: String,

        /// Allowed origins for CORS (comma-separated).
        #[arg(long, default_value = "http://localhost:5173,http://127.0.0.1:5173")]
        allowed_origins: String,
    },

    /// Check available executors.
    Check {
        /// Specific executor to check.
        #[arg(short, long)]
        executor: Option<String>,
    },
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    let cli = Cli::parse();

    match cli.command {
        Commands::Serve { port, host, allowed_origins } => {
            info!(host = %host, port = %port, "Starting Glow Bridge server");

            let origins: Vec<String> =
                allowed_origins.split(',').map(|s| s.trim().to_owned()).collect();

            server::start(&host, port, &origins).await?;
        }

        Commands::Check { executor } => {
            check_executors(executor).await?;
        }
    }

    Ok(())
}

async fn check_executors(executor_name: Option<String>) -> anyhow::Result<()> {
    use glow_executors::{BaseDocumentAgent, StandardDocumentExecutor, executors::ClaudeCode};

    println!("Checking available executors...\n");

    let executors: Vec<(BaseDocumentAgent, Box<dyn Fn() -> glow_executors::AvailabilityInfo>)> =
        vec![(
            BaseDocumentAgent::ClaudeCode,
            Box::new(|| ClaudeCode::default().get_availability_info()),
        )];

    for (agent, check_fn) in executors {
        let name = format!("{agent}");

        if let Some(ref filter) = executor_name {
            if !name.to_lowercase().contains(&filter.to_lowercase()) {
                continue;
            }
        }

        let info = check_fn();
        let status = match info {
            glow_executors::AvailabilityInfo::Available => "✓ Available",
            glow_executors::AvailabilityInfo::InstallationFound => "◐ Installation found",
            glow_executors::AvailabilityInfo::NotFound => "✗ Not found",
            glow_executors::AvailabilityInfo::Unavailable { ref reason } => {
                println!("  {name}: ✗ Unavailable ({reason})");
                continue;
            }
        };

        println!("  {name}: {status}");
    }

    println!();
    Ok(())
}
