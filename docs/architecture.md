# Architecture Overview (v2)

## System Architecture

```
                        ┌─────────────┐
                        │   Browser   │
                        └──────┬──────┘
                               │ :80
                        ┌──────▼──────┐
                        │   HAProxy   │  (EC2 / external to K8s)
                        │  (L7 LB)   │
                        └──────┬──────┘
                               │ NodePort :30080
                 ┌─────────────▼─────────────┐
                 │  K8s Gateway (envoy-gw)    │  ns: ingress
                 │  GatewayClass + Gateway    │
                 └─────────────┬─────────────┘
          HTTPRoutes (path-based routing)
       ┌───────┬───────┬───────┬───────┬───────┬───────┐
       │       │       │       │       │       │       │
    /api/    /api/   /api/   /api/   /api/   /api/
    users  doctors pharmacy records  labs   ambulance
       ▼       ▼       ▼       ▼       ▼       ▼
  ┌────────┬────────┬────────┬────────┬────────┬────────┐
  │ User   │Doctor  │Pharmacy│Medical │ Lab    │Ambulnce│  ns: backend
  │ Mgmt   │Appt    │Service │Records │ Appt   │Booking │
  │(Node)  │(Node)  │(Python)│(Python)│(Node)  │(Node)  │
  │ +init  │ +init  │ +init  │ +init  │        │        │
  │        │+sidecar│        │        │        │        │
  └──┬─────┴──┬─────┴──┬─────┴──┬─────┴──┬─────┴──┬────┘
     │        │        │        │        │        │
     └────────┴────────┴───┬────┴────────┴────────┘
                           │
              ┌────────────┼─────────────┐
              ▼                          ▼
     ┌──────────────┐          ┌──────────────┐    ns: infra
     │   MongoDB    │          │  RabbitMQ    │
     │ (StatefulSet)│          │ (Deployment) │
     │ NFS Storage  │          │              │
     └──────────────┘          └──────────────┘

  Frontend (React) ── ns: frontend ── NodePort :30000
  DaemonSet (Fluent Bit log agent) ── every node
```

## RBAC Flow

```
                    ┌─────────────────┐
                    │  Login / Register│
                    │  (role selection)│
                    └────────┬────────┘
                             │ JWT { id, role, name }
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
       ┌──────────┐   ┌──────────┐   ┌──────────┐
       │ PATIENT  │   │  DOCTOR  │   │  ADMIN   │
       └────┬─────┘   └────┬─────┘   └────┬─────┘
            │              │              │
  ┌─────────▼─────────┐   │    ┌─────────▼─────────┐
  │ PatientDashboard  │   │    │ AdminDashboard    │
  │ - My appointments │   │    │ - All users       │
  │ - My lab bookings │   │    │ - System stats    │
  │ - My records      │   │    │ - Role management │
  │ - Ambulance req   │   │    │ - Full access     │
  └───────────────────┘   │    └───────────────────┘
                    ┌─────▼─────────┐
                    │DoctorDashboard│
                    │ - My schedule │
                    │ - My patients │
                    │ - View records│
                    └───────────────┘
```

## Role-Access Matrix

| Endpoint | Patient | Doctor | Admin |
|----------|---------|--------|-------|
| `POST /api/users/register` | ✅ Public | ✅ Public | ✅ Public |
| `POST /api/users/login` | ✅ Public | ✅ Public | ✅ Public |
| `GET /api/users/me` | ✅ Own | ✅ Own | ✅ Own |
| `GET /api/users/all` | ❌ | ❌ | ✅ |
| `DELETE /api/users/:id` | ❌ | ❌ | ✅ |
| `GET /api/doctors` | ✅ List | ✅ List | ✅ List |
| `POST /api/doctors` | ❌ | ❌ | ✅ |
| `POST /api/doctors/book` | ✅ Self | ❌ | ✅ Any |
| `GET /api/doctors/appointments/list` | ✅ Own | ✅ Assigned | ✅ All |
| `GET /api/pharmacy/medicines` | ✅ | ✅ | ✅ |
| `POST /api/pharmacy/medicines` | ❌ | ❌ | ✅ |
| `GET /api/records/:patientId` | ✅ Own | ✅ Any | ✅ Any |
| `POST /api/labs/book` | ✅ Self | ❌ | ✅ Any |
| `POST /api/ambulance/request` | ✅ | ❌ | ✅ |

## Service Interaction Flows

### Synchronous (REST via Gateway)
```
Frontend → Gateway → user-management     (auth, profiles, RBAC)
Frontend → Gateway → doctor-appointment  (list, book, cancel)
Frontend → Gateway → pharmacy            (browse, search, add)
Frontend → Gateway → medical-records     (view history)
Frontend → Gateway → lab-appointment     (browse, book)
Frontend → Gateway → ambulance-booking   (request, status)
```

### Asynchronous (RabbitMQ)
```
doctor-appointment  ──publish──▶  "appointment.booked"  ──consume──▶  medical-records
lab-appointment     ──publish──▶  "lab.booked"          ──consume──▶  medical-records
ambulance-booking   ──publish──▶  "ambulance.requested" ──consume──▶  user-management
```

## Namespaces
| Namespace | Contents |
|-----------|----------|
| `frontend` | React frontend Deployment + NodePort Service |
| `backend` | 6 microservice Deployments + ClusterIP Services |
| `infra` | MongoDB StatefulSet + RabbitMQ + NFS Provisioner + DaemonSet |
| `ingress` | Gateway + GatewayClass |
