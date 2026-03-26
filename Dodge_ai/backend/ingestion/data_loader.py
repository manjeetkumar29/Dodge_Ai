import glob
import json
import logging
import os
import re

import pandas as pd

from config import get_settings, resolve_data_dir

logger = logging.getLogger(__name__)

FIELD_ALIASES = {
    "AddressId": "AddressID",
    "AddressUuid": "AddressUUID",
    "ReferenceSdDocument": "ReferenceSDDocument",
    "ReferenceSdDocumentItem": "ReferenceSDDocumentItem",
}

FOLDER_FIELD_ALIASES = {
    "outbound_delivery_headers": {
        "DeliveryDocument": "OutboundDelivery",
    },
    "outbound_delivery_items": {
        "DeliveryDocument": "OutboundDelivery",
        "DeliveryDocumentItem": "DeliveryItem",
    },
    "payments_accounts_receivable": {
        "ClearingAccountingDocument": "ClearingDocument",
        "InvoiceReference": "ReferenceDocument",
        "InvoiceReferenceFiscalYear": "ReferenceDocumentFiscalYear",
    },
}


def _to_pascal_case(name: str) -> str:
    if not name:
        return name

    if "_" in name or "-" in name or " " in name:
        parts = [part for part in re.split(r"[_\-\s]+", name) if part]
        return "".join(part[:1].upper() + part[1:] for part in parts)

    return name[:1].upper() + name[1:]


def _normalize_column_name(folder_name: str, name: str) -> str:
    normalized = _to_pascal_case(name)
    normalized = FIELD_ALIASES.get(normalized, normalized)
    return FOLDER_FIELD_ALIASES.get(folder_name, {}).get(normalized, normalized)


def _normalize_value(value):
    if value is None:
        return None

    try:
        if pd.isna(value):
            return None
    except Exception:
        pass

    if isinstance(value, (dict, list)):
        return json.dumps(value, default=str)

    if isinstance(value, pd.Timestamp):
        return value.isoformat()

    return value


def _normalize_frame(df: pd.DataFrame, folder_name: str) -> pd.DataFrame:
    if df.empty:
        return df

    renamed = df.rename(columns=lambda name: _normalize_column_name(folder_name, str(name)))
    return renamed.map(_normalize_value)


def load_csv_folder(folder_name: str) -> pd.DataFrame:
    settings = get_settings()
    folder_path = os.path.join(str(resolve_data_dir(settings.DATA_DIR)), folder_name)

    if not os.path.exists(folder_path):
        logger.warning("Folder not found: %s", folder_path)
        return pd.DataFrame()

    files = glob.glob(os.path.join(folder_path, "**", "*.csv"), recursive=True)
    files += glob.glob(os.path.join(folder_path, "**", "*.parquet"), recursive=True)
    files += glob.glob(os.path.join(folder_path, "**", "*.jsonl"), recursive=True)
    files += glob.glob(os.path.join(folder_path, "*.csv"))
    files += glob.glob(os.path.join(folder_path, "*.parquet"))
    files += glob.glob(os.path.join(folder_path, "*.jsonl"))
    files = list(set(files))

    if not files:
        logger.warning("No CSV/parquet/jsonl files in: %s", folder_path)
        return pd.DataFrame()

    frames: list[pd.DataFrame] = []
    for file_path in files:
        try:
            if file_path.endswith(".parquet"):
                frame = pd.read_parquet(file_path)
            elif file_path.endswith(".jsonl"):
                frame = pd.read_json(file_path, lines=True)
            else:
                frame = pd.read_csv(file_path, low_memory=False)
            frame = _normalize_frame(frame, folder_name)
            frames.append(frame)
            logger.info("Loaded %s: %s rows", file_path, len(frame))
        except Exception as exc:
            logger.error("Error loading %s: %s", file_path, exc)

    if not frames:
        return pd.DataFrame()

    return pd.concat(frames, ignore_index=True)


def clean_row(row: dict) -> dict:
    return {key: (None if pd.isna(value) else value) for key, value in row.items()}


def df_to_records(df: pd.DataFrame) -> list[dict]:
    if df.empty:
        return []
    return [clean_row(row) for row in df.to_dict(orient="records")]
