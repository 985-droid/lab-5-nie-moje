## Raport lab5

**Scenario:**

Baseline (Lab 4)
Async Upstream (A)
Async Upstream (A)
Async Downstream (B)
Async Downstream (B)

**Performance Results:**

| Scenario | Broker | RPS | p50 Latency | p95 Latency | p99 Latency |
|----|----|----|----|----|----|
| Baseline (Lab 4) | none | 0.276 | - | - | 13 |
| Async Upstream (A) | Kafka | 7.09 | - | - | 0.148 |
| Async Upstream (A) | RabbitMQ | 7.49 | - | - | 0.149 |
| Async Downstream (B) | Kafka | 0.346 | - | - | 10.6 |
| Async Downstream (B) | RabbitMQ | 0.441 | - | - | 0.89 |

Najwyższy RPS:
Async Upstream (A) — Kafka 7,09, RabbitMQ 7,49. API szybko zwraca 202, ciężka praca w workerze.

Latency:

Baseline: niskie RPS, wysokie p99 (13 s).

Async Upstream: minimalne p99 (\~0,15 s), wysoki RPS.

Async Downstream: API czeka na External API, p99 wyższe; RabbitMQ szybciej niż Kafka (0,89 vs 10,6 s).

Wniosek: Async Upstream — maksymalna przepustowość; Async Downstream — kompromis między szybkością API a zwrotem danych.