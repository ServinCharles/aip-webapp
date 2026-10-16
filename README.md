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

## Jenkins build pipeline

`Jenkinsfile` builds the app once, scans it, then publishes one image tagged with the git commit (e.g. `aip-webapp:3f2a1c9`). The deploy pipeline later promotes that exact image.

```
Checkout → Install & Build → SonarQube → Snyk → Docker Build → Image Scan → Push to ECR
```

| Stage | What it does | Fails the build when |
| --- | --- | --- |
| Install & Build | `npm ci` + `npm run build` in a Node container, `dist/` archived | the build breaks |
| SonarQube | scanner with `sonar-project.properties`, waits for the quality gate | quality gate fails |
| Snyk | dependency (SCA) scan of `package-lock.json` | a high or critical vulnerability is found |
| Docker Build | nginx runtime image for `PLATFORM` (default `linux/amd64` for EKS) | the image doesn't build |
| Image Scan | Trivy (default) or Twistlock `twistcli`, JSON report archived | a fixable HIGH/CRITICAL CVE is found |
| Push to ECR | pushes the scanned image, archives `ecr-image.properties` for the deploy pipeline | the push fails |

Every tool runs in a Docker container, so the Jenkins machine only needs Docker. SonarQube, Snyk and the ECR push are off by default; switch them on with **Build with Parameters** once their credentials exist.

### Jenkins setup

1. **New Item → Pipeline**, then *Pipeline script from SCM* → Git → `https://github.com/ServinCharles/aip-webapp.git`, branch `*/main`, script path `Jenkinsfile`.
2. Plugins: Pipeline, Git, Credentials Binding (all in the suggested set).
3. Credentials, only for the stages you switch on: `sonar-token` and `snyk-token` (Secret text), `aws-credentials` (Username with password: access key ID / secret key), `prisma-cloud` (Username with password, for Twistlock).
