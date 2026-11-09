FROM python:3.11-slim

WORKDIR /app

COPY packages/python-common /packages/python-common
RUN pip install --no-cache-dir -e /packages/python-common

COPY services/lps-config-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/lps-config-service/src ./src

ENV PYTHONPATH=/app/src
ENV LPS_CONFIG_SERVICE_PORT=8002

EXPOSE 8002

CMD ["python", "src/main.py"]
