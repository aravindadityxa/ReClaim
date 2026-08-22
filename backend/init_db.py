#!/usr/bin/env python
"""Initialize database and seed with data."""

from seed import seed_database

if __name__ == "__main__":
    print("Initializing ReClaim database...")
    seed_database()
    print("\n✓ Database initialized successfully!")
    print("Ready to start the backend with: python main.py")
