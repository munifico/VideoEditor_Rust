# VideoEditor_Rust

**Rust와 Tauri를 기반으로 제작된 데스크톱 비디오 편집 프로그램입니다.**

## 🚀 프로젝트 소개

VideoEditor_Rust는 현대적인 웹 기술(React, Ant Design)과 강력한 시스템 프로그래밍 언어(Rust), 그리고 검증된 멀티미디어 처리 프레임워크(FFmpeg)를 결합하여 개발되었습니다. 사용하기 쉬운 인터페이스와 빠른 처리 속도를 목표로 하며, 윈도우 환경에 최적화되어 있습니다.

## ✨ 주요 기능

이 프로그램은 다음과 같은 비디오 편집 기능을 제공합니다:

1.  **비디오 자르기 (Trim):**
    -   원하는 구간을 정확하게 선택하여 고속으로 잘라낼 수 있습니다.

2.  **비디오 합치기 (Merge):**
    -   여러 개의 동영상 파일을 하나로 합칠 수 있습니다.
    -   FFmpeg의 `concat` 기술을 사용하여 품질 저하 없이 빠르게 병합합니다.

3.  **해상도 변경 (Resize):**
    -   1080p, 720p 등 다양한 해상도로 비디오 크기를 조절할 수 있습니다.
    -   사용자 지정 해상도 설정도 가능합니다.

4.  **자동화 처리 (Auto):**
    -   자르기, 합치기, 크기 조절을 한 번의 클릭으로 순차적 자동 수행합니다.
    -   여러 구간을 잘라내어 자동으로 합치고, 최종적으로 원하는 해상도로 변환합니다.

## 🛠️ 기술 스택 (Tech Stack)

### Frontend (User Interface)
-   **React (v19):** 컴포넌트 기반의 UI 구축
-   **TypeScript:** 안정적인 타입 시스템 적용
-   **Ant Design (v5):** 깔끔하고 전문적인 UI 디자인 시스템 (Dark Theme 적용)
-   **Vite:** 빠른 개발 서버 및 빌드 도구

### Backend (System & Logic)
-   **Rust:** 메모리 안전성과 고성능을 보장하는 시스템 로직
-   **Tauri (v2):** 가볍고 보안성이 뛰어난 데스크톱 앱 프레임워크
-   **FFmpeg (Sidecar):** 비디오 처리의 핵심 엔진 (바이너리 포함)

## 📦 설치 및 실행 방법

### 요구 사항
-   [Node.js](https://nodejs.org/) (v16 이상)
-   [Rust](https://www.rust-lang.org/) (최신 stable 버전)
-   Visual Studio Build Tools (C++ 데스크톱 개발)

### FFmpeg 설정 (필수)
-   이 프로젝트는 비디오 처리를 위해 **FFmpeg**가 필요합니다.
-   [FFmpeg 다운로드](https://ffmpeg.org/download.html) 페이지에서 Windows용 `ffmpeg.exe`를 다운로드하세요.
-   다운로드한 파일의 이름을 **`ffmpeg-x86_64-pc-windows-msvc.exe`** 로 변경합니다.
-   **`src-tauri/`** 폴더 바로 아래에 해당 파일을 위치시킵니다.

### 개발 모드 실행
소스 코드를 수정하며 테스트할 수 있습니다.
```bash
npm install
npm run tauri dev
```

### 프로덕션 빌드
배포 가능한 설치 파일(.msi)과 실행 파일(.exe)을 생성합니다.
```bash
npm run tauri build
```
빌드된 파일은 `src-tauri/target/release/bundle/msi` 경로에 생성됩니다.

## 📂 프로젝트 구조

```
VideoEditor_Rust/
├── src/                # React 프론트엔드 소스
│   ├── components/     # UI 컴포넌트 (편집 패널 등)
│   ├── hooks/          # 커스텀 훅 (진행률 관리 등)
│   └── App.tsx         # 메인 앱 진입점
├── src-tauri/          # Rust 백엔드 소스
│   ├── src/            # Rust 코드 logic (ffmpeg 명령어 처리 등)
│   ├── tauri.conf.json # Tauri 설정 파일
│   └── ffmpeg-x86_64-pc-windows-msvc.exe # FFmpeg 실행 파일 (Sidecar)
└── package.json        # 프로젝트 의존성 및 스크립트
```

## 📝 라이선스
MIT License
