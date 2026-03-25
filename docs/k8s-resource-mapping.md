# Kubernetes Resource Mapping

## Component → Resource Mapping

| Component | K8s Resource | Namespace | YAML File | Notes |
|-----------|-------------|-----------|-----------|-------|
| MongoDB | StatefulSet (1 replica) | `infra` | `k8s/infra/mongodb-statefulset.yaml` | Headless Service for stable DNS |
| MongoDB Data | PV + PVC (5Gi, hostPath) | `infra` | `k8s/infra/mongodb-pv-pvc.yaml` | `storageClassName: manual` |
| MongoDB | Headless + ClusterIP Service | `infra` | `k8s/infra/mongodb-service.yaml` | `mongodb-0.mongodb-headless.infra.svc` |
| RabbitMQ | Deployment (1 replica) | `infra` | `k8s/infra/rabbitmq-deployment.yaml` | Includes management UI port |
| user-management | Deployment (2 replicas) | `backend` | `k8s/backend/user-management-deployment.yaml` | JWT Secret from K8s Secret |
| doctor-appointment | Deployment (2 replicas) | `backend` | `k8s/backend/doctor-appointment-deployment.yaml` | RabbitMQ publisher |
| pharmacy | Deployment (2 replicas) | `backend` | `k8s/backend/pharmacy-deployment.yaml` | Python Flask |
| medical-records | Deployment (2 replicas) | `backend` | `k8s/backend/medical-records-deployment.yaml` | RabbitMQ consumer |
| lab-appointment | Deployment (2 replicas) | `backend` | `k8s/backend/lab-ambulance-deployments.yaml` | RabbitMQ publisher |
| ambulance-booking | Deployment (2 replicas) | `backend` | `k8s/backend/lab-ambulance-deployments.yaml` | RabbitMQ publisher |
| aggregator | Deployment (2 replicas) | `backend` | `k8s/backend/aggregator-deployment.yaml` | Calls 3 other services |
| All backend | ClusterIP Services (×7) | `backend` | `k8s/backend/services.yaml` | Internal-only access |
| frontend | Deployment (2 replicas) | `frontend` | `k8s/frontend/frontend-deployment.yaml` | React build |
| frontend | NodePort Service (30000) | `frontend` | `k8s/frontend/frontend-service.yaml` | Initial phase access |
| Gateway | GatewayClass | cluster-scoped | `k8s/gateway/gateway-class.yaml` | Envoy Gateway controller |
| Gateway | Gateway | `ingress` | `k8s/gateway/gateway.yaml` | Port 80, NodePort 30080 |
| Routes | HTTPRoute (×7) | `backend` | `k8s/gateway/httproutes.yaml` | Path-based routing |
| Config | ConfigMap (×3) | all | `k8s/config/configmaps.yaml` | Non-sensitive config |
| Secrets | Secret (×2) | `backend`, `infra` | `k8s/config/secrets.yaml` | JWT, MongoDB creds |

## Resource Specifications

All backend services:
- **CPU**: request 100m, limit 250m
- **Memory**: request 128Mi, limit 256Mi
- **Probes**: HTTP GET `/health` (liveness + readiness)
- **Replicas**: 2

MongoDB:
- **CPU**: request 250m, limit 500m
- **Memory**: request 256Mi, limit 512Mi
- **Storage**: 5Gi hostPath PV

## Scheduling Resources
| File | Concepts Demonstrated |
|------|----------------------|
| `k8s/scheduling/node-affinity-example.yaml` | `nodeAffinity`, `podAntiAffinity`, `nodeSelector` |
| `k8s/scheduling/taints-tolerations-example.yaml` | `tolerations` (NoSchedule, NoExecute), `tolerationSeconds` |
| `k8s/scheduling/failure-scenarios.yaml` | Bad image, wrong Secret, impossible selector, OOMKill, bad probe |
