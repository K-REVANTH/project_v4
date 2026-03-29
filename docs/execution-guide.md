# Step-by-Step Execution Guide (3-Node Cluster)

## Prerequisites
- 3 EC2 instances (Ubuntu 22.04, t3.medium minimum)
  - Master: 1× (also runs HAProxy + NFS)
  - Worker: 2×
- kubeadm, kubelet, kubectl installed on all nodes
- Docker or containerd runtime installed
- Security groups: allow 80, 3000, 6443, 8404, 30000-30100, 2049 (NFS)

---

## STEP 1: Initialize K8s Cluster

```bash
# ─── ON MASTER NODE ───
sudo kubeadm init --pod-network-cidr=192.168.0.0/16

# Setup kubectl
mkdir -p $HOME/.kube
sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config

# Install Calico CNI (supports NetworkPolicies — NOT Flannel)
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml

# Get join command for workers
kubeadm token create --print-join-command
```

```bash
# ─── ON EACH WORKER NODE ───
sudo kubeadm join <master-ip>:6443 --token <token> --discovery-token-ca-cert-hash <hash>
```

```bash
# ─── VERIFY (on master) ───
kubectl get nodes
# Should show: master=Ready, worker-1=Ready, worker-2=Ready
```

---

## STEP 2: Label Nodes

```bash
kubectl label node <worker-1-hostname> role=database
kubectl label node <worker-1-hostname> role=worker
kubectl label node <worker-2-hostname> role=worker
```

---

## STEP 3: Setup NFS on Master Node

```bash
# On MASTER NODE:
chmod +x scripts/setup-nfs.sh
sudo ./scripts/setup-nfs.sh

# On EACH WORKER NODE:
sudo apt-get install -y nfs-common

# Test from worker:
sudo mount -t nfs <MASTER_IP>:/srv/nfs/k8s-data /mnt
ls /mnt && sudo umount /mnt
```

---

## STEP 4: Setup HAProxy on Master Node

```bash
# On MASTER NODE:
chmod +x scripts/setup-haproxy.sh
sudo ./scripts/setup-haproxy.sh <WORKER1_IP> <WORKER2_IP>

# Verify:
curl http://localhost:8404/stats  # Should show HAProxy stats
```

---

## STEP 5: Install prerequisites

```bash
# Envoy Gateway
kubectl apply -f https://github.com/envoyproxy/gateway/releases/download/v1.0.0/install.yaml

# Metrics Server (for HPA)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
# Fix for kubeadm: add --kubelet-insecure-tls to metrics-server args
```

---

## STEP 6: Deploy K8s Manifests (ORDER MATTERS!)

```bash
# 1. Namespaces (must exist before anything else)
kubectl apply -f k8s/namespaces/namespaces.yaml

# 2. Security (ServiceAccounts, Roles — before deployments reference them)
kubectl apply -f k8s/security/rbac.yaml

# 3. Storage (StorageClass + NFS provisioner)
kubectl apply -f k8s/storage/storageclass.yaml
# UPDATE nfs-provisioner.yaml: replace <NFS_SERVER_IP> with master IP!
kubectl apply -f k8s/storage/nfs-provisioner.yaml

# 4. Config (Secrets + ConfigMaps — before deployments reference them)
kubectl apply -f k8s/config/secrets.yaml
kubectl apply -f k8s/config/configmaps.yaml

# 5. Infrastructure (MongoDB + RabbitMQ — backend services depend on these)
kubectl apply -f k8s/infra/mongodb-pv-pvc.yaml
kubectl apply -f k8s/infra/mongodb-statefulset.yaml
kubectl apply -f k8s/infra/mongodb-service.yaml
kubectl apply -f k8s/infra/rabbitmq-deployment.yaml

# WAIT for infra to be ready
kubectl get pods -n infra -w
# Wait until mongodb-0 = 1/1 Running, rabbitmq = 1/1 Running

# 6. Backend Services (init containers will wait for MongoDB/RabbitMQ)
kubectl apply -f k8s/backend/services.yaml
kubectl apply -f k8s/backend/user-management-deployment.yaml
kubectl apply -f k8s/backend/doctor-appointment-deployment.yaml
kubectl apply -f k8s/advanced/deployment-strategies.yaml
kubectl apply -f k8s/backend/lab-ambulance-deployments.yaml

# 7. Frontend
kubectl apply -f k8s/frontend/frontend-deployment.yaml
kubectl apply -f k8s/frontend/frontend-service.yaml

# 8. Gateway API
kubectl apply -f k8s/gateway/gateway-class.yaml
kubectl apply -f k8s/gateway/gateway.yaml
kubectl apply -f k8s/gateway/httproutes.yaml

# 9. Network Policies
kubectl apply -f k8s/security/network-policies.yaml

# 10. Monitoring
kubectl apply -f k8s/monitoring/prometheus-grafana.yaml

# 11. Advanced (DaemonSet, HPA, VPA)
kubectl apply -f k8s/advanced/daemonset-log-agent.yaml
kubectl apply -f k8s/advanced/scaling-examples.yaml
kubectl apply -f k8s/advanced/vpa-examples.yaml
```

