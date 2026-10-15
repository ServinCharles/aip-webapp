#!/usr/bin/env bash
# Build the aip-webapp image, push it to ECR and roll it out to the aip-mortgage namespace on EKS.
# Prerequisites: aws CLI (logged in), docker, kubectl, and the cluster created from
# aip-mortgage-api/infra/terraform.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE="aip-webapp"
REGION="${AWS_REGION:-eu-west-2}"
CLUSTER="${CLUSTER_NAME:-aip-mortgage}"
NAMESPACE="aip-mortgage"
TAG="${IMAGE_TAG:-$(git -C "$ROOT" rev-parse --short HEAD)}"

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
REGISTRY="${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com"
IMAGE="${REGISTRY}/${SERVICE}:${TAG}"

echo "==> Logging in to ECR ${REGISTRY}"
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRY"

echo "==> Building and pushing ${IMAGE}"
# EKS nodes are x86_64; --platform keeps Apple Silicon builds compatible
docker build --platform linux/amd64 -t "$IMAGE" "$ROOT"
docker push "$IMAGE"

echo "==> Connecting kubectl to ${CLUSTER}"
aws eks update-kubeconfig --region "$REGION" --name "$CLUSTER" >/dev/null

# Overlay that points the manifests at the image just pushed (generated, not committed)
OVERLAY="${ROOT}/deploy/overlays/aws"
mkdir -p "$OVERLAY"
cat > "${OVERLAY}/kustomization.yaml" <<YAML
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../k8s
images:
  - name: ${SERVICE}
    newName: ${REGISTRY}/${SERVICE}
    newTag: "${TAG}"
YAML

echo "==> Deploying ${SERVICE} to namespace ${NAMESPACE}"
kubectl apply -k "$OVERLAY"
kubectl -n "$NAMESPACE" rollout status "deployment/${SERVICE}" --timeout=180s

echo "==> Waiting for the load balancer address"
for _ in $(seq 1 60); do
  HOST="$(kubectl -n "$NAMESPACE" get svc aip-webapp -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"
  [ -n "$HOST" ] && break
  sleep 5
done

if [ -z "${HOST:-}" ]; then
  echo "Load balancer not ready yet. Check later with: kubectl -n ${NAMESPACE} get svc aip-webapp"
  exit 0
fi

cat <<MSG

The app is at: http://${HOST}
(DNS for a new load balancer can take a couple of minutes to resolve.)

Run the test framework (Agentic-qa-demo) against it:
  BASE_URL=http://${HOST} npm run test:api
  BASE_URL=http://${HOST} npm run test:smoke
MSG
