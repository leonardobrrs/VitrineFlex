FROM python:3.11-slim

WORKDIR /app

COPY packages/python-common /packages/python-common
RUN pip install --no-cache-dir -e /packages/python-common

COPY services/catalog-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/catalog-service/src ./src

ENV PYTHONPATH=/app/src
ENV CATALOG_SERVICE_PORT=8003

EXPOSE 8003

CMD ["python", "src/main.py"]
