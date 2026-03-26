# Migration Guide: Docker Compose → Kubernetes (v2)

## Pre-Migration Checklist

- [ ] All 6 services pass health checks locally
- [ ] RBAC login/register works for all 3 roles
- [ ] Docker images built and pushed to registry
- [ ] kubeadm cluster running (master + 2 workers min)
- [ ] NFS server configured (if using NFS storage)
- [ ] Envoy Gateway installed

---

## Phase 1: Verify Docker Compose Works

```bash
# Build and start all services (no aggregator)
docker-compose up -d --build

# Verify 8 containers running (2 infra + 6 services + frontend)
docker-compose ps

# Test health endpoints
for port in 3001 3002 3003 3004 5001 5002; do
  curl -s http://localhost:$port/health | jq .
done

# Test RBAC: register + login
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@test.com","password":"pass123","role":"admin"}'

# Clean up
docker-compose down
```

---

## Phase 2: Build and Push Docker Images

```bash
REGISTRY="your-dockerhub-username"

# Build (no aggregator — 6 services + frontend)
for svc in user-management doctor-appointment lab-appointment ambulance-booking; do
  docker build -t $REGISTRY/healthcare-$svc:latest ./services/$svc
done
for svc in pharmacy medical-records; do
  docker build -t $REGISTRY/healthcare-$svc:latest ./services/$svc
done
docker build -t $REGISTRY/healthcare-frontend:latest ./frontend

# Push
for svc in user-management doctor-appointment pharmacy medical-records lab-appointment ambulance-booking frontend; do
  docker push $REGISTRY/healthcare-$svc:latest
done
```

> ⚠️ Update `image:` in all K8s Deployment YAMLs to match your registry.

---

## Phase 3: Setup kubeadm Cluster

```bash
# On all nodes (master + workers):
sudo kubeadm init --pod-network-cidr=10.244.0.0/16
mkdir -p $HOME/.kube && sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config

# Install Flannel CNI
kubectl apply -f https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml

# Join workers
sudo kubeadm join <master-ip>:6443 --token <token> --discovery-token-ca-cert-hash <hash>

# Install metrics-server (required for HPA)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

---

## Phase 4: Setup NFS Server (for dynamic storage)

```bash
# On NFS server (can be master node or separate EC2):
sudo apt install nfs-kernel-server
sudo mkdir -p /srv/nfs/k8s-data
sudo chown nobody:nogroup /srv/nfs/k8s-data
sudo chmod 777 /srv/nfs/k8s-data

# Add to /etc/exports:
echo "/srv/nfs/k8s-data *(rw,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports
sudo exportfs -ra
sudo systemctl restart nfs-kernel-server

# On ALL worker nodes:
sudo apt install nfs-common
```

---

## Phase 5: Install Gateway API + Envoy Gateway

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.0.0/standard-install.yaml
kubectl apply -f https://github.com/envoyproxy/gateway/releases/download/v1.0.0/install.yaml
kubectl get gatewayclass
```

---

## Phase 6: Apply K8s Manifests (ORDER MATTERS!)

```bash
# Step 1: Namespaces (must exist before anything else)
kubectl apply -f k8s/namespaces/namespaces.yaml

# Step 2: Storage (StorageClass before StatefulSets)
kubectl apply -f k8s/storage/storageclass.yaml
kubectl apply -f k8s/storage/nfs-provisioner.yaml

# Step 3: Config (Secrets + ConfigMaps before Deployments reference them)
kubectl apply -f k8s/config/secrets.yaml
kubectl apply -f k8s/config/configmaps.yaml

# Step 4: Infrastructure (MongoDB + RabbitMQ)
kubectl apply -f k8s/infra/mongodb-pv-pvc.yaml      # Only if using hostPath/manual
kubectl apply -f k8s/infra/mongodb-statefulset.yaml
kubectl apply -f k8s/infra/mongodb-service.yaml
kubectl apply -f k8s/infra/rabbitmq-deployment.yaml

# Wait for infra
kubectl -n infra get pods -w
# Wait until mongodb-0 = 1/1 Running and rabbitmq = 1/1 Running

# Step 5: Backend Services
kubectl apply -f k8s/backend/services.yaml                    # ClusterIP services
kubectl apply -f k8s/backend/user-management-deployment.yaml  # Has init containers
kubectl apply -f k8s/backend/doctor-appointment-deployment.yaml  # Has sidecar
kubectl apply -f k8s/advanced/deployment-strategies.yaml      # Pharmacy + Medical Records
kubectl apply -f k8s/backend/lab-ambulance-deployments.yaml

# Verify backend
kubectl -n backend get pods
kubectl -n backend get svc

# Step 6: Frontend
kubectl apply -f k8s/frontend/frontend-deployment.yaml
kubectl apply -f k8s/frontend/frontend-service.yaml

# Step 7: Gateway routing (6 HTTPRoutes — no aggregator)
kubectl apply -f k8s/gateway/gateway-class.yaml
kubectl apply -f k8s/gateway/gateway.yaml
kubectl apply -f k8s/gateway/httproutes.yaml

# Step 8: Advanced (DaemonSet + HPA)
kubectl apply -f k8s/advanced/daemonset-log-agent.yaml
kubectl apply -f k8s/advanced/scaling-examples.yaml

# Verify everything
kubectl get pods -A
kubectl -n ingress get gateway
kubectl -n backend get httproute
kubectl get hpa -n backend
```

---

## Phase 7: Setup HAProxy

```bash
sudo apt install haproxy
sudo cp haproxy/haproxy.cfg /etc/haproxy/haproxy.cfg
# Replace <WORKER_NODE_IP> with actual IPs
sudo systemctl restart haproxy
```

---

## Phase 8: Verify End-to-End

```bash
# Register admin
curl -X POST http://<haproxy-ip>/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@test.com","password":"pass123","role":"admin"}'

# Login
TOKEN=$(curl -s -X POST http://<haproxy-ip>/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"pass123"}' | jq -r .token)

# Test RBAC (admin-only endpoint)
curl -H "Authorization: Bearer $TOKEN" http://<haproxy-ip>/api/users/all

# Test services
curl http://<haproxy-ip>/api/doctors
curl http://<haproxy-ip>/api/pharmacy/medicines
curl http://<haproxy-ip>/api/labs

# Frontend
open http://<worker-node-ip>:30000
```

---

## Debugging Cheatsheet

```bash
kubectl get pods -n backend                              # Pod status
kubectl describe pod <pod> -n backend                    # Events + conditions
kubectl logs <pod> -n backend                            # App logs
kubectl logs <pod> -n backend -c log-forwarder           # Sidecar logs
kubectl logs <pod> -n backend --previous                 # Crashed pod logs
kubectl get events -n backend --sort-by='.lastTimestamp'  # Recent events
kubectl exec -it <pod> -n backend -- /bin/sh             # Shell into pod
kubectl port-forward svc/rabbitmq 15672:15672 -n infra   # RabbitMQ UI
kubectl rollout history deployment/pharmacy -n backend   # Deployment history
kubectl rollout undo deployment/pharmacy -n backend      # Rollback
kubectl top pods -n backend                              # Resource usage
kubectl get hpa -n backend                               # Auto-scaler status
```
