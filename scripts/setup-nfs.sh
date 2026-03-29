#!/bin/bash
# ════════════════════════════════════════════════════════════
# NFS Server Setup — Run on MASTER NODE
# ════════════════════════════════════════════════════════════
#
# WHY ON MASTER NODE:
# With only 3 EC2 instances (1 master + 2 workers), we can't
# dedicate a separate machine for NFS. The master node is ideal because:
# 1. It's always running (unlike worker nodes which might be drained)
# 2. It has stable storage (doesn't get evicted)
# 3. Control plane workloads are lightweight — spare capacity exists
#
# TRADE-OFFS:
# - Master node disk I/O is shared between NFS and etcd
# - Not truly HA — if master dies, storage is unavailable
# - Acceptable for learning/evaluation — NOT for production
#
# RUN THIS SCRIPT ON THE MASTER NODE:
#   chmod +x scripts/setup-nfs.sh
#   sudo ./scripts/setup-nfs.sh
#
# AFTER RUNNING: Update k8s/storage/nfs-provisioner.yaml with master node IP

set -e

echo "═══════════════════════════════════════"
echo " NFS Server Setup (Master Node)"
echo "═══════════════════════════════════════"

# 1. Install NFS server
echo "[1/5] Installing NFS kernel server..."
apt-get update -qq
apt-get install -y nfs-kernel-server

# 2. Create export directory
echo "[2/5] Creating NFS export directory..."
mkdir -p /srv/nfs/k8s-data
chown nobody:nogroup /srv/nfs/k8s-data
chmod 777 /srv/nfs/k8s-data

# 3. Configure exports (allow all nodes in the cluster)
echo "[3/5] Configuring /etc/exports..."
# Remove any existing entry for this path
sed -i '\|/srv/nfs/k8s-data|d' /etc/exports
# Add new export (accessible from any IP — restrict in production)
echo "/srv/nfs/k8s-data *(rw,sync,no_subtree_check,no_root_squash)" >> /etc/exports

# 4. Apply exports and restart
echo "[4/5] Applying exports..."
exportfs -ra
systemctl restart nfs-kernel-server
systemctl enable nfs-kernel-server

# 5. Show status
echo "[5/5] Verifying..."
exportfs -v
echo ""
echo "═══════════════════════════════════════"
echo " NFS Server is READY"
echo " Export: /srv/nfs/k8s-data"
echo " Master IP: $(hostname -I | awk '{print $1}')"
echo "═══════════════════════════════════════"
echo ""
echo "NEXT STEPS:"
echo "1. On EACH WORKER NODE run:"
echo "   sudo apt-get install -y nfs-common"
echo ""
echo "2. Update k8s/storage/nfs-provisioner.yaml:"
echo "   Replace <NFS_SERVER_IP> with: $(hostname -I | awk '{print $1}')"
echo ""
echo "3. Test from a worker node:"
echo "   sudo mount -t nfs $(hostname -I | awk '{print $1}'):/srv/nfs/k8s-data /mnt"
echo "   ls /mnt && sudo umount /mnt"
