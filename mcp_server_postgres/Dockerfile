# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app

# Install system dependencies that might be needed by psycopg2 or other libraries
# RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
# Copy only requirements.txt first to leverage Docker cache
COPY ./requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
# Copy the server directory and the .env file
COPY ./server /app/server
COPY ./.env /app/.env

# Expose port 8000 for the FastAPI/Uvicorn server
EXPOSE 8000

# Command to run the application
# Ensure the server is run from the /app directory where main.py is expected by this path
CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8000"]
