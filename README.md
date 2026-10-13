# Intake triage app

## Database setup

Install the backend dependency with `python3 -m pip install -r requirements.txt`.
Run `python3 -m backend.database` from this directory to create the SQLite
`intakes` table. The default database is `backend/data/intakes.db`. Set
`DATABASE_URL` to use another SQLite database URL.

`backend.models.Intake` is a SQLAlchemy mapped dataclass. Its intake fields are
`title`, `description`, `budget_range`, `timeline`, `industry` (all strings),
and `created_at` (a UTC `datetime` assigned when the object is created). The
database also assigns each record an integer primary key.

Run the database test with `python3 -m pytest tests/test_database.py`.
