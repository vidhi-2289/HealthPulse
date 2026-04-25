# HealthPulse Project Overview

## Project Title
Automated Application Health Monitoring & Alert System

## What This Project Is
HealthPulse is a full-stack monitoring platform that checks the health of applications/services, stores monitoring logs, and triggers alerts when failures are detected.

The system has two main parts:

1. **HealthPulse Dashboard (Main App)**  
   A web app where users can log in, add targets to monitor, view uptime/latency, check logs, and review alerts.

2. **Demo Target Application (Monitored App)**  
   A small service with a health endpoint that HealthPulse continuously monitors.

## Problem Statement
Teams need early warning when applications become slow or unavailable.  
HealthPulse automates service checks and provides clear visibility into app health and incidents.

## Core Objectives
- Build a complete working full-stack application locally.
- Implement automated health checks for target services.
- Store and visualize monitoring results.
- Trigger alerts for downtime/high latency events.
- Deploy and operate the system using AWS + DevOps practices at minimal cost.

## Key Features
- User authentication (register/login, JWT-based access)
- Add/Edit/Delete monitored targets
- Periodic health checks (HTTP status + response time + timeout/error handling)
- Dashboard with uptime and incident visibility
- Logs and alerts pages
- Manual "Run Check Now" action
- Exportable monitoring reports

## Monitoring Scope
HealthPulse combines:

- **Application-level metrics (from backend checks)**  
  Up/Down status, response code, response time, uptime trends.

- **Infrastructure-level metrics (from AWS CloudWatch)**  
  EC2 CPU, disk, network (memory via CloudWatch Agent).

## Planned Architecture
Single low-cost EC2 instance (for student project scope):

- Container 1: HealthPulse Frontend
- Container 2: HealthPulse Backend
- Container 3: Demo Target App

Support services:
- CloudWatch for metrics/alarms
- SNS for email alerts
- S3 for report/log backups
- IAM role for secure AWS access

## Rubric Alignment
- **Project Setup & Structure**: clean folder organization, local setup scripts
- **UI Design**: functional login/dashboard/log pages with navigation
- **Backend Functionality**: auth + APIs + health-check engine
- **Database Connectivity**: CRUD on users/targets/check logs
- **Testing & Debugging**: reliable localhost execution and failure simulation
- **Presentation & Explanation**: clear architecture, module breakdown, and setup guide

## Implementation Phases
1. **Phase 1 - Local MVP**: full-stack app + monitoring engine + DB
2. **Phase 2 - Cloud Deployment**: Docker + EC2 + CloudWatch + SNS + S3
3. **Phase 3 - Automation**: Terraform provisioning + Ansible deployment

## Cost Strategy (AWS Learner Lab - 50 Credits)
- Use one small EC2 instance only
- Stop instance when not testing/demoing
- Keep CloudWatch log retention short
- Avoid unnecessary high-cost managed services

## Success Criteria
The project is successful when:
- The app runs locally with all core pages and APIs functional.
- Health checks are automatically executed and stored.
- Failures are visible in dashboard/logs and trigger alerts.
- The system is deployed on AWS with minimal cost and clear documentation.
