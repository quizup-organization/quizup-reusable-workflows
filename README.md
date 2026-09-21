# quizup-reusable-workflows

Workflows GitHub Actions réutilisables pour l'organisation QuizUp.

## Workflows disponibles

| Workflow             | Fichier                | Profil         | Description                                            |
|----------------------|------------------------|----------------|--------------------------------------------------------|
| **Library CI**       | `lib-ci.yml`           | Libs Maven     | Build + tests (`mvn verify`)                           |
| **Library Release**  | `lib-release.yml`      | Libs Maven     | semantic-release + publish GitHub Packages             |
| **Service CI**       | `service-ci.yml`       | Services Java  | Build + tests avec résolution deps GitHub Packages     |
| **Service Release**  | `service-release.yml`  | Services Java  | semantic-release + image arm64 GHCR (ArgoCD Image Updater) |
| **Frontend CI**      | `frontend-ci.yml`      | Frontend React | Install + lint + build                                 |
| **Frontend Release** | `frontend-release.yml` | Frontend React | semantic-release + image GHCR (ArgoCD Image Updater)   |
| **Domain Bootstrap** | `domain-bootstrap.yml` | Libs Maven     | Publie POM parent + `*-domain` (contrats), sans tag    |
| **Prune Packages**   | `prune-packages.yml`   | Maintenance    | Purge les anciennes versions GHCR + caches Actions      |

## Politique de release

- **Release** (push `main`, hors `.github/workflows/**`/`*.md`) : semantic-release → publication
  Maven (GitHub Packages) + image **linux/arm64** sur GHCR. Le `repository_dispatch` a été retiré :
  le déploiement est assuré par **ArgoCD Image Updater** (git write-back du `newTag` dans
  `quizup-gitops`).
- **Contrats (domains)** : chaque service pin littéralement les `*-domain` qu'il consomme
  (consumer-driven). Le `*-domain` est publié à la version de release du service.
- **Amorçage** (`domain-bootstrap.yml` / `contracts.yml`) : publie **uniquement** le POM parent + le
  `*-domain` à une version dédiée, sans tag, pour amorcer les dépendances inter-services (les
  Services exposent le port 80, mais le déploiement Maven inter-services exige des domains publiés).

## Dockerfiles partagés

| Fichier                      | Usage                                                                              |
|------------------------------|------------------------------------------------------------------------------------|
| `docker/Dockerfile.service`  | Tous les microservices Java (Spring Boot / WebFlux). `ARG PORT=8080` paramétrable. |
| `docker/Dockerfile.frontend` | Frontend React (Vite). Build multi-stage Node 22 + nginx avec SPA fallback.        |

## Actions composites partagées

| Action             | Fichier                               | Description                                                                                                      |
|--------------------|---------------------------------------|------------------------------------------------------------------------------------------------------------------|
| `setup-java-maven` | `actions/setup-java-maven/action.yml` | Encapsule `actions/setup-java@v5` avec `server-id`, `server-username` et `server-password` pour GitHub Packages. |
| `semantic-release` | `actions/semantic-release/action.yml` | Encapsule l'installation + l'exécution de semantic-release avec profils `maven`/`npm` partagés.                  |
| `prune-packages`   | `actions/prune-packages/action.yml`   | Supprime les anciennes versions de packages (GHCR), conserve les N plus récentes + les tags protégés.           |

Cette action remplace la génération manuelle de `~/.m2/settings.xml` dans les workflows. Les workflows de release
utilisent l'action composite `semantic-release` pour éviter la duplication des étapes Node/npm.

## Rétention du stockage (purge GHCR & caches)

Le plan GitHub Free inclut **0,5 GB** de stockage partagé (*artefacts + GitHub Packages*). Les images
GHCR poussées à chaque release s'y accumulent : `prune-packages.yml` (planifié chaque lundi +
`workflow_dispatch`) purge les anciennes versions.

- Les **N versions les plus récentes** par package sont conservées (`keep`, défaut `1`).
- Les **tags déployés** (lus dans `quizup-gitops/.argocd-source-*.yaml`) ne sont **jamais** supprimés.
- Les **caches Actions** non accédés depuis plus de 7 jours sont supprimés (enveloppe séparée de
  10 GB/repo, non facturée, mais qui évince le cache Docker quand saturée).
- `workflow_dispatch` avec `dry-run: true` (défaut) pour simuler avant purge réelle.

> **Secret requis** : `QUIZUP_GITHUB_TOKEN` (PAT classic `repo` + `delete:packages`) au niveau du repo
> `quizup-reusable-workflows` (repo public → les minutes du workflow planifié sont gratuites).
>
> Les paquets **Maven** ne sont pas purgés par défaut : les jars sont minuscules et les anciennes
> versions de contrats (`*-domain`) peuvent être référencées par d'autres builds.

## Tableau repos × profil

### Libs (publish GitHub Packages)

| Repo         | CI workflow       | Release workflow       |
|--------------|-------------------|------------------------|
| `quizup-sdk` | `lib-ci.yml@main` | `lib-release.yml@main` |

### Services (Docker + GitOps)

