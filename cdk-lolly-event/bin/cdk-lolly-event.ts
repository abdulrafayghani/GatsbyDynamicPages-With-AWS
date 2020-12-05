#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CdkLollyEventStack } from '../lib/cdk-lolly-event-stack';

const app = new cdk.App();
new CdkLollyEventStack(app, 'CdkLollyEventStack');
