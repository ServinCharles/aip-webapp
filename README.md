# AIP Web App

React frontend for a mortgage **Agreement in Principle (AIP)**. Served by non-root nginx, which forwards `/api/*` to the [aip-mortgage-api](https://github.com/ServinCharles/aip-mortgage-api) .NET microservice. Both run in the `aip-mortgage` namespace on Amazon EKS, and the [Agentic-qa-demo](https://github.com/ServinCharles/Agentic-qa-demo) framework tests them end to end.

## Test contract

The `data-testid` attributes are what the test framework's locators target. Keep them stable, or change the locators in Agentic-qa-demo at the same time:

| data-testid | Element |
| --- | --- |
| `applicant-annual-income` | Annual income input |
| `monthly-commitments` | Monthly credit commitments input |
| `requested-loan-amount` | Loan amount input |
| `get-decision` | Get Decision button |
| `decision-outcome` | Decision badge (Accepted / Referred / Declined) |
| `max-borrowing-amount` | Maximum borrowing figure |
| `referral-guidance` | Guidance shown for Referred decisions |

The journey is served at `/mortgages/decision-in-principle` (any route serves the app).

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000, proxies /api to the API on http://localhost:8080
```

Point it at a different API with `API_UPSTREAM=http://localhost:9090 npm run dev`.

In Docker (the API container must be reachable as `aip-api`, or set `API_UPSTREAM`):

```bash
docker build -t aip-webapp .
docker run -p 3000:8080 -e API_UPSTREAM=http://host.docker.internal:8080 aip-webapp
```

## Deploy to AWS

Deploy [aip-mortgage-api](https://github.com/ServinCharles/aip-mortgage-api) first (it creates the cluster and the API service). Then:

```bash
./scripts/deploy.sh
```

It builds and pushes the image to ECR, rolls it out, and prints the public load balancer URL to use as `BASE_URL` in the test framework.
