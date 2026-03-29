# Healthcare Platform — Complete Kubernetes Verification Checklist

> **Cluster**: 1 Master + 2 Workers | **Namespaces**: `frontend`, `backend`, `infra`, `ingress`, `monitoring`
> **Replace** `<MASTER_IP>`, `<WORKER1_IP>`, `<WORKER2_IP>` with your actual EC2 private/public IPs.

---

## 1. CLUSTER HEALTH

### 1.1 Node Status
```bash
kubectl get nodes -o wide
```
**Expected**: 3 nodes with `STATUS: Ready`, Roles: `control-plane` (master), `<none>` (workers).

```bash
kubectl describe node <MASTER_NODE_NAME> | grep -A5 "Conditions"
kubectl describe node <WORKER1_NODE_NAME> | grep -A5 "Conditions"
kubectl describe node <WORKER2_NODE_NAME> | grep -A5 "Conditions"
```
**Expected**: `MemoryPressure=False`, `DiskPressure=False`, `PIDPressure=False`, `Ready=True`.

**If FAILED**:
```bash
# Check kubelet status on the failing node (SSH into node first)
sudo systemctl status kubelet
sudo journalctl -u kubelet --no-pager -n 50
```

### 1.2 Namespaces
```bash
kubectl get namespaces --show-labels
```
**Expected**:
| Namespace   | Status | Label                                   |
|-------------|--------|-----------------------------------------|
| frontend    | Active | app.kubernetes.io/part-of=healthcare-platform |
| backend     | Active | app.kubernetes.io/part-of=healthcare-platform |
| infra       | Active | app.kubernetes.io/part-of=healthcare-platform |
| ingress     | Active | app.kubernetes.io/part-of=healthcare-platform |
| monitoring  | Active | app.kubernetes.io/part-of=healthcare-platform |

**If MISSING**:
```bash
kubectl apply -f k8s/namespaces/namespaces.yaml
```

### 1.3 System Pods
```bash
kubectl get pods -n kube-system -o wide
```
**Expected**: All system pods (`coredns`, `etcd`, `kube-apiserver`, `kube-controller-manager`, `kube-scheduler`, `kube-proxy`) should be `Running`.

```bash
kubectl get pods -n kube-system | grep -v Running
```
**Expected**: No output (all Running). If any pod is not running:
```bash
kubectl describe pod <POD_NAME> -n kube-system
kubectl logs <POD_NAME> -n kube-system --tail=30
```

### 1.4 Node Resources
```bash
kubectl top nodes
```
**Expected**: CPU and Memory usage shown for all 3 nodes. If `error: Metrics API not available`:
```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
# Wait 60 seconds, then retry
```

### 1.5 Node Labels (Required for MongoDB affinity)
```bash
kubectl get nodes --show-labels | grep "role=database"
```
**Expected**: One worker node has `role=database` label.

**If MISSING**:
```bash
kubectl label node <WORKER1_NODE_NAME> role=database
```

---

## 2. INFRA SERVICES

### 2.1 MongoDB — StatefulSet

**Pod Status**:
```bash
kubectl get statefulset mongodb -n infra
kubectl get pods -n infra -l app=mongodb -o wide
```
**Expected**: `mongodb-0` pod in `Running` state (1/1 Ready), scheduled on the `role=database` labeled node.

**Init Container Check**:
```bash
kubectl describe pod mongodb-0 -n infra | grep -A10 "Init Containers"
```
**Expected**: `init-check-storage` init container shows `State: Terminated` with `Reason: Completed`.

**Connectivity Test** (from inside the cluster):
```bash
kubectl run mongo-test --rm -it --restart=Never --image=busybox:1.36 -n infra -- sh -c \
  "nc -zv mongodb-headless.infra.svc.cluster.local 27017 && echo 'Headless OK'; \
   nc -zv mongodb.infra.svc.cluster.local 27017 && echo 'ClusterIP OK'"
```
**Expected**: Both connections succeed with `open` message + `Headless OK` + `ClusterIP OK`.

**MongoDB Auth Test**:
```bash
kubectl exec -it mongodb-0 -n infra -- mongosh --eval "db.adminCommand('ping')"
```
**Expected**: `{ ok: 1 }`

