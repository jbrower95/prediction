# Deployment Guide

This document explains how to deploy the Prediction app to GitHub Pages.

## Automatic Deployment

The app is configured with GitHub Actions to automatically deploy to GitHub Pages whenever changes are pushed to the `main` or `master` branch.

### How It Works

1. When you push to either `main` or `master` branch, the GitHub Actions workflow in `.github/workflows/deploy.yml` triggers
2. It builds the app with the correct base path (`/prediction/`)
3. The built assets are deployed to GitHub Pages
4. The app becomes available at: https://jbrower95.github.io/prediction/

### Requirements

For the automatic deployment to work:

1. GitHub Pages must be enabled in your repository settings
2. The repository must be public or have GitHub Pages enabled for private repositories
3. The source should be set to "GitHub Actions"

## Manual Deployment

If you need to deploy manually:

1. Build the app with the GitHub Pages configuration:
   ```bash
   npm run build:github
   ```

2. This will generate a `dist` folder with the built app
   
3. You can then deploy this folder to any static hosting service

## Local Development

For local development, simply run:

```bash
npm run dev
```

The app will use the root path (`/`) when running locally.

## Environment Variables

- `VITE_PREDICTION_CONTRACT_ADDRESS`: The address of the deployed Prediction contract
  - In GitHub Actions, this is set in the workflow file
  - For local development, set this in a `.env` or `.env.local` file

## GitHub Pages Configuration

- Base Path: `/prediction/`
- This is configured in `vite.config.ts` for GitHub Pages builds

## Troubleshooting

- If assets are not loading, check that the paths in `index.html` use relative paths (`./` instead of `/`)
- If the GitHub Pages URL isn't working, make sure GitHub Pages is enabled in repository settings
- If automatic deployment fails, check the GitHub Actions logs for details