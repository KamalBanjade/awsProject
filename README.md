# Serverless Portfolio & Blog Platform — Student ID 17

**Status:** ✅ Full stack deployed and tested end to end

---

## Quick Links (for live demo)

| | |
|---|---|
| **Live Site** | http://portfolio-17.s3-website-us-east-1.amazonaws.com/index.html |
| **API Base URL** | `https://iwz4yozrmg.execute-api.us-east-1.amazonaws.com/prod` |
| **Cognito User Pool ID** | `us-east-1_QXhYIQd9c` |
| **Cognito Client ID** | `70esjptmm2h3anlo9o74ds8v9a` |

```js
// frontend/config.js
API_BASE_URL = "https://iwz4yozrmg.execute-api.us-east-1.amazonaws.com/prod";
COGNITO_USER_POOL_ID = "us-east-1_QXhYIQd9c";
COGNITO_CLIENT_ID = "70esjptmm2h3anlo9o74ds8v9a";
```

---

## Contents
- [Presentation cheat sheet](#presentation-cheat-sheet)
- [Project structure](#project-structure)
- [Architecture](#architecture)
- [Resources](#resources-all-named-with-student-id-17)
- [DynamoDB item shape](#dynamodb-item-shape)
- [Auth flow](#auth-flow)
- [Deploy the whole stack](#how-to-deploy-the-whole-stack)
- [Deploy the frontend](#deploy-the-frontend)
- [Create a test user](#create-a-test-user-for-demo-login)
- [Verified end-to-end](#verified-end-to-end)
- [Clean up](#clean-up-after-recording-demo-material)

---

## Presentation Cheat Sheet

Quick nav if presenting straight from this file — jump to the section as you talk.

| Time | What to show | Jump to |
|---|---|---|
| 1 min | Intro — name, project title, Student ID 17 | *(title slide)* |
| 2 min | Live site — portfolio + blog listing | [Quick Links](#quick-links-for-live-demo) → open Live Site |
| 2 min | Login → Create Post → View Post | [Create a test user](#create-a-test-user-for-demo-login) if you need fresh credentials |
| 2 min | AWS Console — S3, DynamoDB, Cognito, API Gateway, CloudWatch | [Resources table](#resources-all-named-with-student-id-17) has every resource name to search for |
| 1-2 min | Architecture walkthrough | [Architecture](#architecture) diagram |
| 1 min | Challenges & what I learned | *(see presentation deck, slide 6)* |

---

## Project structure
```
portfolio-project-17/
  template.yaml       <- SAM/CloudFormation infrastructure definition (backend + hosting)
  samconfig.toml       <- saved sam deploy config
  src/
    list_posts/app.py  <- GET /posts (public)
    get_post/app.py    <- GET /posts/{id} (public)
    create_post/app.py <- POST /posts (protected — Cognito JWT required)
  frontend/
    index.html         <- portfolio page
    blog.html           <- blog listing + login + new post form
    blog.js              <- Cognito auth logic + API calls
    post.html            <- single post view
    config.js            <- API URL / Cognito Pool ID / Client ID
    styles.css            <- shared styling
  README.md            <- this file
```

## Architecture

```
Browser
  │
  ▼
S3 (Static Website Hosting: portfolio-17) ── Portfolio + Blog frontend
  │
  ▼ (fetch calls)
API Gateway (BlogAPI-17)
  │
  ├── GET  /posts       → ListPosts-17      → DynamoDB
  ├── GET  /posts/{id}  → GetPost-17         → DynamoDB
  └── POST /posts       → CreatePost-17      → DynamoDB
         ▲
         │ Cognito JWT Authorizer (write route only)
     Cognito User Pool (BlogUsers-17) ── handles Login

CloudWatch Logs ← all Lambda invocations
```

## Resources (all named with Student ID 17)

| Resource | Name | Notes |
|---|---|---|
| DynamoDB table | `BlogPosts-17` | Partition key `postId` (String), `PAY_PER_REQUEST` billing |
| Cognito User Pool | `BlogUsers-17` | Email sign-in, no client secret (SPA client) |
| Cognito App Client | `BlogWebClient-17` | `ALLOW_USER_PASSWORD_AUTH` + SRP + refresh token flows |
| Lambda | `ListPosts-17`, `GetPost-17`, `CreatePost-17` | Python 3.12, least-privilege via `LabRole` |
| API Gateway | `BlogAPI-17` | REST API, `prod` stage, CORS enabled |
| S3 bucket | `portfolio-17` | Static website hosting, public-read via bucket policy |

## DynamoDB item shape
```json
{
  "postId": "abc123",
  "title": "My first post",
  "content": "...",
  "author": "kamal",
  "createdAt": "2026-09-16T12:00:00Z"
}
```

## Auth flow
- Login form on `blog.html` uses `amazon-cognito-identity-js` (`CognitoUser.authenticate()`) directly — no Hosted UI, no Amplify.
- On success, the `IdToken` is kept in a JS variable only (never `localStorage`/`sessionStorage`) — it's cleared on refresh or logout.
- `POST /posts` sends `Authorization: Bearer <IdToken>`; API Gateway's Cognito authorizer validates it against `BlogUsers-17` before the request reaches `CreatePost-17`.
- `GET /posts` and `GET /posts/{id}` have no authorizer attached — public by design.

## How to deploy the whole stack

From the project root:
```powershell
sam build
sam deploy
```

First-time setup used `sam deploy --guided` (stack name `portfolio-blog-17`, region `us-east-1`), which saved the config to `samconfig.toml` — every deploy since is just `sam build && sam deploy`.

This provisions/updates: DynamoDB table, Cognito User Pool + Client, all 3 Lambdas, API Gateway with the Cognito authorizer, and the S3 bucket + public-read policy — all from one template.

Get the deployed URLs:
```powershell
aws cloudformation describe-stacks --stack-name portfolio-blog-17 --query "Stacks[0].Outputs"
```
Outputs: `ApiUrl`, `WebsiteURL`, `UserPoolId`, `UserPoolClientId`, `BlogPostsTableName`.

## Deploy the frontend

```powershell
aws s3 sync frontend/ s3://portfolio-17 --delete
```

## Create a test user (for demo login)

```powershell
aws cognito-idp admin-create-user `
  --user-pool-id <UserPoolId> `
  --username you@example.com `
  --user-attributes Name=email,Value=you@example.com Name=email_verified,Value=true `
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password `
  --user-pool-id <UserPoolId> `
  --username you@example.com `
  --password "YourTestPass123" `
  --permanent
```

## Verified end-to-end

- [x] `GET /posts` → `200`, empty array on a fresh table
- [x] `POST /posts` without a token → `401 Unauthorized`
- [x] Login via embedded form → UI swaps to logged-in state
- [x] Create post while logged in → appears in list immediately, no reload
- [x] Refresh page → post persists (confirms it round-tripped through DynamoDB, not just local state)
- [x] Click into a post → `post.html` renders full content via `GET /posts/{id}`
- [x] CloudWatch Logs show `CreatePost-17` invocations

## Clean up (after recording demo material)

```powershell
sam delete --stack-name portfolio-blog-17
```
Redeploy in seconds with `sam build && sam deploy`.
