FROM python:3.11-slim

WORKDIR /app

COPY packages/python-common /packages/python-common
RUN pip install --no-cache-dir -e /packages/python-common

COPY services/payments-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/payments-service/src ./src

ENV PYTHONPATH=/app/src
ENV PAYMENTS_SERVICE_PORT=8006

EXPOSE 8006

CMD ["python", "src/main.py"]
