# Architecture Overview

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
       ┌───────┬───────┬───────┬───────┬───────┬───────┬───────┐
       │       │       │       │       │       │       │       │
    /api/    /api/   /api/   /api/   /api/   /api/   /api/
    users  doctors pharmacy records  labs   ambulance aggregator
       ▼       ▼       ▼       ▼       ▼       ▼       ▼
  ┌────────┬────────┬────────┬────────┬────────┬────────┬────────┐
  │ User   │Doctor  │Pharmacy│Medical │ Lab    │Ambulnce│Aggreg  │  ns: backend
  │ Mgmt   │Appt    │Service │Records │ Appt   │Booking │ -ator  │
  │(Node)  │(Node)  │(Python)│(Python)│(Node)  │(Node)  │(Node)  │
  └──┬─────┴──┬─────┴──┬─────┴──┬─────┴──┬─────┴──┬─────┴──┬────┘
     │        │        │        │        │        │        │
     └────────┴────────┴───┬────┴────────┴────────┴────────┘
                           │
              ┌────────────┼─────────────┐
              ▼                          ▼
     ┌──────────────┐          ┌──────────────┐    ns: infra
     │   MongoDB    │          │  RabbitMQ    │
     │ (StatefulSet)│          │ (Deployment) │
     └──────────────┘          └──────────────┘

  Frontend (React) ── ns: frontend ── NodePort :30000
```

## Service Interaction Flows

### Synchronous (REST)
```
Frontend → Gateway → user-management     (auth, profiles)
Frontend → Gateway → doctor-appointment  (list, book)
Frontend → Gateway → pharmacy            (browse, search)
Frontend → Gateway → medical-records     (view history)
Frontend → Gateway → lab-appointment     (browse, book)
Frontend → Gateway → ambulance-booking   (request)
Frontend → Gateway → aggregator          (dashboard data)

Aggregator → doctor-appointment  (GET /api/doctors)
Aggregator → pharmacy            (GET /api/pharmacy/medicines)
Aggregator → lab-appointment     (GET /api/labs)
```

### Asynchronous (RabbitMQ)
```
doctor-appointment  ──publish──▶  "appointment.booked"  ──consume──▶  medical-records (auto-create record)
lab-appointment     ──publish──▶  "lab.booked"          ──consume──▶  medical-records (auto-create record)
ambulance-booking   ──publish──▶  "ambulance.requested" ──consume──▶  user-management (add notification)
```

All events flow through the `healthcare_events` topic exchange.

## Namespaces
| Namespace | Contents |
|-----------|----------|
| `frontend` | React frontend Deployment + NodePort Service |
| `backend` | All 7 microservice Deployments + ClusterIP Services |
| `infra` | MongoDB StatefulSet + RabbitMQ Deployment |
| `ingress` | Gateway + GatewayClass |
