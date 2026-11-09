FROM python:3.11-slim

WORKDIR /app

COPY packages/python-common /packages/python-common
RUN pip install --no-cache-dir -e /packages/python-common

COPY services/shipping-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/shipping-service/src ./src

ENV PYTHONPATH=/app/src
ENV SHIPPING_SERVICE_PORT=8007

EXPOSE 8007

CMD ["python", "src/main.py"]
