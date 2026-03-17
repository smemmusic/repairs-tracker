"""
Inference rules for status suggestions and label changes.

Rules are defined as data (not hardcoded logic) so they can be served
to the frontend via GET /api/config. Both backend enforcement and
frontend preview use the same rule definitions.
"""

from typing import NamedTuple, Optional

from enums import InstrumentStatus, EntryType, LabelKey, LabelAction
from schemas import InferenceRule, StatusSuggestion, LabelSuggestions


class _LabelRule(NamedTuple):
    entry_type: Optional[EntryType]
    status: Optional[InstrumentStatus]
    label: LabelKey
    action: LabelAction


class _StatusRule(NamedTuple):
    entry_type: EntryType
    current_status: InstrumentStatus
    suggested_status: InstrumentStatus


LABEL_RULES: list[_LabelRule] = [
    _LabelRule(None, InstrumentStatus.BROKEN, LabelKey.NEEDS_REPAIR, LabelAction.ADD),
    _LabelRule(
        EntryType.FAULT_REPORT, None, LabelKey.NEEDS_INVESTIGATION, LabelAction.ADD
    ),
    _LabelRule(
        EntryType.ASSESSMENT,
        InstrumentStatus.WORKING,
        LabelKey.NEEDS_REPAIR,
        LabelAction.REMOVE,
    ),
    _LabelRule(
        EntryType.REPAIR,
        InstrumentStatus.WORKING,
        LabelKey.NEEDS_REPAIR,
        LabelAction.REMOVE,
    ),
    _LabelRule(
        EntryType.REPAIR,
        InstrumentStatus.WORKING,
        LabelKey.NEEDS_INVESTIGATION,
        LabelAction.REMOVE,
    ),
    _LabelRule(
        EntryType.REPAIR,
        InstrumentStatus.WORKING,
        LabelKey.NEEDS_PARTS,
        LabelAction.REMOVE,
    ),
    _LabelRule(EntryType.CLEANING, None, LabelKey.NEEDS_CLEANING, LabelAction.REMOVE),
]

STATUS_SUGGESTIONS: list[_StatusRule] = [
    _StatusRule(
        EntryType.FAULT_REPORT, InstrumentStatus.WORKING, InstrumentStatus.UNKNOWN
    ),
]


def infer_status_suggestion(
    entry_type: EntryType, current_status: InstrumentStatus
) -> InstrumentStatus | None:
    for rule in STATUS_SUGGESTIONS:
        if rule.entry_type == entry_type and rule.current_status == current_status:
            return rule.suggested_status
    return None


def infer_label_suggestions(
    entry_type: EntryType,
    effective_status: InstrumentStatus,
    current_labels: list[LabelKey],
) -> LabelSuggestions:
    suggestions: dict[LabelKey, LabelAction] = {}
    has = set(current_labels)

    for rule in LABEL_RULES:
        if rule.entry_type is not None and rule.entry_type != entry_type:
            continue
        if rule.status is not None and rule.status != effective_status:
            continue

        if rule.action == LabelAction.ADD and rule.label not in has:
            suggestions[rule.label] = rule.action
        elif rule.action == LabelAction.REMOVE and rule.label in has:
            suggestions[rule.label] = rule.action

    return LabelSuggestions(suggestions=suggestions)


def label_rules_as_config() -> list[InferenceRule]:
    return [
        InferenceRule(
            entryType=r.entry_type,
            status=r.status,
            label=r.label,
            action=r.action,
        )
        for r in LABEL_RULES
    ]


def status_suggestions_as_config() -> list[StatusSuggestion]:
    return [
        StatusSuggestion(
            entryType=r.entry_type,
            currentStatus=r.current_status,
            suggestedStatus=r.suggested_status,
        )
        for r in STATUS_SUGGESTIONS
    ]