**Probe Status**:
```bash
kubectl describe pod mongodb-0 -n infra | grep -A5 "Liveness\|Readiness"
```
**Expected**: Both probes showing `Success`.

**If FAILED — Pod stuck in Pending**:
```bash
kubectl describe pod mongodb-0 -n infra | grep -A10 "Events"
# Common: No node matches nodeAffinity → label node: kubectl label node <NODE> role=database
# Common: PVC pending → check PVC section below
```

**If FAILED — CrashLoopBackOff**:
```bash
kubectl logs mongodb-0 -n infra --tail=50
kubectl logs mongodb-0 -n infra -c init-check-storage  # Init container logs
```

### 2.2 MongoDB — Services

```bash
kubectl get svc -n infra -l app=mongodb
```
**Expected**:
| NAME              | TYPE      | CLUSTER-IP | PORT(S)    |
|-------------------|-----------|------------|------------|
| mongodb-headless  | ClusterIP | None       | 27017/TCP  |
| mongodb           | ClusterIP | 10.x.x.x  | 27017/TCP  |

**DNS Resolution Test**:
```bash
kubectl run dns-test --rm -it --restart=Never --image=busybox:1.36 -n backend -- nslookup mongodb-headless.infra.svc.cluster.local
```
**Expected**: Returns IP address of `mongodb-0`.

### 2.3 RabbitMQ

**Pod Status**:
```bash
kubectl get deployment rabbitmq -n infra
kubectl get pods -n infra -l app=rabbitmq -o wide
```
**Expected**: 1/1 replicas Ready, pod in `Running` state.

**Service Check**:
```bash
kubectl get svc rabbitmq -n infra
```
**Expected**: ClusterIP with ports `5672` (AMQP) and `15672` (Management).

**Connectivity Test**:
```bash
kubectl run rmq-test --rm -it --restart=Never --image=busybox:1.36 -n infra -- sh -c \
  "nc -zv rabbitmq.infra.svc.cluster.local 5672 && echo 'AMQP OK'; \
   nc -zv rabbitmq.infra.svc.cluster.local 15672 && echo 'Management OK'"
```
**Expected**: Both ports accessible.

**RabbitMQ Health**:
```bash
kubectl exec -it $(kubectl get pod -n infra -l app=rabbitmq -o jsonpath='{.items[0].metadata.name}') -n infra -- rabbitmq-diagnostics -q ping
```
**Expected**: `Ping succeeded`.

**If FAILED**:
```bash
kubectl logs $(kubectl get pod -n infra -l app=rabbitmq -o jsonpath='{.items[0].metadata.name}') -n infra --tail=30
kubectl describe pod $(kubectl get pod -n infra -l app=rabbitmq -o jsonpath='{.items[0].metadata.name}') -n infra
```

---

## 3. BACKEND SERVICES

### 3.1 All Deployments Status (Single View)
```bash
kubectl get deployments -n backend -o wide
```
**Expected**:
| NAME                | READY | UP-TO-DATE | AVAILABLE |
|---------------------|-------|------------|-----------|
| user-management     | 2/2   | 2          | 2         |
| doctor-appointment  | 2/2   | 2          | 2         |
| lab-appointment     | 2/2   | 2          | 2         |
| ambulance-booking   | 2/2   | 2          | 2         |
| pharmacy            | 2/2   | 2          | 2         |
| medical-records     | 2/2   | 2          | 2         |

### 3.2 All Backend Pods
```bash
kubectl get pods -n backend -o wide --show-labels
```
**Expected**: All pods `Running` with `1/1` or `2/2` (doctor-appointment has sidecar so shows `2/2`). Pods should be spread across both worker nodes (anti-affinity).

### 3.3 Verify Pod Spread (Anti-Affinity Working)
```bash
kubectl get pods -n backend -o custom-columns="POD:.metadata.name,NODE:.spec.nodeName,STATUS:.status.phase"
```
**Expected**: For each deployment, replicas are on different worker nodes.

### 3.4 Init Container Status
```bash
kubectl get pods -n backend -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .status.initContainerStatuses[*]}{.name}:{.state.terminated.reason}{" "}{end}{"\n"}{end}'
```
**Expected**: All init containers show `Completed`.

