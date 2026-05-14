# quizup-reusable-workflows

Workflows GitHub Actions réutilisables pour l'organisation QuizUp.

## Workflows disponibles

| Workflow             | Fichier                | Profil         | Description                                            |
|----------------------|------------------------|----------------|--------------------------------------------------------|
| **Library CI**       | `lib-ci.yml`           | Libs Maven     | Build + tests (`mvn verify`)                           |
| **Library Release**  | `lib-release.yml`      | Libs Maven     | semantic-release + publish GitHub Packages             |
| **Service CI**       | `service-ci.yml`       | Services Java  | Build + tests avec résolution deps GitHub Packages     |
| **Service Release**  | `service-release.yml`  | Services Java  | semantic-release + Docker build/push + GitOps dispatch |
| **Frontend CI**      | `frontend-ci.yml`      | Frontend React | Install + lint + build                                 |
| **Frontend Release** | `frontend-release.yml` | Frontend React | semantic-release + Docker build/push + GitOps dispatch |

## Dockerfiles partagés

| Fichier                      | Usage                                                                              |
|------------------------------|------------------------------------------------------------------------------------|
| `docker/Dockerfile.service`  | Tous les microservices Java (Spring Boot / WebFlux). `ARG PORT=8080` paramétrable. |
| `docker/Dockerfile.frontend` | Frontend React (Vite). Build multi-stage Node 22 + nginx avec SPA fallback.        |

## Actions composites partagées

| Action             | Fichier                               | Description                                                                                                      |
|--------------------|---------------------------------------|------------------------------------------------------------------------------------------------------------------|
| `setup-java-maven` | `actions/setup-java-maven/action.yml` | Encapsule `actions/setup-java@v4` avec `server-id`, `server-username` et `server-password` pour GitHub Packages. |
| `semantic-release` | `actions/semantic-release/action.yml` | Encapsule l'installation + l'exécution de semantic-release avec la config partagée de l'organisation.            |

Cette action remplace la génération manuelle de `~/.m2/settings.xml` dans les workflows.
Les workflows de release utilisent l'action composite `semantic-release` pour éviter la duplication des étapes Node/npm.

## Tableau repos × profil

### Libs (publish GitHub Packages)

| Repo                  | CI workflow     | Release workflow     |
|-----------------------|-----------------|----------------------|
| `quizup-dependencies` | `lib-ci.yml@v1` | `lib-release.yml@v1` |
| `quizup-parent`       | `lib-ci.yml@v1` | `lib-release.yml@v1` |
| `axon-distributed`    | `lib-ci.yml@v1` | `lib-release.yml@v1` |
| `quizup-common`       | `lib-ci.yml@v1` | `lib-release.yml@v1` |
| `quizup-starter`      | `lib-ci.yml@v1` | `lib-release.yml@v1` |

### Services (Docker + GitOps)

| Repo                 | `service-name` | `port` | CI workflow         | Release workflow         |
|----------------------|----------------|--------|---------------------|--------------------------|
| `quizup-identity`    | `identity`     | `8085` | `service-ci.yml@v1` | `service-release.yml@v1` |
| `quizup-theme`       | `theme`        | `8080` | `service-ci.yml@v1` | `service-release.yml@v1` |
| `quizup-game`        | `game`         | `8080` | `service-ci.yml@v1` | `service-release.yml@v1` |
| `quizup-matchmaking` | `matchmaking`  | `8080` | `service-ci.yml@v1` | `service-release.yml@v1` |
| `quizup-challenge`   | `challenge`    | `8080` | `service-ci.yml@v1` | `service-release.yml@v1` |
| `quizup-social`      | `social`       | `8080` | `service-ci.yml@v1` | `service-release.yml@v1` |
| `quizup-profile`     | `profile`      | `8080` | `service-ci.yml@v1` | `service-release.yml@v1` |
| `quizup-gateway`     | `gateway`      | `8080` | `service-ci.yml@v1` | `service-release.yml@v1` |

### Frontend

| Repo              | `service-name` | CI workflow          | Release workflow          |
|-------------------|----------------|----------------------|---------------------------|
| `quizup-frontend` | `frontend`     | `frontend-ci.yml@v1` | `frontend-release.yml@v1` |

## Ordre de release initial des libs

Les libs doivent être releasées **dans cet ordre strict** lors du bootstrap initial. Chaque lib dépend de la précédente
via `quizup-dependencies` ou héritage `parent`.

```
① quizup-dependencies   ← BOM, aucune dépendance interne
      ↓
② quizup-parent         ← hérite spring-boot-starter-parent, importe quizup-dependencies
      ↓
③ axon-distributed      ← lib autonome, référencée dans quizup-dependencies
      ↓
④ quizup-common         ← types domaine partagés, référencé dans quizup-dependencies
      ↓
⑤ quizup-starter        ← Spring Boot Starter, dépend de quizup-common
```

**Après le bootstrap**, les libs peuvent être releasées indépendamment. Cependant, si une mise à jour de version est
propagée dans `quizup-dependencies`, les services downstream doivent être rebuild pour récupérer les nouvelles versions.

### Procédure de bump de version d'une lib

1. Release la lib (ex: `quizup-common` → `v1.2.0`)
2. Mettre à jour la version dans `quizup-dependencies/pom.xml` (`quizup-common.version=1.2.0`)
3. Release `quizup-dependencies` (→ `v1.x.0`)
4. Les services se rebuild avec la nouvelle version au prochain push sur `main`

## Politique de tags

- **SemVer strict** : chaque release crée un tag `vX.Y.Z` (ex: `v1.0.0`, `v1.1.0`)
- **Tag glissant majeur** : `v1` pointe toujours vers le dernier `v1.x.x`
- **Les wrappers dans chaque repo référencent `@v1`** pour bénéficier des patches sans modification
- **Breaking changes** (nouveau major `v2`) : les wrappers doivent être mis à jour manuellement

## Secrets requis

| Secret            | Scope               | Utilisé par                | Description                                                                                     |
|-------------------|---------------------|----------------------------|-------------------------------------------------------------------------------------------------|
| `GITHUB_PASSWORD` | Organization secret | Libs + Services + Frontend | Token PAT unique utilisé pour GitHub Packages, GHCR, semantic-release et `repository_dispatch`. |

> **Recommandation** : Configurer `GITHUB_PASSWORD` comme secret d'organisation dans **Settings > Secrets > Actions**
> pour
> qu'il soit disponible dans tous les repos sans duplication.

Les workflows `lib-ci`, `service-*` et `lib-release` attendent aussi un input `github-username` (en pratique
`${{ vars.QUIZUP_GITHUB_USERNAME }}` dans les wrappers).

## Prérequis par repo

Chaque repo lib doit déclarer un `distributionManagement` dans son `pom.xml` :

```xml

<distributionManagement>
    <repository>
        <id>github</id>
        <url>https://maven.pkg.github.com/quizup-organization/REPO_NAME</url>
    </repository>
</distributionManagement>
```

La configuration semantic-release est centralisée dans `semantic-release/release.config.cjs` et chargée directement par
les reusable workflows.

Les repositories applicatifs n'ont plus besoin d'un `.releaserc.yml` local.
