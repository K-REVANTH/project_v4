#!/bin/bash
# ════════════════════════════════════════════════════════════
# Worker Node Setup — Run on EACH WORKER NODE
# ════════════════════════════════════════════════════════════
# Installs NFS client and labels the node

set -e

echo "═══════════════════════════════════════"
echo " Worker Node Setup"
echo "═══════════════════════════════════════"

# 1. Install NFS client (required for NFS PVCs to mount)
echo "[1/2] Installing NFS client..."
apt-get update -qq
apt-get install -y nfs-common

echo "[2/2] Done!"
echo ""
echo "NEXT: Label this node on the MASTER:"
echo "  kubectl label node $(hostname) role=worker"
echo ""
echo "For the DATABASE node (worker-1), also run:"
echo "  kubectl label node <worker-1-hostname> role=database"
