# Repository Structure

```
healthcare-microservices/
│
├── services/                          # Backend microservices source code
│   ├── user-management/               # Auth, registration, RBAC (Node.js)
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── config.js
│   │   │   ├── middleware/auth.js      # JWT authenticate + authorize
│   │   │   ├── models/User.js
│   │   │   └── routes/userRoutes.js
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── doctor-appointment/            # Appointment booking (Node.js)
│   ├── lab-appointment/               # Lab test booking (Node.js)
│   ├── ambulance-booking/             # Ambulance requests (Node.js)
│   ├── pharmacy/                      # Medicine management (Python/Flask)
│   └── medical-records/               # Patient records (Python/Flask)
│
├── frontend/                          # React frontend
│   ├── src/
│   │   ├── config/api.js              # Centralized API config
│   │   ├── context/AuthContext.jsx     # Auth state management
│   │   ├── components/ProtectedRoute.jsx
│   │   ├── pages/
│   │   │   ├── PatientDashboard.jsx
│   │   │   ├── DoctorDashboard.jsx
│   │   │   └── AdminDashboard.jsx
│   │   ├── api.js                     # API client (per-service routing)
│   │   └── App.jsx
│   ├── Dockerfile
│   └── vite.config.js
│
├── k8s/                               # Kubernetes manifests
│   ├── namespaces/
│   │   └── namespaces.yaml            # 5 namespaces
│   ├── config/
│   │   ├── configmaps.yaml            # Backend + infra + frontend configs
│   │   └── secrets.yaml               # JWT + MongoDB credentials
│   ├── backend/
│   │   ├── user-management-deployment.yaml   # Init containers, SA, anti-affinity
│   │   ├── doctor-appointment-deployment.yaml # Sidecar, init, anti-affinity
│   │   ├── lab-ambulance-deployments.yaml     # Standard with anti-affinity
│   │   └── services.yaml                      # 6 ClusterIP services
│   ├── frontend/
│   │   ├── frontend-deployment.yaml
│   │   └── frontend-service.yaml      # NodePort :30000
│   ├── infra/
│   │   ├── mongodb-statefulset.yaml    # nodeAffinity, init container
│   │   ├── mongodb-service.yaml        # Headless + ClusterIP
│   │   ├── mongodb-pv-pvc.yaml
│   │   └── rabbitmq-deployment.yaml
│   ├── gateway/
│   │   ├── gateway-class.yaml
│   │   ├── gateway.yaml                # NodePort :30080
│   │   └── httproutes.yaml             # 6 path-based routes
│   ├── storage/
│   │   ├── storageclass.yaml           # standard-local + nfs-dynamic
│   │   └── nfs-provisioner.yaml        # SA + RBAC + Deployment
│   ├── security/
│   │   ├── rbac.yaml                   # ServiceAccounts, Roles, RoleBindings
│   │   └── network-policies.yaml       # Inter-namespace traffic rules
│   ├── monitoring/
│   │   └── prometheus-grafana.yaml     # Lightweight Prometheus + Grafana
│   ├── advanced/
│   │   ├── deployment-strategies.yaml  # RollingUpdate + Recreate
│   │   ├── scaling-examples.yaml       # HPA (pharmacy + doctor-appt)
│   │   ├── vpa-examples.yaml           # VPA (user-mgmt + MongoDB)
│   │   ├── daemonset-log-agent.yaml    # Fluent Bit on every node
│   │   └── static-pod-example.yaml     # Kubelet-managed pod
│   └── scheduling/
│       ├── node-affinity-example.yaml
│       ├── taints-tolerations-example.yaml
│       └── failure-scenarios.yaml      # 5 debugging exercises
│
├── helm/                              # Helm charts
│   ├── healthcare-service/            # Generic reusable chart
│   │   ├── Chart.yaml
│   │   ├── values.yaml                # Default values (user-management)
│   │   └── templates/
│   │       ├── deployment.yaml
│   │       └── service.yaml
│   └── values/                        # Per-service overrides
│       ├── pharmacy.yaml
│       └── doctor-appointment.yaml
│
├── scripts/                           # Setup scripts (run on EC2)
│   ├── setup-nfs.sh                   # NFS server on master node
│   ├── setup-haproxy.sh               # HAProxy on master node
│   └── setup-worker.sh                # Worker node prep
│
├── haproxy/
│   └── haproxy.cfg                    # HAProxy config reference
│
├── docs/
│   ├── architecture.md                # Architecture diagram + resource budget
│   ├── execution-guide.md             # Step-by-step deploy + verify
│   ├── concepts-explained.md          # 32 K8s concepts for review
│   ├── k8s-resource-mapping.md        # Component → resource mapping
│   └── migration-guide.md             # Docker Compose → K8s migration
│
└── docker-compose.yml                 # Local development (no K8s)
```
