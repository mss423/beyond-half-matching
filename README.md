# Beyond the Half-Approximation

Interactive companion to **Beyond the Half-Approximation: Fair and Efficient Online Class Matching**, by **Sander Borst and Max Springer**.

Astra was used to generate the webpage from the authors' paper.

**Edition:** compiled from the Overleaf export supplied on 5 November 2026, using `neurips_2026.tex`. The PDF, extracted statements and proofs, numbering, and dependency links belong to the same source snapshot. The `neurips-2026/` directory contains the frozen edition and its checksums. The site has been prepared locally; GitHub Pages has not been enabled by this preparation step.

## Repository layout

```text
.nojekyll                 Disable Jekyll processing
.gitignore               Ignore operating-system metadata
index.html               Forward to the versioned companion, preserving result links
README.md                This guide
neurips-2026/
  index.html             Proof explorer
  neurips_2026.pdf        Frozen paper PDF for this edition
  app.js, style.css       Interface and styling
  data.js                Statements, proofs, and dependency links
  proof-map.svg          Full proof dependency map
  proof-overview.svg     Hybrid Ranking fairness diagram
  proof-overview.pdf     Downloadable diagram
  favicon.svg
  vendor/                Bundled libraries and fonts; no npm install needed
  THIRD_PARTY_LICENSES.txt
  release.json           Edition status, source fingerprint, and PDF checksum
  SHA256SUMS             Checksums for every file in this edition
```

Only the built reader-facing site belongs in this public repository. The LaTeX working tree and build tools are maintained separately. All required runtime assets are included, so hosting needs no build command, package installation, or server-side code.

## Preview locally

From this directory:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/`. The entry point forwards to `neurips-2026/`.

## Publish with GitHub Pages

The instructions use the account **mss423** and repository **beyond-half**.

1. Open the bundled PDF and companion to confirm they are the edition you intend to publish.
2. Sign in to GitHub as `mss423` and create a **public** repository named **beyond-half**. Leave GitHub's README, licence, and `.gitignore` initialization options unchecked: this folder already contains files.
3. Open a terminal **inside this directory**, then run:

   ```sh
   git init -b main
   git add .
   git commit -m "Publish NeurIPS 2026 paper companion"
   git remote add origin https://github.com/mss423/beyond-half.git
   git push -u origin main
   ```

   Authenticate using your normal GitHub credentials or credential manager. Push the contents of this directory as the repository root; do not upload its parent directory or nest `beyond-half-pages/` inside the repository.

4. In `mss423/beyond-half`, open **Settings → Pages**. Under **Build and deployment**, select:
   - **Source:** Deploy from a branch
   - **Branch:** `main`
   - **Folder:** `/ (root)`

   Click **Save**. No custom workflow is needed; `.nojekyll` preserves the prebuilt files.
5. Wait for the Pages deployment to finish. **Settings → Pages → Visit site** shows the live site. If a deployment fails, check the repository's **Actions** tab.
6. Open the versioned site and PDF in a browser and test a few result links before inserting the URLs into the final paper.

Official instructions: [configure a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) and [create a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

## Stable links for the paper

- Main entry point: <https://mss423.github.io/beyond-half/>
- Frozen companion edition: <https://mss423.github.io/beyond-half/neurips-2026/>
- Frozen paper PDF: <https://mss423.github.io/beyond-half/neurips-2026/neurips_2026.pdf>

Use the versioned companion link in the paper:

```latex
An interactive companion with a proof dependency graph is available at
\url{https://mss423.github.io/beyond-half/neurips-2026/}.
```

If you add that sentence to the paper before initial publication, refresh the PDF and companion together from the new export. Do not replace only the PDF, because the extracted proof text and page links must match it. Existing pages in the app use relative asset URLs, allowing the project-path deployment above. If you choose another repository name, update this guide and the canonical/Open Graph URLs in `neurips-2026/index.html`, root `index.html`, and `neurips-2026/release.json` before launch.

## Preserve the frozen edition

Once published as the camera-ready edition, keep this directory and PDF unchanged. Put a later paper revision in a new version directory and update the root forwarding page if desired. This preserves the URLs and exact paper cited by readers.

The checksums in `neurips-2026/SHA256SUMS` can be checked on macOS or Linux:

```sh
cd neurips-2026
shasum -a 256 -c SHA256SUMS
```

For an additional Git snapshot after the final files are committed:

```sh
git tag -a neurips-2026 -m "Frozen NeurIPS 2026 edition"
git push origin neurips-2026
```

The public repository and Pages site have **not** been created or enabled by this preparation step.

## Attribution and rights

Paper and research results: Sander Borst and Max Springer. Webpage generation: Astra, from the authors' paper. Paper copyright remains with the authors; this repository does not grant a new licence for manuscript text or source quotations. Third-party software notices are included in `neurips-2026/THIRD_PARTY_LICENSES.txt`.
