FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 GTS_HOST=0.0.0.0 GTS_SECURE_COOKIE=1 PORT=10000
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir reportlab==4.4.4
WORKDIR /app
COPY v5_bundle.b64 /tmp/v5_bundle.b64
RUN python -c "import base64,io,zipfile,pathlib; data=base64.b64decode(pathlib.Path('/tmp/v5_bundle.b64').read_text()); z=zipfile.ZipFile(io.BytesIO(data)); z.extractall('/app')" \
    && rm /tmp/v5_bundle.b64 \
    && useradd -r -u 10001 gts \
    && mkdir -p /app/data /app/uploads \
    && chown -R gts:gts /app
USER gts
EXPOSE 10000
CMD ["python","-u","app.py"]