**If Init Containers Stuck**:
```bash
# Check which init container is stuck
kubectl describe pod <POD_NAME> -n backend | grep -A15 "Init Containers"
# Most likely MongoDB or RabbitMQ not reachable — fix infra first
```

### 3.5 All ClusterIP Services
```bash
kubectl get svc -n backend
```
**Expected**:
| NAME                | TYPE      | PORT(S)    |
|---------------------|-----------|------------|
| user-management     | ClusterIP | 3001/TCP   |
| doctor-appointment  | ClusterIP | 3002/TCP   |
| pharmacy            | ClusterIP | 5001/TCP   |
| medical-records     | ClusterIP | 5002/TCP   |
| lab-appointment     | ClusterIP | 3003/TCP   |
| ambulance-booking   | ClusterIP | 3004/TCP   |

### 3.6 Service Endpoint Binding
```bash
kubectl get endpoints -n backend
```
**Expected**: Each service shows 2 IP:PORT pairs (2 replicas each). If `<none>` — selector mismatch.

**Fix Selector Mismatch**:
```bash
# Compare deployment labels vs service selector
kubectl get deployment <DEPLOY_NAME> -n backend -o jsonpath='{.spec.template.metadata.labels}'
kubectl get svc <SVC_NAME> -n backend -o jsonpath='{.spec.selector}'
# They must match
```

### 3.7 Health Endpoint Test (Per Service)
```bash
# User Management
kubectl run health-test --rm -it --restart=Never --image=curlimages/curl -n backend -- curl -s http://user-management.backend.svc.cluster.local:3001/health

# Doctor Appointment
kubectl run health-test2 --rm -it --restart=Never --image=curlimages/curl -n backend -- curl -s http://doctor-appointment.backend.svc.cluster.local:3002/health

# Pharmacy
kubectl run health-test3 --rm -it --restart=Never --image=curlimages/curl -n backend -- curl -s http://pharmacy.backend.svc.cluster.local:5001/health

# Medical Records
kubectl run health-test4 --rm -it --restart=Never --image=curlimages/curl -n backend -- curl -s http://medical-records.backend.svc.cluster.local:5002/health

# Lab Appointment
kubectl run health-test5 --rm -it --restart=Never --image=curlimages/curl -n backend -- curl -s http://lab-appointment.backend.svc.cluster.local:3003/health

# Ambulance Booking
kubectl run health-test6 --rm -it --restart=Never --image=curlimages/curl -n backend -- curl -s http://ambulance-booking.backend.svc.cluster.local:3004/health
```
**Expected**: Each returns a healthy JSON response (e.g., `{"status":"ok"}` or `200`).

### 3.8 Doctor Appointment — Sidecar Verification
```bash
# Check container count (should be 2: main + log-forwarder)
kubectl get pods -n backend -l app=doctor-appointment -o jsonpath='{range .items[*]}{.metadata.name}: {range .spec.containers[*]}{.name} {end}{"\n"}{end}'
```
**Expected**: Each pod shows `doctor-appointment log-forwarder`.

```bash
# Verify sidecar is tailing logs
kubectl logs $(kubectl get pod -n backend -l app=doctor-appointment -o jsonpath='{.items[0].metadata.name}') -n backend -c log-forwarder --tail=10
```

### 3.9 ServiceAccount Binding
```bash
kubectl get pods -n backend -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.serviceAccountName}{"\n"}{end}'
```
**Expected**: All backend pods use `backend-sa` ServiceAccount.

---

## 4. FRONTEND

### 4.1 Deployment Status
```bash
kubectl get deployment frontend -n frontend
kubectl get pods -n frontend -o wide
```
**Expected**: 2/2 replicas Running.

### 4.2 Service (NodePort :30000)
```bash
kubectl get svc frontend -n frontend
```
**Expected**: `TYPE: NodePort`, Ports: `3000:30000/TCP`.

### 4.3 Access Test via NodePort
```bash
# From master node or any node in the cluster
curl -s -o /dev/null -w "%{http_code}" http://<WORKER1_IP>:30000
curl -s -o /dev/null -w "%{http_code}" http://<WORKER2_IP>:30000
curl -s -o /dev/null -w "%{http_code}" http://<MASTER_IP>:30000
```
**Expected**: HTTP `200` from all nodes.

**Browser Test**: Open `http://<ANY_NODE_IP>:30000` in browser — should load the React frontend.

