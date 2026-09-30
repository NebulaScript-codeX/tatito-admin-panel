from django.conf import settings
from pymongo import MongoClient

_client = None


def get_mongo_database():
    """Shared, lazily created connection to the Node app's MongoDB (source of truth)."""
    global _client
    if _client is None:
        _client = MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
    return _client[settings.MONGO_DATABASE]
