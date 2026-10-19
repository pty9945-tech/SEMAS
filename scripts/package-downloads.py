#!/usr/bin/env python3
"""Package the standalone consultation app for same-origin public downloads."""

from pathlib import Path
from shutil import copyfile
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parent.parent
KOREAN_FILENAME = "동작센터-정책자금-상담-도우미.html"
SOURCE = ROOT / "dist-html" / KOREAN_FILENAME
DIST = ROOT / "dist"
DOWNLOADS = DIST / "downloads"
TEMPLATE = ROOT / "scripts" / "download-page.html"


def main() -> None:
    if not SOURCE.is_file():
        raise SystemExit("먼저 npm run build:html 명령으로 단독 HTML 파일을 만드세요.")
    if not (DIST / "index.html").is_file():
        raise SystemExit("먼저 npm run build 명령으로 웹사이트를 만드세요.")

    DOWNLOADS.mkdir(parents=True, exist_ok=True)
    html_path = DOWNLOADS / "dongjak-policy-helper.html"
    zip_path = DOWNLOADS / "dongjak-policy-helper.zip"
    copyfile(SOURCE, html_path)

    # Python's ZIP writer marks the Korean member name as UTF-8 automatically.
    with ZipFile(zip_path, "w", compression=ZIP_DEFLATED) as archive:
        archive.write(SOURCE, arcname=KOREAN_FILENAME)

    with ZipFile(zip_path) as archive:
        if (
            archive.namelist() != [KOREAN_FILENAME]
            or archive.testzip() is not None
            or archive.read(KOREAN_FILENAME) != SOURCE.read_bytes()
        ):
            raise SystemExit("ZIP 파일의 내용 검증에 실패했습니다.")

    copyfile(TEMPLATE, DIST / "download.html")
    print(f"HTML 다운로드: {html_path.relative_to(ROOT)} ({html_path.stat().st_size:,} bytes)")
    print(f"ZIP 다운로드: {zip_path.relative_to(ROOT)} ({zip_path.stat().st_size:,} bytes)")
    print("다운로드 안내 페이지: dist/download.html")


if __name__ == "__main__":
    main()
