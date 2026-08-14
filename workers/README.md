# Background Workers - Astro Sushil

This directory will contain the background job processors and worker applications operating on BullMQ queues.

## Responsibilities
- **Report Generation Processing**: Executing PDF rendering jobs asynchronously.
- **LLM Explanation Requests**: Calling LLM APIs to translate calculation predictions into prose without blocking the main HTTP API thread.
- **Notification Services**: Dispatching push notifications via FCM and message payloads via Meta WhatsApp API.
- **Async Batch Tasks**: Cleanup, caching updates, and daily horoscope pre-computations.

## Architecture
Workers communicate via **Redis** and read/write transactional data to **PostgreSQL**.
