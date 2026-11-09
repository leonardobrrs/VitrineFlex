FROM python:3.11-slim

WORKDIR /app

COPY packages/python-common /packages/python-common
RUN pip install --no-cache-dir -e /packages/python-common

COPY services/cart-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/cart-service/src ./src

ENV PYTHONPATH=/app/src
ENV CART_SERVICE_PORT=8004

EXPOSE 8004

CMD ["python", "src/main.py"]
