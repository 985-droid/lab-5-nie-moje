import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    baseline: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
      tags: { 
        test_type: 'baseline',
        scenario: 'baseline',
        endpoint: '/external/fetch'
      },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<5000', 'p(99)<10000'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.05']
  }
};

export default function () {
  const url = 'http://host.docker.internal:8000/external/fetch';
  const payload = JSON.stringify({
    resource_id: Math.floor(Math.random() * 1000)
  });
  
  const params = {
    headers: { 
      'Content-Type': 'application/json'
    },
    timeout: '30s',
    tags: {
      name: 'baseline-sync'
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
    'status is 200': (r) => r.status === 200,
    'has correlation_id': () => body.correlation_id !== undefined && body.correlation_id !== null,
    'has duration_ms': () => body.duration_ms !== undefined && body.duration_ms >= 0,
    'response time < 10s': (r) => r.timings.duration < 10000,
  });
  
  errorRate.add(!success);
  
  if (!success) {
    console.error(`Baseline test failed: ${response.status} - ${response.body}`);
  }
}

