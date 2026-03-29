# Healthcare Microservices — Architecture (3-Node Cluster)

## System Architecture

```
                    ┌──────────────────────────────┐
                    │     MASTER NODE (EC2 #1)     │
                    │                              │
                    │  ┌─────────┐  ┌───────────┐  │
                    │  │ HAProxy │  │ NFS Server│  │
                    │  │ (host)  │  │ (host)    │  │
                    │  │ :80,:3K │  │ /srv/nfs  │  │
                    │  └────┬────┘  └───────────┘  │
                    │       │                      │
                    │  K8s Control Plane            │
                    │  (kube-apiserver, etcd,       │
                    │   scheduler, controller-mgr)  │
                    │                              │
                    │  Pod: log-agent (DaemonSet)   │
                    └───────┬──────────────────────┘
                            │ :30080 / :30000
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌──────────────────────┐   ┌──────────────────────┐
│  WORKER-1 (EC2 #2)   │   │  WORKER-2 (EC2 #3)   │
│  label: role=database │   │  label: role=worker   │
│                       │   │                       │
│ ┌───────────────────┐ │   │ ┌───────────────────┐ │
│ │ Gateway (Envoy)   │ │   │ │ Gateway (Envoy)   │ │
│ │ NodePort :30080   │ │   │ │ NodePort :30080   │ │
│ └─────────┬─────────┘ │   │ └─────────┬─────────┘ │
│           │            │   │           │            │
│ Backend Pods:          │   │ Backend Pods:          │
│ • user-management     │   │ • user-management     │
│ • doctor-appointment  │   │ • doctor-appointment  │
│ • pharmacy            │   │ • pharmacy            │
│ • lab-appointment     │   │ • lab-appointment     │
│ • ambulance-booking   │   │ • ambulance-booking   │
│ • medical-records     │   │ • medical-records     │
│                       │   │                       │
│ Infra Pods:           │   │ Frontend:             │
│ • MongoDB (pinned)    │   │ • React app :30000    │
│ • RabbitMQ            │   │                       │
│ • NFS Provisioner     │   │ Monitoring:           │
│                       │   │ • Prometheus :30090   │
│ • log-agent (DS)      │   │ • Grafana :30030      │
│ • frontend replica    │   │ • log-agent (DS)      │
└───────────────────────┘   └───────────────────────┘
```

## Traffic Flow
```
Internet → HAProxy (:80) → K8s Gateway (:30080) → HTTPRoutes → Backend Services
Internet → HAProxy (:3000) → Frontend NodePort (:30000) → React App
```

## Namespace Layout
| Namespace | Contents | Node Placement |
|-----------|----------|----------------|
| `backend` | 6 microservices (2 replicas each) | Both workers |
| `infra` | MongoDB, RabbitMQ, NFS provisioner, Fluent Bit | Worker-1 (MongoDB pinned) |
| `frontend` | React frontend (2 replicas) | Both workers |
| `ingress` | Envoy Gateway | Both workers |
| `monitoring` | Prometheus, Grafana | Worker-2 |

## Resource Budget (per worker node ~4 vCPU, 8GB RAM)

| Component | CPU Req | Mem Req | Replicas | Total CPU | Total Mem |
|-----------|---------|---------|----------|-----------|-----------|
| Backend services (×6) | 100m | 128Mi | 2 each | 1200m | 1536Mi |
| MongoDB | 200m | 256Mi | 1 | 200m | 256Mi |
| RabbitMQ | 200m | 256Mi | 1 | 200m | 256Mi |
| Frontend | 50m | 64Mi | 2 | 100m | 128Mi |
| Prometheus | 100m | 256Mi | 1 | 100m | 256Mi |
| Grafana | 50m | 128Mi | 1 | 50m | 128Mi |
| NFS Provisioner | 50m | 64Mi | 1 | 50m | 64Mi |
| Fluent Bit (DS) | 50m | 64Mi | 3 | 150m | 192Mi |
| Init containers | 10m | 16Mi | temp | ~0 | ~0 |
| **TOTAL** | | | | **~2050m** | **~2816Mi** |

> Fits comfortably on 2× t3.medium (2 vCPU, 4GB each) or t3.large (2 vCPU, 8GB)

## Key Design Decisions (3-Node Constraint)

| Decision | Why | Trade-off |
|----------|-----|-----------|
| HAProxy on master (host-level) | No extra EC2, runs outside K8s | Shares master resources |
| NFS on master node | No extra EC2 for storage server | Master disk I/O shared |
| MongoDB pinned to worker-1 | Needs stable node for data | Less scheduling flexibility |
| 2 replicas per service | Max HA with 2 workers | Can't survive both workers down |
| podAntiAffinity | Spread pods across nodes | Sometimes can't honor on 2 nodes |
| Lightweight Prometheus | 256Mi limit (not 2GB) | 15-day retention, 30s scrape |
