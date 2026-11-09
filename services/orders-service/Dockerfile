FROM python:3.11-slim

WORKDIR /app

COPY packages/python-common /packages/python-common
RUN pip install --no-cache-dir -e /packages/python-common

COPY services/orders-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/orders-service/src ./src

ENV PYTHONPATH=/app/src
ENV ORDERS_SERVICE_PORT=8005

EXPOSE 8005

CMD ["python", "src/main.py"]
