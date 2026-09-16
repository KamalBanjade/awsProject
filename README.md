# Serverless Portfolio & Blog Platform — Student ID 17

## Status: Phase 2 complete (DynamoDB table)

## Project structure
```
portfolio-project-17/
  template.yaml      <- SAM/CloudFormation infrastructure definition
  README.md          <- this file
```

## What's defined so far
- **BlogPostsTable** (DynamoDB): stores one item per blog post.
  - Partition key: `postId` (String)
  - Billing mode: `PAY_PER_REQUEST` (no idle cost — good for Free Tier)
  - An item will look like:
    ```json
    {
      "postId": "abc123",
      "title": "My first post",
      "content": "...",
      "author": "kamal",
      "createdAt": "2026-09-16T12:00:00Z"
    }
    ```

## How to deploy just this phase (to test your setup works end to end)

Open a terminal **inside this folder** and run:

```
sam build
sam deploy --guided
```

`--guided` walks you through prompts the first time:
- Stack Name: `portfolio-blog-17`
- AWS Region: `us-east-1` (matches your Academy account)
- Confirm changes before deploy: `Y`
- Allow SAM CLI IAM role creation: `Y`
- Save arguments to configuration file: `Y` (creates `samconfig.toml` so next time you just run `sam deploy`)

If it succeeds, check the AWS Console → DynamoDB → Tables → you should see `BlogPosts-17`.

## Next: Phase 3 (Cognito User Pool) gets added to this same template.
