# 1. 가볍고 최적화된 Python 베이스 이미지 사용
FROM python:3.10-slim

# 2. 작업 디렉토리 설정
WORKDIR /workspace

# 3. OpenCV 및 EasyOCR 구동에 필요한 시스템 라이브러리 설치
# 설치 후 apt 캐시를 지워(rm -rf) 도커 이미지 용량을 최적화합니다.
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 4. 파이썬 패키지 설치
# (코드 변경 시마다 의존성을 재설치하지 않도록 requirements.txt만 먼저 복사하여 레이어 캐싱 활용)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. 백엔드 앱 소스 코드 복사 (frontend 폴더 등은 .dockerignore로 제외)
COPY ./app ./app

# 6. 통신 포트 개방
EXPOSE 8000

# 7. FastAPI 서버 실행 명령어
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
