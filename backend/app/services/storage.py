from pathlib import Path
from app.core.config import (
    APP_ENV,
    AWS_ACCESS_KEY_ID,
    AWS_REGION,
    AWS_S3_BUCKET,
    AWS_SECRET_ACCESS_KEY,
    STORAGE_BACKEND,
)


class StorageConfigurationError(Exception):
    pass


class StorageNotFoundError(Exception):
    pass


class StorageOperationError(Exception):
    pass


class LocalStorage:
    def __init__(self, root: Path):
        self.root = root

    def upload(self, source: Path, key: str, content_type: str) -> None:
        destination = self.root / key
        destination.parent.mkdir(parents=True, exist_ok=True)
        source.replace(destination)

    def download(self, key: str, destination: Path) -> None:
        source = self.root / key
        if not source.is_file():
            raise StorageNotFoundError
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(source.read_bytes())

    def read(self, key: str) -> bytes:
        source = self.root / key
        if not source.is_file():
            raise StorageNotFoundError
        return source.read_bytes()

    def delete(self, key: str) -> None:
        path = self.root / key
        if not path.is_file():
            raise StorageNotFoundError
        path.unlink()


class S3Storage:
    def __init__(self, bucket: str, region: str):
        try:
            import boto3
            from botocore.exceptions import BotoCoreError, ClientError
        except ImportError as exc:
            raise StorageConfigurationError("S3 storage dependency is not installed.") from exc
        self._client = boto3.client(
            "s3",
            region_name=region,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        )
        self._bucket = bucket
        self._client_errors = (BotoCoreError, ClientError)

    def upload(self, source: Path, key: str, content_type: str) -> None:
        try:
            self._client.upload_file(
                str(source),
                self._bucket,
                key,
                ExtraArgs={"ContentType": content_type},
            )
        except self._client_errors as exc:
            raise StorageOperationError from exc

    def download(self, key: str, destination: Path) -> None:
        destination.parent.mkdir(parents=True, exist_ok=True)
        try:
            self._client.download_file(self._bucket, key, str(destination))
        except self._client_errors as exc:
            if getattr(exc, "response", {}).get("Error", {}).get("Code") in {"404", "NoSuchKey"}:
                raise StorageNotFoundError from exc
            raise StorageOperationError from exc

    def read(self, key: str) -> bytes:
        try:
            return self._client.get_object(Bucket=self._bucket, Key=key)["Body"].read()
        except self._client_errors as exc:
            if getattr(exc, "response", {}).get("Error", {}).get("Code") in {"404", "NoSuchKey"}:
                raise StorageNotFoundError from exc
            raise StorageOperationError from exc

    def delete(self, key: str) -> None:
        try:
            self._client.delete_object(Bucket=self._bucket, Key=key)
        except self._client_errors as exc:
            raise StorageOperationError from exc


def get_storage(root: Path) -> LocalStorage | S3Storage:
    if STORAGE_BACKEND == "s3" or (APP_ENV == "production" and AWS_S3_BUCKET):
        if not AWS_S3_BUCKET or not AWS_REGION:
            raise StorageConfigurationError("S3 storage is not configured.")
        return S3Storage(AWS_S3_BUCKET, AWS_REGION)
    if APP_ENV == "production":
        raise StorageConfigurationError("Production storage must use configured S3.")
    return LocalStorage(root)