---

## STEP 7: Verify Everything

```bash
# Check all pods are running
kubectl get pods -A

# Check services
kubectl get svc -A

# Check PVCs bound
kubectl get pvc -n infra

# Check HPA
kubectl get hpa -n backend

# Check network policies
kubectl get networkpolicy -A

# Check Gateway
kubectl -n ingress get gateway
kubectl -n backend get httproute

# Check DaemonSet (should have pods = node count)
kubectl get daemonset -n infra

# Check RBAC
kubectl get serviceaccount -n backend
kubectl get roles -n backend
kubectl get rolebindings -n backend
```

---

## STEP 8: Test Application

```bash
MASTER_IP=<your-master-public-ip>

# Test API via HAProxy → Gateway → Backend
curl -X POST http://$MASTER_IP/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@test.com","password":"pass123","role":"admin"}'

# Login
TOKEN=$(curl -s -X POST http://$MASTER_IP/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"pass123"}' | jq -r .token)

# Test with token
curl -H "Authorization: Bearer $TOKEN" http://$MASTER_IP/api/users/all

# Frontend
open http://$MASTER_IP:3000

# Prometheus
open http://<WORKER2_IP>:30090

# Grafana (admin / healthcare123)
open http://<WORKER2_IP>:30030

# HAProxy stats
open http://$MASTER_IP:8404/stats
```

---

## STEP 9: Demonstrate K8s Operations

```bash
# Rolling update
kubectl set image deployment/pharmacy pharmacy=revanth654/healthcare-pharmacy:v3 -n backend
kubectl rollout status deployment/pharmacy -n backend

# Rollback
kubectl rollout undo deployment/pharmacy -n backend

# Manual scaling
kubectl scale deployment/doctor-appointment --replicas=4 -n backend

# Check HPA response
kubectl get hpa -n backend -w

# View pod distribution across nodes
kubectl get pods -n backend -o wide

# Check init container logs
kubectl logs user-management-<pod-id> -c wait-for-mongodb -n backend

# Check sidecar logs
kubectl logs doctor-appointment-<pod-id> -c log-forwarder -n backend

# Check DaemonSet
kubectl get pods -n infra -l app=log-agent -o wide
```

---

## Helm Deployment (Alternative to kubectl apply)

```bash
# Install a service via Helm chart
helm install user-management ./helm/healthcare-service -n backend

# Install with custom values
helm install pharmacy ./helm/healthcare-service -f helm/values/pharmacy.yaml -n backend

# Upgrade
helm upgrade pharmacy ./helm/healthcare-service -f helm/values/pharmacy.yaml -n backend

# List
helm list -n backend

# Uninstall
helm uninstall pharmacy -n backend
```
