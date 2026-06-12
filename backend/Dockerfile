FROM python:3.11-slim

WORKDIR /app

# ffmpeg is kept available as a yt-dlp fallback for odd formats. The hot path
# (bestaudio direct stream) does NOT transcode, so ffmpeg is rarely invoked.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8000
EXPOSE 8000

# Railway provides $PORT; default to 8000 locally.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
