"""
migrate_to_supabase.py
======================
One-shot script to:
  1. Verify Supabase PostgreSQL connectivity
  2. Apply the full schema via supabase_migration.sql
  3. Migrate all data from local phishguard.db (SQLite) -> Supabase
  4. Reset all SERIAL sequences so future inserts get correct IDs

Run from the backend directory:
    .venv\\Scripts\\python.exe migrate_to_supabase.py [--schema-only | --data-only | --check]
"""

import argparse
import os
import sqlite3
import sys
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

# -- Load env ------------------------------------------------------------------
load_dotenv(Path(__file__).parent / ".env")

PROJECT_REF = os.getenv("SUPABASE_PROJECT_ID", "ezjmrpdqgiicfprkgadi")
DB_PASSWORD  = os.getenv("SUPABASE_DB_PASSWORD", "")

# If DATABASE_URL is set explicitly in .env, use it directly (highest priority)
# Otherwise build the pooler URL from project ref + password
EXPLICIT_DB_URL = os.getenv("DATABASE_URL", "")

if EXPLICIT_DB_URL:
    SUPABASE_DIRECT_URL = EXPLICIT_DB_URL
else:
    # Session-mode pooler (port 5432) supports DDL; transaction-mode (6543) does not.
    SUPABASE_DIRECT_URL = (
        f"postgresql://postgres.{PROJECT_REF}:{DB_PASSWORD}"
        f"@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
        f"?sslmode=require"
    )

SQLITE_PATH = Path(__file__).parent / "phishguard.db"
SCHEMA_SQL  = Path(__file__).parent / "supabase_migration.sql"

# FK-safe insertion order (parents before children)
TABLES_IN_ORDER = [
    "roles",
    "organizations",
    "departments",
    "users",
    "lessons",
    "quizzes",
    "refresh_tokens",
    "campaigns",
    "email_templates",
    "campaign_targets",
    "email_events",
    "quiz_attempts",
    "certificates",
    "lesson_assignments",
    "notifications",
    "reports",
    "risk_scores",
    "user_metrics",
]

# Tables with a SERIAL 'id' column that need sequence resets
SERIAL_TABLES = [
    "roles", "organizations", "departments", "users", "lessons", "quizzes",
    "refresh_tokens", "campaigns", "email_templates", "campaign_targets",
    "email_events", "quiz_attempts", "certificates", "lesson_assignments",
    "notifications", "reports", "risk_scores",
]


# -- Helpers -------------------------------------------------------------------

def pg_connect():
    """Return a psycopg2 connection to Supabase."""
    print(f"  Connecting to Supabase project {PROJECT_REF} ...")
    conn = psycopg2.connect(SUPABASE_DIRECT_URL)
    conn.autocommit = False
    print("  [OK] Connected!")
    return conn


def sqlite_connect():
    """Return a sqlite3 connection to phishguard.db."""
    if not SQLITE_PATH.exists():
        print(f"  [WARN] SQLite file not found: {SQLITE_PATH}")
        return None
    conn = sqlite3.connect(str(SQLITE_PATH))
    conn.row_factory = sqlite3.Row
    return conn


# -- Step 1: Connectivity check ------------------------------------------------

def check_connectivity():
    print("\n[1/4] Checking Supabase connectivity ...")
    if not DB_PASSWORD and not EXPLICIT_DB_URL:
        print("  [ERR] SUPABASE_DB_PASSWORD is not set in .env")
        print("  [ERR] Alternatively, set DATABASE_URL=<full connection string> in .env")
        sys.exit(1)
    try:
        conn = pg_connect()
        cur = conn.cursor()
        cur.execute("SELECT version();")
        row = cur.fetchone()
        print(f"  PostgreSQL: {row[0][:70]}")
        conn.close()
        print("  [OK] Connectivity check passed\n")
        return True
    except Exception as e:
        print(f"  [ERR] Connection failed: {e}")
        print()
        print("To fix this:")
        print("  1. Go to: https://supabase.com/dashboard/project/<your-project>/settings/database")
        print("  2. Scroll to 'Connection string' -> 'URI' tab")
        print("  3. Copy the connection string (replace [YOUR-PASSWORD] with your actual password)")
        print("  4. Add it to backend/.env as:")
        print("       DATABASE_URL=postgresql://postgres.<ref>:<pass>@<host>:5432/postgres?sslmode=require")
        print()
        print("  Common issues:")
        print("  * Free-tier projects pause after 1 week of inactivity - resume in dashboard")
        print("  * Wrong project ID in SUPABASE_PROJECT_ID")
        print("  * Wrong region (we are using ap-south-1, yours might differ)")
        sys.exit(1)


# -- Step 2: Apply schema ------------------------------------------------------

def apply_schema(conn):
    print("[2/4] Applying supabase_migration.sql ...")
    if not SCHEMA_SQL.exists():
        print(f"  [ERR] Schema file not found: {SCHEMA_SQL}")
        sys.exit(1)

    sql_text = SCHEMA_SQL.read_text(encoding="utf-8")
    cur = conn.cursor()
    try:
        cur.execute(sql_text)
        conn.commit()
        print("  [OK] Schema applied\n")
    except Exception as e:
        conn.rollback()
        print(f"  [ERR] Schema failed: {e}")
        raise


# -- Step 3: Migrate data ------------------------------------------------------

def sqlite_col_names(sqlite_conn, table):
    cur = sqlite_conn.cursor()
    cur.execute(f"PRAGMA table_info({table})")
    return [r["name"] for r in cur.fetchall()]


def pg_col_names(pg_conn, table):
    cur = pg_conn.cursor()
    cur.execute(
        """SELECT column_name FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = %s
           ORDER BY ordinal_position""",
        (table,),
    )
    return [r[0] for r in cur.fetchall()]


