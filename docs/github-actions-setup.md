# GitHub Actions: production deploy credentials

Pushes to `main` run [.github/workflows/deploy.yml](../.github/workflows/deploy.yml). The workflow builds a Docker image, pushes it to Docker Hub, SSHs to the GCP VM `goapi-1`, and runs the same deploy script used by `./scripts/release.sh`.

Application secrets (database, JWT, etc.) stay on the VM in `app-configs`. GitHub only needs credentials to **push images** and **SSH to the VM**.

## Where to configure secrets

1. Open the repo on GitHub: `golery/goapi`
2. **Settings** → **Secrets and variables** → **Actions**
3. Open the **Secrets** tab (not Variables)
4. Under **Environment secrets**, choose **Manage environment secrets** for the **`production`** environment  
   (The workflow sets `environment: production`. Repository-level secrets are not used unless you remove that line.)

Optional: in **Settings** → **Environments** → **production**, enable **Required reviewers** so deploys wait for approval.

## Required environment secrets

| Secret | What to put there |
|--------|-------------------|
| `DOCKERHUB_USERNAME` | Docker Hub namespace that owns the image, e.g. `golery` |
| `DOCKERHUB_TOKEN` | Docker Hub **access token** with **Read, Write, Delete** (read-only tokens fail with `insufficient scopes` on push) |
| `GCP_SA_KEY` | Full JSON contents of a Google Cloud **service account key** |

Do **not** put your Docker Hub account password, GitHub PAT, or `gcloud` user credentials in these fields.

### Docker Hub token

1. [hub.docker.com](https://hub.docker.com) → **Account Settings** → **Security** → **Personal access tokens**
2. **Generate new token** with **Read, Write, Delete**
3. Copy the token once into `DOCKERHUB_TOKEN`

Local check (optional):

```bash
docker login -u golery
# paste token as password
```

### GCP service account key

1. [Google Cloud Console](https://console.cloud.google.com/) → project **`golery`**
2. **IAM & Admin** → **Service Accounts** → create or pick a deploy-only account
3. Grant roles needed for `gcloud compute ssh` to `goapi-1`, e.g.:
   - **Compute Instance Admin (v1)** (`roles/compute.instanceAdmin.v1`), or a tighter custom role if you prefer
4. **Keys** → **Add key** → **Create new key** → JSON
5. Paste the entire JSON file into `GCP_SA_KEY`

The VM user and script are unchanged from manual release:

- Instance: `goapi-1`, zone `us-central1-c`, project `golery`
- SSH user: `lyhoanghai`
- Deploy: `./scripts/gcloud-deploy-remote.sh` pipes [scripts/run-goapi.sh](../scripts/run-goapi.sh) over SSH (includes `docker rm` after stop). Copy that file to `~/app-configs/scripts/run-goapi.sh` on the VM if you deploy manually over SSH.

OS Login / IAM must allow the service account (or the account you use) to SSH as that user. If manual `gcloud compute ssh` works for you but Actions fails, compare which principal is used and fix IAM or firewall rules for GitHub’s runners.

## Pushing workflow changes from your machine

Git over HTTPS with a GitHub PAT requires the **`workflow`** scope to add or edit `.github/workflows/*`.

Alternatives:

- Use **SSH** for `origin`: `git@github.com:golery/goapi.git`
- Or regenerate the PAT with **workflow** enabled

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| `access token has insufficient scopes` on Docker push | `DOCKERHUB_TOKEN` is read-only, wrong type (GitHub PAT), or wrong username |
| `unauthorized` on Docker login | Wrong `DOCKERHUB_USERNAME` or expired token |
| SSH / `gcloud compute ssh` fails in Actions | Bad `GCP_SA_KEY`, missing IAM role, or VM firewall blocking SSH from the internet |
| Deploy step succeeds but health check fails | `run-goapi.sh` on the VM must pull `golery/goapi:$GITHUB_SHA`; check `docker logs goapi` on the VM |
| `no space left on device` during `docker pull` | VM boot disk full of old images. SSH in and run `docker system prune -af`, or re-run deploy after merging the prune step in `scripts/run-goapi.sh` |
| Secrets not found | Secrets must be under environment **`production`**, not only repository secrets |

## Manual deploy (unchanged)

Sandbox: `./scripts/deploy-sandbox.sh`  
Production without CI: `./scripts/release.sh` (timestamp tag + SSH)
