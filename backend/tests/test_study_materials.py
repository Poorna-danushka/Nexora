import io
import zipfile

from tests.test_users import _auth_headers


def _subject_headers(client):
    headers = _auth_headers(client, "materials-owner@university.edu", "Materials Owner")
    subject = client.post("/subjects", json={"name": "Security"}, headers=headers).json()
    return headers, subject["id"]


def _docx_bytes(prefix: str) -> bytes:
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as archive:
        archive.writestr("[Content_Types].xml", "<Types/>")
        archive.writestr(f"{prefix}/document.xml", "<document/>")
    return output.getvalue()


def test_upload_accepts_valid_supported_files(client):
    headers, subject_id = _subject_headers(client)
    files = [
        ("paper.pdf", "application/pdf", b"%PDF-1.7\n"),
        (
            "paper.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            _docx_bytes("word"),
        ),
        (
            "slides.pptx",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            _docx_bytes("ppt"),
        ),
        ("notes.txt", "text/plain", "plain text notes".encode()),
    ]

    for name, content_type, content in files:
        response = client.post(
            f"/study-materials?subject_id={subject_id}",
            files={"file": (name, content, content_type)},
            headers=headers,
        )
        assert response.status_code == 201, response.text


def test_upload_rejects_mismatched_content_and_mime(client):
    headers, subject_id = _subject_headers(client)
    response = client.post(
        f"/study-materials?subject_id={subject_id}",
        files={"file": ("paper.pdf", b"not a pdf", "application/pdf")},
        headers=headers,
    )
    assert response.status_code == 415


def test_upload_rejects_renamed_extension(client):
    headers, subject_id = _subject_headers(client)
    response = client.post(
        f"/study-materials?subject_id={subject_id}",
        files={"file": ("paper.txt", b"\x00\xff\x00", "text/plain")},
        headers=headers,
    )
    assert response.status_code == 415


def test_upload_rejects_oversized_file(client):
    headers, subject_id = _subject_headers(client)
    response = client.post(
        f"/study-materials?subject_id={subject_id}",
        files={"file": ("large.txt", b"a" * (10 * 1024 * 1024 + 1), "text/plain")},
        headers=headers,
    )
    assert response.status_code == 413


def test_upload_rejects_path_traversal_filename(client):
    headers, subject_id = _subject_headers(client)
    response = client.post(
        f"/study-materials?subject_id={subject_id}",
        files={"file": ("../escape.txt", b"safe text", "text/plain")},
        headers=headers,
    )
    assert response.status_code == 400
