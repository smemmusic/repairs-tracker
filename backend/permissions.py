from fastapi import HTTPException

from enums import EntryType, LabelAction, LabelKey, InstrumentStatus
from inference import infer_status_suggestion, infer_label_suggestions
from schemas import Capabilities, GuestOverrides

AUTHENTICATED_CAPABILITIES = Capabilities(
    viewLogHistory=True,
    viewScores=True,
    submitFaultReport=True,
    submitOtherEntryTypes=True,
    setStatus=True,
    setLabels=True,
    editLogEntry=True,
    deleteLogEntry=True,
)

GUEST_CAPABILITIES = Capabilities(
    submitFaultReport=True,
)


def authorize_add_entry(entry_type: EntryType, has_status: bool, has_labels: bool, caps: Capabilities):
    is_fault_report = entry_type == EntryType.FAULT_REPORT
    if is_fault_report and not caps.submitFaultReport:
        raise HTTPException(403, "Permission denied: cannot submit fault reports")
    if not is_fault_report and not caps.submitOtherEntryTypes:
        raise HTTPException(403, "Permission denied: login required for this entry type")
    if has_status and not caps.setStatus and not is_fault_report:
        raise HTTPException(403, "Permission denied: login required to set status")
    if has_labels and not caps.setLabels and not is_fault_report:
        raise HTTPException(403, "Permission denied: login required to modify labels")


def enforce_guest_overrides(
    entry_type: EntryType,
    current_status: InstrumentStatus,
    current_labels: list[LabelKey],
    caps: Capabilities,
) -> GuestOverrides | None:
    """
    For guest fault reports, compute the server-inferred status and label changes.
    Returns GuestOverrides if overrides are needed, None otherwise.
    """
    if entry_type != EntryType.FAULT_REPORT:
        return None
    if caps.setStatus and caps.setLabels:
        return None

    status = None
    labels_added: list[LabelKey] = []
    labels_removed: list[LabelKey] = []

    if not caps.setStatus:
        status = infer_status_suggestion(EntryType.FAULT_REPORT, current_status)

    if not caps.setLabels:
        effective_status = status or current_status
        result = infer_label_suggestions(EntryType.FAULT_REPORT, effective_status, current_labels)
        labels_added = [k for k, v in result.suggestions.items() if v == LabelAction.ADD]
        labels_removed = [k for k, v in result.suggestions.items() if v == LabelAction.REMOVE]

    return GuestOverrides(
        status=status,
        labels_added=labels_added,
        labels_removed=labels_removed,
    )


def authorize_edit_entry(caps: Capabilities):
    if not caps.editLogEntry:
        raise HTTPException(403, "Permission denied: login required to edit log entries")


def authorize_delete_entry(caps: Capabilities):
    if not caps.deleteLogEntry:
        raise HTTPException(403, "Permission denied: login required to delete log entries")


def filter_log_for_view(log_entries: list, caps: Capabilities) -> list:
    """Strip log history for users without viewLogHistory capability."""
    if not caps.viewLogHistory:
        return []
    return log_entries
