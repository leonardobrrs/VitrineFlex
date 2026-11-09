FROM python:3.12-slim

WORKDIR /app

COPY packages/python-common /app/packages/python-common
COPY services/auth-service/requirements.txt /app/services/auth-service/requirements.txt

RUN pip install --no-cache-dir -r /app/services/auth-service/requirements.txt && \
    pip install --no-cache-dir -e /app/packages/python-common

COPY services/auth-service /app/services/auth-service

ENV PYTHONPATH=/app/services/auth-service/src:/app/packages/python-common
ENV DB_STORAGE_DIR=/app/data

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
