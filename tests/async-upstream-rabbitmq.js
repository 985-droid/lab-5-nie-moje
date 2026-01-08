import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    async_upstream_rabbitmq: {
      executor: 'constant-vus',
      vus: 20,
      duration: '2m',
      tags: { 
        test_type: 'async-upstream',
        scenario: 'async-upstream',
        broker: 'rabbitmq',
        endpoint: '/async-upstream'
      },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'], 
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.05']
  }
};

export default function () {
  const url = 'http://host.docker.internal:8000/async-upstream';
  const payload = JSON.stringify({
    resource_id: Math.floor(Math.random() * 1000)
  });
  
  const params = {
    headers: { 
      'Content-Type': 'application/json'
    },
    timeout: '10s',
    tags: {
      name: 'async-upstream-rabbitmq'
    }
  };
  
  const response = http.post(url, payload, params);
  
  let body = {};
  try {
    body = JSON.parse(response.body);
  } catch (e) {
    console.error('Failed to parse response body:', response.body);
  }
  
  const success = check(response, {
    'status is 202': (r) => r.status === 202,
    'has correlation_id': () => body.correlation_id !== undefined && body.correlation_id !== null,
    'has status queued': () => body.status === 'queued' || body.message !== undefined,
    'response time < 2s': (r) => r.timings.duration < 2000,
    'has X-Trace-ID header': (r) => r.headers['X-Trace-ID'] !== undefined,
  });
  
  errorRate.add(!success);
  
  if (!success) {
    console.error(`Async upstream (RabbitMQ) test failed: ${response.status} - ${response.body}`);
  }
}

