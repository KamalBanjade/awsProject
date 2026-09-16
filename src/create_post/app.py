import json
import os
import uuid
import time
import boto3

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["TABLE_NAME"])

def lambda_handler(event, context):
    body = json.loads(event.get("body") or "{}")
    title = body.get("title")
    content = body.get("content")

    if not title or not content:
        return {
            "statusCode": 400,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({"error": "title and content are required"})
        }

    claims = event.get("requestContext", {}).get("authorizer", {}).get("claims", {})
    author = claims.get("email", "unknown")

    item = {
        "postId": str(uuid.uuid4()),
        "title": title,
        "content": content,
        "author": author,
        "createdAt": str(int(time.time() * 1000))
    }

    table.put_item(Item=item)

    return {
        "statusCode": 201,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "body": json.dumps(item)
    }