def pg_bool_cols(pg_conn, table):
    """Return set of column names that are boolean type in PostgreSQL."""
    cur = pg_conn.cursor()
    cur.execute(
        """SELECT column_name FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = %s
           AND data_type = 'boolean'""",
        (table,),
    )
    return {r[0] for r in cur.fetchall()}


def migrate_table(sqlite_conn, pg_conn, table):
    s_cur = sqlite_conn.cursor()
    p_cur = pg_conn.cursor()

    # Does the SQLite table exist?
    s_cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
    if not s_cur.fetchone():
        print(f"    [SKIP] '{table}' - not in SQLite")
        return 0

    s_cur.execute(f"SELECT * FROM {table}")
    rows = s_cur.fetchall()
    if not rows:
        print(f"    [SKIP] '{table}' - empty")
        return 0

    s_cols = sqlite_col_names(sqlite_conn, table)
    p_cols = pg_col_names(pg_conn, table)
    bool_cols = pg_bool_cols(pg_conn, table)
    common = [c for c in s_cols if c in p_cols]
    if not common:
        print(f"    [SKIP] '{table}' - no matching columns")
        return 0

    idx = {c: i for i, c in enumerate(s_cols)}

    def cast_val(col, val):
        # SQLite stores booleans as integers (0/1); PostgreSQL needs True/False
        if col in bool_cols and val is not None:
            return bool(val)
        return val

    data = [tuple(cast_val(c, row[idx[c]]) for c in common) for row in rows]

    cols_sql = ", ".join(f'"{c}"' for c in common)
    insert_sql = f'INSERT INTO public."{table}" ({cols_sql}) VALUES %s ON CONFLICT DO NOTHING'

    try:
        execute_values(p_cur, insert_sql, data, page_size=500)
        pg_conn.commit()
        print(f"    [OK] '{table}' - {len(data)} rows")
        return len(data)
    except Exception:
        pg_conn.rollback()
        # Batch failed (FK violation). Fall back to row-by-row, skipping bad rows.
        placeholders = ", ".join(["%s"] * len(common))
        single_sql = f'INSERT INTO public."{table}" ({cols_sql}) VALUES ({placeholders}) ON CONFLICT DO NOTHING'
        ok = 0
        skipped = 0
        for row_data in data:
            try:
                p_cur.execute(single_sql, row_data)
                pg_conn.commit()
                ok += 1
            except Exception:
                pg_conn.rollback()
                skipped += 1
        if skipped:
            print(f"    [OK] '{table}' - {ok} rows ({skipped} skipped, orphaned FK)")
        else:
            print(f"    [OK] '{table}' - {ok} rows")
        return ok


def reset_sequences(pg_conn):
    print("\n  Resetting SERIAL sequences ...")
    cur = pg_conn.cursor()
    for table in SERIAL_TABLES:
        try:
            cur.execute(f"""
                SELECT setval(
                    pg_get_serial_sequence('public.{table}', 'id'),
                    COALESCE((SELECT MAX(id) FROM public.{table}), 0) + 1,
                    false
                );
            """)
            pg_conn.commit()
            print(f"    [OK] Reset seq: {table}")
        except Exception as e:
            pg_conn.rollback()
            print(f"    [WARN] Seq reset failed for '{table}': {e}")


def migrate_data(pg_conn):
    print("[3/4] Migrating data from SQLite -> Supabase ...")
    sqlite_conn = sqlite_connect()
    if sqlite_conn is None:
        print("  [INFO] No SQLite DB found - skipping data migration (fresh start).\n")
        return

    total = 0
    for table in TABLES_IN_ORDER:
        total += migrate_table(sqlite_conn, pg_conn, table)

    reset_sequences(pg_conn)
    sqlite_conn.close()
    print(f"\n  [OK] Data migration complete - {total} rows migrated\n")


# -- Step 4: Verify ------------------------------------------------------------

def verify(pg_conn):
    print("[4/4] Verifying table counts ...")
    cur = pg_conn.cursor()
    ok = True
    for table in TABLES_IN_ORDER:
        try:
            cur.execute(f"SELECT COUNT(*) FROM public.{table}")
            count = cur.fetchone()[0]
            print(f"    {table:<28} {count:>6} rows")
        except Exception as e:
            print(f"    {table:<28} ERROR: {e}")
            ok = False
    print()
    if ok:
        print("  [OK] All tables accessible\n")
    else:
        print("  [WARN] Some errors above - check Supabase dashboard\n")


# -- Main ----------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Migrate PhishGuard -> Supabase")
    parser.add_argument("--check",       action="store_true", help="Only test connectivity")
    parser.add_argument("--schema-only", action="store_true", help="Apply schema, skip data")
    parser.add_argument("--data-only",   action="store_true", help="Migrate data, skip schema")
    args = parser.parse_args()

    print("=" * 60)
    print("  PhishGuard -> Supabase Migration")
    print("=" * 60)

    check_connectivity()

    if args.check:
        print("Connectivity OK. Exiting (--check mode).")
        return

    conn = pg_connect()
    try:
        if not args.data_only:
            apply_schema(conn)

        if not args.schema_only:
            migrate_data(conn)

        verify(conn)
    finally:
        conn.close()

    print("=" * 60)
    print("  [DONE] Migration complete! Your app now uses Supabase.")
    print("=" * 60)
    print()
    print("Next steps:")
    print("  1. Restart your backend:  uvicorn app.main:app --reload")
    print("  2. Test an API endpoint:  GET /health")
    print("  3. Check Supabase Dashboard -> Table Editor")
    print()


if __name__ == "__main__":
    main()
