from enum import Enum


class InstrumentStatus(str, Enum):
    UNKNOWN = "unknown"
    BROKEN = "broken"
    WORKING = "working"
    RETIRED = "retired"
    DISPOSED = "disposed"


class EntryType(str, Enum):
    FAULT_REPORT = "fault_report"
    ASSESSMENT = "assessment"
    REPAIR = "repair"
    CLEANING = "cleaning"
    OTHER = "other"


class LabelKey(str, Enum):
    NEEDS_REPAIR = "needs_repair"
    NEEDS_INVESTIGATION = "needs_investigation"
    NEEDS_CLEANING = "needs_cleaning"
    NEEDS_PARTS = "needs_parts"


class LabelAction(str, Enum):
    ADD = "add"
    REMOVE = "remove"