**If FAILED — Connection Refused**:
```bash
kubectl describe svc frontend -n frontend
kubectl get endpoints frontend -n frontend
# Check: Are endpoints populated? If <none>, pod labels don't match service selector.
```

**If FAILED — 502 / Blank Page**:
```bash
kubectl logs $(kubectl get pod -n frontend -l app=frontend -o jsonpath='{.items[0].metadata.name}') -n frontend --tail=30
```

---

## 5. NETWORKING — GATEWAY API

### 5.1 GatewayClass
```bash
kubectl get gatewayclass
```
**Expected**: `healthcare-gateway-class` with `ACCEPTED: True`, controller: `gateway.envoyproxy.io/gatewayclass-controller`.

**If NOT Accepted**:
```bash
# Envoy Gateway controller not installed
kubectl get pods -n envoy-gateway-system
# If namespace doesn't exist:
kubectl apply -f https://github.com/envoyproxy/gateway/releases/download/latest/install.yaml
# Wait 2 minutes, then re-check
```

### 5.2 Gateway
```bash
kubectl get gateway healthcare-gateway -n ingress
kubectl describe gateway healthcare-gateway -n ingress
```
**Expected**: `PROGRAMMED: True`, Listener `http` on port 80 accepting routes from All namespaces.

```bash
# Get the NodePort assigned to the Gateway
kubectl get svc -n envoy-gateway-system | grep healthcare
```
**Expected**: A service with NodePort `30080` mapped to port 80.

**If Gateway Not Programmed**:
```bash
kubectl describe gateway healthcare-gateway -n ingress | grep -A10 "Conditions"
# Check the Envoy proxy pod:
kubectl get pods -n envoy-gateway-system -o wide
kubectl logs -n envoy-gateway-system $(kubectl get pod -n envoy-gateway-system -l gateway.envoyproxy.io/owning-gateway-name=healthcare-gateway -o jsonpath='{.items[0].metadata.name}') --tail=30
```

### 5.3 HTTPRoutes
```bash
kubectl get httproutes -n backend
```
**Expected**:
| NAME                     | HOSTNAMES | PARENT REFS          | AGE |
|--------------------------|-----------|----------------------|-----|
| user-management-route    |           | healthcare-gateway   |     |
| doctor-appointment-route |           | healthcare-gateway   |     |
| pharmacy-route           |           | healthcare-gateway   |     |
| medical-records-route    |           | healthcare-gateway   |     |
| lab-appointment-route    |           | healthcare-gateway   |     |
| ambulance-booking-route  |           | healthcare-gateway   |     |

```bash
# Verify each route is accepted
kubectl get httproutes -n backend -o jsonpath='{range .items[*]}{.metadata.name}: {range .status.parents[*]}{.conditions[*].type}={.conditions[*].status}{end}{"\n"}{end}'
```
**Expected**: All routes show `Accepted=True` and `ResolvedRefs=True`.

### 5.4 Test Routing via Gateway

```bash
# Replace <NODE_IP> with any node IP

# /api/users → user-management:3001
curl -s -o /dev/null -w "%{http_code}" http://<NODE_IP>:30080/api/users
# Expected: 200 or 401 (auth required)

# /api/doctors → doctor-appointment:3002
curl -s -o /dev/null -w "%{http_code}" http://<NODE_IP>:30080/api/doctors
# Expected: 200 or 401

# /api/pharmacy → pharmacy:5001
curl -s -o /dev/null -w "%{http_code}" http://<NODE_IP>:30080/api/pharmacy
# Expected: 200 or 401

# /api/records → medical-records:5002
curl -s -o /dev/null -w "%{http_code}" http://<NODE_IP>:30080/api/records
# Expected: 200 or 401

# /api/labs → lab-appointment:3003
curl -s -o /dev/null -w "%{http_code}" http://<NODE_IP>:30080/api/labs
# Expected: 200 or 401

# /api/ambulance → ambulance-booking:3004
curl -s -o /dev/null -w "%{http_code}" http://<NODE_IP>:30080/api/ambulance
# Expected: 200 or 401
```

**If 404**: Route not matching — check HTTPRoute path prefix matches the curl path.
**If 503**: Backend not reachable — check backend pods and endpoints.

