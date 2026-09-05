import pytest

from app.services import storage


def test_local_storage_round_trip(tmp_path):
    source = tmp_path / "source.txt"
    source.write_bytes(b"hello")
    backend = storage.LocalStorage(tmp_path / "objects")

    backend.upload(source, "study-materials/1/file.txt", "text/plain")

    destination = tmp_path / "download.txt"
    backend.download("study-materials/1/file.txt", destination)
    assert destination.read_bytes() == b"hello"
    backend.delete("study-materials/1/file.txt")
    with pytest.raises(storage.StorageNotFoundError):
        backend.read("study-materials/1/file.txt")


def test_production_requires_s3_configuration(monkeypatch, tmp_path):
    monkeypatch.setattr(storage, "APP_ENV", "production")
    monkeypatch.setattr(storage, "STORAGE_BACKEND", "local")
    monkeypatch.setattr(storage, "AWS_S3_BUCKET", None)
    with pytest.raises(storage.StorageConfigurationError):
        storage.get_storage(tmp_path)


def test_s3_storage_uses_private_object_operations(monkeypatch, tmp_path):
    calls = []

    class FakeClient:
        def upload_file(self, source, bucket, key, ExtraArgs):
            calls.append(("upload", source, bucket, key, ExtraArgs))

        def get_object(self, Bucket, Key):
            calls.append(("read", Bucket, Key))
            return {"Body": type("Body", (), {"read": lambda self: b"content"})()}

        def delete_object(self, Bucket, Key):
            calls.append(("delete", Bucket, Key))

    monkeypatch.setattr("boto3.client", lambda *args, **kwargs: FakeClient())
    source = tmp_path / "source.txt"
    source.write_bytes(b"content")
    backend = storage.S3Storage("private-bucket", "us-east-1")

    backend.upload(source, "study-materials/7/abc.txt", "text/plain")
    assert backend.read("study-materials/7/abc.txt") == b"content"
    backend.delete("study-materials/7/abc.txt")
    assert calls[0][0] == "upload"
    assert calls[0][2:] == (
        "private-bucket",
        "study-materials/7/abc.txt",
        {"ContentType": "text/plain"},
    )
    assert calls[-1] == ("delete", "private-bucket", "study-materials/7/abc.txt")
