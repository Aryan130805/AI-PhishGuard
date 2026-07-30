import sqlite3

conn = sqlite3.connect('phishguard.db')
cur = conn.cursor()

cols_to_add = [
    ('category', "VARCHAR DEFAULT 'Phishing Attacks'"),
    ('difficulty', "VARCHAR DEFAULT 'Beginner'"),
    ('summary', 'VARCHAR'),
    ('is_emerging_threat', 'BOOLEAN DEFAULT 0'),
    ('cve_id', 'VARCHAR'),
    ('published_date', 'VARCHAR'),
]

cur.execute('PRAGMA table_info(lessons)')
existing = [r[1] for r in cur.fetchall()]
print('Existing cols:', existing)

for col_name, col_type in cols_to_add:
    if col_name not in existing:
        cur.execute(f'ALTER TABLE lessons ADD COLUMN {col_name} {col_type}')
        print(f'Added column: {col_name}')
    else:
        print(f'Already exists: {col_name}')

# Update existing lessons that have NULL category/difficulty
cur.execute("UPDATE lessons SET category='Phishing Attacks' WHERE category IS NULL")
cur.execute("UPDATE lessons SET difficulty='Beginner' WHERE difficulty IS NULL")
cur.execute("UPDATE lessons SET is_emerging_threat=0 WHERE is_emerging_threat IS NULL")
print(f'Updated {cur.rowcount} existing lessons with default category/difficulty')

conn.commit()
print('Done.')

# Verify
cur.execute('PRAGMA table_info(lessons)')
cols = cur.fetchall()
print('Final cols:', [c[1] for c in cols])
cur.execute('SELECT id, title, category, difficulty FROM lessons')
rows = cur.fetchall()
print(f'Total lessons: {len(rows)}')
for r in rows:
    print(f'  id={r[0]} title={r[1][:40]} cat={r[2]} diff={r[3]}')

conn.close()