| Repo                 | `service-name` | `port` | CI workflow           | Release workflow           |
|----------------------|----------------|--------|-----------------------|----------------------------|
| `quizup-identity`    | `identity`     | `8085` | `service-ci.yml@main` | `service-release.yml@main` |
| `quizup-theme`       | `theme`        | `8080` | `service-ci.yml@main` | `service-release.yml@main` |
| `quizup-game`        | `game`         | `8080` | `service-ci.yml@main` | `service-release.yml@main` |
| `quizup-matchmaking` | `matchmaking`  | `8080` | `service-ci.yml@main` | `service-release.yml@main` |
| `quizup-challenge`   | `challenge`    | `8080` | `service-ci.yml@main` | `service-release.yml@main` |
| `quizup-social`      | `social`       | `8080` | `service-ci.yml@main` | `service-release.yml@main` |
| `quizup-gateway`     | `gateway`      | `8080` | `service-ci.yml@main` | `service-release.yml@main` |


## Release du SDK (`quizup-sdk`)

Le repo `quizup-sdk` est un agrégat Maven unique : tous les modules partagent **la même version**. Il
contient :

```
① quizup-parent         ← BOM (hérite spring-boot-starter-parent), gère les versions des artifacts SDK
                               via `quizup-sdk.version=${project.version}`
      ↓
② quizup-microservice   ← quizup-microservice-core (types partagés : search, exceptions, DTOs),
                          quizup-microservice-autoconfigure, quizup-microservice-starter
      ↓
③ quizup-axon           ← quizup-axon-autoconfigure, quizup-axon-deadline, quizup-axon-query,
                          quizup-axon-starter (rattaché à quizup-microservice-starter)
```

Une release de `quizup-sdk` publie l'ensemble des artifacts à la même version (ex: `v1.1.0` →
`quizup-parent` 1.1.0, `quizup-microservice-starter` 1.1.0, `quizup-axon-starter` 1.1.0…). Les services
downstream doivent être rebuild pour récupérer les nouvelles versions.

### Procédure de bump de version du SDK

1. Release `quizup-sdk` (ex: `v1.1.0`) — tous les modules sont publiés à cette version
2. Mettre à jour la version du parent dans les `pom.xml` des services (`quizup-parent` → `1.1.0`) ;
   les versions des artifacts SDK sont héritées du BOM, aucun tag de version n'est nécessaire
3. Les services se rebuild avec la nouvelle version au prochain push sur `main`

## Politique de tags

- **SemVer strict** : chaque release crée un tag `vX.Y.Z` (ex: `v1.0.0`, `v1.1.0`)
- **Tag glissant majeur** : `v1` pointe toujours vers le dernier `v1.x.x`
- **Les wrappers dans chaque repo référencent `@main`** pour bénéficier des patches sans modification
- **Breaking changes** (nouveau major `v2`) : les wrappers doivent être mis à jour manuellement

## Secrets & variables requis

Les wrappers (`<repo>/.github/workflows/release.yml`) passent :

- input `github-username` = `${{ vars.QUIZUP_GITHUB_USERNAME }}` → **ton username GitHub** (ex. `CNadjim`)
- secret `GITHUB_PASSWORD` = `${{ secrets.QUIZUP_GITHUB_TOKEN }}` → **PAT classic** avec `repo` + `write:packages`

### Où les définir

> ⚠️ Sur un plan **GitHub Free**, les secrets/variables d'**organisation** ne sont **pas**
> utilisables par les repos **privés**. Il faut donc les définir **au niveau de chaque repo**
> (Settings → Secrets and variables → Actions).

| Repo(s) | `QUIZUP_GITHUB_USERNAME` (variable) | `QUIZUP_GITHUB_TOKEN` (secret) |
|---|---|---|
| `quizup-sdk` | ✅ | ✅ |
| `quizup-identity`, `quizup-theme`, `quizup-game`, `quizup-social`, `quizup-matchmaking`, `quizup-profile`, `quizup-leaderboard`, `quizup-gateway` | ✅ | ✅ |
| `quizup-web` | ✅ | ✅ |
| `quizup-gitops` | — | ✅ (workflow `update-image.yml`) |

Scopes du PAT : **`repo`** (release, tags, `repository_dispatch`) + **`write:packages`**
(Maven GitHub Packages + images GHCR). Le `read:packages` seul ne suffit pas.

> Alternative : rendre les repos **publics** → un unique secret/variable d'**organisation** suffit.

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

La configuration semantic-release est centralisée dans :

- `semantic-release/release.maven.config.cjs` (profil Maven, mise a jour de `pom.xml`)
- `semantic-release/release.npm.config.cjs` (profil npm, mise a jour de `package.json`/`package-lock.json`)
- `semantic-release/release.config.cjs` (alias backward-compatible vers le profil Maven)

Le profil Maven applique `versions:set` sur tous les modules Maven afin de propager automatiquement la version de
release dans les `pom.xml`.

Les reusable workflows selectionnent automatiquement le bon profil via l'input `release-profile` de l'action composite.

Les repositories applicatifs n'ont plus besoin d'un `.releaserc.yml` local.
