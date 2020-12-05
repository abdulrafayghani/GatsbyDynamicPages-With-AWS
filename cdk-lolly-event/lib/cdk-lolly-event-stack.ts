import * as cdk from "@aws-cdk/core";
import * as appsync from "@aws-cdk/aws-appsync";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as lambda from "@aws-cdk/aws-lambda";
import * as events from "@aws-cdk/aws-events";
import * as targets from "@aws-cdk/aws-events-targets";
import * as iam from "@aws-cdk/aws-iam";
import * as s3 from "@aws-cdk/aws-s3";
import * as codepipeline from "@aws-cdk/aws-codepipeline";
import * as CodePipelineAction from "@aws-cdk/aws-codepipeline-actions";
import * as CodeBuild from "@aws-cdk/aws-codebuild";
import * as s3deploy from "@aws-cdk/aws-s3-deployment"
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as origins from "@aws-cdk/aws-cloudfront-origins";

export class CdkLollyEventStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const api = new appsync.CfnGraphQLApi(this, "lollyEventApi", { 
      name: "LollyEventAppsync",  
      authenticationType: "API_KEY",
     }
   ); 

   new appsync.CfnApiKey(this, "AppSync2EventBridgeApiKey", {
    apiId: api.attrApiId
  });

  const apiSchema = new appsync.CfnGraphQLSchema(this, "ItemsSchema", {
    apiId: api.attrApiId,
    definition: `type Event {
      result: String
    }
    
    type Lolly {
      recipientName: String!
      message: String!
      senderName: String!
      flavourTop: String!
      flavourMiddle: String!
      flavourBottom: String!
      lollyPath: String!
    }

    type Mutation {
      createLolly(lollyPath: String!, recipientName: String!, message: String!, senderName: String!, flavourTop: String!, flavourMiddle: String!,flavourBottom: String!): Event
    }
    
    type Query {
      getLollies: [Lolly!]
      getLolly(lollyPath: String!): Lolly!
    }
    
    schema {
      query: Query
      mutation: Mutation
    }`
  });

  const lollyEventTable = new dynamodb.Table(this, "LollyEventTable", {
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    partitionKey: {
      name: "lollyPath",
      type: dynamodb.AttributeType.STRING,
    },
  })

  const lollyAppsyncEventBridgeRole = new iam.Role(this, "LollyAppSyncEventBridgeRole", {
    assumedBy: new iam.ServicePrincipal("appsync.amazonaws.com")
  });

  lollyAppsyncEventBridgeRole.addToPolicy(
    new iam.PolicyStatement({
      resources: ["*"],
      actions: ["events:Put*", "dynamodb:Scan", "dynamodb:GetItem", "dynamodb:Query"]
    })
  );

  const dataSource = new appsync.CfnDataSource(this, "HTTPDataSource", {
    apiId: api.attrApiId,
    name: "EventBridgeDataSource",
    type: "HTTP",
    httpConfig: {
      authorizationConfig: {
        authorizationType: "AWS_IAM",
        awsIamConfig: {
          signingRegion: this.region,
          signingServiceName: "events"
        }
      },
      endpoint: "https://events." + this.region + ".amazonaws.com/"
    },
    serviceRoleArn: lollyAppsyncEventBridgeRole.roleArn
  });

  const ddbDataSource = new appsync.CfnDataSource(this, "LollyDDBDataSource", {
    apiId: api.attrApiId,
    name: "AWSDDBDataSource",
    type: "AMAZON_DYNAMODB",
    dynamoDbConfig: {
      awsRegion: this.region,
      tableName: lollyEventTable.tableName,
    },
    serviceRoleArn: lollyAppsyncEventBridgeRole.roleArn,
    })

    const getLolliesResolver = new appsync.CfnResolver(this, "getLolliesQueryResolver", {
      apiId: api.attrApiId,
      typeName: "Query",
      fieldName: "getLollies",
      dataSourceName: ddbDataSource.name,
      requestMappingTemplate: `{
        "version" : "2017-02-28",
        "operation" : "Scan",
      }`,
      responseMappingTemplate: `      
        #if($context.error)
          $util.error($context.error.message, $context.error.type)
        #else
          $utils.toJson($context.result.items)
        #end`
    });

    getLolliesResolver.addDependsOn(apiSchema)
    getLolliesResolver.addDependsOn(ddbDataSource)

    const putEventResolver = new appsync.CfnResolver(this, "PutLollyEventMutationResolver", {
      apiId: api.attrApiId,
      typeName: "Mutation",
      fieldName: "createLolly",
      dataSourceName: dataSource.name,
      requestMappingTemplate: `{
        "version": "2018-05-29",
        "method": "POST",
        "resourcePath": "/",
        "params": {
          "headers": {
            "content-type": "application/x-amz-json-1.1",
            "x-amz-target":"AWSEvents.PutEvents"
          },
          "body": {
            "Entries":[ 
              {
                "Source":"appsync",
                "EventBusName": "lollyEventBus",
                "Detail": "{\\\"event\\\": {\\\"lollyPath\\\":\\\"$ctx.arguments.lollyPath\\\",\\\"recipientName\\\":\\\"$ctx.arguments.recipientName\\\",\\\"message\\\":\\\"$ctx.arguments.message\\\",\\\"senderName\\\":\\\"$ctx.arguments.senderName\\\",\\\"flavourTop\\\":\\\"$ctx.arguments.flavourTop\\\",\\\"flavourMiddle\\\":\\\"$ctx.arguments.flavourMiddle\\\",\\\"flavourBottom\\\":\\\"$ctx.arguments.flavourBottom\\\"}}",
                "DetailType":"creatingLolly"
               }
            ]
          }
        }
      }`,

      // "Detail": "{\\\"event\\\": {\\\"hello\\\":\\\"hello world\\\"}}",
      // "{\\\"event": \\\"hello world\\\"}"
      
      responseMappingTemplate: `
        #if($ctx.error)
          $util.error($ctx.error.message, $ctx.error.type)
        #end
        ## if the response status code is not 200, then return an error. Else return the body **
        #if($ctx.result.statusCode == 200)
            ## If response is 200, return the body.
            {
              "result": "$util.parseJson($ctx.result.body)"
            }
        #else
            ## If response is not 200, append the response to error block.
            $utils.appendError($ctx.result.body, $ctx.result.statusCode)
        #end`
    });

    putEventResolver.addDependsOn(apiSchema);
    putEventResolver.addDependsOn(dataSource);

    const getLollyResolver = new appsync.CfnResolver(this, "getLollyResolver", {
      apiId: api.attrApiId,
      typeName: "Query",
      fieldName: "getLolly",
      dataSourceName: ddbDataSource.name,
      requestMappingTemplate: `{
        "version" : "2017-02-28",
        "operation" : "GetItem",
        "key": {
          "lollyPath": $util.dynamodb.toDynamoDBJson($ctx.args.lollyPath)
        }
      }`,
      responseMappingTemplate: `
        #if($context.error)
          $util.error($context.error.message, $context.error.type)
        #else
          $utils.toJson($context.result)
        #end
      `
    })
  
    getLollyResolver.addDependsOn(apiSchema),
    getLollyResolver.addDependsOn(ddbDataSource)

    const lollyLamda = new lambda.Function(this, "LollyLambda", {
      code: lambda.Code.fromAsset('lambda-fns'),
      handler: "lolly.handler",
      runtime: lambda.Runtime.NODEJS_12_X
    });

    lollyEventTable.grantFullAccess(lollyLamda)
    lollyLamda.addEnvironment("LOLLY_TABLE_NAME", lollyEventTable.tableName)

    const eventBus = new events.EventBus(this, "lollyEventBus", {
      eventBusName: "lollyEventBus",
    });

    const rule = new events.Rule(this, "LollyAppSyncEventBridgeRule", {
      eventPattern: {
        source: ["appsync"],
        detailType: ["creatingLolly"]
      },
      eventBus: eventBus
    });

    rule.addTarget(new targets.LambdaFunction(lollyLamda))

  //   const bucket = new s3.Bucket(this, "LollyAppBucket", {
  //     publicReadAccess: true,
  //     versioned: true,
  //     websiteIndexDocument: "index.html",
  //     websiteErrorDocument: "404.html",
  //   });

  //   new s3deploy.BucketDeployment(this, "todoApp-EventBridge-sns", {
  //     sources: [s3deploy.Source.asset("../public")],
  //     destinationBucket: bucket,
  //   })

  //   new cloudfront.Distribution(this, "CldfrnDistribution", {
  //     defaultBehavior: { origin: new origins.S3Origin(bucket) },
  //   });

  //   const outputSources = new codepipeline.Artifact();
  //   const outputWebsite = new codepipeline.Artifact();

  //   const policy = new iam.PolicyStatement();
  //   policy.addActions('s3:*');
  //   policy.addResources('*');

  //   const pipeline = new codepipeline.Pipeline(this, "LollyPipeline", {
  //     pipelineName: "eventLollypipeline",
  //     restartExecutionOnUpdate: true,
  //   });

  //   pipeline.addStage({
  //     stageName: 'Source',
  //     actions: [
  //       new CodePipelineAction.GitHubSourceAction({
  //         actionName: 'Checkout',
  //         owner: 'abdulrafayghani',
  //         repo: 'VitualLolly-aws-event',
  //         oauthToken: cdk.SecretValue.secretsManager('AWS_GITHUB_TOKEN'),
  //         output: outputSources,
  //         branch: "master"
  //       })
  //     ]
  //   })

  //   pipeline.addStage({
  //     stageName: 'Build',
  //     actions: [
  //       new CodePipelineAction.CodeBuildAction({
  //         actionName: 'Website',
  //         project: new CodeBuild.PipelineProject(this, 'BuildWebsite', {
  //           projectName: 'Website',
  //           buildSpec : CodeBuild.BuildSpec.fromObject({
  //             version : '0.2',
  //             phases: {
  //               install: {
  //                 "runtime-versions": {
  //                   "nodejs": 12
  //                 },
  //                 commands: [
  //                   "npm install -g gatsby",
  //                   "npm install"
  //                 ],
  //               },
  //               build: {
  //                 commands: [
  //                   'npm run build',
  //                 ],
  //               },
  //             },
  //             artifacts: {
  //               'base-directory': './public',   ///outputting our generated Gatsby Build files to the public directory
  //               "files": [
  //                 '**/*'
  //               ]
  //             },
  //           })
  //         }),
  //         input: outputSources,
  //         outputs: [outputWebsite],
  //       }),
  //     ],
  //   })
    
  //   pipeline.addStage({
  //     stageName: "Deploy",
  //     actions: [
  //       // AWS CodePipeline action to deploy CRA website to S3
  //       new CodePipelineAction.S3DeployAction({
  //         actionName: "WebsiteDeploy",
  //         input: outputWebsite,
  //         bucket: bucket,
  //       }),
  //     ],
  //   });

  //   pipeline.addToRolePolicy(policy)
  //   rule.addTarget(new targets.CodePipeline(pipeline))
  // }
}
