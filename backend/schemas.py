import datetime
from typing import Optional

from pydantic import BaseModel, Field

from enums import InstrumentStatus, EntryType, LabelKey, LabelAction


# ── Domain (internal) ────────────────────────────────────────────────

class InstrumentState(BaseModel):
    """Computed state derived from an instrument's log entries."""
    status: InstrumentStatus
    score: Optional[int] = None
    labels: list[LabelKey] = []
    location: Optional[str] = None
    display_ready: bool


class GuestOverrides(BaseModel):
    """Server-inferred values applied to guest fault reports."""
    status: Optional[InstrumentStatus] = None
    labels_added: list[LabelKey] = []
    labels_removed: list[LabelKey] = []


class LabelSuggestions(BaseModel):
    """Inferred label changes keyed by label."""
    suggestions: dict[LabelKey, LabelAction] = {}


# ── Auth ─────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    user_id: str
    password: str


class UserResponse(BaseModel):
    id: str
    name: str


LoginUser = UserResponse


class Capabilities(BaseModel):
    viewLogHistory: bool = False
    viewScores: bool = False
    submitFaultReport: bool = False
    submitOtherEntryTypes: bool = False
    setStatus: bool = False
    setLabels: bool = False
    editLogEntry: bool = False
    deleteLogEntry: bool = False


class SessionResponse(BaseModel):
    user: Optional[UserResponse] = None
    capabilities: Capabilities


# ── Attachments ──────────────────────────────────────────────────────

class AttachmentResponse(BaseModel):
    id: str
    file_name: str
    mime_type: str
    url: str


# ── Log Entries ──────────────────────────────────────────────────────

class LogEntryResponse(BaseModel):
    id: str
    type: EntryType
    date: datetime.date
    contributor_id: Optional[str] = None
    contributor_name: Optional[str] = None
    notes: str
    status: Optional[InstrumentStatus] = None
    score: Optional[int] = None
    location: Optional[str] = None
    labels_added: list[LabelKey] = []
    labels_removed: list[LabelKey] = []
    attachments: list[AttachmentResponse] = []


class AddLogEntryRequest(BaseModel):
    type: EntryType
    date: Optional[datetime.date] = None
    notes: str
    status: Optional[InstrumentStatus] = None
    score: Optional[int] = Field(default=None, ge=1, le=10)
    location: Optional[str] = None
    labels_added: list[LabelKey] = []
    labels_removed: list[LabelKey] = []
    attachment_ids: list[str] = []


class EditLogEntryRequest(BaseModel):
    """
    All fields optional. Only fields present in the JSON body are applied.
    Use `body.model_fields_set` to check which fields were explicitly sent.
    """
    notes: Optional[str] = None
    status: Optional[InstrumentStatus] = None
    score: Optional[int] = Field(default=None, ge=1, le=10)
    location: Optional[str] = None
    labels_added: Optional[list[LabelKey]] = None
    labels_removed: Optional[list[LabelKey]] = None


# ── Instruments ──────────────────────────────────────────────────────

class InstrumentSummary(BaseModel):
    id: str
    airtable_id: str
    display_name: str
    serial_number: Optional[str] = None
    status: InstrumentStatus
    score: Optional[int] = None
    labels: list[LabelKey] = []
    location: Optional[str] = None
    display_ready: bool
    log_count: int = 0


class InstrumentDetail(InstrumentSummary):
    log: list[LogEntryResponse] = []


class AddLogEntryResponse(BaseModel):
    instrument: InstrumentDetail
    logEntry: LogEntryResponse


class MutateInstrumentResponse(BaseModel):
    instrument: InstrumentDetail


# ── Dashboard ────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total: int
    statusCounts: dict[str, int]
    labelCounts: dict[str, int]
    displayReady: int
    needsAttention: int


class ActivityEntry(LogEntryResponse):
    instrumentId: str
    instrumentName: str


# ── Config ───────────────────────────────────────────────────────────

class StatusDef(BaseModel):
    key: InstrumentStatus
    label: str


class EntryTypeDef(BaseModel):
    key: EntryType
    label: str


class LabelDef(BaseModel):
    key: LabelKey
    label: str
    cls: str


class InferenceRule(BaseModel):
    entryType: Optional[EntryType] = None
    status: Optional[InstrumentStatus] = None
    label: LabelKey
    action: LabelAction


class StatusSuggestion(BaseModel):
    entryType: EntryType
    currentStatus: InstrumentStatus
    suggestedStatus: InstrumentStatus


class ConfigResponse(BaseModel):
    statuses: list[StatusDef]
    entryTypes: list[EntryTypeDef]
    labels: list[LabelDef]
    displayReadyThreshold: int
    inferenceRules: list[InferenceRule]
    statusSuggestions: list[StatusSuggestion]