### 5.5 Network Policies Verification
```bash
kubectl get networkpolicies -n backend
kubectl get networkpolicies -n infra
kubectl get networkpolicies -n frontend
```
**Expected**:
- `backend`: `backend-allow-gateway-only`, `default-deny-ingress`
- `infra`: `infra-allow-backend-only`, `rabbitmq-allow-backend-only`
- `frontend`: `frontend-allow-all-ingress`

**Test: Frontend CANNOT reach infra directly** (should be blocked):
```bash
kubectl run netpol-test --rm -it --restart=Never --image=busybox:1.36 -n frontend -- nc -zv -w3 mongodb.infra.svc.cluster.local 27017
```
**Expected**: Connection timed out / refused (blocked by NetworkPolicy).

---

## 6. APPLICATION TESTING

### 6.1 Register a New User
```bash
curl -X POST http://<NODE_IP>:30080/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Patient",
    "email": "testpatient@health.com",
    "password": "Test@1234",
    "role": "patient"
  }'
```
**Expected**: `201` with user object + token:
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 6.2 Login
```bash
curl -X POST http://<NODE_IP>:30080/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testpatient@health.com",
    "password": "Test@1234"
  }'
```
**Expected**: `200` with JWT token. **Save the token**:
```bash
export TOKEN="<paste_the_token_here>"
```

### 6.3 Call Protected Endpoints

```bash
# Get user profile (protected)
curl -s http://<NODE_IP>:30080/api/users/profile \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200 with user details

# List doctors / appointments
curl -s http://<NODE_IP>:30080/api/doctors \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200 with data array or empty array

# List pharmacy items
curl -s http://<NODE_IP>:30080/api/pharmacy \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200

# List lab appointments
curl -s http://<NODE_IP>:30080/api/labs \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200

# List ambulance bookings
curl -s http://<NODE_IP>:30080/api/ambulance \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200
```

### 6.4 Test Without Token (Should Fail)
```bash
curl -s -o /dev/null -w "%{http_code}" http://<NODE_IP>:30080/api/users/profile
```
**Expected**: `401 Unauthorized`.

### 6.5 Verify Data Persisted in MongoDB
```bash
kubectl exec -it mongodb-0 -n infra -- mongosh -u admin -p <MONGO_PASSWORD> --eval \
  "use healthcare; db.users.find({email: 'testpatient@health.com'}).pretty()"
```
**Expected**: Returns the registered user document.

---

## 7. SCALING (HPA)

### 7.1 Check HPA Status
```bash
kubectl get hpa -n backend
```
**Expected**:
| NAME                   | REFERENCE                     | TARGETS      | MINPODS | MAXPODS | REPLICAS |
|------------------------|-------------------------------|--------------|---------|---------|----------|
| pharmacy-hpa           | Deployment/pharmacy           | cpu%/70%     | 2       | 6       |  2       |
| doctor-appointment-hpa | Deployment/doctor-appointment | cpu%/75%     | 2       | 5       |  2       |

**If TARGETS show `<unknown>/70%`**: metrics-server not installed or not scraping.
```bash
kubectl top pods -n backend
# If error → install metrics-server:
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### 7.2 Describe HPA (Detailed)
```bash
kubectl describe hpa pharmacy-hpa -n backend
kubectl describe hpa doctor-appointment-hpa -n backend
```
**Expected**: Shows current metrics, current/desired replicas, and scaling events in conditions.

### 7.3 Generate Load to Trigger Scale-Up
```bash
# Run from inside the cluster (runs for 120 seconds):
kubectl run load-generator --rm -it --restart=Never --image=busybox:1.36 -n backend -- sh -c \
  "echo 'Starting load...'; \
   for i in \$(seq 1 5000); do \
     wget -q -O- http://pharmacy.backend.svc.cluster.local:5001/health > /dev/null 2>&1 & \
   done; \
   echo 'Load sent. Waiting 120s for HPA to react...'; \
   sleep 120"
```

### 7.4 Watch Scaling in Real-Time
```bash
# In a separate terminal:
kubectl get hpa pharmacy-hpa -n backend --watch

# Also watch pods:
kubectl get pods -n backend -l app=pharmacy --watch
```
**Expected**: After ~30s of sustained CPU > 70%, replicas increase (up to max 6, adding 2 at a time per scaling policy).

### 7.5 Manual Scaling Test
```bash
# Scale up
kubectl scale deployment/doctor-appointment --replicas=4 -n backend

