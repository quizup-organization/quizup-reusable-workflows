# AGENTS.md — quizup-reusable-workflows

> **DevOps** : GitHub Actions réutilisables (composite actions) + Dockerfiles + config Maven /
> semantic-release. Hors périmètre de l'architecture hexagonale Java.

---

## 1. Rôle

Fournir des **actions GitHub Actions réutilisables** pour tous les repos QuizUp :
- **build-push-docker** : build d'une image Docker + push (utilisé par tous les services)
- **semantic-release** : release automatique versionnée
- **setup-java-maven** : setup du toolchain Java/Maven (versions gérées par le BOM)

+ **Dockerfiles** partagés (`Dockerfile.service`, `Dockerfile.frontend`) et config
**semantic-release** (versioning + changelog).

---

## 2. Structure

```
quizup-reusable-workflows/
├── actions/
│   ├── build-push-docker/   ← action composite : build + push image
│   ├── semantic-release/    ← action composite : release versionnée
│   └── setup-java-maven/    ← action composite : setup Java/Maven
├── docker/
│   ├── Dockerfile.service    ← Dockerfile générique microservice
│   └── Dockerfile.frontend   ← Dockerfile frontend (nginx)
├── maven/                    ← config Maven partagée (settings, etc.)
└── semantic-release/         ← config semantic-release
```

---

## 3. Contrats cassés / TODO

- **Aucun contrat cassé** — c'est un dépôt de CI/CD réutilisable.

---

## 4. Patterns de référence

Hors périmètre hexagonal. Voir `README.md` du repo pour les détails des actions.
