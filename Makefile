.PHONY: run test migrate migration lint format docker-up docker-down clean

# Development
run:
	uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

# Testing
test:
	pytest tests/ -v --cov=api --cov-report=term-missing

# Database
migrate:
	alembic upgrade head

migration:
	alembic revision --autogenerate -m "$(msg)"

# Code quality
lint:
	ruff check api/ tests/

format:
	ruff format api/ tests/

# Docker
docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f api

# Cleanup
clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	rm -rf .pytest_cache htmlcov .coverage
