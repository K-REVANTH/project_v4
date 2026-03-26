# Kubernetes Resource Mapping (v2)

## Component → Resource Mapping

| Component | K8s Resource | Namespace | YAML File | Key Concepts |
|-----------|-------------|-----------|-----------|-------------|
| MongoDB | StatefulSet (1 replica) | `infra` | `k8s/infra/mongodb-statefulset.yaml` | Init container, dynamic PVC, headless service |
| MongoDB Storage | PV (hostPath + NFS ref) | `infra` | `k8s/infra/mongodb-pv-pvc.yaml` | PV, PVC, nodeAffinity |
| MongoDB Services | Headless + ClusterIP | `infra` | `k8s/infra/mongodb-service.yaml` | Headless for stable DNS |
| RabbitMQ | Deployment (1 replica) | `infra` | `k8s/infra/rabbitmq-deployment.yaml` | Probes, resource limits |
| NFS Provisioner | Deployment + RBAC | `infra` | `k8s/storage/nfs-provisioner.yaml` | ServiceAccount, ClusterRole, ClusterRoleBinding |
| StorageClasses | StorageClass (×2) | cluster | `k8s/storage/storageclass.yaml` | Dynamic provisioning, volumeBindingMode |
| user-management | Deployment (2 replicas) | `backend` | `k8s/backend/user-management-deployment.yaml` | **Init containers** (MongoDB + RabbitMQ wait) |
| doctor-appointment | Deployment (2 replicas) | `backend` | `k8s/backend/doctor-appointment-deployment.yaml` | **Sidecar** (log forwarder), init container, shared emptyDir |
| pharmacy | Deployment (2 replicas) | `backend` | `k8s/advanced/deployment-strategies.yaml` | **RollingUpdate** strategy, HPA |
| medical-records | Deployment (2 replicas) | `backend` | `k8s/advanced/deployment-strategies.yaml` | **Recreate** strategy |
| lab-appointment | Deployment (2 replicas) | `backend` | `k8s/backend/lab-ambulance-deployments.yaml` | Standard deployment |
| ambulance-booking | Deployment (2 replicas) | `backend` | `k8s/backend/lab-ambulance-deployments.yaml` | Standard deployment |
| All backend | ClusterIP Services (×6) | `backend` | `k8s/backend/services.yaml` | Internal-only access |
| frontend | Deployment (2 replicas) | `frontend` | `k8s/frontend/frontend-deployment.yaml` | React static build |
| frontend | NodePort Service (30000) | `frontend` | `k8s/frontend/frontend-service.yaml` | External access |
| Log Agent | **DaemonSet** | `infra` | `k8s/advanced/daemonset-log-agent.yaml` | Runs on every node, tolerates control plane |
| Monitor | **Static Pod** | `infra` | `k8s/advanced/static-pod-example.yaml` | Kubelet-managed, no API server dependency |
| Scaling | HPA (×2) | `backend` | `k8s/advanced/scaling-examples.yaml` | CPU + memory triggers, custom behavior |
| Gateway | GatewayClass | cluster | `k8s/gateway/gateway-class.yaml` | Envoy Gateway controller |
| Gateway | Gateway | `ingress` | `k8s/gateway/gateway.yaml` | Port 80, NodePort 30080 |
| Routes | HTTPRoute (×6) | `backend` | `k8s/gateway/httproutes.yaml` | Path-based routing |
| Config | ConfigMap (×3) | all | `k8s/config/configmaps.yaml` | Non-sensitive config |
| Secrets | Secret (×2) | `backend`, `infra` | `k8s/config/secrets.yaml` | JWT, MongoDB creds |

## K8s Concepts Demonstrated

| Concept | Where Demonstrated |
|---------|-------------------|
| Pods, ReplicaSets, Deployments | All backend services |
| StatefulSet | MongoDB (`k8s/infra/mongodb-statefulset.yaml`) |
| DaemonSet | Log agent (`k8s/advanced/daemonset-log-agent.yaml`) |
| Static Pod | Monitor (`k8s/advanced/static-pod-example.yaml`) |
| Init Containers | user-management, doctor-appointment, pharmacy, medical-records |
| Multi-Container (Sidecar) | doctor-appointment with log-forwarder |
| ConfigMaps | Backend, frontend, infra configs (`k8s/config/`) |
| Secrets | JWT + MongoDB credentials (`k8s/config/secrets.yaml`) |
| Liveness Probes | All services (HTTP GET `/health`) |
| Readiness Probes | All services (HTTP GET `/health`) |
| StorageClass | `standard-local` + `nfs-dynamic` (`k8s/storage/`) |
| PV / PVC | MongoDB data storage |
| Dynamic Provisioning | NFS provisioner → auto PV creation |
| ClusterIP | All 6 backend services |
| NodePort | Frontend (30000), Gateway (30080) |
| Gateway API | GatewayClass + Gateway + 6 HTTPRoutes |
| nodeAffinity | `k8s/scheduling/node-affinity-example.yaml` |
| podAntiAffinity | `k8s/scheduling/node-affinity-example.yaml` |
| Taints & Tolerations | `k8s/scheduling/taints-tolerations-example.yaml`, DaemonSet |
| RollingUpdate | Pharmacy deployment |
| Recreate | Medical-records deployment |
| Rollback | `kubectl rollout undo` (documented) |
| HPA | Pharmacy + doctor-appointment |
| Namespaces | `frontend`, `backend`, `infra`, `ingress` |
| RBAC (ServiceAccount) | NFS provisioner (`k8s/storage/nfs-provisioner.yaml`) |
| Failure Scenarios | 5 scenarios (`k8s/scheduling/failure-scenarios.yaml`) |
