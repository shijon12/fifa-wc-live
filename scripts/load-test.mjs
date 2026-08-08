const base = (process.env.LOAD_TEST_URL || 'http://localhost:3000').replace(/\/$/, '');
const concurrency = Math.max(1, Math.min(50, Number(process.env.LOAD_TEST_CONCURRENCY) || 10));
const requestsPerRoute = Math.max(1, Math.min(500, Number(process.env.LOAD_TEST_REQUESTS) || 30));
const routes = ['/fantasy', '/leagues', '/api/fantasy/leaderboard'];

const jobs = routes.flatMap((route) => Array.from({ length: requestsPerRoute }, () => route));
let cursor = 0;
const results = [];

async function worker() {
  while (cursor < jobs.length) {
    const route = jobs[cursor++];
    const started = performance.now();
    try {
      const response = await fetch(`${base}${route}`, { headers: { 'User-Agent': 'Matchroom beta load test' } });
      await response.arrayBuffer();
      results.push({ route, status: response.status, duration: performance.now() - started });
    } catch (error) {
      results.push({ route, status: 0, duration: performance.now() - started, error: error instanceof Error ? error.message : String(error) });
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));
const percentile = (values, p) => values.sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * p))] ?? 0;
for (const route of routes) {
  const rows = results.filter((result) => result.route === route);
  const durations = rows.map((row) => row.duration);
  const failures = rows.filter((row) => row.status < 200 || row.status >= 400);
  console.log(`${route} requests=${rows.length} failures=${failures.length} p50=${percentile([...durations], .5).toFixed(0)}ms p95=${percentile([...durations], .95).toFixed(0)}ms max=${Math.max(...durations).toFixed(0)}ms`);
}
if (results.some((result) => result.status < 200 || result.status >= 400)) process.exitCode = 1;
