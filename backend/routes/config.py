from fastapi import APIRouter

from enums import InstrumentStatus, EntryType, LabelKey
from inference import label_rules_as_config, status_suggestions_as_config
from config import DISPLAY_READY_THRESHOLD
from schemas import ConfigResponse, StatusDef, EntryTypeDef, LabelDef

router = APIRouter(tags=["config"])


@router.get("/config", response_model=ConfigResponse)
def get_config():
    return ConfigResponse(
        statuses=[
            StatusDef(key=s, label=s.value.replace("_", " ").title())
            for s in InstrumentStatus
        ],
        entryTypes=[
            EntryTypeDef(key=t, label=t.value.replace("_", " ").title())
            for t in EntryType
        ],
        labels=[
            LabelDef(key=l, label=l.value.replace("_", " ").title(), cls=f"label-{l.value}")
            for l in LabelKey
        ],
        displayReadyThreshold=DISPLAY_READY_THRESHOLD,
        inferenceRules=label_rules_as_config(),
        statusSuggestions=status_suggestions_as_config(),
    )
