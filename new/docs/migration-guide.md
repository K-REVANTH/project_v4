# Migration Guide: Docker Compose → Kubernetes

## Step-by-Step Migration

### Phase 1: Verify Docker Compose Works

```bash
# 1. Build and start all services
docker-compose up -d --build

# 2. Verify all containers are running
docker-compose ps

# 3. Test health endpoints
curl http://localhost:3001/health  # user-management
curl http://localhost:3002/health  # doctor-appointment
curl http://localhost:5001/health  # pharmacy
curl http://localhost:5002/health  # medical-records
curl http://localhost:3003/health  # lab-appointment
curl http://localhost:3004/health  # ambulance-booking
curl http://localhost:3005/health  # aggregator

# 4. Open frontend
open http://localhost:3000

# 5. Clean up when done
docker-compose down
```

---

### Phase 2: Build and Push Docker Images

```bash
# Tag images for your registry (e.g., Docker Hub or ECR)
REGISTRY="your-dockerhub-username"

# Build all images
docker build -t $REGISTRY/healthcare-user-management:latest ./services/user-management
docker build -t $REGISTRY/healthcare-doctor-appointment:latest ./services/doctor-appointment
docker build -t $REGISTRY/healthcare-pharmacy:latest ./services/pharmacy
docker build -t $REGISTRY/healthcare-medical-records:latest ./services/medical-records
docker build -t $REGISTRY/healthcare-lab-appointment:latest ./services/lab-appointment
docker build -t $REGISTRY/healthcare-ambulance-booking:latest ./services/ambulance-booking
docker build -t $REGISTRY/healthcare-aggregator:latest ./services/aggregator
docker build -t $REGISTRY/healthcare-frontend:latest ./frontend

# Push all images
for svc in user-management doctor-appointment pharmacy medical-records lab-appointment ambulance-booking aggregator frontend; do
  docker push $REGISTRY/healthcare-$svc:latest
done
```

> ⚠️ Update the `image:` field in each K8s Deployment YAML to match your registry path.

---

### Phase 3: Setup kubeadm Cluster on AWS

```bash
# On all nodes (master + workers):
# 1. Install container runtime (containerd)
# 2. Install kubeadm, kubelet, kubectl
# 3. Disable swap

# On master node:
sudo kubeadm init --pod-network-cidr=10.244.0.0/16

# Set up kubectl
mkdir -p $HOME/.kube
sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config

# Install CNI (Calico or Flannel)
kubectl apply -f https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml

# On worker nodes:
sudo kubeadm join <master-ip>:6443 --token <token> --discovery-token-ca-cert-hash <hash>

# Verify
kubectl get nodes
```

---

### Phase 4: Install Gateway API + Envoy Gateway

```bash
# Install Gateway API CRDs
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.0.0/standard-install.yaml

# Install Envoy Gateway
kubectl apply -f https://github.com/envoyproxy/gateway/releases/download/v1.0.0/install.yaml

# Verify
kubectl get gatewayclass
```

---

### Phase 5: Apply K8s Manifests (Order Matters!)

```bash
# Step 1: Namespaces
kubectl apply -f k8s/namespaces/namespaces.yaml

# Step 2: Secrets & ConfigMaps (must exist before Deployments reference them)
kubectl apply -f k8s/config/secrets.yaml
kubectl apply -f k8s/config/configmaps.yaml

# Step 3: Infrastructure (MongoDB + RabbitMQ)
kubectl apply -f k8s/infra/mongodb-pv-pvc.yaml
kubectl apply -f k8s/infra/mongodb-statefulset.yaml
kubectl apply -f k8s/infra/mongodb-service.yaml
kubectl apply -f k8s/infra/rabbitmq-deployment.yaml

# Wait for infra to be ready
kubectl -n infra get pods -w
# Wait until mongodb-0 and rabbitmq pods show 1/1 Running

# Step 4: Backend Services
kubectl apply -f k8s/backend/services.yaml
kubectl apply -f k8s/backend/user-management-deployment.yaml
kubectl apply -f k8s/backend/doctor-appointment-deployment.yaml
kubectl apply -f k8s/backend/pharmacy-deployment.yaml
kubectl apply -f k8s/backend/medical-records-deployment.yaml
kubectl apply -f k8s/backend/lab-ambulance-deployments.yaml
kubectl apply -f k8s/backend/aggregator-deployment.yaml

# Verify
kubectl -n backend get pods
kubectl -n backend get svc

# Step 5: Frontend
kubectl apply -f k8s/frontend/frontend-deployment.yaml
kubectl apply -f k8s/frontend/frontend-service.yaml

# Step 6: Gateway API routing
kubectl apply -f k8s/gateway/gateway-class.yaml
kubectl apply -f k8s/gateway/gateway.yaml
kubectl apply -f k8s/gateway/httproutes.yaml

# Verify
kubectl -n ingress get gateway
kubectl -n backend get httproute
```

---

### Phase 6: Setup HAProxy (External EC2 Instance)

```bash
# Install HAProxy on a separate EC2 instance (or the same one)
sudo apt-get install -y haproxy

# Edit config
sudo cp haproxy/haproxy.cfg /etc/haproxy/haproxy.cfg

# Replace <WORKER_NODE_IP> placeholders with actual EC2 private IPs
sudo vi /etc/haproxy/haproxy.cfg

# Restart
sudo systemctl restart haproxy
sudo systemctl status haproxy

# Test
curl http://<haproxy-ip>/api/aggregator/health-check
```

---

### Phase 7: Verify End-to-End

```bash
# Via HAProxy
curl http://<haproxy-public-ip>/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"pass123"}'

curl http://<haproxy-public-ip>/api/doctors
curl http://<haproxy-public-ip>/api/pharmacy/medicines
curl http://<haproxy-public-ip>/api/aggregator/dashboard

# Frontend (NodePort direct)
open http://<worker-node-ip>:30000
```

---

## Debugging Cheatsheet

```bash
# Check pod status in any namespace
kubectl get pods -n backend
kubectl get pods -n infra
kubectl get pods -n frontend

# Describe a failing pod
kubectl describe pod <pod-name> -n <namespace>

# View pod logs
kubectl logs <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace> --previous  # for crashed pods

# Check events
kubectl get events -n <namespace> --sort-by='.lastTimestamp'

# Exec into a pod
kubectl exec -it <pod-name> -n <namespace> -- /bin/sh

# Test internal DNS
kubectl run dns-test --image=busybox --rm -it -- nslookup mongodb-headless.infra.svc.cluster.local

# Port-forward for debugging
kubectl port-forward svc/rabbitmq 15672:15672 -n infra  # Access RabbitMQ UI
```
