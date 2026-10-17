# AGENTS.md — quizup-reusable-workflows

> **DevOps** : GitHub Actions réutilisables (composite actions) + Dockerfiles + config Maven /
> semantic-release. Hors périmètre de l'architecture hexagonale Java.

---

## 1. Rôle

Fournir des **actions GitHub Actions réutilisables** pour tous les repos QuizUp :
- **build-push-docker** : build d'une image Docker + push (utilisé par tous les services)
- **semantic-release** : release automatique versionnée
- **setup-java-maven** : setup du toolchain Java/Maven (versions gérées par le BOM)
- **prune-packages** : purge des anciennes versions GHCR (rétention stockage)

+ **Dockerfiles** partagés (`Dockerfile.service`, `Dockerfile.frontend`), config
**semantic-release** (versioning + changelog) et workflows réutilisables :
`frontend-ci`/`frontend-release`, `service-ci`/`service-release`, `lib-ci`/`lib-release`,
**`mobile-ci`/`mobile-release`** (typecheck/doctor + APK Android signé sur `main`).

+ **Workflow planifié** `prune-packages.yml` : purge GHCR + packages Maven + caches Actions
(allowance Free 0,5 GB partagée artefacts/Packages). Toutes les versions de `quizup-parent` sont
protégées : les POM parents restent référencés par les contrats déjà publiés (sinon la résolution
transitive des builds casse). Le `Dockerfile.service` utilise `COPY --chown` (un seul layer app).

---

## 2. Structure

```
quizup-reusable-workflows/
├── actions/
│   ├── build-push-docker/   ← action composite : build + push image
│   ├── semantic-release/    ← action composite : release versionnée
│   ├── setup-java-maven/    ← action composite : setup Java/Maven
│   └── prune-packages/      ← action composite : purge versions GHCR
├── .github/workflows/        ← workflows réutilisables (frontend, service, lib, mobile)
├── docker/
│   ├── Dockerfile.service    ← Dockerfile générique microservice
│   └── Dockerfile.frontend   ← Dockerfile frontend (nginx)
├── maven/                    ← config Maven partagée (settings, etc.)
└── semantic-release/         ← config semantic-release
```

> `mobile-release` : semantic-release (profil `npm`, version dans `package.json` + `CHANGELOG.md`)
> puis `expo prebuild` + `gradlew assembleRelease` (arm64), publication d'une pre-release
> `apk-<run_number>` et attachement de l'APK à la release `v<version>`. Il attend les secrets
> keystore Android du caller.

---

## 3. Contrats cassés / TODO

- **Aucun contrat cassé** — c'est un dépôt de CI/CD réutilisable.

---

## 4. Patterns de référence

Hors périmètre hexagonal. Voir `README.md` du repo pour les détails des actions.
