import json
import hashlib
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from urllib.parse import urlencode
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

from django.conf import settings


YANDEX_GEOCODER_URL = "https://geocode-maps.yandex.ru/v1/"
ALMATY_BBOX = "76.68,43.05~77.15,43.42"


@dataclass(frozen=True)
class GeocodingFailure:
    code: str
    detail: str


def _key_fingerprint(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()[:8]


def geocode_place(title: str, address: str, yandex_uri: str = "") -> tuple[Decimal, Decimal] | None:
    coords, _failure = geocode_place_with_diagnostics(title, address, yandex_uri)
    return coords


def geocode_place_with_diagnostics(
    title: str, address: str, yandex_uri: str = ""
) -> tuple[tuple[Decimal, Decimal] | None, GeocodingFailure | None]:
    api_key = settings.YANDEX_GEOCODER_API_KEY
    if not api_key:
        return None, GeocodingFailure("yandex_key_missing", "Backend YANDEX_GEOCODER_API_KEY is not configured.")

    query = ", ".join(part for part in (title.strip(), address.strip(), "Алматы") if part)
    uri = yandex_uri.strip()
    if not query and not uri:
        return None, GeocodingFailure("empty_query", "Geocoding query is empty.")

    params_data = {
        "apikey": api_key,
        "format": "json",
        "results": 1,
        "lang": "ru_RU",
    }
    if uri:
        params_data["uri"] = uri
    else:
        params_data.update(
            {
                "geocode": query,
                "bbox": ALMATY_BBOX,
                "rspn": 1,
            }
        )
    params = urlencode(params_data)

    try:
        with urlopen(f"{YANDEX_GEOCODER_URL}?{params}", timeout=4) as response:
            payload = json.loads(response.read().decode("utf-8"))
        feature_members = payload["response"]["GeoObjectCollection"]["featureMember"]
        if not feature_members:
            return None, GeocodingFailure("no_results", "Yandex Geocoder returned no results for this title/address.")
        longitude, latitude = feature_members[0]["GeoObject"]["Point"]["pos"].split()
        return (Decimal(latitude), Decimal(longitude)), None
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")[:400]
        return None, GeocodingFailure(
            f"yandex_http_{exc.code}",
            f"Yandex Geocoder returned HTTP {exc.code} using key fingerprint {_key_fingerprint(api_key)}. Response: {body or exc.reason}",
        )
    except URLError as exc:
        return None, GeocodingFailure("yandex_network_error", f"Yandex Geocoder network error: {exc.reason}")
    except TimeoutError:
        return None, GeocodingFailure("yandex_timeout", "Yandex Geocoder request timed out.")
    except (KeyError, IndexError, ValueError, InvalidOperation, json.JSONDecodeError) as exc:
        return None, GeocodingFailure("yandex_invalid_response", f"Yandex Geocoder returned an unexpected response: {exc}")
    except OSError as exc:
        return None, GeocodingFailure("yandex_request_error", f"Yandex Geocoder request failed: {exc}")