# Verify
kubectl get pods -n backend -l app=doctor-appointment
# Expected: 4 pods Running

# Scale back down
kubectl scale deployment/doctor-appointment --replicas=2 -n backend
```

---

## 8. STORAGE

### 8.1 StorageClasses
```bash
kubectl get storageclass
```
**Expected**:
| NAME                    | PROVISIONER                       | RECLAIMPOLICY | VOLUMEBINDINGMODE   |
|-------------------------|-----------------------------------|---------------|---------------------|
| standard-local          | kubernetes.io/no-provisioner      | Retain        | WaitForFirstConsumer|
| nfs-dynamic (default)   | nfs-subdir-external-provisioner   | Retain        | Immediate           |

### 8.2 PVCs
```bash
kubectl get pvc -n infra
kubectl get pvc -A
```
**Expected**: `mongodb-data-mongodb-0` in `Bound` state, `5Gi`, StorageClass `nfs-dynamic`.

**If PVC is Pending**:
```bash
kubectl describe pvc mongodb-data-mongodb-0 -n infra
# Common causes:
# 1. NFS provisioner not running → kubectl get pods -A | grep nfs
# 2. StorageClass mismatch → check SC name matches PVC
# 3. No PV available for standard-local (manual creation required)
```

### 8.3 PVs
```bash
kubectl get pv
```
**Expected**: PV bound to the MongoDB PVC, status `Bound`, reclaim policy `Retain`.

### 8.4 NFS Provisioner (if using nfs-dynamic)
```bash
kubectl get pods -A | grep nfs
```
**Expected**: NFS provisioner pod in `Running` state.

### 8.5 MongoDB Data Persistence Test
```bash
# Step 1: Write test data
kubectl exec -it mongodb-0 -n infra -- mongosh -u admin -p <MONGO_PASSWORD> --eval \
  "use healthcare; db.persistence_test.insertOne({test: 'data-survives-restart', ts: new Date()})"

# Step 2: Delete the pod (StatefulSet recreates it)
kubectl delete pod mongodb-0 -n infra

# Step 3: Wait for pod to come back
kubectl get pods -n infra -l app=mongodb --watch
# Wait until STATUS = Running, READY = 1/1

# Step 4: Verify data survived
kubectl exec -it mongodb-0 -n infra -- mongosh -u admin -p <MONGO_PASSWORD> --eval \
  "use healthcare; db.persistence_test.find().pretty()"
```
**Expected**: The inserted document is returned — proves PVC data persists across pod restarts.

```bash
# Clean up test data
kubectl exec -it mongodb-0 -n infra -- mongosh -u admin -p <MONGO_PASSWORD> --eval \
  "use healthcare; db.persistence_test.drop()"
```

---

## 9. LOGS & DEBUG

### 9.1 Backend Pod Logs — All Services
```bash
# User Management
kubectl logs -n backend -l app=user-management --tail=30 --all-containers=true

# Doctor Appointment (main container)
kubectl logs -n backend -l app=doctor-appointment -c doctor-appointment --tail=30

# Pharmacy
kubectl logs -n backend -l app=pharmacy --tail=30

# Medical Records
kubectl logs -n backend -l app=medical-records --tail=30

# Lab Appointment
kubectl logs -n backend -l app=lab-appointment --tail=30

# Ambulance Booking
kubectl logs -n backend -l app=ambulance-booking --tail=30
```

### 9.2 MongoDB Logs
```bash
kubectl logs mongodb-0 -n infra --tail=50
kubectl logs mongodb-0 -n infra -c init-check-storage   # Init container log
```

### 9.3 RabbitMQ Logs
```bash
kubectl logs -n infra -l app=rabbitmq --tail=50
```

### 9.4 Sidecar Container Logs (Doctor Appointment)
```bash
# Get log-forwarder sidecar output
kubectl logs $(kubectl get pod -n backend -l app=doctor-appointment -o jsonpath='{.items[0].metadata.name}') -n backend -c log-forwarder --tail=30
```

### 9.5 Frontend Logs
```bash
kubectl logs -n frontend -l app=frontend --tail=30
```

### 9.6 Gateway / Envoy Proxy Logs
```bash
kubectl logs -n envoy-gateway-system -l gateway.envoyproxy.io/owning-gateway-name=healthcare-gateway --tail=50
```

### 9.7 Events (Cluster-Wide — Most Recent)
```bash
kubectl get events --all-namespaces --sort-by='.lastTimestamp' | tail -30
```

### 9.8 Debugging a Specific Failing Pod
```bash
# Full pod inspect
kubectl describe pod <POD_NAME> -n <NAMESPACE>

