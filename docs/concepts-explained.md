# Kubernetes Concepts Explained (Review Guide)

## Quick Reference Table

| # | Concept | Where Demonstrated | File |
|---|---------|-------------------|------|
| 1 | Pod | Every deployment creates pods | All deployment YAMLs |
| 2 | ReplicaSet | Created automatically by Deployments | `kubectl get rs -n backend` |
| 3 | Deployment | All 6 backend services + frontend | `k8s/backend/*.yaml` |
| 4 | StatefulSet | MongoDB (stable identity + persistent storage) | `k8s/infra/mongodb-statefulset.yaml` |
| 5 | DaemonSet | Fluent Bit log agent on every node | `k8s/advanced/daemonset-log-agent.yaml` |
| 6 | Static Pod | Node health monitor | `k8s/advanced/static-pod-example.yaml` |
| 7 | Init Container | Wait for MongoDB/RabbitMQ before app starts | `k8s/backend/user-management-deployment.yaml` |
| 8 | Sidecar | Log forwarder sharing emptyDir volume | `k8s/backend/doctor-appointment-deployment.yaml` |
| 9 | ConfigMap | Backend config (MONGO_URI, RABBITMQ_URL) | `k8s/config/configmaps.yaml` |
| 10 | Secret | JWT_SECRET, MongoDB credentials | `k8s/config/secrets.yaml` |
| 11 | ClusterIP Service | Internal service discovery (all 6 backends) | `k8s/backend/services.yaml` |
| 12 | NodePort Service | Frontend (:30000), Gateway (:30080) | `k8s/frontend/frontend-service.yaml` |
| 13 | PV / PVC | MongoDB persistent data storage | `k8s/infra/mongodb-pv-pvc.yaml` |
| 14 | StorageClass | standard-local + nfs-dynamic | `k8s/storage/storageclass.yaml` |
| 15 | Dynamic Provisioning | NFS provisioner auto-creates PVs | `k8s/storage/nfs-provisioner.yaml` |
| 16 | Gateway API | GatewayClass, Gateway, HTTPRoute | `k8s/gateway/*.yaml` |
| 17 | Network Policy | Restrict backend ← gateway only, DB ← backend only | `k8s/security/network-policies.yaml` |
| 18 | K8s RBAC | ServiceAccount, Role, RoleBinding | `k8s/security/rbac.yaml` |
| 19 | HPA | Auto-scale pharmacy + doctor-appointment | `k8s/advanced/scaling-examples.yaml` |
| 20 | VPA | Resource recommendations for user-management | `k8s/advanced/vpa-examples.yaml` |
| 21 | RollingUpdate | Pharmacy — zero-downtime deploy | `k8s/advanced/deployment-strategies.yaml` |
| 22 | Recreate | Medical-records — full replacement | `k8s/advanced/deployment-strategies.yaml` |
| 23 | nodeAffinity | Pin MongoDB to `role=database` node | `k8s/infra/mongodb-statefulset.yaml` |
| 24 | podAntiAffinity | Spread replicas across worker nodes | All backend deployments |
| 25 | Tolerations | DaemonSet tolerates master taint | `k8s/advanced/daemonset-log-agent.yaml` |
| 26 | Namespaces | frontend, backend, infra, ingress, monitoring | `k8s/namespaces/namespaces.yaml` |
| 27 | Resource Limits | requests + limits on every container | All deployment YAMLs |
| 28 | Probes | Liveness + Readiness on every service | All deployment YAMLs |
| 29 | Helm | Reusable chart for all backend services | `helm/healthcare-service/` |
| 30 | Prometheus | Lightweight metrics collection | `k8s/monitoring/prometheus-grafana.yaml` |
| 31 | Grafana | Dashboard for cluster metrics | `k8s/monitoring/prometheus-grafana.yaml` |
| 32 | Fluent Bit | Node-level log collection DaemonSet | `k8s/advanced/daemonset-log-agent.yaml` |

---

## Concept Deep-Dives (for review answers)

### Init Container vs Sidecar
```
Init Container:                    Sidecar:
┌──────────┐                      ┌──────────────────────┐
│ init-1   │ runs first,          │ main-app  │ sidecar  │
│ (mongo?) │ then exits           │ (writes)  │ (reads)  │
└────┬─────┘                      │    ↕ shared volume ↕ │
     │ completes                  └──────────────────────┘
┌────▼─────┐                      Both run simultaneously
│ main-app │ then starts          Sidecar helps main app
└──────────┘                      (logging, proxying, etc)
```

### HPA vs VPA
```
HPA (Horizontal):              VPA (Vertical):
  Load↑ → add pods              Load↑ → bigger pod
  ┌─┐ ┌─┐ ┌─┐ ┌─┐              ┌─────────┐
  │P│ │P│ │P│ │P│ ← 4 pods     │ BIG POD │ ← same pod, more CPU/RAM
  └─┘ └─┘ └─┘ └─┘              └─────────┘
  Use for: stateless APIs       Use for: databases, workers
  No restart needed             Requires pod restart
```

### Deployment vs StatefulSet
```
Deployment:                     StatefulSet:
  pod-abc123 (random name)       mongodb-0 (stable name)
  pod-def456 (random name)       mongodb-1 (stable name)
  Shared PVC (or none)           Each gets own PVC
  Start in any order             Ordered start: 0→1→2
  Use for: APIs, frontends       Use for: databases, queues
```

### Network Policy Flow
```
  ┌─────────┐    ALLOWED     ┌──────────┐     ALLOWED    ┌──────────┐
  │ Gateway │ ──────────────→│ Backend  │───────────────→│ MongoDB  │
  │(ingress)│                │          │                │ (infra)  │
  └─────────┘                └──────────┘                └──────────┘
                                  ↑
  ┌─────────┐    BLOCKED     │
  │Frontend │ ──────X────────┘  (frontend can't reach backend directly)
  └─────────┘                     (must go through Gateway)
```

### K8s RBAC vs App RBAC
```
K8s RBAC (cluster level):          App RBAC (application level):
  WHO: ServiceAccount                WHO: User (patient/doctor/admin)
  WHAT: get/list pods, read secrets  WHAT: book appointment, view records
  WHERE: K8s API Server             WHERE: REST API endpoints
  Example: Pod reads ConfigMap       Example: Admin deletes a user
```
