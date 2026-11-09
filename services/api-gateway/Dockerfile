FROM python:3.12-slim

WORKDIR /app

COPY packages/python-common /app/packages/python-common
COPY services/api-gateway/requirements.txt /app/services/api-gateway/requirements.txt

RUN pip install --no-cache-dir -r /app/services/api-gateway/requirements.txt && \
    pip install --no-cache-dir -e /app/packages/python-common

COPY services/api-gateway /app/services/api-gateway

ENV PYTHONPATH=/app/services/api-gateway/src:/app/packages/python-common

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