# Previous container logs (if restarting)
kubectl logs <POD_NAME> -n <NAMESPACE> --previous

# Exec into pod for live debugging
kubectl exec -it <POD_NAME> -n <NAMESPACE> -- sh
# Inside: check env vars, connectivity, filesystem, etc.
```

---

## 10. MONITORING STACK

### 10.1 Prometheus
```bash
kubectl get deployment prometheus -n monitoring
kubectl get pods -n monitoring -l app=prometheus
kubectl get svc prometheus -n monitoring
```
**Expected**: 1/1 Running, NodePort `30090`.

**Access**: `http://<NODE_IP>:30090` — Prometheus Web UI.

### 10.2 Grafana
```bash
kubectl get deployment grafana -n monitoring
kubectl get pods -n monitoring -l app=grafana
kubectl get svc grafana -n monitoring
```
**Expected**: 1/1 Running, NodePort `30030`.

**Access**: `http://<NODE_IP>:30030` — Login: `admin` / `healthcare123`.

### 10.3 Verify Prometheus Targets
```bash
curl -s http://<NODE_IP>:30090/api/v1/targets | grep -o '"health":"[^"]*"' | sort | uniq -c
```
**Expected**: Majority shows `"health":"up"`.

---

## 11. SECURITY — RBAC

### 11.1 ServiceAccounts
```bash
kubectl get serviceaccounts -n backend
kubectl get serviceaccounts -n monitoring
```
**Expected**: `backend-sa` in backend, `prometheus-sa` in monitoring.

### 11.2 Roles & RoleBindings
```bash
kubectl get roles,rolebindings -n backend
kubectl get clusterroles,clusterrolebindings | grep -E "prometheus|healthcare"
```

---

## 12. FINAL STATUS CHECK — COMPLETE CHECKLIST

Run this all-in-one summary command:
```bash
echo "=== NODES ===" && kubectl get nodes -o wide && \
echo "" && echo "=== NAMESPACES ===" && kubectl get ns && \
echo "" && echo "=== INFRA ===" && kubectl get all -n infra && \
echo "" && echo "=== BACKEND ===" && kubectl get all -n backend && \
echo "" && echo "=== FRONTEND ===" && kubectl get all -n frontend && \
echo "" && echo "=== INGRESS ===" && kubectl get all -n ingress && \
echo "" && echo "=== MONITORING ===" && kubectl get all -n monitoring && \
echo "" && echo "=== GATEWAY ===" && kubectl get gatewayclass,gateway,httproutes -A && \
echo "" && echo "=== HPA ===" && kubectl get hpa -n backend && \
echo "" && echo "=== PVC ===" && kubectl get pvc -A && \
echo "" && echo "=== STORAGE CLASS ===" && kubectl get sc && \
echo "" && echo "=== NETWORK POLICIES ===" && kubectl get networkpolicies -A
```

### ✅ RUNNING — Success Indicators

| Component              | Namespace   | Expected State                    |
|------------------------|-------------|-----------------------------------|
| Nodes (3)              | —           | All `Ready`                       |
| mongodb-0              | infra       | `Running 1/1`                     |
| rabbitmq-xxx           | infra       | `Running 1/1`                     |
| user-management (×2)   | backend     | `Running 1/1`                     |
| doctor-appointment (×2)| backend     | `Running 2/2` (main + sidecar)    |
| pharmacy (×2)          | backend     | `Running 1/1`                     |
| medical-records (×2)   | backend     | `Running 1/1`                     |
| lab-appointment (×2)   | backend     | `Running 1/1`                     |
| ambulance-booking (×2) | backend     | `Running 1/1`                     |
| frontend (×2)          | frontend    | `Running 1/1`                     |
| Gateway                | ingress     | `Programmed: True`                |
| 6 HTTPRoutes           | backend     | `Accepted: True`                  |
| pharmacy-hpa           | backend     | TARGETS showing actual CPU %      |
| doctor-appointment-hpa | backend     | TARGETS showing actual CPU %      |
| mongodb PVC            | infra       | `Bound`                           |
| prometheus             | monitoring  | `Running 1/1`                     |
| grafana                | monitoring  | `Running 1/1`                     |
| Frontend NodePort      | —           | Accessible at `:30000`            |
| Gateway NodePort       | —           | Accessible at `:30080`            |
| Prometheus NodePort     | —           | Accessible at `:30090`            |
| Grafana NodePort       | —           | Accessible at `:30030`            |

