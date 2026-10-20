import os
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, Session


class Base(DeclarativeBase):
    pass


@lru_cache(maxsize=8)
def engine_for_url(url):
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    options = {"pool_pre_ping": True}
    if make_url(url).get_backend_name() == "postgresql":
        # One demo worker uses at most five database connections.
        options.update(pool_size=3, max_overflow=2)
    return create_engine(url, **options)


def database_url():
    url = os.environ.get("DATABASE_URL", "sqlite:///./barangai-dev.db")
    if url.startswith("postgres://"):
        return "postgresql://" + url[len("postgres://"):]
    return url


def session_for_url():
    return Session(engine_for_url(database_url()))


def get_db():
    with session_for_url() as db:
        yield db
