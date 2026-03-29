#!/bin/bash
# ════════════════════════════════════════════════════════════
# HAProxy Setup — Run on MASTER NODE
# ════════════════════════════════════════════════════════════
#
# WHY ON MASTER NODE:
# With only 3 EC2 instances, we can't use a separate HAProxy server.
# Running HAProxy as a host-level service on the master node is the
# best approach because:
# 1. It runs OUTSIDE K8s — so it can forward to K8s NodePorts
# 2. The master node's public IP can receive external traffic
# 3. It doesn't consume K8s resources (no pod overhead)
# 4. Survives even if K8s has issues (unlike a K8s Deployment)
#
# ALTERNATIVE CONSIDERED:
# - HAProxy as K8s DaemonSet: Would consume pod resources and creates
#   a chicken-and-egg problem (K8s must be up for HAProxy to start)
#
# RUN THIS SCRIPT ON THE MASTER NODE:
#   chmod +x scripts/setup-haproxy.sh
#   sudo ./scripts/setup-haproxy.sh <WORKER1_IP> <WORKER2_IP>

set -e

WORKER1_IP=${1:?"Usage: $0 <WORKER1_IP> <WORKER2_IP>"}
WORKER2_IP=${2:?"Usage: $0 <WORKER1_IP> <WORKER2_IP>"}

echo "═══════════════════════════════════════"
echo " HAProxy Setup (Master Node)"
echo "═══════════════════════════════════════"

# 1. Install HAProxy
echo "[1/4] Installing HAProxy..."
apt-get update -qq
apt-get install -y haproxy

# 2. Write config
echo "[2/4] Writing HAProxy config..."
cat > /etc/haproxy/haproxy.cfg << EOF
#---------------------------------------------------------------------
# HAProxy Configuration — Healthcare Microservices
# Runs on MASTER NODE (host-level, outside K8s)
# Forwards port 80 → K8s Gateway API NodePort 30080
#---------------------------------------------------------------------
global
    log stdout format raw local0
    maxconn 4096
    daemon

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    timeout connect 5s
    timeout client  30s
    timeout server  30s
    retries 3

# Stats page: http://<MASTER_IP>:8404/stats
frontend stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 10s

# Accept HTTP on port 80 → forward to K8s Gateway
frontend http_front
    bind *:80
    default_backend k8s_gateway

# K8s Gateway backend (worker nodes, NodePort 30080)
backend k8s_gateway
    balance roundrobin
    option httpchk GET /healthz
    http-check expect status 200
    server worker-1 ${WORKER1_IP}:30080 check inter 5s fall 3 rise 2
    server worker-2 ${WORKER2_IP}:30080 check inter 5s fall 3 rise 2

# Frontend app (worker nodes, NodePort 30000)
frontend frontend_http
    bind *:3000
    default_backend k8s_frontend

backend k8s_frontend
    balance roundrobin
    server worker-1 ${WORKER1_IP}:30000 check inter 5s fall 3 rise 2
    server worker-2 ${WORKER2_IP}:30000 check inter 5s fall 3 rise 2
EOF

# 3. Validate config
echo "[3/4] Validating config..."
haproxy -c -f /etc/haproxy/haproxy.cfg

# 4. Restart
echo "[4/4] Starting HAProxy..."
systemctl restart haproxy
systemctl enable haproxy

echo ""
echo "═══════════════════════════════════════"
echo " HAProxy is READY on Master Node"
echo " API:      http://$(hostname -I | awk '{print $1}'):80"
echo " Frontend: http://$(hostname -I | awk '{print $1}'):3000"
echo " Stats:    http://$(hostname -I | awk '{print $1}'):8404/stats"
echo "═══════════════════════════════════════"