### ❌ FAILURE — Red Flags

| Symptom                              | Likely Cause                                 | Quick Fix                                                    |
|--------------------------------------|----------------------------------------------|--------------------------------------------------------------|
| Node `NotReady`                      | kubelet down / network issue                 | SSH to node → `sudo systemctl restart kubelet`               |
| Pod `Pending`                        | No schedulable node / nodeAffinity mismatch  | `kubectl describe pod` → check Events                        |
| Pod `Init:0/2`                       | MongoDB or RabbitMQ not reachable            | Fix infra pods first, backend pods will auto-resolve         |
| Pod `CrashLoopBackOff`              | App error / wrong env vars / wrong image     | `kubectl logs <pod> --previous` → check error                |
| Pod `ImagePullBackOff`              | Wrong image name or DockerHub rate limit     | `kubectl describe pod` → check image name/tag                |
| PVC `Pending`                        | No PV or provisioner not running             | Check StorageClass exists + provisioner pod is running        |
| HPA `<unknown>/70%`                 | metrics-server not deployed                  | Install metrics-server                                       |
| Gateway `Not Programmed`            | Envoy Gateway not installed                  | Install Envoy Gateway CRDs + controller                      |
| HTTPRoute `Not Accepted`            | Gateway or backend service not found         | Check parentRef name + backend service exists                 |
| Service endpoints `<none>`          | Pod labels don't match service selector      | Compare `kubectl get deploy -o yaml` labels vs `svc` selector |
| `curl` returns `502`               | Backend pod not ready / crashing             | Check backend pod logs and readiness probe                    |
| `curl` returns `404` via Gateway    | HTTPRoute path doesn't match request path    | Compare curl path vs HTTPRoute PathPrefix                     |
| Frontend loads but API calls fail   | Gateway NodePort / CORS / wrong API URL      | Check frontend ConfigMap `VITE_API_URL` value                 |

---

## QUICK REFERENCE — Key DNS Names Inside the Cluster

| Service             | Internal DNS (FQDN)                                  | Port  |
|---------------------|------------------------------------------------------|-------|
| MongoDB (headless)  | `mongodb-headless.infra.svc.cluster.local`           | 27017 |
| MongoDB (ClusterIP) | `mongodb.infra.svc.cluster.local`                    | 27017 |
| RabbitMQ            | `rabbitmq.infra.svc.cluster.local`                   | 5672  |
| RabbitMQ Mgmt       | `rabbitmq.infra.svc.cluster.local`                   | 15672 |
| User Management     | `user-management.backend.svc.cluster.local`          | 3001  |
| Doctor Appointment  | `doctor-appointment.backend.svc.cluster.local`       | 3002  |
| Lab Appointment     | `lab-appointment.backend.svc.cluster.local`          | 3003  |
| Ambulance Booking   | `ambulance-booking.backend.svc.cluster.local`        | 3004  |
| Pharmacy            | `pharmacy.backend.svc.cluster.local`                 | 5001  |
| Medical Records     | `medical-records.backend.svc.cluster.local`          | 5002  |
| Prometheus          | `prometheus.monitoring.svc.cluster.local`            | 9090  |
| Grafana             | `grafana.monitoring.svc.cluster.local`               | 3000  |

## QUICK REFERENCE — External Access Ports

| Service    | URL                          |
|------------|------------------------------|
| Frontend   | `http://<NODE_IP>:30000`     |
| Gateway    | `http://<NODE_IP>:30080`     |
| Prometheus | `http://<NODE_IP>:30090`     |
| Grafana    | `http://<NODE_IP>:30030`     |
