import uuid
from datetime import date, datetime
from typing import Optional

from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, JSON

from enums import InstrumentStatus, EntryType


class Contributor(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    drupal_user_id: Optional[str] = None
    name: str
    contact: Optional[str] = None

    log_entries: list["LogEntry"] = Relationship(back_populates="contributor")


class Instrument(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    airtable_id: str = Field(unique=True)
    display_name: str
    serial_number: Optional[str] = None
    last_synced_at: datetime = Field(default_factory=datetime.utcnow)

    log_entries: list["LogEntry"] = Relationship(
        back_populates="instrument",
        sa_relationship_kwargs={"order_by": "LogEntry.performed_at, LogEntry.created_at"},
    )


class LogEntry(SQLModel, table=True):
    __tablename__ = "log_entry"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    instrument_id: str = Field(foreign_key="instrument.id")
    contributor_id: Optional[str] = Field(default=None, foreign_key="contributor.id")
    performed_at: date
    created_at: datetime = Field(default_factory=datetime.utcnow)
    entry_type: EntryType
    notes: str
    status: Optional[InstrumentStatus] = None
    condition_score: Optional[int] = Field(default=None, ge=1, le=10)
    location: Optional[str] = None
    labels_added: list[str] = Field(default_factory=list, sa_column=Column(JSON, default=[]))
    labels_removed: list[str] = Field(default_factory=list, sa_column=Column(JSON, default=[]))

    instrument: Optional[Instrument] = Relationship(back_populates="log_entries")
    contributor: Optional[Contributor] = Relationship(back_populates="log_entries")
    attachments: list["Attachment"] = Relationship(back_populates="log_entry")


class Attachment(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    log_entry_id: str = Field(foreign_key="log_entry.id")
    file_path: str
    file_name: str
    mime_type: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)

    log_entry: Optional[LogEntry] = Relationship(back_populates="attachments")
