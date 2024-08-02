#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BitsAssignmentStack } from '../lib/bits-assignment-stack';

const app = new cdk.App();
new BitsAssignmentStack(app, 'BitsAssignmentStack');