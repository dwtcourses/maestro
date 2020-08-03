#!/usr/bin/env node
const AWS = require("aws-sdk");
AWS.config.logger = console;

const fs = require("fs");
const childProcess = require("child_process");
const retryAsync = require("../src/util/retryAsync");

const region = "us-west-2";
const apiVersion = "latest";

const iam = new AWS.IAM();
const lambda = new AWS.Lambda({ apiVersion, region });
const stepFunctions = new AWS.StepFunctions({ apiVersion, region });

const lambdaRoleName = "lambda_basic_execution";
const lambdaPolicyArns = [
  "arn:aws:iam::aws:policy/service-role/AWSLambdaRole",
  "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
];

const statesRoleName = "stepFunctions_basic_execution";
const statesPolicyArns = [
  "arn:aws:iam::aws:policy/service-role/AWSLambdaRole",
  "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess",
];

const basename = (filename) => filename.replace(/\..*$/, "");

const lambdaNames = fs.readdirSync("lambdas").map(basename);
const stateMachineNames = fs.readdirSync("state-machines").map(basename);

const getStateMachineArns = async (names) => {
  const stateMachines = (await stepFunctions.listStateMachines().promise())
    .stateMachines;

  return stateMachines
    .filter(({ name }) => names.includes(name))
    .map(({ stateMachineArn }) => stateMachineArn);
};

const deleteLambdas = (names) => {
  const deleteLambdaPromises = names.map((name) => {
    return lambda
      .deleteFunction({
        FunctionName: name,
      })
      .promise();
  });

  return Promise.all(deleteLambdaPromises);
};

const deleteStateMachines = (arns) => {
  const deleteStateMachinePromises = arns.map((arn) => {
    return stepFunctions
      .deleteStateMachine({ stateMachineArn: arn })
      .promise();
  });

  return Promise.all(deleteStateMachinePromises);
};

const detachPolicies = (policyArns, roleName) => {
  const detachPolicyPromises = policyArns.map((arn) => {
    return iam
      .detachRolePolicy({ PolicyArn: arn, RoleName: roleName })
      .promise();
  });

  return Promise.all(detachPolicyPromises);
};

const deleteRole = (name) => {
  return iam.deleteRole({ RoleName: name }).promise();
};

deleteLambdas(lambdaNames)
  .catch(console.log)
  .then(() => detachPolicies(lambdaPolicyArns, lambdaRoleName))
  .then(() => retryAsync(() => deleteRole(lambdaRoleName), 5, 7000, .6))

getStateMachineArns(stateMachineNames)
  .catch(console.log)
  .then(deleteStateMachines)
  .then(() => detachPolicies(statesPolicyArns, statesRoleName))
  .then(() => retryAsync(() => deleteRole(statesRoleName), 5, 7000, .6))
