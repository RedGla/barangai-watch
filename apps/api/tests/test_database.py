import io
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from barangai.db import database_url, engine_for_url


def migration_config(output=None):
    config = Config(stdout=output)
    config.set_main_option("script_location", str(Path(__file__).resolve().parents[1] / "migrations"))
    return config


def test_legacy_postgres_url_and_percent_encoded_password(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgres://synthetic:p%40ss@localhost/example?sslmode=require")
    assert database_url() == "postgresql://synthetic:p%40ss@localhost/example?sslmode=require"
    engine = engine_for_url(database_url())
    assert engine.url.password == "p@ss"
    assert engine.pool.size() == 3
    engine.dispose()


def test_postgres_migration_sql_protects_every_application_table(monkeypatch):
    from barangai.db import Base
    from barangai import models  # Register the application tables.

    monkeypatch.setenv("DATABASE_URL", "postgres://synthetic:p%40ss@localhost/example")
    output = io.StringIO()
    config = migration_config(output)
    config.output_buffer = output
    command.upgrade(config, "head", sql=True)
    sql = output.getvalue()
    for table in (*Base.metadata.tables, "alembic_version"):
        assert f'ALTER TABLE public."{table}" ENABLE ROW LEVEL SECURITY' in sql
    assert "CREATE POLICY" not in sql
    assert "FORCE ROW LEVEL SECURITY" not in sql


def test_sqlite_migration_upgrade_and_rollback_keep_existing_data(tmp_path, monkeypatch):
    url = f"sqlite:///{(tmp_path / 'migration.db').as_posix()}"
    monkeypatch.setenv("DATABASE_URL", url)
    config = migration_config()
    command.upgrade(config, "0003")
    engine = engine_for_url(url)
    with engine.begin() as connection:
        connection.exec_driver_sql(
            "INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)",
            ("synthetic-user", "synthetic@example.test", "not-a-real-password", "resident"),
        )
    command.upgrade(config, "head")
    command.downgrade(config, "0003")
    with engine.connect() as connection:
        assert connection.exec_driver_sql("SELECT email FROM users").scalar_one() == "synthetic@example.test"
    assert "notifications" in inspect(engine).get_table_names()
    engine.dispose()
